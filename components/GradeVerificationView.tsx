import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, CorrectionRequest } from '../types';
import { 
  CheckCircle2, FileText, Maximize2, AlertCircle, 
  ZoomIn, ZoomOut, Save, FileDown, FileSpreadsheet,
  FileCheck2, Loader2, Pencil, Search, AlertTriangle, X, Filter
} from 'lucide-react';
import { api } from '../services/api';

interface GradeVerificationViewProps {
  students: Student[];
  onUpdate?: () => void;
  currentUser?: { name: string; role: string };
  userRole?: 'ADMIN' | 'STUDENT' | 'GURU'; 
}

const getDriveUrl = (url: string, type: 'preview' | 'direct') => {
    if (!url) return '';
    if (url.startsWith('blob:')) return url;
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
        let id = '';
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) id = match[1];
        else { try { const urlObj = new URL(url); id = urlObj.searchParams.get('id') || ''; } catch (e) {} }
        if (id) {
            if (type === 'preview') return `https://drive.google.com/file/d/${id}/preview`;
            if (type === 'direct') return `https://drive.google.com/uc?export=view&id=${id}`;
        }
    }
    return url;
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
                    canvas.height = viewport.height; canvas.width = viewport.width;
                    page.render({ canvasContext: context, viewport: viewport }).promise;
                }
            });
        }
    }, [pdf, pageNum, scale]);
    return <canvas ref={canvasRef} className="shadow-lg bg-white" />;
};

