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
import { Student, DocumentFile } from './types';
import { Search, Bell, ChevronDown, LogOut, User, Loader2, Cloud, CloudOff, RefreshCw, Menu, FolderOpen, WifiOff } from 'lucide-react';

type UserRole = 'ADMIN' | 'STUDENT' | 'GURU';

// CACHE KEY VERSIONING - Change this to force clear old data on all clients
const CACHE_KEY = 'sidata_students_cache_v3';

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
  
  const [dataVersion, setDataVersion] = useState(0); 
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const sanitizeStudents = (data: Student[]): Student[] => {
      return data.map(s => ({
          ...s,
          className: s.className ? s.className.replace(/kelas/gi, '').trim() : '-'
      }));
  };

  useEffect(() => {
    const initData = async () => {
        if (studentsData.length === 0) setIsLoading(true);
        setConnectionError(false);

        // 1. Try Load from Fresh Cache
        const cached = localStorage.getItem(CACHE_KEY);
        let localData: Student[] = [];
        
        if (cached) {
            try {
                localData = JSON.parse(cached);
            } catch (e) {
                console.error("Cache corrupted, clearing", e);
                localStorage.removeItem(CACHE_KEY);
            }
        }

        try {
            // 2. Fetch from Cloud
            const [onlineData, settings] = await Promise.all([
                api.getStudents(),
                api.getAppSettings()
            ]);
            
            const sanitizedOnline = sanitizeStudents(onlineData);
            
            // STRICT SYNC: Cloud replaces local completely for the list
            setStudentsData(sanitizedOnline);
            localStorage.setItem(CACHE_KEY, JSON.stringify(sanitizedOnline));
            
            if (settings && settings.academicData && settings.academicData.year) {
                setActiveAcademicYear(settings.academicData.year);
            }

            setIsCloudConnected(true);
        } catch (error) {
            console.error("Failed to connect to Cloud", error);
            setIsCloudConnected(false);
            setConnectionError(true);
            
            // 3. Fallback ONLY to existing local cache if available
            if (localData.length > 0) {
                setStudentsData(localData);
                console.warn("Using Local Cache as fallback due to connection error");
            } else {
                // 4. STOP: Do NOT load MOCK data. Show empty state.
                // This prevents "Old Data" confusion.
                setStudentsData([]);
            }
        } finally {
            setIsLoading(false);
        }
    };
    initData();
  }, [dataVersion]);

  useEffect(() => {
      if (selectedStudent && studentsData.length > 0) {
          const updatedStudent = studentsData.find(s => s.id === selectedStudent.id);
          if (updatedStudent && JSON.stringify(updatedStudent) !== JSON.stringify(selectedStudent)) {
              setSelectedStudent(updatedStudent);
          }
      }
  }, [studentsData, selectedStudent]);

  useEffect(() => {
      if (studentsData.length > 0) {
          localStorage.setItem(CACHE_KEY, JSON.stringify(studentsData));
      }
  }, [studentsData]);

  const refreshData = () => {
      setDataVersion(prev => prev + 1);
  };

  const saveStudentToCloud = async (student: Student) => {
      const sanitizedStudent = {
          ...student,
          className: student.className.replace(/kelas/gi, '').trim()
      };

      setStudentsData(prevStudents => {
          const newData = prevStudents.map(s => s.id === sanitizedStudent.id ? sanitizedStudent : s);
          localStorage.setItem(CACHE_KEY, JSON.stringify(newData)); 
          return newData;
      });

      try {
          await api.updateStudent(sanitizedStudent);
      } catch (error) {
          console.error("Cloud save failed (data saved locally):", error);
          alert("Peringatan: Gagal menyimpan ke Cloud (Data tersimpan lokal)");
      }
  };

  const handleLogin = (role: UserRole, studentData?: Student) => {
      setIsAuthenticated(true);
      setUserRole(role);
      if (role === 'STUDENT' && studentData) {
          setSelectedStudent(studentData);
          setCurrentUser({ name: studentData.fullName, role: 'STUDENT' });
          setCurrentView('dashboard');
      } else {
          setCurrentUser({ name: 'Admin', role: role });
          setCurrentView('dashboard');
      }
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setUserRole('ADMIN');
      setCurrentUser(null);
      setSelectedStudent(null);
      setCurrentView('dashboard');
  };

  const handleStudentUpload = async (file: File, category: string) => {
      if (!selectedStudent) return;
      try {
          const driveUrl = await api.uploadFile(file, selectedStudent.id, category);
          if (driveUrl) {
              const newDoc: DocumentFile = {
                  id: Math.random().toString(36).substr(2, 9),
                  name: file.name,
                  type: file.type.includes('pdf') ? 'PDF' : 'IMAGE',
                  url: driveUrl,
                  category: category as any,
                  uploadDate: new Date().toISOString().split('T')[0],
                  size: `${(file.size/1024).toFixed(0)} KB`,
                  status: 'PENDING'
              };
              const updatedStudent = {
                  ...selectedStudent,
                  documents: [...selectedStudent.documents.filter(d => d.category !== category), newDoc]
              };
              await saveStudentToCloud(updatedStudent);
              setSelectedStudent(updatedStudent); 
          } else {
              alert("Gagal upload ke Cloud. Silakan coba lagi.");
          }
      } catch (e) {
          console.error(e);
          alert("Terjadi kesalahan saat upload.");
      }
  };

  const renderContent = () => {
      if (connectionError && studentsData.length === 0) {
          return (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white rounded-xl border border-red-200 shadow-sm">
                  <WifiOff className="w-16 h-16 text-red-400 mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Gagal Terhubung ke Cloud</h3>
                  <p className="text-gray-500 mb-6 max-w-md">
                      Aplikasi tidak dapat mengambil data dari Google Spreadsheet dan tidak ada data tersimpan di perangkat ini.
                  </p>
                  <button onClick={refreshData} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" /> Coba Lagi
                  </button>
              </div>
          );
      }

      switch (currentView) {
          case 'dashboard': return <Dashboard students={studentsData} userRole={userRole} />;
          case 'database': return <DatabaseView students={studentsData} onUpdateStudents={setStudentsData} />;
          case 'buku-induk': return <BukuIndukView students={studentsData} />;
          case 'grades': return <GradesView students={studentsData} userRole={userRole} loggedInStudent={selectedStudent || undefined} onUpdate={refreshData} />;
          case 'recap': return <RecapView students={studentsData} userRole={userRole} loggedInStudent={selectedStudent || undefined} />;
          case 'skl': return <SKLView students={studentsData} userRole={userRole} loggedInStudent={selectedStudent || undefined} />;
          case 'data-ijazah': return <IjazahView students={studentsData} userRole={userRole} loggedInStudent={selectedStudent || undefined} />;
          case 'verification': return <VerificationView students={studentsData} onUpdate={refreshData} currentUser={currentUser || undefined} onSave={saveStudentToCloud} />;
          case 'ijazah-verification': return <IjazahVerificationView students={studentsData} onUpdate={refreshData} currentUser={currentUser || undefined} onSave={saveStudentToCloud} />;
          case 'grade-verification': return <GradeVerificationView students={studentsData} onUpdate={refreshData} currentUser={currentUser || undefined} userRole={userRole} onSave={saveStudentToCloud} />;
          case 'student-docs': return <StudentDocsAdminView students={studentsData} onUpdate={refreshData} />;
          case 'history': return <HistoryView students={studentsData} />;
          case 'monitoring': return <MonitoringView students={studentsData} userRole={userRole} loggedInStudent={selectedStudent || undefined} />;
          case 'reports': return <ReportsView students={studentsData} onUpdate={refreshData} />;
          case 'settings': return <SettingsView />;
          case 'dapodik':
              if (!selectedStudent) return null;
              return <StudentDetail student={selectedStudent} onBack={() => {}} viewMode="dapodik" readOnly={true} onUpdate={refreshData} />;
          case 'documents':
              if (!selectedStudent) return null;
              return <FileManager documents={selectedStudent.documents} onUpload={handleStudentUpload} onDelete={async (id) => { if(!selectedStudent) return; const updated = {...selectedStudent, documents: selectedStudent.documents.filter(d => d.id !== id)}; await saveStudentToCloud(updated); setSelectedStudent(updated); }} />;
          case 'upload-rapor':
              if (!selectedStudent) return null;
              return <UploadRaporView student={selectedStudent} onUpdate={refreshData} />;
          default: return <Dashboard students={studentsData} userRole={userRole} />;
      }
  };

  if (isLoading) {
      return (
          <div className="flex items-center justify-center h-screen bg-gray-50 flex-col">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600 font-medium animate-pulse">Menghubungkan ke Database Cloud...</p>
          </div>
      );
  }

  if (!isAuthenticated) {
      return <Login onLogin={handleLogin} students={studentsData} />;
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
        <div className={`fixed inset-y-0 left-0 transform ${isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0'} md:relative md:translate-x-0 transition duration-200 ease-in-out z-30 md:block md:w-64 flex-shrink-0 bg-gray-900 m-0 md:m-4 rounded-none md:rounded-2xl shadow-xl`}>
             <Sidebar currentView={currentView} setView={setCurrentView} onLogout={handleLogout} isCollapsed={false} toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} userRole={userRole} />
        </div>
        {isSidebarCollapsed && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsSidebarCollapsed(false)}></div>}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 flex items-center justify-between px-6 z-20">
                <div className="flex items-center gap-4">
                    <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}><Menu className="w-6 h-6" /></button>
                    <h1 className="text-lg font-bold text-gray-800 capitalize hidden sm:block">{currentView.replace(/-/g, ' ')}</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                        <User className="w-3 h-3" /> {currentUser?.name || 'User'} ({currentUser?.role}) <ChevronDown className="w-3 h-3" />
                    </div>
                </div>
            </header>
            <main className="flex-1 overflow-hidden p-4 md:p-6 relative">{renderContent()}</main>
        </div>
    </div>
  );
};

export default App;