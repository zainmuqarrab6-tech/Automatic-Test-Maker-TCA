/**
 * The Century Academy - Test Maker
 * Export to Microsoft Word (.doc) Utility
 * Generates an editable Microsoft Word document with official TCA branding,
 * student metadata tables, bilingual typography, and clean formatting.
 */

export function exportTestPaperToWord(paperData, options = {}) {
  if (!paperData) return;

  const {
    testTitle = "Chapter-Wise Test Series 2026",
    campus = "Sargodha Road Campus",
    className = "9th",
    subject = "Mathematics",
    syllabus = "Full Chapter",
    date = new Date().toISOString().split('T')[0],
    timeAllowed = "45 Mins",
    mcqs = [],
    shortQuestions = [],
    longQuestions = []
  } = paperData;

  const { languageMode = 'bilingual', showWatermark = true } = options;

  // Marks Calculation
  const mcqMarks = mcqs.length * 1;
  let shortAttemptCount = shortQuestions.length;
  if (shortQuestions.length >= 8) shortAttemptCount = shortQuestions.length - 2;
  else if (shortQuestions.length === 7) shortAttemptCount = 6;
  else if (shortQuestions.length === 5) shortAttemptCount = 4;
  else if (shortQuestions.length > 3) shortAttemptCount = shortQuestions.length - 1;

  const shortMarks = shortAttemptCount * 2;
  let longMarks = 0;
  if (paperData.targetMarks === 25 && longQuestions.length >= 2) {
    longMarks = 8;
  } else if (paperData.targetMarks === 50 && longQuestions.length >= 4) {
    longMarks = 16;
  } else if (paperData.targetMarks === 75 && longQuestions.length >= 6) {
    longMarks = 24;
  } else {
    longMarks = longQuestions.reduce((sum, q) => sum + (q.marks || 4), 0);
  }
  const totalMarks = (mcqMarks + shortMarks + longMarks);

  // Clean LaTeX notation for simple Word viewing
  const cleanLatex = (text) => {
    if (!text) return '';
    return text
      .replace(/\$\$(.*?)\$\$/g, '$1')
      .replace(/\$(.*?)\$/g, '$1')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)')
      .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
      .replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '$1√($2)')
      .replace(/\\pm/g, '±')
      .replace(/\\times/g, '×')
      .replace(/\\div/g, '÷')
      .replace(/\\neq/g, '≠')
      .replace(/\\leq/g, '≤')
      .replace(/\\geq/g, '≥')
      .replace(/\\in/g, '∈')
      .replace(/\\subset/g, '⊂')
      .replace(/\\cup/g, '∪')
      .replace(/\\cap/g, '∩')
      .replace(/\\emptyset/g, '∅')
      .replace(/\\mathbb\{Z\}/g, 'Z')
      .replace(/\\mathbb\{R\}/g, 'R')
      .replace(/\\triangle/g, '△')
      .replace(/\\cong/g, '≅')
      .replace(/\\angle/g, '∠')
      .replace(/\\degree|\^\\circ/g, '°')
      .replace(/\\overline\{([^}]+)\}/g, '$1̄')
      .replace(/\\begin\{bmatrix\}(.*?)\\end\{bmatrix\}/gs, (_, inner) => {
        return '[' + inner.replace(/\\\\/g, ' ; ').replace(/&/g, ', ') + ']';
      })
      .replace(/\\quad/g, '   ')
      .replace(/\\text\{([^}]+)\}/g, '$1');
  };

  // Build Word Document HTML
  let docContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>The Century Academy - ${className} Class ${subject} Test</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
  @page {
    size: 21.0cm 29.7cm; /* Strict A4 */
    margin: 1.2cm 1.2cm 1.2cm 1.2cm;
    mso-page-orientation: portrait;
  }
  @page Section1 {
    size: 595.3pt 841.9pt; /* Standard A4 in Word Points */
    margin: 34.0pt 36.0pt 34.0pt 36.0pt;
    mso-header-margin: 18.0pt;
    mso-footer-margin: 18.0pt;
    mso-paper-source: 0;
  }
  div.Section1 {
    page: Section1;
  }
  body {
    font-family: 'Times New Roman', 'Noto Nastaliq Urdu', 'Arial', serif;
    font-size: 11pt;
    color: #000;
    line-height: 1.35;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
  }
  .header-table td {
    padding: 3px;
    vertical-align: middle;
  }
  .school-title {
    font-size: 19pt;
    font-weight: bold;
    color: #0c2340;
    text-transform: uppercase;
    text-align: center;
    letter-spacing: 0.5px;
  }
  .school-sub {
    font-size: 9.5pt;
    font-weight: bold;
    color: #475569;
    text-align: center;
    letter-spacing: 1.5px;
  }
  .school-motto {
    font-size: 8pt;
    font-style: italic;
    color: #1e3a8a;
    text-align: center;
    margin-top: 2px;
  }
  .campus-info {
    font-size: 9pt;
    text-align: right;
    line-height: 1.2;
  }
  .meta-table {
    border: 1.5px solid #000;
    margin: 8px 0 12px 0;
  }
  .meta-table td {
    border: 1px solid #444;
    padding: 4px 6px;
    font-size: 9.5pt;
  }
  .meta-label {
    font-weight: bold;
    color: #1e293b;
  }
  .section-banner {
    background-color: #0c2340;
    color: #ffffff;
    font-weight: bold;
    font-size: 10.5pt;
    padding: 5px 8px;
    margin: 14px 0 6px 0;
    border-left: 5px solid #d97706;
  }
  .instruction-text {
    font-size: 8.5pt;
    font-style: italic;
    color: #334155;
    margin-bottom: 6px;
  }
  .question-item {
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 0.5px dashed #ccc;
  }
  .q-en {
    font-size: 10.5pt;
    color: #000;
  }
  .q-ur {
    font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', 'Urdu Typesetting', serif;
    font-size: 11pt;
    direction: rtl;
    text-align: right;
    color: #000;
    margin-top: 2px;
  }
  .options-table {
    margin: 4px 0 6px 0;
  }
  .options-table td {
    width: 25%;
    padding: 2px 4px;
    font-size: 9.5pt;
  }
  .footer-table {
    margin-top: 25px;
    border-top: 1.5px solid #000;
    padding-top: 8px;
  }
  .sig-line {
    border-top: 1px solid #666;
    text-align: center;
    font-size: 8.5pt;
    padding-top: 4px;
    width: 28%;
  }
