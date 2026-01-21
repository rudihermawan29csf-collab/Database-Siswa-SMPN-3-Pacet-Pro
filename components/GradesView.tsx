
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Student, AcademicRecord, CorrectionRequest } from '../types';
import { Search, FileSpreadsheet, Download, UploadCloud, Trash2, Save, Pencil, X, CheckCircle2, Loader2, LayoutList, ArrowLeft, Printer, FileDown, AlertTriangle, Eye, Activity, School, Send, Files, BookOpen, Award, FileCheck2 } from 'lucide-react';
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
    { key: 'PJOK', label: 'PJOK', full: 'Pendidikan Jasmani, Olahraga, dan Kesehatan' },
    { key: 'Informatika', label: 'INF', full: 'Informatika' },
    { key: 'Seni dan Prakarya', label: 'SENI', full: 'Seni dan Prakarya' },
    { key: 'Bahasa Jawa', label: 'B.JAWA', full: 'Bahasa Jawa' },
];

// --- HELPER FUNCTIONS ---

const getScoreColor = (score: number) => {
    if (!score && score !== 0) return 'text-gray-300';
    if (score === 0) return 'text-gray-300';
    if (score < 70) return 'text-red-600 font-bold bg-red-50';
    if (score < 85) return 'text-yellow-700 font-bold';
    return 'text-green-600 font-bold';
};

const getCompetencyDescription = (score: number, subjectName: string) => {
    if (!score) return '-';
    let predikat = '';
    if (score >= 91) predikat = 'Sangat baik';
    else if (score >= 81) predikat = 'Baik';
    else if (score >= 75) predikat = 'Cukup';
    else predikat = 'Perlu bimbingan';

    return `${predikat} dalam memahami materi ${subjectName}.`;
};

// ROBUST SUBJECT FINDER
const findSubjectRecord = (subjects: any[], mapItem: any) => {
    if (!subjects) return undefined;
    return subjects.find(s => {
        const sName = (s.subject || '').toLowerCase().trim();
        const full = (mapItem.full || '').toLowerCase().trim();
        const key = (mapItem.key || '').toLowerCase().trim();
        const label = (mapItem.label || '').toLowerCase().trim();
        
        // Exact match on any field
        if (sName === full) return true;
        if (sName === key) return true;
        if (sName === label) return true;

        // Partial matches
        if (sName.includes(full)) return true;
        // Inverse check for cases where stored name is short but map is long
        if (full.includes(sName) && sName.length > 3) return true; 

        // Specific cases for commonly mismatched subjects
        if (key === 'pai' && sName.includes('agama')) return true;
        if (key === 'pjok' && (sName.includes('jasmani') || sName.includes('olahraga'))) return true;
        if ((key.includes('pancasila') || label === 'ppkn') && (sName.includes('pancasila') || sName.includes('ppkn'))) return true;
        if ((key.includes('seni') || label === 'seni') && (sName.includes('seni') || sName.includes('budaya') || sName.includes('prakarya'))) return true;
        
        return false;
    });
};

