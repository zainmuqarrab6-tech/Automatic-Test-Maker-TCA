from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.scheme import PaperScheme, SchemeSection
from app.models.academic import Subject
from app.schemas.scheme import (
    PaperSchemeCreate, PaperSchemeUpdate, PaperSchemeOut,
    SchemeSectionCreate, SchemeSectionOut
)

router = APIRouter(prefix="/schemes", tags=["Paper Schemes"])

@router.get("", response_model=List[PaperSchemeOut])
def get_paper_schemes(
    subject_id: Optional[int] = Query(None, description="Filter schemes by subject ID"),
    db: Session = Depends(get_db)
):
    """List paper schemes with their sections."""
    query = db.query(PaperScheme).options(joinedload(PaperScheme.sections))
    if subject_id:
        query = query.filter(PaperScheme.subject_id == subject_id)
    return query.order_by(PaperScheme.id.asc()).all()

@router.post("", response_model=PaperSchemeOut, status_code=status.HTTP_201_CREATED)
def create_paper_scheme(payload: PaperSchemeCreate, db: Session = Depends(get_db)):
    """Create a new paper scheme with optional sections."""
    sub = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")

    new_scheme = PaperScheme(
        subject_id=payload.subject_id,
        name=payload.name,
        total_marks=payload.total_marks,
        duration_minutes=payload.duration_minutes,
        instructions=payload.instructions
    )
    db.add(new_scheme)
    db.flush()

    if payload.sections:
        for sec in payload.sections:
            s_obj = SchemeSection(
                scheme_id=new_scheme.id,
                section_name=sec.section_name,
                question_type=sec.question_type,
                number_of_questions=sec.number_of_questions,
                number_to_attempt=sec.number_to_attempt,
                marks_per_question=sec.marks_per_question,
                difficulty_mix=sec.difficulty_mix
            )
            db.add(s_obj)

    db.commit()
    db.refresh(new_scheme)
    return new_scheme

@router.get("/{scheme_id}", response_model=PaperSchemeOut)
def get_paper_scheme(scheme_id: int, db: Session = Depends(get_db)):
    """Fetch details of a specific paper scheme by ID."""
    s = db.query(PaperScheme).options(joinedload(PaperScheme.sections)).filter(PaperScheme.id == scheme_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper scheme not found.")
    return s

@router.put("/{scheme_id}", response_model=PaperSchemeOut)
def update_paper_scheme(scheme_id: int, payload: PaperSchemeUpdate, db: Session = Depends(get_db)):
    """Update paper scheme header."""
    s = db.query(PaperScheme).filter(PaperScheme.id == scheme_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper scheme not found.")

    if payload.subject_id:
        s.subject_id = payload.subject_id
    if payload.name:
        s.name = payload.name
    if payload.total_marks is not None:
        s.total_marks = payload.total_marks
    if payload.duration_minutes is not None:
        s.duration_minutes = payload.duration_minutes
    if payload.instructions is not None:
        s.instructions = payload.instructions

    db.commit()
    db.refresh(s)
    return s

@router.delete("/{scheme_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_paper_scheme(scheme_id: int, db: Session = Depends(get_db)):
    """Delete paper scheme and its sections cascade."""
    s = db.query(PaperScheme).filter(PaperScheme.id == scheme_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper scheme not found.")
    db.delete(s)
    db.commit()
    return None
