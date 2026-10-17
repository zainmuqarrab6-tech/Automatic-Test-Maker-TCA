import math
import uuid
import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func

from app.database import get_db
from app.models.question import Question
from app.models.academic import Subject, Chapter, Class
from app.models.user import User
from app.auth import require_admin, get_current_user_optional
from app.schemas.question import (
    QuestionCreate, QuestionUpdate, QuestionOut, PaginatedQuestions, QuestionSwapRequest,
    BulkApproveRequest, BulkChapterRequest, ChapterQuestionStats
)

router = APIRouter(prefix="/questions", tags=["Questions"])

def format_question_response(q: Question) -> dict:
    """Format question to include frontend-friendly fields."""
    opt_index = None
    if q.correct_answer is not None and str(q.correct_answer).isdigit():
        opt_index = int(q.correct_answer)

    return {
        "id": q.id,
        "subject_id": q.subject_id,
        "chapter_id": q.chapter_id,
        "topic_id": q.topic_id,
        "type": q.type,
        "question_text": q.question_text,
        "question_en": q.question_text, # frontend compatibility
        "question_ur": q.question_ur,
        "exercise": q.exercise,
        "options": q.options,
        "correct_answer": q.correct_answer,
        "correct_option_index": opt_index,
        "marks": q.marks,
        "difficulty": q.difficulty,
        "source_book_id": q.source_book_id,
        "source_page": q.source_page,
        "status": q.status,
        "created_at": q.created_at,
        "class_name": q.subject.class_rel.name if q.subject and q.subject.class_rel else "9th",
        "subject_name": q.subject.name if q.subject else "Mathematics",
        "chapter_no": q.chapter.chapter_number if q.chapter else 1,
        "chapter_name_en": q.chapter.name if q.chapter else "",
        "chapter_name_ur": q.chapter.name_ur if q.chapter else ""
    }

@router.get("", response_model=PaginatedQuestions)
def get_questions(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=500, description="Items per page"),
    class_name: Optional[str] = Query(None, description="Class name e.g. 9th"),
    subject_name: Optional[str] = Query(None, description="Subject name e.g. Mathematics"),
    subject_id: Optional[int] = Query(None, description="Subject ID"),
    chapter_no: Optional[int] = Query(None, description="Chapter number e.g. 1"),
    chapter_id: Optional[int] = Query(None, description="Chapter ID"),
    type: Optional[str] = Query(None, description="Question type e.g. mcq, short, long"),
    difficulty: Optional[str] = Query(None, description="Difficulty e.g. easy, medium, hard"),
    status: Optional[str] = Query(None, description="Status e.g. approved, draft, rejected, all"),
    source_book_id: Optional[int] = Query(None, description="Filter by source book ID"),
    source_page: Optional[int] = Query(None, description="Filter by source page number"),
    search: Optional[str] = Query(None, description="Search keyword in English, Urdu or exercise"),
    db: Session = Depends(get_db)
):
    """List questions with comprehensive filtering and pagination."""
    query = db.query(Question).options(
        joinedload(Question.subject).joinedload(Subject.class_rel),
        joinedload(Question.chapter)
    )

    # Class & Subject Filters
    if class_name:
        query = query.join(Question.subject).join(Subject.class_rel).filter(Class.name == class_name)
    if subject_id:
        query = query.filter(Question.subject_id == subject_id)
    elif subject_name:
        if not class_name:
            query = query.join(Question.subject)
        query = query.filter(Subject.name == subject_name)

    # Chapter Filters
    if chapter_id:
        query = query.filter(Question.chapter_id == chapter_id)
    elif chapter_no is not None:
        query = query.join(Question.chapter).filter(Chapter.chapter_number == chapter_no)

    # Book & Page Filters
    if source_book_id:
        query = query.filter(Question.source_book_id == source_book_id)
    if source_page is not None:
        query = query.filter(Question.source_page == source_page)

    # Question Type Normalization
    if type and type.lower() != "all":
        t_lower = type.lower()
        if "short" in t_lower:
            query = query.filter(Question.type == "short")
        elif "long" in t_lower:
            query = query.filter(Question.type == "long")
        else:
            query = query.filter(Question.type == t_lower)

    # Difficulty & Status
    if difficulty and difficulty.lower() != "all":
        query = query.filter(Question.difficulty == difficulty.lower())
    if status and status.lower() != "all":
        query = query.filter(Question.status == status.lower())

    # Full-Text / Keyword Search
    if search:
        s_term = f"%{search}%"
        query = query.filter(
            or_(
                Question.question_text.ilike(s_term),
                Question.question_ur.ilike(s_term),
                Question.exercise.ilike(s_term)
            )
        )

    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    offset = (page - 1) * limit

    records = query.order_by(Question.created_at.desc()).offset(offset).limit(limit).all()
    formatted = [format_question_response(r) for r in records]

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
        "data": formatted
    }

