import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User, Users, BookOpen, FolderOpen, Save, MapPin, Activity, Wallet, Check, AlertTriangle, X, Pencil, CheckCircle, UploadCloud, Paperclip, ExternalLink, Eye, Loader2, History, FileText, XCircle } from 'lucide-react';
import { Student, DocumentFile, CorrectionRequest } from '../types';
import FileManager from './FileManager';

interface StudentDetailProps {
  student: Student;
  onBack: () => void;
  viewMode: 'student' | 'dapodik'; 
  readOnly?: boolean;
  highlightFieldKey?: string;
  highlightDocumentId?: string;
  onUpdate?: () => void;
}

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

const PDFPage: React.FC<{ pdf: any, pageNum: number }> = ({ pdf, pageNum }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [rendered, setRendered] = useState(false);

    useEffect(() => {
        const render = async () => {
            if (!pdf || !canvasRef.current) return;
            try {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1.5 }); 
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                
                if (context) {
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    setRendered(true);
                }
            } catch (err) {
                console.error(err);
            }
        };
        render();
    }, [pdf, pageNum]);

    return (
        <div className="relative mb-4 w-full flex justify-center">
            {!rendered && <div className="h-96 w-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-400">Memuat Halaman {pageNum}...</div>}
            <canvas ref={canvasRef} className={`shadow-lg border border-gray-200 max-w-full h-auto ${rendered ? 'block' : 'hidden'}`} />
        </div>
    );
};

const setNestedValue = (obj: any, path: string, value: any) => {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
};

// Tabs matching VerificationView
const TABS = [
    { id: 'DAPO_PRIBADI', label: '1. Identitas', icon: User },
    { id: 'DAPO_ALAMAT', label: '2. Alamat', icon: MapPin },
    { id: 'DAPO_ORTU', label: '3. Ortu/Wali', icon: Users },
    { id: 'DAPO_PERIODIK', label: '4. Periodik', icon: Activity },
    { id: 'DAPO_KIP', label: '5. Kesejahteraan', icon: Wallet },
    { id: 'DOCS', label: 'Dokumen', icon: FolderOpen }, // Kept for Admin mode or unified view
];

