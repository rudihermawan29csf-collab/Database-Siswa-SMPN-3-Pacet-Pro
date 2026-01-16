import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student } from '../types';
import { 
  CheckCircle2, FileText, Maximize2, ZoomIn, ZoomOut, Loader2, Search, Filter, AlertCircle, ScrollText, X
} from 'lucide-react';
import { api } from '../services/api';

interface IjazahVerificationViewProps {
  students: Student[];
  onUpdate?: () => void;
  currentUser?: { name: string; role: string };
}

// Helper to format Drive URLs
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

const IjazahVerificationView: React.FC<IjazahVerificationViewProps> = ({ students, onUpdate, currentUser }) => {
  // Specific docs for Ijazah Verification
  const IJAZAH_DOC_TYPES = [
      { id: 'IJAZAH', label: 'Ijazah SD' },
      { id: 'AKTA', label: 'Akta Kelahiran' },
      { id: 'KK', label: 'Kartu Keluarga' },
      { id: 'NISN', label: 'Bukti NISN' }
  ];

  const [activeDocType, setActiveDocType] = useState<string>('IJAZAH');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(''); 
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); 
  const [layoutMode, setLayoutMode] = useState<'split' | 'full-doc'>('split');
  const [forceUpdate, setForceUpdate] = useState(0);
  
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // PDF States
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [useFallbackViewer, setUseFallbackViewer] = useState(false);

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
      if (selectedClassFilter) filtered = filtered.filter(s => s.className === selectedClassFilter);
      if (searchTerm) filtered = filtered.filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.nisn.includes(searchTerm));
      return filtered.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [students, searchTerm, selectedClassFilter]);

  useEffect(() => {
      if (filteredStudents.length > 0) {
          if (!selectedStudentId || !filteredStudents.find(s => s.id === selectedStudentId)) {
              setSelectedStudentId(filteredStudents[0].id);
          }
      } else {
          setSelectedStudentId('');
      }
  }, [filteredStudents, selectedStudentId]);

  const currentStudent = students.find(s => s.id === selectedStudentId);
  
  const currentDoc = useMemo(() => {
      return currentStudent?.documents.find(d => d.category === activeDocType);
  }, [currentStudent, activeDocType, forceUpdate]);

  const isImageFile = (doc: any) => {
      if (!doc) return false;
      if (doc.type === 'IMAGE') return true;
      const name = doc.name ? doc.name.toLowerCase() : '';
      return name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.gif') || name.endsWith('.webp') || name.endsWith('.bmp');
  };

  const isDriveUrl = currentDoc && (currentDoc.url.includes('drive.google.com') || currentDoc.url.includes('docs.google.com') || currentDoc.url.includes('googleusercontent.com'));

  // VIEWER LOGIC
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
  
  const handleVerifyDoc = async (status: 'APPROVED' | 'REVISION', note?: string) => {
      if (currentDoc && currentStudent) {
          setIsSaving(true);
          const updatedDocs = currentStudent.documents.map(d => 
              d.id === currentDoc.id 
                  ? { 
                      ...d, 
                      status, 
                      adminNote: note || (status === 'APPROVED' ? 'Valid' : ''),
                      verificationDate: new Date().toISOString().split('T')[0],
                      verifierName: currentUser?.name || 'Admin',
                      verifierRole: currentUser?.role || 'ADMIN'
                    } 
                  : d
          );
          
          const updatedStudent = { ...currentStudent, documents: updatedDocs };
          
          try {
              await api.updateStudent(updatedStudent);
              if (onUpdate) onUpdate();
          } catch (e) {
              console.error("Save failed", e);
              alert("Gagal menyimpan status.");
          } finally {
              setIsSaving(false);
              setRejectModalOpen(false);
              setRejectionNote('');
              setForceUpdate(prev => prev + 1);
          }
      }
  };

  const FormField = ({ label, value }: { label: string, value: string | undefined }) => (
    <div className="flex flex-col border-b border-gray-100 py-2">
        <span className="text-[10px] uppercase font-bold text-gray-400">{label}</span>
        <span className="text-sm font-semibold text-gray-800">{value || '-'}</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full animate-fade-in relative">
        {/* REJECT MODAL */}
        {rejectModalOpen && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col">
                    <h3 className="font-bold text-red-600 mb-2">Tolak Dokumen Ijazah</h3>
                    <textarea className="w-full p-2 border rounded mb-4" rows={3} value={rejectionNote} onChange={e => setRejectionNote(e.target.value)} placeholder="Alasan penolakan..." />
                    <div className="flex justify-end gap-2">
                        <button onClick={()=>setRejectModalOpen(false)} className="px-3 py-1 bg-gray-100 rounded">Batal</button>
                        <button onClick={() => handleVerifyDoc('REVISION', rejectionNote)} disabled={isSaving} className="px-3 py-1 bg-red-600 text-white rounded flex items-center">{isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Simpan'}</button>
                    </div>
                </div>
            </div>
        )}

        {/* Top Controls */}
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-4 mb-4">
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
            
            <div className="flex gap-1 overflow-x-auto max-w-full pb-1 no-scrollbar">
                {IJAZAH_DOC_TYPES.map(type => {
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
            <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden relative">
                {/* Document Viewer */}
                <div className={`flex flex-col bg-gray-800 rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${layoutMode === 'full-doc' ? 'w-full absolute inset-0 z-20' : 'w-full lg:w-3/5 h-full'}`}>
                    <div className="h-14 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4 text-gray-300">
                        <span className="font-bold text-white text-sm hidden md:block">
                            {IJAZAH_DOC_TYPES.find(t => t.id === activeDocType)?.label}
                        </span>
                        <div className="flex items-center gap-2">
                            <button onClick={()=>setZoomLevel(z=>Math.max(0.5, z-0.2))} className="p-1 hover:bg-gray-700 rounded"><ZoomOut className="w-4 h-4" /></button>
                            <span className="text-xs w-8 text-center">{Math.round(zoomLevel*100)}%</span>
                            <button onClick={()=>setZoomLevel(z=>Math.min(3, z+0.2))} className="p-1 hover:bg-gray-700 rounded"><ZoomIn className="w-4 h-4" /></button>
                            <button onClick={()=>setLayoutMode(m=>m==='full-doc'?'split':'full-doc')} className="p-1 hover:bg-gray-700 rounded ml-2"><Maximize2 className="w-4 h-4" /></button>
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
                                    <ScrollText className="w-16 h-16 mb-4 opacity-20" />
                                    <p>Dokumen {activeDocType} belum diupload.</p>
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
                                <button onClick={() => handleVerifyDoc('APPROVED')} disabled={isSaving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-900/20">
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4" />} Setujui
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side: Data Reference (Simplified for Ijazah) */}
                <div className={`bg-white rounded-xl border border-gray-200 flex flex-col shadow-sm transition-all duration-300 ${layoutMode === 'full-doc' ? 'hidden' : 'flex-1'} overflow-hidden`}>
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <ScrollText className="w-5 h-5 text-blue-600" /> Data Referensi Siswa
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Gunakan data ini untuk memverifikasi dokumen Ijazah, KK, dll.</p>
                    </div>
                    
                    <div className="flex-1 overflow-auto p-6">
                        <div className="space-y-4">
                            <FormField label="Nama Lengkap" value={currentStudent.fullName} />
                            <FormField label="NISN" value={currentStudent.nisn} />
                            <FormField label="Tempat, Tanggal Lahir" value={`${currentStudent.birthPlace}, ${currentStudent.birthDate}`} />
                            <FormField label="Nama Ayah" value={currentStudent.father.name} />
                            <FormField label="Nama Ibu" value={currentStudent.mother.name} />
                            <FormField label="NIK Siswa" value={currentStudent.dapodik.nik} />
                            <FormField label="No KK" value={currentStudent.dapodik.noKK} />
                            <FormField label="Alamat" value={currentStudent.address} />
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

export default IjazahVerificationView;