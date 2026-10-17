from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class SyllabusDivision(Base):
    __tablename__ = "syllabus_divisions"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False) # e.g. "Monthly Test 1", "Midterm", "Final"
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    subject = relationship("Subject", back_populates="syllabus_divisions")
    chapters = relationship("SyllabusDivisionChapter", back_populates="syllabus_division", cascade="all, delete-orphan")
    generated_tests = relationship("GeneratedTest", back_populates="syllabus_division")

    def __repr__(self):
        return f"<SyllabusDivision(id={self.id}, name='{self.name}', subject_id={self.subject_id})>"


class SyllabusDivisionChapter(Base):
    __tablename__ = "syllabus_division_chapters"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    syllabus_division_id = Column(Integer, ForeignKey("syllabus_divisions.id", ondelete="CASCADE"), nullable=False, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False, index=True)
    weightage_percent = Column(Float, nullable=True, default=0.0) # Optional chapter weightage (e.g. 50.0%)

    # Relationships
    syllabus_division = relationship("SyllabusDivision", back_populates="chapters")
    chapter = relationship("Chapter", back_populates="division_links")

    __table_args__ = (
        UniqueConstraint("syllabus_division_id", "chapter_id", name="uq_division_chapter"),
    )

    def __repr__(self):
        return f"<SyllabusDivisionChapter(division_id={self.syllabus_division_id}, chapter_id={self.chapter_id})>"
