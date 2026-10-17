from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class BookBase(BaseModel):
    title: str
    subject_id: int

class BookCreate(BookBase):
    pass

class BookUpdate(BaseModel):
    title: Optional[str] = None
    upload_status: Optional[str] = None
    status_message: Optional[str] = None
    error_message: Optional[str] = None

class BookStatusOut(BaseModel):
    id: int
    title: str
    upload_status: str # 'pending', 'processing', 'completed', 'failed'
    total_pages: int
    processed_pages: int
    progress_percentage: float
    extracted_questions_count: int
    status_message: Optional[str] = None
    error_message: Optional[str] = None

class BookOut(BaseModel):
    id: int
    subject_id: int
    title: str
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_size_bytes: Optional[int] = 0
    upload_status: str
    total_pages: int
    processed_pages: int
    extracted_questions_count: int
    status_message: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    
    # Enriched fields
    subject_name: Optional[str] = None
    class_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class BookBatchApproveRequest(BaseModel):
    question_ids: Optional[List[str]] = None  # None or empty means approve all in this book

class AIConfigStatusOut(BaseModel):
    gemini_configured: bool
    model: str
    supported_formats: List[str]
    setup_instructions: str