</style>
</head>
<body>
<div class="Section1">

<!-- Header Table -->
<table class="header-table" style="border-bottom: 2px solid #0c2340; padding-bottom: 6px;">
  <tr>
    <td style="width: 15%; text-align: left; vertical-align: middle;">
      <div style="width: 62px; height: 62px; border: 2.5px solid #0c2340; border-radius: 50%; text-align: center; vertical-align: middle; line-height: 62px; font-weight: 900; font-size: 14pt; color: #0c2340; background-color: #f8fafc; font-family: Arial, sans-serif;">
        TCA
      </div>
    </td>
    <td style="width: 60%; text-align: center;">
      <div class="school-title">The Century Academy</div>
      <div class="school-sub">OF SCIENCE, COMMERCE & ARTS</div>
      <div class="school-motto">"Where Fine Arts & Tech Skills Meet Academic Excellence"</div>
    </td>
    <td style="width: 25%;" class="campus-info">
      <strong>${campus || 'Sargodha Road Campus'}</strong><br>
      Faisalabad | Ph: +92 313 8272600<br>
      <span style="background: #e2e8f0; padding: 2px 4px; font-weight: bold; font-size: 8pt;">${testTitle}</span>
    </td>
  </tr>
</table>

<!-- Student & Test Info Table -->
<table class="meta-table">
  <tr>
    <td style="width: 50%;"><span class="meta-label">Student Name:</span> ____________________________________</td>
    <td style="width: 25%;"><span class="meta-label">Roll No:</span> ____________</td>
    <td style="width: 25%;"><span class="meta-label">Section:</span> _________</td>
  </tr>
  <tr>
    <td><span class="meta-label">Class:</span> <b>${className} Class</b> &nbsp;&nbsp;|&nbsp;&nbsp; <span class="meta-label">Subject:</span> <b>${subject}</b></td>
    <td><span class="meta-label">Date:</span> ${date}</td>
    <td><span class="meta-label">Time:</span> ${timeAllowed}</td>
  </tr>
  <tr>
    <td colspan="3" style="background-color: #f8fafc;"><span class="meta-label">Syllabus / دائرہ کار:</span> <b>${syllabus || 'Full Syllabus'}</b></td>
  </tr>
  <tr>
    <td colspan="2"><span class="meta-label">Total Marks:</span> <b>${totalMarks}</b></td>
    <td><span class="meta-label">Obtained:</span> [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; / ${totalMarks} ]</td>
  </tr>
