from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, Enum, Index
from sqlalchemy.orm import relationship
from app.database import Base

class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(20), unique=True, nullable=False, index=True) # e.g. '9th', '10th', '11th', '12th'
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    subjects = relationship("Subject", back_populates="class_rel", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Class(id={self.id}, name='{self.name}')>"


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True) # e.g. 'Mathematics', 'Physics'
    code = Column(String(30), nullable=True) # e.g. 'MATH-9'
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    class_rel = relationship("Class", back_populates="subjects")
    books = relationship("Book", back_populates="subject", cascade="all, delete-orphan")
    chapters = relationship("Chapter", back_populates="subject", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="subject", cascade="all, delete-orphan")
    syllabus_divisions = relationship("SyllabusDivision", back_populates="subject", cascade="all, delete-orphan")
    paper_schemes = relationship("PaperScheme", back_populates="subject", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("class_id", "name", name="uq_subject_class_name"),
    )

    def __repr__(self):
        return f"<Subject(id={self.id}, name='{self.name}', class_id={self.class_id})>"


class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False) # e.g. '9th Mathematics Punjab Textbook Board'
    file_path = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_size_bytes = Column(Integer, default=0, nullable=True)
    upload_status = Column(
        Enum("pending", "processing", "completed", "failed", name="book_upload_status_enum"),
        default="pending",
        nullable=False
    )
    total_pages = Column(Integer, default=0, nullable=False)
    processed_pages = Column(Integer, default=0, nullable=False)
    extracted_questions_count = Column(Integer, default=0, nullable=False)
    status_message = Column(String(255), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    subject = relationship("Subject", back_populates="books")
    chapters = relationship("Chapter", back_populates="book")
    questions = relationship("Question", back_populates="source_book")

    def __repr__(self):
        return f"<Book(id={self.id}, title='{self.title}', status='{self.upload_status}', progress={self.processed_pages}/{self.total_pages})>"


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    book_id = Column(Integer, ForeignKey("books.id", ondelete="SET NULL"), nullable=True, index=True)
    chapter_number = Column(Integer, nullable=False) # e.g. 1, 2, 3
    name = Column(String(255), nullable=False) # e.g. 'Real and Complex Numbers'
    name_ur = Column(String(255), nullable=True) # e.g. 'حقیقی اور بلحاظِ ترکیب اعداد'
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    subject = relationship("Subject", back_populates="chapters")
    book = relationship("Book", back_populates="chapters")
    topics = relationship("Topic", back_populates="chapter", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="chapter", cascade="all, delete-orphan")
    division_links = relationship("SyllabusDivisionChapter", back_populates="chapter", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_chapter_subject_no", "subject_id", "chapter_number"),
    )

    def __repr__(self):
        return f"<Chapter(id={self.id}, no={self.chapter_number}, name='{self.name}')>"


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    topic_number = Column(String(50), nullable=True) # e.g. '1.2.3'
    page_start = Column(Integer, nullable=True)
    page_end = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    chapter = relationship("Chapter", back_populates="topics")
    questions = relationship("Question", back_populates="topic")

    def __repr__(self):
        return f"<Topic(id={self.id}, title='{self.title}')>"
