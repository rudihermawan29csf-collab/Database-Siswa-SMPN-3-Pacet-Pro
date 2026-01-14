import React, { useState, useEffect, useRef } from 'react';
import { Student } from '../types';
import { 
  CheckCircle2, Activity, MapPin, Users, Wallet, Loader2,
  ZoomIn, ZoomOut, Maximize2, Save, Pencil
} from 'lucide-react';
import { api } from '../services/api';

interface VerificationViewProps {
  students: Student[];
  targetStudentId?: string;
  onUpdate?: () => void;
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
  { id: 'FOTO', label: 'Pas Foto' },
];

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

const PDFPageCanvas = ({ pdf, pageNum, scale }: { pdf: any, pageNum: number, scale: number }) => {
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

const VerificationView: React.FC<VerificationViewProps> = ({ students, targetStudentId, onUpdate, currentUser }) => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [activeDocType, setActiveDocType] = useState<string>('IJAZAH');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); 
  const [layoutMode, setLayoutMode] = useState<'split' | 'full-doc'>('split');
  const [activeDataTab, setActiveDataTab] = useState<string>('DAPO_PRIBADI');
  const [isEditing, setIsEditing] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [isSaving, setIsSaving] = useState(false); 

  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [useFallbackViewer, setUseFallbackViewer] = useState(false);

  const uniqueClasses = Array.from(new Set(students.map(s => s.className))).sort();
  const studentsInClass = students.filter(s => s.className === selectedClass);
  const currentStudent = students.find(s => s.id === selectedStudentId);
  const currentDoc = currentStudent?.documents.find(d => d.category === activeDocType);

  useEffect(() => { if (uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0]); }, [uniqueClasses]);
  useEffect(() => { 
    if (targetStudentId) {
        const target = students.find(s => s.id === targetStudentId);
        if (target) { setSelectedClass(target.className); setSelectedStudentId(target.id); }
    } else if (studentsInClass.length > 0 && !selectedStudentId) { setSelectedStudentId(studentsInClass[0].id); }
  }, [targetStudentId, selectedClass, students]);

  useEffect(() => { setZoomLevel(1.0); setUseFallbackViewer(false); }, [selectedStudentId, activeDocType]);
  
  const handleDataChange = (path: string, value: string) => {
      if (!currentStudent) return;
      const keys = path.split('.');
      let current: any = currentStudent;
      for (let i = 0; i < keys.length - 1; i++) { if (!current[keys[i]]) current[keys[i]] = {}; current = current[keys[i]]; }
      current[keys[keys.length - 1]] = value;
      setForceUpdate(prev => prev + 1);
  };

  const FieldGroup = ({ label, value, path, fullWidth = false }: { label: string, value: string | number, path?: string, fullWidth?: boolean }) => (
    <div className={`mb-2 ${fullWidth ? 'w-full' : ''}`}>
      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">{label}</label>
      {isEditing && path ? ( <input type="text" className="w-full p-1.5 bg-white border border-blue-300 rounded text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none" value={value || ''} onChange={(e) => handleDataChange(path, e.target.value)} /> ) : ( <div className="p-1.5 bg-gray-50 border border-gray-200 rounded text-gray-900 text-xs font-medium break-words min-h-[30px] flex items-center"> {(value !== null && value !== undefined && value !== '') ? value : '-'} </div> )}
    </div>
  );

  const SectionHeader = ({ title }: { title: string }) => ( <div className="bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-700 uppercase border-y border-gray-200 mt-4 mb-2 first:mt-0">{title}</div> );

  useEffect(() => {
    const loadPdf = async () => {
        setPdfDoc(null); setIsPdfLoading(false); setUseFallbackViewer(false);
        if (!currentStudent || !currentDoc) return;
        if (currentDoc.url.includes('drive.google.com') || currentDoc.url.includes('docs.google.com')) { setUseFallbackViewer(true); return; }
        if (currentDoc.type === 'PDF' || currentDoc.name.toLowerCase().endsWith('.pdf')) {
            setIsPdfLoading(true);
            try {
                // @ts-ignore
                const pdfjsLib = await import('pdfjs-dist');
                const pdfjs = pdfjsLib.default ? pdfjsLib.default : pdfjsLib;
                if (!pdfjs.GlobalWorkerOptions.workerSrc) pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
                const response = await fetch(currentDoc.url);
                if (!response.ok) throw new Error("Network response was not ok");
                const arrayBuffer = await response.arrayBuffer();
                const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                setPdfDoc(pdf); setIsPdfLoading(false);
            } catch (error) { console.error(error); setUseFallbackViewer(true); setIsPdfLoading(false); }
        }
    };
    loadPdf();
  }, [currentStudent, activeDocType]);

  const handleApprove = async () => { 
      if (currentDoc && currentStudent) { 
          setIsSaving(true);
          currentDoc.status = 'APPROVED'; 
          currentDoc.adminNote = 'Dokumen valid.'; 
          currentDoc.verifierName = currentUser?.name || 'Admin';
          currentDoc.verifierRole = currentUser?.role || 'ADMIN';
          currentDoc.verificationDate = new Date().toISOString().split('T')[0];
          await api.updateStudent(currentStudent);
          setIsSaving(false);
          setForceUpdate(prev => prev + 1); 
          if (onUpdate) onUpdate(); 
      } 
  };
  
  const confirmReject = async () => { 
      if (currentDoc && currentStudent) { 
          if (!rejectionNote.trim()) { alert("Mohon isi alasan penolakan."); return; }
          setIsSaving(true);
          currentDoc.status = 'REVISION'; 
          currentDoc.adminNote = rejectionNote; 
          currentDoc.verifierName = currentUser?.name || 'Admin';
          currentDoc.verifierRole = currentUser?.role || 'ADMIN';
          currentDoc.verificationDate = new Date().toISOString().split('T')[0];
          await api.updateStudent(currentStudent);
          setIsSaving(false);
          setRejectModalOpen(false); 
          setForceUpdate(prev => prev + 1); 
          if (onUpdate) onUpdate(); 
      } 
  };

  const renderDataTab = () => {
    if (!currentStudent) return null;
    switch (activeDataTab) {
      case 'DAPO_PRIBADI':
        return (
          <>
            <SectionHeader title="Identitas Peserta Didik" />
            <FieldGroup label="Nama Lengkap" value={currentStudent.fullName} path="fullName" fullWidth />
            <div className="grid grid-cols-2 gap-2">
                <FieldGroup label="NISN" value={currentStudent.nisn} path="nisn" />
                <FieldGroup label="NIK" value={currentStudent.dapodik.nik} path="dapodik.nik" />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <FieldGroup label="Tempat Lahir" value={currentStudent.birthPlace} path="birthPlace" />
                <FieldGroup label="Tanggal Lahir" value={currentStudent.birthDate} path="birthDate" />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <FieldGroup label="Jenis Kelamin" value={currentStudent.gender} path="gender" />
                <FieldGroup label="Agama" value={currentStudent.religion} path="religion" />
            </div>
            <FieldGroup label="Anak Ke" value={currentStudent.childOrder} path="childOrder" />
            <FieldGroup label="Jml Saudara" value={currentStudent.siblingCount} path="siblingCount" />
          </>
        );
      case 'DAPO_ALAMAT':
        return (
          <>
            <SectionHeader title="Alamat Domisili" />
            <FieldGroup label="Alamat Jalan" value={currentStudent.address} path="address" fullWidth />
            <div className="grid grid-cols-2 gap-2">
                <FieldGroup label="RT" value={currentStudent.dapodik.rt} path="dapodik.rt" />
                <FieldGroup label="RW" value={currentStudent.dapodik.rw} path="dapodik.rw" />
            </div>
            <FieldGroup label="Dusun" value={currentStudent.dapodik.dusun} path="dapodik.dusun" />
            <FieldGroup label="Kelurahan" value={currentStudent.dapodik.kelurahan} path="dapodik.kelurahan" />
            <FieldGroup label="Kecamatan" value={currentStudent.subDistrict} path="subDistrict" />
            <FieldGroup label="Jarak Sekolah" value={currentStudent.dapodik.distanceToSchool} path="dapodik.distanceToSchool" />
            <FieldGroup label="Transportasi" value={currentStudent.dapodik.transportation} path="dapodik.transportation" />
          </>
        );
      case 'DAPO_ORTU':
        return (
          <>
            <SectionHeader title="Data Ayah" />
            <FieldGroup label="Nama Ayah" value={currentStudent.father.name} path="father.name" fullWidth />
            <FieldGroup label="NIK Ayah" value={currentStudent.father.nik} path="father.nik" />
            <FieldGroup label="Tahun Lahir" value={currentStudent.father.birthPlaceDate} path="father.birthPlaceDate" />
            <FieldGroup label="Pekerjaan" value={currentStudent.father.job} path="father.job" />
            <FieldGroup label="Pendidikan" value={currentStudent.father.education} path="father.education" />
            <FieldGroup label="Penghasilan" value={currentStudent.father.income} path="father.income" />
            
            <SectionHeader title="Data Ibu" />
            <FieldGroup label="Nama Ibu" value={currentStudent.mother.name} path="mother.name" fullWidth />
            <FieldGroup label="NIK Ibu" value={currentStudent.mother.nik} path="mother.nik" />
            <FieldGroup label="Tahun Lahir" value={currentStudent.mother.birthPlaceDate} path="mother.birthPlaceDate" />
            <FieldGroup label="Pekerjaan" value={currentStudent.mother.job} path="mother.job" />
            <FieldGroup label="Pendidikan" value={currentStudent.mother.education} path="mother.education" />
            <FieldGroup label="Penghasilan" value={currentStudent.mother.income} path="mother.income" />

            <SectionHeader title="Data Wali (Jika Ada)" />
            <FieldGroup label="Nama Wali" value={currentStudent.guardian?.name || '-'} path="guardian.name" fullWidth />
            <FieldGroup label="Pekerjaan" value={currentStudent.guardian?.job || '-'} path="guardian.job" />
          </>
        );
      case 'DAPO_PERIODIK':
        return (
            <>
                <SectionHeader title="Data Periodik" />
                <div className="grid grid-cols-2 gap-2">
                    <FieldGroup label="Tinggi Badan (cm)" value={currentStudent.height} path="height" />
                    <FieldGroup label="Berat Badan (kg)" value={currentStudent.weight} path="weight" />
                </div>
                <FieldGroup label="Lingkar Kepala" value={currentStudent.dapodik.headCircumference} path="dapodik.headCircumference" />
                <FieldGroup label="Waktu Tempuh (Menit)" value={currentStudent.dapodik.travelTimeMinutes} path="dapodik.travelTimeMinutes" />
            </>
        );
      case 'DAPO_KIP':
        return (
          <>
            <SectionHeader title="Kesejahteraan" />
            <FieldGroup label="Penerima KIP" value={currentStudent.dapodik.kipReceiver} path="dapodik.kipReceiver" />
            <FieldGroup label="Nomor KIP" value={currentStudent.dapodik.kipNumber} path="dapodik.kipNumber" fullWidth />
            <FieldGroup label="Nama di KIP" value={currentStudent.dapodik.kipName} path="dapodik.kipName" fullWidth />
            <FieldGroup label="Nomor KKS" value={currentStudent.dapodik.kksNumber} path="dapodik.kksNumber" fullWidth />
            <FieldGroup label="Penerima KPS" value={currentStudent.dapodik.kpsReceiver} path="dapodik.kpsReceiver" />
            <FieldGroup label="Nomor KPS" value={currentStudent.dapodik.kpsNumber} path="dapodik.kpsNumber" fullWidth />
          </>
        );
      default:
        return null;
    }
  };

  const isDriveUrl = currentDoc && (currentDoc.url.includes('drive.google.com') || currentDoc.url.includes('docs.google.com'));

  return (
    <div className="flex flex-col h-full animate-fade-in relative">
        {rejectModalOpen && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col">
                    <h3 className="font-bold text-red-600 mb-2">Tolak Dokumen</h3>
                    <p className="text-xs text-gray-500 mb-3">Berikan alasan mengapa dokumen ini ditolak.</p>
                    <textarea 
                        className="w-full p-3 border border-gray-300 rounded-lg text-sm mb-4 focus:ring-2 focus:ring-red-500 outline-none" 
                        rows={3} 
                        value={rejectionNote} 
                        onChange={e => setRejectionNote(e.target.value)} 
                        placeholder="Contoh: Dokumen buram, Salah upload..."
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <button onClick={()=>setRejectModalOpen(false)} disabled={isSaving} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold text-xs hover:bg-gray-200">Batal</button>
                        <button onClick={confirmReject} disabled={isSaving} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 flex items-center">
                            {isSaving && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                            Simpan Penolakan
                        </button>
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
            const doc = currentStudent?.documents.find(d => d.category === type.id);
            const color = doc?.status === 'APPROVED' ? 'text-green-600 bg-green-50 border-green-200' : doc?.status === 'REVISION' ? 'text-red-600 bg-red-50 border-red-200' : doc?.status === 'PENDING' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' : 'text-gray-400 border-transparent';
            return <button key={type.id} onClick={() => setActiveDocType(type.id)} className={`px-3 py-1.5 rounded-md text-xs font-bold border ${activeDocType === type.id ? 'ring-2 ring-blue-500' : ''} ${color}`}>{type.label}</button>;
        })}</div>
      </div>

      {currentStudent ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden relative">
            <div className={`bg-white rounded-xl border border-gray-200 flex flex-col shadow-sm transition-all duration-300 ${layoutMode === 'full-doc' ? 'hidden' : 'w-full lg:w-96'}`}>
                <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-600" /> Data Buku Induk</h3>
                    <button onClick={async () => {
                        if (isEditing) {
                            setIsSaving(true);
                            await api.updateStudent(currentStudent);
                            setIsSaving(false);
                            if(onUpdate) onUpdate();
                        }
                        setIsEditing(!isEditing);
                    }} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-colors ${isEditing ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'}`}>{isEditing ? <><Save className="w-3 h-3" /> Selesai</> : <><Pencil className="w-3 h-3" /> Edit Data</>}</button>
                </div>
                <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar">
                    {['DAPO_PRIBADI', 'DAPO_ALAMAT', 'DAPO_ORTU', 'DAPO_PERIODIK', 'DAPO_KIP'].map(id => (<button key={id} onClick={()=>setActiveDataTab(id)} className={`px-3 py-2 text-[10px] font-bold border-b-2 whitespace-nowrap ${activeDataTab === id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400'}`}>{id.replace('DAPO_', '')}</button>))}
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 pb-32"><div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">{renderDataTab()}</div>{currentDoc?.adminNote && <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded text-xs italic text-yellow-700">"Note: {currentDoc.adminNote}"</div>}</div>
                
                {/* BUTTONS VISIBLE FOR ADMIN/GURU */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-2">
                    <button onClick={() => { setRejectionNote(''); setRejectModalOpen(true); }} disabled={!currentDoc || isSaving} className="flex-1 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-red-50">Tolak</button>
                    <button onClick={handleApprove} disabled={!currentDoc || isSaving} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-green-700 flex items-center justify-center">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Setujui'}
                    </button>
                </div>
            </div>
            
            <div className={`flex flex-col bg-gray-800 rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${layoutMode === 'full-doc' ? 'w-full absolute inset-0 z-20' : 'flex-1 h-full'}`}>
                 <div className="h-12 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4 text-gray-300">
                     <span className="text-sm font-bold text-white">{currentDoc ? currentDoc.name : 'No Doc'}</span>
                     <div className="flex items-center gap-2"><button onClick={()=>setZoomLevel(z=>z-0.2)} className="p-1 hover:bg-gray-700 rounded"><ZoomOut className="w-4 h-4" /></button><span className="text-xs">{Math.round(zoomLevel*100)}%</span><button onClick={()=>setZoomLevel(z=>z+0.2)} className="p-1 hover:bg-gray-700 rounded"><ZoomIn className="w-4 h-4" /></button><button onClick={()=>setLayoutMode(m=>m==='full-doc'?'split':'full-doc')} className="p-1 hover:bg-gray-700 rounded ml-2"><Maximize2 className="w-4 h-4" /></button></div>
                 </div>
                 <div className="flex-1 overflow-auto p-8 bg-gray-900/50 flex items-start justify-center pb-32">
                     {currentDoc ? (
                         <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}>
                             {(useFallbackViewer || isDriveUrl) ? (
                                 <iframe src={getDriveUrl(currentDoc.url, 'preview')} className="w-full h-[800px] border-none rounded bg-white" title="Viewer" />
                             ) : (
                                 currentDoc.type === 'IMAGE' ? <img src={currentDoc.url} className="max-w-full h-auto rounded shadow-sm" alt="Doc" /> : 
                                 <div className="bg-white min-h-[600px] w-full max-w-[800px] flex items-center justify-center relative">{isPdfLoading ? <Loader2 className="animate-spin w-10 h-10 text-blue-500" /> : (pdfDoc ? <PDFPageCanvas pdf={pdfDoc} pageNum={1} scale={1.0} /> : <div className="text-red-500">PDF</div>)}</div>
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