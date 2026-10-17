import io
import os
import sys
import unittest
from pathlib import Path
from datetime import timedelta

# Ensure backend root on sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import get_db, Base
from app.models.academic import Class, Subject, Chapter
from app.models.question import Question
from app.models.user import User
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    seed_default_users,
    DEFAULT_ADMIN_EMAIL,
    DEFAULT_ADMIN_PASSWORD,
    DEFAULT_TEACHER_EMAIL,
    DEFAULT_TEACHER_PASSWORD
)

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


class TestAuthAndPermissions(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Clear dependency overrides before starting
        app.dependency_overrides.clear()
        app.dependency_overrides[get_db] = override_get_db
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        db = TestingSessionLocal()
        # Seed users
        seed_default_users(db)

        # Seed academic structure
        c = Class(name="9th")
        db.add(c)
        db.commit()
        db.refresh(c)

        s = Subject(class_id=c.id, name="Mathematics", code="MTH9")
        db.add(s)
        db.commit()
        db.refresh(s)
        cls.subject_id = s.id

        ch = Chapter(subject_id=s.id, chapter_number=1, name="Real Numbers")
        db.add(ch)
        db.commit()
        db.refresh(ch)
        cls.chapter_id = ch.id

        # Seed a draft question for testing approvals
        q = Question(
            id="q_test_draft_01",
            subject_id=s.id,
            chapter_id=ch.id,
            type="short",
            question_text="Define rational number.",
            question_ur="ناطق عدد کی تعریف کریں۔",
            marks=2,
            difficulty="easy",
            status="draft"
        )
        db.add(q)
        db.commit()
        db.close()

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=engine)
        app.dependency_overrides.clear()

    # -------------------------------------------------------------------------
    # 1. Password Hashing & Verification
    # -------------------------------------------------------------------------
    def test_01_password_hashing_and_verification(self):
        password = "SecurePassword@2026"
        hashed = hash_password(password)
        self.assertIn("$", hashed)
        self.assertTrue(verify_password(password, hashed))
        self.assertFalse(verify_password("WrongPassword", hashed))
        self.assertFalse(verify_password("", hashed))
        self.assertFalse(verify_password("foo", "invalid_hash_string"))

    # -------------------------------------------------------------------------
    # 2. JWT Generation & Verification
    # -------------------------------------------------------------------------
    def test_02_jwt_token_handling(self):
        payload = {"sub": "user@tca.edu.pk", "role": "teacher", "user_id": 99}
        token = create_access_token(payload, expires_delta=timedelta(minutes=30))
        self.assertIsInstance(token, str)
        self.assertEqual(token.count("."), 2)

        decoded = decode_access_token(token)
        self.assertIsNotNone(decoded)
        self.assertEqual(decoded["sub"], "user@tca.edu.pk")
        self.assertEqual(decoded["role"], "teacher")

        # Tampered signature should fail
        tampered_token = token[:-4] + "ABCD"
        self.assertIsNone(decode_access_token(tampered_token))

        # Expired token should fail
        expired_token = create_access_token(payload, expires_delta=timedelta(seconds=-10))
        self.assertIsNone(decode_access_token(expired_token))

    # -------------------------------------------------------------------------
    # 3. Login Endpoint & Role Claims
    # -------------------------------------------------------------------------
    def test_03_login_authentication(self):
        # 1. Successful Admin Login
        admin_res = self.client.post("/api/v1/auth/login", json={
            "email": DEFAULT_ADMIN_EMAIL,
            "password": DEFAULT_ADMIN_PASSWORD
        })
        self.assertEqual(admin_res.status_code, 200)
        admin_data = admin_res.json()
        self.assertIn("access_token", admin_data)
        self.assertEqual(admin_data["user"]["role"], "admin")
        self.__class__.admin_token = admin_data["access_token"]

        # 2. Successful Teacher Login
        teacher_res = self.client.post("/api/v1/auth/login", json={
            "email": DEFAULT_TEACHER_EMAIL,
            "password": DEFAULT_TEACHER_PASSWORD
        })
        self.assertEqual(teacher_res.status_code, 200)
        teacher_data = teacher_res.json()
        self.assertIn("access_token", teacher_data)
        self.assertEqual(teacher_data["user"]["role"], "teacher")
        self.__class__.teacher_token = teacher_data["access_token"]

        # 3. Invalid credentials
        bad_res = self.client.post("/api/v1/auth/login", json={
            "email": DEFAULT_ADMIN_EMAIL,
            "password": "WrongPassword999@"
        })
        self.assertEqual(bad_res.status_code, 401)

        # 4. Non-existent user
        missing_res = self.client.post("/api/v1/auth/login", json={
            "email": "nobody@nowhere.com",
            "password": "Password123"
        })
        self.assertEqual(missing_res.status_code, 401)

    # -------------------------------------------------------------------------
    # 4. User Profile & Demo Users
    # -------------------------------------------------------------------------
    def test_04_auth_profile_and_demo_endpoints(self):
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        me_res = self.client.get("/api/v1/auth/me", headers=headers)
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()["email"], DEFAULT_ADMIN_EMAIL)

        # Unauthenticated request to /me
        unauth_me = self.client.get("/api/v1/auth/me")
        self.assertEqual(unauth_me.status_code, 401)

        # Demo users endpoint
        demo_res = self.client.get("/api/v1/auth/demo-users")
        self.assertEqual(demo_res.status_code, 200)
        demos = demo_res.json()
        roles = [d["role"] for d in demos]
        self.assertIn("admin", roles)
        self.assertIn("teacher", roles)

    # -------------------------------------------------------------------------
    # 5. Role-Based Access Control: Book Upload (Admin Only)
    # -------------------------------------------------------------------------
    def test_05_role_enforcement_book_upload(self):
        png_bytes = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00"
            b"\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        )

        # 1. Unauthenticated -> 401
        res_no_auth = self.client.post(
            "/api/v1/books/upload",
            data={"subject_id": self.subject_id, "title": "Test Book No Auth"},
            files={"file": ("page.png", io.BytesIO(png_bytes), "image/png")}
        )
        self.assertEqual(res_no_auth.status_code, 401)

        # 2. Teacher role -> 403 Forbidden
        teacher_headers = {"Authorization": f"Bearer {self.teacher_token}"}
        res_teacher = self.client.post(
            "/api/v1/books/upload",
            data={"subject_id": self.subject_id, "title": "Test Book Teacher"},
            files={"file": ("page.png", io.BytesIO(png_bytes), "image/png")},
            headers=teacher_headers
        )
        self.assertEqual(res_teacher.status_code, 403)
        self.assertIn("Administrators only", res_teacher.json()["detail"])

        # 3. Admin role -> 201 Created
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        res_admin = self.client.post(
            "/api/v1/books/upload",
            data={"subject_id": self.subject_id, "title": "Math Textbook Unit 1"},
            files={"file": ("page.png", io.BytesIO(png_bytes), "image/png")},
            headers=admin_headers
        )
        self.assertEqual(res_admin.status_code, 201)
        self.assertEqual(res_admin.json()["title"], "Math Textbook Unit 1")

    # -------------------------------------------------------------------------
    # 6. Role-Based Access Control: Question Review & Approval (Admin Only)
    # -------------------------------------------------------------------------
    def test_06_role_enforcement_question_approval(self):
        q_id = "q_test_draft_01"
        teacher_headers = {"Authorization": f"Bearer {self.teacher_token}"}
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}

        # 1. Teacher cannot approve question -> 403
        res_teacher_app = self.client.post(f"/api/v1/questions/{q_id}/approve", headers=teacher_headers)
        self.assertEqual(res_teacher_app.status_code, 403)

        # 2. Teacher cannot reject question -> 403
        res_teacher_rej = self.client.post(f"/api/v1/questions/{q_id}/reject", headers=teacher_headers)
        self.assertEqual(res_teacher_rej.status_code, 403)

        # 3. Teacher cannot batch-approve -> 403
        res_teacher_batch = self.client.post(
            "/api/v1/questions/batch-approve",
            json={"question_ids": [q_id]},
            headers=teacher_headers
        )
        self.assertEqual(res_teacher_batch.status_code, 403)

        # 4. Teacher cannot bulk-change chapter -> 403
        res_teacher_bulk = self.client.post(
            "/api/v1/questions/bulk-chapter",
            json={"question_ids": [q_id], "chapter_id": self.chapter_id},
            headers=teacher_headers
        )
        self.assertEqual(res_teacher_bulk.status_code, 403)

        # 5. Admin CAN approve question -> 200
        res_admin_app = self.client.post(f"/api/v1/questions/{q_id}/approve", headers=admin_headers)
        self.assertEqual(res_admin_app.status_code, 200)
        self.assertEqual(res_admin_app.json()["status"], "approved")

    # -------------------------------------------------------------------------
    # 7. File Type & Size Limits Validation
    # -------------------------------------------------------------------------
    def test_07_upload_file_type_and_size_validation(self):
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}

        # 1. Invalid file extension (.exe) -> 400 Bad Request
        exe_file = io.BytesIO(b"binary executable contents")
        res_bad_ext = self.client.post(
            "/api/v1/books/upload",
            data={"subject_id": self.subject_id, "title": "Malicious Executable"},
            files={"file": ("malware.exe", exe_file, "application/octet-stream")},
            headers=admin_headers
        )
        self.assertEqual(res_bad_ext.status_code, 400)
        self.assertIn("Unsupported file format", res_bad_ext.json()["detail"])

        # 2. Empty file -> 400 Bad Request
        empty_file = io.BytesIO(b"")
        res_empty = self.client.post(
            "/api/v1/books/upload",
            data={"subject_id": self.subject_id, "title": "Empty File"},
            files={"file": ("empty.pdf", empty_file, "application/pdf")},
            headers=admin_headers
        )
        self.assertEqual(res_empty.status_code, 400)

        # 3. Oversized scheme file (>15MB) -> 413 Request Entity Too Large
        oversized_scheme = io.BytesIO(b"A" * (16 * 1024 * 1024))
        res_over = self.client.post(
            "/api/v1/schemes/extract-ai",
            files={"file": ("huge_scheme.pdf", oversized_scheme, "application/pdf")}
        )
        self.assertEqual(res_over.status_code, 413)
        self.assertIn("exceeds maximum allowed size", res_over.json()["detail"])

    # -------------------------------------------------------------------------
    # 8. Question Input Validation
    # -------------------------------------------------------------------------
    def test_08_question_input_validation(self):
        teacher_headers = {"Authorization": f"Bearer {self.teacher_token}"}

        # 1. Empty question text -> 400
        res_empty = self.client.post(
            "/api/v1/questions",
            json={
                "subject_id": self.subject_id,
                "chapter_id": self.chapter_id,
                "type": "short",
                "question_text": "   ",
                "marks": 2
            },
            headers=teacher_headers
        )
        self.assertEqual(res_empty.status_code, 400)

        # 2. Invalid marks (< 1) -> 400
        res_bad_marks = self.client.post(
            "/api/v1/questions",
            json={
                "subject_id": self.subject_id,
                "chapter_id": self.chapter_id,
                "type": "short",
                "question_text": "Valid question text here.",
                "marks": 0
            },
            headers=teacher_headers
        )
        self.assertEqual(res_bad_marks.status_code, 400)

        # 3. MCQ with fewer than 2 options -> 400
        res_bad_mcq = self.client.post(
            "/api/v1/questions",
            json={
                "subject_id": self.subject_id,
                "chapter_id": self.chapter_id,
                "type": "mcq",
                "question_text": "What is 2 + 2?",
                "options": [{"text": "Only one option"}],
                "marks": 1
            },
            headers=teacher_headers
        )
        self.assertEqual(res_bad_mcq.status_code, 400)

        # 4. Teacher question automatically defaults to 'draft' status
        res_valid_teacher_q = self.client.post(
            "/api/v1/questions",
            json={
                "subject_id": self.subject_id,
                "chapter_id": self.chapter_id,
                "type": "short",
                "question_text": "Explain the concept of prime numbers.",
                "marks": 2,
                "status": "approved" # Teacher tries to self-approve
            },
            headers=teacher_headers
        )
        self.assertEqual(res_valid_teacher_q.status_code, 201)
        self.assertEqual(res_valid_teacher_q.json()["status"], "draft")

    # -------------------------------------------------------------------------
    # 9. Paper Scheme Input Validation
    # -------------------------------------------------------------------------
    def test_09_paper_scheme_input_validation(self):
        # 1. Invalid attempt count > question count -> 400
        res_bad_sec = self.client.post(
            "/api/v1/schemes",
            json={
                "subject_id": self.subject_id,
                "name": "Invalid Scheme Attempt Test",
                "total_marks": 20,
                "duration_minutes": 60,
                "sections": [
                    {
                        "section_name": "Section A",
                        "question_type": "short",
                        "number_of_questions": 5,
                        "number_to_attempt": 10, # Attempt > available
                        "marks_per_question": 2
                    }
                ]
            }
        )
        self.assertEqual(res_bad_sec.status_code, 400)
        self.assertIn("cannot exceed total questions", res_bad_sec.json()["detail"])

        # 2. Empty scheme name -> 400
        res_no_name = self.client.post(
            "/api/v1/schemes",
            json={
                "subject_id": self.subject_id,
                "name": "   ",
                "total_marks": 50,
                "duration_minutes": 60
            }
        )
        self.assertEqual(res_no_name.status_code, 400)


if __name__ == "__main__":
    unittest.main()
