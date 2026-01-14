import React from 'react';
import { LayoutDashboard, Users, FileText, Settings, LogOut, GraduationCap, Database, ClipboardCheck, PanelLeftClose, PanelLeft, UserCircle, History, Book, ClipboardList, FolderOpen, Upload, FileCheck2, Calculator, Award, FileInput } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  toggleSidebar: () => void;
  userRole?: 'ADMIN' | 'STUDENT' | 'GURU';
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onLogout, isCollapsed, toggleSidebar, userRole = 'ADMIN' }) => {
  
  // Logic to show/hide items based on Role
  const showDatabase = userRole === 'ADMIN'; // Only Admin sees Database Dapodik
  
  const adminMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, visible: true },
    { id: 'database', label: 'Database Dapodik', icon: Database, visible: showDatabase },
    { id: 'buku-induk', label: 'Buku Induk', icon: Book, visible: true },
    { id: 'grades', label: 'Nilai Siswa', icon: ClipboardList, visible: true },
    { id: 'recap', label: 'Rekap 5 Semester', icon: Calculator, visible: true },
    { id: 'ijazah', label: 'Nilai Ijazah', icon: Award, visible: true },
    { id: 'verification', label: 'Verifikasi Buku Induk', icon: ClipboardCheck, visible: true },
    { id: 'grade-verification', label: 'Verifikasi Nilai', icon: FileCheck2, visible: true },
    { id: 'student-docs', label: 'Dokumen Siswa', icon: FileInput, visible: true }, // New Menu
    { id: 'history', label: 'Riwayat Verifikasi', icon: History, visible: true },
    { id: 'reports', label: 'Laporan', icon: FileText, visible: true },
  ];

  const studentMenuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, visible: true },
      { id: 'dapodik', label: 'Buku Induk', icon: Book, visible: true }, 
      { id: 'documents', label: 'Dokumen Saya', icon: FolderOpen, visible: true },
      { id: 'upload-rapor', label: 'Upload Rapor', icon: Upload, visible: true },
      { id: 'grades', label: 'Nilai Siswa', icon: ClipboardList, visible: true },
      { id: 'recap', label: 'Rekap 5 Semester', icon: Calculator, visible: true },
      { id: 'ijazah', label: 'Nilai Ijazah', icon: Award, visible: true },
      { id: 'history', label: 'Riwayat', icon: History, visible: true },
  ];

  const rawItems = (userRole === 'ADMIN' || userRole === 'GURU') ? adminMenuItems : studentMenuItems;
  const menuItems = rawItems.filter(item => item.visible);

  return (
    <div 
        id="sidebar"
        className={`${isCollapsed ? 'w-20' : 'w-64'} h-full flex flex-col pt-6 pb-6 transition-all duration-300 ease-in-out relative z-30`}
    >
      {/* "Traffic Lights" Window Controls (Decorative) */}
      <div className={`px-6 mb-6 flex gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-sm"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors shadow-sm"></div>
          <div className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors shadow-sm"></div>
      </div>

      {/* Header / Logo Area */}
      <div className={`px-5 mb-8 flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} space-x-3 h-12`}>
        <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl shadow-inner border border-white/20 flex-shrink-0">
            <GraduationCap className="text-white w-6 h-6" />
        </div>
        <div className={`transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
          <h1 className="text-base font-bold text-white leading-none tracking-tight drop-shadow-md">SiData</h1>
          <p className="text-[10px] text-blue-100 font-medium tracking-wide uppercase mt-1 opacity-80">SMPN 3 Pacet</p>
        </div>
      </div>

      {/* Toggle Button - Floating style */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 bg-white/80 backdrop-blur-md border border-white/40 p-1.5 rounded-full shadow-lg text-gray-600 hover:text-blue-600 hover:scale-110 transition-all z-50 hidden md:flex"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <PanelLeft className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
      </button>

      {/* Menu Items */}
      <div className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar">
        {!isCollapsed && (
            <p className="px-3 text-[10px] font-bold text-blue-100/60 uppercase tracking-wider mb-2 mt-2">Menu Utama</p>
        )}
        
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              title={isCollapsed ? item.label : ''}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-3'} py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? 'bg-white/90 backdrop-blur-md text-blue-600 shadow-lg'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className={`${isCollapsed ? 'mx-0' : 'mr-3'} h-5 w-5 ${isActive ? 'text-blue-600' : 'text-white/70 group-hover:text-white'} transition-colors`} />
              
              {!isCollapsed ? (
                 <span className="whitespace-nowrap tracking-tight">{item.label}</span>
              ) : (
                  // Tooltip for collapsed state
                  <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl">
                      {item.label}
                  </span>
              )}
            </button>
          );
        })}
        
        {userRole === 'ADMIN' && (
            <div className={`mt-6 ${isCollapsed ? 'border-t border-white/10 pt-4' : ''}`}>
                {!isCollapsed && (
                    <p className="px-3 text-[10px] font-bold text-blue-100/60 uppercase tracking-wider mb-2">Sistem</p>
                )}
                <button
                onClick={() => setView('settings')}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-3'} py-2.5 text-sm font-medium rounded-xl text-white/80 hover:bg-white/10 hover:text-white transition-all group relative ${currentView === 'settings' ? 'bg-white/90 text-blue-600 shadow-lg' : ''}`}
                >
                    <Settings className={`${isCollapsed ? 'mx-0' : 'mr-3'} h-5 w-5 ${currentView === 'settings' ? 'text-blue-600' : 'text-white/70'}`} />
                    {!isCollapsed ? (
                        <span>Pengaturan</span>
                    ) : (
                        <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                        Pengaturan
                        </span>
                    )}
                </button>
            </div>
        )}
      </div>

      {/* Footer / Logout */}
      <div className="px-4 mt-auto pt-4 border-t border-white/10">
        <button
          onClick={onLogout}
          title={isCollapsed ? 'Keluar' : ''}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-3'} py-2.5 text-sm font-medium text-white/80 rounded-xl hover:bg-red-500/20 hover:text-red-100 hover:shadow-inner transition-all group relative`}
        >
          <LogOut className={`${isCollapsed ? 'mx-0' : 'mr-3'} h-5 w-5`} />
          {!isCollapsed ? (
              <span>Keluar</span>
          ) : (
                <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    Keluar
                </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;