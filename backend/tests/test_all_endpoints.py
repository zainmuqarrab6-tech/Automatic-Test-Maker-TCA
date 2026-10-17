"""
The Century Academy Test Maker - Comprehensive Backend Endpoint Verification
Tests all CRUD operations, schemas, filters, pagination, and swap endpoints.
"""

import sys
import os
import unittest
from pathlib import Path

# Add backend to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import get_db
from app.models import Base

from sqlalchemy.pool import StaticPool

# Setup in-memory SQLite database for deterministic testing
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

class TestBackendEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.dependency_overrides[get_db] = override_get_db
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=engine)
        app.dependency_overrides.pop(get_db, None)

    def test_01_health_check(self):
        resp = self.client.get("/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "online")
        self.assertEqual(data["app"], "The Century Academy - Test Maker API")

    def test_02_classes_crud(self):
        # 1. Create Class
        res = self.client.post("/api/v1/classes/", json={"name": "9th", "display_order": 1})
        self.assertEqual(res.status_code, 201)
        created = res.json()
        self.assertEqual(created["name"], "9th")
        class_id = created["id"]

        # 2. Get All Classes
        res = self.client.get("/api/v1/classes/")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.json()), 1)

        # 3. Get Specific Class
        res = self.client.get(f"/api/v1/classes/{class_id}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["name"], "9th")

        # 4. Update Class
        res = self.client.put(f"/api/v1/classes/{class_id}", json={"name": "9th Class (Matric Part 1)", "display_order": 2})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["name"], "9th Class (Matric Part 1)")

    def test_03_subjects_crud(self):
        # Get class ID
        cls_res = self.client.get("/api/v1/classes/")
        class_id = cls_res.json()[0]["id"]

        # 1. Create Subject
        res = self.client.post("/api/v1/subjects/", json={"class_id": class_id, "name": "Mathematics", "code": "MTH9"})
        self.assertEqual(res.status_code, 201)
        subj = res.json()
        self.assertEqual(subj["name"], "Mathematics")
        subj_id = subj["id"]

        # 2. Get Subjects
        res = self.client.get("/api/v1/subjects/")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.json()), 1)

        # 3. Get Subject with chapters
        res = self.client.get(f"/api/v1/subjects/{subj_id}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["name"], "Mathematics")

        # 4. Update Subject
        res = self.client.put(f"/api/v1/subjects/{subj_id}", json={"name": "Mathematics (Science Group)"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["name"], "Mathematics (Science Group)")

    def test_04_chapters_crud(self):
        subj_res = self.client.get("/api/v1/subjects/")
        subj_id = subj_res.json()[0]["id"]

        # 1. Create Chapter
        res = self.client.post("/api/v1/chapters/", json={
            "subject_id": subj_id,
            "chapter_number": 1,
            "name_en": "Matrices and Determinants",
            "name_ur": "قالب اور ان کا مقطع"
        })
        self.assertEqual(res.status_code, 201)
        ch = res.json()
        self.assertEqual(ch["chapter_number"], 1)
        ch_id = ch["id"]

        # 2. Get Chapters
        res = self.client.get(f"/api/v1/chapters/?subject_id={subj_id}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)

        # 3. Update Chapter
        res = self.client.put(f"/api/v1/chapters/{ch_id}", json={
            "name_en": "Real and Complex Numbers",
            "name_ur": "حقیقی اور پیچیدہ اعداد"
        })
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["name_en"], "Real and Complex Numbers")

    def test_05_topics_crud(self):
        ch_res = self.client.get("/api/v1/chapters/")
        ch_id = ch_res.json()[0]["id"]

        # 1. Create Topic
        res = self.client.post("/api/v1/topics/", json={
            "chapter_id": ch_id,
            "topic_number": "1.1",
            "name_en": "Real Numbers & Properties",
            "name_ur": "حقیقی اعداد اور ان کی خصوصیات"
        })
        self.assertEqual(res.status_code, 201)
        top_id = res.json()["id"]

        # 2. Get Topics
        res = self.client.get(f"/api/v1/topics/?chapter_id={ch_id}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)

        # 3. Update Topic
        res = self.client.put(f"/api/v1/topics/{top_id}", json={"name_en": "Properties of Real Numbers"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["name_en"], "Properties of Real Numbers")

    def test_06_questions_crud_filters_pagination_and_swap(self):
        subj_res = self.client.get("/api/v1/subjects/")
        subj_id = subj_res.json()[0]["id"]
        ch_res = self.client.get("/api/v1/chapters/")
        ch_id = ch_res.json()[0]["id"]

        # 1. Create MCQ Question
        res_mcq1 = self.client.post("/api/v1/questions/", json={
            "subject_id": subj_id,
            "chapter_id": ch_id,
            "type": "mcq",
            "question_text": "Every real number is a:",
            "question_ur": "ہر حقیقی عدد ہوتا ہے:",
            "options": [{"text": "Natural number"}, {"text": "Complex number"}, {"text": "Rational number"}, {"text": "Integer"}],
            "correct_answer": "1",
            "marks": 1,
            "difficulty": "easy",
            "status": "approved"
        })
        self.assertEqual(res_mcq1.status_code, 201)
        q1_id = res_mcq1.json()["id"]

        # 2. Create Second MCQ for swap test
        res_mcq2 = self.client.post("/api/v1/questions/", json={
            "subject_id": subj_id,
            "chapter_id": ch_id,
            "type": "mcq",
            "question_text": "The conjugate of 5 + 4i is:",
            "question_ur": "5 + 4i کا کاجوگیٹ ہے:",
            "options": [{"text": "5 - 4i"}, {"text": "-5 + 4i"}, {"text": "-5 - 4i"}, {"text": "5 + 4i"}],
            "correct_answer": "0",
            "marks": 1,
            "difficulty": "medium",
            "status": "approved"
        })
        self.assertEqual(res_mcq2.status_code, 201)
        q2_id = res_mcq2.json()["id"]

        # 3. Create Short Question
        res_sq = self.client.post("/api/v1/questions/", json={
            "subject_id": subj_id,
            "chapter_id": ch_id,
            "type": "short",
            "question_text": "Simplify: i^9",
            "question_ur": "مختصر کریں: i^9",
            "marks": 2,
            "difficulty": "easy",
            "status": "approved"
        })
        self.assertEqual(res_sq.status_code, 201)

        # 4. Test Filters & Pagination
        # Filter by type=mcq
        res_filter_type = self.client.get("/api/v1/questions/?type=mcq")
        self.assertEqual(res_filter_type.status_code, 200)
        data = res_filter_type.json()
        self.assertEqual(data["total"], 2)
        self.assertEqual(len(data["data"]), 2)

        # Filter by difficulty=medium
        res_filter_diff = self.client.get("/api/v1/questions/?difficulty=medium")
        self.assertEqual(res_filter_diff.status_code, 200)
        self.assertEqual(res_filter_diff.json()["total"], 1)

        # Pagination test (limit=1, page=1)
        res_paged = self.client.get("/api/v1/questions/?limit=1&page=1")
        self.assertEqual(res_paged.status_code, 200)
        self.assertEqual(len(res_paged.json()["data"]), 1)
        self.assertEqual(res_paged.json()["page"], 1)
        self.assertEqual(res_paged.json()["pages"], 3)

        # 5. Test Swap Question
        swap_res = self.client.post("/api/v1/questions/swap", json={
            "subject_id": subj_id,
            "chapter_no": 1,
            "type": "mcq",
            "exclude_ids": [q1_id]
        })
        self.assertEqual(swap_res.status_code, 200)
        replacement = swap_res.json()
        self.assertEqual(replacement["id"], q2_id)

        # 6. Update Question
        update_res = self.client.put(f"/api/v1/questions/{q1_id}", json={
            "question_text": "Updated: Every real number is a complex number:",
            "marks": 1
        })
        self.assertEqual(update_res.status_code, 200)
        self.assertIn("Updated", update_res.json()["question_text"])

    def test_07_syllabus_divisions_crud(self):
        subj_res = self.client.get("/api/v1/subjects/")
        subj_id = subj_res.json()[0]["id"]
        ch_res = self.client.get("/api/v1/chapters/")
        ch_id = ch_res.json()[0]["id"]

        # 1. Create Syllabus Division
        res = self.client.post("/api/v1/syllabus/", json={
            "name": "Monthly Test 1",
            "subject_id": subj_id,
            "description": "First month evaluation",
            "chapter_ids": [ch_id]
        })
        self.assertEqual(res.status_code, 201)
        div = res.json()
        self.assertEqual(div["name"], "Monthly Test 1")
        self.assertIn(ch_id, div["chapter_ids"])
        div_id = div["id"]

        # 2. Get Divisions
        res = self.client.get(f"/api/v1/syllabus/?subject_id={subj_id}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)

        # 3. Update Division
        res = self.client.put(f"/api/v1/syllabus/{div_id}", json={
            "name": "Term 1 Examination",
            "description": "Mid-term revised"
        })
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["name"], "Term 1 Examination")

    def test_08_paper_schemes_crud(self):
        subj_res = self.client.get("/api/v1/subjects/")
        subj_id = subj_res.json()[0]["id"]

        # 1. Create Paper Scheme with Sections
        res = self.client.post("/api/v1/schemes/", json={
            "name": "Standard 25-Marks Scheme",
            "subject_id": subj_id,
            "total_marks": 25,
            "duration_minutes": 45,
            "instructions": "All questions are compulsory where indicated.",
            "sections": [
                {
                    "section_name": "A",
                    "question_type": "mcq",
                    "number_of_questions": 5,
                    "number_to_attempt": 5,
                    "marks_per_question": 1.0,
                    "display_order": 1
                },
                {
                    "section_name": "B",
                    "question_type": "short",
                    "number_of_questions": 8,
                    "number_to_attempt": 6,
                    "marks_per_question": 2.0,
                    "display_order": 2
                },
                {
                    "section_name": "C",
                    "question_type": "long",
                    "number_of_questions": 2,
                    "number_to_attempt": 2,
                    "marks_per_question": 4.0,
                    "display_order": 3
                }
            ]
        })
        self.assertEqual(res.status_code, 201)
        sch = res.json()
        self.assertEqual(sch["name"], "Standard 25-Marks Scheme")
        self.assertEqual(len(sch["sections"]), 3)
        sch_id = sch["id"]

        # 2. Get Schemes
        res = self.client.get(f"/api/v1/schemes/?subject_id={subj_id}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)

        # 3. Update Scheme
        res = self.client.put(f"/api/v1/schemes/{sch_id}", json={
            "name": "Punjab Board 25-Marks Scheme",
            "duration_minutes": 40
        })
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["name"], "Punjab Board 25-Marks Scheme")

    def test_09_metadata_endpoint(self):
        res = self.client.get("/api/v1/metadata")
        self.assertEqual(res.status_code, 200)
        meta = res.json()
        self.assertIn("classes", meta)
        self.assertIn("question_types", meta)
        self.assertIn("difficulties", meta)
        self.assertIn("statuses", meta)
        self.assertIn("schemes", meta)
        self.assertIn("syllabus_divisions", meta)
        self.assertGreaterEqual(len(meta["classes"]), 1)
        self.assertGreaterEqual(len(meta["schemes"]), 1)

if __name__ == "__main__":
    unittest.main()
