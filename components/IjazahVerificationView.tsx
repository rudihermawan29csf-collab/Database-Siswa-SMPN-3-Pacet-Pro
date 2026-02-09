
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, DocumentFile } from '../types';
import { api } from '../services/api';
import { CheckCircle2, XCircle, Loader2, AlertCircle, ScrollText, ZoomIn, ZoomOut, RotateCw, FileCheck2, User, Filter, Search, FileBadge, Save } from 'lucide-react';

interface IjazahVerificationViewProps {
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

const IjazahVerificationView: React.FC<IjazahVerificationViewProps> = ({ students, targetStudentId, onUpdate, currentUser }) => {
  const [selectedClass, setSelectedClass] = useState<string>('VII A');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Filter Docs
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [allowedCategories, setAllowedCategories] = useState<string[]>([]);

  // Local Form Data
  const [formData, setFormData] = useState<Partial<Student>>({});

  const [adminNote, setAdminNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSavingData, setIsSavingData] = useState(false);
  
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [useFallbackViewer, setUseFallbackViewer] = useState(false);

  // Ref to lock auto-selection when target is present
  const isTargetingRef = useRef(false);

  // Fetch Settings for Document Tabs
  useEffect(() => {
      const fetchSettings = async () => {
          try {
              const settings = await api.getAppSettings();
              if (settings && settings.docConfig && settings.docConfig.ijazahVerification) {
                  setAllowedCategories(settings.docConfig.ijazahVerification);
              } else {
                  setAllowedCategories(['IJAZAH', 'SKL', 'AKTA', 'NISN']);
              }
          } catch (e) {
              setAllowedCategories(['IJAZAH', 'SKL']);
          }
      };
      fetchSettings();
  }, []);

  // Initialize selection
  useEffect(() => {
      if (targetStudentId && students.length > 0) {
          const student = students.find(s => s.id === targetStudentId);
          if (student) {
              isTargetingRef.current = true; // Lock
              setSelectedClass(student.className);
              setSelectedStudentId(student.id);
              // Unlock after delay
              setTimeout(() => { isTargetingRef.current = false; }, 800);
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

  // --- AUTO SELECT (Only if not targeting) ---
  useEffect(() => {
      if (isTargetingRef.current) return;

      if (!selectedStudentId && filteredStudents.length > 0) {
          setSelectedStudentId(filteredStudents[0].id);
      } else if (filteredStudents.length > 0 && !filteredStudents.find(s => s.id === selectedStudentId)) {
          setSelectedStudentId(filteredStudents[0].id);
      }
  }, [filteredStudents, selectedStudentId]);

  const currentStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);

  // Sync Form Data with Defaults to avoid undefined
  useEffect(() => {
      if (currentStudent) {
          // Ensure nested objects exist
          const safeData = JSON.parse(JSON.stringify(currentStudent));
          if (!safeData.father) safeData.father = {};
          if (!safeData.dapodik) safeData.dapodik = {};
          
          setFormData(safeData);
          setActiveTab('ALL');
      }
  }, [currentStudent]);

  // Filter Docs based on Settings AND Active Tab
  const ijazahDocs = useMemo(() => {
      if (!currentStudent) return [];
      
      // 1. Filter docs allowed for Ijazah Verification
      let docs = currentStudent.documents.filter(d => allowedCategories.includes(d.category));
      
      // 2. Filter by Active Tab
      if (activeTab !== 'ALL') {
          docs = docs.filter(d => d.category === activeTab);
      }
      
      return docs;
  }, [currentStudent, activeTab, allowedCategories]);

  // Auto Select Doc
  useEffect(() => {
      if (ijazahDocs.length > 0) {
          if (!selectedDocId || !ijazahDocs.find(d => d.id === selectedDocId)) {
              const pending = ijazahDocs.find(d => d.status === 'PENDING');
              setSelectedDocId(pending ? pending.id : ijazahDocs[0].id);
          }
      } else {
          setSelectedDocId(null);
      }
  }, [ijazahDocs]);

  const currentDoc = ijazahDocs.find(d => d.id === selectedDocId);

  // Save Data Only (No Verification)
  const handleSaveData = async () => {
      if (!currentStudent) return;
      setIsSavingData(true);
      try {
          const updatedStudent = {
              ...currentStudent,
              ...formData,
              dapodik: { ...currentStudent.dapodik, ...(formData.dapodik || {}) },
              father: { ...currentStudent.father, ...(formData.father || {}) }
          };
          
          await api.updateStudent(updatedStudent);
          onUpdate();
          alert("Data berhasil disimpan.");
      } catch (e) {
          console.error(e);
          alert("Gagal menyimpan data.");
      } finally {
          setIsSavingData(false);
      }
  };

  // Verify Document
  const handleProcess = async (status: 'APPROVED' | 'REVISION') => {
      if (!currentStudent || !currentDoc) return;
      if (status === 'REVISION' && !adminNote.trim()) {
          alert("Mohon isi catatan jika dokumen perlu revisi.");
          return;
      }

      setIsProcessing(true);
      try {
          // Merge Data
          const updatedStudent = {
              ...currentStudent,
              ...formData,
              dapodik: { ...currentStudent.dapodik, ...(formData.dapodik || {}) },
              father: { ...currentStudent.father, ...(formData.father || {}) }
          };

          // Update Doc Status
          updatedStudent.documents = updatedStudent.documents.map(d => {
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

          await api.updateStudent(updatedStudent);
          onUpdate();
          setAdminNote('');
          
          // Next pending
          const nextPending = updatedStudent.documents.find(d => d.status === 'PENDING' && allowedCategories.includes(d.category));
          if(nextPending) setSelectedDocId(nextPending.id);

      } catch (e) {
          console.error(e);
          alert("Gagal memproses verifikasi.");
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
                <FileBadge className="w-5 h-5 text-purple-600" />
                <h2 className="font-bold text-gray-800">Verifikasi Ijazah/SKL</h2>
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
                        <p>Tidak ada dokumen verifikasi.</p>
                        <p className="text-xs">Namun Anda tetap bisa mengedit data di kanan.</p>
                    </div>
                )}
            </div>

            {/* Right: Data Panel */}
            <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-xl z-10">
                {/* 1. Ijazah List (Top Right) */}
                <div className="h-1/3 min-h-[150px] flex flex-col bg-gray-50 border-b border-gray-200">
                    <div className="bg-white border-b border-gray-200 shadow-sm z-10">
                        <div className="p-3 text-xs font-bold text-gray-600 uppercase flex justify-between">
                            <span>Dokumen Verifikasi</span>
                            <span className="bg-gray-100 px-2 rounded-full text-[10px]">{ijazahDocs.length} File</span>
                        </div>
                        {/* DOC CATEGORY TABS (SCROLLABLE) */}
                        <div className="flex gap-2 px-3 pb-3 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setActiveTab('ALL')}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all ${activeTab === 'ALL' ? 'bg-purple-600 text-white border-purple-600 shadow' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                            >
                                SEMUA
                            </button>
                            {allowedCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveTab(cat)}
                                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all ${activeTab === cat ? 'bg-purple-600 text-white border-purple-600 shadow' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {DOC_LABELS[cat] || cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {ijazahDocs.length === 0 ? (
                            <div className="p-4 text-center text-gray-400 text-xs italic">Belum ada dokumen.</div>
                        ) : (
                            ijazahDocs.map(doc => (
                                <div 
                                    key={doc.id} 
                                    onClick={() => { setSelectedDocId(doc.id); setAdminNote(''); setZoomLevel(1); setRotation(0); setUseFallbackViewer(false); }}
                                    className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-white transition-colors flex items-center justify-between ${selectedDocId === doc.id ? 'bg-white border-l-4 border-l-purple-600 shadow-sm' : ''}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-purple-100 text-purple-600 rounded">
                                            <FileCheck2 className="w-3 h-3" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-800">{DOC_LABELS[doc.category] || doc.category}</p>
                                            <p className="text-[9px] text-gray-500">{doc.uploadDate}</p>
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

                {/* 2. Data Info (Bottom Right) - EDITABLE */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    <div className="p-3 bg-purple-50 border-b border-purple-100 text-xs text-purple-800 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-2"><FileBadge className="w-3 h-3" /> Data Ijazah (Edit Mode)</span>
                        <button onClick={handleSaveData} className="text-purple-600 hover:text-purple-800" title="Simpan Data"><Save className="w-4 h-4"/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {currentStudent ? (
                            <>
                                <div className="bg-purple-50 p-2 rounded border border-purple-100 text-[10px] text-purple-800 mb-2">
                                    Pastikan data di bawah sesuai dengan ijazah fisik.
                                </div>

                                <div className="space-y-4">
                                    <div className="group border-b pb-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1 mb-2"><User className="w-3 h-3"/> Identitas Dasar</label>
                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-[9px] font-bold text-gray-500 uppercase">Nama Lengkap</label>
                                                <input className="w-full p-2 border rounded text-xs font-bold" value={formData.fullName || ''} onChange={(e) => setFormData({...formData, fullName: e.target.value})} placeholder="Nama Lengkap"/>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[9px] font-bold text-gray-500 uppercase">NIS</label>
                                                    <input className="w-full p-2 border rounded text-xs" value={formData.nis || ''} onChange={(e) => setFormData({...formData, nis: e.target.value})} />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-bold text-gray-500 uppercase">NISN</label>
                                                    <input className="w-full p-2 border rounded text-xs" value={formData.nisn || ''} onChange={(e) => setFormData({...formData, nisn: e.target.value})} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-bold text-gray-500 uppercase">Tempat Lahir</label>
                                                <input className="w-full p-2 border rounded text-xs" value={formData.birthPlace || ''} onChange={(e) => setFormData({...formData, birthPlace: e.target.value})} placeholder="Tempat Lahir"/>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-bold text-gray-500 uppercase">Tanggal Lahir</label>
                                                <input type="date" className="w-full p-2 border rounded text-xs" value={formData.birthDate || ''} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="group border-b pb-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Nama Orang Tua (Ijazah)</label>
                                        <input 
                                            className="w-full p-2 border rounded text-xs" 
                                            value={formData.father?.name || ''} 
                                            onChange={(e) => setFormData({...formData, father: {...(formData.father || {}), name: e.target.value} as any})} 
                                            placeholder="Nama Ayah/Wali di Ijazah"
                                        />
                                    </div>

                                    <div className="group">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">No. Seri Ijazah (Database)</label>
                                        <input 
                                            className="w-full p-2 border border-gray-300 rounded text-sm font-bold font-mono text-blue-700 focus:ring-1 focus:ring-blue-500 outline-none"
                                            value={formData.diplomaNumber || ''}
                                            onChange={(e) => setFormData({...formData, diplomaNumber: e.target.value})}
                                            placeholder="DN-..."
                                        />
                                    </div>
                                    <div className="group">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">No. Peserta Ujian</label>
                                        <input 
                                            className="w-full p-2 border border-gray-300 rounded text-sm font-bold text-gray-800 focus:ring-1 focus:ring-blue-500 outline-none"
                                            value={formData.dapodik?.unExamNumber || ''}
                                            onChange={(e) => setFormData({...formData, dapodik: {...(formData.dapodik || {}), unExamNumber: e.target.value} as any})}
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-gray-400 text-xs py-10">Pilih dokumen di atas.</div>
                        )}
                    </div>

                    {/* Action Footer */}
                    {currentDoc && (
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Catatan</label>
                            <input 
                                type="text" 
                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-blue-500 outline-none" 
                                placeholder="Contoh: Nomor seri tidak terbaca" 
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

export default IjazahVerificationView;
