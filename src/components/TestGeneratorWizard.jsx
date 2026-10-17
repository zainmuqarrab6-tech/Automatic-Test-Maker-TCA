import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Sliders, Layers, CheckSquare, Square, Check, Search, Filter, BookOpen, AlertTriangle, Loader2, FileSpreadsheet } from 'lucide-react';
import confetti from 'canvas-confetti';
import { AVAILABLE_CLASSES, AVAILABLE_SUBJECTS } from '../data/questionBank';
import MathRenderer from './MathRenderer';

export default function TestGeneratorWizard({
  questionBank,
  onGenerateTest,
  onGenerateManualTest,
  onGenerateBackendTest,
  selectedClass,
  setSelectedClass,
  selectedSubject,
  setSelectedSubject,
  backendMetadata = null
}) {
  const [generationMode, setGenerationMode] = useState('scheme'); // 'scheme' | 'auto' | 'manual'

  // Backend Scheme & Syllabus Division Generation State
  const [syllabusDivisions, setSyllabusDivisions] = useState([]);
  const [paperSchemes, setPaperSchemes] = useState([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [selectedSchemeId, setSelectedSchemeId] = useState('');
  const [nRecentTests, setNRecentTests] = useState(3);
  const [loadingBackendData, setLoadingBackendData] = useState(false);
  const [generatingBackend, setGeneratingBackend] = useState(false);
  const [shortageErrors, setShortageErrors] = useState(null);
  
  // Syllabus & Chapter Range Selection Mode
  // 'full_chapter' | 'half_chapter' | 'page_range' | 'custom_command'
  const [rangeMode, setRangeMode] = useState('full_chapter');
  const [selectedChapters, setSelectedChapters] = useState([1]);
  
  // Half Chapter Mode
  const [halfChapterNo, setHalfChapterNo] = useState(1);
  const [halfType, setHalfType] = useState('first_half'); // 'first_half' | 'second_half'

  // Page Range Mode
  const [pageChapterNo, setPageChapterNo] = useState(1);
  const [pageFrom, setPageFrom] = useState('');
  const [pageTo, setPageTo] = useState('');

  // Custom Teacher Command Mode
  const [customCommand, setCustomCommand] = useState('');

  // Universal Syllabus Display Label on Test Paper Header
  const [customSyllabusLabel, setCustomSyllabusLabel] = useState('');

  const [targetMarks, setTargetMarks] = useState(25);
  const [mcqCount, setMcqCount] = useState(5);
  const [shortCount, setShortCount] = useState(8);
  const [longCount, setLongCount] = useState(2);
  const [timeAllowed, setTimeAllowed] = useState("45 Mins");
  const [testTitle, setTestTitle] = useState("Chapter-Wise Test Series 2026");
  const [campus, setCampus] = useState("Sargodha Road Campus");

  // Manual Selection State
  const [manualSelectedIds, setManualSelectedIds] = useState([]);
  const [manualTypeFilter, setManualTypeFilter] = useState('all'); // 'all' | 'mcq' | 'short_question' | 'long_question'
  const [manualSearchQuery, setManualSearchQuery] = useState('');

  // Dynamically resolve classes from backend metadata or fallback
  const dynamicClasses = useMemo(() => {
    if (backendMetadata?.classes?.length) {
      return backendMetadata.classes.map(c => typeof c === 'string' ? c : c.name);
    }
    return AVAILABLE_CLASSES;
  }, [backendMetadata]);

  // Dynamically resolve subjects for current class from backend metadata or fallback
  const dynamicSubjects = useMemo(() => {
    if (backendMetadata?.classes?.length) {
      const clsObj = backendMetadata.classes.find(c => (typeof c === 'string' ? c : c.name) === selectedClass);
      if (clsObj && clsObj.subjects?.length) {
        return clsObj.subjects.map(s => typeof s === 'string' ? s : s.name);
      }
    }
    if (backendMetadata?.subjects && Array.isArray(backendMetadata.subjects[selectedClass])) {
      return backendMetadata.subjects[selectedClass];
    }
    return AVAILABLE_SUBJECTS[selectedClass] || [];
  }, [backendMetadata, selectedClass]);

  // Current Subject Object and ID from backend metadata
  const currentSubjectObj = useMemo(() => {
    if (backendMetadata?.classes?.length) {
      const clsObj = backendMetadata.classes.find(c => (typeof c === 'string' ? c : c.name) === selectedClass);
      return clsObj?.subjects?.find(s => (typeof s === 'string' ? s : s.name) === selectedSubject);
    }
    return null;
  }, [backendMetadata, selectedClass, selectedSubject]);

  const currentSubjectId = currentSubjectObj?.id;

  // Load Syllabus Divisions and Paper Schemes for this Subject
  useEffect(() => {
    if (!currentSubjectId) return;
    setLoadingBackendData(true);
    setShortageErrors(null);

    Promise.all([
      fetch(`/api/v1/syllabus-divisions?subject_id=${currentSubjectId}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/v1/schemes?subject_id=${currentSubjectId}`).then(r => r.ok ? r.json() : [])
    ]).then(([divs, schs]) => {
      const validDivs = Array.isArray(divs) ? divs : [];
      const validSchs = Array.isArray(schs) ? schs : [];
      setSyllabusDivisions(validDivs);
      setPaperSchemes(validSchs);
      if (validDivs.length > 0) setSelectedDivisionId(String(validDivs[0].id));
      else setSelectedDivisionId('');
      if (validSchs.length > 0) {
        setSelectedSchemeId(String(validSchs[0].id));
        setTargetMarks(validSchs[0].total_marks);
        if (validSchs[0].duration_minutes) setTimeAllowed(`${validSchs[0].duration_minutes} Mins`);
        setTestTitle(validSchs[0].name);
      } else {
        setSelectedSchemeId('');
      }
    }).catch(err => {
      console.warn('Error fetching divisions/schemes in wizard:', err);
    }).finally(() => {
      setLoadingBackendData(false);
    });
  }, [currentSubjectId]);

  // Dynamically extract available chapters from the database metadata or question bank
  const availableChapters = useMemo(() => {
    // 1. If backend metadata has chapters for this class and subject, use them
    if (backendMetadata?.classes?.length) {
      const clsObj = backendMetadata.classes.find(c => c.name === selectedClass);
      const subjObj = clsObj?.subjects?.find(s => s.name === selectedSubject);
      if (subjObj?.chapters?.length) {
        return subjObj.chapters.map(ch => ({
          no: ch.chapter_number,
          title_en: ch.name_en || `Unit ${ch.chapter_number}`,
          title_ur: ch.name_ur || `یونٹ ${ch.chapter_number}`
        })).sort((a, b) => a.no - b.no);
      }
    }

    // 2. Otherwise extract from loaded question bank
    const list = [];
    const seen = new Set();
    questionBank
      .filter(q => (q.class === selectedClass || q.class_name === selectedClass) && 
                   (q.subject === selectedSubject || q.subject_name === selectedSubject))
      .forEach(q => {
        if (!seen.has(q.chapter_no)) {
          seen.add(q.chapter_no);
          list.push({
            no: q.chapter_no,
            title_en: q.chapter_name_en || `Unit ${q.chapter_no}`,
            title_ur: q.chapter_name_ur || `یونٹ ${q.chapter_no}`
          });
        }
      });

    // 3. Fallback if empty
    if (list.length === 0) {
      for (let i = 1; i <= 10; i++) {
        list.push({
          no: i,
          title_en: `Unit ${i}`,
          title_ur: `یونٹ ${i}`
        });
      }
    }

    return list.sort((a, b) => a.no - b.no);
  }, [backendMetadata, questionBank, selectedClass, selectedSubject]);

  // Auto-sync selected chapters when class or subject changes
  React.useEffect(() => {
    if (availableChapters.length > 0) {
      const valid = selectedChapters.filter(c => availableChapters.some(ac => ac.no === c));
      if (valid.length > 0) {
        setSelectedChapters(valid);
      } else {
        setSelectedChapters([availableChapters[0].no]);
        setHalfChapterNo(availableChapters[0].no);
        setPageChapterNo(availableChapters[0].no);
      }
    }
  }, [availableChapters]);

  // Auto-generate syllabus label when parameters change
  React.useEffect(() => {
    if (availableChapters.length === 0) return;

    if (rangeMode === 'half_chapter') {
      const ch = availableChapters.find(c => c.no === Number(halfChapterNo)) || availableChapters[0];
      const chTitle = ch?.title_en || `Unit ${halfChapterNo}`;
      const halfName = halfType === 'first_half' ? `1st Half (Ex ${ch?.no}.1 to ${ch?.no}.3)` : `2nd Half (Ex ${ch?.no}.4 to Review)`;
      setCustomSyllabusLabel(`Unit ${ch?.no}: ${chTitle} - ${halfName}`);
    } else if (rangeMode === 'page_range') {
      const ch = availableChapters.find(c => c.no === Number(pageChapterNo)) || availableChapters[0];
      const chTitle = ch?.title_en || `Unit ${pageChapterNo}`;
      const pStr = (pageFrom || pageTo) ? `Pages ${pageFrom || '1'} to ${pageTo || 'End'}` : 'Custom Pages';
      setCustomSyllabusLabel(`Unit ${ch?.no}: ${chTitle} (${pStr})`);
    } else if (rangeMode === 'custom_command') {
      if (customCommand.trim()) {
        setCustomSyllabusLabel(customCommand.trim());
      }
    } else {
      // full_chapter
      if (selectedChapters.length === 1) {
        const ch = availableChapters.find(c => c.no === selectedChapters[0]);
        setCustomSyllabusLabel(ch ? `Unit ${ch.no}: ${ch.title_en}` : `Unit ${selectedChapters[0]}`);
      } else if (selectedChapters.length === availableChapters.length && availableChapters.length > 0) {
        setCustomSyllabusLabel(`Full Book (Units 1 - ${availableChapters.length})`);
      } else if (selectedChapters.length > 1) {
        setCustomSyllabusLabel(`Units ${selectedChapters.join(', ')}`);
      }
    }
  }, [rangeMode, halfChapterNo, halfType, pageChapterNo, pageFrom, pageTo, customCommand, selectedChapters, availableChapters]);

  // Handle Preset Marks Clicks (Exact Punjab Board Scheme)
  const handlePresetMarks = (marks) => {
    setTargetMarks(marks);
    if (marks === 15) {
      setMcqCount(3);
      setShortCount(5);
      setLongCount(1);
      setTimeAllowed("30 Mins");
    } else if (marks === 20) {
      setMcqCount(4);
      setShortCount(7);
      setLongCount(1);
      setTimeAllowed("40 Mins");
    } else if (marks === 25) {
      setMcqCount(5);
      setShortCount(8);
      setLongCount(2);
      setTimeAllowed("45 Mins");
    } else if (marks === 35) {
      setMcqCount(7);
      setShortCount(10);
      setLongCount(3);
      setTimeAllowed("1 Hour");
    } else if (marks === 50) {
      setMcqCount(10);
      setShortCount(15);
      setLongCount(4);
      setTimeAllowed("1.5 Hours");
    } else if (marks === 75) {
      setMcqCount(15);
      setShortCount(22);
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

  // Filter question pool strictly based on teacher's chosen syllabus range
  const filteredQuestionPool = useMemo(() => {
    let pool = questionBank.filter(
      q => q.class === selectedClass && q.subject === selectedSubject
    );

    if (rangeMode === 'half_chapter') {
      const targetCh = Number(halfChapterNo) || (availableChapters[0]?.no || 1);
      const chQuestions = pool.filter(q => q.chapter_no === targetCh);
      if (chQuestions.length === 0) return pool.filter(q => selectedChapters.includes(q.chapter_no));

      if (halfType === 'first_half') {
        const firstMatches = chQuestions.filter(q => {
          const ex = (q.exercise || '').toLowerCase();
          return ex.includes('.1') || ex.includes('.2') || ex.includes('.3') || ex.includes('definitions') || ex.includes('تعریفات');
        });
        return firstMatches.length >= 3 ? firstMatches : chQuestions.slice(0, Math.ceil(chQuestions.length / 2));
      } else {
        const secondMatches = chQuestions.filter(q => {
          const ex = (q.exercise || '').toLowerCase();
          return ex.includes('.4') || ex.includes('.5') || ex.includes('.6') || ex.includes('.7') || ex.includes('review') || ex.includes('اعادہ');
        });
        return secondMatches.length >= 3 ? secondMatches : chQuestions.slice(Math.ceil(chQuestions.length / 2));
      }
    }

    if (rangeMode === 'page_range') {
      const targetCh = Number(pageChapterNo) || (availableChapters[0]?.no || 1);
      const chQuestions = pool.filter(q => q.chapter_no === targetCh);
      return chQuestions.length > 0 ? chQuestions : pool;
    }

    if (rangeMode === 'custom_command' && customCommand.trim()) {
      const qLower = customCommand.toLowerCase();
      const words = qLower.split(/[\s,+/]+/).filter(w => w.length > 1);
      const matched = pool.filter(q => {
        const text = `${q.exercise || ''} ${q.question_en || ''} ${q.question_ur || ''} ${q.chapter_name_en || ''}`.toLowerCase();
        return words.some(w => text.includes(w));
      });
      if (matched.length > 0) return matched;
      return pool.filter(q => selectedChapters.includes(q.chapter_no));
    }

    // Default 'full_chapter'
    const chFiltered = pool.filter(q => selectedChapters.includes(q.chapter_no));
    return chFiltered.length > 0 ? chFiltered : pool;
  }, [questionBank, selectedClass, selectedSubject, rangeMode, halfChapterNo, halfType, pageChapterNo, customCommand, selectedChapters, availableChapters]);

  // Pool for manual picker
  const manualQuestionPool = filteredQuestionPool;

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
    // 1. Backend Scheme & Syllabus Generation Mode (Board Pattern)
    if (generationMode === 'scheme') {
      if (!currentSubjectId) {
        alert("Subject not resolved. Please select a valid class and subject.");
        return;
      }
      if (!selectedDivisionId) {
        alert("Please select a Syllabus Division (e.g. Midterm Exam). You can create one in the 'Schemes & Syllabus' tab.");
        return;
      }
      if (!selectedSchemeId) {
        alert("Please select a Paper Scheme. You can create one in the 'Schemes & Syllabus' tab.");
        return;
      }

      setGeneratingBackend(true);
      setShortageErrors(null);

      if (onGenerateBackendTest) {
        onGenerateBackendTest({
          subject_id: Number(currentSubjectId),
          syllabus_division_id: Number(selectedDivisionId),
          paper_scheme_id: Number(selectedSchemeId),
          n_recent_tests: Number(nRecentTests) || 0,
          title: testTitle,
          campus: campus,
          time_allowed: timeAllowed
        }).then(result => {
          setGeneratingBackend(false);
          if (result && result.success) {
            try {
              confetti({
                particleCount: 50,
                spread: 70,
                origin: { y: 0.7 }
              });
            } catch (e) {}
          } else if (result) {
            if (result.shortages && result.shortages.length > 0) {
              setShortageErrors(result.shortages);
            } else {
              alert(`Test Generation: ${result.message}`);
            }
          }
        }).catch(err => {
          setGeneratingBackend(false);
          alert(`Test Generation Error: ${err.message}`);
        });
      }
      return;
    }

    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch (e) {}

    const activeChapters = rangeMode === 'half_chapter' 
      ? [Number(halfChapterNo)] 
      : rangeMode === 'page_range' 
      ? [Number(pageChapterNo)] 
      : selectedChapters;

    if (generationMode === 'auto') {
      onGenerateTest({
        selectedClass,
        selectedSubject,
        selectedChapters: activeChapters,
        rangeMode,
        halfType,
        halfChapterNo,
        pageFrom,
        pageTo,
        customCommand,
        syllabus: customSyllabusLabel,
        filteredPool: filteredQuestionPool,
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
          selectedChapters: activeChapters,
          selectedQuestions: manualStats.selectedQuestions,
          syllabus: customSyllabusLabel,
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
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '6px', marginBottom: '14px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
        <button
          type="button"
          onClick={() => setGenerationMode('scheme')}
          style={{
            padding: '6px 6px',
            fontSize: '0.78rem',
            fontWeight: 700,
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: generationMode === 'scheme' ? '#1e3a8a' : 'transparent',
            color: generationMode === 'scheme' ? '#ffffff' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
          title="Board Scheme & Syllabus Division based generation"
        >
          🎯 Scheme & Terms
        </button>
        <button
          type="button"
          onClick={() => setGenerationMode('auto')}
          style={{
            padding: '6px 6px',
            fontSize: '0.78rem',
            fontWeight: 700,
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: generationMode === 'auto' ? '#1e3a8a' : 'transparent',
            color: generationMode === 'auto' ? '#ffffff' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
          title="Quick Marks Preset Generator"
        >
          ⚡ Quick Presets
        </button>
        <button
          type="button"
          onClick={() => setGenerationMode('manual')}
          style={{
            padding: '6px 6px',
            fontSize: '0.78rem',
            fontWeight: 700,
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: generationMode === 'manual' ? '#1e3a8a' : 'transparent',
            color: generationMode === 'manual' ? '#ffffff' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
          title="Handpick Questions Manually"
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
            const nextClass = e.target.value;
            setSelectedClass(nextClass);
            let nextSubs = [];
            if (backendMetadata?.classes?.length) {
              const cObj = backendMetadata.classes.find(c => c.name === nextClass);
              if (cObj?.subjects?.length) nextSubs = cObj.subjects.map(s => s.name);
            }
            if (nextSubs.length === 0) {
              nextSubs = AVAILABLE_SUBJECTS[nextClass] || [];
            }
            setSelectedSubject(nextSubs.includes("Mathematics") ? "Mathematics" : (nextSubs[0] || ""));
          }}
        >
          {dynamicClasses.map(cls => (
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
          {dynamicSubjects.map(sub => (
            <option key={sub} value={sub}>{sub}</option>
          ))}
        </select>
      </div>

      {/* 3. SCHEME & SYLLABUS DIVISION MODE */}
      {generationMode === 'scheme' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Syllabus Division Card */}
          <div className="form-group" style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ marginBottom: 0, fontWeight: 800, color: '#0f2744', fontSize: '0.88rem' }}>
                3. Syllabus Division (امتحانی نصاب و ٹرم)
              </label>
              {loadingBackendData && <Loader2 size={14} className="animate-spin text-blue-600" />}
            </div>

            {syllabusDivisions.length === 0 ? (
              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '10px', fontSize: '0.78rem', color: '#92400e' }}>
                ⚠️ No syllabus divisions found for <strong>{selectedSubject}</strong>.
                <div style={{ marginTop: '4px', fontSize: '0.74rem', color: '#78350f' }}>
                  Please go to the <strong>"Schemes & Syllabus"</strong> tab to create a term or division (e.g. Midterm, Units 1-4).
                </div>
              </div>
            ) : (
              <div>
                <select
                  className="form-select"
                  value={selectedDivisionId}
                  onChange={(e) => {
                    setSelectedDivisionId(e.target.value);
                    setShortageErrors(null);
                  }}
                  style={{ fontWeight: 600, fontSize: '0.85rem' }}
                >
                  {syllabusDivisions.map(div => (
                    <option key={div.id} value={div.id}>
                      {div.name} ({div.chapter_ids?.length || 0} Chapters)
                    </option>
                  ))}
                </select>

                {/* Selected Division Info Box */}
                {(() => {
                  const currDiv = syllabusDivisions.find(d => String(d.id) === String(selectedDivisionId));
                  if (!currDiv) return null;
                  const hasWeightages = currDiv.chapter_weightages && currDiv.chapter_weightages.some(w => (w.weightage_percent || 0) > 0);

                  return (
                    <div style={{ marginTop: '8px', padding: '8px 10px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, color: '#1e3a8a' }}>
                          Included Chapters ({currDiv.chapter_ids?.length || 0}):
                        </span>
                        <span style={{
                          padding: '1px 6px',
                          borderRadius: '10px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          background: hasWeightages ? '#dcfce7' : '#f1f5f9',
                          color: hasWeightages ? '#15803d' : '#475569'
                        }}>
                          {hasWeightages ? '⚖️ Proportional Weightage' : '⚖️ Even Distribution'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {currDiv.chapter_ids?.map(chId => {
                          const wObj = currDiv.chapter_weightages?.find(w => w.chapter_id === chId);
                          const chObj = availableChapters.find(c => c.no === chId);
                          return (
                            <span
                              key={chId}
                              style={{
                                background: '#eff6ff',
                                color: '#1e40af',
                                border: '1px solid #bfdbfe',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '0.72rem',
                                fontWeight: 600
                              }}
                            >
                              Unit {chId}{chObj ? `: ${chObj.title_en}` : ''}
                              {wObj && (wObj.weightage_percent || 0) > 0 ? ` (${wObj.weightage_percent}%)` : ''}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Paper Scheme Card */}
          <div className="form-group" style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ marginBottom: 0, fontWeight: 800, color: '#0f2744', fontSize: '0.88rem' }}>
                4. Paper Scheme (امتحانی پیپر سکیم)
              </label>
              {paperSchemes.length > 0 && (
                <span style={{ fontSize: '0.72rem', background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                  {paperSchemes.length} Scheme{paperSchemes.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {paperSchemes.length === 0 ? (
              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '10px', fontSize: '0.78rem', color: '#92400e' }}>
                ⚠️ No paper schemes found for <strong>{selectedSubject}</strong>.
                <div style={{ marginTop: '4px', fontSize: '0.74rem', color: '#78350f' }}>
                  Please go to the <strong>"Schemes & Syllabus"</strong> tab to create or upload a paper scheme.
                </div>
              </div>
            ) : (
              <div>
                <select
                  className="form-select"
                  value={selectedSchemeId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    setSelectedSchemeId(sid);
                    setShortageErrors(null);
                    const sch = paperSchemes.find(s => String(s.id) === String(sid));
                    if (sch) {
                      setTargetMarks(sch.total_marks);
                      if (sch.duration_minutes) setTimeAllowed(`${sch.duration_minutes} Mins`);
                      setTestTitle(sch.name);
                    }
                  }}
                  style={{ fontWeight: 600, fontSize: '0.85rem' }}
                >
                  {paperSchemes.map(sch => (
                    <option key={sch.id} value={sch.id}>
                      {sch.name} ({sch.total_marks} Marks, {sch.duration_minutes || 60}m)
                    </option>
                  ))}
                </select>

                {/* Selected Scheme Section Breakdown */}
                {(() => {
                  const currSch = paperSchemes.find(s => String(s.id) === String(selectedSchemeId));
                  if (!currSch || !currSch.sections?.length) return null;

                  return (
                    <div style={{ marginTop: '8px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', padding: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.74rem' }}>
                        <span style={{ fontWeight: 700, color: '#0f2744' }}>
                          Scheme Layout ({currSch.sections.length} Sections, {currSch.total_marks} Total Marks):
                        </span>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>⏱️ {currSch.duration_minutes || 60} Mins</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {currSch.sections.map((sec, idx) => {
                          const typeLabel = sec.question_type === 'mcq' ? 'MCQ' : sec.question_type === 'short' ? 'Short Q' : 'Long Q';
                          const typeBg = sec.question_type === 'mcq' ? '#e0f2fe' : sec.question_type === 'short' ? '#fef3c7' : '#f0fdf4';
                          const typeColor = sec.question_type === 'mcq' ? '#0369a1' : sec.question_type === 'short' ? '#92400e' : '#166534';
                          const secMarks = (sec.number_to_attempt || sec.number_of_questions) * sec.marks_per_question;

                          return (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '4px 6px',
                                background: '#f8fafc',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                border: '1px solid #f1f5f9'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 700, color: '#1e293b' }}>{sec.section_name}</span>
                                <span style={{ background: typeBg, color: typeColor, padding: '1px 5px', borderRadius: '3px', fontWeight: 700, fontSize: '0.65rem' }}>
                                  {typeLabel}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: '#475569' }}>
                                  Pick <strong>{sec.number_of_questions}</strong> (Attempt {sec.number_to_attempt})
                                </span>
                                <span style={{ fontWeight: 700, color: '#0f2744', background: '#e2e8f0', padding: '1px 5px', borderRadius: '3px' }}>
                                  {secMarks}M
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Difficulty Mix Indicator if set */}
                      {currSch.sections.some(s => s.difficulty_mix && Object.keys(s.difficulty_mix).length > 0) && (
                        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0', fontSize: '0.68rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, color: '#475569' }}>🎯 Difficulty Mix Configured</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Avoid Repetition Configuration (Last N Generated Tests) */}
          <div className="form-group" style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ marginBottom: 0, fontWeight: 800, color: '#0f2744', fontSize: '0.85rem' }}>
                5. Question Repetition Control (سوالات کی تازگی)
              </label>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Avoid Last N Tests</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
              <input
                type="number"
                min="0"
                max="20"
                className="form-input"
                style={{ width: '80px', textAlign: 'center', fontWeight: 700, padding: '5px' }}
                value={nRecentTests}
                onChange={(e) => setNRecentTests(Math.max(0, parseInt(e.target.value) || 0))}
              />
              <span style={{ fontSize: '0.74rem', color: '#475569', lineHeight: 1.3 }}>
                Exclude questions that appeared in the last <strong>{nRecentTests}</strong> generated tests of this subject to guarantee unique papers.
              </span>
            </div>
          </div>

          {/* Shortage Error Banner (if question bank does not have enough approved questions) */}
          {shortageErrors && shortageErrors.length > 0 && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #f87171',
              borderRadius: '8px',
              padding: '12px',
              color: '#991b1b'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '0.82rem', marginBottom: '6px' }}>
                <AlertTriangle size={18} color="#dc2626" />
                <span>Question Bank Shortage Detected!</span>
              </div>
              <p style={{ fontSize: '0.74rem', marginBottom: '8px', color: '#b91c1c' }}>
                Cannot generate test paper without crashing. The following sections/chapters are short of approved questions:
              </p>
              <div style={{ background: '#ffffff', borderRadius: '6px', border: '1px solid #fecaca', overflow: 'hidden' }}>
                <table style={{ width: '100%', fontSize: '0.72rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fee2e2', color: '#7f1d1d', textAlign: 'left' }}>
                      <th style={{ padding: '5px 8px' }}>Section</th>
                      <th style={{ padding: '5px 8px' }}>Chapter</th>
                      <th style={{ padding: '5px 8px', textAlign: 'center' }}>Required</th>
                      <th style={{ padding: '5px 8px', textAlign: 'center' }}>Available</th>
                      <th style={{ padding: '5px 8px', textAlign: 'right' }}>Short By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shortageErrors.map((err, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #fee2e2' }}>
                        <td style={{ padding: '5px 8px', fontWeight: 600 }}>{err.section_name}</td>
                        <td style={{ padding: '5px 8px' }}>Unit {err.chapter_number}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'center' }}>{err.required_count}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>{err.available_count}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', color: '#dc2626', fontWeight: 800 }}>-{err.shortage_count} Qs</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#7f1d1d', marginTop: '8px' }}>
                💡 <strong>Action Required:</strong> Visit the <strong>"Review Questions"</strong> tab to approve draft questions for the short chapters, or upload more pages.
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Syllabus & Chapter Scope Selection (Full Chapter, Half Chapter, Page Range, Teacher Command) */}
      {generationMode !== 'scheme' && (
      <div className="form-group" style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label className="form-label" style={{ marginBottom: 0, fontWeight: 800, color: '#0f2744', fontSize: '0.88rem' }}>
            3. Syllabus Scope (نصاب و دائرہ کار کا انتخاب)
          </label>
          <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
            {filteredQuestionPool.length} Qs Available
          </span>
        </div>

        {/* Range Mode Switcher Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '10px', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => setRangeMode('half_chapter')}
            style={{
              padding: '5px 4px',
              fontSize: '0.72rem',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: rangeMode === 'half_chapter' ? '#1e3a8a' : 'transparent',
              color: rangeMode === 'half_chapter' ? '#ffffff' : '#475569',
              textAlign: 'center'
            }}
            title="Half Chapter (1st Half or 2nd Half)"
          >
            🌓 Half Ch
          </button>

          <button
            type="button"
            onClick={() => setRangeMode('page_range')}
            style={{
              padding: '5px 4px',
              fontSize: '0.72rem',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: rangeMode === 'page_range' ? '#1e3a8a' : 'transparent',
              color: rangeMode === 'page_range' ? '#ffffff' : '#475569',
              textAlign: 'center'
            }}
            title="Page Range (From Page to Page)"
          >
            📖 Page Range
          </button>

          <button
            type="button"
            onClick={() => setRangeMode('full_chapter')}
            style={{
              padding: '5px 4px',
              fontSize: '0.72rem',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: rangeMode === 'full_chapter' ? '#1e3a8a' : 'transparent',
              color: rangeMode === 'full_chapter' ? '#ffffff' : '#475569',
              textAlign: 'center'
            }}
            title="Complete Chapter or Multiple Chapters"
          >
            📑 Full Ch
          </button>

          <button
            type="button"
            onClick={() => setRangeMode('custom_command')}
            style={{
              padding: '5px 4px',
              fontSize: '0.72rem',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: rangeMode === 'custom_command' ? '#1e3a8a' : 'transparent',
              color: rangeMode === 'custom_command' ? '#ffffff' : '#475569',
              textAlign: 'center'
            }}
            title="Custom Teacher Command / Prompt"
          >
            ✍️ Custom
          </button>
        </div>

        {/* SUBPANEL 1: HALF CHAPTER MODE */}
        {rangeMode === 'half_chapter' && (
          <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                Select Chapter (سبق منتخب کریں):
              </label>
              <select
                className="form-select"
                style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                value={halfChapterNo}
                onChange={(e) => setHalfChapterNo(Number(e.target.value))}
              >
                {availableChapters.map(ch => (
                  <option key={ch.no} value={ch.no}>Unit {ch.no}: {ch.title_en}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setHalfType('first_half')}
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  border: halfType === 'first_half' ? '2px solid #1e3a8a' : '1px solid #cbd5e1',
                  background: halfType === 'first_half' ? '#eff6ff' : '#f8fafc',
                  color: halfType === 'first_half' ? '#1e3a8a' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontWeight: 800 }}>🔵 1st Half (پہلا نصف)</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                  Ex {halfChapterNo}.1 to {halfChapterNo}.3 + Definitions
                </div>
              </button>

              <button
                type="button"
                onClick={() => setHalfType('second_half')}
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  border: halfType === 'second_half' ? '2px solid #1e3a8a' : '1px solid #cbd5e1',
                  background: halfType === 'second_half' ? '#eff6ff' : '#f8fafc',
                  color: halfType === 'second_half' ? '#1e3a8a' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontWeight: 800 }}>🟣 2nd Half (دوسرا نصف)</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                  Ex {halfChapterNo}.4 onwards + Review Exercise
                </div>
              </button>
            </div>
          </div>
        )}

        {/* SUBPANEL 2: PAGE RANGE MODE */}
        {rangeMode === 'page_range' && (
          <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                Select Book Unit (سبق منتخب کریں):
              </label>
              <select
                className="form-select"
                style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                value={pageChapterNo}
                onChange={(e) => setPageChapterNo(Number(e.target.value))}
              >
                {availableChapters.map(ch => (
                  <option key={ch.no} value={ch.no}>Unit {ch.no}: {ch.title_en}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>From Page (شروع):</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '4px 8px', fontSize: '0.82rem', marginTop: '2px' }}
                  placeholder="e.g. 15"
                  value={pageFrom}
                  onChange={(e) => setPageFrom(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>To Page (آخری صفحہ):</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '4px 8px', fontSize: '0.82rem', marginTop: '2px' }}
                  placeholder="e.g. 32"
                  value={pageTo}
                  onChange={(e) => setPageTo(e.target.value)}
                />
              </div>
            </div>

            {/* Quick Page Range presets */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', alignSelf: 'center' }}>Presets:</span>
              {[
                { from: '1', to: '15' },
                { from: '16', to: '30' },
                { from: '31', to: '45' }
              ].map(p => (
                <button
                  key={p.from}
                  type="button"
                  onClick={() => { setPageFrom(p.from); setPageTo(p.to); }}
                  style={{ fontSize: '0.66rem', padding: '2px 6px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Pg {p.from}-{p.to}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SUBPANEL 3: FULL CHAPTER(S) MODE */}
        {rangeMode === 'full_chapter' && (
          <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>Pick Chapters (ایک یا زیادہ):</span>
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

            <div className="chapters-box" style={{ maxHeight: '135px' }}>
              {availableChapters.length === 0 ? (
                <div style={{ padding: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                  No chapters loaded for this subject.
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
        )}

        {/* SUBPANEL 4: CUSTOM TEACHER COMMAND / PROMPT MODE */}
        {rangeMode === 'custom_command' && (
          <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
              Teacher's Command (استاد اپنی مرضی سے رینج یا مشقیں لکھیں):
            </label>
            <textarea
              className="form-input"
              rows={2}
              style={{ width: '100%', fontSize: '0.8rem', padding: '6px 8px', resize: 'vertical' }}
              placeholder="مثال: Unit 1 Ex 1.2 and Ex 1.4 only, Definitions and MCQs, یا Cramer's Rule..."
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
            />

            {/* Quick Command Chips */}
            <div style={{ marginTop: '6px' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', marginBottom: '3px' }}>Quick Presets / فوری منتخب کریں:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {[
                  "Definitions Only (صرف تعریفات)",
                  "Review Exercise MCQs",
                  "Ex 1.1 to 1.3",
                  "Ex 1.4 to 1.6",
                  "Cramer's Rule & Inversion",
                  "Board Theorems (اہم مسئلے)"
                ].map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setCustomCommand(chip)}
                    style={{
                      fontSize: '0.66rem',
                      padding: '2px 6px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: '#1e293b'
                    }}
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Database Syllabus Divisions */}
        {backendMetadata?.syllabus_divisions?.length > 0 && (
          <div style={{ marginTop: '8px', marginBottom: '4px' }}>
            <div style={{ fontSize: '0.68rem', color: '#475569', marginBottom: '3px', fontWeight: 700 }}>
              Syllabus Divisions (امتحانی دورانیہ):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {backendMetadata.syllabus_divisions.map(div => (
                <button
                  key={div.id}
                  type="button"
                  onClick={() => {
                    if (div.chapter_ids && div.chapter_ids.length > 0) {
                      setSelectedChapters(div.chapter_ids);
                    }
                    setCustomSyllabusLabel(div.name);
                  }}
                  style={{
                    fontSize: '0.68rem',
                    padding: '3px 7px',
                    borderRadius: '4px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                    color: '#0f2744',
                    fontWeight: 600
                  }}
                  title={div.description || div.name}
                >
                  📌 {div.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* UNIVERSAL TEST SYLLABUS EDITABLE PREVIEW (Printed on Student Paper) */}
        <div style={{ marginTop: '8px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase' }}>
              📝 Paper Syllabus (پیپر پر پرنٹ ہونے والا نصاب):
            </span>
            <span style={{ fontSize: '0.66rem', color: '#0369a1', fontWeight: 600 }}>Editable / تبدیل کریں</span>
          </div>
          <input
            type="text"
            className="form-input"
            value={customSyllabusLabel}
            onChange={(e) => setCustomSyllabusLabel(e.target.value)}
            placeholder="e.g. Unit 1 (1st Half: Ex 1.1 to 1.3)"
            style={{ fontSize: '0.82rem', fontWeight: 700, padding: '4px 8px', color: '#0f172a', background: '#ffffff', width: '100%' }}
          />
        </div>
      </div>
      )}

      {/* AUTO MODE SETTINGS */}
      {generationMode === 'auto' && (
        <>
          {/* Preset Marks */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ marginBottom: '4px' }}>4. Total Marks Target</label>
            </div>

            {/* Standard Board Schemes from Database */}
            {backendMetadata?.schemes?.length > 0 && (
              <div style={{ marginBottom: '6px' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748b', marginBottom: '3px', fontWeight: 700 }}>
                  Board Paper Schemes:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {backendMetadata.schemes.map(sch => (
                    <button
                      key={sch.id}
                      type="button"
                      onClick={() => {
                        handlePresetMarks(sch.total_marks);
                        if (sch.duration_minutes) {
                          setTimeAllowed(`${sch.duration_minutes} Mins`);
                        }
                        setTestTitle(sch.name);
                      }}
                      style={{
                        fontSize: '0.7rem',
                        padding: '3px 7px',
                        borderRadius: '4px',
                        background: targetMarks === sch.total_marks ? '#dbeafe' : '#f8fafc',
                        border: targetMarks === sch.total_marks ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                        cursor: 'pointer',
                        color: targetMarks === sch.total_marks ? '#1d4ed8' : '#334155',
                        fontWeight: 700
                      }}
                      title={`${sch.name} (${sch.total_marks} Marks, ${sch.duration_minutes}m)`}
                    >
                      📋 {sch.name} ({sch.total_marks}M)
                    </button>
                  ))}
                </div>
              </div>
            )}

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
        <label className="form-label">{generationMode === 'manual' ? '5. Test Details' : '6. Test Details'}</label>
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Test Paper Title</span>
          <input
            type="text"
            className="form-input"
            value={testTitle}
            onChange={(e) => setTestTitle(e.target.value)}
            placeholder="e.g. Midterm Examination 2026"
            style={{ fontWeight: 600, fontSize: '0.82rem', marginTop: '2px' }}
          />
        </div>
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
        style={{ width: '100%', marginTop: '0.5rem', padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        onClick={handleGenerateClick}
        disabled={generatingBackend || (generationMode === 'scheme' && (!selectedDivisionId || !selectedSchemeId))}
      >
        {generatingBackend ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Generating Test Paper...
          </>
        ) : (
          <>
            <Sparkles size={18} /> {
              generationMode === 'scheme'
                ? `Generate Test Paper (${targetMarks || 0} Marks)`
                : generationMode === 'auto'
                ? 'Generate Test Paper'
                : `Build Paper with ${manualSelectedIds.length} Selected`
            }
          </>
        )}
      </button>
    </div>
  );
}
