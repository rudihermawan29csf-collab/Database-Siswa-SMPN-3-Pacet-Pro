import React, { useState, useMemo } from 'react';
import { Student, AdminMessage } from '../types';
import { Search, Filter, AlertCircle, CheckCircle2, ChevronRight, MessageSquare, Send, BookOpen, ClipboardList, FolderOpen, FileText, ArrowLeft, X, Calendar } from 'lucide-react';

interface ReportsViewProps {
  students: Student[];
  onUpdate?: () => void;
}

const REQUIRED_DOCS_ID = ['IJAZAH', 'AKTA', 'KK', 'KTP_AYAH', 'KTP_IBU', 'FOTO'];

const ReportsView: React.FC<ReportsViewProps> = ({ students, onUpdate }) => {
  const [selectedClass, setSelectedClass] = useState<string>('VII A');
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Message State
  const [messageText, setMessageText] = useState('');

  const uniqueClasses = Array.from(new Set(students.map(s => s.className))).sort();

  const filteredStudents = useMemo(() => {
      let filtered = students.filter(s => s.className === selectedClass);
      if (searchTerm) {
          filtered = filtered.filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      return filtered;
  }, [students, selectedClass, searchTerm]);

  // Analyze completeness for a student
  const analyzeStudent = (student: Student) => {
      // 1. Bio (Buku Induk)
      const missingBioFields = [];
      if (!student.nisn) missingBioFields.push('NISN');
      if (!student.dapodik.nik) missingBioFields.push('NIK');
      if (!student.address || student.address === '-') missingBioFields.push('Alamat');
      if (!student.father.name || student.father.name === 'Nama Ayah') missingBioFields.push('Nama Ayah');
      if (!student.mother.name || student.mother.name === 'Nama Ibu') missingBioFields.push('Nama Ibu');
      const bioPercent = Math.round(((5 - missingBioFields.length) / 5) * 100);

      // 2. Grades (Dynamic Semester)
      const gradesComplete = student.academicRecords && student.academicRecords[selectedSemester] && student.academicRecords[selectedSemester].subjects.length > 0;
      const gradePercent = gradesComplete ? 100 : 0;

      // 3. Docs
      const missingDocs = REQUIRED_DOCS_ID.filter(id => !student.documents.find(d => d.category === id));
      const docPercent = Math.round(((REQUIRED_DOCS_ID.length - missingDocs.length) / REQUIRED_DOCS_ID.length) * 100);

      // 4. Rapor (Dynamic Semester, 5 pages)
      const uploadedPages = student.documents.filter(d => d.category === 'RAPOR' && d.subType?.semester === selectedSemester).length;
      const raporPercent = Math.round((uploadedPages / 5) * 100);

      return {
          bioPercent,
          gradePercent,
          docPercent,
          raporPercent,
          missingBioFields,
          missingDocs,
          missingRaporPages: 5 - uploadedPages
      };
  };

  const handleSendMessage = () => {
      if (!selectedStudent || !messageText.trim()) return;
      
      const newMessage: AdminMessage = {
          id: Math.random().toString(36).substr(2, 9),
          content: messageText,
          date: new Date().toISOString(),
          isRead: false
      };

      if (!selectedStudent.adminMessages) selectedStudent.adminMessages = [];
      selectedStudent.adminMessages.push(newMessage);
      
      setMessageText('');
      alert(`Pesan pengingat dikirim ke ${selectedStudent.fullName}`);
      if (onUpdate) onUpdate();
  };

  const ProgressRing = ({ percent, size = 30 }: { percent: number, size?: number }) => {
      const radius = size / 2 - 2;
      const circumference = radius * 2 * Math.PI;
      const offset = circumference - (percent / 100) * circumference;
      const color = percent === 100 ? 'text-green-500' : percent > 50 ? 'text-orange-500' : 'text-red-500';

      return (
        <div className="relative flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
                <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" className="text-gray-200" />
                <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} className={color} strokeLinecap="round" />
            </svg>
            <span className="absolute text-[8px] font-bold text-gray-700">{percent}%</span>
        </div>
      );
  };

  if (selectedStudent) {
      const analysis = analyzeStudent(selectedStudent);
      return (
          <div className="flex flex-col h-full space-y-4 animate-fade-in">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
                      <div>
                          <h2 className="text-lg font-bold text-gray-800">{selectedStudent.fullName}</h2>
                          <p className="text-xs text-gray-500">{selectedStudent.nisn} • Kelas {selectedStudent.className}</p>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-auto">
                  {/* Left: Detail Checklist */}
                  <div className="space-y-4">
                      {/* Bio Card */}
                      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-gray-700 flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-500" /> Kelengkapan Buku Induk</h3>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${analysis.bioPercent === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{analysis.bioPercent}%</span>
                          </div>
                          {analysis.missingBioFields.length > 0 ? (
                              <div className="space-y-2">
                                  <p className="text-xs text-gray-500 font-semibold uppercase">Data Belum Lengkap:</p>
                                  {analysis.missingBioFields.map((field, idx) => (
                                      <div key={idx} className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                                          <AlertCircle className="w-4 h-4" /> {field}
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded">
                                  <CheckCircle2 className="w-5 h-5" /> Data Identitas Lengkap
                              </div>
                          )}
                      </div>

                      {/* Grades Card */}
                      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-gray-700 flex items-center gap-2"><ClipboardList className="w-5 h-5 text-purple-500" /> Kelengkapan Nilai (S{selectedSemester})</h3>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${analysis.gradePercent === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{analysis.gradePercent}%</span>
                          </div>
                          {analysis.gradePercent === 100 ? (
                              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded">
                                  <CheckCircle2 className="w-5 h-5" /> Nilai Semester {selectedSemester} Lengkap
                              </div>
                          ) : (
                               <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded">
                                  <AlertCircle className="w-5 h-5" /> Belum ada data nilai semester ini
                              </div>
                          )}
                      </div>

                      {/* Docs Card */}
                      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-gray-700 flex items-center gap-2"><FolderOpen className="w-5 h-5 text-orange-500" /> Kelengkapan Dokumen</h3>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${analysis.docPercent === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{analysis.docPercent}%</span>
                          </div>
                          {analysis.missingDocs.length > 0 ? (
                              <div className="space-y-2">
                                  <p className="text-xs text-gray-500 font-semibold uppercase">Dokumen Belum Diupload:</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {analysis.missingDocs.map((doc, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                                            <X className="w-3 h-3" /> {doc}
                                        </div>
                                    ))}
                                  </div>
                              </div>
                          ) : (
                              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded">
                                  <CheckCircle2 className="w-5 h-5" /> Semua Dokumen Wajib Lengkap
                              </div>
                          )}
                      </div>

                      {/* Rapor Card */}
                      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-gray-700 flex items-center gap-2"><FileText className="w-5 h-5 text-teal-500" /> Upload Rapor (S{selectedSemester})</h3>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${analysis.raporPercent === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{analysis.raporPercent}%</span>
                          </div>
                          {analysis.missingRaporPages > 0 ? (
                              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded">
                                  <AlertCircle className="w-5 h-5" /> Kurang {analysis.missingRaporPages} Halaman lagi
                              </div>
                          ) : (
                              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded">
                                  <CheckCircle2 className="w-5 h-5" /> Upload Rapor Lengkap
                              </div>
                          )}
                      </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="space-y-6">
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
                          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-blue-600" /> Beri Catatan / Peringatan</h3>
                          <div className="bg-blue-50 p-4 rounded-lg mb-4 text-sm text-blue-800">
                              <p className="mb-2">Kirim pesan kepada siswa ini agar segera melengkapi data yang kurang.</p>
                              <ul className="list-disc pl-5 text-xs">
                                  {analysis.missingBioFields.length > 0 && <li>Lengkapi Biodata: {analysis.missingBioFields.join(', ')}</li>}
                                  {analysis.missingDocs.length > 0 && <li>Upload Dokumen: {analysis.missingDocs.join(', ')}</li>}
                                  {analysis.missingRaporPages > 0 && <li>Upload Rapor Semester {selectedSemester}</li>}
                              </ul>
                          </div>
                          <textarea 
                              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none flex-1 min-h-[150px]"
                              placeholder="Tulis pesan anda di sini... (Contoh: Mohon segera upload KK dan Akta Kelahiran)"
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                          ></textarea>
                          <div className="mt-4 flex justify-end">
                              <button onClick={handleSendMessage} disabled={!messageText.trim()} className="flex items-center px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                  <Send className="w-4 h-4 mr-2" /> Kirim Pesan
                              </button>
                          </div>

                          {/* History Messages */}
                          {selectedStudent.adminMessages && selectedStudent.adminMessages.length > 0 && (
                              <div className="mt-8 border-t pt-4">
                                  <h4 className="font-bold text-gray-600 text-sm mb-3">Riwayat Pesan</h4>
                                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                      {selectedStudent.adminMessages.map((msg, idx) => (
                                          <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                              <p className="text-xs text-gray-800 mb-1">"{msg.content}"</p>
                                              <p className="text-[10px] text-gray-400 text-right">{new Date(msg.date).toLocaleDateString()}</p>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" /> Laporan Kelengkapan Data</h2>
            <div className="flex gap-3 w-full md:w-auto">
                 <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg border border-gray-200">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <select 
                        className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer"
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(Number(e.target.value))}
                    >
                        {[1, 2, 3, 4, 5, 6].map(sem => <option key={sem} value={sem}>Semester {sem}</option>)}
                    </select>
                </div>
                 <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg border border-gray-200">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select 
                        className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer"
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                    >
                        {uniqueClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)}
                    </select>
                </div>
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="text" placeholder="Cari Siswa..." className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1 w-full">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                        <tr>
                            <th className="px-6 py-4">Nama Siswa</th>
                            <th className="px-6 py-4 text-center">Buku Induk</th>
                            <th className="px-6 py-4 text-center">Nilai (S{selectedSemester})</th>
                            <th className="px-6 py-4 text-center">Dokumen</th>
                            <th className="px-6 py-4 text-center">Rapor (S{selectedSemester})</th>
                            <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredStudents.length > 0 ? filteredStudents.map((s) => {
                            const analysis = analyzeStudent(s);
                            const totalPercent = Math.round((analysis.bioPercent + analysis.gradePercent + analysis.docPercent + analysis.raporPercent) / 4);
                            return (
                                <tr key={s.id} className="hover:bg-blue-50/50 group cursor-pointer" onClick={() => setSelectedStudent(s)}>
                                    <td className="px-6 py-3">
                                        <div className="font-bold text-gray-800 text-sm">{s.fullName}</div>
                                        <div className="text-xs text-gray-500">{s.nisn}</div>
                                        {totalPercent < 100 && <span className="text-[10px] text-red-500 font-medium">Data Belum Lengkap</span>}
                                    </td>
                                    <td className="px-6 py-3 flex justify-center"><ProgressRing percent={analysis.bioPercent} /></td>
                                    <td className="px-6 py-3"><div className="flex justify-center"><ProgressRing percent={analysis.gradePercent} /></div></td>
                                    <td className="px-6 py-3"><div className="flex justify-center"><ProgressRing percent={analysis.docPercent} /></div></td>
                                    <td className="px-6 py-3"><div className="flex justify-center"><ProgressRing percent={analysis.raporPercent} /></div></td>
                                    <td className="px-6 py-3 text-right">
                                        <button className="text-xs font-bold text-blue-600 border border-blue-200 px-3 py-1 rounded bg-white hover:bg-blue-600 hover:text-white transition-colors">
                                            Detail & Pesan
                                        </button>
                                    </td>
                                </tr>
                            );
                        }) : (
                             <tr><td colSpan={6} className="text-center py-10 text-gray-400">Tidak ada siswa ditemukan</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
             <div className="p-3 border-t bg-gray-50 text-xs text-gray-500">
                Menampilkan {filteredStudents.length} Siswa dari Kelas {selectedClass}
            </div>
        </div>
    </div>
  );
};

export default ReportsView;