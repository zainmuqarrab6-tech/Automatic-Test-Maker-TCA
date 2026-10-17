import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  BookOpen,
  Trash2,
  Key,
  RefreshCw,
  Check,
  Layers,
  ChevronRight,
  Info,
  HelpCircle,
  CheckSquare,
  Lock,
  ShieldAlert
} from 'lucide-react';

export default function BookUploadWizard({
  backendMetadata,
  onQuestionsUpdated,
  currentUser,
  authToken,
  onSwitchToAdmin
}) {
  // Form State
  const [selectedClass, setSelectedClass] = useState('9th');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Active / Selected Book for Tracking
  const [activeBookId, setActiveBookId] = useState(null);
  const [activeBookStatus, setActiveBookStatus] = useState(null);
  const [bookQuestions, setBookQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Books Library State
  const [booksList, setBooksList] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(false);

  // AI Configuration State
  const [aiConfig, setAiConfig] = useState(null);
  const [showKeyGuide, setShowKeyGuide] = useState(false);

  // Filter for Questions Review
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'draft' | 'approved'
  const [typeFilter, setTypeFilter] = useState('all');

  const fileInputRef = useRef(null);
  const pollingRef = useRef(null);

  // Fetch AI Config and Books List on mount
  useEffect(() => {
    fetchAiConfig();
    fetchBooksList();
  }, []);

  // Sync default subject when class or metadata changes
  useEffect(() => {
    if (backendMetadata?.classes?.length) {
      const clsObj = backendMetadata.classes.find(c => c.name === selectedClass);
      if (clsObj && clsObj.subjects?.length) {
        setSelectedSubjectId(String(clsObj.subjects[0].id));
      }
    }
  }, [backendMetadata, selectedClass]);

  // Poll active book progress
  useEffect(() => {
    if (!activeBookId) return;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/v1/books/${activeBookId}/status`);
        if (res.ok) {
          const data = await res.json();
          setActiveBookStatus(data);

          // If questions count changed or completed, refresh questions
          fetchBookQuestions(activeBookId);

          if (data.upload_status === 'completed' || data.upload_status === 'failed') {
            clearInterval(pollingRef.current);
            fetchBooksList();
            if (onQuestionsUpdated) onQuestionsUpdated();
          }
        }
      } catch (e) {
        console.warn('Failed to poll book status:', e.message);
      }
    };

    pollStatus();
    pollingRef.current = setInterval(pollStatus, 2500);

    return () => clearInterval(pollingRef.current);
  }, [activeBookId]);

  const fetchAiConfig = async () => {
    try {
      const res = await fetch('/api/v1/books/ai-config');
      if (res.ok) {
        const data = await res.json();
        setAiConfig(data);
      }
    } catch (e) {
      console.warn('AI config check notice:', e.message);
    }
  };

  const fetchBooksList = async () => {
    setLoadingBooks(true);
    try {
      const res = await fetch('/api/v1/books/');
      if (res.ok) {
        const data = await res.json();
        setBooksList(data);
        if (data.length > 0 && !activeBookId) {
          setActiveBookId(data[0].id);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch books list:', e.message);
    } finally {
      setLoadingBooks(false);
    }
  };

  const fetchBookQuestions = async (bookId) => {
    if (!bookId) return;
    setLoadingQuestions(true);
    try {
      const res = await fetch(`/api/v1/books/${bookId}/questions`);
      if (res.ok) {
        const data = await res.json();
        setBookQuestions(data);
      }
    } catch (e) {
      console.warn('Failed to fetch book questions:', e.message);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.pdf', '.png', '.jpg', '.jpeg'].includes(ext)) {
      setUploadError('Only PDF, PNG, JPG, and JPEG files are supported.');
      return;
    }
    const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
    if (file.size > MAX_SIZE) {
      setUploadError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed textbook file size is 25MB.`);
      return;
    }
    setUploadError(null);
    setSelectedFile(file);
    if (!bookTitle) {
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
      setBookTitle(nameWithoutExt);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (currentUser && currentUser.role !== 'admin') {
      setUploadError('Permission denied: Only Administrators can upload textbooks and trigger AI extraction.');
      return;
    }
    if (!selectedFile) {
      setUploadError('Please select a PDF or image file to upload.');
      return;
    }
    if (!selectedSubjectId) {
      setUploadError('Please choose a subject for this textbook.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('subject_id', selectedSubjectId);
    if (bookTitle) {
      formData.append('title', bookTitle);
    }

    try {
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const res = await fetch('/api/v1/books/upload', {
        method: 'POST',
        headers,
        body: formData
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to upload book file');
      }

      const createdBook = await res.json();
      setActiveBookId(createdBook.id);
      setSelectedFile(null);
      setBookTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchBooksList();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleApproveSingle = async (questionId) => {
    if (currentUser && currentUser.role !== 'admin') {
      alert('Permission denied: Only Administrators can approve questions.');
      return;
    }
    try {
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const res = await fetch(`/api/v1/questions/${questionId}/approve`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        setBookQuestions(prev => prev.map(q => q.id === questionId ? { ...q, status: 'approved' } : q));
        if (onQuestionsUpdated) onQuestionsUpdated();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Approval failed.');
      }
    } catch (e) {
      console.warn('Approval failed:', e.message);
    }
  };

  const handleApproveAll = async () => {
    if (currentUser && currentUser.role !== 'admin') {
      alert('Permission denied: Only Administrators can approve questions.');
      return;
    }
    if (!activeBookId) return;
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      };
      const res = await fetch(`/api/v1/books/${activeBookId}/approve-all`, {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      });
      if (res.ok) {
        setBookQuestions(prev => prev.map(q => ({ ...q, status: 'approved' })));
        if (onQuestionsUpdated) onQuestionsUpdated();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Batch approval failed.');
      }
    } catch (e) {
      console.warn('Batch approval failed:', e.message);
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (currentUser && currentUser.role !== 'admin') {
      alert('Permission denied: Only Administrators can delete books.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this book and its uploaded file?')) return;
    try {
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const res = await fetch(`/api/v1/books/${bookId}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        setBooksList(prev => prev.filter(b => b.id !== bookId));
        if (activeBookId === bookId) {
          setActiveBookId(null);
          setActiveBookStatus(null);
          setBookQuestions([]);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Failed to delete book.');
      }
    } catch (e) {
      console.warn('Delete failed:', e.message);
    }
  };

  const handleRetryExtraction = async (bookId) => {
    if (currentUser && currentUser.role !== 'admin') {
      alert('Permission denied: Only Administrators can retry book extraction.');
      return;
    }
    try {
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const res = await fetch(`/api/v1/books/${bookId}/retry`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        setActiveBookId(bookId);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Retry failed.');
      }
    } catch (e) {
      console.warn('Retry failed:', e.message);
    }
  };

  // Filtered Questions
  const filteredQuestions = bookQuestions.filter(q => {
    if (statusFilter !== 'all' && q.status !== statusFilter) return false;
    if (typeFilter !== 'all' && q.type !== typeFilter) return false;
    return true;
  });

  const draftCount = bookQuestions.filter(q => q.status === 'draft').length;
  const approvedCount = bookQuestions.filter(q => q.status === 'approved').length;

  // Available classes and subjects from metadata
  const classesList = backendMetadata?.classes || [
    { id: 1, name: '9th', subjects: [{ id: 1, name: 'Mathematics' }] }
  ];
  const activeClassObj = classesList.find(c => c.name === selectedClass) || classesList[0];
  const subjectsList = activeClassObj?.subjects || [];

  return (
    <div className="book-extractor-container" style={{ padding: '16px', maxWidth: '1350px', margin: '0 auto' }}>
      
      {/* 1. Header Banner & AI Status */}
      <div style={{
        background: 'linear-gradient(135deg, #0f2744 0%, #1e3a8a 100%)',
        borderRadius: '12px',
        padding: '20px 24px',
        color: '#ffffff',
        marginBottom: '20px',
        boxShadow: '0 4px 15px rgba(15, 39, 68, 0.15)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Sparkles size={22} color="#fbbf24" />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
              AI Book Question Extraction Pipeline
            </h2>
            <span style={{
              background: 'rgba(251, 191, 36, 0.2)',
              border: '1px solid #fbbf24',
              color: '#fef08a',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              Bilingual (English & اردو)
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', color: '#cbd5e1', maxWidth: '750px', lineHeight: 1.4 }}>
            Upload textbook PDFs or chapter images. The automated background worker inspects each page (PyMuPDF + Gemini Vision OCR), 
            digitizes mathematical formulas into LaTeX, and queues questions safely as <strong>Drafts</strong> for your review.
          </p>
        </div>

        {/* Gemini API Key Indicator */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 700,
            background: aiConfig?.gemini_configured ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.25)',
            border: aiConfig?.gemini_configured ? '1px solid #4ade80' : '1px solid #f59e0b',
            color: aiConfig?.gemini_configured ? '#86efac' : '#fde68a'
          }}>
            <Key size={14} />
            <span>
              {aiConfig?.gemini_configured ? 'Gemini AI API: Connected' : 'Gemini API Key: Missing in .env'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowKeyGuide(!showKeyGuide)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#93c5fd',
              fontSize: '0.76rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <HelpCircle size={12} />
            {showKeyGuide ? 'Hide API Setup Guide' : 'How to set up Gemini API Key?'}
          </button>
        </div>
      </div>

      {/* Expandable Gemini Key Setup Guide */}
      {showKeyGuide && (
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '20px',
          fontSize: '0.86rem',
          color: '#1e3a8a'
        }}>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Key size={16} /> Steps to Configure Free Google Gemini API Key:
          </div>
          <ol style={{ paddingLeft: '20px', lineHeight: 1.6, margin: 0 }}>
            <li>
              Go to <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: '#2563eb' }}>Google AI Studio (https://aistudio.google.com/)</a>.
            </li>
            <li>Sign in with your Google account and click the blue <strong>"Get API key"</strong> button.</li>
            <li>Click <strong>"Create API key in new project"</strong> and copy the generated key (starts with <code>AIzaSy...</code>).</li>
            <li>Open the project's root <code>.env</code> file (or <code>backend/.env</code>) in your editor and add:
              <pre style={{ background: '#1e293b', color: '#f8fafc', padding: '6px 12px', borderRadius: '6px', margin: '6px 0', fontSize: '0.82rem', fontFamily: 'monospace' }}>
GEMINI_API_KEY=AIzaSyYourGeneratedKeyHere
              </pre>
            </li>
            <li>Restart the backend server (<code>uvicorn app.main:app</code>) and this banner will immediately turn green!</li>
          </ol>
        </div>
      )}

      {/* Main Grid: Upload Form + Processing Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* Left Column: Upload Form */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>
          {currentUser && currentUser.role !== 'admin' && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontWeight: 700, fontSize: '0.85rem' }}>
                <Lock size={16} />
                <span>Admin Privileges Required</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#b91c1c', lineHeight: 1.4 }}>
                Only Administrators can upload books and trigger AI question extraction. You are logged in as a <strong>Teacher</strong>.
              </p>
              {onSwitchToAdmin && (
                <button
                  type="button"
                  onClick={onSwitchToAdmin}
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    alignSelf: 'flex-start'
                  }}
                >
                  Switch to Admin Account
                </button>
              )}
            </div>
          )}

          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f2744', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UploadCloud size={18} color="#2563eb" />
            1. Upload Textbook / Paper
          </h3>

          <form onSubmit={handleUploadSubmit}>
            {/* Class & Subject Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Target Class:
                </label>
                <select
                  className="form-select"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                >
                  {classesList.map(c => (
                    <option key={c.id || c.name} value={c.name}>Class {c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Target Subject:
                </label>
                <select
                  className="form-select"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                >
                  {subjectsList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Book Title */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Book / Document Title:
              </label>
              <input
                type="text"
                placeholder="e.g. 9th Mathematics Punjab Textbook Board"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
              />
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: dragOver ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '24px 16px',
                textAlign: 'center',
                background: dragOver ? '#eff6ff' : '#f8fafc',
                cursor: 'pointer',
                marginBottom: '14px',
                transition: 'all 0.2s ease'
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    validateAndSetFile(e.target.files[0]);
                  }
                }}
              />

              {selectedFile ? (
                <div>
                  <div style={{ display: 'inline-flex', padding: '10px', borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', marginBottom: '6px' }}>
                    {selectedFile.name.endsWith('.pdf') ? <FileText size={24} /> : <ImageIcon size={24} />}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click to replace
                  </div>
                </div>
              ) : (
                <div>
                  <UploadCloud size={32} color="#94a3b8" style={{ marginBottom: '6px' }} />
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#334155' }}>
                    Choose a PDF or Drag & Drop here
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    Supports full book PDFs, scanned tests, PNG or JPG images
                  </div>
                </div>
              )}
            </div>

            {uploadError && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                padding: '8px 12px',
                color: '#b91c1c',
                fontSize: '0.8rem',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <AlertCircle size={15} />
                <span>{uploadError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !selectedFile || (currentUser && currentUser.role !== 'admin')}
              style={{
                width: '100%',
                padding: '10px',
                background: (uploading || (currentUser && currentUser.role !== 'admin')) ? '#94a3b8' : 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: (uploading || !selectedFile || (currentUser && currentUser.role !== 'admin')) ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: (currentUser && currentUser.role !== 'admin') ? 'none' : '0 2px 6px rgba(29, 78, 216, 0.25)'
              }}
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="spin" /> Uploading & Starting Pipeline...
                </>
              ) : (currentUser && currentUser.role !== 'admin') ? (
                <>
                  <Lock size={16} /> Upload Restricted (Admin Only)
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Upload & Start AI Extraction
                </>
              )}
            </button>
          </form>

          {/* Uploaded Books Quick List */}
          <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>
                Uploaded Books Library ({booksList.length})
              </div>
              <button
                type="button"
                onClick={fetchBooksList}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                title="Refresh library"
              >
                <RefreshCw size={13} className={loadingBooks ? 'spin' : ''} />
              </button>
            </div>

            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {booksList.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
                  No textbooks uploaded yet.
                </div>
              ) : (
                booksList.map(b => (
                  <div
                    key={b.id}
                    onClick={() => setActiveBookId(b.id)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: activeBookId === b.id ? '#eff6ff' : '#f8fafc',
                      border: activeBookId === b.id ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f2744', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {b.subject_name || 'Subject'} • {b.extracted_questions_count} questions
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: b.upload_status === 'completed' ? '#dcfce7' : b.upload_status === 'processing' ? '#dbeafe' : '#fee2e2',
                        color: b.upload_status === 'completed' ? '#166534' : b.upload_status === 'processing' ? '#1d4ed8' : '#991b1b'
                      }}>
                        {b.upload_status}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteBook(b.id); }}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                        title="Delete book"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Status & Extracted Draft Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Active Job Progress Card */}
          {activeBookStatus && (
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              padding: '18px 22px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={18} color="#1d4ed8" />
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f2744' }}>
                    {activeBookStatus.title}
                  </h4>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {activeBookStatus.upload_status === 'processing' && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#dbeafe',
                      color: '#1e40af',
                      padding: '3px 9px',
                      borderRadius: '12px',
                      fontSize: '0.74rem',
                      fontWeight: 700
                    }}>
                      <Loader2 size={12} className="spin" /> Processing Page {activeBookStatus.processed_pages} of {activeBookStatus.total_pages}
                    </span>
                  )}

                  {activeBookStatus.upload_status === 'completed' && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#dcfce7',
                      color: '#15803d',
                      padding: '3px 9px',
                      borderRadius: '12px',
                      fontSize: '0.74rem',
                      fontWeight: 700
                    }}>
                      <CheckCircle2 size={12} /> Extraction Complete
                    </span>
                  )}

                  {activeBookStatus.upload_status === 'failed' && (
                    <button
                      type="button"
                      onClick={() => handleRetryExtraction(activeBookStatus.id)}
                      style={{
                        background: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #fca5a5',
                        borderRadius: '6px',
                        padding: '3px 9px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <RefreshCw size={11} /> Retry Extraction
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                  <span>Progress ({activeBookStatus.processed_pages} / {activeBookStatus.total_pages} Pages)</span>
                  <span style={{ fontWeight: 800, color: '#1e293b' }}>{activeBookStatus.progress_percentage}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, activeBookStatus.progress_percentage))}%`,
                      background: activeBookStatus.upload_status === 'failed' ? '#ef4444' : 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>

              {/* Status Message & Error */}
              <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                {activeBookStatus.status_message || 'Awaiting background processing...'}
              </div>

              {activeBookStatus.error_message && (
                <div style={{ marginTop: '8px', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '0.78rem' }}>
                  ⚠️ {activeBookStatus.error_message}
                </div>
              )}
            </div>
          )}

          {/* Draft Questions Review Section */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f2744', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color="#059669" />
                  Extracted Questions Review ({bookQuestions.length})
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                  {draftCount} Drafts awaiting approval • {approvedCount} Live & Ready for Test Paper
                </div>
              </div>

              {/* Batch Actions & Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {draftCount > 0 && (
                  <button
                    type="button"
                    onClick={handleApproveAll}
                    style={{
                      background: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 5px rgba(16, 185, 129, 0.25)'
                    }}
                    title="Promote all draft questions to live approved question bank"
                  >
                    <CheckSquare size={14} /> Approve All Drafts ({draftCount})
                  </button>
                )}

                {/* Filter Status */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Drafts Only</option>
                  <option value="approved">Approved Only</option>
                </select>

                {/* Filter Type */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  <option value="all">All Types</option>
                  <option value="mcq">MCQs</option>
                  <option value="short">Short Questions</option>
                  <option value="long">Long Questions</option>
                </select>
              </div>
            </div>

            {/* Questions Cards List */}
            {loadingQuestions ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                <Loader2 size={24} className="spin" style={{ margin: '0 auto 8px auto' }} />
                <div>Loading questions from book...</div>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px dashed #cbd5e1',
                color: '#64748b'
              }}>
                <Sparkles size={28} color="#94a3b8" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>
                  No questions found for the selected filters.
                </div>
                <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
                  When the background worker extracts questions from uploaded book pages, they will appear here in real-time.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '600px', overflowY: 'auto' }}>
                {filteredQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    style={{
                      border: q.status === 'draft' ? '1px solid #fde68a' : '1px solid #bbf7d0',
                      background: q.status === 'draft' ? '#fffdf5' : '#f0fdf4',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}
                  >
                    {/* Top Meta Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontWeight: 800,
                          fontSize: '0.72rem',
                          background: '#0f2744',
                          color: '#ffffff',
                          padding: '2px 7px',
                          borderRadius: '4px'
                        }}>
                          #{idx + 1}
                        </span>

                        <span style={{
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          background: '#e0f2fe',
                          color: '#0369a1',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          Page {q.source_page || '?'}
                        </span>

                        <span style={{
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          background: '#f1f5f9',
                          color: '#334155',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {q.type.toUpperCase()} ({q.marks}M)
                        </span>

                        {q.chapter_no && (
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                            Unit {q.chapter_no}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {/* Status Badge */}
                        <span style={{
                          fontWeight: 800,
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: q.status === 'approved' ? '#dcfce7' : '#fef3c7',
                          color: q.status === 'approved' ? '#15803d' : '#b45309',
                          border: q.status === 'approved' ? '1px solid #86efac' : '1px solid #fcd34d'
                        }}>
                          {q.status === 'approved' ? '✓ APPROVED' : '⚡ DRAFT'}
                        </span>

                        {q.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => handleApproveSingle(q.id)}
                            style={{
                              background: '#10b981',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Approve this question and add to question bank"
                          >
                            <Check size={12} /> Approve
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Question Content */}
                    <div style={{ display: 'grid', gridTemplateColumns: q.question_ur ? '1fr 1fr' : '1fr', gap: '14px', alignItems: 'start' }}>
                      {/* English Statement */}
                      <div style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 500, lineHeight: 1.4 }}>
                        {q.question_text || q.question_en}
                      </div>

                      {/* Urdu Statement (Nastaleeq) */}
                      {q.question_ur && (
                        <div
                          className="urdu-text"
                          style={{
                            fontSize: '0.98rem',
                            color: '#0f172a',
                            fontWeight: 600,
                            lineHeight: 1.8,
                            textAlign: 'right',
                            direction: 'rtl'
                          }}
                        >
                          {q.question_ur}
                        </div>
                      )}
                    </div>

                    {/* MCQ Options */}
                    {q.type === 'mcq' && Array.isArray(q.options) && q.options.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px', marginTop: '10px' }}>
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = String(q.correct_answer) === String(oIdx);
                          const optLabel = String.fromCharCode(65 + oIdx);
                          const optText = typeof opt === 'object' ? opt.text : String(opt);
                          return (
                            <div
                              key={oIdx}
                              style={{
                                fontSize: '0.78rem',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                background: isCorrect ? '#dcfce7' : '#ffffff',
                                border: isCorrect ? '1px solid #4ade80' : '1px solid #cbd5e1',
                                color: isCorrect ? '#166534' : '#334155',
                                fontWeight: isCorrect ? 700 : 500
                              }}
                            >
                              <strong>({optLabel})</strong> {optText} {isCorrect && ' ✓'}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
