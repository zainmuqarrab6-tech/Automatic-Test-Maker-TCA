import React, { useState, useEffect } from 'react';
import {
  Layers,
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Upload,
  FileText,
  Sparkles,
  RefreshCw,
  Sliders,
  Check,
  X,
  Clock,
  Award,
  BookOpen,
  HelpCircle,
  ArrowRight,
  Loader2
} from 'lucide-react';

export default function SchemeAndSyllabusManager({ backendMetadata, onUpdated }) {
  // Navigation tabs: 'syllabus' | 'schemes'
  const [activeTab, setActiveTab] = useState('syllabus');

  // Academic selectors
  const [selectedClass, setSelectedClass] = useState('9th');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  // Syllabus Divisions State
  const [divisions, setDivisions] = useState([]);
  const [loadingDivisions, setLoadingDivisions] = useState(false);
  const [showDivisionModal, setShowDivisionModal] = useState(false);
  const [editingDivisionId, setEditingDivisionId] = useState(null);
  const [divisionName, setDivisionName] = useState('');
  const [divisionDescription, setDivisionDescription] = useState('');
  const [selectedChapterWeights, setSelectedChapterWeights] = useState({}); // { [chapterId]: { selected: bool, weight: number } }

  // Paper Schemes State
  const [schemes, setSchemes] = useState([]);
  const [loadingSchemes, setLoadingSchemes] = useState(false);
  const [schemeMode, setSchemeMode] = useState('manual'); // 'manual' | 'ai_upload'
  const [editingSchemeId, setEditingSchemeId] = useState(null);
  const [schemeName, setSchemeName] = useState('');
  const [schemeTotalMarks, setSchemeTotalMarks] = useState(75);
  const [schemeDuration, setSchemeDuration] = useState(150);
  const [schemeInstructions, setSchemeInstructions] = useState('Attempt all sections as directed. Write neat and clean answers.');
  const [sections, setSections] = useState([
    {
      section_name: 'Section A',
      question_type: 'mcq',
      number_of_questions: 15,
      number_to_attempt: 15,
      marks_per_question: 1
    },
    {
      section_name: 'Section B (Q2)',
      question_type: 'short',
      number_of_questions: 9,
      number_to_attempt: 6,
      marks_per_question: 2
    },
    {
      section_name: 'Section C (Long)',
      question_type: 'long',
      number_of_questions: 3,
      number_to_attempt: 2,
      marks_per_question: 8
    }
  ]);

  // AI Extraction State
  const [uploadFile, setUploadFile] = useState(null);
  const [extractingAI, setExtractingAI] = useState(false);
  const [aiExtractionNotice, setAiExtractionNotice] = useState(null);
  const [aiExtractionError, setAiExtractionError] = useState(null);

  // Global action feedback
  const [statusMessage, setStatusMessage] = useState(null);

  // Compute available subjects and chapters for selected class
  const classObj = backendMetadata?.classes?.find(c => c.name === selectedClass);
  const availableSubjects = classObj?.subjects || [];
  
  // Set initial subject once available
  useEffect(() => {
    if (availableSubjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(String(availableSubjects[0].id));
    } else if (availableSubjects.length > 0 && !availableSubjects.some(s => String(s.id) === String(selectedSubjectId))) {
      setSelectedSubjectId(String(availableSubjects[0].id));
    }
  }, [availableSubjects, selectedSubjectId]);

  const currentSubject = availableSubjects.find(s => String(s.id) === String(selectedSubjectId));
  const currentChapters = currentSubject?.chapters || [];

  // Fetch Syllabus Divisions & Paper Schemes whenever subject changes
  const loadData = async () => {
    if (!selectedSubjectId) return;

    // Load Syllabus Divisions
    setLoadingDivisions(true);
    try {
      const res = await fetch(`/api/v1/syllabus-divisions?subject_id=${selectedSubjectId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setDivisions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Error loading syllabus divisions:', err);
    } finally {
      setLoadingDivisions(false);
    }

    // Load Paper Schemes
    setLoadingSchemes(true);
    try {
      const res = await fetch(`/api/v1/schemes?subject_id=${selectedSubjectId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSchemes(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Error loading paper schemes:', err);
    } finally {
      setLoadingSchemes(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSubjectId]);

  // Flash temporary feedback message
  const showFeedback = (text, type = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // ==========================================
  // SYLLABUS DIVISION LOGIC
  // ==========================================
  const handleOpenDivisionModal = (divToEdit = null) => {
    if (divToEdit) {
      setEditingDivisionId(divToEdit.id);
      setDivisionName(divToEdit.name || '');
      setDivisionDescription(divToEdit.description || '');

      const initialWeights = {};
      currentChapters.forEach(ch => {
        const found = divToEdit.chapter_weightages?.find(w => w.chapter_id === ch.id);
        const isTicked = divToEdit.chapter_ids?.includes(ch.id) || !!found;
        initialWeights[ch.id] = {
          selected: isTicked,
          weight: found?.weightage_percent || 0.0
        };
      });
      setSelectedChapterWeights(initialWeights);
    } else {
      setEditingDivisionId(null);
      setDivisionName(`Term ${divisions.length + 1} Assessment`);
      setDivisionDescription('');

      const initialWeights = {};
      currentChapters.forEach(ch => {
        initialWeights[ch.id] = { selected: false, weight: 0.0 };
      });
      setSelectedChapterWeights(initialWeights);
    }
    setShowDivisionModal(true);
  };

  const handleToggleChapter = (chId) => {
    setSelectedChapterWeights(prev => {
      const current = prev[chId] || { selected: false, weight: 0.0 };
      return {
        ...prev,
        [chId]: {
          ...current,
          selected: !current.selected
        }
      };
    });
  };

  const handleWeightChange = (chId, val) => {
    const num = parseFloat(val) || 0;
    setSelectedChapterWeights(prev => ({
      ...prev,
      [chId]: {
        ...(prev[chId] || { selected: true }),
        weight: Math.max(0, Math.min(100, num))
      }
    }));
  };

  const handleSelectAllChapters = () => {
    setSelectedChapterWeights(prev => {
      const updated = { ...prev };
      currentChapters.forEach(ch => {
        updated[ch.id] = { selected: true, weight: prev[ch.id]?.weight || 0 };
      });
      return updated;
    });
  };

  const handleDeselectAllChapters = () => {
    setSelectedChapterWeights(prev => {
      const updated = { ...prev };
      currentChapters.forEach(ch => {
        updated[ch.id] = { selected: false, weight: 0 };
      });
      return updated;
    });
  };

  const handleEqualizeWeightages = () => {
    const selectedIds = Object.keys(selectedChapterWeights).filter(id => selectedChapterWeights[id]?.selected);
    if (selectedIds.length === 0) return;

    const evenWeight = parseFloat((100 / selectedIds.length).toFixed(1));
    setSelectedChapterWeights(prev => {
      const updated = { ...prev };
      selectedIds.forEach(id => {
        updated[id] = { ...updated[id], weight: evenWeight };
      });
      return updated;
    });
  };

  // Calculate sum of weightages
  const totalWeightageSum = Object.keys(selectedChapterWeights)
    .filter(id => selectedChapterWeights[id]?.selected)
    .reduce((sum, id) => sum + (parseFloat(selectedChapterWeights[id]?.weight) || 0), 0);

  const handleSaveDivision = async (e) => {
    e.preventDefault();
    if (!divisionName.trim()) {
      alert('Please enter a syllabus division name (e.g. Midterm).');
      return;
    }

    const tickedIds = Object.keys(selectedChapterWeights)
      .filter(id => selectedChapterWeights[id]?.selected)
      .map(id => parseInt(id, 10));

    if (tickedIds.length === 0) {
      alert('Please tick at least one chapter belonging to this syllabus division.');
      return;
    }

    const chapterWeightsList = tickedIds.map(id => ({
      chapter_id: id,
      weightage_percent: selectedChapterWeights[id]?.weight || 0.0
    }));

    const payload = {
      subject_id: parseInt(selectedSubjectId, 10),
      name: divisionName.trim(),
      description: divisionDescription.trim() || null,
      chapter_ids: tickedIds,
      chapter_weightages: chapterWeightsList
    };

    try {
      const url = editingDivisionId
        ? `/api/v1/syllabus-divisions/${editingDivisionId}`
        : `/api/v1/syllabus-divisions`;
      const method = editingDivisionId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showFeedback(
          editingDivisionId
            ? `Syllabus Division "${divisionName}" updated successfully!`
            : `Syllabus Division "${divisionName}" created successfully!`
        );
        setShowDivisionModal(false);
        loadData();
        if (onUpdated) onUpdated();
      } else {
        const err = await res.json();
        alert(`Error saving division: ${err.detail || 'Request failed'}`);
      }
    } catch (err) {
      alert(`Network error saving division: ${err.message}`);
    }
  };

  const handleDeleteDivision = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete syllabus division "${name}"?`)) return;

    try {
      const res = await fetch(`/api/v1/syllabus-divisions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showFeedback(`Syllabus division "${name}" removed.`, 'info');
        loadData();
      }
    } catch (err) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  // ==========================================
  // PAPER SCHEME LOGIC & REAL-TIME VALIDATION
  // ==========================================
  const calculateTotalSectionMarks = (secs = sections) => {
    return secs.reduce((sum, sec) => {
      const attempt = parseInt(sec.number_to_attempt, 10) || 0;
      const marksEa = parseInt(sec.marks_per_question, 10) || 0;
      return sum + (attempt * marksEa);
    }, 0);
  };

  const calculatedSectionMarks = calculateTotalSectionMarks();
  const marksDifference = calculatedSectionMarks - (parseInt(schemeTotalMarks, 10) || 0);
  const isMarksBalanced = marksDifference === 0;

  const handleAddSection = (preset = null) => {
    let newSec = {
      section_name: `Section ${String.fromCharCode(65 + sections.length)}`,
      question_type: 'short',
      number_of_questions: 8,
      number_to_attempt: 5,
      marks_per_question: 2
    };

    if (preset === 'mcq') {
      newSec = {
        section_name: 'Section A (MCQs)',
        question_type: 'mcq',
        number_of_questions: 15,
        number_to_attempt: 15,
        marks_per_question: 1
      };
    } else if (preset === 'short') {
      newSec = {
        section_name: `Section B (Q${sections.length + 1})`,
        question_type: 'short',
        number_of_questions: 9,
        number_to_attempt: 6,
        marks_per_question: 2
      };
    } else if (preset === 'long') {
      newSec = {
        section_name: `Section C (Long Questions)`,
        question_type: 'long',
        number_of_questions: 3,
        number_to_attempt: 2,
        marks_per_question: 8
      };
    }

    setSections(prev => [...prev, newSec]);
  };

  const handleUpdateSection = (index, field, value) => {
    setSections(prev => {
      const updated = [...prev];
      let val = value;
      if (['number_of_questions', 'number_to_attempt', 'marks_per_question'].includes(field)) {
        val = parseInt(value, 10) || 0;
      }
      updated[index] = { ...updated[index], [field]: val };

      // Ensure attempt doesn't exceed total questions
      if (field === 'number_of_questions' && updated[index].number_to_attempt > val) {
        updated[index].number_to_attempt = val;
      }
      return updated;
    });
  };

  const handleRemoveSection = (index) => {
    if (sections.length <= 1) {
      alert('A paper scheme must contain at least one section.');
      return;
    }
    setSections(prev => prev.filter((_, i) => i !== index));
  };

  const handleResetSchemeForm = () => {
    setEditingSchemeId(null);
    setSchemeName(`${selectedClass} ${currentSubject?.name || 'Subject'} Board Scheme 2026`);
    setSchemeTotalMarks(75);
    setSchemeDuration(150);
    setSchemeInstructions('Attempt all sections as directed. Write neat and clean answers.');
    setSections([
      {
        section_name: 'Section A',
        question_type: 'mcq',
        number_of_questions: 15,
        number_to_attempt: 15,
        marks_per_question: 1
      },
      {
        section_name: 'Section B (Short)',
        question_type: 'short',
        number_of_questions: 9,
        number_to_attempt: 6,
        marks_per_question: 2
      },
      {
        section_name: 'Section C (Long)',
        question_type: 'long',
        number_of_questions: 3,
        number_to_attempt: 2,
        marks_per_question: 8
      }
    ]);
    setAiExtractionNotice(null);
    setAiExtractionError(null);
  };

  const handleEditScheme = (scheme) => {
    setEditingSchemeId(scheme.id);
    setSchemeName(scheme.name);
    setSchemeTotalMarks(scheme.total_marks);
    setSchemeDuration(scheme.duration_minutes);
    setSchemeInstructions(scheme.instructions || '');

    if (scheme.sections && scheme.sections.length > 0) {
      setSections(scheme.sections.map(s => ({
        section_name: s.section_name,
        question_type: s.question_type,
        number_of_questions: s.number_of_questions,
        number_to_attempt: s.number_to_attempt,
        marks_per_question: s.marks_per_question
      })));
    }
    setSchemeMode('manual');
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleSaveScheme = async (e) => {
    e.preventDefault();
    if (!schemeName.trim()) {
      alert('Please provide a name for this paper scheme.');
      return;
    }

    if (!isMarksBalanced) {
      const confirmSave = window.confirm(
        `⚠️ Validation Warning:\n\nSection marks sum to ${calculatedSectionMarks} Marks, but Total Paper Marks is set to ${schemeTotalMarks} Marks.\nDifference: ${marksDifference > 0 ? '+' : ''}${marksDifference} Marks.\n\nDo you still wish to proceed and save this scheme?`
      );
      if (!confirmSave) return;
    }

    const payload = {
      subject_id: parseInt(selectedSubjectId, 10),
      name: schemeName.trim(),
      total_marks: parseInt(schemeTotalMarks, 10),
      duration_minutes: parseInt(schemeDuration, 10),
      instructions: schemeInstructions.trim() || null,
      sections: sections.map(s => ({
        section_name: s.section_name,
        question_type: s.question_type,
        number_of_questions: s.number_of_questions,
        number_to_attempt: s.number_to_attempt,
        marks_per_question: s.marks_per_question
      }))
    };

    try {
      const url = editingSchemeId
        ? `/api/v1/schemes/${editingSchemeId}`
        : `/api/v1/schemes`;
      const method = editingSchemeId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showFeedback(
          editingSchemeId
            ? `Paper Scheme "${schemeName}" updated successfully!`
            : `Paper Scheme "${schemeName}" saved successfully!`
        );
        handleResetSchemeForm();
        loadData();
        if (onUpdated) onUpdated();
      } else {
        const err = await res.json();
        alert(`Error saving scheme: ${err.detail || 'Request failed'}`);
      }
    } catch (err) {
      alert(`Network error saving scheme: ${err.message}`);
    }
  };

  const handleDeleteScheme = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete paper scheme "${name}"?`)) return;

    try {
      const res = await fetch(`/api/v1/schemes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showFeedback(`Paper scheme "${name}" deleted.`, 'info');
        loadData();
      }
    } catch (err) {
      alert(`Failed to delete scheme: ${err.message}`);
    }
  };

  // ==========================================
  // AI UPLOAD & AUTO-FILL HANDLER
  // ==========================================
  const handleAiFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Please choose or drop a paper scheme document (PDF, PNG, JPG, WEBP).');
      return;
    }

    // File size limit check (15MB)
    const MAX_SCHEME_SIZE = 15 * 1024 * 1024;
    if (uploadFile.size > MAX_SCHEME_SIZE) {
      alert(`File is too large (${(uploadFile.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed scheme file size is 15MB.`);
      return;
    }

    setExtractingAI(true);
    setAiExtractionNotice(null);
    setAiExtractionError(null);

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const res = await fetch('/api/v1/schemes/extract-ai', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        // Pre-fill manual form with AI extracted scheme
        if (data.name) setSchemeName(data.name);
        if (data.total_marks) setSchemeTotalMarks(data.total_marks);
        if (data.duration_minutes) setSchemeDuration(data.duration_minutes);
        if (data.instructions) setSchemeInstructions(data.instructions);

        if (Array.isArray(data.sections) && data.sections.length > 0) {
          setSections(data.sections.map(s => ({
            section_name: s.section_name || 'Section',
            question_type: s.question_type || 'short',
            number_of_questions: s.number_of_questions || 1,
            number_to_attempt: s.number_to_attempt || 1,
            marks_per_question: s.marks_per_question || 1
          })));
        }

        setAiExtractionNotice({
          text: `AI Extraction Successful! Scheme layout extracted from "${uploadFile.name}". The manual form below has been pre-filled. Please review and make any adjustments before saving.`,
          warning: data.validation_warning
        });

        // Switch to manual view with pre-filled fields
        setSchemeMode('manual');
      } else {
        const err = await res.json();
        setAiExtractionError(`AI Extraction failed: ${err.detail || 'Could not process file'}`);
      }
    } catch (err) {
      setAiExtractionError(`Connection error during AI extraction: ${err.message}`);
    } finally {
      setExtractingAI(false);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem', width: '100%' }}>
      {/* Page Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f2744 0%, #1e3a8a 100%)',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        color: '#ffffff',
        marginBottom: '1.5rem',
        boxShadow: '0 10px 25px rgba(15, 39, 68, 0.25)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              background: '#d97706',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sliders size={22} color="#ffffff" />
            </span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
              Paper Scheme & Syllabus Division Manager
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.9 }}>
            <span style={{ fontSize: '0.92rem' }}>
              Configure term exam syllabi, chapter weightages, and pairing schemes (manual or AI digitized)
            </span>
            <span className="urdu-text" style={{ fontSize: '1.1rem', color: '#fbbf24' }}>
              پیپر سکیم اور نصاب کی تقسیم
            </span>
          </div>
        </div>

        {/* Global Academic Selector Controls */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#93c5fd' }}>
              Class / Grade
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '0.9rem',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {(backendMetadata?.classes || [{ name: '9th' }, { name: '10th' }, { name: '11th' }, { name: '12th' }]).map(c => (
                <option key={c.name} value={c.name} style={{ color: '#0f172a', background: '#ffffff' }}>
                  Class {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#93c5fd' }}>
              Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '0.9rem',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
                minWidth: '180px'
              }}
            >
              {availableSubjects.map(s => (
                <option key={s.id} value={s.id} style={{ color: '#0f172a', background: '#ffffff' }}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadData}
            title="Refresh from database"
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '8px',
              padding: '9px 12px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: '18px'
            }}
          >
            <RefreshCw size={14} className={loadingDivisions || loadingSchemes ? 'spin' : ''} />
            Sync
          </button>
        </div>
      </div>

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 600,
          fontSize: '0.9rem',
          background: statusMessage.type === 'info' ? '#eff6ff' : '#dcfce7',
          color: statusMessage.type === 'info' ? '#1e40af' : '#166534',
          border: statusMessage.type === 'info' ? '1px solid #bfdbfe' : '1px solid #86efac'
        }}>
          <CheckCircle2 size={18} />
          {statusMessage.text}
        </div>
      )}

      {/* Main Switcher Tabs (Syllabus Division vs Paper Scheme) */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '1.75rem',
        paddingBottom: '2px'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('syllabus')}
          style={{
            padding: '10px 20px',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'syllabus' ? '3px solid #0f2744' : '3px solid transparent',
            color: activeTab === 'syllabus' ? '#0f2744' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Layers size={18} color={activeTab === 'syllabus' ? '#0f2744' : '#94a3b8'} />
          Syllabus Divisions
          <span style={{
            fontSize: '0.74rem',
            background: activeTab === 'syllabus' ? '#e0f2fe' : '#f1f5f9',
            color: activeTab === 'syllabus' ? '#0369a1' : '#64748b',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: 800
          }}>
            {divisions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('schemes')}
          style={{
            padding: '10px 20px',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'schemes' ? '3px solid #0f2744' : '3px solid transparent',
            color: activeTab === 'schemes' ? '#0f2744' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FileSpreadsheet size={18} color={activeTab === 'schemes' ? '#0f2744' : '#94a3b8'} />
          Paper Schemes (Manual & AI Upload)
          <span style={{
            fontSize: '0.74rem',
            background: activeTab === 'schemes' ? '#e0f2fe' : '#f1f5f9',
            color: activeTab === 'schemes' ? '#0369a1' : '#64748b',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: 800
          }}>
            {schemes.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SYLLABUS DIVISIONS VIEW                                            */}
      {/* ========================================================================= */}
      {activeTab === 'syllabus' && (
        <div>
          {/* Action Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Syllabus Divisions for {selectedClass} {currentSubject?.name || 'Subject'}
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '3px 0 0' }}>
                Group chapters into exam terms (e.g. Midterm, 1st Term, Final Mock) and optionally allocate weightage percentages.
              </p>
            </div>

            <button
              onClick={() => handleOpenDivisionModal()}
              style={{
                background: 'linear-gradient(135deg, #0f2744 0%, #1e3a8a 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 18px',
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(15, 39, 68, 0.2)'
              }}
            >
              <Plus size={16} />
              Create Syllabus Division
            </button>
          </div>

          {/* Existing Divisions Cards List */}
          {loadingDivisions ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <Loader2 size={32} className="spin" style={{ margin: '0 auto 10px', display: 'block' }} />
              Loading syllabus divisions...
            </div>
          ) : divisions.length === 0 ? (
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '2px dashed #cbd5e1',
              padding: '3rem 2rem',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <Layers size={42} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                No Syllabus Divisions Found for {selectedClass} {currentSubject?.name}
              </h4>
              <p style={{ fontSize: '0.88rem', maxWidth: '480px', margin: '0 auto 18px' }}>
                Create your first syllabus division (e.g. "Midterm Exam") to select which chapters will be tested and assign chapter weightages.
              </p>
              <button
                onClick={() => handleOpenDivisionModal()}
                style={{
                  background: '#0f2744',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                + Create "Midterm Exam" Division
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
              {divisions.map(div => {
                const totalWeight = (div.chapter_weightages || []).reduce((acc, w) => acc + (w.weightage_percent || 0), 0);
                return (
                  <div
                    key={div.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      {/* Card Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            {div.name}
                          </h4>
                          {div.description && (
                            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0' }}>
                              {div.description}
                            </p>
                          )}
                        </div>

                        {/* Weightage Badge */}
                        <div style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '3px 9px',
                          borderRadius: '20px',
                          background: totalWeight === 100 ? '#dcfce7' : totalWeight > 0 ? '#fef3c7' : '#f1f5f9',
                          color: totalWeight === 100 ? '#166534' : totalWeight > 0 ? '#92400e' : '#475569',
                          border: totalWeight === 100 ? '1px solid #86efac' : totalWeight > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0'
                        }}>
                          {totalWeight > 0 ? `${totalWeight}% Weight` : 'Equal Weight'}
                        </div>
                      </div>

                      {/* Chapters Badge count */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                        <span style={{
                          fontSize: '0.76rem',
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontWeight: 700
                        }}>
                          {div.chapter_ids?.length || 0} Chapters Included
                        </span>
                      </div>

                      {/* Chapters breakdown */}
                      <div style={{
                        background: '#f8fafc',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        marginBottom: '12px',
                        maxHeight: '140px',
                        overflowY: 'auto',
                        border: '1px solid #e2e8f0'
                      }}>
                        {div.chapter_ids && div.chapter_ids.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {div.chapter_ids.map(chId => {
                              const chObj = currentChapters.find(c => c.id === chId);
                              const weightObj = div.chapter_weightages?.find(w => w.chapter_id === chId);
                              const wVal = weightObj?.weightage_percent;
                              return (
                                <div
                                  key={chId}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '0.8rem',
                                    color: '#334155'
                                  }}
                                >
                                  <span>
                                    <strong>Unit {chObj?.chapter_number || chId}:</strong> {chObj?.name || `Chapter ${chId}`}
                                  </span>
                                  {wVal !== undefined && wVal > 0 && (
                                    <span style={{ fontWeight: 700, color: '#d97706', fontSize: '0.75rem' }}>
                                      {wVal}%
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No chapters linked</span>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                      <button
                        onClick={() => handleOpenDivisionModal(div)}
                        style={{
                          background: '#f8fafc',
                          color: '#0f2744',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer'
                        }}
                      >
                        <Edit2 size={13} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteDivision(div.id, div.name)}
                        style={{
                          background: '#fff1f2',
                          color: '#e11d48',
                          border: '1px solid #fecdd3',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Division Create / Edit Modal Dialog */}
          {showDivisionModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1.5rem',
              backdropFilter: 'blur(4px)'
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                maxWidth: '720px',
                width: '100%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                overflow: 'hidden'
              }}>
                {/* Modal Header */}
                <div style={{
                  padding: '1.25rem 1.5rem',
                  background: '#0f2744',
                  color: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                      {editingDivisionId ? 'Edit Syllabus Division' : 'Create New Syllabus Division'}
                    </h3>
                    <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>
                      {selectedClass} • {currentSubject?.name}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowDivisionModal(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ffffff',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSaveDivision} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                  <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          Division Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={divisionName}
                          onChange={(e) => setDivisionName(e.target.value)}
                          placeholder="e.g. Midterm Examination, 1st Term"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          Description (Optional)
                        </label>
                        <input
                          type="text"
                          value={divisionDescription}
                          onChange={(e) => setDivisionDescription(e.target.value)}
                          placeholder="e.g. Units 1 to 4 coverage"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>

                    {/* Chapter Selection Matrix Header */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                        Tick Chapters & Set Weightages (%):
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={handleSelectAllChapters}
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={handleDeselectAllChapters}
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Deselect All
                        </button>
                        <button
                          type="button"
                          onClick={handleEqualizeWeightages}
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Equalize Weightages
                        </button>
                      </div>
                    </div>

                    {/* Chapters List */}
                    <div style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      maxHeight: '260px',
                      overflowY: 'auto',
                      marginBottom: '1rem'
                    }}>
                      {currentChapters.length === 0 ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                          No chapters registered for this subject.
                        </div>
                      ) : (
                        currentChapters.map(ch => {
                          const state = selectedChapterWeights[ch.id] || { selected: false, weight: 0.0 };
                          return (
                            <div
                              key={ch.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 14px',
                                borderBottom: '1px solid #f1f5f9',
                                background: state.selected ? '#f8fafc' : '#ffffff'
                              }}
                            >
                              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
                                <input
                                  type="checkbox"
                                  checked={state.selected}
                                  onChange={() => handleToggleChapter(ch.id)}
                                  style={{ width: '16px', height: '16px', accentColor: '#0f2744', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '0.86rem', fontWeight: state.selected ? 700 : 500, color: '#1e293b' }}>
                                  Unit {ch.chapter_number}: {ch.name}
                                </span>
                                {ch.name_ur && (
                                  <span className="urdu-text" style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                    {ch.name_ur}
                                  </span>
                                )}
                              </label>

                              {/* Weightage % input */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                                  Weight:
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  disabled={!state.selected}
                                  value={state.weight || 0}
                                  onChange={(e) => handleWeightChange(ch.id, e.target.value)}
                                  style={{
                                    width: '65px',
                                    padding: '4px 6px',
                                    fontSize: '0.84rem',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    textAlign: 'right',
                                    fontWeight: 700,
                                    background: state.selected ? '#ffffff' : '#f1f5f9',
                                    color: state.selected ? '#0f2744' : '#94a3b8'
                                  }}
                                />
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>%</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Weightage Live Progress Bar & Alert */}
                    <div style={{
                      background: totalWeightageSum === 100 ? '#f0fdf4' : totalWeightageSum > 100 ? '#fef2f2' : '#f8fafc',
                      border: totalWeightageSum === 100 ? '1px solid #bbf7d0' : totalWeightageSum > 100 ? '1px solid #fecaca' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {totalWeightageSum === 100 ? (
                          <CheckCircle2 size={18} color="#16a34a" />
                        ) : totalWeightageSum > 100 ? (
                          <AlertTriangle size={18} color="#dc2626" />
                        ) : (
                          <HelpCircle size={18} color="#0284c7" />
                        )}
                        <span style={{
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          color: totalWeightageSum === 100 ? '#15803d' : totalWeightageSum > 100 ? '#b91c1c' : '#0369a1'
                        }}>
                          {totalWeightageSum === 100
                            ? 'Weightage perfectly balanced (100%)'
                            : totalWeightageSum > 100
                            ? `Warning: Total weightage exceeds 100% (Currently ${totalWeightageSum.toFixed(1)}%)`
                            : totalWeightageSum > 0
                            ? `Total weightage: ${totalWeightageSum.toFixed(1)}% (Optional: Balance to 100%)`
                            : 'No weightages specified (chapters will be weighted equally)'}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        color: totalWeightageSum === 100 ? '#15803d' : totalWeightageSum > 100 ? '#b91c1c' : '#334155'
                      }}>
                        {totalWeightageSum.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div style={{
                    padding: '1rem 1.5rem',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px'
                  }}>
                    <button
                      type="button"
                      onClick={() => setShowDivisionModal(false)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        color: '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{
                        background: '#0f2744',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 20px',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Save Syllabus Division
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PAPER SCHEMES (MANUAL & AI UPLOAD)                                 */}
      {/* ========================================================================= */}
      {activeTab === 'schemes' && (
        <div>
          {/* Submode Switcher: Manual vs AI Upload */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '1.25rem',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '10px',
            width: 'fit-content'
          }}>
            <button
              type="button"
              onClick={() => setSchemeMode('manual')}
              style={{
                background: schemeMode === 'manual' ? '#ffffff' : 'transparent',
                color: schemeMode === 'manual' ? '#0f2744' : '#64748b',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 18px',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: schemeMode === 'manual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <FileSpreadsheet size={15} />
              Manual Scheme Builder
            </button>

            <button
              type="button"
              onClick={() => setSchemeMode('ai_upload')}
              style={{
                background: schemeMode === 'ai_upload' ? '#ffffff' : 'transparent',
                color: schemeMode === 'ai_upload' ? '#0f2744' : '#64748b',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 18px',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: schemeMode === 'ai_upload' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <Sparkles size={15} color="#d97706" />
              Upload & AI Auto-Fill (PDF / Photo)
            </button>
          </div>

          {/* AI UPLOAD ZONE */}
          {schemeMode === 'ai_upload' && (
            <div style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '2rem',
              marginBottom: '2rem',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
            }}>
              <div style={{ textAlign: 'center', maxWidth: '580px', margin: '0 auto 1.5rem' }}>
                <span style={{
                  background: '#fef3c7',
                  color: '#b45309',
                  padding: '8px',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '10px'
                }}>
                  <Upload size={28} />
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                  Upload Paper Scheme or Pairing Document
                </h3>
                <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
                  Upload your board scheme or model paper syllabus (PDF, PNG, JPG, or phone photo).
                  Gemini AI will extract all sections, question types, attempt counts, and marks, then pre-fill the form for your review.
                </p>
              </div>

              {/* File Dropzone */}
              <div
                style={{
                  border: '2px dashed #93c5fd',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  padding: '2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  marginBottom: '1.25rem'
                }}
                onClick={() => document.getElementById('scheme-file-input').click()}
              >
                <input
                  id="scheme-file-input"
                  type="file"
                  accept=".pdf, .png, .jpg, .jpeg, .webp"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                />
                <FileText size={36} color="#3b82f6" style={{ margin: '0 auto 8px', display: 'block' }} />
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e293b', display: 'block' }}>
                  {uploadFile ? uploadFile.name : 'Click to browse or drop scheme file here'}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Supports PDF, PNG, JPG, JPEG, WEBP (Max 25MB)
                </span>
              </div>

              {aiExtractionError && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '0.86rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertTriangle size={16} />
                  {aiExtractionError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  type="button"
                  disabled={!uploadFile || extractingAI}
                  onClick={handleAiFileUpload}
                  style={{
                    background: uploadFile && !extractingAI ? 'linear-gradient(135deg, #0f2744 0%, #1e3a8a 100%)' : '#cbd5e1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 24px',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    cursor: uploadFile && !extractingAI ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 10px rgba(15, 39, 68, 0.2)'
                  }}
                >
                  {extractingAI ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      Analyzing Document with Gemini AI...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} color="#fbbf24" />
                      Scan & Extract Scheme into Form
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* AI Extraction Success Notification */}
          {aiExtractionNotice && (
            <div style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              color: '#065f46'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '0.92rem' }}>
                <CheckCircle2 size={18} color="#059669" />
                {aiExtractionNotice.text}
              </div>
              {aiExtractionNotice.warning && (
                <div style={{ fontSize: '0.84rem', color: '#92400e', marginTop: '6px', fontWeight: 600 }}>
                  ⚠️ Note: {aiExtractionNotice.warning}
                </div>
              )}
            </div>
          )}

          {/* MANUAL FORM BUILDER (Also used to review & save AI Extracted schemes) */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '1.75rem',
            marginBottom: '2rem',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {editingSchemeId ? 'Edit Paper Scheme' : 'Manual Paper Scheme Builder'}
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Define paper sections, attempt limits, question types, and validation rules.
                </span>
              </div>

              {editingSchemeId && (
                <button
                  type="button"
                  onClick={handleResetSchemeForm}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel Edit Mode
                </button>
              )}
            </div>

            <form onSubmit={handleSaveScheme}>
              {/* Header Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Scheme Title / Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={schemeName}
                    onChange={(e) => setSchemeName(e.target.value)}
                    placeholder="e.g. 9th Mathematics Board Scheme 2026"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Total Paper Marks *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="300"
                    value={schemeTotalMarks}
                    onChange={(e) => setSchemeTotalMarks(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      fontWeight: 700
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Time Allowed (Minutes) *
                  </label>
                  <input
                    type="number"
                    required
                    min="15"
                    max="360"
                    value={schemeDuration}
                    onChange={(e) => setSchemeDuration(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      fontWeight: 700
                    }}
                  />
                </div>
              </div>

              {/* Instructions */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Student Instructions (Printed at Top of Paper)
                </label>
                <textarea
                  rows={2}
                  value={schemeInstructions}
                  onChange={(e) => setSchemeInstructions(e.target.value)}
                  placeholder="e.g. Attempt all sections as directed. Fill in MCQ bubble sheet within first 20 minutes."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Sections Table Toolbar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Exam Paper Sections ({sections.length})
                </h4>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleAddSection('mcq')}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    + Add MCQ Section
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSection('short')}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    + Add Short Section
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSection('long')}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    + Add Long Section
                  </button>
                </div>
              </div>

              {/* Sections Interactive Table */}
              <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px' }}>Section Name</th>
                      <th style={{ padding: '10px 12px' }}>Question Type</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Total Qs</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>To Attempt</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Marks Each</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Section Marks</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((sec, idx) => {
                      const secTotal = (parseInt(sec.number_to_attempt, 10) || 0) * (parseInt(sec.marks_per_question, 10) || 0);
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 10px' }}>
                            <input
                              type="text"
                              value={sec.section_name}
                              onChange={(e) => handleUpdateSection(idx, 'section_name', e.target.value)}
                              placeholder="e.g. Section A"
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.84rem'
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <select
                              value={sec.question_type}
                              onChange={(e) => handleUpdateSection(idx, 'question_type', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.84rem'
                              }}
                            >
                              <option value="mcq">Multiple Choice (MCQ)</option>
                              <option value="short">Short Question</option>
                              <option value="long">Long Question / Problem</option>
                              <option value="fill_blank">Fill in the Blank</option>
                              <option value="true_false">True / False</option>
                              <option value="matching">Matching Columns</option>
                            </select>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={sec.number_of_questions}
                              onChange={(e) => handleUpdateSection(idx, 'number_of_questions', e.target.value)}
                              style={{
                                width: '60px',
                                padding: '6px 4px',
                                textAlign: 'center',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontWeight: 700
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="1"
                              max={sec.number_of_questions}
                              value={sec.number_to_attempt}
                              onChange={(e) => handleUpdateSection(idx, 'number_to_attempt', e.target.value)}
                              style={{
                                width: '60px',
                                padding: '6px 4px',
                                textAlign: 'center',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontWeight: 700
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={sec.marks_per_question}
                              onChange={(e) => handleUpdateSection(idx, 'marks_per_question', e.target.value)}
                              style={{
                                width: '60px',
                                padding: '6px 4px',
                                textAlign: 'center',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontWeight: 700
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                            {secTotal} M
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveSection(idx)}
                              title="Delete section"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '4px'
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* REAL-TIME VALIDATION WARNING & MARKS BALANCER */}
              <div style={{
                borderRadius: '12px',
                padding: '14px 18px',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                background: isMarksBalanced ? '#f0fdf4' : '#fffbeb',
                border: isMarksBalanced ? '1px solid #86efac' : '1px solid #fcd34d'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isMarksBalanced ? (
                    <CheckCircle2 size={22} color="#16a34a" />
                  ) : (
                    <AlertTriangle size={22} color="#d97706" />
                  )}
                  <div>
                    <div style={{
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      color: isMarksBalanced ? '#166534' : '#92400e'
                    }}>
                      {isMarksBalanced
                        ? `✓ Marks Balanced: Sections sum to ${calculatedSectionMarks} / ${schemeTotalMarks} Marks`
                        : `⚠️ Marks Mismatch: Sections sum to ${calculatedSectionMarks} Marks, but Total Paper Marks is set to ${schemeTotalMarks} Marks.`}
                    </div>
                    {!isMarksBalanced && (
                      <div style={{ fontSize: '0.8rem', color: '#b45309', marginTop: '2px' }}>
                        Difference: {marksDifference > 0 ? `+${marksDifference}` : marksDifference} Marks. Adjust the "To Attempt" counts or "Marks Each" to balance the paper.
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {!isMarksBalanced && (
                    <button
                      type="button"
                      onClick={() => setSchemeTotalMarks(calculatedSectionMarks)}
                      style={{
                        background: '#fef3c7',
                        border: '1px solid #f59e0b',
                        color: '#92400e',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Set Paper Total to {calculatedSectionMarks} Marks
                    </button>
                  )}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleResetSchemeForm}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '9px 18px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Reset
                </button>
                <button
                  type="submit"
                  style={{
                    background: isMarksBalanced ? 'linear-gradient(135deg, #0f2744 0%, #1e3a8a 100%)' : '#d97706',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 24px',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(15, 39, 68, 0.2)'
                  }}
                >
                  {editingSchemeId ? 'Update Paper Scheme' : 'Save Paper Scheme'}
                </button>
              </div>
            </form>
          </div>

          {/* LIST OF SAVED SCHEMES */}
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>
              Saved Paper Schemes for {selectedClass} {currentSubject?.name} ({schemes.length})
            </h3>

            {loadingSchemes ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <Loader2 size={28} className="spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                Loading saved schemes...
              </div>
            ) : schemes.length === 0 ? (
              <div style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '2rem',
                textAlign: 'center',
                color: '#64748b'
              }}>
                <FileSpreadsheet size={36} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  No saved paper schemes yet for this subject. Use the builder above or upload a board pairing document.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.25rem' }}>
                {schemes.map(sch => {
                  const secSum = sch.calculated_total_marks || (sch.sections || []).reduce((sum, s) => sum + (s.number_to_attempt * s.marks_per_question), 0);
                  const isBalanced = sch.marks_balanced !== undefined ? sch.marks_balanced : (secSum === sch.total_marks);

                  return (
                    <div
                      key={sch.id}
                      style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        padding: '1.25rem',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                              {sch.name}
                            </h4>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '0.78rem', color: '#64748b' }}>
                              <span><strong>Marks:</strong> {sch.total_marks} M</span>
                              <span>•</span>
                              <span><strong>Time:</strong> {sch.duration_minutes} Mins</span>
                            </div>
                          </div>

                          {/* Balanced status badge */}
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: isBalanced ? '#dcfce7' : '#fee2e2',
                            color: isBalanced ? '#166534' : '#991b1b',
                            border: isBalanced ? '1px solid #86efac' : '1px solid #fca5a5'
                          }}>
                            {isBalanced ? '✓ Balanced' : '⚠️ Mismatched'}
                          </span>
                        </div>

                        {sch.instructions && (
                          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 10px', fontStyle: 'italic' }}>
                            "{sch.instructions}"
                          </p>
                        )}

                        {/* Sections pills list */}
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          padding: '8px 12px',
                          marginBottom: '12px'
                        }}>
                          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                            Sections Breakdown:
                          </div>
                          {(sch.sections || []).map((sec, sIdx) => (
                            <div
                              key={sIdx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.78rem',
                                color: '#334155',
                                padding: '2px 0'
                              }}
                            >
                              <span>
                                <strong>{sec.section_name}:</strong> {sec.number_to_attempt} of {sec.number_of_questions} ({sec.question_type.toUpperCase()})
                              </span>
                              <span style={{ fontWeight: 700 }}>
                                {sec.number_to_attempt * sec.marks_per_question} Marks
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                        <button
                          onClick={() => handleEditScheme(sch)}
                          style={{
                            background: '#f8fafc',
                            color: '#0f2744',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit2 size={13} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteScheme(sch.id, sch.name)}
                          style={{
                            background: '#fff1f2',
                            color: '#e11d48',
                            border: '1px solid #fecdd3',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
