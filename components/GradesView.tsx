import React, { useState, useEffect, useRef } from 'react';
import { Student, AcademicRecord, CorrectionRequest } from '../types';
import { Search, FileSpreadsheet, Download, UploadCloud, Trash2, Save, Pencil, X, CheckCircle2, Loader2, LayoutList, ArrowLeft, Printer, FileDown, AlertTriangle, Eye } from 'lucide-react';

interface GradesViewProps {
  students: Student[];
  userRole?: 'ADMIN' | 'STUDENT' | 'GURU';
  loggedInStudent?: Student;
  onUpdate?: () => void;
}

const CLASS_LIST = ['VII A', 'VII B', 'VII C', 'VIII A', 'VIII B', 'VIII C', 'IX A', 'IX B', 'IX C'];

const GradesView: React.FC<GradesViewProps> = ({ students, userRole = 'ADMIN', loggedInStudent, onUpdate }) => {
  const [viewMode, setViewMode] = useState<'REPORT' | 'DATABASE'>('DATABASE');
  const [searchTerm, setSearchTerm] = useState('');
  const [dbClassFilter, setDbClassFilter] = useState<string>('ALL');
  const [dbSemester, setDbSemester] = useState<number>(1);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [renderKey, setRenderKey] = useState(0); // Force re-render
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Configuration State
  const [classConfig, setClassConfig] = useState<Record<string, { teacher: string, nip: string }>>({});
  const [p5Config, setP5Config] = useState<Record<string, { theme: string, description: string }[]>>({});
  
  interface AcademicData {
      year: string;
      semesterYears?: Record<number, string>;
      semesterDates?: Record<number, string>; 
      reportDate?: string; 
  }
  const [academicData, setAcademicData] = useState<AcademicData>({ year: '2024/2025' });

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScores, setEditScores] = useState<Record<string, number>>({});

  // Correction State for Students
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionSubject, setCorrectionSubject] = useState('');
  const [correctionCurrentScore, setCorrectionCurrentScore] = useState(0);
  const [correctionProposedScore, setCorrectionProposedScore] = useState('');
  const [correctionNote, setCorrectionNote] = useState('');

  // Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState<{ processed: number, success: number } | null>(null);

  const SUBJECT_MAP = [
      { key: 'PAI', label: 'PAI', full: 'Pendidikan Agama dan Budi Pekerti' },
      { key: 'Pendidikan Pancasila', label: 'PPKn', full: 'Pendidikan Pancasila' },
      { key: 'Bahasa Indonesia', label: 'BIN', full: 'Bahasa Indonesia' },
      { key: 'Matematika', label: 'MTK', full: 'Matematika' },
      { key: 'IPA', label: 'IPA', full: 'Ilmu Pengetahuan Alam' },
      { key: 'IPS', label: 'IPS', full: 'Ilmu Pengetahuan Sosial' },
      { key: 'Bahasa Inggris', label: 'BIG', full: 'Bahasa Inggris' },
      { key: 'PJOK', label: 'PJOK', full: 'PJOK' },
      { key: 'Informatika', label: 'INF', full: 'Informatika' },
      { key: 'Seni dan Prakarya', label: 'SENI', full: 'Seni dan Prakarya' },
      { key: 'Bahasa Jawa', label: 'B.JAWA', full: 'Bahasa Jawa' },
  ];

  // Load Configs and Handle Student Role
  useEffect(() => {
      const savedClassConfig = localStorage.getItem('sys_class_config');
      if (savedClassConfig) setClassConfig(JSON.parse(savedClassConfig));

      const savedP5Config = localStorage.getItem('sys_p5_config');
      if (savedP5Config) setP5Config(JSON.parse(savedP5Config));

      const savedAcademic = localStorage.getItem('sys_academic_data');
      if (savedAcademic) setAcademicData(JSON.parse(savedAcademic));

      // Force view for Student (Initial Only)
      if (userRole === 'STUDENT' && loggedInStudent) {
          setViewMode('REPORT');
          setSelectedStudent(loggedInStudent);
      }
  }, [userRole, loggedInStudent]); 

  // Logic Filtering Data
  const effectiveStudents = (userRole === 'STUDENT' && loggedInStudent) ? [loggedInStudent] : students;

  const filteredStudents = effectiveStudents.filter(s => {
      const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.nisn.includes(searchTerm);
      const matchClass = userRole === 'STUDENT' ? true : (dbClassFilter === 'ALL' || s.className === dbClassFilter);
      return matchSearch && matchClass;
  });

  const getScore = (s: Student, subjKey: string, semesterOverride?: number) => {
      const sem = semesterOverride || dbSemester;
      const record = s.academicRecords?.[sem];
      if (!record) return 0;
      const subj = record.subjects.find(sub => sub.subject.startsWith(subjKey) || (subjKey === 'PAI' && sub.subject.includes('Agama')));
      return subj ? subj.score : 0;
  };

  const getRecord = (s: Student): AcademicRecord | undefined => {
      return s.academicRecords?.[dbSemester];
  };

  // Helper to determine Class Level based on Semester
  const getClassLevelFromSemester = (sem: number) => {
      if (sem <= 2) return 'VII';
      if (sem <= 4) return 'VIII';
      return 'IX';
  };

  const setScore = (s: Student, subjKey: string, val: number) => {
      if (userRole === 'GURU') return; // Teacher cannot edit

      if (!s.academicRecords) s.academicRecords = {};
      if (!s.academicRecords[dbSemester]) {
          const level = getClassLevelFromSemester(dbSemester);

          s.academicRecords[dbSemester] = { 
              semester: dbSemester, 
              classLevel: level, 
              phase: 'D', 
              year: '2024', 
              subjects: [], 
              p5Projects: [], 
              extracurriculars: [], 
              teacherNote: '', 
              promotionStatus: '', 
              attendance: { sick: 0, permitted: 0, noReason: 0 } 
          };
      }

      const record = s.academicRecords[dbSemester];
      let subj = record.subjects.find(sub => sub.subject.startsWith(subjKey) || (subjKey === 'PAI' && sub.subject.includes('Agama')));
      
      if (subj) {
          subj.score = val;
      } else {
          record.subjects.push({ no: record.subjects.length + 1, subject: subjKey === 'PAI' ? 'Pendidikan Agama' : subjKey, score: val, competency: '-' });
      }
  };

  // --- DELETE FUNCTION ---
  const handleDeleteRow = (student: Student) => {
      if (userRole === 'GURU') return;
      if (window.confirm(`Apakah Anda yakin menghapus nilai Semester ${dbSemester} untuk siswa ini?`)) {
          SUBJECT_MAP.forEach(sub => setScore(student, sub.key, 0));
          setRenderKey(prev => prev + 1); 
          alert("Data nilai berhasil dihapus (Reset ke 0).");
      }
  };

  // --- DOWNLOAD TEMPLATE FUNCTION ---
  const handleDownloadTemplate = () => {
      try {
          // @ts-ignore
          const xlsx = window.XLSX;
          if (!xlsx || !xlsx.utils) {
              alert("Library Excel (SheetJS) belum siap.");
              return;
          }
          if (dbClassFilter === 'ALL') {
              if (!window.confirm("Anda akan mendownload template untuk SEMUA siswa. Proses mungkin agak lama. Lanjutkan?")) return;
          }
          if (filteredStudents.length === 0) {
              alert("Tidak ada data siswa.");
              return;
          }

          const dataToExport = filteredStudents.map((s, index) => {
              const row: any = {
                  'No': index + 1,
                  'NISN': s.nisn || '',
                  'Nama Siswa': s.fullName,
                  'Kelas': s.className,
              };
              SUBJECT_MAP.forEach(sub => {
                  row[sub.label] = getScore(s, sub.key) || '';
              });
              return row;
          });

          const ws = xlsx.utils.json_to_sheet(dataToExport);
          const wscols = [ { wch: 5 }, { wch: 15 }, { wch: 30 }, { wch: 10 }, ...SUBJECT_MAP.map(() => ({ wch: 8 })) ];
          ws['!cols'] = wscols;
          const wb = xlsx.utils.book_new();
          xlsx.utils.book_append_sheet(wb, ws, "Nilai Siswa");
          const fileName = `Template_Nilai_${dbClassFilter === 'ALL' ? 'Semua' : dbClassFilter.replace(/\s/g, '')}_Sem${dbSemester}.xlsx`;
          xlsx.writeFile(wb, fileName);
      } catch (error) {
          console.error(error);
          alert("Gagal mendownload template.");
      }
  };

  // --- DOWNLOAD PDF F4 (REPORT CARD) ---
  const handleDownloadF4 = () => {
      if (!selectedStudent) return;
      setIsGeneratingPdf(true);
      const element = document.getElementById('report-content');
      const fileName = `Rapor_${selectedStudent.fullName.replace(/\s+/g, '_')}_Sem${dbSemester}_F4.pdf`;
      const opt = {
          margin: [3, 10, 3, 10], 
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
          jsPDF: { unit: 'mm', format: [215, 330], orientation: 'portrait' },
          pagebreak: { mode: 'avoid-all' }
      };
      // @ts-ignore
      if (window.html2pdf) {
          // @ts-ignore
          window.html2pdf().set(opt).from(element).save().then(() => setIsGeneratingPdf(false)).catch(() => setIsGeneratingPdf(false));
      } else {
          alert("Library PDF belum siap.");
          setIsGeneratingPdf(false);
      }
  };

  // --- IMPORT FUNCTION ---
  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsImporting(true);
      setImportProgress(0);
      setImportStats(null);
      const reader = new FileReader();
      
      reader.onload = (evt) => {
          try {
              // @ts-ignore
              const xlsx = window.XLSX;
              if (!xlsx) throw new Error("Library XLSX not found");
              const bstr = evt.target?.result;
              const wb = xlsx.read(bstr, { type: 'binary' });
              const ws = wb.Sheets[wb.SheetNames[0]];
              const data = xlsx.utils.sheet_to_json(ws);
              let updatedCount = 0;
              const totalRows = data.length;

              data.forEach((row: any, index) => {
                  const nisn = row['NISN'] ? String(row['NISN']).trim() : '';
                  const name = row['Nama Siswa'] ? String(row['Nama Siswa']).trim().toLowerCase() : '';
                  const targetStudent = students.find(s => (nisn && s.nisn === nisn) || (s.fullName.toLowerCase() === name && s.className === row['Kelas']));

                  if (targetStudent) {
                      SUBJECT_MAP.forEach(sub => {
                          if (row[sub.label] !== undefined && row[sub.label] !== '') {
                              const score = Number(row[sub.label]);
                              if (!isNaN(score)) setScore(targetStudent, sub.key, score);
                          }
                      });
                      updatedCount++;
                  }
                  if (index % 5 === 0) setImportProgress(Math.round(((index + 1) / totalRows) * 100));
              });
              setImportStats({ processed: totalRows, success: updatedCount });
              setRenderKey(prev => prev + 1);
              setImportProgress(100);
          } catch (error) {
              console.error(error);
              alert("Gagal membaca file Excel.");
              setIsImporting(false);
          }
      };
      reader.readAsBinaryString(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- EDITING ---
  const startEdit = (s: Student) => {
      if (userRole === 'GURU') return;
      setEditingId(s.id);
      const initialScores: any = {};
      SUBJECT_MAP.forEach(sub => initialScores[sub.key] = getScore(s, sub.key));
      setEditScores(initialScores);
  };

  const saveEdit = (s: Student) => {
      SUBJECT_MAP.forEach(sub => setScore(s, sub.key, editScores[sub.key]));
      setEditingId(null);
      setRenderKey(prev => prev + 1);
  };

  const handleViewReport = (s: Student) => {
      setSelectedStudent(s);
      setViewMode('REPORT');
  };

  // --- STUDENT CORRECTION HANDLERS ---
  const handleOpenCorrection = (subjectLabel: string, fullSubject: string, currentScore: number) => {
      setCorrectionSubject(`${fullSubject} (Semester ${dbSemester})`);
      setCorrectionCurrentScore(currentScore);
      setCorrectionProposedScore('');
      setCorrectionNote('');
      setCorrectionModalOpen(true);
  };

  const submitCorrection = () => {
      if (!selectedStudent) return;
      if (!correctionProposedScore) { alert('Mohon isi nilai yang seharusnya.'); return; }
      const newRequest: CorrectionRequest = {
          id: Math.random().toString(36).substr(2, 9),
          fieldKey: `Nilai: ${correctionSubject}`,
          fieldName: correctionSubject,
          originalValue: String(correctionCurrentScore),
          proposedValue: correctionProposedScore,
          status: 'PENDING',
          requestDate: new Date().toISOString(),
          adminNote: correctionNote ? `Siswa Note: ${correctionNote}` : undefined 
      };
      if (!selectedStudent.correctionRequests) selectedStudent.correctionRequests = [];
      selectedStudent.correctionRequests.push(newRequest);
      setCorrectionModalOpen(false);
      alert('Pengajuan koreksi nilai telah dikirim ke Admin.');
      if (onUpdate) onUpdate();
  };

  const ReportView = ({ student }: { student: Student }) => {
      const record = getRecord(student);
      const subjects = record?.subjects || [];
      const getSubjData = (key: string) => subjects.find(s => s.subject.includes(key) || (key === 'PAI' && s.subject.includes('Agama')));
      const currentYear = academicData.semesterYears?.[dbSemester] || academicData.year || '2024/2025';
      const rawReportDate = academicData.semesterDates?.[dbSemester] || academicData.reportDate || '2024-12-20';
      const formatReportDate = (dateStr: string) => {
          if (!dateStr) return '';
          try {
              return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
          } catch(e) { return dateStr; }
      };
      const titimangsaDate = formatReportDate(rawReportDate);
      const configKey = `${currentYear}-${dbSemester}-${student.className}`;
      const waliInfo = classConfig[configKey] || { teacher: '#N/A', nip: '-' };
      
      const level = getClassLevelFromSemester(dbSemester);

      const p5Key = `${currentYear}-${level}-${dbSemester}`;
      const p5Data = p5Config[p5Key] || [];
      const isStudent = userRole === 'STUDENT';
      const getCellClass = () => isStudent ? "bg-yellow-50 hover:bg-yellow-100 cursor-pointer print:bg-white text-blue-900" : "bg-white";
      const headerTableStyle: React.CSSProperties = { width: '100%', fontSize: '11px', fontFamily: '"Times New Roman", Times, serif', borderCollapse: 'collapse' };

      return (
          <div id="report-content" style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '11px' }} className="bg-white p-5 shadow-lg w-[190mm] min-h-[310mm] mx-auto text-black text-[11px] leading-tight box-border relative flex flex-col">
                {/* Header */}
                <div className="mb-2 border-b border-black pb-2 text-[11px]">
                    <div className="flex justify-between items-start">
                        <div className="w-1/2 pr-2">
                            <table style={headerTableStyle}>
                                <tbody>
                                    <tr><td className="w-24 pb-0.5">Nama Peserta Didik</td><td className="pb-0.5 font-bold uppercase">: {student.fullName}</td></tr>
                                    <tr><td className="pb-0.5">Kelas</td><td className="pb-0.5">: {student.className}</td></tr>
                                    <tr><td className="pb-0.5">Sekolah</td><td className="pb-0.5">: SMPN 3 PACET</td></tr>
                                    <tr><td className="pb-0.5">Alamat</td><td className="pb-0.5">: Jl. Tirtowening Ds. Kembangbelor Kec. Pacet</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="w-1/2 pl-2">
                            <table style={headerTableStyle}>
                                <tbody>
                                    <tr><td className="w-24 pb-0.5">Semester</td><td className="pb-0.5">: {dbSemester}</td></tr>
                                    <tr><td className="pb-0.5">Kelas</td><td className="pb-0.5">: {level}</td></tr>
                                    <tr><td className="pb-0.5">Fase</td><td className="pb-0.5">: D</td></tr>
                                    <tr><td className="pb-0.5">Tahun</td><td className="pb-0.5">: {currentYear}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* A. Intrakurikuler */}
                <h3 className="font-bold mb-0.5 text-[11px]">A. INTRAKURIKULER</h3>
                <table className="w-full border-collapse border border-black mb-2 text-[11px]">
                    <thead>
                        <tr className="bg-gray-100 text-center font-bold">
                            <td className="border border-black px-2 py-1 w-6">NO</td><td className="border border-black px-2 py-1">MATA PELAJARAN</td><td className="border border-black px-2 py-1 w-10">NILAI AKHIR</td><td className="border border-black px-2 py-1">CAPAIAN KOMPETENSI</td>
                        </tr>
                    </thead>
                    <tbody>
                        {SUBJECT_MAP.map((sub, idx) => {
                            const data = getSubjData(sub.key);
                            return (
                                <tr key={sub.key}>
                                    <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                                    <td className="border border-black px-2 py-1">{sub.full}</td>
                                    <td className={`border border-black px-2 py-1 text-center font-bold ${getCellClass()}`} onClick={() => isStudent && handleOpenCorrection(sub.label, sub.full, data?.score || 0)}>
                                        {data?.score || '#N/A'}
                                    </td>
                                    <td className="border border-black px-2 py-1 italic">{data?.competency || '#N/A'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                
                {/* B. P5 */}
                <h3 className="font-bold mb-0.5 text-[11px]">B. P5</h3>
                <table className="w-full border-collapse border border-black mb-2 text-[11px]">
                    <thead><tr className="bg-gray-100 text-center font-bold"><td className="border border-black px-2 py-1 w-6">NO</td><td className="border border-black px-2 py-1">TEMA</td><td className="border border-black px-2 py-1">DESKRIPSI</td></tr></thead>
                    <tbody>
                        {p5Data.length > 0 ? p5Data.map((p5, idx) => (
                            <tr key={idx}><td className="border border-black px-2 py-1 text-center">{idx + 1}</td><td className="border border-black px-2 py-1">{p5.theme}</td><td className="border border-black px-2 py-1">{p5.description}</td></tr>
                        )) : <tr><td colSpan={3} className="border border-black px-2 py-1 text-center">-</td></tr>}
                    </tbody>
                </table>

                {/* C. Ekstrakurikuler */}
                <h3 className="font-bold mb-0.5 text-[11px]">C. EKSTRAKURIKULER</h3>
                <table className="w-full border-collapse border border-black mb-2 text-[11px]">
                    <thead>
                        <tr className="bg-gray-100 text-center font-bold">
                            <td className="border border-black px-2 py-1 w-6">NO</td>
                            <td className="border border-black px-2 py-1">KEGIATAN</td>
                            <td className="border border-black px-2 py-1 w-20">PREDIKAT</td>
                            <td className="border border-black px-2 py-1">KETERANGAN</td>
                        </tr>
                    </thead>
                    <tbody>
                        {record?.extracurriculars && record.extracurriculars.length > 0 ? (
                            record.extracurriculars.map((ex, idx) => (
                                <tr key={idx}>
                                    <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                                    <td className="border border-black px-2 py-1">{ex.name}</td>
                                    <td className="border border-black px-2 py-1 text-center">{ex.score}</td>
                                    <td className="border border-black px-2 py-1">-</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td className="border border-black px-2 py-1 text-center">1</td>
                                <td className="border border-black px-2 py-1">Pramuka</td>
                                <td className="border border-black px-2 py-1 text-center">Baik</td>
                                <td className="border border-black px-2 py-1">-</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* D. Ketidakhadiran */}
                <h3 className="font-bold mb-0.5 text-[11px]">D. KETIDAKHADIRAN</h3>
                <table className="w-full border-collapse border border-black mb-2 text-[11px]">
                    <tbody>
                        <tr>
                            <td className="border border-black px-2 py-1 w-48">Sakit</td>
                            <td className="border border-black px-2 py-1 text-center w-10">{record?.attendance?.sick ?? '-'}</td>
                            <td className="border border-black px-2 py-1">Hari</td>
                        </tr>
                        <tr>
                            <td className="border border-black px-2 py-1">Ijin</td>
                            <td className="border border-black px-2 py-1 text-center">{record?.attendance?.permitted ?? '-'}</td>
                            <td className="border border-black px-2 py-1">Hari</td>
                        </tr>
                        <tr>
                            <td className="border border-black px-2 py-1">Tanpa Keterangan</td>
                            <td className="border border-black px-2 py-1 text-center">{record?.attendance?.noReason ?? '-'}</td>
                            <td className="border border-black px-2 py-1">Hari</td>
                        </tr>
                    </tbody>
                </table>

                {/* Footer signatures - Adjusted position */}
                <div className="flex justify-between items-start text-[11px] mt-6">
                    <div className="text-center w-[40%]"><p className="mb-14">Mengetahui,<br/>Kepala Sekolah</p><p className="font-bold underline">DIDIK SULISTYO, M.M.Pd</p><p>NIP. 19660518198901 1 002</p></div>
                    <div className="text-center w-[40%]"><p className="mb-14">Pacet, {titimangsaDate}<br/>Wali Kelas</p><p className="font-bold underline">{waliInfo.teacher}</p><p>NIP. {waliInfo.nip}</p></div>
                </div>
          </div>
      );
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in relative">
        {/* CORRECTION MODAL */}
        {correctionModalOpen && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="font-bold text-gray-800">Ajukan Koreksi Nilai</h3><button onClick={() => setCorrectionModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button></div>
                    <div className="space-y-3">
                        <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 border border-blue-100"><p className="font-bold">{correctionSubject}</p><p>Nilai Saat Ini: <span className="font-mono font-bold text-lg">{correctionCurrentScore}</span></p></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nilai Seharusnya</label><input type="number" className="w-full p-2 border rounded" value={correctionProposedScore} onChange={(e) => setCorrectionProposedScore(e.target.value)} /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Alasan</label><textarea className="w-full p-2 border rounded" rows={3} value={correctionNote} onChange={(e) => setCorrectionNote(e.target.value)} /></div>
                    </div>
                    <button onClick={submitCorrection} className="mt-6 w-full py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">Kirim Pengajuan</button>
                </div>
            </div>
        )}

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        {viewMode !== 'REPORT' ? (
             <>
                <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
                    {userRole === 'ADMIN' && (
                        <button onClick={() => setViewMode('DATABASE')} className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm border transition-colors bg-green-50 text-green-700 border-green-100`}>
                            <FileSpreadsheet className="w-4 h-4" /> <span>Input Nilai</span>
                        </button>
                    )}
                    {userRole === 'GURU' && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm border bg-gray-50 text-gray-500">
                            <Eye className="w-4 h-4" /> Mode Lihat (Guru)
                        </div>
                    )}
                    
                    {(userRole === 'ADMIN' || userRole === 'GURU') && (
                        <select className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium" value={dbClassFilter} onChange={(e) => setDbClassFilter(e.target.value)}>
                            <option value="ALL">Semua Kelas</option>
                            {CLASS_LIST.map(c => <option key={c} value={c}>Kelas {c}</option>)}
                        </select>
                    )}

                    <select className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium" value={dbSemester} onChange={(e) => setDbSemester(Number(e.target.value))}>
                        {[1, 2, 3, 4, 5, 6].map(sem => (<option key={sem} value={sem}>Semester {sem}</option>))}
                    </select>
                </div>

                <div className="flex gap-2 w-full xl:w-auto">
                    <div className="relative flex-1 xl:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input type="text" placeholder="Cari Siswa..." className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm outline-none focus:bg-white border border-transparent focus:border-blue-300 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    {userRole === 'ADMIN' && (
                        <>
                            <button onClick={handleDownloadTemplate} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-2 shadow-sm whitespace-nowrap"><Download className="w-4 h-4" /> Template</button>
                            <button onClick={handleImportClick} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm whitespace-nowrap"><UploadCloud className="w-4 h-4" /> Upload Nilai</button>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx" onChange={handleFileChange} />
                        </>
                    )}
                </div>
             </>
        ) : (
            <div className="w-full flex justify-between items-center">
                <button onClick={() => setViewMode('DATABASE')} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-50 text-gray-700"><ArrowLeft className="w-4 h-4" /> Kembali</button>
                <div className="flex items-center gap-2">
                     <select className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium" value={dbSemester} onChange={(e) => setDbSemester(Number(e.target.value))}>{[1, 2, 3, 4, 5, 6].map(sem => (<option key={sem} value={sem}>Semester {sem}</option>))}</select>
                    <button onClick={handleDownloadF4} disabled={isGeneratingPdf} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 shadow-sm disabled:opacity-50 disabled:cursor-wait">{isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} Download PDF (F4)</button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm" onClick={() => window.print()}><Printer className="w-4 h-4" /> Cetak</button>
                </div>
            </div>
        )}
      </div>

      {/* Main Content */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col relative">
          
          {/* IMPORT OVERLAY */}
          {isImporting && (
             <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                 <div className="bg-white rounded-xl shadow-2xl p-6 flex flex-col items-center w-80 animate-fade-in">
                    {!importStats ? (
                        <>
                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" /><h3 className="font-bold text-gray-800">Membaca Excel...</h3>
                            <div className="w-full bg-gray-200 rounded-full h-3 mt-4 overflow-hidden"><div className="bg-blue-600 h-full transition-all duration-100" style={{ width: `${importProgress}%` }}></div></div>
                        </>
                    ) : (
                        <>
                             <CheckCircle2 className="w-12 h-12 text-green-600 mb-4" /><h3 className="font-bold text-gray-800">Import Selesai!</h3>
                             <p className="text-sm text-gray-500 mt-1">{importStats.success} dari {importStats.processed} Siswa berhasil diupdate.</p>
                             <button onClick={() => setIsImporting(false)} className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">Tutup</button>
                        </>
                    )}
                 </div>
             </div>
          )}

          {viewMode === 'DATABASE' ? (
              <div className="overflow-auto flex-1 w-full">
                  <table className="border-collapse w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm text-gray-600 uppercase text-xs">
                          <tr>
                              <th className="px-4 py-3 text-left w-16">Aksi</th>
                              <th className="px-4 py-3 text-left min-w-[200px]">Nama Siswa</th>
                              <th className="px-4 py-3 text-center">Kelas</th>
                              {SUBJECT_MAP.map(sub => (
                                  <th key={sub.key} className="px-2 py-3 text-center min-w-[60px]" title={sub.full}>{sub.label}</th>
                              ))}
                              <th className="px-4 py-3 text-center">Rata-rata</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredStudents.length > 0 ? filteredStudents.map((student) => {
                              const isEditingRow = editingId === student.id;
                              let totalScore = 0;
                              let count = 0;

                              return (
                                  <tr key={student.id + renderKey} className="hover:bg-blue-50 transition-colors group">
                                      <td className="px-4 py-2 flex gap-1 items-center">
                                          {isEditingRow ? (
                                              <>
                                                <button onClick={() => saveEdit(student)} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"><Save className="w-4 h-4" /></button>
                                                <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"><X className="w-4 h-4" /></button>
                                              </>
                                          ) : (
                                              <>
                                                {userRole === 'ADMIN' && (
                                                    <button onClick={() => startEdit(student)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title="Edit Nilai"><Pencil className="w-4 h-4" /></button>
                                                )}
                                                <button onClick={() => handleViewReport(student)} className="p-1.5 text-purple-600 hover:bg-purple-100 rounded" title="Lihat Rapor"><LayoutList className="w-4 h-4" /></button>
                                                {userRole === 'ADMIN' && (
                                                    <button onClick={() => handleDeleteRow(student)} className="p-1.5 text-red-600 hover:bg-red-100 rounded" title="Hapus Nilai"><Trash2 className="w-4 h-4" /></button>
                                                )}
                                              </>
                                          )}
                                      </td>
                                      <td className="px-4 py-2 font-medium text-gray-900"><div>{student.fullName}</div><div className="text-xs text-gray-400 font-mono">{student.nisn}</div></td>
                                      <td className="px-4 py-2 text-center text-gray-500">{student.className}</td>
                                      {SUBJECT_MAP.map(sub => {
                                          const score = isEditingRow ? (editScores[sub.key] || 0) : getScore(student, sub.key);
                                          if (!isEditingRow) { totalScore += score; count++; }
                                          return (
                                              <td key={sub.key} className="px-2 py-2 text-center">
                                                  {isEditingRow ? <input type="number" className="w-12 text-center border border-blue-300 rounded p-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none" value={editScores[sub.key] || 0} onChange={(e) => setEditScores({...editScores, [sub.key]: Number(e.target.value)})} /> : <span className={`font-semibold ${score < 75 ? 'text-red-500' : 'text-gray-700'}`}>{score}</span>}
                                              </td>
                                          );
                                      })}
                                      <td className="px-4 py-2 text-center font-bold text-blue-700">{count > 0 ? (totalScore / count).toFixed(1) : '-'}</td>
                                  </tr>
                              );
                          }) : (
                              <tr><td colSpan={15} className="p-8 text-center text-gray-500">Tidak ada data siswa.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          ) : (
              <div className="overflow-auto flex-1 bg-gray-500/10 p-8 flex justify-center">{selectedStudent && <ReportView student={selectedStudent} />}</div>
          )}
      </div>
    </div>
  );
};

export default GradesView;