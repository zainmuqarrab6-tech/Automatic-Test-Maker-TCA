from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.academic import Subject, Class
from app.schemas.academic import SubjectCreate, SubjectUpdate, SubjectOut

router = APIRouter(prefix="/subjects", tags=["Subjects"])

@router.get("", response_model=List[SubjectOut])
def get_subjects(
    class_id: Optional[int] = Query(None, description="Filter by class ID"),
    class_name: Optional[str] = Query(None, description="Filter by class name e.g. 9th"),
    db: Session = Depends(get_db)
):
    """List subjects with optional class filter."""
    query = db.query(Subject)
    if class_id:
        query = query.filter(Subject.class_id == class_id)
    elif class_name:
        cls_obj = db.query(Class).filter(Class.name == class_name).first()
        if cls_obj:
            query = query.filter(Subject.class_id == cls_obj.id)
        else:
            return []
    return query.order_by(Subject.id.asc()).all()

@router.post("", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
def create_subject(payload: SubjectCreate, db: Session = Depends(get_db)):
    """Create a new subject under a class."""
    cls_obj = db.query(Class).filter(Class.id == payload.class_id).first()
    if not cls_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found.")
    
    existing = db.query(Subject).filter(
        Subject.class_id == payload.class_id,
        Subject.name == payload.name
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Subject '{payload.name}' already exists in this class."
        )

    new_sub = Subject(
        class_id=payload.class_id,
        name=payload.name,
        code=payload.code or f"{payload.name[:4].upper()}-{cls_obj.name}"
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    return new_sub

@router.get("/{subject_id}", response_model=SubjectOut)
def get_subject(subject_id: int, db: Session = Depends(get_db)):
    """Fetch details of a specific subject by ID."""
    sub = db.query(Subject).filter(Subject.id == subject_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")
    return sub

@router.put("/{subject_id}", response_model=SubjectOut)
def update_subject(subject_id: int, payload: SubjectUpdate, db: Session = Depends(get_db)):
    """Update subject details."""
    sub = db.query(Subject).filter(Subject.id == subject_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")
    
    if payload.class_id:
        cls_obj = db.query(Class).filter(Class.id == payload.class_id).first()
        if not cls_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target class not found.")
        sub.class_id = payload.class_id
    if payload.name:
        sub.name = payload.name
    if payload.code is not None:
        sub.code = payload.code

    db.commit()
    db.refresh(sub)
    return sub

@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    """Delete a subject and cascade delete chapters and questions."""
    sub = db.query(Subject).filter(Subject.id == subject_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")
    db.delete(sub)
    db.commit()
    return None
