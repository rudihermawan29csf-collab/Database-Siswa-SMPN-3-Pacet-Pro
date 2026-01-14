import React, { useState, useEffect, useRef } from 'react';
import { Student } from '../types';
import { 
  CheckCircle2, XCircle, FileText, ChevronDown, Maximize2, AlertCircle, 
  User, Activity, BookOpen, MapPin, Users, Wallet, ExternalLink, Loader2,
  ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, Minimize2, GripVertical, X, Save, Pencil
} from 'lucide-react';

interface VerificationViewProps {
  students: Student[];
  targetStudentId?: string;
  onUpdate?: () => void;
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
const PDFPageCanvas = ({ pdf, pageNum, scale }: { pdf: any, pageNum: number, scale: number }) => {
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

    return <canvas ref={canvasRef} className="shadow-lg bg-white" />;
};

const VerificationView: React.FC<VerificationViewProps> = ({ students, targetStudentId, onUpdate }) => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [activeDocType, setActiveDocType] = useState<string>('IJAZAH');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); 
  const [layoutMode, setLayoutMode] = useState<'split' | 'full-doc' | 'full-data'>('split');
  const [activeDataTab, setActiveDataTab] = useState<string>('DAPO_PRIBADI');

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);

  // Logic States
  const [forceUpdate, setForceUpdate] = useState(0);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');

  // PDF States
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
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

  useEffect(() => {
      setZoomLevel(1.0);
      setUseFallbackViewer(false);
  }, [selectedStudentId, activeDocType]);
  
  // Helper to update student data (mock)
  const handleDataChange = (path: string, value: string) => {
      if (!currentStudent) return;
      const keys = path.split('.');
      let current: any = currentStudent;
      for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {};
          current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      setForceUpdate(prev => prev + 1);
  };

  const FieldGroup = ({ label, value, path, fullWidth = false }: { label: string, value: string | number, path?: string, fullWidth?: boolean }) => (
    <div className={`mb-2 ${fullWidth ? 'w-full' : ''}`}>
      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">{label}</label>
      {isEditing && path ? (
          <input 
            type="text" 
            className="w-full p-1.5 bg-white border border-blue-300 rounded text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            value={value || ''}
            onChange={(e) => handleDataChange(path, e.target.value)}
          />
      ) : (
          <div className="p-1.5 bg-gray-50 border border-gray-200 rounded text-gray-900 text-xs font-medium break-words min-h-[30px] flex items-center">
            {(value !== null && value !== undefined && value !== '') ? value : '-'}
          </div>
      )}
    </div>
  );

  const SectionHeader = ({ title }: { title: string }) => (
      <div className="bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-700 uppercase border-y border-gray-200 mt-4 mb-2 first:mt-0">{title}</div>
  );

  useEffect(() => {
    const loadPdf = async () => {
        setPdfDoc(null);
        setIsPdfLoading(false);
        setPdfError(false);
        setUseFallbackViewer(false);

        if (!currentStudent || !currentDoc) return;

        // Check if it's a Drive URL - if so, we skip PDF.js and use iframe for EVERYTHING (Images & PDFs)
        if (currentDoc.url.includes('drive.google.com') || currentDoc.url.includes('docs.google.com')) {
            setUseFallbackViewer(true);
            return;
        }

        // Only try PDF.js if it is a local/direct PDF and NOT a Drive link
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
                if (!response.ok) throw new Error("Network response was not ok");
                const arrayBuffer = await response.arrayBuffer();

                const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                setPdfDoc(pdf); setNumPages(pdf.numPages); setIsPdfLoading(false);
            } catch (error) { 
                console.error("Error loading PDF, trying fallback:", error);
                setUseFallbackViewer(true);
                setIsPdfLoading(false); 
            }
        }
    };
    loadPdf();
  }, [currentStudent, activeDocType]);

  const handleApprove = () => { if (currentDoc) { currentDoc.status = 'APPROVED'; currentDoc.adminNote = 'Dokumen valid.'; setForceUpdate(prev => prev + 1); if (onUpdate) onUpdate(); } };
  const confirmReject = () => { if (currentDoc) { currentDoc.status = 'REVISION'; currentDoc.adminNote = rejectionNote; setRejectModalOpen(false); setForceUpdate(prev => prev + 1); if (onUpdate) onUpdate(); } };

  // --- RENDER TABS (SYNCED WITH BUKU INDUK) ---
  const renderDataTab = () => {
      if (!currentStudent) return null;
      switch(activeDataTab) {
          case 'DAPO_PRIBADI': return (
              <div className="space-y-1">
                  <SectionHeader title="Identitas Peserta Didik" />
                  <FieldGroup label="1. Nama Lengkap" value={currentStudent.fullName} path="fullName" fullWidth />
                  <div className="grid grid-cols-2 gap-2">
                      <FieldGroup label="2. Jenis Kelamin" value={currentStudent.gender === 'L' ? 'Laki-Laki' : 'Perempuan'} path="gender" />
                      <FieldGroup label="3. NISN" value={currentStudent.nisn} path="nisn" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      <FieldGroup label="NIS" value={currentStudent.nis} path="nis" />
                      <FieldGroup label="7. NIK" value={currentStudent.dapodik.nik} path="dapodik.nik" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      <FieldGroup label="8. Tempat Lahir" value={currentStudent.birthPlace} path="birthPlace" />
                      <FieldGroup label="Tgl Lahir" value={currentStudent.birthDate} path="birthDate" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      <FieldGroup label="9. Agama" value={currentStudent.religion} path="religion" />
                      <FieldGroup label="10. ABK" value={currentStudent.dapodik.specialNeeds} path="dapodik.specialNeeds" />
                  </div>
                  
                  <SectionHeader title="Data Akademik & Registrasi" />
                  <FieldGroup label="4. No Seri Ijazah" value={currentStudent.diplomaNumber} path="diplomaNumber" fullWidth />
                  <FieldGroup label="5. No Seri SKHUN" value={currentStudent.dapodik.skhun} path="dapodik.skhun" fullWidth />
                  <FieldGroup label="6. No Peserta UN" value={currentStudent.dapodik.unExamNumber} path="dapodik.unExamNumber" fullWidth />
                  <FieldGroup label="Sekolah Asal" value={currentStudent.previousSchool} path="previousSchool" fullWidth />
                  <FieldGroup label="No Reg Akta Lahir" value={currentStudent.dapodik.birthRegNumber} path="dapodik.birthRegNumber" fullWidth />
              </div>
          );
          case 'DAPO_ALAMAT': return (
              <div className="space-y-1">
                  <SectionHeader title="11. Alamat Tempat Tinggal" />
                  <FieldGroup label="Alamat Jalan" value={currentStudent.address} path="address" fullWidth />
                  <div className="grid grid-cols-2 gap-2">
                    <FieldGroup label="RT" value={currentStudent.dapodik.rt} path="dapodik.rt" />
                    <FieldGroup label="RW" value={currentStudent.dapodik.rw} path="dapodik.rw" />
                  </div>
                  <FieldGroup label="Dusun" value={currentStudent.dapodik.dusun} path="dapodik.dusun" />
                  <div className="grid grid-cols-2 gap-2">
                    <FieldGroup label="Kelurahan/Desa" value={currentStudent.dapodik.kelurahan} path="dapodik.kelurahan" />
                    <FieldGroup label="Kecamatan" value={currentStudent.subDistrict} path="subDistrict" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FieldGroup label="Kabupaten" value={currentStudent.district} path="district" />
                    <FieldGroup label="Kode Pos" value={currentStudent.postalCode} path="postalCode" />
                  </div>
                  <FieldGroup label="Lintang / Bujur" value={`${currentStudent.dapodik.latitude} / ${currentStudent.dapodik.longitude}`} path="dapodik.latitude" fullWidth />
                  
                  <SectionHeader title="Kontak & Lainnya" />
                  <div className="grid grid-cols-2 gap-2">
                    <FieldGroup label="12. Transportasi" value={currentStudent.dapodik.transportation} path="dapodik.transportation" />
                    <FieldGroup label="13. Jenis Tinggal" value={currentStudent.dapodik.livingStatus} path="dapodik.livingStatus" />
                  </div>
                  <FieldGroup label="14. No HP" value={currentStudent.father.phone || currentStudent.mother.phone} path="father.phone" fullWidth />
                  <FieldGroup label="15. Email" value={currentStudent.dapodik.email} path="dapodik.email" fullWidth />
              </div>
          );
          case 'DAPO_ORTU': return (
              <div className="space-y-1">
                  <SectionHeader title="18. Data Ayah Kandung" />
                  <FieldGroup label="Nama Ayah" value={currentStudent.father.name} path="father.name" fullWidth />
                  <div className="grid grid-cols-2 gap-2">
                    <FieldGroup label="NIK Ayah" value={currentStudent.father.nik} path="father.nik" />
                    <FieldGroup label="Tahun Lahir" value={currentStudent.father.birthPlaceDate} path="father.birthPlaceDate" />
                  </div>
                  <FieldGroup label="Pendidikan" value={currentStudent.father.education} path="father.education" fullWidth />
                  <FieldGroup label="Pekerjaan" value={currentStudent.father.job} path="father.job" fullWidth />
                  <FieldGroup label="Penghasilan" value={currentStudent.father.income} path="father.income" fullWidth />

                  <SectionHeader title="19. Data Ibu Kandung" />
                  <FieldGroup label="Nama Ibu" value={currentStudent.mother.name} path="mother.name" fullWidth />
                  <div className="grid grid-cols-2 gap-2">
                    <FieldGroup label="NIK Ibu" value={currentStudent.mother.nik} path="mother.nik" />
                    <FieldGroup label="Tahun Lahir" value={currentStudent.mother.birthPlaceDate} path="mother.birthPlaceDate" />
                  </div>
                  <FieldGroup label="Pendidikan" value={currentStudent.mother.education} path="mother.education" fullWidth />
                  <FieldGroup label="Pekerjaan" value={currentStudent.mother.job} path="mother.job" fullWidth />
                  <FieldGroup label="Penghasilan" value={currentStudent.mother.income} path="mother.income" fullWidth />
                  
                  <SectionHeader title="20. Data Wali" />
                  <FieldGroup label="Nama Wali" value={currentStudent.guardian?.name} path="guardian.name" fullWidth />
                  <div className="grid grid-cols-2 gap-2">
                    <FieldGroup label="Tahun Lahir" value={currentStudent.guardian?.birthPlaceDate} path="guardian.birthPlaceDate" />
                    <FieldGroup label="Pekerjaan" value={currentStudent.guardian?.job} path="guardian.job" />
                  </div>
              </div>
          );
           case 'DAPO_KIP': return (
              <div className="space-y-1">
                  <SectionHeader title="Kesejahteraan" />
                  <FieldGroup label="16. No KKS" value={currentStudent.dapodik.kksNumber} path="dapodik.kksNumber" fullWidth />
                  <div className="grid grid-cols-2 gap-2">
                    <FieldGroup label="17. Penerima KPS" value={currentStudent.dapodik.kpsReceiver} path="dapodik.kpsReceiver" />
                    <FieldGroup label="No KPS" value={currentStudent.dapodik.kpsNumber} path="dapodik.kpsNumber" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FieldGroup label="Usulan PIP" value={currentStudent.dapodik.pipEligible} path="dapodik.pipEligible" />
                    <FieldGroup label="Alasan PIP" value={currentStudent.dapodik.pipReason} path="dapodik.pipReason" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FieldGroup label="Penerima KIP" value={currentStudent.dapodik.kipReceiver} path="dapodik.kipReceiver" />
                    <FieldGroup label="No KIP" value={currentStudent.dapodik.kipNumber} path="dapodik.kipNumber" />
                  </div>
                  <FieldGroup label="Nama di KIP" value={currentStudent.dapodik.kipName} path="dapodik.kipName" fullWidth />
                  
                  <SectionHeader title="Data Periodik" />
                  <div className="grid grid-cols-2 gap-2">
                    <FieldGroup label="21. Tinggi (cm)" value={currentStudent.height} path="height" />
                    <FieldGroup label="Berat (kg)" value={currentStudent.weight} path="weight" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FieldGroup label="22. Jarak (km)" value={currentStudent.dapodik.distanceToSchool} path="dapodik.distanceToSchool" />
                    <FieldGroup label="23. Waktu Tempuh" value={currentStudent.dapodik.travelTimeMinutes} path="dapodik.travelTimeMinutes" />
                  </div>
                  <FieldGroup label="24. Jml Sdr Kandung" value={currentStudent.siblingCount} path="siblingCount" fullWidth />
              </div>
          );
          default: return null;
      }
  };

  const isDriveUrl = currentDoc && (currentDoc.url.includes('drive.google.com') || currentDoc.url.includes('docs.google.com'));

  return (
    <div className="flex flex-col h-full animate-fade-in relative">
        {/* REJECT MODAL */}
        {rejectModalOpen && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col">
                    <h3 className="font-bold text-red-600 mb-2">Tolak Dokumen</h3>
                    <textarea className="w-full p-2 border rounded text-sm mb-4" rows={3} value={rejectionNote} onChange={e => setRejectionNote(e.target.value)} placeholder="Alasan..." />
                    <div className="flex justify-end gap-2"><button onClick={()=>setRejectModalOpen(false)} className="px-3 py-1 bg-gray-100 rounded">Batal</button><button onClick={confirmReject} className="px-3 py-1 bg-red-600 text-white rounded">Simpan</button></div>
                </div>
            </div>
        )}

      {/* Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
        <div className="flex gap-3 w-full lg:w-auto">
             <select className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>{uniqueClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)}</select>
             <select className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium w-64" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>{studentsInClass.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}</select>
        </div>
        <div className="flex overflow-x-auto gap-1">{DOCUMENT_TYPES.map(type => {
            const doc = currentStudent?.documents.find(d => d.category === type.id);
            const color = doc?.status === 'APPROVED' ? 'text-green-600 bg-green-50' : doc?.status === 'REVISION' ? 'text-red-600 bg-red-50' : doc?.status === 'PENDING' ? 'text-yellow-600 bg-yellow-50' : 'text-gray-400';
            return <button key={type.id} onClick={() => setActiveDocType(type.id)} className={`px-3 py-1.5 rounded-md text-xs font-bold border ${activeDocType === type.id ? 'border-blue-500' : 'border-transparent'} ${color}`}>{type.label}</button>;
        })}</div>
      </div>

      {currentStudent ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden relative">
            {/* DATA PANE */}
            <div className={`bg-white rounded-xl border border-gray-200 flex flex-col shadow-sm transition-all duration-300 ${layoutMode === 'full-doc' ? 'hidden' : 'w-full lg:w-96'}`}>
                <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-600" /> Data Buku Induk</h3>
                    <button 
                        onClick={() => setIsEditing(!isEditing)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-colors ${isEditing ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'}`}
                    >
                        {isEditing ? <><Save className="w-3 h-3" /> Selesai</> : <><Pencil className="w-3 h-3" /> Edit Data</>}
                    </button>
                </div>
                <div className="flex border-b border-gray-200">{['DAPO_PRIBADI', 'DAPO_ALAMAT', 'DAPO_ORTU', 'DAPO_KIP'].map(id => (
                    <button key={id} onClick={()=>setActiveDataTab(id)} className={`flex-1 py-2 text-[10px] font-bold border-b-2 ${activeDataTab === id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400'}`}>{id.replace('DAPO_', '')}</button>
                ))}</div>
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">{renderDataTab()}</div>
                    {currentDoc?.adminNote && <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded text-xs italic text-yellow-700">"Note: {currentDoc.adminNote}"</div>}
                </div>
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-2">
                    <button onClick={() => { setRejectionNote(''); setRejectModalOpen(true); }} disabled={!currentDoc} className="flex-1 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold disabled:opacity-50">Tolak</button>
                    <button onClick={handleApprove} disabled={!currentDoc} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">Setujui</button>
                </div>
            </div>

            {/* DOC VIEWER */}
            <div className={`flex flex-col bg-gray-800 rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${layoutMode === 'full-doc' ? 'w-full absolute inset-0 z-20' : 'flex-1 h-full'}`}>
                 <div className="h-12 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4 text-gray-300">
                     <span className="text-sm font-bold text-white">{currentDoc ? currentDoc.name : 'No Doc'}</span>
                     <div className="flex items-center gap-2">
                         <button onClick={()=>setZoomLevel(z=>z-0.2)} className="p-1 hover:bg-gray-700 rounded"><ZoomOut className="w-4 h-4" /></button>
                         <span className="text-xs">{Math.round(zoomLevel*100)}%</span>
                         <button onClick={()=>setZoomLevel(z=>z+0.2)} className="p-1 hover:bg-gray-700 rounded"><ZoomIn className="w-4 h-4" /></button>
                         <button onClick={()=>setLayoutMode(m=>m==='full-doc'?'split':'full-doc')} className="p-1 hover:bg-gray-700 rounded ml-2"><Maximize2 className="w-4 h-4" /></button>
                     </div>
                 </div>
                 <div className="flex-1 overflow-auto p-8 bg-gray-900/50 flex items-start justify-center">
                     {currentDoc ? (
                         <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}>
                             {/* Unified Viewer: If Drive Link (OR Fallback triggered), show Iframe. Else Show Image/PDF Canvas */}
                             {(useFallbackViewer || isDriveUrl) ? (
                                 <iframe src={getDriveUrl(currentDoc.url, 'preview')} className="w-full h-[800px] border-none rounded bg-white" title="Document Viewer" />
                             ) : (
                                 currentDoc.type === 'IMAGE' ? (
                                     <img src={currentDoc.url} className="max-w-full h-auto rounded shadow-sm" alt="Document" /> 
                                 ) : (
                                     <div className="bg-white min-h-[600px] w-full max-w-[800px] flex items-center justify-center relative">
                                        {isPdfLoading ? <Loader2 className="animate-spin w-10 h-10 text-blue-500" /> : (
                                            pdfDoc ? <PDFPageCanvas pdf={pdfDoc} pageNum={1} scale={1.0} /> : <div className="text-red-500">{pdfError ? 'Gagal memuat PDF' : 'PDF Viewer'}</div>
                                        )}
                                     </div>
                                 )
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