import os
import shutil
import uuid
import logging
from typing import List, Optional
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
import pymupdf

from app.database import get_db, SessionLocal
from app.config import settings
from app.models.academic import Book, Subject, Class
from app.models.question import Question
from app.models.upload import Upload
from app.models.user import User
from app.auth import require_admin
from app.schemas.book import (
    BookOut, BookStatusOut, BookBatchApproveRequest, AIConfigStatusOut
)
from app.schemas.question import QuestionOut
from app.services.gemini_extractor import process_book_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/books", tags=["Books & AI Extraction"])

# Storage directory for uploaded textbook files
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "books"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/pjpeg",
    "image/jpg",
    "application/octet-stream"
}

@router.get("/ai-config", response_model=AIConfigStatusOut)
def get_ai_config_status():
    """Check whether Gemini AI is configured and get setup instructions"""
    has_key = bool(settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY.strip()) > 5)
    return AIConfigStatusOut(
        gemini_configured=has_key,
        model="gemini-1.5-flash",
        supported_formats=["PDF", "PNG", "JPG", "JPEG"],
        setup_instructions=(
            "1. Visit Google AI Studio: https://aistudio.google.com/\n"
            "2. Sign in with your Google account and click 'Get API key'.\n"
            "3. Create a free API key.\n"
            "4. Add GEMINI_API_KEY=your_key_here to the .env file in the project root.\n"
            "5. Restart the backend server."
        )
    )

