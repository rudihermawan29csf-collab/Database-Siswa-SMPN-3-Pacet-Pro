import React, { useState, useEffect, useRef } from 'react';
import { Student, AcademicRecord, CorrectionRequest } from '../types';
import { Search, FileSpreadsheet, Download, UploadCloud, Trash2, Save, Pencil, X, CheckCircle2, Loader2, LayoutList, ArrowLeft, Printer, FileDown, AlertTriangle } from 'lucide-react';

interface GradesViewProps {
  students: Student[];
  userRole?: 'ADMIN' | 'STUDENT';
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
      semesterDates?: Record<number, string>; // Add dates mapping
      reportDate?: string; // Fallback
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

  // Load Configs and Handle Student Role
  useEffect(() => {
      const savedClassConfig = localStorage.getItem('sys_class_config');
      if (savedClassConfig) setClassConfig(JSON.parse(savedClassConfig));

      const savedP5Config = localStorage.getItem('sys_p5_config');
      if (savedP5Config) setP5Config(JSON.parse(savedP5Config));

      const savedAcademic = localStorage.getItem('sys_academic_data');
      if (savedAcademic) setAcademicData(JSON.parse(savedAcademic));

      // Force view for Student
      if (userRole === 'STUDENT' && loggedInStudent) {
          setViewMode('REPORT');
          setSelectedStudent(loggedInStudent);
          // Optional: Load latest semester based on academicData or default to 1
      }
  }, [userRole, loggedInStudent]);

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

  const filteredStudents = students.filter(s => {
      const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchClass = dbClassFilter === 'ALL' || s.className === dbClassFilter;
      return matchSearch && matchClass;
  });

  // --- HELPER NILAI ---
  const getScore = (s: Student, subjKey: string) => {
      const record = s.academicRecords?.[dbSemester];
      if (!record) return 0;
      const subj = record.subjects.find(sub => sub.subject.startsWith(subjKey) || (subjKey === 'PAI' && sub.subject.includes('Agama')));
      return subj ? subj.score : 0;
  };

  const getRecord = (s: Student): AcademicRecord | undefined => {
      return s.academicRecords?.[dbSemester];
  };

