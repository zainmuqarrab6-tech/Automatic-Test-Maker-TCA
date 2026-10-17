import sys
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

# Isolated SQLite in-memory DB
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

class TestReviewEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from app.auth import require_admin
        from app.models.user import User
        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[require_admin] = lambda: User(id=1, email="admin@test.com", full_name="Admin", role="admin", is_active=True)
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        db = TestingSessionLocal()
        c = Class(name="9th")
        db.add(c)
        db.commit()
        db.refresh(c)

        s = Subject(class_id=c.id, name="Mathematics", code="MTH9")
        db.add(s)
        db.commit()
        db.refresh(s)
        cls.subject_id = s.id

        ch1 = Chapter(subject_id=s.id, chapter_number=1, name="Real Numbers", name_ur="حقیقی اعداد")
        ch2 = Chapter(subject_id=s.id, chapter_number=2, name="Logarithms", name_ur="لوگارتھم")
        db.add_all([ch1, ch2])
        db.commit()
        db.refresh(ch1)
        db.refresh(ch2)
        cls.ch1_id = ch1.id
        cls.ch2_id = ch2.id

        # Create book
        book = Book(
            subject_id=s.id,
            title="9th Mathematics Review Test",
            upload_status="completed",
            total_pages=5,
            processed_pages=5,
            extracted_questions_count=3
        )
        db.add(book)
        db.commit()
        db.refresh(book)
        cls.book_id = book.id

        # Create test questions (1 approved, 2 drafts)
        q1 = Question(
            id="rev-q1",
            subject_id=s.id,
            chapter_id=ch1.id,
            type="mcq",
            question_text="Value of log(10) is:",
            question_ur="log(10) کی قیمت ہے:",
            options=[{"text": "0"}, {"text": "1"}, {"text": "10"}, {"text": "100"}],
            correct_answer="1",
            marks=1,
            difficulty="easy",
            source_book_id=book.id,
            source_page=1,
            status="approved"
        )
        q2 = Question(
            id="rev-q2",
            subject_id=s.id,
            chapter_id=ch1.id,
            type="short",
            question_text="Draft question on page 1",
            question_ur="ڈرافٹ سوال صفحہ 1",
            marks=2,
            difficulty="medium",
            source_book_id=book.id,
            source_page=1,
            status="draft"
        )
        q3 = Question(
            id="rev-q3",
            subject_id=s.id,
            chapter_id=ch1.id,
            type="short",
            question_text="Draft question on page 2",
            question_ur="ڈرافٹ سوال صفحہ 2",
            marks=2,
            difficulty="hard",
            source_book_id=book.id,
            source_page=2,
            status="draft"
        )
        db.add_all([q1, q2, q3])
        db.commit()
        db.close()

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=engine)
        app.dependency_overrides.pop(get_db, None)

    def test_01_chapter_stats_endpoint(self):
        resp = self.client.get(f"/api/v1/questions/chapter-stats?subject_id={self.subject_id}")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data), 2)
        
        # Chapter 1 stats
        ch1_stat = next(c for c in data if c["chapter_id"] == self.ch1_id)
        self.assertEqual(ch1_stat["chapter_number"], 1)
        self.assertEqual(ch1_stat["approved_count"], 1)
        self.assertEqual(ch1_stat["draft_count"], 2)
        self.assertEqual(ch1_stat["total_count"], 3)

        # Chapter 2 stats
        ch2_stat = next(c for c in data if c["chapter_id"] == self.ch2_id)
        self.assertEqual(ch2_stat["total_count"], 0)

    def test_02_edit_question_endpoint(self):
        # Update text, marks, options, answer, difficulty, type, and chapter
        resp = self.client.put("/api/v1/questions/rev-q2", json={
            "question_text": "Updated Short Question Statement (LaTeX: $x^2 + 1 = 0$)",
            "question_ur": "تبدیل شدہ سوال",
            "marks": 3,
            "difficulty": "hard",
            "type": "short"
        })
        self.assertEqual(resp.status_code, 200)
        updated = resp.json()
        self.assertEqual(updated["marks"], 3)
        self.assertEqual(updated["difficulty"], "hard")
        self.assertIn("LaTeX", updated["question_text"])

    def test_03_reject_question_endpoint(self):
        resp = self.client.post("/api/v1/questions/rev-q3/reject")
        self.assertEqual(resp.status_code, 200)
        rejected = resp.json()
        self.assertEqual(rejected["id"], "rev-q3")
        self.assertEqual(rejected["status"], "rejected")

    def test_04_batch_approve_endpoint(self):
        resp = self.client.post("/api/v1/questions/batch-approve", json={
            "question_ids": ["rev-q2", "rev-q3"]
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["approved_count"], 2)

    def test_05_bulk_change_chapter_endpoint(self):
        resp = self.client.post("/api/v1/questions/bulk-chapter", json={
            "question_ids": ["rev-q2", "rev-q3"],
            "chapter_id": self.ch2_id
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["updated_count"], 2)

        # Verify new chapter stats
        stats_resp = self.client.get(f"/api/v1/questions/chapter-stats?subject_id={self.subject_id}")
        data = stats_resp.json()
        ch2_stat = next(c for c in data if c["chapter_id"] == self.ch2_id)
        self.assertEqual(ch2_stat["total_count"], 2)

    def test_06_filter_by_book_and_page(self):
        resp = self.client.get(f"/api/v1/questions?source_book_id={self.book_id}&source_page=1")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["total"], 2)

if __name__ == "__main__":
    unittest.main()
