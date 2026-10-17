from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey
from app.database import Base

class Upload(Base):
    __tablename__ = "uploads"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id", ondelete="SET NULL"), nullable=True, index=True)
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False) # e.g. 'application/pdf', 'image/png'
    purpose = Column(
        Enum("book", "scheme", name="upload_purpose_enum"),
        nullable=False,
        index=True
    )
    processing_status = Column(
        Enum("uploaded", "processing", "completed", "failed", name="upload_status_enum"),
        default="uploaded",
        nullable=False,
        index=True
    )
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Upload(id={self.id}, name='{self.file_name}', purpose='{self.purpose}', status='{self.processing_status}')>"
