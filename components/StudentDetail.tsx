import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Save, Pencil, AlertTriangle, X, CheckCircle2, XCircle, MessageSquare, Loader2, FileText, ListChecks, AlertCircle } from 'lucide-react';
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

const StudentDetail: React.FC<StudentDetailProps> = ({ student, onBack, viewMode, readOnly = false, highlightFieldKey, onUpdate, onSave, currentUser }) => {
  // Correction State
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [targetField, setTargetField] = useState<{key: string, label: string, currentValue: string} | null>(null);
  const [proposedValue, setProposedValue] = useState('');
  const [studentReason, setStudentReason] = useState('');
  
  // Rejection Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [requestToReject, setRequestToReject] = useState<CorrectionRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Auto-scroll logic
  useEffect(() => {
    if (highlightFieldKey) {
        setTimeout(() => {
            const element = document.getElementById(`field-${highlightFieldKey}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('ring-2', 'ring-blue-500');
                setTimeout(() => element.classList.remove('ring-2', 'ring-blue-500'), 2500);
            }
        }, 300);
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
          if (current[lastKey] !== undefined && typeof current[lastKey] === 'number') {
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
            {isPending && (<div className="flex gap-2 justify-end pt-2 border-t border-gray-100"><button onClick={() => openRejectModal(req)} disabled={isProcessing === req.id} className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded text-xs font-bold hover:bg-red-50 flex items-center gap-1"><XCircle className="w-3 h-3" /> Tolak</button><button onClick={() => handleVerifyRequest(req, 'APPROVED')} disabled={isProcessing === req.id} className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 flex items-center gap-1 shadow-sm">{isProcessing === req.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <CheckCircle2 className="w-3 h-3" />} Setujui</button></div>)}
        </div>
      );
  };

  // --- FORM COMPONENT FOR BUKU INDUK LAYOUT ---
  const FormField = ({ label, value, fieldKey, labelCol = "w-1/3", valueCol = "flex-1", className = "", labelClassName = "" }: any) => {
      const displayValue = (value !== null && value !== undefined && value !== '') ? value : '-';
      const stringValue = String(displayValue);
      const pendingReq = fieldKey ? student.correctionRequests?.find(r => r.fieldKey === fieldKey && r.status === 'PENDING') : null;
      
      const isInteractive = readOnly && fieldKey && !pendingReq; // readOnly prop here means "Student View" where they can click to edit

      return (
        <div id={fieldKey ? `field-${fieldKey}` : undefined} className={`flex border-b border-gray-300 min-h-[20px] ${className}`}>
            <div className={`${labelCol} px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px] flex items-center ${labelClassName}`}>
                {label}
            </div>
            <div 
                className={`
                    ${valueCol} px-1.5 py-0.5 text-[9px] font-medium flex items-center uppercase leading-tight relative group transition-colors
                    ${pendingReq ? 'bg-yellow-100 text-yellow-800' : 'bg-transparent'}
                    ${isInteractive ? 'cursor-pointer hover:bg-blue-50' : ''}
                `}
                onClick={() => isInteractive && handleOpenCorrection(fieldKey, label, stringValue)}
                title={isInteractive ? "Klik untuk mengajukan perbaikan" : ""}
            >
                <span className="flex-1">{pendingReq ? pendingReq.proposedValue : stringValue}</span>
                
                {pendingReq && <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-300 shadow-sm"><span className="text-[8px] font-bold">Menunggu</span><Loader2 className="w-2 h-2 animate-spin"/></div>}
                
                {isInteractive && (
                    <Pencil className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 absolute right-1 top-1/2 -translate-y-1/2" />
                )}
            </div>
        </div>
      );
  };

  const SubHeader = ({ children }: { children?: React.ReactNode }) => (
    <div className="bg-gray-200 px-2 py-0.5 text-[9px] font-bold border-y border-gray-400 text-center uppercase mt-1">
        {children}
    </div>
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
      
      {/* Correction Modal */}
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
                          <input className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={proposedValue} onChange={(e) => setProposedValue(e.target.value)} autoFocus />
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

      {/* Rejection Modal */}
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
       <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
                 <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                 <div>
                     <h2 className="text-lg font-bold text-gray-800">Buku Induk Siswa</h2>
                     <p className="text-xs text-gray-500">{student.fullName} • {student.className}</p>
                 </div>
            </div>
            {readOnly ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                    <FileText className="w-3 h-3" />
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

       {/* Scrollable Content */}
       <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/50 flex flex-col md:flex-row gap-6 justify-center pb-32">
            
            {/* Admin Side Panel for Pending Requests */}
            {!readOnly && allRequests.length > 0 && (
                <div className="w-full md:w-80 md:sticky md:top-0 h-fit space-y-3">
                    <div className="flex items-center gap-2 text-gray-700 font-bold text-sm mb-2 px-1 bg-white p-2 rounded shadow-sm border border-gray-100">
                        <ListChecks className="w-4 h-4" /> Riwayat Perubahan
                    </div>
                    {allRequests.map(req => renderRequestCard(req))}
                </div>
            )}

            <div className="w-full max-w-[800px]">
                {/* FORMULIR LAYOUT - EXACTLY LIKE ADMIN VERIFICATION VIEW */}
                <div className="bg-white p-5 border border-gray-200 shadow-sm text-gray-800">
                    
                    <div className="border-2 border-gray-800 p-1 mb-2 bg-gray-800 text-white text-center">
                        <h1 className="text-sm font-black tracking-widest uppercase">FORMULIR PESERTA DIDIK</h1>
                    </div>

                    {/* SECTION 1: IDENTITAS */}
                    <SubHeader>IDENTITAS PESERTA DIDIK</SubHeader>
                    <div className="border-x border-t border-gray-300 mt-1">
                        <FormField 
                            label="KELAS SAAT INI" 
                            value={student.className} 
                            fieldKey="className"
                            className="bg-yellow-50 border-b-2 border-yellow-200"
                            labelClassName="font-bold text-yellow-800 bg-yellow-100"
                        />
                        <FormField label="1. Nama Lengkap" value={student.fullName} fieldKey="fullName" />
                        <FormField label="2. Jenis Kelamin" value={student.gender === 'L' ? 'Laki-Laki' : 'Perempuan'} fieldKey="gender" />
                        <div className="flex border-b border-gray-300 min-h-[20px]">
                            <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">3. NISN</div>
                            <div className="w-1/3 px-1.5 py-0.5 text-[9px] font-medium uppercase bg-white">
                                {student.nisn}
                            </div>
                            <div className="w-12 px-1.5 py-0.5 bg-gray-100 border-x border-gray-300 text-[9px] font-bold">NIS :</div>
                            <div className="flex-1 px-1.5 py-0.5 text-[9px] font-bold bg-white">
                                {student.nis}
                            </div>
                        </div>
                        <FormField label="4. No Seri Ijazah" value={student.diplomaNumber} fieldKey="diplomaNumber" />
                        <FormField label="5. No Seri SKHUN" value={student.dapodik.skhun} fieldKey="dapodik.skhun" />
                        <FormField label="6. No. Ujian Nasional" value={student.dapodik.unExamNumber} fieldKey="dapodik.unExamNumber" />
                        <FormField label="7. NIK" value={student.dapodik.nik} fieldKey="dapodik.nik" />
                        <FormField label="NPSN Sekolah Asal" value={student.previousSchool ? "20502873" : "-"} />
                        <FormField label="Nama Sekolah Asal" value={student.previousSchool} fieldKey="previousSchool" />
                        <FormField label="8. Tempat, Tgl Lahir" value={`${student.birthPlace}, ${student.birthDate}`} fieldKey="birthPlace" />
                        <FormField label="9. Agama" value={student.religion} fieldKey="religion" />
                        <FormField label="10. Berkebutuhan Khusus" value={student.dapodik.specialNeeds} fieldKey="dapodik.specialNeeds" />
                        <FormField label="11. Alamat Tempat Tinggal" value={student.address} fieldKey="address" />
                        <div className="flex border-b border-gray-300 min-h-[20px]">
                               <div className="w-1/3 flex flex-col">
                                   <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[8px] italic"> - Dusun</div>
                                   <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[8px] italic"> - Kelurahan / Desa</div>
                                   <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[8px] italic"> - Kecamatan</div>
                                   <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[8px] italic"> - Kabupaten / Kota</div>
                               </div>
                               <div className="w-1/3 flex flex-col border-x border-gray-300">
                                   <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[9px] uppercase">{student.dapodik.dusun}</div>
                                   <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[9px] uppercase">{student.dapodik.kelurahan}</div>
                                   <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[9px] uppercase">{student.subDistrict}</div>
                                   <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[9px] uppercase">{student.district}</div>
                               </div>
                               <div className="flex-1 flex flex-col">
                                   <div className="flex border-b border-gray-200 h-1/3">
                                        <div className="w-10 px-1 py-0.5 bg-gray-50 border-r border-gray-300 text-[8px] font-bold">RT:</div>
                                        <div className="flex-1 px-1 py-0.5 text-[9px]">{student.dapodik.rt}</div>
                                        <div className="w-10 px-1 py-0.5 bg-gray-50 border-x border-gray-300 text-[8px] font-bold">RW:</div>
                                        <div className="flex-1 px-1 py-0.5 text-[9px]">{student.dapodik.rw}</div>
                                   </div>
                                   <div className="flex border-b border-gray-200 h-1/3">
                                        <div className="w-20 px-1 py-0.5 bg-gray-50 border-r border-gray-300 text-[8px] font-bold">Kode Pos</div>
                                        <div className="flex-1 px-1 py-0.5 text-[9px]">{student.postalCode}</div>
                                   </div>
                               </div>
                        </div>
                        <FormField label="12. Transportasi" value={student.dapodik.transportation} fieldKey="dapodik.transportation" />
                        <FormField label="13. Jenis Tinggal" value={student.dapodik.livingStatus} fieldKey="dapodik.livingStatus" />
                        <div className="flex border-b border-gray-300 min-h-[20px]">
                              <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">14. No. Telp Rumah</div>
                              <div className="w-1/3 px-1.5 py-0.5 text-[9px] font-medium uppercase">-</div>
                              <div className="w-12 px-1.5 py-0.5 bg-gray-100 border-x border-gray-300 text-[9px] font-bold">HP :</div>
                              <div className="flex-1 px-1.5 py-0.5 text-[9px] bg-white">{student.father.phone || student.mother.phone || '-'}</div>
                        </div>
                        <FormField label="15. Email" value={student.dapodik.email} fieldKey="dapodik.email" />
                        <FormField label="16. No. KKS" value={student.dapodik.kksNumber} fieldKey="dapodik.kksNumber" />
                        <FormField label="17. Penerima KPS/KPH" value={student.dapodik.kpsReceiver} fieldKey="dapodik.kpsReceiver" />
                        <FormField label=" - No. KPS" value={student.dapodik.kpsNumber} fieldKey="dapodik.kpsNumber" />
                        <FormField label=" - Usulan PIP" value={student.dapodik.pipEligible} fieldKey="dapodik.pipEligible" />
                        <FormField label=" - Penerima PIP" value={student.dapodik.kipReceiver} fieldKey="dapodik.kipReceiver" />
                        <FormField label=" - No. KIP" value={student.dapodik.kipNumber} fieldKey="dapodik.kipNumber" />
                        <FormField label=" - Nama di KIP" value={student.dapodik.kipName} fieldKey="dapodik.kipName" />
                        <FormField label=" - No Reg Akta Lahir" value={student.dapodik.birthRegNumber} fieldKey="dapodik.birthRegNumber" />
                    </div>

                    {/* SECTION 2: DATA AYAH */}
                    <SubHeader>DATA AYAH KANDUNG</SubHeader>
                    <div className="border-x border-t border-gray-300">
                        <FormField label="18. Nama Ayah" value={student.father.name} fieldKey="father.name" className="font-bold" />
                        <FormField label=" - NIK Ayah" value={student.father.nik} fieldKey="father.nik" />
                        <FormField label=" - Tahun Lahir" value={student.father.birthPlaceDate} fieldKey="father.birthPlaceDate" />
                        <FormField label=" - Pekerjaan" value={student.father.job} fieldKey="father.job" />
                        <FormField label=" - Pendidikan" value={student.father.education} fieldKey="father.education" />
                        <FormField label=" - Penghasilan" value={student.father.income} fieldKey="father.income" />
                    </div>

                    {/* SECTION 3: DATA IBU */}
                    <SubHeader>DATA IBU KANDUNG</SubHeader>
                    <div className="border-x border-t border-gray-300">
                        <FormField label="19. Nama Ibu" value={student.mother.name} fieldKey="mother.name" className="font-bold" />
                        <FormField label=" - NIK Ibu" value={student.mother.nik} fieldKey="mother.nik" />
                        <FormField label=" - Tahun Lahir" value={student.mother.birthPlaceDate} fieldKey="mother.birthPlaceDate" />
                        <FormField label=" - Pekerjaan" value={student.mother.job} fieldKey="mother.job" />
                        <FormField label=" - Pendidikan" value={student.mother.education} fieldKey="mother.education" />
                        <FormField label=" - Penghasilan" value={student.mother.income} fieldKey="mother.income" />
                    </div>

                    {/* SECTION 4: DATA WALI */}
                    <SubHeader>DATA WALI</SubHeader>
                    <div className="border-x border-t border-gray-300">
                        <FormField label="20. Nama Wali" value={student.guardian?.name || '-'} fieldKey="guardian.name" />
                        <FormField label=" - NIK Wali" value={student.guardian?.nik || '-'} fieldKey="guardian.nik" />
                        <FormField label=" - Tahun Lahir" value={student.guardian?.birthPlaceDate || '-'} fieldKey="guardian.birthPlaceDate" />
                        <FormField label=" - Pekerjaan" value={student.guardian?.job || '-'} fieldKey="guardian.job" />
                        <FormField label=" - Pendidikan" value={student.guardian?.education || '-'} fieldKey="guardian.education" />
                        <FormField label=" - Penghasilan" value={student.guardian?.income || '-'} fieldKey="guardian.income" />
                    </div>

                    {/* SECTION 5: PERIODIK */}
                    <SubHeader>DATA PERIODIK</SubHeader>
                    <div className="border border-gray-300 mt-1">
                        <div className="flex border-b border-gray-300 h-6">
                            <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px] flex items-center">21. Tinggi Badan</div>
                            <div className="w-20 px-1.5 py-0.5 text-[9px] font-bold flex items-center justify-center bg-white border-r border-gray-300">{student.height}</div>
                            <div className="flex-1 px-1.5 py-0.5 text-[9px] flex items-center">cm</div>
                        </div>
                        <div className="flex border-b border-gray-300 h-6">
                            <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px] flex items-center">Berat Badan</div>
                            <div className="w-20 px-1.5 py-0.5 text-[9px] font-bold flex items-center justify-center bg-white border-r border-gray-300">{student.weight}</div>
                            <div className="flex-1 px-1.5 py-0.5 text-[9px] flex items-center">kg</div>
                        </div>
                        <div className="flex border-b border-gray-300 h-6">
                            <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px] flex items-center">22. Jarak Ke Sekolah</div>
                            <div className="flex-1 px-1.5 py-0.5 text-[9px] font-bold bg-white">{student.dapodik.distanceToSchool} Km</div>
                        </div>
                        <div className="flex h-6">
                            <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px] flex items-center">23. Waktu Tempuh</div>
                            <div className="flex-1 px-1.5 py-0.5 text-[9px] font-bold bg-white">{student.dapodik.travelTimeMinutes} Menit</div>
                        </div>
                    </div>
                </div>
            </div>
       </div>
    </div>
  );
};

export default StudentDetail;