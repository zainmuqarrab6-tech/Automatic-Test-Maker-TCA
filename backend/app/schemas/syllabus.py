from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.academic import ChapterOut

class SyllabusDivisionBase(BaseModel):
    subject_id: int
    name: str # e.g. "Monthly Test 1", "Midterm", "Final"
    description: Optional[str] = None

class SyllabusDivisionCreate(SyllabusDivisionBase):
    chapter_ids: Optional[List[int]] = []

class SyllabusDivisionUpdate(BaseModel):
    subject_id: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    chapter_ids: Optional[List[int]] = None

class SyllabusDivisionOut(SyllabusDivisionBase):
    id: int
    created_at: datetime
    chapter_ids: List[int] = []
    model_config = ConfigDict(from_attributes=True)
