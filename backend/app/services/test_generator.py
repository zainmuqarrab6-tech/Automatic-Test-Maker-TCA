import time
import uuid
import random
import logging
from typing import Dict, Any, List, Optional, Tuple, Set
from datetime import datetime
from sqlalchemy.orm import Session, joinedload

from app.models.academic import Subject, Chapter
from app.models.question import Question
from app.models.syllabus import SyllabusDivision, SyllabusDivisionChapter
from app.models.scheme import PaperScheme, SchemeSection
from app.models.test_paper import GeneratedTest, GeneratedTestQuestion
from app.schemas.test_paper import GenerateTestRequest, ShortageDetail

logger = logging.getLogger(__name__)

def distribute_section_questions(total_questions: int, chapter_weights: Dict[int, float]) -> Dict[int, int]:
    """
    Distribute total_questions across chapters.
    If weights are provided and positive, allocates using the Largest Remainder Method (Hare-Niemeyer).
    Otherwise, spreads questions across chapters evenly.
    Guarantees sum(allocated.values()) == total_questions.
    """
    chapter_ids = list(chapter_weights.keys())
    num_chapters = len(chapter_ids)
    if num_chapters == 0:
        return {}

    if total_questions <= 0:
        return {ch_id: 0 for ch_id in chapter_ids}

    total_weight = sum(chapter_weights.values())

    # Case 1: No weights defined (all 0) -> Even distribution
    if total_weight <= 0:
        base = total_questions // num_chapters
        remainder = total_questions % num_chapters
        allocation = {}
        for idx, ch_id in enumerate(chapter_ids):
            allocation[ch_id] = base + (1 if idx < remainder else 0)
        return allocation

    # Case 2: Positive weights defined -> Proportional allocation (Largest Remainder)
    exact_shares = {}
    floored_shares = {}
    remainders = {}

    for ch_id in chapter_ids:
        weight_frac = chapter_weights[ch_id] / total_weight
        exact = total_questions * weight_frac
        floored = int(exact)
        exact_shares[ch_id] = exact
        floored_shares[ch_id] = floored
        remainders[ch_id] = exact - floored

    allocated_total = sum(floored_shares.values())
    unallocated = total_questions - allocated_total

    # Sort chapters by largest remainder descending
    sorted_by_remainder = sorted(chapter_ids, key=lambda c: remainders[c], reverse=True)
    for i in range(unallocated):
        ch_id = sorted_by_remainder[i % num_chapters]
        floored_shares[ch_id] += 1

    return floored_shares

def get_recent_test_question_ids(db: Session, subject_id: int, n_recent: int = 3) -> Set[str]:
    """Fetch all question IDs used in the last N generated tests for this subject."""
    if n_recent <= 0:
        return set()

    recent_tests = (
        db.query(GeneratedTest)
        .filter(GeneratedTest.subject_id == subject_id)
        .order_by(GeneratedTest.created_at.desc())
        .limit(n_recent)
        .all()
    )

    if not recent_tests:
        return set()

    recent_test_ids = [t.id for t in recent_tests]
    links = (
        db.query(GeneratedTestQuestion.question_id)
        .filter(GeneratedTestQuestion.test_id.in_(recent_test_ids))
        .all()
    )
    return {link[0] for link in links}

def pick_questions_by_difficulty(
    candidates: List[Question],
    count: int,
    difficulty_mix: Optional[Dict[str, Any]] = None
) -> List[Question]:
    """
    Select `count` questions from candidates, respecting difficulty_mix if provided.
    Falls back gracefully to other difficulties if target bucket is depleted.
    """
    if len(candidates) <= count:
        return list(candidates)

    if not difficulty_mix:
        return random.sample(candidates, count)

    # Calculate target counts for easy, medium, hard
    total_mix = sum(float(difficulty_mix.get(d, 0)) for d in ("easy", "medium", "hard"))
    if total_mix <= 0:
        return random.sample(candidates, count)

    # Group candidates by difficulty
    buckets: Dict[str, List[Question]] = {"easy": [], "medium": [], "hard": []}
    for q in candidates:
        diff = (q.difficulty or "medium").lower()
        if diff in buckets:
            buckets[diff].append(q)
        else:
            buckets["medium"].append(q)

    # Shuffle each bucket
    for k in buckets:
        random.shuffle(buckets[k])

    # Determine desired quota per difficulty using largest remainder
    diff_weights = {d: float(difficulty_mix.get(d, 0)) for d in ("easy", "medium", "hard")}
    diff_allocation = distribute_section_questions(count, diff_weights)

    selected: List[Question] = []
    leftover_needed = 0

    # First pass: pick up to quota from each difficulty
    for diff in ("easy", "medium", "hard"):
        desired = diff_allocation.get(diff, 0)
        available = buckets[diff]
        take = min(desired, len(available))
        selected.extend(available[:take])
        leftover_needed += (desired - take)
        buckets[diff] = available[take:]

    # Second pass: fill any unmet quota from remaining candidates of any difficulty
    if leftover_needed > 0:
        remaining_pool = buckets["easy"] + buckets["medium"] + buckets["hard"]
        random.shuffle(remaining_pool)
        selected.extend(remaining_pool[:leftover_needed])

    return selected

