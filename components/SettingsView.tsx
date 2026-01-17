import React, { useState, useEffect } from 'react';
import { Save, School, Calendar, Users, Lock, Check, UploadCloud, Loader2, BookOpen, Plus, Trash2, LayoutList, Calculator, Pencil, X, Eye, EyeOff, RefreshCw, Cloud, FileText, FolderOpen, FileBadge, Database } from 'lucide-react';
import { api } from '../services/api';
import { MOCK_STUDENTS } from '../services/mockData';

// Default constants used as fallback
const DEFAULT_CLASS_LIST = ['VII A', 'VII B', 'VII C', 'VIII A', 'VIII B', 'VIII C', 'IX A', 'IX B', 'IX C'];
const LEVEL_LIST = ['VII', 'VIII', 'IX']; 
const THEMES_LIST = [
    'Gaya Hidup Berkelanjutan',
    'Kearifan Lokal',
    'Bhinneka Tunggal Ika',
    'Bangunlah Jiwa dan Raganya',
    'Suara Demokrasi',
    'Berekayasa dan Berteknologi untuk Membanguan NKRI',
    'Kewirausahaan',
    'Kebekerjaan'
];

const SUBJECT_MAP_CONFIG = [
    { key: 'PAI', label: 'PAI', full: 'Pendidikan Agama dan Budi Pekerti' },
    { key: 'Pendidikan Pancasila', label: 'PPKn', full: 'Pendidikan Pancasila' },
    { key: 'Bahasa Indonesia', label: 'BIN', full: 'Bahasa Indonesia' },
    { key: 'Matematika', label: 'MTK', full: 'Matematika' },
    { key: 'IPA', label: 'IPA', full: 'Ilmu Pengetahuan Alam' },
    { key: 'IPS', label: 'IPS', full: 'Ilmu Pengetahuan Sosial' },
    { key: 'Bahasa Inggris', label: 'BIG', full: 'Bahasa Inggris' },
    { key: 'PJOK', label: 'PJOK', full: 'PJOK' },
    { key: 'Informatika', label: 'INF', full: 'Informatika' },
    { key: 'Seni dan Prakarya', label: 'SENI', full: 'Seni dan Prakarya' },
    { key: 'Bahasa Jawa', label: 'B.JAWA', full: 'Bahasa Jawa' },
];

const MASTER_DOC_LIST = [
    { id: 'IJAZAH', label: 'Ijazah SD', desc: 'Ijazah Asli' },
    { id: 'AKTA', label: 'Akta Kelahiran', desc: 'Scan Asli' },
    { id: 'KK', label: 'Kartu Keluarga', desc: 'Terbaru' },
    { id: 'KTP_AYAH', label: 'KTP Ayah', desc: 'Scan KTP' },
    { id: 'KTP_IBU', label: 'KTP Ibu', desc: 'Scan KTP' },
    { id: 'FOTO', label: 'Pas Foto', desc: '3x4 Warna' },
    { id: 'KARTU_PELAJAR', label: 'Kartu Pelajar', desc: 'Depan Belakang' },
    { id: 'KIP', label: 'KIP / PKH', desc: 'Jika ada' },
    { id: 'SKL', label: 'SKL', desc: 'Surat Ket Lulus' },
    { id: 'NISN', label: 'Kartu/Bukti NISN', desc: 'Dokumen NISN' },
];

