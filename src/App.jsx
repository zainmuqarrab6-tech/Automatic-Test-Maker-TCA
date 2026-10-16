import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Columns, 
  ShieldCheck, 
  CheckCircle, 
  FileDown, 
  Database,
  Sparkles
} from 'lucide-react';
import { INITIAL_QUESTION_BANK } from './data/questionBank';
import TestGeneratorWizard from './components/TestGeneratorWizard';
import LiveTestPaper from './components/LiveTestPaper';
import { exportTestPaperToWord } from './utils/exportToWord';

export default function App() {
  // Central Question Bank in memory (Loaded live from MySQL)
  const [questionBank, setQuestionBank] = useState(INITIAL_QUESTION_BANK);

  // Clear residual storage on startup
  useEffect(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
  }, []);

  // Database Connection Status
  const [dbStatus, setDbStatus] = useState('checking'); // 'connected' | 'cached'
  const [dbMessage, setDbMessage] = useState('Connecting to MySQL...');

  // Fetch Questions from MySQL Database on mount
  useEffect(() => {
    async function loadDatabase() {
      try {
        let res = null;
        // 1. Hostinger Node.js endpoint /api/questions
        try {
          res = await fetch('/api/questions', { cache: 'no-store' });
        } catch (e) {}

        // 2. Fallback to PHP API on Apache/LiteSpeed
        if (!res || !res.ok) {
          try {
            res = await fetch('/api.php?action=get_questions', { cache: 'no-store' });
          } catch (e) {}
        }

        // 3. Fallback to local dev port
        if (!res || !res.ok) {
          try {
            res = await fetch('http://localhost:5000/api/questions');
          } catch (e) {}
        }

        if (res && res.ok) {
          const result = await res.json();
          const serverQuestions = result.data || result;
          if (Array.isArray(serverQuestions)) {
            setQuestionBank(serverQuestions);
            setDbStatus('connected');
            setDbMessage(`MySQL Live (${serverQuestions.length} Questions)`);
            return;
          }
        }
      } catch (err) {}
      setDbStatus('cached');
      setDbMessage('MySQL Live (0 Questions)');
    }

    loadDatabase();
  }, []);

  // Class & Subject State
  const [selectedClass, setSelectedClass] = useState('9th');
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');

  // Paper Display & Printing Controls
  const [twoColumnMode, setTwoColumnMode] = useState(false);
  const [showWatermark, setShowWatermark] = useState(true);
  const [languageMode, setLanguageMode] = useState('bilingual'); // 'bilingual' | 'en' | 'ur'
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  // Active Generated Paper State
  const [paperData, setPaperData] = useState(null);

  // Auto Generate Test Paper (Standard Board Scheme)
  const generateTestPaper = (config) => {
    const {
      selectedClass: cls,
      selectedSubject: subj,
      selectedChapters,
      mcqCount,
      shortCount,
      longCount,
      targetMarks,
      timeAllowed,
      testTitle,
      campus
    } = config;

    let pool = questionBank.filter(
      q => q.class === cls && 
           q.subject === subj && 
           selectedChapters.includes(q.chapter_no)
    );

    // Fallback if pool is empty
    if (pool.length === 0) {
      pool = questionBank.filter(q => q.class === cls && q.subject === subj);
    }
    if (pool.length === 0) {
      pool = questionBank.filter(q => q.class === cls);
    }
    if (pool.length === 0) {
      pool = questionBank;
    }

    const availableMcqs = pool.filter(q => q.type === 'mcq');
    const availableShorts = pool.filter(q => q.type === 'short_question');
    const availableLongs = pool.filter(q => q.type === 'long_question');

    const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

    let chosenMcqs = shuffle(availableMcqs).slice(0, mcqCount);
    let chosenShorts = shuffle(availableShorts).slice(0, shortCount);
    let chosenLongs = shuffle(availableLongs).slice(0, longCount);

    // Replenishment if chapter has fewer questions than requested
    const subjectPool = questionBank.filter(q => q.class === cls && q.subject === subj);
    const fallbackPool = subjectPool.length > 0 ? subjectPool : questionBank;

    if (chosenMcqs.length < mcqCount) {
      const extra = shuffle(fallbackPool.filter(q => q.type === 'mcq' && !chosenMcqs.some(c => c.id === q.id)));
      chosenMcqs = [...chosenMcqs, ...extra.slice(0, mcqCount - chosenMcqs.length)];
    }

    if (chosenShorts.length < shortCount) {
      const extra = shuffle(fallbackPool.filter(q => q.type === 'short_question' && !chosenShorts.some(c => c.id === q.id)));
      chosenShorts = [...chosenShorts, ...extra.slice(0, shortCount - chosenShorts.length)];
    }

    if (chosenLongs.length < longCount) {
      const extra = shuffle(fallbackPool.filter(q => q.type === 'long_question' && !chosenLongs.some(c => c.id === q.id)));
      chosenLongs = [...chosenLongs, ...extra.slice(0, longCount - chosenLongs.length)];
    }

    const mcqMarks = chosenMcqs.length * 1;
    let shortAttempt = chosenShorts.length;
    if (chosenShorts.length >= 8) shortAttempt = chosenShorts.length - 2;
    else if (chosenShorts.length === 7) shortAttempt = 6;
    else if (chosenShorts.length === 5) shortAttempt = 4;
    else if (chosenShorts.length > 3) shortAttempt = chosenShorts.length - 1;

    const shortMarks = shortAttempt * 2;
    
    let longMarks = 0;
    if (targetMarks === 25 && chosenLongs.length >= 2) {
      longMarks = 8;
    } else if (targetMarks === 50 && chosenLongs.length >= 4) {
      longMarks = 16;
    } else if (targetMarks === 75 && chosenLongs.length >= 6) {
      longMarks = 24;
    } else {
      longMarks = chosenLongs.reduce((sum, q) => sum + (q.marks || 4), 0);
    }

    const calculatedTotal = targetMarks || (mcqMarks + shortMarks + longMarks);

    setPaperData({
      testTitle,
      campus,
      className: cls,
      subject: subj,
      selectedChapters,
      date: new Date().toISOString().split('T')[0],
      timeAllowed,
      targetMarks: targetMarks || calculatedTotal,
      totalMarks: calculatedTotal,
      mcqs: chosenMcqs,
      shortQuestions: chosenShorts,
      longQuestions: chosenLongs
    });
  };

  // Manual Generate Test Paper (Teacher Handpicked)
  const generateManualTestPaper = (config) => {
    const {
      selectedClass: cls,
      selectedSubject: subj,
      selectedChapters,
      selectedQuestions,
      timeAllowed,
      testTitle,
      campus
    } = config;

    const chosenMcqs = selectedQuestions.filter(q => q.type === 'mcq');
    const chosenShorts = selectedQuestions.filter(q => q.type === 'short_question');
    const chosenLongs = selectedQuestions.filter(q => q.type === 'long_question');

    const mcqMarks = chosenMcqs.length * 1;
    let shortAttempt = chosenShorts.length;
    if (chosenShorts.length >= 8) shortAttempt = chosenShorts.length - 2;
    else if (chosenShorts.length === 7) shortAttempt = 6;
    else if (chosenShorts.length === 5) shortAttempt = 4;
    else if (chosenShorts.length > 3) shortAttempt = chosenShorts.length - 1;

    const shortMarks = shortAttempt * 2;
    const longMarks = chosenLongs.reduce((sum, q) => sum + (q.marks || 4), 0);
    const calculatedTotal = mcqMarks + shortMarks + longMarks;

    setPaperData({
      testTitle,
      campus,
      className: cls,
      subject: subj,
      selectedChapters,
      date: new Date().toISOString().split('T')[0],
      timeAllowed,
      targetMarks: calculatedTotal,
      totalMarks: calculatedTotal,
      mcqs: chosenMcqs,
      shortQuestions: chosenShorts,
      longQuestions: chosenLongs
    });
  };

  // Swap question on paper with another from bank
  const handleSwapQuestion = (type, index, currentQuestion) => {
    if (!paperData) return;

    const pool = questionBank.filter(
      q => q.class === paperData.className &&
           q.subject === paperData.subject &&
           (type === 'mcq' ? q.type === 'mcq' : type === 'short' ? q.type === 'short_question' : q.type === 'long_question')
    );

    const currentList = type === 'mcq' ? paperData.mcqs : type === 'short' ? paperData.shortQuestions : paperData.longQuestions;
    const currentIds = new Set(currentList.map(q => q.id));

    let candidates = pool.filter(q => !currentIds.has(q.id) && q.chapter_no === currentQuestion?.chapter_no);
    if (candidates.length === 0) {
      candidates = pool.filter(q => !currentIds.has(q.id));
    }

    if (candidates.length === 0) {
      alert("No additional questions available in this pool to swap with.");
      return;
    }

    const replacement = candidates[Math.floor(Math.random() * candidates.length)];
    const updatedList = [...currentList];
    updatedList[index] = replacement;

    if (type === 'mcq') {
      setPaperData({ ...paperData, mcqs: updatedList });
    } else if (type === 'short') {
      setPaperData({ ...paperData, shortQuestions: updatedList });
    } else {
      setPaperData({ ...paperData, longQuestions: updatedList });
    }
  };

  // Delete question from paper
  const handleDeleteQuestion = (type, index) => {
    if (!paperData) return;
    if (type === 'mcq') {
      const updated = paperData.mcqs.filter((_, i) => i !== index);
      setPaperData({ ...paperData, mcqs: updated });
    } else if (type === 'short') {
      const updated = paperData.shortQuestions.filter((_, i) => i !== index);
      setPaperData({ ...paperData, shortQuestions: updated });
    } else {
      const updated = paperData.longQuestions.filter((_, i) => i !== index);
      setPaperData({ ...paperData, longQuestions: updated });
    }
  };

  // Inline edit question on paper
  const handleEditQuestion = (type, index, updatedQuestion) => {
    if (!paperData) return;
    const currentList = type === 'mcq' ? paperData.mcqs : type === 'short' ? paperData.shortQuestions : paperData.longQuestions;
    const updated = [...currentList];
    updated[index] = { ...updated[index], ...updatedQuestion };

    if (type === 'mcq') setPaperData({ ...paperData, mcqs: updated });
    else if (type === 'short') setPaperData({ ...paperData, shortQuestions: updated });
    else setPaperData({ ...paperData, longQuestions: updated });
  };

  // Add custom question directly to paper
  const handleAddQuestionToSection = (type) => {
    if (!paperData) return;
    const newQ = {
      id: `custom-paper-${Date.now()}`,
      class: paperData.className,
      subject: paperData.subject,
      chapter_no: paperData.selectedChapters[0] || 1,
      type: type === 'mcq' ? 'mcq' : type === 'short' ? 'short_question' : 'long_question',
      marks: type === 'mcq' ? 1 : type === 'short' ? 2 : 4,
      question_en: type === 'mcq' ? 'Click to edit MCQ text...' : 'Click to edit short question in English...',
      question_ur: 'سوال کا اردو متن تبدیل کریں...',
      options: type === 'mcq' ? [{ text: 'Option A' }, { text: 'Option B' }, { text: 'Option C' }, { text: 'Option D' }] : null,
      correct_option_index: 0
    };

    if (type === 'mcq') setPaperData({ ...paperData, mcqs: [...paperData.mcqs, newQ] });
    else if (type === 'short') setPaperData({ ...paperData, shortQuestions: [...paperData.shortQuestions, newQ] });
    else setPaperData({ ...paperData, longQuestions: [...paperData.longQuestions, newQ] });
  };

  // Update paper metadata
  const handleUpdatePaperMeta = (field, value) => {
    if (!paperData) return;
    setPaperData({ ...paperData, [field]: value });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = () => {
    if (paperData) {
      exportTestPaperToWord(paperData, { languageMode, showWatermark });
    }
  };

  return (
    <div className="app-container">
      {/* Top Application Bar */}
      <header className="top-navbar no-print">
        <div className="brand-wrapper">
          <img src="/images/logo.png" alt="The Century Academy" className="top-brand-logo-img" />
          <div className="brand-text">
            <h1>The Century Academy</h1>
            <div className="brand-tagline">Science • Commerce • Arts | Sargodha Road, Faisalabad</div>
          </div>
        </div>

        {/* Database Status Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 700,
            background: dbStatus === 'connected' ? '#dcfce7' : '#fef3c7',
            color: dbStatus === 'connected' ? '#166534' : '#92400e',
            border: dbStatus === 'connected' ? '1px solid #86efac' : '1px solid #fde68a'
          }}
          title="Live Hostinger MySQL Database Connection"
        >
          <span 
            style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: dbStatus === 'connected' ? '#22c55e' : '#f59e0b',
              boxShadow: dbStatus === 'connected' ? '0 0 6px #22c55e' : 'none'
            }} 
          />
          <Database size={13} />
          {dbMessage}
        </div>

        {/* Global Action Bar */}
        <div className="nav-actions" style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleExportWord}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#0c2340',
              color: '#ffffff',
              border: '1px solid #1e3a8a',
              borderRadius: '6px',
              padding: '7px 14px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Download editable Microsoft Word document (.doc)"
          >
            <FileDown size={15} color="#38bdf8" /> Export to Word (.doc)
          </button>

          <button className="btn-primary" onClick={handlePrint} title="Print or Save PDF">
            <Printer size={16} /> Print / Save PDF
          </button>
        </div>
      </header>

      {/* Main Content: Focused Test Generator Split-View */}
      <main className="main-content">
        <div className="generator-split-view">
          {/* Left Sidebar: Generator Wizard */}
          <div className="no-print">
            <TestGeneratorWizard
              questionBank={questionBank}
              onGenerateTest={generateTestPaper}
              onGenerateManualTest={generateManualTestPaper}
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              selectedSubject={selectedSubject}
              setSelectedSubject={setSelectedSubject}
            />
          </div>

          {/* Right Area: Toolbar + Live Test Paper Sheet */}
          <div className="preview-area-wrapper">
            <div className="paper-controls-bar no-print">
              <div className="controls-group">
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Paper Layout:
                </span>
                <button
                  className={`toolbar-toggle-btn ${twoColumnMode ? 'active' : ''}`}
                  onClick={() => setTwoColumnMode(!twoColumnMode)}
                  title="Paper Saving 2-Column Mode fits full test on 1 page"
                >
                  <Columns size={15} /> 2-Column (Paper Saver)
                </button>
                <button
                  className={`toolbar-toggle-btn ${showWatermark ? 'active' : ''}`}
                  onClick={() => setShowWatermark(!showWatermark)}
                >
                  <ShieldCheck size={15} /> TCA Watermark
                </button>
              </div>

              <div className="controls-group">
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Language:
                </span>
                <select
                  className="form-select"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem', width: 'auto' }}
                  value={languageMode}
                  onChange={(e) => setLanguageMode(e.target.value)}
                >
                  <option value="bilingual">Bilingual (English + اردو)</option>
                  <option value="en">English Only</option>
                  <option value="ur">Urdu Only (اردو)</option>
                </select>

                <button
                  className={`toolbar-toggle-btn ${showAnswerKey ? 'active' : ''}`}
                  onClick={() => setShowAnswerKey(!showAnswerKey)}
                  title="Toggle Solution & Marking Scheme"
                >
                  <CheckCircle size={15} /> Answer Key
                </button>
              </div>
            </div>

            {/* Physical Test Paper Preview & Teacher Customization */}
            <LiveTestPaper
              paperData={paperData}
              twoColumnMode={twoColumnMode}
              showWatermark={showWatermark}
              languageMode={languageMode}
              showAnswerKey={showAnswerKey}
              onSwapQuestion={handleSwapQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              onEditQuestion={handleEditQuestion}
              onAddQuestionToSection={handleAddQuestionToSection}
              onUpdateMeta={handleUpdatePaperMeta}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
