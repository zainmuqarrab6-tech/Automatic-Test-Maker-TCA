from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class ChapterMetaItem(BaseModel):
    id: int
    class_name: str
    subject_name: str
    chapter_no: int
    name_en: str
    name_ur: Optional[str] = None
    total_questions: int = 0

class SchemeMetaItem(BaseModel):
    id: int
    name: str
    subject_id: int
    total_marks: int
    duration_minutes: int
    sections_count: int = 0

class SyllabusMetaItem(BaseModel):
    id: int
    name: str
    subject_id: int
    chapter_ids: List[int] = []

class MetadataResponse(BaseModel):
    classes: List[str]
    subjects: Dict[str, List[str]]
    chapters: List[ChapterMetaItem]
    question_types: List[str] = ["mcq", "short", "long", "fill_blank", "true_false", "matching"]
    difficulties: List[str] = ["easy", "medium", "hard"]
    statuses: List[str] = ["draft", "approved"]
    schemes: List[SchemeMetaItem] = []
    syllabus_divisions: List[SyllabusMetaItem] = []
