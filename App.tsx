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
import MonitoringView from './components/MonitoringView';
import ReportsView from './components/ReportsView';
import StudentDocsAdminView from './components/StudentDocsAdminView'; 
import Login from './components/Login';
import { MOCK_STUDENTS } from './services/mockData'; 
import { api } from './services/api'; 
import { Student, DocumentFile } from './types';
import { Search, Bell, ChevronDown, LogOut, User, Loader2, Cloud, CloudOff, RefreshCw } from 'lucide-react';

type UserRole = 'ADMIN' | 'STUDENT' | 'GURU';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [studentsData, setStudentsData] = useState<Student[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('ADMIN');
  const [currentUser, setCurrentUser] = useState<{name: string, role: string} | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Triggers & Navigation State
  const [dataVersion, setDataVersion] = useState(0); 
  const [targetHighlightField, setTargetHighlightField] = useState<string | undefined>(undefined);
  const [targetHighlightDoc, setTargetHighlightDoc] = useState<string | undefined>(undefined);
  const [targetVerificationStudentId, setTargetVerificationStudentId] = useState<string | undefined>(undefined); 
  
  // Track read notifications (Persistent per session)
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // FETCH DATA ON MOUNT & UPDATE
  useEffect(() => {
    const initData = async () => {
        // Show loading only on first load
        if (studentsData.length === 0) setIsLoading(true);

        try {
            // Try fetch from online API
            const onlineData = await api.getStudents();
            
            // If fetch success, use Cloud Data (even if empty array!)
            setStudentsData(onlineData);
            setIsCloudConnected(true);
        } catch (error) {
            console.error("Failed to connect to Cloud, using Mock Data", error);
            setIsCloudConnected(false);
            // Only fallback to Mock if Local Data is empty
            if (studentsData.length === 0) {
                setStudentsData(MOCK_STUDENTS);
            }
        } finally {
            setIsLoading(false);
        }
    };
    initData();
  }, [dataVersion]);

  // SYNC SELECTED STUDENT DATA
  useEffect(() => {
      if (selectedStudent && studentsData.length > 0) {
          const updatedStudent = studentsData.find(s => s.id === selectedStudent.id);
          // Only update if the object reference is different to avoid loops, 
          // but ensure we capture updates.
          if (updatedStudent && JSON.stringify(updatedStudent) !== JSON.stringify(selectedStudent)) {
              setSelectedStudent(updatedStudent);
          }
      }
  }, [studentsData, selectedStudent]);

  const refreshData = () => {
      setDataVersion(prev => prev + 1);
  };

  // UPDATED: Save Logic to update LOCAL STATE immediately
  const saveStudentToCloud = async (student: Student) => {
      // 1. Update Local State Immediately (Optimistic UI)
      // Ini mencegah data "kembali" ke status lama saat refresh belum selesai
      setStudentsData(prevStudents => 
          prevStudents.map(s => s.id === student.id ? student : s)
      );

      // 2. Send to API in background
      if (isCloudConnected) {
          await api.updateStudent(student);
      }
      
      // Note: Kita TIDAK memanggil refreshData() di sini agar data lokal yang baru saja diupdate
      // tidak tertimpa oleh data lama dari server jika server lambat merespon.
  };

  const handleDocumentUpdate = async (file: File, category: string) => {
    if (!selectedStudent) return;
    
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
    
    // Optimistic Update
    const updatedStudent = { ...selectedStudent, documents: [...newDocs, tempDoc] };
    setStudentsData(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
    setSelectedStudent(updatedStudent); // Update selected student view

    try {
        const driveUrl = await api.uploadFile(file, selectedStudent.id, category);
        if (driveUrl) {
            const realDoc: DocumentFile = {
                ...tempDoc,
                id: Math.random().toString(36).substr(2, 9),
                url: driveUrl, 
                size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
            };
            const finalStudent = { ...selectedStudent, documents: [...newDocs, realDoc] };
            setStudentsData(prev => prev.map(s => s.id === selectedStudent.id ? finalStudent : s));
            setSelectedStudent(finalStudent);
            await api.updateStudent(finalStudent);
        }
    } catch (e) {
        alert("Gagal upload file ke Google Drive.");
    }
  };

  const handleDocumentDelete = (docId: string) => {
      if (!selectedStudent) return;
      if(window.confirm("Apakah Anda yakin ingin menghapus dokumen ini?")) {
        const updatedDocs = selectedStudent.documents.filter(d => d.id !== docId);
        const updatedStudent = { ...selectedStudent, documents: updatedDocs };
        
        // Update Local & Save
        setStudentsData(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
        setSelectedStudent(updatedStudent);
        api.updateStudent(updatedStudent);
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
          selectedStudent.documents.forEach(d => {
              if (d.status === 'REVISION') {
                   notifs.push({
                      id: `doc-rev-${d.id}`,
                      type: 'STUDENT_REVISION',
                      title: `Revisi Diperlukan: ${d.name}`,
                      description: d.adminNote || 'Dokumen buram atau tidak sesuai. Silakan upload ulang.',
                      date: d.verificationDate || 'Baru saja',
                      priority: 'HIGH',
                      data: { docId: d.id },
                      verifierName: d.verifierName
                  });
              } else if (d.status === 'APPROVED') {
                  notifs.push({
                      id: `doc-app-${d.id}`,
                      type: 'STUDENT_APPROVED',
                      title: `Dokumen Disetujui: ${d.name}`,
                      description: 'Dokumen Anda telah diverifikasi.',
                      date: d.verificationDate || 'Baru saja',
                      priority: 'LOW',
                      data: { docId: d.id },
                      verifierName: d.verifierName
                  });
              }
          });

          selectedStudent.correctionRequests?.forEach(r => {
              if (r.status === 'APPROVED') {
                  notifs.push({
                      id: `req-app-${r.id}`,
                      type: 'STUDENT_APPROVED',
                      title: `Perubahan Disetujui: ${r.fieldName}`,
                      description: `Data ${r.fieldName} telah diperbarui sesuai permintaan.`,
                      date: 'Hari ini',
                      priority: 'LOW',
                      data: { fieldKey: r.fieldKey },
                      verifierName: r.verifierName
                  });
              } else if (r.status === 'REJECTED') {
                 notifs.push({
                      id: `req-rej-${r.id}`,
                      type: 'STUDENT_REVISION',
                      title: `Perubahan Ditolak: ${r.fieldName}`,
                      description: r.adminNote || 'Pengajuan anda ditolak.',
                      date: 'Hari ini',
                      priority: 'MEDIUM',
                      data: { fieldKey: r.fieldKey },
                      verifierName: r.verifierName
                  });
              }
          });
          
          selectedStudent.adminMessages?.forEach(msg => {
              notifs.push({
                  id: `msg-${msg.id}`,
                  type: 'STUDENT_REVISION',
                  title: 'Pesan dari Admin',
                  description: msg.content,
                  date: new Date(msg.date).toLocaleDateString(),
                  priority: 'HIGH'
              });
          });
      }

      // STRICT Filtering: Ensure notifications in 'readNotificationIds' are EXCLUDED
      return notifs.filter(n => !readNotificationIds.has(n.id));
  }, [userRole, studentsData, selectedStudent, dataVersion, readNotificationIds]);

  const handleLogin = (role: UserRole, studentData?: Student) => {
      setUserRole(role);
      setIsAuthenticated(true);
      
      if (role === 'ADMIN') {
          setCurrentUser({ name: 'Admin TU', role: 'ADMIN' });
      } else if (role === 'GURU') {
          setCurrentUser({ name: 'Guru Mapel', role: 'GURU' });
      } else {
          setCurrentUser({ name: studentData?.fullName || 'Siswa', role: 'STUDENT' });
      }

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
      setCurrentUser(null);
      setUserRole('ADMIN');
      setTargetHighlightField(undefined);
      setTargetHighlightDoc(undefined);
      setTargetVerificationStudentId(undefined);
      setReadNotificationIds(new Set()); 
  };

  const handleNotificationClick = (notif: DashboardNotification) => {
      setReadNotificationIds(prev => {
          const newSet = new Set(prev);
          newSet.add(notif.id);
          return newSet;
      });

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
          if (notif.type.includes('REVISION') || notif.type.includes('APPROVED')) {
               if (notif.data?.docId) {
                   setCurrentView('documents');
                   setTargetHighlightDoc(notif.data.docId);
               } else if (notif.data?.fieldKey) {
                    if (notif.data.fieldKey.includes('Nilai')) {
                        setCurrentView('grades');
                    } else {
                        setCurrentView('dapodik');
                        setTargetHighlightField(notif.data.fieldKey);
                    }
               }
          }
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
    let content;
    
    if (selectedStudent && currentView === 'dapodik') {
      content = (
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
          currentUser={currentUser || undefined}
        />
      );
    } else if (selectedStudent && currentView === 'documents') {
        content = (
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
    } else {
        switch (currentView) {
            case 'dashboard':
                content = <Dashboard notifications={notifications} onNotificationClick={handleNotificationClick} userRole={userRole} students={studentsData} />; break;
            case 'dapodik':
                content = (userRole === 'ADMIN') ? <DapodikList students={studentsData} onSelectStudent={(s) => setSelectedStudent(s)} /> : null; break;
            case 'database':
                content = userRole === 'ADMIN' ? <DatabaseView students={studentsData} /> : null; break;
            case 'buku-induk':
                content = <BukuIndukView students={studentsData} />; break;
            case 'grades':
                if (userRole === 'STUDENT' && selectedStudent) {
                    content = <GradeVerificationView 
                        students={[selectedStudent]} 
                        onUpdate={refreshData} 
                        currentUser={currentUser || undefined}
                        userRole={userRole} 
                    />;
                } else {
                    content = <GradesView students={studentsData} userRole={userRole} loggedInStudent={selectedStudent || undefined} onUpdate={refreshData} />; 
                }
                break;
            case 'recap':
                content = <RecapView students={studentsData} userRole={userRole} loggedInStudent={selectedStudent || undefined} />; break;
            case 'ijazah':
                content = <IjazahView students={studentsData} userRole={userRole} loggedInStudent={selectedStudent || undefined} />; break;
            case 'verification':
                // Pass saveStudentToCloud as onSave to ensure local state persists
                content = <VerificationView 
                    students={studentsData} 
                    targetStudentId={targetVerificationStudentId} 
                    onUpdate={refreshData}
                    onSave={saveStudentToCloud} // NEW: Direct state update prop
                    currentUser={currentUser || undefined} 
                />; 
                break;
            case 'history':
                content = <HistoryView students={userRole === 'STUDENT' && selectedStudent ? [selectedStudent] : studentsData} />; break;
            case 'monitoring':
                content = <MonitoringView students={studentsData} userRole={userRole} loggedInStudent={selectedStudent || undefined} />; break;
            case 'reports':
                content = <ReportsView students={studentsData} onUpdate={refreshData} />; break;
            case 'settings':
                content = <SettingsView />; break;
            case 'upload-rapor':
                content = selectedStudent ? <UploadRaporView student={selectedStudent} onUpdate={() => saveStudentToCloud(selectedStudent)} /> : null; break;
            case 'grade-verification':
                content = <GradeVerificationView students={studentsData} onUpdate={refreshData} currentUser={currentUser || undefined} userRole={userRole} />; break;
            case 'student-docs':
                content = <StudentDocsAdminView students={studentsData} onUpdate={refreshData} />; break;
            default:
                content = <Dashboard />;
        }
    }

    return content;
  };

  return (
    <div 
        className="flex h-screen font-sans text-gray-900 overflow-hidden selection:bg-blue-200 bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: `url('https://4kwallpapers.com/images/wallpapers/macos-big-sur-apple-layers-fluidic-colorful-wwdc-stock-3840x2160-1455.jpg')` }}
    >
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px] z-0"></div>

      <div className="relative z-10 flex h-full w-full">
        {/* Sidebar */}
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

        {/* Main Content */}
        <main 
            className={`flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300 rounded-tl-3xl shadow-[0_0_40px_rgba(0,0,0,0.1)] border-l border-white/20 bg-[#F5F5F7]/95 backdrop-blur-md`}
        >
            {/* Header - Added bg-white/50 backdrop-blur-xl for visual occlusion */}
            <header className="h-16 flex items-center justify-between px-8 border-b border-gray-200/60 sticky top-0 z-30 print:hidden shrink-0 bg-white/60 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-800 capitalize tracking-tight flex items-center gap-2 drop-shadow-sm">
                        {currentView === 'monitoring' ? 'Monitoring Kelengkapan' :
                        currentView === 'dashboard' ? 'Dashboard Utama' : 'SiData System'}
                    </h2>
                    
                    {/* CONNECTION STATUS & REFRESH BUTTON */}
                    <div className="flex items-center gap-2 ml-4">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border transition-colors ${isCloudConnected ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                            {isCloudConnected ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
                            {isCloudConnected ? 'Online (Cloud)' : 'Offline (Mock Data)'}
                        </div>
                        <button 
                            onClick={refreshData} 
                            className="p-1.5 bg-white border border-gray-200 rounded-full hover:bg-gray-100 text-gray-600 transition-all active:scale-95"
                            title="Refresh Data dari Server"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center space-x-6">
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
                                        {currentUser?.name || (userRole === 'ADMIN' ? 'Admin TU' : 'User')}
                                    </p>
                                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                                        {currentUser?.role || userRole}
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

            {/* Main Render Area */}
            <div className="flex-1 p-6 overflow-hidden relative">
                {renderContent()}
            </div>
        </main>
      </div>
    </div>
  );
};

export default App;