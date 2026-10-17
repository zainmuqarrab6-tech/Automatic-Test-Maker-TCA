import os
import io
import json
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session, joinedload
import pymupdf  # PyMuPDF

from app.database import get_db
from app.models.scheme import PaperScheme, SchemeSection
from app.models.academic import Subject
from app.schemas.scheme import (
    PaperSchemeCreate, PaperSchemeUpdate, PaperSchemeOut,
    SchemeSectionCreate, SchemeSectionOut, SchemeExtractionResponse
)
from app.services.gemini_extractor import call_gemini_api, normalize_question_type
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/schemes", tags=["Paper Schemes"])

SCHEME_SYSTEM_PROMPT = """You are an expert curriculum coordinator and exam paper scheme analyzer for Pakistani boards (Punjab Board BISE, Federal Board FBISE, Sindh, KPK, Balochistan).
Analyze the provided document (paper scheme, pairing scheme, syllabus breakdown, or model paper structure).

Extract the exact exam layout and return ONLY a valid JSON object matching this schema:
{
  "name": "Title of the scheme (e.g. 9th Mathematics Board Scheme 2026)",
  "total_marks": 75,
  "duration_minutes": 150,
  "instructions": "General instructions for students, e.g. Attempt all questions from Section A...",
  "sections": [
    {
      "section_name": "Section A",
      "question_type": "mcq",
      "number_of_questions": 15,
      "number_to_attempt": 15,
      "marks_per_question": 1
    },
    {
      "section_name": "Section B",
      "question_type": "short",
      "number_of_questions": 9,
      "number_to_attempt": 6,
      "marks_per_question": 2
    },
    {
      "section_name": "Section C",
      "question_type": "long",
      "number_of_questions": 3,
      "number_to_attempt": 2,
      "marks_per_question": 8
    }
  ]
}

RULES:
1. question_type MUST be one of: "mcq", "short", "long", "fill_blank", "true_false", "matching".
2. If total_marks is not explicitly given, calculate it as sum of (number_to_attempt * marks_per_question).
3. If duration_minutes is not given, estimate standard time (e.g. 150 min for 75/100 marks, 120 min for 50/60 marks).
4. Return ONLY pure JSON, no markdown backticks or extra commentary.
"""

def format_scheme(s: PaperScheme) -> dict:
    """Format PaperScheme with marks sum and validation check."""
    sec_marks_sum = 0
    formatted_sections = []
    
    for sec in s.sections:
        attempt = sec.number_to_attempt or 0
        marks_ea = sec.marks_per_question or 0
        sec_marks_sum += (attempt * marks_ea)
        formatted_sections.append({
            "id": sec.id,
            "scheme_id": sec.scheme_id,
            "section_name": sec.section_name,
            "question_type": sec.question_type,
            "number_of_questions": sec.number_of_questions,
            "number_to_attempt": sec.number_to_attempt,
            "marks_per_question": sec.marks_per_question,
            "difficulty_mix": sec.difficulty_mix,
            "created_at": sec.created_at
        })

    is_balanced = (sec_marks_sum == s.total_marks) if s.sections else True
    warning = None
    if not is_balanced:
        diff = sec_marks_sum - s.total_marks
        sign = f"+{diff}" if diff > 0 else f"{diff}"
        warning = f"Section marks sum to {sec_marks_sum}, but paper total marks is set to {s.total_marks} ({sign} marks mismatch)."

    subj_name = s.subject.name if s.subject else None
    class_name = s.subject.class_rel.name if (s.subject and s.subject.class_rel) else None

    return {
        "id": s.id,
        "subject_id": s.subject_id,
        "name": s.name,
        "total_marks": s.total_marks,
        "duration_minutes": s.duration_minutes,
        "instructions": s.instructions,
        "created_at": s.created_at,
        "sections": formatted_sections,
        "subject_name": subj_name,
        "class_name": class_name,
        "calculated_total_marks": sec_marks_sum,
        "marks_balanced": is_balanced,
        "validation_warning": warning
    }

@router.get("", response_model=List[PaperSchemeOut])
def get_paper_schemes(
    subject_id: Optional[int] = Query(None, description="Filter schemes by subject ID"),
    db: Session = Depends(get_db)
):
    """List paper schemes with their sections, validation status and academic metadata."""
    query = db.query(PaperScheme).options(
        joinedload(PaperScheme.sections),
        joinedload(PaperScheme.subject).joinedload(Subject.class_rel)
    )
    if subject_id:
        query = query.filter(PaperScheme.subject_id == subject_id)
    records = query.order_by(PaperScheme.id.asc()).all()
    return [format_scheme(r) for r in records]