def format_generated_test(test: GeneratedTest, db: Session) -> Dict[str, Any]:
    """Convert GeneratedTest ORM object into rich dictionary matching GeneratedTestOut schema."""
    # Organize questions by section
    sections_map: Dict[Optional[int], Dict[str, Any]] = {}

    if test.scheme and test.scheme.sections:
        for sec in test.scheme.sections:
            sections_map[sec.id] = {
                "section_id": sec.id,
                "section_name": sec.section_name,
                "question_type": sec.question_type,
                "number_of_questions": sec.number_of_questions,
                "number_to_attempt": sec.number_to_attempt,
                "marks_per_question": sec.marks_per_question,
                "total_section_marks": sec.number_to_attempt * sec.marks_per_question,
                "questions": []
            }

    all_q_details: List[Dict[str, Any]] = []

    for link in test.questions:
        q = link.question
        if not q:
            continue

        q_dict = {
            "id": q.id,
            "type": q.type,
            "question_text": q.question_text,
            "question_ur": q.question_ur,
            "exercise": q.exercise,
            "options": q.options,
            "correct_answer": q.correct_answer,
            "marks": q.marks,
            "difficulty": q.difficulty,
            "chapter_id": q.chapter_id,
            "chapter_number": q.chapter.chapter_number if q.chapter else None,
            "chapter_name": q.chapter.name if q.chapter else None,
            "source_book_id": q.source_book_id,
            "source_page": q.source_page
        }
        all_q_details.append(q_dict)

        sec_id = link.section_id
        if sec_id in sections_map:
            sections_map[sec_id]["questions"].append(q_dict)
        else:
            # Fallback section if unassigned
            if None not in sections_map:
                sections_map[None] = {
                    "section_id": None,
                    "section_name": link.section.section_name if link.section else "General Section",
                    "question_type": q.type,
                    "number_of_questions": len(test.questions),
                    "number_to_attempt": len(test.questions),
                    "marks_per_question": q.marks,
                    "total_section_marks": sum(getattr(ql.question, "marks", 1) for ql in test.questions),
                    "questions": []
                }
            sections_map[None]["questions"].append(q_dict)

    subj_name = test.subject.name if test.subject else (test.scheme.subject.name if test.scheme and test.scheme.subject else None)
    class_name = None
    if test.subject and test.subject.class_rel:
        class_name = test.subject.class_rel.name
    elif test.scheme and test.scheme.subject and test.scheme.subject.class_rel:
        class_name = test.scheme.subject.class_rel.name

    syllabus_name = test.syllabus_division.name if test.syllabus_division else None

    return {
        "id": test.id,
        "subject_id": test.subject_id,
        "scheme_id": test.scheme_id,
        "syllabus_division_id": test.syllabus_division_id,
        "title": test.title,
        "campus": test.campus,
        "date": test.date,
        "time_allowed": test.time_allowed,
        "total_marks": test.total_marks,
        "created_at": test.created_at,
        "subject_name": subj_name,
        "class_name": class_name,
        "syllabus_name": syllabus_name,
        "sections": list(sections_map.values()),
        "all_questions": all_q_details
    }

