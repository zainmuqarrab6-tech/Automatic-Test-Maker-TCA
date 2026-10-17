from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base

class GeneratedTest(Base):
    __tablename__ = "generated_tests"

    id = Column(String(64), primary_key=True, index=True) # e.g. 'test-1729158000'
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True)
    scheme_id = Column(Integer, ForeignKey("paper_schemes.id", ondelete="SET NULL"), nullable=True, index=True)
    syllabus_division_id = Column(Integer, ForeignKey("syllabus_divisions.id", ondelete="SET NULL"), nullable=True, index=True)

    title = Column(String(255), nullable=False) # e.g. "Chapter-Wise Test Series 2026"
    campus = Column(String(150), default="Sargodha Road Campus", nullable=False)
    date = Column(String(50), nullable=True) # e.g. "2026-10-17"
    time_allowed = Column(String(50), default="45 Mins", nullable=False)
    total_marks = Column(Integer, nullable=False) # e.g. 25
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    subject = relationship("Subject")
    scheme = relationship("PaperScheme", back_populates="generated_tests")
    syllabus_division = relationship("SyllabusDivision", back_populates="generated_tests")
    questions = relationship("GeneratedTestQuestion", back_populates="test", cascade="all, delete-orphan", order_by="GeneratedTestQuestion.order")

    def __repr__(self):
        return f"<GeneratedTest(id='{self.id}', title='{self.title}', marks={self.total_marks})>"


class GeneratedTestQuestion(Base):
    __tablename__ = "generated_test_questions"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    test_id = Column(String(64), ForeignKey("generated_tests.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String(64), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    section_id = Column(Integer, ForeignKey("scheme_sections.id", ondelete="SET NULL"), nullable=True, index=True)
    order = Column(Integer, nullable=False) # 1, 2, 3...

    # Relationships
    test = relationship("GeneratedTest", back_populates="questions")
    question = relationship("Question", back_populates="test_links")
    section = relationship("SchemeSection", back_populates="test_questions")

    __table_args__ = (
        Index("idx_test_question_order", "test_id", "order"),
    )

    def __repr__(self):
        return f"<GeneratedTestQuestion(test_id='{self.test_id}', question_id='{self.question_id}', order={self.order})>"
