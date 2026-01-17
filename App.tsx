import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Database, Book, ClipboardList, Calculator, 
  FileBadge, Award, ClipboardCheck, ScrollText, FileCheck2, 
  FileInput, History, LayoutTemplate, Settings, LogOut, Menu
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
import StudentDetail from './components/StudentDetail'; // For Student Profile View
import UploadRaporView from './components/UploadRaporView'; // For Student Rapor View
import FileManager from './components/FileManager'; // For Student Docs View

// Services & Types
import { api } from './services/api';
import { Student, DocumentFile } from './types';
import { MOCK_STUDENTS } from './services/mockData';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'ADMIN' | 'GURU' | 'STUDENT' | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null); // For Student Login Context
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- DATA FETCHING ---
  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const data = await api.getStudents();
      if (data && data.length > 0) {
        setStudents(data);
      } else {
        // Fallback if API empty (first run)
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
      // ADMIN/GURU VIEW: Show PENDING items
      students.forEach(s => {
        // 1. Pending Documents
        s.documents.forEach(d => {
          if (d.status === 'PENDING') {
            list.push({
              id: `doc-${d.id}`,
              type: 'ADMIN_DOC_VERIFY',
              title: 'Verifikasi Dokumen',
              description: `${s.fullName} mengupload ${d.category} (${d.name})`,
              date: d.uploadDate,
              priority: 'HIGH',
              data: { studentId: s.id, category: d.category } // Meta for navigation
            });
          }
        });

        // 2. Pending Requests (Bio, Grade, Class)
        s.correctionRequests?.forEach(r => {
          if (r.status === 'PENDING') {
            let type: any = 'ADMIN_BIO_VERIFY';
            let title = 'Verifikasi Data Diri';
            
            if (r.fieldKey.startsWith('grade-')) {
               type = 'ADMIN_GRADE_VERIFY';
               title = 'Verifikasi Nilai';
            } else if (r.fieldKey.startsWith('class-')) {
               type = 'ADMIN_BIO_VERIFY'; // Class change counts as bio/academic data
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
      // STUDENT VIEW: Show APPROVED / REJECTED items for *this* student
      // IMPORTANT: Get latest data from students array, not stale selectedStudent state
      const currentData = students.find(s => s.id === selectedStudent.id) || selectedStudent;

      // 1. Documents (Approved or Revision)
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

      // 2. Correction Requests (Approved or Rejected)
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
      
      // 3. Admin Messages
      currentData.adminMessages?.forEach(msg => {
          list.push({
              id: `msg-${msg.id}`,
              type: 'STUDENT_REVISION', // Use generic alert style
              title: 'Pesan Admin',
              description: msg.content,
              date: msg.date.split('T')[0],
              priority: 'MEDIUM'
          });
      });
    }

    // Sort by date (newest first)
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [students, userRole, selectedStudent]);

  // --- HANDLERS ---
  const handleLogin = (role: 'ADMIN' | 'GURU' | 'STUDENT', studentData?: Student) => {
    setIsLoggedIn(true);
    setUserRole(role);
    if (role === 'STUDENT' && studentData) {
      setSelectedStudent(studentData);
    }
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    setSelectedStudent(null);
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
      
      // We must upload to API then update state
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
              
              // Update local state immediately for UI response
              const updatedStudent = { ...selectedStudent };
              // Remove old doc of same category if exists (except Rapor which allows multiple)
              if (category !== 'RAPOR') {
                  updatedStudent.documents = updatedStudent.documents.filter(d => d.category !== category);
              }
              updatedStudent.documents.push(newDoc);
              
              await api.updateStudent(updatedStudent);
              refreshData(); // Sync full list
              alert("File berhasil diupload!");
          } else {
              alert("Gagal upload file.");
          }
      } catch (e) {
          console.error(e);
          alert("Terjadi kesalahan saat upload.");
      }
  };

  // --- RENDER CONTENT SWITCHER ---
  const renderContent = () => {
    // Helper to get fresh student object
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
        return <VerificationView students={students} onUpdate={refreshData} currentUser={{name: 'Admin', role: 'ADMIN'}} />;
      case 'ijazah-verification':
        return <IjazahVerificationView students={students} onUpdate={refreshData} currentUser={{name: 'Admin', role: 'ADMIN'}} />;
      case 'grade-verification':
        return <GradeVerificationView students={students} onUpdate={refreshData} currentUser={{name: 'Admin', role: 'ADMIN'}} />;
      case 'settings':
        return <SettingsView />;
      
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
      case 'dapodik': // Student Buku Induk (Read Only + Correction)
        return studentContext ? (
            <StudentDetail 
                student={studentContext} 
                onBack={() => setCurrentView('dashboard')} 
                viewMode="student" 
                readOnly={true} // Enable click-to-correct
                onUpdate={refreshData}
            />
        ) : null;
      
      case 'documents': // Student Document Manager
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
      {/* Mobile Sidebar Overlay */}
      {!isSidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarCollapsed(true)}
        ></div>
      )}

      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        setView={(view) => { setCurrentView(view); if(window.innerWidth < 768) setIsSidebarCollapsed(true); }}
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        userRole={userRole || 'ADMIN'}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative transition-all duration-300">
        
        {/* Mobile Header */}
        <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 flex items-center justify-between z-10 sticky top-0">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Menu className="w-6 h-6" />
                </button>
                <span className="font-bold text-gray-800">SiData SMPN 3 Pacet</span>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs border border-blue-200">
                {userRole === 'STUDENT' ? selectedStudent?.fullName.charAt(0) : 'A'}
            </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-6 scroll-smooth">
            <div className="max-w-7xl mx-auto h-full flex flex-col">
                {renderContent()}
            </div>
        </div>
      </main>
    </div>
  );
}

export default App;