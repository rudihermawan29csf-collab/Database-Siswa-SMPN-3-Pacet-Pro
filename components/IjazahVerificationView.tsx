
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, DocumentFile, CorrectionRequest } from '../types';
import { api } from '../services/api';
import { CheckCircle2, XCircle, Loader2, AlertCircle, ScrollText, ZoomIn, ZoomOut, RotateCw, FileCheck2, User, Filter, Search, FileBadge, Save, Check, X, CheckCheck } from 'lucide-react';

interface IjazahVerificationViewProps {
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
        if (id) return type === 'preview' ? `https://drive.google.com/file/d/${id}/preview` : `https://drive.google.com/uc?export=view&id=${id}`;
    }
    return url;
};

const IjazahVerificationView: React.FC<IjazahVerificationViewProps> = ({ students, targetStudentId, onUpdate, currentUser }) => {
  const [selectedClass, setSelectedClass] = useState<string>('VII A');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [allowedCategories, setAllowedCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<Student>>({});
  const [adminNote, setAdminNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSavingData, setIsSavingData] = useState(false);
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const isTargetingRef = useRef(false);

  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [useFallbackViewer, setUseFallbackViewer] = useState(false);

  useEffect(() => {
      const fetchSettings = async () => {
          try {
              const settings = await api.getAppSettings();
              if (settings?.docConfig?.ijazahVerification) setAllowedCategories(settings.docConfig.ijazahVerification);
              else setAllowedCategories(['IJAZAH', 'SKL', 'AKTA', 'NISN']);
          } catch (e) { setAllowedCategories(['IJAZAH', 'SKL']); }
      };
      fetchSettings();
  }, []);

  useEffect(() => {
      if (targetStudentId && students.length > 0) {
          const student = students.find(s => s.id === targetStudentId);
          if (student) {
              isTargetingRef.current = true;
              setSelectedClass(student.className);
              setSelectedStudentId(student.id);
              setTimeout(() => { isTargetingRef.current = false; }, 800);
          }
      }
  }, [targetStudentId, students]);

  const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className))).sort(), [students]);
  const filteredStudents = useMemo(() => students.filter(s => s.className === selectedClass).sort((a, b) => a.fullName.localeCompare(b.fullName)), [students, selectedClass]);
  
  useEffect(() => {
      if (!isTargetingRef.current) {
          if (!selectedStudentId && filteredStudents.length > 0) setSelectedStudentId(filteredStudents[0].id);
          else if (filteredStudents.length > 0 && !filteredStudents.find(s => s.id === selectedStudentId)) setSelectedStudentId(filteredStudents[0].id);
      }
  }, [filteredStudents, selectedStudentId]);

  const currentStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);

  // RESET FORM DATA ONLY WHEN STUDENT CHANGES
  useEffect(() => {
      if (currentStudent) {
          // Check if it's the same student ID to preserve optimistic updates
          setFormData(prev => {
              if (prev.id === currentStudent.id) return prev;
              
              const safeData = JSON.parse(JSON.stringify(currentStudent));
              if (!safeData.father) safeData.father = {};
              if (!safeData.dapodik) safeData.dapodik = {};
              return safeData;
          });
          setActiveTab('ALL');
      }
  }, [currentStudent]);

  const ijazahDocs = useMemo(() => {
      if (!currentStudent) return [];
      let docs = currentStudent.documents.filter(d => allowedCategories.includes(d.category));
      if (activeTab !== 'ALL') docs = docs.filter(d => d.category === activeTab);
      return docs;
  }, [currentStudent, activeTab, allowedCategories]);

  useEffect(() => {
      if (ijazahDocs.length > 0) {
          if (!selectedDocId || !ijazahDocs.find(d => d.id === selectedDocId)) {
              const pending = ijazahDocs.find(d => d.status === 'PENDING' && !processedIds.has(d.id));
              setSelectedDocId(pending ? pending.id : ijazahDocs[0].id);
          }
      } else setSelectedDocId(null);
  }, [ijazahDocs, processedIds]);

  const currentDoc = ijazahDocs.find(d => d.id === selectedDocId);

  // STRICTLY FILTER PENDING REQUESTS FOR IJAZAH FIELDS
  const pendingRequests = useMemo(() => {
      if (!currentStudent?.correctionRequests) return [];
      return currentStudent.correctionRequests.filter(r => 
          r.status === 'PENDING' && 
          (r.fieldKey.startsWith('ijazah-') || ['fullName','nis','nisn','birthPlace','birthDate','diplomaNumber','father.name'].includes(r.fieldKey)) &&
          !processedIds.has(r.id)
      );
  }, [currentStudent, processedIds]);

  const handleApproveAll = async () => {
      if (!currentStudent || pendingRequests.length === 0) return;
      if (!confirm(`Setujui semua ${pendingRequests.length} revisi data Ijazah?`)) return;

      setIsBulkApproving(true);
      const updatedStudent = JSON.parse(JSON.stringify(currentStudent));
      const newlyProcessedIds = new Set<string>();

      // Apply all
      pendingRequests.forEach(req => {
          newlyProcessedIds.add(req.id);
          
          // Mark as Approved in the array (CRITICAL)
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
          let current: any = updatedStudent;
          for (let i = 0; i < keys.length - 1; i++) { if (!current[keys[i]]) current[keys[i]] = {}; current = current[keys[i]]; }
          current[keys[keys.length - 1]] = req.proposedValue;
      });

      // Optimistic
      setProcessedIds(prev => new Set([...prev, ...newlyProcessedIds]));
      setFormData(updatedStudent);

      try {
          // Send update to App.tsx (clears notifications)
          onUpdate(updatedStudent);
          
          await api.updateStudent(updatedStudent);
          alert("Semua usulan berhasil disetujui.");
      } catch (e) {
          console.error(e);
          // Rollback
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
      
      // OPTIMISTIC: Hide request immediately
      setProcessedIds(prev => new Set(prev).add(request.id));
      
      try {
          const updatedStudent = JSON.parse(JSON.stringify(currentStudent));
          if (updatedStudent.correctionRequests) {
              updatedStudent.correctionRequests = updatedStudent.correctionRequests.map((r: CorrectionRequest) => {
                  if (r.id === request.id) return { ...r, status, verifierName: currentUser.name, processedDate: new Date().toISOString(), adminNote: status === 'APPROVED' ? 'Disetujui.' : 'Ditolak.' };
                  return r;
              });
          }
          
          if (status === 'APPROVED') {
              const keys = request.fieldKey.split('.');
              let current: any = updatedStudent;
              for (let i = 0; i < keys.length - 1; i++) { if (!current[keys[i]]) current[keys[i]] = {}; current = current[keys[i]]; }
              current[keys[keys.length - 1]] = request.proposedValue;
              
              // OPTIMISTIC: Update Local Form Data
              setFormData(prev => {
                  const newFormData = JSON.parse(JSON.stringify(prev));
                  let formCurr: any = newFormData;
                  for (let i = 0; i < keys.length - 1; i++) { if (!formCurr[keys[i]]) formCurr[keys[i]] = {}; formCurr = formCurr[keys[i]]; }
                  formCurr[keys[keys.length - 1]] = request.proposedValue;
                  return newFormData;
              });
          }
          
          onUpdate(updatedStudent); // Update global state
          await api.updateStudent(updatedStudent);
      } catch (e) {
          setProcessedIds(prev => { const next = new Set(prev); next.delete(request.id); return next; });
          alert("Gagal memproses.");
      } finally { setProcessingReqId(null); }
  };

  const handleSaveData = async () => {
      if (!currentStudent) return;
      setIsSavingData(true);
      try {
          const updatedStudent = { ...currentStudent, ...formData, dapodik: { ...currentStudent.dapodik, ...formData.dapodik }, father: { ...currentStudent.father, ...formData.father } };
          onUpdate(updatedStudent); // Update global state
          await api.updateStudent(updatedStudent);
          alert("Data berhasil disimpan.");
      } catch (e) { alert("Gagal menyimpan."); } finally { setIsSavingData(false); }
  };

  const handleProcess = async (status: 'APPROVED' | 'REVISION') => {
      if (!currentStudent || !currentDoc) return;
      if (status === 'REVISION' && !adminNote.trim()) { alert("Mohon isi catatan."); return; }
      setIsProcessing(true);
      setProcessedIds(prev => new Set(prev).add(currentDoc.id));
      try {
          const updatedStudent = { ...currentStudent, ...formData };
          updatedStudent.documents = updatedStudent.documents.map(d => d.id === currentDoc.id ? { ...d, status, adminNote, verifierName: currentUser.name, verificationDate: new Date().toISOString() } : d);
          onUpdate(updatedStudent); // Update global state
          await api.updateStudent(updatedStudent);
          
          setAdminNote('');
          const nextPending = updatedStudent.documents.find(d => d.status === 'PENDING' && allowedCategories.includes(d.category) && !processedIds.has(d.id));
          if(nextPending) setSelectedDocId(nextPending.id);
      } catch (e) {
          setProcessedIds(prev => { const next = new Set(prev); next.delete(currentDoc.id); return next; });
          alert("Gagal memproses.");
      } finally { setIsProcessing(false); }
  };

  const renderField = ({ label, value, fieldKey, type = 'text' }: { label: string, value: any, fieldKey: string, type?: string }) => {
      // Find request in original object, but filter out processed IDs
      const pending = currentStudent?.correctionRequests?.find(r => r.fieldKey === fieldKey && r.status === 'PENDING' && !processedIds.has(r.id));
      const isDate = type === 'date';
      const isProcessingThis = pending && processingReqId === pending.id;
      
      // Get value from local formData which has the latest optimistic updates
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
              <div className="flex justify-between items-center"><label className="text-[10px] font-bold text-gray-500 uppercase">{label}</label>{pending && <span className="text-[8px] bg-yellow-400 text-yellow-900 px-1 rounded font-black animate-pulse">REVISI</span>}</div>
              <div className="relative">
                  <input type={isDate ? 'date' : 'text'} className={`w-full p-2 border rounded text-xs ${pending ? 'border-yellow-400 bg-yellow-50 pr-8' : 'border-gray-200'}`} value={currentValue || ''} onChange={(e) => {
                      const keys = fieldKey.split('.'); const newForm = { ...formData }; let curr: any = newForm;
                      for (let i = 0; i < keys.length - 1; i++) { if (!curr[keys[i]]) curr[keys[i]] = {}; curr = curr[keys[i]]; }
                      curr[keys[keys.length - 1]] = e.target.value; setFormData(newForm);
                  }} />
                  {pending && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 group-hover:block hidden z-30">
                          <div className="bg-white border border-yellow-300 p-3 rounded-lg shadow-xl text-[10px] w-56 ring-1 ring-black/5">
                              <p className="font-black text-yellow-800 uppercase text-[9px] mb-1">Usulan Siswa:</p>
                              <p className="text-blue-700 font-bold text-sm bg-blue-50 px-2 py-1 rounded mb-2 truncate">{isDate ? new Date(pending.proposedValue).toLocaleDateString('id-ID') : pending.proposedValue}</p>
                              <p className="italic text-gray-600 mb-3">"{pending.studentReason}"</p>
                              <div className="flex gap-1.5 pt-2 border-t border-gray-100">
                                  <button onClick={(e) => handleDataCorrection(e, pending, 'APPROVED')} disabled={!!processingReqId} className="flex-1 bg-green-600 text-white py-1.5 rounded font-bold flex items-center justify-center gap-1">{isProcessingThis ? <Loader2 className="w-3 h-3 animate-spin"/> : <Check className="w-3 h-3" />} Terima</button>
                                  <button onClick={(e) => handleDataCorrection(e, pending, 'REJECTED')} disabled={!!processingReqId} className="flex-1 bg-red-600 text-white py-1.5 rounded font-bold flex items-center justify-center gap-1">{isProcessingThis ? <Loader2 className="w-3 h-3 animate-spin"/> : <X className="w-3 h-3" />} Tolak</button>
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
            <div className="flex items-center gap-2"><FileBadge className="w-5 h-5 text-purple-600" /><h2 className="font-bold text-gray-800">Verifikasi Ijazah/SKL</h2></div>
            <div className="flex gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200"><Filter className="w-4 h-4 text-gray-500" />
                    <select className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer min-w-[100px]" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>{uniqueClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)}</select>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 w-full md:w-64"><Search className="w-4 h-4 text-gray-500" />
                    <select className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer w-full" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>{filteredStudents.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}</select>
                </div>
            </div>
        </div>
        <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 bg-gray-900 relative flex flex-col overflow-hidden">
                {currentDoc ? (
                    <>
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-black/50 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-lg">
                            <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.2))} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"><ZoomOut className="w-4 h-4" /></button>
                            <span className="text-white text-xs font-mono font-bold flex items-center px-2">{Math.round(zoomLevel * 100)}%</span>
                            <button onClick={() => setZoomLevel(z => Math.min(3, z + 0.2))} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"><ZoomIn className="w-4 h-4" /></button>
                            <div className="w-px h-4 bg-white/20 my-auto mx-1"></div>
                            <button onClick={() => setRotation(r => r + 90)} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"><RotateCw className="w-4 h-4" /></button>
                            <button onClick={() => setUseFallbackViewer(v => !v)} className="px-3 py-1 text-[10px] font-bold text-white hover:bg-white/20 rounded-full border border-white/20 ml-1 transition-colors">{useFallbackViewer ? 'Mode Default' : 'Mode Alt'}</button>
                        </div>
                        <div className="flex-1 overflow-auto flex items-center justify-center p-8">
                            <div style={{ transform: `scale(${useFallbackViewer ? 1 : zoomLevel}) rotate(${rotation}deg)`, transformOrigin: 'center center' }} className="relative shadow-2xl transition-transform duration-200">
                                {(useFallbackViewer || (currentDoc.url.includes('drive.google.com') && !currentDoc.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/))) ? (
                                    <iframe src={getDriveUrl(currentDoc.url, 'preview')} className="w-[800px] h-[1100px] bg-white rounded shadow-lg" title="Document Viewer" />
                                ) : (
                                    <img src={getDriveUrl(currentDoc.url, 'direct')} className="max-w-none h-auto object-contain bg-white rounded shadow-sm" style={{ maxHeight: '85vh', minWidth: '400px' }} alt="Document" onError={() => setUseFallbackViewer(true)} />
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500"><ScrollText className="w-16 h-16 mb-4 opacity-20" /><p>Tidak ada dokumen verifikasi.</p></div>
                )}
            </div>
            <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-xl z-10">
                <div className="h-1/3 min-h-[150px] flex flex-col bg-gray-50 border-b border-gray-200">
                    <div className="bg-white border-b border-gray-200 shadow-sm z-10">
                        <div className="p-3 text-xs font-bold text-gray-600 uppercase flex justify-between"><span>Dokumen Verifikasi</span><span className="bg-gray-100 px-2 rounded-full text-[10px]">{ijazahDocs.length} File</span></div>
                        <div className="flex gap-2 px-3 pb-3 overflow-x-auto no-scrollbar">
                            <button onClick={() => setActiveTab('ALL')} className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border ${activeTab === 'ALL' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600'}`}>SEMUA</button>
                            {allowedCategories.map(cat => (
                                <button key={cat} onClick={() => setActiveTab(cat)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border ${activeTab === cat ? 'bg-purple-600 text-white' : 'bg-white text-gray-600'}`}>{DOC_LABELS[cat] || cat}</button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {ijazahDocs.map(doc => {
                            const isProcessed = processedIds.has(doc.id);
                            return (
                                <div key={doc.id} onClick={() => { setSelectedDocId(doc.id); setAdminNote(''); }} className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-white flex items-center justify-between ${selectedDocId === doc.id ? 'bg-white border-l-4 border-l-purple-600' : ''}`}>
                                    <div className="flex items-center gap-2"><div className="p-1.5 bg-purple-100 text-purple-600 rounded"><FileCheck2 className="w-3 h-3" /></div><div><p className="text-xs font-bold text-gray-800">{DOC_LABELS[doc.category] || doc.category}</p></div></div>
                                    <div>{isProcessed ? <Check className="w-4 h-4 text-gray-400" /> : (doc.status === 'APPROVED' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : doc.status === 'REVISION' ? <XCircle className="w-4 h-4 text-red-500" /> : <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse"></div>)}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    <div className="p-3 bg-purple-50 border-b border-purple-100 text-xs text-purple-800 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-2"><FileBadge className="w-3 h-3" /> Data Ijazah & SKL</span>
                        <div className="flex gap-2">
                            {pendingRequests.length > 0 && (
                                <button 
                                    onClick={handleApproveAll} 
                                    disabled={isBulkApproving} 
                                    className="text-[10px] bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-full font-bold flex items-center gap-1 shadow-sm transition-all"
                                >
                                    {isBulkApproving ? <Loader2 className="w-3 h-3 animate-spin"/> : <CheckCheck className="w-3 h-3"/>}
                                    Terima Semua ({pendingRequests.length})
                                </button>
                            )}
                            <button onClick={handleSaveData} disabled={isSavingData} className="text-purple-600 hover:text-purple-800">{isSavingData ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}</button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {currentStudent ? (
                            <div className="space-y-4">
                                {renderField({ label: "Nama Lengkap", value: formData.fullName, fieldKey: "fullName" })}
                                <div className="grid grid-cols-2 gap-2">
                                    {renderField({ label: "NIS", value: formData.nis, fieldKey: "nis" })}
                                    {renderField({ label: "NISN", value: formData.nisn, fieldKey: "nisn" })}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {renderField({ label: "Tempat Lahir", value: formData.birthPlace, fieldKey: "birthPlace" })}
                                    {renderField({ label: "Tanggal Lahir", value: formData.birthDate, fieldKey: "birthDate", type: "date" })}
                                </div>
                                {renderField({ label: "Nama Orang Tua", value: formData.father?.name, fieldKey: "father.name" })}
                                {renderField({ label: "No. Seri Ijazah (Lama)", value: formData.diplomaNumber, fieldKey: "diplomaNumber" })}
                                {renderField({ label: "No. Peserta Ujian", value: formData.dapodik?.unExamNumber, fieldKey: "dapodik.unExamNumber" })}
                            </div>
                        ) : <div className="text-center text-gray-400 text-xs py-10">Pilih dokumen di atas.</div>}
                    </div>
                    {currentDoc && (
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Catatan</label>
                            <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm mb-3 outline-none" placeholder="Catatan..." value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handleProcess('REVISION')} disabled={isProcessing} className="py-2.5 bg-white border border-red-200 text-red-600 font-bold rounded-lg text-sm flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Tolak</button>
                                <button onClick={() => handleProcess('APPROVED')} disabled={isProcessing} className="py-2.5 bg-green-600 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 shadow-sm">{isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Simpan & Valid</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default IjazahVerificationView;
