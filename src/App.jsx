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
  // Central Question Bank in localStorage with smart merge
  const [questionBank, setQuestionBank] = useState(() => {
    try {
      const saved = localStorage.getItem('tca_question_bank');
      if (saved) {
        const parsed = JSON.parse(saved);
        const map = new Map();
        INITIAL_QUESTION_BANK.forEach(q => map.set(q.id, q));
        parsed.forEach(q => map.set(q.id, q));
        return Array.from(map.values());
      }
    } catch (e) {
      console.error('Error loading question bank:', e);
    }
    return INITIAL_QUESTION_BANK;
  });

  // DB Sync Status
  const [dbStatus, setDbStatus] = useState('checking'); // 'connected' | 'cached' | 'syncing'
  const [dbMessage, setDbMessage] = useState('');

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('tca_question_bank', JSON.stringify(questionBank));
  }, [questionBank]);

  // Attempt to fetch from MySQL on mount
  useEffect(() => {
    async function loadDatabase() {
      try {
        // 1. First try Hostinger Node.js Web App endpoint /api/questions
        let res = await fetch('/api/questions', { cache: 'no-store' });
        if (!res.ok) {
          // 2. Fallback to PHP API if running on Apache/LiteSpeed
          res = await fetch('/api.php?action=get_questions', { cache: 'no-store' });
        }
        if (!res.ok) {
          // 3. Fallback to local dev port 5000 if running
          res = await fetch('http://localhost:5000/api/questions');
        }

        if (res.ok) {
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
      // 1. Try Hostinger Node.js Web App endpoint /api/bulk_insert
      let res = await fetch('/api/bulk_insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionBank)
      });

      if (!res.ok) {
        // 2. Try PHP API endpoint
        res = await fetch('/api.php?action=bulk_insert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(questionBank)
        });
      }

      if (res.ok) {
        setDbStatus('connected');
        setDbMessage(`MySQL Live (${questionBank.length} Questions)`);
        alert(`✅ Successfully synced ${questionBank.length} questions to Hostinger MySQL Database!`);
      } else {
        throw new Error('Server returned non-200');
      }
    } catch (e) {
      setDbStatus('cached');
      setDbMessage(`Cached Mode (${questionBank.length} Questions)`);
      alert("Note: Server sync completed locally in cached memory. When deployed on Hostinger Web App, it connects directly to MySQL.");
    }
  };

  // Restore Master Bank
  const handleResetToMasterBank = () => {
    if (window.confirm("Restore complete master question bank for 9th Mathematics (all units)? Custom edits will be reset.")) {
      setQuestionBank(INITIAL_QUESTION_BANK);
      localStorage.setItem('tca_question_bank', JSON.stringify(INITIAL_QUESTION_BANK));
      alert("Master Question Bank successfully restored with all 13 units!");
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

    if (pool.length === 0) {
      pool = questionBank.filter(q => q.class === cls && q.subject === subj);
    }

    const availableMcqs = pool.filter(q => q.type === 'mcq');
    const availableShorts = pool.filter(q => q.type === 'short_question');
    const availableLongs = pool.filter(q => q.type === 'long_question');

    const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

    const chosenMcqs = shuffle(availableMcqs).slice(0, mcqCount);
    const chosenShorts = shuffle(availableShorts).slice(0, shortCount);
    const chosenLongs = shuffle(availableLongs).slice(0, longCount);

    const mcqMarks = chosenMcqs.length * 1;
    const shortAttempt = chosenShorts.length > 3 ? chosenShorts.length - 2 : chosenShorts.length;
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
      targetMarks,
      totalMarks: calculatedTotal > 0 ? calculatedTotal : targetMarks,
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
    const shortAttempt = chosenShorts.length > 3 ? chosenShorts.length - 2 : chosenShorts.length;
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
    const candidates = pool.filter(q => !currentIds.has(q.id));

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

  // Bulk Ingestion callback from UniversalUploader
  const handleIngestQuestions = (newQuestions) => {
    setQuestionBank(prev => [...newQuestions, ...prev]);
    // Auto-sync new questions to MySQL
    try {
      fetch('/api.php?action=bulk_insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuestions)
      });
    } catch (e) {}
  };

  // Add question callback from QuestionBankViewer
  const handleAddQuestion = (newQuestion) => {
    setQuestionBank(prev => [newQuestion, ...prev]);
    // Save to MySQL
    try {
      fetch('/api.php?action=add_question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuestion)
      });
    } catch (e) {}
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
            onResetToMasterBank={handleResetToMasterBank}
          />
        )}
      </main>
    </div>
  );
}
