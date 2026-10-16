import React, { useState, useMemo } from 'react';
import { Sparkles, Sliders, Layers, CheckSquare, Square, Check, Search, Filter, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';
import { AVAILABLE_CLASSES, AVAILABLE_SUBJECTS } from '../data/questionBank';
import MathRenderer from './MathRenderer';

export default function TestGeneratorWizard({
  questionBank,
  onGenerateTest,
  onGenerateManualTest,
  selectedClass,
  setSelectedClass,
  selectedSubject,
  setSelectedSubject
}) {
  const [generationMode, setGenerationMode] = useState('auto'); // 'auto' | 'manual'
  const [selectedChapters, setSelectedChapters] = useState([1]);
  const [targetMarks, setTargetMarks] = useState(25);
  const [mcqCount, setMcqCount] = useState(5);
  const [shortCount, setShortCount] = useState(6);
  const [longCount, setLongCount] = useState(2);
  const [timeAllowed, setTimeAllowed] = useState("45 Mins");
  const [testTitle, setTestTitle] = useState("Chapter-Wise Test Series 2026");
  const [campus, setCampus] = useState("Sargodha Road Campus");

  // Manual Selection State
  const [manualSelectedIds, setManualSelectedIds] = useState([]);
  const [manualTypeFilter, setManualTypeFilter] = useState('all'); // 'all' | 'mcq' | 'short_question' | 'long_question'
  const [manualSearchQuery, setManualSearchQuery] = useState('');

  // Filter available chapters from the question bank based on class & subject
  const availableChapters = useMemo(() => {
    const list = [];
    const seen = new Set();
    questionBank
      .filter(q => q.class === selectedClass && q.subject === selectedSubject)
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
    return list.sort((a, b) => a.no - b.no);
  }, [questionBank, selectedClass, selectedSubject]);

  // Auto-sync selected chapters when class or subject changes
  React.useEffect(() => {
    if (availableChapters.length > 0) {
      const valid = selectedChapters.filter(c => availableChapters.some(ac => ac.no === c));
      if (valid.length > 0) {
        setSelectedChapters(valid);
      } else {
        setSelectedChapters([availableChapters[0].no]);
      }
    }
  }, [availableChapters]);

  // Handle Preset Marks Clicks
  const handlePresetMarks = (marks) => {
    setTargetMarks(marks);
    if (marks === 15) {
      setMcqCount(3);
      setShortCount(4);
      setLongCount(1);
      setTimeAllowed("30 Mins");
    } else if (marks === 20) {
      setMcqCount(4);
      setShortCount(6);
      setLongCount(1);
      setTimeAllowed("40 Mins");
    } else if (marks === 25) {
      setMcqCount(5);
      setShortCount(6);
      setLongCount(2);
      setTimeAllowed("45 Mins");
    } else if (marks === 35) {
      setMcqCount(7);
      setShortCount(8);
      setLongCount(3);
      setTimeAllowed("1 Hour");
    } else if (marks === 50) {
      setMcqCount(10);
      setShortCount(12);
      setLongCount(4);
      setTimeAllowed("1.5 Hours");
    } else if (marks === 75) {
      setMcqCount(15);
      setShortCount(18);
      setLongCount(6);
      setTimeAllowed("2.5 Hours");
    }
  };

  const toggleChapter = (chNo) => {
    if (selectedChapters.includes(chNo)) {
      if (selectedChapters.length > 1) {
        setSelectedChapters(selectedChapters.filter(c => c !== chNo));
      }
    } else {
      setSelectedChapters([...selectedChapters, chNo]);
    }
  };

  const selectAllChapters = () => {
    setSelectedChapters(availableChapters.map(c => c.no));
  };

  const selectFirstHalf = () => {
    const half = availableChapters.slice(0, Math.ceil(availableChapters.length / 2));
    setSelectedChapters(half.map(c => c.no));
  };

  const selectSecondHalf = () => {
    const half = availableChapters.slice(Math.ceil(availableChapters.length / 2));
    setSelectedChapters(half.map(c => c.no));
  };

  // Pool for manual picker
  const manualQuestionPool = useMemo(() => {
    return questionBank.filter(
      q => q.class === selectedClass && 
           q.subject === selectedSubject && 
           selectedChapters.includes(q.chapter_no)
    );
  }, [questionBank, selectedClass, selectedSubject, selectedChapters]);

  const filteredManualPool = useMemo(() => {
    return manualQuestionPool.filter(q => {
      const matchType = manualTypeFilter === 'all' || q.type === manualTypeFilter;
      const matchSearch = !manualSearchQuery || 
        q.question_en?.toLowerCase().includes(manualSearchQuery.toLowerCase()) ||
        q.question_ur?.includes(manualSearchQuery) ||
        q.exercise?.toLowerCase().includes(manualSearchQuery.toLowerCase());
      return matchType && matchSearch;
    });
  }, [manualQuestionPool, manualTypeFilter, manualSearchQuery]);

  const toggleManualSelect = (qId) => {
    if (manualSelectedIds.includes(qId)) {
      setManualSelectedIds(manualSelectedIds.filter(id => id !== qId));
    } else {
      setManualSelectedIds([...manualSelectedIds, qId]);
    }
  };

  // Calculate manual totals
  const manualStats = useMemo(() => {
    const selected = manualQuestionPool.filter(q => manualSelectedIds.includes(q.id));
    const mcqs = selected.filter(q => q.type === 'mcq');
    const shorts = selected.filter(q => q.type === 'short_question');
    const longs = selected.filter(q => q.type === 'long_question');

    const mcqMarks = mcqs.length * 1;
    const shortAttempt = shorts.length > 3 ? shorts.length - 2 : shorts.length;
    const shortMarks = shortAttempt * 2;
    const longMarks = longs.reduce((s, q) => s + (q.marks || 4), 0);
    const total = mcqMarks + shortMarks + longMarks;

    return {
      mcqCount: mcqs.length,
      shortCount: shorts.length,
      longCount: longs.length,
      totalMarks: total,
      selectedQuestions: selected
    };
  }, [manualQuestionPool, manualSelectedIds]);

  const handleGenerateClick = () => {
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch (e) {}

    if (generationMode === 'auto') {
      onGenerateTest({
        selectedClass,
        selectedSubject,
        selectedChapters,
        mcqCount: Number(mcqCount),
        shortCount: Number(shortCount),
        longCount: Number(longCount),
        targetMarks,
        timeAllowed,
        testTitle,
        campus
      });
    } else {
      // Manual Picker Generation
      if (manualSelectedIds.length === 0) {
        alert("Please select at least 1 question using the checkboxes below.");
        return;
      }
      if (onGenerateManualTest) {
        onGenerateManualTest({
          selectedClass,
          selectedSubject,
          selectedChapters,
          selectedQuestions: manualStats.selectedQuestions,
          timeAllowed,
          testTitle,
          campus
        });
      }
    }
  };

  return (
    <div className="config-card">
      <div className="config-header">
        <h2><Sliders size={20} /> Test Configuration</h2>
        <p>Set parameters according to your requirement</p>
      </div>

      {/* Mode Switcher Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '14px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
        <button
          type="button"
          onClick={() => setGenerationMode('auto')}
          style={{
            padding: '6px 10px',
            fontSize: '0.8rem',
            fontWeight: 700,
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: generationMode === 'auto' ? '#1e3a8a' : 'transparent',
            color: generationMode === 'auto' ? '#ffffff' : '#64748b'
          }}
        >
          ⚡ Auto Generator
        </button>
        <button
          type="button"
          onClick={() => setGenerationMode('manual')}
          style={{
            padding: '6px 10px',
            fontSize: '0.8rem',
            fontWeight: 700,
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: generationMode === 'manual' ? '#1e3a8a' : 'transparent',
            color: generationMode === 'manual' ? '#ffffff' : '#64748b'
          }}
        >
          ✍️ Manual Picker
        </button>
      </div>

      {/* Class Selection */}
      <div className="form-group">
        <label className="form-label">1. Select Class</label>
        <select
          className="form-select"
          value={selectedClass}
          onChange={(e) => {
            setSelectedClass(e.target.value);
            const subs = AVAILABLE_SUBJECTS[e.target.value] || [];
            setSelectedSubject(subs.includes("Mathematics") ? "Mathematics" : subs[0]);
          }}
        >
          {AVAILABLE_CLASSES.map(cls => (
            <option key={cls} value={cls}>Class {cls}</option>
          ))}
        </select>
      </div>

      {/* Subject Selection */}
      <div className="form-group">
        <label className="form-label">2. Select Subject</label>
        <select
          className="form-select"
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
        >
          {(AVAILABLE_SUBJECTS[selectedClass] || []).map(sub => (
            <option key={sub} value={sub}>{sub}</option>
          ))}
        </select>
      </div>

      {/* Chapter Selection */}
      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label className="form-label" style={{ marginBottom: 0 }}>3. Select Chapters / Units</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={selectAllChapters}
              style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', fontSize: '0.68rem', padding: '2px 5px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
              title="Select all units"
            >
              All
            </button>
            <button
              type="button"
              onClick={selectFirstHalf}
              style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.68rem', padding: '2px 5px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
              title="First Half Book (Mid-term / Term 1)"
            >
              1st Half
            </button>
            <button
              type="button"
              onClick={selectSecondHalf}
              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: '0.68rem', padding: '2px 5px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
              title="Second Half Book (Final Term / Term 2)"
            >
              2nd Half
            </button>
          </div>
        </div>

        <div className="chapters-box">
          {availableChapters.length === 0 ? (
            <div style={{ padding: '8px', fontSize: '0.8rem', color: '#64748b' }}>
              No chapters loaded for this subject. Use "Upload Material" to add questions.
            </div>
          ) : (
            availableChapters.map(ch => {
              const isChecked = selectedChapters.includes(ch.no);
              return (
                <div
                  key={ch.no}
                  className="chapter-item"
                  onClick={() => toggleChapter(ch.no)}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                  />
                  <span>
                    <strong>Unit {ch.no}:</strong> {ch.title_en}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* AUTO MODE SETTINGS */}
      {generationMode === 'auto' && (
        <>
          {/* Preset Marks */}
          <div className="form-group">
            <label className="form-label">4. Total Marks Target</label>
            <div className="preset-pills-row">
              {[15, 20, 25, 35, 50, 75].map(m => (
                <button
                  key={m}
                  type="button"
                  className={`preset-pill ${targetMarks === m ? 'active' : ''}`}
                  onClick={() => handlePresetMarks(m)}
                >
                  {m} Marks
                </button>
              ))}
            </div>
          </div>

          {/* Question Counts Manual Adjustment */}
          <div className="form-group">
            <label className="form-label">5. Question Distribution</label>
            <div className="counts-grid">
              <div className="count-card">
                <span>MCQs</span>
                <input
                  type="number"
                  min="0"
                  max="25"
                  value={mcqCount}
                  onChange={(e) => setMcqCount(e.target.value)}
                />
              </div>
              <div className="count-card">
                <span>Short Qs</span>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={shortCount}
                  onChange={(e) => setShortCount(e.target.value)}
                />
              </div>
              <div className="count-card">
                <span>Long Qs</span>
                <input
                  type="number"
                  min="0"
                  max="8"
                  value={longCount}
                  onChange={(e) => setLongCount(e.target.value)}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* MANUAL PICKER MODE SETTINGS */}
      {generationMode === 'manual' && (
        <div className="form-group" style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>4. Hand-pick Questions</label>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e3a8a' }}>
              {manualStats.selectedQuestions.length} Selected ({manualStats.totalMarks} Marks)
            </span>
          </div>

          {/* Sub Filters */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
            <button
              type="button"
              onClick={() => setManualTypeFilter('all')}
              style={{
                fontSize: '0.68rem',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                background: manualTypeFilter === 'all' ? '#1e3a8a' : '#ffffff',
                color: manualTypeFilter === 'all' ? '#ffffff' : '#334155',
                cursor: 'pointer'
              }}
            >
              All ({manualQuestionPool.length})
            </button>
            <button
              type="button"
              onClick={() => setManualTypeFilter('mcq')}
              style={{
                fontSize: '0.68rem',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                background: manualTypeFilter === 'mcq' ? '#1e3a8a' : '#ffffff',
                color: manualTypeFilter === 'mcq' ? '#ffffff' : '#334155',
                cursor: 'pointer'
              }}
            >
              MCQs
            </button>
            <button
              type="button"
              onClick={() => setManualTypeFilter('short_question')}
              style={{
                fontSize: '0.68rem',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                background: manualTypeFilter === 'short_question' ? '#1e3a8a' : '#ffffff',
                color: manualTypeFilter === 'short_question' ? '#ffffff' : '#334155',
                cursor: 'pointer'
              }}
            >
              Short
            </button>
            <button
              type="button"
              onClick={() => setManualTypeFilter('long_question')}
              style={{
                fontSize: '0.68rem',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                background: manualTypeFilter === 'long_question' ? '#1e3a8a' : '#ffffff',
                color: manualTypeFilter === 'long_question' ? '#ffffff' : '#334155',
                cursor: 'pointer'
              }}
            >
              Long/Theorems
            </button>
          </div>

          {/* Search */}
          <div style={{ marginBottom: '8px' }}>
            <input
              type="text"
              placeholder="Filter questions..."
              className="form-input"
              style={{ fontSize: '0.78rem', padding: '4px 8px' }}
              value={manualSearchQuery}
              onChange={(e) => setManualSearchQuery(e.target.value)}
            />
          </div>

          {/* Scrollable Questions List */}
          <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white' }}>
            {filteredManualPool.length === 0 ? (
              <div style={{ padding: '10px', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
                No matching questions in selected chapters.
              </div>
            ) : (
              filteredManualPool.map(q => {
                const isSelected = manualSelectedIds.includes(q.id);
                return (
                  <div
                    key={q.id}
                    onClick={() => toggleManualSelect(q.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '6px 8px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      background: isSelected ? '#eff6ff' : 'transparent',
                      transition: 'background 0.15s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      style={{ marginTop: '3px' }}
                    />
                    <div style={{ flex: 1, minWidth: 0, fontSize: '0.75rem', lineHeight: '1.25' }}>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ background: '#e2e8f0', color: '#334155', padding: '1px 4px', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 700 }}>
                          U{q.chapter_no} {q.exercise || ''}
                        </span>
                        <span style={{ color: '#0284c7', fontSize: '0.65rem', fontWeight: 600 }}>
                          {q.type === 'mcq' ? 'MCQ (1M)' : q.type === 'short_question' ? 'Short (2M)' : `Long (${q.marks || 4}M)`}
                        </span>
                      </div>
                      <div style={{ color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {q.question_en}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Test Meta Info */}
      <div className="form-group">
        <label className="form-label">{generationMode === 'auto' ? '6. Test Details' : '5. Test Details'}</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Time Allowed</span>
            <input
              type="text"
              className="form-input"
              value={timeAllowed}
              onChange={(e) => setTimeAllowed(e.target.value)}
            />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Campus</span>
            <select
              className="form-select"
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
            >
              <option value="Sargodha Road Campus">Sargodha Road Campus</option>
              <option value="Gulberg Road Campus">Gulberg Road Campus</option>
              <option value="Main Campus">Main Campus</option>
            </select>
          </div>
        </div>
      </div>

      {/* Generate Action Button */}
      <button
        type="button"
        className="btn-primary"
        style={{ width: '100%', marginTop: '0.5rem', padding: '0.8rem' }}
        onClick={handleGenerateClick}
      >
        <Sparkles size={18} /> {generationMode === 'auto' ? 'Generate Test Paper' : `Build Paper with ${manualSelectedIds.length} Selected`}
      </button>
    </div>
  );
}
