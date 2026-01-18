
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, CorrectionRequest } from '../types';
import { 
  CheckCircle2, FileText, Maximize2, ZoomIn, ZoomOut, Save, 
  FileCheck2, Loader2, Pencil, Search, Filter, ExternalLink, RefreshCw, AlertCircle, Eye, File, ImageIcon, FileType, X, Send, XCircle, ListChecks, History, ScrollText
} from 'lucide-react';
import { api } from '../services/api';

interface GradeVerificationViewProps {
  students: Student[];
  onUpdate?: () => void;
  currentUser?: { name: string; role: string };
  userRole?: 'ADMIN' | 'STUDENT' | 'GURU'; 
  targetStudentId?: string; // Add support for targeted linking
  onSave?: (student: Student) => void; // Added onSave prop
}

const CLASS_LIST = ['VII A', 'VII B', 'VII C', 'VIII A', 'VIII B', 'VIII C', 'IX A', 'IX B', 'IX C'];

// NEW: Helper for Score Color
const getScoreColor = (score: number) => {
    if (!score && score !== 0) return '';
    if (score === 0) return 'text-gray-400';
    if (score < 70) return 'bg-red-100 text-red-700 font-bold';
    if (score < 85) return 'bg-yellow-100 text-yellow-800 font-bold';
    return 'bg-green-100 text-green-700 font-bold';
};

// ... (Helper functions getDriveUrl, PDFPageCanvas remain) ...
const getDriveUrl = (url: string, type: 'preview' | 'direct') => {
    if (!url) return '';
    if (url.startsWith('blob:')) return url; // Local blobs

    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
        let id = '';
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            id = match[1];
        } else {
            try {
                const urlObj = new URL(url);
                id = urlObj.searchParams.get('id') || '';
            } catch (e) {}
        }

        if (id) {
            // Always return preview for iframe usage, it's the most reliable
            if (type === 'preview') return `https://drive.google.com/file/d/${id}/preview`;
            if (type === 'direct') return `https://drive.google.com/uc?export=view&id=${id}`;
        }
    }
    return url;
};

// Helper Component for PDF Rendering
const PDFPageCanvas: React.FC<{ pdf: any; pageNum: number; scale: number }> = ({ pdf, pageNum, scale }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let isCancelled = false;
        if (pdf && canvasRef.current) {
            pdf.getPage(pageNum).then((page: any) => {
                if(isCancelled) return;
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                if (canvas) {
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport,
                    };
                    page.render(renderContext).promise.catch((err: any) => {
                        if(!isCancelled) console.error("Page render error:", err);
                    });
                }
            }).catch((err: any) => console.error("Get page error:", err));
        }
        return () => { isCancelled = true; };
    }, [pdf, pageNum, scale]);

    return <canvas ref={canvasRef} className="shadow-lg bg-white mb-4" />;
};