def generate_test_paper(
    db: Session,
    request: GenerateTestRequest
) -> Tuple[bool, str, Optional[GeneratedTest], List[ShortageDetail]]:
    """
    Main Test Generation Service.
    
    Logic:
    1. Validates subject, syllabus division, and paper scheme.
    2. Identifies chapters in syllabus division and their weightages.
    3. Finds recent test questions to avoid repetition (last N tests).
    4. For each section, allocates required question counts to chapters based on weightage.
    5. Checks availability of APPROVED questions of the matching type.
    6. If any shortage exists, DOES NOT CRASH; compiles precise shortage details.
    7. If fulfilled, selects questions respecting difficulty mix, saves to database, and returns.
    """
    # 1. Fetch Subject
    subject = db.query(Subject).filter(Subject.id == request.subject_id).first()
    if not subject:
        return False, f"Subject with ID {request.subject_id} not found.", None, []

    # 2. Fetch Syllabus Division
    syllabus = (
        db.query(SyllabusDivision)
        .options(joinedload(SyllabusDivision.chapters))
        .filter(SyllabusDivision.id == request.syllabus_division_id)
        .first()
    )
    if not syllabus:
        return False, f"Syllabus division with ID {request.syllabus_division_id} not found.", None, []

    if not syllabus.chapters:
        return False, f"Syllabus division '{syllabus.name}' has no chapters ticked.", None, []

    # Map chapter weightages
    chapter_weights: Dict[int, float] = {}
    for link in syllabus.chapters:
        chapter_weights[link.chapter_id] = float(link.weightage_percent or 0.0)

    # 3. Fetch Paper Scheme & Sections
    scheme = (
        db.query(PaperScheme)
        .options(joinedload(PaperScheme.sections))
        .filter(PaperScheme.id == request.paper_scheme_id)
        .first()
    )
    if not scheme:
        return False, f"Paper scheme with ID {request.paper_scheme_id} not found.", None, []

    if not scheme.sections:
        return False, f"Paper scheme '{scheme.name}' has no sections defined.", None, []

    # 4. Fetch recent question IDs to avoid repeats
    n_recent = request.n_recent_tests if request.n_recent_tests is not None else 3
    recent_q_ids = get_recent_test_question_ids(db, request.subject_id, n_recent)

    # 5. Question Selection & Shortage Tracking
    shortages: List[ShortageDetail] = []
    selected_questions_by_section: List[Tuple[SchemeSection, List[Question]]] = []
    already_picked_in_test: Set[str] = set()

    # Pre-fetch chapter metadata for friendly shortage messages
    division_ch_objs = {ch.id: ch for ch in db.query(Chapter).filter(Chapter.id.in_(list(chapter_weights.keys()))).all()}

    for sec in scheme.sections:
        total_sec_q = sec.number_of_questions
        sec_type = (sec.question_type or "short").lower().strip()

        # Allocate questions to chapters according to weightage or even spread
        chapter_allocation = distribute_section_questions(total_sec_q, chapter_weights)
        sec_questions: List[Question] = []

        for ch_id, needed_count in chapter_allocation.items():
            if needed_count <= 0:
                continue

            ch_obj = division_ch_objs.get(ch_id)
            ch_num = ch_obj.chapter_number if ch_obj else ch_id
            ch_name = ch_obj.name if ch_obj else f"Chapter {ch_id}"

            # Query all approved questions for this chapter and matching type
            all_approved = (
                db.query(Question)
                .filter(
                    Question.subject_id == request.subject_id,
                    Question.chapter_id == ch_id,
                    Question.type == sec_type,
                    Question.status == "approved"
                )
                .all()
            )

            # Filter out questions already picked in earlier sections of this test
            available_candidates = [q for q in all_approved if q.id not in already_picked_in_test]

            # Separate into fresh (not in last N tests) and recent
            fresh = [q for q in available_candidates if q.id not in recent_q_ids]
            recent = [q for q in available_candidates if q.id in recent_q_ids]

            total_available = len(available_candidates)

            # Check for shortage
            if total_available < needed_count:
                shortages.append(ShortageDetail(
                    section_name=sec.section_name,
                    question_type=sec_type,
                    chapter_id=ch_id,
                    chapter_number=ch_num,
                    chapter_name=ch_name,
                    required=needed_count,
                    available=total_available,
                    shortage=needed_count - total_available
                ))
            else:
                # Prioritize fresh questions that did not appear in the last N tests
                candidate_pool: List[Question] = []
                if len(fresh) >= needed_count:
                    candidate_pool = fresh
                else:
                    # Take all fresh, and draw remaining from recent
                    needed_recent = needed_count - len(fresh)
                    random.shuffle(recent)
                    candidate_pool = fresh + recent[:needed_recent]

                # Pick respecting difficulty mix
                chosen = pick_questions_by_difficulty(candidate_pool, needed_count, sec.difficulty_mix)
                for q in chosen:
                    already_picked_in_test.add(q.id)
                sec_questions.extend(chosen)

        selected_questions_by_section.append((sec, sec_questions))

    # 6. Handle Shortages (Do not crash! Return structured shortage information)
    if shortages:
        short_msgs = []
        for s in shortages:
            short_msgs.append(
                f"{s.section_name} ({s.chapter_name}): needs {s.required} {s.question_type}s, but only {s.available} approved available (short by {s.shortage})"
            )
        summary_msg = (
            f"Not enough approved questions to generate test paper. Shortage detected in {len(shortages)} section/chapter slots:\n"
            + "; ".join(short_msgs)
        )
        return False, summary_msg, None, shortages

    # 7. Persist to Database
    test_id = f"test-{int(time.time())}-{uuid.uuid4().hex[:6]}"
    title = request.title or f"{subject.name} - {syllabus.name}"
    date_str = request.date or datetime.utcnow().strftime("%Y-%m-%d")
    time_str = request.time_allowed or f"{scheme.duration_minutes} Mins"

    new_test = GeneratedTest(
        id=test_id,
        subject_id=request.subject_id,
        scheme_id=request.paper_scheme_id,
        syllabus_division_id=request.syllabus_division_id,
        title=title,
        campus=request.campus or "Sargodha Road Campus",
        date=date_str,
        time_allowed=time_str,
        total_marks=scheme.total_marks
    )
    db.add(new_test)
    db.flush()

    order_counter = 1
    for sec, questions_list in selected_questions_by_section:
        for q in questions_list:
            t_link = GeneratedTestQuestion(
                test_id=new_test.id,
                question_id=q.id,
                section_id=sec.id,
                order=order_counter
            )
            db.add(t_link)
            order_counter += 1

    db.commit()
    db.refresh(new_test)

    return True, "Test paper generated successfully!", new_test, []

