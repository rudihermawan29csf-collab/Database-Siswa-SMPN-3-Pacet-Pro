
import React, { useState, useEffect, useMemo } from 'react';
import { Student, CorrectionRequest } from '../types';
import { Search, FileSpreadsheet, Award, LayoutList, TableProperties, Save, Pencil, X, CheckCircle2, FileText, ScrollText, Eye, ArrowLeft, Printer, Loader2, Send, Columns, Rows, Calculator } from 'lucide-react';
import { api } from '../services/api';

interface IjazahViewProps {
  students: Student[];
  userRole?: 'ADMIN' | 'STUDENT' | 'GURU';
  loggedInStudent?: Student;
}

const IjazahView: React.FC<IjazahViewProps> = ({ students, userRole = 'ADMIN', loggedInStudent }) => {
  const [activeTab, setActiveTab] = useState<'DATA' | 'NILAI'>('DATA');
  const [viewMode, setViewMode] = useState<'LIST' | 'DETAIL'>('LIST');
  const [detailType, setDetailType] = useState<'CERTIFICATE' | 'TRANSCRIPT'>('CERTIFICATE');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [dbClassFilter, setDbClassFilter] = useState<string>('ALL');
  const [viewDetailScore, setViewDetailScore] = useState(false); 
  const [tableLayout, setTableLayout] = useState<'SUBJECT' | 'SEMESTER'>('SEMESTER'); 
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Correction State
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [targetCorrection, setTargetCorrection] = useState<{key: string, label: string, currentValue: string} | null>(null);
  const [proposedValue, setProposedValue] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  // Settings
  const [appSettings, setAppSettings] = useState<any>(null);

  // --- HELPER COLOR ---
  const getScoreColor = (score: number) => {
      if (!score && score !== 0) return '';
      if (score === 0) return 'text-gray-400';
      if (score < 70) return 'bg-red-100 text-red-700 font-bold';
      if (score < 85) return 'bg-yellow-100 text-yellow-800 font-bold';
      return 'bg-green-100 text-green-700 font-bold';
  };

  useEffect(() => {
      const fetchSettings = async () => {
          try {
              const settings = await api.getAppSettings();
              if (settings) setAppSettings(settings);
          } catch (e) {
              console.error("Failed to load settings", e);
          }
      };
      fetchSettings();
  }, []);

  useEffect(() => {
      if (userRole === 'STUDENT' && loggedInStudent) {
          setSelectedStudent(loggedInStudent);
          setViewMode('DETAIL');
          // Default tab can be DATA or NILAI, letting user switch now
          if (activeTab === 'DATA') setActiveTab('DATA'); 
      }
  }, [userRole, loggedInStudent]);

  const uniqueClasses = useMemo(() => {
      const classes = Array.from(new Set(students.map(s => s.className))).filter(Boolean) as string[];
      return ['ALL', ...classes.sort((a, b) => {
          const levelA = a.split(' ')[0];
          const levelB = b.split(' ')[0];
          const romanMap: Record<string, number> = { 'VII': 7, 'VIII': 8, 'IX': 9 };
          const numA = romanMap[levelA] || 0;
          const numB = romanMap[levelB] || 0;
          if (numA !== numB) return numA - numB;
          return a.localeCompare(b);
      })];
  }, [students]);

  const SUBJECT_MAP = [
      { key: 'PAI', label: 'PAI', full: 'Pendidikan Agama Islam dan Budi Pekerti' },
      { key: 'Pendidikan Pancasila', label: 'PPKn', full: 'Pendidikan Pancasila dan Kewarganegaraan' },
      { key: 'Bahasa Indonesia', label: 'BIN', full: 'Bahasa Indonesia' },
      { key: 'Matematika', label: 'MTK', full: 'Matematika (Umum)' },
      { key: 'IPA', label: 'IPA', full: 'Ilmu Pengetahuan Alam (IPA)' },
      { key: 'IPS', label: 'IPS', full: 'Ilmu Pengetahuan Sosial (IPS)' },
      { key: 'Bahasa Inggris', label: 'BIG', full: 'Bahasa Inggris' },
      { key: 'PJOK', label: 'PJOK', full: 'Pendidikan Jasmani, Olahraga, dan Kesehatan' },
      { key: 'Informatika', label: 'INF', full: 'Informatika' },
      { key: 'Seni dan Prakarya', label: 'SENI', full: 'Seni Rupa' },
      { key: 'Bahasa Jawa', label: 'B.JAWA', full: 'Bahasa Jawa' },
  ];

  const effectiveStudents = (userRole === 'STUDENT' && loggedInStudent) ? [loggedInStudent] : students;

  const filteredStudents = effectiveStudents.filter(s => {
      const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.nisn.includes(searchTerm);
      const matchClass = userRole === 'STUDENT' ? true : (dbClassFilter === 'ALL' || s.className === dbClassFilter);
      return matchSearch && matchClass;
  });

  // --- LOGIC NILAI ---
  const getScore = (s: Student, subjKey: string, sem: number) => {
      const record = s.academicRecords?.[sem];
      if (!record) return 0;
      
      const subj = record.subjects.find(sub => {
          if (subjKey === 'IPA') return sub.subject.includes('Alam') || sub.subject.includes('IPA');
          if (subjKey === 'IPS') return sub.subject.includes('Sosial') || sub.subject.includes('IPS');
          if (subjKey === 'PAI') return sub.subject.includes('Agama') || sub.subject.includes('PAI');
          return sub.subject.startsWith(subjKey) || sub.subject === subjKey;
      });
      
      return subj ? subj.score : 0;
  };

  // Rata-rata per Mapel (S1-S6)
  const calculateSubjectAvg = (student: Student, subjectKey: string): number => {
      let total = 0;
      let count = 0;
      for (let i = 1; i <= 6; i++) {
          const score = getScore(student, subjectKey, i);
          if (score > 0) {
              total += score;
              count++;
          }
      }
      return count > 0 ? Number((total / count).toFixed(1)) : 0;
  };

  // Rata-rata Semester (Baris di Transkrip / Kolom di Layout Baru)
  const calculateSemesterRowAvg = (student: Student, sem: number): number => {
      let total = 0;
      let count = 0;
      SUBJECT_MAP.forEach(sub => {
          const score = getScore(student, sub.key, sem);
          if (score > 0) {
              total += score;
              count++;
          }
      });
      return count > 0 ? Number((total / count).toFixed(1)) : 0;
  };

  // Rata-rata Akhir Sekolah
  const calculateFinalGrade = (student: Student): number => {
      let totalAvg = 0;
      let count = 0;
      SUBJECT_MAP.forEach(sub => {
          const avg = calculateSubjectAvg(student, sub.key);
          if (avg > 0) {
              totalAvg += avg;
              count++;
          }
      });
      return count > 0 ? Number((totalAvg / count).toFixed(2)) : 0;
  };

  const formatDateIndo = (dateStr: string) => {
      if(!dateStr) return '-';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr; 
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // --- HANDLERS ---
  const handleViewDocument = (s: Student, type: 'CERTIFICATE' | 'TRANSCRIPT') => {
      setSelectedStudent(s);
      setDetailType(type);
      setViewMode('DETAIL');
  };

  const handleDownloadExcel = () => {
      try {
          // @ts-ignore
          const xlsx = window.XLSX;
          if (!xlsx || !xlsx.utils) { alert("Library Excel belum siap."); return; }

          let dataToExport: any[] = [];

          if (activeTab === 'DATA') {
              dataToExport = filteredStudents.map((s, index) => ({
                  'No': index + 1,
                  'Nama Siswa': s.fullName,
                  'NISN': s.nisn,
                  'Tempat Lahir': s.birthPlace,
                  'Tanggal Lahir': s.birthDate,
                  'Nama Orang Tua': s.father.name, 
                  'No. Seri Ijazah': s.diplomaNumber,
                  'Status': s.status
              }));
          } else {
              // Export Detailed Scores based on current Layout
              if (tableLayout === 'SEMESTER') {
                  dataToExport = filteredStudents.map((s, index) => {
                      const row: any = {
                          'No': index + 1,
                          'NISN': s.nisn,
                          'Nama Siswa': s.fullName,
                          'Kelas': s.className,
                      };
                      
                      [1, 2, 3, 4, 5, 6].forEach(sem => {
                          SUBJECT_MAP.forEach(sub => {
                              row[`S${sem}_${sub.label}`] = getScore(s, sub.key, sem) || 0;
                          });
                          row[`S${sem}_RataRata`] = calculateSemesterRowAvg(s, sem) || 0;
                      });
                      
                      row['Nilai_Akhir_Sekolah'] = calculateFinalGrade(s) || 0;
                      return row;
                  });
              } else {
                  dataToExport = filteredStudents.map((s, index) => {
                      const row: any = {
                          'No': index + 1,
                          'NISN': s.nisn,
                          'Nama Siswa': s.fullName,
                          'Kelas': s.className,
                      };
                      
                      SUBJECT_MAP.forEach(sub => {
                          for(let sem=1; sem<=6; sem++) {
                              row[`${sub.label}_S${sem}`] = getScore(s, sub.key, sem) || 0;
                          }
                          row[`${sub.label}_AVG`] = calculateSubjectAvg(s, sub.key) || 0;
                      });
                      
                      row['Nilai_Akhir_Sekolah'] = calculateFinalGrade(s) || 0;
                      return row;
                  });
              }
          }

          const ws = xlsx.utils.json_to_sheet(dataToExport);
          const wb = xlsx.utils.book_new();
          xlsx.utils.book_append_sheet(wb, ws, activeTab === 'DATA' ? "Data Ijazah" : "Nilai Ijazah");
          xlsx.writeFile(wb, `Ijazah_${activeTab}_${dbClassFilter}.xlsx`);
      } catch (e) { console.error(e); alert("Gagal download excel."); }
  };

  const handleOpenCorrection = (key: string, label: string, value: string) => {
      setTargetCorrection({ key, label, currentValue: value });
      setProposedValue(value);
      setCorrectionReason('');
      setIsCorrectionModalOpen(true);
  };

  const submitCorrection = async () => {
      if (!selectedStudent || !targetCorrection) return;
      if (!correctionReason.trim()) { alert("Mohon isi alasan perubahan."); return; }

      const newRequest: CorrectionRequest = {
          id: Math.random().toString(36).substr(2, 9),
          fieldKey: targetCorrection.key,
          fieldName: targetCorrection.label,
          originalValue: targetCorrection.currentValue,
          proposedValue: proposedValue,
          studentReason: correctionReason,
          status: 'PENDING',
          requestDate: new Date().toISOString(),
      };

      const updatedStudent = { ...selectedStudent };
      if (!updatedStudent.correctionRequests) updatedStudent.correctionRequests = [];
      
      updatedStudent.correctionRequests = updatedStudent.correctionRequests.filter(
          r => !(r.fieldKey === targetCorrection.key && r.status === 'PENDING')
      );
      updatedStudent.correctionRequests.push(newRequest);

      await api.updateStudent(updatedStudent);
      setSelectedStudent(updatedStudent); 
      setIsCorrectionModalOpen(false);
      alert("✅ Pengajuan revisi data ijazah berhasil dikirim.");
  };

  const InteractiveField = ({ label, value, fieldKey, className = "" }: any) => {
      const pendingReq = selectedStudent?.correctionRequests?.find(r => r.fieldKey === fieldKey && r.status === 'PENDING');
      const canEdit = userRole === 'STUDENT';
      
      let displayValue = pendingReq ? pendingReq.proposedValue : value;
      if (fieldKey === 'birthDate') displayValue = formatDateIndo(displayValue);

      return (
          <span 
            className={`relative group inline-block ${className} ${canEdit ? 'cursor-pointer hover:text-blue-600' : ''}`} 
            onClick={() => canEdit && !pendingReq && handleOpenCorrection(fieldKey, label, value)}
            title={canEdit ? "Klik untuk koreksi data" : ""}
          >
              <span className={`${pendingReq ? 'bg-yellow-100 text-yellow-800 px-1 rounded' : ''}`}>
                  {displayValue}
              </span>
              {pendingReq && <span className="absolute -top-3 -right-3 text-[8px] bg-yellow-400 text-yellow-900 px-1 rounded shadow animate-pulse">Revisi</span>}
          </span>
      );
  };

  // Get Dynamic Data from Settings
  const activeYear = appSettings?.academicData?.activeYear || '2024/2025';
  const headmasterName = appSettings?.schoolData?.headmaster || 'DIDIK SULISTYO, M.M.Pd';
  const headmasterNip = appSettings?.schoolData?.nip || '19660518 198901 1 002';

  return (
    <div className="flex flex-col h-full animate-fade-in space-y-4">
        
        {/* CORRECTION MODAL */}
        {isCorrectionModalOpen && targetCorrection && (
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform scale-100 transition-all">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-lg font-bold text-gray-800">Koreksi Data Ijazah</h3>
                        <button onClick={() => setIsCorrectionModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>
                    <div className="mb-4 bg-blue-50 p-3 rounded border border-blue-100">
                        <p className="text-xs text-gray-500 uppercase">{targetCorrection.label} (Saat Ini)</p>
                        <p className="text-sm font-bold text-gray-700">{targetCorrection.currentValue || '-'}</p>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Data Baru / Usulan</label>
                            {targetCorrection.key === 'birthDate' ? (
                                <input type="date" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={proposedValue} onChange={(e) => setProposedValue(e.target.value)} />
                            ) : (
                                <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={proposedValue} onChange={(e) => setProposedValue(e.target.value)} />
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Alasan Revisi</label>
                            <textarea className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" rows={2} placeholder="Jelaskan alasan perubahan..." value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex gap-2 mt-6">
                        <button onClick={() => setIsCorrectionModalOpen(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 font-bold rounded-lg text-sm hover:bg-gray-200">Batal</button>
                        <button onClick={submitCorrection} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 flex items-center justify-center gap-2"><Send className="w-3 h-3" /> Kirim</button>
                    </div>
                </div>
            </div>
        )}

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between gap-4 print:hidden">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg font-bold text-sm border border-blue-100">
                        <Award className="w-4 h-4" /> Manajemen Ijazah
                    </div>
                    
                    {/* TABS Navigation (Visible for Students Now) */}
                    <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                        <button onClick={() => { setActiveTab('DATA'); if(userRole!=='STUDENT') setViewMode('LIST'); }} className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'DATA' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
                            <ScrollText className="w-3 h-3" /> Data Ijazah
                        </button>
                        <button onClick={() => setActiveTab('NILAI')} className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'NILAI' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
                            <FileText className="w-3 h-3" /> Nilai Ijazah
                        </button>
                    </div>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto items-center">
                    {/* Switch Certificate/Transcript within DATA tab */}
                    {activeTab === 'DATA' && viewMode === 'DETAIL' && (
                        <button onClick={() => setDetailType(t => t === 'CERTIFICATE' ? 'TRANSCRIPT' : 'CERTIFICATE')} className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 flex items-center gap-1 border border-blue-200">
                            {detailType === 'CERTIFICATE' ? <FileText className="w-4 h-4" /> : <ScrollText className="w-4 h-4" />}
                            Ganti ke {detailType === 'CERTIFICATE' ? 'Transkrip' : 'Ijazah'}
                        </button>
                    )}

                    {activeTab === 'DATA' && viewMode === 'DETAIL' && userRole !== 'STUDENT' && (
                        <div className="flex gap-2">
                            <button onClick={() => setViewMode('LIST')} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-200 flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Kembali</button>
                        </div>
                    )}

                    {userRole === 'ADMIN' && (
                        <select className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium" value={dbClassFilter} onChange={(e) => setDbClassFilter(e.target.value)}>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c === 'ALL' ? 'Semua Kelas' : `Kelas ${c}`}</option>)}
                        </select>
                    )}

                    {activeTab === 'NILAI' && (
                        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 hidden md:flex">
                            {/* Layout Toggle */}
                            <button onClick={() => setTableLayout('SUBJECT')} className={`px-3 py-1 rounded text-[10px] font-bold flex items-center gap-1 ${tableLayout === 'SUBJECT' ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`} title="Group per Mapel">
                                <Rows className="w-3 h-3" /> Per Mapel
                            </button>
                            <button onClick={() => setTableLayout('SEMESTER')} className={`px-3 py-1 rounded text-[10px] font-bold flex items-center gap-1 ${tableLayout === 'SEMESTER' ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`} title="Group per Semester">
                                <Columns className="w-3 h-3" /> Per Semester
                            </button>
                            {tableLayout === 'SUBJECT' && (
                                <>
                                    <div className="w-px h-4 bg-gray-300 mx-1"></div>
                                    <button onClick={() => setViewDetailScore(false)} className={`px-2 py-1 rounded text-[10px] font-bold ${!viewDetailScore ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`} title="Ringkasan"><LayoutList className="w-3 h-3" /></button>
                                    <button onClick={() => setViewDetailScore(true)} className={`px-2 py-1 rounded text-[10px] font-bold ${viewDetailScore ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`} title="Detail"><TableProperties className="w-3 h-3" /></button>
                                </>
                            )}
                        </div>
                    )}

                    {(viewMode === 'LIST' || activeTab === 'NILAI') && (
                        <>
                            <div className="relative flex-1 md:w-48"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" /><input type="text" placeholder="Cari..." className="w-full pl-8 pr-4 py-2 bg-gray-100 rounded-lg text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                            <button onClick={handleDownloadExcel} className="bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-700 flex items-center gap-1 shadow-sm"><FileSpreadsheet className="w-4 h-4" /> Export</button>
                        </>
                    )}
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col relative">
            <div className="overflow-auto flex-1 w-full pb-32" id="ijazah-table">
                
                {/* --- TAB DATA LIST --- */}
                {activeTab === 'DATA' && viewMode === 'LIST' && (
                    <table className="border-collapse w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm text-gray-700 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 text-center w-12 border-r">No</th>
                                <th className="px-4 py-3 text-left">Nama & NISN</th>
                                <th className="px-4 py-3 text-left">Tempat, Tgl Lahir</th>
                                <th className="px-4 py-3 text-left">Nama Orang Tua</th>
                                <th className="px-4 py-3 text-left">No. Seri Ijazah</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-center w-40">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredStudents.map((student, idx) => (
                                <tr key={student.id} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="px-4 py-3 text-center text-gray-500 border-r">{idx + 1}</td>
                                    <td className="px-4 py-3 cursor-pointer" onClick={() => handleViewDocument(student, 'CERTIFICATE')}>
                                        <div className="font-bold text-gray-800">{student.fullName}</div>
                                        <div className="text-xs text-gray-500 font-mono">{student.nisn}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm text-gray-700">
                                            {student.birthPlace ? student.birthPlace : '-'}, {formatDateIndo(student.birthDate)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3"><span className="font-medium text-gray-700 uppercase">{student.father.name || '-'}</span></td>
                                    <td className="px-4 py-3"><span className={`font-mono font-medium ${student.diplomaNumber ? 'text-blue-700' : 'text-gray-400 italic'}`}>{student.diplomaNumber || 'Belum diisi'}</span></td>
                                    <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded text-[10px] font-bold ${student.status === 'LULUS' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{student.status}</span></td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex gap-1 justify-center">
                                            <button onClick={() => handleViewDocument(student, 'CERTIFICATE')} className="px-2 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-[10px] font-bold flex items-center gap-1 shadow-sm border border-blue-200"><ScrollText className="w-3 h-3" /> Ijazah</button>
                                            <button onClick={() => handleViewDocument(student, 'TRANSCRIPT')} className="px-2 py-1.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-[10px] font-bold flex items-center gap-1 shadow-sm border border-purple-200"><FileText className="w-3 h-3" /> Transkrip</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* --- TAB NILAI IJAZAH LIST (TRANSPOSED TABLE for STUDENTS) --- */}
                {activeTab === 'NILAI' && (
                    <table className="border-collapse min-w-max text-sm">
                        <thead className="bg-blue-50 border-b border-blue-200 sticky top-0 z-10 shadow-sm text-blue-800 uppercase text-xs">
                            {tableLayout === 'SEMESTER' ? (
                                // --- LAYOUT BARU: BY SEMESTER ---
                                <>
                                    <tr>
                                        <th className="px-4 py-3 text-center w-12 border border-blue-200 sticky left-0 bg-blue-50 z-20" rowSpan={2}>No</th>
                                        <th className="px-4 py-3 text-left min-w-[200px] border border-blue-200 sticky left-[48px] bg-blue-50 z-20" rowSpan={2}>Nama Siswa</th>
                                        {[1, 2, 3, 4, 5, 6].map(sem => (
                                            <th key={sem} className="px-2 py-2 text-center border border-blue-200 font-black bg-blue-100/50" colSpan={SUBJECT_MAP.length + 1}>
                                                Semester {sem}
                                            </th>
                                        ))}
                                        <th className="px-4 py-3 text-center border border-blue-200 w-24" rowSpan={2}>Nilai Akhir</th>
                                    </tr>
                                    <tr>
                                        {[1, 2, 3, 4, 5, 6].map(sem => (
                                            <React.Fragment key={sem}>
                                                {SUBJECT_MAP.map(sub => (
                                                    <th key={`${sem}-${sub.key}`} className="px-1 py-1 text-[8px] border border-blue-200 min-w-[60px] text-center whitespace-normal">
                                                        {sub.label}
                                                    </th>
                                                ))}
                                                <th className="px-1 py-1 text-[8px] border border-blue-200 w-12 min-w-[50px] text-center bg-blue-100 font-bold">Rata-rata Sem {sem}</th>
                                            </React.Fragment>
                                        ))}
                                    </tr>
                                </>
                            ) : (
                                // --- LAYOUT LAMA: BY SUBJECT (DEFAULT) ---
                                <>
                                    <tr>
                                        <th className="px-4 py-3 text-center w-12 border border-blue-200 sticky left-0 bg-blue-50 z-20" rowSpan={2}>No</th>
                                        <th className="px-4 py-3 text-left min-w-[200px] border border-blue-200 sticky left-[48px] bg-blue-50 z-20" rowSpan={2}>Nama Siswa</th>
                                        {SUBJECT_MAP.map(sub => (
                                            <th key={sub.key} className="px-2 py-3 text-center border border-blue-200" colSpan={viewDetailScore ? 7 : 1}>
                                                {sub.label}
                                            </th>
                                        ))}
                                        <th className="px-4 py-3 text-center border border-blue-200 w-24" rowSpan={2}>Nilai Akhir</th>
                                    </tr>
                                    {viewDetailScore && (
                                        <tr>
                                            {SUBJECT_MAP.map(sub => (
                                                <React.Fragment key={sub.key}>
                                                    <th className="px-1 py-1 text-[8px] border border-blue-200 w-8">1</th>
                                                    <th className="px-1 py-1 text-[8px] border border-blue-200 w-8">2</th>
                                                    <th className="px-1 py-1 text-[8px] border border-blue-200 w-8">3</th>
                                                    <th className="px-1 py-1 text-[8px] border border-blue-200 w-8">4</th>
                                                    <th className="px-1 py-1 text-[8px] border border-blue-200 w-8">5</th>
                                                    <th className="px-1 py-1 text-[8px] border border-blue-200 w-8">6</th>
                                                    <th className="px-1 py-1 text-[8px] border border-blue-200 font-bold bg-blue-100 w-10">Avg</th>
                                                </React.Fragment>
                                            ))}
                                        </tr>
                                    )}
                                </>
                            )}
                        </thead>
                        <tbody className="divide-y divide-blue-50">
                            {filteredStudents.map((student, idx) => {
                                const finalGrade = calculateFinalGrade(student);
                                return (
                                    <tr key={student.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-4 py-2 text-center text-gray-500 border border-blue-100 sticky left-0 bg-white z-10 shadow-sm">{idx + 1}</td>
                                        <td className="px-4 py-2 font-medium text-gray-900 border border-blue-100 sticky left-[48px] bg-white z-10 shadow-sm min-w-[200px]">
                                            <div>{student.fullName}</div>
                                            <div className="text-xs text-gray-400 font-mono">{student.nisn}</div>
                                        </td>
                                        
                                        {tableLayout === 'SEMESTER' ? (
                                            // --- RENDER BODY: BY SEMESTER ---
                                            [1, 2, 3, 4, 5, 6].map(sem => {
                                                const rowAvg = calculateSemesterRowAvg(student, sem);
                                                return (
                                                    <React.Fragment key={sem}>
                                                        {SUBJECT_MAP.map(sub => {
                                                            const score = getScore(student, sub.key, sem);
                                                            return (
                                                                <td key={`${sem}-${sub.key}`} className="px-1 py-2 text-center text-[10px] border border-blue-100 min-w-[40px]">
                                                                    <span className={getScoreColor(score)}>{score > 0 ? score : '-'}</span>
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="px-1 py-2 text-center font-bold border border-blue-100 bg-blue-50/50 text-[10px]">
                                                            <span className={getScoreColor(rowAvg)}>{rowAvg > 0 ? rowAvg : '-'}</span>
                                                        </td>
                                                    </React.Fragment>
                                                );
                                            })
                                        ) : (
                                            // --- RENDER BODY: BY SUBJECT ---
                                            SUBJECT_MAP.map(sub => {
                                                const avg = calculateSubjectAvg(student, sub.key);
                                                return viewDetailScore ? (
                                                    <React.Fragment key={sub.key}>
                                                        {[1,2,3,4,5,6].map(sem => {
                                                            const score = getScore(student, sub.key, sem);
                                                            return <td key={sem} className="px-1 py-2 text-center text-[10px] text-gray-600 border border-blue-100">{score > 0 ? score : '-'}</td>;
                                                        })}
                                                        <td className="px-1 py-2 text-center font-bold border border-blue-100 bg-blue-50/50">
                                                            <span className={`px-1 rounded text-[10px] ${getScoreColor(avg)}`}>{avg > 0 ? avg : '-'}</span>
                                                        </td>
                                                    </React.Fragment>
                                                ) : (
                                                    <td key={sub.key} className="px-2 py-2 text-center border border-blue-100">
                                                        <span className={`px-2 py-1 rounded text-xs ${getScoreColor(avg)}`}>{avg > 0 ? avg : '-'}</span>
                                                    </td>
                                                );
                                            })
                                        )}

                                        <td className="px-4 py-2 text-center font-bold text-blue-700 bg-blue-50/20 border border-blue-100">
                                            <span className={`px-2 py-1 rounded ${getScoreColor(finalGrade)}`}>{finalGrade > 0 ? finalGrade : '-'}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}

                {/* --- DETAIL VIEW (CERTIFICATE / TRANSCRIPT) --- */}
                {activeTab === 'DATA' && viewMode === 'DETAIL' && selectedStudent && (
                    <div className="flex flex-col items-center p-8 bg-gray-100 min-h-full">
                        {detailType === 'CERTIFICATE' ? (
                            <div className="w-[210mm] min-h-[297mm] bg-white shadow-2xl p-12 text-center text-gray-900 font-serif relative">
                                {/* CENTERED LAYOUT AS PER IMAGE REQUEST */}
                                <div className="mb-6">
                                    <h3 className="text-md font-bold uppercase tracking-wide">KEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH</h3>
                                    <h3 className="text-md font-bold uppercase tracking-wide">REPUBLIK INDONESIA</h3>
                                </div>
                                
                                <div className="mb-8">
                                    <h1 className="text-5xl font-black uppercase tracking-widest mb-4">IJAZAH</h1>
                                    <h3 className="text-lg font-bold">SEKOLAH MENENGAH PERTAMA</h3>
                                    <h3 className="text-lg font-bold">TAHUN AJARAN {activeYear}</h3>
                                </div>

                                <p className="mb-6 text-sm">Dengan ini menyatakan bahwa:</p>

                                <div className="mb-6">
                                    <h2 className="text-3xl font-bold uppercase font-serif tracking-wide border-b-2 border-transparent inline-block pb-1 px-4">
                                        <InteractiveField value={selectedStudent.fullName} fieldKey="fullName" />
                                    </h2>
                                </div>

                                {/* DATA FIELDS - CENTERED GRID LOOK */}
                                <div className="w-full max-w-2xl mx-auto space-y-2 text-sm mb-8">
                                    <div className="flex justify-center gap-2">
                                        <span className="w-48 text-right">tempat, tanggal lahir</span>
                                        <span>:</span>
                                        <span className="w-64 text-left font-bold capitalize">
                                            <InteractiveField 
                                                value={`${selectedStudent.birthPlace || '...'}, ${formatDateIndo(selectedStudent.birthDate)}`} 
                                                fieldKey="birthPlace" 
                                            />
                                        </span>
                                    </div>
                                    <div className="flex justify-center gap-2">
                                        <span className="w-48 text-right">nama orang tua/wali</span>
                                        <span>:</span>
                                        <span className="w-64 text-left font-bold uppercase">
                                            <InteractiveField value={selectedStudent.father.name} fieldKey="father.name" />
                                        </span>
                                    </div>
                                    <div className="flex justify-center gap-2">
                                        <span className="w-48 text-right">Nomor Induk Siswa</span>
                                        <span>:</span>
                                        <span className="w-64 text-left font-bold">
                                            <InteractiveField value={selectedStudent.nis} fieldKey="nis" />
                                        </span>
                                    </div>
                                    <div className="flex justify-center gap-2">
                                        <span className="w-48 text-right">Nomor Induk Siswa Nasional</span>
                                        <span>:</span>
                                        <span className="w-64 text-left font-bold">
                                            <InteractiveField value={selectedStudent.nisn} fieldKey="nisn" />
                                        </span>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <h1 className="text-4xl font-black uppercase tracking-[0.2em]">L U L U S</h1>
                                </div>
                                
                                <p className="mb-4 text-sm">dari,</p>

                                <div className="w-full max-w-2xl mx-auto space-y-2 text-sm mb-12">
                                    <div className="flex justify-center gap-2">
                                        <span className="w-64 text-right">satuan pendidikan</span>
                                        <span>:</span>
                                        <span className="w-64 text-left font-bold uppercase">SMPN 3 PACET</span>
                                    </div>
                                    <div className="flex justify-center gap-2">
                                        <span className="w-64 text-right">Nomor Pokok Sekolah Nasional</span>
                                        <span>:</span>
                                        <span className="w-64 text-left font-bold">20555784</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-end px-10 mt-auto">
                                    <div className="w-32 h-40 border border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 text-xs shadow-sm">
                                        FOTO 3x4
                                    </div>
                                    <div className="text-center text-sm">
                                        <p className="mb-20">Mojokerto, ...................... <br/> Kepala Sekolah</p>
                                        <p className="font-bold underline uppercase">{headmasterName}</p>
                                        <p>NIP. {headmasterNip}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="w-[215mm] min-h-[330mm] bg-white shadow-2xl p-12 text-gray-900 font-serif text-sm relative">
                                <h2 className="text-center font-bold text-lg mb-2 underline">DAFTAR NILAI SEKOLAH MENENGAH PERTAMA</h2>
                                <div className="text-center text-sm mb-6">TAHUN AJARAN {activeYear}</div>
                                
                                <table className="w-full mb-6 text-sm">
                                    <tbody>
                                        <tr><td className="w-40 font-bold">Nama</td><td>: {selectedStudent.fullName}</td></tr>
                                        <tr><td className="font-bold">Tempat, Tanggal Lahir</td><td>: {selectedStudent.birthPlace}, {formatDateIndo(selectedStudent.birthDate)}</td></tr>
                                        <tr><td className="font-bold">NIS / NISN</td><td>: {selectedStudent.nis} / {selectedStudent.nisn}</td></tr>
                                    </tbody>
                                </table>
                                
                                {/* TRANSCRIPT TABLE: COLUMNAR FORMAT (STANDARD) */}
                                <table className="w-full border-collapse border border-black text-[10px] mb-8">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border border-black p-2 text-center w-8" rowSpan={2}>No</th>
                                            <th className="border border-black p-2 text-center" rowSpan={2}>Mata Pelajaran</th>
                                            <th className="border border-black p-2 text-center" colSpan={6}>Semester</th>
                                            <th className="border border-black p-2 text-center" rowSpan={2}>Rata-Rata</th>
                                        </tr>
                                        <tr className="bg-gray-100">
                                            <th className="border border-black p-1 w-8 text-center">1</th>
                                            <th className="border border-black p-1 w-8 text-center">2</th>
                                            <th className="border border-black p-1 w-8 text-center">3</th>
                                            <th className="border border-black p-1 w-8 text-center">4</th>
                                            <th className="border border-black p-1 w-8 text-center">5</th>
                                            <th className="border border-black p-1 w-8 text-center">6</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* KELOMPOK A */}
                                        <tr><td className="border border-black p-1 font-bold bg-gray-50" colSpan={9}>Kelompok A</td></tr>
                                        {SUBJECT_MAP.slice(0, 7).map((sub, idx) => {
                                            const avg = calculateSubjectAvg(selectedStudent, sub.key);
                                            return (
                                                <tr key={sub.key}>
                                                    <td className="border border-black p-1 text-center">{idx + 1}</td>
                                                    <td className="border border-black p-1">{sub.full}</td>
                                                    {[1, 2, 3, 4, 5, 6].map(sem => {
                                                        const score = getScore(selectedStudent, sub.key, sem);
                                                        return <td key={sem} className="border border-black p-1 text-center">{score > 0 ? score : '-'}</td>;
                                                    })}
                                                    <td className="border border-black p-1 text-center font-bold bg-gray-50">{avg > 0 ? avg : '-'}</td>
                                                </tr>
                                            );
                                        })}
                                        
                                        {/* KELOMPOK B */}
                                        <tr><td className="border border-black p-1 font-bold bg-gray-50" colSpan={9}>Kelompok B</td></tr>
                                        {SUBJECT_MAP.slice(7).map((sub, idx) => {
                                            const avg = calculateSubjectAvg(selectedStudent, sub.key);
                                            return (
                                                <tr key={sub.key}>
                                                    <td className="border border-black p-1 text-center">{idx + 1}</td>
                                                    <td className="border border-black p-1">{sub.full}</td>
                                                    {[1, 2, 3, 4, 5, 6].map(sem => {
                                                        const score = getScore(selectedStudent, sub.key, sem);
                                                        return <td key={sem} className="border border-black p-1 text-center">{score > 0 ? score : '-'}</td>;
                                                    })}
                                                    <td className="border border-black p-1 text-center font-bold bg-gray-50">{avg > 0 ? avg : '-'}</td>
                                                </tr>
                                            );
                                        })}

                                        {/* FOOTER ROW: NILAI AKHIR SEKOLAH */}
                                        <tr className="bg-gray-100">
                                            <td className="border border-black p-2 font-bold text-center" colSpan={2}>RATA-RATA NILAI PER SEMESTER</td>
                                            {[1, 2, 3, 4, 5, 6].map(sem => {
                                                const semAvg = calculateSemesterRowAvg(selectedStudent, sem);
                                                return <td key={sem} className="border border-black p-1 text-center font-bold">{semAvg > 0 ? semAvg : '-'}</td>;
                                            })}
                                            <td className="border border-black p-1 text-center font-black text-lg">
                                                {calculateFinalGrade(selectedStudent) || '-'}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div className="flex justify-end mt-4 px-8">
                                    <div className="text-center"><p>Mojokerto, ....................</p><p>Kepala Sekolah</p><div className="h-20"></div><p className="font-bold underline uppercase">{headmasterName}</p><p>NIP. {headmasterNip}</p></div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default IjazahView;
