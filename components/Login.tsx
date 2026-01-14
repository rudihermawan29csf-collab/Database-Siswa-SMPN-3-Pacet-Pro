import React, { useState, useMemo, useEffect } from 'react';
import { GraduationCap, Loader2, UserCog, User, ChevronDown, School, ArrowRight, BookOpen } from 'lucide-react';
import { Student } from '../types';

interface LoginProps {
  onLogin: (role: 'ADMIN' | 'GURU' | 'STUDENT', studentData?: Student) => void;
  students: Student[]; 
}

const Login: React.FC<LoginProps> = ({ onLogin, students }) => {
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'ADMIN' | 'GURU' | 'STUDENT'>('ADMIN');
  const [error, setError] = useState('');

  // Admin/Guru Form States
  const [username, setUsername] = useState(''); // Used for Admin
  const [selectedGuruId, setSelectedGuruId] = useState(''); // Used for Guru
  const [password, setPassword] = useState('');

  // Student Form States
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Teachers List
  const [teachers, setTeachers] = useState<any[]>([]);

  useEffect(() => {
      // Load teachers from localStorage
      const savedUsers = localStorage.getItem('sys_users');
      if (savedUsers) {
          const allUsers = JSON.parse(savedUsers);
          setTeachers(allUsers.filter((u: any) => u.role === 'GURU'));
      }
      
      // Auto-fill admin username
      if (loginMode === 'ADMIN') {
          setUsername('admin');
      } else {
          setUsername('');
      }
  }, [loginMode]);

  // Derived Data for Student Selection
  const uniqueClasses = useMemo(() => {
    return Array.from(new Set(students.map(s => s.className))).sort();
  }, [students]);

  const studentsInClass = useMemo(() => {
    if (!selectedClass) return [];
    return students
        .filter(s => s.className === selectedClass)
        .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [selectedClass, students]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
        if (loginMode === 'ADMIN') {
            // Hardcoded Admin for safety/simplicity as requested, though usually fetched
            if (username === 'admin' && password === 'admin123') {
                setLoading(false);
                onLogin('ADMIN');
            } else {
                setLoading(false);
                setError('Username atau Password salah.');
            }
        } else if (loginMode === 'GURU') {
            const savedUsers = localStorage.getItem('sys_users');
            const allUsers = savedUsers ? JSON.parse(savedUsers) : [];
            const guru = allUsers.find((u: any) => u.id === selectedGuruId && u.role === 'GURU');
            
            if (guru && guru.password === password) {
                setLoading(false);
                onLogin('GURU');
            } else {
                setLoading(false);
                setError('Password salah atau guru tidak ditemukan');
            }
        } else {
            if (!selectedClass || !selectedStudentId) {
                 setLoading(false);
                 setError('Mohon pilih Kelas dan Nama Anda');
                 return;
            }

            const student = students.find(s => s.id === selectedStudentId);
            if (student) {
                setLoading(false);
                onLogin('STUDENT', student);
            } else {
                setLoading(false);
                setError('Data siswa tidak ditemukan');
            }
        }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center font-sans text-gray-800 transition-all duration-500"
         style={{ backgroundImage: `url('https://4kwallpapers.com/images/wallpapers/macos-big-sur-apple-layers-fluidic-colorful-wwdc-stock-3840x2160-1455.jpg')` }}
    >
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]"></div>
      
      <div className="relative w-full max-w-[900px] h-auto md:h-[550px] flex flex-col md:flex-row rounded-3xl shadow-2xl overflow-hidden animate-fade-in mx-4">
        
        {/* Left Side */}
        <div className="w-full md:w-5/12 bg-white/20 backdrop-blur-xl border-r border-white/20 p-8 flex flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 z-0"></div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm"></div>
                </div>
                <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-lg border border-white/30 mb-6">
                    <GraduationCap className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight mb-2 text-white drop-shadow-md">SiData</h1>
                <p className="text-blue-100 font-medium text-sm leading-relaxed opacity-90">
                    Sistem Informasi Database Terpadu <br/> SMPN 3 Pacet
                </p>
            </div>
            <div className="relative z-10 mt-8 md:mt-0">
                <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold mb-2">Versi Aplikasi</p>
                <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg w-fit backdrop-blur-sm">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <span className="text-xs font-mono">v2.1 macOS UI</span>
                </div>
            </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-7/12 bg-white/70 backdrop-blur-3xl p-8 md:p-12 flex flex-col justify-center relative">
            <div className="absolute top-6 right-6">
                <div className="bg-gray-200/50 p-1 rounded-lg flex shadow-inner gap-1">
                    <button onClick={() => { setLoginMode('ADMIN'); setError(''); }} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${loginMode === 'ADMIN' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Admin</button>
                    <button onClick={() => { setLoginMode('GURU'); setError(''); }} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${loginMode === 'GURU' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Guru</button>
                    <button onClick={() => { setLoginMode('STUDENT'); setError(''); }} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${loginMode === 'STUDENT' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Siswa</button>
                </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-1 mt-8 md:mt-0">
                {loginMode === 'ADMIN' ? 'Login Admin' : loginMode === 'GURU' ? 'Login Guru' : 'Halo Siswa'}
            </h2>
            <p className="text-gray-500 text-sm mb-8">Silakan masuk untuk melanjutkan.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
            {loginMode === 'ADMIN' && (
                <>
                    <div className="group">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 ml-1">Username</label>
                        <div className="relative">
                            <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input type="text" value={username} readOnly className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-100 border border-gray-200 text-gray-600 outline-none text-sm font-medium cursor-not-allowed" />
                        </div>
                    </div>
                    <div className="group">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 ml-1">Password</label>
                        <div className="relative">
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-4 pr-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium" placeholder="••••••••" />
                        </div>
                    </div>
                </>
            )}

            {loginMode === 'GURU' && (
                <>
                    <div className="group">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 ml-1">Nama Guru</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <select 
                                value={selectedGuruId}
                                onChange={(e) => setSelectedGuruId(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 appearance-none rounded-xl bg-white/50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium cursor-pointer"
                            >
                                <option value="" disabled>-- Pilih Nama Anda --</option>
                                {teachers.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                    <div className="group">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 ml-1">Password</label>
                        <div className="relative">
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-4 pr-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium" placeholder="Password Akun" />
                        </div>
                    </div>
                </>
            )}

            {loginMode === 'STUDENT' && (
                <div className="space-y-5">
                    <div className="group">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 ml-1">Kelas</label>
                        <div className="relative">
                            <School className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <select value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); setSelectedStudentId(''); }} className="w-full pl-10 pr-4 py-3 appearance-none rounded-xl bg-white/50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium cursor-pointer">
                                <option value="" disabled>-- Pilih Kelas --</option>
                                {uniqueClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                    <div className="group">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 ml-1">Nama Siswa</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} disabled={!selectedClass} className={`w-full pl-10 pr-4 py-3 appearance-none rounded-xl border focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium cursor-pointer ${!selectedClass ? 'bg-gray-100 border-transparent text-gray-400 cursor-not-allowed' : 'bg-white/50 border-gray-200 focus:bg-white text-gray-800'}`}>
                                <option value="" disabled>{!selectedClass ? 'Pilih Kelas Dulu' : '-- Cari Nama Anda --'}</option>
                                {studentsInClass.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            )}

            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-fade-in"><div className="bg-red-500 rounded-full p-1"><span className="text-white text-xs font-bold">!</span></div><span className="text-xs font-medium text-red-600">{error}</span></div>}

            <button type="submit" disabled={loading} className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 mt-4">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (<><span>Masuk Sistem</span><ArrowRight className="w-4 h-4" /></>)}
            </button>
            </form>
            
            <div className="mt-8 text-center"><p className="text-[10px] text-gray-400 font-medium">&copy; 2026 Create by Erha</p></div>
        </div>
      </div>
    </div>
  );
};

export default Login;