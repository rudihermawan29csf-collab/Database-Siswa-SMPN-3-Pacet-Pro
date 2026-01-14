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
import FileManager from './components/FileManager';
import SettingsView from './components/SettingsView';
import UploadRaporView from './components/UploadRaporView';
import GradeVerificationView from './components/GradeVerificationView';
import ReportsView from './components/ReportsView';
import StudentDocsAdminView from './components/StudentDocsAdminView'; // New Import
import Login from './components/Login';
import { MOCK_STUDENTS } from './services/mockData'; 
import { api } from './services/api'; 
import { Student, DocumentFile } from './types';
import { Search, Bell, ChevronDown, LogOut, User, Loader2 } from 'lucide-react';

type UserRole = 'ADMIN' | 'STUDENT' | 'GURU';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [studentsData, setStudentsData] = useState<Student[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('ADMIN');
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Triggers & Navigation State
  const [dataVersion, setDataVersion] = useState(0); 
  const [targetHighlightField, setTargetHighlightField] = useState<string | undefined>(undefined);
  const [targetHighlightDoc, setTargetHighlightDoc] = useState<string | undefined>(undefined);
  const [targetVerificationStudentId, setTargetVerificationStudentId] = useState<string | undefined>(undefined); 

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // FETCH DATA ON MOUNT
  useEffect(() => {
    const initData = async () => {
        setIsLoading(true);
        // Try fetch from online API
        const onlineData = await api.getStudents();
        if (onlineData && onlineData.length > 0) {
            setStudentsData(onlineData);
        } else {
            console.log("Using Mock Data (API empty or failed)");
            setStudentsData(MOCK_STUDENTS);
        }
        setIsLoading(false);
    };
    initData();
  }, [dataVersion]);

  const refreshData = () => {
      setDataVersion(prev => prev + 1);
  };

  // Sync back to Cloud whenever critical update happens (Optional: Optimistic UI)
  const saveStudentToCloud = async (student: Student) => {
      await api.updateStudent(student);
      refreshData();
  };

  const handleDocumentUpdate = async (file: File, category: string) => {
    if (!selectedStudent) return;
    
    // Optimistic Update UI
    let newDocs = category === 'LAINNYA' ? [...selectedStudent.documents] : selectedStudent.documents.filter(d => d.category !== category);
    const tempDoc: DocumentFile = {
        id: 'temp-' + Math.random(),
        name: file.name,
        type: file.type.includes('pdf') ? 'PDF' : 'IMAGE',
        url: URL.createObjectURL(file), 
        category: category as any,
        uploadDate: new Date().toISOString().split('T')[0],
        size: 'Uploading...',
        status: 'PENDING'
    };
    selectedStudent.documents = [...newDocs, tempDoc];
    setStudentsData(prev => prev.map(s => s.id === selectedStudent.id ? selectedStudent : s));

    // Upload to Google Drive via API
    try {
        const driveUrl = await api.uploadFile(file, selectedStudent.id, category);
        if (driveUrl) {
            // Update with real URL and Drive ID
            const realDoc: DocumentFile = {
                ...tempDoc,
                id: Math.random().toString(36).substr(2, 9),
                url: driveUrl, // Google Drive Link
                size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
            };
            selectedStudent.documents = [...newDocs, realDoc];
            // Sync metadata to sheet
            await saveStudentToCloud(selectedStudent);
        }
    } catch (e) {
        alert("Gagal upload file ke Google Drive.");
        // Revert
        selectedStudent.documents = newDocs;
        refreshData();
    }
  };

  const handleDocumentDelete = (docId: string) => {
      if (!selectedStudent) return;
      if(window.confirm("Apakah Anda yakin ingin menghapus dokumen ini?")) {
        selectedStudent.documents = selectedStudent.documents.filter(d => d.id !== docId);
        saveStudentToCloud(selectedStudent);
      }
  };

  const notifications = useMemo<DashboardNotification[]>(() => {
      const notifs: DashboardNotification[] = [];

      if (userRole === 'ADMIN' || userRole === 'GURU') {
          studentsData.forEach(s => {
              const pendingCorrections = s.correctionRequests?.filter(r => r.status === 'PENDING') || [];
              if (pendingCorrections.length > 0) {
                  notifs.push({
                      id: `corr-${s.id}`,
                      type: 'ADMIN_VERIFY',
                      title: `Verifikasi Data: ${s.fullName}`,
                      description: `${pendingCorrections.length} usulan revisi (termasuk nilai) menunggu persetujuan.`,
                      date: 'Hari ini',
                      priority: 'HIGH',
                      data: { student: s, fieldKey: pendingCorrections[0].fieldKey }
                  });
              }

              const pendingDocs = s.documents?.filter(d => d.status === 'PENDING') || [];
              if (pendingDocs.length > 0) {
                   notifs.push({
                      id: `doc-${s.id}`,
                      type: 'ADMIN_DOC_VERIFY',
                      title: `Verifikasi Dokumen: ${s.fullName}`,
                      description: `${pendingDocs.length} dokumen baru diupload (${pendingDocs.map(d => d.category).join(', ')}).`,
                      date: 'Hari ini',
                      priority: 'MEDIUM',
                      data: { student: s, docId: pendingDocs[0].id }
                  });
              }
          });
      } else if (userRole === 'STUDENT' && selectedStudent) {
          // ... (Existing student notification logic same as before) ...
      }

      return notifs;
  }, [userRole, studentsData, selectedStudent, dataVersion]);

  const handleLogin = (role: UserRole, studentData?: Student) => {
      setUserRole(role);
      setIsAuthenticated(true);
      
      if (role === 'STUDENT' && studentData) {
          setSelectedStudent(studentData);
          setCurrentView('dashboard');
      } else {
          setCurrentView('dashboard');
      }
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setSelectedStudent(null);
      setUserRole('ADMIN');
      setTargetHighlightField(undefined);
      setTargetHighlightDoc(undefined);
      setTargetVerificationStudentId(undefined);
  };

  const handleNotificationClick = (notif: DashboardNotification) => {
      if (userRole === 'ADMIN' || userRole === 'GURU') {
          if (notif.data?.student) {
              if (notif.type === 'ADMIN_VERIFY') {
                   setSelectedStudent(notif.data.student);
                   setTargetHighlightField(notif.data.fieldKey);
                   setCurrentView('dapodik'); 
              } else if (notif.type === 'ADMIN_DOC_VERIFY') {
                   setTargetVerificationStudentId(notif.data.student.id);
                   setCurrentView('verification');
              }
          }
      } else {
          // ... (Student logic same) ...
      }
  };

  if (isLoading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F2F5]">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <h2 className="text-xl font-bold text-gray-700">Menghubungkan ke Database...</h2>
              <p className="text-gray-500">Mohon tunggu sebentar.</p>
          </div>
      );
  }

  if (!isAuthenticated) {
    // Pass studentsData to Login
    return <Login onLogin={handleLogin} students={studentsData} />;
  }

  let profileImageSrc = `https://api.dicebear.com/7.x/avataaars/svg?seed=Admin`;
  if (userRole === 'STUDENT' && selectedStudent) {
      const uploadedPhoto = selectedStudent.documents.find(d => d.category === 'FOTO');
      if (uploadedPhoto && uploadedPhoto.url) {
          profileImageSrc = uploadedPhoto.url;
      } else {
          profileImageSrc = `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedStudent.nisn}`;
      }
  }

  const renderContent = () => {
    // Shared Student Detail logic (For Profile / Buku Induk)
    if (selectedStudent && currentView === 'dapodik') {
      return (
        <StudentDetail 
          student={selectedStudent} 
          onBack={() => {
              if (userRole === 'ADMIN' || userRole === 'GURU') {
                  setSelectedStudent(null);
                  setTargetHighlightField(undefined);
                  setTargetHighlightDoc(undefined);
              } else {
                  setCurrentView('dashboard');
              }
          }} 
          viewMode={userRole === 'STUDENT' ? 'student' : 'dapodik'}
          readOnly={userRole === 'STUDENT'} 
          highlightFieldKey={targetHighlightField} 
          highlightDocumentId={undefined} 
          onUpdate={() => saveStudentToCloud(selectedStudent)}
        />
      );
    }
    
    // Student Document View
    if (selectedStudent && currentView === 'documents') {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-full overflow-hidden flex flex-col">
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Dokumen Digital</h3>
                    <p className="text-sm text-gray-500">Kelola dokumen persyaratan sekolah Anda di sini.</p>
                </div>
                <FileManager 
                    documents={selectedStudent.documents} 
                    onUpload={handleDocumentUpdate}
                    onDelete={handleDocumentDelete}
                    highlightDocumentId={targetHighlightDoc}
                />
            </div>
        );
    }

    // Role-based views
    switch (currentView) {
    case 'dashboard':
        return <Dashboard notifications={notifications} onNotificationClick={handleNotificationClick} userRole={userRole} students={studentsData} />;
    case 'dapodik':
        return (userRole === 'ADMIN') ? ( // Guru cannot access Dapodik List
          <DapodikList 
              students={studentsData} 
              onSelectStudent={(s) => setSelectedStudent(s)} 
          />
        ) : null;
    case 'database':
        return userRole === 'ADMIN' ? <DatabaseView students={studentsData} /> : null;
    case 'buku-induk':
        return <BukuIndukView students={studentsData} />;
    case 'grades':
        return (
            <GradesView 
                students={studentsData} 
                userRole={userRole} 
                loggedInStudent={selectedStudent || undefined}
                onUpdate={refreshData}
            />
        );
    case 'recap':
        return (
            <RecapView 
                students={studentsData} 
                userRole={userRole} 
                loggedInStudent={selectedStudent || undefined}
            />
        );
    case 'ijazah':
        return (
            <IjazahView 
                students={studentsData} 
                userRole={userRole} 
                loggedInStudent={selectedStudent || undefined}
            />
        );
    case 'verification':
        return (
            <VerificationView 
                students={studentsData} 
                targetStudentId={targetVerificationStudentId}
                onUpdate={refreshData}
            />
        );
    case 'history':
         return <HistoryView students={userRole === 'STUDENT' && selectedStudent ? [selectedStudent] : studentsData} />;
    case 'reports':
        return (
            <ReportsView 
                students={studentsData} 
                onUpdate={refreshData}
            />
        );
    case 'settings':
        return <SettingsView />;
    case 'upload-rapor':
        return selectedStudent ? <UploadRaporView student={selectedStudent} onUpdate={() => saveStudentToCloud(selectedStudent)} /> : null;
    case 'grade-verification':
        return <GradeVerificationView students={studentsData} onUpdate={refreshData} />;
    case 'student-docs': // New Route
        return <StudentDocsAdminView students={studentsData} onUpdate={refreshData} />;
    default:
        return <Dashboard />;
    }
  };

  return (
    <div 
        className="flex h-screen font-sans text-gray-900 overflow-hidden selection:bg-blue-200 bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: `url('https://4kwallpapers.com/images/wallpapers/macos-big-sur-apple-layers-fluidic-colorful-wwdc-stock-3840x2160-1455.jpg')` }}
    >
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px] z-0"></div>

      <div className="relative z-10 flex h-full w-full">
        {/* Transparent Sidebar */}
        <Sidebar 
            currentView={currentView} 
            setView={(view) => {
                setCurrentView(view);
                if(view === 'dashboard' && (userRole === 'ADMIN' || userRole === 'GURU')) setSelectedStudent(null);
            }} 
            onLogout={handleLogout} 
            isCollapsed={isSidebarCollapsed}
            toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            userRole={userRole}
        />

        {/* Main Content Area */}
        <main 
            className={`flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300 rounded-tl-3xl shadow-[0_0_40px_rgba(0,0,0,0.1)] border-l border-white/20 bg-[#F5F5F7]/95 backdrop-blur-md`}
        >
            {/* Header */}
            <header className="h-16 flex items-center justify-between px-8 border-b border-gray-200/60 sticky top-0 z-20 print:hidden shrink-0">
                <div className="flex items-center gap-4">
                    {/* Header Title */}
                    <h2 className="text-xl font-bold text-gray-800 capitalize tracking-tight flex items-center gap-2 drop-shadow-sm">
                        {selectedStudent && currentView === 'dapodik' ? (userRole === 'ADMIN' ? 'Detail Data Siswa' : 'Buku Induk Siswa') : 
                        currentView === 'documents' ? 'Dokumen Saya' :
                        currentView === 'database' ? 'Database Lengkap' : 
                        currentView === 'history' ? 'Riwayat & Log' :
                        currentView === 'buku-induk' ? 'Buku Induk Siswa' :
                        currentView === 'grades' ? 'Nilai Siswa' :
                        currentView === 'recap' ? 'Rekap 5 Semester' :
                        currentView === 'ijazah' ? 'Nilai Ijazah (6 Semester)' :
                        currentView === 'verification' ? 'Verifikasi Buku Induk' :
                        currentView === 'settings' ? 'Pengaturan Sistem' :
                        currentView === 'upload-rapor' ? 'Upload Rapor' :
                        currentView === 'grade-verification' ? 'Verifikasi Nilai' :
                        currentView === 'reports' ? 'Laporan & Monitoring' :
                        currentView === 'student-docs' ? 'Dokumen Siswa (Admin)' :
                        'Dashboard Utama'}
                    </h2>
                </div>

                <div className="flex items-center space-x-6">
                    {(userRole === 'ADMIN' || userRole === 'GURU') && (
                        <div className="relative hidden md:block group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Pencarian Global..." 
                                className="pl-9 pr-4 py-1.5 bg-gray-200/50 hover:bg-white rounded-lg text-sm border border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:outline-none transition-all w-64 shadow-sm"
                            />
                        </div>
                    )}
                    
                    <div className="flex items-center gap-4">
                        <button className="relative p-2 text-gray-600 hover:bg-gray-200/50 rounded-full transition-colors">
                            <Bell className="w-5 h-5" />
                            {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>}
                        </button>
                        
                        <div 
                            className="relative"
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                        >
                            <div className="flex items-center gap-3 pl-4 border-l border-gray-300/50 cursor-pointer hover:bg-gray-200/50 p-1 rounded-lg transition-colors group">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                                        {userRole === 'ADMIN' ? 'Admin TU' : userRole === 'GURU' ? 'Guru Mapel' : selectedStudent?.fullName || 'Siswa'}
                                    </p>
                                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                                        {userRole === 'ADMIN' ? 'Operator' : userRole === 'GURU' ? 'Pengajar' : 'Siswa'}
                                    </p>
                                </div>
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 p-[2px] shadow-md">
                                    <img 
                                        src={profileImageSrc} 
                                        alt="Profile" 
                                        className="w-full h-full rounded-full bg-white object-cover"
                                    />
                                </div>
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                            </div>

                            {isProfileOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
                                    <div className="absolute right-0 mt-2 w-48 bg-white/80 backdrop-blur-xl rounded-xl shadow-xl border border-white/50 py-1 z-50 animate-fade-in">
                                        <button onClick={() => { setIsProfileOpen(false); handleLogout(); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-500 hover:text-white flex items-center gap-2 transition-colors rounded-xl">
                                            <LogOut className="w-4 h-4" /> Keluar
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 p-6 overflow-hidden relative">
                {renderContent()}
            </div>
        </main>
      </div>
    </div>
  );
};

export default App;