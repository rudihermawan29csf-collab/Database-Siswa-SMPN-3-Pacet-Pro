import React, { useState, useEffect } from 'react';
import { Save, School, Calendar, Users, Lock, Check, UploadCloud, Loader2, BookOpen, Plus, Trash2, LayoutList, Calculator, Pencil, X, Eye, EyeOff, RefreshCw, Cloud, FileText, FolderOpen, FileBadge, Database, ListChecks } from 'lucide-react';
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

const DEFAULT_DOCS = [
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

  // --- ACADEMIC YEAR MANAGEMENT ---
  const [availableYears, setAvailableYears] = useState<string[]>(['2022/2023', '2023/2024', '2024/2025', '2025/2026']);
  const [newYearInput, setNewYearInput] = useState('');

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
  const [docList, setDocList] = useState(DEFAULT_DOCS); // The Master List
  const [docConfig, setDocConfig] = useState<string[]>(['IJAZAH', 'AKTA', 'KK', 'KTP_AYAH', 'KTP_IBU', 'FOTO']); // The "Required" List
  
  // NEW: Verification Mapping
  const [verificationMap, setVerificationMap] = useState({
      bukuInduk: ['AKTA', 'KK', 'FOTO', 'KTP_AYAH', 'KTP_IBU'],
      nilai: ['RAPOR'], // Default, usually hidden or implicit
      ijazah: ['IJAZAH', 'SKL', 'NISN', 'AKTA']
  });

  const [raporPageCount, setRaporPageCount] = useState<number>(3);
  const [newDocType, setNewDocType] = useState({ id: '', label: '', desc: '' });

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
              
              // LocalStorage Fallback for Docs Definition
              const savedDocDefs = localStorage.getItem('sys_doc_definitions');
              if (savedDocDefs) {
                  setDocList(JSON.parse(savedDocDefs));
              }
              const savedVerifMap = localStorage.getItem('sys_verification_map');
              if (savedVerifMap) {
                  setVerificationMap(JSON.parse(savedVerifMap));
              }

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

                  // Load Academic Years
                  if (cloudSettings.academicYears && Array.isArray(cloudSettings.academicYears)) {
                      setAvailableYears(cloudSettings.academicYears.sort().reverse());
                  }
                  
                  // Overwrite Local if Cloud has Docs (Optional Sync)
                  if (cloudSettings.docList) setDocList(cloudSettings.docList);
                  if (cloudSettings.verificationMap) setVerificationMap(cloudSettings.verificationMap);
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
          classList: availableClasses,
          academicYears: availableYears, // Save years
          docList: docList, // Save Custom Doc Definitions
          verificationMap: verificationMap // Save Verification Mapping
      };

      localStorage.setItem('sys_recap_config', JSON.stringify(recapSubjects));
      localStorage.setItem('sys_doc_config', JSON.stringify(docConfig));
      localStorage.setItem('sys_rapor_config', String(raporPageCount));
      localStorage.setItem('skl_config', JSON.stringify(sklConfig));
      localStorage.setItem('sys_doc_definitions', JSON.stringify(docList));
      localStorage.setItem('sys_verification_map', JSON.stringify(verificationMap));

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

  // Academic Year Management
  const handleAddYear = () => {
      if (!newYearInput.trim()) return;
      const formatted = newYearInput.trim();
      if (!availableYears.includes(formatted)) {
          setAvailableYears(prev => [formatted, ...prev].sort().reverse());
          setNewYearInput('');
      } else {
          alert("Tahun Pelajaran sudah ada.");
      }
  };

  const handleDeleteYear = (year: string) => {
      if(window.confirm(`Hapus Tahun Pelajaran ${year}?`)) {
          setAvailableYears(prev => prev.filter(y => y !== year));
      }
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

  // DOCS MANAGEMENT
  const toggleDocConfig = (id: string) => {
      if (docConfig.includes(id)) {
          setDocConfig(prev => prev.filter(d => d !== id));
      } else {
          setDocConfig(prev => [...prev, id]);
      }
  };

  const handleAddDocType = () => {
      if (!newDocType.id || !newDocType.label) { alert("ID dan Label harus diisi"); return; }
      if (docList.some(d => d.id === newDocType.id)) { alert("ID Dokumen sudah ada"); return; }
      
      setDocList(prev => [...prev, newDocType]);
      setNewDocType({ id: '', label: '', desc: '' });
  };

  const handleDeleteDocType = (id: string) => {
      if (window.confirm("Hapus jenis dokumen ini? Konfigurasi terkait akan hilang.")) {
          setDocList(prev => prev.filter(d => d.id !== id));
          setDocConfig(prev => prev.filter(d => d !== id));
          // Remove from maps
          const newMap = { ...verificationMap };
          newMap.bukuInduk = newMap.bukuInduk.filter(d => d !== id);
          newMap.nilai = newMap.nilai.filter(d => d !== id);
          newMap.ijazah = newMap.ijazah.filter(d => d !== id);
          setVerificationMap(newMap);
      }
  };

  const toggleVerificationMap = (section: 'bukuInduk' | 'nilai' | 'ijazah', docId: string) => {
      setVerificationMap(prev => {
          const currentList = prev[section];
          if (currentList.includes(docId)) {
              return { ...prev, [section]: currentList.filter(id => id !== docId) };
          } else {
              return { ...prev, [section]: [...currentList, docId] };
          }
      });
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

                {/* --- ACADEMIC TAB --- */}
                {activeTab === 'ACADEMIC' && (
                    <div className="max-w-6xl space-y-6">
                         
                         {/* ACADEMIC YEAR MANAGEMENT */}
                         <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
                             <h3 className="font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-600" /> Kelola Tahun Pelajaran
                             </h3>
                             
                             <div className="flex gap-2 mb-4">
                                 <input 
                                    type="text" 
                                    className="p-2 border rounded text-sm w-48" 
                                    placeholder="Contoh: 2026/2027" 
                                    value={newYearInput}
                                    onChange={(e) => setNewYearInput(e.target.value)}
                                 />
                                 <button onClick={handleAddYear} className="px-4 py-2 bg-green-600 text-white rounded text-sm font-bold flex items-center gap-1 hover:bg-green-700">
                                     <Plus className="w-4 h-4" /> Tambah
                                 </button>
                             </div>

                             <div className="flex flex-wrap gap-2">
                                 {availableYears.map(year => (
                                     <div key={year} className="bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-sm font-bold border border-blue-200 flex items-center gap-2 group">
                                         {year}
                                         <button onClick={() => handleDeleteYear(year)} className="text-blue-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <X className="w-3 h-3" />
                                         </button>
                                     </div>
                                 ))}
                             </div>
                         </div>

                         {/* ... Existing Academic Config ... */}
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

                {/* ... (SKL tab) ... */}
                {activeTab === 'SKL' && (
                    <div className="max-w-2xl space-y-4 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                        {/* ... Existing SKL Config Form ... */}
                        <h3 className="font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
                            <FileBadge className="w-5 h-5 text-blue-600" />
                            Konfigurasi Surat Keterangan Lulus
                        </h3>
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                                <h4 className="text-sm font-bold text-blue-800 mb-2">Header / Kop Surat (Alamat & Kontak)</h4>
                                <div className="space-y-2">
                                    <div>
                                        <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Baris 1 (Jalan/Desa/Kec/Kab)</label>
                                        <input type="text" className="w-full p-2 border border-blue-200 rounded text-sm outline-none" value={sklConfig.headerLine1} onChange={(e) => setSklConfig({...sklConfig, headerLine1: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Baris 2 (Kode Identitas Sekolah)</label>
                                        <input type="text" className="w-full p-2 border border-blue-200 rounded text-sm outline-none" value={sklConfig.headerLine2} onChange={(e) => setSklConfig({...sklConfig, headerLine2: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Baris 3 (Kontak Email/HP)</label>
                                        <input type="text" className="w-full p-2 border border-blue-200 rounded text-sm outline-none" value={sklConfig.headerLine3} onChange={(e) => setSklConfig({...sklConfig, headerLine3: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">URL Logo Instansi</label>
                                <input type="text" className="w-full p-2 border rounded text-sm" value={sklConfig.logoUrl} onChange={(e) => setSklConfig({...sklConfig, logoUrl: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nomor Surat (Header)</label>
                                <input type="text" className="w-full p-2 border rounded text-sm" value={sklConfig.nomorSurat} onChange={(e) => setSklConfig({...sklConfig, nomorSurat: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nomor Surat Keputusan (Isi)</label>
                                <input type="text" className="w-full p-2 border rounded text-sm" value={sklConfig.nomorSK} onChange={(e) => setSklConfig({...sklConfig, nomorSK: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Tanggal Keputusan</label><input type="text" className="w-full p-2 border rounded text-sm" value={sklConfig.tanggalKeputusan} onChange={(e) => setSklConfig({...sklConfig, tanggalKeputusan: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Tanggal Surat</label><input type="text" className="w-full p-2 border rounded text-sm" value={sklConfig.tanggalSurat} onChange={(e) => setSklConfig({...sklConfig, tanggalSurat: e.target.value})} /></div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Titimangsa (Tempat)</label>
                                <input type="text" className="w-full p-2 border rounded text-sm" value={sklConfig.titimangsa} onChange={(e) => setSklConfig({...sklConfig, titimangsa: e.target.value})} />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'KELAS' && (
                    <div className="space-y-6">
                        {/* 1. Kelola Daftar Kelas */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                                <Database className="w-4 h-4 text-blue-600" /> Kelola Daftar Kelas
                            </h3>
                            <div className="flex flex-col md:flex-row gap-4 mb-4">
                                <div className="flex-1 flex gap-2">
                                    <input type="text" className="p-2 border rounded-lg text-sm flex-1" placeholder="Tambah Kelas Baru" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} />
                                    <button onClick={handleAddClass} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-2"><Plus className="w-4 h-4" /> Tambah</button>
                                </div>
                                <button onClick={handleSyncClassesFromDB} disabled={isSyncingClasses} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap disabled:opacity-50">{isSyncingClasses ? <Loader2 className="w-4 h-4 animate-spin"/> : <Database className="w-4 h-4" />} Ambil dari Database</button>
                            </div>
                            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100 max-h-48 overflow-y-auto">
                                {availableClasses.length > 0 ? availableClasses.map(cls => (
                                    <div key={cls} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full text-xs font-bold text-gray-700 border shadow-sm group hover:border-red-300 transition-colors">
                                        {cls}
                                        <button 
                                            onClick={() => handleDeleteClass(cls)} 
                                            className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full p-0.5 transition-all"
                                            title="Hapus Kelas"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )) : <span className="text-xs text-gray-400 italic p-2">Belum ada kelas terdaftar.</span>}
                            </div>
                        </div>

                        {/* 2. Konfigurasi Wali Kelas */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                                <Users className="w-4 h-4 text-purple-600" /> Konfigurasi Wali Kelas
                            </h3>
                            
                            {/* Filters for Wali Kelas */}
                            <div className="flex flex-wrap gap-4 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Tahun Pelajaran</label>
                                    <select 
                                        className="p-2 border rounded-lg text-sm font-bold bg-white w-48"
                                        value={selectedYearClass}
                                        onChange={(e) => setSelectedYearClass(e.target.value)}
                                    >
                                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Semester</label>
                                    <select 
                                        className="p-2 border rounded-lg text-sm font-bold bg-white w-32"
                                        value={selectedSemesterClass}
                                        onChange={(e) => setSelectedSemesterClass(Number(e.target.value))}
                                    >
                                        {[1, 2, 3, 4, 5, 6].map(s => <option key={s} value={s}>Semester {s}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100 text-xs text-gray-600 uppercase">
                                            <th className="p-3 border text-left w-24">Kelas</th>
                                            <th className="p-3 border text-left">Nama Wali Kelas</th>
                                            <th className="p-3 border text-left">NIP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {availableClasses.map(cls => {
                                            const key = `${selectedYearClass}-${selectedSemesterClass}-${cls}`;
                                            const data = classConfig[key] || { teacher: '', nip: '' };
                                            return (
                                                <tr key={cls}>
                                                    <td className="p-2 border font-bold text-center bg-gray-50">{cls}</td>
                                                    <td className="p-2 border">
                                                        <input 
                                                            type="text" 
                                                            className="w-full p-1.5 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                                                            placeholder="Nama Lengkap & Gelar"
                                                            value={data.teacher}
                                                            onChange={(e) => handleWaliChange(cls, 'teacher', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-2 border">
                                                        <input 
                                                            type="text" 
                                                            className="w-full p-1.5 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                                                            placeholder="NIP"
                                                            value={data.nip}
                                                            onChange={(e) => handleWaliChange(cls, 'nip', e.target.value)}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {availableClasses.length === 0 && (
                                            <tr><td colSpan={3} className="p-4 text-center text-gray-400 italic">Belum ada kelas. Tambahkan kelas di atas.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- DOCS TAB: UPDATED FOR CRUD & MAPPING --- */}
                {activeTab === 'DOCS' && (
                    <div className="max-w-6xl space-y-6">
                        
                        {/* 1. Setting Halaman Rapor */}
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                Setting Halaman Rapor
                            </h3>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-semibold text-gray-700">Jumlah Halaman Rapor per Semester yang Wajib Diupload:</label>
                                <div className="flex items-center gap-3">
                                    <input type="number" min="1" max="20" className="w-24 p-2 border border-gray-300 rounded-lg text-center font-bold" value={raporPageCount} onChange={e => setRaporPageCount(Math.max(1, Number(e.target.value)))} />
                                    <span className="text-sm text-gray-500">Halaman / Semester</span>
                                </div>
                            </div>
                        </div>

                        {/* 2. CRUD Master Data Dokumen */}
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                                <FolderOpen className="w-5 h-5 text-orange-600" />
                                Master Data Jenis Dokumen
                            </h3>
                            
                            {/* Add New Doc Form */}
                            <div className="flex flex-wrap gap-2 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-200 items-end">
                                <div className="flex-1 min-w-[150px]">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">ID (Kode Unik)</label>
                                    <input type="text" className="w-full p-2 border rounded text-sm uppercase" placeholder="CONTOH_DOC" value={newDocType.id} onChange={e => setNewDocType({...newDocType, id: e.target.value.toUpperCase().replace(/\s+/g, '_')})} />
                                </div>
                                <div className="flex-[2] min-w-[200px]">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Label Dokumen</label>
                                    <input type="text" className="w-full p-2 border rounded text-sm" placeholder="Nama Dokumen" value={newDocType.label} onChange={e => setNewDocType({...newDocType, label: e.target.value})} />
                                </div>
                                <div className="flex-[2] min-w-[200px]">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Deskripsi Singkat</label>
                                    <input type="text" className="w-full p-2 border rounded text-sm" placeholder="Keterangan..." value={newDocType.desc} onChange={e => setNewDocType({...newDocType, desc: e.target.value})} />
                                </div>
                                <button onClick={handleAddDocType} className="px-4 py-2 bg-green-600 text-white rounded text-sm font-bold hover:bg-green-700 flex items-center gap-1"><Plus className="w-4 h-4" /> Tambah</button>
                            </div>

                            {/* List & Mapping */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead className="bg-gray-100 border-b border-gray-300 text-xs font-bold text-gray-600 uppercase">
                                        <tr>
                                            <th className="p-3 w-10">#</th>
                                            <th className="p-3">Jenis Dokumen</th>
                                            <th className="p-3 text-center w-24">Wajib Upload (Siswa)</th>
                                            <th className="p-3 text-center w-32 bg-purple-50">Tampil di Verif. Buku Induk</th>
                                            <th className="p-3 text-center w-32 bg-blue-50">Tampil di Verif. Nilai</th>
                                            <th className="p-3 text-center w-32 bg-orange-50">Tampil di Verif. Ijazah</th>
                                            <th className="p-3 text-center w-16">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {docList.map((doc, idx) => (
                                            <tr key={doc.id} className="hover:bg-gray-50">
                                                <td className="p-3 text-center text-gray-500">{idx + 1}</td>
                                                <td className="p-3">
                                                    <div className="font-bold text-gray-800">{doc.label}</div>
                                                    <div className="text-[10px] text-gray-500">{doc.desc} <span className="font-mono text-gray-400">({doc.id})</span></div>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                                                        checked={docConfig.includes(doc.id)}
                                                        onChange={() => toggleDocConfig(doc.id)}
                                                    />
                                                </td>
                                                
                                                {/* Verification Mapping Checkboxes */}
                                                <td className="p-3 text-center bg-purple-50/50">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                                                        checked={verificationMap.bukuInduk.includes(doc.id)}
                                                        onChange={() => toggleVerificationMap('bukuInduk', doc.id)}
                                                    />
                                                </td>
                                                <td className="p-3 text-center bg-blue-50/50">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                                        checked={verificationMap.nilai.includes(doc.id)}
                                                        onChange={() => toggleVerificationMap('nilai', doc.id)}
                                                    />
                                                </td>
                                                <td className="p-3 text-center bg-orange-50/50">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 text-orange-600 rounded cursor-pointer"
                                                        checked={verificationMap.ijazah.includes(doc.id)}
                                                        onChange={() => toggleVerificationMap('ijazah', doc.id)}
                                                    />
                                                </td>

                                                <td className="p-3 text-center">
                                                    <button onClick={() => handleDeleteDocType(doc.id)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ... (P5, REKAP, USERS tabs omitted - same as before) ... */}
                {/* (Keep existing code for other tabs) */}
            </div>
        </div>
    </div>
  );
};

export default SettingsView;