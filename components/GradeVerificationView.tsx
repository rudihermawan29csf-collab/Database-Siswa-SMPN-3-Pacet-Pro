
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, CorrectionRequest, DocumentFile } from '../types';
import { api } from '../services/api';
import { CheckCircle2, XCircle, Loader2, AlertCircle, FileText, ZoomIn, ZoomOut, RotateCw, LayoutList, Filter, Search, Save, Calendar, ChevronRight, File, School, RefreshCw, UserCheck, Lock, Check, X } from 'lucide-react';

interface GradeVerificationViewProps {
  students: Student[];
  targetStudentId?: string;
  onUpdate: () => void;
  currentUser: { name: string; role: string };
}

const getDriveUrl = (url: string, type: 'preview' | 'direct') => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
        let id = '';
        const parts = url.split(/\/d\//);
        if (parts.length > 1) {
            id = parts[1].split('/')[0];
        }
        if (!id) {
            const match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (match) id = match[1];
        }

        if (id) {
            if (type === 'preview') return `https://drive.google.com/file/d/${id}/preview`;
            if (type === 'direct') return `https://drive.google.com/uc?export=view&id=${id}`;
        }
    }
    return url;
};

// SAMA PERSIS DENGAN GRADESVIEW.TSX AGAR DATA SINKRON
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

const SEMESTERS = [1, 2, 3, 4, 5, 6];
const CLASS_OPTIONS = ['VII A', 'VII B', 'VII C', 'VIII A', 'VIII B', 'VIII C', 'IX A', 'IX B', 'IX C'];

