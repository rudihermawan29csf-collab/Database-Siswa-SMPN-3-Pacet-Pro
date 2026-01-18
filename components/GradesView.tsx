
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Student, AcademicRecord, CorrectionRequest } from '../types';
import { Search, FileSpreadsheet, Download, UploadCloud, Trash2, Save, Pencil, X, CheckCircle2, Loader2, LayoutList, ArrowLeft, Printer, FileDown, AlertTriangle, Eye, Activity, School, Send, Files, BookOpen, Award } from 'lucide-react';
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

// NEW: Helper for Score Color
const getScoreColor = (score: number) => {
    if (!score && score !== 0) return '';
    if (score === 0) return 'text-gray-400';
    if (score < 70) return 'bg-red-100 text-red-700 font-bold';
    if (score < 85) return 'bg-yellow-100 text-yellow-800 font-bold';
    return 'bg-green-100 text-green-700 font-bold';
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

// Helper to determine Grade Level from Class Name (e.g. "IX A" -> "IX")
const getGradeLevel = (className: string) => {
    if (!className) return 'VII'; // Default
    const parts = className.trim().split(' ');
    const level = parts[0].toUpperCase();
    if (['VII', 'VIII', 'IX'].includes(level)) return level;
    return 'VII';
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
    // 1. Get Base Data (School Info)
    const schoolName = appSettings?.schoolData?.name || 'SMP Negeri 3 Pacet';
    const schoolAddress = appSettings?.schoolData?.address || 'Jalan Raya Pacet No. 12'; 
    
    const currentLevel = getGradeLevel(student.className);
    let academicYear = '2024/2025';
    let reportDate = new Date().toLocaleDateString('id-ID');

    if (appSettings?.academicData) {
        if (appSettings.academicData.semesterYears?.[currentLevel]?.[semester]) {
            academicYear = appSettings.academicData.semesterYears[currentLevel][semester];
        } else if (appSettings.academicData.semesterYears?.[semester]) {
            academicYear = appSettings.academicData.semesterYears[semester];
        }
        if (appSettings.academicData.semesterDates?.[currentLevel]?.[semester]) {
            const dateStr = appSettings.academicData.semesterDates[currentLevel][semester];
            if (dateStr) {
                const dateObj = new Date(dateStr);
                if (!isNaN(dateObj.getTime())) {
                    reportDate = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                } else {
                    reportDate = dateStr;
                }
            }
        } else if (appSettings.academicData.semesterDates?.[semester]) {
             const dateStr = appSettings.academicData.semesterDates[semester];
             if(dateStr) reportDate = dateStr;
        }
    }
    
    const headmaster = appSettings?.schoolData?.headmaster || 'Didik Sulistyo, M.M.Pd';
    const headmasterNip = appSettings?.schoolData?.nip || '19660518 198901 1 002';
    
    let record = student.academicRecords?.[semester];
    
    if (!record) {
        const level = (semester <= 2) ? 'VII' : (semester <= 4) ? 'VIII' : 'IX';
        record = {
            semester: semester,
            classLevel: level,
            className: student.className,
            phase: 'D',
            year: academicYear,
            subjects: SUBJECT_MAP.map((s, i) => ({ no: i + 1, subject: s.full, score: 0, competency: '-' })),
            p5Projects: [], extracurriculars: [], teacherNote: '-', attendance: { sick: 0, permitted: 0, noReason: 0 }
        };
    } else {
        const filledSubjects = SUBJECT_MAP.map((mapItem, idx) => {
            const existingSub = record!.subjects.find(s => 
                s.subject === mapItem.full || s.subject.startsWith(mapItem.key) || (mapItem.key === 'PAI' && s.subject.includes('Agama'))
            );
            const score = existingSub ? existingSub.score : 0;
            const competency = getCompetencyDescription(score, mapItem.full);
            return { no: idx + 1, subject: mapItem.full, score: score, competency: competency };
        });
        record = { ...record, subjects: filledSubjects };
    }

    const classCorrectionKey = `class-${semester}`;
    const pendingClassReq = student.correctionRequests?.find(r => r.fieldKey === classCorrectionKey && r.status === 'PENDING');
    const displayClass = pendingClassReq ? pendingClassReq.proposedValue : (record.className || student.className);

    const waliKey = `${academicYear}-${semester}-${displayClass}`;
    const waliData = appSettings?.classConfig?.[waliKey];
    const waliName = waliData?.teacher || '..................................';
    const waliNip = waliData?.nip || '..................................';

    return (
        <div className={`bg-white ${isBatch ? '' : 'shadow-xl'} h-[296mm] w-[210mm] mx-auto p-[10mm] text-black font-sans relative print:shadow-none print:w-full print:m-0 print:p-0 box-border overflow-hidden`}>
            {/* Identity Table */}
            <div className="text-xs mb-4">
                <table className="w-full">
                    <tbody>
                        <tr><td className="w-32 py-0.5">Nama Peserta Didik</td><td>: {student.fullName}</td><td className="w-24">Kelas</td><td className="font-bold">: {displayClass}</td></tr>
                        <tr><td className="py-0.5">NISN / NIS</td><td>: {student.nisn} / {student.nis}</td><td>Fase</td><td>: D</td></tr>
                        <tr><td className="py-0.5">Sekolah</td><td>: {schoolName.toUpperCase()}</td><td>Semester</td><td>: {semester} ({academicYear})</td></tr>
                        <tr><td className="py-0.5" valign="top">Alamat</td><td colSpan={3}>: {schoolAddress}</td></tr>
                    </tbody>
                </table>
            </div>

            {/* A. INTRAKURIKULER */}
            <div className="mb-4">
                <h3 className="font-bold text-sm mb-1">A. INTRAKURIKULER</h3>
                <table className="w-full border-collapse border border-black text-xs">
                    <thead className="bg-black text-white text-center">
                        <tr><th className="border border-black p-1 w-8">NO</th><th className="border border-black p-1">MATA PELAJARAN</th><th className="border border-black p-1 w-16">NILAI AKHIR</th><th className="border border-black p-1">CAPAIAN KOMPETENSI</th></tr>
                    </thead>
                    <tbody>
                        {record.subjects.map((sub, idx) => (
                            <tr key={idx} className={idx % 2 !== 0 ? 'bg-gray-100' : ''}>
                                <td className="border border-black p-1 text-center">{idx + 1}</td>
                                <td className="border border-black p-1">{sub.subject}</td>
                                <td className="border border-black p-1 text-center font-bold">{sub.score}</td>
                                <td className="border border-black p-1 text-[10px] italic text-gray-700">{sub.competency || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             <div className="mb-4">
                <h3 className="font-bold text-sm mb-1">B. DESKRIPSI NILAI P5</h3>
                <table className="w-full border-collapse border border-black text-xs">
                    <thead className="bg-black text-white text-center"><tr><th className="border border-black p-1 w-8">NO</th><th className="border border-black p-1 w-1/3">TEMA</th><th className="border border-black p-1">DESKRIPSI</th></tr></thead>
                    <tbody>{record.p5Projects && record.p5Projects.length > 0 ? record.p5Projects.map((p, idx) => (<tr key={idx} className={idx % 2 !== 0 ? 'bg-gray-100' : ''}><td className="border border-black p-1 text-center">{idx + 1}</td><td className="border border-black p-1">{p.theme}</td><td className="border border-black p-1 text-[10px]">{p.description}</td></tr>)) : (<><tr className="bg-gray-100"><td className="border border-black p-1 text-center">1</td><td className="border border-black p-1">Suara Demokrasi</td><td className="border border-black p-1">Berkembang sesuai harapan</td></tr><tr><td className="border border-black p-1 text-center">2</td><td className="border border-black p-1">-</td><td className="border border-black p-1">-</td></tr></>)}</tbody>
                </table>
            </div>
            <div className="mb-4 w-1/2">
                <h3 className="font-bold text-sm mb-1">C. EKSTRAKURIKULER</h3>
                <table className="w-full border-collapse border border-black text-xs">
                    <thead className="bg-black text-white text-left"><tr><th className="border border-black p-1 w-8 text-center">NO</th><th className="border border-black p-1">KEGIATAN EKSTRAKURIKULER</th><th className="border border-black p-1 w-16 text-center">PREDIKAT</th></tr></thead>
                    <tbody>{record.extracurriculars && record.extracurriculars.length > 0 ? (record.extracurriculars.map((ex, idx) => (<tr key={idx} className={idx % 2 !== 0 ? 'bg-gray-100' : ''}><td className="border border-black p-1 text-center">{idx + 1}</td><td className="border border-black p-1">{ex.name}</td><td className="border border-black p-1 text-center">{ex.score}</td></tr>))) : (<><tr className="bg-gray-100"><td className="border border-black p-1 text-center">1</td><td className="border border-black p-1">Pramuka</td><td className="border border-black p-1 text-center">-</td></tr><tr><td className="border border-black p-1 text-center">2</td><td className="border border-black p-1">-</td><td className="border border-black p-1 text-center">-</td></tr></>)}</tbody>
                </table>
            </div>
            <div className="mb-4">
                <h3 className="font-bold text-sm mb-1 pl-1 border-l-4 border-green-600">D. CATATAN WALI KELAS</h3>
                <div className="border border-black bg-gray-200 p-2 text-xs min-h-[40px]">{record.teacherNote || 'Pertahankan Prestasimu belajarmu!'}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                    <h3 className="font-bold text-sm mb-1">KENAIKAN KELAS</h3>
                    <div className="border border-black p-2 bg-gray-100 text-xs h-full">{[2, 4, 6].includes(semester) ? (<><p>Naik Kelas : {record.promotionStatus === 'NAIK' ? `YA (Ke Kelas ${student.className.includes('VII') ? 'VIII' : 'IX'})` : '-'}</p><p>Tanggal : {reportDate}</p></>) : (<p className="text-gray-400 italic">Hanya muncul di semester genap</p>)}</div>
                </div>
                <div>
                    <h3 className="font-bold text-sm mb-1">KETIDAKHADIRAN</h3>
                    <table className="w-full border-collapse border border-black text-xs"><tbody><tr><td className="border border-black p-1 w-8 text-center">1.</td><td className="border border-black p-1">Sakit</td><td className="border border-black p-1 w-10 text-center">{record.attendance.sick}</td><td className="border border-black p-1 w-10">Hari</td></tr><tr><td className="border border-black p-1 w-8 text-center">2.</td><td className="border border-black p-1">Ijin</td><td className="border border-black p-1 w-10 text-center">{record.attendance.permitted}</td><td className="border border-black p-1 w-10">Hari</td></tr><tr><td className="border border-black p-1 w-8 text-center">3.</td><td className="border border-black p-1">Tanpa Keterangan</td><td className="border border-black p-1 w-10 text-center">{record.attendance.noReason}</td><td className="border border-black p-1 w-10">Hari</td></tr></tbody></table>
                </div>
            </div>
            <div className="flex justify-between items-start text-xs font-bold mt-8 bg-gray-200 p-4 border border-gray-300"><div className="text-center w-1/3"><p className="mb-16 uppercase">Kepala Sekolah</p><p className="underline uppercase">{headmaster}</p><p>NIP. {headmasterNip}</p></div><div className="text-center w-1/3"><p className="mb-16">Wali Kelas</p><p className="underline uppercase">{waliName}</p><p>NIP. {waliNip}</p></div></div>
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
  const [appSettings, setAppSettings] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScores, setEditScores] = useState<Record<string, number>>({});
  const [editAttendance, setEditAttendance] = useState({ sick: 0, permitted: 0, noReason: 0 });
  const [editExtra, setEditExtra] = useState('');
  const [editPromotion, setEditPromotion] = useState('');
  
  // Correction States
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionType, setCorrectionType] = useState<'CLASS' | 'GRADE'>('CLASS');
  const [proposedClass, setProposedClass] = useState('');
  const [targetSubject, setTargetSubject] = useState('');
  const [proposedScore, setProposedScore] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  useEffect(() => {
      const fetchSettings = async () => {
          try { const settings = await api.getAppSettings(); if (settings) setAppSettings(settings); } catch (e) { console.error(e); }
      };
      fetchSettings();
  }, []);

  useEffect(() => {
      // IF Student logs in, allow them to view table but default to DATABASE view to see edit buttons
      if (userRole === 'STUDENT' && loggedInStudent) {
          setViewMode('DATABASE'); 
          setSelectedStudent(loggedInStudent);
      }
  }, [userRole, loggedInStudent]); 

  const uniqueClasses = useMemo(() => {
      const classes = Array.from(new Set(students.map(s => s.className))).filter(Boolean) as string[];
      return ['ALL', ...classes.sort()];
  }, [students]);

  const effectiveStudents = (userRole === 'STUDENT' && loggedInStudent) ? [loggedInStudent] : students;
  const filteredStudents = effectiveStudents.filter(s => {
      const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.nisn.includes(searchTerm);
      const matchClass = userRole === 'STUDENT' ? true : (dbClassFilter === 'ALL' || s.className === dbClassFilter);
      return matchSearch && matchClass;
  });

  const getRecord = (s: Student) => s.academicRecords?.[dbSemester];

  // --- EDIT HANDLERS (ADMIN) ---
  const startEdit = (s: Student) => {
      const record = getRecord(s); setEditingId(s.id);
      const currentScores: Record<string, number> = {};
      SUBJECT_MAP.forEach(sub => { currentScores[sub.key] = getScore(s, sub.key, dbSemester); });
      setEditScores(currentScores);
      setEditAttendance(record?.attendance || { sick: 0, permitted: 0, noReason: 0 });
      setEditExtra(record?.extracurriculars?.[0]?.name || '');
      setEditPromotion(record?.promotionStatus || '');
  };

  const saveEdit = async (s: Student) => {
      setIsSaving(true);
      try {
          if (!s.academicRecords) s.academicRecords = {};
          if (!s.academicRecords[dbSemester]) {
              s.academicRecords[dbSemester] = { semester: dbSemester, classLevel: 'VII', className: s.className, phase: 'D', year: '2024', subjects: [], p5Projects: [], extracurriculars: [], teacherNote: '', attendance: { sick: 0, permitted: 0, noReason: 0 } };
          }
          const record = s.academicRecords[dbSemester];
          SUBJECT_MAP.forEach((mapItem, idx) => {
              const score = editScores[mapItem.key] || 0;
              const competency = getCompetencyDescription(score, mapItem.full);
              let subj = record.subjects.find(sub => sub.subject === mapItem.full || sub.subject.startsWith(mapItem.key));
              if (subj) { subj.score = score; subj.competency = competency; } else { record.subjects.push({ no: idx + 1, subject: mapItem.full, score: score, competency: competency }); }
          });
          if (editExtra) record.extracurriculars = [{ name: editExtra, score: 'Baik' }]; else record.extracurriculars = [];
          record.attendance = editAttendance; record.promotionStatus = editPromotion;
          await api.updateStudent(s);
          setEditingId(null); if (onUpdate) onUpdate();
      } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  // --- CORRECTION HANDLERS (STUDENT) ---
  const handleOpenClassCorrection = (student: Student) => {
      setSelectedStudent(student);
      setCorrectionType('CLASS');
      setProposedClass(student.className); 
      setCorrectionReason('');
      setIsCorrectionModalOpen(true);
  };

  const handleOpenGradeCorrection = (student: Student, subjKey: string, currentScore: number) => {
      setSelectedStudent(student);
      setCorrectionType('GRADE');
      const subj = SUBJECT_MAP.find(s => s.key === subjKey);
      setTargetSubject(subj ? subj.full : subjKey);
      setProposedScore(String(currentScore));
      setCorrectionReason('');
      setIsCorrectionModalOpen(true);
  };
  
  const submitCorrection = async () => {
      if (!selectedStudent) return;
      if (!correctionReason.trim()) { alert("Mohon isi alasan revisi."); return; }

      const fieldKey = correctionType === 'CLASS' 
          ? `class-${dbSemester}` 
          : `grade-${dbSemester}-${targetSubject}`;
      
      const newRequest: CorrectionRequest = {
          id: Math.random().toString(36).substr(2, 9),
          fieldKey: fieldKey,
          fieldName: correctionType === 'CLASS' ? `Kelas (Sem ${dbSemester})` : `Nilai ${targetSubject} (Sem ${dbSemester})`,
          originalValue: correctionType === 'CLASS' ? selectedStudent.className : 'current',
          proposedValue: correctionType === 'CLASS' ? proposedClass : proposedScore,
          studentReason: correctionReason,
          status: 'PENDING',
          requestDate: new Date().toISOString(),
      };

      const updatedStudent = { ...selectedStudent };
      if (!updatedStudent.correctionRequests) updatedStudent.correctionRequests = [];
      
      // Remove existing pending request for same field
      updatedStudent.correctionRequests = updatedStudent.correctionRequests.filter(r => !(r.fieldKey === fieldKey && r.status === 'PENDING'));
      
      updatedStudent.correctionRequests.push(newRequest);
      await api.updateStudent(updatedStudent);
      
      setIsCorrectionModalOpen(false);
      alert("✅ Pengajuan revisi berhasil dikirim.");
      if (onUpdate) onUpdate();
  };

  // ... (Excel handlers omitted for brevity) ...
  const handleDownloadTemplate = () => { /* ... */ };
  const handleImportExcel = () => { /* ... */ };
  const handleViewReport = (s: Student) => { setSelectedStudent(s); setViewMode('REPORT'); };
  const handleDownloadPDF = () => { /* ... */ };

  const getPendingRequest = (student: Student, key: string) => {
      return student.correctionRequests?.find(r => r.fieldKey === key && r.status === 'PENDING');
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in relative">
      {/* Correction Modal */}
      {isCorrectionModalOpen && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="font-bold text-gray-800 text-lg">Ajukan Perbaikan</h3>
                      <button onClick={() => setIsCorrectionModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
                  </div>
                  
                  <div className="space-y-4">
                      {correctionType === 'CLASS' ? (
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kelas yang Benar</label>
                              <select className="w-full p-2 border rounded font-bold" value={proposedClass} onChange={e => setProposedClass(e.target.value)}>
                                  {CLASS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                          </div>
                      ) : (
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nilai yang Benar</label>
                              <input type="number" className="w-full p-2 border rounded font-bold" value={proposedScore} onChange={e => setProposedScore(e.target.value)} />
                              <p className="text-xs text-blue-600 mt-1">Mapel: {targetSubject}</p>
                          </div>
                      )}
                      
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Alasan</label>
                          <textarea className="w-full p-2 border rounded text-sm" rows={2} placeholder="Jelaskan kenapa data ini salah..." value={correctionReason} onChange={e => setCorrectionReason(e.target.value)} />
                      </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                      <button onClick={() => setIsCorrectionModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-lg text-sm">Batal</button>
                      <button onClick={submitCorrection} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700">
                          <Send className="w-3 h-3" /> Kirim
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
                        <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm border bg-white text-gray-600 hover:bg-gray-50"><Download className="w-4 h-4" /> Template</button>
                    </>
                )}
                
                {/* SEMESTER SELECTOR */}
                <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg border border-gray-200">
                    <span className="text-xs font-bold text-gray-500 uppercase">Semester:</span>
                    <select className="bg-transparent text-sm font-bold text-gray-800 outline-none cursor-pointer" value={dbSemester} onChange={(e) => setDbSemester(Number(e.target.value))}>
                        {[1, 2, 3, 4, 5, 6].map(sem => (<option key={sem} value={sem}>Semester {sem}</option>))}
                    </select>
                </div>

                {(userRole === 'ADMIN' || userRole === 'GURU') && (
                    <select className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium" value={dbClassFilter} onChange={(e) => setDbClassFilter(e.target.value)}>
                        <option value="ALL">Semua Kelas</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c === 'ALL' ? '' : `Kelas ${c}`}</option>)}
                    </select>
                )}
            </div>
        </div>
        {viewMode === 'REPORT' && (
            <div className="flex items-center gap-2">
                <button onClick={() => { setViewMode('DATABASE'); setSelectedStudent(null); }} className="p-2 hover:bg-gray-100 rounded text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
                <button onClick={handleDownloadPDF} disabled={isGeneratingPdf} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"><FileDown className="w-4 h-4" /> Download PDF</button>
            </div>
        )}
      </div>

      {/* Main Content */}
      <div className={`bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col relative ${viewMode === 'REPORT' ? 'bg-gray-100' : ''}`}>
          {viewMode === 'DATABASE' ? (
              <div className="overflow-auto flex-1 w-full pb-32">
                  {userRole === 'STUDENT' && loggedInStudent ? (
                      // --- VERTICAL TABLE LAYOUT FOR STUDENT ---
                      <div className="p-6 max-w-4xl mx-auto">
                          {/* Student Header Info */}
                          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div>
                                  <h2 className="text-xl font-bold text-blue-900">{loggedInStudent.fullName}</h2>
                                  <div className="flex items-center gap-2 mt-1">
                                      <p className="text-sm text-blue-700 font-medium">NISN: {loggedInStudent.nisn}</p>
                                      <span className="text-blue-300">•</span>
                                      <div className="flex items-center gap-2">
                                          <p className="text-sm text-blue-700 font-bold">Kelas {getRecord(loggedInStudent)?.className || loggedInStudent.className}</p>
                                          {/* Class Correction Button */}
                                          <button 
                                              onClick={() => handleOpenClassCorrection(loggedInStudent)}
                                              className="p-1.5 bg-white hover:bg-blue-100 rounded-full text-blue-600 shadow-sm border border-blue-200 transition-all"
                                              title="Koreksi Kelas"
                                          >
                                              <Pencil className="w-3 h-3" />
                                          </button>
                                          {getPendingRequest(loggedInStudent, `class-${dbSemester}`) && (
                                              <span className="text-[10px] bg-yellow-300 text-yellow-900 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                                  Koreksi Menunggu
                                              </span>
                                          )}
                                      </div>
                                  </div>
                              </div>
                              <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-blue-100">
                                  <p className="text-[10px] uppercase font-bold text-gray-400">Semester Aktif</p>
                                  <p className="text-lg font-black text-blue-600">Semester {dbSemester}</p>
                              </div>
                          </div>

                          {/* Vertical Grades Table */}
                          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                              <table className="w-full text-sm text-left">
                                  <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                                      <tr>
                                          <th className="px-6 py-4 w-16 text-center">No</th>
                                          <th className="px-6 py-4">Mata Pelajaran</th>
                                          <th className="px-6 py-4 text-center w-32">Nilai Akhir</th>
                                          <th className="px-6 py-4">Capaian Kompetensi</th>
                                          <th className="px-6 py-4 text-center w-24">Aksi</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                      {SUBJECT_MAP.map((sub, idx) => {
                                          const score = getScore(loggedInStudent, sub.key, dbSemester);
                                          const competency = getCompetencyDescription(score, sub.full);
                                          const gradeReq = getPendingRequest(loggedInStudent, `grade-${dbSemester}-${sub.full}`);

                                          return (
                                              <tr key={sub.key} className="hover:bg-blue-50/30 transition-colors group">
                                                  <td className="px-6 py-4 text-center text-gray-400 font-medium">{idx + 1}</td>
                                                  <td className="px-6 py-4 font-bold text-gray-700">
                                                      {sub.full}
                                                  </td>
                                                  <td className="px-6 py-4 text-center">
                                                      <div className="flex justify-center items-center gap-2">
                                                          <span className={`px-3 py-1 rounded-lg text-sm font-bold ${getScoreColor(score)}`}>
                                                              {gradeReq ? gradeReq.proposedValue : (score > 0 ? score : '-')}
                                                          </span>
                                                          {gradeReq && <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" title="Menunggu Verifikasi"></span>}
                                                      </div>
                                                  </td>
                                                  <td className="px-6 py-4 text-xs text-gray-500 italic">
                                                      {score > 0 ? competency : '-'}
                                                  </td>
                                                  <td className="px-6 py-4 text-center">
                                                      {!gradeReq && (
                                                          <button 
                                                              onClick={() => handleOpenGradeCorrection(loggedInStudent, sub.key, score)}
                                                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg hover:shadow-sm transition-all border border-transparent hover:border-blue-100"
                                                              title="Ajukan Perbaikan Nilai"
                                                          >
                                                              <Pencil className="w-4 h-4" />
                                                          </button>
                                                      )}
                                                      {gradeReq && <span className="text-[10px] text-yellow-600 font-bold bg-yellow-50 px-2 py-1 rounded border border-yellow-100">Pending</span>}
                                                  </td>
                                              </tr>
                                          );
                                      })}
                                  </tbody>
                              </table>
                          </div>

                          {/* Footer Info (Attendance & Extra) */}
                          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-purple-500"/> Ketidakhadiran</h3>
                                  <div className="grid grid-cols-3 gap-2 text-center">
                                      <div className="bg-purple-50 p-2 rounded-lg">
                                          <p className="text-[10px] uppercase font-bold text-purple-400">Sakit</p>
                                          <p className="font-bold text-purple-700">{getRecord(loggedInStudent)?.attendance?.sick || 0}</p>
                                      </div>
                                      <div className="bg-blue-50 p-2 rounded-lg">
                                          <p className="text-[10px] uppercase font-bold text-blue-400">Ijin</p>
                                          <p className="font-bold text-blue-700">{getRecord(loggedInStudent)?.attendance?.permitted || 0}</p>
                                      </div>
                                      <div className="bg-red-50 p-2 rounded-lg">
                                          <p className="text-[10px] uppercase font-bold text-red-400">Alpha</p>
                                          <p className="font-bold text-red-700">{getRecord(loggedInStudent)?.attendance?.noReason || 0}</p>
                                      </div>
                                  </div>
                              </div>
                              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-orange-500"/> Ekstrakurikuler</h3>
                                  {getRecord(loggedInStudent)?.extracurriculars && getRecord(loggedInStudent)!.extracurriculars.length > 0 ? (
                                      <div className="space-y-2">
                                          {getRecord(loggedInStudent)!.extracurriculars.map((ex, i) => (
                                              <div key={i} className="flex justify-between items-center bg-orange-50 p-2 rounded-lg border border-orange-100">
                                                  <span className="text-sm font-bold text-orange-800">{ex.name}</span>
                                                  <span className="text-xs font-bold bg-white px-2 py-0.5 rounded text-orange-600">{ex.score}</span>
                                              </div>
                                          ))}
                                      </div>
                                  ) : (
                                      <p className="text-sm text-gray-400 italic">Tidak ada data ekstrakurikuler.</p>
                                  )}
                              </div>
                          </div>

                      </div>
                  ) : (
                      // --- ADMIN / DEFAULT TABLE LAYOUT ---
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
                                  const classReq = getPendingRequest(student, `class-${dbSemester}`);
                                  
                                  return (
                                      <tr key={student.id + renderKey} className="hover:bg-blue-50 transition-colors group">
                                          <td className="px-4 py-2 flex gap-1 items-center sticky left-0 bg-white z-10 group-hover:bg-blue-50">
                                              {isEditingRow ? (
                                                  <><button onClick={() => saveEdit(student)} className="p-1.5 bg-green-100 text-green-700 rounded"><Save className="w-4 h-4" /></button><button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-100 text-gray-600 rounded"><X className="w-4 h-4" /></button></>
                                              ) : (
                                                  <>
                                                    {userRole === 'ADMIN' && <button onClick={() => startEdit(student)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title="Edit"><Pencil className="w-4 h-4" /></button>}
                                                    <button onClick={() => handleViewReport(student)} className="p-1.5 text-purple-600 hover:bg-purple-100 rounded" title="Lihat Rapor"><LayoutList className="w-4 h-4" /></button>
                                                  </>
                                              )}
                                          </td>
                                          <td className="px-4 py-2 font-medium text-gray-900 sticky left-[64px] bg-white z-10 group-hover:bg-blue-50">
                                              <div>{student.fullName}</div>
                                              <div className="flex items-center gap-2">
                                                  <span className="text-xs text-gray-400 font-mono">{record?.className || student.className}</span>
                                                  {classReq && <span className="text-[9px] bg-yellow-200 text-yellow-800 px-1 rounded animate-pulse">Menunggu</span>}
                                              </div>
                                          </td>
                                          
                                          {SUBJECT_MAP.map(sub => { 
                                              const score = isEditingRow ? (editScores[sub.key] || 0) : getScore(student, sub.key, dbSemester); 
                                              const gradeReq = getPendingRequest(student, `grade-${dbSemester}-${sub.full}`);
                                              return (
                                                <td key={sub.key} className="px-2 py-2 text-center relative group/cell">
                                                    {isEditingRow ? (
                                                        <input type="number" className="w-10 text-center border rounded p-1 text-xs" value={editScores[sub.key] || 0} onChange={(e) => setEditScores({...editScores, [sub.key]: Number(e.target.value)})} />
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span className={`px-2 py-1 rounded text-xs ${getScoreColor(score)}`}>{gradeReq ? gradeReq.proposedValue : (score || '-')}</span>
                                                            {gradeReq && <span className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></span>}
                                                        </div>
                                                    )}
                                                </td>
                                              ); 
                                          })}
                                          
                                          {/* Other columns */}
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
                  )}
              </div>
          ) : (
              <div className="overflow-auto flex-1 bg-gray-500/10 p-4 md:p-8 flex justify-center pb-32">
                  {selectedStudent && (
                      <div id="report-content" className="shadow-xl">
                          <ReportTemplate student={selectedStudent} semester={dbSemester} appSettings={appSettings} userRole={userRole} />
                      </div>
                  )}
              </div>
          )}
      </div>
      
      {isBatchGenerating && createPortal(
            <div className="fixed inset-0 z-[9999] bg-gray-900 flex flex-col items-center justify-start overflow-auto">
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center animate-bounce-in">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                    <h3 className="text-xl font-bold text-gray-900">Memproses PDF...</h3>
                    <p className="text-gray-500 text-sm mt-2">Sedang menggabungkan {filteredStudents.length} rapor siswa.</p>
                </div>
                <div className="absolute top-0 left-0 w-full flex flex-col items-center pt-20 pb-20 bg-gray-900 min-h-screen">
                    <div id="batch-rapor-container" className="bg-white w-[210mm]">
                        {filteredStudents.map((student, index) => (
                            <div key={student.id} className="relative">
                                <ReportTemplate student={student} semester={dbSemester} appSettings={appSettings} userRole={userRole} isBatch={true} />
                                {index < filteredStudents.length - 1 && <div className="html2pdf__page-break" style={{ pageBreakAfter: 'always', height: 0, display: 'block' }}></div>}
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
