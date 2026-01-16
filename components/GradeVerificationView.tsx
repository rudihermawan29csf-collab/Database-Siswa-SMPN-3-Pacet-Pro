import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, CorrectionRequest } from '../types';
import { 
  CheckCircle2, FileText, Maximize2, ZoomIn, ZoomOut, Save, 
  FileCheck2, Loader2, Pencil, Search, Filter, ExternalLink, RefreshCw, AlertCircle, Eye, File, ImageIcon, FileType, X
} from 'lucide-react';
import { api } from '../services/api';

interface GradeVerificationViewProps {
  students: Student[];
  onUpdate?: () => void;
  currentUser?: { name: string; role: string };
  userRole?: 'ADMIN' | 'STUDENT' | 'GURU'; 
}

// Helper to format Drive URLs
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

const GradeVerificationView: React.FC<GradeVerificationViewProps> = ({ students, onUpdate, currentUser, userRole = 'ADMIN' }) => {
  const [activeSemester, setActiveSemester] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(''); 
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [activePage, setActivePage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); 
  const [layoutMode, setLayoutMode] = useState<'split' | 'full-doc'>('split');
  const [isEditing, setIsEditing] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isStudent = userRole === 'STUDENT';

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
  const currentRecord = currentStudent?.academicRecords?.[activeSemester];
  
  const currentDoc = useMemo(() => {
      return currentStudent?.documents.find(d => 
          d.category === 'RAPOR' && 
          d.subType?.semester == activeSemester && 
          d.subType?.page == activePage
      );
  }, [currentStudent, activeSemester, activePage]);

  // Enhanced File Type Detection
  const isImageFile = (doc: any) => {
      if (!doc) return false;
      if (doc.type === 'IMAGE') return true;
      const name = doc.name ? doc.name.toLowerCase() : '';
      return name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.gif') || name.endsWith('.webp') || name.endsWith('.bmp');
  };

  const isDriveUrl = currentDoc && (currentDoc.url.includes('drive.google.com') || currentDoc.url.includes('docs.google.com') || currentDoc.url.includes('googleusercontent.com'));

  // VIEWER LOGIC IMPLEMENTATION
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadPdf = async () => {
        if (!isMounted) return;
        
        // Reset states
        setPdfDoc(null);
        setIsPdfLoading(false);
        setPdfError(false);
        setUseFallbackViewer(false);
        setZoomLevel(1.0);

        if (!currentStudent || !currentDoc) return;

        // Drive URL handling: Default to Iframe, unless explicit image request which allows direct
        if (isDriveUrl && !isImageFile(currentDoc)) {
            if(isMounted) setUseFallbackViewer(true);
            return;
        }

        // Only try PDF.js if it is a local/direct PDF and NOT a Drive link
        if (currentDoc.type === 'PDF' || currentDoc.name.toLowerCase().endsWith('.pdf')) {
            
            // PREVENT FETCH ERROR: Only try to fetch if it's a blob URL. 
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
                    setPdfDoc(pdf); 
                    setNumPages(pdf.numPages); 
                    setIsPdfLoading(false);
                }
            } catch (error: any) { 
                if (error.name === 'AbortError') return;
                
                if(isMounted) {
                    if (error.message !== 'Failed to fetch') {
                        console.error("Error loading PDF, trying fallback:", error);
                    }
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
  
  const handleApproveDoc = async () => { 
      if (currentDoc && currentStudent) { 
          setIsSaving(true);
          const updatedDocs = currentStudent.documents.map(d => d.id === currentDoc.id ? { ...d, status: 'APPROVED' as const, adminNote: 'Valid.', verifierName: currentUser?.name || 'Admin', verifierRole: currentUser?.role || 'ADMIN', verificationDate: new Date().toISOString().split('T')[0] } : d);
          currentStudent.documents = updatedDocs;
          await api.updateStudent(currentStudent);
          setIsSaving(false); setForceUpdate(prev => prev + 1); if (onUpdate) onUpdate(); 
      } 
  };
  const confirmRejectDoc = async () => { 
      if (currentDoc && currentStudent) { 
          if (!rejectionNote.trim()) { alert("Isi alasan penolakan!"); return; }
          setIsSaving(true);
          const updatedDocs = currentStudent.documents.map(d => d.id === currentDoc.id ? { ...d, status: 'REVISION' as const, adminNote: rejectionNote, verifierName: currentUser?.name || 'Admin', verifierRole: currentUser?.role || 'ADMIN', verificationDate: new Date().toISOString().split('T')[0] } : d);
          currentStudent.documents = updatedDocs;
          await api.updateStudent(currentStudent);
          setIsSaving(false); setRejectModalOpen(false); setRejectionNote(''); setForceUpdate(prev => prev + 1); if (onUpdate) onUpdate(); 
      } 
  };
  
  const handleGradeChange = (subjectIndex: number, newScore: string) => { if (currentRecord) { currentRecord.subjects[subjectIndex].score = Number(newScore); setForceUpdate(prev => prev + 1); } };
  const saveGrades = async () => { /* ... */ };

  return (
    <div className="flex flex-col h-full animate-fade-in relative">
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
                <div className="font-bold text-lg text-gray-800">{currentStudent?.fullName} (Nilai Saya)</div>
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
                        <div className="h-14 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4 text-gray-300">
                            <div className="flex gap-2">
                                {[1, 2, 3].map(p => (
                                    <button key={p} onClick={() => setActivePage(p)} className={`px-3 py-1 rounded text-xs font-bold ${activePage === p ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Hal {p}</button>
                                ))}
                            </div>

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
                                        <FileText className="w-16 h-16 mb-4 opacity-20" />
                                        <p>Halaman {activePage} Semester {activeSemester} belum diupload.</p>
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
                <div className={`bg-white rounded-xl border border-gray-200 flex flex-col shadow-sm transition-all duration-300 ${layoutMode === 'full-doc' && !isStudent ? 'hidden' : 'flex-1'}`}>
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><FileCheck2 className="w-5 h-5 text-purple-600" /> Verifikasi Nilai</h3>
                        <div className="flex gap-2">
                            <button onClick={saveGrades} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isEditing ? 'bg-green-600 text-white shadow-lg' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
                                {isEditing ? <><Save className="w-3 h-3" /> {isSaving ? 'Menyimpan...' : 'Simpan'}</> : <><Pencil className="w-3 h-3" /> Edit Nilai</>}
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-auto p-4 md:p-6 bg-white" id="grades-table-container">
                        <div className="mb-6 border-b-2 border-gray-800 pb-4">
                            <div className="flex justify-between text-sm font-bold text-gray-900 mb-2">
                                <span>NAMA: {currentStudent.fullName.toUpperCase()}</span>
                                <span>KELAS: {currentStudent.className}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-600">
                                <span>NISN: {currentStudent.nisn}</span>
                                <span>SEMESTER: {activeSemester} (2024/2025)</span>
                            </div>
                        </div>
                        {currentRecord ? (
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 border-y-2 border-gray-800 text-xs font-bold text-gray-700 uppercase">
                                        <th className="py-2 text-left pl-2">Mata Pelajaran</th>
                                        <th className="py-2 text-center w-20">Nilai</th>
                                        <th className="py-2 text-left pl-4">Capaian Kompetensi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {currentRecord.subjects.map((sub, idx) => (
                                        <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                                            <td className="py-3 pl-2 font-medium text-gray-800">{sub.subject}</td>
                                            <td className="py-3 text-center font-bold text-gray-900">
                                                {isEditing ? (
                                                    <input type="number" className="w-12 text-center border border-blue-300 rounded p-1" value={sub.score} onChange={(e) => handleGradeChange(idx, e.target.value)} />
                                                ) : <span className={sub.score < 75 ? 'text-red-600' : ''}>{sub.score}</span>}
                                            </td>
                                            <td className="py-3 pl-4 text-xs text-gray-500 italic">{sub.competency || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : <div className="text-center py-10 text-gray-400 italic">Data nilai belum diinput.</div>}
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