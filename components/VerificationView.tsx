import React, { useState, useEffect, useMemo } from 'react';
import { Student, DocumentFile, CorrectionRequest } from '../types';
import { api } from '../services/api';
import { 
  CheckCircle2, XCircle, Loader2, AlertCircle, ScrollText, ZoomIn, ZoomOut, 
  RotateCw, FileCheck2, User, Filter, Search, FileBadge, Save, 
  GitPullRequest, Check, X, ArrowRight, FileText, MapPin, Users, Heart, Wallet, ChevronDown 
} from 'lucide-react';

interface VerificationViewProps {
  students: Student[];
  targetStudentId?: string;
  onUpdate: () => void;
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
        if (id) {
            return type === 'preview' ? `https://drive.google.com/file/d/${id}/preview` : `https://drive.google.com/uc?export=view&id=${id}`;
        }
    }
    return url;
};

const AccordionItem = ({ title, icon: Icon, isOpen, onToggle, children, badge }: { title: string, icon: any, isOpen: boolean, onToggle: () => void, children?: React.ReactNode, badge?: number }) => (
    <div className="border-b border-gray-200 last:border-0">
        <button 
            onClick={onToggle}
            className={`w-full flex items-center justify-between p-3 text-xs font-bold uppercase transition-colors ${isOpen ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
        >
            <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" /> 
                {title}
                {badge ? <span className="ml-2 bg-blue-600 text-white px-1.5 py-0.5 rounded-full text-[9px]">{badge}</span> : null}
            </div>
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 transform -rotate-90" />}
        </button>
        {isOpen && <div className="p-4 bg-white space-y-4 animate-fade-in">{children}</div>}
    </div>
);

const VerificationView: React.FC<VerificationViewProps> = ({ students, targetStudentId, onUpdate, currentUser }) => {
  const [selectedClass, setSelectedClass] = useState<string>('VII A');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [allowedCategories, setAllowedCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<Student>>({});
  const [openSection, setOpenSection] = useState<string>('IDENTITY');
  const [adminNote, setAdminNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [useFallbackViewer, setUseFallbackViewer] = useState(false);

  useEffect(() => {
      const fetchSettings = async () => {
          try {
              const settings = await api.getAppSettings();
              if (settings?.docConfig?.indukVerification) setAllowedCategories(settings.docConfig.indukVerification);
              else setAllowedCategories(['AKTA', 'KK', 'FOTO', 'KTP_AYAH', 'KTP_IBU', 'NISN']);
          } catch (e) { setAllowedCategories(['AKTA', 'KK', 'FOTO']); }
      };
      fetchSettings();
  }, []);

  useEffect(() => {
      if (targetStudentId) {
          const student = students.find(s => s.id === targetStudentId);
          if (student) { setSelectedClass(student.className); setSelectedStudentId(student.id); }
      }
  }, [targetStudentId, students]);

  const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className))).sort(), [students]);
  const filteredStudents = useMemo(() => students.filter(s => s.className === selectedClass).sort((a, b) => a.fullName.localeCompare(b.fullName)), [students, selectedClass]);
  
  useEffect(() => {
      if (!selectedStudentId && filteredStudents.length > 0) setSelectedStudentId(filteredStudents[0].id);
  }, [filteredStudents, selectedStudentId]);

  const currentStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);

  useEffect(() => {
      if (currentStudent) {
          setFormData(JSON.parse(JSON.stringify(currentStudent)));
          setActiveTab('ALL');
      }
  }, [currentStudent]);

  const studentDocs = useMemo(() => {
      if (!currentStudent) return [];
      let docs = currentStudent.documents.filter(d => allowedCategories.includes(d.category));
      if (activeTab !== 'ALL') docs = docs.filter(d => d.category === activeTab);
      return docs;
  }, [currentStudent, activeTab, allowedCategories]);

  useEffect(() => {
      if (studentDocs.length > 0 && (!selectedDocId || !studentDocs.find(d => d.id === selectedDocId))) {
          const pending = studentDocs.find(d => d.status === 'PENDING');
          setSelectedDocId(pending ? pending.id : studentDocs[0].id);
      } else if (studentDocs.length === 0) { setSelectedDocId(null); }
  }, [studentDocs]);

  const currentDoc = studentDocs.find(d => d.id === selectedDocId);

  const pendingRequests = useMemo(() => {
      if (!currentStudent?.correctionRequests) return [];
      return currentStudent.correctionRequests.filter(r => 
          r.status === 'PENDING' && !r.fieldKey.startsWith('grade-') && !r.fieldKey.startsWith('ijazah-')
      );
  }, [currentStudent]);

  const handleDataCorrection = async (e: React.MouseEvent, request: CorrectionRequest, status: 'APPROVED' | 'REJECTED') => {
      e.preventDefault();
      e.stopPropagation();
      if (!currentStudent) return;
      
      setProcessingReqId(request.id);
      try {
          const updatedStudent = JSON.parse(JSON.stringify(currentStudent));
          if (updatedStudent.correctionRequests) {
              updatedStudent.correctionRequests = updatedStudent.correctionRequests.map((r: CorrectionRequest) => {
                  if (r.id === request.id) {
                      return { 
                          ...r, 
                          status, 
                          verifierName: currentUser.name, 
                          processedDate: new Date().toISOString(), 
                          adminNote: status === 'APPROVED' ? 'Disetujui.' : 'Ditolak.' 
                      };
                  }
                  return r;
              });
          }

          if (status === 'APPROVED') {
              // Apply value to updatedStudent for database
              const keys = request.fieldKey.split('.');
              let current = updatedStudent;
              for (let i = 0; i < keys.length - 1; i++) {
                  if (!current[keys[i]]) current[keys[i]] = {};
                  current = current[keys[i]];
              }
              const lastKey = keys[keys.length - 1];
              const val = (['height', 'weight', 'siblingCount', 'childOrder'].includes(lastKey) || request.fieldKey.includes('circumference')) ? Number(request.proposedValue) : request.proposedValue;
              current[lastKey] = val;

              // Synchronize local formData immediately for seamless UI
              const newFormData = { ...formData };
              let currentForm: any = newFormData;
              for (let i = 0; i < keys.length - 1; i++) {
                  if (!currentForm[keys[i]]) currentForm[keys[i]] = {};
                  currentForm = currentForm[keys[i]];
              }
              currentForm[keys[keys.length - 1]] = val;
              setFormData(newFormData);
          }

          await api.updateStudent(updatedStudent);
          onUpdate();
          alert(`Berhasil ${status === 'APPROVED' ? 'menyetujui' : 'menolak'} perubahan.`);
      } catch (e) { 
          alert("Gagal memproses perubahan data."); 
      } finally { 
          setProcessingReqId(null); 
      }
  };

  const handleProcess = async (status: 'APPROVED' | 'REVISION' | 'SAVE_ONLY') => {
      if (!currentStudent) return;
      if (status === 'REVISION' && !adminNote.trim()) { alert("Mohon isi catatan revisi."); return; }
      setIsProcessing(true);
      try {
          const updatedStudent = {
              ...currentStudent, ...formData,
              dapodik: { ...currentStudent.dapodik, ...formData.dapodik },
              father: { ...currentStudent.father, ...formData.father },
              mother: { ...currentStudent.mother, ...formData.mother },
              guardian: { ...currentStudent.guardian, ...formData.guardian }
          };
          if (status !== 'SAVE_ONLY' && currentDoc) {
              updatedStudent.documents = updatedStudent.documents.map((d: any) => d.id === currentDoc.id ? { ...d, status, adminNote, verifierName: currentUser.name, verificationDate: new Date().toISOString() } : d);
          }
          await api.updateStudent(updatedStudent);
          onUpdate();
          if (status !== 'SAVE_ONLY') { 
              setAdminNote(''); 
              const next = updatedStudent.documents.find((d: any) => d.status === 'PENDING' && allowedCategories.includes(d.category)); 
              if (next) setSelectedDocId(next.id); 
          }
          else alert("Data berhasil disimpan.");
      } catch (e) { 
          alert("Gagal memproses data."); 
      } finally { 
          setIsProcessing(false); 
      }
  };

  const RenderInput = ({ label, value, fieldKey, type = 'text', section }: { label: string, value: any, fieldKey: string, type?: string, section: string }) => {
      const pending = currentStudent?.correctionRequests?.find(r => r.fieldKey === fieldKey && r.status === 'PENDING');
      const isDate = type === 'date';
      const isProcessingThis = pending && processingReqId === pending.id;
      
      return (
          <div className="space-y-1 group">
              <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{label}</label>
                  {pending && <span className="text-[8px] bg-yellow-400 text-yellow-900 px-1 rounded font-black animate-pulse">USULAN PERUBAHAN</span>}
              </div>
              <div className="relative">
                  <input 
                      type={isDate ? 'date' : 'text'}
                      className={`w-full p-2 border rounded text-xs transition-all ${pending ? 'border-yellow-400 bg-yellow-50 pr-8' : 'border-gray-200 focus:border-blue-500'}`}
                      value={value || ''}
                      onChange={(e) => {
                          const keys = fieldKey.split('.');
                          const newForm = { ...formData };
                          let curr: any = newForm;
                          for (let i = 0; i < keys.length - 1; i++) { if (!curr[keys[i]]) curr[keys[i]] = {}; curr = curr[keys[i]]; }
                          curr[keys[keys.length - 1]] = e.target.value;
                          setFormData(newForm);
                      }}
                  />
                  {pending && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 group-hover:block hidden z-30">
                          <div className="bg-white border border-yellow-300 p-3 rounded-lg shadow-xl text-[10px] w-56 animate-fade-in ring-1 ring-black/5">
                              <p className="font-black text-yellow-800 uppercase text-[9px] mb-1">Usulan Siswa:</p>
                              <p className="text-blue-700 font-bold text-sm bg-blue-50 px-2 py-1 rounded border border-blue-100 mb-2 truncate">
                                {isDate ? new Date(pending.proposedValue).toLocaleDateString('id-ID') : pending.proposedValue}
                              </p>
                              <p className="italic text-gray-600 leading-tight mb-3">"{pending.studentReason}"</p>
                              <div className="flex gap-1.5 pt-2 border-t border-gray-100">
                                  <button 
                                    onClick={(e) => handleDataCorrection(e, pending, 'APPROVED')} 
                                    disabled={!!processingReqId}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1.5 rounded font-bold transition-colors flex items-center justify-center gap-1"
                                  >
                                      {isProcessingThis ? <Loader2 className="w-3 h-3 animate-spin"/> : <Check className="w-3 h-3" />} Terima
                                  </button>
                                  <button 
                                    onClick={(e) => handleDataCorrection(e, pending, 'REJECTED')} 
                                    disabled={!!processingReqId}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-1.5 rounded font-bold transition-colors flex items-center justify-center gap-1"
                                  >
                                      {isProcessingThis ? <Loader2 className="w-3 h-3 animate-spin"/> : <X className="w-3 h-3" />} Tolak
                                  </button>
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
            <div className="flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-gray-800">Verifikasi Buku Induk</h2>
            </div>
            <div className="flex gap-3">
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                        {uniqueClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 md:w-64">
                    <Search className="w-4 h-4 text-gray-500" />
                    <select className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer w-full" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                        {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                    </select>
                </div>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 bg-gray-900 relative flex flex-col overflow-hidden">
                {currentDoc ? (
                    <>
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-black/50 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-lg">
                            <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.2))} className="p-2 text-white hover:bg-white/20 rounded-full"><ZoomOut className="w-4 h-4" /></button>
                            <span className="text-white text-xs font-mono font-bold flex items-center px-2">{Math.round(zoomLevel * 100)}%</span>
                            <button onClick={() => setZoomLevel(z => Math.min(3, z + 0.2))} className="p-2 text-white hover:bg-white/20 rounded-full"><ZoomIn className="w-4 h-4" /></button>
                            <div className="w-px h-4 bg-white/20 my-auto mx-1"></div>
                            <button onClick={() => setRotation(r => r + 90)} className="p-2 text-white hover:bg-white/20 rounded-full"><RotateCw className="w-4 h-4" /></button>
                            <button onClick={() => setUseFallbackViewer(v => !v)} className="px-3 py-1 text-[10px] font-bold text-white hover:bg-white/20 rounded-full border border-white/20 ml-1">{useFallbackViewer ? 'Mode Default' : 'Mode Alt'}</button>
                        </div>
                        <div className="flex-1 overflow-auto flex items-center justify-center p-8">
                            <div style={{ transform: `scale(${useFallbackViewer ? 1 : zoomLevel}) rotate(${rotation}deg)`, transformOrigin: 'center center' }} className="relative shadow-2xl transition-transform duration-200">
                                {(useFallbackViewer || (currentDoc.url.includes('drive.google.com') && !currentDoc.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/))) ? (
                                    <iframe src={getDriveUrl(currentDoc.url, 'preview')} className="w-[800px] h-[1100px] bg-white rounded" title="Viewer" />
                                ) : (
                                    <img src={getDriveUrl(currentDoc.url, 'direct')} className="max-w-none h-auto object-contain bg-white rounded" style={{ maxHeight: '85vh', minWidth: '400px' }} alt="Doc" onError={() => setUseFallbackViewer(true)} />
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <FileText className="w-16 h-16 mb-4 opacity-20" />
                        <p>Dokumen tidak tersedia.</p>
                    </div>
                )}
            </div>

            <div className="w-[480px] bg-white border-l border-gray-200 flex flex-col shadow-xl z-10">
                <div className="bg-gray-50 border-b border-gray-200">
                    <div className="p-3 text-[10px] font-bold text-gray-500 uppercase flex justify-between">
                        <span>Navigasi Dokumen</span>
                        <span>{studentDocs.length} File</span>
                    </div>
                    <div className="flex gap-2 px-3 pb-3 overflow-x-auto no-scrollbar">
                        <button onClick={() => setActiveTab('ALL')} className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border ${activeTab === 'ALL' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}>SEMUA</button>
                        {allowedCategories.map(cat => (
                            <button key={cat} onClick={() => setActiveTab(cat)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border ${activeTab === cat ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}>{DOC_LABELS[cat] || cat}</button>
                        ))}
                    </div>
                    <div className="max-h-32 overflow-y-auto border-t border-gray-100">
                        {studentDocs.map(doc => (
                            <div key={doc.id} onClick={() => setSelectedDocId(doc.id)} className={`p-2 px-4 border-b border-gray-50 cursor-pointer hover:bg-white flex items-center justify-between ${selectedDocId === doc.id ? 'bg-white border-l-4 border-l-blue-600 shadow-inner' : ''}`}>
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className={`p-1 rounded ${doc.type === 'PDF' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>{doc.type === 'PDF' ? <FileText className="w-3 h-3" /> : <ScrollText className="w-3 h-3" />}</div>
                                    <span className={`text-[11px] font-bold truncate ${selectedDocId === doc.id ? 'text-blue-700' : 'text-gray-600'}`}>{DOC_LABELS[doc.category] || doc.category}</span>
                                </div>
                                {doc.status === 'APPROVED' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : doc.status === 'REVISION' ? <XCircle className="w-3.5 h-3.5 text-red-500" /> : <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-3 bg-blue-50 border-y border-blue-100 flex justify-between items-center">
                        <span className="text-xs font-black text-blue-800 uppercase flex items-center gap-2"><User className="w-3.5 h-3.5" /> Isian Buku Induk</span>
                        <button onClick={() => handleProcess('SAVE_ONLY')} disabled={isProcessing} className="text-blue-600 hover:text-blue-800 p-1 bg-white rounded shadow-sm border border-blue-200">
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                        <AccordionItem title="1. Identitas Utama" icon={User} isOpen={openSection === 'IDENTITY'} onToggle={() => setOpenSection(openSection === 'IDENTITY' ? '' : 'IDENTITY')}>
                            <div className="grid grid-cols-1 gap-4">
                                <RenderInput label="Nama Lengkap" value={formData.fullName} fieldKey="fullName" section="IDENTITY" />
                                <div className="grid grid-cols-2 gap-3">
                                    <RenderInput label="NIS" value={formData.nis} fieldKey="nis" section="IDENTITY" />
                                    <RenderInput label="NISN" value={formData.nisn} fieldKey="nisn" section="IDENTITY" />
                                </div>
                                <RenderInput label="NIK (Siswa)" value={formData.dapodik?.nik} fieldKey="dapodik.nik" section="IDENTITY" />
                                <div className="grid grid-cols-2 gap-3">
                                    <RenderInput label="Jenis Kelamin (L/P)" value={formData.gender} fieldKey="gender" section="IDENTITY" />
                                    <RenderInput label="Agama" value={formData.religion} fieldKey="religion" section="IDENTITY" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <RenderInput label="Tempat Lahir" value={formData.birthPlace} fieldKey="birthPlace" section="IDENTITY" />
                                    <RenderInput label="Tanggal Lahir" value={formData.birthDate} fieldKey="birthDate" type="date" section="IDENTITY" />
                                </div>
                                <RenderInput label="Kelas Saat Ini" value={formData.className} fieldKey="className" section="IDENTITY" />
                                <RenderInput label="Status Siswa" value={formData.status} fieldKey="status" section="IDENTITY" />
                                <RenderInput label="Kewarganegaraan" value={formData.nationality} fieldKey="nationality" section="IDENTITY" />
                                <RenderInput label="Berkebutuhan Khusus" value={formData.dapodik?.specialNeeds} fieldKey="dapodik.specialNeeds" section="IDENTITY" />
                                <RenderInput label="Sekolah Asal" value={formData.previousSchool} fieldKey="previousSchool" section="IDENTITY" />
                            </div>
                        </AccordionItem>

                        <AccordionItem title="2. Alamat & Domisili" icon={MapPin} isOpen={openSection === 'ADDRESS'} onToggle={() => setOpenSection(openSection === 'ADDRESS' ? '' : 'ADDRESS')}>
                            <div className="grid grid-cols-1 gap-4">
                                <RenderInput label="Alamat Jalan" value={formData.address} fieldKey="address" section="ADDRESS" />
                                <div className="grid grid-cols-3 gap-2">
                                    <RenderInput label="RT" value={formData.dapodik?.rt} fieldKey="dapodik.rt" section="ADDRESS" />
                                    <RenderInput label="RW" value={formData.dapodik?.rw} fieldKey="dapodik.rw" section="ADDRESS" />
                                    <RenderInput label="Kode Pos" value={formData.postalCode} fieldKey="postalCode" section="ADDRESS" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <RenderInput label="Dusun" value={formData.dapodik?.dusun} fieldKey="dapodik.dusun" section="ADDRESS" />
                                    <RenderInput label="Kelurahan" value={formData.dapodik?.kelurahan} fieldKey="dapodik.kelurahan" section="ADDRESS" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <RenderInput label="Kecamatan" value={formData.subDistrict} fieldKey="subDistrict" section="ADDRESS" />
                                    <RenderInput label="Kabupaten" value={formData.district} fieldKey="district" section="ADDRESS" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <RenderInput label="Lintang" value={formData.dapodik?.latitude} fieldKey="dapodik.latitude" section="ADDRESS" />
                                    <RenderInput label="Bujur" value={formData.dapodik?.longitude} fieldKey="dapodik.longitude" section="ADDRESS" />
                                </div>
                                <RenderInput label="Jenis Tinggal" value={formData.dapodik?.livingStatus} fieldKey="dapodik.livingStatus" section="ADDRESS" />
                                <RenderInput label="Transportasi" value={formData.dapodik?.transportation} fieldKey="dapodik.transportation" section="ADDRESS" />
                                <RenderInput label="No. Kartu Keluarga" value={formData.dapodik?.noKK} fieldKey="dapodik.noKK" section="ADDRESS" />
                            </div>
                        </AccordionItem>

                        <AccordionItem title="3. Data Orang Tua" icon={Users} isOpen={openSection === 'PARENTS'} onToggle={() => setOpenSection(openSection === 'PARENTS' ? '' : 'PARENTS')}>
                            <div className="space-y-6">
                                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                                    <p className="text-[10px] font-black text-blue-800 mb-3 uppercase tracking-wider">Ayah Kandung</p>
                                    <div className="space-y-3">
                                        <RenderInput label="Nama Ayah" value={formData.father?.name} fieldKey="father.name" section="PARENTS" />
                                        <RenderInput label="NIK Ayah" value={formData.father?.nik} fieldKey="father.nik" section="PARENTS" />
                                        <RenderInput label="Tahun Lahir" value={formData.father?.birthPlaceDate} fieldKey="father.birthPlaceDate" section="PARENTS" />
                                        <RenderInput label="Pendidikan" value={formData.father?.education} fieldKey="father.education" section="PARENTS" />
                                        <RenderInput label="Pekerjaan" value={formData.father?.job} fieldKey="father.job" section="PARENTS" />
                                        <RenderInput label="Penghasilan" value={formData.father?.income} fieldKey="father.income" section="PARENTS" />
                                        <RenderInput label="No Handphone" value={formData.father?.phone} fieldKey="father.phone" section="PARENTS" />
                                    </div>
                                </div>
                                <div className="p-3 bg-pink-50/50 rounded-lg border border-pink-100">
                                    <p className="text-[10px] font-black text-pink-800 mb-3 uppercase tracking-wider">Ibu Kandung</p>
                                    <div className="space-y-3">
                                        <RenderInput label="Nama Ibu" value={formData.mother?.name} fieldKey="mother.name" section="PARENTS" />
                                        <RenderInput label="NIK Ibu" value={formData.mother?.nik} fieldKey="mother.nik" section="PARENTS" />
                                        <RenderInput label="Tahun Lahir" value={formData.mother?.birthPlaceDate} fieldKey="mother.birthPlaceDate" section="PARENTS" />
                                        <RenderInput label="Pendidikan" value={formData.mother?.education} fieldKey="mother.education" section="PARENTS" />
                                        <RenderInput label="Pekerjaan" value={formData.mother?.job} fieldKey="mother.job" section="PARENTS" />
                                        <RenderInput label="Penghasilan" value={formData.mother?.income} fieldKey="mother.income" section="PARENTS" />
                                    </div>
                                </div>
                            </div>
                        </AccordionItem>

                        <AccordionItem title="4. Data Periodik" icon={Heart} isOpen={openSection === 'PERIODIK'} onToggle={() => setOpenSection(openSection === 'PERIODIK' ? '' : 'PERIODIK')}>
                            <div className="grid grid-cols-2 gap-4">
                                <RenderInput label="Tinggi (cm)" value={formData.height} fieldKey="height" section="PERIODIK" />
                                <RenderInput label="Berat (kg)" value={formData.weight} fieldKey="weight" section="PERIODIK" />
                                <RenderInput label="Lingkar Kepala" value={formData.dapodik?.headCircumference} fieldKey="dapodik.headCircumference" section="PERIODIK" />
                                <RenderInput label="Golongan Darah" value={formData.bloodType} fieldKey="bloodType" section="PERIODIK" />
                                <RenderInput label="Jml Saudara" value={formData.siblingCount} fieldKey="siblingCount" section="PERIODIK" />
                                <RenderInput label="Anak Ke-" value={formData.childOrder} fieldKey="childOrder" section="PERIODIK" />
                                <RenderInput label="Jarak Sekolah" value={formData.dapodik?.distanceToSchool} fieldKey="dapodik.distanceToSchool" section="PERIODIK" />
                                <RenderInput label="Waktu Tempuh" value={formData.dapodik?.travelTimeMinutes} fieldKey="dapodik.travelTimeMinutes" section="PERIODIK" />
                            </div>
                        </AccordionItem>

                        <AccordionItem title="5. Kesejahteraan" icon={Wallet} isOpen={openSection === 'WELFARE'} onToggle={() => setOpenSection(openSection === 'WELFARE' ? '' : 'WELFARE')}>
                            <div className="space-y-4">
                                <RenderInput label="No. SKHUN" value={formData.dapodik?.skhun} fieldKey="dapodik.skhun" section="WELFARE" />
                                <RenderInput label="No. Peserta UN" value={formData.dapodik?.unExamNumber} fieldKey="dapodik.unExamNumber" section="WELFARE" />
                                <RenderInput label="No. Ijazah (SD)" value={formData.diplomaNumber} fieldKey="diplomaNumber" section="WELFARE" />
                                <RenderInput label="No. Reg Akta" value={formData.dapodik?.birthRegNumber} fieldKey="dapodik.birthRegNumber" section="WELFARE" />
                                <RenderInput label="No. KKS" value={formData.dapodik?.kksNumber} fieldKey="dapodik.kksNumber" section="WELFARE" />
                                <RenderInput label="Email Pribadi" value={formData.dapodik?.email} fieldKey="dapodik.email" section="WELFARE" />
                                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100 space-y-3">
                                    <p className="text-[10px] font-bold text-yellow-800 uppercase">Program PIP/KIP</p>
                                    <RenderInput label="Penerima KIP" value={formData.dapodik?.kipReceiver} fieldKey="dapodik.kipReceiver" section="WELFARE" />
                                    <RenderInput label="Nomor KIP" value={formData.dapodik?.kipNumber} fieldKey="dapodik.kipNumber" section="WELFARE" />
                                    <RenderInput label="Nama di KIP" value={formData.dapodik?.kipName} fieldKey="dapodik.kipName" section="WELFARE" />
                                </div>
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
                                    <p className="text-[10px] font-bold text-blue-800 uppercase">Rekening Bank (PIP)</p>
                                    <RenderInput label="Nama Bank" value={formData.dapodik?.bank} fieldKey="dapodik.bank" section="WELFARE" />
                                    <RenderInput label="Nomor Rekening" value={formData.dapodik?.bankAccount} fieldKey="dapodik.bankAccount" section="WELFARE" />
                                    <RenderInput label="Atas Nama" value={formData.dapodik?.bankAccountName} fieldKey="dapodik.bankAccountName" section="WELFARE" />
                                </div>
                            </div>
                        </AccordionItem>
                    </div>

                    {currentDoc && (
                        <div className="p-4 border-t border-gray-200 bg-gray-50 shadow-inner">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Catatan Dokumen</label>
                            <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Catatan untuk siswa jika ditolak..." value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handleProcess('REVISION')} disabled={isProcessing} className="py-2.5 bg-white border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 text-sm flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Tolak</button>
                                <button onClick={() => handleProcess('APPROVED')} disabled={isProcessing} className="py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 text-sm flex items-center justify-center gap-2 shadow-sm">{isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Valid & Simpan</button>
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