@router.post("/upload", response_model=BookOut, status_code=status.HTTP_201_CREATED)
async def upload_book(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    subject_id: int = Form(...),
    title: Optional[str] = Form(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    1. Upload a textbook file (PDF, PNG, JPG). Restricted to Administrator.
    2. Attach it to a subject.
    3. Validate file extension, MIME type, and size limits (max 25MB).
    4. Store file in backend/uploads/books/.
    5. Trigger background AI page-by-page extraction job.
    """
    # 1. Validate subject exists
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail=f"Subject with ID {subject_id} not found.")

    # 2. Validate file extension
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{file_ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    if file.content_type and file.content_type.lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file MIME type '{file.content_type}'. Allowed types: PDF, PNG, JPG, JPEG."
        )

    # 3. Save file securely to uploads folder with strict size limit
    safe_name = os.path.basename(file.filename or "book_upload").replace(" ", "_")
    unique_filename = f"{uuid.uuid4().hex[:10]}_{safe_name}"
    target_path = UPLOAD_DIR / unique_filename

    max_bytes = settings.MAX_BOOK_UPLOAD_BYTES
    bytes_read = 0
    chunk_size = 1024 * 1024  # 1MB chunk

    try:
        with open(target_path, "wb") as buffer:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                bytes_read += len(chunk)
                if bytes_read > max_bytes:
                    buffer.close()
                    if target_path.exists():
                        target_path.unlink()
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds maximum allowed size of {max_bytes // (1024 * 1024)}MB."
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        if target_path.exists():
            target_path.unlink()
        logger.error(f"Failed to write uploaded file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    if bytes_read == 0:
        if target_path.exists():
            target_path.unlink()
        raise HTTPException(status_code=400, detail="Uploaded file cannot be empty.")

    file_size = bytes_read
    clean_title = title.strip() if title and title.strip() else f"{subj.name} Textbook ({file.filename})"

    # 4. Create Book database entry
    book = Book(
        subject_id=subject_id,
        title=clean_title,
        file_path=str(target_path),
        file_name=file.filename,
        file_size_bytes=file_size,
        upload_status="pending",
        total_pages=0,
        processed_pages=0,
        extracted_questions_count=0,
        status_message="File uploaded. Extraction queued for background processing."
    )
    db.add(book)
    db.commit()
    db.refresh(book)

    # 5. Create audit Upload record
    upload_rec = Upload(
        book_id=book.id,
        file_path=str(target_path),
        file_name=file.filename or unique_filename,
        file_type="application/pdf" if file_ext == ".pdf" else f"image/{file_ext.replace('.', '')}",
        purpose="book",
        processing_status="uploaded"
    )
    db.add(upload_rec)
    db.commit()

    # 6. Trigger background extraction pipeline
    background_tasks.add_task(process_book_pipeline, book.id, SessionLocal)

    # Enrich output with subject and class names
    out = BookOut.model_validate(book)
    out.subject_name = subj.name
    out.class_name = subj.class_rel.name if subj.class_rel else ""
    return out

@router.get("/", response_model=List[BookOut])
def get_books(
    subject_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """List uploaded books with processing status and progress"""
    query = db.query(Book)
    if subject_id:
        query = query.filter(Book.subject_id == subject_id)
    books = query.order_by(Book.id.desc()).offset(offset).limit(limit).all()

    result = []
    for b in books:
        item = BookOut.model_validate(b)
        if b.subject:
            item.subject_name = b.subject.name
            if b.subject.class_rel:
                item.class_name = b.subject.class_rel.name
        result.append(item)
    return result

@router.get("/{book_id}", response_model=BookOut)
def get_book(book_id: int, db: Session = Depends(get_db)):
    """Get single book details"""
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found.")
    item = BookOut.model_validate(book)
    if book.subject:
        item.subject_name = book.subject.name
        if book.subject.class_rel:
            item.class_name = book.subject.class_rel.name
    return item

@router.get("/{book_id}/status", response_model=BookStatusOut)
def get_book_status(book_id: int, db: Session = Depends(get_db)):
    """
    Get live extraction progress for polling.
    Returns: upload_status, processed_pages, total_pages, progress_percentage, extracted_questions_count.
    """
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found.")

    progress_pct = 0.0
    if book.total_pages > 0:
        progress_pct = round((book.processed_pages / book.total_pages) * 100.0, 1)
    elif book.upload_status == "completed":
        progress_pct = 100.0

    return BookStatusOut(
        id=book.id,
        title=book.title,
        upload_status=book.upload_status,
        total_pages=book.total_pages,
        processed_pages=book.processed_pages,
        progress_percentage=progress_pct,
        extracted_questions_count=book.extracted_questions_count,
        status_message=book.status_message,
        error_message=book.error_message
    )

@router.get("/{book_id}/pages/{page_number}/image")
def get_book_page_image(book_id: int, page_number: int, db: Session = Depends(get_db)):
    """Render and stream high-resolution PNG image of the specified book page for side-by-side comparison."""
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book or not book.file_path or not os.path.exists(book.file_path):
        raise HTTPException(status_code=404, detail="Book or file not found on disk.")

    ext = os.path.splitext(book.file_path)[1].lower()
    if ext == ".pdf":
        try:
            doc = pymupdf.open(book.file_path)
            page_idx = page_number - 1
            if page_idx < 0 or page_idx >= len(doc):
                doc.close()
                raise HTTPException(status_code=404, detail=f"Page {page_number} is out of range (1 - {len(doc)}).")
            page = doc.load_page(page_idx)
            # Render at 150 DPI for crisp reading and math formula clarity
            pix = page.get_pixmap(dpi=150)
            img_bytes = pix.tobytes("png")
            doc.close()
            return Response(content=img_bytes, media_type="image/png")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error rendering PDF page {page_number}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to render page: {str(e)}")
    elif ext in [".png", ".jpg", ".jpeg"]:
        media_type = "image/png" if ext == ".png" else "image/jpeg"
        with open(book.file_path, "rb") as f:
            return Response(content=f.read(), media_type=media_type)
    else:
        raise HTTPException(status_code=400, detail="Unsupported book file format for preview.")

@router.get("/{book_id}/questions", response_model=List[QuestionOut])
def get_book_questions(
    book_id: int,
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by 'draft' or 'approved'"),
    question_type: Optional[str] = Query(None, alias="type"),
    page_number: Optional[int] = Query(None, alias="page"),
    db: Session = Depends(get_db)
):
    """Get all questions extracted from this book with optional status/type/page filtering"""
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found.")

    query = db.query(Question).filter(Question.source_book_id == book_id)
    if status_filter:
        query = query.filter(Question.status == status_filter)
    if question_type:
        query = query.filter(Question.type == question_type)
    if page_number:
        query = query.filter(Question.source_page == page_number)

    questions = query.order_by(Question.source_page.asc(), Question.id.asc()).all()

    # Enrich with helper fields for frontend
    result = []
    for q in questions:
        q_out = QuestionOut.model_validate(q)
        q_out.question_en = q.question_text
        if q.subject:
            q_out.subject_name = q.subject.name
            if q.subject.class_rel:
                q_out.class_name = q.subject.class_rel.name
        if q.chapter:
            q_out.chapter_no = q.chapter.chapter_number
            q_out.chapter_name_en = q.chapter.name
            q_out.chapter_name_ur = q.chapter.name_ur
        if q.type == "mcq" and q.correct_answer and q.correct_answer.isdigit():
            q_out.correct_option_index = int(q.correct_answer)
        result.append(q_out)
    return result

@router.post("/{book_id}/approve-all")
def approve_all_book_questions(
    book_id: int,
    payload: Optional[BookBatchApproveRequest] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Promote questions from 'draft' to 'approved'. (Restricted to Administrator).
    If question_ids provided, approves only those; otherwise approves all drafts for this book.
    """
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found.")

    query = db.query(Question).filter(
        Question.source_book_id == book_id,
        Question.status == "draft"
    )

    if payload and payload.question_ids:
        query = query.filter(Question.id.in_(payload.question_ids))

    updated_count = query.update({"status": "approved"}, synchronize_session=False)
    db.commit()

    return {
        "book_id": book_id,
        "message": f"Successfully approved {updated_count} questions.",
        "approved_count": updated_count
    }

@router.post("/{book_id}/retry")
def retry_book_extraction(
    book_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Retry extraction job for a book that previously failed or needs re-processing (Admin only)"""
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found.")

    book.upload_status = "pending"
    book.error_message = None
    book.status_message = "Re-queued for extraction."
    db.commit()

    background_tasks.add_task(process_book_pipeline, book.id, SessionLocal)
    return {"message": "Book extraction job re-queued in background.", "book_id": book_id}

@router.delete("/{book_id}", status_code=status.HTTP_200_OK)
def delete_book(
    book_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete a book and its physical uploaded file from disk (Admin only)"""
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found.")

    # Remove physical file if exists
    if book.file_path and os.path.exists(book.file_path):
        try:
            os.remove(book.file_path)
        except Exception as e:
            logger.warning(f"Failed to delete book file {book.file_path}: {e}")

    db.delete(book)
    db.commit()
    return {"message": f"Book '{book.title}' (ID {book_id}) deleted successfully."}
