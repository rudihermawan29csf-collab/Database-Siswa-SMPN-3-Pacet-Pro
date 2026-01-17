import React, { useState, useMemo } from 'react';
import { Student, CorrectionRequest } from '../types';
import { api } from '../services/api';
import { CheckCircle2, XCircle, ScrollText, AlertTriangle, Loader2 } from 'lucide-react';

interface IjazahVerificationViewProps {
  students: Student[];
  onUpdate: () => void;
  onSave: (student: Student) => void;
  currentUser?: { name: string; role: string };
}

const IjazahVerificationView: React.FC<IjazahVerificationViewProps> = ({ students, onUpdate, onSave, currentUser }) => {
  const [adminVerifyModalOpen, setAdminVerifyModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CorrectionRequest | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [adminResponseNote, setAdminResponseNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Filter requests specifically for Ijazah fields
  const verificationItems = useMemo(() => {
      const items: { student: Student, req: CorrectionRequest }[] = [];
      const ijazahFields = ['nis', 'nisn', 'birthPlace', 'birthDate', 'diplomaNumber'];

      students.forEach(s => {
          const reqs = s.correctionRequests?.filter(r => 
              r.status === 'PENDING' && ijazahFields.includes(r.fieldKey)
          ) || [];
          reqs.forEach(r => items.push({ student: s, req: r }));
      });

      return items;
  }, [students, forceUpdate]);

  const openModal = (student: Student, req: CorrectionRequest) => {
      setCurrentStudent(student);
      setSelectedRequest(req);
      setAdminResponseNote('');
      setAdminVerifyModalOpen(true);
  };

  const processVerification = async (action: 'APPROVED' | 'REJECTED') => {
      if (!currentStudent || !selectedRequest) return;
      
      if (action === 'REJECTED' && !adminResponseNote.trim()) {
          alert("Mohon isi alasan penolakan.");
          return;
      }

      setIsSaving(true);

      const updatedStudent = JSON.parse(JSON.stringify(currentStudent));
      
      // Update status riwayat
      if (updatedStudent.correctionRequests) {
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
      }

      // PERBAIKAN UTAMA: Update data fisik ijazah jika APPROVED
      if (action === 'APPROVED') {
          const { fieldKey, proposedValue } = selectedRequest;
          const keys = fieldKey.split('.');
          let current: any = updatedStudent;
          
          for (let i = 0; i < keys.length - 1; i++) {
               if (!current[keys[i]]) current[keys[i]] = {};
               current = current[keys[i]];
          }
          const lastKey = keys[keys.length - 1];
          if (current[lastKey] !== undefined && typeof current[lastKey] === 'number') {
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
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in relative">
      {/* Modal */}
      {adminVerifyModalOpen && selectedRequest && currentStudent && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 flex flex-col">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Verifikasi Data Ijazah</h3>
                  <div className="bg-orange-50 p-3 rounded mb-4 text-sm text-orange-800">
                      <p><strong>Siswa:</strong> {currentStudent.fullName}</p>
                      <p><strong>Data:</strong> {selectedRequest.fieldName}</p>
                  </div>

                  <div className="space-y-4 mb-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-100 p-3 rounded">
                              <p className="text-xs text-gray-500 uppercase font-bold">Saat Ini</p>
                              <p className="font-mono text-gray-700">{selectedRequest.originalValue || '-'}</p>
                          </div>
                          <div className="bg-orange-100 p-3 rounded border border-orange-200">
                              <p className="text-xs text-orange-600 uppercase font-bold">Usulan Perubahan</p>
                              <p className="font-mono font-bold text-orange-800">{selectedRequest.proposedValue}</p>
                          </div>
                      </div>
                      <div>
                          <p className="text-xs font-bold text-gray-600 uppercase">Alasan Siswa</p>
                          <p className="text-sm italic text-gray-700 bg-gray-50 p-2 rounded">{selectedRequest.studentReason}</p>
                      </div>
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Catatan Admin</label>
                      <textarea 
                          className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                          rows={2}
                          value={adminResponseNote}
                          onChange={(e) => setAdminResponseNote(e.target.value)}
                      />
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                      <button onClick={() => setAdminVerifyModalOpen(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 font-bold rounded hover:bg-gray-200 text-sm">Batal</button>
                      <button onClick={() => processVerification('REJECTED')} disabled={isSaving} className="flex-1 py-2 bg-white border border-red-200 text-red-600 font-bold rounded hover:bg-red-50 text-sm flex items-center justify-center gap-1">
                          <XCircle className="w-4 h-4" /> Tolak
                      </button>
                      <button onClick={() => processVerification('APPROVED')} disabled={isSaving} className="flex-1 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 text-sm flex items-center justify-center gap-1 shadow-sm">
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4" />} Setujui
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-orange-600" />
          <h2 className="text-lg font-bold text-gray-800">Verifikasi Koreksi Data Ijazah</h2>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
          {verificationItems.length > 0 ? (
              <div className="space-y-3">
                  {verificationItems.map((v, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between gap-4 hover:border-orange-300 transition-colors">
                          <div className="flex items-start gap-3">
                              <div className="p-2 rounded-full bg-orange-100 text-orange-600">
                                  <AlertTriangle className="w-5 h-5" />
                              </div>
                              <div>
                                  <h4 className="font-bold text-gray-800">{v.student.fullName}</h4>
                                  <p className="text-xs text-gray-500 mb-1">{v.student.className}</p>
                                  <div className="text-sm">
                                      Koreksi: <strong>{v.req.fieldName}</strong> ({v.req.originalValue} ➔ {v.req.proposedValue})
                                  </div>
                              </div>
                          </div>
                          <button 
                              onClick={() => openModal(v.student, v.req)}
                              className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 shadow-sm"
                          >
                              Tinjau
                          </button>
                      </div>
                  ))}
              </div>
          ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <CheckCircle2 className="w-12 h-12 mb-2 text-green-100" />
                  <p>Tidak ada pengajuan koreksi data ijazah.</p>
              </div>
          )}
      </div>
    </div>
  );
};

export default IjazahVerificationView;