# 📐 API & Architecture Plan: Automatic Test / Paper Generator

> **Architecture Overview**  
> **Backend Framework:** Python 3.10+ with FastAPI  
> **Database:** MySQL 8.0+  
> **ORM & Migrations:** SQLAlchemy 2.0 (async/declarative) + Alembic  
> **AI / Vision Extraction:** Google Gemini API (`google-genai` / `gemini-1.5-flash` / `gemini-1.5-pro`)  
> **Frontend:** Existing React SPA (`src/App.jsx`, `TestGeneratorWizard.jsx`, `LiveTestPaper.jsx`)  
> **Configuration & Secrets:** Loaded strictly from `.env` via `pydantic-settings`

---

## 📑 Table of Contents
1. [Component-by-Component Data Requirements](#1-component-by-component-data-requirements)
2. [RESTful API Endpoints Specification](#2-restful-api-endpoints-specification)
3. [Frontend Data Schema & Type Dictionary](#3-frontend-data-schema--type-dictionary)
4. [Missing Frontend Features & Gap Analysis](#4-missing-frontend-features--gap-analysis)
5. [FastAPI Project Structure Blueprint](#5-fastapi-project-structure-blueprint)

---

## 1. Component-by-Component Data Requirements

This section maps every page, button, form, and table in the frontend to the backend data it consumes or modifies.

### 1.1 Top Navbar (`src/App.jsx`)
| UI Element | Type | Action / Event | Data Needed From Backend |
| :--- | :--- | :--- | :--- |
| **Database Status Pill** | Badge | On component mount | Current DB connectivity status, total question count in DB |
| **Sync Button (`RefreshCw`)** | Button | `onClick` | Refreshed question list from backend (`GET /api/questions`) |
| **Export to Word Button** | Button | `onClick` | Client-side export using current `paperData` |
| **Print / Save PDF Button** | Button | `onClick` | Native browser print (`window.print()`) |

---

### 1.2 Test Generator Wizard (`src/components/TestGeneratorWizard.jsx`)

#### Mode Selector Tabs
- **`⚡ Auto Generator`**: Requires available question pool filtered by Class, Subject, Chapters to compute random or scheme-based paper.
- **`✍️ Manual Question Picker`**: Requires paginated or filtered list of questions with search and type filters.

#### Form Controls & Inputs
| Form Control | Type | Options / State | Data Needed From Backend |
| :--- | :--- | :--- | :--- |
| **1. Select Class** | `<select>` | `9th`, `10th`, `11th`, `12th` | List of distinct classes stored in database (`GET /api/metadata/classes`) |
| **2. Select Subject** | `<select>` | `Mathematics`, `Physics`, `Chemistry`, `Biology`, `Computer Science` | List of available subjects for selected class (`GET /api/metadata/subjects?class=9th`) |
| **3. Syllabus Scope Tabs** | Tab buttons | `🌓 Half Ch`, `📖 Page Range`, `📑 Full Ch`, `✍️ Custom` | Filter criteria for question pool |
| **- Half Chapter Subpanel** | `<select>` + buttons | Units 1 to N, `1st Half` (Ex X.1-X.3), `2nd Half` (Ex X.4-Review) | List of chapters with English & Urdu titles for selected subject; exercise tagging |
| **- Page Range Subpanel** | Unit `<select>` + 2 `<input>` | Unit No, `From Page`, `To Page`, Quick presets (Pg 1-15, etc.) | Questions mapped to book page numbers |
| **- Full Chapter Subpanel** | Checkboxes + quick buttons | Checkboxes for all units, `All`, `1st Half`, `2nd Half` | All chapter numbers and titles for selected subject |
| **- Custom Command Subpanel**| `<textarea>` + chip buttons | Teacher prompt (e.g. "Cramer's Rule", "Theorems", "Definitions") | Full-text search / semantic search endpoint across questions |
| **Paper Syllabus Input** | `<input>` | Editable string (e.g. "Unit 1: Real Numbers (1st Half)") | Formatted string placed on paper header |
| **4. Total Marks Target** | Preset pills | `15`, `20`, `25`, `35`, `50`, `75` | Target marks scheme; updates default MCQ, Short, Long counts |
| **5. Question Distribution** | 3 Number inputs | `MCQs` (0-25), `Short Qs` (0-20), `Long Qs` (0-8) | Validation against available questions in pool |
| **Manual Questions List** | Scrollable table / list | Filter buttons (`All`, `MCQ`, `Short`, `Long`), Search input, Checkboxes | Filtered question list matching class, subject, and chapter criteria |
| **6. Test Details** | 2 inputs | `Time Allowed` (text), `Campus` (select) | Test metadata passed to paper header |
| **Generate Button** | Primary button | `onClick` | Triggers test paper generation algorithm |

---

### 1.3 Live Test Paper Sheet (`src/components/LiveTestPaper.jsx`)

#### Paper Header & Metadata Grid
| Field | UI Type | Behavior | Backend Field Name |
| :--- | :--- | :--- | :--- |
| **Institution Name & Motto** | Static text | Pre-configured letterhead | Header config |
| **Campus Name** | Content-editable | Teacher can edit inline | `campus` |
| **Test Title / Series** | Content-editable | Teacher can edit inline | `test_title` |
| **Student Info Block** | Static lines | Student Name, Roll No, Section | Template lines |
| **Class & Subject** | Dynamic text | Selected from wizard | `class`, `subject` |
| **Date & Time Allowed** | Content-editable | Defaults to today & wizard time | `date`, `time_allowed` |
| **Syllabus / نصاب** | Content-editable | Displays active scope | `syllabus` |
| **Total Marks / Obtained** | Calculated text | `[    / {accurateTotalMarks} ]` | `total_marks` |

#### Section A: MCQs (Objective)
- **Table / List**: Question number, Bilingual English text, Urdu text, 4 Options grid (A, B, C, D).
- **Tools**:
  - ✏️ **Edit**: Modal editing English text, Urdu text, 4 options, correct answer index, marks.
  - 🔄 **Swap**: Replaces question with another MCQ from same class/subject/chapter (`GET /api/questions/swap`).
  - 🗑️ **Delete**: Removes MCQ from paper.
  - ➕ **Add MCQ**: Inserts a new MCQ row.

#### Section B: Short Questions (Subjective)
- **Table / List**: Q.2 banner with attempt instructions (e.g. "Attempt any 6 out of 8").
- **Tools**: Edit, Swap, Delete, and `+ Add Short Question`.

#### Section C: Long Questions & Theorems
- **Table / List**: Q.3 banner with board instructions (e.g. "Attempt any 2 questions, 4 marks each part").
- **Tools**: Edit, Swap, Delete, and `+ Add Long Question`.

#### Answer Key Block
- Toggled by toolbar; displays correct MCQ option for each question (`Q1: Option A`, etc.).

---

## 2. RESTful API Endpoints Specification

Base URL: `/api/v1`

### 2.1 System & Health

#### `GET /api/v1/health`
Check API, Database, and Gemini service status.
- **Request:** None
- **Response `200 OK`:**
```json
{
  "status": "online",
  "database": "connected",
  "version": "1.0.0",
  "timestamp": "2026-10-17T10:35:00Z"
}
```

---

### 2.2 Curriculum & Metadata

#### `GET /api/v1/metadata`
Returns distinct available classes, subjects, and chapter lists present in the database.
- **Request:** None
- **Response `200 OK`:**
```json
{
  "classes": ["9th", "10th", "11th", "12th"],
  "subjects": {
    "9th": ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science"],
    "10th": ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science"],
    "11th": ["Mathematics", "Physics", "Chemistry", "Computer Science"],
    "12th": ["Mathematics", "Physics", "Chemistry", "Computer Science"]
  },
  "chapters": [
    {
      "class": "9th",
      "subject": "Mathematics",
      "chapter_no": 1,
      "chapter_name_en": "Real and Complex Numbers",
      "chapter_name_ur": "حقیقی اور بلحاظِ ترکیب اعداد",
      "total_questions": 42
    }
  ]
}
```

---

### 2.3 Questions Management

#### `GET /api/v1/questions`
Search and filter questions for manual picker or bank viewer.
- **Query Parameters:**
  - `class_name` (string, optional): e.g. `9th`
  - `subject` (string, optional): e.g. `Mathematics`
  - `chapter_no` (int, optional): e.g. `1`
  - `chapters` (comma-separated ints, optional): e.g. `1,2,3`
  - `question_type` (string, optional): `mcq` | `short_question` | `long_question`
  - `search` (string, optional): Search keyword in English, Urdu, or exercise
  - `skip` (int, default `0`)
  - `limit` (int, default `100`)
- **Response `200 OK`:**
```json
{
  "total": 1,
  "count": 1,
  "data": [
    {
      "id": "q-9th-math-ch1-mcq-01",
      "class": "9th",
      "subject": "Mathematics",
      "chapter_no": 1,
      "chapter_name_en": "Real and Complex Numbers",
      "chapter_name_ur": "حقیقی اور بلحاظِ ترکیب اعداد",
      "exercise": "Ex 1.1",
      "type": "mcq",
      "marks": 1,
      "difficulty": "medium",
      "question_en": "The value of $i^9$ is:",
      "question_ur": "قیمت معلوم کریں: $i^9$",
      "options": [
        { "text": "1" },
        { "text": "-1" },
        { "text": "$i$" },
        { "text": "$-i$" }
      ],
      "correct_option_index": 2,
      "page_number": 12,
      "created_at": "2026-10-17T10:00:00Z"
    }
  ]
}
```

#### `POST /api/v1/questions`
Create a single new question or custom teacher question.
- **Request Body:**
```json
{
  "class": "9th",
  "subject": "Mathematics",
  "chapter_no": 1,
  "chapter_name_en": "Real and Complex Numbers",
  "chapter_name_ur": "حقیقی اور بلحاظِ ترکیب اعداد",
  "exercise": "Ex 1.2",
  "type": "short_question",
  "marks": 2,
  "difficulty": "medium",
  "question_en": "Simplify: $\\sqrt{50} + \\sqrt{18}$",
  "question_ur": "مختصر کریں: $\\sqrt{50} + \\sqrt{18}$",
  "options": null,
  "correct_option_index": null,
  "page_number": 16
}
```
- **Response `201 Created`:**
```json
{
  "success": true,
  "id": "q-custom-1729158000",
  "message": "Question created successfully"
}
```

#### `PUT /api/v1/questions/{question_id}`
Update an existing question (used by teacher's inline edit modal).
- **Request Body:** Partial or complete question fields to update.
- **Response `200 OK`:** Updated question object.

#### `DELETE /api/v1/questions/{question_id}`
Delete a question from the database.
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Question deleted successfully"
}
```

#### `POST /api/v1/questions/swap`
Fetch a suitable replacement for a question on the paper.
- **Request Body:**
```json
{
  "class": "9th",
  "subject": "Mathematics",
  "chapter_no": 1,
  "type": "short_question",
  "exclude_ids": ["q-1", "q-2", "q-3"]
}
```
- **Response `200 OK`:** Single question object not present in `exclude_ids`.

---

### 2.4 Test Paper Generation

#### `POST /api/v1/tests/generate`
Backend-driven test generation adhering to board pairing schemes, question counts, and syllabus ranges.
- **Request Body:**
```json
{
  "class_name": "9th",
  "subject": "Mathematics",
  "selected_chapters": [1, 2],
  "range_mode": "half_chapter",
  "half_type": "first_half",
  "target_marks": 25,
  "mcq_count": 5,
  "short_count": 8,
  "long_count": 2,
  "time_allowed": "45 Mins",
  "test_title": "Chapter-Wise Test Series 2026",
  "campus": "Sargodha Road Campus",
  "custom_syllabus": "Unit 1: Ex 1.1 to 1.3"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "paper": {
    "test_title": "Chapter-Wise Test Series 2026",
    "campus": "Sargodha Road Campus",
    "class_name": "9th",
    "subject": "Mathematics",
    "selected_chapters": [1, 2],
    "syllabus": "Unit 1: Ex 1.1 to 1.3",
    "date": "2026-10-17",
    "time_allowed": "45 Mins",
    "target_marks": 25,
    "total_marks": 25,
    "mcqs": [...],
    "short_questions": [...],
    "long_questions": [...]
  }
}
```

---

### 2.5 Book Upload & AI Extraction (Gemini Service)

#### `POST /api/v1/ingestion/upload-book`
Upload PDF or image files of a textbook for AI question extraction.
- **Form Data (multipart/form-data):**
  - `file`: PDF or image file (max 100MB)
  - `class_name`: `9th`
  - `subject`: `Mathematics`
  - `chapter_no`: `1` (optional if full book)
  - `chapter_name`: `Real Numbers` (optional)
- **Response `202 Accepted`:**
```json
{
  "task_id": "task-ingest-84920",
  "status": "processing",
  "filename": "9th_math_ch1.pdf",
  "message": "Book uploaded. Gemini AI extraction in progress."
}
```

#### `GET /api/v1/ingestion/tasks/{task_id}`
Check status and preview extracted questions before committing to the question bank.
- **Response `200 OK`:**
```json
{
  "task_id": "task-ingest-84920",
  "status": "completed",
  "total_extracted": 28,
  "mcq_count": 10,
  "short_count": 14,
  "long_count": 4,
  "extracted_questions": [
    {
      "temp_id": "ext-1",
      "class": "9th",
      "subject": "Mathematics",
      "chapter_no": 1,
      "exercise": "Ex 1.1",
      "type": "mcq",
      "question_en": "What is the additive inverse of $\\sqrt{2}$?",
      "question_ur": "$\\sqrt{2}$ کا جمعی معکوس کیا ہے؟",
      "options": [{ "text": "$-\\sqrt{2}$" }, { "text": "$\\sqrt{2}$" }, { "text": "0" }, { "text": "1" }],
      "correct_option_index": 0,
      "marks": 1
    }
  ]
}
```

#### `POST /api/v1/ingestion/commit`
Commit reviewed questions to the permanent database.
- **Request Body:** Array of approved question objects.
- **Response `201 Created`:**
```json
{
  "success": true,
  "inserted_count": 28,
  "message": "Questions successfully committed to MySQL Database"
}
```

---

### 2.6 Paper Scheme & PDF Export

#### `POST /api/v1/schemes/upload`
Upload official Board Pairing Scheme (PDF/JSON) defining chapter-wise marks distribution.
- **Request Body:** Scheme rules JSON or file upload.
- **Response `200 OK`:** Scheme configuration object.

#### `POST /api/v1/tests/export-pdf`
Server-side high-resolution PDF generation (using WeasyPrint).
- **Request Body:** Complete `paperData` object + layout options (`twoColumnMode`, `languageMode`, `showWatermark`).
- **Response:** `application/pdf` binary stream (direct file download).

---

## 3. Frontend Data Schema & Type Dictionary

The database models and API schemas must match the frontend data structures:

### 3.1 Question Schema (`Question`)
```typescript
interface Question {
  id: string;                      // e.g. "q-9th-math-ch1-01"
  class: string;                   // '9th' | '10th' | '11th' | '12th'
  subject: string;                 // 'Mathematics' | 'Physics' | etc.
  chapter_no: number;              // 1, 2, 3, ...
  chapter_name_en: string;         // 'Real and Complex Numbers'
  chapter_name_ur?: string;        // 'حقیقی اور بلحاظِ ترکیب اعداد'
  exercise?: string;               // 'Ex 1.1', 'Review Ex 1', 'Definitions'
  type: 'mcq' | 'short_question' | 'long_question';
  marks: number;                   // 1 for MCQ, 2 for Short, 4-8 for Long
  difficulty?: 'easy' | 'medium' | 'hard';
  question_en: string;             // English statement with LaTeX ($x^2$)
  question_ur?: string;            // Urdu statement (Nastaleeq script)
  options?: Array<{ text: string }> | null; // 4 items for MCQ, null otherwise
  correct_option_index?: number | null;     // 0, 1, 2, 3 for MCQ
  page_number?: number;            // Book page number (for page range mode)
  created_at?: string;
}
```

### 3.2 Paper Data Schema (`PaperData`)
```typescript
interface PaperData {
  testTitle: string;               // "Chapter-Wise Test Series 2026"
  campus: string;                  // "Sargodha Road Campus"
  className: string;               // "9th"
  subject: string;                 // "Mathematics"
  selectedChapters: number[];      // [1, 2]
  syllabus: string;                // "Unit 1: Ex 1.1 to 1.3"
  date: string;                    // "2026-10-17"
  timeAllowed: string;             // "45 Mins"
  targetMarks: number;             // 25
  totalMarks: number;              // 25
  mcqs: Question[];
  shortQuestions: Question[];
  longQuestions: Question[];
}
```

---

## 4. Missing Frontend Features & Gap Analysis

To fulfill the complete vision of an automated, AI-driven test generator, the following 6 gaps currently exist in the frontend UI:

| Feature Area | Current Frontend Status | What is Missing in Frontend UI |
| :--- | :--- | :--- |
| **1. Uploading Books** | Component was removed in refactoring | Needs a **Book Uploader Modal / View**: drag-and-drop zone for PDF/images, Class & Subject selector, progress bar for upload. |
| **2. Uploading Paper Scheme** | Hardcoded logic in `handlePresetMarks` | Needs a **Pairing Scheme Manager**: UI to view or input board weightings (e.g. Ch 1: 1 MCQ + 2 Shorts + Long part a). |
| **3. Syllabus Division** | Has 4 buttons (`Half Ch`, `Page Range`, `Full Ch`, `Custom`) | Works well in UI; needs backend to store actual page-to-question mappings so `Pg 1-15` queries exact questions. |
| **4. Reviewing Extracted Questions** | Missing | Needs a **Staging / Review Screen**: shows questions extracted by Gemini with an "Approve / Edit / Discard" button before saving to MySQL. |
| **5. Generating a Test** | Currently runs client-side random shuffle in `App.jsx` | Needs to call `POST /api/v1/tests/generate` to let backend apply board constraints, avoiding duplicate questions across test series. |
| **6. Downloading PDF** | Uses browser `window.print()` | `window.print()` depends on user printer settings. Needs a dedicated **"Download PDF"** button calling `POST /api/v1/tests/export-pdf` for a pixel-perfect A4 file. |

---

## 5. FastAPI Project Structure Blueprint

The planned backend directory structure follows FastAPI best practices:

```
backend/
├── alembic/                      # Database migrations
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
├── alembic.ini                   # Alembic configuration
├── app/
│   ├── __init__.py
│   ├── main.py                   # FastAPI entrypoint, CORS & middleware
│   ├── config.py                 # Settings loaded from .env (DB credentials, Gemini key)
│   ├── database.py               # SQLAlchemy async engine & sessionmaker
│   ├── models/                   # SQLAlchemy DB Models
│   │   ├── __init__.py
│   │   ├── question.py           # Question ORM model
│   │   ├── chapter.py            # Chapter metadata model
│   │   └── scheme.py             # Board pairing scheme model
│   ├── schemas/                  # Pydantic v2 validation models
│   │   ├── __init__.py
│   │   ├── question.py           # QuestionCreate, QuestionUpdate, QuestionOut
│   │   ├── test_paper.py         # TestGenerateRequest, TestPaperResponse
│   │   └── metadata.py           # Metadata response models
│   ├── routers/                  # API Route Controllers
│   │   ├── __init__.py
│   │   ├── health.py             # /health endpoint
│   │   ├── metadata.py           # /metadata endpoints
│   │   ├── questions.py          # /questions CRUD & swap
│   │   ├── generator.py          # /tests/generate endpoint
│   │   ├── ingestion.py          # /ingestion book upload & Gemini extraction
│   │   └── export.py             # /tests/export-pdf endpoint
│   └── services/                 # Core Business Logic
│       ├── __init__.py
│       ├── test_maker.py         # Board paper generation algorithm
│       ├── gemini_extractor.py   # AI book extraction logic
│       └── pdf_generator.py      # WeasyPrint / ReportLab PDF compiler
├── requirements.txt              # Python dependencies
└── .env                          # Local secrets (DB_PASS, GEMINI_API_KEY)
```

---

## 📌 Next Steps
Once you review and approve this `docs/API_PLAN.md` specification, we will proceed to **Step 1: Setting up the FastAPI backend environment, database connection, and Alembic migrations**.
