import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Student, AcademicRecord, CorrectionRequest } from '../types';
import { Search, FileSpreadsheet, Download, UploadCloud, Trash2, Save, Pencil, X, CheckCircle2, Loader2, LayoutList, ArrowLeft, Printer, FileDown, AlertTriangle, Eye, Activity, School, Send, Files } from 'lucide-react';
import { api } from '../services/api';

interface GradesViewProps {
  students: Student[];
  userRole?: 'ADMIN' | 'STUDENT' | 'GURU';
  loggedInStudent?: Student;
  onUpdate?: () => void;
}

const CLASS_LIST = ['VII A', 'VII B', 'VII C', 'VIII A', 'VIII B', 'VIII C', 'IX A', 'IX B', 'IX C'];

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

// --- HELPER FUNCTIONS ---

const getCompetencyDescription = (score: number, subjectName: string) => {
    if (!score) return '-';
    let predikat = '';
    if (score >= 91) predikat = 'Sangat baik';
    else if (score >= 81) predikat = 'Baik';
    else if (score >= 75) predikat = 'Cukup';
    else predikat = 'Perlu bimbingan';

    return `${predikat} dalam memahami materi ${subjectName}.`;
};

const getScore = (s: Student, subjKey: string, semesterOverride: number) => {
    const record = s.academicRecords?.[semesterOverride];
    if (!record) return 0;
    
    const mapItem = SUBJECT_MAP.find(m => m.key === subjKey);
    const subj = record.subjects.find(sub => {
         // Robust matching
         if (mapItem) {
             return sub.subject === mapItem.full || 
                    sub.subject === mapItem.key ||
                    sub.subject.startsWith(mapItem.key) || 
                    (mapItem.key === 'PAI' && sub.subject.includes('Agama'));
         }
         return sub.subject.startsWith(subjKey);
    });
    return subj ? subj.score : 0;
};

// --- REPORT TEMPLATE COMPONENT ---
interface ReportTemplateProps {
    student: Student;
    semester: number;
    appSettings: any;
    userRole: string;
    onCorrectionRequest?: (type: 'CLASS' | 'GRADE', data?: any) => void;
    isBatch?: boolean;
}

