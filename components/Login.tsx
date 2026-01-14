import React, { useState, useMemo } from 'react';
import { GraduationCap, Loader2, UserCog, User, ChevronDown, School } from 'lucide-react';
import { Student } from '../types';

interface LoginProps {
  onLogin: (role: 'ADMIN' | 'STUDENT', studentData?: Student) => void;
  students: Student[]; // Receive students from parent
}

const Login: React.FC<LoginProps> = ({ onLogin, students }) => {
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'ADMIN' | 'STUDENT'>('ADMIN');
  const [error, setError] = useState('');

  // Admin Form States
  const [email, setEmail] = useState('admin@smpn3pacet.sch.id');
  const [password, setPassword] = useState('password');

  // Student Form States
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Derived Data for Student Selection using passed props
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
            // Mock Admin Validation
            if (email && password) {
                setLoading(false);
                onLogin('ADMIN');
            } else {
                setLoading(false);
                setError('Email dan password wajib diisi');
            }
        } else {
            // Student Validation (Selection)
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
    <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      
      <div className="relative bg-white/90 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/50 animate-fade-in-up">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/30 mb-4">
             <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SiData SMPN 3 Pacet</h1>
          <p className="text-gray-500 text-sm mt-1">Sistem Informasi Database Terpadu</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-gray-200/80 rounded-lg mb-6">
            <button 
                onClick={() => { setLoginMode('ADMIN'); setError(''); }}
                className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-md transition-all ${
                    loginMode === 'ADMIN' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <UserCog className="w-4 h-4 mr-2" />
                Guru / Admin
            </button>
            <button 
                onClick={() => { setLoginMode('STUDENT'); setError(''); }}
                className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-md transition-all ${
                    loginMode === 'STUDENT' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <User className="w-4 h-4 mr-2" />
                Siswa
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {loginMode === 'ADMIN' ? (
              <>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email / NIP</label>
                    <input 
                        type="text" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                        placeholder="admin@smpn3pacet.sch.id"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Password</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                        placeholder="••••••••"
                    />
                </div>
              </>
          ) : (
               <div className="space-y-4">
                    {/* Class Selector */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Pilih Kelas</label>
                        <div className="relative">
                            <select 
                                value={selectedClass}
                                onChange={(e) => {
                                    setSelectedClass(e.target.value);
                                    setSelectedStudentId(''); // Reset student when class changes
                                }}
                                className="w-full px-4 py-3 appearance-none rounded-lg bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium text-gray-800"
                            >
                                <option value="" disabled>-- Pilih Kelas --</option>
                                {uniqueClasses.map(c => (
                                    <option key={c} value={c}>Kelas {c}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                <School className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    {/* Student Selector */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Pilih Nama Anda</label>
                        <div className="relative">
                            <select 
                                value={selectedStudentId}
                                onChange={(e) => setSelectedStudentId(e.target.value)}
                                disabled={!selectedClass}
                                className={`w-full px-4 py-3 appearance-none rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium ${
                                    !selectedClass ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50 text-gray-800'
                                }`}
                            >
                                <option value="" disabled>
                                    {!selectedClass ? '-- Pilih Kelas Terlebih Dahulu --' : '-- Cari Nama Anda --'}
                                </option>
                                {studentsInClass.map(s => (
                                    <option key={s.id} value={s.id}>{s.fullName}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>
                        {selectedClass && (
                             <p className="text-[10px] text-gray-500 mt-2 text-right">
                                {studentsInClass.length} Siswa ditemukan di Kelas {selectedClass}
                            </p>
                        )}
                    </div>
                </div>
          )}

          {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs font-medium flex items-center animate-fade-in">
                  <span className="mr-2">⚠️</span> {error}
              </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02] flex items-center justify-center mt-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (loginMode === 'ADMIN' ? 'Masuk Dashboard' : 'Masuk Sistem')}
          </button>
        </form>

        <div className="mt-8 text-center text-[10px] text-gray-400">
            &copy; 2024 SMP Negeri 3 Pacet. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default Login;