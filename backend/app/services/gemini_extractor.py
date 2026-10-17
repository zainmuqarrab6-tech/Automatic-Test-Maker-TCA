import os
import re
import json
import time
import base64
import uuid
import logging
from typing import Dict, Any, List, Optional
import httpx
import pymupdf  # PyMuPDF
from PIL import Image

from app.config import settings
from app.models.academic import Book, Chapter, Topic
from app.models.question import Question
from app.models.upload import Upload

logger = logging.getLogger(__name__)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

SYSTEM_PROMPT = """You are an expert exam question extraction and digitization system for school textbooks (Classes 9th, 10th, 11th, 12th) following Pakistani Board curriculum (Punjab Textbook Board, Federal Board, Sindh, KPK, Balochistan).
Analyze the provided page content (image or text) carefully.

Extract:
1. Chapters: Any unit or chapter title found on this page (chapter_number, name_en, name_ur).
2. Topics: Any topic heading or subheading found on this page (topic_number, title).
3. Questions: ALL questions found on this page (e.g. Exercise questions, Review Exercise questions, multiple choice questions, short answer questions, long descriptive problems, mathematical proofs, numericals, definitions, fill in the blanks, true/false).

CRITICAL REQUIREMENTS:
- Support bilingual content: English and Urdu.
  - If a question is in Urdu, put it in 'question_ur' and provide an English translation in 'question_text'.
  - If it is in English, put it in 'question_text' and provide an accurate Urdu translation in 'question_ur'.
  - For mathematical and scientific formulas, use standard LaTeX enclosed in dollar signs (e.g. $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$ or $E = mc^2$).
- For Multiple Choice Questions (type: "mcq"):
  - Provide 4 options in the 'options' array: [{"text": "..."}, {"text": "..."}, {"text": "..."}, {"text": "..."}]
  - If a correct answer or key is visible on the page, provide the 0-indexed option index as a string ("0", "1", "2", or "3") in 'correct_answer'. Otherwise null.
  - Default marks: 1.
- For Short Questions (type: "short"):
  - Conceptual or short questions (e.g. "Define...", "Solve...", "What is...").
  - Default marks: 2.
- For Long Questions (type: "long"):
  - Detailed questions, multi-part proofs, theorems, extensive numericals.
  - Default marks: 4.
- For Fill in the Blank (type: "fill_blank") and True/False (type: "true_false"):
  - Include statement and options/answer if present.
- Difficulty guess: "easy", "medium", or "hard".
- If this page is pure explanatory text without any questions, return empty array for "questions".

You MUST output ONLY a valid JSON object matching this exact schema:
{
  "chapters": [
    {
      "chapter_number": 1,
      "name_en": "Matrices and Determinants",
      "name_ur": "قالب اور ان کا مقطع"
    }
  ],
  "topics": [
    {
      "topic_number": "1.1",
      "title": "Introduction to Matrices"
    }
  ],
  "questions": [
    {
      "type": "mcq",
      "question_text": "If matrix A has order 2x3, the number of elements in A is:",
      "question_ur": "اگر قالب A کا مرتبہ 2x3 ہو تو اس کے ارکان کی تعداد ہو گی:",
      "exercise": "Exercise 1.1",
      "options": [{"text": "3"}, {"text": "5"}, {"text": "6"}, {"text": "2"}],
      "correct_answer": "2",
      "marks": 1,
      "difficulty": "easy",
      "page_number": 1
    }
  ]
}
"""

def clean_json_response(raw_text: str) -> Dict[str, Any]:
    """Clean markdown backticks and parse JSON string reliably"""
    cleaned = raw_text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    # Find first { and last }
    start_idx = cleaned.find("{")
    end_idx = cleaned.rfind("}")
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        cleaned = cleaned[start_idx:end_idx + 1]

    try:
        return json.loads(cleaned)
    except Exception as e:
        logger.error(f"Failed to parse JSON from Gemini response: {e}\nRaw output:\n{raw_text}")
        return {"chapters": [], "topics": [], "questions": []}

