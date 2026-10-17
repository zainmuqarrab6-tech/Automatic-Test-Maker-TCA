from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.academic import Chapter, Subject, Class
from app.schemas.academic import ChapterCreate, ChapterUpdate, ChapterOut

router = APIRouter(prefix="/chapters", tags=["Chapters"])

@router.get("", response_model=List[ChapterOut])
def get_chapters(
    subject_id: Optional[int] = Query(None, description="Filter by subject ID"),
    class_name: Optional[str] = Query(None, description="Filter by class name e.g. 9th"),
    subject_name: Optional[str] = Query(None, description="Filter by subject name e.g. Mathematics"),
    db: Session = Depends(get_db)
):
    """List chapters with optional subject and class filters."""
    query = db.query(Chapter)
    if subject_id:
        query = query.filter(Chapter.subject_id == subject_id)
    elif class_name and subject_name:
        cls_obj = db.query(Class).filter(Class.name == class_name).first()
        if cls_obj:
            sub_obj = db.query(Subject).filter(Subject.class_id == cls_obj.id, Subject.name == subject_name).first()
            if sub_obj:
                query = query.filter(Chapter.subject_id == sub_obj.id)
            else:
                return []
        else:
            return []
    return query.order_by(Chapter.chapter_number.asc()).all()

@router.post("", response_model=ChapterOut, status_code=status.HTTP_201_CREATED)
def create_chapter(payload: ChapterCreate, db: Session = Depends(get_db)):
    """Create a new chapter."""
    sub = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")

    new_ch = Chapter(
        subject_id=payload.subject_id,
        book_id=payload.book_id,
        chapter_number=payload.chapter_number,
        name=payload.get_name(),
        name_ur=payload.name_ur
    )
    db.add(new_ch)
    db.commit()
    db.refresh(new_ch)
    return new_ch

@router.get("/{chapter_id}", response_model=ChapterOut)
def get_chapter(chapter_id: int, db: Session = Depends(get_db)):
    """Fetch details of a specific chapter by ID."""
    ch = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not ch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found.")
    return ch

@router.put("/{chapter_id}", response_model=ChapterOut)
def update_chapter(chapter_id: int, payload: ChapterUpdate, db: Session = Depends(get_db)):
    """Update chapter information."""
    ch = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not ch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found.")

    if payload.subject_id:
        sub = db.query(Subject).filter(Subject.id == payload.subject_id).first()
        if not sub:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")
        ch.subject_id = payload.subject_id
    if payload.chapter_number is not None:
        ch.chapter_number = payload.chapter_number
    if payload.name or payload.name_en:
        ch.name = payload.name or payload.name_en
    if payload.name_ur is not None:
        ch.name_ur = payload.name_ur
    if payload.book_id is not None:
        ch.book_id = payload.book_id

    db.commit()
    db.refresh(ch)
    return ch

@router.delete("/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chapter(chapter_id: int, db: Session = Depends(get_db)):
    """Delete chapter."""
    ch = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not ch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found.")
    db.delete(ch)
    db.commit()
    return None
