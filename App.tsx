import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard, { DashboardNotification } from './components/Dashboard';
import DapodikList from './components/DapodikList';
import StudentDetail from './components/StudentDetail';
import VerificationView from './components/VerificationView';
import DatabaseView from './components/DatabaseView';
import HistoryView from './components/HistoryView';
import BukuIndukView from './components/BukuIndukView';
import GradesView from './components/GradesView';
import RecapView from './components/RecapView';
import IjazahView from './components/IjazahView';
import SKLView from './components/SKLView'; 
import FileManager from './components/FileManager';
import SettingsView from './components/SettingsView';
import UploadRaporView from './components/UploadRaporView';
import GradeVerificationView from './components/GradeVerificationView';
import MonitoringView from './components/MonitoringView';
import ReportsView from './components/ReportsView';
import StudentDocsAdminView from './components/StudentDocsAdminView'; 
import IjazahVerificationView from './components/IjazahVerificationView';
import Login from './components/Login';
import { api } from './services/api'; 
import { MOCK_STUDENTS } from './services/mockData';
import { Student, DocumentFile } from './types';
import { Search, Bell, ChevronDown, LogOut, User, Loader2, Cloud, CloudOff, RefreshCw, Menu, FolderOpen, WifiOff, AlertTriangle, Database } from 'lucide-react';

type UserRole = 'ADMIN' | 'STUDENT' | 'GURU';

