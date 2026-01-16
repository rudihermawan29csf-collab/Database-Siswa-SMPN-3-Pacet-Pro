import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Student } from '../types';
import { 
  CheckCircle2, Loader2, ZoomIn, ZoomOut, Maximize2, AlertCircle, ExternalLink, FileText, ImageIcon, FileType, Save, Pencil, Activity, Eye, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

interface VerificationViewProps {
  students: Student[];
  targetStudentId?: string;
  onUpdate?: () => void;
  onSave?: (student: Student) => void;
  currentUser?: { name: string; role: string }; 
}

// Consistent with FileManager.tsx master list, excluding Rapor logic as requested
const MASTER_DOC_LIST = [
    { id: 'IJAZAH', label: 'Ijazah SD' },
    { id: 'AKTA', label: 'Akta Kelahiran' },
    { id: 'KK', label: 'Kartu Keluarga' },
    { id: 'KTP_AYAH', label: 'KTP Ayah' },
    { id: 'KTP_IBU', label: 'KTP Ibu' },
    { id: 'FOTO', label: 'Pas Foto' },
    { id: 'KARTU_PELAJAR', label: 'Kartu Pelajar' },
    { id: 'KIP', label: 'KIP / PKH' },
    { id: 'SKL', label: 'Surat Ket. Lulus' },
    { id: 'NISN', label: 'Bukti NISN' },
];

// --- HELPER FUNCTIONS ---

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
  
  // Actions
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [isSaving, setIsSaving] = useState(false); 
  const [forceUpdate, setForceUpdate] = useState(0);

  // PDF States
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [useFallbackViewer, setUseFallbackViewer] = useState(false);

  // Load Config
  useEffect(() => {
      try {
          const savedConfig = localStorage.getItem('sys_doc_config');
          // Default config matches initial FileManager state (usually Ijazah, Akta, KK, KTPs, Foto)
          const configIds = savedConfig ? JSON.parse(savedConfig) : ['IJAZAH', 'AKTA', 'KK', 'KTP_AYAH', 'KTP_IBU', 'FOTO'];
          
          // Filter MASTER_LIST based on config
          const filtered = MASTER_DOC_LIST.filter(d => configIds.includes(d.id));
          setAvailableDocTypes(filtered);
          
          if (filtered.length > 0 && !activeDocType) {
              setActiveDocType(filtered[0].id);
          }
      } catch (e) {
          const defaults = MASTER_DOC_LIST.slice(0, 6);
          setAvailableDocTypes(defaults);
          setActiveDocType('IJAZAH');
      }
  }, []);

  // Memoized Data
  const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className))).sort(), [students]);
  const studentsInClass = useMemo(() => students.filter(s => s.className === selectedClass), [students, selectedClass]);
  const currentStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);
  
  const currentDoc = useMemo(() => {
      if (!currentStudent || !activeDocType) return undefined;
      return currentStudent.documents.find(d => d.category === activeDocType);
  }, [currentStudent, activeDocType, forceUpdate]);

  // Init Selection
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
      if (studentsInClass.length > 0 && !selectedStudentId) {
          setSelectedStudentId(studentsInClass[0].id);
      }
  }, [studentsInClass]);

  // Detect file type robustly
  const isImageFile = (doc: any) => {
      if (!doc) return false;
      return doc.type === 'IMAGE' || /\.(jpg|jpeg|png|gif|webp|bmp|heic)$/i.test(doc.name);
  };

  const isDriveUrl = currentDoc && (currentDoc.url.includes('drive.google.com') || currentDoc.url.includes('docs.google.com') || currentDoc.url.includes('googleusercontent.com'));

  // --- VIEWER LOGIC ---
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

        // If it's a Drive URL, we default to Iframe preview UNLESS it is specifically an image we want to try direct load
        if (isDriveUrl && !isImageFile(currentDoc)) {
            if (isMounted) setUseFallbackViewer(true);
            return;
        }

        // If it looks like a PDF
        if (currentDoc.type === 'PDF' || currentDoc.name.toLowerCase().endsWith('.pdf')) {
            // External URLs (except blobs) often block CORS, use iframe fallback
            if (!currentDoc.url.startsWith('blob:')) {
                if (isMounted) setUseFallbackViewer(true);
                return;
            }

            if (isMounted) setIsPdfLoading(true);
            try {
                // @ts-ignore
                const pdfjsLib = await import('pdfjs-dist');
                if (!isMounted) return;

                const pdfjs = pdfjsLib.default ? pdfjsLib.default : pdfjsLib;
                if (!pdfjs.GlobalWorkerOptions.workerSrc) {
                    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
                }

                const response = await fetch(currentDoc.url, { signal: controller.signal });
                if (!response.ok) throw new Error("Network response was not ok");
                const arrayBuffer = await response.arrayBuffer();

                if (!isMounted) return;

                const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                
                if (isMounted) {
                    setPdfDoc(pdf); setNumPages(pdf.numPages); setIsPdfLoading(false);
                }
            } catch (error: any) { 
                if (error.name === 'AbortError') return;
                if (isMounted) {
                    console.error("PDF Load Error, falling back:", error);
                    setUseFallbackViewer(true);
                    setIsPdfLoading(false); 
                }
            }
        }
    };
    loadPdf();
    return () => { 
        isMounted = false;
        controller.abort();
    };
  }, [currentDoc]);

  const handleVerifyDoc = async (status: 'APPROVED' | 'REVISION', note?: string) => {
      if (currentDoc && currentStudent) {
          setIsSaving(true);
          const updatedDocs = currentStudent.documents.map(d => 
              d.id === currentDoc.id 
                  ? { 
                      ...d, 
                      status, 
                      adminNote: note || (status === 'APPROVED' ? 'Valid' : ''),
                      verificationDate: new Date().toISOString(),
                      verifierName: currentUser?.name || 'Admin',
                      verifierRole: currentUser?.role || 'ADMIN'
                    } 
                  : d
          );
          
          const updatedStudent = { ...currentStudent, documents: updatedDocs };
          
          try {
              if (onSave) await onSave(updatedStudent);
              else await api.updateStudent(updatedStudent);
              if (onUpdate) onUpdate();
          } catch (e) {
              console.error("Save failed", e);
              alert("Gagal menyimpan status.");
          } finally {
              setIsSaving(false);
              setRejectModalOpen(false);
              setForceUpdate(prev => prev + 1);
          }
      }
  };

  // --- COMPONENT UI HELPER FOR BUKU INDUK LAYOUT ---
  const FormField = ({ label, value, labelCol = "w-1/3", valueCol = "flex-1", className = "", labelClassName="" }: any) => (
    <div className={`flex border-b border-gray-300 min-h-[20px] ${className}`}>
        <div className={`${labelCol} px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px] flex items-center ${labelClassName}`}>
            {label}
        </div>
        <div className={`${valueCol} px-1.5 py-0.5 text-[9px] font-medium flex items-center uppercase leading-tight bg-white`}>
            {value || '-'}
        </div>
    </div>
  );

  const SubHeader = ({ children }: { children?: React.ReactNode }) => (
    <div className="bg-gray-200 px-2 py-0.5 text-[9px] font-bold border-y border-gray-400 text-center uppercase mt-1">
        {children}
    </div>
  );

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

        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
            <div className="flex gap-2 w-full md:w-auto">
                <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                    {uniqueClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)}
                </select>
                <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm w-full md:w-64" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                    {studentsInClass.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                </select>
            </div>
            
            <div className="flex gap-1 overflow-x-auto max-w-full pb-1 no-scrollbar">
                {availableDocTypes.map(type => {
                    const doc = currentStudent?.documents.find(d => d.category === type.id);
                    let colorClass = 'bg-white text-gray-600 border-gray-200';
                    if (doc?.status === 'APPROVED') colorClass = 'bg-green-50 text-green-700 border-green-200';
                    if (doc?.status === 'REVISION') colorClass = 'bg-red-50 text-red-700 border-red-200';
                    if (doc?.status === 'PENDING') colorClass = 'bg-yellow-50 text-yellow-700 border-yellow-200';
                    
                    return (
                        <button 
                            key={type.id} 
                            onClick={() => setActiveDocType(type.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${activeDocType === type.id ? 'ring-2 ring-blue-500 border-blue-500 z-10' : ''} ${colorClass} hover:shadow-sm`}
                        >
                            {type.label}
                        </button>
                    );
                })}
            </div>
        </div>

        {currentStudent ? (
            <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
                {/* Left: Document Viewer */}
                <div className={`flex flex-col bg-gray-800 rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${layoutMode === 'full-doc' ? 'w-full absolute inset-0 z-20' : 'w-full lg:w-1/2 h-full'}`}>
                    
                    {/* Header Viewer */}
                    <div className="h-14 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4 text-gray-300">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm hidden md:block">
                                {availableDocTypes.find(t=>t.id===activeDocType)?.label || activeDocType}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={()=>setZoomLevel(z=>Math.max(0.5, z-0.2))} className="p-1 hover:bg-gray-700 rounded"><ZoomOut className="w-4 h-4" /></button>
                            <span className="text-xs w-8 text-center select-none">{Math.round(zoomLevel*100)}%</span>
                            <button onClick={()=>setZoomLevel(z=>Math.min(3, z+0.2))} className="p-1 hover:bg-gray-700 rounded"><ZoomIn className="w-4 h-4" /></button>
                            <button onClick={()=>setLayoutMode(m=>m==='full-doc'?'split':'full-doc')} className="p-1 hover:bg-gray-700 rounded ml-2"><Maximize2 className="w-4 h-4" /></button>
                        </div>
                    </div>

                    {/* Viewer Content Area */}
                    <div className="flex-1 overflow-auto p-4 bg-gray-900/50 flex items-start justify-center pb-24 relative">
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
                                    <FileText className="w-16 h-16 mb-4 opacity-20" />
                                    <p>Dokumen belum diupload oleh siswa.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Bar */}
                    {currentDoc && (
                        <div className="bg-gray-900 border-t border-gray-700 p-4 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${currentDoc.status === 'APPROVED' ? 'bg-green-900 text-green-300' : currentDoc.status === 'REVISION' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'}`}>
                                    {currentDoc.status === 'APPROVED' ? 'Disetujui' : currentDoc.status === 'REVISION' ? 'Perlu Revisi' : 'Menunggu Verifikasi'}
                                </span>
                                {currentDoc.status !== 'PENDING' && (
                                    <span className="text-xs text-gray-400">oleh {currentDoc.verifierName || 'Admin'}</span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setRejectionNote(''); setRejectModalOpen(true); }} disabled={isSaving} className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/50 rounded-lg hover:bg-red-600 hover:text-white transition-colors text-sm font-bold">Tolak</button>
                                <button onClick={() => handleVerifyDoc('APPROVED')} disabled={isSaving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-900/20">
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4" />} Setujui
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Data Reference */}
                <div className={`bg-white rounded-xl border border-gray-200 flex flex-col shadow-sm transition-all duration-300 ${layoutMode === 'full-doc' ? 'hidden' : 'flex-1'} overflow-hidden`}>
                    <div className="p-3 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-600" />
                            <h3 className="text-xs font-bold text-gray-700 uppercase">Data Buku Induk Siswa</h3>
                        </div>
                        <div className="text-[10px] text-gray-500 italic">Cocokkan dengan dokumen</div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                        {/* REPLICATED BUKU INDUK LAYOUT */}
                        <div className="bg-white p-4 border border-gray-200 shadow-sm text-gray-800">
                            
                            <div className="border-2 border-gray-800 p-1 mb-2 bg-gray-800 text-white text-center">
                                <h1 className="text-sm font-black tracking-widest uppercase">FORMULIR PESERTA DIDIK</h1>
                            </div>

                            {/* SECTION 1: IDENTITAS */}
                            <SubHeader>IDENTITAS PESERTA DIDIK</SubHeader>
                            <div className="border-x border-t border-gray-300 mt-1">
                                <FormField 
                                    label="KELAS SAAT INI" 
                                    value={currentStudent.className} 
                                    className="bg-yellow-50 border-b-2 border-yellow-200"
                                    labelClassName="font-bold text-yellow-800 bg-yellow-100"
                                />
                                <FormField label="1. Nama Lengkap" value={currentStudent.fullName} />
                                <FormField label="2. Jenis Kelamin" value={currentStudent.gender === 'L' ? 'Laki-Laki' : 'Perempuan'} />
                                <div className="flex border-b border-gray-300 min-h-[20px]">
                                    <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">3. NISN</div>
                                    <div className="w-1/3 px-1.5 py-0.5 text-[9px] font-medium uppercase">{currentStudent.nisn}</div>
                                    <div className="w-12 px-1.5 py-0.5 bg-gray-100 border-x border-gray-300 text-[9px] font-bold">NIS :</div>
                                    <div className="flex-1 px-1.5 py-0.5 text-[9px] font-bold bg-gray-200">{currentStudent.nis}</div>
                                </div>
                                <FormField label="4. No Seri Ijazah" value={currentStudent.diplomaNumber} />
                                <FormField label="5. No Seri SKHUN" value={currentStudent.dapodik.skhun} />
                                <FormField label="6. No. Ujian Nasional" value={currentStudent.dapodik.unExamNumber} />
                                <FormField label="7. NIK" value={currentStudent.dapodik.nik} />
                                <FormField label="NPSN Sekolah Asal" value={currentStudent.previousSchool ? "20502873" : "-"} />
                                <FormField label="Nama Sekolah Asal" value={currentStudent.previousSchool} />
                                <FormField label="8. Tempat, Tgl Lahir" value={`${currentStudent.birthPlace}, ${currentStudent.birthDate}`} />
                                <FormField label="9. Agama" value={currentStudent.religion} />
                                <FormField label="10. Berkebutuhan Khusus" value={currentStudent.dapodik.specialNeeds} />
                                <FormField label="11. Alamat Tempat Tinggal" value={currentStudent.address} />
                                <div className="flex border-b border-gray-300 min-h-[20px]">
                                     <div className="w-1/3 flex flex-col">
                                         <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[8px] italic"> - Dusun</div>
                                         <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[8px] italic"> - Kelurahan / Desa</div>
                                         <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[8px] italic"> - Kecamatan</div>
                                         <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[8px] italic"> - Kabupaten / Kota</div>
                                         <div className="flex-1 px-1.5 py-0.5 text-[8px] italic"> - Propinsi</div>
                                     </div>
                                     <div className="w-1/3 flex flex-col border-x border-gray-300">
                                         <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[9px] uppercase">{currentStudent.dapodik.dusun}</div>
                                         <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[9px] uppercase">{currentStudent.dapodik.kelurahan}</div>
                                         <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[9px] uppercase">{currentStudent.subDistrict}</div>
                                         <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[9px] uppercase">{currentStudent.district}</div>
                                         <div className="flex-1 px-1.5 py-0.5 text-[9px] uppercase">Jawa Timur</div>
                                     </div>
                                     <div className="flex-1 flex flex-col">
                                         <div className="flex border-b border-gray-200 h-1/3">
                                              <div className="w-10 px-1 py-0.5 bg-gray-50 border-r border-gray-300 text-[8px] font-bold">RT:</div>
                                              <div className="flex-1 px-1 py-0.5 text-[9px]">{currentStudent.dapodik.rt}</div>
                                              <div className="w-10 px-1 py-0.5 bg-gray-50 border-x border-gray-300 text-[8px] font-bold">RW:</div>
                                              <div className="flex-1 px-1 py-0.5 text-[9px]">{currentStudent.dapodik.rw}</div>
                                         </div>
                                         <div className="flex border-b border-gray-200 h-1/3">
                                              <div className="w-20 px-1 py-0.5 bg-gray-50 border-r border-gray-300 text-[8px] font-bold">Kode Pos</div>
                                              <div className="flex-1 px-1 py-0.5 text-[9px]">{currentStudent.postalCode}</div>
                                         </div>
                                         <div className="flex-1 bg-gray-100"></div>
                                     </div>
                                </div>
                                <FormField label="12. Transportasi" value={currentStudent.dapodik.transportation} />
                                <FormField label="13. Jenis Tinggal" value={currentStudent.dapodik.livingStatus} />
                                <div className="flex border-b border-gray-300 min-h-[20px]">
                                    <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">14. No. Telp Rumah</div>
                                    <div className="w-1/3 px-1.5 py-0.5 text-[9px] font-medium uppercase">-</div>
                                    <div className="w-12 px-1.5 py-0.5 bg-gray-100 border-x border-gray-300 text-[9px] font-bold">HP :</div>
                                    <div className="flex-1 px-1.5 py-0.5 text-[9px] bg-gray-100">{currentStudent.father.phone || currentStudent.mother.phone || '0'}</div>
                                </div>
                                <FormField label="15. Email" value={currentStudent.dapodik.email} />
                                <FormField label="16. No. KKS" value={currentStudent.dapodik.kksNumber} />
                                <div className="flex border-b border-gray-300 min-h-[20px]">
                                    <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">17. Penerima KPS/KPH</div>
                                    <div className="w-1/6 px-1.5 py-0.5 text-[9px] border-r border-gray-200 uppercase">{currentStudent.dapodik.kpsReceiver}</div>
                                    <div className="w-24 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">No. KPS</div>
                                    <div className="flex-1 px-1.5 py-0.5 text-[9px] uppercase">{currentStudent.dapodik.kpsNumber}</div>
                                </div>
                                <div className="flex border-b border-gray-300 min-h-[20px]">
                                    <div className="w-1/3 px-1.5 py-0.5 text-[8px] italic"> - Usulan PIP</div>
                                    <div className="w-1/6 px-1.5 py-0.5 text-[9px] border-x border-gray-300 uppercase">{currentStudent.dapodik.pipEligible}</div>
                                    <div className="w-24 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">Alasan</div>
                                    <div className="flex-1 px-1.5 py-0.5 text-[9px] uppercase">{currentStudent.dapodik.pipReason}</div>
                                </div>
                                <div className="flex border-b border-gray-300 min-h-[20px]">
                                    <div className="w-1/3 px-1.5 py-0.5 text-[8px] italic"> - Penerima PIP</div>
                                    <div className="w-1/6 px-1.5 py-0.5 text-[9px] border-x border-gray-300 uppercase">{currentStudent.dapodik.kipReceiver}</div>
                                    <div className="w-24 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">No. KIP</div>
                                    <div className="flex-1 px-1.5 py-0.5 text-[9px] uppercase">{currentStudent.dapodik.kipNumber}</div>
                                </div>
                                <FormField label=" - Nama di KIP" value={currentStudent.dapodik.kipName} />
                                <FormField label=" - No Reg Akta Lahir" value={currentStudent.dapodik.birthRegNumber} />
                                <FormField label=" - Lintang / Bujur" value={`${currentStudent.dapodik.latitude} / ${currentStudent.dapodik.longitude}`} />
                            </div>

                            {/* SECTION 2: DATA AYAH */}
                            <SubHeader>DATA AYAH KANDUNG</SubHeader>
                            <div className="border-x border-t border-gray-300 mt-1">
                                <div className="flex border-b border-gray-300 min-h-[20px]">
                                    <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">18. Nama Ayah</div>
                                    <div className="w-1/2 px-1.5 py-0.5 text-[9px] font-bold uppercase">{currentStudent.father.name}</div>
                                    <div className="w-24 px-1.5 py-0.5 bg-gray-50 border-x border-gray-300 text-[9px]">Tahun:</div>
                                    <div className="flex-1 px-1.5 py-0.5 text-[9px] bg-gray-100 font-bold">{currentStudent.father.birthPlaceDate}</div>
                                </div>
                                <FormField label=" - Pekerjaan" value={currentStudent.father.job} />
                                <FormField label=" - Pendidikan" value={currentStudent.father.education} />
                                <FormField label=" - Penghasilan" value={currentStudent.father.income} />
                            </div>

                            {/* SECTION 3: DATA IBU */}
                            <SubHeader>DATA IBU KANDUNG</SubHeader>
                            <div className="border-x border-t border-gray-300 mt-1">
                                <div className="flex border-b border-gray-300 min-h-[20px]">
                                    <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">19. Nama Ibu</div>
                                    <div className="w-1/2 px-1.5 py-0.5 text-[9px] font-bold uppercase">{currentStudent.mother.name}</div>
                                    <div className="w-24 px-1.5 py-0.5 bg-gray-50 border-x border-gray-300 text-[9px]">Tahun:</div>
                                    <div className="flex-1 px-1.5 py-0.5 text-[9px] bg-gray-100 font-bold">{currentStudent.mother.birthPlaceDate}</div>
                                </div>
                                <FormField label=" - Pekerjaan" value={currentStudent.mother.job} />
                                <FormField label=" - Pendidikan" value={currentStudent.mother.education} />
                                <FormField label=" - Penghasilan" value={currentStudent.mother.income} />
                            </div>

                            {/* SECTION 4: DATA WALI */}
                            <SubHeader>DATA WALI</SubHeader>
                            <div className="border-x border-t border-gray-300 mt-1">
                                <div className="flex border-b border-gray-300 min-h-[20px]">
                                    <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">20. Nama Wali</div>
                                    <div className="w-1/2 px-1.5 py-0.5 text-[9px] uppercase">{currentStudent.guardian?.name || '-'}</div>
                                    <div className="w-24 px-1.5 py-0.5 bg-gray-50 border-x border-gray-300 text-[9px]">Tahun:</div>
                                    <div className="flex-1 px-1.5 py-0.5 text-[9px] bg-gray-100 font-bold">{currentStudent.guardian?.birthPlaceDate || '-'}</div>
                                </div>
                                <FormField label=" - Pekerjaan" value={currentStudent.guardian?.job || '-'} />
                                <FormField label=" - Pendidikan" value={currentStudent.guardian?.education || '-'} />
                                <FormField label=" - Penghasilan" value={currentStudent.guardian?.income || '-'} />
                            </div>

                            {/* SECTION 5: PERIODIK */}
                            <div className="border border-gray-800 mt-1">
                                <div className="flex border-b border-gray-300 h-6">
                                    <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px] flex items-center">21. Tinggi Badan</div>
                                    <div className="w-20 px-1.5 py-0.5 text-[9px] font-bold flex items-center justify-center bg-gray-200">{currentStudent.height}</div>
                                    <div className="w-10 px-1.5 py-0.5 border-r border-gray-300 text-[9px] flex items-center">cm</div>
                                    <div className="w-24 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px] flex items-center">Berat Badan:</div>
                                    <div className="w-20 px-1.5 py-0.5 text-[9px] font-bold flex items-center justify-center bg-gray-200">{currentStudent.weight}</div>
                                    <div className="flex-1 px-1.5 py-0.5 text-[9px] flex items-center">Kg</div>
                                </div>
                                <div className="flex border-b border-gray-300 h-6">
                                    <div className="w-1/2 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[8px] flex items-center">22. Jarak Ke Sekolah</div>
                                    <div className="w-20 px-1.5 py-0.5 text-[9px] font-bold flex items-center justify-center bg-gray-200">{currentStudent.dapodik.distanceToSchool}</div>
                                    <div className="w-10 px-1.5 py-0.5 border-r border-gray-300 text-[9px] flex items-center">km</div>
                                    <div className="flex-1 px-1.5 py-0.5 text-[8px] italic flex items-center leading-tight">2) &gt; 1km sebutkan: {Number(currentStudent.dapodik.distanceToSchool) > 1 ? currentStudent.dapodik.distanceToSchool : '-'} Km</div>
                                </div>
                                <div className="flex border-b border-gray-300 h-6">
                                    <div className="w-1/2 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[8px] flex items-center">23. Waktu Tempuh</div>
                                    <div className="w-20 px-1.5 py-0.5 text-[9px] font-bold flex items-center justify-center bg-gray-200">{currentStudent.dapodik.travelTimeMinutes}</div>
                                    <div className="w-12 px-1.5 py-0.5 border-r border-gray-300 text-[9px] flex items-center">menit</div>
                                    <div className="flex-1 px-1.5 py-0.5 text-[8px] italic flex items-center leading-tight">2) &gt; 60 menit: - Menit</div>
                                </div>
                                <div className="flex h-5">
                                    <div className="w-1/2 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px] flex items-center">24. Jml Saudara Kandung</div>
                                    <div className="w-20 px-1.5 py-0.5 text-[9px] font-bold flex items-center justify-center bg-gray-200">{currentStudent.siblingCount}</div>
                                    <div className="flex-1 bg-gray-100"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">Pilih Siswa dari Dropdown</div>
        )}
    </div>
  );
};

export default VerificationView;