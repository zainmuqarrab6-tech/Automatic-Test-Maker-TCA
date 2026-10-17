"""Seed database with sample classes, subjects, chapters, questions, and paper schemes.
Usage:
  python backend/seed.py           # Uses MySQL from .env
  python backend/seed.py --sqlite  # Uses local SQLite database for offline testing
"""
import sys
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import engine as mysql_engine, Base
from app.models.academic import Class, Subject, Book, Chapter, Topic
from app.models.question import Question
from app.models.syllabus import SyllabusDivision, SyllabusDivisionChapter
from app.models.scheme import PaperScheme, SchemeSection

def seed_database(use_sqlite: bool = False):
    print("==================================================")
    print("[Seed] The Century Academy Test Maker - Database Seeder")
    print("==================================================")

    if use_sqlite:
        sqlite_path = os.path.join(os.path.dirname(__file__), "test_maker.db")
        db_url = f"sqlite:///{sqlite_path}"
        active_engine = create_engine(db_url, echo=False)
        print(f"[Seed] Mode: Local SQLite Database ({sqlite_path})")
    else:
        active_engine = mysql_engine
        print("[Seed] Mode: MySQL Database (from .env)")

    # Ensure tables exist in database
    try:
        Base.metadata.create_all(bind=active_engine)
        print("[Seed] Tables verified / created via SQLAlchemy metadata.")
    except Exception as e:
        print("\n[Seed] Connection Notice:")
        print(f"  Could not connect to MySQL server: {e}")
        print("  -> Ensure your MySQL service (e.g. XAMPP, MySQL Server) is running, or check .env host.")
        print("  -> To verify models and test seeding offline, run:")
        print("     python backend/seed.py --sqlite\n")
        return

    Session = sessionmaker(autocommit=False, autoflush=False, bind=active_engine)
    db = Session()
    try:
        # 1. Seed Classes
        class_names = ["9th", "10th", "11th", "12th"]
        classes_map = {}
        for cname in class_names:
            c = db.query(Class).filter_by(name=cname).first()
            if not c:
                c = Class(name=cname)
                db.add(c)
                db.flush()
                print(f"  + Added Class: {cname}")
            classes_map[cname] = c

        # 2. Seed Subjects
        subjects_data = {
            "9th": ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science"],
            "10th": ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science"],
            "11th": ["Mathematics", "Physics", "Chemistry", "Computer Science"],
            "12th": ["Mathematics", "Physics", "Chemistry", "Computer Science"],
        }
        subjects_map = {}
        for cname, sub_list in subjects_data.items():
            cls_obj = classes_map[cname]
            for sname in sub_list:
                s = db.query(Subject).filter_by(class_id=cls_obj.id, name=sname).first()
                if not s:
                    s = Subject(class_id=cls_obj.id, name=sname, code=f"{sname[:4].upper()}-{cname}")
                    db.add(s)
                    db.flush()
                    print(f"  + Added Subject: {sname} ({cname})")
                subjects_map[(cname, sname)] = s

        # 3. Seed Sample Books
        math_9 = subjects_map[("9th", "Mathematics")]
        book_9_math = db.query(Book).filter_by(subject_id=math_9.id, title="9th Mathematics Punjab Textbook Board").first()
        if not book_9_math:
            book_9_math = Book(
                subject_id=math_9.id,
                title="9th Mathematics Punjab Textbook Board",
                file_path="uploads/books/9th_math_pctb.pdf",
                upload_status="completed"
            )
            db.add(book_9_math)
            db.flush()
            print("  + Added Book: 9th Mathematics Punjab Textbook Board")

        # 4. Seed Chapters for 9th Mathematics
        chapters_data = [
            (1, "Real and Complex Numbers", "حقیقی اور بلحاظِ ترکیب اعداد"),
            (2, "Logarithms", "لوگارتھم"),
            (3, "Algebraic Expressions and Formulas", "الجبرائی جملے اور الجبرائی کلیے"),
            (4, "Factorization and Algebraic Manipulation", "تجزی اور الجبرائی جملوں کے کلیے"),
            (5, "Linear Equations and Inequalities", "یک درجی مساواتیں اور غیر مساواتیں"),
            (6, "Basic Statistics", "بنیادی شماریات"),
            (7, "Introduction to Coordinate Geometry", "محدد جیومیٹری کا تعارف")
        ]
        chapters_map = {}
        for ch_no, name_en, name_ur in chapters_data:
            ch = db.query(Chapter).filter_by(subject_id=math_9.id, chapter_number=ch_no).first()
            if not ch:
                ch = Chapter(
                    subject_id=math_9.id,
                    book_id=book_9_math.id,
                    chapter_number=ch_no,
                    name=name_en,
                    name_ur=name_ur
                )
                db.add(ch)
                db.flush()
                print(f"  + Added Chapter {ch_no}: {name_en}")
            chapters_map[ch_no] = ch

        # 5. Seed Sample Topics for Unit 1
        ch1 = chapters_map[1]
        topic1 = db.query(Topic).filter_by(chapter_id=ch1.id, title="Real Numbers & Properties").first()
        if not topic1:
            topic1 = Topic(chapter_id=ch1.id, title="Real Numbers & Properties", topic_number="1.1", page_start=2, page_end=10)
            db.add(topic1)
            db.flush()
            print("  + Added Topic 1.1: Real Numbers & Properties")

        topic2 = db.query(Topic).filter_by(chapter_id=ch1.id, title="Complex Numbers & Conjugates").first()
        if not topic2:
            topic2 = Topic(chapter_id=ch1.id, title="Complex Numbers & Conjugates", topic_number="1.2", page_start=11, page_end=22)
            db.add(topic2)
            db.flush()
            print("  + Added Topic 1.2: Complex Numbers & Conjugates")

        # 6. Seed Sample Questions for Unit 1
        sample_questions = [
            {
                "id": "q-9th-math-ch1-mcq-01",
                "subject_id": math_9.id,
                "chapter_id": ch1.id,
                "topic_id": topic1.id,
                "type": "mcq",
                "question_text": "The value of $i^9$ is:",
                "question_ur": "قیمت معلوم کریں: $i^9$",
                "exercise": "Ex 1.2",
                "options": [{"text": "1"}, {"text": "-1"}, {"text": "$i$"}, {"text": "$-i$"}],
                "correct_answer": "2",
                "marks": 1,
                "difficulty": "easy",
                "source_book_id": book_9_math.id,
                "source_page": 14,
                "status": "approved"
            },
            {
                "id": "q-9th-math-ch1-mcq-02",
                "subject_id": math_9.id,
                "chapter_id": ch1.id,
                "topic_id": topic1.id,
                "type": "mcq",
                "question_text": "The conjugate of $5 + 4i$ is:",
                "question_ur": "$5 + 4i$ کا کاجوگیٹ ہے:",
                "exercise": "Ex 1.2",
                "options": [{"text": "$-5 + 4i$"}, {"text": "$5 - 4i$"}, {"text": "$-5 - 4i$"}, {"text": "$5 + 4i$"}],
                "correct_answer": "1",
                "marks": 1,
                "difficulty": "easy",
                "source_book_id": book_9_math.id,
                "source_page": 16,
                "status": "approved"
            },
            {
                "id": "q-9th-math-ch1-sq-01",
                "subject_id": math_9.id,
                "chapter_id": ch1.id,
                "topic_id": topic1.id,
                "type": "short",
                "question_text": "Define a rational number and give an example.",
                "question_ur": "ناطق عدد کی تعریف کریں اور ایک مثال دیں۔",
                "exercise": "Definitions",
                "options": None,
                "correct_answer": "A number which can be written in the form p/q where p, q are integers and q != 0.",
                "marks": 2,
                "difficulty": "easy",
                "source_book_id": book_9_math.id,
                "source_page": 4,
                "status": "approved"
            },
            {
                "id": "q-9th-math-ch1-sq-02",
                "subject_id": math_9.id,
                "chapter_id": ch1.id,
                "topic_id": topic2.id,
                "type": "short",
                "question_text": "Simplify: $\\sqrt{50} + \\sqrt{18}$",
                "question_ur": "مختصر کریں: $\\sqrt{50} + \\sqrt{18}$",
                "exercise": "Ex 1.1",
                "options": None,
                "correct_answer": "8\\sqrt{2}",
                "marks": 2,
                "difficulty": "medium",
                "source_book_id": book_9_math.id,
                "source_page": 8,
                "status": "approved"
            },
            {
                "id": "q-9th-math-ch1-lq-01",
                "subject_id": math_9.id,
                "chapter_id": ch1.id,
                "topic_id": topic2.id,
                "type": "long",
                "question_text": "Find the values of $x$ and $y$ if: $(x + iy)(2 - 3i) = 4 + i$",
                "question_ur": "$x$ اور $y$ کی قیمتیں معلوم کریں اگر: $(x + iy)(2 - 3i) = 4 + i$",
                "exercise": "Ex 1.3",
                "options": None,
                "correct_answer": "x = 5/13, y = 14/13",
                "marks": 4,
                "difficulty": "hard",
                "source_book_id": book_9_math.id,
                "source_page": 20,
                "status": "approved"
            }
        ]

        for q_data in sample_questions:
            existing = db.query(Question).filter_by(id=q_data["id"]).first()
            if not existing:
                q = Question(**q_data)
                db.add(q)
                print(f"  + Added Question [{q_data['type'].upper()}]: {q_data['id']}")

        # 7. Seed Syllabus Division (Midterm / Unit 1-3)
        div = db.query(SyllabusDivision).filter_by(subject_id=math_9.id, name="Midterm Exam (1st Half)").first()
        if not div:
            div = SyllabusDivision(
                subject_id=math_9.id,
                name="Midterm Exam (1st Half)",
                description="Covers Units 1 to 3: Real Numbers, Logarithms, and Algebra"
            )
            db.add(div)
            db.flush()
            print("  + Added Syllabus Division: Midterm Exam (1st Half)")

            # Link chapters 1, 2, 3
            for ch_num in [1, 2, 3]:
                if ch_num in chapters_map:
                    link = SyllabusDivisionChapter(syllabus_division_id=div.id, chapter_id=chapters_map[ch_num].id)
                    db.add(link)

        # 8. Seed Paper Scheme
        scheme = db.query(PaperScheme).filter_by(subject_id=math_9.id, name="Chapter Test 25 Marks Scheme").first()
        if not scheme:
            scheme = PaperScheme(
                subject_id=math_9.id,
                name="Chapter Test 25 Marks Scheme",
                total_marks=25,
                duration_minutes=45,
                instructions="Encircle the correct option in Section A. Attempt any 6 short questions in Section B."
            )
            db.add(scheme)
            db.flush()
            print("  + Added Paper Scheme: Chapter Test 25 Marks Scheme")

            # Add Scheme Sections: A (MCQs), B (Short), C (Long)
            sec_a = SchemeSection(
                scheme_id=scheme.id,
                section_name="Section A",
                question_type="mcq",
                number_of_questions=5,
                number_to_attempt=5,
                marks_per_question=1
            )
            sec_b = SchemeSection(
                scheme_id=scheme.id,
                section_name="Section B",
                question_type="short",
                number_of_questions=8,
                number_to_attempt=6,
                marks_per_question=2
            )
            sec_c = SchemeSection(
                scheme_id=scheme.id,
                section_name="Section C",
                question_type="long",
                number_of_questions=2,
                number_to_attempt=1,
                marks_per_question=4
            )
            db.add_all([sec_a, sec_b, sec_c])

        db.commit()
        print("==================================================")
        print("[Seed] SUCCESS: Database Seed Completed Successfully!")
        print("==================================================")
    except Exception as e:
        db.rollback()
        print(f"[Seed] Error during seed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    is_sqlite = "--sqlite" in sys.argv
    seed_database(use_sqlite=is_sqlite)
