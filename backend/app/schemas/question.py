from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator

class OptionItem(BaseModel):
    text: str

class QuestionBase(BaseModel):
    subject_id: int
    chapter_id: int
    topic_id: Optional[int] = None
    type: str # 'mcq', 'short', 'long', 'fill_blank', 'true_false', 'matching'
    question_text: str
    question_ur: Optional[str] = None
    exercise: Optional[str] = None
    options: Optional[List[Any]] = None
    correct_answer: Optional[str] = None
    marks: int = 1
    difficulty: str = "medium" # 'easy', 'medium', 'hard'
    source_book_id: Optional[int] = None
    source_page: Optional[int] = None
    status: str = "approved" # 'draft', 'approved'

    @field_validator('type')
    @classmethod
    def normalize_type(cls, v: str) -> str:
        # Normalize frontend variant names: short_question -> short, long_question -> long
        v_lower = v.lower()
        if "short" in v_lower:
            return "short"
        if "long" in v_lower:
            return "long"
        return v_lower

class QuestionCreate(QuestionBase):
    id: Optional[str] = None

class QuestionUpdate(BaseModel):
    subject_id: Optional[int] = None
    chapter_id: Optional[int] = None
    topic_id: Optional[int] = None
    type: Optional[str] = None
    question_text: Optional[str] = None
    question_ur: Optional[str] = None
    exercise: Optional[str] = None
    options: Optional[List[Any]] = None
    correct_answer: Optional[str] = None
    marks: Optional[int] = None
    difficulty: Optional[str] = None
    source_book_id: Optional[int] = None
    source_page: Optional[int] = None
    status: Optional[str] = None

class QuestionOut(QuestionBase):
    id: str
    created_at: datetime

    # Frontend compatibility helper fields
    question_en: Optional[str] = None
    class_name: Optional[str] = None
    subject_name: Optional[str] = None
    chapter_no: Optional[int] = None
    chapter_name_en: Optional[str] = None
    chapter_name_ur: Optional[str] = None
    correct_option_index: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class PaginatedQuestions(BaseModel):
    total: int
    page: int
    limit: int
    pages: int
    data: List[QuestionOut]

class QuestionSwapRequest(BaseModel):
    class_name: Optional[str] = None
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    chapter_no: Optional[int] = None
    type: str
    exclude_ids: List[str] = []

class BulkApproveRequest(BaseModel):
    question_ids: List[str]

class BulkChapterRequest(BaseModel):
    question_ids: List[str]
    chapter_id: int

class ChapterQuestionStats(BaseModel):
    chapter_id: int
    chapter_number: int
    name: str
    name_ur: Optional[str] = None
    approved_count: int
    draft_count: int
    rejected_count: int
    total_count: int

