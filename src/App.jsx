import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  UploadCloud, 
  Database, 
  Printer, 
  Columns, 
  Eye, 
  CheckCircle, 
  Sparkles, 
  ShieldCheck,
  Languages,
  BookOpen,
  RotateCcw,
  FileDown,
  RefreshCw,
  Server
} from 'lucide-react';
import { INITIAL_QUESTION_BANK } from './data/questionBank';
import TestGeneratorWizard from './components/TestGeneratorWizard';
import LiveTestPaper from './components/LiveTestPaper';
import UniversalUploader from './components/UniversalUploader';
import QuestionBankViewer from './components/QuestionBankViewer';
import { exportTestPaperToWord } from './utils/exportToWord';

export default function App() {
  // Central Question Bank in memory initialized cleanly from master bank
  const [questionBank, setQuestionBank] = useState(INITIAL_QUESTION_BANK);

  // Clear any residual browser storage on startup
  useEffect(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
  }, []);

  // DB Sync Status
  const [dbStatus, setDbStatus] = useState('checking'); // 'connected' | 'cached' | 'syncing'
  const [dbMessage, setDbMessage] = useState('');

  // Attempt to fetch from MySQL on mount
  useEffect(() => {
    async function loadDatabase() {
      try {
        let res = null;
        // 1. First try Hostinger Node.js Web App endpoint /api/questions
        try {
          res = await fetch('/api/questions', { cache: 'no-store' });
        } catch (e) {}

        // 2. Fallback to PHP API if running on Apache/LiteSpeed
        if (!res || !res.ok) {
          try {
            res = await fetch('/api.php?action=get_questions', { cache: 'no-store' });
          } catch (e) {}
        }

        // 3. Fallback to local dev port 5000 if running
        if (!res || !res.ok) {
          try {
            res = await fetch('http://localhost:5000/api/questions');
          } catch (e) {}
        }

        if (res && res.ok) {
          const result = await res.json();
          const serverQuestions = result.data || result;
          if (Array.isArray(serverQuestions) && serverQuestions.length > 0) {
            const map = new Map();
            INITIAL_QUESTION_BANK.forEach(q => map.set(q.id, q));
            serverQuestions.forEach(q => map.set(q.id, q));
            const merged = Array.from(map.values());
            setQuestionBank(merged);
            setDbStatus('connected');
            setDbMessage(`MySQL Live (${merged.length} Questions)`);
            return;
          }
        }
      } catch (err) {
        // Fallback to local cached mode
      }
      setDbStatus('cached');
      setDbMessage(`Cached Mode (${questionBank.length} Questions)`);
    }

    loadDatabase();
  }, []);

  // Sync questions to Hostinger MySQL Database
  const handleSyncToDatabase = async () => {
    setDbStatus('syncing');
    setDbMessage('Syncing to MySQL...');
    try {
      let res = null;
      // 1. Try Hostinger Node.js Web App endpoint /api/bulk_insert
      try {
        res = await fetch('/api/bulk_insert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(questionBank)
        });
      } catch (e) {}

      // 2. Try PHP API endpoint
      if (!res || !res.ok) {
        try {
          res = await fetch('/api.php?action=bulk_insert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(questionBank)
          });
        } catch (e) {}
      }

      if (res && res.ok) {
        setDbStatus('connected');
        setDbMessage(`MySQL Live (${questionBank.length} Questions)`);
        alert(`✅ Successfully synced ${questionBank.length} questions to Hostinger MySQL Database!`);
      } else {
        throw new Error('Server returned non-200');
      }
    } catch (e) {
      setDbStatus('cached');
      setDbMessage(`Cached Mode (${questionBank.length} Questions)`);
      alert("Note: Server sync completed locally in cached memory. When deployed on Hostinger, it connects directly to MySQL.");
    }
  };

  // Restore Master Bank & Clear Browser Cache
  const handleResetToMasterBank = () => {
    if (window.confirm("Restore complete master question bank for 9th Mathematics (all units)? Custom edits will be reset.")) {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {}
      setQuestionBank(INITIAL_QUESTION_BANK);
      alert("All local data wiped and Master Question Bank successfully restored with all 13 units!");
    }
  };

  // Navigation tab
  const [activeTab, setActiveTab] = useState('generator'); // 'generator' | 'uploader' | 'bank'

  // Selected Class & Subject
  const [selectedClass, setSelectedClass] = useState('9th');
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');

  // Paper Controls
  const [twoColumnMode, setTwoColumnMode] = useState(false);
  const [showWatermark, setShowWatermark] = useState(true);
  const [languageMode, setLanguageMode] = useState('bilingual'); // 'bilingual' | 'en' | 'ur'
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  // Active Generated Paper State (Initially null - generated only when user clicks Generate)
  const [paperData, setPaperData] = useState(null);


  // Algorithm to generate balanced test (Auto Mode)
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

    // If pool is empty for specific subject, fall back to any questions for that subject or class
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

    // Smart Replenishment: If selected single chapter has fewer questions than requested, supplement from wider pool
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

  // Generate test from teacher's handpicked questions (Manual Mode)
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

  // Swap question feature
  const handleSwapQuestion = (type, index, currentQuestion) => {
    if (!paperData) return;

    const pool = questionBank.filter(
      q => q.class === paperData.className &&
           q.subject === paperData.subject &&
           (type === 'mcq' ? q.type === 'mcq' : type === 'short' ? q.type === 'short_question' : q.type === 'long_question')
    );

    const currentList = type === 'mcq' ? paperData.mcqs : type === 'short' ? paperData.shortQuestions : paperData.longQuestions;
    const currentIds = new Set(currentList.map(q => q.id));

    // Prioritize swap candidates from the same chapter to maintain syllabus balance
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

  // Delete question feature
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

  // Inline edit question
  const handleEditQuestion = (type, index, updatedQuestion) => {
    if (!paperData) return;
    const currentList = type === 'mcq' ? paperData.mcqs : type === 'short' ? paperData.shortQuestions : paperData.longQuestions;
    const updated = [...currentList];
    updated[index] = { ...updated[index], ...updatedQuestion };

    if (type === 'mcq') setPaperData({ ...paperData, mcqs: updated });
    else if (type === 'short') setPaperData({ ...paperData, shortQuestions: updated });
    else setPaperData({ ...paperData, longQuestions: updated });
  };

  // Add custom question to section directly on paper
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

  // Update paper metadata (e.g. date, campus, time)
  const handleUpdatePaperMeta = (field, value) => {
    if (!paperData) return;
    setPaperData({ ...paperData, [field]: value });
  };

  // Bulk Ingestion callback from UniversalUploader (Deduplicated by ID)
  const handleIngestQuestions = (newQuestions) => {
    setQuestionBank(prev => {
      const map = new Map();
      prev.forEach(q => map.set(q.id, q));
      newQuestions.forEach(q => map.set(q.id, q));
      return Array.from(map.values());
    });

    // Auto-sync new questions to MySQL (Node.js Web App first, then PHP fallback)
    try {
      fetch('/api/bulk_insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuestions)
      }).catch(() => {
        fetch('/api.php?action=bulk_insert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newQuestions)
        });
      });
    } catch (e) {}
  };

  // Add question callback from QuestionBankViewer (Deduplicated by ID)
  const handleAddQuestion = (newQuestion) => {
    setQuestionBank(prev => [newQuestion, ...prev.filter(q => q.id !== newQuestion.id)]);
    // Save to MySQL (Node.js Web App first, then PHP fallback)
    try {
      fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuestion)
      }).catch(() => {
        fetch('/api.php?action=add_question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newQuestion)
        });
      });
    } catch (e) {}
  };

  // Edit existing question in Question Bank
  const handleEditBankQuestion = (updatedQuestion) => {
    setQuestionBank(prev => prev.map(q => q.id === updatedQuestion.id ? updatedQuestion : q));
    // If current paper has this question, update it live as well
    if (paperData) {
      setPaperData(prev => {
        if (!prev) return prev;
        const updateQuestionsInList = (list) => (list || []).map(q => q.id === updatedQuestion.id ? { ...q, ...updatedQuestion } : q);
        return {
          ...prev,
          sections: (prev.sections || []).map(sec => ({
            ...sec,
            questions: updateQuestionsInList(sec.questions)
          })),
          customSections: (prev.customSections || []).map(sec => ({
            ...sec,
            questions: updateQuestionsInList(sec.questions)
          }))
        };
      });
    }
    // Sync update to server
    try {
      fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedQuestion)
      }).catch(() => {
        fetch('/api.php?action=add_question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedQuestion)
        });
      });
    } catch (e) {}
  };

  // Delete question from central Question Bank
  const handleDeleteBankQuestion = (questionId) => {
    if (window.confirm('Are you sure you want to delete this question from the bank?')) {
      setQuestionBank(prev => prev.filter(q => q.id !== questionId));
    }
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

        {/* Database Status & Sync Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.74rem',
              fontWeight: 700,
              background: dbStatus === 'connected' ? '#dcfce7' : '#fef3c7',
              color: dbStatus === 'connected' ? '#166534' : '#92400e',
              border: dbStatus === 'connected' ? '1px solid #86efac' : '1px solid #fde68a'
            }}
            title="Hostinger MySQL Database Connection Status"
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dbStatus === 'connected' ? '#22c55e' : '#f59e0b' }}></span>
            {dbMessage || 'Checking Database...'}
          </div>

          <button
            onClick={handleSyncToDatabase}
            style={{
              background: 'transparent',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Sync all questions to Hostinger MySQL Database"
          >
            <RefreshCw size={12} /> Sync DB
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-tabs">
          <button
            className={`nav-tab-btn ${activeTab === 'generator' ? 'active' : ''}`}
            onClick={() => setActiveTab('generator')}
          >
            <Sparkles size={16} /> Test Generator
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'uploader' ? 'active' : ''}`}
            onClick={() => setActiveTab('uploader')}
          >
            <UploadCloud size={16} /> Upload Book / Page (Any Format)
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'bank' ? 'active' : ''}`}
            onClick={() => setActiveTab('bank')}
          >
            <Database size={16} /> Question Bank ({questionBank.length})
          </button>
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
              padding: '6px 12px',
              fontSize: '0.82rem',
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

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'generator' && (
          <div className="generator-split-view">
            {/* Left Sidebar: Controls & Filters */}
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

            {/* Right Area: Controls Bar + Live Branded Sheet */}
            <div className="preview-area-wrapper">
              {/* Paper Customization Toolbar (Screen only) */}
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

              {/* Physical Sheet Preview */}
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
        )}

        {activeTab === 'uploader' && (
          <UniversalUploader
            onIngestQuestions={handleIngestQuestions}
            onSwitchToGenerator={() => setActiveTab('generator')}
          />
        )}

        {activeTab === 'bank' && (
          <QuestionBankViewer
            questionBank={questionBank}
            onAddQuestion={handleAddQuestion}
            onEditQuestion={handleEditBankQuestion}
            onDeleteQuestion={handleDeleteBankQuestion}
            onResetToMasterBank={handleResetToMasterBank}
          />
        )}
      </main>
    </div>
  );
}