def regenerate_test_question(
    db: Session,
    test_id: str,
    question_id: str,
    avoid_recent_n: int = 3
) -> Tuple[bool, str, Optional[Question], Optional[GeneratedTest]]:
    """
    Regenerate / swap a specific question on a test with another valid approved question.
    
    Selection rules:
    - Must be status = 'approved'
    - Must match original question's type
    - Belongs to the same subject and allowed syllabus chapters
    - Cannot be a question already in the current test
    - Prioritizes questions that did not appear in the last N tests
    """
    test = (
        db.query(GeneratedTest)
        .options(
            joinedload(GeneratedTest.questions).joinedload(GeneratedTestQuestion.question),
            joinedload(GeneratedTest.scheme).joinedload(PaperScheme.sections),
            joinedload(GeneratedTest.syllabus_division).joinedload(SyllabusDivision.chapters)
        )
        .filter(GeneratedTest.id == test_id)
        .first()
    )
    if not test:
        return False, f"Generated test with ID '{test_id}' not found.", None, None

    link = (
        db.query(GeneratedTestQuestion)
        .filter(
            GeneratedTestQuestion.test_id == test_id,
            GeneratedTestQuestion.question_id == question_id
        )
        .first()
    )
    if not link:
        return False, f"Question '{question_id}' is not linked to test '{test_id}'.", None, test

    current_q = link.question
    if not current_q:
        current_q = db.query(Question).filter(Question.id == question_id).first()
        if not current_q:
            return False, f"Question '{question_id}' record not found.", None, test

    # All question IDs currently present on this test
    existing_in_test_ids = {l.question_id for l in test.questions}

    # Determine allowed chapters from syllabus division
    allowed_chapter_ids = [current_q.chapter_id]
    if test.syllabus_division and test.syllabus_division.chapters:
        allowed_chapter_ids = [c.chapter_id for c in test.syllabus_division.chapters]

    # Fetch recent question IDs to avoid repeats
    recent_q_ids = get_recent_test_question_ids(db, test.subject_id or current_q.subject_id, avoid_recent_n)

    # Query all candidate approved questions
    candidates = (
        db.query(Question)
        .filter(
            Question.subject_id == (test.subject_id or current_q.subject_id),
            Question.type == current_q.type,
            Question.status == "approved",
            Question.chapter_id.in_(allowed_chapter_ids),
            ~Question.id.in_(existing_in_test_ids)
        )
        .all()
    )

    if not candidates:
        return (
            False,
            f"No alternative approved {current_q.type} questions available in this syllabus division to swap with.",
            None,
            test
        )

    # Ranking candidates:
    # 1. Same chapter and NOT in recent tests (best match)
    # 2. Same chapter (even if in recent tests)
    # 3. Any allowed chapter and NOT in recent tests
    # 4. Any allowed chapter
    same_ch_fresh = [q for q in candidates if q.chapter_id == current_q.chapter_id and q.id not in recent_q_ids]
    same_ch_any = [q for q in candidates if q.chapter_id == current_q.chapter_id]
    any_fresh = [q for q in candidates if q.id not in recent_q_ids]

    replacement: Question
    if same_ch_fresh:
        replacement = random.choice(same_ch_fresh)
    elif same_ch_any:
        replacement = random.choice(same_ch_any)
    elif any_fresh:
        replacement = random.choice(any_fresh)
    else:
        replacement = random.choice(candidates)

    # Update database link
    link.question_id = replacement.id
    db.commit()
    db.refresh(test)

    return True, f"Question successfully swapped with '{replacement.id}'.", replacement, test
