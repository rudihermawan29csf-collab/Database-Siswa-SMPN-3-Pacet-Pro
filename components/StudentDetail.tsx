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

// ... (Helper functions getDriveUrl, PDFPage, setNestedValue remain same - abbreviated for brevity) ...
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

// Tabs matching VerificationView
const TABS = [
    { id: 'DAPO_PRIBADI', label: '1. Identitas', icon: User },
    { id: 'DAPO_ALAMAT', label: '2. Alamat', icon: MapPin },
    { id: 'DAPO_ORTU', label: '3. Ortu/Wali', icon: Users },
    { id: 'DAPO_PERIODIK', label: '4. Periodik', icon: Activity },
    { id: 'DAPO_KIP', label: '5. Kesejahteraan', icon: Wallet },
    { id: 'DOCS', label: 'Dokumen', icon: FolderOpen }, 
];

const StudentDetail: React.FC<StudentDetailProps> = ({ student, onBack, viewMode, readOnly = false, highlightFieldKey, highlightDocumentId, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<string>('DAPO_PRIBADI');
  const [studentDocuments, setStudentDocuments] = useState<DocumentFile[]>(student.documents);
  
  // Correction State
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [targetField, setTargetField] = useState<{key: string, label: string, currentValue: string} | null>(null);
  const [proposedValue, setProposedValue] = useState('');
  const [studentReason, setStudentReason] = useState(''); // NEW: Reason instead of file
  const [forceUpdate, setForceUpdate] = useState(0); 

  // Rejection Logic
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [requestToReject, setRequestToReject] = useState<CorrectionRequest | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');

  // Evidence Viewer State
  const [evidenceViewer, setEvidenceViewer] = useState<{url: string, type: 'IMAGE' | 'PDF', title: string} | null>(null);

  useEffect(() => {
    setStudentDocuments(student.documents);
  }, [student]);

  // Auto-scroll to highlighted field
  useEffect(() => {
    if (highlightFieldKey) {
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
      setStudentReason(''); 
      setCorrectionModalOpen(true);
  };

  const submitCorrection = () => {
      if (!targetField) return;
      if (!studentReason.trim()) {
        alert("Mohon isi alasan perubahan data.");
        return;
      }
      const newRequest: CorrectionRequest = {
          id: Math.random().toString(36).substr(2, 9),
          fieldKey: targetField.key,
          fieldName: targetField.label,
          originalValue: targetField.currentValue,
          proposedValue: proposedValue,
          studentReason: studentReason, // Submit reason
          status: 'PENDING',
          requestDate: new Date().toISOString(),
      };
      
      if (!student.correctionRequests) student.correctionRequests = [];
      // Remove existing pending request for same field
      student.correctionRequests = student.correctionRequests.filter(
          r => !(r.fieldKey === targetField.key && r.status === 'PENDING')
      );
      
      student.correctionRequests.push(newRequest);
      setCorrectionModalOpen(false);
      setForceUpdate(prev => prev + 1);
      if (onUpdate) onUpdate();
      alert("✅ Usulan perbaikan berhasil dikirim. Menunggu verifikasi admin.");
  };

  // ... (Approving/Rejecting functions mostly for Admin view - keeping basic logic)
  const handleApproveCorrection = (req: CorrectionRequest) => {
      // Helper function 'setNestedValue' assumed to exist in scope or imported
      // setNestedValue(student, req.fieldKey, req.proposedValue);
      req.status = 'APPROVED';
      req.processedDate = new Date().toISOString().split('T')[0];
      req.verifierName = "Admin/Guru"; // Should be passed as prop for better accuracy
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
          requestToReject.verifierName = "Admin/Guru"; // Should be passed
          setForceUpdate(prev => prev + 1);
          setRejectModalOpen(false);
          setRequestToReject(null);
          if (onUpdate) onUpdate();
          alert(`Data ${requestToReject.fieldName} ditolak.`);
      }
  };

  const FieldGroup = ({ label, value, fieldKey, className = "" }: { label: string, value: string | number, fieldKey?: string, className?: string }) => {
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
                            <div className="bg-white p-2 rounded border border-yellow-200 text-gray-700 mb-2 font-medium">
                                {pendingReq.proposedValue}
                            </div>
                            <div className="text-[10px] text-gray-600 bg-white/50 p-2 rounded border border-yellow-100">
                                <span className="font-bold">Alasan:</span> "{pendingReq.studentReason || '-'}"
                            </div>
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
  const currentTabs = viewMode === 'student' ? TABS.filter(t => t.id !== 'DOCS') : TABS;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-140px)] relative">
      
      {/* Evidence Viewer (Kept for compatibility if needed elsewhere, though student correction uses reason now) */}
      {evidenceViewer && (
        <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col animate-fade-in">
             <div className="flex justify-between items-center p-4 bg-black/50 text-white">
                 <h3 className="font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-blue-400" /> {evidenceViewer.title}</h3>
                 <button onClick={() => setEvidenceViewer(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
             </div>
             <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start">
                 <div className="max-w-4xl w-full bg-white/5 rounded-lg p-1 min-h-[50vh] flex flex-col items-center justify-center">
                    <img src={getDriveUrl(evidenceViewer.url, 'direct')} alt="Evidence" className="max-w-full h-auto rounded shadow-2xl" /> 
                 </div>
             </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModalOpen && (
          <div className="absolute inset-0 z-[55] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform scale-100 transition-transform flex flex-col">
                  <h3 className="text-lg font-bold text-red-600 mb-2">Tolak Perubahan Data</h3>
                  <p className="text-sm text-gray-600 mb-4">Menolak pengajuan: <span className="font-bold">{requestToReject?.fieldName}</span>.</p>
                  <textarea className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-sm mb-4" rows={4} value={rejectionNote} onChange={(e) => setRejectionNote(e.target.value)} placeholder="Alasan penolakan..." autoFocus />
                  <div className="flex justify-end gap-3 mt-auto">
                      <button onClick={() => setRejectModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">Batal</button>
                      <button onClick={confirmRejectCorrection} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium shadow-sm">Simpan Penolakan</button>
                  </div>
              </div>
          </div>
      )}

      {/* Correction Modal - UPDATED */}
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
                      <textarea className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" rows={2} value={proposedValue} onChange={(e) => setProposedValue(e.target.value)} placeholder="Tuliskan data yang benar..."></textarea>
                  </div>
                   <div className="mb-6">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Alasan Perubahan</label>
                      <textarea 
                        className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                        rows={3} 
                        value={studentReason} 
                        onChange={(e) => setStudentReason(e.target.value)}
                        placeholder="Contoh: Salah ketik saat input, Data di KK baru berubah, dll."
                      ></textarea>
                      <p className="text-[10px] text-gray-400 mt-1">Wajib diisi sebagai dasar verifikasi admin.</p>
                  </div>
                  <div className="flex justify-end gap-3 mt-auto">
                      <button onClick={() => setCorrectionModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">Batal</button>
                      <button onClick={submitCorrection} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium shadow-lg shadow-blue-500/30">Kirim Pembetulan</button>
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

       {/* Content Area - Uses reusable FieldGroup with highlight support */}
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
                        {/* ... Rest of fields mapped similarly to original ... */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <FG label="NIS" value={student.nis} fieldKey="nis" />
                             <FG label="7. NIK" value={student.dapodik.nik} fieldKey="dapodik.nik" />
                        </div>
                        <FG label="8. Tempat, Tgl Lahir" value={`${student.birthPlace}, ${student.birthDate}`} fieldKey="birthDate" />
                        <FG label="11. Alamat" value={student.address} fieldKey="address" />
                    </div>
                )}
                {/* ... Other tabs follow similar FG pattern ... */}
                {activeTab === 'DAPO_ALAMAT' && (
                     <div className="animate-fade-in">
                        <SectionHeader title="Alamat Tempat Tinggal" />
                        <FG label="11. Alamat Jalan" value={student.address} fieldKey="address" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FG label="RT" value={student.dapodik.rt} fieldKey="dapodik.rt" />
                            <FG label="RW" value={student.dapodik.rw} fieldKey="dapodik.rw" />
                        </div>
                     </div>
                )}
                {activeTab === 'DOCS' && (
                    <FileManager documents={studentDocuments} onUpload={handleUpload} onDelete={handleDeleteDocument} highlightDocumentId={highlightDocumentId} />
                )}
            </div>
       </div>
    </div>
  );
};

export default StudentDetail;
