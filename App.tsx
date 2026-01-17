import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Database, Book, ClipboardList, Calculator, 
  FileBadge, Award, ClipboardCheck, ScrollText, FileCheck2, 
  FileInput, History, LayoutTemplate, Settings, LogOut, Menu,
  User, Camera, Bell, Loader2
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
import AccessDataView from './components/AccessDataView';
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
    
    // If it's a Drive URL, convert to direct view
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
        let id = '';
        const matchId = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        const matchIdParam = new URLSearchParams(new URL(url).search).get('id');

        if (matchId && matchId[1]) id = matchId[1];
        else if (matchIdParam) id = matchIdParam;

        if (id) {
            // Add a cache-buster based on current minute to prevent aggressive caching during session
            // But we will use the URL string itself for stability if not changed
            return `https://drive.google.com/uc?export=view&id=${id}`;
        }
    }
    return url;
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'ADMIN' | 'GURU' | 'STUDENT' | null>(null);
  const [currentUser, setCurrentUser] = useState<{id: string, name: string, photoUrl?: string} | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null); 
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Profile State
  const [adminProfile, setAdminProfile] = useState({ name: 'Administrator', photo: '' });
  const [guruPhoto, setGuruPhoto] = useState('');
  const profileInputRef = useRef<HTMLInputElement>(null);

  // INITIAL LOAD: Fetch Admin Profile from Cloud Settings
  useEffect(() => {
      const fetchProfile = async () => {
          try {
              const settings = await api.getAppSettings();
              if (settings) {
                  // Prioritize Cloud Settings
                  setAdminProfile({
                      name: settings.adminName || 'Administrator',
                      photo: settings.adminPhotoUrl || '' // Use Cloud URL
                  });
              } else {
                  // Fallback to LocalStorage if offline/fail
                  const savedAdminName = localStorage.getItem('admin_name');
                  const savedAdminPhoto = localStorage.getItem('admin_photo');
                  setAdminProfile({
                      name: savedAdminName || 'Administrator',
                      photo: savedAdminPhoto || ''
                  });
              }
          } catch (e) {
              console.warn("Failed to load admin profile from cloud");
          }
      };
      
      fetchProfile();
  }, []);

  // Update Guru Data when user changes (Fetch latest from User DB)
  useEffect(() => {
      const fetchGuruProfile = async () => {
          if (userRole === 'GURU' && currentUser) {
              try {
                  const users = await api.getUsers();
                  const me = users.find((u: any) => u.id === currentUser.id);
                  if (me && me.photoUrl) {
                      setGuruPhoto(me.photoUrl);
                  } else {
                      // Fallback
                      const savedPhoto = localStorage.getItem(`guru_photo_${currentUser.id}`);
                      setGuruPhoto(savedPhoto || '');
                  }
              } catch (e) {
                  console.error("Failed to fetch guru profile");
              }
          }
      };
      
      if (userRole === 'GURU') fetchGuruProfile();
  }, [userRole, currentUser]);

  // --- DATA FETCHING ---
  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const data = await api.getStudents();
      if (data && data.length > 0) {
        setStudents(data);
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

  useEffect(() => {
    if (isLoggedIn) {
      fetchStudents();
    }
  }, [isLoggedIn]);

  // --- NOTIFICATION LOGIC ---
  const notifications = useMemo(() => {
    const list: DashboardNotification[] = [];

    if (userRole === 'ADMIN' || userRole === 'GURU') {
      students.forEach(s => {
        s.documents.forEach(d => {
          if (d.status === 'PENDING') {
            let type: any = 'ADMIN_BIO_VERIFY'; 
            let title = 'Verifikasi Dokumen';
            
            if (d.category === 'RAPOR') {
                type = 'ADMIN_GRADE_VERIFY'; 
                title = 'Verifikasi Rapor';
            } 

            list.push({
              id: `doc-${d.id}`,
              type: type,
              title: title,
              description: `${s.fullName} mengupload ${d.category} (${d.name})`,
              date: d.uploadDate,
              priority: 'HIGH',
              data: { studentId: s.id, category: d.category } 
            });
          }
        });

        s.correctionRequests?.forEach(r => {
          if (r.status === 'PENDING') {
            let type: any = 'ADMIN_BIO_VERIFY';
            let title = 'Verifikasi Data Diri'; 
            
            if (r.fieldKey.startsWith('grade-')) {
               type = 'ADMIN_GRADE_VERIFY';
               title = 'Verifikasi Nilai';
            } else if (r.fieldKey === 'diplomaNumber' || r.fieldKey.startsWith('ijazah-')) {
               type = 'ADMIN_IJAZAH_VERIFY';
               title = 'Verifikasi Data Ijazah';
            } else if (r.fieldKey === 'class-' || r.fieldKey === 'className') {
                type = 'ADMIN_BIO_VERIFY';
                title = 'Verifikasi Kelas';
            }

            list.push({
              id: `req-${r.id}`,
              type: type,
              title: title,
              description: `${s.fullName}: ${r.fieldName} (${r.originalValue || '-'} ➔ ${r.proposedValue})`,
              date: r.requestDate.split('T')[0],
              priority: 'MEDIUM',
              data: { studentId: s.id, type: r.fieldKey.startsWith('grade-') ? 'grade' : 'bio' }
            });
          }
        });
      });

    } else if (userRole === 'STUDENT' && selectedStudent) {
      const currentData = students.find(s => s.id === selectedStudent.id) || selectedStudent;

      currentData.documents.forEach(d => {
        if (d.status === 'APPROVED') {
           list.push({
             id: `doc-ok-${d.id}`,
             type: 'STUDENT_APPROVED',
             title: 'Dokumen Disetujui',
             description: `Dokumen ${d.category} Anda telah disetujui oleh admin.`,
             date: d.verificationDate || new Date().toISOString().split('T')[0],
             priority: 'LOW',
             verifierName: d.verifierName
           });
        } else if (d.status === 'REVISION') {
           list.push({
             id: `doc-rev-${d.id}`,
             type: 'STUDENT_REVISION',
             title: 'Revisi Dokumen',
             description: `Dokumen ${d.category} ditolak. Catatan: "${d.adminNote}"`,
             date: d.verificationDate || new Date().toISOString().split('T')[0],
             priority: 'HIGH',
             verifierName: d.verifierName
           });
        }
      });

      currentData.correctionRequests?.forEach(r => {
         if (r.status === 'APPROVED') {
            list.push({
              id: `req-ok-${r.id}`,
              type: 'STUDENT_APPROVED',
              title: 'Perubahan Disetujui',
              description: `Pengajuan perubahan ${r.fieldName} telah disetujui.`,
              date: r.processedDate ? r.processedDate.split('T')[0] : '',
              priority: 'LOW',
              verifierName: r.verifierName
            });
         } else if (r.status === 'REJECTED') {
            list.push({
              id: `req-rej-${r.id}`,
              type: 'STUDENT_REVISION',
              title: 'Pengajuan Ditolak',
              description: `Pengajuan ${r.fieldName} ditolak. Alasan: "${r.adminNote}"`,
              date: r.processedDate ? r.processedDate.split('T')[0] : '',
              priority: 'HIGH',
              verifierName: r.verifierName
            });
         }
      });
      
      currentData.adminMessages?.forEach(msg => {
          list.push({
              id: `msg-${msg.id}`,
              type: 'STUDENT_REVISION',
              title: 'Pesan Admin',
              description: msg.content,
              date: msg.date.split('T')[0],
              priority: 'MEDIUM'
          });
      });
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [students, userRole, selectedStudent]);

  // --- HANDLERS ---
  const handleLogin = (role: 'ADMIN' | 'GURU' | 'STUDENT', studentData?: Student) => {
    setIsLoggedIn(true);
    setUserRole(role);
    if (role === 'STUDENT' && studentData) {
      setSelectedStudent(studentData);
      setCurrentUser({ id: studentData.id, name: studentData.fullName });
    } else if (role === 'GURU') {
        // Typically name is passed from Login component, simplified here
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
              refreshData();
              alert("File berhasil diupload!");
          } else {
              alert("Gagal upload file.");
          }
      } catch (e) {
          console.error(e);
          alert("Terjadi kesalahan saat upload.");
      }
  };

  // --- ONLINE PROFILE UPLOAD HANDLER ---
  const handleProfileClick = () => {
      if (userRole === 'ADMIN' || userRole === 'GURU') {
          profileInputRef.current?.click();
      }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !currentUser) return;

      setIsUploadingPhoto(true);
      try {
          // 1. Upload to Drive using 'PROFILE_PHOTO' category
          // Note: 'PROFILE_PHOTO' is a logical category, the API handles it
          const driveUrl = await api.uploadFile(file, currentUser.id, 'PROFILE_PHOTO');
          
          if (driveUrl) {
              // Add timestamp to force refresh
              const uniqueUrl = `${driveUrl}&t=${new Date().getTime()}`;

              if (userRole === 'ADMIN') {
                  // A. Admin: Save to App Settings
                  setAdminProfile(prev => ({ ...prev, photo: uniqueUrl }));
                  
                  // Get current settings to prevent overwrite, then update photo
                  const currentSettings = await api.getAppSettings() || {};
                  await api.saveAppSettings({
                      ...currentSettings,
                      adminPhotoUrl: uniqueUrl
                  });
                  
                  // Also save local for offline fallback
                  localStorage.setItem('admin_photo', uniqueUrl);

              } else if (userRole === 'GURU') {
                  // B. Guru: Save to Users List
                  setGuruPhoto(uniqueUrl);
                  
                  const allUsers = await api.getUsers();
                  const updatedUsers = allUsers.map((u: any) => {
                      if (u.id === currentUser.id) {
                          return { ...u, photoUrl: uniqueUrl };
                      }
                      return u;
                  });
                  
                  await api.updateUsers(updatedUsers);
                  // Local fallback
                  localStorage.setItem(`guru_photo_${currentUser.id}`, uniqueUrl);
              }
              alert("Foto profil berhasil diperbarui!");
          } else {
              alert("Gagal mengupload foto ke Cloud.");
          }
      } catch (e) {
          console.error("Profile Upload Error:", e);
          alert("Terjadi kesalahan saat upload.");
      } finally {
          setIsUploadingPhoto(false);
          // Clear input
          if (profileInputRef.current) profileInputRef.current.value = '';
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
              photo: getPhotoUrl(guruPhoto)
          };
      } else {
          return {
              name: adminProfile.name,
              role: 'Administrator',
              photo: getPhotoUrl(adminProfile.photo)
          };
      }
  };

  const profile = getProfileInfo();

  // --- RENDER CONTENT SWITCHER ---
  const renderContent = () => {
    const studentContext = userRole === 'STUDENT' && selectedStudent 
        ? students.find(s => s.id === selectedStudent.id) || selectedStudent 
        : undefined;

    switch (currentView) {
      case 'dashboard':
        return <Dashboard notifications={notifications} userRole={userRole || 'ADMIN'} students={students} />;
      
      // ADMIN VIEWS
      case 'database':
        return <DatabaseView students={students} onUpdateStudents={handleUpdateStudents} />;
      case 'buku-induk':
        return <BukuIndukView students={students} />;
      case 'student-docs':
        return <StudentDocsAdminView students={students} onUpdate={refreshData} />;
      case 'verification':
        return <VerificationView students={students} onUpdate={refreshData} currentUser={{name: profile.name, role: 'ADMIN'}} />;
      case 'ijazah-verification':
        return <IjazahVerificationView students={students} onUpdate={refreshData} currentUser={{name: profile.name, role: 'ADMIN'}} />;
      case 'grade-verification':
        return <GradeVerificationView students={students} onUpdate={refreshData} currentUser={{name: profile.name, role: 'ADMIN'}} />;
      case 'settings':
        return <SettingsView />;
      case 'access-data': 
        return <AccessDataView students={students} />;
      
      // SHARED VIEWS (Different props based on role)
      case 'grades':
        return <GradesView students={students} userRole={userRole || 'ADMIN'} loggedInStudent={studentContext} onUpdate={refreshData} />;
      case 'recap':
        return <RecapView students={students} userRole={userRole || 'ADMIN'} loggedInStudent={studentContext} />;
      case 'skl':
        return <SKLView students={students} userRole={userRole || 'ADMIN'} loggedInStudent={studentContext} />;
      case 'data-ijazah':
        return <IjazahView students={students} userRole={userRole || 'ADMIN'} loggedInStudent={studentContext} />;
      case 'history':
        return <HistoryView students={userRole === 'STUDENT' && studentContext ? [studentContext] : students} />;
      case 'monitoring':
        return <MonitoringView students={students} userRole={userRole || 'ADMIN'} loggedInStudent={studentContext} />;

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
                    />
                </div>
            </div>
        ) : null;

      case 'upload-rapor':
        return studentContext ? (
            <UploadRaporView student={studentContext} onUpdate={refreshData} />
        ) : null;

      default:
        return <Dashboard notifications={notifications} userRole={userRole || 'ADMIN'} students={students} />;
    }
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} students={students} />;
  }

  return (
    <div className="flex h-screen bg-mac-bg overflow-hidden font-sans text-mac-text">
      {/* Hidden Input for Profile Photo Upload */}
      <input 
          type="file" 
          ref={profileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handlePhotoUpload} 
      />

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
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative transition-all duration-300">
        
        {/* MOBILE HEADER (Legacy) */}
        <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 flex items-center justify-between z-10 sticky top-0">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Menu className="w-6 h-6" />
                </button>
                <span className="font-bold text-gray-800">SiData SMPN 3 Pacet</span>
            </div>
            {/* Mobile Profile Icon */}
            <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-300">
                {profile.photo ? (
                    <img src={profile.photo} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                    <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                        {profile.name.charAt(0)}
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
                <div 
                    className="flex items-center gap-3 cursor-pointer group" 
                    onClick={handleProfileClick}
                    title={userRole !== 'STUDENT' ? "Klik untuk ganti foto profil (Online)" : ""}
                >
                    <div className="text-right">
                        <p className="text-sm font-bold text-gray-800 leading-none mb-1">{profile.name}</p>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{profile.role}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-sm ring-1 ring-gray-200 relative group-hover:ring-blue-300 transition-all">
                        {isUploadingPhoto ? (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            </div>
                        ) : profile.photo ? (
                            <img src={profile.photo} className="w-full h-full object-cover" alt="Profile" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                                <User className="w-5 h-5" />
                            </div>
                        )}
                        
                        {/* Hover Overlay for Upload (Admin/Guru) */}
                        {(userRole === 'ADMIN' || userRole === 'GURU') && !isUploadingPhoto && (
                           <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center transition-opacity backdrop-blur-[1px]">
                              <Camera className="w-4 h-4 text-white" />
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