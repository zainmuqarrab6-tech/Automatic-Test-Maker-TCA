from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.academic import Topic, Chapter
from app.schemas.academic import TopicCreate, TopicUpdate, TopicOut

router = APIRouter(prefix="/topics", tags=["Topics"])

@router.get("", response_model=List[TopicOut])
def get_topics(
    chapter_id: Optional[int] = Query(None, description="Filter by chapter ID"),
    db: Session = Depends(get_db)
):
    """List topics with optional chapter filter."""
    query = db.query(Topic)
    if chapter_id:
        query = query.filter(Topic.chapter_id == chapter_id)
    return query.order_by(Topic.id.asc()).all()

@router.post("", response_model=TopicOut, status_code=status.HTTP_201_CREATED)
def create_topic(payload: TopicCreate, db: Session = Depends(get_db)):
    """Create a new topic within a chapter."""
    ch = db.query(Chapter).filter(Chapter.id == payload.chapter_id).first()
    if not ch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found.")

    new_topic = Topic(
        chapter_id=payload.chapter_id,
        title=payload.get_title(),
        topic_number=payload.topic_number,
        page_start=payload.page_start,
        page_end=payload.page_end
    )
    db.add(new_topic)
    db.commit()
    db.refresh(new_topic)
    return new_topic

@router.get("/{topic_id}", response_model=TopicOut)
def get_topic(topic_id: int, db: Session = Depends(get_db)):
    """Fetch topic details by ID."""
    t = db.query(Topic).filter(Topic.id == topic_id).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found.")
    return t

@router.put("/{topic_id}", response_model=TopicOut)
def update_topic(topic_id: int, payload: TopicUpdate, db: Session = Depends(get_db)):
    """Update topic details."""
    t = db.query(Topic).filter(Topic.id == topic_id).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found.")

    if payload.chapter_id:
        ch = db.query(Chapter).filter(Chapter.id == payload.chapter_id).first()
        if not ch:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found.")
        t.chapter_id = payload.chapter_id
    if payload.title or payload.name_en:
        t.title = payload.title or payload.name_en
    if payload.topic_number is not None:
        t.topic_number = payload.topic_number
    if payload.page_start is not None:
        t.page_start = payload.page_start
    if payload.page_end is not None:
        t.page_end = payload.page_end

    db.commit()
    db.refresh(t)
    return t

@router.delete("/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_topic(topic_id: int, db: Session = Depends(get_db)):
    """Delete a topic."""
    t = db.query(Topic).filter(Topic.id == topic_id).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found.")
    db.delete(t)
    db.commit()
    return None