// Helper: Format Name Title Case & Gelar Correctly
const formatNameTitleCase = (name: string) => {
    if (!name) return '';
    // 1. Title Case (Capitalize first letter of each word)
    let formatted = name.toLowerCase().replace(/(?:^|\s)\S/g, function(a) { 
        return a.toUpperCase(); 
    });
    
    // 2. Fix Academic Titles
    formatted = formatted.replace(/\bM\.m\.pd\.?/gi, 'M.M.Pd.');
    formatted = formatted.replace(/\bS\.pd\.?/gi, 'S.Pd.');
    formatted = formatted.replace(/\bM\.pd\.?/gi, 'M.Pd.');
    formatted = formatted.replace(/\bS\.ag\.?/gi, 'S.Ag.');
    formatted = formatted.replace(/\bS\.si\.?/gi, 'S.Si.');
    formatted = formatted.replace(/\bS\.e\.?/gi, 'S.E.');
    
    return formatted;
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
    
    // Safety check for academicRecords - Handle String/Number keys
    let record = student.academicRecords ? (student.academicRecords[semester] || student.academicRecords[String(semester)]) : null;

    // --- PRIORITIZE RECORD DATA (EDITED IN VERIFICATION) ---
    // Class Name: Use record's class if available, else current class
    const classCorrectionKey = `class-${semester}`;
    const pendingClassReq = student.correctionRequests?.find(r => r.fieldKey === classCorrectionKey && r.status === 'PENDING');
    
    // Logic: Pending Request > Record Class (Verification) > Current Class
    const displayClass = pendingClassReq ? pendingClassReq.proposedValue : (record?.className || student.className);
    
    const currentLevel = getGradeLevel(displayClass); // Use displayed class to get level

    // Academic Year Logic: Priority = Record > Settings > Default
    let academicYear = '2024/2025';
    let reportDate = new Date().toLocaleDateString('id-ID');

    if (record?.year) {
        academicYear = record.year;
    } else if (appSettings?.academicData) {
        if (appSettings.academicData.semesterYears?.[currentLevel]?.[semester]) {
            academicYear = appSettings.academicData.semesterYears[currentLevel][semester];
        } else if (appSettings.academicData.semesterYears?.[semester]) {
            academicYear = appSettings.academicData.semesterYears[semester];
        }
    }

    // Report Date Logic
    if (appSettings?.academicData) {
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
    
    // If no record exists, creating a dummy one to ensure layout renders (for batch empty check)
    if (!record) {
        const level = (semester <= 2) ? 'VII' : (semester <= 4) ? 'VIII' : 'IX';
        record = {
            semester: semester,
            classLevel: level,
            className: displayClass,
            phase: 'D',
            year: academicYear,
            subjects: SUBJECT_MAP.map((s, i) => ({ no: i + 1, subject: s.full, score: 0, competency: '-' })),
            p5Projects: [], extracurriculars: [], teacherNote: '-', attendance: { sick: 0, permitted: 0, noReason: 0 }
        };
    } else {
        // Ensure all subjects are mapped even if not in DB
        const filledSubjects = SUBJECT_MAP.map((mapItem, idx) => {
            const existingSub = findSubjectRecord(record!.subjects, mapItem);
            
            const score = existingSub ? existingSub.score : 0;
            const competency = existingSub?.competency && existingSub.competency !== '-' 
                ? existingSub.competency 
                : getCompetencyDescription(score, mapItem.full);
                
            return { no: idx + 1, subject: mapItem.full, score: score, competency: competency };
        });
        
        // FIX: Ensure attendance object exists even if missing in DB record, PRIORITIZE EXISTING RECORD
        const attendance = record.attendance || { sick: 0, permitted: 0, noReason: 0 };
        
        // We reconstruct record using prioritised values to render
        record = { 
            ...record, 
            subjects: filledSubjects, 
            attendance: attendance, 
            year: academicYear, // Forced priority
            className: displayClass // Forced priority
        };
    }

    // --- P5 LOGIC (UPDATED) ---
    // 1. Check Student Record (Manual Override)
    let p5DataToRender = record.p5Projects || [];

    // 2. If Empty, Check Admin Settings based on Context (Year-Level-Semester)
    if (!p5DataToRender.length && appSettings?.p5DataMap) {
        const p5Key = `${academicYear}-${currentLevel}-${semester}`;
        const specificThemes = appSettings.p5DataMap[p5Key];
        if (specificThemes && specificThemes.length > 0) {
            p5DataToRender = specificThemes.map((t: any, i: number) => ({
                no: i + 1,
                theme: t.theme,
                description: t.description
            }));
        }
    }

    // 3. Fallback to Old Global Settings (Backward Compatibility)
    if (!p5DataToRender.length && appSettings?.p5Themes && appSettings.p5Themes.length > 0) {
         p5DataToRender = appSettings.p5Themes.map((t: any, i: number) => ({
            no: i + 1,
            theme: t.theme,
            description: t.description
        }));
    }

    const waliKey = `${academicYear}-${semester}-${displayClass}`;
    const waliData = appSettings?.classConfig?.[waliKey];
    const waliName = waliData?.teacher || '..................................';
    const waliNip = waliData?.nip || '..................................';

    // F4 Size styling (215mm width, 328mm height approx - slightly reduced from 330)
    return (
        <div className={`bg-white ${isBatch ? '' : 'shadow-xl'} h-[328mm] w-[215mm] mx-auto p-[10mm] text-black font-sans relative print:shadow-none print:w-full print:m-0 print:p-0 box-border overflow-hidden page-break-after-always`}>
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
                                <td className="border border-black p-1 text-center font-bold">{sub.score || '-'}</td>
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
                    <tbody>
                        {p5DataToRender.length > 0 ? (
                            p5DataToRender.map((p: any, idx: number) => (
                                <tr key={idx} className={idx % 2 !== 0 ? 'bg-gray-100' : ''}>
                                    <td className="border border-black p-1 text-center">{idx + 1}</td>
                                    <td className="border border-black p-1">{p.theme}</td>
                                    <td className="border border-black p-1 text-[10px]">{p.description}</td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={3} className="border border-black p-2 text-center italic text-gray-500">Tema P5 belum dikonfigurasi untuk Semester ini.</td></tr>
                        )}
                    </tbody>
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
                <h3 className="font-bold text-sm mb-1">D. KETIDAKHADIRAN</h3>
                <table className="w-1/2 border-collapse border border-black text-xs">
                    <tbody>
                        <tr><td className="border border-black p-1">Sakit</td><td className="border border-black p-1 text-center w-12">{record.attendance ? record.attendance.sick || 0 : 0}</td><td className="border border-black p-1">Hari</td></tr>
                        <tr><td className="border border-black p-1">Ijin</td><td className="border border-black p-1 text-center">{record.attendance ? record.attendance.permitted || 0 : 0}</td><td className="border border-black p-1">Hari</td></tr>
                        <tr><td className="border border-black p-1">Tanpa Keterangan</td><td className="border border-black p-1 text-center">{record.attendance ? record.attendance.noReason || 0 : 0}</td><td className="border border-black p-1">Hari</td></tr>
                    </tbody>
                </table>
            </div>
            <div className="mb-4">
                <h3 className="font-bold text-sm mb-1">E. CATATAN WALI KELAS</h3>
                <div className="border border-black p-2 text-xs h-16">{record.teacherNote || '-'}</div>
            </div>
            <div className="mb-4">
                <h3 className="font-bold text-sm mb-1">F. KETERANGAN KENAIKAN KELAS</h3>
                <div className="border border-black p-2 text-xs">{record.promotionStatus || 'Naik ke kelas berikutnya / Lulus'}</div>
            </div>

            {/* Footer TTD - Updated with Format */}
            <div className="flex justify-between items-end mt-4 text-xs">
                <div className="text-center w-48">
                    <p className="mb-16">Mengetahui,<br/>Orang Tua/Wali</p>
                    <p className="border-t border-black w-32 mx-auto"></p>
                </div>
                <div className="text-center w-48">
                    <p className="mb-16">Mojokerto, {reportDate}<br/>Wali Kelas</p>
                    <p className="font-bold underline">{formatNameTitleCase(waliName)}</p>
                    <p>NIP. {waliNip}</p>
                </div>
                <div className="text-center w-48">
                    <p className="mb-16">Mengetahui,<br/>Kepala Sekolah</p>
                    <p className="font-bold underline">{formatNameTitleCase(headmaster)}</p>
                    <p>NIP. {headmasterNip}</p>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const GradesView: React.FC<GradesViewProps> = ({ students, userRole = 'ADMIN', loggedInStudent, onUpdate }) => {
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const [appSettings, setAppSettings] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CORRECTION STATE (STUDENT) ---
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [targetCorrection, setTargetCorrection] = useState<{
      key: string; 
      label: string; 
      currentValue: string;
      type: 'CLASS' | 'GRADE';
  } | null>(null);
  const [proposedValue, setProposedValue] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [viewMode, setViewMode] = useState<'RAPOR' | 'DETAIL'>('RAPOR'); // NEW: Switch between Rapor (PDF) and Detail (Table)

  useEffect(() => {
      const fetchSettings = async () => {
          try {
              const settings = await api.getAppSettings();
              if (settings) {
                  setAppSettings(settings);
                  if (settings.academicData?.activeSemester) {
                      setSelectedSemester(Number(settings.academicData.activeSemester));
                  }
              }
          } catch(e) {}
      };
      fetchSettings();
  }, []);

  const uniqueClasses = useMemo(() => {
      const classes = Array.from(new Set(students.map(s => s.className))).sort();
      return ['ALL', ...classes];
  }, [students]);

  const filteredStudents = useMemo(() => {
      if (userRole === 'STUDENT' && loggedInStudent) return [loggedInStudent];
      
      return students.filter(s => {
          // STRICT CLASS FILTER FIX
          const matchClass = selectedClass === 'ALL' || s.className.trim() === selectedClass.trim();
          return matchClass;
      }).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [students, selectedClass, userRole, loggedInStudent]);

  useEffect(() => {
      if (userRole === 'STUDENT' && loggedInStudent) {
          setSelectedStudent(loggedInStudent);
      }
  }, [userRole, loggedInStudent]);

  // --- EXCEL TEMPLATE DOWNLOAD ---
  const handleDownloadTemplate = () => {
      // @ts-ignore
      const xlsx = window.XLSX;
      if (!xlsx) { alert("Library Excel belum siap."); return; }

      // Get students for current filter (or all if ALL)
      const targetStudents = selectedClass === 'ALL' ? students : filteredStudents;

      // Define Headers
      const headers = [
          'No', 'Nama Siswa', 'NISN', 'Kelas',
          ...SUBJECT_MAP.flatMap(s => [`${s.key}_Nilai`]), // Minimalist template: Just scores
          'Sakit', 'Izin', 'Alpha'
      ];

      const data = targetStudents.map((s, idx) => {
          const record = s.academicRecords?.[selectedSemester];
          const row: any = {
              'No': idx + 1,
              'Nama Siswa': s.fullName,
              'NISN': s.nisn,
              'Kelas': s.className,
          };

          // Fill existing scores if any
          SUBJECT_MAP.forEach(sub => {
              const subjRecord = findSubjectRecord(record?.subjects || [], sub);
              row[`${sub.key}_Nilai`] = subjRecord ? subjRecord.score : '';
          });

          // Fill attendance
          row['Sakit'] = record?.attendance?.sick || 0;
          row['Izin'] = record?.attendance?.permitted || 0;
          row['Alpha'] = record?.attendance?.noReason || 0;

          return row;
      });

      const ws = xlsx.utils.json_to_sheet(data);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, `Nilai_Sem${selectedSemester}`);
      xlsx.writeFile(wb, `Template_Nilai_Semester_${selectedSemester}_${selectedClass}.xlsx`);
  };

  // --- EXCEL IMPORT (PARALLEL BATCH PROCESSING OPTIMIZATION) ---
  const handleImportGrades = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsImporting(true);
      setImportProgress(0);
      
      // @ts-ignore
      const xlsx = window.XLSX;
      const reader = new FileReader();
      
      reader.onload = async (evt) => {
          try {
              const bstr = evt.target?.result;
              const wb = xlsx.read(bstr, { type: 'binary' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              const data = xlsx.utils.sheet_to_json(ws);

              // 1. Create a quick lookup map for current students to avoid O(N^2) complexity
              // Use NISN as key (String)
              // FIX: Explicitly type the Map to avoid 'unknown' inference for values
              const currentStudentsMap = new Map<string, Student>(students.map(s => [String(s.nisn).trim(), s] as [string, Student]));
              
              // 2. Prepare Updates List
              const updatesList: Student[] = [];
              let failCount = 0;
              
              for (const row of data as any[]) {
                  const nisn = String(row['NISN']).trim();
                  if (!nisn) { failCount++; continue; }

                  const student = currentStudentsMap.get(nisn);
                  if (!student) { failCount++; continue; }

                  // Prepare Record Update (Deep Clone to avoid direct mutation before sync)
                  const updatedStudent = JSON.parse(JSON.stringify(student));
                  if (!updatedStudent.academicRecords) updatedStudent.academicRecords = {};
                  
                  // Initialize Semester Record if missing
                  let record = updatedStudent.academicRecords[selectedSemester];
                  if (!record) {
                      record = {
                          semester: selectedSemester,
                          classLevel: getGradeLevel(student.className),
                          className: student.className,
                          year: appSettings?.academicData?.activeYear || '2024/2025',
                          subjects: [],
                          attendance: { sick: 0, permitted: 0, noReason: 0 }
                      };
                      updatedStudent.academicRecords[selectedSemester] = record;
                  }

                  // Update Attendance
                  record.attendance = {
                      sick: Number(row['Sakit']) || 0,
                      permitted: Number(row['Izin']) || 0,
                      noReason: Number(row['Alpha']) || 0
                  };

                  // Update Scores
                  record.subjects = SUBJECT_MAP.map((sub, idx) => {
                      const key = `${sub.key}_Nilai`;
                      const score = Number(row[key]) || 0;
                      return {
                          no: idx + 1,
                          subject: sub.full,
                          score: score,
                          competency: getCompetencyDescription(score, sub.full)
                      };
                  });

                  updatesList.push(updatedStudent);
              }

              // 3. Process Updates in Chunks (Parallel Batch)
              // This is significantly faster than sequential updateStudent and safer than massive syncInitialData
              if (updatesList.length > 0) {
                  const BATCH_SIZE = 5; // Process 5 students in parallel
                  let processed = 0;
                  
                  // Helper function to process a batch
                  const processBatch = async (batch: Student[]) => {
                      const promises = batch.map(s => api.updateStudent(s));
                      await Promise.all(promises);
                  };

                  // Chunk loop
                  for (let i = 0; i < updatesList.length; i += BATCH_SIZE) {
                      const chunk = updatesList.slice(i, i + BATCH_SIZE);
                      await processBatch(chunk);
                      processed += chunk.length;
                      setImportProgress(Math.round((processed / updatesList.length) * 100));
                  }
                  
                  // Update UI immediately (Optimistic UI could be added here, but for now strict refresh)
                  if (onUpdate) onUpdate(); 
                  
                  alert(`Proses Selesai.\n\nBerhasil Diperbarui: ${updatesList.length} Data\nData tidak ditemukan/Gagal: ${failCount}`);
              } else {
                  alert("Tidak ada data valid yang ditemukan untuk diimpor.");
              }

          } catch (err) {
              console.error(err);
              alert("Gagal impor file Excel. Pastikan format file benar.");
          } finally {
              setIsImporting(false);
              setImportProgress(0);
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      };
      
      reader.readAsBinaryString(file);
  };

  // --- PDF GENERATION LOGIC ---
  const handleDownloadPDF = () => {
      if (!selectedStudent) return;
      setIsGenerating(true);

      setTimeout(() => {
          const element = document.getElementById('report-content-print');
          const filename = `Rapor_${selectedStudent.fullName.replace(/\s+/g, '_')}_S${selectedSemester}.pdf`;

          const opt = {
            margin: 0,
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
            jsPDF: { unit: 'mm', format: [215, 330], orientation: 'portrait' }, // F4 Size
            pagebreak: { mode: 'avoid-all' }
          };

          // @ts-ignore
          const html2pdf = window.html2pdf;
          if (html2pdf) {
              html2pdf().set(opt).from(element).save().then(() => {
                  setIsGenerating(false);
              }).catch((err: any) => {
                  console.error(err);
                  setIsGenerating(false);
                  alert("Library PDF belum siap.");
              });
          } else {
              setIsGenerating(false);
              alert("Library PDF belum siap.");
          }
      }, 1000);
  };

  const handleDownloadBatch = () => {
      if (filteredStudents.length === 0) {
          alert("Tidak ada siswa untuk didownload.");
          return;
      }
      if (selectedClass === 'ALL') {
          if (!window.confirm("Anda akan mendownload rapor semua kelas? Ini akan memakan waktu lama.")) return;
      }

      setIsBatchGenerating(true);

      setTimeout(() => {
          const element = document.getElementById('batch-report-container');
          const className = selectedClass === 'ALL' ? 'Semua_Kelas' : selectedClass.replace(/\s+/g, '_');
          const filename = `Rapor_Batch_${className}_S${selectedSemester}.pdf`;

          const opt = {
            margin: 0,
            filename: filename,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 1.5, useCORS: true, scrollY: 0 },
            pagebreak: { mode: ['css', 'legacy'] },
            jsPDF: { unit: 'mm', format: [215, 330], orientation: 'portrait' }
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
      }, 5000); // 5 Seconds wait time for huge DOM
  };

  // --- CORRECTION HANDLER ---
  const handleOpenCorrection = (key: string, label: string, currentValue: string, type: 'CLASS' | 'GRADE') => {
      if (userRole !== 'STUDENT') return;
      setTargetCorrection({ key, label, currentValue, type });
      setProposedValue(currentValue);
      setCorrectionReason('');
      setIsCorrectionModalOpen(true);
  };

  const submitCorrection = async () => {
      if (!selectedStudent || !targetCorrection) return;
      if (!proposedValue || !correctionReason.trim()) { alert("Mohon lengkapi data revisi."); return; }
      
      const finalKey = targetCorrection.type === 'CLASS' ? `class-${selectedSemester}` : targetCorrection.key;
      const newRequest: CorrectionRequest = {
          id: Math.random().toString(36).substr(2, 9),
          fieldKey: finalKey,
          fieldName: targetCorrection.label,
          originalValue: targetCorrection.currentValue,
          proposedValue: proposedValue,
          studentReason: correctionReason,
          status: 'PENDING',
          requestDate: new Date().toISOString(),
      };
      
      const updatedStudent = { ...selectedStudent };
      if (!updatedStudent.correctionRequests) updatedStudent.correctionRequests = [];
      updatedStudent.correctionRequests = updatedStudent.correctionRequests.filter(r => !(r.fieldKey === finalKey && r.status === 'PENDING'));
      updatedStudent.correctionRequests.push(newRequest);
      
      if (onUpdate) { await api.updateStudent(updatedStudent); onUpdate(); }
      
      setSelectedStudent(updatedStudent); // Update local state immediately
      setIsCorrectionModalOpen(false); 
      alert("✅ Pengajuan revisi berhasil dikirim.");
  };

  const getPendingRequest = (key: string) => {
      return selectedStudent?.correctionRequests?.find(r => r.fieldKey === key && r.status === 'PENDING');
  };

  // IF SINGLE STUDENT SELECTED (Or Student View)
  if (selectedStudent) {
      const currentRecord = selectedStudent.academicRecords?.[selectedSemester];
      
      // Calculate Display Class based on Semester
      let displayClass = currentRecord?.className || selectedStudent.className;
      const classCorrectionKey = `class-${selectedSemester}`;
      const classPending = getPendingRequest(classCorrectionKey);

      return (
          <div className="flex flex-col h-full animate-fade-in space-y-4">
              
              {/* CORRECTION MODAL */}
              {isCorrectionModalOpen && targetCorrection && (
                  <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform scale-100 transition-all">
                          <div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="text-lg font-bold text-gray-800">Ajukan Revisi Data</h3><button onClick={() => setIsCorrectionModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button></div>
                          <div className="mb-4 bg-blue-50 p-3 rounded border border-blue-100"><p className="text-xs text-gray-500 uppercase">{targetCorrection.label} (Saat Ini)</p><p className="text-sm font-bold text-gray-700">{targetCorrection.currentValue || '-'}</p></div>
                          <div className="space-y-4">
                              <div>
                                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Data Baru / Usulan</label>
                                  {targetCorrection.type === 'CLASS' ? (
                                      <select className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={proposedValue} onChange={(e) => setProposedValue(e.target.value)}>{CLASS_LIST.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                  ) : (
                                      <input type="number" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={proposedValue} onChange={(e) => setProposedValue(e.target.value)} placeholder="Masukkan nilai yang benar" />
                                  )}
                              </div>
                              <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Alasan Revisi</label><textarea className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" rows={2} placeholder="Jelaskan alasan perubahan..." value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} /></div>
                          </div>
                          <div className="flex gap-2 mt-6"><button onClick={() => setIsCorrectionModalOpen(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 font-bold rounded-lg text-sm hover:bg-gray-200">Batal</button><button onClick={submitCorrection} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 flex items-center justify-center gap-2"><Send className="w-3 h-3" /> Kirim</button></div>
                      </div>
                  </div>
              )}

              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                      {userRole !== 'STUDENT' && (
                          <button onClick={() => setSelectedStudent(null)} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600">
                              <ArrowLeft className="w-4 h-4" /> Kembali
                          </button>
                      )}
                      <h2 className="text-lg font-bold text-gray-800">Rapor Siswa - Semester {selectedSemester}</h2>
                  </div>
                  
                  <div className="flex gap-2 items-center">
                      <div className="flex bg-gray-100 p-1 rounded-lg">
                          {[1, 2, 3, 4, 5, 6].map(sem => (
                              <button 
                                key={sem} 
                                onClick={() => setSelectedSemester(sem)}
                                className={`w-8 h-8 rounded-md text-sm font-bold transition-all ${selectedSemester === sem ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                              >
                                  {sem}
                              </button>
                          ))}
                      </div>
                      
                      {userRole === 'STUDENT' && (
                          <div className="flex bg-gray-100 p-1 rounded-lg ml-4">
                              <button onClick={() => setViewMode('RAPOR')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${viewMode === 'RAPOR' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}><Printer className="w-3 h-3"/> Cetak PDF</button>
                              <button onClick={() => setViewMode('DETAIL')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${viewMode === 'DETAIL' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}><Pencil className="w-3 h-3"/> Koreksi Nilai</button>
                          </div>
                      )}

                      {userRole !== 'STUDENT' && (
                          <button 
                              onClick={handleDownloadPDF}
                              disabled={isGenerating}
                              className="ml-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-lg shadow-blue-500/30 disabled:opacity-50"
                          >
                              {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                              Download PDF (F4)
                          </button>
                      )}
                  </div>
              </div>

              {/* VIEW MODE: PDF PREVIEW */}
              {viewMode === 'RAPOR' && (
                  <div className="bg-white p-4 md:p-8 rounded-xl border border-gray-200 shadow-sm flex-1 overflow-auto flex justify-center bg-gray-50/50 pb-32">
                      <div id="report-content-print">
                          <ReportTemplate 
                              student={selectedStudent} 
                              semester={selectedSemester} 
                              appSettings={appSettings} 
                              userRole={userRole}
                          />
                      </div>
                  </div>
              )}

              {/* VIEW MODE: INTERACTIVE TABLE FOR CORRECTION */}
              {viewMode === 'DETAIL' && (
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex-1 overflow-auto pb-32">
                      <div className="mb-6 border-b-2 border-gray-100 pb-4">
                          <div className="flex justify-between items-center text-sm font-bold text-gray-900 mb-2">
                              <span>NAMA: {selectedStudent.fullName.toUpperCase()}</span>
                              <span 
                                  className={`flex items-center gap-2 px-2 py-1 rounded transition-colors ${classPending ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-gray-100 hover:bg-blue-50 cursor-pointer text-gray-700'}`}
                                  onClick={() => !classPending && handleOpenCorrection('className', 'KELAS', displayClass, 'CLASS')}
                                  title="Klik untuk mengajukan koreksi kelas"
                              >
                                  KELAS: {classPending ? classPending.proposedValue : displayClass}
                                  {classPending ? <span className="text-[9px] bg-yellow-300 border border-yellow-400 px-1 rounded font-bold text-yellow-900">Menunggu Verifikasi</span> : <Pencil className="w-3 h-3 text-blue-500" />}
                              </span>
                          </div>
                      </div>

                      {currentRecord ? (
                          <table className="w-full text-sm border-collapse">
                              <thead>
                                  <tr className="bg-gray-50 border-y-2 border-gray-200 text-xs font-bold text-gray-700 uppercase">
                                      <th className="py-3 text-left pl-4">Mata Pelajaran</th>
                                      <th className="py-3 text-center w-32">Nilai Akhir</th>
                                      <th className="py-3 text-left pl-4">Capaian Kompetensi</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {SUBJECT_MAP.map((mapItem, idx) => {
                                      // Logic to find subject score safely using Robust Finder
                                      const existingSub = findSubjectRecord(currentRecord.subjects, mapItem);
                                      const score = existingSub ? existingSub.score : 0;
                                      const competency = existingSub?.competency || getCompetencyDescription(score, mapItem.full);
                                      
                                      const gradeKey = `grade-${selectedSemester}-${mapItem.full}`;
                                      const gradePending = getPendingRequest(gradeKey);

                                      return (
                                          <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                                              <td className="py-3 pl-4 font-medium text-gray-800">{mapItem.full}</td>
                                              <td className="py-3 text-center">
                                                  <div 
                                                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all cursor-pointer shadow-sm ${gradePending ? 'bg-yellow-50 border-yellow-300 text-yellow-800' : 'bg-white border-gray-200 hover:border-blue-400 hover:text-blue-700 text-gray-900'}`}
                                                      onClick={() => !gradePending && handleOpenCorrection(gradeKey, `Nilai ${mapItem.key} (Sem ${selectedSemester})`, String(score), 'GRADE')}
                                                      title="Klik untuk mengajukan revisi nilai"
                                                  >
                                                      <span className="font-bold">{gradePending ? gradePending.proposedValue : score}</span>
                                                      {gradePending ? <Loader2 className="w-3 h-3 animate-spin"/> : <Pencil className="w-3 h-3 opacity-30" />}
                                                  </div>
                                                  {gradePending && <div className="text-[9px] text-yellow-600 font-bold mt-1">Sedang Diverifikasi</div>}
                                              </td>
                                              <td className="py-3 pl-4 text-xs text-gray-500 italic">{competency}</td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                      ) : <div className="text-center py-10 text-gray-400 italic">Data nilai belum diinput oleh Admin.</div>}
                  </div>
              )}
          </div>
      );
  }

  // LIST VIEW (ADMIN/GURU)
  return (
    <div className="flex flex-col h-full animate-fade-in space-y-4 relative">
        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleImportGrades} />

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 w-full xl:w-auto">
                <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-2 rounded-lg font-bold text-sm border border-purple-100">
                    <Activity className="w-4 h-4" /> Data Nilai & Rapor
                </div>
                {userRole === 'ADMIN' && (
                    <>
                        <select className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                            {CLASS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium" value={selectedSemester} onChange={(e) => setSelectedSemester(Number(e.target.value))}>
                            {[1, 2, 3, 4, 5, 6].map(s => <option key={s} value={s}>Semester {s}</option>)}
                        </select>
                    </>
                )}
            </div>
            
            <div className="flex gap-2 w-full xl:w-auto">
                {userRole !== 'STUDENT' && (
                    <>
                        <button 
                            onClick={handleDownloadTemplate} 
                            className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 flex items-center gap-2 whitespace-nowrap"
                        >
                            <FileDown className="w-4 h-4" /> Template Excel
                        </button>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImporting}
                            className="bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-700 flex items-center gap-2 whitespace-nowrap shadow-sm disabled:opacity-50"
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {importProgress > 0 ? `${importProgress}%` : 'Memproses...'}
                                </>
                            ) : (
                                <>
                                    <UploadCloud className="w-4 h-4" /> Import Nilai
                                </>
                            )}
                        </button>
                        <div className="w-px h-8 bg-gray-200 mx-1 hidden xl:block"></div>
                        <button 
                            onClick={handleDownloadBatch} 
                            disabled={isBatchGenerating}
                            className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black flex items-center gap-2 shadow-lg disabled:opacity-50 whitespace-nowrap"
                        >
                            {isBatchGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Files className="w-4 h-4" />}
                            {isBatchGenerating ? 'Memproses...' : 'Download Rapor Kelas (F4)'}
                        </button>
                    </>
                )}
            </div>
        </div>

        {/* Table List */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1 w-full pb-32">
                <table className="border-collapse min-w-max text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-4 py-4 w-10 text-center sticky left-0 bg-gray-50 border-r z-20">No</th>
                            <th className="px-6 py-4 sticky left-10 bg-gray-50 border-r z-20 min-w-[200px]">Nama Siswa</th>
                            <th className="px-4 py-4 text-center">NISN</th>
                            <th className="px-4 py-4 text-center">Kelas</th>
                            
                            {/* DYNAMIC SUBJECT HEADERS */}
                            {SUBJECT_MAP.map(sub => (
                                <th key={sub.key} className="px-2 py-4 text-center min-w-[50px] border-l border-gray-200" title={sub.full}>
                                    {sub.key}
                                </th>
                            ))}
                            
                            <th className="px-6 py-4 text-center border-l border-gray-200">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredStudents.length > 0 ? filteredStudents.map((s, idx) => {
                            const record = s.academicRecords ? (s.academicRecords[selectedSemester] || s.academicRecords[String(selectedSemester)]) : null;
                            
                            return (
                                <tr key={s.id} className="hover:bg-purple-50/30 transition-colors group cursor-pointer" onClick={() => setSelectedStudent(s)}>
                                    <td className="px-4 py-3 text-center text-gray-500 border-r sticky left-0 bg-white z-10">{idx + 1}</td>
                                    <td className="px-6 py-3 font-bold text-gray-800 group-hover:text-purple-600 border-r sticky left-10 bg-white z-10 shadow-sm">
                                        {s.fullName}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-gray-500 text-center">{s.nisn}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">{s.className}</span>
                                    </td>

                                    {/* DYNAMIC SUBJECT SCORES */}
                                    {SUBJECT_MAP.map(sub => {
                                        const subjData = findSubjectRecord(record?.subjects || [], sub);
                                        const score = subjData ? subjData.score : 0;
                                        
                                        return (
                                            <td key={sub.key} className="px-2 py-3 text-center border-l border-gray-100">
                                                <span className={`text-xs ${getScoreColor(score)}`}>
                                                    {score > 0 ? score : '-'}
                                                </span>
                                            </td>
                                        );
                                    })}

                                    <td className="px-6 py-3 text-center border-l border-gray-200">
                                        <button className="text-xs font-bold text-blue-600 border border-blue-200 px-3 py-1 rounded hover:bg-blue-600 hover:text-white transition-colors">
                                            Lihat Rapor
                                        </button>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan={SUBJECT_MAP.length + 5} className="p-8 text-center text-gray-500">Tidak ada data siswa.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* BATCH DOWNLOAD OVERLAY */}
        {isBatchGenerating && (
            <div className="fixed inset-0 z-[9999] bg-gray-900/90 flex flex-col items-center justify-start overflow-auto pt-20 pb-20">
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center animate-bounce-in">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                    <h3 className="text-xl font-bold text-gray-900">Memproses Rapor...</h3>
                    <p className="text-gray-500 text-sm mt-2">Sedang menggabungkan {filteredStudents.length} rapor semester {selectedSemester}.</p>
                    <p className="text-xs text-gray-400 mt-1">Mohon tunggu, jangan tutup halaman ini.</p>
                </div>

                <div id="batch-report-container" className="bg-white w-[215mm]">
                    {filteredStudents.map((student, index) => (
                        <div key={student.id} className="relative">
                            <ReportTemplate 
                                student={student} 
                                semester={selectedSemester} 
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
        )}
    </div>
  );
};

export default GradesView;
