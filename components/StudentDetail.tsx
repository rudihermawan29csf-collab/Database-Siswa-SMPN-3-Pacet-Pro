
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Save, Pencil, AlertTriangle, X, CheckCircle2, XCircle, MessageSquare, Loader2, FileText, ListChecks, AlertCircle, User, MapPin, Users, Heart, Wallet, ChevronDown, ChevronUp } from 'lucide-react';
import { Student, CorrectionRequest } from '../types';
import { api } from '../services/api';

interface StudentDetailProps {
  student: Student;
  onBack: () => void;
  viewMode: 'student' | 'dapodik'; 
  readOnly?: boolean;
  highlightFieldKey?: string;
  highlightDocumentId?: string;
  onUpdate?: () => void;
  onSave?: (student: Student) => void;
  currentUser?: { name: string; role: string };
}

const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    } catch { return dateStr; }
};

const StudentDetail: React.FC<StudentDetailProps> = ({ student, onBack, viewMode, readOnly = false, highlightFieldKey, onUpdate, onSave, currentUser }) => {
  // Layout State
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'ADDRESS' | 'PARENTS' | 'PERIODIK' | 'WELFARE'>('PROFILE');

  // Correction State
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [targetField, setTargetField] = useState<{key: string, label: string, currentValue: string} | null>(null);
  const [proposedValue, setProposedValue] = useState('');
  const [studentReason, setStudentReason] = useState('');
  
  // Rejection Modal State (Admin)
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [requestToReject, setRequestToReject] = useState<CorrectionRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Auto-scroll logic
  useEffect(() => {
    if (highlightFieldKey) {
        // Map field keys to tabs if needed, for now mostly useful in admin view
        // Logic to switch tab could be added here
        setTimeout(() => {
            const element = document.getElementById(`field-${highlightFieldKey}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('ring-2', 'ring-blue-500');
                setTimeout(() => element.classList.remove('ring-2', 'ring-blue-500'), 2500);
            }
        }, 500);
    }
  }, [highlightFieldKey]);

  const handleOpenCorrection = (key: string, label: string, value: string) => {
      setTargetField({ key, label, currentValue: value });
      setProposedValue(value);
      setStudentReason(''); 
      setCorrectionModalOpen(true);
  };

  const submitCorrection = async () => {
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
          studentReason: studentReason,
          status: 'PENDING',
          requestDate: new Date().toISOString(),
      };
      
      const updatedStudent = { ...student };
      if (!updatedStudent.correctionRequests) updatedStudent.correctionRequests = [];
      
      updatedStudent.correctionRequests = updatedStudent.correctionRequests.filter(
          r => !(r.fieldKey === targetField.key && r.status === 'PENDING')
      );
      
      updatedStudent.correctionRequests.push(newRequest);
      
      if (onSave) {
          await onSave(updatedStudent);
      } else {
          await api.updateStudent(updatedStudent);
          if (onUpdate) onUpdate();
      }
      
      setCorrectionModalOpen(false);
      alert("✅ Usulan perbaikan berhasil dikirim. Menunggu verifikasi admin.");
  };

  const handleVerifyRequest = async (request: CorrectionRequest, status: 'APPROVED' | 'REJECTED', note?: string) => {
      if (!request) return;
      setIsProcessing(request.id);

      const updatedStudent = JSON.parse(JSON.stringify(student));

      if (updatedStudent.correctionRequests) {
          updatedStudent.correctionRequests = updatedStudent.correctionRequests.map((req: CorrectionRequest) => {
              if (req.id === request.id) {
                  return {
                      ...req,
                      status: status,
                      verifierName: currentUser?.name || 'Admin',
                      processedDate: new Date().toISOString(),
                      adminNote: note || (status === 'APPROVED' ? 'Disetujui.' : 'Ditolak.')
                  };
              }
              return req;
          });
      }

      if (status === 'APPROVED') {
          const keys = request.fieldKey.split('.');
          let current: any = updatedStudent;
          for (let i = 0; i < keys.length - 1; i++) {
               if (!current[keys[i]]) current[keys[i]] = {};
               current = current[keys[i]];
          }
          const lastKey = keys[keys.length - 1];
          const newValue = request.proposedValue;
          
          // Type casting safety
          if (lastKey === 'height' || lastKey === 'weight' || lastKey === 'siblingCount' || lastKey === 'childOrder') {
               current[lastKey] = Number(newValue) || 0;
          } else {
               current[lastKey] = newValue;
          }
      }

      try {
          if (onSave) {
              await onSave(updatedStudent);
          } else {
              await api.updateStudent(updatedStudent);
              if (onUpdate) setTimeout(() => onUpdate(), 1000); 
          }
          if(status === 'APPROVED') alert("Perubahan disetujui dan data siswa diperbarui.");
      } catch (e) {
          alert("Gagal menyimpan verifikasi.");
      } finally {
          setIsProcessing(null);
      }
  };

  const openRejectModal = (req: CorrectionRequest) => {
      setRequestToReject(req);
      setRejectionNote('');
      setRejectModalOpen(true);
  };

  const confirmRejection = () => {
      if (requestToReject) {
          if (!rejectionNote.trim()) { alert("Mohon isi alasan penolakan."); return; }
          handleVerifyRequest(requestToReject, 'REJECTED', rejectionNote);
          setRejectModalOpen(false); setRequestToReject(null);
      }
  };

  const renderRequestCard = (req: CorrectionRequest) => {
      const isPending = req.status === 'PENDING';
      const isApproved = req.status === 'APPROVED';
      return (
        <div key={req.id} className={`border-l-4 p-4 rounded-r-lg shadow-sm mb-3 animate-fade-in relative bg-white ${isPending ? 'border-yellow-400' : isApproved ? 'border-green-500 bg-green-50/20' : 'border-red-500 bg-red-50/20'}`}>
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-full ${isPending ? 'bg-yellow-100' : isApproved ? 'bg-green-100' : 'bg-red-100'}`}>
                        <Pencil className={`w-3 h-3 ${isPending ? 'text-yellow-700' : isApproved ? 'text-green-700' : 'text-red-700'}`} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-800">{req.fieldName}</h4>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500">{new Date(req.requestDate).toLocaleDateString()}</span>
                            {!isPending && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${isApproved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {isApproved ? 'DISETUJUI' : 'DITOLAK'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3 bg-gray-50 p-2 rounded border border-gray-100">
                <div><p className="text-[9px] text-gray-400 uppercase font-bold">Data Lama</p><p className="text-xs font-medium text-gray-500 line-through decoration-red-400">{req.originalValue || '(Kosong)'}</p></div>
                <div><p className="text-[9px] text-blue-500 uppercase font-bold">Data Baru</p><p className="text-xs font-bold text-blue-700">{req.proposedValue}</p></div>
            </div>
            {req.studentReason && <div className="text-[11px] italic text-gray-600 mb-2 bg-yellow-50/50 p-2 rounded">"<span className="font-semibold">Alasan:</span> {req.studentReason}"</div>}
            {!isPending && req.adminNote && <div className={`text-[10px] italic p-2 rounded mb-2 ${isApproved ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}><span className="font-bold">Admin:</span> {req.adminNote}</div>}
            {isPending && !readOnly && (<div className="flex gap-2 justify-end pt-2 border-t border-gray-100"><button onClick={() => openRejectModal(req)} disabled={isProcessing === req.id} className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded text-xs font-bold hover:bg-red-50 flex items-center gap-1"><XCircle className="w-3 h-3" /> Tolak</button><button onClick={() => handleVerifyRequest(req, 'APPROVED')} disabled={isProcessing === req.id} className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 flex items-center gap-1 shadow-sm">{isProcessing === req.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <CheckCircle2 className="w-3 h-3" />} Setujui</button></div>)}
        </div>
      );
  };

  // --- NEW RENDER FIELD COMPONENT ---
  const RenderField = ({ label, value, fieldKey, type = 'text', fullWidth = false }: { label: string, value: any, fieldKey: string, type?: string, fullWidth?: boolean }) => {
      const pendingReq = student.correctionRequests?.find(r => r.fieldKey === fieldKey && r.status === 'PENDING');
      const displayValue = pendingReq ? pendingReq.proposedValue : (value || '-');
      const isDate = type === 'date';
      const formattedValue = isDate ? formatDateIndo(displayValue) : displayValue;
      
      // If readOnly is TRUE (Student View), interaction is allowed (to correction).
      // If readOnly is FALSE (Admin View), mostly static display unless we add edit feature here (but Admin uses Modal usually)
      const isInteractive = readOnly; 

      return (
          <div className={`group relative ${fullWidth ? 'col-span-full' : ''}`} id={`field-${fieldKey}`}>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{label}</label>
              <div 
                  className={`
                      w-full p-2.5 border rounded-lg text-sm font-bold flex items-center justify-between transition-all
                      ${pendingReq ? 'bg-yellow-50 border-yellow-300 text-yellow-800' : 'bg-white border-gray-200 text-gray-800 shadow-sm'}
                      ${isInteractive ? 'hover:border-blue-400 hover:bg-blue-50 cursor-pointer' : ''}
                  `}
                  onClick={() => isInteractive && !pendingReq && handleOpenCorrection(fieldKey, label, String(value || ''))}
                  title={pendingReq ? "Menunggu Verifikasi" : isInteractive ? "Klik untuk koreksi data" : ""}
              >
                  <span className="truncate">{formattedValue}</span>
                  {pendingReq ? (
                      <div className="flex items-center gap-1">
                          <span className="text-[9px] uppercase font-black bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded">Pending</span>
                          <Loader2 className="w-3 h-3 animate-spin text-yellow-600" />
                      </div>
                  ) : (
                      isInteractive && <Pencil className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
              </div>
          </div>
      );
  };

  const TabButton = ({ id, label, icon: Icon }: any) => (
      <button 
          onClick={() => setActiveTab(id)}
          className={`
              flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap
              ${activeTab === id ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
          `}
      >
          <Icon className="w-4 h-4" /> {label}
      </button>
  );

  const allRequests = useMemo(() => {
      if (!student.correctionRequests) return [];
      return [...student.correctionRequests].sort((a, b) => {
          if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
          if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
          return new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime();
      });
  }, [student]);

  const pendingCount = allRequests.filter(r => r.status === 'PENDING').length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full relative">
      
      {/* Correction Modal (Student View) */}
      {correctionModalOpen && (
          <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col max-h-[90vh]">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="text-lg font-bold text-gray-900">Pembetulan Data</h3>
                      <button onClick={() => setCorrectionModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
                  </div>
                  <div className="mb-4 bg-blue-50 p-3 rounded border border-blue-100">
                      <p className="text-xs text-gray-500 uppercase">Data Lama ({targetField?.label})</p>
                      <p className="text-sm font-bold text-gray-700">{targetField?.currentValue || '-'}</p>
                  </div>
                  <div className="space-y-3">
                      <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Data Baru</label>
                          {targetField?.key.toLowerCase().includes('date') || targetField?.key.toLowerCase().includes('tgl') ? (
                              <input type="date" className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={proposedValue} onChange={(e) => setProposedValue(e.target.value)} autoFocus />
                          ) : (
                              <input className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={proposedValue} onChange={(e) => setProposedValue(e.target.value)} autoFocus />
                          )}
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Alasan Perubahan</label>
                          <textarea className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" rows={2} value={studentReason} onChange={(e) => setStudentReason(e.target.value)} placeholder="Contoh: Salah penulisan nama..." />
                      </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                      <button onClick={() => setCorrectionModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded text-sm font-bold text-gray-600">Batal</button>
                      <button onClick={submitCorrection} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700">Kirim Pengajuan</button>
                  </div>
              </div>
          </div>
      )}

      {/* Rejection Modal (Admin View) */}
      {rejectModalOpen && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col">
                  <h3 className="font-bold text-red-600 mb-2">Tolak Perubahan Data</h3>
                  <textarea className="w-full p-3 border border-gray-300 rounded-lg text-sm mb-4 focus:ring-2 focus:ring-red-500 outline-none" rows={3} value={rejectionNote} onChange={e => setRejectionNote(e.target.value)} placeholder="Alasan penolakan..." autoFocus />
                  <div className="flex justify-end gap-2">
                      <button onClick={()=>setRejectModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold text-xs">Batal</button>
                      <button onClick={confirmRejection} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700">Tolak</button>
                  </div>
              </div>
          </div>
      )}

       {/* Header */}
       <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-3">
                 <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                 <div>
                     <h2 className="text-lg font-bold text-gray-800">Buku Induk Siswa</h2>
                     <p className="text-xs text-gray-500">{student.fullName} • {student.className}</p>
                 </div>
            </div>
            {readOnly ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200">
                    <FileText className="w-4 h-4" />
                    Klik Data untuk Koreksi
                </div>
            ) : (
                pendingCount > 0 && (
                    <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-lg text-xs font-bold border border-yellow-200 animate-pulse">
                        <ListChecks className="w-4 h-4" />
                        {pendingCount} Menunggu Verifikasi
                    </div>
                )
            )}
       </div>

       {/* Tabs */}
       <div className="flex overflow-x-auto border-b border-gray-200 bg-white no-scrollbar">
            <TabButton id="PROFILE" label="Data Utama" icon={User} />
            <TabButton id="ADDRESS" label="Alamat" icon={MapPin} />
            <TabButton id="PARENTS" label="Orang Tua" icon={Users} />
            <TabButton id="PERIODIK" label="Periodik" icon={Heart} />
            <TabButton id="WELFARE" label="Kesejahteraan" icon={Wallet} />
       </div>

       {/* Scrollable Content */}
       <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/50 flex flex-col md:flex-row gap-6 justify-center pb-32">
            
            {/* Side Panel for Requests (Visible mostly to Admin or when History present) */}
            {allRequests.length > 0 && (
                <div className="w-full md:w-80 md:sticky md:top-0 h-fit space-y-3 order-last md:order-first">
                    <div className="flex items-center gap-2 text-gray-700 font-bold text-sm mb-2 px-1 bg-white p-2 rounded shadow-sm border border-gray-100">
                        <ListChecks className="w-4 h-4" /> Riwayat Perubahan
                    </div>
                    {allRequests.map(req => renderRequestCard(req))}
                </div>
            )}

            <div className="w-full max-w-[900px] flex-1">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    
                    {/* SECTION 1: DATA UTAMA */}
                    {activeTab === 'PROFILE' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="border-b pb-2 mb-4"><h3 className="font-bold text-gray-800 text-lg">Identitas Peserta Didik</h3></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <RenderField label="Nama Lengkap" value={student.fullName} fieldKey="fullName" fullWidth />
                                <RenderField label="NIS" value={student.nis} fieldKey="nis" />
                                <RenderField label="NISN" value={student.nisn} fieldKey="nisn" />
                                <RenderField label="NIK (KTP)" value={student.dapodik?.nik} fieldKey="dapodik.nik" />
                                <RenderField label="Jenis Kelamin" value={student.gender === 'L' ? 'Laki-laki' : 'Perempuan'} fieldKey="gender" />
                                <RenderField label="Tempat Lahir" value={student.birthPlace} fieldKey="birthPlace" />
                                <RenderField label="Tanggal Lahir" value={student.birthDate} fieldKey="birthDate" type="date" />
                                <RenderField label="Agama" value={student.religion} fieldKey="religion" />
                                <RenderField label="Kewarganegaraan" value={student.nationality} fieldKey="nationality" />
                                <RenderField label="Kelas Saat Ini" value={student.className} fieldKey="className" />
                                <RenderField label="Tahun Masuk" value={student.entryYear} fieldKey="entryYear" />
                                <RenderField label="Status Siswa" value={student.status} fieldKey="status" />
                                <RenderField label="Berkebutuhan Khusus" value={student.dapodik?.specialNeeds} fieldKey="dapodik.specialNeeds" />
                                <RenderField label="Sekolah Asal" value={student.previousSchool} fieldKey="previousSchool" fullWidth />
                            </div>
                        </div>
                    )}

                    {/* SECTION 2: ALAMAT */}
                    {activeTab === 'ADDRESS' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="border-b pb-2 mb-4"><h3 className="font-bold text-gray-800 text-lg">Alamat & Domisili</h3></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <RenderField label="Alamat Jalan" value={student.address} fieldKey="address" fullWidth />
                                <div className="grid grid-cols-3 gap-4 col-span-full md:col-span-2">
                                    <RenderField label="RT" value={student.dapodik?.rt} fieldKey="dapodik.rt" />
                                    <RenderField label="RW" value={student.dapodik?.rw} fieldKey="dapodik.rw" />
                                    <RenderField label="Kode Pos" value={student.postalCode} fieldKey="postalCode" />
                                </div>
                                <RenderField label="Dusun" value={student.dapodik?.dusun} fieldKey="dapodik.dusun" />
                                <RenderField label="Kelurahan / Desa" value={student.dapodik?.kelurahan} fieldKey="dapodik.kelurahan" />
                                <RenderField label="Kecamatan" value={student.subDistrict} fieldKey="subDistrict" />
                                <RenderField label="Kabupaten / Kota" value={student.district} fieldKey="district" />
                                <RenderField label="Lintang" value={student.dapodik?.latitude} fieldKey="dapodik.latitude" />
                                <RenderField label="Bujur" value={student.dapodik?.longitude} fieldKey="dapodik.longitude" />
                                <RenderField label="Jenis Tinggal" value={student.dapodik?.livingStatus} fieldKey="dapodik.livingStatus" />
                                <RenderField label="Transportasi" value={student.dapodik?.transportation} fieldKey="dapodik.transportation" />
                                <RenderField label="No KK" value={student.dapodik?.noKK} fieldKey="dapodik.noKK" fullWidth />
                            </div>
                        </div>
                    )}

                    {/* SECTION 3: ORANG TUA */}
                    {activeTab === 'PARENTS' && (
                        <div className="space-y-8 animate-fade-in">
                            {/* AYAH */}
                            <div>
                                <div className="border-b pb-2 mb-4"><h3 className="font-bold text-blue-800 text-lg">Data Ayah Kandung</h3></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <RenderField label="Nama Ayah" value={student.father.name} fieldKey="father.name" fullWidth />
                                    <RenderField label="NIK Ayah" value={student.father.nik} fieldKey="father.nik" />
                                    <RenderField label="Tahun Lahir" value={student.father.birthPlaceDate} fieldKey="father.birthPlaceDate" />
                                    <RenderField label="Pendidikan" value={student.father.education} fieldKey="father.education" />
                                    <RenderField label="Pekerjaan" value={student.father.job} fieldKey="father.job" />
                                    <RenderField label="Penghasilan" value={student.father.income} fieldKey="father.income" />
                                    <RenderField label="No Handphone" value={student.father.phone} fieldKey="father.phone" />
                                </div>
                            </div>

                            {/* IBU */}
                            <div>
                                <div className="border-b pb-2 mb-4"><h3 className="font-bold text-pink-800 text-lg">Data Ibu Kandung</h3></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <RenderField label="Nama Ibu" value={student.mother.name} fieldKey="mother.name" fullWidth />
                                    <RenderField label="NIK Ibu" value={student.mother.nik} fieldKey="mother.nik" />
                                    <RenderField label="Tahun Lahir" value={student.mother.birthPlaceDate} fieldKey="mother.birthPlaceDate" />
                                    <RenderField label="Pendidikan" value={student.mother.education} fieldKey="mother.education" />
                                    <RenderField label="Pekerjaan" value={student.mother.job} fieldKey="mother.job" />
                                    <RenderField label="Penghasilan" value={student.mother.income} fieldKey="mother.income" />
                                    <RenderField label="No Handphone" value={student.mother.phone} fieldKey="mother.phone" />
                                </div>
                            </div>

                            {/* WALI */}
                            <div>
                                <div className="border-b pb-2 mb-4"><h3 className="font-bold text-gray-600 text-lg">Data Wali (Opsional)</h3></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <RenderField label="Nama Wali" value={student.guardian?.name} fieldKey="guardian.name" fullWidth />
                                    <RenderField label="NIK Wali" value={student.guardian?.nik} fieldKey="guardian.nik" />
                                    <RenderField label="Tahun Lahir" value={student.guardian?.birthPlaceDate} fieldKey="guardian.birthPlaceDate" />
                                    <RenderField label="Pendidikan" value={student.guardian?.education} fieldKey="guardian.education" />
                                    <RenderField label="Pekerjaan" value={student.guardian?.job} fieldKey="guardian.job" />
                                    <RenderField label="Penghasilan" value={student.guardian?.income} fieldKey="guardian.income" />
                                    <RenderField label="No Handphone" value={student.guardian?.phone} fieldKey="guardian.phone" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 4: PERIODIK */}
                    {activeTab === 'PERIODIK' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="border-b pb-2 mb-4"><h3 className="font-bold text-gray-800 text-lg">Data Periodik</h3></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <RenderField label="Tinggi Badan (cm)" value={student.height} fieldKey="height" />
                                <RenderField label="Berat Badan (kg)" value={student.weight} fieldKey="weight" />
                                <RenderField label="Lingkar Kepala (cm)" value={student.dapodik?.headCircumference} fieldKey="dapodik.headCircumference" />
                                <RenderField label="Golongan Darah" value={student.bloodType} fieldKey="bloodType" />
                                <RenderField label="Jumlah Saudara Kandung" value={student.siblingCount} fieldKey="siblingCount" />
                                <RenderField label="Anak Ke-berapa" value={student.childOrder} fieldKey="childOrder" />
                                <RenderField label="Jarak ke Sekolah (km)" value={student.dapodik?.distanceToSchool} fieldKey="dapodik.distanceToSchool" />
                                <RenderField label="Waktu Tempuh (menit)" value={student.dapodik?.travelTimeMinutes} fieldKey="dapodik.travelTimeMinutes" />
                            </div>
                        </div>
                    )}

                    {/* SECTION 5: KESEJAHTERAAN */}
                    {activeTab === 'WELFARE' && (
                        <div className="space-y-8 animate-fade-in">
                            <div>
                                <div className="border-b pb-2 mb-4"><h3 className="font-bold text-gray-800 text-lg">Kartu Kesejahteraan & Registrasi</h3></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <RenderField label="No SKHUN" value={student.dapodik?.skhun} fieldKey="dapodik.skhun" />
                                    <RenderField label="No Peserta UN" value={student.dapodik?.unExamNumber} fieldKey="dapodik.unExamNumber" />
                                    <RenderField label="No Seri Ijazah (SD)" value={student.diplomaNumber} fieldKey="diplomaNumber" />
                                    <RenderField label="No Registrasi Akta Lahir" value={student.dapodik?.birthRegNumber} fieldKey="dapodik.birthRegNumber" />
                                    <RenderField label="Nomor KKS" value={student.dapodik?.kksNumber} fieldKey="dapodik.kksNumber" />
                                    <RenderField label="Penerima KPS/KPH" value={student.dapodik?.kpsReceiver} fieldKey="dapodik.kpsReceiver" />
                                    <RenderField label="Nomor KPS" value={student.dapodik?.kpsNumber} fieldKey="dapodik.kpsNumber" />
                                    <RenderField label="Email Pribadi" value={student.dapodik?.email} fieldKey="dapodik.email" fullWidth />
                                </div>
                            </div>

                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                                <h4 className="font-bold text-yellow-800 mb-4 uppercase">Program Indonesia Pintar (PIP)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <RenderField label="Penerima KIP" value={student.dapodik?.kipReceiver} fieldKey="dapodik.kipReceiver" />
                                    <RenderField label="Nomor KIP" value={student.dapodik?.kipNumber} fieldKey="dapodik.kipNumber" />
                                    <RenderField label="Nama tertera di KIP" value={student.dapodik?.kipName} fieldKey="dapodik.kipName" />
                                    <RenderField label="Layak PIP (Usulan)" value={student.dapodik?.pipEligible} fieldKey="dapodik.pipEligible" />
                                    <RenderField label="Alasan Layak PIP" value={student.dapodik?.pipReason} fieldKey="dapodik.pipReason" fullWidth />
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                                <h4 className="font-bold text-blue-800 mb-4 uppercase">Data Rekening Bank (PIP)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <RenderField label="Nama Bank" value={student.dapodik?.bank} fieldKey="dapodik.bank" />
                                    <RenderField label="Nomor Rekening" value={student.dapodik?.bankAccount} fieldKey="dapodik.bankAccount" />
                                    <RenderField label="Rekening Atas Nama" value={student.dapodik?.bankAccountName} fieldKey="dapodik.bankAccountName" fullWidth />
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
       </div>
    </div>
  );
};

export default StudentDetail;
