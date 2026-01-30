
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Database, Book, ClipboardList, Calculator, 
  FileBadge, Award, ClipboardCheck, ScrollText, FileCheck2, 
  FileInput, History, LayoutTemplate, Settings, LogOut, Menu,
  User, Bell, Loader2, Calendar
} from 'lucide-react';

// Components
import Sidebar from './components/Sidebar';
import Dashboard, { DashboardNotification } from './components/Dashboard';
import Login from './components/Login';
import DatabaseView from './components/DatabaseView';
import BukuIndukView from './components/BukuIndukView';
import GradesView from './components/GradesView';
import RecapView from './components/RecapView';
import SKLView from './components/SKLView';
import IjazahView from './components/IjazahView';
import VerificationView from './components/VerificationView';
import IjazahVerificationView from './components/IjazahVerificationView';
import GradeVerificationView from './components/GradeVerificationView';
import StudentDocsAdminView from './components/StudentDocsAdminView';
import HistoryView from './components/HistoryView';
import MonitoringView from './components/MonitoringView';
import SettingsView from './components/SettingsView';
import StudentDetail from './components/StudentDetail'; 
import UploadRaporView from './components/UploadRaporView'; 
import FileManager from './components/FileManager'; 

// Services & Types
import { api } from './services/api';
import { Student, DocumentFile } from './types';
import { MOCK_STUDENTS } from './services/mockData';

