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
import IjazahVerificationView from './components/IjazahVerificationView';
import Login from './components/Login';
import { MOCK_STUDENTS } from './services/mockData'; 
import { api } from './services/api'; 
import { Student, DocumentFile } from './types';
import { Search, Bell, ChevronDown, LogOut, User, Loader2, Cloud, CloudOff, RefreshCw, Menu, FolderOpen } from 'lucide-react';

type UserRole = 'ADMIN' | 'STUDENT' | 'GURU';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [studentsData, setStudentsData] = useState<Student[]>([]);
  const [activeAcademicYear, setActiveAcademicYear] = useState('2024/2025'); // Default fallback
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile menu toggle

  // Helper to ensure clean class names globally
  const sanitizeStudents = (data: Student[]): Student[] => {
      return data.map(s => ({
          ...s,
          // Strip "Kelas" variations and whitespace to ensure unique ID (e.g. "IX A")
          className: s.className ? s.className.replace(/kelas/gi, '').trim() : '-'
      }));
  };

  // FETCH DATA ON MOUNT & UPDATE
  useEffect(() => {
    const initData = async () => {
        // Show loading only on first load
        if (studentsData.length === 0) setIsLoading(true);

        try {
            // Fetch Students & Settings in Parallel
            const [onlineData, settings] = await Promise.all([
                api.getStudents(),
                api.getAppSettings()
            ]);
            
            // Set Students (Sanitized)
            setStudentsData(sanitizeStudents(onlineData));
            
            // Set Active Year from Settings
            if (settings && settings.academicData && settings.academicData.year) {
                setActiveAcademicYear(settings.academicData.year);
            }

            setIsCloudConnected(true);
        } catch (error) {
            console.error("Failed to connect to Cloud, using Mock Data", error);
            setIsCloudConnected(false);
            // Only fallback to Mock if Local Data is empty
            if (studentsData.length === 0) {
                setStudentsData(sanitizeStudents(MOCK_STUDENTS));
            }
            // Try to set year from cache/mock if available, otherwise keep default
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
      // Ensure we sanitize outgoing student class name as well just in case
      const sanitizedStudent = {
          ...student,
          className: student.className.replace(/kelas/gi, '').trim()
      };

      // 1. Update Local State Immediately (Optimistic UI)
      setStudentsData(prevStudents => 
          prevStudents.map(s => s.id === sanitizedStudent.id ? sanitizedStudent : s)
      );

      // 2. Send to Cloud
      await api.updateStudent(sanitizedStudent);
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

  // --- NOTIFICATION LOGIC ---
  const notifications = useMemo(() => {
      if (!studentsData) return [];
      const notifs: DashboardNotification[] = [];

      studentsData.forEach(s => {
          // 1. Pending Documents
          const pendingDocs = s.documents.filter(d => d.status === 'PENDING');
          if (pendingDocs.length > 0) {
              pendingDocs.forEach(d => {
                  const isRapor = d.category === 'RAPOR';
                  notifs.push({
                      id: `doc-${d.id}`,
                      // Distinguish between General Verification and Grade/Rapor Verification
                      type: isRapor ? 'ADMIN_GRADE_VERIFY' : 'ADMIN_DOC_VERIFY',
                      title: isRapor ? 'Verifikasi Nilai (Rapor)' : 'Verifikasi Buku Induk (Dokumen)',
                      description: `${s.fullName} mengupload ${d.name} (${d.category})`,
                      date: d.uploadDate,
                      priority: 'HIGH',
                      data: { 
                          studentId: s.id, 
                          docId: d.id, 
                          category: d.category,
                          targetView: isRapor ? 'grade-verification' : 'verification'
                      }
                  });
              });
          }

          // 2. Pending Corrections
          const pendingReqs = s.correctionRequests?.filter(r => r.status === 'PENDING');
          if (pendingReqs && pendingReqs.length > 0) {
              pendingReqs.forEach(r => {
                  // Check if it's academic (Grade/Class) or Bio (Buku Induk) or Ijazah
                  const isAcademic = r.fieldKey.startsWith('grade-') || r.fieldKey.startsWith('class-');
                  const isIjazah = ['nis', 'nisn', 'birthPlace', 'birthDate'].includes(r.fieldKey);
                  
                  let type: any = 'ADMIN_BIO_VERIFY';
                  let title = 'Verifikasi Buku Induk (Data Diri)';
                  let targetView = 'student-detail';

                  if (isAcademic) {
                      type = 'ADMIN_GRADE_VERIFY';
                      title = 'Verifikasi Nilai (Koreksi Data)';
                      targetView = 'grade-verification';
                  } else if (isIjazah) {
                      type = 'ADMIN_IJAZAH_VERIFY';
                      title = 'Verifikasi Data Ijazah';
                      targetView = 'ijazah-verification';
                  }
                  
                  notifs.push({
                      id: `req-${r.id}`,
                      type: type,
                      title: title,
                      description: `${s.fullName} mengajukan perbaikan: ${r.fieldName}`,
                      date: new Date(r.requestDate).toLocaleDateString(),
                      priority: 'MEDIUM',
                      data: { 
                          studentId: s.id, 
                          fieldKey: r.fieldKey,
                          targetView: targetView
                      }
                  });
              });
          }

          // 3. For STUDENT: Revisions & Approvals
          if (userRole === 'STUDENT' && selectedStudent && s.id === selectedStudent.id) {
               // Revisions
               s.documents.filter(d => d.status === 'REVISION').forEach(d => {
                   notifs.push({
                       id: `rev-${d.id}`,
                       type: 'STUDENT_REVISION',
                       title: 'Revisi Dokumen Diperlukan',
                       description: `Dokumen ${d.category} ditolak. Catatan: "${d.adminNote}"`,
                       date: d.verificationDate || '',
                       priority: 'HIGH',
                       verifierName: d.verifierName
                   });
               });
               
               // Approved (Last 7 days)
               s.documents.filter(d => d.status === 'APPROVED').forEach(d => {
                   notifs.push({
                       id: `app-${d.id}`,
                       type: 'STUDENT_APPROVED',
                       title: 'Dokumen Disetujui',
                       description: `Dokumen ${d.category} telah diverifikasi.`,
                       date: d.verificationDate || '',
                       priority: 'LOW',
                       verifierName: d.verifierName
                   });
               });

               // Messages
               s.adminMessages?.filter(m => !m.isRead).forEach(m => {
                   notifs.push({
                       id: `msg-${m.id}`,
                       type: 'STUDENT_REVISION', // Use Revision style for visibility
                       title: 'Pesan dari Admin',
                       description: m.content,
                       date: new Date(m.date).toLocaleDateString(),
                       priority: 'HIGH'
                   });
               });
          }
      });

      // Sort by priority then date
      return notifs.sort((a, b) => {
          if (a.priority === 'HIGH' && b.priority !== 'HIGH') return -1;
          if (a.priority !== 'HIGH' && b.priority === 'HIGH') return 1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [studentsData, userRole, selectedStudent]);

  const handleNotificationClick = (notif: DashboardNotification) => {
      if (userRole === 'ADMIN' || userRole === 'GURU') {
          if (notif.data) {
              setTargetVerificationStudentId(notif.data.studentId);
              
              if (notif.data.docId) {
                  // Document Handling
                  setTargetHighlightDoc(notif.data.docId);
                  // Use explicit target view from notification data
                  if (notif.data.targetView) {
                      setCurrentView(notif.data.targetView);
                  } else {
                      // Fallback
                      setCurrentView(notif.data.category === 'RAPOR' ? 'grade-verification' : 'verification');
                  }
              } else if (notif.data.fieldKey) {
                  // Correction Handling
                  setTargetHighlightField(notif.data.fieldKey);
                  
                  // Use explicit target view
                  if (notif.data.targetView) {
                      setCurrentView(notif.data.targetView);
                  } else {
                      // Default to Student Detail for Bio/Buku Induk corrections
                      const s = studentsData.find(st => st.id === notif.data.studentId);
                      if (s) {
                          setSelectedStudent(s);
                          setCurrentView('student-detail');
                      }
                  }
              }
          }
      } else {
          // Student logic
          if (notif.title.includes('Revisi') || notif.title.includes('Dokumen')) {
              setCurrentView('documents');
          } else if (notif.title.includes('Pesan')) {
              // Just mark as read
          }
      }
      setReadNotificationIds(prev => new Set(prev).add(notif.id));
  };

  // --- RENDER CONTENT BASED ON VIEW ---
  const renderContent = () => {
      if (!isAuthenticated) return <Login onLogin={handleLogin} students={studentsData} />;

      // Common Props
      const commonProps = {
          students: studentsData,
          onUpdate: refreshData
      };

      switch (currentView) {
          case 'dashboard':
              return <Dashboard 
                        notifications={notifications} 
                        onNotificationClick={handleNotificationClick} 
                        userRole={userRole} 
                        students={studentsData}
                     />;
          case 'database':
              return <DatabaseView students={studentsData} onUpdateStudents={(newData) => { setStudentsData(newData); refreshData(); }} />;
          case 'buku-induk':
              return <BukuIndukView students={studentsData} />;
          case 'verification':
              return <VerificationView 
                        students={studentsData} 
                        targetStudentId={targetVerificationStudentId}
                        onUpdate={refreshData}
                        onSave={saveStudentToCloud} 
                        currentUser={currentUser || undefined}
                     />;
          case 'student-detail': // Specific for detailed view from list
              if (!selectedStudent) return <DapodikList students={studentsData} onSelectStudent={(s) => { setSelectedStudent(s); setCurrentView('student-detail'); }} />;
              return <StudentDetail 
                        student={selectedStudent} 
                        onBack={() => setCurrentView('database')} 
                        viewMode="dapodik" 
                        highlightFieldKey={targetHighlightField}
                        onUpdate={refreshData}
                        currentUser={currentUser || undefined}
                     />;
          case 'student-docs': // Admin view of student docs
              return <StudentDocsAdminView students={studentsData} onUpdate={refreshData} />;
          case 'grades':
              return <GradesView 
                        students={studentsData} 
                        userRole={userRole} 
                        loggedInStudent={selectedStudent || undefined} 
                        onUpdate={refreshData}
                     />;
          case 'grade-verification':
              return <GradeVerificationView 
                        students={studentsData} 
                        userRole={userRole}
                        onUpdate={refreshData}
                        onSave={saveStudentToCloud} // ADDED HERE
                        currentUser={currentUser || undefined}
                     />;
          case 'recap':
              return <RecapView students={studentsData} userRole={userRole} loggedInStudent={selectedStudent || undefined} />;
          case 'data-ijazah':
              return <IjazahView students={studentsData} userRole={userRole} loggedInStudent={selectedStudent || undefined} />;
          case 'ijazah-verification':
              return <IjazahVerificationView 
                        students={studentsData} 
                        onUpdate={refreshData} 
                        onSave={saveStudentToCloud} // ADDED HERE
                        currentUser={currentUser || undefined} 
                     />;
          case 'settings':
              return <SettingsView />;
          case 'upload-rapor':
              if (!selectedStudent) return <div>Data siswa tidak ditemukan</div>;
              return <UploadRaporView student={selectedStudent} onUpdate={refreshData} />;
          case 'history':
              return <HistoryView students={studentsData} />;
          case 'monitoring':
              return <MonitoringView students={studentsData} userRole={userRole} loggedInStudent={selectedStudent || undefined} />;
          case 'reports':
              return <ReportsView students={studentsData} onUpdate={refreshData} />;
          
          // STUDENT SPECIFIC VIEWS
          case 'dapodik':
              if (!selectedStudent) return <div>Loading...</div>;
              return <StudentDetail 
                        student={selectedStudent} 
                        onBack={() => setCurrentView('dashboard')} 
                        viewMode="student" 
                        readOnly={true} // Student can edit via modal inside component
                        onUpdate={refreshData}
                        currentUser={currentUser || undefined}
                     />;
          case 'documents':
              if (!selectedStudent) return <div>Loading...</div>;
              return (
                  <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="p-4 border-b">
                          <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800"><FolderOpen className="w-5 h-5 text-blue-600"/> Dokumen Saya</h2>
                      </div>
                      <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50">
                          <FileManager 
                              documents={selectedStudent.documents} 
                              onUpload={(f, c) => {
                                  // Using saveStudentToCloud wrapper logic
                                  // For simplicity, reusing API directly here
                                  api.uploadFile(f, selectedStudent.id, c).then(url => {
                                      if(url) {
                                          const newDoc: DocumentFile = {
                                              id: Math.random().toString(36).substr(2, 9),
                                              name: f.name,
                                              type: f.type.includes('pdf') ? 'PDF' : 'IMAGE',
                                              url: url,
                                              category: c as any,
                                              uploadDate: new Date().toISOString().split('T')[0],
                                              size: 'Unknown',
                                              status: 'PENDING'
                                          };
                                          const updated = {...selectedStudent, documents: [...selectedStudent.documents.filter(d=>d.category!==c), newDoc]};
                                          saveStudentToCloud(updated);
                                          refreshData();
                                      }
                                  });
                              }}
                              onDelete={(id) => {
                                  const updated = {...selectedStudent, documents: selectedStudent.documents.filter(d=>d.id !== id)};
                                  saveStudentToCloud(updated);
                                  refreshData();
                              }}
                          />
                      </div>
                  </div>
              );

          default:
              return <Dashboard notifications={notifications} userRole={userRole} students={studentsData} />;
      }
  };

  if (!isAuthenticated) {
      return (
          <>
            {isLoading ? (
                <div className="min-h-screen flex items-center justify-center flex-col bg-gray-50">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                    <p className="text-gray-500 font-medium">Memuat Aplikasi...</p>
                </div>
            ) : (
                <Login onLogin={handleLogin} students={studentsData} />
            )}
          </>
      );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans text-gray-900">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar */}
      <div className={`fixed md:static inset-y-0 left-0 z-30 transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:p-4 h-full`}>
          <Sidebar 
            currentView={currentView} 
            setView={(view) => { setCurrentView(view); setIsMobileMenuOpen(false); }} 
            onLogout={handleLogout} 
            isCollapsed={isSidebarCollapsed}
            toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            userRole={userRole}
          />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shadow-sm z-10">
            <div className="flex items-center gap-3">
                <button className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg" onClick={() => setIsMobileMenuOpen(true)}>
                    <Menu className="w-6 h-6" />
                </button>
                <div className="hidden md:flex flex-col">
                    <h1 className="text-lg font-bold text-gray-800 leading-tight">
                        {currentView === 'dashboard' ? 'Dashboard' : 
                         currentView === 'database' ? 'Database Dapodik' : 
                         currentView === 'grades' ? 'Nilai Akademik' :
                         currentView === 'settings' ? 'Pengaturan' : 'Menu Utama'}
                    </h1>
                    <span className="text-[10px] text-gray-500 font-medium">Tahun Ajaran {activeAcademicYear}</span>
                </div>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
                {/* Cloud Status */}
                <div className="hidden md:flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200" title={isCloudConnected ? "Terhubung ke Cloud" : "Mode Offline / Mock"}>
                    {isCloudConnected ? <Cloud className="w-4 h-4 text-green-500" /> : <CloudOff className="w-4 h-4 text-red-500" />}
                    <span className="text-xs font-bold text-gray-600">{isCloudConnected ? 'Online' : 'Offline'}</span>
                </div>

                <div className="h-6 w-px bg-gray-300 hidden md:block"></div>

                {/* Profile Dropdown */}
                <div className="relative">
                    <button 
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center gap-3 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
                    >
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-bold text-gray-800 leading-none">{currentUser?.name}</p>
                            <p className="text-[10px] text-gray-500 font-medium">{currentUser?.role}</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                            {currentUser?.name.charAt(0)}
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>

                    {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 animate-fade-in z-50">
                            <div className="px-4 py-3 border-b border-gray-100 md:hidden">
                                <p className="text-sm font-bold text-gray-800">{currentUser?.name}</p>
                                <p className="text-xs text-gray-500">{currentUser?.role}</p>
                            </div>
                            <button onClick={() => { refreshData(); setIsProfileOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                <RefreshCw className="w-4 h-4" /> Refresh Data
                            </button>
                            <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                <LogOut className="w-4 h-4" /> Keluar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden p-4 md:p-6 bg-gray-100 relative">
            {renderContent()}
        </main>

      </div>
    </div>
  );
};

export default App;