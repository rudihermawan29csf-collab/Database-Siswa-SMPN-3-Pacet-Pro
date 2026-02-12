
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, DocumentFile, CorrectionRequest } from '../types';
import { api } from '../services/api';
import { 
  CheckCircle2, XCircle, Loader2, AlertCircle, ScrollText, ZoomIn, ZoomOut, 
  RotateCw, FileCheck2, User, Filter, Search, FileBadge, Save, 
  GitPullRequest, Check, X, ArrowRight, FileText, MapPin, Users, Heart, Wallet, ChevronDown, CheckCheck, RefreshCw 
} from 'lucide-react';

interface VerificationViewProps {
  students: Student[];
  targetStudentId?: string;
  onUpdate: (student?: Student) => void;
  currentUser: { name: string; role: string };
}

const DOC_LABELS: Record<string, string> = {
    'IJAZAH': 'Ijazah SD',
    'AKTA': 'Akta Kelahiran',
    'KK': 'Kartu Keluarga',
    'KTP_AYAH': 'KTP Ayah',
    'KTP_IBU': 'KTP Ibu',
    'NISN': 'Bukti NISN',
    'KIP': 'KIP/PKH',
    'FOTO': 'Pas Foto',
    'SKL': 'SKL',
    'KARTU_PELAJAR': 'Kartu Pelajar',
    'PIAGAM': 'Piagam',
    'RAPOR': 'Rapor'
};

const getDriveUrl = (url: string, type: 'preview' | 'direct') => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
        let id = '';
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (match) id = match[1];
        if (id) {
            return type === 'preview' ? `https://drive.google.com/file/d/${id}/preview` : `https://drive.google.com/uc?export=view&id=${id}`;
        }
    }
    return url;
};