// --- HELPER TO CONVERT DRIVE URLs TO VIEWABLE IMAGE URLs ---
const getPhotoUrl = (url: string | undefined | null) => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    
    // Robust Google Drive URL parser
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
        let id = '';
        
        // Match /d/ID pattern
        const parts = url.split(/\/d\//);
        if (parts.length > 1) {
            id = parts[1].split('/')[0];
        }
        
        // Match id=ID pattern (fallback)
        if (!id) {
            const match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (match) id = match[1];
        }

        if (id) {
            // Preserve cache buster if exists
            const tMatch = url.match(/[?&]t=([0-9]+)/);
            const tParam = tMatch ? `&t=${tMatch[1]}` : '';
            // Use Google Drive uc (User Content) export view
            return `https://drive.google.com/uc?export=view&id=${id}${tParam}`;
        }
    }
    
    return url;
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'ADMIN' | 'GURU' | 'STUDENT' | null>(null);
  const [currentUser, setCurrentUser] = useState<{id: string, name: string} | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null); 
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Target ID for notifications navigation
  const [targetNotificationStudentId, setTargetNotificationStudentId] = useState<string | undefined>(undefined);

  // Profile & School Data State
  const [adminProfile, setAdminProfile] = useState({ name: 'Administrator' });
  const [schoolName, setSchoolName] = useState('SMPN 3 Pacet'); // Default fallback
  const [studentVisibleDocs, setStudentVisibleDocs] = useState<string[] | undefined>(undefined);
  const [academicInfo, setAcademicInfo] = useState({ year: '2024/2025', semester: 1 }); // New State
  
  // CRITICAL FIX: Sync selectedStudent with the latest data from students array
  // This ensures that when students array updates (after save/upload), the Student View gets the new data immediately
  useEffect(() => {
      if (selectedStudent && students.length > 0) {
          const freshStudentData = students.find(s => s.id === selectedStudent.id);
          if (freshStudentData) {
              // Only update if there are actual changes to prevent loops, 
              // or simply update to ensure freshness (React handles diffing)
              if (JSON.stringify(freshStudentData) !== JSON.stringify(selectedStudent)) {
                  setSelectedStudent(freshStudentData);
              }
          }
      }
  }, [students, selectedStudent]);

  // TRIGGER RE-FETCH PROFILE (Callback from SettingsView)
  const refreshProfile = async () => {
      // Re-fetch Settings for Name & School Name
      try {
          const settings = await api.getAppSettings();
          if (settings) {
              setAdminProfile({
                  name: settings.adminName || 'Administrator',
              });
              if (settings.schoolData && settings.schoolData.name) {
                  setSchoolName(settings.schoolData.name);
              }
              // Refresh doc settings too
              if (settings.docConfig && settings.docConfig.studentVisible) {
                  setStudentVisibleDocs(settings.docConfig.studentVisible);
              }
              // Refresh Academic Info
              if (settings.academicData) {
                  setAcademicInfo({
                      year: settings.academicData.activeYear || '2024/2025',
                      semester: Number(settings.academicData.activeSemester) || 1
                  });
              }
          }
      } catch (e) {}
  };

  // INITIAL LOAD: Fetch Admin Profile & School Data from Cloud Settings
  useEffect(() => {
      const fetchProfile = async () => {
          try {
              const settings = await api.getAppSettings();
              if (settings) {
                  setAdminProfile({
                      name: settings.adminName || 'Administrator',
                  });
                  if (settings.schoolData && settings.schoolData.name) {
                      setSchoolName(settings.schoolData.name);
                  }
                  if (settings.docConfig && settings.docConfig.studentVisible) {
                      setStudentVisibleDocs(settings.docConfig.studentVisible);
                  }
                  if (settings.academicData) {
                      setAcademicInfo({
                          year: settings.academicData.activeYear || '2024/2025',
                          semester: Number(settings.academicData.activeSemester) || 1
                      });
                  }
              } else {
                  // Fallback
                  const savedAdminName = localStorage.getItem('admin_name');
                  setAdminProfile({
                      name: savedAdminName || 'Administrator',
                  });
              }
          } catch (e) {
              console.warn("Failed to load admin profile from cloud");
          }
      };
      
      fetchProfile();
  }, []);

  // --- DATA FETCHING ---
  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const data = await api.getStudents();
      if (data && data.length > 0) {
        // Use functional state update to prevent stale closures
        setStudents(prev => data);
      } else {
        setStudents(MOCK_STUDENTS); 
      }
    } catch (error) {
      console.error("Failed to fetch students, using mock", error);
      setStudents(MOCK_STUDENTS);
    } finally {
      setIsLoading(false);
    }
  };

  // UPDATED: Fetch students immediately on mount so they are available for Login screen
  useEffect(() => {
      fetchStudents();
  }, []);

  // --- GENERATE NOTIFICATIONS DYNAMICALLY ---
  const notifications = useMemo(() => {
      const list: DashboardNotification[] = [];

      students.forEach(s => {
          // --- LOGIC ADMIN (Melihat semua siswa) ---
          if (userRole === 'ADMIN' || userRole === 'GURU') {
              // 1. CHECK DOCUMENTS (UPLOADED & PENDING)
              s.documents.forEach(doc => {
                  if (doc.status === 'PENDING') {
                      if (doc.category === 'RAPOR') {
                          // Upload Rapor -> Verifikasi Nilai
                          list.push({
                              id: `doc-${doc.id}`,
                              type: 'ADMIN_GRADE_VERIFY',
                              title: 'Upload Rapor Baru',
                              description: `${s.fullName} mengupload Rapor Semester ${doc.subType?.semester || '-'}`,
                              date: doc.uploadDate,
                              priority: 'MEDIUM',
                              data: s.id
                          });
                      } else if (doc.category === 'IJAZAH' || doc.category === 'SKL') {
                          // Upload Ijazah -> Verifikasi Ijazah
                          list.push({
                              id: `doc-${doc.id}`,
                              type: 'ADMIN_IJAZAH_VERIFY',
                              title: 'Upload Dokumen Ijazah',
                              description: `${s.fullName} mengupload file ${doc.category}`,
                              date: doc.uploadDate,
                              priority: 'HIGH',
                              data: s.id
                          });
                      } else {
                          // Upload Dokumen Lain (KK, Akta, dll) -> Verifikasi Buku Induk
                          list.push({
                              id: `doc-${doc.id}`,
                              type: 'ADMIN_DOC_VERIFY',
                              title: 'Dokumen Buku Induk',
                              description: `${s.fullName} mengupload ${doc.name} (${doc.category})`,
                              date: doc.uploadDate,
                              priority: 'MEDIUM',
                              data: s.id
                          });
                      }
                  }
              });

              // 2. CHECK CORRECTION REQUESTS (EDIT DATA & PENDING)
              if (s.correctionRequests) {
                  s.correctionRequests.forEach(req => {
                      if (req.status === 'PENDING') {
                          let type: DashboardNotification['type'] = 'ADMIN_BIO_VERIFY';
                          let title = 'Pengajuan Perubahan Data';

                          // Routing Logic based on Field Key
                          if (req.fieldKey.startsWith('grade-') || req.fieldKey.startsWith('class-')) {
                              // Edit Nilai/Kelas -> Verifikasi Nilai
                              type = 'ADMIN_GRADE_VERIFY';
                              title = 'Koreksi Nilai/Kelas';
                          } else if (req.fieldKey.startsWith('ijazah-') || req.fieldKey === 'diplomaNumber') {
                              // Edit Ijazah -> Verifikasi Ijazah
                              type = 'ADMIN_IJAZAH_VERIFY';
                              title = 'Koreksi Data Ijazah';
                          } else {
                              // Edit Biodata -> Verifikasi Buku Induk
                              type = 'ADMIN_BIO_VERIFY';
                              title = 'Koreksi Data Buku Induk';
                          }

                          list.push({
                              id: `req-${req.id}`,
                              type: type,
                              title: title,
                              description: `${s.fullName} mengajukan perubahan pada ${req.fieldName}`,
                              date: new Date(req.requestDate).toISOString().split('T')[0],
                              priority: 'HIGH',
                              data: s.id
                          });
                      }
                  });
              }
          } 
          
          // --- LOGIC SISWA (Hanya melihat notifikasi miliknya sendiri) ---
          else if (userRole === 'STUDENT' && currentUser?.id === s.id) {
              // 1. Cek Dokumen Revisi
              s.documents.forEach(doc => {
                  if (doc.status === 'REVISION') {
                      let title = 'Revisi Dokumen';
                      if (doc.category === 'RAPOR') title = 'Revisi Rapor';
                      else if (doc.category === 'IJAZAH' || doc.category === 'SKL') title = 'Revisi Ijazah/SKL';
                      
                      list.push({
                          id: `doc-rev-${doc.id}`,
                          type: 'STUDENT_REVISION',
                          title: title,
                          description: `Dokumen ${doc.category} perlu diperbaiki. Catatan: ${doc.adminNote || '-'}`,
                          date: doc.verificationDate || doc.uploadDate,
                          priority: 'HIGH',
                          data: s.id,
                          verifierName: doc.verifierName
                      });
                  }
              });

              // 2. Cek Status Pengajuan (Ditolak/Disetujui)
              if (s.correctionRequests) {
                  s.correctionRequests.forEach(req => {
                      if (req.status === 'REJECTED' || req.status === 'APPROVED') {
                          let title = 'Status Pengajuan Data';
                          // Context Title
                          if (req.fieldKey.startsWith('grade-')) title = 'Pengajuan Nilai';
                          else if (req.fieldKey.startsWith('ijazah-')) title = 'Pengajuan Ijazah';
                          else title = 'Pengajuan Buku Induk';

                          title += ` ${req.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}`;

                          list.push({
                              id: `req-stat-${req.id}`,
                              type: req.status === 'APPROVED' ? 'STUDENT_APPROVED' : 'STUDENT_REVISION',
                              title: title,
                              description: `Pengajuan perubahan ${req.fieldName} telah ${req.status === 'APPROVED' ? 'disetujui' : 'ditolak'}.`,
                              date: req.processedDate || req.requestDate,
                              priority: 'MEDIUM',
                              data: s.id,
                              verifierName: req.verifierName
                          });
                      }
                  });
              }
          }
      });

      // Sort by date descending
      return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [students, userRole, currentUser]);

  // --- NOTIFICATION HANDLER ---
  const handleNotificationClick = (notif: DashboardNotification) => {
      setTargetNotificationStudentId(notif.data); // Set the target ID for view to consume

      if (userRole === 'STUDENT') {
          // --- LOGIC ROUTING SISWA ---
          const titleLower = notif.title.toLowerCase();
          const descLower = notif.description.toLowerCase();

          if (titleLower.includes('rapor') || descLower.includes('rapor')) {
              setCurrentView('upload-rapor');
          } else if (titleLower.includes('ijazah') || titleLower.includes('skl') || descLower.includes('ijazah')) {
              setCurrentView('data-ijazah');
          } else if (titleLower.includes('nilai') || titleLower.includes('grade') || descLower.includes('nilai')) {
              setCurrentView('grades');
          } else if (titleLower.includes('buku induk') || titleLower.includes('biodata') || descLower.includes('data diri')) {
              setCurrentView('dapodik');
          } else {
              // Default ke dokumen saya jika tidak spesifik
              setCurrentView('documents');
          }
      } else {
          // --- LOGIC ROUTING ADMIN/GURU ---
          if (notif.type === 'ADMIN_DOC_VERIFY' || notif.type === 'ADMIN_BIO_VERIFY') {
              setCurrentView('verification'); // Go to Buku Induk Verification
          } else if (notif.type === 'ADMIN_GRADE_VERIFY') {
              setCurrentView('grade-verification'); // Go to Grade Verification
          } else if (notif.type === 'ADMIN_IJAZAH_VERIFY') {
              setCurrentView('ijazah-verification'); // Go to Ijazah Verification
          }
      }
  };

  // --- HANDLERS ---
  const handleLogin = (role: 'ADMIN' | 'GURU' | 'STUDENT', studentData?: Student) => {
    setIsLoggedIn(true);
    setUserRole(role);
    if (role === 'STUDENT' && studentData) {
      setSelectedStudent(studentData);
      setCurrentUser({ id: studentData.id, name: studentData.fullName });
    } else if (role === 'GURU') {
        setCurrentUser({ id: 'guru-1', name: 'Bapak/Ibu Guru' });
    } else {
        setCurrentUser({ id: 'admin', name: adminProfile.name });
    }
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    setSelectedStudent(null);
    setCurrentUser(null);
    setCurrentView('dashboard');
  };

  const handleUpdateStudents = (updatedStudents: Student[]) => {
    setStudents(updatedStudents);
  };

  const refreshData = () => {
    fetchStudents();
  };

  // --- STUDENT UPLOAD HANDLER ---
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
              
              const updatedStudent = { ...selectedStudent };
              if (category !== 'RAPOR') {
                  updatedStudent.documents = updatedStudent.documents.filter(d => d.category !== category);
              }
              updatedStudent.documents.push(newDoc);
              
              await api.updateStudent(updatedStudent);
              refreshData(); // Triggers global update, which triggers useEffect sync for selectedStudent
              alert("File berhasil diupload!");
          } else {
              alert("Gagal upload file.");
          }
      } catch (e) {
          console.error(e);
          alert("Terjadi kesalahan saat upload.");
      }
  };

  const handleStudentDelete = async (docId: string) => {
      if (!selectedStudent) return;
      if (window.confirm("Apakah Anda yakin ingin menghapus dokumen ini?")) {
          const updatedDocs = selectedStudent.documents.filter(d => d.id !== docId);
          const updatedStudent = { ...selectedStudent, documents: updatedDocs };
          
          try {
              await api.updateStudent(updatedStudent);
              refreshData();
              alert("Dokumen berhasil dihapus.");
          } catch (e) {
              console.error(e);
              alert("Gagal menghapus dokumen.");
          }
      }
  };

  // --- TOP BAR DISPLAY INFO ---
  const getProfileInfo = () => {
      if (userRole === 'STUDENT' && selectedStudent) {
          // Find FOTO document
          const photoDoc = selectedStudent.documents.find(d => d.category === 'FOTO');
          const photoUrl = photoDoc ? getPhotoUrl(photoDoc.url) : null;
          
          return {
              name: selectedStudent.fullName,
              role: `Siswa - Kelas ${selectedStudent.className}`,
              photo: photoUrl
          };
      } else if (userRole === 'GURU') {
          return {
              name: currentUser?.name || 'Guru Pengajar',
              role: 'Guru Wali Kelas',
              photo: null 
          };
      } else {
          return {
              name: adminProfile.name,
              role: 'Administrator',
              photo: null 
          };
      }
  };

  const profile = getProfileInfo();

  // --- RENDER CONTENT SWITCHER ---
  const renderContent = () => {
    // For student role, we always pass the *selectedStudent* which is kept fresh by useEffect
    const studentContext = userRole === 'STUDENT' ? selectedStudent : undefined;

    switch (currentView) {
      case 'dashboard':
        return <Dashboard notifications={notifications} onNotificationClick={handleNotificationClick} userRole={userRole || 'ADMIN'} students={students} schoolName={schoolName} />;
      
      // ADMIN VIEWS
      case 'database':
        return <DatabaseView students={students} onUpdateStudents={handleUpdateStudents} />;
      case 'buku-induk':
        return <BukuIndukView students={students} />;
      case 'student-docs':
        return <StudentDocsAdminView students={students} onUpdate={refreshData} />;
      case 'verification':
        return <VerificationView students={students} targetStudentId={targetNotificationStudentId} onUpdate={refreshData} currentUser={{name: profile.name, role: 'ADMIN'}} />;
      case 'ijazah-verification':
        return <IjazahVerificationView students={students} targetStudentId={targetNotificationStudentId} onUpdate={refreshData} currentUser={{name: profile.name, role: 'ADMIN'}} />;
      case 'grade-verification':
        return <GradeVerificationView students={students} targetStudentId={targetNotificationStudentId} onUpdate={refreshData} currentUser={{name: profile.name, role: 'ADMIN'}} />;
      case 'settings':
        return <SettingsView onProfileUpdate={refreshProfile} />;
      
      // SHARED VIEWS (Different props based on role)
      case 'grades':
        return <GradesView students={students} userRole={userRole || 'ADMIN'} loggedInStudent={studentContext || undefined} onUpdate={refreshData} />;
      case 'recap':
        return <RecapView students={students} userRole={userRole || 'ADMIN'} loggedInStudent={studentContext || undefined} />;
      case 'skl':
        return <SKLView students={students} userRole={userRole || 'ADMIN'} loggedInStudent={studentContext || undefined} />;
      case 'data-ijazah':
        return <IjazahView students={students} userRole={userRole || 'ADMIN'} loggedInStudent={studentContext || undefined} />;
      case 'history':
        return <HistoryView students={userRole === 'STUDENT' && studentContext ? [studentContext] : students} />;
      case 'monitoring':
        return <MonitoringView students={students} userRole={userRole || 'ADMIN'} loggedInStudent={studentContext || undefined} />;

      // STUDENT SPECIFIC VIEWS
      case 'dapodik': 
        return studentContext ? (
            <StudentDetail 
                student={studentContext} 
                onBack={() => setCurrentView('dashboard')} 
                viewMode="student" 
                readOnly={true}
                onUpdate={refreshData}
            />
        ) : null;
      
      case 'documents':
        return studentContext ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col p-4 animate-fade-in">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FileInput className="w-5 h-5 text-blue-600" /> Dokumen Saya
                </h2>
                <div className="flex-1 overflow-hidden">
                    <FileManager 
                        documents={studentContext.documents} 
                        onUpload={handleStudentUpload}
                        onDelete={handleStudentDelete} 
                        allowedCategories={studentVisibleDocs}
                    />
                </div>
            </div>
        ) : null;

      case 'upload-rapor':
        return studentContext ? (
            <UploadRaporView student={studentContext} onUpdate={refreshData} />
        ) : null;

      default:
        return <Dashboard notifications={notifications} onNotificationClick={handleNotificationClick} userRole={userRole || 'ADMIN'} students={students} schoolName={schoolName} />;
    }
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} students={students} schoolName={schoolName} />;
  }

  return (
    <div className="flex h-screen bg-mac-bg overflow-hidden font-sans text-mac-text">
      {!isSidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarCollapsed(true)}
        ></div>
      )}

      <Sidebar
        currentView={currentView}
        setView={(view) => { setCurrentView(view); if(window.innerWidth < 768) setIsSidebarCollapsed(true); }}
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        userRole={userRole || 'ADMIN'}
        schoolName={schoolName}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative transition-all duration-300">
        
        {/* MOBILE HEADER (Legacy) */}
        <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 flex items-center justify-between z-10 sticky top-0">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Menu className="w-6 h-6" />
                </button>
                <span className="font-bold text-gray-800">SiData {schoolName}</span>
            </div>
            {/* Mobile Profile Icon */}
            <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-300 relative">
                {profile.photo ? (
                    <img 
                        src={profile.photo} 
                        className="w-full h-full object-cover" 
                        alt="Profile" 
                        referrerPolicy="no-referrer" 
                    />
                ) : (
                    <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                        <User className="w-5 h-5" />
                    </div>
                )}
            </div>
        </header>

        {/* DESKTOP TOP BAR */}
        <header className="hidden md:flex bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
             {/* Page Title */}
             <div className="flex items-center">
                 <h2 className="text-lg font-bold text-gray-700 capitalize tracking-tight">
                    {currentView.replace(/-/g, ' ')}
                 </h2>
             </div>

             {/* Right Section */}
             <div className="flex items-center gap-6">
                
                {/* NEW: ACADEMIC INFO */}
                <div className="hidden lg:flex flex-col items-end justify-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Tahun Pelajaran
                    </span>
                    <span className="text-sm font-bold text-blue-700">
                        {academicInfo.year} - Sem {academicInfo.semester}
                    </span>
                </div>

                {/* Notification Bell */}
                <div className="relative cursor-pointer group">
                   <div className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                       <Bell className="w-5 h-5 text-gray-500 group-hover:text-blue-600" />
                   </div>
                   {notifications.length > 0 && (
                       <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                   )}
                </div>

                <div className="h-8 w-px bg-gray-300"></div>

                {/* Profile Section */}
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-sm font-bold text-gray-800 leading-none mb-1">{profile.name}</p>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{profile.role}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-sm ring-1 ring-gray-200 relative group-hover:ring-blue-300 transition-all">
                        {profile.photo ? (
                            <img 
                                src={profile.photo} 
                                className="w-full h-full object-cover" 
                                alt="Profile" 
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                                <User className="w-5 h-5" />
                            </div>
                        )}
                    </div>
                </div>
             </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6 scroll-smooth bg-mac-bg">
            <div className="max-w-[1600px] mx-auto h-full flex flex-col">
                {renderContent()}
            </div>
        </div>
      </main>
    </div>
  );
}

export default App;
