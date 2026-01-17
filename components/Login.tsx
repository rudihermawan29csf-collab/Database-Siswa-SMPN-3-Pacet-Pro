import React, { useState, useMemo, useEffect } from 'react';
import { GraduationCap, Loader2, UserCog, User, ChevronDown, School, ArrowRight, BookOpen, Lock } from 'lucide-react';
import { Student } from '../types';
import { api } from '../services/api';

interface LoginProps {
  onLogin: (role: 'ADMIN' | 'GURU' | 'STUDENT', studentData?: Student) => void;
  students: Student[]; 
}

const Login: React.FC<LoginProps> = ({ onLogin, students }) => {
  const [loading, setLoading] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loginMode, setLoginMode] = useState<'ADMIN' | 'GURU' | 'STUDENT'>('ADMIN');
  const [error, setError] = useState('');

  // Admin/Guru Form States
  const [username, setUsername] = useState(''); // Used for Admin
  const [selectedGuruId, setSelectedGuruId] = useState(''); // Used for Guru
  const [password, setPassword] = useState('');

  // Student Form States
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  // Added separate password state for student login
  const [studentPassword, setStudentPassword] = useState('');

  // Teachers List
  const [teachers, setTeachers] = useState<any[]>([]);

  // Fetch Users (Teachers) from Cloud on Mount or Mode Change
  useEffect(() => {
      const fetchTeachers = async () => {
          if (loginMode === 'GURU') {
              setLoadingTeachers(true);
              try {
                  const users = await api.getUsers();
                  if (users && users.length > 0) {
                      setTeachers(users.filter((u: any) => u.role === 'GURU'));
                  } else {
                      setTeachers([]);
                  }
              } catch (e) {
                  console.error("Gagal memuat data guru:", e);
              } finally {
                  setLoadingTeachers(false);
              }
          }
      };

      fetchTeachers();
      
      // Auto-fill admin username
      if (loginMode === 'ADMIN') {
          setUsername('admin');
          setPassword('');
      } else if (loginMode === 'STUDENT') {
          setStudentPassword('');
      } else {
          setUsername('');
          setPassword('');
      }
  }, [loginMode]);

  // Derived Data for Student Selection
  const uniqueClasses = useMemo(() => {
    const classSet = new Set(students.map(s => s.className));
    return Array.from(classSet).sort((a: string, b: string) => {
        // Sort logic: VII < VIII < IX, then alphabetically
        const levelA = a.split(' ')[0];
        const levelB = b.split(' ')[0];
        const romanMap: Record<string, number> = { 'VII': 7, 'VIII': 8, 'IX': 9 };
        
        const numA = romanMap[levelA] || 0;
        const numB = romanMap[levelB] || 0;

        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
    });
  }, [students]);

  const studentsInClass = useMemo(() => {
    if (!selectedClass) return [];
    
    // Filter by Class
    const filtered = students.filter(s => s.className === selectedClass);

    // DEDUPLICATE Logic: Ensure unique students by NISN to prevent double names
    const uniqueStudents = new Map();
    filtered.forEach(s => {
        // Use NISN as unique key, fallback to Name if NISN missing
        const key = s.nisn ? s.nisn : s.fullName;
        if (!uniqueStudents.has(key)) {
            uniqueStudents.set(key, s);
        }
    });

    return Array.from(uniqueStudents.values())
        .sort((a: any, b: any) => a.fullName.localeCompare(b.fullName));
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
            const guru = teachers.find(u => u.id === selectedGuruId);
            
            if (guru && guru.password === password) {
                setLoading(false);
                onLogin('GURU');
            } else {
                setLoading(false);
                setError('Password salah atau guru tidak ditemukan');
            }
        } else {
            // STUDENT LOGIN VALIDATION
            if (!selectedClass || !selectedStudentId) {
                 setLoading(false);
                 setError('Mohon pilih Kelas dan Nama Anda');
                 return;
            }

            if (!studentPassword) {
                setLoading(false);
                setError('Mohon masukkan Password (NIS)');
                return;
            }

            const student = students.find(s => s.id === selectedStudentId);
            
            if (student) {
                // Validate Password = NIS
                if (student.nis === studentPassword) {
                    setLoading(false);
                    onLogin('STUDENT', student);
                } else {
                    setLoading(false);
                    setError('Password salah! Gunakan NIS Anda sebagai password.');
                }
            } else {
                setLoading(false);
                setError('Data siswa tidak ditemukan');
            }
        }
    }, 800);
  };

  return (
    // Updated Layout: Changed from items-center to py-10 with scrolling to fix laptop overlap issues
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-cover bg-center font-sans text-gray-800 transition-all duration-500 overflow-y-auto py-10 px-4"
         style={{ backgroundImage: `url('https://4kwallpapers.com/images/wallpapers/macos-big-sur-apple-layers-fluidic-colorful-wwdc-stock-3840x2160-1455.jpg')` }}
    >
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px] fixed"></div>
      
      <div className="relative w-full max-w-[900px] h-auto flex flex-col md:flex-row rounded-3xl shadow-2xl overflow-hidden animate-fade-in z-10 my-auto">
        
        {/* Left Side */}
        <div className="w-full md:w-5/12 bg-white/20 backdrop-blur-xl border-r border-white/20 p-8 flex flex-col justify-between text-white relative overflow-hidden min-h-[300px] md:min-h-[550px]">
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
                    <span className="text-xs font-mono">v2.3 Secure</span>
                </div>
            </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-7/12 bg-white/80 backdrop-blur-3xl p-8 md:p-12 flex flex-col justify-center relative">
            <div className="flex justify-end mb-6 md:absolute md:top-6 md:right-6">
                <div className="bg-gray-200/50 p-1 rounded-lg flex shadow-inner gap-1">
                    <button onClick={() => { setLoginMode('ADMIN'); setError(''); }} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${loginMode === 'ADMIN' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Admin</button>
                    <button onClick={() => { setLoginMode('GURU'); setError(''); }} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${loginMode === 'GURU' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Guru</button>
                    <button onClick={() => { setLoginMode('STUDENT'); setError(''); }} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${loginMode === 'STUDENT' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Siswa</button>
                </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-1 mt-0">
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
                                disabled={loadingTeachers}
                            >
                                <option value="" disabled>{loadingTeachers ? 'Memuat data guru...' : '-- Pilih Nama Anda --'}</option>
                                {teachers.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            {loadingTeachers && <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-500" />}
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
                                {uniqueClasses.map(c => (
                                    <option key={c} value={c}>Kelas {c}</option>
                                ))}
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
                                {studentsInClass.map(s => <option key={s.id as string} value={s.id as string}>{s.fullName}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                    <div className="group">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input 
                                type="password" 
                                value={studentPassword} 
                                onChange={(e) => setStudentPassword(e.target.value)} 
                                disabled={!selectedStudentId}
                                className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium ${!selectedStudentId ? 'bg-gray-100 border-transparent text-gray-400 cursor-not-allowed' : 'bg-white/50 border-gray-200 focus:bg-white'}`}
                                placeholder="Masukkan Password (NIS)" 
                            />
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