  const setScore = (s: Student, subjKey: string, val: number) => {
      if (!s.academicRecords) s.academicRecords = {};
      
      // Initialize record if it doesn't exist for the selected semester
      if (!s.academicRecords[dbSemester]) {
          // Determine Class Level based on Semester
          let level = 'VII';
          if (dbSemester === 3 || dbSemester === 4) level = 'VIII';
          if (dbSemester === 5 || dbSemester === 6) level = 'IX';

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

  // --- DELETE FUNCTION (FIXED) ---
  const handleDeleteRow = (student: Student) => {
      if (window.confirm(`Apakah Anda yakin menghapus nilai Semester ${dbSemester} untuk siswa ini?`)) {
          SUBJECT_MAP.forEach(sub => setScore(student, sub.key, 0));
          setRenderKey(prev => prev + 1); 
          alert("Data nilai berhasil dihapus (Reset ke 0).");
      }
  };

  // --- DOWNLOAD TEMPLATE FUNCTION ---
  const handleDownloadTemplate = () => {
      try {
          // Use Global XLSX Object loaded via script tag in index.html
          // @ts-ignore
          const xlsx = window.XLSX;

          if (!xlsx || !xlsx.utils) {
              alert("Library Excel (SheetJS) belum siap. Pastikan koneksi internet lancar dan refresh halaman.");
              return;
          }

          if (dbClassFilter === 'ALL') {
              if (!window.confirm("Anda akan mendownload template untuk SEMUA siswa. Proses mungkin agak lama. Lanjutkan?")) return;
          }

          if (filteredStudents.length === 0) {
              alert("Tidak ada data siswa yang ditampilkan untuk didownload. Pilih filter kelas lain.");
              return;
          }

          // Prepare Data
          const dataToExport = filteredStudents.map((s, index) => {
              const row: any = {
                  'No': index + 1,
                  'NISN': s.nisn || '', // Key identifier
                  'Nama Siswa': s.fullName,
                  'Kelas': s.className,
              };
              
              // Add Columns for each subject (pre-fill with existing scores if any)
              SUBJECT_MAP.forEach(sub => {
                  row[sub.label] = getScore(s, sub.key) || '';
              });

              return row;
          });

          // Create Worksheet
          const ws = xlsx.utils.json_to_sheet(dataToExport);
          
          // Auto-width for columns
          const wscols = [
              { wch: 5 },  // No
              { wch: 15 }, // NISN
              { wch: 30 }, // Nama
              { wch: 10 }, // Kelas
              ...SUBJECT_MAP.map(() => ({ wch: 8 })) // Subjects
          ];
          ws['!cols'] = wscols;

          // Create Workbook
          const wb = xlsx.utils.book_new();
          xlsx.utils.book_append_sheet(wb, ws, "Nilai Siswa");

          // Generate File Name
          const fileName = `Template_Nilai_${dbClassFilter === 'ALL' ? 'Semua' : dbClassFilter.replace(/\s/g, '')}_Sem${dbSemester}.xlsx`;

          // Download
          xlsx.writeFile(wb, fileName);
      } catch (error) {
          console.error("Download failed:", error);
          alert("Gagal mendownload template. Cek console browser untuk detail error.");
      }
  };

  // --- DOWNLOAD PDF F4 ---
  const handleDownloadF4 = () => {
      if (!selectedStudent) return;
      setIsGeneratingPdf(true);

      const element = document.getElementById('report-content');
      const fileName = `Rapor_${selectedStudent.fullName.replace(/\s+/g, '_')}_Sem${dbSemester}_F4.pdf`;

      // Optimasi ukuran agar pas 1 Halaman F4 (215x330mm)
      // Mengurangi margin agar muat dan menggunakan format custom untuk F4
      const opt = {
          margin: [3, 10, 3, 10], // Top, Left, Bottom, Right (mm) - More vertical space saved
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
          // Custom F4 size in mm
          jsPDF: { unit: 'mm', format: [215, 330], orientation: 'portrait' },
          pagebreak: { mode: 'avoid-all' }
      };

      // @ts-ignore
      if (window.html2pdf) {
          // @ts-ignore
          window.html2pdf().set(opt).from(element).save().then(() => {
              setIsGeneratingPdf(false);
          }).catch((err: any) => {
              console.error(err);
              setIsGeneratingPdf(false);
              alert("Gagal membuat PDF.");
          });
      } else {
          alert("Library PDF belum siap.");
          setIsGeneratingPdf(false);
      }
  };

  // --- IMPORT FUNCTION (REAL PARSING) ---
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
              // Use Global XLSX
              // @ts-ignore
              const xlsx = window.XLSX;
              
              if (!xlsx) {
                  throw new Error("Library XLSX not found");
              }

              const bstr = evt.target?.result;
              const wb = xlsx.read(bstr, { type: 'binary' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              const data = xlsx.utils.sheet_to_json(ws);

              let updatedCount = 0;
              const totalRows = data.length;

              // Process Data
              data.forEach((row: any, index) => {
                  // Find student by NISN (Most accurate) or Name
                  const nisn = row['NISN'] ? String(row['NISN']).trim() : '';
                  const name = row['Nama Siswa'] ? String(row['Nama Siswa']).trim().toLowerCase() : '';

                  const targetStudent = students.find(s => 
                      (nisn && s.nisn === nisn) || 
                      (s.fullName.toLowerCase() === name && s.className === row['Kelas'])
                  );

                  if (targetStudent) {
                      // Update scores based on map
                      SUBJECT_MAP.forEach(sub => {
                          if (row[sub.label] !== undefined && row[sub.label] !== '') {
                              const score = Number(row[sub.label]);
                              if (!isNaN(score)) {
                                  setScore(targetStudent, sub.key, score);
                              }
                          }
                      });
                      updatedCount++;
                  }
                  
                  // Update progress periodically
                  if (index % 5 === 0) setImportProgress(Math.round(((index + 1) / totalRows) * 100));
              });

              setImportStats({ processed: totalRows, success: updatedCount });
              setRenderKey(prev => prev + 1);
              setImportProgress(100);

          } catch (error) {
              console.error("Error parsing Excel:", error);
              alert("Gagal membaca file Excel. Pastikan format sesuai template.");
              setIsImporting(false);
          }
      };

      reader.readAsBinaryString(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- EDITING ---
  const startEdit = (s: Student) => {
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

  // --- REPORT VIEW ---
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
      if (!correctionProposedScore) {
          alert('Mohon isi nilai yang seharusnya.');
          return;
      }

      const newRequest: CorrectionRequest = {
          id: Math.random().toString(36).substr(2, 9),
          fieldKey: `Nilai: ${correctionSubject}`,
          fieldName: correctionSubject,
          originalValue: String(correctionCurrentScore),
          proposedValue: correctionProposedScore,
          status: 'PENDING',
          requestDate: new Date().toISOString(),
          // Note stored in adminNote or attached differently, here mapped to adminNote for simplicity or custom field
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

      // --- DYNAMIC DATA LOGIC ---
      // 1. Determine Academic Year from Settings (Specific Semester Year OR Fallback to global)
      const currentYear = academicData.semesterYears?.[dbSemester] || academicData.year || '2024/2025';

      // 2. Determine Report Date (Specific Semester Date OR Fallback to global)
      const rawReportDate = academicData.semesterDates?.[dbSemester] || academicData.reportDate || '2024-12-20';
      const formatReportDate = (dateStr: string) => {
          if (!dateStr) return '';
          try {
              return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
          } catch(e) { return dateStr; }
      };
      const titimangsaDate = formatReportDate(rawReportDate);

      // 3. Determine Wali Kelas from Config (Format: YEAR-SEMESTER-CLASS)
      const configKey = `${currentYear}-${dbSemester}-${student.className}`;
      const waliInfo = classConfig[configKey] || { teacher: '#N/A', nip: '-' };

      // 4. Determine P5 Data from Config
      // Level derivation
      let level = 'VII';
      if (student.className.includes('VIII')) level = 'VIII';
      if (student.className.includes('IX')) level = 'IX';
      
      const p5Key = `${currentYear}-${level}-${dbSemester}`;
      const p5Data = p5Config[p5Key] || [];

      // HELPER for Student Interaction Styling
      const isStudent = userRole === 'STUDENT';
      const getCellClass = () => isStudent 
          ? "bg-yellow-50 hover:bg-yellow-100 cursor-pointer print:bg-white text-blue-900" 
          : "bg-white";

      return (
          // Adjusted width to 190mm to ensure proper print margins on F4 (215mm width).
          // Font set to text-[8px] globally to ensure compact header and table.
          // Added min-h-[310mm] to ensure full page background even with less content
          <div id="report-content" className="bg-white p-5 shadow-lg w-[190mm] min-h-[310mm] mx-auto text-black font-serif text-[8px] leading-tight box-border relative flex flex-col">
                {/* Header - Ensure compact spacing, Removed Font Bold from Labels */}
                <div className="mb-2 text-[8px] border-b border-black pb-2">
                    <table className="w-full">
                        <tbody>
                            <tr className="align-top">
                                <td className="w-24 pb-0.5">Nama Peserta Didik</td>
                                <td className="pb-0.5">: <span className="font-bold">{student.fullName}</span></td>
                                <td className="w-20 pb-0.5">Semester</td>
                                <td className="pb-0.5">: {dbSemester} ({dbSemester % 2 !== 0 ? 'Ganjil' : 'Genap'})</td>
                            </tr>
                            <tr className="align-top">
                                <td className="pb-0.5">Kelas</td>
                                <td className="pb-0.5">: {student.className}</td>
                                <td className="pb-0.5">Fase</td>
                                <td className="pb-0.5">: D</td>
                            </tr>
                            <tr className="align-top">
                                <td className="pb-0.5">Sekolah</td>
                                <td className="pb-0.5">: SMPN 3 PACET</td>
                                <td className="pb-0.5">Tahun</td>
                                <td className="pb-0.5">: {currentYear}</td>
                            </tr>
                            <tr className="align-top">
                                <td className="pb-0.5">Alamat</td>
                                <td colSpan={3} className="pb-0.5">: Jl. Tirtowening- Ds. Kembangbelor - Kec. Pacet Kab. Mojokerto</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {isStudent && (
                    <div className="no-print mb-2 p-1 bg-blue-50 border border-blue-200 rounded text-[8px] text-blue-800 flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Klik pada kotak nilai berwarna kuning untuk mengajukan koreksi nilai.</span>
                    </div>
                )}

                {/* A. Intrakurikuler - Compact Table */}
                <h3 className="font-bold mb-0.5 text-[8px]">A. INTRAKURIKULER</h3>
                <table className="w-full border-collapse border border-black mb-2 text-[8px]">
                    <thead>
                        <tr className="bg-gray-100 text-center font-bold">
                            <td className="border border-black px-1 py-1 w-6">NO</td>
                            <td className="border border-black px-1 py-1">MATA PELAJARAN</td>
                            <td className="border border-black px-1 py-1 w-10">NILAI</td>
                            <td className="border border-black px-1 py-1">CAPAIAN KOMPETENSI</td>
                        </tr>
                    </thead>
                    <tbody>
                        {SUBJECT_MAP.map((sub, idx) => {
                            const data = getSubjData(sub.key);
                            // Custom rendering for Seni & Bahasa Jawa per request structure
                            if (sub.key === 'Seni dan Prakarya') {
                                return (
                                    <React.Fragment key={sub.key}>
                                        <tr>
                                            <td className="border border-black px-1 py-0.5 text-center align-top">{idx + 1}</td>
                                            <td className="border border-black px-1 py-0.5">
                                                <div>Seni dan Prakarya</div>
                                                <div className="pl-4">a. Seni Musik</div>
                                                <div className="pl-4">b. Seni Rupa</div>
                                            </td>
                                            <td 
                                                className={`border border-black px-1 py-0.5 text-center align-top font-bold relative group transition-colors ${getCellClass()}`}
                                                onClick={() => isStudent && handleOpenCorrection(sub.label, sub.full, data?.score || 0)}
                                            >
                                                <div className="mb-2"></div>
                                                <div>{data?.score || '#N/A'}</div>
                                                {isStudent && (
                                                    <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Pencil className="w-2 h-2 text-orange-600" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="border border-black px-1 py-0.5 italic align-top">
                                                <div className="mb-2"></div>
                                                <div>{data?.competency || '#N/A'}</div>
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                )
                            }
                             if (sub.key === 'Bahasa Jawa') {
                                return (
                                    <tr key={sub.key}>
                                        <td className="border border-black px-1 py-0.5 text-center"></td>
                                        <td className="border border-black px-1 py-0.5 pl-4">a. Bahasa Jawa</td>
                                        <td 
                                            className={`border border-black px-1 py-0.5 text-center font-bold relative group transition-colors ${getCellClass()}`}
                                            onClick={() => isStudent && handleOpenCorrection(sub.label, sub.full, data?.score || 0)}
                                        >
                                            {data?.score || '#N/A'}
                                            {isStudent && (
                                                <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Pencil className="w-2 h-2 text-orange-600" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="border border-black px-1 py-0.5 italic">{data?.competency || '#N/A'}</td>
                                    </tr>
                                )
                            }
                            return (
                                <tr key={sub.key}>
                                    <td className="border border-black px-1 py-0.5 text-center">{idx + 1}</td>
                                    <td className="border border-black px-1 py-0.5">{sub.full}</td>
                                    <td 
                                        className={`border border-black px-1 py-0.5 text-center font-bold relative group transition-colors ${getCellClass()}`}
                                        onClick={() => isStudent && handleOpenCorrection(sub.label, sub.full, data?.score || 0)}
                                    >
                                        {data?.score || '#N/A'}
                                        {isStudent && (
                                            <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Pencil className="w-2 h-2 text-orange-600" />
                                            </div>
                                        )}
                                    </td>
                                    <td className="border border-black px-1 py-0.5 italic">{data?.competency || '#N/A'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* B. P5 - DYNAMIC FROM CONFIG */}
                <h3 className="font-bold mb-0.5 text-[8px]">B. DESKRIPSI NILAI P5</h3>
                <table className="w-full border-collapse border border-black mb-2 text-[8px]">
                    <thead>
                        <tr className="bg-gray-100 text-center font-bold">
                            <td className="border border-black px-1 py-1 w-6">NO</td>
                            <td className="border border-black px-1 py-1">TEMA</td>
                            <td className="border border-black px-1 py-1">DESKRIPSI</td>
                        </tr>
                    </thead>
                    <tbody>
                        {p5Data.length > 0 ? p5Data.map((p5, idx) => (
                            <tr key={idx}>
                                <td className="border border-black px-1 py-0.5 text-center">{idx + 1}</td>
                                <td className="border border-black px-1 py-0.5">{p5.theme}</td>
                                <td className="border border-black px-1 py-0.5">{p5.description}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td className="border border-black px-1 py-0.5 text-center" colSpan={3}>Belum ada data Projek P5 untuk kelas ini.</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* C. Ekstrakurikuler */}
                <h3 className="font-bold mb-0.5 text-[8px]">C. EKSTRAKURIKULER</h3>
                <table className="w-full border-collapse border border-black mb-2 text-[8px]">
                    <thead>
                        <tr className="bg-gray-100 text-center font-bold">
                            <td className="border border-black px-1 py-1 w-6">NO</td>
                            <td className="border border-black px-1 py-1">KEGIATAN EKSTRAKURIKULER</td>
                            <td className="border border-black px-1 py-1 w-20">PREDIKAT</td>
                        </tr>
                    </thead>
                    <tbody>
                        {['Pramuka', 'PMR', 'Tari', 'Jurnalistik', 'Futsal'].map((ex, idx) => {
                            const data = record?.extracurriculars?.find(e => e.name === ex);
                            return (
                                <tr key={ex}>
                                    <td className="border border-black px-1 py-0.5 text-center">{idx === 0 ? '1' : ''}</td>
                                    <td className="border border-black px-1 py-0.5">{ex}</td>
                                    <td className="border border-black px-1 py-0.5 text-center">{data?.score || '-'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* D. Catatan & Ketidakhadiran */}
                <div className="grid grid-cols-3 gap-2 mb-2 text-[8px]">
                    <div className="col-span-2">
                        <h3 className="font-bold mb-0.5 text-[8px]">D. CATATAN WALI KELAS</h3>
                        <div className="border border-black px-2 py-1 h-12 italic flex items-center justify-center text-center text-[8px]">
                            {record?.teacherNote || "Niat yang tulus untuk belajar terlihat jelas dari usahamu mengikuti kegiatan belajar dengan baik."}
                        </div>
                        
                        <div className="mt-1 border border-black px-2 py-1 flex justify-between items-center text-[8px]">
                            <div className="font-bold">KENAIKAN KELAS</div>
                            <div>Naik Kelas : -</div>
                            <div>Tanggal : -</div>
                        </div>
                    </div>
                    <div className="col-span-1">
                        <h3 className="font-bold mb-0.5 text-[8px]">KETIDAKHADIRAN</h3>
                        <table className="w-full border-collapse border border-black text-[8px]">
                            <tbody>
                                <tr>
                                    <td className="border border-black px-1 py-0.5">1. Sakit</td>
                                    <td className="border border-black px-1 py-0.5 text-center w-8">{record?.attendance.sick ?? 0}</td>
                                    <td className="border border-black px-1 py-0.5">Hari</td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-1 py-0.5">2. Ijin</td>
                                    <td className="border border-black px-1 py-0.5 text-center">{record?.attendance.permitted ?? 0}</td>
                                    <td className="border border-black px-1 py-0.5">Hari</td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-1 py-0.5">3. Alpha</td>
                                    <td className="border border-black px-1 py-0.5 text-center">{record?.attendance.noReason ?? 0}</td>
                                    <td className="border border-black px-1 py-0.5">Hari</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Spacer to push signatures to bottom if needed */}
                <div className="flex-1"></div>

                {/* Signatures */}
                <div className="flex justify-between mt-4 px-4 font-serif text-[8px]">
                    <div className="text-center w-1/3">
                        <p className="mb-8">Mengetahui,<br/>Orang Tua/Wali</p>
                        <p className="font-bold border-t border-black px-2 inline-block min-w-[80px]"></p>
                    </div>
                    
                    <div className="text-center w-1/3">
                        <p className="mb-0">Pacet, {titimangsaDate}</p>
                        <p className="mb-8">WALI KELAS</p>
                        <p className="font-bold underline decoration-1 underline-offset-2">{waliInfo.teacher}</p>
                        <p>NIP. {waliInfo.nip}</p>
                    </div>
                </div>
                
                <div className="flex justify-center -mt-2 font-serif text-[8px]">
                    <div className="text-center">
                        <p className="mb-8">KEPALA SEKOLAH</p>
                        <p className="font-bold underline decoration-1 underline-offset-2">DIDIK SULISTYO, M.M.Pd</p>
                        <p>NIP. 19660518198901 1 002</p>
                    </div>
                </div>
          </div>
      );
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in relative">
        
        {/* CORRECTION MODAL FOR STUDENTS */}
        {correctionModalOpen && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="font-bold text-gray-800">Ajukan Koreksi Nilai</h3>
                        <button onClick={() => setCorrectionModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>
                    <div className="space-y-3">
                        <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 border border-blue-100">
                            <p className="font-bold">{correctionSubject}</p>
                            <p>Nilai Saat Ini: <span className="font-mono font-bold text-lg">{correctionCurrentScore}</span></p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nilai Seharusnya</label>
                            <input 
                                type="number" 
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                                value={correctionProposedScore}
                                onChange={(e) => setCorrectionProposedScore(e.target.value)}
                                placeholder="Contoh: 85"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Keterangan / Alasan</label>
                            <textarea 
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                                rows={3}
                                value={correctionNote}
                                onChange={(e) => setCorrectionNote(e.target.value)}
                                placeholder="Jelaskan alasan koreksi (Opsional)..."
                            />
                        </div>
                    </div>
                    <button 
                        onClick={submitCorrection}
                        className="mt-6 w-full py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700"
                    >
                        Kirim Pengajuan
                    </button>
                </div>
            </div>
        )}

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        {viewMode === 'DATABASE' ? (
             <>
                <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
                    <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg font-bold text-sm border border-green-100">
                        <FileSpreadsheet className="w-4 h-4" /> 
                        <span>Input Nilai</span>
                    </div>
                    
                    <select 
                        className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium" 
                        value={dbClassFilter} 
                        onChange={(e) => setDbClassFilter(e.target.value)}
                    >
                        <option value="ALL">Semua Kelas</option>
                        {CLASS_LIST.map(c => <option key={c} value={c}>Kelas {c}</option>)}
                    </select>

                    <select 
                        className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium"
                        value={dbSemester}
                        onChange={(e) => setDbSemester(Number(e.target.value))}
                    >
                        {[1, 2, 3, 4, 5, 6].map(sem => (
                            <option key={sem} value={sem}>
                                Semester {sem} ({sem % 2 !== 0 ? 'Ganjil' : 'Genap'} - Kls {sem <= 2 ? 'VII' : sem <= 4 ? 'VIII' : 'IX'})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-2 w-full xl:w-auto">
                     <div className="relative flex-1 xl:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="Cari Siswa..." 
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm outline-none focus:bg-white border border-transparent focus:border-blue-300 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                     </div>
                     {userRole === 'ADMIN' && (
                         <>
                            <button onClick={handleDownloadTemplate} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-2 shadow-sm whitespace-nowrap">
                                <Download className="w-4 h-4" /> Template
                            </button>
                            <button onClick={handleImportClick} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm whitespace-nowrap">
                                <UploadCloud className="w-4 h-4" /> Upload Nilai
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx" onChange={handleFileChange} />
                         </>
                     )}
                </div>
             </>
        ) : (
            <div className="w-full flex justify-between items-center">
                {userRole === 'ADMIN' ? (
                    <button onClick={() => setViewMode('DATABASE')} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-50 text-gray-700">
                        <ArrowLeft className="w-4 h-4" /> Kembali
                    </button>
                ) : (
                     <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg font-bold text-sm border border-blue-100">
                        <LayoutList className="w-4 h-4" /> 
                        <span>Rapor Digital Anda</span>
                    </div>
                )}

                <div className="flex items-center gap-2">
                     {/* Semester Selector for Student View Report Mode */}
                     <select 
                        className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium"
                        value={dbSemester}
                        onChange={(e) => setDbSemester(Number(e.target.value))}
                    >
                        {[1, 2, 3, 4, 5, 6].map(sem => (
                            <option key={sem} value={sem}>Semester {sem}</option>
                        ))}
                    </select>

                    <button 
                        onClick={handleDownloadF4} 
                        disabled={isGeneratingPdf}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 shadow-sm disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                        Download PDF (F4)
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm" onClick={() => window.print()}>
                        <Printer className="w-4 h-4" /> Cetak
                    </button>
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
                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                            <h3 className="font-bold text-gray-800">Membaca Excel...</h3>
                            <div className="w-full bg-gray-200 rounded-full h-3 mt-4 overflow-hidden">
                                <div className="bg-blue-600 h-full transition-all duration-100" style={{ width: `${importProgress}%` }}></div>
                            </div>
                            <span className="text-xs font-bold text-gray-500 mt-2">{importProgress}% Selesai</span>
                        </>
                    ) : (
                        <>
                             <CheckCircle2 className="w-12 h-12 text-green-600 mb-4" />
                             <h3 className="font-bold text-gray-800">Import Selesai!</h3>
                             <p className="text-sm text-gray-500 mt-1">
                                {importStats.success} dari {importStats.processed} Siswa berhasil diupdate.
                             </p>
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
                                                <button onClick={() => startEdit(student)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title="Edit Nilai"><Pencil className="w-4 h-4" /></button>
                                                <button onClick={() => handleViewReport(student)} className="p-1.5 text-purple-600 hover:bg-purple-100 rounded" title="Lihat Rapor"><LayoutList className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteRow(student)} className="p-1.5 text-red-600 hover:bg-red-100 rounded" title="Hapus Nilai"><Trash2 className="w-4 h-4" /></button>
                                              </>
                                          )}
                                      </td>
                                      <td className="px-4 py-2 font-medium text-gray-900">
                                          <div>{student.fullName}</div>
                                          <div className="text-xs text-gray-400 font-mono">{student.nisn}</div>
                                      </td>
                                      <td className="px-4 py-2 text-center text-gray-500">{student.className}</td>
                                      {SUBJECT_MAP.map(sub => {
                                          const score = isEditingRow ? (editScores[sub.key] || 0) : getScore(student, sub.key);
                                          if (!isEditingRow) { totalScore += score; count++; }

                                          return (
                                              <td key={sub.key} className="px-2 py-2 text-center">
                                                  {isEditingRow ? (
                                                      <input 
                                                          type="number" 
                                                          className="w-12 text-center border border-blue-300 rounded p-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                                          value={editScores[sub.key] || 0}
                                                          onChange={(e) => setEditScores({...editScores, [sub.key]: Number(e.target.value)})}
                                                      />
                                                  ) : (
                                                      <span className={`font-semibold ${score < 75 ? 'text-red-500' : 'text-gray-700'}`}>{score}</span>
                                                  )}
                                              </td>
                                          );
                                      })}
                                      <td className="px-4 py-2 text-center font-bold text-blue-700">
                                          {count > 0 ? (totalScore / count).toFixed(1) : '-'}
                                      </td>
                                  </tr>
                              );
                          }) : (
                              <tr><td colSpan={15} className="p-8 text-center text-gray-500">Tidak ada data siswa.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          ) : (
              <div className="overflow-auto flex-1 bg-gray-500/10 p-8 flex justify-center">
                  {selectedStudent && <ReportView student={selectedStudent} />}
              </div>
          )}
      </div>
    </div>
  );
};

export default GradesView;