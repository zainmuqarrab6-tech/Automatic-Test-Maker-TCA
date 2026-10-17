import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  Edit3,
  Save,
  X,
  FileText,
  BookOpen,
  Filter,
  CheckSquare,
  Square,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  AlertCircle,
  Loader2,
  RefreshCw,
  FolderInput,
  Check,
  Eye,
  Lock,
  ShieldCheck
} from 'lucide-react';

export default function QuestionReviewPage({
  backendMetadata,
  onQuestionsUpdated,
  currentUser,
  authToken,
  onSwitchToAdmin
}) {
  // Academic selection
  const [selectedClass, setSelectedClass] = useState('9th');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  // Filters
  const [selectedBookId, setSelectedBookId] = useState('all');
  const [selectedChapterId, setSelectedChapterId] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('draft'); // Default to reviewing drafts
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [chapterStats, setChapterStats] = useState([]);
  const [booksList, setBooksList] = useState([]);

  // Page viewer states (Side-by-side comparison)
  const [previewBookId, setPreviewBookId] = useState(null);
  const [previewPageNumber, setPreviewPageNumber] = useState(1);
  const [previewTotalPages, setPreviewTotalPages] = useState(1);
  const [imageZoom, setImageZoom] = useState(100);
  const [loadingImage, setLoadingImage] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Selection & Bulk actions
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [bulkTargetChapterId, setBulkTargetChapterId] = useState('');
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState(null);

  // Inline editing state
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Sync initial subject from metadata
  useEffect(() => {
    if (backendMetadata?.classes?.length) {
      const clsObj = backendMetadata.classes.find(c => c.name === selectedClass);
      if (clsObj && clsObj.subjects?.length) {
        setSelectedSubjectId(String(clsObj.subjects[0].id));
      }
    }
  }, [backendMetadata, selectedClass]);

  // Load books, stats, and questions when subject changes
  useEffect(() => {
    if (selectedSubjectId) {
      fetchBooks();
      fetchChapterStats();
      fetchQuestions();
    }
  }, [selectedSubjectId, selectedBookId, selectedChapterId, typeFilter, statusFilter]);

  const fetchBooks = async () => {
    try {
      const res = await fetch(`/api/v1/books/?subject_id=${selectedSubjectId}`);
      if (res.ok) {
        const data = await res.json();
        setBooksList(data);
        if (data.length > 0 && !previewBookId) {
          setPreviewBookId(data[0].id);
          setPreviewTotalPages(data[0].total_pages || 1);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch books:', e.message);
    }
  };

  const fetchChapterStats = async () => {
    try {
      const res = await fetch(`/api/v1/questions/chapter-stats?subject_id=${selectedSubjectId}`);
      if (res.ok) {
        const data = await res.json();
        setChapterStats(data);
        if (data.length > 0 && !bulkTargetChapterId) {
          setBulkTargetChapterId(String(data[0].chapter_id));
        }
      }
    } catch (e) {
      console.warn('Failed to fetch chapter stats:', e.message);
    }
  };

  const fetchQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '200');
      if (selectedSubjectId) params.append('subject_id', selectedSubjectId);
      if (selectedChapterId !== 'all') params.append('chapter_id', selectedChapterId);
      if (selectedBookId !== 'all') params.append('source_book_id', selectedBookId);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/v1/questions?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setQuestions(json.data || []);
      }
    } catch (e) {
      console.warn('Failed to fetch questions:', e.message);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Jump to textbook page for a question
  const handleJumpToPage = (bookId, pageNo) => {
    if (bookId) {
      setPreviewBookId(bookId);
      const bObj = booksList.find(b => b.id === bookId);
      if (bObj && bObj.total_pages) setPreviewTotalPages(bObj.total_pages);
    }
    if (pageNo) {
      setPreviewPageNumber(pageNo);
      setImageError(false);
    }
  };

  // Single Approve
  const handleApprove = async (qId) => {
    if (currentUser && currentUser.role !== 'admin') {
      alert('Permission denied: Only Administrators can approve questions. You are logged in as a Teacher.');
      return;
    }
    try {
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const res = await fetch(`/api/v1/questions/${qId}/approve`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        setQuestions(prev => prev.map(q => q.id === qId ? { ...q, status: 'approved' } : q));
        fetchChapterStats();
        if (onQuestionsUpdated) onQuestionsUpdated();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Approval failed.');
      }
    } catch (e) {
      console.warn('Approval error:', e.message);
    }
  };

  // Single Reject
  const handleReject = async (qId) => {
    if (currentUser && currentUser.role !== 'admin') {
      alert('Permission denied: Only Administrators can reject questions.');
      return;
    }
    try {
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const res = await fetch(`/api/v1/questions/${qId}/reject`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        setQuestions(prev => prev.map(q => q.id === qId ? { ...q, status: 'rejected' } : q));
        fetchChapterStats();
        if (onQuestionsUpdated) onQuestionsUpdated();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Reject failed.');
      }
    } catch (e) {
      console.warn('Reject error:', e.message);
    }
  };

  // Approve All on Current Viewed Page
  const handleApproveAllOnThisPage = async () => {
    if (currentUser && currentUser.role !== 'admin') {
      alert('Permission denied: Only Administrators can approve questions.');
      return;
    }
    const pageQuestions = questions.filter(
      q => q.source_page === previewPageNumber && q.status === 'draft'
    );
    if (pageQuestions.length === 0) {
      setBulkMessage('No draft questions found on this page to approve.');
      setTimeout(() => setBulkMessage(null), 3000);
      return;
    }

    const qIds = pageQuestions.map(q => q.id);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      };
      const res = await fetch('/api/v1/questions/batch-approve', {
        method: 'POST',
        headers,
        body: JSON.stringify({ question_ids: qIds })
      });
      if (res.ok) {
        setQuestions(prev => prev.map(q => qIds.includes(q.id) ? { ...q, status: 'approved' } : q));
        fetchChapterStats();
        setBulkMessage(`Approved ${qIds.length} draft questions on page ${previewPageNumber}!`);
        setTimeout(() => setBulkMessage(null), 3500);
        if (onQuestionsUpdated) onQuestionsUpdated();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Batch approval failed.');
      }
    } catch (e) {
      console.warn('Page approve error:', e.message);
    }
  };

  // Bulk Approve Selected
  const handleBulkApprove = async () => {
    if (currentUser && currentUser.role !== 'admin') {
      alert('Permission denied: Only Administrators can approve questions.');
      return;
    }
    if (selectedQuestionIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      };
      const res = await fetch('/api/v1/questions/batch-approve', {
        method: 'POST',
        headers,
        body: JSON.stringify({ question_ids: selectedQuestionIds })
      });
      if (res.ok) {
        setQuestions(prev => prev.map(q => selectedQuestionIds.includes(q.id) ? { ...q, status: 'approved' } : q));
        setSelectedQuestionIds([]);
        fetchChapterStats();
        setBulkMessage(`Approved ${selectedQuestionIds.length} questions successfully!`);
        setTimeout(() => setBulkMessage(null), 3500);
        if (onQuestionsUpdated) onQuestionsUpdated();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Bulk approval failed.');
      }
    } catch (e) {
      console.warn('Bulk approve error:', e.message);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk Change Chapter
  const handleBulkChangeChapter = async () => {
    if (currentUser && currentUser.role !== 'admin') {
      alert('Permission denied: Only Administrators can bulk-assign chapters.');
      return;
    }
    if (selectedQuestionIds.length === 0 || !bulkTargetChapterId) return;
    setBulkActionLoading(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      };
      const res = await fetch('/api/v1/questions/bulk-chapter', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question_ids: selectedQuestionIds,
          chapter_id: parseInt(bulkTargetChapterId)
        })
      });
      if (res.ok) {
        const json = await res.json();
        setQuestions(prev => prev.map(q => selectedQuestionIds.includes(q.id) ? {
          ...q,
          chapter_id: parseInt(bulkTargetChapterId),
          chapter_name_en: json.chapter_name
        } : q));
        setSelectedQuestionIds([]);
        fetchChapterStats();
        setBulkMessage(json.message);
        setTimeout(() => setBulkMessage(null), 3500);
        if (onQuestionsUpdated) onQuestionsUpdated();
      }
    } catch (e) {
      console.warn('Bulk chapter error:', e.message);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Inline Editing Helpers
  const startEditing = (q) => {
    setEditingQuestionId(q.id);
    setEditFormData({
      question_text: q.question_text || q.question_en || '',
      question_ur: q.question_ur || '',
      type: q.type || 'short',
      marks: q.marks || 1,
      difficulty: q.difficulty || 'medium',
      chapter_id: q.chapter_id,
      correct_answer: q.correct_answer || (q.correct_option_index !== undefined ? String(q.correct_option_index) : '0'),
      options: q.options && Array.isArray(q.options) && q.options.length > 0 
        ? q.options.map(opt => typeof opt === 'object' ? opt.text : String(opt))
        : ['', '', '', '']
    });
  };

  const handleSaveEdit = async (qId) => {
    setSavingEdit(true);
    try {
      const payload = {
        question_text: editFormData.question_text,
        question_ur: editFormData.question_ur,
        type: editFormData.type,
        marks: parseInt(editFormData.marks) || 1,
        difficulty: editFormData.difficulty,
        chapter_id: parseInt(editFormData.chapter_id),
        correct_answer: editFormData.correct_answer,
        options: editFormData.type === 'mcq' ? editFormData.options.map(t => ({ text: t })) : null
      };

      const res = await fetch(`/api/v1/questions/${qId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = await res.json();
        setQuestions(prev => prev.map(q => q.id === qId ? { ...q, ...updated } : q));
        setEditingQuestionId(null);
        fetchChapterStats();
        if (onQuestionsUpdated) onQuestionsUpdated();
      }
    } catch (e) {
      console.warn('Save edit failed:', e.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedQuestionIds.length === questions.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(questions.map(q => q.id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedQuestionIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Resolve metadata lists
  const classesList = backendMetadata?.classes || [{ id: 1, name: '9th' }];
  const currentClassObj = classesList.find(c => c.name === selectedClass) || classesList[0];
  const subjectsList = currentClassObj?.subjects || [];
  const currentSubjectObj = subjectsList.find(s => String(s.id) === String(selectedSubjectId));

  return (
    <div style={{ padding: '16px 20px', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* 1. Page Header & Academic Filters */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        marginBottom: '16px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f2744', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={22} color="#2563eb" />
              Review & Approve Extracted Questions
            </h2>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
              Compare draft questions against original textbook page images, correct text/options, and promote to approved bank.
            </div>
          </div>

          {/* Academic Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', marginRight: '6px' }}>Class:</span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700 }}
              >
                {classesList.map(c => (
                  <option key={c.id || c.name} value={c.name}>Class {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', marginRight: '6px' }}>Subject:</span>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700 }}
              >
                {subjectsList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 2. Chapter Approved Question Counts Bar */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={13} />
            Approved Questions Per Chapter (کل منظور شدہ سوالات):
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setSelectedChapterId('all')}
              style={{
                fontSize: '0.74rem',
                padding: '4px 10px',
                borderRadius: '6px',
                border: selectedChapterId === 'all' ? '1px solid #2563eb' : '1px solid #cbd5e1',
                background: selectedChapterId === 'all' ? '#dbeafe' : '#f8fafc',
                color: selectedChapterId === 'all' ? '#1d4ed8' : '#334155',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              All Chapters ({chapterStats.reduce((sum, c) => sum + c.total_count, 0)})
            </button>

            {chapterStats.map(ch => (
              <button
                key={ch.chapter_id}
                type="button"
                onClick={() => setSelectedChapterId(String(ch.chapter_id))}
                style={{
                  fontSize: '0.74rem',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: selectedChapterId === String(ch.chapter_id) ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  background: selectedChapterId === String(ch.chapter_id) ? '#dbeafe' : '#f8fafc',
                  color: selectedChapterId === String(ch.chapter_id) ? '#1d4ed8' : '#334155',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title={ch.name_ur || ch.name}
              >
                <span style={{ fontWeight: 700 }}>Unit {ch.chapter_number}: {ch.name.slice(0, 20)}...</span>
                <span style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  padding: '1px 5px',
                  borderRadius: '10px',
                  fontSize: '0.68rem',
                  fontWeight: 800
                }}>
                  {ch.approved_count} ✓
                </span>
                {ch.draft_count > 0 && (
                  <span style={{
                    background: '#fef3c7',
                    color: '#b45309',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    fontSize: '0.68rem',
                    fontWeight: 800
                  }}>
                    {ch.draft_count} draft
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {currentUser && currentUser.role !== 'admin' && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lock size={18} color="#b91c1c" />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#991b1b' }}>
                Teacher View (Read-Only Review Mode)
              </div>
              <div style={{ fontSize: '0.78rem', color: '#b91c1c' }}>
                You are logged in as a <strong>Teacher</strong>. Question approval and rejection are restricted to Administrators. You can inspect questions, compare against textbook pages, and search.
              </div>
            </div>
          </div>
          {onSwitchToAdmin && (
            <button
              type="button"
              onClick={onSwitchToAdmin}
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Switch to Admin
            </button>
          )}
        </div>
      )}

      {/* 3. Filter Bar & Bulk Actions */}
      <div style={{
        background: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '12px 18px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>
            <Filter size={13} /> Filters:
          </div>

          {/* Book Filter */}
          <select
            value={selectedBookId}
            onChange={(e) => setSelectedBookId(e.target.value)}
            style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 600 }}
          >
            <option value="all">All Uploaded Books</option>
            {booksList.map(b => (
              <option key={b.id} value={b.id}>{b.title.slice(0, 30)}...</option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 600 }}
          >
            <option value="all">All Types</option>
            <option value="mcq">MCQs</option>
            <option value="short">Short Questions</option>
            <option value="long">Long Questions</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '5px 8px',
              borderRadius: '6px',
              border: statusFilter === 'draft' ? '1px solid #f59e0b' : '1px solid #cbd5e1',
              background: statusFilter === 'draft' ? '#fffbeb' : '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: statusFilter === 'draft' ? '#b45309' : '#334155'
            }}
          >
            <option value="draft">Drafts Only (Awaiting Review)</option>
            <option value="approved">Approved Only (Live in Generator)</option>
            <option value="rejected">Rejected</option>
            <option value="all">All Questions</option>
          </select>

          {/* Search box */}
          <input
            type="text"
            placeholder="Search questions / formula..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') fetchQuestions(); }}
            style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', width: '180px' }}
          />
        </div>

        {/* Global Page Action: Approve All on This Page */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            disabled={currentUser && currentUser.role !== 'admin'}
            onClick={handleApproveAllOnThisPage}
            style={{
              background: (currentUser && currentUser.role !== 'admin') ? '#94a3b8' : '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: (currentUser && currentUser.role !== 'admin') ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: (currentUser && currentUser.role !== 'admin') ? 'none' : '0 2px 4px rgba(16, 185, 129, 0.2)'
            }}
            title={currentUser && currentUser.role !== 'admin' ? "Admin role required to approve questions" : `Approve all draft questions on page ${previewPageNumber}`}
          >
            {currentUser && currentUser.role !== 'admin' ? <Lock size={14} /> : <CheckCircle2 size={14} />} Approve All on Page {previewPageNumber}
          </button>
        </div>
      </div>

      {/* Bulk Operations Toolbar (Visible when questions selected) */}
      {selectedQuestionIds.length > 0 && (
        <div style={{
          background: '#eff6ff',
          border: '1px solid #93c5fd',
          borderRadius: '8px',
          padding: '10px 16px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 800, fontSize: '0.84rem', color: '#1e3a8a' }}>
              {selectedQuestionIds.length} Questions Selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedQuestionIds([])}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Clear Selection
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Bulk Change Chapter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>Move to:</span>
              <select
                value={bulkTargetChapterId}
                onChange={(e) => setBulkTargetChapterId(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
              >
                {chapterStats.map(ch => (
                  <option key={ch.chapter_id} value={ch.chapter_id}>
                    Unit {ch.chapter_number}: {ch.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleBulkChangeChapter}
                disabled={bulkActionLoading}
                style={{
                  background: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Apply Chapter
              </button>
            </div>

            {/* Bulk Approve */}
            <button
              type="button"
              onClick={handleBulkApprove}
              disabled={bulkActionLoading}
              style={{
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Check size={13} /> Approve Selected ({selectedQuestionIds.length})
            </button>
          </div>
        </div>
      )}

      {bulkMessage && (
        <div style={{
          background: '#dcfce7',
          border: '1px solid #86efac',
          borderRadius: '8px',
          padding: '8px 14px',
          marginBottom: '14px',
          color: '#166534',
          fontSize: '0.82rem',
          fontWeight: 700
        }}>
          ✓ {bulkMessage}
        </div>
      )}

      {/* 4. Side-by-Side Comparison Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(380px, 460px) 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* Left Column: Original Textbook Page Viewer */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #cbd5e1',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          position: 'sticky',
          top: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={17} color="#2563eb" />
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f2744' }}>
                Original Textbook Page
              </h3>
            </div>

            {/* Zoom Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setImageZoom(prev => Math.max(50, prev - 25))}
                style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', minWidth: '35px', textAlign: 'center' }}>
                {imageZoom}%
              </span>
              <button
                type="button"
                onClick={() => setImageZoom(prev => Math.min(250, prev + 25))}
                style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>
              <button
                type="button"
                onClick={() => setImageZoom(100)}
                style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
                title="Reset Zoom"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </div>

          {/* Page Navigator */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '6px 10px',
            marginBottom: '10px'
          }}>
            <button
              type="button"
              disabled={previewPageNumber <= 1}
              onClick={() => {
                setPreviewPageNumber(prev => Math.max(1, prev - 1));
                setImageError(false);
              }}
              style={{
                background: previewPageNumber <= 1 ? '#e2e8f0' : '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: previewPageNumber <= 1 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.74rem',
                fontWeight: 700
              }}
            >
              <ChevronLeft size={13} /> Prev
            </button>

            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f2744' }}>
              Page {previewPageNumber} of {previewTotalPages}
            </span>

            <button
              type="button"
              disabled={previewPageNumber >= previewTotalPages}
              onClick={() => {
                setPreviewPageNumber(prev => Math.min(previewTotalPages, prev + 1));
                setImageError(false);
              }}
              style={{
                background: previewPageNumber >= previewTotalPages ? '#e2e8f0' : '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: previewPageNumber >= previewTotalPages ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.74rem',
                fontWeight: 700
              }}
            >
              Next <ChevronRight size={13} />
            </button>
          </div>

          {/* Book Page Image Viewport */}
          <div style={{
            height: '620px',
            overflow: 'auto',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            background: '#334155',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: '8px'
          }}>
            {previewBookId && !imageError ? (
              <img
                key={`${previewBookId}-${previewPageNumber}`}
                src={`/api/v1/books/${previewBookId}/pages/${previewPageNumber}/image`}
                alt={`Book Page ${previewPageNumber}`}
                style={{
                  width: `${imageZoom}%`,
                  maxWidth: 'none',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                  transition: 'width 0.15s ease'
                }}
                onError={() => setImageError(true)}
              />
            ) : (
              <div style={{ color: '#cbd5e1', textAlign: 'center', padding: '60px 20px', fontSize: '0.84rem' }}>
                <AlertCircle size={32} color="#94a3b8" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontWeight: 700 }}>Page Image Preview Unavailable</div>
                <div style={{ fontSize: '0.75rem', marginTop: '4px', color: '#94a3b8' }}>
                  {booksList.length === 0 ? 'Upload a textbook PDF in the Upload tab first.' : 'No preview available for this page.'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Questions Review & Edit Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Header row with Select All */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={toggleSelectAll}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#475569'
                }}
              >
                {selectedQuestionIds.length === questions.length && questions.length > 0 ? (
                  <CheckSquare size={16} color="#2563eb" />
                ) : (
                  <Square size={16} color="#94a3b8" />
                )}
                Select All ({questions.length})
              </button>
            </div>

            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Showing {questions.length} questions
            </span>
          </div>

          {loadingQuestions ? (
            <div style={{ textAlign: 'center', padding: '50px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <Loader2 size={28} className="spin" style={{ margin: '0 auto 8px auto', color: '#2563eb' }} />
              <div style={{ fontWeight: 700, color: '#334155' }}>Loading questions for review...</div>
            </div>
          ) : questions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1',
              color: '#64748b'
            }}>
              <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 10px auto' }} />
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f2744' }}>
                All clear! No questions found for current filter.
              </div>
              <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                Switch filters to "Approved" or "All" to inspect verified question bank items.
              </div>
            </div>
          ) : (
            questions.map((q, idx) => {
              const isSelected = selectedQuestionIds.includes(q.id);
              const isEditing = editingQuestionId === q.id;

              return (
                <div
                  key={q.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '10px',
                    border: isSelected ? '2px solid #2563eb' : q.status === 'draft' ? '1px solid #fde68a' : '1px solid #e2e8f0',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                    padding: '14px 16px',
                    transition: 'border 0.2s'
                  }}
                >
                  {/* Top Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Selection Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleSelectOne(q.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        {isSelected ? <CheckSquare size={17} color="#2563eb" /> : <Square size={17} color="#94a3b8" />}
                      </button>

                      <span style={{ fontWeight: 800, fontSize: '0.74rem', background: '#0f2744', color: '#ffffff', padding: '2px 7px', borderRadius: '4px' }}>
                        #{idx + 1}
                      </span>

                      {/* Source Page badge - Click to jump */}
                      <button
                        type="button"
                        onClick={() => handleJumpToPage(q.source_book_id, q.source_page)}
                        style={{
                          background: previewPageNumber === q.source_page ? '#2563eb' : '#eff6ff',
                          color: previewPageNumber === q.source_page ? '#ffffff' : '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          borderRadius: '4px',
                          padding: '2px 7px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                        title="Click to view original book page side-by-side"
                      >
                        <Eye size={11} /> Page {q.source_page || '?'}
                      </button>

                      <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#f1f5f9', color: '#334155', padding: '2px 6px', borderRadius: '4px' }}>
                        {q.type.toUpperCase()} ({q.marks}M)
                      </span>

                      <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>
                        Unit {q.chapter_no}: {q.chapter_name_en}
                      </span>
                    </div>

                    {/* Status & Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: '10px',
                        background: q.status === 'approved' ? '#dcfce7' : q.status === 'draft' ? '#fef3c7' : '#fee2e2',
                        color: q.status === 'approved' ? '#15803d' : q.status === 'draft' ? '#b45309' : '#991b1b',
                        border: q.status === 'approved' ? '1px solid #86efac' : q.status === 'draft' ? '1px solid #fde68a' : '1px solid #fca5a5'
                      }}>
                        {q.status.toUpperCase()}
                      </span>

                      {!isEditing && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEditing(q)}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              color: '#1e293b'
                            }}
                          >
                            <Edit3 size={11} /> Edit
                          </button>

                          {q.status !== 'approved' && (
                            <button
                              type="button"
                              disabled={currentUser && currentUser.role !== 'admin'}
                              onClick={() => handleApprove(q.id)}
                              style={{
                                background: (currentUser && currentUser.role !== 'admin') ? '#94a3b8' : '#10b981',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '3px 9px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: (currentUser && currentUser.role !== 'admin') ? 'not-allowed' : 'pointer',
                                color: '#ffffff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title={currentUser && currentUser.role !== 'admin' ? "Admin only" : "Approve question"}
                            >
                              {currentUser && currentUser.role !== 'admin' ? <Lock size={10} /> : <Check size={11} />} Approve
                            </button>
                          )}

                          {q.status !== 'rejected' && (
                            <button
                              type="button"
                              disabled={currentUser && currentUser.role !== 'admin'}
                              onClick={() => handleReject(q.id)}
                              style={{
                                background: (currentUser && currentUser.role !== 'admin') ? '#f1f5f9' : '#fee2e2',
                                border: (currentUser && currentUser.role !== 'admin') ? '1px solid #cbd5e1' : '1px solid #fca5a5',
                                borderRadius: '4px',
                                padding: '3px 8px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: (currentUser && currentUser.role !== 'admin') ? 'not-allowed' : 'pointer',
                                color: (currentUser && currentUser.role !== 'admin') ? '#94a3b8' : '#991b1b'
                              }}
                              title={currentUser && currentUser.role !== 'admin' ? "Admin only" : "Reject question"}
                            >
                              Reject
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Body: Editing Mode vs Display Mode */}
                  {isEditing ? (
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>Type:</label>
                          <select
                            value={editFormData.type}
                            onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                            style={{ width: '100%', padding: '4px 6px', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          >
                            <option value="mcq">MCQ</option>
                            <option value="short">Short Question</option>
                            <option value="long">Long Question</option>
                            <option value="fill_blank">Fill in the Blank</option>
                            <option value="true_false">True / False</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>Marks:</label>
                          <input
                            type="number"
                            min="1"
                            value={editFormData.marks}
                            onChange={(e) => setEditFormData({ ...editFormData, marks: e.target.value })}
                            style={{ width: '100%', padding: '4px 6px', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>Difficulty:</label>
                          <select
                            value={editFormData.difficulty}
                            onChange={(e) => setEditFormData({ ...editFormData, difficulty: e.target.value })}
                            style={{ width: '100%', padding: '4px 6px', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>Chapter:</label>
                          <select
                            value={editFormData.chapter_id}
                            onChange={(e) => setEditFormData({ ...editFormData, chapter_id: e.target.value })}
                            style={{ width: '100%', padding: '4px 6px', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          >
                            {chapterStats.map(ch => (
                              <option key={ch.chapter_id} value={ch.chapter_id}>Unit {ch.chapter_number}: {ch.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* English Statement */}
                      <div style={{ marginBottom: '8px' }}>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>English Statement (Supports LaTeX $...$):</label>
                        <textarea
                          rows={2}
                          value={editFormData.question_text}
                          onChange={(e) => setEditFormData({ ...editFormData, question_text: e.target.value })}
                          style={{ width: '100%', padding: '6px 8px', fontSize: '0.82rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        />
                      </div>

                      {/* Urdu Statement */}
                      <div style={{ marginBottom: '8px' }}>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>Urdu Statement (اردو سوال):</label>
                        <textarea
                          rows={2}
                          dir="rtl"
                          className="urdu-text"
                          value={editFormData.question_ur}
                          onChange={(e) => setEditFormData({ ...editFormData, question_ur: e.target.value })}
                          style={{ width: '100%', padding: '6px 8px', fontSize: '0.95rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        />
                      </div>

                      {/* MCQ Options Editing */}
                      {editFormData.type === 'mcq' && (
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                            Options (Select radio for correct answer):
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            {editFormData.options.map((opt, oIdx) => (
                              <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <input
                                  type="radio"
                                  name={`correct-${q.id}`}
                                  checked={String(editFormData.correct_answer) === String(oIdx)}
                                  onChange={() => setEditFormData({ ...editFormData, correct_answer: String(oIdx) })}
                                  title="Mark as correct answer"
                                />
                                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>({String.fromCharCode(65 + oIdx)})</span>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const nextOpts = [...editFormData.options];
                                    nextOpts[oIdx] = e.target.value;
                                    setEditFormData({ ...editFormData, options: nextOpts });
                                  }}
                                  style={{ flex: 1, padding: '3px 6px', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Save & Cancel buttons */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setEditingQuestionId(null)}
                          style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={savingEdit}
                          onClick={() => handleSaveEdit(q.id)}
                          style={{
                            background: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 12px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Save size={12} /> Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: q.question_ur ? '1fr 1fr' : '1fr', gap: '14px', alignItems: 'start' }}>
                        {/* English statement */}
                        <div style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 500, lineHeight: 1.4 }}>
                          {q.question_text || q.question_en}
                        </div>

                        {/* Urdu statement */}
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

                      {/* MCQ Options Display */}
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
                                  border: isCorrect ? '1px solid #4ade80' : '1px solid #e2e8f0',
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
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
