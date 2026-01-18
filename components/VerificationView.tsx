
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Student, CorrectionRequest } from '../types';
import { 
  CheckCircle2, Loader2, ZoomIn, ZoomOut, Maximize2, AlertCircle, ExternalLink, FileText, ImageIcon, FileType, Save, Pencil, Activity, Eye, RefreshCw, X, Search, ListChecks, XCircle, Filter, ScrollText
} from 'lucide-react';
import { api } from '../services/api';

interface VerificationViewProps {
  students: Student[];
  targetStudentId?: string; // Prop untuk navigasi dari notifikasi
  onUpdate?: () => void;
  onSave?: (student: Student) => void;
  currentUser?: { name: string; role: string }; 
}

// ... (Helper functions getDriveUrl, PDFPageCanvas remain the same) ...
const getDriveUrl = (url: string, type: 'preview' | 'direct') => {
    if (!url) return '';
    if (url.startsWith('blob:')) return url; 

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
            if (type === 'preview') return `https://drive.google.com/file/d/${id}/preview`;
            if (type === 'direct') return `https://drive.google.com/uc?export=view&id=${id}`;
        }
    }
    return url;
};

const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    } catch { return dateStr; }
};

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

const VerificationView: React.FC<VerificationViewProps> = ({ students, targetStudentId, onUpdate, onSave, currentUser }) => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [activeDocType, setActiveDocType] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); 
  const [layoutMode, setLayoutMode] = useState<'split' | 'full-doc'>('split');
  const [availableDocTypes, setAvailableDocTypes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Actions
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [isSaving, setIsSaving] = useState(false); 
  const [forceUpdate, setForceUpdate] = useState(0);

  // Edit Data State
  const [isEditingData, setIsEditingData] = useState(false);
  const [editFormData, setEditFormData] = useState<Student | null>(null);

  // Data Verification State
  const [adminVerifyModalOpen, setAdminVerifyModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CorrectionRequest | null>(null);
  const [adminResponseNote, setAdminResponseNote] = useState('');

  // PDF States
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [useFallbackViewer, setUseFallbackViewer] = useState(false);

  // Load Config
  useEffect(() => {
      const loadConfig = async () => {
          try {
              // Master Docs
              const MASTER_LIST = [
                  { id: 'AKTA', label: 'Akta Kelahiran' }, 
                  { id: 'KK', label: 'Kartu Keluarga' },
                  { id: 'KTP_AYAH', label: 'KTP Ayah' }, 
                  { id: 'KTP_IBU', label: 'KTP Ibu' }, 
                  { id: 'FOTO', label: 'Pas Foto' },
                  { id: 'NISN', label: 'Bukti NISN' },
                  { id: 'KIP', label: 'KIP/PKH' },
                  { id: 'IJAZAH', label: 'Ijazah SD' }, 
                  { id: 'SKL', label: 'Surat Ket. Lulus' },
              ];

              // Try fetch settings
              const settings = await api.getAppSettings();
              let allowedDocs = ['AKTA', 'KK', 'FOTO', 'KTP_AYAH', 'KTP_IBU']; // Default Buku Induk Verification Docs

              if (settings && settings.docConfig && settings.docConfig.indukVerification) {
                  allowedDocs = settings.docConfig.indukVerification;
              }

              // Filter MASTER_LIST based on allowedDocs
              const filtered = MASTER_LIST.filter(d => allowedDocs.includes(d.id));
              
              // If filtered is empty (edge case), use default
              if (filtered.length === 0) {
                  setAvailableDocTypes([{ id: 'AKTA', label: 'Akta Kelahiran' }, { id: 'KK', label: 'Kartu Keluarga' }]);
              } else {
                  setAvailableDocTypes(filtered);
              }
              
              if (filtered.length > 0 && !activeDocType) {
                  setActiveDocType(filtered[0].id);
              }
          } catch (e) {
              console.error("Config load error", e);
              // Fallback
              setAvailableDocTypes([{ id: 'AKTA', label: 'Akta Kelahiran' }, { id: 'KK', label: 'Kartu Keluarga' }]);
              setActiveDocType('AKTA');
          }
      };
      
      loadConfig();
  }, []);

  // Memoized Data
  const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className))).sort(), [students]);
  const studentsInClass = useMemo(() => {
      let list = students.filter(s => s.className === selectedClass);
      if (searchTerm) {
          list = list.filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.nisn.includes(searchTerm));
      }
      return list;
  }, [students, selectedClass, searchTerm]);
  const currentStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);
  
  const currentDoc = useMemo(() => {
      if (!currentStudent || !activeDocType) return undefined;
      return currentStudent.documents.find(d => d.category === activeDocType);
  }, [currentStudent, activeDocType, forceUpdate]);

  // Init Selection logic (HANDLE TARGET STUDENT ID FROM NOTIFICATION)
  useEffect(() => {
      if (targetStudentId) {
          const target = students.find(s => s.id === targetStudentId);
          if (target) {
              setSelectedClass(target.className);
              setSelectedStudentId(target.id);
          }
      } else if (uniqueClasses.length > 0 && !selectedClass) {
          setSelectedClass(uniqueClasses[0]);
      }
  }, [targetStudentId, uniqueClasses]); 

  useEffect(() => {
      if (studentsInClass.length > 0 && !selectedStudentId && !targetStudentId) {
          setSelectedStudentId(studentsInClass[0].id);
      }
  }, [studentsInClass, targetStudentId]);

  // Detect file type robustly
  const isImageFile = (doc: any) => {
      if (!doc) return false;
      return doc.type === 'IMAGE' || /\.(jpg|jpeg|png|gif|webp|bmp|heic)$/i.test(doc.name);
  };

  const isDriveUrl = currentDoc && (currentDoc.url.includes('drive.google.com') || currentDoc.url.includes('docs.google.com') || currentDoc.url.includes('googleusercontent.com'));

  // ... (Viewer Logic Effect) ...
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const loadPdf = async () => {
        if (!isMounted) return;
        setPdfDoc(null); setIsPdfLoading(false); setPdfError(false); setUseFallbackViewer(false); setZoomLevel(1.0);
        if (!currentStudent || !currentDoc) return;
        if (isDriveUrl && !isImageFile(currentDoc)) { if(isMounted) setUseFallbackViewer(true); return; }
        if (currentDoc.type === 'PDF' || currentDoc.name.toLowerCase().endsWith('.pdf')) {
            if (!currentDoc.url.startsWith('blob:')) { if(isMounted) setUseFallbackViewer(true); return; }
            if(isMounted) setIsPdfLoading(true);
            try {
                // @ts-ignore
                const pdfjsLib = await import('pdfjs-dist');
                if(!isMounted) return;
                const pdfjs = pdfjsLib.default ? pdfjsLib.default : pdfjsLib;
                if (!pdfjs.GlobalWorkerOptions.workerSrc) { pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`; }
                const response = await fetch(currentDoc.url, { signal: controller.signal });
                if (!response.ok) throw new Error("Network response was not ok");
                const arrayBuffer = await response.arrayBuffer();
                if(!isMounted) return;
                const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                if(isMounted) { setPdfDoc(pdf); setNumPages(pdf.numPages); setIsPdfLoading(false); }
            } catch (error: any) { 
                if (error.name === 'AbortError') return;
                if(isMounted) { console.error("PDF Load Error, falling back:", error); setUseFallbackViewer(true); setIsPdfLoading(false); }
            }
        }
    };
    loadPdf();
    return () => { isMounted = false; controller.abort(); };
  }, [currentDoc]);

  const handleVerifyDoc = async (status: 'APPROVED' | 'REVISION', note?: string) => {
      if (currentDoc && currentStudent) {
          setIsSaving(true);
          const updatedDocs = currentStudent.documents.map(d => d.id === currentDoc.id ? { ...d, status, adminNote: note || (status === 'APPROVED' ? 'Valid' : ''), verificationDate: new Date().toISOString().split('T')[0], verifierName: currentUser?.name || 'Admin', verifierRole: currentUser?.role || 'ADMIN' } : d);
          const updatedStudent = { ...currentStudent, documents: updatedDocs };
          try {
              if (onSave) await onSave(updatedStudent);
              else { await api.updateStudent(updatedStudent); if (onUpdate) onUpdate(); }
          } catch (e) { console.error("Save failed", e); alert("Gagal menyimpan status."); } 
          finally { setIsSaving(false); setRejectModalOpen(false); setRejectionNote(''); setForceUpdate(prev => prev + 1); }
      }
  };

  // ... (Edit Data Logic) ...
  const handleStartEdit = () => { if (currentStudent) { setEditFormData(JSON.parse(JSON.stringify(currentStudent))); setIsEditingData(true); } };
  const handleCancelEdit = () => { setIsEditingData(false); setEditFormData(null); };
  const handleSaveData = async () => {
      if (!editFormData) return;
      setIsSaving(true);
      try {
          if (onSave) await onSave(editFormData);
          else { await api.updateStudent(editFormData); if (onUpdate) onUpdate(); }
          setIsEditingData(false); setEditFormData(null);
          alert("Data berhasil disimpan.");
      } catch (e) { console.error(e); alert("Gagal menyimpan data."); } 
      finally { setIsSaving(false); }
  };
  const handleInputChange = (fieldKey: string, value: string) => {
      if (!editFormData) return;
      const keys = fieldKey.split('.');
      const newData = { ...editFormData };
      let current: any = newData;
      for (let i = 0; i < keys.length - 1; i++) { if (!current[keys[i]]) current[keys[i]] = {}; current = current[keys[i]]; }
      current[keys[keys.length - 1]] = value;
      setEditFormData(newData);
  };
  const getNestedValue = (obj: any, path: string) => { if (!path) return ''; return path.split('.').reduce((o, i) => (o ? o[i] : ''), obj); };

  // --- ADMIN DATA VERIFICATION HANDLERS (REQUESTS) ---
  const handleAdminVerifyClick = (request: CorrectionRequest) => {
      setSelectedRequest(request);
      setAdminResponseNote(request.adminNote || '');
      setAdminVerifyModalOpen(true);
  };

  const processVerification = async (action: 'APPROVED' | 'REJECTED') => {
      if (!currentStudent || !selectedRequest) return;
      if (action === 'REJECTED' && !adminResponseNote.trim()) { alert("Mohon isi alasan penolakan."); return; }
      setIsSaving(true);
      const updatedStudent = JSON.parse(JSON.stringify(currentStudent));
      
      updatedStudent.correctionRequests = updatedStudent.correctionRequests.map((req: CorrectionRequest) => {
          if (req.id === selectedRequest.id) {
              return { ...req, status: action, adminNote: adminResponseNote || (action === 'APPROVED' ? 'Disetujui.' : 'Ditolak.'), verifierName: currentUser?.name || 'Admin', processedDate: new Date().toISOString() };
          }
          return req;
      });

      if (action === 'APPROVED') {
          const keys = selectedRequest.fieldKey.split('.');
          let current: any = updatedStudent;
          for (let i = 0; i < keys.length - 1; i++) { if (!current[keys[i]]) current[keys[i]] = {}; current = current[keys[i]]; }
          const lastKey = keys[keys.length - 1];
          const newValue = selectedRequest.proposedValue;
          if (current[lastKey] !== undefined && typeof current[lastKey] === 'number') { current[lastKey] = Number(newValue) || 0; } else { current[lastKey] = newValue; }
      }

      try {
          if (onSave) { await onSave(updatedStudent); } else { await api.updateStudent(updatedStudent); if (onUpdate) onUpdate(); }
          setAdminVerifyModalOpen(false); setForceUpdate(prev => prev + 1); alert(`Data berhasil ${action === 'APPROVED' ? 'disetujui' : 'ditolak'}.`);
      } catch (e) { alert("Gagal menyimpan perubahan."); } finally { setIsSaving(false); }
  };

  const allRequests = useMemo(() => {
      if (!currentStudent?.correctionRequests) return [];
      const filtered = currentStudent.correctionRequests.filter(r => !r.fieldKey.startsWith('grade-') && !r.fieldKey.startsWith('class-') && !r.fieldKey.startsWith('ijazah-'));
      return filtered.sort((a, b) => {
          if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
          if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
          return new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime();
      });
  }, [currentStudent]);

  // --- REUSABLE COMPONENTS ---
  const SubHeader = ({ children }: { children?: React.ReactNode }) => (
    <div className="bg-gray-200 px-2 py-1 text-[10px] font-bold border-y border-gray-300 text-center uppercase text-gray-700 mt-2 mb-1">
        {children}
    </div>
  );

  const FormField = ({ label, value, fieldKey }: { label: string, value: string | number | undefined, fieldKey?: string }) => {
      const pendingReq = fieldKey ? currentStudent?.correctionRequests?.find(r => r.fieldKey === fieldKey && r.status === 'PENDING') : null;
      const displayValue = isEditingData && editFormData && fieldKey ? getNestedValue(editFormData, fieldKey) : value;
      const isDate = fieldKey === 'birthDate' || fieldKey?.includes('Date');
      
      let formattedValue = displayValue;
      if(isDate && !isEditingData) formattedValue = formatDateIndo(String(displayValue || ''));
      if(value === 0 || value === '0') formattedValue = '0';
      if(!value && value !== 0) formattedValue = '-';

      return (
        <div className="flex flex-col border-b border-gray-100 py-1.5 hover:bg-gray-50 transition-colors px-1">
            <span className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">{label}</span>
            <div className="flex items-center gap-2 w-full">
                {isEditingData && fieldKey ? (
                    <input type={isDate ? "date" : "text"} className="w-full text-sm font-bold bg-blue-50 border-b border-blue-300 outline-none text-blue-900 px-1 py-0.5" value={displayValue || ''} onChange={(e) => handleInputChange(fieldKey, e.target.value)} />
                ) : (
                    <span className={`text-sm font-semibold truncate ${pendingReq ? 'line-through text-gray-400' : 'text-gray-800'}`}>{formattedValue}</span>
                )}
                {pendingReq && !isEditingData && (
                    <div className="flex items-center gap-1 bg-yellow-100 px-2 py-0.5 rounded border border-yellow-300 cursor-pointer animate-pulse ml-auto shadow-sm hover:bg-yellow-200" onClick={() => handleAdminVerifyClick(pendingReq)} title="Klik untuk verifikasi">
                        <span className="text-xs font-bold text-yellow-900">{isDate ? formatDateIndo(pendingReq.proposedValue) : pendingReq.proposedValue}</span>
                        <AlertCircle className="w-3 h-3 text-yellow-700" />
                    </div>
                )}
            </div>
        </div>
      );
  };

  return (
    <div className="flex flex-col h-full animate-fade-in relative">
        {rejectModalOpen && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col">
                    <h3 className="font-bold text-red-600 mb-2">Tolak Dokumen</h3>
                    <textarea className="w-full p-2 border rounded mb-4" rows={3} value={rejectionNote} onChange={e => setRejectionNote(e.target.value)} placeholder="Alasan penolakan..." />
                    <div className="flex justify-end gap-2">
                        <button onClick={()=>setRejectModalOpen(false)} className="px-3 py-1 bg-gray-100 rounded">Batal</button>
                        <button onClick={() => handleVerifyDoc('REVISION', rejectionNote)} disabled={isSaving} className="px-3 py-1 bg-red-600 text-white rounded flex items-center">{isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Simpan'}</button>
                    </div>
                </div>
            </div>
        )}
        {adminVerifyModalOpen && selectedRequest && (
            <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform scale-100 transition-all">
                    <div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="text-lg font-bold text-gray-800">Verifikasi Pengajuan</h3><button onClick={() => setAdminVerifyModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button></div>
                    <div className="space-y-4 mb-6">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200"><p className="text-xs font-bold text-gray-500 uppercase mb-1">Item Perubahan</p><p className="text-sm font-semibold text-gray-800">{selectedRequest.fieldName}</p></div>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 p-3 bg-red-50 border border-red-100 rounded-lg"><p className="text-[10px] text-red-500 font-bold uppercase">Data Lama</p><p className="text-sm font-bold text-gray-700 line-through decoration-red-400">{selectedRequest.originalValue}</p></div>
                            <div className="flex-1 p-3 bg-green-50 border border-green-100 rounded-lg"><p className="text-[10px] text-green-600 font-bold uppercase">Usulan Baru</p><p className="text-sm font-bold text-gray-800">{selectedRequest.proposedValue}</p></div>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100"><p className="text-xs font-bold text-yellow-700 uppercase mb-1">Alasan Siswa</p><p className="text-sm text-gray-700 italic">"{selectedRequest.studentReason}"</p></div>
                        {selectedRequest.status === 'PENDING' && (<div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Catatan Admin (Opsional)</label><textarea className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" rows={2} placeholder="Alasan penolakan atau catatan..." value={adminResponseNote} onChange={(e) => setAdminResponseNote(e.target.value)} /></div>)}
                    </div>
                    {selectedRequest.status === 'PENDING' && (<div className="flex gap-2"><button onClick={() => processVerification('REJECTED')} disabled={isSaving} className="flex-1 py-2 bg-white border border-red-200 text-red-600 font-bold rounded-lg text-sm hover:bg-red-50 flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Tolak</button><button onClick={() => processVerification('APPROVED')} disabled={isSaving} className="flex-1 py-2 bg-green-600 text-white font-bold rounded-lg text-sm hover:bg-green-700 flex items-center justify-center gap-2">{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Setujui</button></div>)}
                </div>
            </div>
        )}

        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-4 mb-4">
            <div className="flex gap-2 w-full xl:w-auto">
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200"><Filter className="w-4 h-4 text-gray-500" /><select className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer w-24 md:w-auto" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}><option value="">Pilih Kelas</option>{uniqueClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)}</select></div>
                <div className="relative flex-1 md:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><input type="text" placeholder="Cari Siswa..." className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:bg-white transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                <select className="pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 w-full md:w-auto" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>{studentsInClass.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}</select>
            </div>
            <div className="flex gap-1 overflow-x-auto max-w-full pb-1 no-scrollbar">{availableDocTypes.map(type => { const doc = currentStudent?.documents.find(d => d.category === type.id); let colorClass = 'bg-white text-gray-600 border-gray-200'; if (doc?.status === 'APPROVED') colorClass = 'bg-green-50 text-green-700 border-green-200'; if (doc?.status === 'REVISION') colorClass = 'bg-red-50 text-red-700 border-red-200'; if (doc?.status === 'PENDING') colorClass = 'bg-yellow-50 text-yellow-700 border-yellow-200'; return (<button key={type.id} onClick={() => setActiveDocType(type.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${activeDocType === type.id ? 'ring-2 ring-blue-500 border-blue-500 z-10' : ''} ${colorClass} hover:shadow-sm`}>{type.label}</button>); })}</div>
        </div>

        {currentStudent ? (
            <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden relative">
                <div className={`flex flex-col bg-gray-800 rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${layoutMode === 'full-doc' ? 'w-full absolute inset-0 z-20' : 'w-full lg:w-3/5 h-full'}`}>
                    <div className="h-14 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4 text-gray-300"><span className="font-bold text-white text-sm hidden md:block">{availableDocTypes.find(t => t.id === activeDocType)?.label}</span><div className="flex items-center gap-2"><button onClick={()=>setZoomLevel(z=>Math.max(0.5, z-0.2))} className="p-1 hover:bg-gray-700 rounded"><ZoomOut className="w-4 h-4" /></button><span className="text-xs w-8 text-center">{Math.round(zoomLevel*100)}%</span><button onClick={()=>setZoomLevel(z=>Math.min(3, z+0.2))} className="p-1 hover:bg-gray-700 rounded"><ZoomIn className="w-4 h-4" /></button><button onClick={()=>setLayoutMode(m=>m==='full-doc'?'split':'full-doc')} className="p-1 hover:bg-gray-700 rounded ml-2"><Maximize2 className="w-4 h-4" /></button></div></div>
                    <div className="flex-1 overflow-auto p-4 bg-gray-900/50 flex items-start justify-center pb-32 relative">
                        <div style={{ transform: `scale(${useFallbackViewer || (isDriveUrl && !isImageFile(currentDoc)) ? 1 : zoomLevel})`, transformOrigin: 'top center', width: '100%', display: 'flex', justifyContent: 'center' }}>
                            {currentDoc ? ((useFallbackViewer || (isDriveUrl && !isImageFile(currentDoc))) ? (<iframe src={getDriveUrl(currentDoc.url, 'preview')} className="w-full min-h-[1100px] border-none rounded bg-white shadow-lg" title="Document Viewer" allow="autoplay" />) : (isImageFile(currentDoc) ? (<img src={isDriveUrl ? getDriveUrl(currentDoc.url, 'direct') : currentDoc.url} className="w-full h-auto object-contain bg-white shadow-sm rounded" alt="Document" onError={() => setUseFallbackViewer(true)} />) : (<div className="bg-white min-h-[600px] w-full max-w-[900px] flex flex-col items-center justify-start relative overflow-auto p-4 rounded shadow-lg">{isPdfLoading ? (<div className="flex flex-col items-center justify-center h-full pt-20"><Loader2 className="animate-spin w-10 h-10 text-blue-500 mb-2" /><p className="text-xs text-gray-500">Memuat PDF...</p></div>) : (pdfDoc ? (Array.from(new Array(numPages), (el, index) => (<PDFPageCanvas key={`page_${index + 1}`} pdf={pdfDoc} pageNum={index + 1} scale={zoomLevel} />))) : (<div className="text-red-500 flex flex-col items-center justify-center h-full pt-20"><AlertCircle className="w-8 h-8 mb-2" /><p>{pdfError ? 'Gagal memuat PDF' : 'PDF Viewer Error'}</p><button onClick={() => setUseFallbackViewer(true)} className="mt-2 text-xs underline text-blue-600">Coba Mode Alternatif</button></div>))}</div>))) : (<div className="flex flex-col items-center justify-center h-full text-gray-400"><ScrollText className="w-16 h-16 mb-4 opacity-20" /><p>Dokumen {activeDocType} belum diupload.</p></div>)}
                        </div>
                    </div>
                    {currentDoc && (<div className="bg-gray-900 border-t border-gray-700 p-4 flex justify-between items-center"><div className="flex items-center gap-2"><span className={`px-2 py-1 rounded text-xs font-bold ${currentDoc.status === 'APPROVED' ? 'bg-green-900 text-green-300' : currentDoc.status === 'REVISION' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'}`}>{currentDoc.status === 'APPROVED' ? 'Disetujui' : currentDoc.status === 'REVISION' ? 'Perlu Revisi' : 'Menunggu Verifikasi'}</span></div><div className="flex gap-2"><button onClick={() => { setRejectionNote(''); setRejectModalOpen(true); }} disabled={isSaving} className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/50 rounded-lg hover:bg-red-600 hover:text-white transition-colors text-sm font-bold">Tolak</button><button onClick={() => handleVerifyDoc('APPROVED')} disabled={isSaving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-900/20">{isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4" />} Setujui</button></div></div>)}
                </div>

                <div className={`bg-white rounded-xl border border-gray-200 flex flex-col shadow-sm transition-all duration-300 ${layoutMode === 'full-doc' ? 'hidden' : 'flex-1'} overflow-hidden`}>
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <div><h3 className="font-bold text-gray-800 flex items-center gap-2"><ScrollText className="w-5 h-5 text-blue-600" /> Data Buku Induk</h3><p className="text-xs text-gray-500 mt-1">Data referensi untuk verifikasi dokumen.</p></div>
                        <div className="flex gap-2">
                            {isEditingData ? (<><button onClick={handleCancelEdit} disabled={isSaving} className="px-2 py-1 bg-white border border-gray-300 rounded text-[10px] hover:bg-gray-50 flex items-center gap-1"><X className="w-3 h-3" /> Batal</button><button onClick={handleSaveData} disabled={isSaving} className="px-2 py-1 bg-green-600 text-white rounded text-[10px] hover:bg-green-700 flex items-center gap-1">{isSaving ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3" />} Simpan</button></>) : (<button onClick={handleStartEdit} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold hover:bg-blue-200 flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit Data</button>)}
                        </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {allRequests.length > 0 && !isEditingData && (
                            <div className="border-b border-gray-200 bg-yellow-50 p-3 overflow-y-auto max-h-48">
                                <div className="text-xs font-bold text-yellow-800 flex items-center gap-2 mb-2"><ListChecks className="w-4 h-4" /> Pengajuan Perubahan Data ({allRequests.length})</div>
                                <div className="space-y-2">{allRequests.map(req => (<div key={req.id} className="bg-white border border-yellow-200 rounded-lg p-2 shadow-sm cursor-pointer hover:bg-yellow-100 transition-colors" onClick={() => handleAdminVerifyClick(req)}><div className="flex justify-between items-center"><p className="text-xs font-bold text-gray-800">{req.fieldName}</p><span className={`text-[9px] px-1 rounded font-bold ${req.status === 'PENDING' ? 'bg-yellow-200 text-yellow-800' : req.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{req.status}</span></div><div className="mt-1 flex items-center gap-1 text-[10px] text-gray-500"><span className="line-through decoration-red-300 truncate max-w-[40%]">{req.originalValue}</span><span>➔</span><span className="font-bold text-gray-800">{req.proposedValue}</span></div></div>))}</div>
                            </div>
                        )}

                        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                            <SubHeader>Identitas Peserta Didik</SubHeader>
                            <FormField label="Nama Lengkap" value={currentStudent.fullName} fieldKey="fullName" />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="NISN" value={currentStudent.nisn} fieldKey="nisn" />
                                <FormField label="NIS" value={currentStudent.nis} fieldKey="nis" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="NIK" value={currentStudent.dapodik.nik} fieldKey="dapodik.nik" />
                                <FormField label="No KK" value={currentStudent.dapodik.noKK} fieldKey="dapodik.noKK" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Tempat Lahir" value={currentStudent.birthPlace} fieldKey="birthPlace" />
                                <FormField label="Tanggal Lahir" value={currentStudent.birthDate} fieldKey="birthDate" />
                            </div>
                            <FormField label="Agama" value={currentStudent.religion} fieldKey="religion" />
                            <FormField label="Kewarganegaraan" value={currentStudent.nationality} fieldKey="nationality" />
                            <FormField label="Status" value={currentStudent.status} fieldKey="status" />
                            <FormField label="Berkebutuhan Khusus" value={currentStudent.dapodik.specialNeeds} fieldKey="dapodik.specialNeeds" />

                            <SubHeader>Alamat Domisili</SubHeader>
                            <FormField label="Alamat Jalan" value={currentStudent.address} fieldKey="address" />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="RT" value={currentStudent.dapodik.rt} fieldKey="dapodik.rt" />
                                <FormField label="RW" value={currentStudent.dapodik.rw} fieldKey="dapodik.rw" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Dusun" value={currentStudent.dapodik.dusun} fieldKey="dapodik.dusun" />
                                <FormField label="Desa/Kelurahan" value={currentStudent.dapodik.kelurahan} fieldKey="dapodik.kelurahan" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Kecamatan" value={currentStudent.subDistrict} fieldKey="subDistrict" />
                                <FormField label="Kabupaten" value={currentStudent.district} fieldKey="district" />
                            </div>
                            <FormField label="Kode Pos" value={currentStudent.postalCode} fieldKey="postalCode" />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Lintang" value={currentStudent.dapodik.latitude} fieldKey="dapodik.latitude" />
                                <FormField label="Bujur" value={currentStudent.dapodik.longitude} fieldKey="dapodik.longitude" />
                            </div>
                            <FormField label="Jenis Tinggal" value={currentStudent.dapodik.livingStatus} fieldKey="dapodik.livingStatus" />
                            <FormField label="Alat Transportasi" value={currentStudent.dapodik.transportation} fieldKey="dapodik.transportation" />
                            
                            <SubHeader>Data Orang Tua</SubHeader>
                            <div className="bg-blue-50 p-2 rounded mb-2">
                                <p className="text-[10px] font-bold text-blue-800 mb-1">Data Ayah</p>
                                <FormField label="Nama Ayah" value={currentStudent.father.name} fieldKey="father.name" />
                                <FormField label="NIK Ayah" value={currentStudent.father.nik} fieldKey="father.nik" />
                                <FormField label="Tahun Lahir" value={currentStudent.father.birthPlaceDate} fieldKey="father.birthPlaceDate" />
                                <FormField label="Pendidikan" value={currentStudent.father.education} fieldKey="father.education" />
                                <FormField label="Pekerjaan" value={currentStudent.father.job} fieldKey="father.job" />
                                <FormField label="Penghasilan" value={currentStudent.father.income} fieldKey="father.income" />
                                <FormField label="No HP" value={currentStudent.father.phone} fieldKey="father.phone" />
                            </div>
                            <div className="bg-pink-50 p-2 rounded">
                                <p className="text-[10px] font-bold text-pink-800 mb-1">Data Ibu</p>
                                <FormField label="Nama Ibu" value={currentStudent.mother.name} fieldKey="mother.name" />
                                <FormField label="NIK Ibu" value={currentStudent.mother.nik} fieldKey="mother.nik" />
                                <FormField label="Tahun Lahir" value={currentStudent.mother.birthPlaceDate} fieldKey="mother.birthPlaceDate" />
                                <FormField label="Pendidikan" value={currentStudent.mother.education} fieldKey="mother.education" />
                                <FormField label="Pekerjaan" value={currentStudent.mother.job} fieldKey="mother.job" />
                                <FormField label="Penghasilan" value={currentStudent.mother.income} fieldKey="mother.income" />
                                <FormField label="No HP" value={currentStudent.mother.phone} fieldKey="mother.phone" />
                            </div>
                            
                            <SubHeader>Data Wali</SubHeader>
                            <FormField label="Nama Wali" value={currentStudent.guardian?.name} fieldKey="guardian.name" />
                            <FormField label="NIK Wali" value={currentStudent.guardian?.nik} fieldKey="guardian.nik" />
                            <FormField label="Tahun Lahir" value={currentStudent.guardian?.birthPlaceDate} fieldKey="guardian.birthPlaceDate" />
                            <FormField label="Pekerjaan" value={currentStudent.guardian?.job} fieldKey="guardian.job" />
                            <FormField label="Penghasilan" value={currentStudent.guardian?.income} fieldKey="guardian.income" />
                            
                            <SubHeader>Data Periodik</SubHeader>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Tinggi Badan (cm)" value={currentStudent.height} fieldKey="height" />
                                <FormField label="Berat Badan (kg)" value={currentStudent.weight} fieldKey="weight" />
                            </div>
                            <FormField label="Lingkar Kepala" value={currentStudent.dapodik.headCircumference} fieldKey="dapodik.headCircumference" />
                            <FormField label="Golongan Darah" value={currentStudent.bloodType} fieldKey="bloodType" />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Jarak ke Sekolah (km)" value={currentStudent.dapodik.distanceToSchool} fieldKey="dapodik.distanceToSchool" />
                                <FormField label="Waktu Tempuh (menit)" value={currentStudent.dapodik.travelTimeMinutes} fieldKey="dapodik.travelTimeMinutes" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Anak ke-" value={currentStudent.childOrder} fieldKey="childOrder" />
                                <FormField label="Jumlah Saudara" value={currentStudent.siblingCount} fieldKey="siblingCount" />
                            </div>

                            <SubHeader>Kesejahteraan & Lainnya</SubHeader>
                            <FormField label="No SKHUN" value={currentStudent.dapodik.skhun} fieldKey="dapodik.skhun" />
                            <FormField label="No Peserta UN" value={currentStudent.dapodik.unExamNumber} fieldKey="dapodik.unExamNumber" />
                            <FormField label="No Seri Ijazah" value={currentStudent.diplomaNumber} fieldKey="diplomaNumber" />
                            <FormField label="No KKS" value={currentStudent.dapodik.kksNumber} fieldKey="dapodik.kksNumber" />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Penerima KIP" value={currentStudent.dapodik.kipReceiver} fieldKey="dapodik.kipReceiver" />
                                <FormField label="No. KIP" value={currentStudent.dapodik.kipNumber} fieldKey="dapodik.kipNumber" />
                            </div>
                            <FormField label="Nama di KIP" value={currentStudent.dapodik.kipName} fieldKey="dapodik.kipName" />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Usulan PIP" value={currentStudent.dapodik.pipEligible} fieldKey="dapodik.pipEligible" />
                                <FormField label="Alasan PIP" value={currentStudent.dapodik.pipReason} fieldKey="dapodik.pipReason" />
                            </div>
                            <div className="mt-2 bg-gray-50 p-2 rounded border border-gray-200">
                                <p className="text-[10px] font-bold text-gray-600 mb-1">Data Bank</p>
                                <FormField label="Bank" value={currentStudent.dapodik.bank} fieldKey="dapodik.bank" />
                                <FormField label="No Rekening" value={currentStudent.dapodik.bankAccount} fieldKey="dapodik.bankAccount" />
                                <FormField label="Atas Nama" value={currentStudent.dapodik.bankAccountName} fieldKey="dapodik.bankAccountName" />
                            </div>
                            <FormField label="Email" value={currentStudent.dapodik.email} fieldKey="dapodik.email" />
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 flex-col">
                <Search className="w-16 h-16 mb-4 opacity-20" />
                <p>Pilih siswa untuk memulai verifikasi.</p>
            </div>
        )}
    </div>
  );
};

export default VerificationView;
