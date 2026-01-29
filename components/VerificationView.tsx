import React, { useState, useEffect, useMemo } from 'react';
import { Student, DocumentFile, CorrectionRequest } from '../types';
import { api } from '../services/api';
import { CheckCircle2, XCircle, Loader2, AlertCircle, ScrollText, ZoomIn, ZoomOut, RotateCw, FileCheck2, User, Filter, Search, FileBadge, Save, GitPullRequest, Check, X, ArrowRight, FileText, MapPin, Users, Heart, Wallet } from 'lucide-react';

interface VerificationViewProps {
  students: Student[];
  targetStudentId?: string;
  onUpdate: () => void;
  currentUser: { name: string; role: string };
}

// Master mapping for labels
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
        const parts = url.split(/\/d\//);
        if (parts.length > 1) {
            id = parts[1].split('/')[0];
        }
        if (!id) {
            const match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (match) id = match[1];
        }

        if (id) {
            if (type === 'preview') return `https://drive.google.com/file/d/${id}/preview`;
            if (type === 'direct') return `https://drive.google.com/uc?export=view&id=${id}`;
        }
    }
    return url;
};

const AccordionItem = ({ title, icon: Icon, isOpen, onToggle, children }: { title: string, icon: any, isOpen: boolean, onToggle: () => void, children?: React.ReactNode }) => (
    <div className="border-b border-gray-200 last:border-0">
        <button 
            onClick={onToggle}
            className={`w-full flex items-center justify-between p-3 text-xs font-bold uppercase transition-colors ${isOpen ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
        >
            <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" /> {title}
            </div>
            {isOpen ? <div className="transform rotate-180 transition-transform">▼</div> : <div className="transition-transform">▶</div>}
        </button>
        {isOpen && <div className="p-4 bg-white space-y-3">{children}</div>}
    </div>
);

const VerificationView: React.FC<VerificationViewProps> = ({ students, targetStudentId, onUpdate, currentUser }) => {
  const [selectedClass, setSelectedClass] = useState<string>('VII A');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  
  // Filter Docs
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [allowedCategories, setAllowedCategories] = useState<string[]>([]);

  // Local Form State for Editing
  const [formData, setFormData] = useState<Partial<Student>>({});
  
  // Accordion State
  const [openSection, setOpenSection] = useState<string>('IDENTITY');

  const [adminNote, setAdminNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);

  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [useFallbackViewer, setUseFallbackViewer] = useState(false);

  // Fetch Settings for Document Tabs
  useEffect(() => {
      const fetchSettings = async () => {
          try {
              const settings = await api.getAppSettings();
              if (settings && settings.docConfig && settings.docConfig.indukVerification) {
                  setAllowedCategories(settings.docConfig.indukVerification);
              } else {
                  // Fallback defaults if no settings
                  setAllowedCategories(['AKTA', 'KK', 'FOTO', 'KTP_AYAH', 'KTP_IBU']);
              }
          } catch (e) {
              setAllowedCategories(['AKTA', 'KK', 'FOTO']);
          }
      };
      fetchSettings();
  }, []);

  // Initialize selection based on props or defaults
  useEffect(() => {
      if (targetStudentId) {
          const student = students.find(s => s.id === targetStudentId);
          if (student) {
              setSelectedClass(student.className);
              setSelectedStudentId(student.id);
          }
      }
  }, [targetStudentId, students]);

  // Derived Lists
  const uniqueClasses = useMemo(() => {
      const classes = Array.from(new Set(students.map(s => s.className))).sort();
      return classes.length > 0 ? classes : ['VII A'];
  }, [students]);

  const filteredStudents = useMemo(() => {
      return students.filter(s => s.className === selectedClass).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [students, selectedClass]);

  // Auto-select first student if none selected
  useEffect(() => {
      if (!selectedStudentId && filteredStudents.length > 0) {
          setSelectedStudentId(filteredStudents[0].id);
      } else if (filteredStudents.length > 0 && !filteredStudents.find(s => s.id === selectedStudentId)) {
          setSelectedStudentId(filteredStudents[0].id);
      }
  }, [filteredStudents, selectedStudentId]);

  const currentStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);
  
  // Sync formData when student changes
  useEffect(() => {
      if (currentStudent) {
          setFormData(JSON.parse(JSON.stringify(currentStudent)));
          setActiveTab('ALL'); // Reset filter
      }
  }, [currentStudent]);

  // Filter docs for current student based on Settings AND Active Tab
  const studentDocs = useMemo(() => {
      if (!currentStudent) return [];
      
      // 1. Filter docs that are allowed in "Buku Induk Verification"
      let docs = currentStudent.documents.filter(d => allowedCategories.includes(d.category));
      
      // 2. Filter by Active Tab
      if (activeTab !== 'ALL') {
          docs = docs.filter(d => d.category === activeTab);
      }
      
      return docs;
  }, [currentStudent, activeTab, allowedCategories]);

  // Filter Pending Data Requests (Biodata only, exclude grades/class)
  const pendingRequests = useMemo(() => {
      if (!currentStudent || !currentStudent.correctionRequests) return [];
      return currentStudent.correctionRequests.filter(r => 
          r.status === 'PENDING' && 
          !r.fieldKey.startsWith('grade-') && 
          !r.fieldKey.startsWith('class-') &&
          !r.fieldKey.startsWith('ijazah-')
      );
  }, [currentStudent]);

  // Auto-select first doc logic
  useEffect(() => {
      if (studentDocs.length > 0) {
          // If currently selected doc is valid for this student/filter, keep it. Otherwise switch.
          if (!selectedDocId || !studentDocs.find(d => d.id === selectedDocId)) {
              const pending = studentDocs.find(d => d.status === 'PENDING');
              setSelectedDocId(pending ? pending.id : studentDocs[0].id);
          }
      } else {
          setSelectedDocId(null);
      }
  }, [studentDocs]);

  const currentDoc = studentDocs.find(d => d.id === selectedDocId);

  // --- HANDLE DATA APPROVAL (Bio Correction) ---
  const handleDataCorrection = async (request: CorrectionRequest, status: 'APPROVED' | 'REJECTED') => {
      if (!currentStudent) return;
      setProcessingReqId(request.id);

      try {
          const updatedStudent = JSON.parse(JSON.stringify(currentStudent));

          // 1. Update Request Status
          if (updatedStudent.correctionRequests) {
              updatedStudent.correctionRequests = updatedStudent.correctionRequests.map((r: CorrectionRequest) => {
                  if (r.id === request.id) {
                      return {
                          ...r,
                          status: status,
                          verifierName: currentUser.name,
                          processedDate: new Date().toISOString(),
                          adminNote: status === 'APPROVED' ? 'Disetujui Admin.' : 'Ditolak Admin.'
                      };
                  }
                  return r;
              });
          }

          // 2. IF APPROVED: Update the actual data field
          if (status === 'APPROVED') {
              // Helper to set nested value by string path (e.g. "father.name")
              const setNestedValue = (obj: any, path: string, value: any) => {
                  const keys = path.split('.');
                  let current = obj;
                  for (let i = 0; i < keys.length - 1; i++) {
                      if (!current[keys[i]]) current[keys[i]] = {};
                      current = current[keys[i]];
                  }
                  // Handle numeric conversions if needed
                  const lastKey = keys[keys.length - 1];
                  if (['height', 'weight', 'siblingCount', 'childOrder'].includes(lastKey) || path.includes('circumference')) {
                      current[lastKey] = Number(value) || 0;
                  } else {
                      current[lastKey] = value;
                  }
              };

              setNestedValue(updatedStudent, request.fieldKey, request.proposedValue);
          }

          await api.updateStudent(updatedStudent);
          onUpdate(); 
          alert(status === 'APPROVED' ? "Data berhasil diperbarui." : "Permintaan ditolak.");

      } catch (e) {
          console.error(e);
          alert("Gagal memproses permintaan.");
      } finally {
          setProcessingReqId(null);
      }
  };

  // Handle saving data + verifying document
  const handleProcess = async (status: 'APPROVED' | 'REVISION' | 'SAVE_ONLY') => {
      if (!currentStudent) return;
      if (status === 'REVISION' && !adminNote.trim()) {
          alert("Mohon isi catatan jika dokumen perlu revisi.");
          return;
      }

      setIsProcessing(true);
      try {
          // Merge form data into student object (Manual Edit)
          const updatedStudent = {
              ...currentStudent,
              ...formData,
              dapodik: { ...currentStudent.dapodik, ...(formData.dapodik || {}) },
              father: { ...currentStudent.father, ...(formData.father || {}) },
              mother: { ...currentStudent.mother, ...(formData.mother || {}) },
              guardian: { ...currentStudent.guardian, ...(formData.guardian || {}) }
          };

          // Update Document Status if not just saving data
          if (status !== 'SAVE_ONLY' && currentDoc) {
              updatedStudent.documents = updatedStudent.documents.map((d: DocumentFile) => {
                  if (d.id === currentDoc.id) {
                      return {
                          ...d,
                          status: status,
                          adminNote: adminNote,
                          verifierName: currentUser.name,
                          verificationDate: new Date().toISOString()
                      };
                  }
                  return d;
              });
          }

          await api.updateStudent(updatedStudent);
          onUpdate(); // Refresh parent state
          
          if (status !== 'SAVE_ONLY') {
              setAdminNote('');
              // Move to next pending
              const nextPending = updatedStudent.documents.find((d: DocumentFile) => d.status === 'PENDING' && allowedCategories.includes(d.category));
              if (nextPending) setSelectedDocId(nextPending.id);
          } else {
              alert("Data berhasil disimpan.");
          }

      } catch (e) {
          console.error(e);
          alert("Gagal memproses data.");
      } finally {
          setIsProcessing(false);
      }
  };

  const isImageFile = (doc: DocumentFile) => {
      return doc.type === 'IMAGE' || doc.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);
  };

  const isDriveUrl = currentDoc?.url.includes('drive.google.com') || currentDoc?.url.includes('docs.google.com');

  return (
    <div className="flex flex-col h-full animate-fade-in">
        {/* Top Toolbar */}
        <div className="bg-white p-3 border-b border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm z-20">
            <div className="flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-gray-800">Verifikasi & Edit Buku Induk</h2>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select 
                        className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer min-w-[100px]"
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                    >
                        {uniqueClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 w-full md:w-64">
                    <Search className="w-4 h-4 text-gray-500" />
                    <select 
                        className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer w-full"
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                    >
                        {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                    </select>
                </div>
            </div>
        </div>

        {/* Main Content Split */}
        <div className="flex-1 flex overflow-hidden">
            {/* Left: Document Viewer */}
            <div className="flex-1 bg-gray-900 relative flex flex-col overflow-hidden">
                {currentDoc ? (
                    <>
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-black/50 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-lg">
                            <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.2))} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors" title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
                            <span className="text-white text-xs font-mono font-bold flex items-center px-2">{Math.round(zoomLevel * 100)}%</span>
                            <button onClick={() => setZoomLevel(z => Math.min(3, z + 0.2))} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors" title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
                            <div className="w-px h-4 bg-white/20 my-auto mx-1"></div>
                            <button onClick={() => setRotation(r => r + 90)} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors" title="Putar"><RotateCw className="w-4 h-4" /></button>
                            <button onClick={() => setUseFallbackViewer(v => !v)} className="px-3 py-1 text-[10px] font-bold text-white hover:bg-white/20 rounded-full border border-white/20 ml-1 transition-colors">
                                {useFallbackViewer ? 'Mode Default' : 'Mode Alt'}
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto flex items-center justify-center p-8">
                            <div 
                                style={{ 
                                    transform: `scale(${useFallbackViewer ? 1 : zoomLevel}) rotate(${rotation}deg)`, 
                                    transformOrigin: 'center center', 
                                    transition: 'transform 0.2s ease-out' 
                                }}
                                className="relative shadow-2xl transition-transform duration-200"
                            >
                                {(useFallbackViewer || (isDriveUrl && !isImageFile(currentDoc))) ? (
                                    <iframe 
                                        src={getDriveUrl(currentDoc.url, 'preview')} 
                                        className="w-[800px] h-[1100px] bg-white rounded shadow-lg" 
                                        title="Document Viewer" 
                                        allow="autoplay" 
                                    />
                                ) : (
                                    <img 
                                        src={isDriveUrl ? getDriveUrl(currentDoc.url, 'direct') : currentDoc.url} 
                                        className="max-w-none h-auto object-contain bg-white rounded shadow-sm" 
                                        style={{ maxHeight: '85vh', minWidth: '400px' }}
                                        alt="Document" 
                                        onError={() => setUseFallbackViewer(true)} 
                                    />
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <ScrollText className="w-16 h-16 mb-4 opacity-20" />
                        <p>Tidak ada dokumen yang dipilih.</p>
                    </div>
                )}
            </div>

            {/* Right: Data Panel */}
            <div className="w-[450px] bg-white border-l border-gray-200 flex flex-col shadow-xl z-10">
                
                {/* 1. Document List (Atas) with Dynamic Tabs */}
                <div className="h-1/3 min-h-[180px] flex flex-col bg-gray-50 border-b border-gray-200">
                    <div className="bg-white border-b border-gray-200 shadow-sm z-10">
                        <div className="p-3 text-xs font-bold text-gray-600 uppercase flex justify-between">
                            <span>Dokumen Siswa</span>
                            <span className="bg-gray-100 px-2 rounded-full text-[10px]">{studentDocs.length} File</span>
                        </div>
                        {/* DOC CATEGORY TABS (SCROLLABLE) */}
                        <div className="flex gap-2 px-3 pb-3 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setActiveTab('ALL')}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all ${activeTab === 'ALL' ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                            >
                                SEMUA
                            </button>
                            {allowedCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveTab(cat)}
                                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all ${activeTab === cat ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {DOC_LABELS[cat] || cat}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto">
                        {studentDocs.length === 0 ? (
                            <div className="p-4 text-center text-gray-400 text-xs italic">
                                Tidak ada dokumen di kategori ini.
                            </div>
                        ) : (
                            studentDocs.map(doc => (
                                <div 
                                    key={doc.id} 
                                    onClick={() => { setSelectedDocId(doc.id); setAdminNote(''); setZoomLevel(1); setRotation(0); setUseFallbackViewer(false); }}
                                    className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-white transition-colors flex items-center justify-between ${selectedDocId === doc.id ? 'bg-white border-l-4 border-l-blue-600 shadow-sm' : ''}`}
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className={`p-1.5 rounded ${doc.type === 'PDF' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {doc.type === 'PDF' ? <FileText className="w-3 h-3" /> : <ScrollText className="w-3 h-3" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-xs font-bold truncate ${selectedDocId === doc.id ? 'text-blue-700' : 'text-gray-700'}`}>
                                                {DOC_LABELS[doc.category] || doc.category}
                                            </p>
                                            <p className="text-[9px] text-gray-400">{doc.uploadDate}</p>
                                        </div>
                                    </div>
                                    <div>
                                        {doc.status === 'APPROVED' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                        {doc.status === 'REVISION' && <XCircle className="w-4 h-4 text-red-500" />}
                                        {doc.status === 'PENDING' && <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse"></div>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 2. Data Form (Bawah) - EDITABLE & COMPLETE WITH ACCORDION */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    {/* NEW: PENDING REQUESTS PANEL */}
                    {pendingRequests.length > 0 && (
                        <div className="bg-yellow-50 border-b border-yellow-200 p-3 max-h-48 overflow-y-auto shadow-inner">
                            <h3 className="text-xs font-bold text-yellow-800 flex items-center gap-2 mb-2 sticky top-0 bg-yellow-50 pb-1">
                                <GitPullRequest className="w-4 h-4" /> Permintaan Perubahan Data ({pendingRequests.length})
                            </h3>
                            <div className="space-y-2">
                                {pendingRequests.map(req => (
                                    <div key={req.id} className="bg-white border border-yellow-200 rounded p-2 text-xs">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-gray-700">{req.fieldName}</span>
                                            <span className="text-[9px] text-gray-400">{new Date(req.requestDate).toLocaleDateString()}</span>
                                        </div>
                                        <div className="grid grid-cols-[1fr,auto,1fr] gap-1 items-center mb-1 bg-gray-50 p-1.5 rounded">
                                            <div className="text-red-500 font-medium line-through truncate" title="Lama">{req.originalValue || '(Kosong)'}</div>
                                            <ArrowRight className="w-3 h-3 text-gray-400" />
                                            <div className="text-blue-600 font-bold truncate" title="Baru">{req.proposedValue}</div>
                                        </div>
                                        {req.studentReason && <p className="italic text-gray-500 text-[10px] mb-2">"{req.studentReason}"</p>}
                                        <div className="flex gap-2 justify-end">
                                            <button 
                                                onClick={() => handleDataCorrection(req, 'REJECTED')}
                                                disabled={processingReqId === req.id}
                                                className="px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 flex items-center gap-1 font-bold text-[10px]"
                                            >
                                                {processingReqId === req.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <X className="w-3 h-3"/>} Tolak
                                            </button>
                                            <button 
                                                onClick={() => handleDataCorrection(req, 'APPROVED')}
                                                disabled={processingReqId === req.id}
                                                className="px-2 py-1 bg-green-50 text-green-600 border border-green-200 rounded hover:bg-green-100 flex items-center gap-1 font-bold text-[10px]"
                                            >
                                                {processingReqId === req.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <Check className="w-3 h-3"/>} Terima
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="p-3 bg-blue-50 border-b border-blue-100 text-xs text-blue-800 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-2"><User className="w-3 h-3" /> Data Lengkap (Edit Mode)</span>
                        <button onClick={() => handleProcess('SAVE_ONLY')} className="text-blue-600 hover:text-blue-800" title="Simpan Perubahan Data"><Save className="w-4 h-4"/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {formData.id ? (
                            <div className="divide-y divide-gray-100">
                                {/* SECTION 1: IDENTITAS UTAMA */}
                                <AccordionItem title="Identitas Utama" icon={User} isOpen={openSection === 'IDENTITY'} onToggle={() => setOpenSection(openSection === 'IDENTITY' ? '' : 'IDENTITY')}>
                                    <div className="space-y-3">
                                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Nama Lengkap</label><input className="w-full p-1.5 border rounded text-xs font-bold" value={formData.fullName || ''} onChange={(e) => setFormData({...formData, fullName: e.target.value})} /></div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">NIS</label><input className="w-full p-1.5 border rounded text-xs" value={formData.nis || ''} onChange={(e) => setFormData({...formData, nis: e.target.value})} /></div>
                                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">NISN</label><input className="w-full p-1.5 border rounded text-xs" value={formData.nisn || ''} onChange={(e) => setFormData({...formData, nisn: e.target.value})} /></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">NIK (KTP)</label><input className="w-full p-1.5 border rounded text-xs" value={formData.dapodik?.nik || ''} onChange={(e) => setFormData({...formData, dapodik: {...formData.dapodik, nik: e.target.value} as any})} /></div>
                                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">Jenis Kelamin</label><select className="w-full p-1.5 border rounded text-xs bg-white" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value as any})}><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></div>
                                        </div>
                                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Tempat Lahir</label><input className="w-full p-1.5 border rounded text-xs" value={formData.birthPlace || ''} onChange={(e) => setFormData({...formData, birthPlace: e.target.value})} /></div>
                                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Tanggal Lahir</label><input type="date" className="w-full p-1.5 border rounded text-xs" value={formData.birthDate || ''} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} /></div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">Agama</label><input className="w-full p-1.5 border rounded text-xs" value={formData.religion || ''} onChange={(e) => setFormData({...formData, religion: e.target.value})} /></div>
                                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">Kewarganegaraan</label><input className="w-full p-1.5 border rounded text-xs" value={formData.nationality || ''} onChange={(e) => setFormData({...formData, nationality: e.target.value as any})} /></div>
                                        </div>
                                    </div>
                                </AccordionItem>

                                {/* SECTION 2: ALAMAT */}
                                <AccordionItem title="Alamat & Domisili" icon={MapPin} isOpen={openSection === 'ADDRESS'} onToggle={() => setOpenSection(openSection === 'ADDRESS' ? '' : 'ADDRESS')}>
                                    <div className="space-y-3">
                                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Alamat Jalan</label><textarea className="w-full p-1.5 border rounded text-xs" rows={2} value={formData.address || ''} onChange={(e) => setFormData({...formData, address: e.target.value})} /></div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">RT</label><input className="w-full p-1.5 border rounded text-xs" value={formData.dapodik?.rt || ''} onChange={(e) => setFormData({...formData, dapodik: {...formData.dapodik, rt: e.target.value} as any})} /></div>
                                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">RW</label><input className="w-full p-1.5 border rounded text-xs" value={formData.dapodik?.rw || ''} onChange={(e) => setFormData({...formData, dapodik: {...formData.dapodik, rw: e.target.value} as any})} /></div>
                                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">Kode Pos</label><input className="w-full p-1.5 border rounded text-xs" value={formData.postalCode || ''} onChange={(e) => setFormData({...formData, postalCode: e.target.value})} /></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">Dusun</label><input className="w-full p-1.5 border rounded text-xs" value={formData.dapodik?.dusun || ''} onChange={(e) => setFormData({...formData, dapodik: {...formData.dapodik, dusun: e.target.value} as any})} /></div>
                                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">Kelurahan</label><input className="w-full p-1.5 border rounded text-xs" value={formData.dapodik?.kelurahan || ''} onChange={(e) => setFormData({...formData, dapodik: {...formData.dapodik, kelurahan: e.target.value} as any})} /></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">Kecamatan</label><input className="w-full p-1.5 border rounded text-xs" value={formData.subDistrict || ''} onChange={(e) => setFormData({...formData, subDistrict: e.target.value})} /></div>
                                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">Kabupaten</label><input className="w-full p-1.5 border rounded text-xs" value={formData.district || ''} onChange={(e) => setFormData({...formData, district: e.target.value})} /></div>
                                        </div>
                                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Transportasi</label><input className="w-full p-1.5 border rounded text-xs" value={formData.dapodik?.transportation || ''} onChange={(e) => setFormData({...formData, dapodik: {...formData.dapodik, transportation: e.target.value} as any})} /></div>
                                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Jenis Tinggal</label><input className="w-full p-1.5 border rounded text-xs" value={formData.dapodik?.livingStatus || ''} onChange={(e) => setFormData({...formData, dapodik: {...formData.dapodik, livingStatus: e.target.value} as any})} /></div>
                                    </div>
                                </AccordionItem>

                                {/* SECTION 3: ORANG TUA */}
                                <AccordionItem title="Data Orang Tua" icon={Users} isOpen={openSection === 'PARENTS'} onToggle={() => setOpenSection(openSection === 'PARENTS' ? '' : 'PARENTS')}>
                                    <div className="space-y-4">
                                        <div className="p-2 bg-blue-50 rounded border border-blue-100">
                                            <p className="text-[10px] font-bold text-blue-800 mb-2 uppercase">Data Ayah</p>
                                            <div className="space-y-2">
                                                <input placeholder="Nama Ayah" className="w-full p-1.5 border rounded text-xs" value={formData.father?.name || ''} onChange={(e) => setFormData({...formData, father: {...formData.father, name: e.target.value} as any})} />
                                                <input placeholder="NIK Ayah" className="w-full p-1.5 border rounded text-xs" value={formData.father?.nik || ''} onChange={(e) => setFormData({...formData, father: {...formData.father, nik: e.target.value} as any})} />
                                                <input placeholder="Tahun Lahir" className="w-full p-1.5 border rounded text-xs" value={formData.father?.birthPlaceDate || ''} onChange={(e) => setFormData({...formData, father: {...formData.father, birthPlaceDate: e.target.value} as any})} />
                                                <input placeholder="Pekerjaan" className="w-full p-1.5 border rounded text-xs" value={formData.father?.job || ''} onChange={(e) => setFormData({...formData, father: {...formData.father, job: e.target.value} as any})} />
                                                <input placeholder="Penghasilan" className="w-full p-1.5 border rounded text-xs" value={formData.father?.income || ''} onChange={(e) => setFormData({...formData, father: {...formData.father, income: e.target.value} as any})} />
                                            </div>
                                        </div>
                                        <div className="p-2 bg-pink-50 rounded border border-pink-100">
                                            <p className="text-[10px] font-bold text-pink-800 mb-2 uppercase">Data Ibu</p>
                                            <div className="space-y-2">
                                                <input placeholder="Nama Ibu" className="w-full p-1.5 border rounded text-xs" value={formData.mother?.name || ''} onChange={(e) => setFormData({...formData, mother: {...formData.mother, name: e.target.value} as any})} />
                                                <input placeholder="NIK Ibu" className="w-full p-1.5 border rounded text-xs" value={formData.mother?.nik || ''} onChange={(e) => setFormData({...formData, mother: {...formData.mother, nik: e.target.value} as any})} />
                                                <input placeholder="Tahun Lahir" className="w-full p-1.5 border rounded text-xs" value={formData.mother?.birthPlaceDate || ''} onChange={(e) => setFormData({...formData, mother: {...formData.mother, birthPlaceDate: e.target.value} as any})} />
                                                <input placeholder="Pekerjaan" className="w-full p-1.5 border rounded text-xs" value={formData.mother?.job || ''} onChange={(e) => setFormData({...formData, mother: {...formData.mother, job: e.target.value} as any})} />
                                                <input placeholder="Penghasilan" className="w-full p-1.5 border rounded text-xs" value={formData.mother?.income || ''} onChange={(e) => setFormData({...formData, mother: {...formData.mother, income: e.target.value} as any})} />
                                            </div>
                                        </div>
                                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">No HP Orang Tua</label><input className="w-full p-1.5 border rounded text-xs" value={formData.father?.phone || ''} onChange={(e) => setFormData({...formData, father: {...formData.father, phone: e.target.value} as any})} /></div>
                                    </div>
                                </AccordionItem>

                                {/* SECTION 4: PERIODIK */}
                                <AccordionItem title="Data Periodik" icon={Heart} isOpen={openSection === 'PERIODIC'} onToggle={() => setOpenSection(openSection === 'PERIODIC' ? '' : 'PERIODIC')}>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Tinggi (cm)</label><input type="number" className="w-full p-1.5 border rounded text-xs" value={formData.height || 0} onChange={(e) => setFormData({...formData, height: Number(e.target.value)})} /></div>
                                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Berat (kg)</label><input type="number" className="w-full p-1.5 border rounded text-xs" value={formData.weight || 0} onChange={(e) => setFormData({...formData, weight: Number(e.target.value)})} /></div>
                                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Lingkar Kepala</label><input type="number" className="w-full p-1.5 border rounded text-xs" value={formData.dapodik?.headCircumference || 0} onChange={(e) => setFormData({...formData, dapodik: {...formData.dapodik, headCircumference: Number(e.target.value)} as any})} /></div>
                                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Gol. Darah</label><input className="w-full p-1.5 border rounded text-xs" value={formData.bloodType || '-'} onChange={(e) => setFormData({...formData, bloodType: e.target.value})} /></div>
                                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Jarak Sekolah</label><input className="w-full p-1.5 border rounded text-xs" value={formData.dapodik?.distanceToSchool || ''} onChange={(e) => setFormData({...formData, dapodik: {...formData.dapodik, distanceToSchool: e.target.value} as any})} /></div>
                                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Waktu Tempuh</label><input type="number" className="w-full p-1.5 border rounded text-xs" value={formData.dapodik?.travelTimeMinutes || 0} onChange={(e) => setFormData({...formData, dapodik: {...formData.dapodik, travelTimeMinutes: Number(e.target.value)} as any})} /></div>
                                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Jumlah Saudara</label><input type="number" className="w-full p-1.5 border rounded text-xs" value={formData.siblingCount || 0} onChange={(e) => setFormData({...formData, siblingCount: Number(e.target.value)})} /></div>
                                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Anak Ke-</label><input type="number" className="w-full p-1.5 border rounded text-xs" value={formData.childOrder || 1} onChange={(e) => setFormData({...formData, childOrder: Number(e.target.value)})} /></div>
                                    </div>
                                </AccordionItem>

                                {/* SECTION 5: KESEJAHTERAAN */}
                                <AccordionItem title="Kesejahteraan & Lainnya" icon={Wallet} isOpen={openSection === 'WELFARE'} onToggle={() => setOpenSection(openSection === 'WELFARE' ? '' : 'WELFARE')}>
                                    <div className="space-y-3">
                                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">No. SKHUN</label><input className="w-full p-1.5 border rounded text-xs" value={formData.dapodik?.skhun || ''} onChange={(e) => setFormData({...formData, dapodik: {...formData.dapodik, skhun: e.target.value} as any})} /></div>
                                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">No. Ijazah (SD)</label><input className="w-full p-1.5 border rounded text-xs" value={formData.diplomaNumber || ''} onChange={(e) => setFormData({...formData, diplomaNumber: e.target.value})} /></div>
                                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">No. KIP</label><input className="w-full p-1.5 border rounded text-xs" value={formData.dapodik?.kipNumber || ''} onChange={(e) => setFormData({...formData, dapodik: {...formData.dapodik, kipNumber: e.target.value} as any})} /></div>
                                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Nama Bank</label><input className="w-full p-1.5 border rounded text-xs" value={formData.dapodik?.bank || ''} onChange={(e) => setFormData({...formData, dapodik: {...formData.dapodik, bank: e.target.value} as any})} /></div>
                                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">No Rekening</label><input className="w-full p-1.5 border rounded text-xs" value={formData.dapodik?.bankAccount || ''} onChange={(e) => setFormData({...formData, dapodik: {...formData.dapodik, bankAccount: e.target.value} as any})} /></div>
                                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Atas Nama</label><input className="w-full p-1.5 border rounded text-xs" value={formData.dapodik?.bankAccountName || ''} onChange={(e) => setFormData({...formData, dapodik: {...formData.dapodik, bankAccountName: e.target.value} as any})} /></div>
                                    </div>
                                </AccordionItem>
                            </div>
                        ) : (
                            <div className="text-center text-gray-400 text-xs py-10">Pilih siswa.</div>
                        )}
                    </div>

                    {/* Action Footer */}
                    {currentDoc && (
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Catatan Dokumen</label>
                            <input 
                                type="text" 
                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-blue-500 outline-none" 
                                placeholder="Contoh: Foto buram" 
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => handleProcess('REVISION')} 
                                    disabled={isProcessing}
                                    className="py-2.5 bg-white border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 text-sm flex items-center justify-center gap-2"
                                >
                                    <XCircle className="w-4 h-4" /> Tolak
                                </button>
                                <button 
                                    onClick={() => handleProcess('APPROVED')} 
                                    disabled={isProcessing}
                                    className="py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 text-sm flex items-center justify-center gap-2 shadow-sm"
                                >
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Simpan & Valid
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default VerificationView;