import React, { useState, useMemo } from 'react';
import { Student, CorrectionRequest, DocumentFile } from '../types';
import { api } from '../services/api';
import { CheckCircle2, XCircle, FileText, LayoutList, AlertCircle, Loader2, Filter, Eye } from 'lucide-react';

interface GradeVerificationViewProps {
  students: Student[];
  userRole?: 'ADMIN' | 'STUDENT' | 'GURU';
  onUpdate: () => void;
  onSave: (student: Student) => void;
  currentUser?: { name: string; role: string };
}

const GradeVerificationView: React.FC<GradeVerificationViewProps> = ({ students, onUpdate, onSave, currentUser }) => {
  const [filterClass, setFilterClass] = useState('ALL');
  const [adminVerifyModalOpen, setAdminVerifyModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CorrectionRequest | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentFile | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [adminResponseNote, setAdminResponseNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  const uniqueClasses = useMemo(() => {
      const classes = Array.from(new Set(students.map(s => s.className))).sort();
      return ['ALL', ...classes];
  }, [students]);

  // Aggregate Pending Items (Academic Corrections & Rapor Documents)
  const verificationItems = useMemo(() => {
      const items: { type: 'REQ' | 'DOC', student: Student, item: CorrectionRequest | DocumentFile }[] = [];
      
      students.forEach(s => {
          if (filterClass !== 'ALL' && s.className !== filterClass) return;

          // Academic Corrections
          const academicRequests = s.correctionRequests?.filter(r => 
              r.status === 'PENDING' && (
                  r.fieldKey.startsWith('grade-') || 
                  r.fieldKey.startsWith('class-') ||
                  r.fieldKey === 'className'
              )
          ) || [];
          
          academicRequests.forEach(r => items.push({ type: 'REQ', student: s, item: r }));

          // Rapor Documents
          const raporDocs = s.documents.filter(d => 
              d.status === 'PENDING' && 
              d.category === 'RAPOR'
          );
          
          raporDocs.forEach(d => items.push({ type: 'DOC', student: s, item: d }));
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

      // 1. Clone Student
      const updatedStudent = JSON.parse(JSON.stringify(currentStudent));
      
      if (selectedRequest) {
          // Handle Request
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

          // Apply Data Change
          if (action === 'APPROVED') {
              const { fieldKey, proposedValue } = selectedRequest;
              
              if (fieldKey === 'className') {
                  updatedStudent.className = proposedValue;
              } 
              else if (fieldKey.startsWith('class-')) {
                  const sem = parseInt(fieldKey.split('-')[1]);
                  if (!isNaN(sem)) {
                      if (!updatedStudent.academicRecords) updatedStudent.academicRecords = {};
                      if (!updatedStudent.academicRecords[sem]) {
                          const level = (sem <= 2) ? 'VII' : (sem <= 4) ? 'VIII' : 'IX';
                          updatedStudent.academicRecords[sem] = { 
                              semester: sem, classLevel: level, className: proposedValue, phase: 'D', year: '2024', 
                              subjects: [], p5Projects: [], extracurriculars: [], teacherNote: '', attendance: {sick:0, permitted:0, noReason:0}
                          };
                      }
                      updatedStudent.academicRecords[sem].className = proposedValue;
                  }
              } 
              else if (fieldKey.startsWith('grade-')) {
                  const parts = fieldKey.split('-');
                  if (parts.length >= 3) {
                      const sem = parseInt(parts[1]);
                      const subjectName = parts.slice(2).join('-');
                      
                      if (updatedStudent.academicRecords && updatedStudent.academicRecords[sem]) {
                          const subjectRecord = updatedStudent.academicRecords[sem].subjects.find((s: any) => s.subject === subjectName);
                          if (subjectRecord) {
                              subjectRecord.score = Number(proposedValue);
                          }
                      }
                  }
              }
          }
      } else if (selectedDoc) {
          // Handle Doc
          updatedStudent.documents = updatedStudent.documents.map((doc: DocumentFile) => {
              if (doc.id === selectedDoc.id) {
                  return {
                      ...doc,
                      status: action === 'APPROVED' ? 'APPROVED' : 'REVISION',
                      adminNote: adminResponseNote || (action === 'APPROVED' ? 'Rapor valid.' : 'Rapor buram/salah.'),
                      verifierName: currentUser?.name || 'Admin',
                      verificationDate: new Date().toISOString()
                  };
              }
              return doc;
          });
      }

      // Save
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
      {adminVerifyModalOpen && currentStudent && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 flex flex-col max-h-[90vh]">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Verifikasi {selectedRequest ? 'Nilai/Kelas' : 'Scan Rapor'}</h3>
                  <div className="bg-purple-50 p-3 rounded mb-4 text-sm text-purple-800">
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
                                  <div className="bg-purple-100 p-3 rounded border border-purple-200">
                                      <p className="text-xs text-purple-600 uppercase font-bold">Usulan Baru</p>
                                      <p className="font-bold text-purple-800">{selectedRequest.proposedValue}</p>
                                  </div>
                              </div>
                              <div>
                                  <p className="text-xs font-bold text-gray-600 uppercase">Alasan</p>
                                  <p className="text-sm italic text-gray-700 bg-gray-50 p-2 rounded">{selectedRequest.studentReason}</p>
                              </div>
                          </div>
                      )}

                      {selectedDoc && (
                          <div className="flex flex-col items-center">
                              <a href={selectedDoc.url} target="_blank" rel="noreferrer" className="block w-full h-48 bg-gray-100 rounded-lg mb-2 flex items-center justify-center border border-dashed border-gray-300 hover:bg-gray-200 transition-colors">
                                  <div className="text-center">
                                      {selectedDoc.type === 'PDF' ? <FileText className="w-12 h-12 text-red-400 mx-auto" /> : <Eye className="w-12 h-12 text-blue-400 mx-auto" />}
                                      <p className="text-sm text-blue-600 underline font-bold mt-2">{selectedDoc.name}</p>
                                      <p className="text-xs text-gray-500">Sem {selectedDoc.subType?.semester} - Hal {selectedDoc.subType?.page}</p>
                                  </div>
                              </a>
                          </div>
                      )}
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Catatan Admin</label>
                      <textarea 
                          className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 outline-none"
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

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-2">
              <LayoutList className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-bold text-gray-800">Verifikasi Nilai & Rapor</h2>
          </div>
          <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select 
                  className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium outline-none"
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
              >
                  {uniqueClasses.map(c => <option key={c} value={c}>{c === 'ALL' ? 'Semua Kelas' : c}</option>)}
              </select>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
          {verificationItems.length > 0 ? (
              <div className="space-y-3">
                  {verificationItems.map((v, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-purple-300 transition-colors">
                          <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-full ${v.type === 'REQ' ? 'bg-yellow-100 text-yellow-600' : 'bg-purple-100 text-purple-600'}`}>
                                  {v.type === 'REQ' ? <AlertCircle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                              </div>
                              <div>
                                  <h4 className="font-bold text-gray-800">{v.student.fullName}</h4>
                                  <p className="text-xs text-gray-500 mb-1">{v.student.className}</p>
                                  <div className="text-sm">
                                      {v.type === 'REQ' ? (
                                          <span>Revisi Akademik: <strong>{(v.item as CorrectionRequest).fieldName}</strong></span>
                                      ) : (
                                          <span>File Rapor: <strong>Sem {(v.item as DocumentFile).subType?.semester} Hal {(v.item as DocumentFile).subType?.page}</strong></span>
                                      )}
                                  </div>
                              </div>
                          </div>
                          <button 
                              onClick={() => openVerificationModal(v.student, v.item, v.type)}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 shadow-sm"
                          >
                              Periksa
                          </button>
                      </div>
                  ))}
              </div>
          ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <CheckCircle2 className="w-12 h-12 mb-2 text-green-100" />
                  <p>Semua data nilai dan rapor sudah diverifikasi.</p>
              </div>
          )}
      </div>
    </div>
  );
};

export default GradeVerificationView;