from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.academic import ChapterOut

class ChapterWeightageItem(BaseModel):
    chapter_id: int
    weightage_percent: Optional[float] = 0.0

class SyllabusDivisionBase(BaseModel):
    subject_id: int
    name: str # e.g. "Monthly Test 1", "Midterm", "Final"
    description: Optional[str] = None

class SyllabusDivisionCreate(SyllabusDivisionBase):
    chapter_ids: Optional[List[int]] = []
    chapter_weightages: Optional[List[ChapterWeightageItem]] = []

class SyllabusDivisionUpdate(BaseModel):
    subject_id: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    chapter_ids: Optional[List[int]] = None
    chapter_weightages: Optional[List[ChapterWeightageItem]] = None

class SyllabusDivisionOut(SyllabusDivisionBase):
    id: int
    created_at: datetime
    chapter_ids: List[int] = []
    chapter_weightages: List[ChapterWeightageItem] = []
    subject_name: Optional[str] = None
    class_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

