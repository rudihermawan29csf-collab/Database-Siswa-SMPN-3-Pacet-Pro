
import React, { useState, useEffect, useMemo } from 'react';
import { Student, DocumentFile } from '../types';
import { api } from '../services/api';
import { CheckCircle2, XCircle, Loader2, AlertCircle, FileText, ZoomIn, ZoomOut, RotateCw, LayoutList, Filter, Search, Save, Calendar, ChevronRight, File, School, RefreshCw, UserCheck } from 'lucide-react';

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
    { key: 'PJOK', label: 'PJOK', full: 'PJOK' },
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
      if (targetStudentId) {
          const student = students.find(s => s.id === targetStudentId);
          if (student) {
              setSelectedClass(student.className);
              setSelectedStudentId(student.id);
              
              const pendingDoc = student.documents.find(d => d.category === 'RAPOR' && d.status === 'PENDING');
              if (pendingDoc && pendingDoc.subType?.semester) {
                  setActiveSemester(pendingDoc.subType.semester);
                  if (pendingDoc.subType.page) setActivePage(pendingDoc.subType.page);
              }
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

  useEffect(() => {
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
      const [startYear, endYear] = currentActiveYear.split('/').map(Number);
      
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
      
      // Ensure full format "YYYY/YYYY+1"
      return `${histStart}/${histStart + 1}`;
  };

  // --- HELPER: GUESS HISTORICAL CLASS NAME ---
  const guessHistoricalClassName = (studentCurrentClass: string, targetSemester: number) => {
      const targetLevelRoman = targetSemester <= 2 ? 'VII' : targetSemester <= 4 ? 'VIII' : 'IX';
      const parts = studentCurrentClass.split(' ');
      const suffix = parts.length > 1 ? parts.slice(1).join(' ') : '';
      return suffix ? `${targetLevelRoman} ${suffix}` : `${targetLevelRoman} A`;
  };

  // --- INITIALIZE DATA WHEN STUDENT/SEMESTER CHANGES ---
  useEffect(() => {
      if (currentStudent) {
          // Akses data akademik, handle key string/number
          const record = currentStudent.academicRecords ? (currentStudent.academicRecords[activeSemester] || currentStudent.academicRecords[String(activeSemester)]) : null;
          const initialGrades: Record<string, number> = {};
          
          SUBJECT_MAP.forEach(sub => {
              // Robust find: Check FULL NAME (stored) or Key or Label
              const subjData = record?.subjects.find(s => 
                  s.subject === sub.full || 
                  s.subject === sub.label || 
                  s.subject.includes(sub.key)
              );
              initialGrades[sub.key] = subjData ? subjData.score : 0;
          });
          setGradeData(initialGrades);
          
          // Attendance
          setAttendanceData(record?.attendance || { sick: 0, permitted: 0, noReason: 0 });
          
          // Determine Class Name
          let cls = record?.className;
          if (!cls) {
              cls = guessHistoricalClassName(currentStudent.className, activeSemester);
          }
          setSemesterClass(cls);

          // Determine Academic Year
          if (record?.year) {
              if (!record.year.includes('/') && !isNaN(Number(record.year))) {
                  const y = Number(record.year);
                  setAcademicYear(`${y}/${y+1}`);
              } else {
                  setAcademicYear(record.year);
              }
          } else {
              const autoYear = calculateHistoricalYear(currentStudent.className, activeSemester);
              setAcademicYear(autoYear);
          }
      } else {
          setGradeData({});
          setAttendanceData({ sick: 0, permitted: 0, noReason: 0 });
          setSemesterClass('');
          setAcademicYear('2024/2025');
      }
  }, [currentStudent, activeSemester, appSettings]);

  // Function to Prepare Updated Record
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
      
      // Update Fields strictly - THESE ARE CRITICAL FOR REPORT SYNC
      record.className = semesterClass; 
      record.year = academicYear;
      record.attendance = attendanceData; 
      
      // Map scores using FULL NAME to ensure compatibility with GradesView
      record.subjects = SUBJECT_MAP.map((sub: any, idx: number) => ({
          no: idx + 1,
          subject: sub.full, // SAVE FULL NAME (e.g., 'Matematika')
          score: Number(gradeData[sub.key]) || 0,
          competency: '-' // Report will generate competency if needed
      }));

      return updatedStudent;
  };

  const handleSaveDataOnly = async () => {
      if (!currentStudent) return;
      setIsSavingData(true);
      try {
          const updatedStudent = prepareUpdatedStudent();
          await api.updateStudent(updatedStudent);
          onUpdate(); 
          alert("Data akademik (Nilai, Kelas, Tahun, Absensi) berhasil disimpan!");
      } catch (e) {
          console.error(e);
          alert("Gagal menyimpan data.");
      } finally {
          setIsSavingData(false);
      }
  };

  const handleProcess = async (status: 'APPROVED' | 'REVISION') => {
      if (!currentStudent) return;
      if (status === 'REVISION' && !adminNote.trim()) {
          alert("Mohon isi catatan jika dokumen perlu revisi.");
          return;
      }

      setIsProcessing(true);
      try {
          const updatedStudent = prepareUpdatedStudent();
          
          // 1. Update Document Status
          if (currentDoc) {
              updatedStudent.documents = updatedStudent.documents.map((d: any) => {
                  if (d.id === currentDoc.id) {
                      return {
                          ...d,
                          status: status,
                          adminNote: adminNote,
                          verifierName: currentUser.name,
                          verificationDate: new Date().toISOString()
                      };
                  }
                  return d;
              });
          }

          await api.updateStudent(updatedStudent);
          onUpdate();
          
          if (status === 'APPROVED') {
              if (activePage < totalPages) {
                  setActivePage(activePage + 1);
              } 
          }

      } catch (e) {
          console.error(e);
          alert("Gagal memproses verifikasi.");
      } finally {
          setIsProcessing(false);
      }
  };

  const isImageFile = (doc: DocumentFile) => {
      return doc.type === 'IMAGE' || doc.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);
  };

  const isDriveUrl = currentDoc?.url.includes('drive.google.com') || currentDoc?.url.includes('docs.google.com');

  return (
    <div className="flex flex-col h-full animate-fade-in">
        {/* Top Toolbar */}
        <div className="bg-white p-3 border-b border-gray-200 flex flex-col gap-3 shadow-sm z-20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h2 className="font-bold text-gray-800">Verifikasi Nilai Rapor</h2>
                </div>
                
                {/* GLOBAL SEMESTER SELECTOR */}
                <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                    {SEMESTERS.map(sem => (
                        <button
                            key={sem}
                            onClick={() => { setActiveSemester(sem); setActivePage(1); }}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                                activeSemester === sem 
                                ? 'bg-white text-blue-700 shadow-sm border border-gray-200' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Semester {sem}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select 
                            className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer min-w-[100px]"
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                        >
                            {uniqueClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 md:w-64 flex-1">
                        <Search className="w-4 h-4 text-gray-500" />
                        <select 
                            className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer w-full"
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                        >
                            {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </div>

        {/* Main Content Split */}
        <div className="flex-1 flex overflow-hidden">
            {/* Left: Document Viewer with Page Tabs */}
            <div className="flex-1 bg-gray-900 relative flex flex-col overflow-hidden">
                
                {/* PAGE TABS OVERLAY */}
                <div className="bg-gray-800 border-b border-gray-700 p-2 flex justify-center gap-2 z-10">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                        const pageDoc = currentStudent?.documents.find(d => 
                            d.category === 'RAPOR' && 
                            d.subType?.semester === activeSemester && 
                            d.subType?.page === page
                        );
                        
                        let statusColor = 'bg-gray-600 border-gray-500 text-gray-400';
                        if (pageDoc) {
                            if (pageDoc.status === 'APPROVED') statusColor = 'bg-green-900/50 border-green-600 text-green-400';
                            else if (pageDoc.status === 'REVISION') statusColor = 'bg-red-900/50 border-red-600 text-red-400';
                            else statusColor = 'bg-yellow-900/50 border-yellow-600 text-yellow-400 animate-pulse';
                        }

                        const isActive = activePage === page;

                        return (
                            <button
                                key={page}
                                onClick={() => setActivePage(page)}
                                className={`
                                    px-4 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-2
                                    ${isActive ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900 transform scale-105' : 'hover:bg-gray-700'}
                                    ${statusColor}
                                    ${isActive && !pageDoc ? 'bg-gray-700 text-white' : ''}
                                `}
                            >
                                <File className="w-3 h-3" />
                                Halaman {page}
                                {pageDoc?.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3 ml-1" />}
                            </button>
                        );
                    })}
                </div>

                {/* VIEWER AREA */}
                <div className="flex-1 relative overflow-hidden flex flex-col">
                    {currentDoc ? (
                        <>
                            {/* Zoom Controls */}
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-black/50 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-lg">
                                <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.2))} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors" title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
                                <span className="text-white text-xs font-mono font-bold flex items-center px-2">{Math.round(zoomLevel * 100)}%</span>
                                <button onClick={() => setZoomLevel(z => Math.min(3, z + 0.2))} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors" title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
                                <div className="w-px h-4 bg-white/20 my-auto mx-1"></div>
                                <button onClick={() => setRotation(r => r + 90)} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors" title="Putar"><RotateCw className="w-4 h-4" /></button>
                                <button onClick={() => setUseFallbackViewer(v => !v)} className="px-3 py-1 text-[10px] font-bold text-white hover:bg-white/20 rounded-full border border-white/20 ml-1 transition-colors">
                                    {useFallbackViewer ? 'Mode Default' : 'Mode Alt'}
                                </button>
                            </div>

                            {/* Scrollable Container */}
                            <div className="flex-1 overflow-auto p-4 md:p-8 bg-gray-900/50 scroll-smooth">
                                <div 
                                    style={{ 
                                        transform: `scale(${useFallbackViewer ? 1 : zoomLevel}) rotate(${rotation}deg)`, 
                                        transformOrigin: 'top center',
                                        transition: 'transform 0.2s ease-out' 
                                    }}
                                    className="w-fit h-fit mx-auto shadow-2xl transition-transform duration-200 bg-white rounded"
                                >
                                    {(useFallbackViewer || (isDriveUrl && !isImageFile(currentDoc))) ? (
                                        <iframe 
                                            src={getDriveUrl(currentDoc.url, 'preview')} 
                                            className="w-[800px] h-[1100px] bg-white rounded" 
                                            title="Document Viewer" 
                                            allow="autoplay" 
                                        />
                                    ) : (
                                        <img 
                                            src={isDriveUrl ? getDriveUrl(currentDoc.url, 'direct') : currentDoc.url} 
                                            className="max-w-none h-auto object-contain rounded" 
                                            style={{ minWidth: '600px', maxWidth: '100%' }}
                                            alt="Document" 
                                            onError={() => setUseFallbackViewer(true)} 
                                        />
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                            <LayoutList className="w-16 h-16 mb-4 opacity-20" />
                            <p>Tidak ada dokumen untuk Halaman {activePage} Semester {activeSemester}.</p>
                            <p className="text-xs mt-2 text-gray-600">Siswa belum mengupload bagian ini.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Data Panel */}
            <div className="w-[480px] bg-white border-l border-gray-200 flex flex-col shadow-xl z-10">
                {/* Header */}
                <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <LayoutList className="w-4 h-4 text-blue-700" />
                            <span className="text-sm font-bold text-blue-800">Verifikasi Nilai</span>
                        </div>
                        <div className="text-xs text-blue-600 font-medium">
                            Semester {activeSemester}
                        </div>
                    </div>
                    {/* New Save Data Button */}
                    <button 
                        onClick={handleSaveDataOnly}
                        disabled={isSavingData}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm"
                    >
                        {isSavingData ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3" />}
                        Simpan Data
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {currentStudent ? (
                            <>
                                <div className="bg-yellow-50 p-3 rounded border border-yellow-100 text-xs text-yellow-800 flex gap-2">
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold">Instruksi:</p>
                                        <p>1. Cek dokumen di kiri.</p>
                                        <p>2. Data Tahun & Kelas diisi otomatis, koreksi jika salah.</p>
                                        <p>3. Input Nilai & Kehadiran sesuai Rapor.</p>
                                    </div>
                                </div>

                                {/* CLASS INFO SECTION */}
                                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-xs font-bold text-blue-800 uppercase flex items-center gap-2">
                                            <School className="w-3 h-3" /> Info Akademik (S{activeSemester})
                                        </h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tahun Pelajaran</label>
                                            <input 
                                                className="w-full p-2 border border-blue-200 rounded text-xs font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                                value={academicYear}
                                                onChange={(e) => setAcademicYear(e.target.value)}
                                                placeholder="Contoh: 2024/2025"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Kelas</label>
                                            <select 
                                                className="w-full p-2 border border-blue-200 rounded text-xs font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer"
                                                value={semesterClass}
                                                onChange={(e) => setSemesterClass(e.target.value)}
                                            >
                                                {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* ATTENDANCE SECTION - NEW */}
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-xs font-bold text-gray-600 uppercase flex items-center gap-2">
                                            <UserCheck className="w-3 h-3" /> Kehadiran (Semester {activeSemester})
                                        </h4>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1 text-center">Sakit</label>
                                            <input 
                                                type="number" 
                                                className="w-full p-1.5 border rounded text-center text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={attendanceData.sick}
                                                onChange={(e) => setAttendanceData({...attendanceData, sick: Number(e.target.value)})}
                                                min={0}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1 text-center">Izin</label>
                                            <input 
                                                type="number" 
                                                className="w-full p-1.5 border rounded text-center text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={attendanceData.permitted}
                                                onChange={(e) => setAttendanceData({...attendanceData, permitted: Number(e.target.value)})}
                                                min={0}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1 text-center">Alpha</label>
                                            <input 
                                                type="number" 
                                                className="w-full p-1.5 border rounded text-center text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={attendanceData.noReason}
                                                onChange={(e) => setAttendanceData({...attendanceData, noReason: Number(e.target.value)})}
                                                min={0}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* GRADE INPUT SECTION */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase border-b pb-2 mb-2">
                                        <span className="pl-2">Mata Pelajaran</span>
                                        <span className="pr-2">Nilai</span>
                                    </div>
                                    {SUBJECT_MAP.map((sub, idx) => (
                                        <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50 hover:bg-gray-50 px-2 rounded">
                                            <label className="text-xs font-bold text-gray-700 w-2/3 truncate" title={sub.full}>{idx+1}. {sub.label}</label>
                                            <input 
                                                type="number" 
                                                className="w-20 p-1.5 border rounded text-right text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={gradeData[sub.key] || ''}
                                                onChange={(e) => setGradeData({...gradeData, [sub.key]: Number(e.target.value)})}
                                                placeholder="0"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-gray-400 text-xs py-10">Pilih siswa dari daftar di atas.</div>
                        )}
                    </div>

                    {/* Action Footer */}
                    {currentStudent && (
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Catatan Dokumen (Hal {activePage})</label>
                            <input 
                                type="text" 
                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-blue-500 outline-none" 
                                placeholder="Contoh: Nilai Matematika kurang jelas / Salah crop" 
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                            />
                            
                            {!currentDoc && (
                                <p className="text-[10px] text-red-500 mb-2 italic">*Dokumen untuk Halaman {activePage} belum ada. Anda tetap bisa menyimpan nilai.</p>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => handleProcess('REVISION')} 
                                    disabled={isProcessing || !currentDoc}
                                    className="py-2.5 bg-white border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <XCircle className="w-4 h-4" /> Tolak Dokumen
                                </button>
                                <button 
                                    onClick={() => handleProcess('APPROVED')} 
                                    disabled={isProcessing}
                                    className="py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 text-sm flex items-center justify-center gap-2 shadow-sm"
                                >
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} 
                                    {currentDoc ? 'Valid & Simpan' : 'Simpan Nilai'}
                                </button>
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
