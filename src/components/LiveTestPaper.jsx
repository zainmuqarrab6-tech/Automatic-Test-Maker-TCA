import React, { useState } from 'react';
import MathRenderer from './MathRenderer';
import { RefreshCw, Trash2, Edit3, CheckCircle2, Plus, X, Save, FileDown } from 'lucide-react';
import { exportTestPaperToWord } from '../utils/exportToWord';

export default function LiveTestPaper({
  paperData,
  twoColumnMode = false,
  showWatermark = true,
  languageMode = 'bilingual', // 'bilingual' | 'en' | 'ur'
  showAnswerKey = false,
  onSwapQuestion,
  onDeleteQuestion,
  onEditQuestion,
  onAddQuestionToSection,
  onUpdateMeta
}) {
  const [editingModal, setEditingModal] = useState(null); // { type, index, question }

  if (!paperData) {
    return (
      <div className="paper-sheet-container">
        <div
          className="test-paper-sheet"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '520px',
            textAlign: 'center',
            padding: '3rem 2rem',
            background: '#ffffff',
            border: '2px dashed #cbd5e1',
            borderRadius: '12px'
          }}
        >
          <img
            src="/images/logo.png"
            alt="The Century Academy"
            style={{ width: '90px', height: '90px', objectFit: 'contain', marginBottom: '1.25rem', opacity: 0.9 }}
          />

          <span
            style={{
              background: '#eff6ff',
              color: '#1e3a8a',
              border: '1px solid #bfdbfe',
              padding: '4px 14px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '0.75rem'
            }}
          >
            The Century Academy • Test Creation Studio
          </span>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f2744', marginBottom: '0.5rem' }}>
            No Test Paper Generated Yet
          </h2>
          <p className="urdu-text" style={{ fontSize: '1.15rem', color: '#334155', marginBottom: '1rem', direction: 'rtl' }}>
            ٹیسٹ پیپر بنانے کے لیے بائیں جانب دیے گئے پینل سے اپنی مرضی کے یونٹس اور نمبر منتخب کر کے <strong>"Generate Test Paper"</strong> دبائیں۔
          </p>
          <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '520px', lineHeight: '1.5', marginBottom: '1.5rem' }}>
            Tests are generated strictly on teacher's command. Configure your parameters in the left panel to generate a fresh, balanced test according to Punjab & Federal Board examination patterns.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              maxWidth: '600px',
              width: '100%',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'left'
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e3a8a' }}>1. CLASS & SUBJECT</div>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>9th to 12th Classes & all subjects</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e3a8a' }}>2. CHAPTERS</div>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>Pick single unit, 1st Half, 2nd Half or All</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e3a8a' }}>3. GENERATE</div>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>Auto Mode or Handpick with Manual Picker</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const {
    testTitle = "Chapter-Wise Test Series 2026",
    campus = "Sargodha Road Campus",
    className = "9th",
    subject = "Mathematics",
    date = new Date().toISOString().split('T')[0],
    timeAllowed = "45 Mins",
    mcqs = [],
    shortQuestions = [],
    longQuestions = []
  } = paperData;

  // Exact Board Style Marks Calculation
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

  const accurateTotalMarks = paperData.totalMarks || paperData.targetMarks || (mcqMarks + shortMarks + longMarks);
  const totalObtainedMarksString = `[      / ${accurateTotalMarks} ]`;

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingModal) return;
    onEditQuestion(editingModal.type, editingModal.index, editingModal.question);
    setEditingModal(null);
  };

  const handleExportWord = () => {
    exportTestPaperToWord(paperData, { languageMode, showWatermark });
  };

  return (
    <div className="paper-sheet-container">
      {/* Quick Word Export Floating Tool for Teachers */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button
          onClick={handleExportWord}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#0c2340',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 14px',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
          title="Download editable Microsoft Word document (.doc)"
        >
          <FileDown size={15} color="#38bdf8" /> Export to Word (.doc)
        </button>
      </div>

      <div className={`test-paper-sheet ${twoColumnMode ? 'two-column-mode' : ''}`}>
        {/* Subtle Academy Watermark */}
        {showWatermark && (
          <div className="paper-watermark-wrapper">
            <img src="/images/logo.png" alt="TCA Watermark" className="watermark-logo-img" />
            <div className="watermark-text-sub">THE CENTURY ACADEMY</div>
          </div>
        )}

        {/* ========================================================
            OFFICIAL CENTURY ACADEMY HEADER
            ======================================================== */}
        <div className="official-header-border">
          <div className="header-top-row">
            <div className="header-logo-section">
              <img
                src="/images/logo.png"
                alt="The Century Academy Logo"
                className="header-official-logo"
              />
              <div className="header-titles">
                <h1>The Century Academy</h1>
                <div className="header-subtitle">OF SCIENCE, COMMERCE & ARTS</div>
                <div className="header-motto">Where Fine Arts & Tech Skills Meet Academic Excellence</div>
              </div>
            </div>
            <div className="header-campus-info">
              <strong>{campus}</strong>
              <div>Faisalabad | Ph: +92 313 8272600</div>
              <div className="test-series-badge">Test Series: {testTitle}</div>
            </div>
          </div>

          {/* Student & Test Meta Grid */}
          <div className="meta-info-grid">
            <div className="meta-field" style={{ gridColumn: 'span 2' }}>
              <span className="meta-label">Student Name:</span>
              <span className="meta-line"></span>
            </div>
            <div className="meta-field">
              <span className="meta-label">Roll No:</span>
              <span className="meta-line"></span>
            </div>
            <div className="meta-field">
              <span className="meta-label">Section:</span>
              <span className="meta-line"></span>
            </div>

            <div className="meta-field">
              <span className="meta-label">Class:</span>
              <span className="meta-line" style={{ fontWeight: 'bold' }}>&nbsp;{className}</span>
            </div>
            <div className="meta-field">
              <span className="meta-label">Subject:</span>
              <span className="meta-line" style={{ fontWeight: 'bold' }}>&nbsp;{subject}</span>
            </div>
            <div className="meta-field">
              <span className="meta-label">Date:</span>
              <span 
                className="meta-line editable-text-field"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => onUpdateMeta && onUpdateMeta('date', e.currentTarget.textContent.trim())}
              >
                &nbsp;{date}
              </span>
            </div>
            <div className="meta-field">
              <span className="meta-label">Time:</span>
              <span 
                className="meta-line editable-text-field"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => onUpdateMeta && onUpdateMeta('timeAllowed', e.currentTarget.textContent.trim())}
              >
                &nbsp;{timeAllowed}
              </span>
            </div>

            <div className="meta-field" style={{ gridColumn: 'span 2' }}>
              <span className="meta-label">Total Marks:</span>
              <span className="meta-line" style={{ fontWeight: 'bold' }}>&nbsp;{accurateTotalMarks}</span>
            </div>
            <div className="marks-box-wrapper" style={{ gridColumn: 'span 2' }}>
              <span className="meta-label">Marks Obtained:</span>
              <span className="obtained">{totalObtainedMarksString}</span>
            </div>
          </div>
        </div>

        {/* ========================================================
            SECTION A: MULTIPLE CHOICE QUESTIONS (OBJECTIVE)
            ======================================================== */}
        {mcqs.length > 0 && (
          <div className="test-section-block">
            <div className="section-banner">
              <span className="section-title-en">Q.1: MULTIPLE CHOICE QUESTIONS (MCQs) — ({mcqs.length} × 1 = {mcqs.length} Marks)</span>
              <span className="section-title-ur">سوال نمبر 1: درست جواب کا انتخاب کریں ({mcqs.length} نمبر)</span>
            </div>
            <div className="section-instructions">
              Note: Encircle the correct option. Overwriting, cutting or using ink remover is strictly prohibited.
            </div>

            <div className="mcqs-wrapper">
              {mcqs.map((q, idx) => (
                <div key={q.id || idx} className="question-row">
                  <div className="question-header-row">
                    <div className="question-content-box">
                      <div className="question-bilingual">
                        {languageMode !== 'ur' && (
                          <div className="q-en">
                            <strong>({idx + 1})</strong> <MathRenderer text={q.question_en} />
                          </div>
                        )}
                        {languageMode !== 'en' && q.question_ur && (
                          <div className="q-ur">
                            <strong>({idx + 1})</strong> <MathRenderer text={q.question_ur} />
                          </div>
                        )}
                      </div>

                      {/* Options Grid */}
                      <div className="mcq-options-grid">
                        {q.options && q.options.map((opt, optIdx) => {
                          const letters = ['A', 'B', 'C', 'D'];
                          const isCorrect = showAnswerKey && q.correct_option_index === optIdx;
                          return (
                            <div
                              key={optIdx}
                              className={`mcq-option-pill ${isCorrect ? 'correct-highlight' : ''}`}
                              style={isCorrect ? { background: '#dcfce7', borderRadius: '4px', padding: '2px 4px' } : {}}
                            >
                              <span className="option-badge">{letters[optIdx]}</span>
                              <MathRenderer text={opt.text} />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* On-screen tools */}
                    <div className="q-action-tools no-print">
                      <button
                        title="Edit question text"
                        className="q-tool-btn"
                        onClick={() => setEditingModal({ type: 'mcq', index: idx, question: { ...q } })}
                      >
                        <Edit3 size={11} /> Edit
                      </button>
                      <button
                        title="Swap with another question"
                        className="q-tool-btn"
                        onClick={() => onSwapQuestion && onSwapQuestion('mcq', idx, q)}
                      >
                        <RefreshCw size={11} /> Swap
                      </button>
                      <button
                        title="Remove question"
                        className="q-tool-btn"
                        onClick={() => onDeleteQuestion && onDeleteQuestion('mcq', idx)}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="btn-add-section-q no-print"
              onClick={() => onAddQuestionToSection && onAddQuestionToSection('mcq')}
            >
              <Plus size={12} /> Add MCQ
            </button>
          </div>
        )}

        {/* ========================================================
            SECTION B: SHORT QUESTIONS (SUBJECTIVE)
            ======================================================== */}
        {shortQuestions.length > 0 && (
          <div className="test-section-block">
            <div className="section-banner">
              <span className="section-title-en">
                Q.2: SHORT QUESTIONS — Attempt any {shortAttemptCount} out of {shortQuestions.length} ({shortMarks} Marks)
              </span>
              <span className="section-title-ur">
                سوال نمبر 2: کوئی سے {shortAttemptCount} سوالات کے مختصر جوابات دیں ({shortMarks} نمبر)
              </span>
            </div>
            <div className="section-instructions">
              Note: Answer in concise, precise mathematical steps. (Each question carries 2 Marks)
            </div>

            <div className="short-questions-wrapper">
              {shortQuestions.map((q, idx) => (
                <div key={q.id || idx} className="question-row">
                  <div className="question-header-row">
                    <div className="question-content-box">
                      <div className="question-bilingual">
                        {languageMode !== 'ur' && (
                          <div className="q-en">
                            <strong>({idx + 1})</strong> <MathRenderer text={q.question_en} />
                          </div>
                        )}
                        {languageMode !== 'en' && q.question_ur && (
                          <div className="q-ur">
                            <strong>({idx + 1})</strong> <MathRenderer text={q.question_ur} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tools */}
                    <div className="q-action-tools no-print">
                      <button
                        title="Edit question text"
                        className="q-tool-btn"
                        onClick={() => setEditingModal({ type: 'short', index: idx, question: { ...q } })}
                      >
                        <Edit3 size={11} /> Edit
                      </button>
                      <button
                        title="Swap with another question"
                        className="q-tool-btn"
                        onClick={() => onSwapQuestion && onSwapQuestion('short', idx, q)}
                      >
                        <RefreshCw size={11} /> Swap
                      </button>
                      <button
                        title="Remove question"
                        className="q-tool-btn"
                        onClick={() => onDeleteQuestion && onDeleteQuestion('short', idx)}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="btn-add-section-q no-print"
              onClick={() => onAddQuestionToSection && onAddQuestionToSection('short')}
            >
              <Plus size={12} /> Add Short Question
            </button>
          </div>
        )}

        {/* ========================================================
            SECTION C: LONG QUESTIONS & NUMERICALS / THEOREMS
            ======================================================== */}
        {longQuestions.length > 0 && (
          <div className="test-section-block">
            <div className="section-banner">
              <span className="section-title-en">Q.3: LONG / EXTENSIVE QUESTIONS & THEOREMS ({longMarks} Marks)</span>
              <span className="section-title-ur">سوال نمبر 3: تفصیلی سوالات و مسئلے ({longMarks} نمبر)</span>
            </div>
            <div className="section-instructions">
              {paperData.targetMarks === 25 && longQuestions.length >= 2 
                ? "Note: Attempt any ONE Question (or both parts a & b, 4 marks each). Overwriting is not allowed." 
                : paperData.targetMarks === 50 && longQuestions.length >= 4
                  ? "Note: Attempt any TWO Questions with complete working and diagrams."
                  : paperData.targetMarks === 75 && longQuestions.length >= 6
                    ? "Note: Attempt any THREE Questions including Compulsory Theorem."
                    : "Note: Attempt all parts with step-by-step working, diagrams and geometrical proofs."}
            </div>

            <div className="long-questions-wrapper">
              {longQuestions.map((q, idx) => (
                <div key={q.id || idx} className="question-row">
                  <div className="question-header-row">
                    <div className="question-content-box">
                      <div className="question-bilingual">
                        {languageMode !== 'ur' && (
                          <div className="q-en">
                            <strong>({idx + 1}) [{q.marks || 4} Marks]</strong> <MathRenderer text={q.question_en} />
                          </div>
                        )}
                        {languageMode !== 'en' && q.question_ur && (
                          <div className="q-ur">
                            <strong>({idx + 1}) [{q.marks || 4} نمبر]</strong> <MathRenderer text={q.question_ur} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tools */}
                    <div className="q-action-tools no-print">
                      <button
                        title="Edit question text"
                        className="q-tool-btn"
                        onClick={() => setEditingModal({ type: 'long', index: idx, question: { ...q } })}
                      >
                        <Edit3 size={11} /> Edit
                      </button>
                      <button
                        title="Swap with another question"
                        className="q-tool-btn"
                        onClick={() => onSwapQuestion && onSwapQuestion('long', idx, q)}
                      >
                        <RefreshCw size={11} /> Swap
                      </button>
                      <button
                        title="Remove question"
                        className="q-tool-btn"
                        onClick={() => onDeleteQuestion && onDeleteQuestion('long', idx)}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="btn-add-section-q no-print"
              onClick={() => onAddQuestionToSection && onAddQuestionToSection('long')}
            >
              <Plus size={12} /> Add Long Question
            </button>
          </div>
        )}

        {/* ========================================================
            OFFICIAL FOOTER
            ======================================================== */}
        <div className="official-paper-footer">
          <div className="footer-quote">
            "Where Fine Arts & Tech Skills Meet Academic Excellence" — The Century Academy, Sargodha Road, Faisalabad
          </div>
          <div className="footer-signatures">
            <div className="signature-line">Subject Specialist</div>
            <div className="signature-line">Syed Faraz Hassan (Principal)</div>
            <div className="signature-line">Controller of Exam</div>
          </div>
        </div>

        {/* Answer Key Sheet (Displayed when toggled) */}
        {showAnswerKey && (
          <div style={{ marginTop: '20px', borderTop: '2px solid #16a34a', paddingTop: '10px' }} className="no-print">
            <h4 style={{ color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} /> Teacher's Marking & Answer Key (Private)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '8px' }}>
              {mcqs.map((q, i) => (
                <div key={i} style={{ background: '#f0fdf4', padding: '4px 8px', borderRadius: '4px', border: '1px solid #bbf7d0', fontSize: '11px' }}>
                  <strong>Q{i + 1}:</strong> Option {['A', 'B', 'C', 'D'][q.correct_option_index] || 'A'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Edit Question Modal with MCQ options editor */}
      {editingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f2744' }}>
                Edit {editingModal.type === 'mcq' ? 'MCQ Question & Options' : editingModal.type === 'short' ? 'Short Question' : 'Long Question / Theorem'}
              </h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setEditingModal(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '10px' }}>
                <label className="form-label">English Text (Supports LaTeX $...$)</label>
                <textarea
                  rows="3"
                  className="form-input"
                  value={editingModal.question.question_en || ''}
                  onChange={(e) => setEditingModal({
                    ...editingModal,
                    question: { ...editingModal.question, question_en: e.target.value }
                  })}
                  required
                />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label className="form-label">Urdu Text (Nastaleeq)</label>
                <textarea
                  rows="3"
                  className="form-input"
                  dir="rtl"
                  value={editingModal.question.question_ur || ''}
                  onChange={(e) => setEditingModal({
                    ...editingModal,
                    question: { ...editingModal.question, question_ur: e.target.value }
                  })}
                />
              </div>

              {/* MCQ Options Editor if type is MCQ */}
              {editingModal.type === 'mcq' && (
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                  <label className="form-label" style={{ marginBottom: '6px' }}>MCQ 4 Options & Correct Answer</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {['A', 'B', 'C', 'D'].map((letter, optIdx) => {
                      const curOpt = editingModal.question.options ? (editingModal.question.options[optIdx]?.text || '') : '';
                      const isCorrect = editingModal.question.correct_option_index === optIdx;
                      return (
                        <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isCorrect ? '#f0fdf4' : 'white', border: isCorrect ? '1.5px solid #22c55e' : '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '6px' }}>
                          <input
                            type="radio"
                            name="correct_option_radio"
                            checked={isCorrect}
                            onChange={() => setEditingModal({
                              ...editingModal,
                              question: { ...editingModal.question, correct_option_index: optIdx }
                            })}
                            title="Mark as correct answer"
                          />
                          <span style={{ fontWeight: 700, fontSize: '0.75rem', color: '#1e3a8a' }}>({letter})</span>
                          <input
                            type="text"
                            value={curOpt}
                            className="form-input"
                            style={{ padding: '3px 6px', fontSize: '0.78rem' }}
                            placeholder={`Option ${letter}`}
                            onChange={(e) => {
                              const opts = editingModal.question.options ? [...editingModal.question.options] : [{ text: '' }, { text: '' }, { text: '' }, { text: '' }];
                              while (opts.length < 4) opts.push({ text: '' });
                              opts[optIdx] = { text: e.target.value };
                              setEditingModal({
                                ...editingModal,
                                question: { ...editingModal.question, options: opts }
                              });
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Marks:</span>
                  <input
                    type="number"
                    style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'center' }}
                    value={editingModal.question.marks || (editingModal.type === 'mcq' ? 1 : editingModal.type === 'short' ? 2 : 4)}
                    onChange={(e) => setEditingModal({
                      ...editingModal,
                      question: { ...editingModal.question, marks: Number(e.target.value) }
                    })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn-outline-dark" onClick={() => setEditingModal(null)}>Cancel</button>
                  <button type="submit" className="btn-primary"><Save size={14} /> Update Paper</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
