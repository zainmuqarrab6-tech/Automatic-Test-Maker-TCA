import io
import sys
import unittest
from pathlib import Path

# Add backend to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import get_db
from app.models import Base
from app.models.academic import Class, Subject, Chapter
from app.models.question import Question
from app.models.syllabus import SyllabusDivision, SyllabusDivisionChapter
from app.models.scheme import PaperScheme, SchemeSection
from app.models.test_paper import GeneratedTest, GeneratedTestQuestion
from app.services.test_generator import distribute_section_questions, generate_test_paper, regenerate_test_question
from app.schemas.test_paper import GenerateTestRequest

TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

class TestGenerationService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.dependency_overrides[get_db] = override_get_db
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        db = TestingSessionLocal()
        c = Class(name="9th")
        db.add(c)
        db.commit()
        db.refresh(c)

        s = Subject(class_id=c.id, name="Mathematics", code="MTH-9")
        db.add(s)
        db.commit()
        db.refresh(s)
        cls.subject_id = s.id

        # Chapters 1, 2, 3
        ch1 = Chapter(subject_id=s.id, chapter_number=1, name="Matrices and Determinants", name_ur="قالب اور ان کا مقطع")
        ch2 = Chapter(subject_id=s.id, chapter_number=2, name="Real and Complex Numbers", name_ur="حقیقی اور پیچیدہ اعداد")
        ch3 = Chapter(subject_id=s.id, chapter_number=3, name="Logarithms", name_ur="لوگارتھم")
        db.add_all([ch1, ch2, ch3])
        db.commit()
        db.refresh(ch1)
        db.refresh(ch2)
        db.refresh(ch3)
        cls.ch1_id = ch1.id
        cls.ch2_id = ch2.id
        cls.ch3_id = ch3.id

        # Seed Questions:
        # Chapter 1: 4 Approved MCQs, 6 Approved Shorts, 2 Draft Shorts (must not be picked)
        # Chapter 2: 4 Approved MCQs, 4 Approved Shorts
        # Chapter 3: 2 Approved MCQs (Outside of division for testing boundary isolation)
        questions = []
        for i in range(1, 5):
            questions.append(Question(
                id=f"q-ch1-mcq-{i}", subject_id=s.id, chapter_id=ch1.id, type="mcq",
                question_text=f"Ch1 MCQ {i}", marks=1, difficulty="easy" if i <= 2 else "hard", status="approved"
            ))
        for i in range(1, 7):
            questions.append(Question(
                id=f"q-ch1-short-{i}", subject_id=s.id, chapter_id=ch1.id, type="short",
                question_text=f"Ch1 Short {i}", marks=2, difficulty="easy" if i <= 3 else "medium", status="approved"
            ))
        # 2 Draft questions in Ch1 (must be excluded)
        questions.append(Question(
            id="q-ch1-draft-1", subject_id=s.id, chapter_id=ch1.id, type="short",
            question_text="Draft question 1", marks=2, difficulty="medium", status="draft"
        ))
        questions.append(Question(
            id="q-ch1-draft-2", subject_id=s.id, chapter_id=ch1.id, type="mcq",
            question_text="Draft MCQ 2", marks=1, difficulty="easy", status="draft"
        ))

        # Chapter 2 questions
        for i in range(1, 5):
            questions.append(Question(
                id=f"q-ch2-mcq-{i}", subject_id=s.id, chapter_id=ch2.id, type="mcq",
                question_text=f"Ch2 MCQ {i}", marks=1, difficulty="medium", status="approved"
            ))
        for i in range(1, 5):
            questions.append(Question(
                id=f"q-ch2-short-{i}", subject_id=s.id, chapter_id=ch2.id, type="short",
                question_text=f"Ch2 Short {i}", marks=2, difficulty="hard", status="approved"
            ))

        # Chapter 3 questions (outside midterm)
        for i in range(1, 3):
            questions.append(Question(
                id=f"q-ch3-mcq-{i}", subject_id=s.id, chapter_id=ch3.id, type="mcq",
                question_text=f"Ch3 MCQ {i}", marks=1, difficulty="easy", status="approved"
            ))

        db.add_all(questions)
        db.commit()

        # Create Syllabus Division (Midterm = Chapter 1 & 2 only)
        div = SyllabusDivision(
            subject_id=s.id,
            name="Midterm Exam 2026",
            description="Units 1 and 2"
        )
        db.add(div)
        db.flush()

        div_ch1 = SyllabusDivisionChapter(syllabus_division_id=div.id, chapter_id=ch1.id, weightage_percent=60.0)
        div_ch2 = SyllabusDivisionChapter(syllabus_division_id=div.id, chapter_id=ch2.id, weightage_percent=40.0)
        db.add_all([div_ch1, div_ch2])
        db.commit()
        db.refresh(div)
        cls.division_id = div.id

        # Create Paper Scheme (Section A: 5 MCQs, Section B: 6 Shorts)
        scheme = PaperScheme(
            subject_id=s.id,
            name="Midterm Paper Scheme",
            total_marks=17,
            duration_minutes=60,
            instructions="Attempt all questions"
        )
        db.add(scheme)
        db.flush()

        sec_a = SchemeSection(
            scheme_id=scheme.id,
            section_name="Section A",
            question_type="mcq",
            number_of_questions=5,
            number_to_attempt=5,
            marks_per_question=1,
            difficulty_mix={"easy": 40, "medium": 40, "hard": 20}
        )
        sec_b = SchemeSection(
            scheme_id=scheme.id,
            section_name="Section B",
            question_type="short",
            number_of_questions=6,
            number_to_attempt=6,
            marks_per_question=2
        )
        db.add_all([sec_a, sec_b])
        db.commit()
        db.refresh(scheme)
        cls.scheme_id = scheme.id

        db.close()

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=engine)
        app.dependency_overrides.pop(get_db, None)

    def test_01_distribute_section_questions_logic(self):
        # 1. Even spread when weights are 0
        weights_zero = {101: 0.0, 102: 0.0, 103: 0.0}
        spread_10 = distribute_section_questions(10, weights_zero)
        self.assertEqual(sum(spread_10.values()), 10)
        self.assertEqual(spread_10[101], 4)
        self.assertEqual(spread_10[102], 3)
        self.assertEqual(spread_10[103], 3)

        # 2. Weighted spread (60% and 40% across 15 questions => 9 and 6)
        weights_prop = {1: 60.0, 2: 40.0}
        prop_15 = distribute_section_questions(15, weights_prop)
        self.assertEqual(prop_15[1], 9)
        self.assertEqual(prop_15[2], 6)
        self.assertEqual(sum(prop_15.values()), 15)

        # 3. Weighted spread across 5 questions with 60% and 40% => 3 and 2
        prop_5 = distribute_section_questions(5, weights_prop)
        self.assertEqual(prop_5[1], 3)
        self.assertEqual(prop_5[2], 2)
        self.assertEqual(sum(prop_5.values()), 5)

    def test_02_generate_test_paper_selection_rules(self):
        db = TestingSessionLocal()
        req = GenerateTestRequest(
            subject_id=self.subject_id,
            syllabus_division_id=self.division_id,
            paper_scheme_id=self.scheme_id,
            n_recent_tests=0
        )
        success, message, test, shortages = generate_test_paper(db, req)
        db.close()

        self.assertTrue(success, f"Generation failed: {message}")
        self.assertEqual(len(shortages), 0)
        self.assertIsNotNone(test)
        self.__class__.test1_id = test.id

        # Verify test questions in DB
        db = TestingSessionLocal()
        test_in_db = db.query(GeneratedTest).filter(GeneratedTest.id == test.id).first()
        self.assertIsNotNone(test_in_db)
        
        # Total questions: 5 MCQs + 6 Shorts = 11 questions
        self.assertEqual(len(test_in_db.questions), 11)

        # Verify all selected questions are APPROVED (no drafts)
        for link in test_in_db.questions:
            q = link.question
            self.assertEqual(q.status, "approved")
            # Verify no questions from Chapter 3 (which was not in syllabus division)
            self.assertIn(q.chapter_id, [self.ch1_id, self.ch2_id])
            self.assertNotEqual(q.chapter_id, self.ch3_id)

        # Verify Section A questions are all MCQ
        sec_a_links = [l for l in test_in_db.questions if l.section.section_name == "Section A"]
        self.assertEqual(len(sec_a_links), 5)
        for l in sec_a_links:
            self.assertEqual(l.question.type, "mcq")

        # Verify Section B questions are all Short
        sec_b_links = [l for l in test_in_db.questions if l.section.section_name == "Section B"]
        self.assertEqual(len(sec_b_links), 6)
        for l in sec_b_links:
            self.assertEqual(l.question.type, "short")

        # Verify chapter weight distribution for Section B (6 questions with 60%-40% => 4 from Ch1, 2 from Ch2)
        ch1_shorts = [l for l in sec_b_links if l.question.chapter_id == self.ch1_id]
        ch2_shorts = [l for l in sec_b_links if l.question.chapter_id == self.ch2_id]
        self.assertEqual(len(ch1_shorts), 4)
        self.assertEqual(len(ch2_shorts), 2)

        db.close()

    def test_03_avoid_recent_tests_repetition(self):
        # Generate a second test with n_recent_tests=1
        # The pool of short questions in Ch1 has 6 approved questions. Test 1 picked 4.
        # Test 2 should prioritize the 2 unused questions first!
        db = TestingSessionLocal()
        req = GenerateTestRequest(
            subject_id=self.subject_id,
            syllabus_division_id=self.division_id,
            paper_scheme_id=self.scheme_id,
            n_recent_tests=1
        )
        success, message, test2, shortages = generate_test_paper(db, req)
        self.assertTrue(success)

        test1_ch1_qids = {
            l.question_id for l in db.query(GeneratedTestQuestion)
            .filter(GeneratedTestQuestion.test_id == self.test1_id)
            .all()
        }
        test2_ch1_qids = {
            l.question_id for l in db.query(GeneratedTestQuestion)
            .filter(GeneratedTestQuestion.test_id == test2.id)
            .all()
        }

        all_ch1_short_ids = {f"q-ch1-short-{i}" for i in range(1, 7)}
        unpicked_in_test1 = all_ch1_short_ids - test1_ch1_qids
        self.assertEqual(len(unpicked_in_test1), 2)

        # The questions that were fresh (not in test 1) MUST be included in test 2
        for qid in unpicked_in_test1:
            self.assertIn(qid, test2_ch1_qids)

        db.close()

    def test_04_shortage_detection_without_crashing(self):
        # Create a demanding scheme requiring 20 Long questions (we have 0 approved long questions)
        db = TestingSessionLocal()
        demanding_scheme = PaperScheme(
            subject_id=self.subject_id,
            name="Heavy Long Scheme",
            total_marks=80,
            duration_minutes=150
        )
        db.add(demanding_scheme)
        db.flush()

        demanding_sec = SchemeSection(
            scheme_id=demanding_scheme.id,
            section_name="Section Long",
            question_type="long",
            number_of_questions=10,
            number_to_attempt=8,
            marks_per_question=8
        )
        db.add(demanding_sec)
        db.commit()

        req = GenerateTestRequest(
            subject_id=self.subject_id,
            syllabus_division_id=self.division_id,
            paper_scheme_id=demanding_scheme.id
        )
        success, message, test, shortages = generate_test_paper(db, req)

        # MUST NOT CRASH: returns success=False and clear shortage items
        self.assertFalse(success)
        self.assertIsNone(test)
        self.assertGreater(len(shortages), 0)
        self.assertIn("Section Long", message)
        self.assertIn("short by", message)

        first_shortage = shortages[0]
        self.assertEqual(first_shortage.section_name, "Section Long")
        self.assertEqual(first_shortage.question_type, "long")
        self.assertEqual(first_shortage.available, 0)
        self.assertGreater(first_shortage.shortage, 0)

        db.close()

    def test_05_regenerate_question_action(self):
        # Test regenerating a question in test 1
        db = TestingSessionLocal()
        test1_links = db.query(GeneratedTestQuestion).filter(GeneratedTestQuestion.test_id == self.test1_id).all()
        target_link = test1_links[0]
        old_qid = target_link.question_id

        success, msg, replacement, updated_test = regenerate_test_question(
            db,
            test_id=self.test1_id,
            question_id=old_qid,
            avoid_recent_n=0
        )
        self.assertTrue(success, f"Regenerate failed: {msg}")
        self.assertIsNotNone(replacement)
        self.assertNotEqual(replacement.id, old_qid)
        self.assertEqual(replacement.type, target_link.question.type)

        # Verify DB is updated
        db.refresh(target_link)
        self.assertEqual(target_link.question_id, replacement.id)

        db.close()

    def test_06_api_endpoints_generate_and_regenerate(self):
        # Test full HTTP API endpoint POST /api/v1/tests/generate
        payload = {
            "subject_id": self.subject_id,
            "syllabus_division_id": self.division_id,
            "paper_scheme_id": self.scheme_id,
            "n_recent_tests": 1,
            "title": "API Test Paper Series",
            "campus": "Model Town Campus"
        }
        resp = self.client.post("/api/v1/tests/generate", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertIsNotNone(data["test"])
        test_obj = data["test"]
        self.assertEqual(test_obj["title"], "API Test Paper Series")
        self.assertEqual(test_obj["campus"], "Model Town Campus")
        self.assertEqual(len(test_obj["all_questions"]), 11)
        self.assertEqual(len(test_obj["sections"]), 2)

        # Test HTTP API endpoint POST /api/v1/tests/{test_id}/regenerate-question
        first_q = test_obj["all_questions"][0]
        regen_resp = self.client.post(
            f"/api/v1/tests/{test_obj['id']}/regenerate-question",
            json={"question_id": first_q["id"]}
        )
        self.assertEqual(regen_resp.status_code, 200)
        regen_data = regen_resp.json()
        self.assertTrue(regen_data["success"])
        self.assertIsNotNone(regen_data["replacement_question"])
        self.assertNotEqual(regen_data["replacement_question"]["id"], first_q["id"])

        # Test GET /api/v1/tests/{test_id}
        get_resp = self.client.get(f"/api/v1/tests/{test_obj['id']}")
        self.assertEqual(get_resp.status_code, 200)
        get_data = get_resp.json()
        self.assertEqual(get_data["id"], test_obj["id"])

        # Test GET /api/v1/tests
        list_resp = self.client.get(f"/api/v1/tests?subject_id={self.subject_id}")
        self.assertEqual(list_resp.status_code, 200)
        self.assertGreaterEqual(len(list_resp.json()), 1)

if __name__ == "__main__":
    unittest.main()
