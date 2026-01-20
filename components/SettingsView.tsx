
import React, { useState, useEffect } from 'react';
import { Save, School, Calendar, Users, Check, Loader2, Plus, Trash2, Eye, EyeOff, FolderOpen, UserCircle, Settings, FileText, ListChecks, CheckSquare, Square, AlertCircle, FileBadge, ChevronDown, ChevronRight, Palette, X, Calculator, ToggleLeft, ToggleRight } from 'lucide-react';
import { api } from '../services/api';

// --- CONSTANTS ---
// Default classes if none exist
const DEFAULT_CLASSES = ['VII A', 'VII B', 'VII C', 'VIII A', 'VIII B', 'VIII C', 'IX A', 'IX B', 'IX C'];

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

const DEFAULT_MASTER_DOCS = [
    { id: 'IJAZAH', label: 'Ijazah SD/MI' },
    { id: 'AKTA', label: 'Akta Kelahiran' },
    { id: 'KK', label: 'Kartu Keluarga' },
    { id: 'KTP_AYAH', label: 'KTP Ayah' },
    { id: 'KTP_IBU', label: 'KTP Ibu' },
    { id: 'NISN', label: 'Bukti NISN' },
    { id: 'KIP', label: 'KIP / PKH' },
    { id: 'FOTO', label: 'Pas Foto' },
    { id: 'SKL', label: 'Surat Ket. Lulus' },
    { id: 'KARTU_PELAJAR', label: 'Kartu Pelajar' },
    { id: 'PIAGAM', label: 'Piagam/Prestasi' },
];

