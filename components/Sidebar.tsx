import React from 'react';
import { LayoutDashboard, Users, FileText, Settings, LogOut, GraduationCap, Database, ClipboardCheck, PanelLeftClose, PanelLeft, UserCircle, History, Book, ClipboardList, FolderOpen, Upload, FileCheck2 } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  toggleSidebar: () => void;
  userRole?: 'ADMIN' | 'STUDENT';
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onLogout, isCollapsed, toggleSidebar, userRole = 'ADMIN' }) => {
  
  const adminMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'database', label: 'Database Dapodik', icon: Database },
    { id: 'buku-induk', label: 'Buku Induk', icon: Book },
    { id: 'grades', label: 'Nilai Siswa', icon: ClipboardList },
    { id: 'verification', label: 'Verifikasi Buku Induk', icon: ClipboardCheck },
    { id: 'grade-verification', label: 'Verifikasi Nilai', icon: FileCheck2 },
    { id: 'history', label: 'Riwayat Verifikasi', icon: History },
    { id: 'reports', label: 'Laporan', icon: FileText },
  ];

  const studentMenuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'dapodik', label: 'Buku Induk', icon: Book }, 
      { id: 'documents', label: 'Dokumen Saya', icon: FolderOpen },
      { id: 'upload-rapor', label: 'Upload Rapor', icon: Upload },
      { id: 'grades', label: 'Nilai Siswa', icon: ClipboardList },
      { id: 'history', label: 'Riwayat', icon: History },
  ];

  const menuItems = userRole === 'ADMIN' ? adminMenuItems : studentMenuItems;

  return (
    <div 
        id="sidebar"
        className={`${isCollapsed ? 'w-20' : 'w-64'} h-full glass-sidebar flex flex-col pt-6 pb-6 transition-all duration-300 ease-in-out relative z-30 shadow-xl shadow-black/5`}
    >
      {/* Header / Logo Area */}
      <div className={`px-5 mb-8 flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} space-x-3 h-12`}>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl shadow-lg shadow-blue-500/20 flex-shrink-0 border border-white/20">
            <GraduationCap className="text-white w-6 h-6" />
        </div>
        <div className={`transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
          <h1 className="text-base font-bold text-gray-900 leading-none tracking-tight">SiData</h1>
          <p className="text-[10px] text-gray-500 font-semibold tracking-wide uppercase mt-1">SMPN 3 Pacet</p>
        </div>
      </div>

      {/* Toggle Button - Floating style */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-9 bg-white border border-gray-200 p-1.5 rounded-full shadow-md text-gray-500 hover:text-blue-600 hover:scale-110 transition-all z-50 hidden md:flex"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <PanelLeft className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
      </button>

      {/* Menu Items */}
      <div className="flex-1 px-4 space-y-1.5 overflow-y-auto no-scrollbar">
        {!isCollapsed && (
            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2">Menu Utama</p>
        )}
        
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              title={isCollapsed ? item.label : ''}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-3'} py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group relative ${
                isActive
                  ? 'bg-mac-accent text-white shadow-lg shadow-blue-500/30'
                  : 'text-gray-600 hover:bg-black/5 hover:text-gray-900'
              }`}
            >
              <item.icon className={`${isCollapsed ? 'mx-0' : 'mr-3'} h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'} transition-colors`} />
              
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
            <div className={`mt-6 ${isCollapsed ? 'border-t border-gray-200/50 pt-4' : ''}`}>
                {!isCollapsed && (
                    <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Sistem</p>
                )}
                <button
                onClick={() => setView('settings')}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-3'} py-2.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-black/5 hover:text-gray-900 transition-all group relative ${currentView === 'settings' ? 'bg-mac-accent text-white shadow-lg shadow-blue-500/30' : ''}`}
                >
                    <Settings className={`${isCollapsed ? 'mx-0' : 'mr-3'} h-5 w-5 ${currentView === 'settings' ? 'text-white' : 'text-gray-500'}`} />
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
      <div className="px-4 mt-auto pt-4 border-t border-gray-200/50">
        <button
          onClick={onLogout}
          title={isCollapsed ? 'Keluar' : ''}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-3'} py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 hover:shadow-sm transition-all group relative`}
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