const ReportTemplate: React.FC<ReportTemplateProps> = ({ student, semester, appSettings, userRole, onCorrectionRequest, isBatch = false }) => {
    // 1. Get Base Data
    const schoolName = appSettings?.schoolData?.name || 'SMP Negeri 3 Pacet';
    const academicYear = appSettings?.academicData?.semesterYears?.[semester] || '2024/2025';
    const reportDate = appSettings?.academicData?.semesterDates?.[semester] || new Date().toLocaleDateString('id-ID');
    
    // 2. Headmaster Data
    const headmaster = appSettings?.schoolData?.headmaster || 'Didik Sulistyo, M.M.Pd';
    const headmasterNip = appSettings?.schoolData?.nip || '19660518 198901 1 002';
    
    // PREPARE DATA
    let record = student.academicRecords?.[semester];
    
    if (!record) {
        // Create dummy record structure
        const level = (semester <= 2) ? 'VII' : (semester <= 4) ? 'VIII' : 'IX';
        record = {
            semester: semester,
            classLevel: level,
            className: student.className,
            phase: 'D',
            year: academicYear,
            subjects: SUBJECT_MAP.map((s, i) => ({
                no: i + 1,
                subject: s.full,
                score: 0,
                competency: '-'
            })),
            p5Projects: [],
            extracurriculars: [],
            teacherNote: '-',
            attendance: { sick: 0, permitted: 0, noReason: 0 }
        };
    } else {
        // Ensure all subjects from SUBJECT_MAP are present
        const filledSubjects = SUBJECT_MAP.map((mapItem, idx) => {
            const existingSub = record!.subjects.find(s => 
                s.subject === mapItem.full || s.subject.startsWith(mapItem.key) || (mapItem.key === 'PAI' && s.subject.includes('Agama'))
            );
            
            const score = existingSub ? existingSub.score : 0;
            const competency = getCompetencyDescription(score, mapItem.full);

            return {
                no: idx + 1,
                subject: mapItem.full,
                score: score,
                competency: competency
            };
        });
        
        record = { ...record, subjects: filledSubjects };
    }

    // Check pending class correction
    const classCorrectionKey = `class-${semester}`;
    const pendingClassReq = student.correctionRequests?.find(r => r.fieldKey === classCorrectionKey && r.status === 'PENDING');
    const displayClass = pendingClassReq ? pendingClassReq.proposedValue : (record.className || student.className);

    // 3. Homeroom Teacher (Wali Kelas) Data
    const waliKey = `${academicYear}-${semester}-${displayClass}`;
    const waliData = appSettings?.classConfig?.[waliKey];
    
    const waliName = waliData?.teacher || '..................................';
    const waliNip = waliData?.nip || '..................................';

    return (
        <div className={`bg-white ${isBatch ? '' : 'shadow-xl'} h-[296mm] w-[210mm] mx-auto p-[10mm] text-black font-sans relative print:shadow-none print:w-full print:m-0 print:p-0 box-border overflow-hidden`}>
            {/* Header Identity */}
            <div className="text-xs mb-4">
                <table className="w-full">
                    <tbody>
                        <tr>
                            <td className="w-32 py-0.5">Nama Peserta Didik</td>
                            <td>: {student.fullName}</td>
                            <td className="w-24">Kelas</td>
                            <td 
                              className={`
                                  py-0.5 px-1 transition-all rounded relative
                                  ${userRole === 'STUDENT' ? 'bg-yellow-100 cursor-pointer hover:bg-yellow-200 text-blue-800 font-bold border border-yellow-300 border-dashed' : ''}
                              `}
                              onClick={() => userRole === 'STUDENT' && !pendingClassReq && onCorrectionRequest?.('CLASS')}
                              title={userRole === 'STUDENT' ? "Klik untuk mengajukan Revisi Kelas Semester Ini" : ""}
                            >
                                <div className="flex items-center gap-1">
                                  : {displayClass}
                                  {userRole === 'STUDENT' && (
                                      pendingClassReq 
                                      ? <span className="text-[9px] bg-gray-800 text-white px-1 rounded ml-1 font-normal animate-pulse">(Revisi: {pendingClassReq.proposedValue})</span>
                                      : <Pencil className="w-3 h-3 opacity-50" />
                                  )}
                                </div>
                            </td>
                        </tr>
                        <tr><td className="py-0.5">NISN / NIS</td><td>: {student.nisn} / {student.nis}</td><td>Fase</td><td>: D</td></tr>
                        <tr><td className="py-0.5">Sekolah</td><td>: {schoolName.toUpperCase()}</td><td>Semester</td><td>: {semester} ({academicYear})</td></tr>
                        <tr><td className="py-0.5" valign="top">Alamat</td><td colSpan={3}>: {student.address}</td></tr>
                    </tbody>
                </table>
            </div>

            {/* A. INTRAKURIKULER */}
            <div className="mb-4">
                <h3 className="font-bold text-sm mb-1">A. INTRAKURIKULER</h3>
                <table className="w-full border-collapse border border-black text-xs">
                    <thead className="bg-black text-white text-center">
                        <tr>
                            <th className="border border-black p-1 w-8">NO</th>
                            <th className="border border-black p-1">MATA PELAJARAN</th>
                            <th className="border border-black p-1 w-16">NILAI AKHIR</th>
                            <th className="border border-black p-1">CAPAIAN KOMPETENSI</th>
                        </tr>
                    </thead>
                    <tbody>
                        {record.subjects.map((sub, idx) => {
                            const gradeKey = `grade-${semester}-${sub.subject}`;
                            const pendingGradeReq = student.correctionRequests?.find(r => r.fieldKey === gradeKey && r.status === 'PENDING');

                            return (
                                <tr key={idx} className={idx % 2 !== 0 ? 'bg-gray-100' : ''}>
                                    <td className="border border-black p-1 text-center">{idx + 1}</td>
                                    <td className="border border-black p-1">{sub.subject}</td>
                                    <td 
                                      className={`border border-black p-1 text-center font-bold relative group
                                          ${userRole === 'STUDENT' ? 'cursor-pointer hover:bg-yellow-100' : ''}
                                          ${pendingGradeReq ? 'bg-yellow-100 text-yellow-800' : ''}
                                      `}
                                      onClick={() => userRole === 'STUDENT' && !pendingGradeReq && onCorrectionRequest?.('GRADE', { subject: sub.subject, score: sub.score })}
                                      title={userRole === 'STUDENT' ? "Klik untuk mengajukan perbaikan nilai" : ""}
                                    >
                                        {pendingGradeReq ? pendingGradeReq.proposedValue : sub.score}
                                        {pendingGradeReq && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>}
                                        {userRole === 'STUDENT' && !pendingGradeReq && (
                                            <Pencil className="w-2 h-2 text-gray-400 absolute top-1 right-1 opacity-0 group-hover:opacity-100" />
                                        )}
                                    </td>
                                    <td className="border border-black p-1 text-[10px] italic text-gray-700">
                                        {sub.competency || '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* B. P5 */}
            <div className="mb-4">
                <h3 className="font-bold text-sm mb-1">B. DESKRIPSI NILAI P5</h3>
                <table className="w-full border-collapse border border-black text-xs">
                    <thead className="bg-black text-white text-center">
                        <tr>
                            <th className="border border-black p-1 w-8">NO</th>
                            <th className="border border-black p-1 w-1/3">TEMA</th>
                            <th className="border border-black p-1">DESKRIPSI</th>
                        </tr>
                    </thead>
                    <tbody>
                        {record.p5Projects && record.p5Projects.length > 0 ? record.p5Projects.map((p, idx) => (
                            <tr key={idx} className={idx % 2 !== 0 ? 'bg-gray-100' : ''}>
                                <td className="border border-black p-1 text-center">{idx + 1}</td>
                                <td className="border border-black p-1">{p.theme}</td>
                                <td className="border border-black p-1 text-[10px]">{p.description}</td>
                            </tr>
                        )) : (
                            <>
                                <tr className="bg-gray-100"><td className="border border-black p-1 text-center">1</td><td className="border border-black p-1">Suara Demokrasi</td><td className="border border-black p-1">Berkembang sesuai harapan</td></tr>
                                <tr><td className="border border-black p-1 text-center">2</td><td className="border border-black p-1">-</td><td className="border border-black p-1">-</td></tr>
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {/* C. EKSTRAKURIKULER */}
            <div className="mb-4 w-1/2">
                <h3 className="font-bold text-sm mb-1">C. EKSTRAKURIKULER</h3>
                <table className="w-full border-collapse border border-black text-xs">
                    <thead className="bg-black text-white text-left">
                        <tr>
                            <th className="border border-black p-1 w-8 text-center">NO</th>
                            <th className="border border-black p-1">KEGIATAN EKSTRAKURIKULER</th>
                            <th className="border border-black p-1 w-16 text-center">PREDIKAT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {record.extracurriculars && record.extracurriculars.length > 0 ? (
                            record.extracurriculars.map((ex, idx) => (
                                <tr key={idx} className={idx % 2 !== 0 ? 'bg-gray-100' : ''}>
                                    <td className="border border-black p-1 text-center">{idx + 1}</td>
                                    <td className="border border-black p-1">{ex.name}</td>
                                    <td className="border border-black p-1 text-center">{ex.score}</td>
                                </tr>
                            ))
                        ) : (
                            <>
                              <tr className="bg-gray-100"><td className="border border-black p-1 text-center">1</td><td className="border border-black p-1">Pramuka</td><td className="border border-black p-1 text-center">-</td></tr>
                              <tr><td className="border border-black p-1 text-center">2</td><td className="border border-black p-1">-</td><td className="border border-black p-1 text-center">-</td></tr>
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {/* D. CATATAN WALI KELAS */}
            <div className="mb-4">
                <h3 className="font-bold text-sm mb-1 pl-1 border-l-4 border-green-600">D. CATATAN WALI KELAS</h3>
                <div className="border border-black bg-gray-200 p-2 text-xs min-h-[40px]">
                    {record.teacherNote || 'Pertahankan Prestasimu belajarmu!'}
                </div>
            </div>

            {/* E. KENAIKAN KELAS & F. KETIDAKHADIRAN */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                    <h3 className="font-bold text-sm mb-1">KENAIKAN KELAS</h3>
                    <div className="border border-black p-2 bg-gray-100 text-xs h-full">
                        {[2, 4, 6].includes(semester) ? (
                            <>
                              <p>Naik Kelas : {record.promotionStatus === 'NAIK' ? `YA (Ke Kelas ${student.className.includes('VII') ? 'VIII' : 'IX'})` : '-'}</p>
                              <p>Tanggal : {reportDate}</p>
                            </>
                        ) : (
                            <p className="text-gray-400 italic">Hanya muncul di semester genap</p>
                        )}
                    </div>
                </div>
                <div>
                    <h3 className="font-bold text-sm mb-1">KETIDAKHADIRAN</h3>
                    <table className="w-full border-collapse border border-black text-xs">
                        <tbody>
                            <tr><td className="border border-black p-1 w-8 text-center">1.</td><td className="border border-black p-1">Sakit</td><td className="border border-black p-1 w-10 text-center">{record.attendance.sick}</td><td className="border border-black p-1 w-10">Hari</td></tr>
                            <tr><td className="border border-black p-1 w-8 text-center">2.</td><td className="border border-black p-1">Ijin</td><td className="border border-black p-1 w-10 text-center">{record.attendance.permitted}</td><td className="border border-black p-1 w-10">Hari</td></tr>
                            <tr><td className="border border-black p-1 w-8 text-center">3.</td><td className="border border-black p-1">Tanpa Keterangan</td><td className="border border-black p-1 w-10 text-center">{record.attendance.noReason}</td><td className="border border-black p-1 w-10">Hari</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer Signatures */}
            <div className="flex justify-between items-start text-xs font-bold mt-8 bg-gray-200 p-4 border border-gray-300">
                <div className="text-center w-1/3">
                    <p className="mb-16 uppercase">Kepala Sekolah</p>
                    <p className="underline uppercase">{headmaster}</p>
                    <p>NIP. {headmasterNip}</p>
                </div>
                <div className="text-center w-1/3">
                    <p className="mb-16">Wali Kelas</p>
                    <p className="underline uppercase">{waliName}</p>
                    <p>NIP. {waliNip}</p>
                </div>
            </div>
        </div>
    );
};

const GradesView: React.FC<GradesViewProps> = ({ students, userRole = 'ADMIN', loggedInStudent, onUpdate }) => {
  const [viewMode, setViewMode] = useState<'REPORT' | 'DATABASE'>('DATABASE');
  const [searchTerm, setSearchTerm] = useState('');
  const [dbClassFilter, setDbClassFilter] = useState<string>('ALL');
  const [dbSemester, setDbSemester] = useState<number>(1); 
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [renderKey, setRenderKey] = useState(0); 
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Settings State
  const [appSettings, setAppSettings] = useState<any>(null);

  // Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScores, setEditScores] = useState<Record<string, number>>({});
  const [editAttendance, setEditAttendance] = useState({ sick: 0, permitted: 0, noReason: 0 });
  const [editExtra, setEditExtra] = useState('');
  const [editPromotion, setEditPromotion] = useState('');

  // --- CORRECTION MODAL STATE (STUDENT ONLY) ---
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionType, setCorrectionType] = useState<'CLASS' | 'GRADE'>('CLASS');
  const [proposedClass, setProposedClass] = useState('');
  const [targetSubject, setTargetSubject] = useState('');
  const [proposedScore, setProposedScore] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  // Fetch Settings on Mount
  useEffect(() => {
      const fetchSettings = async () => {
          try {
              const settings = await api.getAppSettings();
              if (settings) setAppSettings(settings);
          } catch (e) {
              console.error("Failed to load settings for report", e);
          }
      };
      fetchSettings();
  }, []);

  // Force view for Student (Initial Only)
  useEffect(() => {
      if (userRole === 'STUDENT' && loggedInStudent && viewMode !== 'REPORT') {
          setViewMode('REPORT');
          setSelectedStudent(loggedInStudent);
      }
  }, [userRole, loggedInStudent]); 

  const effectiveStudents = (userRole === 'STUDENT' && loggedInStudent) ? [loggedInStudent] : students;

  const filteredStudents = effectiveStudents.filter(s => {
      const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.nisn.includes(searchTerm);
      const matchClass = userRole === 'STUDENT' ? true : (dbClassFilter === 'ALL' || s.className === dbClassFilter);
      return matchSearch && matchClass;
  });

  const getRecord = (s: Student): AcademicRecord | undefined => {
      return s.academicRecords?.[dbSemester];
  };

  // --- EDIT HANDLERS (ADMIN) ---
  const startEdit = (s: Student) => {
      const record = getRecord(s);
      setEditingId(s.id);
      
      // Populate Edit State
      const currentScores: Record<string, number> = {};
      SUBJECT_MAP.forEach(sub => {
          currentScores[sub.key] = getScore(s, sub.key, dbSemester);
      });
      setEditScores(currentScores);
      
      setEditAttendance(record?.attendance || { sick: 0, permitted: 0, noReason: 0 });
      setEditExtra(record?.extracurriculars?.[0]?.name || '');
      setEditPromotion(record?.promotionStatus || '');
  };

  const saveEdit = async (s: Student) => {
      setIsSaving(true);
      try {
          // 1. Ensure Record Exists
          if (!s.academicRecords) s.academicRecords = {};
          if (!s.academicRecords[dbSemester]) {
              const level = (dbSemester <= 2) ? 'VII' : (dbSemester <= 4) ? 'VIII' : 'IX';
              s.academicRecords[dbSemester] = { 
                  semester: dbSemester, classLevel: level, className: s.className, phase: 'D', year: '2024', 
                  subjects: [], p5Projects: [], extracurriculars: [], teacherNote: '', promotionStatus: '', 
                  attendance: { sick: 0, permitted: 0, noReason: 0 } 
              };
          }
          
          const record = s.academicRecords[dbSemester];

          // 2. Update Subjects
          SUBJECT_MAP.forEach((mapItem, idx) => {
              const score = editScores[mapItem.key] || 0;
              const competency = getCompetencyDescription(score, mapItem.full);
              
              // Find existing subject or create new
              let subj = record.subjects.find(sub => 
                  sub.subject === mapItem.full || 
                  sub.subject.startsWith(mapItem.key) || 
                  (mapItem.key === 'PAI' && sub.subject.includes('Agama'))
              );

              if (subj) {
                  subj.score = score;
                  subj.competency = competency;
              } else {
                  record.subjects.push({
                      no: idx + 1,
                      subject: mapItem.full,
                      score: score,
                      competency: competency
                  });
              }
          });

          // 3. Update Extras
          if (editExtra) {
              record.extracurriculars = [{ name: editExtra, score: 'Baik' }];
          } else {
              record.extracurriculars = [];
          }

          // 4. Update Attendance & Promotion
          record.attendance = editAttendance;
          record.promotionStatus = editPromotion;

          // 5. Save to API
          const success = await api.updateStudent(s);
          if (success) {
              setEditingId(null);
              if (onUpdate) onUpdate();
          } else {
              alert("Gagal menyimpan data.");
          }
      } catch (e) {
          console.error(e);
          alert("Terjadi kesalahan.");
      } finally {
          setIsSaving(false);
      }
  };

  // --- CORRECTION HANDLERS ---
  
  const handleOpenClassCorrection = () => {
      if (selectedStudent) {
          const record = selectedStudent.academicRecords?.[dbSemester];
          setCorrectionType('CLASS');
          setProposedClass(record?.className || selectedStudent.className);
          setCorrectionReason('');
          setIsCorrectionModalOpen(true);
      }
  };

  const handleOpenGradeCorrection = (subjectName: string, currentScore: number) => {
      setCorrectionType('GRADE');
      setTargetSubject(subjectName);
      setProposedScore(String(currentScore));
      setCorrectionReason('');
      setIsCorrectionModalOpen(true);
  };

  const submitCorrection = async () => {
      if (!selectedStudent || !correctionReason) {
          alert("Mohon isi alasan perubahan.");
          return;
      }

      let newRequest: CorrectionRequest;

      if (correctionType === 'CLASS') {
          // KEY: class-[semester]
          const correctionKey = `class-${dbSemester}`;
          newRequest = {
              id: Math.random().toString(36).substr(2, 9),
              fieldKey: correctionKey,
              fieldName: `KELAS (Semester ${dbSemester})`,
              originalValue: selectedStudent.academicRecords?.[dbSemester]?.className || selectedStudent.className,
              proposedValue: proposedClass,
              studentReason: correctionReason,
              status: 'PENDING',
              requestDate: new Date().toISOString(),
          };
      } else {
          // KEY: grade-[semester]-[subject]
          const correctionKey = `grade-${dbSemester}-${targetSubject}`;
          
          // Find original score safely
          const currentRecord = selectedStudent.academicRecords?.[dbSemester];
          const currentSubject = currentRecord?.subjects.find(s => s.subject === targetSubject);
          const currentScore = currentSubject ? String(currentSubject.score) : "0";

          newRequest = {
              id: Math.random().toString(36).substr(2, 9),
              fieldKey: correctionKey,
              fieldName: `Nilai ${targetSubject} (Sem ${dbSemester})`,
              originalValue: currentScore,
              proposedValue: proposedScore,
              studentReason: correctionReason,
              status: 'PENDING',
              requestDate: new Date().toISOString(),
          };
      }

      if (!selectedStudent.correctionRequests) selectedStudent.correctionRequests = [];
      
      // Remove any existing pending request for THIS key to avoid duplicates
      selectedStudent.correctionRequests = selectedStudent.correctionRequests.filter(
          r => !(r.fieldKey === newRequest.fieldKey && r.status === 'PENDING')
      );

      const updatedStudent = {
          ...selectedStudent,
          correctionRequests: [...selectedStudent.correctionRequests, newRequest]
      };

      // Save locally & API
      await api.updateStudent(updatedStudent);
      setSelectedStudent(updatedStudent); // Update local view
      setIsCorrectionModalOpen(false);
      alert("✅ Pengajuan revisi berhasil dikirim ke Admin.");
      if (onUpdate) onUpdate();
  };

  // --- EXCEL & OTHER HANDLERS ---
  const handleDownloadTemplate = () => {
      try {
          // @ts-ignore
          const xlsx = window.XLSX;
          if (!xlsx || !xlsx.utils) { alert("Library Excel belum siap. Silakan refresh halaman."); return; }

          const templateData = filteredStudents.map((s, index) => {
              const row: any = {
                  'No': index + 1,
                  'Nama Siswa': s.fullName,
                  'NISN': s.nisn,
                  'Kelas': s.className,
              };
              
              SUBJECT_MAP.forEach(sub => {
                  row[sub.label] = '';
              });
              
              row['Ekstrakurikuler'] = '';
              row['Sakit'] = '';
              row['Ijin'] = '';
              row['Alpha'] = '';
              if ([2,4,6].includes(dbSemester)) {
                  row['Ket. Naik Kelas'] = ''; // NAIK/TINGGAL/LULUS
              }
              
              return row;
          });

          if (templateData.length === 0) {
              const dummyRow: any = { 'No': 1, 'Nama Siswa': 'Contoh Siswa', 'NISN': '1234567890', 'Kelas': 'VII A' };
              SUBJECT_MAP.forEach(sub => dummyRow[sub.label] = '');
              dummyRow['Ekstrakurikuler'] = ''; dummyRow['Sakit'] = ''; dummyRow['Ijin'] = ''; dummyRow['Alpha'] = '';
              if ([2,4,6].includes(dbSemester)) dummyRow['Ket. Naik Kelas'] = '';
              templateData.push(dummyRow);
          }

          const ws = xlsx.utils.json_to_sheet(templateData);
          const wb = xlsx.utils.book_new();
          xlsx.utils.book_append_sheet(wb, ws, `Template_Nilai_S${dbSemester}`);
          
          const fileName = `Template_Nilai_Sem${dbSemester}_${dbClassFilter !== 'ALL' ? dbClassFilter.replace(/\s/g, '') : 'All'}.xlsx`;
          xlsx.writeFile(wb, fileName);
          
      } catch (e) {
          console.error("Error creating template", e);
          alert("Gagal membuat template Excel.");
      }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // @ts-ignore
      const xlsx = window.XLSX;
      if (!xlsx) { alert("Library Excel belum siap."); return; }

      setIsImporting(true);
      const reader = new FileReader();

      reader.onload = async (evt) => {
          try {
              const bstr = evt.target?.result;
              const wb = xlsx.read(bstr, { type: 'binary' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              const data = xlsx.utils.sheet_to_json(ws);

              let updatedCount = 0;
              let errorCount = 0;

              // We'll update the local state first, then save
              // Deep clone current students to modify
              // Fix: Explicitly type the Map to avoid 'unknown' type inference issues
              const updatedStudentsMap = new Map<string, Student>();
              students.forEach(s => updatedStudentsMap.set(s.id, { ...s }));

              for (const row of data as any[]) {
                  // Find Student by NISN (Preferred) or Name
                  const nisn = row['NISN'] ? String(row['NISN']).trim() : '';
                  const name = row['Nama Siswa'] ? String(row['Nama Siswa']).trim().toLowerCase() : '';
                  
                  const targetStudent = students.find(s => 
                      (nisn && s.nisn === nisn) || 
                      (name && s.fullName.toLowerCase() === name)
                  );

                  if (targetStudent) {
                      const studentToUpdate = updatedStudentsMap.get(targetStudent.id)!;
                      
                      // Ensure Record Exists
                      if (!studentToUpdate.academicRecords) studentToUpdate.academicRecords = {};
                      if (!studentToUpdate.academicRecords[dbSemester]) {
                          const level = (dbSemester <= 2) ? 'VII' : (dbSemester <= 4) ? 'VIII' : 'IX';
                          studentToUpdate.academicRecords[dbSemester] = { 
                              semester: dbSemester, classLevel: level, className: studentToUpdate.className, phase: 'D', year: '2024', 
                              subjects: [], p5Projects: [], extracurriculars: [], teacherNote: '', attendance: {sick:0, permitted:0, noReason:0}
                          };
                      }
                      
                      const record = studentToUpdate.academicRecords[dbSemester];

                      // Update Subjects
                      SUBJECT_MAP.forEach((mapItem, idx) => {
                          const scoreVal = row[mapItem.label];
                          if (scoreVal !== undefined) {
                              const score = Number(scoreVal) || 0;
                              const competency = getCompetencyDescription(score, mapItem.full);
                              
                              let subj = record.subjects.find(sub => 
                                  sub.subject === mapItem.full || 
                                  sub.subject.startsWith(mapItem.key) || 
                                  (mapItem.key === 'PAI' && sub.subject.includes('Agama'))
                              );

                              if (subj) {
                                  subj.score = score;
                                  subj.competency = competency;
                              } else {
                                  record.subjects.push({
                                      no: record.subjects.length + 1,
                                      subject: mapItem.full,
                                      score: score,
                                      competency: competency
                                  });
                              }
                          }
                      });

                      // Update Attendance
                      if (row['Sakit'] !== undefined) record.attendance.sick = Number(row['Sakit']) || 0;
                      if (row['Ijin'] !== undefined) record.attendance.permitted = Number(row['Ijin']) || 0;
                      if (row['Alpha'] !== undefined) record.attendance.noReason = Number(row['Alpha']) || 0;

                      // Update Extras
                      if (row['Ekstrakurikuler']) {
                          record.extracurriculars = [{ name: String(row['Ekstrakurikuler']), score: 'Baik' }];
                      }

                      // Update Promotion
                      if (row['Ket. Naik Kelas']) {
                          record.promotionStatus = String(row['Ket. Naik Kelas']).toUpperCase();
                      }

                      // SAVE INDIVIDUALLY TO API (To keep persistence)
                      // Ideally we'd use a bulk update, but for now we iterate
                      try {
                          await api.updateStudent(studentToUpdate);
                          updatedCount++;
                      } catch (e) {
                          console.error(`Failed to update ${studentToUpdate.fullName}`, e);
                          errorCount++;
                      }
                  }
              }

              alert(`Import Selesai.\nBerhasil: ${updatedCount} siswa.\nGagal: ${errorCount} siswa.`);
              if (onUpdate) onUpdate();

          } catch (err) {
              console.error(err);
              alert("Gagal membaca file Excel. Pastikan format sesuai template.");
          } finally {
              setIsImporting(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      };

      reader.readAsBinaryString(file);
  };

  const handleViewReport = (s: Student) => { setSelectedStudent(s); setViewMode('REPORT'); };
  
  const handleDownloadPDF = () => {
      if (!selectedStudent) return;
      setIsGeneratingPdf(true);

      setTimeout(() => {
          const element = document.getElementById('report-content');
          const filename = `Rapor_${selectedStudent.fullName.replace(/[^a-zA-Z0-9]/g, '_')}_S${dbSemester}.pdf`;

          const opt = {
              margin: 0,
              filename: filename,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };

          // @ts-ignore
          const html2pdf = window.html2pdf;

          if (html2pdf) {
              html2pdf().set(opt).from(element).save().then(() => {
                  setIsGeneratingPdf(false);
              }).catch((err: any) => {
                  console.error('PDF Generation Error:', err);
                  setIsGeneratingPdf(false);
                  alert('Gagal membuat PDF. Silakan coba lagi.');
              });
          } else {
              alert("Library PDF belum siap (html2pdf not found).");
              setIsGeneratingPdf(false);
          }
      }, 500);
  };

  const handleDownloadAll = () => {
      if (filteredStudents.length === 0) {
          alert("Tidak ada data untuk didownload.");
          return;
      }
      if (filteredStudents.length > 50 && !window.confirm(`Anda akan mendownload ${filteredStudents.length} Rapor sekaligus. Proses ini mungkin memakan waktu. Lanjutkan?`)) {
          return;
      }

      setIsBatchGenerating(true);

      setTimeout(() => {
          // IMPORTANT: Capture the specific batch container ID
          const element = document.getElementById('batch-rapor-container');
          const className = dbClassFilter === 'ALL' ? 'Semua_Kelas' : dbClassFilter.replace(/\s+/g, '_');
          const filename = `Rapor_Batch_Sem${dbSemester}_${className}.pdf`;

          const opt = {
            margin: 0,
            filename: filename,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 1.5, useCORS: true, scrollY: 0 },
            pagebreak: { mode: ['css', 'legacy'] },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };

          // @ts-ignore
          const html2pdf = window.html2pdf;

          if (html2pdf) {
              html2pdf().set(opt).from(element).save().then(() => {
                  setIsBatchGenerating(false);
              }).catch((err: any) => {
                  console.error(err);
                  setIsBatchGenerating(false);
                  alert("Gagal melakukan batch download.");
              });
          }
      }, 4000); // Wait 4 seconds for rendering
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in relative">
      <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx" onChange={handleImportExcel} />

      {/* MODAL REVISI (Unified for Class & Grade) */}
      {isCorrectionModalOpen && (
          <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform scale-100 transition-all">
                  <div className="flex flex-col items-center text-center mb-4">
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-2">
                          <Pencil className="w-6 h-6 text-yellow-600" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800">
                          {correctionType === 'CLASS' ? 'Ajukan Revisi Kelas' : 'Ajukan Revisi Nilai'}
                      </h3>
                      <p className="text-xs text-gray-500">Semester {dbSemester}</p>
                  </div>
                  
                  <div className="space-y-4">
                      {correctionType === 'CLASS' ? (
                          <div>
                              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Pilih Kelas yang Benar</label>
                              <select 
                                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                  value={proposedClass}
                                  onChange={(e) => setProposedClass(e.target.value)}
                              >
                                  {CLASS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                          </div>
                      ) : (
                          <div>
                              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                                  Nilai {targetSubject} (Yang Benar)
                              </label>
                              <input 
                                  type="number"
                                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                  value={proposedScore}
                                  onChange={(e) => setProposedScore(e.target.value)}
                                  placeholder="0-100"
                              />
                          </div>
                      )}

                      <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Alasan Revisi</label>
                          <textarea 
                              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                              rows={2}
                              placeholder="Jelaskan alasan perubahan..."
                              value={correctionReason}
                              onChange={(e) => setCorrectionReason(e.target.value)}
                          />
                      </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                      <button onClick={() => setIsCorrectionModalOpen(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 font-bold rounded-lg text-sm hover:bg-gray-200">Batal</button>
                      <button onClick={submitCorrection} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 flex items-center justify-center gap-2">
                          <Send className="w-3 h-3" /> Kirim Revisi
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden">
        <div className="flex gap-2 w-full xl:w-auto">
             <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
                {userRole === 'ADMIN' && (
                    <button onClick={() => setViewMode('DATABASE')} className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm border transition-colors ${viewMode === 'DATABASE' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-gray-600'}`}>
                        <FileSpreadsheet className="w-4 h-4" /> <span>Input Nilai</span>
                    </button>
                )}
                {userRole === 'ADMIN' && (
                    <>
                        <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm border bg-white text-gray-600 hover:bg-gray-50">
                            <Download className="w-4 h-4" /> Template
                        </button>
                        <button onClick={handleDownloadAll} disabled={isBatchGenerating} className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm border bg-gray-800 text-white border-gray-900 hover:bg-black disabled:opacity-50">
                            {isBatchGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Files className="w-4 h-4" />} Download Semua
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm border bg-white text-blue-600 border-blue-200 hover:bg-blue-50">
                            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />} Import Excel
                        </button>
                    </>
                )}

                {userRole === 'GURU' && <div className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm border bg-gray-50 text-gray-500"><Eye className="w-4 h-4" /> Mode Lihat (Guru)</div>}
                {userRole === 'STUDENT' && <div className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm border bg-blue-50 text-blue-600 border-blue-100"><LayoutList className="w-4 h-4" /> Rapor Saya</div>}
                
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
        </div>
        
        {/* Detail View Controls */}
        {viewMode === 'REPORT' && (
            <div className="flex items-center gap-2">
                <button onClick={() => { setViewMode('DATABASE'); setSelectedStudent(null); }} className="p-2 hover:bg-gray-100 rounded text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
                <button onClick={handleDownloadPDF} disabled={isGeneratingPdf} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                    {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} Download PDF
                </button>
            </div>
        )}
      </div>

      {/* Main Content */}
      <div className={`bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col relative ${viewMode === 'REPORT' ? 'bg-gray-100' : ''}`}>
          {viewMode === 'DATABASE' ? (
              <div className="overflow-auto flex-1 w-full pb-32">
                  {/* Database Table Code */}
                  <table className="border-collapse w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm text-gray-600 uppercase text-xs">
                          <tr>
                              <th className="px-4 py-3 text-left w-16 bg-gray-50 sticky left-0 z-20">Aksi</th>
                              <th className="px-4 py-3 text-left min-w-[200px] bg-gray-50 sticky left-[64px] z-20">Nama Siswa</th>
                              {SUBJECT_MAP.map(sub => <th key={sub.key} className="px-2 py-3 text-center min-w-[50px]">{sub.label}</th>)}
                              <th className="px-2 py-3 text-center min-w-[120px]">Ekstrakurikuler</th>
                              <th className="px-2 py-3 text-center min-w-[40px]">S</th><th className="px-2 py-3 text-center min-w-[40px]">I</th><th className="px-2 py-3 text-center min-w-[40px]">A</th>
                              {[2, 4, 6].includes(dbSemester) && <th className="px-4 py-3 text-center min-w-[120px]">Ket. Naik Kelas</th>}
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredStudents.length > 0 ? filteredStudents.map((student) => {
                              const isEditingRow = editingId === student.id;
                              const record = getRecord(student);
                              return (
                                  <tr key={student.id + renderKey} className="hover:bg-blue-50 transition-colors group">
                                      <td className="px-4 py-2 flex gap-1 items-center sticky left-0 bg-white z-10 group-hover:bg-blue-50">
                                          {isEditingRow ? (
                                              <><button onClick={() => saveEdit(student)} className="p-1.5 bg-green-100 text-green-700 rounded"><Save className="w-4 h-4" /></button><button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-100 text-gray-600 rounded"><X className="w-4 h-4" /></button></>
                                          ) : (
                                              <><button onClick={() => startEdit(student)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title="Edit"><Pencil className="w-4 h-4" /></button><button onClick={() => handleViewReport(student)} className="p-1.5 text-purple-600 hover:bg-purple-100 rounded" title="Rapor"><LayoutList className="w-4 h-4" /></button></>
                                          )}
                                      </td>
                                      <td className="px-4 py-2 font-medium text-gray-900 sticky left-[64px] bg-white z-10 group-hover:bg-blue-50"><div>{student.fullName}</div><div className="text-xs text-gray-400 font-mono">{student.className}</div></td>
                                      {SUBJECT_MAP.map(sub => { const score = isEditingRow ? (editScores[sub.key] || 0) : getScore(student, sub.key, dbSemester); return <td key={sub.key} className="px-2 py-2 text-center">{isEditingRow ? <input type="number" className="w-10 text-center border rounded p-1 text-xs" value={editScores[sub.key] || 0} onChange={(e) => setEditScores({...editScores, [sub.key]: Number(e.target.value)})} /> : <span className={`font-semibold ${score < 75 && score > 0 ? 'text-red-500' : 'text-gray-700'}`}>{score || '-'}</span>}</td>; })}
                                      <td className="px-2 py-2 text-center">{isEditingRow ? <input type="text" className="w-full text-xs border rounded p-1" value={editExtra} onChange={(e)=>setEditExtra(e.target.value)} /> : <span className="text-xs">{record?.extracurriculars?.[0]?.name || '-'}</span>}</td>
                                      <td className="px-2 py-2 text-center">{isEditingRow ? <input type="number" className="w-8 text-center text-xs border rounded" value={editAttendance.sick} onChange={(e)=>setEditAttendance({...editAttendance, sick: Number(e.target.value)})} /> : record?.attendance?.sick || 0}</td>
                                      <td className="px-2 py-2 text-center">{isEditingRow ? <input type="number" className="w-8 text-center text-xs border rounded" value={editAttendance.permitted} onChange={(e)=>setEditAttendance({...editAttendance, permitted: Number(e.target.value)})} /> : record?.attendance?.permitted || 0}</td>
                                      <td className="px-2 py-2 text-center">{isEditingRow ? <input type="number" className="w-8 text-center text-xs border rounded" value={editAttendance.noReason} onChange={(e)=>setEditAttendance({...editAttendance, noReason: Number(e.target.value)})} /> : record?.attendance?.noReason || 0}</td>
                                      {[2, 4, 6].includes(dbSemester) && <td className="px-2 py-2 text-center">{isEditingRow ? <select className="text-xs border rounded p-1 w-full" value={editPromotion} onChange={(e)=>setEditPromotion(e.target.value)}><option value="">- Pilih -</option><option value="NAIK">Naik Kelas</option><option value="TINGGAL">Tinggal Kelas</option>{dbSemester === 6 && <option value="LULUS">Lulus</option>}</select> : <span className="text-xs font-bold text-blue-600">{record?.promotionStatus || '-'}</span>}</td>}
                                  </tr>
                              );
                          }) : <tr><td colSpan={20} className="p-8 text-center text-gray-500">Tidak ada data.</td></tr>}
                      </tbody>
                  </table>
              </div>
          ) : (
              <div className="overflow-auto flex-1 bg-gray-500/10 p-4 md:p-8 flex justify-center pb-32">
                  {selectedStudent && (
                      <div id="report-content" className="shadow-xl">
                          <ReportTemplate 
                              student={selectedStudent} 
                              semester={dbSemester}
                              appSettings={appSettings}
                              userRole={userRole}
                              onCorrectionRequest={(type, data) => {
                                  if (type === 'CLASS') handleOpenClassCorrection();
                                  if (type === 'GRADE' && data) handleOpenGradeCorrection(data.subject, data.score);
                              }}
                          />
                      </div>
                  )}
              </div>
          )}
      </div>

        {/* VISIBLE OVERLAY FOR BATCH DOWNLOAD - USING PORTAL FOR ROBUSTNESS */}
        {isBatchGenerating && createPortal(
            <div className="fixed inset-0 z-[9999] bg-gray-900 flex flex-col items-center justify-start overflow-auto">
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center animate-bounce-in">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                    <h3 className="text-xl font-bold text-gray-900">Memproses PDF...</h3>
                    <p className="text-gray-500 text-sm mt-2">Sedang menggabungkan {filteredStudents.length} rapor siswa.</p>
                    <p className="text-xs text-gray-400 mt-1">Mohon tunggu, jangan tutup halaman ini.</p>
                </div>

                {/* The Container for html2pdf - Absolutely positioned to ensure full rendering */}
                <div className="absolute top-0 left-0 w-full flex flex-col items-center pt-20 pb-20 bg-gray-900 min-h-screen">
                    <div id="batch-rapor-container" className="bg-white w-[210mm]">
                        {filteredStudents.map((student, index) => (
                            <div key={student.id} className="relative">
                                <ReportTemplate 
                                    student={student} 
                                    semester={dbSemester}
                                    appSettings={appSettings}
                                    userRole={userRole}
                                    isBatch={true} 
                                />
                                {index < filteredStudents.length - 1 && (
                                    <div className="html2pdf__page-break" style={{ pageBreakAfter: 'always', height: 0, display: 'block' }}></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>,
            document.body
        )}
    </div>
  );
};

export default GradesView;