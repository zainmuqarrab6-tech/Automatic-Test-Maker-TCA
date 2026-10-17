import sys
import os
import io
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
from app.models.academic import Class, Subject, Book, Chapter
from app.models.question import Question

# Setup isolated in-memory SQLite database for deterministic testing
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

class TestBookUploadAndExtractionPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from app.auth import require_admin
        from app.models.user import User
        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[require_admin] = lambda: User(id=1, email="admin@test.com", full_name="Admin", role="admin", is_active=True)
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)
        
        # Seed test class and subject
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
        db.close()

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=engine)
        app.dependency_overrides.pop(get_db, None)

    def test_01_ai_config_endpoint(self):
        resp = self.client.get("/api/v1/books/ai-config")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("gemini_configured", data)
        self.assertIn("model", data)
        self.assertIn("setup_instructions", data)
        self.assertIn("PDF", data["supported_formats"])

    def test_02_upload_book_validation_and_creation(self):
        # 1. Reject invalid file extension
        bad_file = io.BytesIO(b"Hello text content")
        bad_resp = self.client.post(
            "/api/v1/books/upload",
            data={"subject_id": self.subject_id, "title": "Invalid File Test"},
            files={"file": ("test.txt", bad_file, "text/plain")}
        )
        self.assertEqual(bad_resp.status_code, 400)
        self.assertIn("Unsupported file format", bad_resp.json()["detail"])

        # 2. Accept valid PNG image upload
        # Minimal valid 1x1 PNG bytes
        png_bytes = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00"
            b"\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        img_file = io.BytesIO(png_bytes)
        resp = self.client.post(
            "/api/v1/books/upload",
            data={"subject_id": self.subject_id, "title": "9th Math Unit 1 Test Paper"},
            files={"file": ("page1.png", img_file, "image/png")}
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["title"], "9th Math Unit 1 Test Paper")
        self.assertEqual(data["subject_id"], self.subject_id)
        self.assertIn("upload_status", data)
        self.__class__.created_book_id = data["id"]

    def test_03_book_status_endpoint(self):
        book_id = self.__class__.created_book_id
        resp = self.client.get(f"/api/v1/books/{book_id}/status")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["id"], book_id)
        self.assertIn("upload_status", data)
        self.assertIn("progress_percentage", data)
        self.assertIn("extracted_questions_count", data)

    def test_04_draft_questions_linking_and_filtering(self):
        book_id = self.__class__.created_book_id
        db = TestingSessionLocal()
        
        # Create chapter
        ch = Chapter(subject_id=self.subject_id, chapter_number=1, name="Real Numbers")
        db.add(ch)
        db.commit()
        db.refresh(ch)

        # Create draft questions linked to this book and page
        q1 = Question(
            id="q-test-draft-01",
            subject_id=self.subject_id,
            chapter_id=ch.id,
            type="mcq",
            question_text="The set of natural numbers is denoted by:",
            question_ur="قدرتی اعداد کا سیٹ ظاہر کیا جاتا ہے:",
            options=[{"text": "W"}, {"text": "Z"}, {"text": "N"}, {"text": "Q"}],
            correct_answer="2",
            marks=1,
            difficulty="easy",
            source_book_id=book_id,
            source_page=12,
            status="draft"  # Strictly draft
        )
        q2 = Question(
            id="q-test-draft-02",
            subject_id=self.subject_id,
            chapter_id=ch.id,
            type="short",
            question_text="Define rational number.",
            question_ur="ناطق عدد کی تعریف کریں۔",
            marks=2,
            difficulty="medium",
            source_book_id=book_id,
            source_page=12,
            status="draft"  # Strictly draft
        )
        db.add_all([q1, q2])
        db.commit()
        db.close()

        # Fetch questions for this book
        resp = self.client.get(f"/api/v1/books/{book_id}/questions")
        self.assertEqual(resp.status_code, 200)
        items = resp.json()
        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]["status"], "draft")
        self.assertEqual(items[0]["source_page"], 12)
        self.assertEqual(items[0]["source_book_id"], book_id)

    def test_05_approve_individual_question(self):
        resp = self.client.post("/api/v1/questions/q-test-draft-01/approve")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["id"], "q-test-draft-01")
        self.assertEqual(data["status"], "approved")

    def test_06_batch_approve_book_questions(self):
        book_id = self.__class__.created_book_id
        resp = self.client.post(f"/api/v1/books/{book_id}/approve-all")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertGreaterEqual(data["approved_count"], 1)

        # Verify all are now approved
        chk = self.client.get(f"/api/v1/books/{book_id}/questions?status=approved")
        self.assertEqual(chk.status_code, 200)
        self.assertEqual(len(chk.json()), 2)

    def test_07_delete_book(self):
        book_id = self.__class__.created_book_id
        resp = self.client.delete(f"/api/v1/books/{book_id}")
        self.assertEqual(resp.status_code, 200)

        # Confirm 404
        chk = self.client.get(f"/api/v1/books/{book_id}")
        self.assertEqual(chk.status_code, 404)

if __name__ == "__main__":
    unittest.main()
