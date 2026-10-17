from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Index, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class Question(Base):
    __tablename__ = "questions"

    id = Column(String(64), primary_key=True, index=True) # e.g. 'q-9th-math-ch1-01'
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id", ondelete="SET NULL"), nullable=True, index=True)

    # Question Type
    type = Column(
        Enum("mcq", "short", "long", "fill_blank", "true_false", "matching", name="question_type_enum"),
        nullable=False,
        index=True
    )

    # Bilingual Question Content (Supports LaTeX Math Formulas)
    question_text = Column(Text, nullable=False) # Primary/English statement
    question_ur = Column(Text, nullable=True)     # Urdu translation (Nastaleeq)
    exercise = Column(String(100), nullable=True) # e.g. 'Ex 1.1', 'Review Ex', 'Definitions'

    # MCQ Options and Answers
    options = Column(JSON, nullable=True) # e.g. [{"text": "Option A"}, {"text": "Option B"}, ...]
    correct_answer = Column(Text, nullable=True) # e.g. "0" (index for MCQ) or text answer

    marks = Column(Integer, default=1, nullable=False)
    difficulty = Column(
        Enum("easy", "medium", "hard", name="question_difficulty_enum"),
        default="medium",
        nullable=False,
        index=True
    )

    # Traceability & Source Book
    source_book_id = Column(Integer, ForeignKey("books.id", ondelete="SET NULL"), nullable=True, index=True)
    source_page = Column(Integer, nullable=True, index=True)

    # Workflow Status
    status = Column(
        Enum("draft", "approved", name="question_status_enum"),
        default="approved",
        nullable=False,
        index=True
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    subject = relationship("Subject", back_populates="questions")
    chapter = relationship("Chapter", back_populates="questions")
    topic = relationship("Topic", back_populates="questions")
    source_book = relationship("Book", back_populates="questions")
    test_links = relationship("GeneratedTestQuestion", back_populates="question", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_filter_questions", "subject_id", "chapter_id", "type", "status"),
        Index("idx_search_exercise", "exercise"),
    )

    def __repr__(self):
        return f"<Question(id='{self.id}', type='{self.type}', marks={self.marks}, status='{self.status}')>"
