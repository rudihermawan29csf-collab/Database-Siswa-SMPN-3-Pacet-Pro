import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Pencil, AlertTriangle, X } from 'lucide-react';
import { Student, CorrectionRequest } from '../types';

interface StudentDetailProps {
  student: Student;
  onBack: () => void;
  viewMode: 'student' | 'dapodik'; 
  readOnly?: boolean;
  highlightFieldKey?: string;
  highlightDocumentId?: string;
  onUpdate?: () => void;
}

const StudentDetail: React.FC<StudentDetailProps> = ({ student, onBack, viewMode, readOnly = false, highlightFieldKey, onUpdate }) => {
  // Correction State
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [targetField, setTargetField] = useState<{key: string, label: string, currentValue: string} | null>(null);
  const [proposedValue, setProposedValue] = useState('');
  const [studentReason, setStudentReason] = useState('');
  
  // Auto-scroll logic kept for compatibility
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
          studentReason: studentReason,
          status: 'PENDING',
          requestDate: new Date().toISOString(),
      };
      
      if (!student.correctionRequests) student.correctionRequests = [];
      student.correctionRequests = student.correctionRequests.filter(
          r => !(r.fieldKey === targetField.key && r.status === 'PENDING')
      );
      
      student.correctionRequests.push(newRequest);
      setCorrectionModalOpen(false);
      if (onUpdate) onUpdate();
      alert("✅ Usulan perbaikan berhasil dikirim. Menunggu verifikasi admin.");
  };

  // Reusable Compact Field Group (Matches Admin Verification View)
  const FieldGroup = ({ label, value, fieldKey, fullWidth = false }: { label: string, value: string | number, fieldKey?: string, fullWidth?: boolean }) => {
    const displayValue = (value !== null && value !== undefined && value !== '') ? value : '-';
    const stringValue = String(displayValue);
    const pendingReq = fieldKey ? student.correctionRequests?.find(r => r.fieldKey === fieldKey && r.status === 'PENDING') : null;

    return (
        <div id={fieldKey ? `field-${fieldKey}` : undefined} className={`mb-2 ${fullWidth ? 'w-full' : ''} relative group`}>
            <div className="flex justify-between items-center mb-0.5">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">{label}</label>
                {pendingReq && <span className="text-[9px] text-yellow-600 bg-yellow-50 px-1 rounded border border-yellow-200">Menunggu</span>}
            </div>
            <div className={`relative p-2 bg-gray-50 border rounded text-gray-900 text-sm font-medium break-words min-h-[36px] flex items-center ${pendingReq ? 'border-yellow-400 bg-yellow-50/30' : 'border-gray-300'}`}>
                {pendingReq ? pendingReq.proposedValue : stringValue}
                
                {/* Edit Button visible on hover */}
                {readOnly && fieldKey && !pendingReq && (
                    <button 
                        onClick={() => handleOpenCorrection(fieldKey, label, stringValue)}
                        className="absolute right-1 top-1 p-1 bg-white rounded shadow border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-300 opacity-0 group-hover:opacity-100 transition-all z-10"
                        title="Ajukan Perbaikan"
                    >
                        <Pencil className="w-3 h-3" />
                    </button>
                )}
            </div>
        </div>
    );
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-800 uppercase border-y border-gray-300 mt-6 mb-3 first:mt-0 rounded-sm">
        {title}
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-140px)] relative">
      
      {/* Correction Modal */}
      {correctionModalOpen && (
          <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col max-h-[90vh]">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="text-lg font-bold text-gray-900">Pembetulan Data</h3>
                      <button onClick={() => setCorrectionModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
                  </div>
                  <div className="mb-4 bg-blue-50 p-3 rounded border border-blue-100">
                      <p className="text-xs text-gray-500 uppercase">Data Lama</p>
                      <p className="text-sm font-bold text-gray-700">{targetField?.currentValue || '-'}</p>
                  </div>
                  <div className="space-y-3">
                      <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Data Baru</label>
                          <input className="w-full p-2 border rounded text-sm" value={proposedValue} onChange={(e) => setProposedValue(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Alasan Perubahan</label>
                          <textarea className="w-full p-2 border rounded text-sm" rows={2} value={studentReason} onChange={(e) => setStudentReason(e.target.value)} placeholder="Wajib diisi..." />
                      </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                      <button onClick={() => setCorrectionModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded text-sm font-bold text-gray-600">Batal</button>
                      <button onClick={submitCorrection} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700">Kirim</button>
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
            {readOnly && (
                <div className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                    Mode Siswa
                </div>
            )}
       </div>

       {/* Scrollable Content - Single Vertical View */}
       <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-white">
            <div className="max-w-3xl mx-auto space-y-1">
                {/* 1. IDENTITAS */}
                <SectionHeader title="1. Identitas Peserta Didik" />
                <FieldGroup label="Nama Lengkap" value={student.fullName} fieldKey="fullName" fullWidth />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldGroup label="NISN" value={student.nisn} fieldKey="nisn" />
                    <FieldGroup label="NIK" value={student.dapodik.nik} fieldKey="dapodik.nik" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldGroup label="Tempat Lahir" value={student.birthPlace} fieldKey="birthPlace" />
                    <FieldGroup label="Tanggal Lahir" value={student.birthDate} fieldKey="birthDate" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldGroup label="Jenis Kelamin" value={student.gender === 'L' ? 'Laki-laki' : 'Perempuan'} fieldKey="gender" />
                    <FieldGroup label="Agama" value={student.religion} fieldKey="religion" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldGroup label="Anak Ke" value={student.childOrder} fieldKey="childOrder" />
                    <FieldGroup label="Jml Saudara" value={student.siblingCount} fieldKey="siblingCount" />
                </div>

                {/* 2. ALAMAT */}
                <SectionHeader title="2. Alamat Tempat Tinggal" />
                <FieldGroup label="Alamat Jalan" value={student.address} fieldKey="address" fullWidth />
                <div className="grid grid-cols-3 gap-4">
                    <FieldGroup label="RT" value={student.dapodik.rt} fieldKey="dapodik.rt" />
                    <FieldGroup label="RW" value={student.dapodik.rw} fieldKey="dapodik.rw" />
                    <FieldGroup label="Kode Pos" value={student.postalCode} fieldKey="postalCode" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldGroup label="Dusun" value={student.dapodik.dusun} fieldKey="dapodik.dusun" />
                    <FieldGroup label="Kelurahan/Desa" value={student.dapodik.kelurahan} fieldKey="dapodik.kelurahan" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldGroup label="Kecamatan" value={student.subDistrict} fieldKey="subDistrict" />
                    <FieldGroup label="Kabupaten" value={student.district} fieldKey="district" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldGroup label="Transportasi" value={student.dapodik.transportation} fieldKey="dapodik.transportation" />
                    <FieldGroup label="Jenis Tinggal" value={student.dapodik.livingStatus} fieldKey="dapodik.livingStatus" />
                </div>

                {/* 3. ORTU */}
                <SectionHeader title="3. Data Orang Tua / Wali" />
                <div className="bg-gray-50 p-3 rounded border border-gray-200 mb-2">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 border-b border-gray-300 pb-1">Data Ayah</h4>
                    <FieldGroup label="Nama Ayah" value={student.father.name} fieldKey="father.name" fullWidth />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FieldGroup label="NIK Ayah" value={student.father.nik} fieldKey="father.nik" />
                        <FieldGroup label="Tahun Lahir" value={student.father.birthPlaceDate} fieldKey="father.birthPlaceDate" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FieldGroup label="Pekerjaan" value={student.father.job} fieldKey="father.job" />
                        <FieldGroup label="Penghasilan" value={student.father.income} fieldKey="father.income" />
                    </div>
                </div>
                <div className="bg-gray-50 p-3 rounded border border-gray-200 mb-2">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 border-b border-gray-300 pb-1">Data Ibu</h4>
                    <FieldGroup label="Nama Ibu" value={student.mother.name} fieldKey="mother.name" fullWidth />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FieldGroup label="NIK Ibu" value={student.mother.nik} fieldKey="mother.nik" />
                        <FieldGroup label="Tahun Lahir" value={student.mother.birthPlaceDate} fieldKey="mother.birthPlaceDate" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FieldGroup label="Pekerjaan" value={student.mother.job} fieldKey="mother.job" />
                        <FieldGroup label="Penghasilan" value={student.mother.income} fieldKey="mother.income" />
                    </div>
                </div>

                {/* 4. PERIODIK */}
                <SectionHeader title="4. Data Periodik" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldGroup label="Tinggi Badan (cm)" value={student.height} fieldKey="height" />
                    <FieldGroup label="Berat Badan (kg)" value={student.weight} fieldKey="weight" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldGroup label="Jarak Sekolah" value={student.dapodik.distanceToSchool} fieldKey="dapodik.distanceToSchool" />
                    <FieldGroup label="Waktu Tempuh (Menit)" value={student.dapodik.travelTimeMinutes} fieldKey="dapodik.travelTimeMinutes" />
                </div>

                {/* 5. KESEJAHTERAAN */}
                <SectionHeader title="5. Kesejahteraan Peserta Didik" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldGroup label="Penerima KIP" value={student.dapodik.kipReceiver} fieldKey="dapodik.kipReceiver" />
                    <FieldGroup label="Nomor KIP" value={student.dapodik.kipNumber} fieldKey="dapodik.kipNumber" />
                </div>
                <FieldGroup label="Nama Tertera di KIP" value={student.dapodik.kipName} fieldKey="dapodik.kipName" fullWidth />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldGroup label="Penerima KPS" value={student.dapodik.kpsReceiver} fieldKey="dapodik.kpsReceiver" />
                    <FieldGroup label="Nomor KPS" value={student.dapodik.kpsNumber} fieldKey="dapodik.kpsNumber" />
                </div>
                <FieldGroup label="Nomor KKS (Kartu Keluarga Sejahtera)" value={student.dapodik.kksNumber} fieldKey="dapodik.kksNumber" fullWidth />
            </div>
       </div>
    </div>
  );
};

export default StudentDetail;