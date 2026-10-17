from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.academic import Class, Subject, Chapter
from app.models.question import Question
from app.models.scheme import PaperScheme
from app.models.syllabus import SyllabusDivision
from app.schemas.metadata import (
    MetadataResponse,
    ChapterMetaItem,
    SchemeMetaItem,
    SyllabusMetaItem
)

router = APIRouter(prefix="/metadata", tags=["Metadata"])

@router.get("", response_model=MetadataResponse)
def get_metadata(db: Session = Depends(get_db)):
    """Fetch complete academic metadata for frontend Test Generator wizard."""
    classes = db.query(Class).order_by(Class.id.asc()).all()
    class_names = [c.name for c in classes]

    subjects = db.query(Subject).join(Subject.class_rel).order_by(Subject.id.asc()).all()
    subjects_dict = defaultdict(list)
    for s in subjects:
        subjects_dict[s.class_rel.name].append(s.name)

    # Question counts per chapter
    counts = db.query(
        Question.chapter_id,
        func.count(Question.id).label("count")
    ).filter(Question.status == "approved").group_by(Question.chapter_id).all()
    count_map = {c[0]: c[1] for c in counts}

    chapters = db.query(Chapter).join(Chapter.subject).join(Subject.class_rel).order_by(
        Subject.class_id.asc(),
        Chapter.chapter_number.asc()
    ).all()

    chapter_items = []
    for ch in chapters:
        chapter_items.append(
            ChapterMetaItem(
                id=ch.id,
                class_name=ch.subject.class_rel.name,
                subject_name=ch.subject.name,
                chapter_no=ch.chapter_number,
                name_en=ch.name,
                name_ur=ch.name_ur,
                total_questions=count_map.get(ch.id, 0)
            )
        )

    # Standard paper schemes
    schemes = db.query(PaperScheme).all()
    scheme_items = [
        SchemeMetaItem(
            id=s.id,
            name=s.name,
            subject_id=s.subject_id,
            total_marks=s.total_marks,
            duration_minutes=s.duration_minutes,
            sections_count=len(s.sections) if s.sections else 0
        )
        for s in schemes
    ]

    # Syllabus divisions
    divisions = db.query(SyllabusDivision).all()
    div_items = [
        SyllabusMetaItem(
            id=d.id,
            name=d.name,
            subject_id=d.subject_id,
            chapter_ids=[ch.id for ch in d.chapters] if d.chapters else []
        )
        for d in divisions
    ]

    return MetadataResponse(
        classes=class_names,
        subjects=dict(subjects_dict),
        chapters=chapter_items,
        schemes=scheme_items,
        syllabus_divisions=div_items
    )
