import React, { useState, useMemo } from 'react';
import { Student, CorrectionRequest, DocumentFile } from '../types';
import { api } from '../services/api';
import { CheckCircle2, XCircle, FileText, User, AlertCircle, Loader2, Filter, FolderOpen } from 'lucide-react';

interface VerificationViewProps {
  students: Student[];
  targetStudentId?: string;
  onUpdate: () => void;
  onSave: (student: Student) => void;
  currentUser?: { name: string; role: string };
}

const VerificationView: React.FC<VerificationViewProps> = ({ students, targetStudentId, onUpdate, onSave, currentUser }) => {
  const [filterClass, setFilterClass] = useState('ALL');
  const [adminVerifyModalOpen, setAdminVerifyModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CorrectionRequest | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentFile | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [adminResponseNote, setAdminResponseNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Dummy state to force re-render if needed
  const [forceUpdate, setForceUpdate] = useState(0);

  const uniqueClasses = useMemo(() => {
      const classes = Array.from(new Set(students.map(s => s.className))).sort();
      return ['ALL', ...classes];
  }, [students]);

  // Aggregate Pending Items (Bio Corrections & General Documents)
  const verificationItems = useMemo(() => {
      const items: { type: 'REQ' | 'DOC', student: Student, item: CorrectionRequest | DocumentFile }[] = [];
      
      students.forEach(s => {
          if (filterClass !== 'ALL' && s.className !== filterClass) return;

          // Bio Corrections (Exclude Academic)
          const bioRequests = s.correctionRequests?.filter(r => 
              r.status === 'PENDING' && 
              !r.fieldKey.startsWith('grade-') && 
              !r.fieldKey.startsWith('class-') &&
              r.fieldKey !== 'className'
          ) || [];
          
          bioRequests.forEach(r => items.push({ type: 'REQ', student: s, item: r }));

          // General Documents (Exclude RAPOR)
          const generalDocs = s.documents.filter(d => 
              d.status === 'PENDING' && 
              d.category !== 'RAPOR'
          );
          
          generalDocs.forEach(d => items.push({ type: 'DOC', student: s, item: d }));
      });

      return items;
  }, [students, filterClass, forceUpdate]);

  const openVerificationModal = (student: Student, item: CorrectionRequest | DocumentFile, type: 'REQ' | 'DOC') => {
      setCurrentStudent(student);
      if (type === 'REQ') {
          setSelectedRequest(item as CorrectionRequest);
          setSelectedDoc(null);
      } else {
          setSelectedDoc(item as DocumentFile);
          setSelectedRequest(null);
      }
      setAdminResponseNote('');
      setAdminVerifyModalOpen(true);
  };

  const processVerification = async (action: 'APPROVED' | 'REJECTED') => {
      if (!currentStudent) return;
      
      if (action === 'REJECTED' && !adminResponseNote.trim()) {
          alert("Mohon isi alasan penolakan.");
          return;
      }

      setIsSaving(true);

      // 1. Clone Student Data
      const updatedStudent = JSON.parse(JSON.stringify(currentStudent));
      
      if (selectedRequest) {
          // Handle Correction Request
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

          // Apply Data Change if Approved
          if (action === 'APPROVED') {
              const { fieldKey, proposedValue } = selectedRequest;
              const keys = fieldKey.split('.');
              let current: any = updatedStudent;
              
              // Traverse to parent
              for (let i = 0; i < keys.length - 1; i++) {
                   if (!current[keys[i]]) current[keys[i]] = {};
                   current = current[keys[i]];
              }
              
              // Set value
              const lastKey = keys[keys.length - 1];
              if (current[lastKey] !== undefined && typeof current[lastKey] === 'number') {
                  current[lastKey] = Number(proposedValue);
              } else {
                  current[lastKey] = proposedValue;
              }
          }
      } else if (selectedDoc) {
          // Handle Document Verification
          updatedStudent.documents = updatedStudent.documents.map((doc: DocumentFile) => {
              if (doc.id === selectedDoc.id) {
                  return {
                      ...doc,
                      status: action === 'APPROVED' ? 'APPROVED' : 'REVISION',
                      adminNote: adminResponseNote || (action === 'APPROVED' ? 'Dokumen valid.' : 'Dokumen tidak valid.'),
                      verifierName: currentUser?.name || 'Admin',
                      verificationDate: new Date().toISOString()
                  };
              }
              return doc;
          });
      }

      // 4. Save Updated Student to API
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

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in relative">
      {/* Modal */}
      {adminVerifyModalOpen && (currentStudent) && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 flex flex-col max-h-[90vh]">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Verifikasi {selectedRequest ? 'Data' : 'Dokumen'}</h3>
                  <div className="bg-blue-50 p-3 rounded mb-4 text-sm text-blue-800">
                      <p><strong>Siswa:</strong> {currentStudent.fullName}</p>
                      <p><strong>Kelas:</strong> {currentStudent.className}</p>
                  </div>

                  <div className="flex-1 overflow-y-auto mb-4">
                      {selectedRequest && (
                          <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-gray-100 p-3 rounded">
                                      <p className="text-xs text-gray-500 uppercase font-bold">Data Lama</p>
                                      <p className="font-medium text-gray-700">{selectedRequest.originalValue || '-'}</p>
                                  </div>
                                  <div className="bg-blue-100 p-3 rounded border border-blue-200">
                                      <p className="text-xs text-blue-600 uppercase font-bold">Data Baru</p>
                                      <p className="font-bold text-blue-800">{selectedRequest.proposedValue}</p>
                                  </div>
                              </div>
                              <div>
                                  <p className="text-xs font-bold text-gray-600 uppercase">Alasan Siswa</p>
                                  <p className="text-sm italic text-gray-700 bg-gray-50 p-2 rounded">{selectedRequest.studentReason}</p>
                              </div>
                          </div>
                      )}

                      {selectedDoc && (
                          <div className="flex flex-col items-center">
                              <a href={selectedDoc.url} target="_blank" rel="noreferrer" className="block w-full h-48 bg-gray-100 rounded-lg mb-2 flex items-center justify-center border border-dashed border-gray-300 hover:bg-gray-200 transition-colors">
                                  <div className="text-center">
                                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                      <p className="text-sm text-blue-600 underline font-bold">{selectedDoc.name}</p>
                                      <p className="text-xs text-gray-500">{selectedDoc.category} - {selectedDoc.size}</p>
                                  </div>
                              </a>
                              <p className="text-xs text-gray-500">Klik preview di atas untuk melihat dokumen asli.</p>
                          </div>
                      )}
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Catatan Admin (Opsional untuk Approve)</label>
                      <textarea 
                          className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          rows={2}
                          placeholder="Berikan alasan jika menolak..."
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

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-800">Verifikasi Buku Induk & Dokumen</h2>
          </div>
          <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select 
                  className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
              >
                  {uniqueClasses.map(c => <option key={c} value={c}>{c === 'ALL' ? 'Semua Kelas' : c}</option>)}
              </select>
          </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-32">
          {verificationItems.length > 0 ? (
              <div className="space-y-3">
                  {verificationItems.map((v, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-blue-300 transition-colors">
                          <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-full ${v.type === 'REQ' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {v.type === 'REQ' ? <User className="w-5 h-5" /> : <FolderOpen className="w-5 h-5" />}
                              </div>
                              <div>
                                  <h4 className="font-bold text-gray-800">{v.student.fullName}</h4>
                                  <p className="text-xs text-gray-500 mb-1">{v.student.className} • {v.student.nisn}</p>
                                  <div className="text-sm">
                                      {v.type === 'REQ' ? (
                                          <span>Pengajuan Perubahan: <strong>{(v.item as CorrectionRequest).fieldName}</strong></span>
                                      ) : (
                                          <span>Upload Dokumen: <strong>{(v.item as DocumentFile).category}</strong></span>
                                      )}
                                  </div>
                              </div>
                          </div>
                          
                          <div className="flex gap-2 w-full md:w-auto">
                              <button 
                                  onClick={() => openVerificationModal(v.student, v.item, v.type)}
                                  className="flex-1 md:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm transition-transform active:scale-95"
                              >
                                  Verifikasi
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <CheckCircle2 className="w-12 h-12 mb-2 text-green-100" />
                  <p>Tidak ada permintaan verifikasi pending.</p>
              </div>
          )}
      </div>
    </div>
  );
};

export default VerificationView;