const GradeVerificationView: React.FC<GradeVerificationViewProps> = ({ students, targetStudentId, onUpdate, currentUser }) => {
  const [selectedClass, setSelectedClass] = useState<string>('VII A');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  // Unified State Controls
  const [activeSemester, setActiveSemester] = useState<number>(1);
  const [activePage, setActivePage] = useState<number>(1);

  // Local state for editing grades & attendance
  const [gradeData, setGradeData] = useState<Record<string, number>>({});
  const [attendanceData, setAttendanceData] = useState<{ sick: number, permitted: number, noReason: number }>({ sick: 0, permitted: 0, noReason: 0 });
  
  const [semesterClass, setSemesterClass] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>(''); 

  const [adminNote, setAdminNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSavingData, setIsSavingData] = useState(false); 
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);
  
  // Local state to track processed IDs
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  // Ref to lock auto-selection when target is present
  const isTargetingRef = useRef(false);
  // Ref to track handled target IDs to prevent re-jumping on data updates
  const handledTargetRef = useRef<string | null>(null);

  // Global Settings for Year Calculation
  const [appSettings, setAppSettings] = useState<any>(null);
  
  // Viewer State
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [useFallbackViewer, setUseFallbackViewer] = useState(false);

  // Fetch App Settings on Mount
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

  // Load Page Config
  const totalPages = useMemo(() => {
      try {
          const saved = localStorage.getItem('sys_rapor_config');
          return saved ? parseInt(saved) : 3;
      } catch { return 3; }
  }, []);

  // Initialize selection
  useEffect(() => {
      if (targetStudentId && students.length > 0) {
          // FIX: Prevent re-running navigation logic if we already handled this targetId
          // This stops the page from jumping when data is updated (onUpdate triggers students change)
          if (handledTargetRef.current === targetStudentId) return;

          const student = students.find(s => s.id === targetStudentId);
          if (student) {
              isTargetingRef.current = true; // Lock auto-select
              setSelectedClass(student.className);
              setSelectedStudentId(student.id);
              handledTargetRef.current = targetStudentId; // Mark as handled
              
              const pendingDoc = student.documents.find(d => d.category === 'RAPOR' && d.status === 'PENDING' && !processedIds.has(d.id));
              if (pendingDoc && pendingDoc.subType?.semester) {
                  setActiveSemester(pendingDoc.subType.semester);
                  if (pendingDoc.subType.page) setActivePage(pendingDoc.subType.page);
              }

              // Unlock after a delay to allow UI to settle
              setTimeout(() => { isTargetingRef.current = false; }, 800);
          }
      }
  }, [targetStudentId, students]);

  const uniqueClasses = useMemo(() => {
      const classes = Array.from(new Set(students.map(s => s.className))).sort();
      return classes.length > 0 ? classes : ['VII A'];
  }, [students]);

  const filteredStudents = useMemo(() => {
      return students.filter(s => s.className === selectedClass).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [students, selectedClass]);

  // --- AUTO SELECT FIRST STUDENT (Only if NOT targeting) ---
  useEffect(() => {
      if (isTargetingRef.current) return; // Skip if processing target

      if (!selectedStudentId && filteredStudents.length > 0) {
          setSelectedStudentId(filteredStudents[0].id);
      } else if (filteredStudents.length > 0 && !filteredStudents.find(s => s.id === selectedStudentId)) {
          setSelectedStudentId(filteredStudents[0].id);
      }
  }, [filteredStudents, selectedStudentId]);

  const currentStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);

  const currentDoc = useMemo(() => {
      if (!currentStudent) return undefined;
      return currentStudent.documents.find(d => 
          d.category === 'RAPOR' && 
          d.subType?.semester === activeSemester && 
          d.subType?.page === activePage
      );
  }, [currentStudent, activeSemester, activePage]);

  // Reset viewer when doc changes
  useEffect(() => {
      setZoomLevel(1);
      setRotation(0);
      setUseFallbackViewer(false);
      setAdminNote(currentDoc?.adminNote || '');
  }, [currentDoc]);

  // --- HELPER: CALCULATE HISTORICAL YEAR ---
  const calculateHistoricalYear = (studentCurrentClass: string, targetSemester: number) => {
      const currentActiveYear = appSettings?.academicData?.activeYear || '2024/2025';
      const [startYear] = currentActiveYear.split('/').map(Number);
      if (!startYear) return currentActiveYear;
      const getLevel = (cls: string) => {
          if (!cls) return 7;
          const upper = cls.toUpperCase();
          if (upper.includes('IX')) return 9;
          if (upper.includes('VIII')) return 8;
          if (upper.includes('VII')) return 7;
          return 7;
      };
      const currentLevel = getLevel(studentCurrentClass);
      const targetLevel = targetSemester <= 2 ? 7 : targetSemester <= 4 ? 8 : 9;
      const offset = currentLevel - targetLevel;
      let histStart = startYear - offset;
      return `${histStart}/${histStart + 1}`;
  };

  const guessHistoricalClassName = (studentCurrentClass: string, targetSemester: number) => {
      const targetLevelRoman = targetSemester <= 2 ? 'VII' : targetSemester <= 4 ? 'VIII' : 'IX';
      const parts = studentCurrentClass.split(' ');
      const suffix = parts.length > 1 ? parts.slice(1).join(' ') : '';
      return suffix ? `${targetLevelRoman} ${suffix}` : `${targetLevelRoman} A`;
  };

  useEffect(() => {
      if (currentStudent) {
          const record = currentStudent.academicRecords ? (currentStudent.academicRecords[activeSemester] || currentStudent.academicRecords[String(activeSemester)]) : null;
          const initialGrades: Record<string, number> = {};
          SUBJECT_MAP.forEach(sub => {
              const subjData = record?.subjects.find(s => 
                  s.subject === sub.full || 
                  s.subject === sub.label || 
                  s.subject.includes(sub.key)
              );
              initialGrades[sub.key] = subjData ? subjData.score : 0;
          });
          setGradeData(initialGrades);
          setAttendanceData(record?.attendance || { sick: 0, permitted: 0, noReason: 0 });
          let cls = record?.className || guessHistoricalClassName(currentStudent.className, activeSemester);
          setSemesterClass(cls);
          setAcademicYear(calculateHistoricalYear(currentStudent.className, activeSemester));
      }
  }, [currentStudent, activeSemester, appSettings]);

  const prepareUpdatedStudent = () => {
      const updatedStudent = JSON.parse(JSON.stringify(currentStudent));
      if (!updatedStudent.academicRecords) updatedStudent.academicRecords = {};
      let record = updatedStudent.academicRecords[activeSemester];
      if (!record) {
          record = {
              semester: activeSemester,
              classLevel: semesterClass.split(' ')[0] || 'VII',
              year: academicYear,
              subjects: [],
              attendance: { sick: 0, permitted: 0, noReason: 0 }
          };
          updatedStudent.academicRecords[activeSemester] = record;
      }
      record.className = semesterClass; 
      record.year = academicYear;
      record.attendance = attendanceData; 
      record.subjects = SUBJECT_MAP.map((sub: any, idx: number) => ({
          no: idx + 1,
          subject: sub.full,
          score: Number(gradeData[sub.key]) || 0,
          competency: '-'
      }));
      return updatedStudent;
  };

  const handleCorrectionResponse = async (request: CorrectionRequest, status: 'APPROVED' | 'REJECTED') => {
      if (!currentStudent) return;
      setProcessingReqId(request.id);
      // OPTIMISTIC: Instant hide
      setProcessedIds(prev => new Set(prev).add(request.id));

      try {
          const updatedStudent = JSON.parse(JSON.stringify(currentStudent));
          if (updatedStudent.correctionRequests) {
              updatedStudent.correctionRequests = updatedStudent.correctionRequests.map((r: CorrectionRequest) => {
                  if (r.id === request.id) {
                      return {
                          ...r, status, verifierName: currentUser.name, processedDate: new Date().toISOString(),
                          adminNote: status === 'APPROVED' ? 'Disetujui Admin.' : 'Ditolak Admin.'
                      };
                  }
                  return r;
              });
          }

          if (status === 'APPROVED') {
              // --- HANDLE GRADE CORRECTION ---
              if (request.fieldKey.startsWith(`grade-${activeSemester}-`)) {
                  const keyParts = request.fieldKey.split(`grade-${activeSemester}-`);
                  if (keyParts.length > 1) {
                      const subjectFull = keyParts[1];
                      const mapItem = SUBJECT_MAP.find(m => m.full === subjectFull);
                      if (mapItem) {
                          const newScore = Number(request.proposedValue);
                          setGradeData(prev => ({ ...prev, [mapItem.key]: newScore }));
                          if (!updatedStudent.academicRecords) updatedStudent.academicRecords = {};
                          let record = updatedStudent.academicRecords[activeSemester];
                          if (!record) {
                              record = {
                                  semester: activeSemester, classLevel: semesterClass.split(' ')[0] || 'VII',
                                  year: academicYear, subjects: [], attendance: { sick: 0, permitted: 0, noReason: 0 }
                              };
                              updatedStudent.academicRecords[activeSemester] = record;
                          }
                          const subjIndex = record.subjects.findIndex((s: any) => s.subject === subjectFull);
                          if (subjIndex >= 0) record.subjects[subjIndex].score = newScore;
                          else record.subjects.push({ no: record.subjects.length + 1, subject: subjectFull, score: newScore, competency: '-' });
                      }
                  }
              }
              // --- HANDLE CLASS CORRECTION ---
              else if (request.fieldKey === `class-${activeSemester}`) {
                  const newClass = request.proposedValue;
                  setSemesterClass(newClass);
                  if (!updatedStudent.academicRecords) updatedStudent.academicRecords = {};
                  let record = updatedStudent.academicRecords[activeSemester];
                  if (!record) {
                      record = { semester: activeSemester, classLevel: newClass.split(' ')[0], year: academicYear, subjects: [], attendance: { sick: 0, permitted: 0, noReason: 0 } };
                      updatedStudent.academicRecords[activeSemester] = record;
                  }
                  record.className = newClass;
              }
          }
          await api.updateStudent(updatedStudent);
          onUpdate(); 
          alert(status === 'APPROVED' ? "Revisi disetujui & nilai diperbarui." : "Revisi ditolak.");
      } catch (e) {
          // Rollback
          setProcessedIds(prev => {
              const next = new Set(prev);
              next.delete(request.id);
              return next;
          });
          alert("Gagal memproses revisi.");
      } finally {
          setProcessingReqId(null);
      }
  };

  const handleSaveDataOnly = async () => {
      if (!currentStudent) return;
      setIsSavingData(true);
      try {
          const updatedStudent = prepareUpdatedStudent();
          await api.updateStudent(updatedStudent);
          onUpdate(); 
          alert("Data akademik berhasil disimpan!");
      } catch (e) {
          alert("Gagal menyimpan data.");
      } finally {
          setIsSavingData(false);
      }
  };

  const handleProcess = async (status: 'APPROVED' | 'REVISION') => {
      if (!currentStudent) return;
      if (status === 'REVISION' && !adminNote.trim()) { alert("Mohon isi catatan jika dokumen perlu revisi."); return; }
      
      setIsProcessing(true);
      if (currentDoc) setProcessedIds(prev => new Set(prev).add(currentDoc.id));

      try {
          const updatedStudent = prepareUpdatedStudent();
          if (currentDoc) {
              updatedStudent.documents = updatedStudent.documents.map((d: any) => {
                  if (d.id === currentDoc.id) {
                      return { ...d, status, adminNote, verifierName: currentUser.name, verificationDate: new Date().toISOString() };
                  }
                  return d;
              });
          }
          await api.updateStudent(updatedStudent);
          onUpdate();
          // FIX: Disable auto-page advance for document approval to keep user context on data
          // if (status === 'APPROVED' && activePage < totalPages) setActivePage(activePage + 1);
      } catch (e) {
          if (currentDoc) {
            setProcessedIds(prev => {
                const next = new Set(prev);
                next.delete(currentDoc.id);
                return next;
            });
          }
          alert("Gagal memproses verifikasi.");
      } finally {
          setIsProcessing(false);
      }
  };

  // Check for pending class request
  const pendingClassReq = currentStudent?.correctionRequests?.find(r => r.fieldKey === `class-${activeSemester}` && r.status === 'PENDING' && !processedIds.has(r.id));

  return (
    <div className="flex flex-col h-full animate-fade-in">
        <div className="bg-white p-3 border-b border-gray-200 flex flex-col gap-3 shadow-sm z-20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h2 className="font-bold text-gray-800">Verifikasi Nilai Rapor</h2>
                </div>
                <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                    {SEMESTERS.map(sem => (
                        <button
                            key={sem}
                            onClick={() => { setActiveSemester(sem); setActivePage(1); }}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeSemester === sem ? 'bg-white text-blue-700 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
                        >
                            Semester {sem}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer min-w-[100px]" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                            {uniqueClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 md:w-64 flex-1">
                        <Search className="w-4 h-4 text-gray-500" />
                        <select className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer w-full" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                            {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 bg-gray-900 relative flex flex-col overflow-hidden">
                <div className="bg-gray-800 border-b border-gray-700 p-2 flex justify-center gap-2 z-10">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                        const pageDoc = currentStudent?.documents.find(d => d.category === 'RAPOR' && d.subType?.semester === activeSemester && d.subType?.page === page);
                        let statusColor = 'bg-gray-600 border-gray-500 text-gray-400';
                        if (pageDoc) {
                            if (pageDoc.status === 'APPROVED' || processedIds.has(pageDoc.id)) statusColor = 'bg-green-900/50 border-green-600 text-green-400';
                            else if (pageDoc.status === 'REVISION') statusColor = 'bg-red-900/50 border-red-600 text-red-400';
                            else statusColor = 'bg-yellow-900/50 border-yellow-600 text-yellow-400 animate-pulse';
                        }
                        return (
                            <button key={page} onClick={() => setActivePage(page)} className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${activePage === page ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900 transform scale-105' : 'hover:bg-gray-700'} ${statusColor}`}>
                                <File className="w-3 h-3" /> Halaman {page}
                                {pageDoc?.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3 ml-1" />}
                            </button>
                        );
                    })}
                </div>

                <div className="flex-1 relative overflow-hidden flex flex-col">
                    {currentDoc ? (
                        <>
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-black/50 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-lg">
                                <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.2))} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"><ZoomOut className="w-4 h-4" /></button>
                                <span className="text-white text-xs font-mono font-bold flex items-center px-2">{Math.round(zoomLevel * 100)}%</span>
                                <button onClick={() => setZoomLevel(z => Math.min(3, z + 0.2))} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"><ZoomIn className="w-4 h-4" /></button>
                                <div className="w-px h-4 bg-white/20 my-auto mx-1"></div>
                                <button onClick={() => setRotation(r => r + 90)} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"><RotateCw className="w-4 h-4" /></button>
                                <button onClick={() => setUseFallbackViewer(v => !v)} className="px-3 py-1 text-[10px] font-bold text-white hover:bg-white/20 rounded-full border border-white/20 ml-1 transition-colors">{useFallbackViewer ? 'Mode Default' : 'Mode Alt'}</button>
                            </div>
                            <div className="flex-1 overflow-auto p-4 md:p-8">
                                <div style={{ transform: `scale(${useFallbackViewer ? 1 : zoomLevel}) rotate(${rotation}deg)`, transformOrigin: 'top center' }} className="w-fit h-fit mx-auto shadow-2xl transition-transform duration-200 bg-white rounded">
                                    {(useFallbackViewer || (currentDoc.url.includes('drive.google.com') && !currentDoc.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/))) ? (
                                        <iframe src={getDriveUrl(currentDoc.url, 'preview')} className="w-[800px] h-[1100px] bg-white rounded" title="Viewer" />
                                    ) : (
                                        <img src={getDriveUrl(currentDoc.url, 'direct')} className="max-w-none h-auto object-contain rounded" style={{ minWidth: '600px', maxWidth: '100%' }} alt="Doc" onError={() => setUseFallbackViewer(true)} />
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                            <LayoutList className="w-16 h-16 mb-4 opacity-20" />
                            <p>Tidak ada dokumen untuk Halaman {activePage} Semester {activeSemester}.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="w-[480px] bg-white border-l border-gray-200 flex flex-col shadow-xl z-10">
                <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 mb-1"><LayoutList className="w-4 h-4 text-blue-700" /><span className="text-sm font-bold text-blue-800">Verifikasi Nilai</span></div>
                        <div className="text-xs text-blue-600 font-medium">Semester {activeSemester}</div>
                    </div>
                    <button onClick={handleSaveDataOnly} disabled={isSavingData} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm">
                        {isSavingData ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3" />} Simpan Data
                    </button>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {currentStudent ? (
                            <>
                                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="relative">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tahun Pelajaran</label>
                                            <div className="relative"><input readOnly className="w-full p-2 border border-gray-200 rounded text-xs font-bold text-gray-600 bg-gray-100 cursor-not-allowed" value={academicYear}/><Lock className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2" /></div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Kelas</label>
                                            <div className="relative">
                                                <select className={`w-full p-2 border rounded text-xs font-bold text-gray-800 bg-white ${pendingClassReq ? 'border-yellow-400 bg-yellow-50' : 'border-blue-200'}`} value={semesterClass} onChange={(e) => setSemesterClass(e.target.value)}>{CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                                {pendingClassReq && (
                                                    <div className="mt-1 bg-white border border-yellow-300 p-2 rounded-lg shadow-sm text-[10px] animate-fade-in relative z-10">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex-1 mr-2">
                                                                <div className="flex items-center gap-1 mb-1"><AlertCircle className="w-3 h-3 text-yellow-600" /><span className="font-bold text-yellow-800 uppercase text-[9px]">Usulan:</span></div>
                                                                <p className="text-blue-700 font-bold text-sm bg-blue-50 px-2 py-1 rounded border border-blue-100 mb-1 inline-block">{pendingClassReq.proposedValue}</p>
                                                                <p className="italic text-gray-600 leading-tight">"{pendingClassReq.studentReason}"</p>
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <button onClick={() => handleCorrectionResponse(pendingClassReq, 'APPROVED')} disabled={!!processingReqId} className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded font-bold transition-colors flex items-center justify-center gap-1 shadow-sm text-[9px]">{processingReqId === pendingClassReq.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <Check className="w-3 h-3" />} Terima</button>
                                                                <button onClick={() => handleCorrectionResponse(pendingClassReq, 'REJECTED')} disabled={!!processingReqId} className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded font-bold transition-colors flex items-center justify-center gap-1 shadow-sm text-[9px]">{processingReqId === pendingClassReq.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <X className="w-3 h-3" />} Tolak</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <div className="grid grid-cols-3 gap-2">
                                        <div><label className="text-[9px] font-bold text-gray-400 uppercase block mb-1 text-center">Sakit</label><input type="number" className="w-full p-1.5 border rounded text-center text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={attendanceData.sick} onChange={(e) => setAttendanceData({...attendanceData, sick: Number(e.target.value)})} min={0}/></div>
                                        <div><label className="text-[9px] font-bold text-gray-400 uppercase block mb-1 text-center">Izin</label><input type="number" className="w-full p-1.5 border rounded text-center text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={attendanceData.permitted} onChange={(e) => setAttendanceData({...attendanceData, permitted: Number(e.target.value)})} min={0}/></div>
                                        <div><label className="text-[9px] font-bold text-gray-400 uppercase block mb-1 text-center">Alpha</label><input type="number" className="w-full p-1.5 border rounded text-center text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={attendanceData.noReason} onChange={(e) => setAttendanceData({...attendanceData, noReason: Number(e.target.value)})} min={0}/></div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {SUBJECT_MAP.map((sub, idx) => {
                                        const reqKey = `grade-${activeSemester}-${sub.full}`;
                                        const pendingReq = currentStudent.correctionRequests?.find(r => r.fieldKey === reqKey && r.status === 'PENDING' && !processedIds.has(r.id));
                                        return (
                                            <div key={idx} className="border border-gray-100 rounded-lg p-2 hover:bg-gray-50 transition-colors">
                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="text-xs font-bold text-gray-700 w-2/3 truncate">{idx+1}. {sub.label}</label>
                                                    <input type="number" className={`w-20 p-1.5 border rounded text-right text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none ${pendingReq ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}`} value={gradeData[sub.key] || ''} onChange={(e) => setGradeData({...gradeData, [sub.key]: Number(e.target.value)})} placeholder="0"/>
                                                </div>
                                                {pendingReq && (
                                                    <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-2 flex flex-col gap-2">
                                                        <div className="flex items-start gap-2"><AlertCircle className="w-3 h-3 text-yellow-600 mt-0.5" /><div><p className="text-[10px] text-yellow-800 font-bold">Usulan: <span className="text-lg ml-1 text-blue-700">{pendingReq.proposedValue}</span></p><p className="text-[9px] text-gray-600 italic">"{pendingReq.studentReason}"</p></div></div>
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => handleCorrectionResponse(pendingReq, 'REJECTED')} disabled={processingReqId === pendingReq.id} className="px-2 py-1 bg-white border border-red-200 text-red-600 text-[10px] font-bold rounded hover:bg-red-50 flex items-center gap-1">{processingReqId === pendingReq.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <X className="w-3 h-3" />} Tolak</button>
                                                            <button onClick={() => handleCorrectionResponse(pendingReq, 'APPROVED')} disabled={processingReqId === pendingReq.id} className="px-2 py-1 bg-green-600 text-white text-[10px] font-bold rounded hover:bg-green-700 flex items-center gap-1 shadow-sm">{processingReqId === pendingReq.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <Check className="w-3 h-3" />} Terima</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : <div className="text-center text-gray-400 text-xs py-10">Pilih siswa dari daftar di atas.</div>}
                    </div>

                    {currentStudent && (
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Catatan Dokumen (Hal {activePage})</label>
                            <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm mb-3 outline-none" placeholder="Catatan untuk siswa..." value={adminNote} onChange={(e) => setAdminNote(e.target.value)}/>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handleProcess('REVISION')} disabled={isProcessing || !currentDoc} className="py-2.5 bg-white border border-red-200 text-red-600 font-bold rounded-lg text-sm flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Tolak Dokumen</button>
                                <button onClick={() => handleProcess('APPROVED')} disabled={isProcessing} className="py-2.5 bg-green-600 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 shadow-sm">{isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {currentDoc ? 'Valid & Simpan' : 'Simpan Nilai'}</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default GradeVerificationView;
