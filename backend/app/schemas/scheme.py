from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator

class SchemeSectionBase(BaseModel):
    section_name: str # e.g. "Section A", "Section B", "Section C", "Question 1"
    question_type: str # 'mcq', 'short', 'long', 'fill_blank', 'true_false', 'matching'
    number_of_questions: int
    number_to_attempt: int
    marks_per_question: int
    difficulty_mix: Optional[Dict[str, Any]] = None

    @field_validator('question_type')
    @classmethod
    def normalize_section_type(cls, v: str) -> str:
        v_lower = str(v).lower().strip()
        if "mcq" in v_lower or "multiple" in v_lower:
            return "mcq"
        if "short" in v_lower:
            return "short"
        if "long" in v_lower or "detailed" in v_lower:
            return "long"
        if "fill" in v_lower or "blank" in v_lower:
            return "fill_blank"
        if "true" in v_lower or "false" in v_lower:
            return "true_false"
        if "match" in v_lower:
            return "matching"
        return v_lower

class SchemeSectionCreate(SchemeSectionBase):
    pass

class SchemeSectionUpdate(BaseModel):
    section_name: Optional[str] = None
    question_type: Optional[str] = None
    number_of_questions: Optional[int] = None
    number_to_attempt: Optional[int] = None
    marks_per_question: Optional[int] = None
    difficulty_mix: Optional[Dict[str, Any]] = None

class SchemeSectionOut(SchemeSectionBase):
    id: int
    scheme_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PaperSchemeBase(BaseModel):
    subject_id: int
    name: str # e.g. "Punjab Board 9th Mathematics Scheme 2026"
    total_marks: int
    duration_minutes: int
    instructions: Optional[str] = None

class PaperSchemeCreate(PaperSchemeBase):
    sections: Optional[List[SchemeSectionCreate]] = []

class PaperSchemeUpdate(BaseModel):
    subject_id: Optional[int] = None
    name: Optional[str] = None
    total_marks: Optional[int] = None
    duration_minutes: Optional[int] = None
    instructions: Optional[str] = None
    sections: Optional[List[SchemeSectionCreate]] = None

class PaperSchemeOut(PaperSchemeBase):
    id: int
    created_at: datetime
    sections: List[SchemeSectionOut] = []
    subject_name: Optional[str] = None
    class_name: Optional[str] = None
    calculated_total_marks: Optional[int] = 0
    marks_balanced: Optional[bool] = True
    validation_warning: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class SchemeExtractionResponse(BaseModel):
    name: str
    total_marks: int
    duration_minutes: int
    instructions: Optional[str] = None
    sections: List[SchemeSectionCreate] = []
    calculated_total_marks: Optional[int] = 0
    marks_balanced: Optional[bool] = True
    validation_warning: Optional[str] = None