// CACHE KEY VERSIONING
const CACHE_KEY = 'sidata_students_cache_v4';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [studentsData, setStudentsData] = useState<Student[]>([]);
  const [activeAcademicYear, setActiveAcademicYear] = useState('2024/2025'); 
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('ADMIN');
  const [currentUser, setCurrentUser] = useState<{name: string, role: string} | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [initStatus, setInitStatus] = useState(''); // Status message for initial sync
  
  // Triggers & Navigation State
  const [dataVersion, setDataVersion] = useState(0); 
  const [targetHighlightField, setTargetHighlightField] = useState<string | undefined>(undefined);
  const [targetHighlightDoc, setTargetHighlightDoc] = useState<string | undefined>(undefined);
  const [targetVerificationStudentId, setTargetVerificationStudentId] = useState<string | undefined>(undefined); 
  
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 

  const sanitizeStudents = (data: Student[]): Student[] => {
      return data.map(s => ({
          ...s,
          className: s.className ? s.className.replace(/kelas/gi, '').trim() : '-'
      }));
  };

  // FETCH DATA ON MOUNT & UPDATE
  useEffect(() => {
    const initData = async () => {
        if (studentsData.length === 0) setIsLoading(true);
        setConnectionError(false);
        setInitStatus('Menghubungkan ke Cloud...');

        // 1. Try Load from LocalStorage Cache (Fast Load)
        const cached = localStorage.getItem(CACHE_KEY);
        let localData: Student[] = [];
        if (cached) {
            try { localData = JSON.parse(cached); } catch (e) { localStorage.removeItem(CACHE_KEY); }
        }

        try {
            // 2. Fetch from Cloud
            let onlineData: Student[] | null = null;
            let settings: any = null;

            try {
                [onlineData, settings] = await Promise.all([
                    api.getStudents(),
                    api.getAppSettings()
                ]);
            } catch (err: any) {
                // Check if it's just a "not configured" error or a real fetch error
                if (err.message === "URL Not Configured") throw err;
                throw err;
            }
            
            // 3. Handle Empty Database (First Run)
            if (onlineData && onlineData.length === 0) {
                setInitStatus('Database kosong. Menginisialisasi data awal...');
                console.warn("Database empty. Initializing with Mock Data...");
                // Force sync mock data to cloud
                const success = await api.syncInitialData(MOCK_STUDENTS);
                if (success) {
                    setInitStatus('Inisialisasi berhasil. Memuat ulang...');
                    onlineData = await api.getStudents(); // Refetch
                } else {
                    console.error("Failed to initialize database.");
                }
            }

            // 4. Set Data
            if (onlineData && onlineData.length > 0) {
                const sanitizedOnline = sanitizeStudents(onlineData);
                setStudentsData(sanitizedOnline);
                localStorage.setItem(CACHE_KEY, JSON.stringify(sanitizedOnline));
                setIsCloudConnected(true);
                setConnectionError(false);
                
                if (settings && settings.academicData && settings.academicData.year) {
                    setActiveAcademicYear(settings.academicData.year);
                }
            } else {
                // Still empty after sync attempt? Fallback to mock logic locally but mark as offline
                console.warn("Cloud data empty after sync attempt.");
                if (localData.length > 0) {
                    setStudentsData(localData);
                } else {
                    setStudentsData(sanitizeStudents(MOCK_STUDENTS));
                }
                setIsCloudConnected(false); // Treat as offline/mock mode
            }

        } catch (error: any) {
            console.error("Connection Error:", error);
            setConnectionError(true);
            setIsCloudConnected(false);
            
            // Fallback to cache or mock
            if (localData.length > 0) {
                setStudentsData(localData);
            } else {
                setStudentsData(sanitizeStudents(MOCK_STUDENTS));
            }
        } finally {
            setIsLoading(false);
            setInitStatus('');
        }
    };
    initData();
  }, [dataVersion]);

  // SYNC SELECTED STUDENT DATA
  useEffect(() => {
      if (selectedStudent && studentsData.length > 0) {
          const updatedStudent = studentsData.find(s => s.id === selectedStudent.id);
          if (updatedStudent && JSON.stringify(updatedStudent) !== JSON.stringify(selectedStudent)) {
              setSelectedStudent(updatedStudent);
          }
      }
  }, [studentsData, selectedStudent]);

  // Sync to LocalStorage on change
  useEffect(() => {
      if (studentsData.length > 0) {
          localStorage.setItem(CACHE_KEY, JSON.stringify(studentsData));
      }
  }, [studentsData]);

  const refreshData = () => {
      setDataVersion(prev => prev + 1);
  };

  const loadOfflineMode = () => {
      setStudentsData(sanitizeStudents(MOCK_STUDENTS));
      setConnectionError(false);
  };

  const saveStudentToCloud = async (student: Student) => {
      const sanitizedStudent = {
          ...student,
          className: student.className.replace(/kelas/gi, '').trim()
      };

      // Optimistic Update
      setStudentsData(prevStudents => {
          const newData = prevStudents.map(s => s.id === sanitizedStudent.id ? sanitizedStudent : s);
          localStorage.setItem(CACHE_KEY, JSON.stringify(newData)); 
          return newData;
      });

      try {
          await api.updateStudent(sanitizedStudent);
      } catch (error) {
          console.error("Cloud save failed:", error);
          alert("Gagal menyimpan ke Cloud (Data tersimpan di perangkat ini sementara).");
      }
  };

  const handleLogin = (role: UserRole, studentData?: Student) => {
      setUserRole(role);
      setIsAuthenticated(true);
      if (role === 'STUDENT' && studentData) {
          setCurrentUser({ name: studentData.fullName, role: 'Siswa' });
          setSelectedStudent(studentData);
      } else if (role === 'GURU') {
          setCurrentUser({ name: 'Guru Pengajar', role: 'Guru' });
      } else {
          setCurrentUser({ name: 'Administrator', role: 'Admin' });
      }
      setCurrentView('dashboard');
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setSelectedStudent(null);
      setUserRole('ADMIN');
  };

  const notifications = useMemo(() => {
      if (!studentsData) return [];
      const notifs: DashboardNotification[] = [];
      studentsData.forEach(s => {
          const pendingDocs = s.documents.filter(d => d.status === 'PENDING');
          if (pendingDocs.length > 0) {
              pendingDocs.forEach(d => {
                  const isRapor = d.category === 'RAPOR';
                  notifs.push({
                      id: `doc-${d.id}`,
                      type: isRapor ? 'ADMIN_GRADE_VERIFY' : 'ADMIN_DOC_VERIFY',
                      title: isRapor ? 'Verifikasi Nilai (Rapor)' : 'Verifikasi Buku Induk (Dokumen)',
                      description: `${s.fullName} mengupload ${d.name} (${d.category})`,
                      date: d.uploadDate,
                      priority: 'HIGH',
                      data: { studentId: s.id, docId: d.id, category: d.category, targetView: isRapor ? 'grade-verification' : 'verification' }
                  });
              });
          }
          const pendingReqs = s.correctionRequests?.filter(r => r.status === 'PENDING');
          if (pendingReqs && pendingReqs.length > 0) {
              pendingReqs.forEach(r => {
                  const isAcademic = r.fieldKey.startsWith('grade-') || r.fieldKey.startsWith('class-');
                  const isIjazah = ['nis', 'nisn', 'birthPlace', 'birthDate'].includes(r.fieldKey);
                  let type: any = 'ADMIN_BIO_VERIFY';
                  let title = 'Verifikasi Buku Induk';
                  let targetView = 'student-detail';
                  if (isAcademic) { type = 'ADMIN_GRADE_VERIFY'; title = 'Verifikasi Nilai'; targetView = 'grade-verification'; } 
                  else if (isIjazah) { type = 'ADMIN_IJAZAH_VERIFY'; title = 'Verifikasi Data Ijazah'; targetView = 'ijazah-verification'; }
                  notifs.push({
                      id: `req-${r.id}`, type: type, title: title, description: `${s.fullName} mengajukan perbaikan: ${r.fieldName}`, date: new Date(r.requestDate).toLocaleDateString(), priority: 'MEDIUM',
                      data: { studentId: s.id, fieldKey: r.fieldKey, targetView: targetView }
                  });
              });
          }
      });
      return notifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [studentsData, userRole, selectedStudent]);

  const handleNotificationClick = (notif: DashboardNotification) => {
      if (userRole === 'ADMIN' || userRole === 'GURU') {
          if (notif.data) {
              setTargetVerificationStudentId(notif.data.studentId);
              if (notif.data.docId) {
                  setTargetHighlightDoc(notif.data.docId);
                  if (notif.data.targetView) setCurrentView(notif.data.targetView);
                  else setCurrentView(notif.data.category === 'RAPOR' ? 'grade-verification' : 'verification');
              } else if (notif.data.fieldKey) {
                  setTargetHighlightField(notif.data.fieldKey);
                  if (notif.data.targetView) setCurrentView(notif.data.targetView);
                  else {
                      const s = studentsData.find(st => st.id === notif.data.studentId);
                      if (s) { setSelectedStudent(s); setCurrentView('student-detail'); }
                  }
              }
          }
      }
      setReadNotificationIds(prev => new Set(prev).add(notif.id));
  };

  const renderContent = () => {
      // Error State Handler inside App - Enhanced with manual offline button
      if (connectionError && studentsData.length === 0) {
          return (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white rounded-xl border border-red-200 shadow-sm m-4">
                  <WifiOff className="w-16 h-16 text-red-400 mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Gagal Terhubung ke Cloud</h3>
                  <p className="text-gray-500 mb-2 max-w-md">
                      Aplikasi tidak dapat terhubung ke Google Apps Script. 
                  </p>
                  <div className="text-xs text-left bg-yellow-50 p-4 rounded border border-yellow-200 text-yellow-800 max-w-md mb-6">
                      <strong>Tips Perbaikan:</strong>
                      <ul className="list-disc pl-4 mt-1 space-y-1">
                          <li>Pastikan Deployment Web App diset ke: <strong>Who has access: Anyone</strong> (Siapa saja).</li>
                          <li>Jika baru dideploy, tunggu 1-2 menit lalu coba lagi.</li>
                          <li>Pastikan URL di <code>services/api.ts</code> sudah benar (berakhiran /exec).</li>
                          <li>Cek koneksi internet anda.</li>
                      </ul>
                  </div>
                  <div className="flex gap-3">
                      <button onClick={refreshData} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
                          <RefreshCw className="w-4 h-4" /> Coba Lagi
                      </button>
                      <button onClick={loadOfflineMode} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 flex items-center gap-2 border border-gray-300">
                          <Database className="w-4 h-4" /> Gunakan Data Offline
                      </button>
                  </div>
              </div>
          );
      }

      switch (currentView) {
          case 'dashboard': return <Dashboard notifications={notifications} onNotificationClick={handleNotificationClick} userRole={userRole} students={studentsData} />;
          case 'database': return <DatabaseView students={studentsData} onUpdateStudents={(newData) => { setStudentsData(newData); saveStudentToCloud(newData[0]); }} />;
          case 'buku-induk': return <BukuIndukView students={studentsData} />;
          case 'verification': return <VerificationView students={studentsData} targetStudentId={targetVerificationStudentId} onUpdate={refreshData} onSave={saveStudentToCloud} currentUser={currentUser || undefined} />;
          case 'student-detail': 
              if (!selectedStudent) return <DapodikList students={studentsData} onSelectStudent={(s) => { setSelectedStudent(s); setCurrentView('student-detail'); }} />;
              return <StudentDetail student={selectedStudent} onBack={() => setCurrentView('database')} viewMode="dapodik" highlightFieldKey={targetHighlightField} onUpdate={refreshData} onSave={saveStudentToCloud} currentUser={currentUser || undefined} />;
          case 'student-docs': return <StudentDocsAdminView students={studentsData} onUpdate={refreshData} />;
          case 'grades': return <GradesView students={studentsData} userRole={userRole} loggedInStudent={selectedStudent || undefined} onUpdate={refreshData} />;
          case 'grade-verification': return <GradeVerificationView students={studentsData} userRole={userRole} onUpdate={refreshData} onSave={saveStudentToCloud} currentUser={currentUser || undefined} />;
          case 'recap': return <RecapView students={studentsData} userRole={userRole} loggedInStudent={selectedStudent || undefined} />;
          case 'skl': return <SKLView students={studentsData} userRole={userRole} loggedInStudent={selectedStudent || undefined} />;
          case 'data-ijazah': return <IjazahView students={studentsData} userRole={userRole} loggedInStudent={selectedStudent || undefined} />;
          case 'ijazah-verification': return <IjazahVerificationView students={studentsData} onUpdate={refreshData} onSave={saveStudentToCloud} currentUser={currentUser || undefined} />;
          case 'settings': return <SettingsView />;
          case 'upload-rapor': 
              if (!selectedStudent) return <div>Data siswa tidak ditemukan</div>;
              return <UploadRaporView student={selectedStudent} onUpdate={refreshData} />;
          case 'history': return <HistoryView students={studentsData} />;
          case 'monitoring': return <MonitoringView students={studentsData} userRole={userRole} loggedInStudent={selectedStudent || undefined} />;
          case 'reports': return <ReportsView students={studentsData} onUpdate={refreshData} />;
          case 'dapodik':
              if (!selectedStudent) return <div>Loading...</div>;
              return <StudentDetail student={selectedStudent} onBack={() => setCurrentView('dashboard')} viewMode="student" readOnly={true} onUpdate={refreshData} onSave={saveStudentToCloud} currentUser={currentUser || undefined} />;
          case 'documents':
              if (!selectedStudent) return <div>Loading...</div>;
              return (
                  <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="p-4 border-b"><h2 className="text-lg font-bold flex items-center gap-2 text-gray-800"><FolderOpen className="w-5 h-5 text-blue-600"/> Dokumen Saya</h2></div>
                      <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50">
                          <FileManager 
                              documents={selectedStudent.documents} 
                              onUpload={(f, c) => {
                                  api.uploadFile(f, selectedStudent.id, c).then(url => {
                                      if(url) {
                                          const newDoc: DocumentFile = { id: Math.random().toString(36).substr(2, 9), name: f.name, type: f.type.includes('pdf') ? 'PDF' : 'IMAGE', url: url, category: c as any, uploadDate: new Date().toISOString().split('T')[0], size: 'Unknown', status: 'PENDING' };
                                          const updated = {...selectedStudent, documents: [...selectedStudent.documents.filter(d=>d.category!==c), newDoc]};
                                          saveStudentToCloud(updated);
                                          refreshData();
                                      }
                                  });
                              }}
                              onDelete={(id) => { const updated = {...selectedStudent, documents: selectedStudent.documents.filter(d=>d.id !== id)}; saveStudentToCloud(updated); refreshData(); }}
                          />
                      </div>
                  </div>
              );
          default: return <Dashboard notifications={notifications} onNotificationClick={handleNotificationClick} userRole={userRole} students={studentsData} />;
      }
  };

  // IF NOT AUTHENTICATED, RENDER LOGIN SCREEN FULL PAGE
  if (!isAuthenticated) {
      return <Login onLogin={handleLogin} students={studentsData} />;
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (<div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>)}
        <div className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out z-30 md:block md:w-64 flex-shrink-0 bg-gray-900 m-0 md:m-4 rounded-none md:rounded-2xl shadow-xl`}>
             <Sidebar currentView={currentView} setView={(v) => { setCurrentView(v); setIsMobileMenuOpen(false); }} onLogout={handleLogout} isCollapsed={isSidebarCollapsed} toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} userRole={userRole} />
        </div>
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 flex items-center justify-between px-6 z-20">
                <div className="flex items-center gap-4">
                    <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600" onClick={() => setIsMobileMenuOpen(true)}><Menu className="w-6 h-6" /></button>
                    <div className="flex flex-col">
                        <h1 className="text-lg font-bold text-gray-800 hidden sm:block">{currentView === 'dashboard' ? 'Dashboard' : 'Menu Aplikasi'}</h1>
                        <span className="text-[10px] text-gray-500 font-medium hidden sm:block">Tahun Ajaran {activeAcademicYear}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* Status Cloud */}
                    <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${isCloudConnected ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {isCloudConnected ? <Cloud className="w-3 h-3"/> : <CloudOff className="w-3 h-3"/>}
                        {isCloudConnected ? 'Online' : 'Offline'}
                    </div>
                    {isLoading && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                        <User className="w-3 h-3" /> {currentUser?.name || 'User'} ({currentUser?.role}) <ChevronDown className="w-3 h-3" />
                    </div>
                    {isProfileOpen && (
                        <div className="absolute top-14 right-6 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                            <button onClick={() => { refreshData(); setIsProfileOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Refresh Data</button>
                            <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><LogOut className="w-4 h-4" /> Keluar</button>
                        </div>
                    )}
                </div>
            </header>
            
            {initStatus && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-2 rounded-full shadow-lg font-bold text-sm animate-pulse flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> {initStatus}
                </div>
            )}

            <main className="flex-1 overflow-hidden p-4 md:p-6 relative">{renderContent()}</main>
        </div>
    </div>
  );
};

export default App;