import React, { useState, useEffect, useMemo } from 'react';
import { Student, CorrectionRequest } from '../types';
import { Search, Filter, AlertCircle, CheckCircle2, XCircle, Save, Loader2, UserCheck, X, Pencil, ListChecks } from 'lucide-react';
import { api } from '../services/api';

interface VerificationViewProps {
  students: Student[];
  targetStudentId?: string;
  onUpdate?: () => void;
  onSave?: (student: Student) => void;
  currentUser?: { name: string; role: string };
}

const VerificationView: React.FC<VerificationViewProps> = ({ students, targetStudentId, onUpdate, onSave, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  // Verification State
  const [adminVerifyModalOpen, setAdminVerifyModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CorrectionRequest | null>(null);
  const [adminResponseNote, setAdminResponseNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Student | null>(null);

  // Force Update to refresh view
  const [forceUpdate, setForceUpdate] = useState(0);

  // Derived Data
  const uniqueClasses = useMemo(() => {
      return Array.from(new Set(students.map(s => s.className))).sort();
  }, [students]);

  useEffect(() => {
      if (!selectedClassFilter && uniqueClasses.length > 0) {
          setSelectedClassFilter(uniqueClasses[0]);
      }
  }, [uniqueClasses]);

  const filteredStudents = useMemo(() => {
      let filtered = students;
      if (selectedClassFilter) filtered = filtered.filter(s => s.className === selectedClassFilter);
      if (searchTerm) filtered = filtered.filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.nisn.includes(searchTerm));
      return filtered.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [students, searchTerm, selectedClassFilter]);

  // Auto-select target or first student
  useEffect(() => {
      if (targetStudentId) {
          const target = students.find(s => s.id === targetStudentId);
          if (target) {
              setSelectedClassFilter(target.className);
              setSelectedStudentId(target.id);
          }
      } else if (filteredStudents.length > 0 && !selectedStudentId) {
          setSelectedStudentId(filteredStudents[0].id);
      } else if (filteredStudents.length === 0) {
          setSelectedStudentId('');
      }
  }, [targetStudentId, filteredStudents, selectedStudentId]);

  const currentStudent = students.find(s => s.id === selectedStudentId);

  // Filter requests relevant to Bio Data (exclude grades/class which are in GradeVerificationView)
  const relevantRequests = useMemo(() => {
      if (!currentStudent?.correctionRequests) return [];
      return currentStudent.correctionRequests.filter(r => 
          !r.fieldKey.startsWith('grade-') && 
          !r.fieldKey.startsWith('class-')
      ).sort((a, b) => {
          if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
          if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
          return new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime();
      });
  }, [currentStudent]);

  // Handlers
  const handleAdminVerifyClick = (request: CorrectionRequest) => {
      setSelectedRequest(request);
      setAdminResponseNote(request.adminNote || '');
      setAdminVerifyModalOpen(true);
  };

  const processVerification = async (action: 'APPROVED' | 'REJECTED') => {
      if (!currentStudent || !selectedRequest) return;
      
      if (action === 'REJECTED' && !adminResponseNote.trim()) {
          alert("Mohon isi alasan penolakan.");
          return;
      }

      setIsSaving(true);

      // Clone student to avoid direct mutation
      const updatedStudent = JSON.parse(JSON.stringify(currentStudent));
      
      // Update Request Status
      updatedStudent.correctionRequests = updatedStudent.correctionRequests.map((req: CorrectionRequest) => {
          if (req.id === selectedRequest.id) {
              return {
                  ...req,
                  status: action,
                  adminNote: adminResponseNote || (action === 'APPROVED' ? 'Disetujui.' : 'Ditolak.'),
                  verifierName: currentUser?.name || 'Admin',
                  processedDate: new Date().toISOString()
              };
          }
          return req;
      });

      // Apply Data Changes if Approved
      if (action === 'APPROVED') {
          const { fieldKey, proposedValue } = selectedRequest;
          const keys = fieldKey.split('.');
          let current: any = updatedStudent;
          
          for (let i = 0; i < keys.length - 1; i++) {
               if (!current[keys[i]]) current[keys[i]] = {};
               current = current[keys[i]];
          }
          
          const lastKey = keys[keys.length - 1];
          // Type safety
          if (typeof current[lastKey] === 'number') {
              current[lastKey] = Number(proposedValue);
          } else {
              current[lastKey] = proposedValue;
          }
      }

      try {
          if (onSave) {
              await onSave(updatedStudent);
          } else {
              await api.updateStudent(updatedStudent);
              if (onUpdate) onUpdate();
          }
          
          setAdminVerifyModalOpen(false);
          setForceUpdate(prev => prev + 1);
      } catch (e) {
          alert("Gagal menyimpan perubahan.");
          console.error(e);
      } finally {
          setIsSaving(false);
      }
  };

  // Edit Handlers
  const startEdit = () => {
      if (currentStudent) {
          setEditFormData(JSON.parse(JSON.stringify(currentStudent)));
          setIsEditing(true);
      }
  };

  const cancelEdit = () => {
      setIsEditing(false);
      setEditFormData(null);
  };

  const saveEdit = async () => {
      if (!editFormData) return;
      setIsSaving(true);
      try {
          if (onSave) {
              await onSave(editFormData);
          } else {
              await api.updateStudent(editFormData);
              if (onUpdate) onUpdate();
          }
          setIsEditing(false);
          setEditFormData(null);
      } catch (e) {
          console.error(e);
          alert("Gagal menyimpan data.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleInputChange = (fieldKey: string, value: string) => {
      if (!editFormData) return;
      const keys = fieldKey.split('.');
      const newData = { ...editFormData };
      let current: any = newData;
      for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {};
          current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      setEditFormData(newData);
  };

  const getNestedValue = (obj: any, path: string) => {
      if (!path) return '';
      return path.split('.').reduce((o, i) => (o ? o[i] : ''), obj);
  };

  // Form Field Component
  const FormField = ({ label, value, fieldKey }: { label: string, value: string | number | undefined, fieldKey?: string }) => {
      const pendingReq = fieldKey ? currentStudent?.correctionRequests?.find(r => r.fieldKey === fieldKey && r.status === 'PENDING') : null;
      const displayValue = isEditing && editFormData && fieldKey ? getNestedValue(editFormData, fieldKey) : value;

      return (
        <div className="flex flex-col border-b border-gray-100 py-2">
            <span className="text-[10px] uppercase font-bold text-gray-400">{label}</span>
            <div className="flex items-center gap-2 w-full">
                {isEditing && fieldKey ? (
                    <input 
                        type="text" 
                        className="w-full text-sm font-bold bg-blue-50 border-b border-blue-300 outline-none text-blue-900 px-1"
                        value={displayValue || ''}
                        onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                    />
                ) : (
                    <span className={`text-sm font-semibold ${pendingReq ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {value !== undefined && value !== null ? value : '-'}
                    </span>
                )}
                
                {pendingReq && !isEditing && (
                    <div 
                        className="flex items-center gap-1 bg-yellow-100 px-2 py-0.5 rounded border border-yellow-300 cursor-pointer animate-pulse ml-auto"
                        onClick={() => handleAdminVerifyClick(pendingReq)}
                        title="Klik untuk verifikasi"
                    >
                        <span className="text-xs font-bold text-yellow-800">{pendingReq.proposedValue}</span>
                        <AlertCircle className="w-3 h-3 text-yellow-700" />
                    </div>
                )}
            </div>
        </div>
      );
  };

  return (
    <div className="flex flex-col h-full animate-fade-in relative">
        {/* Verification Modal */}
        {adminVerifyModalOpen && selectedRequest && (
            <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform scale-100 transition-all">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-lg font-bold text-gray-800">Verifikasi Data</h3>
                        <button onClick={() => setAdminVerifyModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Item Perubahan</p>
                            <p className="text-sm font-semibold text-gray-800">{selectedRequest.fieldName}</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="flex-1 p-3 bg-red-50 border border-red-100 rounded-lg">
                                <p className="text-[10px] text-red-500 font-bold uppercase">Lama</p>
                                <p className="text-sm font-bold text-gray-700 line-through decoration-red-400">{selectedRequest.originalValue}</p>
                            </div>
                            <div className="flex-1 p-3 bg-green-50 border border-green-100 rounded-lg">
                                <p className="text-[10px] text-green-600 font-bold uppercase">Baru</p>
                                <p className="text-sm font-bold text-gray-800">{selectedRequest.proposedValue}</p>
                            </div>
                        </div>

                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                            <p className="text-xs font-bold text-yellow-700 uppercase mb-1">Alasan</p>
                            <p className="text-sm text-gray-700 italic">"{selectedRequest.studentReason}"</p>
                        </div>

                        {selectedRequest.status === 'PENDING' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Catatan (Opsional)</label>
                                <textarea 
                                    className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    rows={2}
                                    placeholder="Alasan penolakan..."
                                    value={adminResponseNote}
                                    onChange={(e) => setAdminResponseNote(e.target.value)}
                                />
                            </div>
                        )}
                        
                        {selectedRequest.status !== 'PENDING' && (
                             <div className={`p-3 rounded-lg border ${selectedRequest.status === 'APPROVED' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <p className={`text-xs font-bold uppercase mb-1 ${selectedRequest.status === 'APPROVED' ? 'text-green-700' : 'text-red-700'}`}>
                                    Status: {selectedRequest.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
                                </p>
                                <p className="text-sm text-gray-700 italic">"{selectedRequest.adminNote}"</p>
                            </div>
                        )}
                    </div>

                    {selectedRequest.status === 'PENDING' && (
                        <div className="flex gap-2">
                            <button onClick={() => processVerification('REJECTED')} disabled={isSaving} className="flex-1 py-2 bg-white border border-red-200 text-red-600 font-bold rounded-lg text-sm hover:bg-red-50 flex items-center justify-center gap-2">
                                <XCircle className="w-4 h-4" /> Tolak
                            </button>
                            <button onClick={() => processVerification('APPROVED')} disabled={isSaving} className="flex-1 py-2 bg-green-600 text-white font-bold rounded-lg text-sm hover:bg-green-700 flex items-center justify-center gap-2">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Setujui
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Header Controls */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-blue-600" />
                Verifikasi Buku Induk
            </h2>
            <div className="flex gap-2 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer w-24 md:w-auto" value={selectedClassFilter} onChange={(e) => setSelectedClassFilter(e.target.value)}>
                        {uniqueClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)}
                    </select>
                </div>
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="text" placeholder="Cari Siswa..." className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:bg-white transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <select className="pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 w-full md:w-auto" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                    {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                </select>
            </div>
        </div>

        {/* Content */}
        {currentStudent ? (
            <div className="flex-1 flex gap-4 overflow-hidden">
                {/* Left Panel: Request List */}
                <div className="w-80 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-600 flex items-center gap-2">
                            <ListChecks className="w-4 h-4" /> Pengajuan ({relevantRequests.length})
                        </span>
                        {isEditing ? (
                            <div className="flex gap-1">
                                <button onClick={saveEdit} disabled={isSaving} className="p-1 text-green-600 hover:bg-green-100 rounded" title="Simpan"><Save className="w-4 h-4" /></button>
                                <button onClick={cancelEdit} className="p-1 text-gray-600 hover:bg-gray-100 rounded" title="Batal"><X className="w-4 h-4" /></button>
                            </div>
                        ) : (
                            <button onClick={startEdit} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Edit Data"><Pencil className="w-4 h-4" /></button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
                        {relevantRequests.length > 0 ? (
                            relevantRequests.map(req => (
                                <div 
                                    key={req.id} 
                                    onClick={() => handleAdminVerifyClick(req)}
                                    className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${req.status === 'PENDING' ? 'bg-white border-yellow-300' : 'bg-gray-100 border-gray-200 opacity-80'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-xs font-bold text-gray-800 line-clamp-1">{req.fieldName}</p>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : req.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {req.status}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-gray-500 flex gap-1 items-center">
                                        <span className="line-through max-w-[40%] truncate">{req.originalValue}</span>
                                        <span>➔</span>
                                        <span className="font-bold text-gray-700 truncate">{req.proposedValue}</span>
                                    </div>
                                    <p className="text-[9px] text-gray-400 mt-1 italic">{new Date(req.requestDate).toLocaleDateString()}</p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-400 text-xs">
                                Tidak ada pengajuan perubahan data.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Student Detail (Editable) */}
                <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-y-auto p-6">
                    <div className="mb-6 flex justify-between items-start border-b pb-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">{currentStudent.fullName}</h2>
                            <p className="text-sm text-gray-500">{currentStudent.nisn} | Kelas {currentStudent.className}</p>
                        </div>
                        <div className="text-right">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${currentStudent.status === 'AKTIF' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                {currentStudent.status}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <section>
                            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 bg-blue-50 p-2 rounded">Identitas Peserta Didik</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                <FormField label="Nama Lengkap" value={currentStudent.fullName} fieldKey="fullName" />
                                <FormField label="NISN" value={currentStudent.nisn} fieldKey="nisn" />
                                <FormField label="NIS" value={currentStudent.nis} fieldKey="nis" />
                                <FormField label="NIK" value={currentStudent.dapodik.nik} fieldKey="dapodik.nik" />
                                <FormField label="Tempat Lahir" value={currentStudent.birthPlace} fieldKey="birthPlace" />
                                <FormField label="Tanggal Lahir" value={currentStudent.birthDate} fieldKey="birthDate" />
                                <FormField label="Jenis Kelamin" value={currentStudent.gender} fieldKey="gender" />
                                <FormField label="Agama" value={currentStudent.religion} fieldKey="religion" />
                                <FormField label="Alamat" value={currentStudent.address} fieldKey="address" />
                                <FormField label="Dusun" value={currentStudent.dapodik.dusun} fieldKey="dapodik.dusun" />
                                <FormField label="Kelurahan" value={currentStudent.dapodik.kelurahan} fieldKey="dapodik.kelurahan" />
                                <FormField label="Kecamatan" value={currentStudent.subDistrict} fieldKey="subDistrict" />
                                <FormField label="Kabupaten" value={currentStudent.district} fieldKey="district" />
                                <FormField label="Kode Pos" value={currentStudent.postalCode} fieldKey="postalCode" />
                            </div>
                        </section>

                        <section>
                            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 bg-blue-50 p-2 rounded">Data Orang Tua / Wali</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                <FormField label="Nama Ayah" value={currentStudent.father.name} fieldKey="father.name" />
                                <FormField label="NIK Ayah" value={currentStudent.father.nik} fieldKey="father.nik" />
                                <FormField label="Pekerjaan Ayah" value={currentStudent.father.job} fieldKey="father.job" />
                                <FormField label="Nama Ibu" value={currentStudent.mother.name} fieldKey="mother.name" />
                                <FormField label="NIK Ibu" value={currentStudent.mother.nik} fieldKey="mother.nik" />
                                <FormField label="Pekerjaan Ibu" value={currentStudent.mother.job} fieldKey="mother.job" />
                                <FormField label="No HP Ortu" value={currentStudent.father.phone} fieldKey="father.phone" />
                            </div>
                        </section>

                        <section>
                            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 bg-blue-50 p-2 rounded">Data Lainnya</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                <FormField label="SKHUN" value={currentStudent.dapodik.skhun} fieldKey="dapodik.skhun" />
                                <FormField label="No Peserta UN" value={currentStudent.dapodik.unExamNumber} fieldKey="dapodik.unExamNumber" />
                                <FormField label="No Seri Ijazah" value={currentStudent.diplomaNumber} fieldKey="diplomaNumber" />
                                <FormField label="Penerima KIP" value={currentStudent.dapodik.kipReceiver} fieldKey="dapodik.kipReceiver" />
                                <FormField label="Nomor KIP" value={currentStudent.dapodik.kipNumber} fieldKey="dapodik.kipNumber" />
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <Search className="w-16 h-16 mb-4 opacity-20" />
                <p>Pilih siswa untuk verifikasi data.</p>
            </div>
        )}
    </div>
  );
};

export default VerificationView;