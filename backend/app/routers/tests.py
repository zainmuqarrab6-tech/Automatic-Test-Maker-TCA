import logging
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.test_paper import GeneratedTest, GeneratedTestQuestion
from app.schemas.test_paper import (
    GenerateTestRequest,
    GenerateTestResponse,
    RegenerateQuestionRequest,
    RegenerateQuestionResponse,
    GeneratedTestOut,
    ExportTestRequest
)
from app.services.test_generator import (
    generate_test_paper,
    regenerate_test_question,
    format_generated_test
)
from app.services.test_exporter import (
    generate_test_paper_pdf,
    generate_test_paper_docx
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tests", tags=["Test Generation"])

@router.post("/export/pdf")
def api_export_pdf(payload: ExportTestRequest, db: Session = Depends(get_db)):
    """Export test paper or answer key as a vector PDF document."""
    paper_data = payload.paper_data
    if not paper_data and payload.test_id:
        test = (
            db.query(GeneratedTest)
            .options(
                joinedload(GeneratedTest.questions).joinedload(GeneratedTestQuestion.question),
                joinedload(GeneratedTest.scheme),
                joinedload(GeneratedTest.syllabus_division)
            )
            .filter(GeneratedTest.id == payload.test_id)
            .first()
        )
        if not test:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found.")
        paper_data = format_generated_test(test, db)

    if not paper_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing paper_data or valid test_id.")

    is_key = payload.export_type == "answer_key"
    pdf_bytes = generate_test_paper_pdf(
        paper_data,
        is_answer_key=is_key,
        language_mode=payload.language_mode or "bilingual"
    )

    raw_title = paper_data.get("title") or paper_data.get("testTitle") or "Test_Paper"
    title_slug = re.sub(r'[^a-zA-Z0-9_\-]', '_', str(raw_title))
    filename = f"{title_slug}_Answer_Key.pdf" if is_key else f"{title_slug}_Question_Paper.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.post("/export/docx")
def api_export_docx(payload: ExportTestRequest, db: Session = Depends(get_db)):
    """Export test paper or answer key as an editable Microsoft Word (.docx) document."""
    paper_data = payload.paper_data
    if not paper_data and payload.test_id:
        test = (
            db.query(GeneratedTest)
            .options(
                joinedload(GeneratedTest.questions).joinedload(GeneratedTestQuestion.question),
                joinedload(GeneratedTest.scheme),
                joinedload(GeneratedTest.syllabus_division)
            )
            .filter(GeneratedTest.id == payload.test_id)
            .first()
        )
        if not test:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found.")
        paper_data = format_generated_test(test, db)

    if not paper_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing paper_data or valid test_id.")

    is_key = payload.export_type == "answer_key"
    docx_bytes = generate_test_paper_docx(
        paper_data,
        is_answer_key=is_key,
        language_mode=payload.language_mode or "bilingual"
    )

    raw_title = paper_data.get("title") or paper_data.get("testTitle") or "Test_Paper"
    title_slug = re.sub(r'[^a-zA-Z0-9_\-]', '_', str(raw_title))
    filename = f"{title_slug}_Answer_Key.docx" if is_key else f"{title_slug}_Question_Paper.docx"

    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/{test_id}/export/pdf")
def api_get_export_pdf(
    test_id: str,
    export_type: str = Query("question_paper"),
    language_mode: str = Query("bilingual"),
    db: Session = Depends(get_db)
):
    """Download generated test PDF directly by test ID."""
    test = (
        db.query(GeneratedTest)
        .options(
            joinedload(GeneratedTest.questions).joinedload(GeneratedTestQuestion.question),
            joinedload(GeneratedTest.scheme),
            joinedload(GeneratedTest.syllabus_division)
        )
        .filter(GeneratedTest.id == test_id)
        .first()
    )
    if not test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found.")
    paper_data = format_generated_test(test, db)

    is_key = export_type == "answer_key"
    pdf_bytes = generate_test_paper_pdf(
        paper_data,
        is_answer_key=is_key,
        language_mode=language_mode
    )

    raw_title = paper_data.get("title") or "Test_Paper"
    title_slug = re.sub(r'[^a-zA-Z0-9_\-]', '_', str(raw_title))
    filename = f"{title_slug}_Answer_Key.pdf" if is_key else f"{title_slug}_Question_Paper.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/{test_id}/export/docx")
