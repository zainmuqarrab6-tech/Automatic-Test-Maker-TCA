from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.syllabus import SyllabusDivision, SyllabusDivisionChapter
from app.models.academic import Subject, Chapter
from app.schemas.syllabus import (
    SyllabusDivisionCreate, SyllabusDivisionUpdate, SyllabusDivisionOut
)

router = APIRouter(tags=["Syllabus Divisions"])

def format_division(d: SyllabusDivision) -> dict:
    weightages = []
    chapter_ids = []
    for link in d.chapters:
        chapter_ids.append(link.chapter_id)
        weightages.append({
            "chapter_id": link.chapter_id,
            "weightage_percent": getattr(link, "weightage_percent", 0.0) or 0.0
        })

    subj_name = d.subject.name if d.subject else None
    class_name = d.subject.class_rel.name if d.subject and d.subject.class_rel else None

    return {
        "id": d.id,
        "subject_id": d.subject_id,
        "name": d.name,
        "description": d.description,
        "created_at": d.created_at,
        "chapter_ids": chapter_ids,
        "chapter_weightages": weightages,
        "subject_name": subj_name,
        "class_name": class_name
    }

@router.get("/syllabus-divisions", response_model=List[SyllabusDivisionOut])
@router.get("/syllabus", response_model=List[SyllabusDivisionOut])
def get_syllabus_divisions(
    subject_id: Optional[int] = Query(None, description="Filter by subject ID"),
    db: Session = Depends(get_db)
):
    """List syllabus divisions (e.g. Monthly Test 1, Midterm, Final Mock)."""
    query = db.query(SyllabusDivision)
    if subject_id:
        query = query.filter(SyllabusDivision.subject_id == subject_id)
    records = query.order_by(SyllabusDivision.id.asc()).all()
    return [format_division(r) for r in records]

@router.post("/syllabus-divisions", response_model=SyllabusDivisionOut, status_code=status.HTTP_201_CREATED)
@router.post("/syllabus", response_model=SyllabusDivisionOut, status_code=status.HTTP_201_CREATED)
def create_syllabus_division(payload: SyllabusDivisionCreate, db: Session = Depends(get_db)):
    """Create a new syllabus division and link chapters with optional weightages."""
    sub = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")

    new_div = SyllabusDivision(
        subject_id=payload.subject_id,
        name=payload.name,
        description=payload.description
    )
    db.add(new_div)
    db.flush()

    weight_map = {}
    if payload.chapter_weightages:
        for cw in payload.chapter_weightages:
            weight_map[cw.chapter_id] = cw.weightage_percent or 0.0

    target_ch_ids = payload.chapter_ids or list(weight_map.keys())
    for ch_id in target_ch_ids:
        ch = db.query(Chapter).filter(Chapter.id == ch_id).first()
        if ch:
            link = SyllabusDivisionChapter(
                syllabus_division_id=new_div.id,
                chapter_id=ch_id,
                weightage_percent=weight_map.get(ch_id, 0.0)
            )
            db.add(link)

    db.commit()
    db.refresh(new_div)
    return format_division(new_div)

@router.get("/syllabus-divisions/{division_id}", response_model=SyllabusDivisionOut)
@router.get("/syllabus/{division_id}", response_model=SyllabusDivisionOut)
def get_syllabus_division(division_id: int, db: Session = Depends(get_db)):
    """Fetch syllabus division details by ID."""
    d = db.query(SyllabusDivision).filter(SyllabusDivision.id == division_id).first()
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Syllabus division not found.")
    return format_division(d)

@router.put("/syllabus-divisions/{division_id}", response_model=SyllabusDivisionOut)
@router.put("/syllabus/{division_id}", response_model=SyllabusDivisionOut)
def update_syllabus_division(division_id: int, payload: SyllabusDivisionUpdate, db: Session = Depends(get_db)):
    """Update syllabus division and associated chapters with weightages."""
    d = db.query(SyllabusDivision).filter(SyllabusDivision.id == division_id).first()
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Syllabus division not found.")

    if payload.subject_id:
        d.subject_id = payload.subject_id
    if payload.name:
        d.name = payload.name
    if payload.description is not None:
        d.description = payload.description

    if payload.chapter_ids is not None or payload.chapter_weightages is not None:
        db.query(SyllabusDivisionChapter).filter(
            SyllabusDivisionChapter.syllabus_division_id == division_id
        ).delete()

        weight_map = {}
        if payload.chapter_weightages:
            for cw in payload.chapter_weightages:
                weight_map[cw.chapter_id] = cw.weightage_percent or 0.0

        target_ch_ids = payload.chapter_ids if payload.chapter_ids is not None else list(weight_map.keys())
        for ch_id in target_ch_ids:
            link = SyllabusDivisionChapter(
                syllabus_division_id=division_id,
                chapter_id=ch_id,
                weightage_percent=weight_map.get(ch_id, 0.0)
            )
            db.add(link)

    db.commit()
    db.refresh(d)
    return format_division(d)

@router.delete("/syllabus-divisions/{division_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/syllabus/{division_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_syllabus_division(division_id: int, db: Session = Depends(get_db)):
    """Delete a syllabus division."""
    d = db.query(SyllabusDivision).filter(SyllabusDivision.id == division_id).first()
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Syllabus division not found.")
    db.delete(d)
    db.commit()
    return None
