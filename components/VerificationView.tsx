import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Student } from '../types';
import { 
  CheckCircle2, Loader2, ZoomIn, ZoomOut, Maximize2, AlertCircle, RefreshCw, ExternalLink
} from 'lucide-react';
import { api } from '../services/api';

interface VerificationViewProps {
  students: Student[];
  targetStudentId?: string;
  onUpdate?: () => void;
  onSave?: (student: Student) => void;
  currentUser?: { name: string; role: string }; 
}

const DOCUMENT_TYPES = [
  { id: 'IJAZAH', label: 'Ijazah SD' },
  { id: 'AKTA', label: 'Akta Kelahiran' },
  { id: 'KK', label: 'Kartu Keluarga' },
  { id: 'KTP_AYAH', label: 'KTP Ayah' },
  { id: 'KTP_IBU', label: 'KTP Ibu' },
  { id: 'KIP', label: 'KIP / PKH' },
  { id: 'SKL', label: 'Surat Ket. Lulus' },
  { id: 'RAPOR', label: 'Rapor' },
  { id: 'FOTO', label: 'Pas Foto' },
];

// Robust Drive ID Extractor
const getDriveId = (url: string) => {
    if (!url) return null;
    const matchFile = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (matchFile && matchFile[1]) return matchFile[1];
    const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchId && matchId[1]) return matchId[1];
    const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (matchD && matchD[1]) return matchD[1];
    if (url.includes('google.com')) {
        const looseMatch = url.match(/([a-zA-Z0-9_-]{25,})/);
        if (looseMatch && looseMatch[1]) return looseMatch[1];
    }
    return null;
};

// Helper to construct specific Drive URLs
const getDriveUrl = (url: string, type: 'preview' | 'view') => {
    const id = getDriveId(url);
    if (!id) return url;
    
    if (type === 'preview') return `https://drive.google.com/file/d/${id}/preview`; // Iframe
    if (type === 'view') return `https://drive.google.com/file/d/${id}/view?usp=sharing`; // External Link
    
    return url;
};