@router.post("", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
def create_question(
    payload: QuestionCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Create a new question in the question bank.
    Teachers' questions default to 'draft' status until reviewed by an administrator.
    """
    # 1. Input Validation
    text_en = (payload.question_text or "").strip()
    text_ur = (payload.question_ur or "").strip()
    if not text_en and not text_ur:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question text cannot be empty. Please provide English or Urdu question text."
        )

    if payload.marks < 1 or payload.marks > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Marks must be a positive integer between 1 and 100."
        )

    norm_type = payload.type.lower()
    if "mcq" in norm_type:
        if not payload.options or len(payload.options) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MCQ questions must have at least 2 options."
            )

    # 2. Verify subject and chapter exist
    sub = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")
    ch = db.query(Chapter).filter(Chapter.id == payload.chapter_id).first()
    if not ch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found.")

    # 3. Determine status based on role
    # If user is teacher, questions must be 'draft' until approved by admin
    status_val = payload.status or "draft"
    if current_user and current_user.role.lower() == "teacher":
        status_val = "draft"

    q_id = payload.id or f"q-{uuid.uuid4().hex[:8]}"

    new_q = Question(
        id=q_id,
        subject_id=payload.subject_id,
        chapter_id=payload.chapter_id,
        topic_id=payload.topic_id,
        type=payload.type,
        question_text=payload.question_text,
        question_ur=payload.question_ur,
        exercise=payload.exercise,
        options=payload.options,
        correct_answer=payload.correct_answer,
        marks=payload.marks,
        difficulty=payload.difficulty,
        source_book_id=payload.source_book_id,
        source_page=payload.source_page,
        status=status_val
    )
    db.add(new_q)
    db.commit()
    db.refresh(new_q)
    return format_question_response(new_q)

@router.get("/chapter-stats", response_model=List[ChapterQuestionStats])
def get_chapter_question_stats(subject_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    """Get counts of approved, draft, and rejected questions per chapter."""
    query = db.query(Chapter)
    if subject_id:
        query = query.filter(Chapter.subject_id == subject_id)
    chapters = query.order_by(Chapter.chapter_number.asc()).all()

    stats = []
    for ch in chapters:
        q_counts = db.query(Question.status, func.count(Question.id)).filter(
            Question.chapter_id == ch.id
        ).group_by(Question.status).all()

        c_map = {st: cnt for st, cnt in q_counts}
        app_count = c_map.get("approved", 0)
        drf_count = c_map.get("draft", 0)
        rej_count = c_map.get("rejected", 0)
        tot_count = sum(c_map.values())

        stats.append(ChapterQuestionStats(
            chapter_id=ch.id,
            chapter_number=ch.chapter_number,
            name=ch.name,
            name_ur=ch.name_ur,
            approved_count=app_count,
            draft_count=drf_count,
            rejected_count=rej_count,
            total_count=tot_count
        ))
    return stats

@router.post("/batch-approve")
def batch_approve_questions(
    payload: BulkApproveRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Approve multiple questions in bulk by ID list (Admin only)."""
    if not payload.question_ids:
        return {"message": "No questions provided.", "approved_count": 0}

    updated = db.query(Question).filter(
        Question.id.in_(payload.question_ids)
    ).update({"status": "approved"}, synchronize_session=False)
    db.commit()
    return {"message": f"Successfully approved {updated} questions.", "approved_count": updated}

@router.post("/bulk-chapter")
def bulk_change_chapter(
    payload: BulkChapterRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Bulk change chapter for selected questions (Admin only)."""
    if not payload.question_ids:
        return {"message": "No questions provided.", "updated_count": 0}

    ch = db.query(Chapter).filter(Chapter.id == payload.chapter_id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Target chapter not found.")

    updated = db.query(Question).filter(
        Question.id.in_(payload.question_ids)
    ).update({"chapter_id": payload.chapter_id}, synchronize_session=False)
    db.commit()
    return {
        "message": f"Successfully updated chapter for {updated} questions to '{ch.name}'.",
        "updated_count": updated,
        "chapter_id": ch.id,
        "chapter_name": ch.name
    }

@router.get("/{question_id}", response_model=QuestionOut)
def get_question(question_id: str, db: Session = Depends(get_db)):
    """Fetch details of a specific question by ID."""
    q = db.query(Question).options(
        joinedload(Question.subject).joinedload(Subject.class_rel),
        joinedload(Question.chapter)
    ).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")
    return format_question_response(q)

@router.put("/{question_id}", response_model=QuestionOut)
def update_question(question_id: str, payload: QuestionUpdate, db: Session = Depends(get_db)):
    """Update question content, marks, options, or metadata."""
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(q, field, val)

    db.commit()
    db.refresh(q)
    return format_question_response(q)

@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    question_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete a question from the question bank (Admin only)."""
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")
    db.delete(q)
    db.commit()
    return None

@router.post("/swap", response_model=QuestionOut)
def swap_question(payload: QuestionSwapRequest, db: Session = Depends(get_db)):
    """Fetch an alternative matching question not in exclude_ids for swapping on the live test paper."""
    t_clean = payload.type.lower()
    if "short" in t_clean:
        t_clean = "short"
    elif "long" in t_clean:
        t_clean = "long"

    query = db.query(Question).options(
        joinedload(Question.subject).joinedload(Subject.class_rel),
        joinedload(Question.chapter)
    ).filter(Question.type == t_clean, Question.status == "approved")

    if payload.subject_id:
        query = query.filter(Question.subject_id == payload.subject_id)
    elif payload.subject_name:
        query = query.join(Question.subject).filter(Subject.name == payload.subject_name)

    if payload.chapter_no is not None:
        query = query.join(Question.chapter).filter(Chapter.chapter_number == payload.chapter_no)

    if payload.exclude_ids:
        query = query.filter(~Question.id.in_(payload.exclude_ids))

    candidates = query.all()
    if not candidates:
        # Relax chapter restriction if pool is exhausted
        fallback_query = db.query(Question).options(
            joinedload(Question.subject).joinedload(Subject.class_rel),
            joinedload(Question.chapter)
        ).filter(Question.type == t_clean, Question.status == "approved")
        if payload.exclude_ids:
            fallback_query = fallback_query.filter(~Question.id.in_(payload.exclude_ids))
        candidates = fallback_query.limit(20).all()

    if not candidates:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No alternative questions available in the question bank for swapping."
        )

    chosen = random.choice(candidates)
    return format_question_response(chosen)

@router.post("/{question_id}/approve", response_model=QuestionOut)
def approve_question(
    question_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Approve a draft question to make it active in the test generator (Admin only)."""
    q = db.query(Question).options(
        joinedload(Question.subject).joinedload(Subject.class_rel),
        joinedload(Question.chapter)
    ).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")
    q.status = "approved"
    db.commit()
    db.refresh(q)
    return format_question_response(q)

@router.post("/{question_id}/reject", response_model=QuestionOut)
def reject_question(
    question_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Reject a draft question (Admin only)."""
    q = db.query(Question).options(
        joinedload(Question.subject).joinedload(Subject.class_rel),
        joinedload(Question.chapter)
    ).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")
    q.status = "rejected"
    db.commit()
    db.refresh(q)
    return format_question_response(q)


