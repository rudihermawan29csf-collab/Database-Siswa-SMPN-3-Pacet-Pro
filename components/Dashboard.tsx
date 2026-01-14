import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, FileCheck, School, AlertCircle, FileText, CheckCircle2, Clock, AlertTriangle, ArrowRight, BookOpen, FileCheck2, Files, ClipboardList, Filter } from 'lucide-react';
import { Student } from '../types';

const COLORS = ['#007AFF', '#FF2D55', '#FFCC00', '#34C759'];

// Interface for Notification Items passed from App
export interface DashboardNotification {
    id: string;
    type: 'ADMIN_VERIFY' | 'STUDENT_REVISION' | 'STUDENT_APPROVED' | 'ADMIN_DOC_VERIFY';
    title: string;
    description: string;
    date: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    data?: any; // To hold student object or ID for navigation
}

interface DashboardProps {
    notifications?: DashboardNotification[];
    onNotificationClick?: (notification: DashboardNotification) => void;
    userRole?: 'ADMIN' | 'STUDENT';
    students?: Student[]; // Add students prop for calculation
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; subtext?: string }> = ({ title, value, icon, color, subtext }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
    <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
      {React.cloneElement(icon as React.ReactElement<any>, { className: `w-6 h-6 ${color.replace('bg-', 'text-')}` })}
    </div>
  </div>
);