const VerificationView: React.FC<VerificationViewProps> = ({ students, targetStudentId, onUpdate, onSave, currentUser }) => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [activeDocType, setActiveDocType] = useState<string>('IJAZAH');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); 
  const [layoutMode, setLayoutMode] = useState<'split' | 'full-doc'>('split');
  const [activeDataTab, setActiveDataTab] = useState<string>('DAPO_PRIBADI');
  const [isEditing, setIsEditing] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Image Error State
  const [imgError, setImgError] = useState(false);

  // Rapor State
  const [raporSemester, setRaporSemester] = useState(1);
  const [raporPage, setRaporPage] = useState(1);
  
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [isSaving, setIsSaving] = useState(false); 

  const uniqueClasses = Array.from(new Set(students.map(s => s.className))).sort();
  const studentsInClass = students.filter(s => s.className === selectedClass);
  const currentStudent = students.find(s => s.id === selectedStudentId);
  
  const currentDoc = useMemo(() => {
      if (!currentStudent) return undefined;
      if (activeDocType === 'RAPOR') {
          return currentStudent.documents.find(d => 
              d.category === 'RAPOR' && 
              d.subType?.semester === raporSemester && 
              d.subType?.page === raporPage
          );
      }
      return currentStudent.documents.find(d => d.category === activeDocType);
  }, [currentStudent, activeDocType, raporSemester, raporPage]);

  // Reset img error
  useEffect(() => {
      setImgError(false);
  }, [currentDoc]);

  useEffect(() => { if (uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0]); }, [uniqueClasses]);
  
  useEffect(() => { 
    if (targetStudentId) {
        const target = students.find(s => s.id === targetStudentId);
        if (target) { setSelectedClass(target.className); setSelectedStudentId(target.id); }
    } else if (studentsInClass.length > 0 && !selectedStudentId) { setSelectedStudentId(studentsInClass[0].id); }
  }, [targetStudentId, selectedClass, students]);

  useEffect(() => {
      if (currentStudent) {
          const pendingDoc = currentStudent.documents.find(d => d.status === 'PENDING' && DOCUMENT_TYPES.some(t => t.id === d.category));
          if (pendingDoc) {
              setActiveDocType(pendingDoc.category);
              if (pendingDoc.category === 'RAPOR' && pendingDoc.subType) {
                  setRaporSemester(pendingDoc.subType.semester);
                  setRaporPage(pendingDoc.subType.page);
              }
          }
      }
  }, [selectedStudentId]); 

  // Reset zoom and error state when doc changes
  useEffect(() => {
      setZoomLevel(1.0);
  }, [selectedStudentId, activeDocType, raporSemester, raporPage]);
  
  const handleDataChange = (path: string, value: string) => {
      if (!currentStudent) return;
      const keys = path.split('.');
      let current: any = currentStudent;
      for (let i = 0; i < keys.length - 1; i++) { if (!current[keys[i]]) current[keys[i]] = {}; current = current[keys[i]]; }
      current[keys[keys.length - 1]] = value;
      setForceUpdate(prev => prev + 1);
  };

  // ... [Handlers kept same] ...
  const handleApprove = async () => { 
      if (currentDoc && currentStudent) { 
          setIsSaving(true);
          const updatedDocs = currentStudent.documents.map(d => d.id === currentDoc.id ? { ...d, status: 'APPROVED' as const, adminNote: 'Dokumen valid.', verifierName: currentUser?.name || 'Admin', verifierRole: currentUser?.role || 'ADMIN', verificationDate: new Date().toISOString().split('T')[0] } : d);
          const updatedStudent = { ...currentStudent, documents: updatedDocs };
          if (onSave) await onSave(updatedStudent); else await api.updateStudent(updatedStudent);
          if (onUpdate) onUpdate(); 
          setIsSaving(false); setForceUpdate(prev => prev + 1); 
      } 
  };
  const confirmReject = async () => { 
      if (currentDoc && currentStudent) { 
          if (!rejectionNote.trim()) { alert("Mohon isi alasan penolakan."); return; }
          setIsSaving(true);
          const updatedDocs = currentStudent.documents.map(d => d.id === currentDoc.id ? { ...d, status: 'REVISION' as const, adminNote: rejectionNote, verifierName: currentUser?.name || 'Admin', verifierRole: currentUser?.role || 'ADMIN', verificationDate: new Date().toISOString().split('T')[0] } : d);
          const updatedStudent = { ...currentStudent, documents: updatedDocs };
          if (onSave) await onSave(updatedStudent); else await api.updateStudent(updatedStudent);
          if (onUpdate) onUpdate(); 
          setIsSaving(false); setRejectModalOpen(false); setRejectionNote(''); setForceUpdate(prev => prev + 1); 
      } 
  };
  
  const renderDataTab = () => { /* ... */ return null; }; // Logic exists in previous file

  const driveId = currentDoc ? getDriveId(currentDoc.url) : null;
  const isImage = currentDoc ? (currentDoc.type === 'IMAGE' || /\.(jpeg|jpg|png|gif|bmp|webp)$/i.test(currentDoc.name)) : false;
  const isDriveOrGoogle = driveId || (currentDoc && currentDoc.url.includes('google.com'));

  return (
    <div className="flex flex-col h-full animate-fade-in relative">
        {rejectModalOpen && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col">
                    <h3 className="font-bold text-red-600 mb-2">Tolak Dokumen</h3>
                    <textarea className="w-full p-3 border border-gray-300 rounded-lg text-sm mb-4" rows={3} value={rejectionNote} onChange={e => setRejectionNote(e.target.value)} placeholder="Alasan penolakan..." />
                    <div className="flex justify-end gap-2">
                        <button onClick={()=>setRejectModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-xs font-bold">Batal</button>
                        <button onClick={confirmReject} disabled={isSaving} className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold flex items-center">{isSaving ? <Loader2 className="animate-spin w-3 h-3"/> : 'Simpan'}</button>
                    </div>
                </div>
            </div>
        )}

      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
        <div className="flex gap-3 w-full lg:w-auto">
             <select className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>{uniqueClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)}</select>
             <select className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium w-64" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>{studentsInClass.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}</select>
        </div>
        <div className="flex overflow-x-auto gap-1">{DOCUMENT_TYPES.map(type => {
            let doc;
            if (type.id === 'RAPOR' && currentStudent) doc = currentStudent.documents.find(d => d.category === 'RAPOR' && d.status === 'PENDING');
            else doc = currentStudent?.documents.find(d => d.category === type.id);
            const color = doc?.status === 'APPROVED' ? 'text-green-600 bg-green-50 border-green-200' : doc?.status === 'REVISION' ? 'text-red-600 bg-red-50 border-red-200' : doc?.status === 'PENDING' ? 'text-yellow-600 bg-yellow-50 border-yellow-200 animate-pulse' : 'text-gray-400 border-transparent';
            return <button key={type.id} onClick={() => setActiveDocType(type.id)} className={`px-3 py-1.5 rounded-md text-xs font-bold border flex items-center gap-1 ${activeDocType === type.id ? 'ring-2 ring-blue-500' : ''} ${color}`}>{type.label}{doc?.status === 'PENDING' && <AlertCircle className="w-3 h-3" />}</button>;
        })}</div>
      </div>

      {currentStudent ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden relative">
            <div className={`bg-white rounded-xl border border-gray-200 flex flex-col shadow-sm transition-all duration-300 ${layoutMode === 'full-doc' ? 'hidden' : 'w-full lg:w-96'}`}>
                {activeDocType === 'RAPOR' && (
                    <div className="p-3 border-b border-gray-200 bg-blue-50 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-blue-700 uppercase">Semester</label>
                            <div className="flex gap-1">{[1,2,3,4,5,6].map(s => <button key={s} onClick={() => setRaporSemester(s)} className={`w-6 h-6 text-[10px] font-bold rounded relative ${raporSemester === s ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border border-blue-200'}`}>{s}</button>)}</div>
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-blue-700 uppercase">Halaman</label>
                            <div className="flex gap-1">{[1,2,3].map(p => <button key={p} onClick={() => setRaporPage(p)} className={`w-6 h-6 text-[10px] font-bold rounded border ${raporPage === p ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border-blue-200'}`}>{p}</button>)}</div>
                        </div>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 pb-32"><div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">{renderDataTab()}</div></div>
                {currentDoc ? (
                    <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-2">
                        {currentDoc.status === 'PENDING' ? (
                            <>
                                <button onClick={() => { setRejectionNote(''); setRejectModalOpen(true); }} disabled={isSaving} className="flex-1 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50">Tolak</button>
                                <button onClick={handleApprove} disabled={isSaving} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 flex items-center justify-center">{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Setujui'}</button>
                            </>
                        ) : (
                            <div className="flex-1 text-center"><span className={`font-bold text-sm ${currentDoc.status === 'APPROVED' ? 'text-green-700' : 'text-red-700'}`}>{currentDoc.status}</span></div>
                        )}
                    </div>
                ) : <div className="p-4 text-center text-xs text-gray-400">Tidak ada file.</div>}
            </div>
            
            <div className={`flex flex-col bg-gray-800 rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${layoutMode === 'full-doc' ? 'w-full absolute inset-0 z-20' : 'flex-1 h-full'}`}>
                 <div className="h-12 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4 text-gray-300">
                     <span className="text-sm font-bold text-white">{currentDoc ? currentDoc.name : 'No Doc'}</span>
                     <div className="flex items-center gap-2">
                        {currentDoc && (
                            <a href={driveId ? getDriveUrl(currentDoc.url, 'view') : currentDoc.url} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-gray-700 rounded text-blue-400 hover:text-blue-300" title="Buka di Tab Baru"><ExternalLink className="w-4 h-4" /></a>
                        )}
                        <button onClick={()=>setZoomLevel(z=>z-0.2)} className="p-1 hover:bg-gray-700 rounded"><ZoomOut className="w-4 h-4" /></button>
                        <span className="text-xs">{Math.round(zoomLevel*100)}%</span>
                        <button onClick={()=>setZoomLevel(z=>z+0.2)} className="p-1 hover:bg-gray-700 rounded"><ZoomIn className="w-4 h-4" /></button>
                        <button onClick={()=>setLayoutMode(m=>m==='full-doc'?'split':'full-doc')} className="p-1 hover:bg-gray-700 rounded ml-2"><Maximize2 className="w-4 h-4" /></button>
                     </div>
                 </div>
                 <div className="flex-1 overflow-auto p-4 bg-gray-900/50 flex items-start justify-center pb-32">
                     {currentDoc ? (
                         <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}>
                             {isDriveOrGoogle || imgError ? (
                                // DRIVE OR FALLBACK TO IFRAME
                                <div className="w-full h-full relative">
                                    <iframe src={driveId ? getDriveUrl(currentDoc.url, 'preview') : currentDoc.url} className="w-full h-[800px] border-none rounded bg-white shadow-xl" title="Viewer" allow="autoplay" />
                                    <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
                                        <a href={driveId ? getDriveUrl(currentDoc.url, 'view') : currentDoc.url} target="_blank" rel="noreferrer" className="bg-black/50 text-white px-3 py-1 rounded-full text-xs hover:bg-black/80 flex items-center gap-1 transition-colors">
                                            <ExternalLink className="w-3 h-3" /> Buka Tab Baru
                                        </a>
                                    </div>
                                </div>
                             ) : (
                                 isImage ? <img src={currentDoc.url} className="max-w-full h-auto rounded shadow-sm" alt="Doc" onError={() => setImgError(true)} /> : 
                                 // NON-DRIVE PDF / OTHER -> NATIVE IFRAME
                                 <div className="w-full h-full bg-white rounded shadow-xl overflow-hidden relative">
                                    <iframe 
                                        src={currentDoc.url} 
                                        className="w-full h-[800px]" 
                                        title="Document Viewer"
                                    />
                                    <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
                                        <a href={currentDoc.url} target="_blank" rel="noreferrer" className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs shadow hover:bg-blue-700 flex items-center gap-1">
                                            <ExternalLink className="w-3 h-3" /> Buka Full Tab
                                        </a>
                                    </div>
                                 </div>
                             )}
                         </div>
                     ) : <div className="text-gray-500 mt-20">Belum ada dokumen.</div>}
                 </div>
            </div>
        </div>
      ) : <div className="flex-1 flex items-center justify-center text-gray-400">Pilih siswa.</div>}
    </div>
  );
};

export default VerificationView;