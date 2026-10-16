# The Century Academy — Automated Test Maker Portal

![The Century Academy](public/images/logo.png)

Official Automated Test Maker web application developed for the faculty of **The Century Academy of Science, Commerce & Arts** (Sargodha Road Campus, Faisalabad).

---

## 🌟 Key Features

1. **Dual Generation Modes:**
   - **⚡ Auto Generator:** Generates balanced, board-standard papers based on target marks (15, 20, 25, 35, 50, 75).
   - **✍️ Manual Question Picker:** Handpick exact MCQs, Short Questions, and Long Questions / Theorems with real-time marks calculation.

2. **Full Book Syllabus Coverage (All 13 Units):**
   - 100% authentic Punjab Curriculum & Textbook Board (PCTB 2025–2026) 9th Class Mathematics.
   - Covering Units 1 to 13 including Compulsory Theorems (11.1, 11.2, 12.1), matrices, logarithms, and practical geometry.

3. **Universal Book Ingestion Studio:**
   - Ingest complete multi-page book PDFs (e.g., 279-page scanned textbooks) or individual page snapshots.
   - Multimodal OCR and schema normalization for Urdu Nastaleeq and LaTeX math expressions.

4. **Multi-Format Export & Printing:**
   - **Print / Save PDF:** High-contrast 2-column or standard layout formatted for clean photocopy printing.
   - **Export to Word (.doc):** Direct download of editable Microsoft Word documents with official TCA letterhead, student info table, and Principal signature block.

5. **Dual Deployment Support:**
   - **Hostinger Node.js Web App:** Built-in Express 5 server with MySQL connection pooling, auto-migration, and static SPA serving.
   - **Hostinger Apache/LiteSpeed PHP:** Self-contained `api.php` and `.htaccess` for standard cPanel/hPanel PHP hosting.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MySQL Database

### Installation

```bash
# Clone the repository
git clone https://github.com/zainmuqarrab6-tech/Automatic-Test-Maker-TCA.git
cd Automatic-Test-Maker-TCA

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start Node.js production server
npm start
```

---

## 🗄️ Database Configuration

Configure your `.env` file:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=u437839910_Test_Maker
DB_USER=u437839910_TCA_Test_Maker
DB_PASS=TCATest786@
PORT=3000
```

---

## 🏫 Institution
**The Century Academy of Science, Commerce & Arts**  
Sargodha Road, Faisalabad  
Phone: +92 313 8272600  
Principal: Syed Faraz Hassan  
*"Where Fine Arts & Tech Skills Meet Academic Excellence"*