const NotificationCard: React.FC<{ notification: DashboardNotification; onClick: () => void }> = ({ notification, onClick }) => {
    const getIcon = () => {
        switch(notification.type) {
            case 'ADMIN_VERIFY': return <AlertCircle className="w-5 h-5 text-orange-500" />;
            case 'STUDENT_REVISION': return <AlertTriangle className="w-5 h-5 text-red-500" />;
            case 'STUDENT_APPROVED': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            default: return <Clock className="w-5 h-5 text-blue-500" />;
        }
    };

    const getBgColor = () => {
        switch(notification.type) {
            case 'STUDENT_REVISION': return 'bg-red-50 border-red-100 hover:bg-red-100';
            case 'STUDENT_APPROVED': return 'bg-green-50 border-green-100 hover:bg-green-100';
            case 'ADMIN_VERIFY': return 'bg-orange-50 border-orange-100 hover:bg-orange-100';
            default: return 'bg-blue-50 border-blue-100 hover:bg-blue-100';
        }
    };

    return (
        <div 
            onClick={onClick}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-4 ${getBgColor()}`}
        >
            <div className="mt-1 bg-white p-2 rounded-full shadow-sm">
                {getIcon()}
            </div>
            <div className="flex-1">
                <h4 className="font-bold text-gray-800 text-sm">{notification.title}</h4>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.description}</p>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-gray-200 text-gray-400 font-medium">
                        {notification.date}
                    </span>
                    {notification.priority === 'HIGH' && (
                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                            Penting
                        </span>
                    )}
                </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 self-center opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ notifications = [], onNotificationClick, userRole = 'ADMIN', students = [] }) => {
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');

  const uniqueClasses = useMemo(() => {
      const classes = Array.from(new Set(students.map(s => s.className))).sort();
      return ['ALL', ...classes];
  }, [students]);

  // Filter students based on selection
  const filteredStudents = useMemo(() => {
      if (selectedClassFilter === 'ALL') return students;
      return students.filter(s => s.className === selectedClassFilter);
  }, [students, selectedClassFilter]);
  
  // Dynamic Calculations based on filtered students
  const stats = useMemo(() => {
    const total = filteredStudents.length || 1; // avoid division by zero
    
    // 1. Kelengkapan Buku Induk
    // Criteria: NISN, NIK, FullName, BirthPlace, Address, Father Name, Mother Name must be present
    const biCompleteCount = filteredStudents.filter(s => 
        s.nisn && s.dapodik?.nik && s.fullName && s.birthPlace && s.address && s.father?.name && s.mother?.name
    ).length;
    const biPercentage = Math.round((biCompleteCount / total) * 100);

    // 2. Kelengkapan Nilai (Semester 1 assumed as current active)
    const gradesCompleteCount = filteredStudents.filter(s => 
        s.academicRecords && s.academicRecords[1] && s.academicRecords[1].subjects.length > 0
    ).length;
    const gradesPercentage = Math.round((gradesCompleteCount / total) * 100);

    // 3. Kelengkapan Dokumen (Wajib: KK, Akta, Ijazah)
    const docsCompleteCount = filteredStudents.filter(s => {
        const hasKK = s.documents.some(d => d.category === 'KK');
        const hasAkta = s.documents.some(d => d.category === 'AKTA');
        const hasIjazah = s.documents.some(d => d.category === 'IJAZAH');
        return hasKK && hasAkta && hasIjazah;
    }).length;
    const docsPercentage = Math.round((docsCompleteCount / total) * 100);

    // 4. Kelengkapan Rapor (Uploaded Rapor for Semester 1)
    const raporCompleteCount = filteredStudents.filter(s => 
        s.documents.some(d => d.category === 'RAPOR' && d.subType?.semester === 1)
    ).length;
    const raporPercentage = Math.round((raporCompleteCount / total) * 100);

    return {
        biPercentage,
        gradesPercentage,
        docsPercentage,
        raporPercentage,
        totalStudents: filteredStudents.length,
        activeStudents: filteredStudents.filter(s => s.status === 'AKTIF').length
    };
  }, [filteredStudents]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-y-auto animate-fade-in pb-20">
      
      {/* Left Column - Stats & Charts */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-bold mb-2">Selamat Datang, {userRole === 'ADMIN' ? 'Administrator' : 'Siswa'}!</h2>
                        <p className="text-blue-100 text-lg">Sistem Informasi Database Siswa SMPN 3 Pacet</p>
                    </div>
                    {userRole === 'ADMIN' && (
                        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md p-1 rounded-lg border border-white/20">
                            <Filter className="w-4 h-4 text-white ml-2" />
                            <select 
                                className="bg-transparent text-white text-sm font-bold p-1 outline-none cursor-pointer"
                                value={selectedClassFilter}
                                onChange={(e) => setSelectedClassFilter(e.target.value)}
                            >
                                <option value="ALL" className="text-gray-800">Semua Kelas</option>
                                {uniqueClasses.filter(c => c !== 'ALL').map(c => (
                                    <option key={c} value={c} className="text-gray-800">Kelas {c}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                
                <div className="flex gap-4 mt-6">
                    <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
                        <span className="block text-2xl font-bold">{stats.totalStudents}</span>
                        <span className="text-xs text-blue-100 uppercase tracking-wider">Total Siswa</span>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
                        <span className="block text-2xl font-bold">{stats.activeStudents}</span>
                        <span className="text-xs text-blue-100 uppercase tracking-wider">Siswa Aktif</span>
                    </div>
                </div>
            </div>
            {/* Decoration */}
            <div className="absolute right-0 top-0 h-full w-1/2 bg-white/5 skew-x-12 transform translate-x-20"></div>
            <School className="absolute -right-10 -bottom-10 w-64 h-64 text-white/10" />
        </div>

        {/* Stats Grid - Dynamic */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <StatCard 
                title="Kelengkapan Buku Induk" 
                value={`${stats.biPercentage}%`} 
                subtext="Data Identitas & Alamat"
                icon={<BookOpen />} 
                color="bg-purple-500" 
             />
             <StatCard 
                title="Kelengkapan Nilai (S1)" 
                value={`${stats.gradesPercentage}%`} 
                subtext="Input Nilai Guru"
                icon={<ClipboardList />} 
                color="bg-green-500" 
             />
             <StatCard 
                title="Kelengkapan Dokumen Wajib" 
                value={`${stats.docsPercentage}%`} 
                subtext="KK, Akta, Ijazah"
                icon={<Files />} 
                color="bg-orange-500" 
             />
             <StatCard 
                title="Kelengkapan Upload Rapor" 
                value={`${stats.raporPercentage}%`} 
                subtext="Scan Rapor S1"
                icon={<FileCheck />} 
                color="bg-blue-500" 
             />
        </div>

        {/* Chart Area */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Statistik Kelengkapan Data {selectedClassFilter !== 'ALL' ? `(${selectedClassFilter})` : ''}</h3>
            </div>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                        { name: 'Buku Induk', value: stats.biPercentage },
                        { name: 'Nilai S1', value: stats.gradesPercentage },
                        { name: 'Dokumen', value: stats.docsPercentage },
                        { name: 'Rapor', value: stats.raporPercentage },
                    ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                        <Tooltip 
                            cursor={{fill: '#F3F4F6'}}
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                        />
                        <Bar dataKey="value" fill="#007AFF" radius={[6, 6, 0, 0]} barSize={40}>
                            {
                                [0,1,2,3].map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))
                            }
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* Right Column - Notifications */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    Aktivitas Terbaru
                </h3>
                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold">
                    {notifications.length} Baru
                </span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {notifications.length > 0 ? (
                    notifications.map((notif) => (
                        <NotificationCard 
                            key={notif.id} 
                            notification={notif} 
                            onClick={() => onNotificationClick && onNotificationClick(notif)}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-center">
                        <CheckCircle2 className="w-12 h-12 mb-2 text-gray-200" />
                        <p className="text-sm">Tidak ada notifikasi baru.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;