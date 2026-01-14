import React, { useState, useEffect, useRef } from 'react';
import { Student } from '../types';
import { 
  CheckCircle2, XCircle, FileText, ChevronDown, Maximize2, AlertCircle, 
  ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, Minimize2, Save,
  FileCheck2, Loader2, Pencil
} from 'lucide-react';

interface GradeVerificationViewProps {
  students: Student[];
  onUpdate?: () => void;
}

// Reuse helper locally or import (defined locally for now)
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

const GradeVerificationView: React.FC<GradeVerificationViewProps> = ({ students, onUpdate }) => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [activeSemester, setActiveSemester] = useState<number>(1);
  const [activePage, setActivePage] = useState<number>(1);
  
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); 
  const [layoutMode, setLayoutMode] = useState<'split' | 'full-doc'>('split');
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);

  // Logic States
  const [forceUpdate, setForceUpdate] = useState(0);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');

  // PDF/Image States
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [useFallbackViewer, setUseFallbackViewer] = useState(false);

  const uniqueClasses = Array.from(new Set(students.map(s => s.className))).sort();
  const studentsInClass = students.filter(s => s.className === selectedClass);
  const currentStudent = students.find(s => s.id === selectedStudentId);
  const currentRecord = currentStudent?.academicRecords?.[activeSemester];
  
  const currentDoc = currentStudent?.documents.find(d => 
      d.category === 'RAPOR' && 
      d.subType?.semester === activeSemester && 
      d.subType?.page === activePage
  );

  useEffect(() => { if (uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0]); }, [uniqueClasses]);
  useEffect(() => { if (studentsInClass.length > 0 && !selectedStudentId) setSelectedStudentId(studentsInClass[0].id); }, [studentsInClass]);
  useEffect(() => { setZoomLevel(1.0); setUseFallbackViewer(false); }, [activePage, activeSemester, selectedStudentId]);

  // Document Loading
  useEffect(() => {
    const loadPdf = async () => {
        setPdfDoc(null); setIsPdfLoading(false); setUseFallbackViewer(false);
        if (!currentDoc) return;

        // Drive URL Check - Force fallback/iframe
        if (currentDoc.url.includes('drive.google.com') || currentDoc.url.includes('docs.google.com')) {
            setUseFallbackViewer(true);
            return;
        }

        if (currentDoc.type === 'PDF' || currentDoc.name.toLowerCase().endsWith('.pdf')) {
            setIsPdfLoading(true);
            try {
                // @ts-ignore
                const pdfjsLib = await import('pdfjs-dist');
                const pdfjs = pdfjsLib.default ? pdfjsLib.default : pdfjsLib;
                if (!pdfjs.GlobalWorkerOptions.workerSrc) {
                    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
                }

                // FIX: Fetch data in main thread and pass ArrayBuffer to worker
                const response = await fetch(currentDoc.url);
                if (!response.ok) throw new Error("Network error");
                const arrayBuffer = await response.arrayBuffer();
                
                const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                setPdfDoc(pdf); setIsPdfLoading(false);
            } catch (error) { 
                console.error("PDF Load Error, switching to fallback", error);
                setUseFallbackViewer(true);
                setIsPdfLoading(false); 
            }
        }
    };
    loadPdf();
  }, [currentDoc]);

  const handleApprove = () => { if (currentDoc) { currentDoc.status = 'APPROVED'; currentDoc.adminNote = 'Valid.'; setForceUpdate(prev => prev + 1); if (onUpdate) onUpdate(); } };
  const confirmReject = () => { if (currentDoc) { currentDoc.status = 'REVISION'; currentDoc.adminNote = rejectionNote; setRejectModalOpen(false); setForceUpdate(prev => prev + 1); if (onUpdate) onUpdate(); } };

  // Handle Grade Change
  const handleGradeChange = (subjectIndex: number, newScore: string) => {
      if (currentRecord) {
          currentRecord.subjects[subjectIndex].score = Number(newScore);
          setForceUpdate(prev => prev + 1);
      }
  };

  const PDFPageCanvas = ({ pdf, pageNum, scale }: any) => {
      const canvasRef = useRef<HTMLCanvasElement>(null);
      useEffect(() => {
          if (pdf && canvasRef.current) {
              pdf.getPage(pageNum).then((page: any) => {
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
                      page.render(renderContext).promise;
                  }
              });
          }
      }, [pdf, pageNum, scale]);
      return <canvas ref={canvasRef} className="shadow-lg bg-white" />;
  };

  const isDriveUrl = currentDoc && (currentDoc.url.includes('drive.google.com') || currentDoc.url.includes('docs.google.com'));

  return (
    <div className="flex flex-col h-full animate-fade-in relative">
        {/* REJECTION MODAL */}
        {rejectModalOpen && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col">
                    <h3 className="font-bold text-red-600 mb-2">Tolak Dokumen</h3>
                    <textarea className="w-full p-2 border rounded mb-4" rows={3} value={rejectionNote} onChange={e => setRejectionNote(e.target.value)} placeholder="Alasan..." />
                    <div className="flex justify-end gap-2"><button onClick={()=>setRejectModalOpen(false)} className="px-3 py-1 bg-gray-100 rounded">Batal</button><button onClick={confirmReject} className="px-3 py-1 bg-red-600 text-white rounded">Simpan</button></div>
                </div>
            </div>
        )}

      {/* Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4 mb-4">
        <div className="flex gap-3 w-full lg:w-auto items-center">
             <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-2 rounded-lg font-bold text-sm border border-purple-100"><FileCheck2 className="w-4 h-4" /> Verifikasi Nilai</div>
             <select className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>{uniqueClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)}</select>
             <select className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium w-48 truncate" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>{studentsInClass.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}</select>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {[1, 2, 3, 4, 5, 6].map(sem => (
                <button key={sem} onClick={() => { setActiveSemester(sem); setActivePage(1); }} className={`px-3 py-1.5 rounded-md text-xs font-bold ${activeSemester === sem ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>S{sem}</button>
            ))}
        </div>
      </div>

      {currentStudent ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden relative">
            {/* DATA NILAI PANE */}
            <div className={`bg-white rounded-xl border border-gray-200 flex flex-col shadow-sm transition-all duration-300 ${layoutMode === 'full-doc' ? 'hidden' : 'w-full lg:w-[400px]'}`}>
                <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-gray-700 uppercase">Data Nilai S{activeSemester}</h3>
                    <button onClick={() => setIsEditing(!isEditing)} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${isEditing ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{isEditing ? <><Save className="w-3 h-3" /> Simpan</> : <><Pencil className="w-3 h-3" /> Edit Nilai</>}</button>
                </div>
                <div className="flex-1 overflow-y-auto p-0">
                    {currentRecord ? (
                        <table className="w-full text-left text-[10px]">
                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500"><tr><th className="px-3 py-2">Mapel</th><th className="px-3 py-2 w-14 text-center">Nilai</th><th className="px-3 py-2">Predikat</th></tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {currentRecord.subjects.map((s, idx) => (
                                    <tr key={idx}>
                                        <td className="px-3 py-2 font-medium">{s.subject}</td>
                                        <td className="px-3 py-2 text-center font-bold">
                                            {isEditing ? (
                                                <input type="number" className="w-10 text-center border rounded bg-white focus:ring-1 focus:ring-blue-500" value={s.score} onChange={(e) => handleGradeChange(idx, e.target.value)} />
                                            ) : s.score}
                                        </td>
                                        <td className="px-3 py-2 text-gray-500 truncate">{s.competency}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <div className="p-8 text-center text-gray-400 text-sm">Belum ada data nilai.</div>}
                </div>
                <div className="p-3 border-t bg-gray-50 flex gap-2">
                    <button onClick={() => { setRejectionNote(''); setRejectModalOpen(true); }} disabled={!currentDoc} className="flex-1 py-1.5 border border-red-200 text-red-600 rounded bg-white text-xs font-bold disabled:opacity-50">Tolak Doc</button>
                    <button onClick={handleApprove} disabled={!currentDoc} className="flex-1 py-1.5 bg-green-600 text-white rounded text-xs font-bold disabled:opacity-50">Setujui Doc</button>
                </div>
            </div>

            {/* DOC VIEWER */}
            <div className={`flex flex-col bg-gray-800 rounded-xl overflow-hidden shadow-lg flex-1 transition-all ${layoutMode === 'full-doc' ? 'absolute inset-0 z-20' : ''}`}>
                 <div className="h-10 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-3 text-gray-300">
                     <div className="flex items-center gap-2">
                         <span className="text-xs font-bold text-white">Rapor S{activeSemester}</span>
                         <div className="flex bg-gray-700 rounded p-0.5">{[1, 2, 3, 4, 5].map(p => <button key={p} onClick={() => setActivePage(p)} className={`w-6 h-6 flex items-center justify-center text-[10px] rounded ${activePage === p ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>{p}</button>)}</div>
                     </div>
                     <div className="flex items-center gap-1">
                         <button onClick={()=>setZoomLevel(z=>z-0.2)} className="p-1 hover:bg-gray-700 rounded"><ZoomOut className="w-3 h-3" /></button>
                         <span className="text-[10px]">{Math.round(zoomLevel*100)}%</span>
                         <button onClick={()=>setZoomLevel(z=>z+0.2)} className="p-1 hover:bg-gray-700 rounded"><ZoomIn className="w-3 h-3" /></button>
                         <button onClick={()=>setLayoutMode(m=>m==='full-doc'?'split':'full-doc')} className="p-1 hover:bg-gray-700 rounded ml-2"><Maximize2 className="w-3 h-3" /></button>
                     </div>
                 </div>
                 <div className="flex-1 overflow-auto p-4 bg-gray-900/50 flex items-start justify-center">
                     {currentDoc ? (
                         <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}>
                             {(useFallbackViewer || isDriveUrl) ? (
                                <iframe src={getDriveUrl(currentDoc.url, 'preview')} className="w-full h-[800px] border-none bg-white rounded" title="Viewer" />
                             ) : (
                                currentDoc.type === 'IMAGE' ? (
                                    <img src={getDriveUrl(currentDoc.url, 'direct')} className="max-w-full h-auto rounded" /> 
                                ) : (
                                    <div className="bg-white min-h-[600px] w-full max-w-[800px] flex items-center justify-center relative">
                                        {isPdfLoading ? <Loader2 className="animate-spin w-10 h-10 text-blue-500" /> : (
                                            pdfDoc ? <PDFPageCanvas pdf={pdfDoc} pageNum={1} scale={1.0} /> : <div className="text-red-500">Gagal memuat PDF</div>
                                        )}
                                    </div>
                                )
                             )}
                         </div>
                     ) : <div className="text-gray-500 mt-20">Halaman {activePage} belum diupload.</div>}
                 </div>
            </div>
        </div>
      ) : <div className="flex-1 flex items-center justify-center text-gray-400">Pilih siswa.</div>}
    </div>
  );
};

export default GradeVerificationView;