const GradeVerificationView: React.FC<GradeVerificationViewProps> = ({ students, onUpdate, currentUser, userRole = 'ADMIN', targetStudentId, onSave }) => {
  // ... (All existing state and effects logic remains identical) ...
  const [activeSemester, setActiveSemester] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL'); 
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  // Document Viewer State
  const [viewerMode, setViewerMode] = useState<'RAPOR' | 'DOCS'>('RAPOR');
  const [activePage, setActivePage] = useState<number>(1); // For Rapor
  const [activeDocType, setActiveDocType] = useState<string>(''); // For Extra Docs
  const [availableGradeDocs, setAvailableGradeDocs] = useState<any[]>([]);

  const [zoomLevel, setZoomLevel] = useState<number>(1.0); 
  const [layoutMode, setLayoutMode] = useState<'split' | 'full-doc'>('split');
  const [isEditing, setIsEditing] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Settings State
  const [appSettings, setAppSettings] = useState<any>(null);
  const [raporPageCount, setRaporPageCount] = useState<number>(3);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isStudent = userRole === 'STUDENT';
  const isAdmin = userRole === 'ADMIN' || userRole === 'GURU';

  // --- CORRECTION STATE (STUDENT) ---
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [targetCorrection, setTargetCorrection] = useState<{
      key: string; 
      label: string; 
      currentValue: string;
      type: 'CLASS' | 'GRADE';
  } | null>(null);
  const [proposedValue, setProposedValue] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  // --- ADMIN VERIFICATION STATE ---
  const [adminVerifyModalOpen, setAdminVerifyModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CorrectionRequest | null>(null);
  const [adminResponseNote, setAdminResponseNote] = useState('');

  // PDF States
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [useFallbackViewer, setUseFallbackViewer] = useState(false);

  // Fetch Settings on Mount
  useEffect(() => {
      const fetchSettings = async () => {
          try {
              const settings = await api.getAppSettings();
              if (settings) {
                  setAppSettings(settings);
                  if (settings.raporPageCount) setRaporPageCount(Number(settings.raporPageCount));
                  
                  // Setup Extra Docs based on Config
                  const MASTER_LIST = [
                      { id: 'PIAGAM', label: 'Piagam' }, 
                      { id: 'SKL', label: 'SKL' }, 
                      { id: 'KARTU_PELAJAR', label: 'Kartu Pelajar' }
                  ];
                  
                  if (settings.docConfig && settings.docConfig.gradeVerification) {
                      const configured = settings.docConfig.gradeVerification;
                      const filtered = MASTER_LIST.filter(d => configured.includes(d.id));
                      setAvailableGradeDocs(filtered);
                      if (filtered.length > 0) setActiveDocType(filtered[0].id);
                  }
              }
              // Local fallback for page count
              const localPageCount = localStorage.getItem('sys_rapor_config');
              if (localPageCount) setRaporPageCount(parseInt(localPageCount));
          } catch (e) {
              console.error("Failed to load settings for verification", e);
          }
      };
      fetchSettings();
  }, []);

  const uniqueClasses = useMemo(() => {
      return Array.from(new Set(students.map(s => s.className))).sort();
  }, [students]);

  useEffect(() => {
      if (!selectedClassFilter && uniqueClasses.length > 0) {
          setSelectedClassFilter(uniqueClasses[0]);
      }
  }, [uniqueClasses]);

  const filteredStudents = useMemo(() => {
      let filtered = students;
      if (selectedClassFilter !== 'ALL') filtered = filtered.filter(s => s.className === selectedClassFilter);
      if (searchTerm) filtered = filtered.filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.nisn.includes(searchTerm));
      return filtered.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [students, searchTerm, selectedClassFilter]);

  // Init Selection logic (handle props target)
  useEffect(() => {
      if (targetStudentId) {
          const target = students.find(s => s.id === targetStudentId);
          if (target) {
              // Update local state to match target
              setSelectedClassFilter(target.className);
              setSelectedStudentId(target.id);
          }
      } else if (filteredStudents.length > 0) {
          // Check if current selection is valid within the new filtered list
          const isCurrentValid = filteredStudents.some(s => s.id === selectedStudentId);
          if (!isCurrentValid) {
              setSelectedStudentId(filteredStudents[0].id);
          }
      } else {
          setSelectedStudentId('');
      }
  }, [filteredStudents, targetStudentId]); // Removed selectedStudentId from deps to fix loop, relies on filteredStudents change

  const currentStudent = students.find(s => s.id === selectedStudentId);
  const currentRecord = currentStudent?.academicRecords?.[activeSemester];
  
  // Dynamic Document Selection
  const currentDoc = useMemo(() => {
      if (viewerMode === 'RAPOR') {
          return currentStudent?.documents.find(d => 
              d.category === 'RAPOR' && 
              d.subType?.semester == activeSemester && 
              d.subType?.page == activePage
          );
      } else {
          return currentStudent?.documents.find(d => d.category === activeDocType);
      }
  }, [currentStudent, activeSemester, activePage, activeDocType, viewerMode, forceUpdate]);

  // Enhanced File Type Detection
  const isImageFile = (doc: any) => {
      if (!doc) return false;
      if (doc.type === 'IMAGE') return true;
      const name = doc.name ? doc.name.toLowerCase() : '';
      return name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.gif') || name.endsWith('.webp') || name.endsWith('.bmp');
  };

  const isDriveUrl = currentDoc && (currentDoc.url.includes('drive.google.com') || currentDoc.url.includes('docs.google.com') || currentDoc.url.includes('googleusercontent.com'));

  // Calculate Display Class based on Semester
  const getDisplayClass = () => {
      if (!currentStudent) return '';
      // Use academic record specific class if available, else fallback to current class logic
      if (currentRecord && currentRecord.className) {
          return currentRecord.className;
      }

      let level = '';
      if (activeSemester <= 2) level = 'VII';
      else if (activeSemester <= 4) level = 'VIII';
      else level = 'IX';
      
      const parts = currentStudent.className.split(' ');
      const suffix = parts.length > 1 ? parts.slice(1).join(' ') : '';
      return `${level} ${suffix}`.trim();
  };

  // Get Dynamic Dropdown Options based on Semester
  const getClassOptions = () => {
      return CLASS_LIST; // Allow changing to any class for flexibility
  };

  // Get Academic Year from settings or fallback
  const getAcademicYear = () => {
      return appSettings?.academicData?.semesterYears?.[activeSemester] || '2024/2025';
  };

  // AUTOMATED COMPETENCY GENERATOR
  const getCompetencyDescription = (score: number, subjectName: string) => {
      if (!score) return '-';
      let predikat = '';
      if (score >= 91) predikat = 'Sangat baik';
      else if (score >= 81) predikat = 'Baik';
      else if (score >= 75) predikat = 'Cukup';
      else predikat = 'Perlu bimbingan';

      return `${predikat} dalam memahami materi ${subjectName}.`;
  };

  // VIEWER LOGIC IMPLEMENTATION
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadPdf = async () => {
        if (!isMounted) return;
        setPdfDoc(null);
        setIsPdfLoading(false);
        setPdfError(false);
        setUseFallbackViewer(false);
        setZoomLevel(1.0);

        if (!currentStudent || !currentDoc) return;

        if (isDriveUrl && !isImageFile(currentDoc)) {
            if(isMounted) setUseFallbackViewer(true);
            return;
        }

        if (currentDoc.type === 'PDF' || currentDoc.name.toLowerCase().endsWith('.pdf')) {
            if (!currentDoc.url.startsWith('blob:')) {
                if(isMounted) setUseFallbackViewer(true);
                return;
            }

            if(isMounted) setIsPdfLoading(true);
            try {
                // @ts-ignore
                const pdfjsLib = await import('pdfjs-dist');
                if(!isMounted) return;

                const pdfjs = pdfjsLib.default ? pdfjsLib.default : pdfjsLib;
                if (!pdfjs.GlobalWorkerOptions.workerSrc) {
                    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
                }

                const response = await fetch(currentDoc.url, { signal: controller.signal });
                if (!response.ok) throw new Error("Network response was not ok");
                const arrayBuffer = await response.arrayBuffer();

                if(!isMounted) return;

                const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                
                if(isMounted) {
                    setPdfDoc(pdf); setNumPages(pdf.numPages); setIsPdfLoading(false);
                }
            } catch (error: any) { 
                if (error.name === 'AbortError') return;
                if(isMounted) {
                    if (error.message !== 'Failed to fetch') console.error("Error loading PDF, trying fallback:", error);
                    setUseFallbackViewer(true); setIsPdfLoading(false); 
                }
            }
        }
    };
    loadPdf();
    return () => { isMounted = false; controller.abort(); };
  }, [currentDoc]);
  
  const handleApproveDoc = async () => { 
      if (currentDoc && currentStudent) { 
          setIsSaving(true);
          const updatedDocs = currentStudent.documents.map(d => d.id === currentDoc.id ? { ...d, status: 'APPROVED' as const, adminNote: 'Valid.', verifierName: currentUser?.name || 'Admin', verifierRole: currentUser?.role || 'ADMIN', verificationDate: new Date().toISOString().split('T')[0] } : d);
          const updatedStudent = { ...currentStudent, documents: updatedDocs };
          
          if (onSave) {
              await onSave(updatedStudent);
          } else {
              await api.updateStudent(updatedStudent);
              if (onUpdate) onUpdate(); 
          }
          
          setIsSaving(false); setForceUpdate(prev => prev + 1);
      } 
  };
  const confirmRejectDoc = async () => { 
      if (currentDoc && currentStudent) { 
          if (!rejectionNote.trim()) { alert("Isi alasan penolakan!"); return; }
          setIsSaving(true);
          const updatedDocs = currentStudent.documents.map(d => d.id === currentDoc.id ? { ...d, status: 'REVISION' as const, adminNote: rejectionNote, verifierName: currentUser?.name || 'Admin', verifierRole: currentUser?.role || 'ADMIN', verificationDate: new Date().toISOString().split('T')[0] } : d);
          const updatedStudent = { ...currentStudent, documents: updatedDocs };
          
          if (onSave) {
              await onSave(updatedStudent);
          } else {
              await api.updateStudent(updatedStudent);
              if (onUpdate) onUpdate(); 
          }
          
          setIsSaving(false); setRejectModalOpen(false); setRejectionNote(''); setForceUpdate(prev => prev + 1);
      } 
  };
  
  const handleGradeChange = (subjectIndex: number, newScore: string) => { 
      if (currentRecord) { 
          currentRecord.subjects[subjectIndex].score = Number(newScore); 
          setForceUpdate(prev => prev + 1); 
      } 
  };

  const handleClassChange = (newClass: string) => {
      if (!currentStudent) return;
      
      // Ensure record exists
      if (!currentStudent.academicRecords) currentStudent.academicRecords = {};
      if (!currentStudent.academicRecords[activeSemester]) {
          // Init dummy record if needed to set class
           const level = (activeSemester <= 2) ? 'VII' : (activeSemester <= 4) ? 'VIII' : 'IX';
           currentStudent.academicRecords[activeSemester] = { 
              semester: activeSemester, classLevel: level, className: newClass, phase: 'D', year: '2024', 
              subjects: [], p5Projects: [], extracurriculars: [], teacherNote: '', attendance: {sick:0, permitted:0, noReason:0}
           };
      } else {
          currentStudent.academicRecords[activeSemester].className = newClass;
      }
      setForceUpdate(prev => prev + 1);
  };

  const saveGrades = async () => { 
      if (currentStudent) {
          setIsSaving(true);
          try {
              if (onSave) {
                  await onSave(currentStudent);
              } else {
                  await api.updateStudent(currentStudent);
                  if (onUpdate) onUpdate();
              }
              
              setIsEditing(false);
          } catch(e) {
              console.error(e);
              alert("Terjadi kesalahan.");
          } finally {
              setIsSaving(false);
          }
      }
  };

  // ... (Correction Handlers for Student & Admin Verify logic remain same) ...
  const handleOpenCorrection = (key: string, label: string, currentValue: string, type: 'CLASS' | 'GRADE') => {
      setTargetCorrection({ key, label, currentValue, type });
      if (type === 'CLASS') {
          const opts = getClassOptions();
          setProposedValue(opts.includes(currentValue) ? currentValue : opts[0]);
      } else {
          setProposedValue(currentValue);
      }
      setCorrectionReason('');
      setCorrectionModalOpen(true);
  };

  const submitCorrection = async () => {
      if (!currentStudent || !targetCorrection) return;
      if (!proposedValue || !correctionReason.trim()) { alert("Mohon lengkapi data."); return; }

      // Handle Key for Class correction (semester specific)
      const finalKey = targetCorrection.type === 'CLASS' ? `class-${activeSemester}` : targetCorrection.key;

      const newRequest: CorrectionRequest = {
          id: Math.random().toString(36).substr(2, 9),
          fieldKey: finalKey,
          fieldName: targetCorrection.label,
          originalValue: targetCorrection.currentValue,
          proposedValue: proposedValue,
          studentReason: correctionReason,
          status: 'PENDING',
          requestDate: new Date().toISOString(),
      };

      // Clone for safety
      const updatedStudent = { ...currentStudent };
      if (!updatedStudent.correctionRequests) updatedStudent.correctionRequests = [];
      
      // Remove dups for same key
      updatedStudent.correctionRequests = updatedStudent.correctionRequests.filter(r => !(r.fieldKey === finalKey && r.status === 'PENDING'));
      updatedStudent.correctionRequests.push(newRequest);

      if (onSave) {
          await onSave(updatedStudent);
      } else {
          await api.updateStudent(updatedStudent);
          if (onUpdate) onUpdate();
      }
      
      setCorrectionModalOpen(false); alert("✅ Pengajuan revisi berhasil dikirim.");
  };

  const handleAdminVerifyClick = (request: CorrectionRequest) => {
      setSelectedRequest(request);
      setAdminResponseNote(request.adminNote || '');
      setAdminVerifyModalOpen(true);
  };

  const processVerification = async (action: 'APPROVED' | 'REJECTED') => {
      if (!currentStudent || !selectedRequest) return;
      
      if (action === 'REJECTED' && !adminResponseNote.trim()) {
          alert("Mohon isi alasan penolakan.");
          return;
      }

      setIsSaving(true);

      const updatedStudent = JSON.parse(JSON.stringify(currentStudent));
      
      updatedStudent.correctionRequests = updatedStudent.correctionRequests.map((req: CorrectionRequest) => {
          if (req.id === selectedRequest.id) {
              return {
                  ...req,
                  status: action,
                  adminNote: adminResponseNote || (action === 'APPROVED' ? 'Disetujui.' : 'Ditolak.'),
                  verifierName: currentUser?.name || 'Admin',
                  processedDate: new Date().toISOString()
              };
          }
          return req;
      });

      if (action === 'APPROVED') {
          const { fieldKey, proposedValue } = selectedRequest;
          
          if (fieldKey === 'className') {
              updatedStudent.className = proposedValue;
          } else if (fieldKey.startsWith('class-')) {
              const sem = parseInt(fieldKey.split('-')[1]);
              if (!isNaN(sem)) {
                  if (!updatedStudent.academicRecords) updatedStudent.academicRecords = {};
                  if (!updatedStudent.academicRecords[sem]) {
                      const level = (sem <= 2) ? 'VII' : (sem <= 4) ? 'VIII' : 'IX';
                      updatedStudent.academicRecords[sem] = { 
                          semester: sem, classLevel: level, className: proposedValue,
                          phase: 'D', year: '2024', subjects: [], p5Projects: [], extracurriculars: [], teacherNote: '', attendance: {sick:0, permitted:0, noReason:0}
                      };
                  }
                  updatedStudent.academicRecords[sem].className = proposedValue;
              }
          } else if (fieldKey.startsWith('grade-')) {
              const parts = fieldKey.split('-');
              if (parts.length >= 3) {
                  const sem = parseInt(parts[1]);
                  const subjectName = parts.slice(2).join('-');
                  
                  if (updatedStudent.academicRecords && updatedStudent.academicRecords[sem]) {
                      const subjectRecord = updatedStudent.academicRecords[sem].subjects.find((s: any) => s.subject === subjectName);
                      if (subjectRecord) {
                          subjectRecord.score = Number(proposedValue);
                      }
                  }
              }
          }
      }

      try {
          if (onSave) {
              await onSave(updatedStudent);
          } else {
              await api.updateStudent(updatedStudent);
              if (onUpdate) onUpdate();
          }
          
          setAdminVerifyModalOpen(false);
          setForceUpdate(prev => prev + 1);
      } catch (e) {
          alert("Gagal menyimpan perubahan.");
          console.error(e);
      } finally {
          setIsSaving(false);
      }
  };

  // Helper to check pending status for a key
  const getPendingRequest = (key: string) => {
      return currentStudent?.correctionRequests?.find(r => r.fieldKey === key && r.status === 'PENDING');
  };

  const allRequests = useMemo(() => {
      if (!currentStudent?.correctionRequests) return [];
      const gradeRelatedRequests = currentStudent.correctionRequests.filter(r => 
          r.fieldKey.startsWith('grade-') || r.fieldKey.startsWith('class-')
      );
      return gradeRelatedRequests.sort((a, b) => {
          if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
          if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
          return new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime();
      });
  }, [currentStudent]);

  return (
    <div className="flex flex-col h-full animate-fade-in relative">
        {/* ... (Modal sections remain same) ... */}
        {rejectModalOpen && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col">
                    <h3 className="font-bold text-red-600 mb-2">Tolak Dokumen</h3>
                    <textarea className="w-full p-2 border rounded mb-4" rows={3} value={rejectionNote} onChange={e => setRejectionNote(e.target.value)} placeholder="Alasan penolakan..." />
                    <div className="flex justify-end gap-2">
                        <button onClick={()=>setRejectModalOpen(false)} className="px-3 py-1 bg-gray-100 rounded">Batal</button>
                        <button onClick={confirmRejectDoc} disabled={isSaving} className="px-3 py-1 bg-red-600 text-white rounded flex items-center">{isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Simpan'}</button>
                    </div>
                </div>
            </div>
        )}

        {/* ... (Admin Verify Modal & Student Correction Modal remain the same) ... */}
        {/* Skipping repetitive code for brevity, assuming standard modals are kept as is */}
        {/* CORRECTION MODAL (STUDENT) */}
        {correctionModalOpen && targetCorrection && (
            <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform scale-100 transition-all">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-lg font-bold text-gray-800">Ajukan Revisi Data</h3>
                        <button onClick={() => setCorrectionModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>
                    
                    <div className="mb-4 bg-blue-50 p-3 rounded border border-blue-100">
                        <p className="text-xs text-gray-500 uppercase">{targetCorrection.label} (Saat Ini)</p>
                        <p className="text-sm font-bold text-gray-700">{targetCorrection.currentValue || '-'}</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Data Baru / Usulan</label>
                            {targetCorrection.type === 'CLASS' ? (
                                <select 
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                    value={proposedValue}
                                    onChange={(e) => setProposedValue(e.target.value)}
                                >
                                    {getClassOptions().map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            ) : (
                                <input 
                                    type="number" 
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                    value={proposedValue}
                                    onChange={(e) => setProposedValue(e.target.value)}
                                    placeholder="Masukkan nilai yang benar"
                                />
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Alasan Revisi</label>
                            <textarea 
                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                rows={2}
                                placeholder="Jelaskan alasan perubahan..."
                                value={correctionReason}
                                onChange={(e) => setCorrectionReason(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 mt-6">
                        <button onClick={() => setCorrectionModalOpen(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 font-bold rounded-lg text-sm hover:bg-gray-200">Batal</button>
                        <button onClick={submitCorrection} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 flex items-center justify-center gap-2">
                            <Send className="w-3 h-3" /> Kirim
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* ADMIN VERIFICATION MODAL */}
        {adminVerifyModalOpen && selectedRequest && (
            <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform scale-100 transition-all">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-lg font-bold text-gray-800">Verifikasi Pengajuan</h3>
                        <button onClick={() => setAdminVerifyModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Item Perubahan</p>
                            <p className="text-sm font-semibold text-gray-800">{selectedRequest.fieldName}</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="flex-1 p-3 bg-red-50 border border-red-100 rounded-lg">
                                <p className="text-[10px] text-red-500 font-bold uppercase">Data Lama</p>
                                <p className="text-sm font-bold text-gray-700 line-through decoration-red-400">{selectedRequest.originalValue}</p>
                            </div>
                            <div className="flex-1 p-3 bg-green-50 border border-green-100 rounded-lg">
                                <p className="text-[10px] text-green-600 font-bold uppercase">Usulan Baru</p>
                                <p className="text-sm font-bold text-gray-800">{selectedRequest.proposedValue}</p>
                            </div>
                        </div>

                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                            <p className="text-xs font-bold text-yellow-700 uppercase mb-1">Alasan Siswa</p>
                            <p className="text-sm text-gray-700 italic">"{selectedRequest.studentReason}"</p>
                        </div>

                        {selectedRequest.status !== 'PENDING' && (
                            <div className={`p-3 rounded-lg border ${selectedRequest.status === 'APPROVED' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <p className={`text-xs font-bold uppercase mb-1 ${selectedRequest.status === 'APPROVED' ? 'text-green-700' : 'text-red-700'}`}>
                                    Status: {selectedRequest.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
                                </p>
                                <p className="text-sm text-gray-700 italic">"{selectedRequest.adminNote}"</p>
                            </div>
                        )}

                        {selectedRequest.status === 'PENDING' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Catatan Admin (Opsional)</label>
                                <textarea 
                                    className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    rows={2}
                                    placeholder="Alasan penolakan atau catatan..."
                                    value={adminResponseNote}
                                    onChange={(e) => setAdminResponseNote(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {selectedRequest.status === 'PENDING' && (
                        <div className="flex gap-2">
                            <button 
                                onClick={() => processVerification('REJECTED')} 
                                disabled={isSaving}
                                className="flex-1 py-2 bg-white border border-red-200 text-red-600 font-bold rounded-lg text-sm hover:bg-red-50 flex items-center justify-center gap-2"
                            >
                                <XCircle className="w-4 h-4" /> Tolak
                            </button>
                            <button 
                                onClick={() => processVerification('APPROVED')} 
                                disabled={isSaving}
                                className="flex-1 py-2 bg-green-600 text-white font-bold rounded-lg text-sm hover:bg-green-700 flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Setujui
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}
        
        {/* Top Controls */}
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-4 mb-4">
            {!isStudent ? (
                <div className="flex gap-2 w-full xl:w-auto">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer w-24 md:w-auto" value={selectedClassFilter} onChange={(e) => setSelectedClassFilter(e.target.value)}>
                            {uniqueClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)}
                        </select>
                    </div>
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input type="text" placeholder="Cari Siswa..." className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:bg-white transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <select className="pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 w-full md:w-auto" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                        {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                    </select>
                </div>
            ) : (
                <div className="font-bold text-lg text-gray-800 flex flex-col">
                    <span>{currentStudent?.fullName}</span>
                    <span className="text-xs text-gray-500 font-normal">Menu Verifikasi Nilai & Rapor</span>
                </div>
            )}
            
            <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-600 mr-2">Semester:</span>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {[1, 2, 3, 4, 5, 6].map(sem => (
                        <button key={sem} onClick={() => { setActiveSemester(sem); setActivePage(1); }} className={`w-8 h-8 rounded-md text-sm font-bold transition-all ${activeSemester === sem ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>{sem}</button>
                    ))}
                </div>
            </div>
        </div>

        {currentStudent ? (
            <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden relative">
                {!isStudent && (
                    <div className={`flex flex-col bg-gray-800 rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${layoutMode === 'full-doc' ? 'w-full absolute inset-0 z-20' : 'w-full lg:w-1/2 h-full'}`}>
                        {/* Improved Header for Doc Switching */}
                        <div className="bg-gray-900 border-b border-gray-700 px-4 py-2">
                            <div className="flex gap-2 mb-2 justify-center">
                                <button onClick={() => setViewerMode('RAPOR')} className={`px-3 py-1 rounded text-xs font-bold ${viewerMode === 'RAPOR' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                                    File Rapor
                                </button>
                                {availableGradeDocs.length > 0 && (
                                    <button onClick={() => setViewerMode('DOCS')} className={`px-3 py-1 rounded text-xs font-bold ${viewerMode === 'DOCS' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                                        Dokumen Lain
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex items-center justify-between text-gray-300">
                                <div className="flex gap-1 overflow-x-auto max-w-[200px] no-scrollbar">
                                    {viewerMode === 'RAPOR' ? (
                                        Array.from({length: raporPageCount}, (_, i) => i + 1).map(p => (
                                            <button key={p} onClick={() => setActivePage(p)} className={`px-2 py-0.5 rounded text-[10px] font-bold ${activePage === p ? 'bg-blue-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Hal {p}</button>
                                        ))
                                    ) : (
                                        availableGradeDocs.map(d => (
                                            <button key={d.id} onClick={() => setActiveDocType(d.id)} className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${activeDocType === d.id ? 'bg-blue-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>{d.label}</button>
                                        ))
                                    )}
                                </div>

                                <div className="flex items-center gap-1">
                                    <button onClick={()=>setZoomLevel(z=>Math.max(0.5, z-0.2))} className="p-1 hover:bg-gray-700 rounded"><ZoomOut className="w-3 h-3" /></button>
                                    <span className="text-[10px] w-6 text-center">{Math.round(zoomLevel*100)}%</span>
                                    <button onClick={()=>setZoomLevel(z=>Math.min(3, z+0.2))} className="p-1 hover:bg-gray-700 rounded"><ZoomIn className="w-3 h-3" /></button>
                                    <button onClick={()=>setLayoutMode(m=>m==='full-doc'?'split':'full-doc')} className="p-1 hover:bg-gray-700 rounded ml-1"><Maximize2 className="w-3 h-3" /></button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-auto p-4 bg-gray-900/50 flex items-start justify-center pb-32 relative">
                            <div style={{ transform: `scale(${useFallbackViewer || (isDriveUrl && !isImageFile(currentDoc)) ? 1 : zoomLevel})`, transformOrigin: 'top center', width: '100%', display: 'flex', justifyContent: 'center' }}>
                                {currentDoc ? (
                                    (useFallbackViewer || (isDriveUrl && !isImageFile(currentDoc))) ? (
                                        <iframe 
                                            src={getDriveUrl(currentDoc.url, 'preview')} 
                                            className="w-full min-h-[1100px] border-none rounded bg-white shadow-lg" 
                                            title="Document Viewer" 
                                            allow="autoplay"
                                        />
                                    ) : (
                                        isImageFile(currentDoc) ? (
                                            <img 
                                                src={isDriveUrl ? getDriveUrl(currentDoc.url, 'direct') : currentDoc.url} 
                                                className="w-full h-auto object-contain bg-white shadow-sm rounded" 
                                                alt="Document" 
                                                onError={() => setUseFallbackViewer(true)}
                                            />
                                        ) : (
                                            <div className="bg-white min-h-[600px] w-full max-w-[900px] flex flex-col items-center justify-start relative overflow-auto p-4 rounded shadow-lg">
                                                {isPdfLoading ? (
                                                    <div className="flex flex-col items-center justify-center h-full pt-20">
                                                        <Loader2 className="animate-spin w-10 h-10 text-blue-500 mb-2" />
                                                        <p className="text-xs text-gray-500">Memuat PDF...</p>
                                                    </div>
                                                ) : (
                                                    pdfDoc ? (
                                                        Array.from(new Array(numPages), (el, index) => (
                                                            <PDFPageCanvas key={`page_${index + 1}`} pdf={pdfDoc} pageNum={index + 1} scale={zoomLevel} />
                                                        ))
                                                    ) : (
                                                        <div className="text-red-500 flex flex-col items-center justify-center h-full pt-20">
                                                            <AlertCircle className="w-8 h-8 mb-2" />
                                                            <p>{pdfError ? 'Gagal memuat PDF' : 'PDF Viewer Error'}</p>
                                                            <button onClick={() => setUseFallbackViewer(true)} className="mt-2 text-xs underline text-blue-600">Coba Mode Alternatif</button>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        )
                                    )
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        {viewerMode === 'RAPOR' ? <FileText className="w-16 h-16 mb-4 opacity-20" /> : <ScrollText className="w-16 h-16 mb-4 opacity-20" />}
                                        <p className="text-sm">{viewerMode === 'RAPOR' ? `Halaman ${activePage} belum diupload.` : `Dokumen ${activeDocType} tidak ditemukan.`}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {currentDoc && (
                            <div className="bg-gray-900 border-t border-gray-700 p-4 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${currentDoc.status === 'APPROVED' ? 'bg-green-900 text-green-300' : currentDoc.status === 'REVISION' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'}`}>
                                        {currentDoc.status === 'APPROVED' ? 'Disetujui' : currentDoc.status === 'REVISION' ? 'Perlu Revisi' : 'Menunggu Verifikasi'}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setRejectionNote(''); setRejectModalOpen(true); }} disabled={isSaving} className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/50 rounded-lg hover:bg-red-600 hover:text-white transition-colors text-sm font-bold">Tolak</button>
                                    <button onClick={handleApproveDoc} disabled={isSaving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-900/20">
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4" />} Setujui
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* RIGHT SIDE: DATA */}
                <div className={`bg-white rounded-xl border border-gray-200 flex flex-col shadow-sm transition-all duration-300 ${layoutMode === 'full-doc' && !isStudent ? 'hidden' : 'flex-1'} overflow-hidden`}>
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <FileCheck2 className="w-5 h-5 text-purple-600" /> {isStudent ? 'Nilai Rapor Saya' : 'Verifikasi Nilai'}
                        </h3>
                        {/* Only Admin edits directly here, Student edits via click */}
                        {!isStudent && (
                            <div className="flex gap-2">
                                <button onClick={() => { if(isEditing) saveGrades(); else setIsEditing(true); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isEditing ? 'bg-green-600 text-white shadow-lg' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
                                    {isEditing ? <><Save className="w-3 h-3" /> {isSaving ? 'Menyimpan...' : 'Simpan'}</> : <><Pencil className="w-3 h-3" /> Edit Nilai</>}
                                </button>
                            </div>
                        )}
                        {isStudent && (
                            <div className="text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                * Klik pada Kelas atau Nilai untuk mengajukan perbaikan
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                        
                        {/* ADMIN SIDEBAR LIST FOR ALL REQUESTS (SORTED BY STATUS & TIME) */}
                        {isAdmin && allRequests.length > 0 && (
                            <div className="w-full md:w-64 border-r border-gray-200 bg-gray-50 p-3 overflow-y-auto">
                                <div className="text-xs font-bold text-gray-700 flex items-center gap-2 mb-3 bg-white p-2 rounded shadow-sm">
                                    <ListChecks className="w-4 h-4 text-blue-600" />
                                    Riwayat Verifikasi ({allRequests.length})
                                </div>
                                <div className="space-y-2">
                                    {allRequests.map(req => {
                                        const isPending = req.status === 'PENDING';
                                        const isApproved = req.status === 'APPROVED';
                                        
                                        return (
                                            <div 
                                                key={req.id} 
                                                className={`
                                                    border rounded-lg p-2 shadow-sm cursor-pointer transition-colors
                                                    ${isPending ? 'bg-white border-yellow-300 hover:bg-yellow-50' : ''}
                                                    ${isApproved ? 'bg-green-50 border-green-200 opacity-80 hover:opacity-100' : ''}
                                                    ${req.status === 'REJECTED' ? 'bg-red-50 border-red-200 opacity-80 hover:opacity-100' : ''}
                                                `}
                                                onClick={() => handleAdminVerifyClick(req)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <p className="text-xs font-bold text-gray-800">{req.fieldName}</p>
                                                    {isPending ? (
                                                        <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1 rounded font-bold">Pending</span>
                                                    ) : isApproved ? (
                                                        <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded font-bold">Disetujui</span>
                                                    ) : (
                                                        <span className="text-[9px] bg-red-100 text-red-700 px-1 rounded font-bold">Ditolak</span>
                                                    )}
                                                </div>
                                                <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-500">
                                                    <span className="line-through decoration-red-300 truncate max-w-[40%]">{req.originalValue}</span>
                                                    <span>➔</span>
                                                    <span className="font-bold text-gray-800">{req.proposedValue}</span>
                                                </div>
                                                {!isPending && (
                                                    <p className="text-[9px] text-gray-400 mt-1 italic">
                                                        Oleh: {req.verifierName || 'Admin'}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-auto p-4 md:p-6 bg-white" id="grades-table-container">
                            <div className="mb-6 border-b-2 border-gray-800 pb-4">
                                <div className="flex justify-between text-sm font-bold text-gray-900 mb-2">
                                    <span>NAMA: {currentStudent.fullName.toUpperCase()}</span>
                                    
                                    {/* DYNAMIC CLASS DISPLAY */}
                                    {(() => {
                                        const displayClass = getDisplayClass();
                                        const classPending = getPendingRequest(`class-${activeSemester}`);
                                        
                                        return (
                                            <span 
                                                className={`
                                                    flex items-center gap-2 px-2 py-0.5 rounded transition-colors
                                                    ${isStudent ? 'cursor-pointer hover:bg-blue-50 text-blue-800' : ''}
                                                    ${isAdmin && classPending ? 'bg-yellow-200 border border-yellow-300 cursor-pointer animate-pulse' : ''}
                                                    ${classPending && !isAdmin ? 'bg-yellow-100 text-yellow-800' : ''}
                                                `}
                                                onClick={() => {
                                                    if (isStudent && !classPending) handleOpenCorrection('className', 'KELAS', displayClass, 'CLASS');
                                                    if (isAdmin && classPending) handleAdminVerifyClick(classPending);
                                                }}
                                                title={isStudent ? "Klik untuk koreksi Kelas" : (isAdmin && classPending ? "Klik untuk memverifikasi perubahan" : "")}
                                            >
                                                KELAS: 
                                                {isEditing && !isStudent ? (
                                                    <select 
                                                        className="ml-2 bg-gray-50 border border-gray-300 rounded text-sm p-1"
                                                        value={currentRecord?.className || currentStudent.className}
                                                        onChange={(e) => handleClassChange(e.target.value)}
                                                    >
                                                        {CLASS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                ) : (
                                                    <>
                                                        {classPending ? classPending.proposedValue : displayClass}
                                                        {classPending && <span className="text-[9px] bg-yellow-300 border border-yellow-400 px-1 rounded font-bold text-yellow-900">Menunggu Verifikasi</span>}
                                                        {isStudent && !classPending && <Pencil className="w-3 h-3 opacity-50" />}
                                                    </>
                                                )}
                                            </span>
                                        )
                                    })()}
                                </div>
                                <div className="flex justify-between text-xs text-gray-600">
                                    <span>NISN: {currentStudent.nisn}</span>
                                    <span>SEMESTER: {activeSemester} ({getAcademicYear()})</span>
                                </div>
                            </div>
                            
                            {currentRecord ? (
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100 border-y-2 border-gray-800 text-xs font-bold text-gray-700 uppercase">
                                            <th className="py-2 text-left pl-2">Mata Pelajaran</th>
                                            <th className="py-2 text-center w-24">Nilai</th>
                                            <th className="py-2 text-left pl-4">Capaian Kompetensi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {currentRecord.subjects.map((sub, idx) => {
                                            // Generate a unique key for correction: grade-[sem]-[subject]
                                            const gradeKey = `grade-${activeSemester}-${sub.subject}`;
                                            const gradePending = getPendingRequest(gradeKey);
                                            // Auto-generate competency description
                                            const competencyText = getCompetencyDescription(sub.score, sub.subject);

                                            return (
                                                <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                                                    <td className="py-3 pl-2 font-medium text-gray-800">{sub.subject}</td>
                                                    <td className="py-3 text-center font-bold text-gray-900">
                                                        {isEditing && !isStudent ? (
                                                            <input type="number" className="w-12 text-center border border-blue-300 rounded p-1" value={sub.score} onChange={(e) => handleGradeChange(idx, e.target.value)} />
                                                        ) : (
                                                            <div 
                                                                className={`
                                                                    inline-flex items-center gap-1 px-2 py-1 rounded transition-colors
                                                                    ${getScoreColor(sub.score)}
                                                                    ${isStudent ? 'cursor-pointer hover:bg-blue-50 border border-transparent hover:border-blue-200' : ''}
                                                                    ${isAdmin && gradePending ? 'bg-yellow-200 border border-yellow-300 cursor-pointer animate-pulse' : ''}
                                                                    ${gradePending && !isAdmin ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : ''}
                                                                `}
                                                                onClick={() => {
                                                                    if (isStudent && !gradePending) handleOpenCorrection(gradeKey, `Nilai ${sub.subject} (Sem ${activeSemester})`, String(sub.score), 'GRADE');
                                                                    if (isAdmin && gradePending) handleAdminVerifyClick(gradePending);
                                                                }}
                                                                title={isStudent ? "Klik untuk mengajukan perbaikan nilai" : (isAdmin && gradePending ? "Klik untuk memverifikasi" : "")}
                                                            >
                                                                {gradePending ? gradePending.proposedValue : sub.score}
                                                                {gradePending && <span className="text-[8px] ml-1 opacity-70">(Rev)</span>}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 pl-4 text-xs text-gray-600 italic">
                                                        {competencyText}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : <div className="text-center py-10 text-gray-400 italic">Data nilai belum diinput.</div>}
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 flex-col">
                <Search className="w-16 h-16 mb-4 opacity-20" />
                <p>Pilih siswa untuk memulai verifikasi nilai.</p>
            </div>
        )}
    </div>
  );
};

export default GradeVerificationView;
