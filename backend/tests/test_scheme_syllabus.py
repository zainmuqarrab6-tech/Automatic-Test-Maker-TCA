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
import pymupdf

from app.main import app
from app.database import get_db
from app.models import Base
from app.models.academic import Class, Subject, Chapter
from app.models.syllabus import SyllabusDivision, SyllabusDivisionChapter
from app.models.scheme import PaperScheme, SchemeSection

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

class TestSchemeAndSyllabusEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.dependency_overrides[get_db] = override_get_db
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        db = TestingSessionLocal()
        c = Class(name="10th")
        db.add(c)
        db.commit()
        db.refresh(c)

        s = Subject(class_id=c.id, name="Physics", code="PHY10")
        db.add(s)
        db.commit()
        db.refresh(s)
        cls.subject_id = s.id

        ch1 = Chapter(subject_id=s.id, chapter_number=10, name="Simple Harmonic Motion", name_ur="سادہ ہارمونک موشن")
        ch2 = Chapter(subject_id=s.id, chapter_number=11, name="Sound", name_ur="صوت")
        ch3 = Chapter(subject_id=s.id, chapter_number=12, name="Geometrical Optics", name_ur="جیومیٹریکل آپٹکس")
        db.add_all([ch1, ch2, ch3])
        db.commit()
        db.refresh(ch1)
        db.refresh(ch2)
        db.refresh(ch3)
        cls.ch1_id = ch1.id
        cls.ch2_id = ch2.id
        cls.ch3_id = ch3.id
        db.close()

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=engine)
        app.dependency_overrides.pop(get_db, None)

    def test_01_create_syllabus_division_with_weightages(self):
        payload = {
            "subject_id": self.subject_id,
            "name": "Midterm Exam 2026",
            "description": "Chapters 10 & 11 for Midterm Assessment",
            "chapter_ids": [self.ch1_id, self.ch2_id],
            "chapter_weightages": [
                {"chapter_id": self.ch1_id, "weightage_percent": 60.0},
                {"chapter_id": self.ch2_id, "weightage_percent": 40.0}
            ]
        }
        resp = self.client.post("/api/v1/syllabus-divisions", json=payload)
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["name"], "Midterm Exam 2026")
        self.assertEqual(len(data["chapter_ids"]), 2)
        self.assertEqual(len(data["chapter_weightages"]), 2)
        
        # Check weightage values
        w1 = next(w for w in data["chapter_weightages"] if w["chapter_id"] == self.ch1_id)
        w2 = next(w for w in data["chapter_weightages"] if w["chapter_id"] == self.ch2_id)
        self.assertEqual(w1["weightage_percent"], 60.0)
        self.assertEqual(w2["weightage_percent"], 40.0)
        self.__class__.division_id = data["id"]

    def test_02_get_and_update_syllabus_division(self):
        resp = self.client.get(f"/api/v1/syllabus-divisions/{self.division_id}")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["subject_name"], "Physics")
        self.assertEqual(data["class_name"], "10th")

        # Update to add chapter 3
        update_payload = {
            "name": "Updated Midterm Exam",
            "chapter_ids": [self.ch1_id, self.ch2_id, self.ch3_id],
            "chapter_weightages": [
                {"chapter_id": self.ch1_id, "weightage_percent": 40.0},
                {"chapter_id": self.ch2_id, "weightage_percent": 30.0},
                {"chapter_id": self.ch3_id, "weightage_percent": 30.0}
            ]
        }
        put_resp = self.client.put(f"/api/v1/syllabus-divisions/{self.division_id}", json=update_payload)
        self.assertEqual(put_resp.status_code, 200)
        put_data = put_resp.json()
        self.assertEqual(len(put_data["chapter_ids"]), 3)
        self.assertEqual(put_data["name"], "Updated Midterm Exam")

    def test_03_create_scheme_balanced_validation(self):
        # 12 MCQs (12*1=12) + 5 Short (5*2=10) + 1 Long (1*8=8) => Total 30 marks
        payload = {
            "subject_id": self.subject_id,
            "name": "10th Physics Monthly Scheme",
            "total_marks": 30,
            "duration_minutes": 60,
            "instructions": "All questions are compulsory in Section A. Attempt 5 from B and 1 from C.",
            "sections": [
                {
                    "section_name": "Section A",
                    "question_type": "mcq",
                    "number_of_questions": 12,
                    "number_to_attempt": 12,
                    "marks_per_question": 1
                },
                {
                    "section_name": "Section B",
                    "question_type": "short",
                    "number_of_questions": 8,
                    "number_to_attempt": 5,
                    "marks_per_question": 2
                },
                {
                    "section_name": "Section C",
                    "question_type": "long",
                    "number_of_questions": 2,
                    "number_to_attempt": 1,
                    "marks_per_question": 8
                }
            ]
        }
        resp = self.client.post("/api/v1/schemes", json=payload)
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["calculated_total_marks"], 30)
        self.assertTrue(data["marks_balanced"])
        self.assertIsNone(data["validation_warning"])
        self.assertEqual(len(data["sections"]), 3)
        self.__class__.scheme_id = data["id"]

    def test_04_scheme_mismatch_warning_validation(self):
        # Total marks set to 50, but sections only add to 30
        payload = {
            "subject_id": self.subject_id,
            "name": "Mismatched Scheme",
            "total_marks": 50,
            "duration_minutes": 90,
            "instructions": "Sample instructions",
            "sections": [
                {
                    "section_name": "Section A",
                    "question_type": "mcq",
                    "number_of_questions": 10,
                    "number_to_attempt": 10,
                    "marks_per_question": 1
                },
                {
                    "section_name": "Section B",
                    "question_type": "short",
                    "number_of_questions": 10,
                    "number_to_attempt": 10,
                    "marks_per_question": 2
                }
            ]
        }
        resp = self.client.post("/api/v1/schemes", json=payload)
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["calculated_total_marks"], 30)
        self.assertFalse(data["marks_balanced"])
        self.assertIsNotNone(data["validation_warning"])
        self.assertIn("mismatch", data["validation_warning"])

    def test_05_update_scheme_and_replace_sections(self):
        update_payload = {
            "name": "Updated 10th Physics Scheme",
            "total_marks": 60,
            "duration_minutes": 120,
            "sections": [
                {
                    "section_name": "Section A",
                    "question_type": "mcq",
                    "number_of_questions": 12,
                    "number_to_attempt": 12,
                    "marks_per_question": 1
                },
                {
                    "section_name": "Section B",
                    "question_type": "short",
                    "number_of_questions": 15,
                    "number_to_attempt": 15,
                    "marks_per_question": 2
                },
                {
                    "section_name": "Section C",
                    "question_type": "long",
                    "number_of_questions": 3,
                    "number_to_attempt": 2,
                    "marks_per_question": 9
                }
            ]
        }
        # 12*1 + 15*2 + 2*9 = 12 + 30 + 18 = 60
        resp = self.client.put(f"/api/v1/schemes/{self.scheme_id}", json=update_payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["total_marks"], 60)
        self.assertEqual(data["calculated_total_marks"], 60)
        self.assertTrue(data["marks_balanced"])

    def test_06_extract_ai_scheme_endpoint(self):
        # Create a real small test PDF in memory
        doc = pymupdf.open()
        page = doc.new_page()
        page.insert_text(
            (50, 72),
            "PUNJAB BOARD 10TH PHYSICS MODEL PAPER SCHEME 2026\n"
            "Total Marks: 60, Time: 2 Hours\n"
            "Section A: 12 MCQs of 1 mark each (Total 12 Marks)\n"
            "Section B: Short Questions - Attempt 15 questions of 2 marks each (Total 30 Marks)\n"
            "Section C: Long Questions - Attempt 2 questions of 9 marks each (Total 18 Marks)\n"
        )
        pdf_bytes = doc.tobytes()
        doc.close()

        files = {"file": ("scheme_doc.pdf", pdf_bytes, "application/pdf")}
        resp = self.client.post("/api/v1/schemes/extract-ai", files=files)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("sections", data)
        self.assertIsInstance(data["sections"], list)
        self.assertGreaterEqual(len(data["sections"]), 1)
        self.assertIn("total_marks", data)
        self.assertIn("calculated_total_marks", data)

    def test_07_delete_syllabus_and_scheme(self):
        del_div = self.client.delete(f"/api/v1/syllabus-divisions/{self.division_id}")
        self.assertEqual(del_div.status_code, 204)

        del_sch = self.client.delete(f"/api/v1/schemes/{self.scheme_id}")
        self.assertEqual(del_sch.status_code, 204)

if __name__ == "__main__":
    unittest.main()
