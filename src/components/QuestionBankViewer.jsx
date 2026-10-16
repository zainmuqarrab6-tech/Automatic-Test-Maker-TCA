import React, { useState, useMemo } from 'react';
import { Database, Search, Filter, Plus, BookOpen, Layers, RotateCcw, Edit3, Trash2, X, Check } from 'lucide-react';
import MathRenderer from './MathRenderer';
import { AVAILABLE_CLASSES, AVAILABLE_SUBJECTS, CURRICULUM_CHAPTERS_MAP } from '../data/questionBank';

export default function QuestionBankViewer({ 
  questionBank, 
  onAddQuestion, 
  onEditQuestion,
  onDeleteQuestion,
  onResetToMasterBank 
}) {
  const [filterClass, setFilterClass] = useState('9th');
  const [filterSubject, setFilterSubject] = useState('Mathematics');
  const [filterChapter, setFilterChapter] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingModal, setEditingModal] = useState(null); // question object to edit

  // New question form state
  const [newType, setNewType] = useState('short_question');
  const [newChapterNo, setNewChapterNo] = useState(1);
  const [newChapterName, setNewChapterName] = useState('Real and Complex Numbers');
  const [newExercise, setNewExercise] = useState('Ex 1.2');
  const [newMarks, setNewMarks] = useState(2);
  const [newEn, setNewEn] = useState('');
  const [newUr, setNewUr] = useState('');
  const [newOptA, setNewOptA] = useState('');
  const [newOptB, setNewOptB] = useState('');
  const [newOptC, setNewOptC] = useState('');
  const [newOptD, setNewOptD] = useState('');
  const [newCorrectIdx, setNewCorrectIdx] = useState(0);

  // Chapters available for selected class & subject
  const availableChapters = useMemo(() => {
    const list = [];
    const seen = new Set();
    questionBank
      .filter(q => q.class === filterClass && q.subject === filterSubject)
      .forEach(q => {
        if (!seen.has(q.chapter_no)) {
          seen.add(q.chapter_no);
          list.push({
            no: q.chapter_no,
            title_en: q.chapter_name_en,
            title_ur: q.chapter_name_ur
          });
        }
      });

    // Merge standard curriculum chapters
    const standard = CURRICULUM_CHAPTERS_MAP?.[filterClass]?.[filterSubject] || [];
    standard.forEach(c => {
      if (!seen.has(c.no)) {
        seen.add(c.no);
        list.push(c);
      }
    });

    return list.sort((a, b) => a.no - b.no);
  }, [questionBank, filterClass, filterSubject]);

  const filteredQuestions = useMemo(() => {
    return questionBank.filter(q => {
      const matchClass = !filterClass || q.class === filterClass;
      const matchSubject = !filterSubject || q.subject === filterSubject;
      const matchChapter = filterChapter === 'all' || q.chapter_no === Number(filterChapter);
      const matchType = filterType === 'all' || q.type === filterType;
      const matchSearch = !searchQuery || 
        q.question_en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.question_ur?.includes(searchQuery) ||
        q.chapter_name_en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.exercise?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchClass && matchSubject && matchChapter && matchType && matchSearch;
    });
  }, [questionBank, filterClass, filterSubject, filterChapter, filterType, searchQuery]);

  const stats = useMemo(() => {
    const list = questionBank.filter(q => q.class === filterClass && q.subject === filterSubject);
    return {
      total: list.length,
      mcqs: list.filter(q => q.type === 'mcq').length,
      shorts: list.filter(q => q.type === 'short_question').length,
      longs: list.filter(q => q.type === 'long_question').length
    };
  }, [questionBank, filterClass, filterSubject]);

  const handleCreateQuestion = (e) => {
    e.preventDefault();
    if (!newEn && !newUr) return;

    const questionObj = {
      id: `manual-${Date.now()}`,
      class: filterClass,
      subject: filterSubject,
      chapter_no: Number(newChapterNo),
      chapter_name_en: newChapterName,
      chapter_name_ur: newChapterName,
      exercise: newExercise,
      type: newType,
      marks: Number(newMarks),
      question_en: newEn,
      question_ur: newUr,
      options: newType === 'mcq' ? [
        { text: newOptA || 'Option A' },
        { text: newOptB || 'Option B' },
        { text: newOptC || 'Option C' },
        { text: newOptD || 'Option D' }
      ] : null,
      correct_option_index: newType === 'mcq' ? Number(newCorrectIdx) : null
    };

    if (onAddQuestion) onAddQuestion(questionObj);
    setShowAddModal(false);
    setNewEn('');
    setNewUr('');
    setNewOptA('');
    setNewOptB('');
    setNewOptC('');
    setNewOptD('');
  };

  const handleSaveExistingEdit = (e) => {
    e.preventDefault();
    if (!editingModal) return;
    if (onEditQuestion) {
      onEditQuestion(editingModal);
    }
    setEditingModal(null);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Bar with Stats & Filters */}
      <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f2744', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={20} color="#1e3a8a" /> Central Question Bank Database
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Browsing questions for {filterClass} Class — {filterSubject} ({filteredQuestions.length} displayed)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {onResetToMasterBank && (
              <button
                className="btn-outline-dark"
                onClick={onResetToMasterBank}
                title="Restore all official units and questions from master book"
              >
                <RotateCcw size={15} /> Restore Master Bank
              </button>
            )}
            <button className="btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add Question Manually
            </button>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
            Total in Subject: <strong>{stats.total}</strong>
          </div>
          <div style={{ background: '#eff6ff', padding: '6px 12px', borderRadius: '6px', border: '1px solid #bfdbfe', fontSize: '0.82rem', color: '#1e3a8a' }}>
            MCQs: <strong>{stats.mcqs}</strong>
          </div>
          <div style={{ background: '#fef3c7', padding: '6px 12px', borderRadius: '6px', border: '1px solid #fde68a', fontSize: '0.82rem', color: '#92400e' }}>
            Short Qs: <strong>{stats.shorts}</strong>
          </div>
          <div style={{ background: '#f0fdf4', padding: '6px 12px', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '0.82rem', color: '#166534' }}>
            Long Qs / Theorems: <strong>{stats.longs}</strong>
          </div>
        </div>

        {/* Search & Dynamic Select Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {/* Class */}
          <div>
            <select 
              className="form-select" 
              value={filterClass} 
              onChange={(e) => {
                setFilterClass(e.target.value);
                const available = AVAILABLE_SUBJECTS[e.target.value] || [];
                setFilterSubject(available.includes('Mathematics') ? 'Mathematics' : available[0]);
                setFilterChapter('all');
              }}
            >
              {AVAILABLE_CLASSES.map(cls => (
                <option key={cls} value={cls}>Class {cls}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <select 
              className="form-select" 
              value={filterSubject} 
              onChange={(e) => {
                setFilterSubject(e.target.value);
                setFilterChapter('all');
              }}
            >
              {(AVAILABLE_SUBJECTS[filterClass] || []).map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          {/* Chapter / Unit */}
          <div>
            <select 
              className="form-select" 
              value={filterChapter} 
              onChange={(e) => setFilterChapter(e.target.value)}
            >
              <option value="all">All Chapters / Units</option>
              {availableChapters.map(ch => (
                <option key={ch.no} value={ch.no}>Unit {ch.no}: {ch.title_en}</option>
              ))}
            </select>
          </div>

          {/* Question Type */}
          <div>
            <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All Question Types</option>
              <option value="mcq">MCQs Only</option>
              <option value="short_question">Short Questions</option>
              <option value="long_question">Long Questions & Theorems</option>
            </select>
          </div>

          {/* Search Query */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search equations, keywords..."
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px' }}
            />
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
          </div>
        </div>
      </div>

      {/* Question List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredQuestions.length === 0 ? (
          <div style={{ background: 'white', padding: '2.5rem', textAlign: 'center', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
            <BookOpen size={36} color="#94a3b8" style={{ margin: '0 auto 10px auto' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155' }}>No questions match your current filter</h3>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Try switching to another unit, clearing the search query, or add questions using "Add Question Manually".</p>
          </div>
        ) : (
          filteredQuestions.map((q, idx) => (
            <div key={q.id || idx} style={{ background: 'white', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: q.type === 'mcq' ? '#1e3a8a' : q.type === 'short_question' ? '#b45309' : '#15803d', background: q.type === 'mcq' ? '#dbeafe' : q.type === 'short_question' ? '#fef3c7' : '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                    {q.type.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                    Unit {q.chapter_no}: {q.chapter_name_en} {q.exercise ? `(${q.exercise})` : ''}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                    {q.marks || (q.type === 'mcq' ? 1 : q.type === 'short_question' ? 2 : 4)} Marks
                  </span>

                  {/* Edit in Bank */}
                  <button
                    onClick={() => setEditingModal({ ...q })}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '3px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', color: '#1e293b' }}
                    title="Edit question in Question Bank"
                  >
                    <Edit3 size={12} color="#0284c7" /> Edit
                  </button>

                  {/* Delete from Bank */}
                  {onDeleteQuestion && (
                    <button
                      onClick={() => onDeleteQuestion(q.id)}
                      style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', padding: '3px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', color: '#dc2626' }}
                      title="Delete question from central Question Bank"
                    >
                      <Trash2 size={12} color="#dc2626" /> Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Bilingual content */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '6px' }}>
                <div style={{ fontSize: '0.88rem', color: '#0f172a', lineHeight: '1.4' }}>
                  <MathRenderer text={q.question_en} />
                </div>
                <div className="urdu-text" style={{ fontSize: '0.98rem', color: '#0f172a', direction: 'rtl', textAlign: 'right' }}>
                  <MathRenderer text={q.question_ur} />
                </div>
              </div>

              {/* Options for MCQs */}
              {q.options && q.options.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '10px', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} style={{ fontSize: '0.8rem', color: q.correct_option_index === oIdx ? '#16a34a' : '#334155', fontWeight: q.correct_option_index === oIdx ? 700 : 500 }}>
                      <strong>{['A', 'B', 'C', 'D'][oIdx]}:</strong> <MathRenderer text={opt.text} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Question Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '650px', borderRadius: '12px', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f2744' }}>
                Add New Question to Bank
              </h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label className="form-label">Type</label>
                  <select className="form-select" value={newType} onChange={(e) => {
                    setNewType(e.target.value);
                    setNewMarks(e.target.value === 'mcq' ? 1 : e.target.value === 'short_question' ? 2 : 4);
                  }}>
                    <option value="mcq">MCQ (1 Mark)</option>
                    <option value="short_question">Short Question (2 Marks)</option>
                    <option value="long_question">Long Question (4/8 Marks)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Chapter No</label>
                  <input type="number" className="form-input" value={newChapterNo} onChange={(e) => setNewChapterNo(e.target.value)} />
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label className="form-label">Question Text (English with LaTeX e.g. $x^2$)</label>
                <textarea rows="2" className="form-input" value={newEn} onChange={(e) => setNewEn(e.target.value)} required />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label className="form-label">Question Text (Urdu Nastaleeq)</label>
                <textarea rows="2" className="form-input" dir="rtl" value={newUr} onChange={(e) => setNewUr(e.target.value)} />
              </div>

              {newType === 'mcq' && (
                <div style={{ marginBottom: '10px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label className="form-label">Options</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                    <input className="form-input" placeholder="Option A" value={newOptA} onChange={(e) => setNewOptA(e.target.value)} />
                    <input className="form-input" placeholder="Option B" value={newOptB} onChange={(e) => setNewOptB(e.target.value)} />
                    <input className="form-input" placeholder="Option C" value={newOptC} onChange={(e) => setNewOptC(e.target.value)} />
                    <input className="form-input" placeholder="Option D" value={newOptD} onChange={(e) => setNewOptD(e.target.value)} />
                  </div>
                  <div style={{ fontSize: '0.8rem' }}>
                    <span>Correct Option: </span>
                    <select value={newCorrectIdx} onChange={(e) => setNewCorrectIdx(e.target.value)} style={{ padding: '2px 6px', borderRadius: '4px' }}>
                      <option value="0">A</option>
                      <option value="1">B</option>
                      <option value="2">C</option>
                      <option value="3">D</option>
                    </select>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                <button type="button" className="btn-outline-dark" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Question</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {editingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '650px', borderRadius: '12px', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f2744' }}>
                Edit Question in Bank
              </h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setEditingModal(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveExistingEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label className="form-label">Type</label>
                  <select 
                    className="form-select" 
                    value={editingModal.type} 
                    onChange={(e) => setEditingModal({ ...editingModal, type: e.target.value })}
                  >
                    <option value="mcq">MCQ</option>
                    <option value="short_question">Short Question</option>
                    <option value="long_question">Long Question / Theorem</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Chapter No</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={editingModal.chapter_no} 
                    onChange={(e) => setEditingModal({ ...editingModal, chapter_no: Number(e.target.value) })} 
                  />
                </div>
                <div>
                  <label className="form-label">Marks</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={editingModal.marks || 1} 
                    onChange={(e) => setEditingModal({ ...editingModal, marks: Number(e.target.value) })} 
                  />
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label className="form-label">English Text (Supports LaTeX e.g. $x^2$)</label>
                <textarea 
                  rows="3" 
                  className="form-input" 
                  value={editingModal.question_en || ''} 
                  onChange={(e) => setEditingModal({ ...editingModal, question_en: e.target.value })} 
                  required 
                />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label className="form-label">Urdu Text (Nastaleeq)</label>
                <textarea 
                  rows="3" 
                  className="form-input" 
                  dir="rtl" 
                  value={editingModal.question_ur || ''} 
                  onChange={(e) => setEditingModal({ ...editingModal, question_ur: e.target.value })} 
                />
              </div>

              {editingModal.type === 'mcq' && (
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                  <label className="form-label" style={{ marginBottom: '6px' }}>MCQ 4 Options & Correct Answer</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {['A', 'B', 'C', 'D'].map((letter, optIdx) => {
                      const curOpt = editingModal.options ? (editingModal.options[optIdx]?.text || '') : '';
                      const isCorrect = editingModal.correct_option_index === optIdx;
                      return (
                        <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isCorrect ? '#f0fdf4' : 'white', border: isCorrect ? '1.5px solid #22c55e' : '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '6px' }}>
                          <input
                            type="radio"
                            name="bank_edit_correct_option"
                            checked={isCorrect}
                            onChange={() => setEditingModal({ ...editingModal, correct_option_index: optIdx })}
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
                              const opts = editingModal.options ? [...editingModal.options] : [{ text: '' }, { text: '' }, { text: '' }, { text: '' }];
                              while (opts.length < 4) opts.push({ text: '' });
                              opts[optIdx] = { text: e.target.value };
                              setEditingModal({ ...editingModal, options: opts });
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                <button type="button" className="btn-outline-dark" onClick={() => setEditingModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Update Question</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
