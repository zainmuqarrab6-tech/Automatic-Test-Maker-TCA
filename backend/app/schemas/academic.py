from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

# ==========================================
# Class Schemas
# ==========================================
class ClassBase(BaseModel):
    name: str

class ClassCreate(ClassBase):
    pass

class ClassUpdate(BaseModel):
    name: Optional[str] = None

class ClassOut(ClassBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Subject Schemas
# ==========================================
class SubjectBase(BaseModel):
    class_id: int
    name: str
    code: Optional[str] = None

class SubjectCreate(SubjectBase):
    pass

class SubjectUpdate(BaseModel):
    class_id: Optional[int] = None
    name: Optional[str] = None
    code: Optional[str] = None

class SubjectOut(SubjectBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Chapter Schemas
# ==========================================
class ChapterBase(BaseModel):
    subject_id: int
    book_id: Optional[int] = None
    chapter_number: int
    name: str
    name_en: Optional[str] = None
    name_ur: Optional[str] = None

class ChapterCreate(BaseModel):
    subject_id: int
    book_id: Optional[int] = None
    chapter_number: int
    name: Optional[str] = None
    name_en: Optional[str] = None
    name_ur: Optional[str] = None

    def get_name(self) -> str:
        return self.name or self.name_en or f"Chapter {self.chapter_number}"

class ChapterUpdate(BaseModel):
    subject_id: Optional[int] = None
    book_id: Optional[int] = None
    chapter_number: Optional[int] = None
    name: Optional[str] = None
    name_en: Optional[str] = None
    name_ur: Optional[str] = None

class ChapterOut(BaseModel):
    id: int
    subject_id: int
    book_id: Optional[int] = None
    chapter_number: int
    name: str
    name_en: Optional[str] = None
    name_ur: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

    def model_post_init(self, __context) -> None:
        if not self.name_en:
            self.name_en = self.name


# ==========================================
# Topic Schemas
# ==========================================
class TopicBase(BaseModel):
    chapter_id: int
    title: str
    topic_number: Optional[str] = None
    page_start: Optional[int] = None
    page_end: Optional[int] = None

class TopicCreate(BaseModel):
    chapter_id: int
    title: Optional[str] = None
    name_en: Optional[str] = None
    name_ur: Optional[str] = None
    topic_number: Optional[str] = None
    page_start: Optional[int] = None
    page_end: Optional[int] = None

    def get_title(self) -> str:
        return self.title or self.name_en or "Topic"

class TopicUpdate(BaseModel):
    chapter_id: Optional[int] = None
    title: Optional[str] = None
    name_en: Optional[str] = None
    name_ur: Optional[str] = None
    topic_number: Optional[str] = None
    page_start: Optional[int] = None
    page_end: Optional[int] = None

class TopicOut(BaseModel):
    id: int
    chapter_id: int
    title: str
    name_en: Optional[str] = None
    name_ur: Optional[str] = None
    topic_number: Optional[str] = None
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

    def model_post_init(self, __context) -> None:
        if not self.name_en:
            self.name_en = self.title