const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'ACADEMIC' | 'USERS' | 'KELAS' | 'P5' | 'REKAP' | 'DOCS' | 'SKL'>('IDENTITY');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingUsers, setIsSavingUsers] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // General Settings Loading State
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Mock Data Global
  const [schoolData, setSchoolData] = useState({
      name: 'SMP Negeri 3 Pacet',
      npsn: '20502xxx',
      address: 'Jalan Raya Pacet No. 12',
      headmaster: 'Didik Sulistyo, M.M.Pd',
      nip: '19660518198901 1 002'
  });

  interface AcademicData {
      year: string;
      semester: string;
      reportDate: string;
      semesterYears: Record<string, Record<number, string>>; 
      semesterDates: Record<string, Record<number, string>>; 
  }

  const [academicData, setAcademicData] = useState<AcademicData>({
      year: '2024/2025',
      semester: '1',
      reportDate: '2024-12-20',
      semesterYears: {
          'VII': { 1: '2024/2025', 2: '2024/2025', 3: '2025/2026', 4: '2025/2026', 5: '2026/2027', 6: '2026/2027' },
          'VIII': { 1: '2023/2024', 2: '2023/2024', 3: '2024/2025', 4: '2024/2025', 5: '2025/2026', 6: '2025/2026' },
          'IX': { 1: '2022/2023', 2: '2022/2023', 3: '2023/2024', 4: '2023/2024', 5: '2024/2025', 6: '2024/2025' },
      },
      semesterDates: {
          'VII': { 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' },
          'VIII': { 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' },
          'IX': { 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' },
      }
  });

  // --- USER MANAGEMENT ---
  const [users, setUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [newUser, setNewUser] = useState({ name: '', password: '' });
  const [showPassword, setShowPassword] = useState<string | null>(null);

  // --- CLASS & WALI KELAS SETTINGS ---
  const [selectedYearClass, setSelectedYearClass] = useState('2024/2025');
  const [selectedSemesterClass, setSelectedSemesterClass] = useState(1);
  const [classConfig, setClassConfig] = useState<Record<string, { teacher: string, nip: string }>>({});
  
  // DYNAMIC CLASS LIST STATE
  const [availableClasses, setAvailableClasses] = useState<string[]>(DEFAULT_CLASS_LIST);
  const [newClassName, setNewClassName] = useState('');
  const [isSyncingClasses, setIsSyncingClasses] = useState(false);

  // --- P5 SETTINGS ---
  const [p5Filter, setP5Filter] = useState({ year: '2024/2025', level: 'VII', semester: 1 });
  const [p5Config, setP5Config] = useState<Record<string, { theme: string, description: string }[]>>({});

  // --- REKAP 5 SEMESTER SETTINGS ---
  const [recapSubjects, setRecapSubjects] = useState<string[]>(SUBJECT_MAP_CONFIG.map(s => s.key));

  // --- DOCS & RAPOR SETTINGS ---
  const [docConfig, setDocConfig] = useState<string[]>(['IJAZAH', 'AKTA', 'KK', 'KTP_AYAH', 'KTP_IBU', 'FOTO']);
  const [raporPageCount, setRaporPageCount] = useState<number>(3);

  // --- SKL SETTINGS ---
  const [sklConfig, setSklConfig] = useState({
      nomorSurat: '421.3/ 1457 /416-101.64/2025',
      nomorSK: '421.3/1456/416-101.64/2025',
      tanggalKeputusan: '2 Juni 2025',
      tanggalSurat: '2 Juni 2025',
      titimangsa: 'Mojokerto',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Lambang_Kabupaten_Mojokerto.png',
      headerLine1: 'Jl. Tirtawening Ds. Kembangbelor Kec. Pacet Kab. Mojokerto Kode Pos 61374',
      headerLine2: 'NSS: 201050314970 NIS: 200970 NPSN: 20555784',
      headerLine3: 'Email : smpn3pacet2007@gmail.com, HP: 0815 5386 0273'
  });

  // INITIAL LOAD FROM CLOUD
  useEffect(() => {
      const initSettings = async () => {
          setIsLoadingSettings(true);
          try {
              // 1. Fetch General Settings
              const cloudSettings = await api.getAppSettings();
              if (cloudSettings) {
                  if (cloudSettings.schoolData) setSchoolData(cloudSettings.schoolData);
                  
                  if (cloudSettings.academicData) {
                      const ad = cloudSettings.academicData;
                      
                      // Migration Logic
                      if (!ad.semesterYears || !ad.semesterYears['VII']) {
                          const flatYears = ad.semesterYears || {};
                          const flatDates = ad.semesterDates || {};
                          
                          ad.semesterYears = {
                              'VII': { ...flatYears },
                              'VIII': { ...flatYears },
                              'IX': { ...flatYears }
                          };
                          ad.semesterDates = {
                              'VII': { ...flatDates },
                              'VIII': { ...flatDates },
                              'IX': { ...flatDates }
                          };
                      }
                      
                      setAcademicData(ad);
                  }
                  
                  if (cloudSettings.classConfig) setClassConfig(cloudSettings.classConfig);
                  if (cloudSettings.p5Config) setP5Config(cloudSettings.p5Config);
                  if (cloudSettings.recapSubjects) setRecapSubjects(cloudSettings.recapSubjects);
                  
                  // Load Doc Config
                  if (cloudSettings.docConfig) setDocConfig(cloudSettings.docConfig);
                  if (cloudSettings.raporPageCount) setRaporPageCount(Number(cloudSettings.raporPageCount));

                  // Load SKL Config
                  if (cloudSettings.sklConfig) {
                      setSklConfig(prev => ({
                          ...prev,
                          ...cloudSettings.sklConfig,
                          headerLine1: cloudSettings.sklConfig.headerLine1 || prev.headerLine1,
                          headerLine2: cloudSettings.sklConfig.headerLine2 || prev.headerLine2,
                          headerLine3: cloudSettings.sklConfig.headerLine3 || prev.headerLine3
                      }));
                  }

                  // Load Class List
                  if (cloudSettings.classList && Array.isArray(cloudSettings.classList)) {
                      setAvailableClasses(cloudSettings.classList.sort());
                  }
              }

              // 2. Fetch Users
              const onlineUsers = await api.getUsers();
              if (onlineUsers && onlineUsers.length > 0) {
                  setUsers(onlineUsers);
              } else {
                  setUsers([{ id: 'admin', username: 'admin', name: 'Administrator', password: 'admin123', role: 'ADMIN' }]);
              }

          } catch (e) {
              console.error("Failed to load settings", e);
          } finally {
              setIsLoadingSettings(false);
              setIsLoadingUsers(false);
          }
      };

      initSettings();
  }, []);

  // SAVE ALL SETTINGS TO CLOUD
  const handleSave = async () => {
      setIsSavingSettings(true);
      const settingsPayload = {
          schoolData,
          academicData,
          classConfig,
          p5Config,
          recapSubjects,
          docConfig,
          raporPageCount,
          sklConfig,
          classList: availableClasses // Save dynamic class list
      };

      localStorage.setItem('sys_recap_config', JSON.stringify(recapSubjects));
      localStorage.setItem('sys_doc_config', JSON.stringify(docConfig));
      localStorage.setItem('sys_rapor_config', String(raporPageCount));
      localStorage.setItem('skl_config', JSON.stringify(sklConfig));

      const success = await api.saveAppSettings(settingsPayload);
      setIsSavingSettings(false);

      if (success) {
          alert("✅ Semua pengaturan berhasil disimpan ke Cloud!");
      } else {
          alert("❌ Gagal menyimpan pengaturan. Periksa koneksi.");
      }
  };

  const handleInitialSync = async () => {
      if(!window.confirm("Ini akan menimpa data SISWA di Google Sheets dengan Data Mockup lokal. Lanjutkan?")) return;
      
      setIsSyncing(true);
      const success = await api.syncInitialData(MOCK_STUDENTS);
      setIsSyncing(false);
      
      if (success) alert("Sinkronisasi Data Siswa Berhasil!");
      else alert("Sinkronisasi Gagal. Cek Console.");
  };

  // Helper function to update nested academic data
  const handleAcademicChange = (type: 'year' | 'date', level: string, semester: number, value: string) => {
      setAcademicData(prev => ({
          ...prev,
          [type === 'year' ? 'semesterYears' : 'semesterDates']: {
              ...prev[type === 'year' ? 'semesterYears' : 'semesterDates'],
              [level]: {
                  ...prev[type === 'year' ? 'semesterYears' : 'semesterDates'][level],
                  [semester]: value
              }
          }
      }));
  };

  // Class Config Handlers
  const handleWaliChange = (className: string, field: 'teacher' | 'nip', value: string) => {
      const key = `${selectedYearClass}-${selectedSemesterClass}-${className}`;
      setClassConfig(prev => ({
          ...prev,
          [key]: {
              ...prev[key],
              [field]: value
          }
      }));
  };

  // DYNAMIC CLASS MANAGEMENT
  const handleAddClass = () => {
      if (!newClassName.trim()) return;
      if (!availableClasses.includes(newClassName.trim())) {
          setAvailableClasses(prev => [...prev, newClassName.trim()].sort());
          setNewClassName('');
      } else {
          alert("Kelas sudah ada!");
      }
  };

  const handleDeleteClass = (className: string) => {
      if (window.confirm(`Hapus kelas ${className} dari daftar? Konfigurasi wali kelas terkait mungkin hilang.`)) {
          setAvailableClasses(prev => prev.filter(c => c !== className));
      }
  };

  const handleSyncClassesFromDB = async () => {
      setIsSyncingClasses(true);
      try {
          const students = await api.getStudents();
          const dbClasses = new Set(students.map(s => s.className).filter(Boolean));
          
          if (dbClasses.size > 0) {
              setAvailableClasses(prev => {
                  const combined = new Set([...prev, ...Array.from(dbClasses)]);
                  return Array.from(combined).sort();
              });
              alert(`Berhasil sinkronisasi. Total ${dbClasses.size} kelas ditemukan di database.`);
          } else {
              alert("Tidak ada data siswa atau kelas ditemukan di database.");
          }
      } catch (e) {
          console.error(e);
          alert("Gagal mengambil data dari database.");
      } finally {
          setIsSyncingClasses(false);
      }
  };

  // P5 Config Handlers
  const getCurrentP5Key = () => `${p5Filter.year}-${p5Filter.level}-${p5Filter.semester}`;
  
  const getCurrentP5List = () => {
      return p5Config[getCurrentP5Key()] || [];
  };

  const getSemestersForLevel = (level: string) => {
      if (level === 'VII') return [1, 2];
      if (level === 'VIII') return [3, 4];
      if (level === 'IX') return [5, 6];
      return [1, 2, 3, 4, 5, 6];
  }

  const addP5Project = () => {
      const key = getCurrentP5Key();
      const currentList = p5Config[key] || [];
      setP5Config({
          ...p5Config,
          [key]: [...currentList, { theme: THEMES_LIST[0], description: '' }]
      });
  };

  const updateP5Project = (index: number, field: 'theme' | 'description', value: string) => {
      const key = getCurrentP5Key();
      const list = [...(p5Config[key] || [])];
      list[index] = { ...list[index], [field]: value };
      setP5Config({ ...p5Config, [key]: list });
  };

  const removeP5Project = (index: number) => {
      const key = getCurrentP5Key();
      const list = [...(p5Config[key] || [])];
      list.splice(index, 1);
      setP5Config({ ...p5Config, [key]: list });
  };

  const toggleRecapSubject = (key: string) => {
      if (recapSubjects.includes(key)) {
          setRecapSubjects(prev => prev.filter(k => k !== key));
      } else {
          setRecapSubjects(prev => [...prev, key]);
      }
  };

  const toggleDocConfig = (id: string) => {
      if (docConfig.includes(id)) {
          setDocConfig(prev => prev.filter(d => d !== id));
      } else {
          setDocConfig(prev => [...prev, id]);
      }
  };

  // --- USER MANAGEMENT HANDLERS ---
  const fetchUsers = async () => {
      setIsLoadingUsers(true);
      const onlineUsers = await api.getUsers();
      if (onlineUsers && onlineUsers.length > 0) setUsers(onlineUsers);
      setIsLoadingUsers(false);
  };

  const saveUsersToCloud = async (updatedUsers: any[]) => {
      setIsSavingUsers(true);
      const success = await api.updateUsers(updatedUsers);
      setIsSavingUsers(false);
      if (success) {
          setUsers(updatedUsers);
      } else {
          alert("Gagal menyimpan data user ke Cloud.");
      }
  };

  const handleAddUser = () => {
      if (!newUser.name || !newUser.password) {
          alert('Nama dan Password harus diisi');
          return;
      }
      const newGuru = {
          id: Math.random().toString(36).substr(2, 9),
          username: newUser.name.toLowerCase().replace(/\s+/g, ''),
          name: newUser.name,
          password: newUser.password,
          role: 'GURU'
      };
      const updatedUsers = [...users, newGuru];
      saveUsersToCloud(updatedUsers);
      setNewUser({ name: '', password: '' });
  };

  const handleDeleteUser = (id: string) => {
      if (window.confirm('Hapus user ini?')) {
          const updatedUsers = users.filter(u => u.id !== id);
          saveUsersToCloud(updatedUsers);
      }
  };

  const handleUpdateUser = () => {
      if (!editingUser) return;
      const updatedUsers = users.map(u => u.id === editingUser.id ? editingUser : u);
      saveUsersToCloud(updatedUsers);
      setEditingUser(null);
  };

  const TabButton = ({ id, label, icon: Icon }: any) => (
      <button 
        onClick={() => setActiveTab(id)}
        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === id ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
      >
          <Icon className="w-4 h-4" />
          {label}
      </button>
  );

  if (isLoadingSettings) {
      return (
          <div className="flex items-center justify-center h-full flex-col text-gray-500">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
              <p>Menyinkronkan Pengaturan dari Cloud...</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in space-y-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                Pengaturan Sistem <Cloud className="w-4 h-4 text-green-500" />
            </h2>
            <div className="flex gap-2">
                <button 
                    onClick={handleInitialSync} 
                    disabled={isSyncing}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-sm transition-transform active:scale-95 disabled:opacity-50"
                >
                    {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                    Sync Data Siswa
                </button>
                <button onClick={handleSave} disabled={isSavingSettings} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-transform active:scale-95 disabled:opacity-50">
                    {isSavingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} 
                    Simpan Config
                </button>
            </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1">
            <div className="flex border-b border-gray-200 overflow-x-auto">
                <TabButton id="IDENTITY" label="Identitas Sekolah" icon={School} />
                <TabButton id="ACADEMIC" label="Tahun Ajaran" icon={Calendar} />
                <TabButton id="SKL" label="Pengaturan SKL" icon={FileBadge} />
                <TabButton id="KELAS" label="Data Kelas & Wali" icon={BookOpen} />
                <TabButton id="DOCS" label="Dokumen & Rapor" icon={FolderOpen} />
                <TabButton id="P5" label="Setting P5" icon={LayoutList} />
                <TabButton id="REKAP" label="Rekap 5 Semester" icon={Calculator} />
                <TabButton id="USERS" label="Manajemen User" icon={Users} />
            </div>

            <div className="p-6 flex-1 overflow-auto bg-gray-50/50 pb-32">
                
                {/* ... (Identity Tab omitted - same as before) ... */}
                {activeTab === 'IDENTITY' && (
                    <div className="max-w-2xl space-y-4 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Sekolah</label>
                                <input type="text" className="w-full p-2 border rounded-lg text-sm" value={schoolData.name} onChange={e => setSchoolData({...schoolData, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">NPSN</label>
                                <input type="text" className="w-full p-2 border rounded-lg text-sm" value={schoolData.npsn} onChange={e => setSchoolData({...schoolData, npsn: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Alamat Lengkap</label>
                            <textarea className="w-full p-2 border rounded-lg text-sm" rows={3} value={schoolData.address} onChange={e => setSchoolData({...schoolData, address: e.target.value})} />
                        </div>
                        <div className="border-t pt-4 mt-4">
                            <h3 className="text-sm font-bold text-gray-800 mb-3">Data Kepala Sekolah</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Kepala Sekolah</label>
                                    <input type="text" className="w-full p-2 border rounded-lg text-sm" value={schoolData.headmaster} onChange={e => setSchoolData({...schoolData, headmaster: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">NIP</label>
                                    <input type="text" className="w-full p-2 border rounded-lg text-sm" value={schoolData.nip} onChange={e => setSchoolData({...schoolData, nip: e.target.value})} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- ACADEMIC TAB (UPDATED FOR GRADE-LEVEL SPECIFICITY) --- */}
                {activeTab === 'ACADEMIC' && (
                    <div className="max-w-6xl space-y-6">
                         <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                             <p className="text-sm text-blue-800 font-medium">
                                 Pengaturan ini menentukan <strong>Tahun Pelajaran</strong> dan <strong>Tanggal Rapor</strong> yang akan tercetak pada rapor siswa.
                                 <br/>Anda dapat mengatur tahun ajaran yang berbeda untuk setiap jenjang (VII, VIII, IX) dan setiap semester (1-6).
                             </p>
                         </div>
                         
                         <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Semester Aktif (Sistem Global)</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-4 py-2 rounded-lg border hover:bg-gray-100">
                                    <input type="radio" name="sem" checked={academicData.semester === '1'} onChange={() => setAcademicData({...academicData, semester: '1'})} />
                                    <span className="text-sm font-bold text-gray-700">Semester Ganjil (1)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-4 py-2 rounded-lg border hover:bg-gray-100">
                                    <input type="radio" name="sem" checked={academicData.semester === '2'} onChange={() => setAcademicData({...academicData, semester: '2'})} />
                                    <span className="text-sm font-bold text-gray-700">Semester Genap (2)</span>
                                </label>
                            </div>
                         </div>

                         {/* LOOP THROUGH LEVELS VII, VIII, IX */}
                         {LEVEL_LIST.map(level => (
                             <div key={level} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                 <div className="bg-gray-100 px-6 py-4 border-b border-gray-200">
                                     <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                         <School className="w-5 h-5 text-blue-600" />
                                         Pengaturan Jenjang Kelas {level}
                                     </h3>
                                 </div>
                                 <div className="p-6">
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                         {/* YEAR CONFIG */}
                                         <div>
                                             <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 border-b pb-1">Tahun Pelajaran (Per Semester)</h4>
                                             <div className="grid grid-cols-2 gap-3">
                                                 {[1, 2, 3, 4, 5, 6].map(sem => (
                                                     <div key={sem} className="flex flex-col gap-1">
                                                         <label className="text-[10px] font-semibold text-gray-600">Semester {sem}</label>
                                                         <input 
                                                             type="text" 
                                                             className="w-full p-2 border rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                                             placeholder="Contoh: 2024/2025"
                                                             value={academicData.semesterYears?.[level]?.[sem] || ''}
                                                             onChange={e => handleAcademicChange('year', level, sem, e.target.value)}
                                                         />
                                                     </div>
                                                 ))}
                                             </div>
                                         </div>

                                         {/* DATE CONFIG */}
                                         <div>
                                             <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 border-b pb-1">Tanggal Rapor (Per Semester)</h4>
                                             <div className="grid grid-cols-2 gap-3">
                                                 {[1, 2, 3, 4, 5, 6].map(sem => (
                                                     <div key={sem} className="flex flex-col gap-1">
                                                         <label className="text-[10px] font-semibold text-gray-600">Tanggal Sem {sem}</label>
                                                         <input 
                                                             type="date" 
                                                             className="w-full p-2 border rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                                             value={academicData.semesterDates?.[level]?.[sem] || ''}
                                                             onChange={e => handleAcademicChange('date', level, sem, e.target.value)}
                                                         />
                                                     </div>
                                                 ))}
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                         ))}
                    </div>
                )}

                {/* ... (SKL tab omitted - same as before) ... */}
                {activeTab === 'SKL' && (
                    <div className="max-w-2xl space-y-4 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                        <h3 className="font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
                            <FileBadge className="w-5 h-5 text-blue-600" />
                            Konfigurasi Surat Keterangan Lulus
                        </h3>
                        <div className="space-y-4">
                            {/* ... Content same as provided ... */}
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                                <h4 className="text-sm font-bold text-blue-800 mb-2">Header / Kop Surat (Alamat & Kontak)</h4>
                                <div className="space-y-2">
                                    <div>
                                        <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Baris 1 (Jalan/Desa/Kec/Kab)</label>
                                        <input 
                                            type="text" 
                                            className="w-full p-2 border border-blue-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-300"
                                            value={sklConfig.headerLine1}
                                            onChange={(e) => setSklConfig({...sklConfig, headerLine1: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Baris 2 (Kode Identitas Sekolah)</label>
                                        <input 
                                            type="text" 
                                            className="w-full p-2 border border-blue-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-300"
                                            value={sklConfig.headerLine2}
                                            onChange={(e) => setSklConfig({...sklConfig, headerLine2: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Baris 3 (Kontak Email/HP)</label>
                                        <input 
                                            type="text" 
                                            className="w-full p-2 border border-blue-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-300"
                                            value={sklConfig.headerLine3}
                                            onChange={(e) => setSklConfig({...sklConfig, headerLine3: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">URL Logo Instansi (Kop Surat)</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={sklConfig.logoUrl}
                                    onChange={(e) => setSklConfig({...sklConfig, logoUrl: e.target.value})}
                                    placeholder="https://..."
                                />
                                <p className="text-[10px] text-gray-500 mt-1">
                                    Gunakan <strong>Direct Link</strong> gambar (harus berakhiran .png, .jpg, atau .jpeg). <br/>
                                    Contoh: <code>https://iili.io/fUaqCDQ.png</code> (Bukan link web viewer).
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nomor Surat (Header)</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={sklConfig.nomorSurat}
                                    onChange={(e) => setSklConfig({...sklConfig, nomorSurat: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nomor Surat Keputusan (Isi)</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={sklConfig.nomorSK}
                                    onChange={(e) => setSklConfig({...sklConfig, nomorSK: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Tanggal Keputusan/Kelulusan</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={sklConfig.tanggalKeputusan}
                                    onChange={(e) => setSklConfig({...sklConfig, tanggalKeputusan: e.target.value})}
                                    placeholder="Contoh: 2 Juni 2025"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Titimangsa (Tempat)</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={sklConfig.titimangsa}
                                        onChange={(e) => setSklConfig({...sklConfig, titimangsa: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Tanggal Surat (TTD)</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={sklConfig.tanggalSurat}
                                        onChange={(e) => setSklConfig({...sklConfig, tanggalSurat: e.target.value})}
                                    />
                                </div>
                            </div>
                            
                            <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-xs text-yellow-800 mt-4">
                                <p className="font-bold mb-1">Info:</p>
                                <p>Pastikan klik tombol <strong>"Simpan Config"</strong> di pojok kanan atas setelah melakukan perubahan agar data tersimpan di server.</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'KELAS' && (
                    <div className="space-y-4">
                        {/* CLASS MANAGEMENT SECTION (NEW) */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Kelola Daftar Kelas</h3>
                            <div className="flex flex-col md:flex-row gap-4 mb-4">
                                <div className="flex-1 flex gap-2">
                                    <input 
                                        type="text" 
                                        className="p-2 border rounded-lg text-sm flex-1 outline-none focus:ring-2 focus:ring-blue-500" 
                                        placeholder="Tambah Kelas Baru (Contoh: VII D)" 
                                        value={newClassName}
                                        onChange={(e) => setNewClassName(e.target.value)}
                                    />
                                    <button onClick={handleAddClass} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-2">
                                        <Plus className="w-4 h-4" /> Tambah
                                    </button>
                                </div>
                                <button 
                                    onClick={handleSyncClassesFromDB} 
                                    disabled={isSyncingClasses}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                                >
                                    {isSyncingClasses ? <Loader2 className="w-4 h-4 animate-spin"/> : <Database className="w-4 h-4" />} 
                                    Ambil dari Database
                                </button>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100 max-h-32 overflow-y-auto">
                                {availableClasses.length > 0 ? availableClasses.map(cls => (
                                    <div key={cls} className="flex items-center gap-2 bg-white px-3 py-1 rounded-full text-xs font-bold text-gray-700 border shadow-sm group">
                                        {cls}
                                        <button onClick={() => handleDeleteClass(cls)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )) : <span className="text-xs text-gray-400 italic p-2">Belum ada kelas terdaftar.</span>}
                            </div>
                        </div>

                        {/* WALI KELAS ASSIGNMENT */}
                        <div className="flex flex-col md:flex-row items-center gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm mt-2">
                            <div className="flex flex-col gap-1 w-full md:w-auto">
                                <span className="text-xs font-bold text-gray-500 uppercase">Tahun Pelajaran (Manual)</span>
                                <input 
                                    type="text"
                                    className="p-2 border rounded-lg text-sm font-medium bg-gray-50 w-full md:w-48"
                                    placeholder="2024/2025"
                                    value={selectedYearClass}
                                    onChange={(e) => setSelectedYearClass(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-1 w-full md:w-auto">
                                <span className="text-xs font-bold text-gray-500 uppercase">Semester</span>
                                <select 
                                    className="p-2 border rounded-lg text-sm font-medium bg-gray-50 w-full md:w-48"
                                    value={selectedSemesterClass}
                                    onChange={(e) => setSelectedSemesterClass(Number(e.target.value))}
                                >
                                    {[1, 2, 3, 4, 5, 6].map(sem => (
                                        <option key={sem} value={sem}>Semester {sem}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-100 border-b border-gray-200 uppercase text-xs font-bold text-gray-600">
                                    <tr>
                                        <th className="p-4 w-32">Kelas</th>
                                        <th className="p-4">Nama Wali Kelas</th>
                                        <th className="p-4">NIP Wali Kelas</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {availableClasses.map(cls => {
                                        const key = `${selectedYearClass}-${selectedSemesterClass}-${cls}`;
                                        const data = classConfig[key] || { teacher: '', nip: '' };
                                        return (
                                            <tr key={cls} className="hover:bg-blue-50/50 transition-colors">
                                                <td className="p-4 font-bold text-gray-800">{cls}</td>
                                                <td className="p-4">
                                                    <input 
                                                        type="text" 
                                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                                        placeholder="Nama Lengkap & Gelar"
                                                        value={data.teacher}
                                                        onChange={(e) => handleWaliChange(cls, 'teacher', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <input 
                                                        type="text" 
                                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                                        placeholder="NIP (18 digit)"
                                                        value={data.nip}
                                                        onChange={(e) => handleWaliChange(cls, 'nip', e.target.value)}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {availableClasses.length === 0 && (
                                        <tr><td colSpan={3} className="p-8 text-center text-gray-400">Belum ada kelas. Tambahkan kelas di atas.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ... (DOCS, P5, REKAP, USERS tabs omitted - same as before) ... */}
                {activeTab === 'DOCS' && (
                    <div className="max-w-4xl space-y-6">
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                Setting Halaman Rapor
                            </h3>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-semibold text-gray-700">Jumlah Halaman Rapor per Semester yang Wajib Diupload:</label>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="20"
                                        className="w-24 p-2 border border-gray-300 rounded-lg text-center font-bold"
                                        value={raporPageCount} 
                                        onChange={e => setRaporPageCount(Math.max(1, Number(e.target.value)))}
                                    />
                                    <span className="text-sm text-gray-500">Halaman / Semester</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Siswa akan melihat sejumlah slot upload sesuai angka ini untuk setiap semester (1-6).</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                                <FolderOpen className="w-5 h-5 text-orange-600" />
                                Setting Dokumen Persyaratan
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">Pilih dokumen apa saja yang <span className="font-bold">WAJIB</span> diupload oleh siswa dan ditampilkan di menu Dokumen.</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {MASTER_DOC_LIST.map(doc => (
                                    <label key={doc.id} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${docConfig.includes(doc.id) ? 'bg-orange-50 border-orange-200 shadow-sm' : 'bg-white hover:bg-gray-50'}`}>
                                        <input 
                                            type="checkbox" 
                                            className="w-5 h-5 text-orange-600 rounded mt-0.5 focus:ring-orange-500"
                                            checked={docConfig.includes(doc.id)}
                                            onChange={() => toggleDocConfig(doc.id)}
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-800">{doc.label}</span>
                                            <span className="text-[10px] text-gray-500">{doc.desc}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'P5' && (
                    <div className="space-y-4">
                        {/* ... P5 Content ... */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                            <div className="flex flex-col gap-1 w-full md:w-auto">
                                <span className="text-xs font-bold text-gray-500 uppercase">Tahun Pelajaran (Manual)</span>
                                <input 
                                    type="text"
                                    className="p-2 border rounded-lg text-sm bg-gray-50 w-full md:w-48"
                                    placeholder="2024/2025"
                                    value={p5Filter.year}
                                    onChange={(e) => setP5Filter({...p5Filter, year: e.target.value})}
                                />
                            </div>
                            <div className="flex flex-col gap-1 w-full md:w-auto">
                                <span className="text-xs font-bold text-gray-500 uppercase">Tingkat Kelas</span>
                                <select 
                                    className="p-2 border rounded-lg text-sm bg-gray-50"
                                    value={p5Filter.level}
                                    onChange={(e) => {
                                        const newLevel = e.target.value;
                                        setP5Filter(prev => ({
                                            ...prev, 
                                            level: newLevel,
                                            semester: getSemestersForLevel(newLevel)[0]
                                        }));
                                    }}
                                >
                                    <option value="VII">Kelas VII (Fase D)</option>
                                    <option value="VIII">Kelas VIII (Fase D)</option>
                                    <option value="IX">Kelas IX (Fase D)</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1 w-full md:w-auto">
                                <span className="text-xs font-bold text-gray-500 uppercase">Semester</span>
                                <select 
                                    className="p-2 border rounded-lg text-sm bg-gray-50"
                                    value={p5Filter.semester}
                                    onChange={(e) => setP5Filter({...p5Filter, semester: Number(e.target.value)})}
                                >
                                    {getSemestersForLevel(p5Filter.level).map(s => (
                                        <option key={s} value={s}>Semester {s}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-800">Daftar Tema & Projek</h3>
                                <button onClick={addP5Project} className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700">
                                    <Plus className="w-3 h-3 mr-1" /> Tambah Tema
                                </button>
                            </div>

                            <div className="space-y-4">
                                {getCurrentP5List().length > 0 ? getCurrentP5List().map((item, idx) => (
                                    <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative group">
                                        <button 
                                            onClick={() => removeP5Project(idx)}
                                            className="absolute top-2 right-2 p-1.5 bg-white border border-red-200 text-red-500 rounded hover:bg-red-50"
                                            title="Hapus Projek"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tema Projek {idx + 1}</label>
                                                <select 
                                                    className="w-full p-2 border border-gray-300 rounded text-sm"
                                                    value={item.theme}
                                                    onChange={(e) => updateP5Project(idx, 'theme', e.target.value)}
                                                >
                                                    {THEMES_LIST.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Deskripsi Projek</label>
                                                <textarea 
                                                    className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    rows={2}
                                                    placeholder="Contoh: Peserta didik mampu mengolah sampah plastik menjadi..."
                                                    value={item.description}
                                                    onChange={(e) => updateP5Project(idx, 'description', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                        Belum ada projek diatur untuk Semester ini.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'REKAP' && (
                    <div className="max-w-4xl space-y-4">
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-4">
                             <p className="text-sm text-purple-800 font-medium">
                                Pilih Mata Pelajaran yang akan ditampilkan pada menu <strong>Rekap 5 Semester</strong>.
                                Hanya mata pelajaran yang dicentang yang akan muncul di tabel rekap.
                             </p>
                        </div>
                        
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Daftar Mata Pelajaran</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {SUBJECT_MAP_CONFIG.map(sub => (
                                    <label key={sub.key} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${recapSubjects.includes(sub.key) ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white hover:bg-gray-50'}`}>
                                        <input 
                                            type="checkbox" 
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                            checked={recapSubjects.includes(sub.key)}
                                            onChange={() => toggleRecapSubject(sub.key)}
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-800">{sub.label}</span>
                                            <span className="text-[10px] text-gray-500">{sub.full}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <div className="mt-6 flex justify-end">
                                <span className="text-xs text-gray-500 self-center mr-4">{recapSubjects.length} Mapel Dipilih</span>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'USERS' && (
                    <div className="space-y-4 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                         <div className="flex justify-between items-center mb-4">
                             <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                 Manajemen User (Guru) 
                                 <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                     {isLoadingUsers ? 'Loading...' : `${users.length} Users`}
                                 </span>
                             </h3>
                             <button onClick={fetchUsers} className="p-1 hover:bg-gray-100 rounded text-gray-500" title="Refresh Users"><RefreshCw className="w-4 h-4" /></button>
                         </div>
                         
                         {/* Form Tambah Guru */}
                         <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                             <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Tambah Guru Baru</h4>
                             <div className="flex flex-col md:flex-row gap-4 items-end">
                                 <div className="flex-1 w-full">
                                     <label className="block text-xs font-medium text-gray-600 mb-1">Nama Guru</label>
                                     <input 
                                        type="text" 
                                        className="w-full p-2 border rounded-lg text-sm"
                                        placeholder="Contoh: Budi Santoso, S.Pd"
                                        value={newUser.name}
                                        onChange={e => setNewUser({...newUser, name: e.target.value})}
                                     />
                                 </div>
                                 <div className="flex-1 w-full">
                                     <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                                     <input 
                                        type="text" 
                                        className="w-full p-2 border rounded-lg text-sm"
                                        placeholder="Password"
                                        value={newUser.password}
                                        onChange={e => setNewUser({...newUser, password: e.target.value})}
                                     />
                                 </div>
                                 <button onClick={handleAddUser} disabled={isSavingUsers} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 w-full md:w-auto flex items-center justify-center">
                                     {isSavingUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tambah'}
                                 </button>
                             </div>
                         </div>

                         {/* List User */}
                         <div className="overflow-x-auto">
                             <table className="w-full text-left border-collapse text-sm">
                                 <thead className="bg-gray-50 border-b">
                                     <tr>
                                         <th className="p-3">Nama</th>
                                         <th className="p-3">Username</th>
                                         <th className="p-3">Role</th>
                                         <th className="p-3">Password</th>
                                         <th className="p-3 text-right">Aksi</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-100">
                                     {isLoadingUsers ? (
                                         <tr><td colSpan={5} className="p-8 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Memuat data user...</td></tr>
                                     ) : (
                                         users.map(u => (
                                             <tr key={u.id} className="hover:bg-gray-50">
                                                 <td className="p-3">
                                                     {editingUser?.id === u.id ? (
                                                         <input className="border p-1 rounded w-full" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                                                     ) : (
                                                         <span className="font-medium text-gray-800">{u.name}</span>
                                                     )}
                                                 </td>
                                                 <td className="p-3 text-gray-500">{u.username}</td>
                                                 <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.role}</span></td>
                                                 <td className="p-3 font-mono text-xs">
                                                     {editingUser?.id === u.id ? (
                                                         <input className="border p-1 rounded w-full" value={editingUser.password} onChange={e => setEditingUser({...editingUser, password: e.target.value})} />
                                                     ) : (
                                                         <div className="flex items-center gap-2">
                                                             <span>{showPassword === u.id ? u.password : '••••••'}</span>
                                                             <button onClick={() => setShowPassword(showPassword === u.id ? null : u.id)} className="text-gray-400 hover:text-gray-600">
                                                                 {showPassword === u.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                             </button>
                                                         </div>
                                                     )}
                                                 </td>
                                                 <td className="p-3 text-right flex justify-end gap-2">
                                                     {u.role !== 'ADMIN' && (
                                                         <>
                                                             {editingUser?.id === u.id ? (
                                                                 <>
                                                                    <button onClick={handleUpdateUser} disabled={isSavingUsers} className="text-green-600 hover:bg-green-50 p-1 rounded">{isSavingUsers ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4" />}</button>
                                                                    <button onClick={() => setEditingUser(null)} className="text-gray-600 hover:bg-gray-50 p-1 rounded"><X className="w-4 h-4" /></button>
                                                                 </>
                                                             ) : (
                                                                 <button onClick={() => setEditingUser(u)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Pencil className="w-4 h-4" /></button>
                                                             )}
                                                             <button onClick={() => handleDeleteUser(u.id)} disabled={isSavingUsers} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                                                         </>
                                                     )}
                                                 </td>
                                             </tr>
                                         ))
                                     )}
                                 </tbody>
                             </table>
                         </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default SettingsView;