def call_gemini_api(
    prompt: str,
    image_bytes: Optional[bytes] = None,
    image_mime: str = "image/png",
    text_content: Optional[str] = None,
    max_retries: int = 3
) -> Dict[str, Any]:
    """Send text or image to Gemini API with retries and return parsed JSON"""
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY is not configured in .env. "
            "Please obtain an API key from Google AI Studio (https://aistudio.google.com/) "
            "and add GEMINI_API_KEY=your_key to your .env file."
        )

    parts: List[Dict[str, Any]] = [{"text": prompt}]

    if text_content:
        parts.append({"text": f"\n\n--- TEXTBOOK PAGE CONTENT ---\n{text_content}"})

    if image_bytes:
        encoded_image = base64.b64encode(image_bytes).decode("utf-8")
        parts.append({
            "inline_data": {
                "mime_type": image_mime,
                "data": encoded_image
            }
        })

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.1
        }
    }

    url = f"{GEMINI_API_URL}?key={api_key}"
    headers = {"Content-Type": "application/json"}

    backoff = 2.0
    for attempt in range(max_retries):
        try:
            with httpx.Client(timeout=65.0) as client:
                response = client.post(url, headers=headers, json=payload)
                
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts_resp = candidates[0]["content"].get("parts", [])
                        if parts_resp and "text" in parts_resp[0]:
                            return clean_json_response(parts_resp[0]["text"])
                    return {"chapters": [], "topics": [], "questions": []}

                elif response.status_code in (429, 503, 500):
                    logger.warning(f"Gemini API attempt {attempt + 1} returned status {response.status_code}. Retrying in {backoff}s...")
                    time.sleep(backoff)
                    backoff *= 2
                else:
                    error_detail = response.text
                    logger.error(f"Gemini API returned unhandled error {response.status_code}: {error_detail}")
                    raise RuntimeError(f"Gemini API Error {response.status_code}: {error_detail}")

        except httpx.RequestError as exc:
            logger.warning(f"Network error on attempt {attempt + 1} calling Gemini: {exc}")
            if attempt < max_retries - 1:
                time.sleep(backoff)
                backoff *= 2
            else:
                raise

    raise RuntimeError("Gemini API call failed after multiple retry attempts.")

def normalize_question_type(raw_type: str) -> str:
    """Normalize question type into allowed enum values"""
    t = (raw_type or "").lower().strip()
    if "mcq" in t or "multiple" in t or "choice" in t:
        return "mcq"
    if "short" in t:
        return "short"
    if "long" in t or "detailed" in t or "problem" in t:
        return "long"
    if "blank" in t or "fill" in t:
        return "fill_blank"
    if "true" in t or "false" in t:
        return "true_false"
    if "match" in t:
        return "matching"
    return "short"

