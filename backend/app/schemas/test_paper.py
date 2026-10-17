from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class GenerateTestRequest(BaseModel):
    subject_id: int
    syllabus_division_id: int
    paper_scheme_id: int
    n_recent_tests: Optional[int] = 3
    title: Optional[str] = None
    campus: Optional[str] = "Sargodha Road Campus"
    date: Optional[str] = None
    time_allowed: Optional[str] = None

class ShortageDetail(BaseModel):
    section_name: str
    question_type: str
    chapter_id: int
    chapter_number: int
    chapter_name: str
    required: int
    available: int
    shortage: int

class RegenerateQuestionRequest(BaseModel):
    question_id: str
    avoid_recent_n: Optional[int] = 3

class TestQuestionDetail(BaseModel):
    id: str
    type: str
    question_text: str
    question_ur: Optional[str] = None
    exercise: Optional[str] = None
    options: Optional[List[Dict[str, Any]]] = None
    correct_answer: Optional[str] = None
    marks: int
    difficulty: str
    chapter_id: int
    chapter_number: Optional[int] = None
    chapter_name: Optional[str] = None
    source_book_id: Optional[int] = None
    source_page: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class GeneratedTestSectionOut(BaseModel):
    section_id: Optional[int] = None
    section_name: str
    question_type: str
    number_of_questions: int
    number_to_attempt: int
    marks_per_question: int
    total_section_marks: int
    questions: List[TestQuestionDetail] = []

class GeneratedTestOut(BaseModel):
    id: str
    subject_id: Optional[int] = None
    scheme_id: Optional[int] = None
    syllabus_division_id: Optional[int] = None
    title: str
    campus: str
    date: Optional[str] = None
    time_allowed: str
    total_marks: int
    created_at: datetime
    subject_name: Optional[str] = None
    class_name: Optional[str] = None
    syllabus_name: Optional[str] = None
    sections: List[GeneratedTestSectionOut] = []
    all_questions: List[TestQuestionDetail] = []
    model_config = ConfigDict(from_attributes=True)

class GenerateTestResponse(BaseModel):
    success: bool
    message: str
    test: Optional[GeneratedTestOut] = None
    shortages: List[ShortageDetail] = []

class RegenerateQuestionResponse(BaseModel):
    success: bool
    message: str
    replacement_question: Optional[TestQuestionDetail] = None
    test: Optional[GeneratedTestOut] = None

class ExportTestRequest(BaseModel):
    test_id: Optional[str] = None
    paper_data: Optional[Dict[str, Any]] = None
    export_type: Optional[str] = "question_paper"  # "question_paper" | "answer_key"
    language_mode: Optional[str] = "bilingual"      # "bilingual" | "en" | "ur"
    show_watermark: Optional[bool] = True
    options: Optional[Dict[str, Any]] = None

