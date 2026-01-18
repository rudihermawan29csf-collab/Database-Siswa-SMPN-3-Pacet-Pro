
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
    
    // Safety check for academicRecords - Handle String/Number keys
    let record = student.academicRecords ? (student.academicRecords[semester] || student.academicRecords[String(semester)]) : null;
    
    // If no record exists, creating a dummy one to ensure layout renders (for batch empty check)
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
        // Ensure all subjects are mapped even if not in DB
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
                <h3 className="font-bold text-sm mb-1">D. KETIDAKHADIRAN</h3>
                <table className="w-1/2 border-collapse border border-black text-xs">
                    <tbody>
                        <tr><td className="border border-black p-1">Sakit</td><td className="border border-black p-1 text-center w-12">{record.attendance.sick || 0}</td><td className="border border-black p-1">Hari</td></tr>
                        <tr><td className="border border-black p-1">Ijin</td><td className="border border-black p-1 text-center">{record.attendance.permitted || 0}</td><td className="border border-black p-1">Hari</td></tr>
                        <tr><td className="border border-black p-1">Tanpa Keterangan</td><td className="border border-black p-1 text-center">{record.attendance.noReason || 0}</td><td className="border border-black p-1">Hari</td></tr>
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

            {/* Footer TTD */}
            <div className="flex justify-between items-end mt-4 text-xs">
                <div className="text-center w-48">
                    <p className="mb-16">Mengetahui,<br/>Orang Tua/Wali</p>
                    <p className="border-t border-black w-32 mx-auto"></p>
                </div>
                <div className="text-center w-48">
                    <p className="mb-16">Mojokerto, {reportDate}<br/>Wali Kelas</p>
                    <p className="font-bold underline uppercase">{waliName}</p>
                    <p>NIP. {waliNip}</p>
                </div>
                <div className="text-center w-48">
                    <p className="mb-16">Mengetahui,<br/>Kepala Sekolah</p>
                    <p className="font-bold underline uppercase">{headmaster}</p>
                    <p>NIP. {headmasterNip}</p>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const GradesView: React.FC<GradesViewProps> = ({ students, userRole = 'ADMIN', loggedInStudent, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [targetCorrection, setTargetCorrection] = useState<any>(null);
  const [appSettings, setAppSettings] = useState<any>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

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
          const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.nisn.includes(searchTerm);
          const matchClass = selectedClass === 'ALL' || s.className === selectedClass;
          return matchSearch && matchClass;
      }).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [students, searchTerm, selectedClass, userRole, loggedInStudent]);

  useEffect(() => {
      if (userRole === 'STUDENT' && loggedInStudent) {
          setSelectedStudent(loggedInStudent);
      }
  }, [userRole, loggedInStudent]);

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
  const handleCorrectionRequest = (type: 'CLASS' | 'GRADE', data?: any) => {
      if (userRole !== 'STUDENT') return;
      setTargetCorrection({ type, data });
      setIsCorrectionModalOpen(true);
  };

  // IF SINGLE STUDENT SELECTED
  if (selectedStudent) {
      return (
          <div className="flex flex-col h-full animate-fade-in space-y-4">
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
                      <span className="text-xs font-bold text-gray-500 mr-2">Pilih Semester:</span>
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
                      
                      <button 
                          onClick={handleDownloadPDF}
                          disabled={isGenerating}
                          className="ml-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-lg shadow-blue-500/30 disabled:opacity-50"
                      >
                          {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                          Download PDF (F4)
                      </button>
                  </div>
              </div>

              {/* PREVIEW CONTAINER */}
              <div className="bg-white p-4 md:p-8 rounded-xl border border-gray-200 shadow-sm flex-1 overflow-auto flex justify-center bg-gray-50/50 pb-32">
                  <div id="report-content-print">
                      <ReportTemplate 
                          student={selectedStudent} 
                          semester={selectedSemester} 
                          appSettings={appSettings} 
                          userRole={userRole}
                          onCorrectionRequest={handleCorrectionRequest}
                      />
                  </div>
              </div>
          </div>
      );
  }

  // LIST VIEW (ADMIN/GURU)
  return (
    <div className="flex flex-col h-full animate-fade-in space-y-4 relative">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 w-full xl:w-auto">
                <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-2 rounded-lg font-bold text-sm border border-purple-100">
                    <Activity className="w-4 h-4" /> Data Nilai & Rapor
                </div>
                {userRole === 'ADMIN' && (
                    <select className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c === 'ALL' ? 'Semua Kelas' : `Kelas ${c}`}</option>)}
                    </select>
                )}
            </div>
            
            <div className="flex gap-2 w-full xl:w-auto">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="text" placeholder="Cari Siswa..." className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                
                {userRole !== 'STUDENT' && (
                    <button 
                        onClick={handleDownloadBatch} 
                        disabled={isBatchGenerating}
                        className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black flex items-center gap-2 shadow-lg disabled:opacity-50 whitespace-nowrap"
                    >
                        {isBatchGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Files className="w-4 h-4" />}
                        {isBatchGenerating ? 'Memproses...' : 'Download Rapor Kelas (F4)'}
                    </button>
                )}
            </div>
        </div>

        {/* Table List */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1 w-full pb-32">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                        <tr>
                            <th className="px-6 py-4 w-12 text-center">No</th>
                            <th className="px-6 py-4">Nama Siswa</th>
                            <th className="px-6 py-4">NISN</th>
                            <th className="px-6 py-4">Kelas</th>
                            <th className="px-6 py-4 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredStudents.length > 0 ? filteredStudents.map((s, idx) => (
                            <tr key={s.id} className="hover:bg-purple-50/30 transition-colors group cursor-pointer" onClick={() => setSelectedStudent(s)}>
                                <td className="px-6 py-3 text-center text-gray-500">{idx + 1}</td>
                                <td className="px-6 py-3 font-bold text-gray-800 group-hover:text-purple-600">{s.fullName}</td>
                                <td className="px-6 py-3 font-mono text-xs text-gray-500">{s.nisn}</td>
                                <td className="px-6 py-3"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">{s.className}</span></td>
                                <td className="px-6 py-3 text-center">
                                    <button className="text-xs font-bold text-blue-600 border border-blue-200 px-3 py-1 rounded hover:bg-blue-600 hover:text-white transition-colors">
                                        Lihat Rapor
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">Tidak ada data siswa.</td></tr>
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