interface SettingsViewProps {
    onProfileUpdate?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onProfileUpdate }) => {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'ACADEMIC' | 'CLASSES' | 'SKL' | 'DOCS' | 'P5' | 'USERS'>('GENERAL');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // 1. GENERAL & PROFILE
  const [schoolData, setSchoolData] = useState({
      name: 'SMP Negeri 3 Pacet',
      address: 'Jl. Raya Pacet No. 12',
      headmaster: 'Didik Sulistyo, M.M.Pd',
      nip: '19660518 198901 1 002'
  });
  const [adminName, setAdminName] = useState('Administrator');

  // 2. ACADEMIC
  const [activeAcademicYear, setActiveAcademicYear] = useState('2025/2026'); 
  const [activeSemester, setActiveSemester] = useState(2); 
  const [availableYears, setAvailableYears] = useState<string[]>(['2025/2026', '2024/2025', '2023/2024', '2022/2023']);
  const [newYearInput, setNewYearInput] = useState('');
  
  const [semesterYears, setSemesterYears] = useState<Record<string, Record<number, string>>>({
      'VII': { 1: '2025/2026', 2: '2025/2026', 3: '2026/2027', 4: '2026/2027', 5: '2027/2028', 6: '2027/2028' },
      'VIII': { 1: '2024/2025', 2: '2024/2025', 3: '2025/2026', 4: '2025/2026', 5: '2026/2027', 6: '2026/2027' },
      'IX': { 1: '2023/2024', 2: '2023/2024', 3: '2024/2025', 4: '2024/2025', 5: '2025/2026', 6: '2025/2026' }
  });
  const [semesterDates, setSemesterDates] = useState<Record<string, Record<number, string>>>({}); 

  // 3. CLASSES
  const [classList, setClassList] = useState<string[]>(DEFAULT_CLASSES);
  const [newClassName, setNewClassName] = useState('');
  const [waliContext, setWaliContext] = useState({ year: '2025/2026', semester: 2 });
  const [classConfig, setClassConfig] = useState<Record<string, { teacher: string, nip: string }>>({});

  // 4. SKL CONFIG
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

  // 5. DOCS & RECAP
  const [availableDocs, setAvailableDocs] = useState<{id: string, label: string}[]>(DEFAULT_MASTER_DOCS);
  const [newDocName, setNewDocName] = useState('');

  const [docConfig, setDocConfig] = useState<{
      studentVisible: string[];
      indukVerification: string[];
      ijazahVerification: string[];
      gradeVerification: string[];
      raporPageCount: number;
      showParentOnIjazah: boolean;
  }>({
      studentVisible: ['IJAZAH', 'AKTA', 'KK', 'KTP_AYAH', 'KTP_IBU', 'NISN', 'FOTO', 'KARTU_PELAJAR', 'KIP'],
      indukVerification: ['AKTA', 'KK', 'FOTO', 'IJAZAH', 'KTP_AYAH', 'KTP_IBU', 'NISN', 'KIP', 'KARTU_PELAJAR'],
      ijazahVerification: ['IJAZAH', 'AKTA', 'KK', 'NISN', 'KTP_AYAH'],
      gradeVerification: [],
      raporPageCount: 3,
      showParentOnIjazah: false
  });
  
  const [recapSubjects, setRecapSubjects] = useState<string[]>(["PAI","Pendidikan Pancasila","Bahasa Indonesia","Matematika","IPA","IPS","Bahasa Inggris"]);
  
  // --- NEW: P5 CONFIGURATION ---
  // Structure: { "2024/2025-VII-1": [ {theme, description}, ... ] }
  const [p5DataMap, setP5DataMap] = useState<Record<string, {theme: string, description: string}[]>>({});
  const [p5Context, setP5Context] = useState({ year: '2025/2026', level: 'VII', semester: 1 });

  // 6. USERS
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'GURU' });
  const [showPasswordId, setShowPasswordId] = useState<string | null>(null);

  // --- HELPER: APPLY SETTINGS TO STATE ---
  const applySettingsToState = (settings: any) => {
      if (!settings) return;
      
      if (settings.schoolData && settings.schoolData.name) setSchoolData(settings.schoolData);
      if (settings.adminName) setAdminName(settings.adminName);
      
      if (settings.academicData) {
          if (settings.academicData.semesterYears) setSemesterYears(settings.academicData.semesterYears);
          if (settings.academicData.semesterDates) setSemesterDates(settings.academicData.semesterDates);
          if (settings.academicData.activeYear) setActiveAcademicYear(settings.academicData.activeYear);
          if (settings.academicData.activeSemester) setActiveSemester(Number(settings.academicData.activeSemester));
          if (settings.academicData.availableYears) setAvailableYears(settings.academicData.availableYears);
      }
      
      if (settings.classConfig) setClassConfig(settings.classConfig);
      if (settings.classList && Array.isArray(settings.classList)) setClassList(settings.classList);
      if (settings.sklConfig) setSklConfig(prev => ({ ...prev, ...settings.sklConfig }));
      if (settings.availableDocs) setAvailableDocs(settings.availableDocs);
      
      if (settings.docConfig) {
          setDocConfig(prev => ({
              ...prev,
              ...settings.docConfig,
              gradeVerification: settings.docConfig.gradeVerification || [],
              showParentOnIjazah: settings.docConfig.showParentOnIjazah || false
          }));
      }
      
      if (settings.recapSubjects) setRecapSubjects(settings.recapSubjects);
      
      // Load P5 Data Map
      if (settings.p5DataMap) {
          setP5DataMap(settings.p5DataMap);
      } else if (settings.p5Themes) {
          // Backward compatibility: Migrate old flat array to current context if map is empty
          // But purely optional, we just start fresh or use map
      }
      
      // Initial contexts
      if (settings.academicData && settings.academicData.activeYear) {
          setWaliContext(prev => ({ ...prev, year: settings.academicData.activeYear }));
          setP5Context(prev => ({ ...prev, year: settings.academicData.activeYear }));
      }
  };

  // --- INITIAL LOAD ---
  useEffect(() => {
      const loadSettings = async () => {
          setLoading(true);
          try {
              const localSettings = localStorage.getItem('app_full_settings_v2');
              if (localSettings) applySettingsToState(JSON.parse(localSettings));

              const settings = await api.getAppSettings();
              if (settings && settings.schoolData) {
                  applySettingsToState(settings);
                  localStorage.setItem('app_full_settings_v2', JSON.stringify(settings));
              }
              
              const fetchedUsers = await api.getUsers();
              if (fetchedUsers && fetchedUsers.length > 0) setUsers(fetchedUsers);
              else {
                  const localUsers = localStorage.getItem('app_users_v2');
                  if (localUsers) setUsers(JSON.parse(localUsers));
              }
          } catch (e) { console.error("Failed load settings", e); } 
          finally { setLoading(false); }
      };
      loadSettings();
  }, []);

  const handleSaveSettings = async () => {
      setIsSaving(true);
      const payload = {
          schoolData,
          adminName,
          academicData: {
              activeYear: activeAcademicYear,
              activeSemester: activeSemester,
              availableYears: availableYears,
              year: activeAcademicYear, 
              semesterYears,
              semesterDates
          },
          classConfig,
          classList,
          sklConfig,
          docConfig,
          availableDocs, 
          recapSubjects, 
          p5DataMap, // NEW: Save the P5 Map
          raporPageCount: docConfig.raporPageCount
      };

      try {
          localStorage.setItem('app_full_settings_v2', JSON.stringify(payload));
          localStorage.setItem('admin_name', adminName);
          localStorage.setItem('sys_rapor_config', String(docConfig.raporPageCount));

          const success = await api.saveAppSettings(payload);
          setSuccessMsg(success ? "Pengaturan berhasil disimpan!" : "Disimpan ke Lokal.");
          setTimeout(() => setSuccessMsg(''), 3000);
          if (onProfileUpdate) onProfileUpdate();
      } catch (e) {
          setSuccessMsg("Disimpan ke Lokal (Mode Offline).");
          setTimeout(() => setSuccessMsg(''), 3000);
      } finally {
          setIsSaving(false);
      }
  };

  // ... (Other handlers like addAcademicYear, addClass, etc. remain same) ...
  const updateSemesterData = (level: string, sem: number, field: 'year' | 'date', value: string) => {
      if (field === 'year') {
          setSemesterYears(prev => ({ ...prev, [level]: { ...prev[level], [sem]: value } }));
      } else {
          setSemesterDates(prev => ({ ...prev, [level]: { ...prev[level], [sem]: value } }));
      }
  };

  const addAcademicYear = () => {
      const trimmedInput = newYearInput.trim();
      if (!trimmedInput) return;
      if (!/^\d{4}\/\d{4}$/.test(trimmedInput)) { alert("Format salah! Gunakan YYYY/YYYY"); return; }
      setAvailableYears(prev => [trimmedInput, ...prev].sort((a, b) => b.localeCompare(a)));
      setNewYearInput('');
  };

  const removeAcademicYear = (year: string) => {
      if (confirm(`Hapus tahun pelajaran ${year}?`)) {
          setAvailableYears(prev => prev.filter(y => y !== year));
      }
  };

  const addClass = () => {
      if (newClassName && !classList.includes(newClassName)) {
          setClassList(prev => [...prev, newClassName].sort());
          setNewClassName('');
      }
  };

  const removeClass = (cls: string) => {
      if (confirm(`Hapus Kelas ${cls}?`)) { setClassList(prev => prev.filter(c => c !== cls)); }
  };

  const updateWaliKelas = (className: string, field: 'teacher' | 'nip', value: string) => {
      const key = `${waliContext.year}-${waliContext.semester}-${className}`;
      setClassConfig(prev => ({ ...prev, [key]: { ...(prev[key] || { teacher: '', nip: '' }), [field]: value } }));
  };

  const addDocumentType = () => {
      if (!newDocName.trim()) return;
      const newId = newDocName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
      setAvailableDocs(prev => [...prev, { id: newId, label: newDocName.trim() }]);
      setNewDocName('');
  };

  const removeDocumentType = (id: string) => {
      if (window.confirm(`Hapus dokumen ini?`)) {
          setAvailableDocs(prev => prev.filter(d => d.id !== id));
          setDocConfig(prev => ({
              ...prev,
              studentVisible: prev.studentVisible.filter(x => x !== id),
              indukVerification: prev.indukVerification.filter(x => x !== id),
              ijazahVerification: prev.ijazahVerification.filter(x => x !== id),
              gradeVerification: prev.gradeVerification.filter(x => x !== id),
          }));
      }
  };

  const toggleDoc = (listKey: 'studentVisible' | 'indukVerification' | 'ijazahVerification' | 'gradeVerification', docId: string) => {
      setDocConfig(prev => {
          const list = prev[listKey] || [];
          const newList = list.includes(docId) ? list.filter(id => id !== docId) : [...list, docId];
          return { ...prev, [listKey]: newList };
      });
  };

  const toggleRecapSubject = (subjectKey: string) => {
      setRecapSubjects(prev => prev.includes(subjectKey) ? prev.filter(k => k !== subjectKey) : [...prev, subjectKey]);
  };

  // --- P5 HANDLERS ---
  const getCurrentP5Themes = () => {
      const key = `${p5Context.year}-${p5Context.level}-${p5Context.semester}`;
      return p5DataMap[key] || [];
  };

  const updateP5Themes = (newThemes: {theme: string, description: string}[]) => {
      const key = `${p5Context.year}-${p5Context.level}-${p5Context.semester}`;
      setP5DataMap(prev => ({ ...prev, [key]: newThemes }));
  };

  const handleAddUser = async () => {
      if (!newUser.name || !newUser.username || !newUser.password) return;
      const newUserData = { ...newUser, id: Math.random().toString(36).substr(2, 9) };
      const updatedUsers = [...users, newUserData];
      setIsSaving(true);
      try { 
          localStorage.setItem('app_users_v2', JSON.stringify(updatedUsers));
          await api.updateUsers(updatedUsers); 
          setUsers(updatedUsers); 
          setNewUser({ name: '', username: '', password: '', role: 'GURU' }); 
      } catch (e) { alert("Gagal update user"); }
      finally { setIsSaving(false); }
  };

  const handleDeleteUser = async (id: string) => {
      if (window.confirm("Hapus user ini?")) {
          const updatedUsers = users.filter(u => u.id !== id);
          setIsSaving(true);
          try { 
              localStorage.setItem('app_users_v2', JSON.stringify(updatedUsers));
              await api.updateUsers(updatedUsers); 
              setUsers(updatedUsers); 
          } catch(e) { alert("Gagal hapus user"); }
          finally { setIsSaving(false); }
      }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="flex flex-col h-full space-y-6 animate-fade-in pb-32">
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Settings className="w-6 h-6 text-gray-600" /> Pengaturan Sistem
                </h2>
                <div className="hidden md:flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-1 rounded-full border border-blue-100 shadow-sm">
                    <Calendar className="w-3 h-3" />
                    <span className="text-xs font-bold uppercase">{activeAcademicYear} - Sem {activeSemester}</span>
                </div>
            </div>
            
            <div className="flex gap-2">
                <button onClick={handleSaveSettings} disabled={isSaving} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan Perubahan
                </button>
            </div>
        </div>

        {successMsg && (
            <div className="bg-green-100 border border-green-200 text-green-800 px-4 py-3 rounded-xl flex items-center gap-2 animate-bounce-in">
                <Check className="w-5 h-5" /> {successMsg}
            </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-64 bg-white rounded-xl border border-gray-200 shadow-sm h-fit overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Menu Konfigurasi</h3>
                </div>
                <div className="flex flex-col p-2 gap-1">
                    {[
                        { id: 'GENERAL', label: 'Umum & Profil', icon: School },
                        { id: 'ACADEMIC', label: 'Tahun Ajaran', icon: Calendar },
                        { id: 'CLASSES', label: 'Kelas & Wali', icon: Users },
                        { id: 'SKL', label: 'Pengaturan SKL', icon: FileBadge },
                        { id: 'DOCS', label: 'Dokumen & Rapor', icon: FolderOpen },
                        { id: 'P5', label: 'Tema Projek P5', icon: Palette },
                        { id: 'USERS', label: 'Manajemen Guru', icon: UserCircle },
                    ].map(item => (
                        <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === item.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <item.icon className="w-4 h-4" /> {item.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                
                {/* --- 1. GENERAL --- */}
                {activeTab === 'GENERAL' && (
                    <div className="space-y-6">
                        <div className="border-b pb-4 mb-4">
                            <h3 className="text-lg font-bold text-gray-800 mb-1">Profil Sekolah & Admin</h3>
                            <p className="text-sm text-gray-500">Informasi ini akan tampil di KOP Surat dan Laporan.</p>
                        </div>
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="w-full md:w-1/3 flex flex-col items-center p-6 border rounded-xl bg-gray-50">
                                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-4"><UserCircle className="w-16 h-16 text-gray-400" /></div>
                                <div className="text-center w-full"><label className="text-xs font-bold text-gray-500 uppercase">Nama Administrator</label><input type="text" className="w-full mt-1 text-center p-2 border rounded-lg font-bold" value={adminName} onChange={(e) => setAdminName(e.target.value)} /></div>
                            </div>
                            <div className="flex-1 space-y-4">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Sekolah</label><input type="text" className="w-full p-2.5 border rounded-lg" value={schoolData.name} onChange={e => setSchoolData({...schoolData, name: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Alamat Sekolah</label><textarea className="w-full p-2.5 border rounded-lg" rows={2} value={schoolData.address} onChange={e => setSchoolData({...schoolData, address: e.target.value})} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kepala Sekolah</label><input type="text" className="w-full p-2.5 border rounded-lg" value={schoolData.headmaster} onChange={e => setSchoolData({...schoolData, headmaster: e.target.value})} /></div>
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">NIP Kepala Sekolah</label><input type="text" className="w-full p-2.5 border rounded-lg" value={schoolData.nip} onChange={e => setSchoolData({...schoolData, nip: e.target.value})} /></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- 2. ACADEMIC --- */}
                {activeTab === 'ACADEMIC' && (
                    <div className="space-y-8">
                        <div className="border-b pb-4"><h3 className="text-lg font-bold text-gray-800 mb-1">Pengaturan Tahun Pelajaran</h3><p className="text-sm text-gray-500">Atur tahun pelajaran aktif dan manajemen data semester.</p></div>
                        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className="block text-xs font-bold text-blue-800 uppercase mb-2">Tahun Pelajaran Aktif</label><div className="flex gap-2"><select className="flex-1 p-2 border border-blue-200 rounded text-blue-900 font-bold bg-white" value={activeAcademicYear} onChange={e => setActiveAcademicYear(e.target.value)}>{availableYears.map(y => <option key={y} value={y}>{y}</option>)}</select></div></div>
                            <div><label className="block text-xs font-bold text-blue-800 uppercase mb-2">Semester Aktif</label><select className="w-full p-2 border border-blue-200 rounded text-blue-900 font-bold bg-white" value={activeSemester} onChange={e => setActiveSemester(Number(e.target.value))}>{[1, 2, 3, 4, 5, 6].map(s => <option key={s} value={s}>Semester {s}</option>)}</select></div>
                        </div>
                        <div>
                            <div className="flex justify-between items-end mb-3"><h4 className="text-sm font-bold text-gray-700 uppercase">Manajemen Daftar Tahun Pelajaran</h4><div className="flex gap-2 items-center"><input type="text" placeholder="Contoh: 2025/2026" className="p-1.5 border border-gray-300 rounded text-sm w-40" value={newYearInput} onChange={(e) => setNewYearInput(e.target.value)} /><button onClick={addAcademicYear} className="text-xs bg-green-600 text-white px-3 py-2 rounded flex items-center gap-1 hover:bg-green-700"><Plus className="w-3 h-3" /> Tambah</button></div></div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 max-h-40 overflow-y-auto"><div className="grid grid-cols-2 md:grid-cols-4 gap-2">{availableYears.map(year => (<div key={year} className="bg-white px-3 py-2 rounded border border-gray-200 flex justify-between items-center shadow-sm"><span className="text-sm font-bold text-gray-700">{year}</span>{year !== activeAcademicYear && (<button onClick={() => removeAcademicYear(year)} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>)}</div>))}</div></div>
                        </div>
                        <div><h4 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2"><Calendar className="w-4 h-4"/> Tanggal Rapor (Histori)</h4><div className="overflow-x-auto"><table className="w-full text-sm border-collapse border border-gray-200 rounded-lg overflow-hidden"><thead className="bg-gray-100 text-gray-700"><tr><th className="p-3 border text-left w-24">Semester</th><th className="p-3 border text-left">Jenjang</th><th className="p-3 border text-left">Tahun Pelajaran (Histori)</th><th className="p-3 border text-left">Tanggal Rapor</th></tr></thead><tbody>{['VII', 'VIII', 'IX'].map(level => ([1, 2, 3, 4, 5, 6].map(sem => (<tr key={`${level}-${sem}`} className="hover:bg-gray-50"><td className="p-2 border font-bold text-center bg-gray-50">Sem {sem}</td><td className="p-2 border font-bold text-center text-gray-500">{level}</td><td className="p-2 border"><input type="text" className="w-full p-1.5 border rounded text-xs" placeholder="Contoh: 2022/2023" value={semesterYears[level]?.[sem] || ''} onChange={(e) => updateSemesterData(level, sem, 'year', e.target.value)} /></td><td className="p-2 border"><input type="date" className="w-full p-1.5 border rounded text-xs" value={semesterDates[level]?.[sem] || ''} onChange={(e) => updateSemesterData(level, sem, 'date', e.target.value)} /></td></tr>))))}</tbody></table></div></div>
                    </div>
                )}

                {/* --- 3. CLASSES --- */}
                {activeTab === 'CLASSES' && (
                    <div className="space-y-6">
                        <div className="border-b pb-4 mb-4"><h3 className="text-lg font-bold text-gray-800 mb-1">Wali Kelas per Semester</h3><p className="text-sm text-gray-500">Pilih Tahun Ajaran dan Semester untuk mengatur Wali Kelas.</p></div>
                        <div className="flex gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100 mb-6 items-end"><div className="flex-1"><label className="block text-xs font-bold text-blue-800 uppercase mb-1">Tahun Pelajaran</label><select className="w-full p-2 border border-blue-200 rounded font-bold text-blue-900 bg-white" value={waliContext.year} onChange={(e) => setWaliContext({...waliContext, year: e.target.value})}>{availableYears.map(y => <option key={y} value={y}>{y}</option>)}</select></div><div className="w-32"><label className="block text-xs font-bold text-blue-800 uppercase mb-1">Semester</label><select className="w-full p-2 border border-blue-200 rounded font-bold text-blue-900 bg-white" value={waliContext.semester} onChange={(e) => setWaliContext({...waliContext, semester: Number(e.target.value)})}>{[1,2,3,4,5,6].map(s => <option key={s} value={s}>{s}</option>)}</select></div></div>
                        <div className="grid grid-cols-1 gap-4 mb-6">{classList.map(cls => { const key = `${waliContext.year}-${waliContext.semester}-${cls}`; const data = classConfig[key] || { teacher: '', nip: '' }; return (<div key={cls} className="flex flex-col md:flex-row items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200 group"><div className="w-24 flex items-center gap-2"><button onClick={() => removeClass(cls)} className="p-1 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button><div className="font-bold text-gray-700 bg-white p-2 rounded border text-center w-full">{cls}</div></div><div className="flex-1 w-full"><label className="text-[10px] uppercase font-bold text-gray-400">Nama Wali Kelas</label><input type="text" className="w-full p-2 border rounded text-sm focus:border-blue-500 outline-none" value={data.teacher} onChange={(e) => updateWaliKelas(cls, 'teacher', e.target.value)} /></div><div className="flex-1 w-full"><label className="text-[10px] uppercase font-bold text-gray-400">NIP Wali Kelas</label><input type="text" className="w-full p-2 border rounded text-sm focus:border-blue-500 outline-none" value={data.nip} onChange={(e) => updateWaliKelas(cls, 'nip', e.target.value)} /></div></div>); })}</div>
                        <div className="flex gap-2 items-center pt-4 border-t border-gray-100"><input type="text" placeholder="Tambah Kelas Baru (Contoh: VII D)" className="p-2 border rounded-lg text-sm w-64" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} /><button onClick={addClass} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-700"><Plus className="w-4 h-4" /> Tambah Kelas</button></div>
                    </div>
                )}

                {/* --- 4. SKL CONFIG --- */}
                {activeTab === 'SKL' && (
                    <div className="space-y-6">
                        <div className="border-b pb-4 mb-4"><h3 className="text-lg font-bold text-gray-800 mb-1">Pengaturan SKL</h3><p className="text-sm text-gray-500">Konfigurasi format surat keterangan lulus.</p></div>
                        <div className="grid grid-cols-1 gap-4"><div><label className="text-xs font-bold text-gray-500 uppercase">Logo URL</label><input type="text" className="w-full p-2 border rounded" value={sklConfig.logoUrl} onChange={e => setSklConfig({...sklConfig, logoUrl: e.target.value})} /></div><div><label className="text-xs font-bold text-gray-500 uppercase">Header Baris 1 (Alamat)</label><input type="text" className="w-full p-2 border rounded" value={sklConfig.headerLine1} onChange={e => setSklConfig({...sklConfig, headerLine1: e.target.value})} /></div><div><label className="text-xs font-bold text-gray-500 uppercase">Header Baris 2 (NSS/NPSN)</label><input type="text" className="w-full p-2 border rounded" value={sklConfig.headerLine2} onChange={e => setSklConfig({...sklConfig, headerLine2: e.target.value})} /></div><div><label className="text-xs font-bold text-gray-500 uppercase">Header Baris 3 (Kontak)</label><input type="text" className="w-full p-2 border rounded" value={sklConfig.headerLine3} onChange={e => setSklConfig({...sklConfig, headerLine3: e.target.value})} /></div><div className="grid grid-cols-2 gap-4 mt-4"><div><label className="text-xs font-bold text-gray-500 uppercase">Nomor Surat</label><input type="text" className="w-full p-2 border rounded" value={sklConfig.nomorSurat} onChange={e => setSklConfig({...sklConfig, nomorSurat: e.target.value})} /></div><div><label className="text-xs font-bold text-gray-500 uppercase">Nomor SK Kepala Sekolah</label><input type="text" className="w-full p-2 border rounded" value={sklConfig.nomorSK} onChange={e => setSklConfig({...sklConfig, nomorSK: e.target.value})} /></div><div><label className="text-xs font-bold text-gray-500 uppercase">Tanggal Keputusan</label><input type="text" className="w-full p-2 border rounded" value={sklConfig.tanggalKeputusan} onChange={e => setSklConfig({...sklConfig, tanggalKeputusan: e.target.value})} /></div><div><label className="text-xs font-bold text-gray-500 uppercase">Tanggal Surat (Titimangsa)</label><input type="text" className="w-full p-2 border rounded" value={sklConfig.tanggalSurat} onChange={e => setSklConfig({...sklConfig, tanggalSurat: e.target.value})} /></div><div><label className="text-xs font-bold text-gray-500 uppercase">Tempat (Titimangsa)</label><input type="text" className="w-full p-2 border rounded" value={sklConfig.titimangsa} onChange={e => setSklConfig({...sklConfig, titimangsa: e.target.value})} /></div></div></div>
                    </div>
                )}

                {/* --- 5. DOCS --- */}
                {activeTab === 'DOCS' && (
                    <div className="space-y-8">
                        <div><h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2"><Calculator className="w-5 h-5"/> Konfigurasi Rekap 5 Semester</h3><p className="text-sm text-gray-500 mb-3">Pilih mata pelajaran yang akan ditampilkan pada menu Rekap 5 Semester.</p><div className="bg-purple-50 p-4 rounded-xl border border-purple-100"><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{SUBJECT_MAP_CONFIG.map(sub => (<button key={sub.key} onClick={() => toggleRecapSubject(sub.key)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${recapSubjects.includes(sub.key) ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'}`}>{recapSubjects.includes(sub.key) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}{sub.label}</button>))}</div></div></div>
                        <div className="border-t pt-4"><h3 className="text-lg font-bold text-gray-800 mb-2">Konfigurasi Data Ijazah</h3><div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center justify-between"><div><h4 className="text-sm font-bold text-blue-900">Tampilkan Nama Orang Tua (Ayah)</h4><p className="text-xs text-blue-700">Jika aktif, kolom nama ayah akan muncul di tabel data ijazah.</p></div><button onClick={() => setDocConfig({...docConfig, showParentOnIjazah: !docConfig.showParentOnIjazah})} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${docConfig.showParentOnIjazah ? 'bg-blue-600' : 'bg-gray-200'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${docConfig.showParentOnIjazah ? 'translate-x-6' : 'translate-x-1'}`} /></button></div></div>
                        <div className="border-t pt-4"><h3 className="text-lg font-bold text-gray-800 mb-2">Konfigurasi Upload Rapor</h3><div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center gap-4"><label className="text-sm font-bold text-blue-800">Jumlah Halaman Rapor per Semester:</label><input type="number" min={1} max={10} className="w-20 p-2 border border-blue-300 rounded font-bold text-center" value={docConfig.raporPageCount} onChange={e => setDocConfig({...docConfig, raporPageCount: Number(e.target.value)})}/><span className="text-xs text-blue-600">(Default: 3 Halaman)</span></div></div>
                        <div><div className="flex justify-between items-end mb-4 border-b pb-2"><h3 className="text-lg font-bold text-gray-800">Konfigurasi Tampilan Dokumen</h3><div className="flex gap-2 items-center"><input type="text" placeholder="Nama Dokumen Baru" className="p-1.5 border border-gray-300 rounded text-sm w-48" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} /><button onClick={addDocumentType} className="text-xs bg-blue-600 text-white px-3 py-2 rounded flex items-center gap-1 hover:bg-blue-700"><Plus className="w-3 h-3" /> Tambah</button></div></div><div className="overflow-x-auto"><table className="w-full text-sm border border-gray-200 rounded-lg"><thead className="bg-gray-100 text-gray-700"><tr><th className="p-3 text-left border-b w-64">Nama Dokumen</th><th className="p-3 text-center border-b bg-blue-50">Tampil ke Siswa</th><th className="p-3 text-center border-b bg-yellow-50">Verifikasi Buku Induk</th><th className="p-3 text-center border-b bg-purple-50">Verifikasi Ijazah</th><th className="p-3 text-center border-b bg-green-50">Verifikasi Nilai</th><th className="p-3 text-center border-b w-16">Hapus</th></tr></thead><tbody className="divide-y divide-gray-100">{availableDocs.map(doc => (<tr key={doc.id} className="hover:bg-gray-50"><td className="p-3 font-bold text-gray-700">{doc.label}</td><td className="p-3 text-center bg-blue-50/20"><button onClick={() => toggleDoc('studentVisible', doc.id)} className={`p-1 rounded ${docConfig.studentVisible.includes(doc.id) ? 'text-blue-600 bg-blue-100' : 'text-gray-300'}`}>{docConfig.studentVisible.includes(doc.id) ? <CheckSquare className="w-5 h-5"/> : <Square className="w-5 h-5"/>}</button></td><td className="p-3 text-center bg-yellow-50/20"><button onClick={() => toggleDoc('indukVerification', doc.id)} className={`p-1 rounded ${docConfig.indukVerification.includes(doc.id) ? 'text-yellow-600 bg-yellow-100' : 'text-gray-300'}`}>{docConfig.indukVerification.includes(doc.id) ? <CheckSquare className="w-5 h-5"/> : <Square className="w-5 h-5"/>}</button></td><td className="p-3 text-center bg-purple-50/20"><button onClick={() => toggleDoc('ijazahVerification', doc.id)} className={`p-1 rounded ${docConfig.ijazahVerification.includes(doc.id) ? 'text-purple-600 bg-purple-100' : 'text-gray-300'}`}>{docConfig.ijazahVerification.includes(doc.id) ? <CheckSquare className="w-5 h-5"/> : <Square className="w-5 h-5"/>}</button></td><td className="p-3 text-center bg-green-50/20"><button onClick={() => toggleDoc('gradeVerification', doc.id)} className={`p-1 rounded ${docConfig.gradeVerification?.includes(doc.id) ? 'text-green-600 bg-green-100' : 'text-gray-300'}`}>{docConfig.gradeVerification?.includes(doc.id) ? <CheckSquare className="w-5 h-5"/> : <Square className="w-5 h-5"/>}</button></td><td className="p-3 text-center"><button onClick={() => removeDocumentType(doc.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button></td></tr>))}</tbody></table></div></div>
                    </div>
                )}

                {/* --- 6. P5 CONFIG (UPDATED) --- */}
                {activeTab === 'P5' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Tema Projek Penguatan Profil Pelajar Pancasila (P5)</h3>
                        <p className="text-sm text-gray-500 mb-4">Atur tema P5 per Jenjang, Tahun, dan Semester.</p>
                        
                        {/* P5 CONTEXT SELECTOR */}
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row gap-4 mb-6">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Tahun Pelajaran</label>
                                <select 
                                    className="w-full p-2 border border-blue-200 rounded font-bold text-blue-900 bg-white"
                                    value={p5Context.year}
                                    onChange={(e) => setP5Context({...p5Context, year: e.target.value})}
                                >
                                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div className="w-32">
                                <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Jenjang</label>
                                <select 
                                    className="w-full p-2 border border-blue-200 rounded font-bold text-blue-900 bg-white"
                                    value={p5Context.level}
                                    onChange={(e) => setP5Context({...p5Context, level: e.target.value})}
                                >
                                    {['VII', 'VIII', 'IX'].map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                            <div className="w-32">
                                <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Semester</label>
                                <select 
                                    className="w-full p-2 border border-blue-200 rounded font-bold text-blue-900 bg-white"
                                    value={p5Context.semester}
                                    onChange={(e) => setP5Context({...p5Context, semester: Number(e.target.value)})}
                                >
                                    {[1, 2].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* P5 THEME LIST FOR SELECTED CONTEXT */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-gray-700">
                                    Tema untuk: {p5Context.year} - Kelas {p5Context.level} - Semester {p5Context.semester}
                                </span>
                            </div>

                            {getCurrentP5Themes().map((theme, idx) => (
                                <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200 relative group">
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => {
                                                const currentThemes = getCurrentP5Themes();
                                                const newThemes = [...currentThemes];
                                                newThemes.splice(idx, 1);
                                                updateP5Themes(newThemes);
                                            }} 
                                            className="p-1 text-red-400 hover:text-red-600"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Tema {idx + 1}</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2 border rounded mb-2 font-bold text-sm" 
                                        value={theme.theme} 
                                        onChange={(e) => {
                                            const currentThemes = getCurrentP5Themes();
                                            const newThemes = [...currentThemes];
                                            newThemes[idx].theme = e.target.value;
                                            updateP5Themes(newThemes);
                                        }} 
                                        placeholder="Judul Tema" 
                                    />
                                    <textarea 
                                        className="w-full p-2 border rounded text-xs" 
                                        rows={2} 
                                        value={theme.description} 
                                        onChange={(e) => {
                                            const currentThemes = getCurrentP5Themes();
                                            const newThemes = [...currentThemes];
                                            newThemes[idx].description = e.target.value;
                                            updateP5Themes(newThemes);
                                        }} 
                                        placeholder="Deskripsi Tema" 
                                    />
                                </div>
                            ))}
                            
                            <button 
                                onClick={() => {
                                    const currentThemes = getCurrentP5Themes();
                                    updateP5Themes([...currentThemes, { theme: '', description: '' }]);
                                }} 
                                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-bold hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Tambah Tema P5
                            </button>
                        </div>
                    </div>
                )}

                {/* --- 7. USERS --- */}
                {activeTab === 'USERS' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center border-b pb-4"><div><h3 className="text-lg font-bold text-gray-800">Manajemen Pengguna (Guru)</h3><p className="text-sm text-gray-500">Tambahkan akun guru untuk akses wali kelas.</p></div></div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                            <h4 className="text-sm font-bold text-gray-700 mb-3">Tambah Guru Baru</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                <input type="text" placeholder="Nama Lengkap" className="p-2 border rounded text-sm" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                                <input type="text" placeholder="Username (NIP/Kode)" className="p-2 border rounded text-sm" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
                                <input type="text" placeholder="Password" className="p-2 border rounded text-sm" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                            </div>
                            <button onClick={handleAddUser} className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-green-700 flex items-center gap-2"><Plus className="w-4 h-4" /> Tambah User</button>
                        </div>
                        <div className="space-y-2">
                            {users.filter(u => u.role === 'GURU').map(u => (
                                <div key={u.id} className="flex justify-between items-center p-3 border rounded-lg bg-white hover:shadow-sm">
                                    <div><p className="font-bold text-gray-800 text-sm">{u.name}</p><p className="text-xs text-gray-500">User: {u.username}</p></div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded flex items-center gap-2">{showPasswordId === u.id ? u.password : '••••••'}<button onClick={() => setShowPasswordId(showPasswordId === u.id ? null : u.id)} className="text-gray-400 hover:text-gray-600">{showPasswordId === u.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}</button></div>
                                        <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                            {users.filter(u => u.role === 'GURU').length === 0 && <p className="text-center text-gray-400 text-sm py-4">Belum ada data guru.</p>}
                        </div>
                    </div>
                )}

            </div>
        </div>
    </div>
  );
};

export default SettingsView;