@router.post("", response_model=PaperSchemeOut, status_code=status.HTTP_201_CREATED)
def create_paper_scheme(payload: PaperSchemeCreate, db: Session = Depends(get_db)):
    """Create a new paper scheme with optional sections and compute marks validation."""
    clean_name = (payload.name or "").strip()
    if not clean_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Scheme name cannot be empty.")

    if payload.total_marks <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Total marks must be greater than zero.")

    sub = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")

    # Validate section integrity
    if payload.sections:
        for idx, sec in enumerate(payload.sections):
            if sec.number_to_attempt > sec.number_of_questions:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Section '{sec.section_name}': Questions to attempt ({sec.number_to_attempt}) cannot exceed total questions ({sec.number_of_questions})."
                )
            if sec.marks_per_question < 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Section '{sec.section_name}': Marks per question must be at least 1."
                )

    new_scheme = PaperScheme(
        subject_id=payload.subject_id,
        name=clean_name,
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
    return format_scheme(new_scheme)

@router.get("/{scheme_id}", response_model=PaperSchemeOut)
def get_paper_scheme(scheme_id: int, db: Session = Depends(get_db)):
    """Fetch details of a specific paper scheme by ID."""
    s = db.query(PaperScheme).options(
        joinedload(PaperScheme.sections),
        joinedload(PaperScheme.subject).joinedload(Subject.class_rel)
    ).filter(PaperScheme.id == scheme_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper scheme not found.")
    return format_scheme(s)

@router.put("/{scheme_id}", response_model=PaperSchemeOut)
def update_paper_scheme(scheme_id: int, payload: PaperSchemeUpdate, db: Session = Depends(get_db)):
    """Update paper scheme header and optionally rewrite sections."""
    s = db.query(PaperScheme).options(
        joinedload(PaperScheme.sections),
        joinedload(PaperScheme.subject).joinedload(Subject.class_rel)
    ).filter(PaperScheme.id == scheme_id).first()
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

    # If sections array is provided, replace existing sections
    if payload.sections is not None:
        db.query(SchemeSection).filter(SchemeSection.scheme_id == scheme_id).delete()
        for sec in payload.sections:
            s_obj = SchemeSection(
                scheme_id=scheme_id,
                section_name=sec.section_name,
                question_type=sec.question_type,
                number_of_questions=sec.number_of_questions,
                number_to_attempt=sec.number_to_attempt,
                marks_per_question=sec.marks_per_question,
                difficulty_mix=sec.difficulty_mix
            )
            db.add(s_obj)

    db.commit()
    db.refresh(s)
    return format_scheme(s)

@router.delete("/{scheme_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_paper_scheme(scheme_id: int, db: Session = Depends(get_db)):
    """Delete paper scheme and its sections cascade."""
    s = db.query(PaperScheme).filter(PaperScheme.id == scheme_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper scheme not found.")
    db.delete(s)
    db.commit()
    return None

@router.post("/extract-ai", response_model=SchemeExtractionResponse)
async def extract_paper_scheme_from_file(file: UploadFile = File(...)):
    """
    Upload a paper scheme document (PDF, PNG, JPG, JPEG, WEBP).
    Extracts text/image and sends to Gemini API to return a structured JSON scheme
    with calculated section marks and validation warnings.
    """
    ext = os.path.splitext(file.filename or "")[1].lower()
    allowed_exts = [".pdf", ".png", ".jpg", ".jpeg", ".webp"]
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format: {ext}. Allowed formats: {', '.join(allowed_exts)}"
        )

    max_bytes = settings.MAX_SCHEME_UPLOAD_BYTES
    file_bytes = await file.read(max_bytes + 1)
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Uploaded scheme file exceeds maximum allowed size of {max_bytes // (1024 * 1024)}MB."
        )
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    # Check for Gemini API key
    if not settings.GEMINI_API_KEY:
        # Provide resilient fallback preview structure if key is not configured
        fallback_sections = [
            SchemeSectionCreate(
                section_name="Section A (MCQs)",
                question_type="mcq",
                number_of_questions=15,
                number_to_attempt=15,
                marks_per_question=1
            ),
            SchemeSectionCreate(
                section_name="Section B (Short Questions)",
                question_type="short",
                number_of_questions=9,
                number_to_attempt=6,
                marks_per_question=2
            ),
            SchemeSectionCreate(
                section_name="Section C (Long Questions)",
                question_type="long",
                number_of_questions=3,
                number_to_attempt=2,
                marks_per_question=8
            )
        ]
        calc_marks = sum(s.number_to_attempt * s.marks_per_question for s in fallback_sections)
        return SchemeExtractionResponse(
            name=f"Extracted Scheme from {os.path.basename(file.filename or 'Document')}",
            total_marks=calc_marks,
            duration_minutes=150,
            instructions="Attempt Section A on bubble sheet. Attempt required questions from Section B & C in answer book.",
            sections=fallback_sections,
            calculated_total_marks=calc_marks,
            marks_balanced=True,
            validation_warning="Note: GEMINI_API_KEY is not configured in .env. Showing standard Board Paper Scheme template. Add GEMINI_API_KEY to enable live AI OCR extraction."
        )

    extracted_json: Dict[str, Any] = {}

    try:
        if ext == ".pdf":
            # Extract PDF pages
            pdf_doc = pymupdf.open(stream=file_bytes, filetype="pdf")
            total_pages = min(len(pdf_doc), 5)  # Exam schemes are typically 1-3 pages
            
            combined_text = ""
            scanned_pages = []

            for p_idx in range(total_pages):
                page = pdf_doc.load_page(p_idx)
                txt = page.get_text("text").strip()
                if len(txt) > 80:
                    combined_text += f"\n--- PAGE {p_idx + 1} ---\n{txt}"
                else:
                    # Convert to pixmap image
                    pix = page.get_pixmap(dpi=150)
                    scanned_pages.append(pix.tobytes("png"))

            if combined_text:
                extracted_json = call_gemini_api(
                    prompt=SCHEME_SYSTEM_PROMPT,
                    text_content=combined_text
                )
            elif scanned_pages:
                extracted_json = call_gemini_api(
                    prompt=SCHEME_SYSTEM_PROMPT,
                    image_bytes=scanned_pages[0],
                    image_mime="image/png"
                )
            else:
                raise ValueError("Could not extract readable text or pages from PDF.")

        else:
            # Single image file (PNG, JPG, WEBP)
            mime = "image/png" if ext == ".png" else ("image/webp" if ext == ".webp" else "image/jpeg")
            extracted_json = call_gemini_api(
                prompt=SCHEME_SYSTEM_PROMPT,
                image_bytes=file_bytes,
                image_mime=mime
            )

    except Exception as exc:
        logger.error(f"Error calling Gemini for scheme extraction: {exc}")
        # Return fallback with error description
        calc_marks = 75
        return SchemeExtractionResponse(
            name=f"Scheme from {os.path.basename(file.filename or 'Document')}",
            total_marks=75,
            duration_minutes=150,
            instructions="Attempt all questions as indicated.",
            sections=[
                SchemeSectionCreate(
                    section_name="Section A",
                    question_type="mcq",
                    number_of_questions=15,
                    number_to_attempt=15,
                    marks_per_question=1
                ),
                SchemeSectionCreate(
                    section_name="Section B",
                    question_type="short",
                    number_of_questions=9,
                    number_to_attempt=6,
                    marks_per_question=2
                )
            ],
            calculated_total_marks=27,
            marks_balanced=False,
            validation_warning=f"AI extraction encountered an issue: {str(exc)}. Pre-filled with standard template for your review."
        )

    # Process and validate extracted sections
    raw_sections = extracted_json.get("sections", [])
    valid_sections: List[SchemeSectionCreate] = []

    for s in raw_sections:
        if not isinstance(s, dict):
            continue
        sec_name = str(s.get("section_name") or "Section").strip()
        q_type = normalize_question_type(str(s.get("question_type") or "short"))
        num_q = int(s.get("number_of_questions") or 1)
        attempt_q = int(s.get("number_to_attempt") or num_q)
        if attempt_q > num_q:
            attempt_q = num_q
        marks_ea = int(s.get("marks_per_question") or (1 if q_type == "mcq" else 2))

        valid_sections.append(SchemeSectionCreate(
            section_name=sec_name,
            question_type=q_type,
            number_of_questions=num_q,
            number_to_attempt=attempt_q,
            marks_per_question=marks_ea
        ))

    # Calculate marks & validation
    total_sec_marks = sum(sec.number_to_attempt * sec.marks_per_question for sec in valid_sections)
    total_marks = int(extracted_json.get("total_marks") or (total_sec_marks if total_sec_marks > 0 else 75))
    duration = int(extracted_json.get("duration_minutes") or 150)
    name = str(extracted_json.get("name") or f"Scheme from {os.path.basename(file.filename or 'Uploaded File')}").strip()
    instructions = extracted_json.get("instructions")

    is_balanced = (total_sec_marks == total_marks) if valid_sections else True
    warning = None
    if not is_balanced:
        diff = total_sec_marks - total_marks
        sign = f"+{diff}" if diff > 0 else f"{diff}"
        warning = f"Section marks sum to {total_sec_marks}, but Paper Total Marks is {total_marks} ({sign} marks mismatch). Please adjust section attempts or marks per question."

    return SchemeExtractionResponse(
        name=name,
        total_marks=total_marks,
        duration_minutes=duration,
        instructions=instructions,
        sections=valid_sections,
        calculated_total_marks=total_sec_marks,
        marks_balanced=is_balanced,
        validation_warning=warning
    )
