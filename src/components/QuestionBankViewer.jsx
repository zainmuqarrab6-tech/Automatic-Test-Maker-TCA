import React, { useState, useMemo } from 'react';
import { Database, Search, Filter, Plus, BookOpen, Layers, RotateCcw } from 'lucide-react';
import MathRenderer from './MathRenderer';

export default function QuestionBankViewer({ questionBank, onAddQuestion, onResetToMasterBank }) {
  const [filterClass, setFilterClass] = useState('9th');
  const [filterSubject, setFilterSubject] = useState('Mathematics');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

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

  const filteredQuestions = useMemo(() => {
    return questionBank.filter(q => {
      const matchClass = !filterClass || q.class === filterClass;
      const matchSubject = !filterSubject || q.subject === filterSubject;
      const matchType = filterType === 'all' || q.type === filterType;
      const matchSearch = !searchQuery || 
        q.question_en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.question_ur?.includes(searchQuery) ||
        q.chapter_name_en?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchClass && matchSubject && matchType && matchSearch;
    });
  }, [questionBank, filterClass, filterSubject, filterType, searchQuery]);

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

    onAddQuestion(questionObj);
    setShowAddModal(false);
    setNewEn('');
    setNewUr('');
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
              Browsing questions for {filterClass} Class — {filterSubject}
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

        {/* Search & Select Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <div>
            <select className="form-select" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
              <option value="9th">Class 9th</option>
              <option value="10th">Class 10th</option>
              <option value="11th">Class 11th</option>
              <option value="12th">Class 12th</option>
            </select>
          </div>
          <div>
            <select className="form-select" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
              <option value="Mathematics">Mathematics</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
            </select>
          </div>
          <div>
            <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All Question Types</option>
              <option value="mcq">MCQs Only</option>
              <option value="short_question">Short Questions</option>
              <option value="long_question">Long Questions & Theorems</option>
            </select>
          </div>
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
          <div style={{ background: 'white', padding: '2rem', textAlign: 'center', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
            No questions match your current filter. Try selecting another chapter or subject.
          </div>
        ) : (
          filteredQuestions.map((q, idx) => (
            <div key={q.id || idx} style={{ background: 'white', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: q.type === 'mcq' ? '#1e3a8a' : q.type === 'short_question' ? '#b45309' : '#15803d', background: q.type === 'mcq' ? '#dbeafe' : q.type === 'short_question' ? '#fef3c7' : '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                    {q.type.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                    Unit {q.chapter_no}: {q.chapter_name_en} ({q.exercise || 'Exercise'})
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                  {q.marks || 1} Marks
                </span>
              </div>

              {/* Bilingual content */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '6px' }}>
                <div style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                  <MathRenderer text={q.question_en} />
                </div>
                <div className="urdu-text" style={{ fontSize: '0.98rem', color: '#0f172a' }}>
                  <MathRenderer text={q.question_ur} />
                </div>
              </div>

              {/* Options for MCQs */}
              {q.options && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '8px', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px' }}>
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
          <div style={{ background: 'white', width: '100%', maxWidth: '650px', borderRadius: '12px', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f2744', marginBottom: '1rem' }}>
              Add New Question to Bank
            </h3>

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
                <div style={{ marginBottom: '10px', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
                <button type="button" className="btn-outline-dark" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Question</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