def process_book_pipeline(book_id: int, db_session_factory):
    """
    Main background job to process uploaded book page-by-page.
    Extracts text/images, sends to Gemini API in batches, creates chapters/topics,
    and saves questions strictly with status='draft'.
    """
    db = db_session_factory()
    try:
        book = db.query(Book).filter(Book.id == book_id).first()
        if not book:
            logger.error(f"Book with id {book_id} not found.")
            return

        file_path = book.file_path
        if not file_path or not os.path.exists(file_path):
            book.upload_status = "failed"
            book.error_message = f"Uploaded file not found at path: {file_path}"
            db.commit()
            return

        # Check API key configuration early
        if not settings.GEMINI_API_KEY:
            book.upload_status = "failed"
            book.error_message = (
                "GEMINI_API_KEY is not configured in .env file. "
                "Please add GEMINI_API_KEY to your .env to enable AI question extraction."
            )
            db.commit()
            return

        book.upload_status = "processing"
        book.status_message = "Analyzing file structure..."
        db.commit()

        ext = os.path.splitext(file_path)[1].lower()
        is_pdf = ext == ".pdf"
        is_image = ext in [".png", ".jpg", ".jpeg"]

        total_pages = 1
        pdf_doc = None

        if is_pdf:
            try:
                pdf_doc = pymupdf.open(file_path)
                total_pages = len(pdf_doc)
            except Exception as e:
                book.upload_status = "failed"
                book.error_message = f"Failed to open PDF with PyMuPDF: {str(e)}"
                db.commit()
                return

        book.total_pages = total_pages
        book.processed_pages = 0
        book.extracted_questions_count = 0
        book.status_message = f"Starting extraction: 0 of {total_pages} pages processed."
        db.commit()

        # Cache chapters for this subject to avoid duplicate creations
        existing_chapters = {ch.chapter_number: ch for ch in db.query(Chapter).filter(Chapter.subject_id == book.subject_id).all()}
        active_chapter_id = list(existing_chapters.values())[0].id if existing_chapters else None
        total_extracted_questions = 0

        # Process page by page
        for page_idx in range(total_pages):
            page_number = page_idx + 1
            book.status_message = f"Processing page {page_number} of {total_pages}..."
            db.commit()

            try:
                extracted_data = None

                if is_pdf and pdf_doc:
                    page = pdf_doc.load_page(page_idx)
                    text = page.get_text("text").strip()

                    # Check if text is sufficient or if it is scanned / math / Urdu Nastaleeq
                    has_sufficient_text = len(text) >= 70 and sum(c.isalnum() for c in text) >= 35

                    if not has_sufficient_text:
                        # Scanned page or low text: render to crisp image (150 DPI)
                        pix = page.get_pixmap(dpi=150)
                        img_bytes = pix.tobytes("png")
                        prompt = f"{SYSTEM_PROMPT}\nSubject: {book.subject.name if book.subject else ''}, Book: {book.title}. Page Number: {page_number}."
                        extracted_data = call_gemini_api(prompt=prompt, image_bytes=img_bytes, image_mime="image/png")
                    else:
                        # Rich text available: first try text extraction
                        prompt = f"{SYSTEM_PROMPT}\nSubject: {book.subject.name if book.subject else ''}, Book: {book.title}. Page Number: {page_number}."
                        extracted_data = call_gemini_api(prompt=prompt, text_content=text)

                        # If text didn't extract any questions on this page, try image fallback
                        if not extracted_data.get("questions") and page.rect.width > 0:
                            pix = page.get_pixmap(dpi=150)
                            fallback_img_bytes = pix.tobytes("png")
                            fallback_data = call_gemini_api(prompt=prompt, image_bytes=fallback_img_bytes, image_mime="image/png")
                            if fallback_data.get("questions"):
                                extracted_data = fallback_data

                elif is_image:
                    # Single image file
                    with open(file_path, "rb") as f:
                        img_bytes = f.read()
                    mime = "image/png" if ext == ".png" else "image/jpeg"
                    prompt = f"{SYSTEM_PROMPT}\nSubject: {book.subject.name if book.subject else ''}, Book: {book.title}. Page Number: {page_number}."
                    extracted_data = call_gemini_api(prompt=prompt, image_bytes=img_bytes, image_mime=mime)

                # Process chapters found on this page
                if extracted_data and "chapters" in extracted_data:
                    for ch_item in extracted_data.get("chapters", []):
                        ch_num = ch_item.get("chapter_number")
                        if isinstance(ch_num, int) and ch_num not in existing_chapters:
                            name_en = ch_item.get("name_en") or f"Chapter {ch_num}"
                            name_ur = ch_item.get("name_ur")
                            new_ch = Chapter(
                                subject_id=book.subject_id,
                                book_id=book.id,
                                chapter_number=ch_num,
                                name=name_en,
                                name_ur=name_ur
                            )
                            db.add(new_ch)
                            db.flush()
                            existing_chapters[ch_num] = new_ch
                            active_chapter_id = new_ch.id
                        elif isinstance(ch_num, int) and ch_num in existing_chapters:
                            active_chapter_id = existing_chapters[ch_num].id

                # Ensure we have at least one fallback chapter
                if not active_chapter_id:
                    default_ch = db.query(Chapter).filter(Chapter.subject_id == book.subject_id).first()
                    if not default_ch:
                        default_ch = Chapter(
                            subject_id=book.subject_id,
                            book_id=book.id,
                            chapter_number=1,
                            name="Unit 1",
                            name_ur="یونٹ 1"
                        )
                        db.add(default_ch)
                        db.flush()
                    active_chapter_id = default_ch.id

                # Process questions found on this page
                questions_list = extracted_data.get("questions", []) if extracted_data else []
                for q_idx, q in enumerate(questions_list):
                    q_text = (q.get("question_text") or "").strip()
                    if not q_text and not q.get("question_ur"):
                        continue

                    # If only Urdu was provided, use it for both
                    if not q_text and q.get("question_ur"):
                        q_text = q.get("question_ur")

                    q_type = normalize_question_type(q.get("type", "short"))
                    
                    # Normalize options for MCQs
                    options = q.get("options")
                    if q_type == "mcq" and isinstance(options, list):
                        options = [{"text": opt.get("text", str(opt))} if isinstance(opt, dict) else {"text": str(opt)} for opt in options]
                    else:
                        options = None if q_type != "mcq" else options

                    # Determine marks based on type if not specified
                    marks = q.get("marks")
                    if not isinstance(marks, int) or marks <= 0:
                        marks = 1 if q_type == "mcq" else (2 if q_type == "short" else 4)

                    diff = q.get("difficulty", "medium").lower()
                    if diff not in ("easy", "medium", "hard"):
                        diff = "medium"

                    # Generate clean unique ID
                    qid = f"q-b{book.id}-p{page_number}-{q_idx + 1}-{uuid.uuid4().hex[:6]}"

                    new_q = Question(
                        id=qid,
                        subject_id=book.subject_id,
                        chapter_id=active_chapter_id,
                        topic_id=None,
                        type=q_type,
                        question_text=q_text,
                        question_ur=q.get("question_ur"),
                        exercise=q.get("exercise"),
                        options=options,
                        correct_answer=str(q.get("correct_answer")) if q.get("correct_answer") is not None else None,
                        marks=marks,
                        difficulty=diff,
                        source_book_id=book.id,
                        source_page=page_number,
                        status="draft"  # STRICTLY DRAFT: NEVER APPROVED AUTOMATICALLY
                    )
                    db.add(new_q)
                    total_extracted_questions += 1

                # Update progress after every page batch
                book.processed_pages = page_number
                book.extracted_questions_count = total_extracted_questions
                book.status_message = f"Processed page {page_number} of {total_pages} ({total_extracted_questions} questions found)"
                db.commit()

                # Polite pause to avoid hitting rate limits
                time.sleep(0.6)

            except Exception as page_err:
                logger.error(f"Error on page {page_number} of book {book.id}: {page_err}")
                # Don't crash entire pipeline on single page error
                book.processed_pages = page_number
                book.status_message = f"Page {page_number} encountered an issue: {str(page_err)[:60]}..."
                db.commit()

        # Processing complete
        book.upload_status = "completed"
        book.status_message = f"Extraction completed: {total_extracted_questions} draft questions extracted across {total_pages} pages."
        
        # Update associated upload record if present
        upload_rec = db.query(Upload).filter(Upload.book_id == book.id).first()
        if upload_rec:
            upload_rec.processing_status = "completed"

        db.commit()
        logger.info(f"Book {book_id} processing complete. Total questions: {total_extracted_questions}")

    except Exception as fatal_err:
        logger.error(f"Fatal error processing book {book_id}: {fatal_err}")
        try:
            book = db.query(Book).filter(Book.id == book_id).first()
            if book:
                book.upload_status = "failed"
                book.error_message = str(fatal_err)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()
