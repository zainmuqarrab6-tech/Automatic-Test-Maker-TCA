from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.models.question import Question

router = APIRouter(tags=["Health"])

@router.get("/health")
def healthcheck(db: Session = Depends(get_db)):
    """API & Database connection healthcheck."""
    db_status = "offline"
    total_q = 0
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
        total_q = db.query(Question).count()
    except Exception:
        db_status = "offline"

    return {
        "status": "online",
        "app": "The Century Academy - Test Maker API",
        "academy": "The Century Academy of Science, Commerce & Arts",
        "database": db_status,
        "total_questions": total_q,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
