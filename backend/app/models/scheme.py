from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class PaperScheme(Base):
    __tablename__ = "paper_schemes"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False) # e.g. "Punjab Board 9th Mathematics Scheme 2026"
    total_marks = Column(Integer, nullable=False) # e.g. 75, 50, 25
    duration_minutes = Column(Integer, nullable=False) # e.g. 150
    instructions = Column(Text, nullable=True) # Official student instructions
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    subject = relationship("Subject", back_populates="paper_schemes")
    sections = relationship("SchemeSection", back_populates="scheme", cascade="all, delete-orphan")
    generated_tests = relationship("GeneratedTest", back_populates="scheme")

    def __repr__(self):
        return f"<PaperScheme(id={self.id}, name='{self.name}', total_marks={self.total_marks})>"


class SchemeSection(Base):
    __tablename__ = "scheme_sections"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    scheme_id = Column(Integer, ForeignKey("paper_schemes.id", ondelete="CASCADE"), nullable=False, index=True)
    section_name = Column(String(20), nullable=False) # e.g. "A", "B", "C" or "Section A"
    question_type = Column(
        Enum("mcq", "short", "long", "fill_blank", "true_false", "matching", name="scheme_question_type_enum"),
        nullable=False
    )
    number_of_questions = Column(Integer, nullable=False) # Total available questions (e.g. 8)
    number_to_attempt = Column(Integer, nullable=False)   # Compulsory or elective limit (e.g. 6)
    marks_per_question = Column(Integer, nullable=False)  # Marks per question (e.g. 1 for MCQ, 2 for Short, 4 for Long)
    difficulty_mix = Column(JSON, nullable=True)          # e.g. {"easy": 30, "medium": 50, "hard": 20}
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    scheme = relationship("PaperScheme", back_populates="sections")
    test_questions = relationship("GeneratedTestQuestion", back_populates="section")

    def __repr__(self):
        return f"<SchemeSection(id={self.id}, name='{self.section_name}', type='{self.question_type}', attempt={self.number_to_attempt}/{self.number_of_questions})>"