const GradeVerificationView: React.FC<GradeVerificationViewProps> = ({ students, onUpdate, currentUser, userRole = 'ADMIN' }) => {
  const [activeSemester, setActiveSemester] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(''); // New Class Filter State
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [activePage, setActivePage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); 
  const [layoutMode, setLayoutMode] = useState<'split' | 'full-doc'>('split');
  const [isEditing, setIsEditing] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Document Reject State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  
  // Student Grade Correction Modal
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [targetCorrection, setTargetCorrection] = useState<{subject: string, currentScore: number} | null>(null);
  const [correctionProposedScore, setCorrectionProposedScore] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  // Admin Review Correction Modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CorrectionRequest | null>(null);
  const [adminReviewNote, setAdminReviewNote] = useState('');

  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [useFallbackViewer, setUseFallbackViewer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isStudent = userRole === 'STUDENT';

  // Extract Unique Classes
  const uniqueClasses = useMemo(() => {
      return Array.from(new Set(students.map(s => s.className))).sort();
  }, [students]);

  // Set default class on load
  useEffect(() => {
      if (!selectedClassFilter && uniqueClasses.length > 0) {
          setSelectedClassFilter(uniqueClasses[0]);
      }
  }, [uniqueClasses]);

  // Filter students based on Class AND Search
  const filteredStudents = useMemo(() => {
      let filtered = students;
      
      // 1. Filter by Class first
      if (selectedClassFilter) {
          filtered = filtered.filter(s => s.className === selectedClassFilter);
      }

      // 2. Filter by Search Term
      if (searchTerm) {
          filtered = filtered.filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.nisn.includes(searchTerm));
      }
      return filtered.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [students, searchTerm, selectedClassFilter]);

  // Force select first student when list loads or changes (e.g. class change)
  useEffect(() => {
      if (filteredStudents.length > 0) {
          // Only change if no selection or current selection is invalid/not in current list
          if (!selectedStudentId || !filteredStudents.find(s => s.id === selectedStudentId)) {
              setSelectedStudentId(filteredStudents[0].id);
          }
      } else {
          // If no students in filter, reset ID
          setSelectedStudentId('');
      }
  }, [filteredStudents, selectedStudentId]);

  const currentStudent = students.find(s => s.id === selectedStudentId);
  const currentRecord = currentStudent?.academicRecords?.[activeSemester];
  
  const currentDoc = currentStudent?.documents.find(d => 
      d.category === 'RAPOR' && 
      d.subType?.semester === activeSemester && 
      d.subType?.page === activePage
  );
  
  // Document Loading Logic (Skip if Student)
  useEffect(() => {
    if (isStudent) return;
    
    const loadPdf = async () => {
        setPdfDoc(null); setIsPdfLoading(false); setUseFallbackViewer(false);
        if (!currentDoc) return;
        if (currentDoc.url.includes('drive.google.com') || currentDoc.url.includes('docs.google.com')) { setUseFallbackViewer(true); return; }
        if (currentDoc.type === 'PDF' || currentDoc.name.toLowerCase().endsWith('.pdf')) {
            setIsPdfLoading(true);
            try {
                // @ts-ignore
                const pdfjsLib = await import('pdfjs-dist');
                const pdfjs = pdfjsLib.default ? pdfjsLib.default : pdfjsLib;
                if (!pdfjs.GlobalWorkerOptions.workerSrc) pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
                const response = await fetch(currentDoc.url);
                if (!response.ok) throw new Error("Network error");
                const arrayBuffer = await response.arrayBuffer();
                const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                setPdfDoc(pdf); setIsPdfLoading(false);
            } catch (error) { console.error(error); setUseFallbackViewer(true); setIsPdfLoading(false); }
        }
    };
    loadPdf();
  }, [currentDoc, isStudent]);

  const handleApproveDoc = async () => { 
      if (currentDoc && currentStudent) { 
          setIsSaving(true);
          currentDoc.status = 'APPROVED'; 
          currentDoc.adminNote = 'Valid.'; 
          currentDoc.verifierName = currentUser?.name || 'Admin';
          currentDoc.verifierRole = currentUser?.role || 'ADMIN';
          currentDoc.verificationDate = new Date().toISOString().split('T')[0];
          
          await api.updateStudent(currentStudent);
          setIsSaving(false);

          setForceUpdate(prev => prev + 1); 
          if (onUpdate) onUpdate(); 
      } 
  };
  
  const confirmRejectDoc = async () => { 
      if (currentDoc && currentStudent) { 
          if (!rejectionNote.trim()) {
              alert("Isi alasan penolakan!");
              return;
          }
          setIsSaving(true);
          currentDoc.status = 'REVISION'; 
          currentDoc.adminNote = rejectionNote; 
          currentDoc.verifierName = currentUser?.name || 'Admin';
          currentDoc.verifierRole = currentUser?.role || 'ADMIN';
          currentDoc.verificationDate = new Date().toISOString().split('T')[0];
          
          await api.updateStudent(currentStudent);
          setIsSaving(false);

          setRejectModalOpen(false); 
          setRejectionNote('');
          setForceUpdate(prev => prev + 1); 
          if (onUpdate) onUpdate(); 
      } 
  };

  const handleDownloadPDF = () => {
      if (!currentStudent || !currentRecord) return;
      // @ts-ignore
      const html2pdf = window.html2pdf;
      if (!html2pdf) { alert("Library PDF belum dimuat."); return; }

      const element = document.getElementById('grades-table-container');
      const opt = {
          margin: 10,
          filename: `Nilai_${currentStudent.fullName}_S${activeSemester}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      html2pdf().set(opt).from(element).save();
  };

  const handleDownloadExcel = () => {
      if (!currentStudent || !currentRecord) return;
      // @ts-ignore
      const xlsx = window.XLSX;
      if (!xlsx) { alert("Library Excel belum dimuat."); return; }

      const data = currentRecord.subjects.map((s, idx) => ({
          'No': idx + 1,
          'Mata Pelajaran': s.subject,
          'Nilai': s.score,
          'Predikat': s.competency
      }));

      // Add extra info rows
      data.push({ 'No': '', 'Mata Pelajaran': '---', 'Nilai': '', 'Predikat': '' });
      data.push({ 'No': 'Ekskul', 'Mata Pelajaran': currentRecord.extracurriculars?.[0]?.name || '-', 'Nilai': currentRecord.extracurriculars?.[0]?.score || '-', 'Predikat': '' });
      data.push({ 'No': 'Ketidakhadiran', 'Mata Pelajaran': `Sakit: ${currentRecord.attendance.sick}, Izin: ${currentRecord.attendance.permitted}, Alfa: ${currentRecord.attendance.noReason}`, 'Nilai': '', 'Predikat': '' });

      const ws = xlsx.utils.json_to_sheet(data);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Nilai Siswa");
      xlsx.writeFile(wb, `Nilai_${currentStudent.fullName}_S${activeSemester}.xlsx`);
  };

  // ... (Correction Handlers remain the same) ...
  const handleStudentGradeClick = (subject: string, score: number) => {
      if (!isStudent) return;
      setTargetCorrection({ subject, currentScore: score });
      setCorrectionProposedScore(String(score));
      setCorrectionReason('');
      setCorrectionModalOpen(true);
  };

  const submitGradeCorrection = async () => {
      if (!currentStudent || !targetCorrection) return;
      if (!correctionReason.trim()) { alert("Mohon isi alasan perubahan."); return; }
      const newRequest: CorrectionRequest = {
          id: Math.random().toString(36).substr(2, 9),
          fieldKey: `GRADES_S${activeSemester}_${targetCorrection.subject}`,
          fieldName: `Nilai ${targetCorrection.subject} (Sem ${activeSemester})`,
          originalValue: String(targetCorrection.currentScore),
          proposedValue: correctionProposedScore,
          studentReason: correctionReason,
          status: 'PENDING',
          requestDate: new Date().toISOString(),
      };
      if (!currentStudent.correctionRequests) currentStudent.correctionRequests = [];
      currentStudent.correctionRequests = currentStudent.correctionRequests.filter(r => r.fieldKey !== newRequest.fieldKey || r.status !== 'PENDING');
      currentStudent.correctionRequests.push(newRequest);
      await api.updateStudent(currentStudent);
      setCorrectionModalOpen(false);
      setForceUpdate(prev => prev + 1);
      if (onUpdate) onUpdate();
      alert("Pengajuan koreksi nilai berhasil dikirim.");
  };

  const handleAdminGradeClick = (request: CorrectionRequest) => {
      if (isStudent) return;
      setSelectedRequest(request);
      setAdminReviewNote('');
      setReviewModalOpen(true);
  };

  const handleReviewDecision = async (decision: 'APPROVED' | 'REJECTED') => {
      if (!selectedRequest || !currentStudent || !currentRecord) return;
      setIsSaving(true);
      selectedRequest.status = decision;
      selectedRequest.verifierName = currentUser?.name || 'Admin';
      selectedRequest.processedDate = new Date().toISOString().split('T')[0];
      selectedRequest.adminNote = adminReviewNote;
      if (decision === 'APPROVED') {
          const subjectName = selectedRequest.fieldKey.split('_').slice(2).join('_');
          const targetSubject = currentRecord.subjects.find(s => s.subject === subjectName || selectedRequest.fieldName.includes(s.subject));
          if (targetSubject) { targetSubject.score = Number(selectedRequest.proposedValue); } 
          else { const altTarget = currentRecord.subjects.find(s => selectedRequest.fieldName.includes(s.subject)); if(altTarget) altTarget.score = Number(selectedRequest.proposedValue); }
      }
      await api.updateStudent(currentStudent);
      setIsSaving(false);
      setReviewModalOpen(false);
      setForceUpdate(prev => prev + 1);
      if (onUpdate) onUpdate();
  };

  const handleGradeChange = (subjectIndex: number, newScore: string) => {
      if (currentRecord) { currentRecord.subjects[subjectIndex].score = Number(newScore); setForceUpdate(prev => prev + 1); }
  };

  const saveGrades = async () => {
      if (currentStudent && isEditing) {
          setIsSaving(true);
          await api.updateStudent(currentStudent);
          setIsSaving(false);
          setIsEditing(false);
          if (onUpdate) onUpdate();
      } else {
          setIsEditing(true);
      }
  };

  const isDriveUrl = currentDoc && (currentDoc.url.includes('drive.google.com') || currentDoc.url.includes('docs.google.com'));

  return (
    <div className="flex flex-col h-full animate-fade-in relative">
        {/* MODALS (Reject, Correction, Review) REMAIN SAME ... */}
        {rejectModalOpen && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col">
                    <h3 className="font-bold text-red-600 mb-2">Tolak Dokumen</h3>
                    <textarea className="w-full p-2 border rounded mb-4" rows={3} value={rejectionNote} onChange={e => setRejectionNote(e.target.value)} placeholder="Alasan penolakan..." />
                    <div className="flex justify-end gap-2">
                        <button onClick={()=>setRejectModalOpen(false)} className="px-3 py-1 bg-gray-100 rounded">Batal</button>
                        <button onClick={confirmRejectDoc} disabled={isSaving} className="px-3 py-1 bg-red-600 text-white rounded flex items-center">
                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Simpan'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        {correctionModalOpen && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="font-bold text-gray-800">Ajukan Perubahan Nilai</h3><button onClick={() => setCorrectionModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button></div>
                    <div className="bg-blue-50 p-3 rounded mb-4 text-sm"><span className="font-bold">{targetCorrection?.subject}</span> <br/> Nilai Saat Ini: {targetCorrection?.currentScore}</div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1">Nilai Seharusnya</label>
                    <input type="number" className="w-full p-2 border rounded mb-3" value={correctionProposedScore} onChange={e => setCorrectionProposedScore(e.target.value)} />
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1">Alasan</label>
                    <textarea className="w-full p-2 border rounded mb-4" rows={3} value={correctionReason} onChange={e => setCorrectionReason(e.target.value)} placeholder="Kenapa nilai ini salah?" />
                    <button onClick={submitGradeCorrection} className="w-full py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Kirim Pengajuan</button>
                </div>
            </div>
        )}
        {reviewModalOpen && selectedRequest && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="font-bold text-gray-800">Tinjau Perubahan Nilai</h3><button onClick={() => setReviewModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button></div>
                    <div className="flex gap-4 mb-4">
                        <div className="flex-1 bg-gray-100 p-3 rounded text-center"><p className="text-xs text-gray-500">Nilai Awal</p><p className="text-xl font-bold text-gray-700">{selectedRequest.originalValue}</p></div>
                        <div className="flex items-center text-gray-400">➔</div>
                        <div className="flex-1 bg-blue-50 p-3 rounded text-center border border-blue-200"><p className="text-xs text-blue-600">Nilai Usulan</p><p className="text-xl font-bold text-blue-700">{selectedRequest.proposedValue}</p></div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded border border-yellow-100 mb-4 text-sm italic text-yellow-800">"{selectedRequest.studentReason}"</div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1">Catatan Admin</label>
                    <textarea className="w-full p-2 border rounded mb-4" rows={2} value={adminReviewNote} onChange={e => setAdminReviewNote(e.target.value)} placeholder="Opsional..." />
                    <div className="flex gap-2">
                        <button onClick={() => handleReviewDecision('REJECTED')} disabled={isSaving} className="flex-1 py-2 bg-red-100 text-red-700 rounded font-bold hover:bg-red-200">Tolak</button>
                        <button onClick={() => handleReviewDecision('APPROVED')} disabled={isSaving} className="flex-1 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700">Setujui & Ubah</button>
                    </div>
                </div>
            </div>
        )}

      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4 mb-4">
        <div className="flex gap-3 w-full lg:w-auto items-center">
             <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-2 rounded-lg font-bold text-sm border border-purple-100">
                 <FileCheck2 className="w-4 h-4" /> {isStudent ? 'Nilai Saya' : 'Verifikasi Nilai'}
             </div>
             {!isStudent && (
                 <>
                    {/* Class Filter */}
                    <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg border border-gray-200">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select 
                            className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer w-20 md:w-32"
                            value={selectedClassFilter}
                            onChange={(e) => setSelectedClassFilter(e.target.value)}
                        >
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    {/* Student Selection */}
                    <select 
                        className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium w-48 md:w-64 truncate" 
                        value={selectedStudentId} 
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                    >
                        {filteredStudents.length > 0 ? (
                            filteredStudents.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)
                        ) : (
                            <option value="">Tidak ada siswa</option>
                        )}
                    </select>

                    {/* Search Input */}
                    <div className="relative w-32 md:w-48 hidden md:block">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
                        <input 
                            type="text" 
                            placeholder="Cari..." 
                            className="w-full pl-8 pr-3 py-1.5 bg-gray-100 rounded-lg text-sm outline-none focus:bg-white border border-transparent focus:border-purple-300 transition-all" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>
                 </>
             )}
             {isStudent && currentStudent && <div className="px-3 py-2 bg-gray-100 rounded-lg border border-gray-200 text-sm font-bold text-gray-700">{currentStudent.fullName} ({currentStudent.className})</div>}
        </div>
        
        {/* DOWNLOAD BUTTONS (Admin Only) */}
        {!isStudent && currentRecord && (
            <div className="flex gap-2">
                <button onClick={handleDownloadPDF} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-200 hover:bg-red-100">
                    <FileDown className="w-4 h-4" /> PDF
                </button>
                <button onClick={handleDownloadExcel} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-bold border border-green-200 hover:bg-green-100">
                    <FileSpreadsheet className="w-4 h-4" /> Excel
                </button>
            </div>
        )}

        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
            {[1, 2, 3, 4, 5, 6].map(sem => (
                <button key={sem} onClick={() => { setActiveSemester(sem); setActivePage(1); }} className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap ${activeSemester === sem ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>S{sem}</button>
            ))}
        </div>
      </div>

      {currentStudent ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden relative">
            {/* GRADES DATA - Printable Area for Admin Download */}
            <div className={`bg-white rounded-xl border border-gray-200 flex flex-col shadow-sm transition-all duration-300 ${layoutMode === 'full-doc' ? 'hidden' : (isStudent ? 'w-full' : 'w-full lg:w-[400px]')}`}>
                <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-gray-700 uppercase">Data Nilai S{activeSemester}</h3>
                    {!isStudent && (
                        <button onClick={saveGrades} disabled={isSaving} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${isEditing ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {isEditing ? (isSaving ? <Loader2 className="w-3 h-3 animate-spin"/> : <><Save className="w-3 h-3" /> Simpan</>) : <><Pencil className="w-3 h-3" /> Edit Nilai</>}
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto p-0 pb-32" id="grades-table-container">
                    {/* Header for PDF only */}
                    {!isStudent && (
                        <div className="p-4 border-b hidden print:block" id="pdf-header">
                            <h2 className="text-lg font-bold text-center">Laporan Nilai Semester {activeSemester}</h2>
                            <p className="text-center text-sm">{currentStudent.fullName} - {currentStudent.className}</p>
                        </div>
                    )}

                    {currentRecord ? (
                        <div className="p-0">
                            <table className={`w-full text-left ${isStudent ? 'text-sm' : 'text-[10px]'}`}>
                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
                                    <tr><th className="px-3 py-2">Mapel</th><th className="px-3 py-2 w-14 text-center">Nilai</th><th className="px-3 py-2">Predikat</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {currentRecord.subjects.length > 0 ? currentRecord.subjects.map((s, idx) => {
                                        const pendingReq = currentStudent.correctionRequests?.find(r => r.status === 'PENDING' && r.fieldKey.includes(`GRADES_S${activeSemester}`) && (r.fieldKey.includes(s.subject) || r.fieldName.includes(s.subject)));
                                        return (
                                            <tr key={idx} className={`hover:bg-gray-50 ${isStudent ? 'hover:bg-blue-50' : ''}`}>
                                                <td className="px-3 py-2 font-medium relative">{s.subject}{pendingReq && !isStudent && <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>}</td>
                                                <td 
                                                    className={`px-3 py-2 text-center font-bold relative border-l border-r border-gray-100 ${
                                                        isStudent ? 'bg-blue-50/50 hover:bg-blue-100 cursor-pointer' : '' 
                                                    } ${pendingReq ? 'bg-yellow-50' : ''}`}
                                                    onClick={(e) => { 
                                                        if (isStudent) handleStudentGradeClick(s.subject, s.score); 
                                                        if (pendingReq && !isStudent) { e.stopPropagation(); handleAdminGradeClick(pendingReq); }
                                                    }}
                                                >
                                                    {isEditing ? (
                                                        <input type="number" className="w-12 text-center border rounded" value={s.score} onChange={(e) => handleGradeChange(idx, e.target.value)} />
                                                    ) : (
                                                        pendingReq ? (
                                                            <div className="flex flex-col items-center justify-center">
                                                                <div className="flex items-center gap-1 text-xs">
                                                                    <span className="text-gray-400 line-through decoration-red-400">{s.score}</span>
                                                                    <span className="text-gray-400">→</span>
                                                                    <span className="text-blue-700 font-extrabold text-sm bg-white px-1 rounded shadow-sm border border-blue-200">
                                                                        {pendingReq.proposedValue}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[9px] text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded-full mt-1 border border-yellow-200 uppercase tracking-wide">
                                                                    Menunggu Verifikasi
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className={s.score < 75 ? 'text-red-500' : 'text-gray-900'}>{s.score}</span>
                                                        )
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-gray-500">{s.competency}</td>
                                            </tr>
                                        );
                                    }) : <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Belum ada mata pelajaran.</td></tr>}
                                </tbody>
                            </table>
                            <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-3">
                                <div className="flex justify-between text-sm"><span className="font-bold text-gray-500">Ekstrakurikuler:</span> <span>{currentRecord.extracurriculars?.[0]?.name || '-'} ({currentRecord.extracurriculars?.[0]?.score || '-'})</span></div>
                                <div className="flex justify-between text-sm"><span className="font-bold text-gray-500">Kehadiran:</span> <span className="font-mono">S:{currentRecord.attendance?.sick} I:{currentRecord.attendance?.permitted} A:{currentRecord.attendance?.noReason}</span></div>
                                {[2, 4, 6].includes(activeSemester) && <div className="flex justify-between text-sm"><span className="font-bold text-gray-500">Keterangan:</span> <span className="font-bold text-blue-600">{currentRecord.promotionStatus || '-'}</span></div>}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center"><AlertCircle className="w-8 h-8 mb-2 opacity-50" /><span>Data belum tersedia.</span></div>
                    )}
                </div>
                {!isStudent && (
                    <div className="p-3 border-t bg-gray-50 flex gap-2">
                        <button onClick={() => { setRejectionNote(''); setRejectModalOpen(true); }} disabled={!currentDoc || isSaving} className="flex-1 py-1.5 border border-red-200 text-red-600 rounded bg-white text-xs font-bold disabled:opacity-50 hover:bg-red-50">Tolak Doc</button>
                        <button onClick={handleApproveDoc} disabled={!currentDoc || isSaving} className="flex-1 py-1.5 bg-green-600 text-white rounded text-xs font-bold disabled:opacity-50 hover:bg-green-700 flex items-center justify-center">{isSaving ? <Loader2 className="w-3 h-3 animate-spin"/> : 'Setujui Doc'}</button>
                    </div>
                )}
            </div>

            {/* RIGHT PANEL: DOCUMENT VIEWER */}
            {!isStudent && (
                <div className={`flex flex-col bg-gray-800 rounded-xl overflow-hidden shadow-lg flex-1 transition-all ${layoutMode === 'full-doc' ? 'absolute inset-0 z-20' : ''}`}>
                     <div className="h-10 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-3 text-gray-300">
                         <div className="flex items-center gap-2"><span className="text-xs font-bold text-white">Rapor S{activeSemester}</span><div className="flex bg-gray-700 rounded p-0.5">{[1, 2, 3, 4, 5].map(p => <button key={p} onClick={() => setActivePage(p)} className={`w-6 h-6 flex items-center justify-center text-[10px] rounded ${activePage === p ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>{p}</button>)}</div></div>
                         <div className="flex items-center gap-1"><button onClick={()=>setZoomLevel(z=>z-0.2)} className="p-1 hover:bg-gray-700 rounded"><ZoomOut className="w-3 h-3" /></button><span className="text-[10px]">{Math.round(zoomLevel*100)}%</span><button onClick={()=>setZoomLevel(z=>z+0.2)} className="p-1 hover:bg-gray-700 rounded"><ZoomIn className="w-3 h-3" /></button><button onClick={()=>setLayoutMode(m=>m==='full-doc'?'split':'full-doc')} className="p-1 hover:bg-gray-700 rounded ml-2"><Maximize2 className="w-3 h-3" /></button></div>
                     </div>
                     <div className="flex-1 overflow-auto p-4 bg-gray-900/50 flex items-start justify-center pb-32">
                         {currentDoc ? (
                             <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}>
                                 {(useFallbackViewer || isDriveUrl) ? (
                                    <iframe src={getDriveUrl(currentDoc.url, 'preview')} className="w-full h-[800px] border-none bg-white rounded" title="Viewer" />
                                 ) : (
                                    currentDoc.type === 'IMAGE' ? <img src={getDriveUrl(currentDoc.url, 'direct')} className="max-w-full h-auto rounded" /> : <div className="bg-white min-h-[600px] w-full max-w-[800px] flex items-center justify-center relative">{isPdfLoading ? <Loader2 className="animate-spin w-10 h-10 text-blue-500" /> : (pdfDoc ? <PDFPageCanvas pdf={pdfDoc} pageNum={1} scale={1.0} /> : <div className="text-red-500">PDF Viewer</div>)}</div>
                                 )}
                             </div>
                         ) : <div className="text-gray-500 mt-20 flex flex-col items-center"><FileText className="w-12 h-12 mb-2 opacity-50" />Halaman {activePage} belum diupload siswa.</div>}
                     </div>
                </div>
            )}
        </div>
      ) : <div className="flex-1 flex items-center justify-center text-gray-400">Pilih siswa untuk memverifikasi.</div>}
    </div>
  );
};

export default GradeVerificationView;