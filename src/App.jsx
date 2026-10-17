import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Columns, 
  ShieldCheck, 
  CheckCircle, 
  FileDown,
  Database,
  RefreshCw,
  Sparkles,
  BookOpen,
  FileText,
  Eye,
  Sliders,
  User,
  Lock,
  Key,
  LogOut,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { INITIAL_QUESTION_BANK } from './data/questionBank';
import TestGeneratorWizard from './components/TestGeneratorWizard';
import LiveTestPaper from './components/LiveTestPaper';
import BookUploadWizard from './components/BookUploadWizard';
import QuestionReviewPage from './components/QuestionReviewPage';
import SchemeAndSyllabusManager from './components/SchemeAndSyllabusManager';
import { exportTestPaperToWord } from './utils/exportToWord';

export default function App() {
  // Authentication & Roles: 'admin' | 'teacher'
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('tca_auth_user');
      return saved ? JSON.parse(saved) : { email: 'admin@tca.edu.pk', full_name: 'Academic Administrator', role: 'admin' };
    } catch {
      return { email: 'admin@tca.edu.pk', full_name: 'Academic Administrator', role: 'admin' };
    }
  });

  const [authToken, setAuthToken] = useState(() => {
    return localStorage.getItem('tca_token') || '';
  });

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Navigation Tabs: 'generator' | 'review' | 'book_upload' | 'scheme_syllabus'
  const [activeTab, setActiveTab] = useState('generator');

  // Central Question Bank in memory (Loaded dynamically from FastAPI / MySQL)
  const [questionBank, setQuestionBank] = useState(INITIAL_QUESTION_BANK);
  const [backendMetadata, setBackendMetadata] = useState(null);

  // Live Database Connection State
  const [dbStatus, setDbStatus] = useState('checking'); // 'connected' | 'offline'
  const [dbMessage, setDbMessage] = useState('Connecting to MySQL (FastAPI)...');
  const [loadingDb, setLoadingDb] = useState(false);

  // Load questions and metadata dynamically from FastAPI / MySQL backend
  const loadDatabaseQuestions = async () => {
    setLoadingDb(true);
    setDbStatus('checking');
    try {
      // 1. Fetch metadata (Classes, Subjects, Chapters)
      try {
        const metaRes = await fetch('/api/v1/metadata', { cache: 'no-store' });
        if (metaRes.ok) {
          const metaJson = await metaRes.json();
          try {
            const [classesRes, subjectsRes] = await Promise.all([
              fetch('/api/v1/classes'),
              fetch('/api/v1/subjects')
            ]);
            if (classesRes.ok && subjectsRes.ok) {
              const classesData = await classesRes.json();
              const subjectsData = await subjectsRes.json();
              metaJson.classes = classesData.map(cls => ({
                id: cls.id,
                name: cls.name,
                subjects: subjectsData.filter(s => s.class_id === cls.id).map(s => ({
                  id: s.id,
                  name: s.name,
                  code: s.code,
                  chapters: (metaJson.chapters || []).filter(ch => ch.class_name === cls.name && ch.subject_name === s.name).map(ch => ({
                    id: ch.id,
                    chapter_number: ch.chapter_no,
                    name_en: ch.name_en,
                    name_ur: ch.name_ur
                  }))
                }))
              }));
            }
          } catch (treeErr) {
            console.warn('Academic tree enrichment notice:', treeErr);
          }
          setBackendMetadata(metaJson);
        }
      } catch (e) {
        console.warn('Metadata fetch notice:', e.message);
      }

      // 2. Fetch questions from FastAPI backend (Strictly Approved only)
      let res = null;
      try {
        res = await fetch('/api/v1/questions?limit=500&status=approved', { cache: 'no-store' });
      } catch (e) {}

      // Fallback to top-level /api/questions or PHP
      if (!res || !res.ok) {
        try {
          res = await fetch('/api/questions?status=approved', { cache: 'no-store' });
        } catch (e) {}
      }
      if (!res || !res.ok) {
        try {
          res = await fetch('/api.php?action=get_questions', { cache: 'no-store' });
        } catch (e) {}
      }

      if (res && res.ok) {
        const result = await res.json();
        const serverQuestions = result.data || result;
        if (Array.isArray(serverQuestions)) {
          setQuestionBank(serverQuestions);
          setDbStatus('connected');
          setDbMessage(`FastAPI + MySQL: Connected (${serverQuestions.length} Questions)`);
          setLoadingDb(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Database fetch notice:', err.message);
    }

    setDbStatus('offline');
    setDbMessage('MySQL / FastAPI (Offline / Checking)');
    setLoadingDb(false);
  };

  useEffect(() => {
    loadDatabaseQuestions();
  }, []);

  // Authentication Handlers
  const performLogin = async (email, password) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        setAuthToken(data.access_token);
        setCurrentUser(data.user);
        localStorage.setItem('tca_token', data.access_token);
        localStorage.setItem('tca_auth_user', JSON.stringify(data.user));
        setShowLoginModal(false);
        setLoginEmail('');
        setLoginPassword('');
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        setLoginError(err.detail || 'Login failed. Please check credentials.');
        return false;
      }
    } catch (e) {
      setLoginError(`Network error: ${e.message}`);
      return false;
    } finally {
      setLoginLoading(false);
    }
  };

  const handleQuickSwitchRole = async (targetRole) => {
    if (targetRole === 'admin') {
      await performLogin('admin@tca.edu.pk', 'Admin@123');
    } else {
      await performLogin('teacher@tca.edu.pk', 'Teacher@123');
    }
  };

  // Ensure default JWT token on mount if not stored
  useEffect(() => {
    if (!authToken) {
      performLogin('admin@tca.edu.pk', 'Admin@123');
    }
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

  // Auto Generate Test Paper (Standard Board Scheme & Custom Range)
  const generateTestPaper = (config) => {
    const {
      selectedClass: cls,
      selectedSubject: subj,
      selectedChapters = [1],
      syllabus,
      filteredPool,
      mcqCount,
      shortCount,
      longCount,
      targetMarks,
      timeAllowed,
      testTitle,
      campus
    } = config;

    // Filter question bank: ONLY approved questions may be used in test generation
    const approvedBank = questionBank.filter(q => q.status === 'approved' || q.status === undefined);

    // Use specifically filtered pool (e.g. half-chapter, custom command) if provided
    let pool = (filteredPool && filteredPool.length > 0)
      ? filteredPool.filter(q => q.status === 'approved' || q.status === undefined)
      : approvedBank.filter(
          q => (q.class === cls || q.class_name === cls) && 
               (q.subject === subj || q.subject_name === subj) && 
               selectedChapters.includes(q.chapter_no)
        );

    // Fallback if pool is empty
    if (pool.length === 0) {
      pool = approvedBank.filter(q => (q.class === cls || q.class_name === cls) && (q.subject === subj || q.subject_name === subj));
    }
    if (pool.length === 0) {
      pool = approvedBank.filter(q => (q.class === cls || q.class_name === cls));
    }
    if (pool.length === 0) {
      pool = approvedBank;
    }

    const availableMcqs = pool.filter(q => q.type === 'mcq');
    const availableShorts = pool.filter(q => q.type === 'short_question');
    const availableLongs = pool.filter(q => q.type === 'long_question');

    const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

    let chosenMcqs = shuffle(availableMcqs).slice(0, mcqCount);
    let chosenShorts = shuffle(availableShorts).slice(0, shortCount);
    let chosenLongs = shuffle(availableLongs).slice(0, longCount);

    // Dynamic generation if pool has fewer questions than requested
    if (chosenMcqs.length < mcqCount) {
      const extra = shuffle(pool.filter(q => q.type === 'mcq' && !chosenMcqs.some(c => c.id === q.id)));
      chosenMcqs = [...chosenMcqs, ...extra.slice(0, mcqCount - chosenMcqs.length)];
      
      const needed = mcqCount - chosenMcqs.length;
      for (let i = 0; i < needed; i++) {
        chosenMcqs.push({
          id: `dyn-mcq-${Date.now()}-${i}`,
          class: cls,
          subject: subj,
          chapter_no: selectedChapters[0] || 1,
          type: 'mcq',
          marks: 1,
          question_en: `Sample MCQ ${chosenMcqs.length + 1} (${subj} - ${syllabus || 'Unit ' + (selectedChapters[0] || 1)}). Click Edit to customize...`,
          question_ur: `معروضی سوال نمبر ${chosenMcqs.length + 1} درج کریں۔ (تبدیل کرنے کے لیے Edit دبائیں)`,
          options: [{ text: 'Option A' }, { text: 'Option B' }, { text: 'Option C' }, { text: 'Option D' }],
          correct_option_index: 0
        });
      }
    }

    if (chosenShorts.length < shortCount) {
      const extra = shuffle(pool.filter(q => q.type === 'short_question' && !chosenShorts.some(c => c.id === q.id)));
      chosenShorts = [...chosenShorts, ...extra.slice(0, shortCount - chosenShorts.length)];

      const needed = shortCount - chosenShorts.length;
      for (let i = 0; i < needed; i++) {
        chosenShorts.push({
          id: `dyn-short-${Date.now()}-${i}`,
          class: cls,
          subject: subj,
          chapter_no: selectedChapters[0] || 1,
          type: 'short_question',
          marks: 2,
          question_en: `Short Question ${chosenShorts.length + 1}: Click Edit to customize question text in English...`,
          question_ur: `مختصر سوال نمبر ${chosenShorts.length + 1}: اردو سوال تبدیل کرنے کے لیے Edit دبائیں...`
        });
      }
    }

    if (chosenLongs.length < longCount) {
      const extra = shuffle(pool.filter(q => q.type === 'long_question' && !chosenLongs.some(c => c.id === q.id)));
      chosenLongs = [...chosenLongs, ...extra.slice(0, longCount - chosenLongs.length)];

      const needed = longCount - chosenLongs.length;
      for (let i = 0; i < needed; i++) {
        chosenLongs.push({
          id: `dyn-long-${Date.now()}-${i}`,
          class: cls,
          subject: subj,
          chapter_no: selectedChapters[0] || 1,
          type: 'long_question',
          marks: 4,
          question_en: `Long Question / Theorem ${chosenLongs.length + 1}: Click Edit to customize question text in English...`,
          question_ur: `تفصیلی سوال / مسئلہ نمبر ${chosenLongs.length + 1}: اردو سوال تبدیل کرنے کے لیے Edit دبائیں...`
        });
      }
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
      syllabus: syllabus || (selectedChapters.length > 0 ? `Unit ${selectedChapters.join(', ')}` : 'Full Book'),
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
      selectedChapters = [1],
      selectedQuestions = [],
      syllabus,
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
      syllabus: syllabus || (selectedChapters.length > 0 ? `Unit ${selectedChapters.join(', ')}` : 'Full Book'),
      date: new Date().toISOString().split('T')[0],
      timeAllowed,
      targetMarks: calculatedTotal,
      totalMarks: calculatedTotal,
      mcqs: chosenMcqs,
      shortQuestions: chosenShorts,
      longQuestions: chosenLongs
    });
  };

  // Backend Test Generation Service (Subject + Syllabus Division + Paper Scheme + Last N Tests Avoidance)
  const handleGenerateBackendTest = async (payload) => {
    try {
      const res = await fetch('/api/v1/tests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) {
        return { success: false, message: data.message, shortages: data.shortages || [] };
      }

      const t = data.test;
      const allQ = t.all_questions || [];

      // Map questions into format expected by LiveTestPaper
      const mcqs = allQ.filter(q => q.type === 'mcq').map(q => ({
        id: q.id,
        class: t.class_name || selectedClass,
        subject: t.subject_name || selectedSubject,
        chapter_no: q.chapter_number || 1,
        type: 'mcq',
        marks: q.marks || 1,
        question_en: q.question_text,
        question_ur: q.question_ur,
        options: q.options || [],
        correct_option_index: q.correct_answer !== null && !isNaN(Number(q.correct_answer)) ? Number(q.correct_answer) : undefined
      }));

      const shortQuestions = allQ.filter(q => q.type === 'short').map(q => ({
        id: q.id,
        class: t.class_name || selectedClass,
        subject: t.subject_name || selectedSubject,
        chapter_no: q.chapter_number || 1,
        type: 'short_question',
        marks: q.marks || 2,
        question_en: q.question_text,
        question_ur: q.question_ur
      }));

      const longQuestions = allQ.filter(q => q.type === 'long').map(q => ({
        id: q.id,
        class: t.class_name || selectedClass,
        subject: t.subject_name || selectedSubject,
        chapter_no: q.chapter_number || 1,
        type: 'long_question',
        marks: q.marks || 8,
        question_en: q.question_text,
        question_ur: q.question_ur
      }));

      setPaperData({
        testId: t.id,
        testTitle: t.title,
        campus: t.campus,
        className: t.class_name || selectedClass,
        subject: t.subject_name || selectedSubject,
        syllabus: t.syllabus_name || `Board Scheme: ${t.scheme_id}`,
        date: t.date || new Date().toISOString().split('T')[0],
        timeAllowed: t.time_allowed,
        totalMarks: t.total_marks,
        targetMarks: t.total_marks,
        mcqs,
        shortQuestions,
        longQuestions,
        rawTest: t
      });

      return { success: true, message: data.message, test: t };
    } catch (err) {
      return { success: false, message: `Network error: ${err.message}`, shortages: [] };
    }
  };

  // Swap question on paper with another from FastAPI backend (Regenerate Question) or local pool
  const handleSwapQuestion = async (type, index, currentQuestion) => {
    if (!paperData) return;

    // 1. If generated by the Backend Test Generation Service, call regenerate-question endpoint
    if (paperData.testId && currentQuestion?.id) {
      try {
        const res = await fetch(`/api/v1/tests/${paperData.testId}/regenerate-question`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question_id: currentQuestion.id, avoid_recent_n: 3 })
        });
        const data = await res.json();
        if (data.success && data.replacement_question) {
          const rep = data.replacement_question;
          const formattedRep = {
            id: rep.id,
            class: paperData.className,
            subject: paperData.subject,
            chapter_no: rep.chapter_number || 1,
            type: rep.type === 'mcq' ? 'mcq' : (rep.type === 'short' ? 'short_question' : 'long_question'),
            marks: rep.marks,
            question_en: rep.question_text,
            question_ur: rep.question_ur,
            options: rep.options || [],
            correct_option_index: rep.correct_answer !== null && !isNaN(Number(rep.correct_answer)) ? Number(rep.correct_answer) : undefined
          };

          const currentList = type === 'mcq' ? paperData.mcqs : type === 'short' ? paperData.shortQuestions : paperData.longQuestions;
          const updatedList = [...currentList];
          updatedList[index] = formattedRep;

          if (type === 'mcq') setPaperData({ ...paperData, mcqs: updatedList });
          else if (type === 'short') setPaperData({ ...paperData, shortQuestions: updatedList });
          else setPaperData({ ...paperData, longQuestions: updatedList });

          return;
        } else {
          alert(data.message || "No alternative approved questions available to swap with.");
          return;
        }
      } catch (err) {
        console.warn('Backend regenerate failed, falling back to local pool:', err);
      }
    }

    const currentList = type === 'mcq' ? paperData.mcqs : type === 'short' ? paperData.shortQuestions : paperData.longQuestions;
    const currentIds = Array.from(new Set(currentList.map(q => q.id)));

    // Try backend swap first
    try {
      const res = await fetch('/api/v1/questions/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_name: paperData.className,
          subject_name: paperData.subject,
          chapter_no: currentQuestion?.chapter_no || 1,
          type: type === 'mcq' ? 'mcq' : type === 'short' ? 'short' : 'long',
          exclude_ids: currentIds
        })
      });
      if (res.ok) {
        const replacement = await res.json();
        const updatedList = [...currentList];
        updatedList[index] = replacement;
        if (type === 'mcq') setPaperData({ ...paperData, mcqs: updatedList });
        else if (type === 'short') setPaperData({ ...paperData, shortQuestions: updatedList });
        else setPaperData({ ...paperData, longQuestions: updatedList });
        return;
      }
    } catch (err) {
      console.warn('Backend swap fallback to local memory pool:', err.message);
    }

    // Local pool fallback
    const pool = questionBank.filter(
      q => (q.class === paperData.className || q.class_name === paperData.className) &&
           (q.subject === paperData.subject || q.subject_name === paperData.subject) &&
           (type === 'mcq' ? q.type === 'mcq' : type === 'short' ? (q.type === 'short' || q.type === 'short_question') : (q.type === 'long' || q.type === 'long_question'))
    );

    let candidates = pool.filter(q => !currentIds.includes(q.id) && q.chapter_no === currentQuestion?.chapter_no);
    if (candidates.length === 0) {
      candidates = pool.filter(q => !currentIds.includes(q.id));
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

  // Inline edit question on paper and persist to backend
  const handleEditQuestion = async (type, index, updatedQuestion) => {
    if (!paperData) return;
    const currentList = type === 'mcq' ? paperData.mcqs : type === 'short' ? paperData.shortQuestions : paperData.longQuestions;
    const updated = [...currentList];
    updated[index] = { ...updated[index], ...updatedQuestion };

    if (type === 'mcq') setPaperData({ ...paperData, mcqs: updated });
    else if (type === 'short') setPaperData({ ...paperData, shortQuestions: updated });
    else setPaperData({ ...paperData, longQuestions: updated });

    // Persist to FastAPI backend if real database ID
    if (updatedQuestion.id && !updatedQuestion.id.startsWith('dyn-') && !updatedQuestion.id.startsWith('custom-')) {
      try {
        await fetch(`/api/v1/questions/${updatedQuestion.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_text: updatedQuestion.question_text || updatedQuestion.question_en,
            question_ur: updatedQuestion.question_ur,
            options: updatedQuestion.options,
            correct_answer: updatedQuestion.correct_option_index !== undefined ? String(updatedQuestion.correct_option_index) : undefined,
            marks: updatedQuestion.marks
          })
        });
      } catch (e) {
        console.warn('Persist edit notice:', e.message);
      }
    }
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


        {/* Live Database Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '0.76rem',
              fontWeight: 700,
              background: dbStatus === 'connected' ? '#dcfce7' : '#fef3c7',
              color: dbStatus === 'connected' ? '#166534' : '#92400e',
              border: dbStatus === 'connected' ? '1px solid #86efac' : '1px solid #fde68a'
            }}
            title="Live Hostinger MySQL Database Connection"
          >
            <span 
              style={{ 
                width: '7px', 
                height: '7px', 
                borderRadius: '50%', 
                background: dbStatus === 'connected' ? '#22c55e' : '#f59e0b',
                boxShadow: dbStatus === 'connected' ? '0 0 6px #22c55e' : 'none'
              }} 
            />
            <Database size={13} />
            <span>{dbMessage}</span>
          </div>

          <button
            type="button"
            onClick={loadDatabaseQuestions}
            disabled={loadingDb}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              color: '#ffffff',
              padding: '5px 9px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.74rem',
              fontWeight: 600
            }}
            title="Refresh questions from database"
          >
            <RefreshCw size={11} className={loadingDb ? 'spin' : ''} />
            Sync
          </button>
        </div>

        {/* Navigation Mode Switcher Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.08)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.15)', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('generator')}
            style={{
              background: activeTab === 'generator' ? '#ffffff' : 'transparent',
              color: activeTab === 'generator' ? '#0f2744' : '#e2e8f0',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'generator' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <FileText size={14} color={activeTab === 'generator' ? '#2563eb' : '#94a3b8'} />
            Generate Test Paper
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('review')}
            style={{
              background: activeTab === 'review' ? '#ffffff' : 'transparent',
              color: activeTab === 'review' ? '#0f2744' : '#e2e8f0',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'review' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <Eye size={14} color={activeTab === 'review' ? '#2563eb' : '#94a3b8'} />
            Review Questions
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('book_upload')}
            style={{
              background: activeTab === 'book_upload' ? '#ffffff' : 'transparent',
              color: activeTab === 'book_upload' ? '#0f2744' : '#e2e8f0',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'book_upload' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <Sparkles size={14} color={activeTab === 'book_upload' ? '#d97706' : '#fbbf24'} />
            Upload Book & AI Extract
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('scheme_syllabus')}
            style={{
              background: activeTab === 'scheme_syllabus' ? '#ffffff' : 'transparent',
              color: activeTab === 'scheme_syllabus' ? '#0f2744' : '#e2e8f0',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'scheme_syllabus' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <Sliders size={14} color={activeTab === 'scheme_syllabus' ? '#2563eb' : '#94a3b8'} />
            Schemes & Syllabus
          </button>
        </div>

        {/* Global Action Bar */}
        <div className="nav-actions" style={{ display: 'flex', gap: '8px' }}>
          {activeTab === 'generator' && (
            <>
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
            </>
          )}

          {/* User Role Badge & Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                borderRadius: '20px',
                fontSize: '0.74rem',
                fontWeight: 700,
                background: currentUser?.role === 'admin' 
                  ? 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)' 
                  : 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
                color: '#ffffff',
                border: currentUser?.role === 'admin' ? '1px solid #c4b5fd' : '1px solid #6ee7b7',
                boxShadow: '0 2px 5px rgba(0,0,0,0.12)'
              }}
              title={`Logged in as ${currentUser?.email} (${currentUser?.role})`}
            >
              {currentUser?.role === 'admin' ? <ShieldCheck size={12} color="#fef08a" /> : <BookOpen size={12} color="#a7f3d0" />}
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {currentUser?.role === 'admin' ? 'ADMIN' : 'TEACHER'}
              </span>
              <span style={{ opacity: 0.6 }}>•</span>
              <span style={{ maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser?.full_name?.split(' ')[0] || 'User'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleQuickSwitchRole(currentUser?.role === 'admin' ? 'teacher' : 'admin')}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '6px',
                color: '#ffffff',
                padding: '5px 9px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title={currentUser?.role === 'admin' ? "Switch to Teacher mode" : "Switch to Admin mode"}
            >
              <RefreshCw size={10} />
              {currentUser?.role === 'admin' ? 'Teacher' : 'Admin'}
            </button>

            <button
              type="button"
              onClick={() => setShowLoginModal(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: '#ffffff',
                padding: '5px 8px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
              title="Sign in with custom account or view demo credentials"
            >
              <User size={11} />
              Login
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'review' ? (
          <QuestionReviewPage
            backendMetadata={backendMetadata}
            onQuestionsUpdated={loadDatabaseQuestions}
            currentUser={currentUser}
            authToken={authToken}
            onSwitchToAdmin={() => handleQuickSwitchRole('admin')}
          />
        ) : activeTab === 'book_upload' ? (
          <BookUploadWizard
            backendMetadata={backendMetadata}
            onQuestionsUpdated={loadDatabaseQuestions}
            currentUser={currentUser}
            authToken={authToken}
            onSwitchToAdmin={() => handleQuickSwitchRole('admin')}
          />
        ) : activeTab === 'scheme_syllabus' ? (
          <SchemeAndSyllabusManager
            backendMetadata={backendMetadata}
            currentUser={currentUser}
            authToken={authToken}
            onUpdated={loadDatabaseQuestions}
          />
        ) : (
          <div className="generator-split-view">
            {/* Left Sidebar: Generator Wizard */}
          <div className="no-print">
            <TestGeneratorWizard
              questionBank={questionBank}
              onGenerateTest={generateTestPaper}
              onGenerateManualTest={generateManualTestPaper}
              onGenerateBackendTest={handleGenerateBackendTest}
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              selectedSubject={selectedSubject}
              setSelectedSubject={setSelectedSubject}
              backendMetadata={backendMetadata}
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

      {/* Authentication & Role Selection Modal */}
      {showLoginModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLoginModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              width: '100%',
              maxWidth: '460px',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0c2340 0%, #1e3a8a 100%)',
                color: '#ffffff',
                padding: '20px 24px',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    padding: '8px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Lock size={20} color="#38bdf8" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Account & Role Login</h3>
                  <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#93c5fd' }}>
                    The Creators Academy • Role-Based Access Control
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                style={{
                  position: 'absolute',
                  top: '18px',
                  right: '18px',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Error Message */}
              {loginError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    marginBottom: '16px'
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>{loginError}</div>
                </div>
              )}

              {/* Form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await performLogin(loginEmail, loginPassword);
                }}
              >
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. admin@tca.edu.pk"
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    backgroundColor: '#1e3a8a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: loginLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: loginLoading ? 0.7 : 1
                  }}
                >
                  {loginLoading ? <RefreshCw size={16} className="spin-animate" /> : <Lock size={16} />}
                  {loginLoading ? 'Authenticating...' : 'Sign In'}
                </button>
              </form>

              {/* Quick Demo Accounts */}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <p style={{ margin: '0 0 10px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Instant 1-Click Demo Accounts
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={async () => {
                      setLoginEmail('admin@tca.edu.pk');
                      setLoginPassword('Admin@123');
                      await performLogin('admin@tca.edu.pk', 'Admin@123');
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #c4b5fd',
                      backgroundColor: '#f5f3ff',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 800, color: '#6d28d9' }}>
                      <ShieldCheck size={14} color="#6d28d9" /> Admin Role
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                      admin@tca.edu.pk
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#8b5cf6', marginTop: '4px', fontWeight: 600 }}>
                      Full Access (Uploads & Approvals)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setLoginEmail('teacher@tca.edu.pk');
                      setLoginPassword('Teacher@123');
                      await performLogin('teacher@tca.edu.pk', 'Teacher@123');
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #a7f3d0',
                      backgroundColor: '#ecfdf5',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 800, color: '#047857' }}>
                      <BookOpen size={14} color="#047857" /> Teacher Role
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                      teacher@tca.edu.pk
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
                      Generate, Draft & Export
                    </span>
                  </button>
                </div>
              </div>

              {/* Current Session status */}
              {currentUser && (
                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                  <span>Currently logged in: <strong>{currentUser.email}</strong> ({currentUser.role})</span>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('tca_token');
                      localStorage.removeItem('tca_auth_user');
                      setAuthToken('');
                      setCurrentUser(null);
                      setShowLoginModal(false);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0
                    }}
                  >
                    <LogOut size={12} /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