</table>
`;

  // SECTION A: MCQs
  if (mcqs.length > 0) {
    docContent += `
<div class="section-banner">
  Q.1: MULTIPLE CHOICE QUESTIONS (MCQs) — (${mcqs.length} × 1 = ${mcqs.length} Marks)
</div>
<div class="instruction-text">
  Note: Encircle the correct option. Overwriting, cutting or using ink remover is strictly prohibited.
</div>
`;

    mcqs.forEach((q, idx) => {
      const enText = cleanLatex(q.question_en);
      const urText = cleanLatex(q.question_ur);
      docContent += `
<div class="question-item">
  ${languageMode !== 'ur' ? `<div class="q-en"><b>(${idx + 1})</b> ${enText}</div>` : ''}
  ${languageMode !== 'en' && urText ? `<div class="q-ur"><b>(${idx + 1})</b> ${urText}</div>` : ''}
`;

      if (q.options && q.options.length > 0) {
        const letters = ['(A)', '(B)', '(C)', '(D)'];
        docContent += `<table class="options-table"><tr>`;
        q.options.forEach((opt, oIdx) => {
          docContent += `<td><b>${letters[oIdx] || ''}</b> ${cleanLatex(opt.text)}</td>`;
        });
        docContent += `</tr></table>`;
      }

      docContent += `</div>`;
    });
  }

  // SECTION B: SHORT QUESTIONS
  if (shortQuestions.length > 0) {
    docContent += `
<div class="section-banner">
  Q.2: SHORT QUESTIONS — Attempt any ${shortAttemptCount} out of ${shortQuestions.length} (${shortMarks} Marks)
</div>
<div class="instruction-text">
  Note: Write short and concise answers to any ${shortAttemptCount} questions. (Each carries 2 Marks)
</div>
`;

    shortQuestions.forEach((q, idx) => {
      const enText = cleanLatex(q.question_en);
      const urText = cleanLatex(q.question_ur);
      docContent += `
<div class="question-item">
  ${languageMode !== 'ur' ? `<div class="q-en"><b>(${idx + 1})</b> ${enText}</div>` : ''}
  ${languageMode !== 'en' && urText ? `<div class="q-ur"><b>(${idx + 1})</b> ${urText}</div>` : ''}
</div>
`;
    });
  }

  // SECTION C: LONG QUESTIONS & THEOREMS
  if (longQuestions.length > 0) {
    const longNote = (paperData.targetMarks === 25 && longQuestions.length >= 2)
      ? "Note: Attempt any ONE Question (or both parts a & b, 4 marks each). Overwriting is not allowed."
      : (paperData.targetMarks === 50 && longQuestions.length >= 4)
        ? "Note: Attempt any TWO Questions with complete working and diagrams."
        : (paperData.targetMarks === 75 && longQuestions.length >= 6)
          ? "Note: Attempt any THREE Questions including Compulsory Theorem."
          : "Note: Attempt all extensive questions with step-by-step mathematical working and clean geometrical figures.";

    docContent += `
<div class="section-banner">
  Q.3: LONG / EXTENSIVE QUESTIONS & THEOREMS (${longMarks} Marks)
</div>
<div class="instruction-text">
  ${longNote}
</div>
`;

    longQuestions.forEach((q, idx) => {
      const enText = cleanLatex(q.question_en);
      const urText = cleanLatex(q.question_ur);
      docContent += `
<div class="question-item">
  ${languageMode !== 'ur' ? `<div class="q-en"><b>(${idx + 1}) [${q.marks || 4} Marks]</b> ${enText}</div>` : ''}
  ${languageMode !== 'en' && urText ? `<div class="q-ur"><b>(${idx + 1}) [${q.marks || 4} نمبر]</b> ${urText}</div>` : ''}
</div>
`;
    });
  }

  // Signature Footer
  docContent += `
<table class="footer-table">
  <tr>
    <td class="sig-line">Subject Specialist</td>
    <td style="width: 44%; text-align: center; font-size: 8pt; color: #64748b; font-style: italic;">
      The Century Academy — Sargodha Road, Faisalabad
    </td>
    <td class="sig-line">Syed Faraz Hassan (Principal)</td>
  </tr>
</table>

</div>
</body>
</html>
`;

  // Trigger download
  const blob = new Blob(['\ufeff' + docContent], {
    type: 'application/msword;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeFilename = `TCA_Test_${className}_${subject}_${date}.doc`.replace(/\s+/g, '_');
  link.download = safeFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