def api_get_export_docx(
    test_id: str,
    export_type: str = Query("question_paper"),
    language_mode: str = Query("bilingual"),
    db: Session = Depends(get_db)
):
    """Download generated test DOCX directly by test ID."""
    test = (
        db.query(GeneratedTest)
        .options(
            joinedload(GeneratedTest.questions).joinedload(GeneratedTestQuestion.question),
            joinedload(GeneratedTest.scheme),
            joinedload(GeneratedTest.syllabus_division)
        )
        .filter(GeneratedTest.id == test_id)
        .first()
    )
    if not test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found.")
    paper_data = format_generated_test(test, db)

    is_key = export_type == "answer_key"
    docx_bytes = generate_test_paper_docx(
        paper_data,
        is_answer_key=is_key,
        language_mode=language_mode
    )

    raw_title = paper_data.get("title") or "Test_Paper"
    title_slug = re.sub(r'[^a-zA-Z0-9_\-]', '_', str(raw_title))
    filename = f"{title_slug}_Answer_Key.docx" if is_key else f"{title_slug}_Question_Paper.docx"

    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.post("/generate", response_model=GenerateTestResponse)
def api_generate_test(
    payload: GenerateTestRequest,
    db: Session = Depends(get_db)
):
    """
    Generate an automated test paper based on Subject, Syllabus Division, and Paper Scheme.
    - Picks approved questions matching section types from division chapters.
    - Respects chapter weightages or spreads questions evenly.
    - Respects section difficulty mix.
    - Avoids questions from the last N tests.
    - If there are not enough questions, does NOT crash: returns detailed shortage items.
    """
    success, message, test_obj, shortages = generate_test_paper(db, payload)
    
    test_out = None
    if success and test_obj:
        test_out = format_generated_test(test_obj, db)

    return GenerateTestResponse(
        success=success,
        message=message,
        test=test_out,
        shortages=shortages
    )

@router.post("/{test_id}/regenerate-question", response_model=RegenerateQuestionResponse)
def api_regenerate_question(
    test_id: str,
    payload: RegenerateQuestionRequest,
    db: Session = Depends(get_db)
):
    """
    Regenerate/swap a question on a generated test with another valid approved question.
    """
    avoid_n = payload.avoid_recent_n if payload.avoid_recent_n is not None else 3
    success, message, replacement_q, test_obj = regenerate_test_question(
        db, test_id, payload.question_id, avoid_recent_n=avoid_n
    )

    if not success and not test_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)

    replacement_dict = None
    if replacement_q:
        replacement_dict = {
            "id": replacement_q.id,
            "type": replacement_q.type,
            "question_text": replacement_q.question_text,
            "question_ur": replacement_q.question_ur,
            "exercise": replacement_q.exercise,
            "options": replacement_q.options,
            "correct_answer": replacement_q.correct_answer,
            "marks": replacement_q.marks,
            "difficulty": replacement_q.difficulty,
            "chapter_id": replacement_q.chapter_id,
            "chapter_number": replacement_q.chapter.chapter_number if replacement_q.chapter else None,
            "chapter_name": replacement_q.chapter.name if replacement_q.chapter else None,
            "source_book_id": replacement_q.source_book_id,
            "source_page": replacement_q.source_page
        }

    test_out = format_generated_test(test_obj, db) if test_obj else None

    return RegenerateQuestionResponse(
        success=success,
        message=message,
        replacement_question=replacement_dict,
        test=test_out
    )

@router.get("/{test_id}", response_model=GeneratedTestOut)
def api_get_test(test_id: str, db: Session = Depends(get_db)):
    """Fetch details and full question breakdown of a generated test."""
    test = (
        db.query(GeneratedTest)
        .options(
            joinedload(GeneratedTest.questions).joinedload(GeneratedTestQuestion.question),
            joinedload(GeneratedTest.scheme),
            joinedload(GeneratedTest.syllabus_division)
        )
        .filter(GeneratedTest.id == test_id)
        .first()
    )
    if not test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generated test not found.")

    return format_generated_test(test, db)

@router.get("", response_model=List[GeneratedTestOut])
def api_list_tests(
    subject_id: Optional[int] = Query(None, description="Filter tests by subject ID"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List recent generated tests."""
    query = (
        db.query(GeneratedTest)
        .options(
            joinedload(GeneratedTest.questions).joinedload(GeneratedTestQuestion.question),
            joinedload(GeneratedTest.scheme),
            joinedload(GeneratedTest.syllabus_division)
        )
    )
    if subject_id:
        query = query.filter(GeneratedTest.subject_id == subject_id)

    tests = query.order_by(GeneratedTest.created_at.desc()).limit(limit).all()
    return [format_generated_test(t, db) for t in tests]

@router.delete("/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
def api_delete_test(test_id: str, db: Session = Depends(get_db)):
    """Delete a generated test and its question links."""
    test = db.query(GeneratedTest).filter(GeneratedTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generated test not found.")
    db.delete(test)
    db.commit()
    return None
