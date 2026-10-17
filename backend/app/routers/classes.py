from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.academic import Class
from app.schemas.academic import ClassCreate, ClassUpdate, ClassOut

router = APIRouter(prefix="/classes", tags=["Classes"])

@router.get("", response_model=List[ClassOut])
def get_classes(db: Session = Depends(get_db)):
    """List all registered academic classes (e.g. 9th, 10th, 11th, 12th)."""
    return db.query(Class).order_by(Class.id.asc()).all()

@router.post("", response_model=ClassOut, status_code=status.HTTP_201_CREATED)
def create_class(payload: ClassCreate, db: Session = Depends(get_db)):
    """Register a new class level."""
    existing = db.query(Class).filter(Class.name == payload.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Class '{payload.name}' already exists."
        )
    new_class = Class(name=payload.name)
    db.add(new_class)
    db.commit()
    db.refresh(new_class)
    return new_class

@router.get("/{class_id}", response_model=ClassOut)
def get_class(class_id: int, db: Session = Depends(get_db)):
    """Fetch details of a specific class by ID."""
    cls_obj = db.query(Class).filter(Class.id == class_id).first()
    if not cls_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found.")
    return cls_obj

@router.put("/{class_id}", response_model=ClassOut)
def update_class(class_id: int, payload: ClassUpdate, db: Session = Depends(get_db)):
    """Update class name."""
    cls_obj = db.query(Class).filter(Class.id == class_id).first()
    if not cls_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found.")
    if payload.name:
        existing = db.query(Class).filter(Class.name == payload.name, Class.id != class_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Class name already in use.")
        cls_obj.name = payload.name
    db.commit()
    db.refresh(cls_obj)
    return cls_obj

@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_class(class_id: int, db: Session = Depends(get_db)):
    """Delete a class and associated subjects cascade."""
    cls_obj = db.query(Class).filter(Class.id == class_id).first()
    if not cls_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found.")
    db.delete(cls_obj)
    db.commit()
    return None