const StudentDetail: React.FC<StudentDetailProps> = ({ student, onBack, viewMode, readOnly = false, highlightFieldKey, highlightDocumentId, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<string>('DAPO_PRIBADI');
  const [studentDocuments, setStudentDocuments] = useState<DocumentFile[]>(student.documents);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [targetField, setTargetField] = useState<{key: string, label: string, currentValue: string} | null>(null);
  const [proposedValue, setProposedValue] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null); 
  const [forceUpdate, setForceUpdate] = useState(0); 

  // Rejection Logic
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [requestToReject, setRequestToReject] = useState<CorrectionRequest | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');

  const [evidenceViewer, setEvidenceViewer] = useState<{url: string, type: 'IMAGE' | 'PDF', title: string} | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    setStudentDocuments(student.documents);
  }, [student]);

  // Auto-scroll to highlighted field
  useEffect(() => {
    if (highlightFieldKey) {
        // Simple mapping logic to switch tabs based on field key if needed
        let targetTab = 'DAPO_PRIBADI';
        if (highlightFieldKey.includes('address') || highlightFieldKey.includes('dapodik.rt')) targetTab = 'DAPO_ALAMAT';
        if (highlightFieldKey.includes('father') || highlightFieldKey.includes('mother')) targetTab = 'DAPO_ORTU';
        if (highlightFieldKey.includes('height') || highlightFieldKey.includes('weight')) targetTab = 'DAPO_PERIODIK';
        if (highlightFieldKey.includes('kip') || highlightFieldKey.includes('bank')) targetTab = 'DAPO_KIP';
        
        setActiveTab(targetTab);
        setTimeout(() => {
            const element = document.getElementById(`field-${highlightFieldKey}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
                setTimeout(() => element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2'), 2500);
            }
        }, 300);
    }
  }, [highlightFieldKey]);

  useEffect(() => {
      const loadPdf = async () => {
          setPdfDoc(null);
          setNumPages(0);
          setUseFallback(false);
          
          // Force Fallback for Drive URLs regardless of Type
          if (evidenceViewer && (evidenceViewer.url.includes('drive.google.com') || evidenceViewer.url.includes('docs.google.com'))) {
              setUseFallback(true);
              return;
          }

          if (evidenceViewer?.type === 'PDF') {
              setIsPdfLoading(true);
              try {
                  // Dynamic Import
                  // @ts-ignore
                  const pdfjsLib = await import('pdfjs-dist');
                  const pdfjs = pdfjsLib.default ? pdfjsLib.default : pdfjsLib;
                  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
                      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
                  }

                  // FIX: Fetch ArrayBuffer explicitly
                  const response = await fetch(evidenceViewer.url);
                  if (!response.ok) throw new Error("Network error");
                  const arrayBuffer = await response.arrayBuffer();

                  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
                  const pdf = await loadingTask.promise;
                  setPdfDoc(pdf);
                  setNumPages(pdf.numPages);
              } catch (e) {
                  console.error("Failed to load PDF evidence, fallback", e);
                  setUseFallback(true);
              } finally {
                  setIsPdfLoading(false);
              }
          }
      };
      loadPdf();
  }, [evidenceViewer]);


  const handleUpload = (file: File, category: string) => {
    setStudentDocuments(prev => {
        let newDocs = category === 'LAINNYA' ? [...prev] : prev.filter(d => d.category !== category);
        
        const newDoc: DocumentFile = {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: file.type.includes('pdf') ? 'PDF' : 'IMAGE',
            url: URL.createObjectURL(file), 
            category: category as any,
            uploadDate: new Date().toISOString().split('T')[0],
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            status: 'PENDING', 
            adminNote: undefined
        };
        
        student.documents = [...newDocs, newDoc];
        if (onUpdate) setTimeout(onUpdate, 100);
        return [...newDocs, newDoc];
    });
  };

  const handleDeleteDocument = (docId: string) => {
      if(window.confirm("Apakah Anda yakin ingin menghapus dokumen ini?")) {
          setStudentDocuments(prev => {
            const next = prev.filter(d => d.id !== docId);
            student.documents = next;
            if (onUpdate) setTimeout(onUpdate, 100);
            return next;
          });
      }
  };

  const handleOpenCorrection = (key: string, label: string, value: string) => {
      setTargetField({ key, label, currentValue: value });
      setProposedValue(value);
      setProofFile(null); 
      setCorrectionModalOpen(true);
  };

  const submitCorrection = () => {
      if (!targetField) return;
      if (!proofFile) {
        alert("Mohon lampirkan bukti dukung sebelum mengirim pembetulan.");
        return;
      }
      const newRequest: CorrectionRequest = {
          id: Math.random().toString(36).substr(2, 9),
          fieldKey: targetField.key,
          fieldName: targetField.label,
          originalValue: targetField.currentValue,
          proposedValue: proposedValue,
          status: 'PENDING',
          requestDate: new Date().toISOString(),
          attachment: {
              url: URL.createObjectURL(proofFile),
              name: proofFile.name,
              type: proofFile.type.includes('pdf') ? 'PDF' : 'IMAGE'
          }
      };
      if (!student.correctionRequests) student.correctionRequests = [];
      student.correctionRequests = student.correctionRequests.filter(
          r => !(r.fieldKey === targetField.key && r.status === 'PENDING')
      );
      student.correctionRequests.push(newRequest);
      setCorrectionModalOpen(false);
      setForceUpdate(prev => prev + 1);
      if (onUpdate) onUpdate();
      alert("✅ Usulan perbaikan berhasil dikirim. Menunggu verifikasi admin.");
  };

  const handleApproveCorrection = (req: CorrectionRequest) => {
      setNestedValue(student, req.fieldKey, req.proposedValue);
      req.status = 'APPROVED';
      req.processedDate = new Date().toISOString().split('T')[0];
      setForceUpdate(prev => prev + 1);
      if (onUpdate) onUpdate();
      alert(`✅ Data ${req.fieldName} berhasil diperbarui.`);
  };

  const triggerRejectCorrection = (req: CorrectionRequest) => {
      setRequestToReject(req);
      setRejectionNote('');
      setRejectModalOpen(true);
  };

  const confirmRejectCorrection = () => {
      if (requestToReject) {
          requestToReject.status = 'REJECTED';
          requestToReject.processedDate = new Date().toISOString().split('T')[0];
          requestToReject.adminNote = rejectionNote || 'Data ditolak oleh admin.';
          setForceUpdate(prev => prev + 1);
          setRejectModalOpen(false);
          setRequestToReject(null);
          if (onUpdate) onUpdate();
          alert(`Data ${requestToReject.fieldName} ditolak.`);
      }
  };

  const FieldGroup = ({ label, value, fieldKey, className = "" }: { label: string, value: string | number, fieldKey?: string, className?: string }) => {
    // FIX: Handle 0 properly so it doesn't show as empty/dash
    const displayValue = (value !== null && value !== undefined && value !== '') ? value : '-';
    const stringValue = String(displayValue);
    
    const pendingReq = fieldKey ? student.correctionRequests?.find(r => r.fieldKey === fieldKey && r.status === 'PENDING') : null;
    const approvedReq = fieldKey ? student.correctionRequests?.find(r => r.fieldKey === fieldKey && r.status === 'APPROVED') : null;

    return (
        <div id={fieldKey ? `field-${fieldKey}` : undefined} className={`mb-4 ${className} relative group transition-all duration-500 rounded-lg p-1 ${highlightFieldKey === fieldKey ? 'bg-blue-50/50' : ''}`}>
            <div className="flex justify-between items-end mb-1 px-1">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
                {pendingReq && readOnly && (
                    <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full flex items-center font-bold">
                        <Activity className="w-3 h-3 mr-1" /> Menunggu Verifikasi
                    </span>
                )}
                 {approvedReq && readOnly && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex items-center font-bold animate-fade-in">
                        <CheckCircle className="w-3 h-3 mr-1" /> Disetujui
                    </span>
                )}
            </div>
            <div className={`relative p-2.5 bg-gray-50 border rounded-lg text-gray-800 text-sm font-medium min-h-[42px] break-words transition-all ${pendingReq ? 'border-yellow-300 ring-1 ring-yellow-100' : 'border-gray-200'}`}>
                {stringValue}
                {readOnly && fieldKey && !pendingReq && (
                    <button 
                        onClick={() => handleOpenCorrection(fieldKey, label, stringValue)}
                        className="absolute right-2 top-2 p-1.5 bg-white rounded-md shadow-sm border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 opacity-0 group-hover:opacity-100 transition-all"
                        title="Laporkan Kesalahan Data"
                    >
                        <Pencil className="w-3 h-3" />
                    </button>
                )}
            </div>
            {pendingReq && (
                <div className="mt-2 p-3 bg-yellow-50 rounded-lg border border-yellow-100 text-xs animate-fade-in">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 w-full">
                            <p className="font-semibold text-yellow-800 mb-1">
                                {readOnly ? "Usulan Perbaikan Anda:" : "Siswa Mengusulkan Perubahan:"}
                            </p>
                            <div className="bg-white p-2 rounded border border-yellow-200 text-gray-700 mb-2">
                                {pendingReq.proposedValue}
                            </div>
                            {pendingReq.attachment && (
                                <div className="mb-2">
                                    <p className="text-[10px] font-semibold text-gray-500 mb-1 uppercase">Bukti Lampiran:</p>
                                    <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200">
                                        <Paperclip className="w-3 h-3 text-gray-400" />
                                        <span className="truncate flex-1 text-gray-700 font-medium">
                                            {pendingReq.attachment.name}
                                        </span>
                                        <button 
                                            onClick={() => setEvidenceViewer({
                                                url: pendingReq.attachment!.url,
                                                type: pendingReq.attachment!.type,
                                                title: `Bukti: ${label}`
                                            })}
                                            className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
                                        >
                                            <Eye className="w-3 h-3" /> Lihat Bukti
                                        </button>
                                    </div>
                                </div>
                            )}
                            {!readOnly && (
                                <div className="flex gap-2 mt-2 justify-end pt-2 border-t border-yellow-200/50">
                                    <button onClick={() => triggerRejectCorrection(pendingReq)} className="px-3 py-1 bg-white border border-red-200 text-red-600 rounded hover:bg-red-50 font-medium transition-colors">Tolak</button>
                                    <button onClick={() => handleApproveCorrection(pendingReq)} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 font-medium shadow-sm transition-colors">Setujui & Ubah</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 uppercase border-y border-gray-200 mt-6 mb-4 first:mt-0 rounded-md">
        {title}
    </div>
  );

  const FG = (props: { label: string, value: string | number, fieldKey?: string, className?: string }) => <FieldGroup {...props} />;

  // Dynamic Tabs based on View Mode: In student mode, usually docs are handled elsewhere, but for Admin detail view we include Docs
  const currentTabs = viewMode === 'student' ? TABS.filter(t => t.id !== 'DOCS') : TABS;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-140px)] relative">
      {evidenceViewer && (
        <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col animate-fade-in">
             <div className="flex justify-between items-center p-4 bg-black/50 text-white">
                 <h3 className="font-bold flex items-center gap-2">
                     <FileText className="w-5 h-5 text-blue-400" />
                     {evidenceViewer.title}
                 </h3>
                 <button onClick={() => setEvidenceViewer(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
             </div>
             <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start">
                 <div className="max-w-4xl w-full bg-white/5 rounded-lg p-1 min-h-[50vh] flex flex-col items-center justify-center">
                    {(useFallback) ? (
                        <iframe src={getDriveUrl(evidenceViewer.url, 'preview')} className="w-full h-[800px] border-none bg-white rounded" title="Viewer" />
                    ) : (
                        evidenceViewer.type === 'IMAGE' ? ( 
                            <img src={getDriveUrl(evidenceViewer.url, 'direct')} alt="Evidence" className="max-w-full h-auto rounded shadow-2xl" /> 
                        ) : (
                            <div className="w-full flex flex-col items-center">
                                {isPdfLoading ? <div className="flex flex-col items-center text-white/70 py-10"><Loader2 className="w-8 h-8 animate-spin mb-2" /><span>Memproses Halaman PDF...</span></div> : null}
                                {pdfDoc && numPages > 0 && ( 
                                    <div className="w-full space-y-4">{Array.from(new Array(numPages), (el, index) => ( <PDFPage key={index} pdf={pdfDoc} pageNum={index + 1} /> ))}</div> 
                                )}
                                {!isPdfLoading && !pdfDoc && ( <div className="text-red-400">Gagal memuat PDF.</div> )}
                            </div>
                        )
                    )}
                 </div>
             </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModalOpen && (
          <div className="absolute inset-0 z-[55] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform scale-100 transition-transform flex flex-col">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                          <XCircle className="w-5 h-5" /> Tolak Perubahan Data
                      </h3>
                      <button onClick={() => setRejectModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Anda akan menolak pengajuan perubahan data <span className="font-bold">{requestToReject?.fieldName}</span>.</p>
                  <textarea className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none mb-4" rows={4} value={rejectionNote} onChange={(e) => setRejectionNote(e.target.value)} placeholder="Alasan penolakan..." autoFocus />
                  <div className="flex justify-end gap-3 mt-auto">
                      <button onClick={() => setRejectModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">Batal</button>
                      <button onClick={confirmRejectCorrection} disabled={!rejectionNote.trim()} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"><Save className="w-4 h-4" /> Simpan Penolakan</button>
                  </div>
              </div>
          </div>
      )}

      {/* Correction Modal */}
      {correctionModalOpen && (
          <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform scale-100 transition-transform flex flex-col max-h-[90vh]">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-900">Pembetulan Data</h3>
                      <button onClick={() => setCorrectionModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Bagian yang dibetulkan</p>
                      <p className="text-sm font-bold text-blue-700 mt-1">{targetField?.label}</p>
                      <p className="text-xs text-gray-400 mt-1">Data saat ini: <span className="text-gray-600">{targetField?.currentValue || '-'}</span></p>
                  </div>
                  <div className="mb-4">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Data Seharusnya</label>
                      <textarea className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" rows={3} value={proposedValue} onChange={(e) => setProposedValue(e.target.value)} placeholder="Tuliskan data yang benar di sini..."></textarea>
                  </div>
                   <div className="mb-6">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Bukti Dukung (Foto/PDF)</label>
                      <div className="flex items-center gap-3">
                          <label className="cursor-pointer flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 text-sm font-medium transition-colors border border-gray-300">
                              <UploadCloud className="w-4 h-4 mr-2" />
                              {proofFile ? 'Ganti File' : 'Pilih File'}
                              <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
                          </label>
                          {proofFile && <span className="text-sm text-gray-600 truncate flex-1">{proofFile.name}</span>}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Wajib melampirkan bukti seperti KK/Akte/Ijazah.</p>
                  </div>
                  <div className="flex justify-end gap-3 mt-auto">
                      <button onClick={() => setCorrectionModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">Batal</button>
                      <button onClick={submitCorrection} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium shadow-lg shadow-blue-500/30 transition-transform transform active:scale-95">Kirim Pembetulan</button>
                  </div>
              </div>
          </div>
      )}

       {/* Toolbar / Header within Detail View */}
       <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50/50">
            <div className="flex items-center gap-3">
                 <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                 <div>
                     <h2 className="text-lg font-bold text-gray-800">{student.fullName}</h2>
                     <p className="text-xs text-gray-500 flex items-center gap-2">
                         <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">{student.nis} / {student.nisn}</span>
                         <span>•</span>
                         <span>Kelas {student.className}</span>
                     </p>
                 </div>
            </div>
       </div>

       {/* Tabs Navigation */}
       <div className="flex overflow-x-auto border-b border-gray-200 bg-white px-2 no-scrollbar">
            {currentTabs.map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                        ${activeTab === tab.id ? 'border-blue-500 text-blue-600 bg-blue-50/30' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
                    `}
                >
                    <tab.icon className={`w-4 h-4 mr-2 ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'}`} />
                    {tab.label}
                </button>
            ))}
       </div>

       {/* Content Area - EXACTLY MATCHING VERIFICATION VIEW STRUCTURE */}
       <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
            <div className="max-w-5xl mx-auto bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                
                {activeTab === 'DAPO_PRIBADI' && (
                    <div className="animate-fade-in">
                        <SectionHeader title="Identitas Peserta Didik" />
                        <FG label="1. Nama Lengkap" value={student.fullName} fieldKey="fullName" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <FG label="2. Jenis Kelamin" value={student.gender === 'L' ? 'Laki-laki' : 'Perempuan'} fieldKey="gender" />
                             <FG label="3. NISN" value={student.nisn} fieldKey="nisn" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <FG label="NIS" value={student.nis} fieldKey="nis" />
                             <FG label="7. NIK" value={student.dapodik.nik} fieldKey="dapodik.nik" />
                        </div>
                        <FG label="8. Tempat, Tgl Lahir" value={`${student.birthPlace}, ${student.birthDate}`} fieldKey="birthDate" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <FG label="9. Agama" value={student.religion} fieldKey="religion" />
                             <FG label="10. Berkebutuhan Khusus" value={student.dapodik.specialNeeds} fieldKey="dapodik.specialNeeds" />
                        </div>
                        <SectionHeader title="Data Akademik Awal" />
                        <FG label="4. No Seri Ijazah" value={student.diplomaNumber} fieldKey="diplomaNumber" />
                        <FG label="5. No Seri SKHUN" value={student.dapodik.skhun} fieldKey="dapodik.skhun" />
                        <FG label="6. No Peserta UN" value={student.dapodik.unExamNumber} fieldKey="dapodik.unExamNumber" />
                        <FG label="Sekolah Asal" value={student.previousSchool} fieldKey="previousSchool" />
                        <FG label=" - No Reg Akta Lahir" value={student.dapodik.birthRegNumber} fieldKey="dapodik.birthRegNumber" />
                    </div>
                )}

                {activeTab === 'DAPO_ALAMAT' && (
                     <div className="animate-fade-in">
                        <SectionHeader title="Alamat Tempat Tinggal" />
                        <FG label="11. Alamat Jalan" value={student.address} fieldKey="address" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FG label="RT" value={student.dapodik.rt} fieldKey="dapodik.rt" />
                            <FG label="RW" value={student.dapodik.rw} fieldKey="dapodik.rw" />
                        </div>
                        <FG label="Dusun" value={student.dapodik.dusun} fieldKey="dapodik.dusun" />
                        <FG label="Kelurahan / Desa" value={student.dapodik.kelurahan} fieldKey="dapodik.kelurahan" />
                        <FG label="Kecamatan" value={student.subDistrict} fieldKey="subDistrict" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FG label="Kabupaten" value={student.district} fieldKey="district" />
                            <FG label="Kode Pos" value={student.postalCode} fieldKey="postalCode" />
                        </div>
                        <FG label="Lintang / Bujur" value={`${student.dapodik.latitude} / ${student.dapodik.longitude}`} fieldKey="dapodik.latitude" />
                        
                        <SectionHeader title="Informasi Tambahan" />
                        <FG label="12. Transportasi" value={student.dapodik.transportation} fieldKey="dapodik.transportation" />
                        <FG label="13. Jenis Tinggal" value={student.dapodik.livingStatus} fieldKey="dapodik.livingStatus" />
                        <FG label="14. No Telp / HP" value={student.father.phone || student.mother.phone} fieldKey="father.phone" />
                        <FG label="15. E-Mail" value={student.dapodik.email} fieldKey="dapodik.email" />
                     </div>
                )}

                {activeTab === 'DAPO_ORTU' && (
                     <div className="animate-fade-in">
                        <SectionHeader title="Data Ayah Kandung" />
                        <FG label="18. Nama Ayah" value={student.father.name} fieldKey="father.name" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FG label="NIK Ayah" value={student.father.nik} fieldKey="father.nik" />
                            <FG label="Tahun Lahir" value={student.father.birthPlaceDate} fieldKey="father.birthPlaceDate" />
                        </div>
                        <FG label="Pendidikan" value={student.father.education} fieldKey="father.education" />
                        <FG label="Pekerjaan" value={student.father.job} fieldKey="father.job" />
                        <FG label="Penghasilan" value={student.father.income} fieldKey="father.income" />

                        <SectionHeader title="Data Ibu Kandung" />
                        <FG label="19. Nama Ibu" value={student.mother.name} fieldKey="mother.name" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FG label="NIK Ibu" value={student.mother.nik} fieldKey="mother.nik" />
                            <FG label="Tahun Lahir" value={student.mother.birthPlaceDate} fieldKey="mother.birthPlaceDate" />
                        </div>
                        <FG label="Pendidikan" value={student.mother.education} fieldKey="mother.education" />
                        <FG label="Pekerjaan" value={student.mother.job} fieldKey="mother.job" />
                        <FG label="Penghasilan" value={student.mother.income} fieldKey="mother.income" />

                        <SectionHeader title="Data Wali (Jika Ada)" />
                        <FG label="20. Nama Wali" value={student.guardian?.name || '-'} fieldKey="guardian.name" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FG label="NIK Wali" value={student.guardian?.nik || '-'} fieldKey="guardian.nik" />
                            <FG label="Tahun Lahir" value={student.guardian?.birthPlaceDate || '-'} fieldKey="guardian.birthPlaceDate" />
                        </div>
                        <FG label="Pekerjaan Wali" value={student.guardian?.job || '-'} fieldKey="guardian.job" />
                        <FG label="Penghasilan Wali" value={student.guardian?.income || '-'} fieldKey="guardian.income" />
                     </div>
                )}

                {activeTab === 'DAPO_PERIODIK' && (
                    <div className="animate-fade-in">
                        <SectionHeader title="Data Periodik Siswa" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FG label="21. Tinggi Badan (cm)" value={student.height} fieldKey="height" />
                            <FG label="Berat Badan (kg)" value={student.weight} fieldKey="weight" />
                        </div>
                        <FG label="Lingkar Kepala (cm)" value={student.dapodik.headCircumference} fieldKey="dapodik.headCircumference" />
                        <FG label="22. Jarak ke Sekolah (km)" value={student.dapodik.distanceToSchool} fieldKey="dapodik.distanceToSchool" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FG label="23. Waktu (Jam)" value={student.dapodik.travelTimeHours || 0} fieldKey="dapodik.travelTimeHours" />
                            <FG label="Waktu (Menit)" value={student.dapodik.travelTimeMinutes || 0} fieldKey="dapodik.travelTimeMinutes" />
                        </div>
                        <FG label="24. Jml Saudara Kandung" value={student.siblingCount} fieldKey="siblingCount" />
                    </div>
                )}

                {activeTab === 'DAPO_KIP' && (
                    <div className="animate-fade-in">
                        <SectionHeader title="Kesejahteraan Peserta Didik" />
                        <FG label="16. Penerima KPS/PKH" value={student.dapodik.kpsReceiver} fieldKey="dapodik.kpsReceiver" />
                        <FG label="No. KPS" value={student.dapodik.kpsNumber} fieldKey="dapodik.kpsNumber" />
                        <FG label="17. Penerima KIP" value={student.dapodik.kipReceiver} fieldKey="dapodik.kipReceiver" />
                        <FG label="Nomor KIP" value={student.dapodik.kipNumber} fieldKey="dapodik.kipNumber" />
                        <FG label="Nama Tertera di KIP" value={student.dapodik.kipName} fieldKey="dapodik.kipName" />
                        <FG label="Nomor KKS" value={student.dapodik.kksNumber} fieldKey="dapodik.kksNumber" />
                        
                        <SectionHeader title="Program Indonesia Pintar (PIP)" />
                        <FG label="Layak PIP (Usulan)" value={student.dapodik.pipEligible} fieldKey="dapodik.pipEligible" />
                        <FG label="Alasan Layak PIP" value={student.dapodik.pipReason} fieldKey="dapodik.pipReason" />
                        
                        <SectionHeader title="Rekening Bank" />
                        <FG label="Nama Bank" value={student.dapodik.bank} fieldKey="dapodik.bank" />
                        <FG label="Nomor Rekening" value={student.dapodik.bankAccount} fieldKey="dapodik.bankAccount" />
                        <FG label="Atas Nama" value={student.dapodik.bankAccountName} fieldKey="dapodik.bankAccountName" />
                    </div>
                )}

                {/* Only visible in Admin Mode or if specifically needed, but handling it for robustness */}
                {activeTab === 'DOCS' && (
                    <FileManager 
                        documents={studentDocuments} 
                        onUpload={handleUpload} 
                        onDelete={handleDeleteDocument} 
                        highlightDocumentId={highlightDocumentId}
                    />
                )}
            </div>
       </div>

    </div>
  );
};

export default StudentDetail;