const AccordionItem = ({ title, icon: Icon, isOpen, onToggle, children, badge }: { title: string, icon: any, isOpen: boolean, onToggle: () => void, children?: React.ReactNode, badge?: number }) => (
    <div className="border-b border-gray-200 last:border-0">
        <button 
            onClick={onToggle}
            className={`w-full flex items-center justify-between p-3 text-xs font-bold uppercase transition-colors ${isOpen ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
        >
            <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" /> 
                {title}
                {badge ? <span className="ml-2 bg-blue-600 text-white px-1.5 py-0.5 rounded-full text-[9px]">{badge}</span> : null}
            </div>
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 transform -rotate-90" />}
        </button>
        {isOpen && <div className="p-4 bg-white space-y-4 animate-fade-in">{children}</div>}
    </div>
);

const VerificationView: React.FC<VerificationViewProps> = ({ students, targetStudentId, onUpdate, currentUser }) => {
  const [selectedClass, setSelectedClass] = useState<string>(''); 
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [allowedCategories, setAllowedCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<Student>>({});
  const [openSection, setOpenSection] = useState<string>('IDENTITY');
  const [adminNote, setAdminNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  
  // Local state to track processed IDs to prevent them from reappearing before server sync
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  // Ref to lock auto-selection when target is present
  const isTargetingRef = useRef(false);
  // Ref to track initialized state
  const isInitializedRef = useRef(false);
  // Ref to track handled target to prevent re-selection on updates
  const handledTargetRef = useRef<string | undefined>(undefined);

  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [useFallbackViewer, setUseFallbackViewer] = useState(false);

  useEffect(() => {
      const fetchSettings = async () => {
          try {
              const settings = await api.getAppSettings();
              if (settings?.docConfig?.indukVerification) setAllowedCategories(settings.docConfig.indukVerification);
              else setAllowedCategories(['AKTA', 'KK', 'FOTO', 'KTP_AYAH', 'KTP_IBU', 'NISN']);
          } catch (e) { setAllowedCategories(['AKTA', 'KK', 'FOTO']); }
      };
      fetchSettings();
  }, []);

  const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className))).sort(), [students]);

  // --- SMART INITIALIZATION ---
  useEffect(() => {
      // FIX: Only target if we haven't handled this specific target ID yet
      if (targetStudentId && students.length > 0 && targetStudentId !== handledTargetRef.current) {
          const student = students.find(s => s.id === targetStudentId);
          if (student) { 
              isTargetingRef.current = true;
              setSelectedClass(student.className); 
              setSelectedStudentId(student.id); 
              handledTargetRef.current = targetStudentId; // Mark as handled
              isInitializedRef.current = true;
              setTimeout(() => { isTargetingRef.current = false; }, 800);
              return;
          }
      }

      if (!isInitializedRef.current && students.length > 0 && !selectedStudentId && !targetStudentId) {
          let found = false;
          const sortedAll = [...students].sort((a, b) => a.fullName.localeCompare(b.fullName));
          
          for (const s of sortedAll) {
              const hasPendingReq = s.correctionRequests?.some(r => r.status === 'PENDING' && !r.fieldKey.startsWith('grade-') && !r.fieldKey.startsWith('class-') && !r.fieldKey.startsWith('ijazah-'));
              const hasPendingDoc = s.documents?.some(d => d.status === 'PENDING' && allowedCategories.includes(d.category));
              
              if (hasPendingReq || hasPendingDoc) {
                  setSelectedClass(s.className);
                  setSelectedStudentId(s.id);
                  found = true;
                  break;
              }
          }

          if (!found && uniqueClasses.length > 0) {
              setSelectedClass(uniqueClasses[0]);
          }
          
          isInitializedRef.current = true;
      }
  }, [students, targetStudentId, uniqueClasses, allowedCategories, selectedStudentId]);

  useEffect(() => {
      if (!selectedClass && uniqueClasses.length > 0) {
          setSelectedClass(uniqueClasses[0]);
      }
  }, [uniqueClasses, selectedClass]);

  const filteredStudents = useMemo(() => students.filter(s => s.className === selectedClass).sort((a, b) => a.fullName.localeCompare(b.fullName)), [students, selectedClass]);
  
  useEffect(() => {
      if (isTargetingRef.current) return; 

      if (!selectedStudentId && filteredStudents.length > 0) {
          setSelectedStudentId(filteredStudents[0].id);
      } else if (filteredStudents.length > 0 && !filteredStudents.find(s => s.id === selectedStudentId)) {
          setSelectedStudentId(filteredStudents[0].id);
      }
  }, [filteredStudents, selectedStudentId]);

  const currentStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);

  useEffect(() => {
      if (currentStudent) {
          const dataCopy = JSON.parse(JSON.stringify(currentStudent));
          setFormData(prev => prev.id === currentStudent.id ? prev : dataCopy);
          setActiveTab('ALL');
      }
  }, [currentStudent]);

  const studentDocs = useMemo(() => {
      if (!currentStudent) return [];
      let docs = currentStudent.documents.filter(d => allowedCategories.includes(d.category));
      if (activeTab !== 'ALL') docs = docs.filter(d => d.category === activeTab);
      return docs;
  }, [currentStudent, activeTab, allowedCategories]);

  // Documents pending approval in current view
  const pendingDocs = useMemo(() => {
      // FIX: Ensure docs are filtered if they are already in processedIds to prevent flashing
      return studentDocs.filter(d => d.status === 'PENDING' && !processedIds.has(d.id));
  }, [studentDocs, processedIds]);

  // --- IMPROVED AUTO-ADVANCE LOGIC ---
  useEffect(() => {
      // 1. If we have a selection that is now processed or no longer pending, move to next.
      const currentDocObj = studentDocs.find(d => d.id === selectedDocId);
      // Logic fix: Check if marked processed OR actually approved in data
      const isCurrentProcessed = selectedDocId && processedIds.has(selectedDocId);
      const isCurrentDone = currentDocObj && currentDocObj.status !== 'PENDING';

      // 2. If no selection at all, or current selection is done/processed
      if (!selectedDocId || !currentDocObj || isCurrentProcessed || isCurrentDone) {
          // Find the first pending doc that is NOT in processedIds
          const nextPending = studentDocs.find(d => d.status === 'PENDING' && !processedIds.has(d.id));
          
          if (nextPending) {
              setSelectedDocId(nextPending.id);
          } else if (!selectedDocId && studentDocs.length > 0) {
              // Fallback: If nothing pending, just select the first one (for viewing)
              setSelectedDocId(studentDocs[0].id);
          }
      }
  }, [studentDocs, processedIds, selectedDocId]);

  const currentDoc = studentDocs.find(d => d.id === selectedDocId);
  // FIX: Check status from data as well to ensure UI consistency
  const isCurrentDocProcessed = currentDoc && (processedIds.has(currentDoc.id) || currentDoc.status === 'APPROVED' || currentDoc.status === 'REVISION');

  const pendingRequests = useMemo(() => {
      if (!currentStudent?.correctionRequests) return [];
      return currentStudent.correctionRequests.filter(r => 
          r.status === 'PENDING' && 
          !r.fieldKey.startsWith('grade-') && 
          !r.fieldKey.startsWith('class-') &&
          !r.fieldKey.startsWith('ijazah-') &&
          !['diplomaNumber'].includes(r.fieldKey) &&
          !processedIds.has(r.id)
      );
  }, [currentStudent, processedIds]);

  const findNextStudentWithIssues = () => {
      const currentIndex = filteredStudents.findIndex(s => s.id === selectedStudentId);
      for (let i = currentIndex + 1; i < filteredStudents.length; i++) {
          const s = filteredStudents[i];
          const hasPendingReq = s.correctionRequests?.some(r => r.status === 'PENDING' && !r.fieldKey.startsWith('grade-') && !r.fieldKey.startsWith('class-') && !r.fieldKey.startsWith('ijazah-') && !processedIds.has(r.id));
          const hasPendingDoc = s.documents.some(d => d.status === 'PENDING' && allowedCategories.includes(d.category) && !processedIds.has(d.id));
          if (hasPendingReq || hasPendingDoc) return s.id;
      }
      for (let i = 0; i < currentIndex; i++) {
          const s = filteredStudents[i];
          const hasPendingReq = s.correctionRequests?.some(r => r.status === 'PENDING' && !r.fieldKey.startsWith('grade-') && !r.fieldKey.startsWith('class-') && !r.fieldKey.startsWith('ijazah-') && !processedIds.has(r.id));
          const hasPendingDoc = s.documents.some(d => d.status === 'PENDING' && allowedCategories.includes(d.category) && !processedIds.has(d.id));
          if (hasPendingReq || hasPendingDoc) return s.id;
      }
      return null;
  };

  const handleApproveAllDocs = async () => {
      if (!currentStudent || pendingDocs.length === 0) return;
      if (!confirm(`Setujui ${pendingDocs.length} dokumen sekaligus?`)) return;

      setIsBulkApproving(true);
      
      // 1. Capture IDs for immediate local update
      const idsToProcess = pendingDocs.map(d => d.id);
      
      // 2. Optimistic Update: Mark processed immediately
      setProcessedIds(prev => {
          const next = new Set(prev);
          idsToProcess.forEach(id => next.add(id));
          return next;
      });

      try {
          // 3. Prepare updated data
          const updatedStudent = JSON.parse(JSON.stringify(currentStudent));
          updatedStudent.documents = updatedStudent.documents.map((d: any) => {
              if (idsToProcess.includes(d.id)) {
                  return {
                      ...d,
                      status: 'APPROVED',
                      verifierName: currentUser.name,
                      verificationDate: new Date().toISOString(),
                      adminNote: 'Disetujui Masal.'
                  };
              }
              return d;
          });

          // 4. Update parent state immediately (Optimistic UI)
          onUpdate(updatedStudent);
          
          // 5. Sync to server
          await api.updateStudent(updatedStudent);
          
          // Auto Advance check using the updated data structure
          const remainingReqs = updatedStudent.correctionRequests?.some((r: any) => r.status === 'PENDING' && !processedIds.has(r.id));
          const remainingAllDocs = updatedStudent.documents.some((d: any) => d.status === 'PENDING' && allowedCategories.includes(d.category) && !idsToProcess.includes(d.id));
          
          if (!remainingReqs && !remainingAllDocs) {
              const nextId = findNextStudentWithIssues();
              if (nextId) setTimeout(() => setSelectedStudentId(nextId), 500);
          }
      } catch (e) {
          console.error(e);
          // Revert processing state on error
          setProcessedIds(prev => {
              const next = new Set(prev);
              idsToProcess.forEach(id => next.delete(id));
              return next;
          });
          alert("Gagal memproses dokumen.");
      } finally {
          setIsBulkApproving(false);
      }
  };

  const handleApproveAll = async () => {
      if (!currentStudent || pendingRequests.length === 0) return;
      if (!confirm(`Apakah Anda yakin ingin menyetujui ${pendingRequests.length} usulan perubahan data sekaligus?`)) return;

      setIsBulkApproving(true);
      const updatedStudent = JSON.parse(JSON.stringify(currentStudent));
      const newlyProcessedIds = new Set<string>();

      pendingRequests.forEach(req => {
          newlyProcessedIds.add(req.id);
          if (updatedStudent.correctionRequests) {
              const reqIndex = updatedStudent.correctionRequests.findIndex((r: CorrectionRequest) => r.id === req.id);
              if (reqIndex !== -1) {
                  updatedStudent.correctionRequests[reqIndex] = {
                      ...updatedStudent.correctionRequests[reqIndex],
                      status: 'APPROVED',
                      verifierName: currentUser.name,
                      processedDate: new Date().toISOString(),
                      adminNote: 'Disetujui Masal.'
                  };
              }
          }
          const keys = req.fieldKey.split('.');
          let current = updatedStudent;
          for (let i = 0; i < keys.length - 1; i++) {
              if (!current[keys[i]]) current[keys[i]] = {};
              current = current[keys[i]];
          }
          const lastKey = keys[keys.length - 1];
          const val = (['height', 'weight', 'siblingCount', 'childOrder', 'entryYear'].includes(lastKey) || req.fieldKey.includes('circumference')) ? Number(req.proposedValue) : req.proposedValue;
          current[lastKey] = val;
      });

      setProcessedIds(prev => new Set([...prev, ...newlyProcessedIds]));
      setFormData(updatedStudent); 

      try {
          onUpdate(updatedStudent); 
          await api.updateStudent(updatedStudent);
          
          const remainingDocs = updatedStudent.documents.filter((d: any) => d.status === 'PENDING' && allowedCategories.includes(d.category) && !processedIds.has(d.id));
          if (remainingDocs.length === 0) {
              const nextId = findNextStudentWithIssues();
              if (nextId) setTimeout(() => setSelectedStudentId(nextId), 500);
          }
      } catch (e) {
          console.error(e);
          setProcessedIds(prev => {
              const next = new Set(prev);
              newlyProcessedIds.forEach(id => next.delete(id));
              return next;
          });
          alert("Gagal memproses persetujuan masal.");
      } finally {
          setIsBulkApproving(false);
      }
  };

  const handleDataCorrection = async (e: React.MouseEvent, request: CorrectionRequest, status: 'APPROVED' | 'REJECTED') => {
      e.preventDefault(); e.stopPropagation();
      if (!currentStudent) return;
      setProcessingReqId(request.id);
      setProcessedIds(prev => new Set(prev).add(request.id));

      try {
          const updatedStudent = JSON.parse(JSON.stringify(currentStudent));
          if (updatedStudent.correctionRequests) {
              updatedStudent.correctionRequests = updatedStudent.correctionRequests.map((r: CorrectionRequest) => {
                  if (r.id === request.id) {
                      return { ...r, status, verifierName: currentUser.name, processedDate: new Date().toISOString(), adminNote: status === 'APPROVED' ? 'Disetujui.' : 'Ditolak.' };
                  }
                  return r;
              });
          }

          if (status === 'APPROVED') {
              const keys = request.fieldKey.split('.');
              let current = updatedStudent;
              for (let i = 0; i < keys.length - 1; i++) {
                  if (!current[keys[i]]) current[keys[i]] = {};
                  current = current[keys[i]];
              }
              const lastKey = keys[keys.length - 1];
              const val = (['height', 'weight', 'siblingCount', 'childOrder', 'entryYear'].includes(lastKey) || request.fieldKey.includes('circumference')) ? Number(request.proposedValue) : request.proposedValue;
              current[lastKey] = val;

              const newFormData = { ...formData };
              let currentForm: any = newFormData;
              for (let i = 0; i < keys.length - 1; i++) {
                  if (!currentForm[keys[i]]) currentForm[keys[i]] = {};
                  currentForm = currentForm[keys[i]];
              }
              currentForm[keys[keys.length - 1]] = val;
              setFormData(newFormData);
          }

          // OPTIMISTIC UPDATE
          onUpdate(updatedStudent); 
          
          // Then Sync to Server
          await api.updateStudent(updatedStudent);
      } catch (e) { 
          setProcessedIds(prev => { const next = new Set(prev); next.delete(request.id); return next; });
          alert("Gagal memproses perubahan data."); 
      } finally { setProcessingReqId(null); }
  };

  const handleProcess = async (status: 'APPROVED' | 'REVISION' | 'SAVE_ONLY') => {
      if (!currentStudent) return;
      if (status === 'REVISION' && !adminNote.trim()) { alert("Mohon isi catatan revisi."); return; }
      
      setIsProcessing(true);
      // Mark as processed IMMEDIATELY to update UI
      if (status !== 'SAVE_ONLY' && currentDoc) {
          setProcessedIds(prev => new Set(prev).add(currentDoc.id));
      }

      try {
          const updatedStudent = {
              ...currentStudent, ...formData,
              dapodik: { ...currentStudent.dapodik, ...formData.dapodik },
              father: { ...currentStudent.father, ...formData.father },
              mother: { ...currentStudent.mother, ...formData.mother },
              guardian: { ...currentStudent.guardian, ...formData.guardian }
          };
          
          if (status !== 'SAVE_ONLY' && currentDoc) {
              updatedStudent.documents = updatedStudent.documents.map((d: any) => d.id === currentDoc.id ? { ...d, status, adminNote, verifierName: currentUser.name, verificationDate: new Date().toISOString() } : d);
          }
          
          // OPTIMISTIC UPDATE: Update Parent State FIRST
          onUpdate(updatedStudent); 
          
          // Then Sync to Server
          await api.updateStudent(updatedStudent);
          
          if (status !== 'SAVE_ONLY' && currentDoc) { 
              setAdminNote(''); 
              // Auto-advance logic handled by useEffect on processedIds/doc change
          }
          if (status === 'SAVE_ONLY') alert("Data berhasil disimpan.");
      } catch (e) { 
          // Revert processed ID on error
          if (status !== 'SAVE_ONLY' && currentDoc) {
            setProcessedIds(prev => { const next = new Set(prev); next.delete(currentDoc.id); return next; });
          }
          alert("Gagal memproses data. Silakan coba lagi."); 
      } finally { setIsProcessing(false); }
  };

  const renderField = ({ label, value, fieldKey, type = 'text', section }: { label: string, value: any, fieldKey: string, type?: string, section: string }) => {
      const pending = currentStudent?.correctionRequests?.find(r => r.fieldKey === fieldKey && r.status === 'PENDING' && !processedIds.has(r.id));
      const isDate = type === 'date';
      const isProcessingThis = pending && processingReqId === pending.id;
      
      const getValueFromFormData = () => {
          const keys = fieldKey.split('.');
          let current: any = formData;
          for (const k of keys) {
              if (current === undefined || current === null) return '';
              current = current[k];
          }
          return current;
      };

      const currentValue = getValueFromFormData();
      
      return (
          <div className="space-y-1 group" key={fieldKey}>
              <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{label}</label>
              </div>
              <div className="relative">
                  <input 
                      type={isDate ? 'date' : 'text'}
                      className={`w-full p-2 border rounded text-xs transition-all ${pending ? 'border-yellow-400 bg-yellow-50 pr-8' : 'border-gray-200 focus:border-blue-500'}`}
                      value={currentValue || ''}
                      onChange={(e) => {
                          const keys = fieldKey.split('.');
                          const newForm = { ...formData };
                          let curr: any = newForm;
                          for (let i = 0; i < keys.length - 1; i++) { if (!curr[keys[i]]) curr[keys[i]] = {}; curr = curr[keys[i]]; }
                          curr[keys[keys.length - 1]] = e.target.value;
                          setFormData(newForm);
                      }}
                  />
                  {pending && (
                      <div className="mt-1 bg-white border border-yellow-300 p-2 rounded-lg shadow-sm text-[10px] animate-fade-in">
                          <div className="flex justify-between items-start">
                              <div className="flex-1 mr-2">
                                  <div className="flex items-center gap-1 mb-1">
                                      <AlertCircle className="w-3 h-3 text-yellow-600" />
                                      <span className="font-bold text-yellow-800 uppercase text-[9px]">Usulan Perubahan:</span>
                                  </div>
                                  <p className="text-blue-700 font-bold text-sm bg-blue-50 px-2 py-1 rounded border border-blue-100 mb-1 inline-block">
                                    {isDate ? new Date(pending.proposedValue).toLocaleDateString('id-ID') : pending.proposedValue}
                                  </p>
                                  <p className="italic text-gray-600 leading-tight">"{pending.studentReason}"</p>
                              </div>
                              <div className="flex flex-col gap-1">
                                  <button 
                                    onClick={(e) => handleDataCorrection(e, pending, 'APPROVED')} 
                                    disabled={!!processingReqId}
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded font-bold transition-colors flex items-center justify-center gap-1 shadow-sm"
                                  >
                                      {isProcessingThis ? <Loader2 className="w-3 h-3 animate-spin"/> : <Check className="w-3 h-3" />} Terima
                                  </button>
                                  <button 
                                    onClick={(e) => handleDataCorrection(e, pending, 'REJECTED')} 
                                    disabled={!!processingReqId}
                                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded font-bold transition-colors flex items-center justify-center gap-1 shadow-sm"
                                  >
                                      {isProcessingThis ? <Loader2 className="w-3 h-3 animate-spin"/> : <X className="w-3 h-3" />} Tolak
                                  </button>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
        <div className="bg-white p-3 border-b border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm z-20">
            <div className="flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-gray-800">Verifikasi Buku Induk</h2>
            </div>
            <div className="flex gap-3">
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                        {uniqueClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 md:w-64">
                    <Search className="w-4 h-4 text-gray-500" />
                    <select className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer w-full" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                        {filteredStudents.map(s => {
                            const hasPendingReq = s.correctionRequests?.some(r => r.status === 'PENDING' && !r.fieldKey.startsWith('grade-') && !r.fieldKey.startsWith('class-') && !r.fieldKey.startsWith('ijazah-') && !processedIds.has(r.id));
                            const hasPendingDoc = s.documents.some(d => d.status === 'PENDING' && allowedCategories.includes(d.category) && !processedIds.has(d.id));
                            const hasIssues = hasPendingReq || hasPendingDoc;
                            
                            return (
                                <option key={s.id} value={s.id} className={hasIssues ? "font-bold text-red-600 bg-red-50" : ""}>
                                    {hasIssues ? '🔴 ' : ''}{s.fullName}
                                </option>
                            );
                        })}
                    </select>
                </div>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 bg-gray-900 relative flex flex-col overflow-hidden">
                {currentDoc ? (
                    <>
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-black/50 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-lg">
                            <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.2))} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors" title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
                            <span className="text-white text-xs font-mono font-bold flex items-center px-2">{Math.round(zoomLevel * 100)}%</span>
                            <button onClick={() => setZoomLevel(z => Math.min(3, z + 0.2))} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors" title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
                            <div className="w-px h-4 bg-white/20 my-auto mx-1"></div>
                            <button onClick={() => setRotation(r => r + 90)} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors" title="Putar"><RotateCw className="w-4 h-4" /></button>
                            <button onClick={() => setUseFallbackViewer(v => !v)} className="px-3 py-1 text-[10px] font-bold text-white hover:bg-white/20 rounded-full border border-white/20 ml-1 transition-colors">{useFallbackViewer ? 'Mode Default' : 'Mode Alt'}</button>
                        </div>
                        
                        <div className="flex-1 overflow-auto flex p-8">
                            <div 
                                style={{ 
                                    transform: `scale(${useFallbackViewer ? 1 : zoomLevel}) rotate(${rotation}deg)`, 
                                    transformOrigin: 'center center' 
                                }} 
                                className="relative shadow-2xl transition-transform duration-200 m-auto"
                            >
                                {(useFallbackViewer || (currentDoc.url.includes('drive.google.com') && !currentDoc.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/))) ? (
                                    <iframe src={getDriveUrl(currentDoc.url, 'preview')} className="w-[800px] h-[1100px] bg-white rounded" title="Viewer" />
                                ) : (
                                    <img 
                                        src={getDriveUrl(currentDoc.url, 'direct')} 
                                        className="max-w-full h-auto object-contain bg-white rounded" 
                                        style={{ maxHeight: '85vh', minWidth: '400px' }} 
                                        alt="Doc" 
                                        onError={() => setUseFallbackViewer(true)} 
                                    />
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <FileText className="w-16 h-16 mb-4 opacity-20" />
                        <p>Dokumen tidak tersedia.</p>
                    </div>
                )}
            </div>

            <div className="w-[480px] bg-white border-l border-gray-200 flex flex-col shadow-xl z-10">
                <div className="bg-gray-50 border-b border-gray-200">
                    <div className="p-3 text-[10px] font-bold text-gray-500 uppercase flex justify-between items-center">
                        <span>Navigasi Dokumen</span>
                        {pendingDocs.length > 0 && (
                            <button 
                                onClick={handleApproveAllDocs}
                                disabled={isBulkApproving}
                                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-[9px] font-bold flex items-center gap-1 shadow-sm transition-all"
                            >
                                {isBulkApproving ? <Loader2 className="w-3 h-3 animate-spin"/> : <CheckCheck className="w-3 h-3"/>}
                                Terima Semua ({pendingDocs.length})
                            </button>
                        )}
                        <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded ml-2">{studentDocs.length} File</span>
                    </div>
                    <div className="flex gap-2 px-3 pb-3 overflow-x-auto no-scrollbar">
                        <button onClick={() => setActiveTab('ALL')} className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border ${activeTab === 'ALL' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}>SEMUA</button>
                        {allowedCategories.map(cat => (
                            <button key={cat} onClick={() => setActiveTab(cat)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border ${activeTab === cat ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}>{DOC_LABELS[cat] || cat}</button>
                        ))}
                    </div>
                    <div className="max-h-32 overflow-y-auto border-t border-gray-100">
                        {studentDocs.map(doc => {
                            const isProcessed = processedIds.has(doc.id);
                            return (
                                <div key={doc.id} onClick={() => setSelectedDocId(doc.id)} className={`p-2 px-4 border-b border-gray-50 cursor-pointer hover:bg-white flex items-center justify-between ${selectedDocId === doc.id ? 'bg-white border-l-4 border-l-blue-600 shadow-inner' : ''}`}>
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className={`p-1 rounded ${doc.type === 'PDF' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>{doc.type === 'PDF' ? <FileText className="w-3 h-3" /> : <ScrollText className="w-3 h-3" />}</div>
                                        <span className={`text-[11px] font-bold truncate ${selectedDocId === doc.id ? 'text-blue-700' : 'text-gray-600'}`}>{DOC_LABELS[doc.category] || doc.category}</span>
                                    </div>
                                    {isProcessed ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 animate-in zoom-in" />
                                    ) : (
                                        doc.status === 'APPROVED' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : doc.status === 'REVISION' ? <XCircle className="w-3.5 h-3.5 text-red-500" /> : <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-3 bg-blue-50 border-y border-blue-100 flex justify-between items-center">
                        <span className="text-xs font-black text-blue-800 uppercase flex items-center gap-2"><User className="w-3.5 h-3.5" /> Isian Buku Induk</span>
                        <div className="flex gap-2">
                            {pendingRequests.length > 0 && (
                                <button 
                                    key="approve-all-btn" // Added key for React stability
                                    onClick={handleApproveAll} 
                                    disabled={isBulkApproving} 
                                    className="text-[10px] bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-full font-bold flex items-center gap-1 shadow-sm transition-all"
                                >
                                    {isBulkApproving ? <Loader2 className="w-3 h-3 animate-spin"/> : <CheckCheck className="w-3 h-3"/>}
                                    Terima Semua ({pendingRequests.length})
                                </button>
                            )}
                            <button onClick={() => handleProcess('SAVE_ONLY')} disabled={isProcessing} className="text-blue-600 hover:text-blue-800 p-1 bg-white rounded shadow-sm border border-blue-200">
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                        <AccordionItem title="1. Identitas Utama" icon={User} isOpen={openSection === 'IDENTITY'} onToggle={() => setOpenSection(openSection === 'IDENTITY' ? '' : 'IDENTITY')}>
                            <div className="grid grid-cols-1 gap-4">
                                {renderField({ label: "Nama Lengkap", value: formData.fullName, fieldKey: "fullName", section: "IDENTITY" })}
                                <div className="grid grid-cols-2 gap-3">
                                    {renderField({ label: "NIS", value: formData.nis, fieldKey: "nis", section: "IDENTITY" })}
                                    {renderField({ label: "NISN", value: formData.nisn, fieldKey: "nisn", section: "IDENTITY" })}
                                </div>
                                {renderField({ label: "NIK (Siswa)", value: formData.dapodik?.nik, fieldKey: "dapodik.nik", section: "IDENTITY" })}
                                <div className="grid grid-cols-2 gap-3">
                                    {renderField({ label: "Jenis Kelamin (L/P)", value: formData.gender, fieldKey: "gender", section: "IDENTITY" })}
                                    {renderField({ label: "Agama", value: formData.religion, fieldKey: "religion", section: "IDENTITY" })}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {renderField({ label: "Tempat Lahir", value: formData.birthPlace, fieldKey: "birthPlace", section: "IDENTITY" })}
                                    {renderField({ label: "Tanggal Lahir", value: formData.birthDate, fieldKey: "birthDate", type: "date", section: "IDENTITY" })}
                                </div>
                                {renderField({ label: "Kelas Saat Ini", value: formData.className, fieldKey: "className", section: "IDENTITY" })}
                                {renderField({ label: "Tahun Masuk", value: formData.entryYear, fieldKey: "entryYear", section: "IDENTITY" })}
                                {renderField({ label: "Status Siswa", value: formData.status, fieldKey: "status", section: "IDENTITY" })}
                                {renderField({ label: "Kewarganegaraan", value: formData.nationality, fieldKey: "nationality", section: "IDENTITY" })}
                                {renderField({ label: "Berkebutuhan Khusus", value: formData.dapodik?.specialNeeds, fieldKey: "dapodik.specialNeeds", section: "IDENTITY" })}
                                {renderField({ label: "Sekolah Asal", value: formData.previousSchool, fieldKey: "previousSchool", section: "IDENTITY" })}
                            </div>
                        </AccordionItem>

                        <AccordionItem title="2. Alamat & Domisili" icon={MapPin} isOpen={openSection === 'ADDRESS'} onToggle={() => setOpenSection(openSection === 'ADDRESS' ? '' : 'ADDRESS')}>
                            <div className="grid grid-cols-1 gap-4">
                                {renderField({ label: "Alamat Jalan", value: formData.address, fieldKey: "address", section: "ADDRESS" })}
                                <div className="grid grid-cols-3 gap-2">
                                    {renderField({ label: "RT", value: formData.dapodik?.rt, fieldKey: "dapodik.rt", section: "ADDRESS" })}
                                    {renderField({ label: "RW", value: formData.dapodik?.rw, fieldKey: "dapodik.rw", section: "ADDRESS" })}
                                    {renderField({ label: "Kode Pos", value: formData.postalCode, fieldKey: "postalCode", section: "ADDRESS" })}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {renderField({ label: "Dusun", value: formData.dapodik?.dusun, fieldKey: "dapodik.dusun", section: "ADDRESS" })}
                                    {renderField({ label: "Kelurahan", value: formData.dapodik?.kelurahan, fieldKey: "dapodik.kelurahan", section: "ADDRESS" })}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {renderField({ label: "Kecamatan", value: formData.subDistrict, fieldKey: "subDistrict", section: "ADDRESS" })}
                                    {renderField({ label: "Kabupaten", value: formData.district, fieldKey: "district", section: "ADDRESS" })}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {renderField({ label: "Lintang", value: formData.dapodik?.latitude, fieldKey: "dapodik.latitude", section: "ADDRESS" })}
                                    {renderField({ label: "Bujur", value: formData.dapodik?.longitude, fieldKey: "dapodik.longitude", section: "ADDRESS" })}
                                </div>
                                {renderField({ label: "Jenis Tinggal", value: formData.dapodik?.livingStatus, fieldKey: "dapodik.livingStatus", section: "ADDRESS" })}
                                {renderField({ label: "Transportasi", value: formData.dapodik?.transportation, fieldKey: "dapodik.transportation", section: "ADDRESS" })}
                                {renderField({ label: "No. Kartu Keluarga", value: formData.dapodik?.noKK, fieldKey: "dapodik.noKK", section: "ADDRESS" })}
                            </div>
                        </AccordionItem>

                        <AccordionItem title="3. Data Orang Tua" icon={Users} isOpen={openSection === 'PARENTS'} onToggle={() => setOpenSection(openSection === 'PARENTS' ? '' : 'PARENTS')}>
                            <div className="space-y-6">
                                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                                    <p className="text-[10px] font-black text-blue-800 mb-3 uppercase tracking-wider">Ayah Kandung</p>
                                    <div className="space-y-3">
                                        {renderField({ label: "Nama Ayah", value: formData.father?.name, fieldKey: "father.name", section: "PARENTS" })}
                                        {renderField({ label: "NIK Ayah", value: formData.father?.nik, fieldKey: "father.nik", section: "PARENTS" })}
                                        {renderField({ label: "Tahun Lahir", value: formData.father?.birthPlaceDate, fieldKey: "father.birthPlaceDate", section: "PARENTS" })}
                                        {renderField({ label: "Pendidikan", value: formData.father?.education, fieldKey: "father.education", section: "PARENTS" })}
                                        {renderField({ label: "Pekerjaan", value: formData.father?.job, fieldKey: "father.job", section: "PARENTS" })}
                                        {renderField({ label: "Penghasilan", value: formData.father?.income, fieldKey: "father.income", section: "PARENTS" })}
                                        {renderField({ label: "No Handphone", value: formData.father?.phone, fieldKey: "father.phone", section: "PARENTS" })}
                                    </div>
                                </div>
                                <div className="p-3 bg-pink-50/50 rounded-lg border border-pink-100">
                                    <p className="text-[10px] font-black text-pink-800 mb-3 uppercase tracking-wider">Ibu Kandung</p>
                                    <div className="space-y-3">
                                        {renderField({ label: "Nama Ibu", value: formData.mother?.name, fieldKey: "mother.name", section: "PARENTS" })}
                                        {renderField({ label: "NIK Ibu", value: formData.mother?.nik, fieldKey: "mother.nik", section: "PARENTS" })}
                                        {renderField({ label: "Tahun Lahir", value: formData.mother?.birthPlaceDate, fieldKey: "mother.birthPlaceDate", section: "PARENTS" })}
                                        {renderField({ label: "Pendidikan", value: formData.mother?.education, fieldKey: "mother.education", section: "PARENTS" })}
                                        {renderField({ label: "Pekerjaan", value: formData.mother?.job, fieldKey: "mother.job", section: "PARENTS" })}
                                        {renderField({ label: "Penghasilan", value: formData.mother?.income, fieldKey: "mother.income", section: "PARENTS" })}
                                    </div>
                                </div>
                            </div>
                        </AccordionItem>

                        <AccordionItem title="4. Data Periodik" icon={Heart} isOpen={openSection === 'PERIODIK'} onToggle={() => setOpenSection(openSection === 'PERIODIK' ? '' : 'PERIODIK')}>
                            <div className="grid grid-cols-2 gap-4">
                                {renderField({ label: "Tinggi (cm)", value: formData.height, fieldKey: "height", section: "PERIODIK" })}
                                {renderField({ label: "Berat (kg)", value: formData.weight, fieldKey: "weight", section: "PERIODIK" })}
                                {renderField({ label: "Lingkar Kepala", value: formData.dapodik?.headCircumference, fieldKey: "dapodik.headCircumference", section: "PERIODIK" })}
                                {renderField({ label: "Golongan Darah", value: formData.bloodType, fieldKey: "bloodType", section: "PERIODIK" })}
                                {renderField({ label: "Jml Saudara", value: formData.siblingCount, fieldKey: "siblingCount", section: "PERIODIK" })}
                                {renderField({ label: "Anak Ke-", value: formData.childOrder, fieldKey: "childOrder", section: "PERIODIK" })}
                                {renderField({ label: "Jarak Sekolah", value: formData.dapodik?.distanceToSchool, fieldKey: "dapodik.distanceToSchool", section: "PERIODIK" })}
                                {renderField({ label: "Waktu Tempuh", value: formData.dapodik?.travelTimeMinutes, fieldKey: "dapodik.travelTimeMinutes", section: "PERIODIK" })}
                            </div>
                        </AccordionItem>

                        <AccordionItem title="5. Kesejahteraan" icon={Wallet} isOpen={openSection === 'WELFARE'} onToggle={() => setOpenSection(openSection === 'WELFARE' ? '' : 'WELFARE')}>
                            <div className="space-y-4">
                                {renderField({ label: "No. SKHUN", value: formData.dapodik?.skhun, fieldKey: "dapodik.skhun", section: "WELFARE" })}
                                {renderField({ label: "No. Peserta UN", value: formData.dapodik?.unExamNumber, fieldKey: "dapodik.unExamNumber", section: "WELFARE" })}
                                {renderField({ label: "No. Ijazah (SD)", value: formData.diplomaNumber, fieldKey: "diplomaNumber", section: "WELFARE" })}
                                {renderField({ label: "No. Reg Akta", value: formData.dapodik?.birthRegNumber, fieldKey: "dapodik.birthRegNumber", section: "WELFARE" })}
                                {renderField({ label: "No. KKS", value: formData.dapodik?.kksNumber, fieldKey: "dapodik.kksNumber", section: "WELFARE" })}
                                {renderField({ label: "Email Pribadi", value: formData.dapodik?.email, fieldKey: "dapodik.email", section: "WELFARE" })}
                                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100 space-y-3">
                                    <p className="text-[10px] font-bold text-yellow-800 uppercase">Program PIP/KIP</p>
                                    {renderField({ label: "Penerima KIP", value: formData.dapodik?.kipReceiver, fieldKey: "dapodik.kipReceiver", section: "WELFARE" })}
                                    {renderField({ label: "Nomor KIP", value: formData.dapodik?.kipNumber, fieldKey: "dapodik.kipNumber", section: "WELFARE" })}
                                    {renderField({ label: "Nama di KIP", value: formData.dapodik?.kipName, fieldKey: "dapodik.kipName", section: "WELFARE" })}
                                </div>
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
                                    <p className="text-[10px] font-bold text-blue-800 uppercase">Rekening Bank (PIP)</p>
                                    {renderField({ label: "Nama Bank", value: formData.dapodik?.bank, fieldKey: "dapodik.bank", section: "WELFARE" })}
                                    {renderField({ label: "Nomor Rekening", value: formData.dapodik?.bankAccount, fieldKey: "dapodik.bankAccount", section: "WELFARE" })}
                                    {renderField({ label: "Atas Nama", value: formData.dapodik?.bankAccountName, fieldKey: "dapodik.bankAccountName", section: "WELFARE" })}
                                </div>
                            </div>
                        </AccordionItem>
                    </div>

                    {currentDoc ? (
                        <div className="p-4 border-t border-gray-200 bg-gray-50 shadow-inner">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Catatan Dokumen</label>
                            <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Catatan untuk siswa jika ditolak..." value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
                            
                            {isCurrentDocProcessed && (
                                <div className={`mb-3 p-2 rounded text-center text-xs font-bold ${currentDoc.status === 'APPROVED' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                    Status Saat Ini: {currentDoc.status === 'APPROVED' ? 'DISETUJUI' : 'DITOLAK / REVISI'}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handleProcess('REVISION')} disabled={isProcessing} className="py-2.5 bg-white border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 text-sm flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Tolak / Batalkan</button>
                                <button onClick={() => handleProcess('APPROVED')} disabled={isProcessing} className={`py-2.5 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 shadow-sm ${currentDoc.status === 'APPROVED' ? 'bg-green-700' : 'bg-green-600 hover:bg-green-700'}`}>{isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {currentDoc.status === 'APPROVED' ? 'Sudah Valid' : 'Valid & Simpan'}</button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 text-xs">
                            Tidak ada dokumen yang dipilih.
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default VerificationView;
