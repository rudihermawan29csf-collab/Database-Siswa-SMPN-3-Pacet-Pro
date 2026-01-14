import React, { useState, useEffect } from 'react';
import { Save, School, Calendar, Users, Lock, Check, UploadCloud, Loader2, BookOpen, Plus, Trash2, LayoutList } from 'lucide-react';
import { api } from '../services/api';
import { MOCK_STUDENTS } from '../services/mockData';

const CLASS_LIST = ['VII A', 'VII B', 'VII C', 'VIII A', 'VIII B', 'VIII C', 'IX A', 'IX B', 'IX C'];
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

const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'ACADEMIC' | 'USERS' | 'KELAS' | 'P5'>('IDENTITY');
  const [isSyncing, setIsSyncing] = useState(false);
  
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
      semesterYears: Record<number, string>;
      semesterDates: Record<number, string>; // Added for specific dates
  }

  const [academicData, setAcademicData] = useState<AcademicData>({
      year: '2024/2025',
      semester: '1',
      reportDate: '2024-12-20',
      semesterYears: {
          1: '2024/2025',
          2: '2024/2025',
          3: '2025/2026',
          4: '2025/2026',
          5: '2026/2027',
          6: '2026/2027'
      },
      semesterDates: {
          1: '', 2: '', 3: '', 4: '', 5: '', 6: ''
      }
  });

  // --- CLASS & WALI KELAS SETTINGS ---
  const [selectedYearClass, setSelectedYearClass] = useState('2024/2025');
  const [selectedSemesterClass, setSelectedSemesterClass] = useState(1);
  // Structure: { "2024/2025-1-VII A": { teacher: "", nip: "" } }
  const [classConfig, setClassConfig] = useState<Record<string, { teacher: string, nip: string }>>({});

  // --- P5 SETTINGS ---
  const [p5Filter, setP5Filter] = useState({ year: '2024/2025', level: 'VII', semester: 1 });
  // Structure: { "2024/2025-VII-1": [ { theme: "", description: "" } ] }
  const [p5Config, setP5Config] = useState<Record<string, { theme: string, description: string }[]>>({});

  // Load from LocalStorage on mount
  useEffect(() => {
      const savedClassConfig = localStorage.getItem('sys_class_config');
      if (savedClassConfig) setClassConfig(JSON.parse(savedClassConfig));

      const savedP5Config = localStorage.getItem('sys_p5_config');
      if (savedP5Config) setP5Config(JSON.parse(savedP5Config));
      
      const savedAcademic = localStorage.getItem('sys_academic_data');
      if (savedAcademic) {
          const parsed = JSON.parse(savedAcademic);
          // Ensure semesterYears exists for backward compatibility
          if (!parsed.semesterYears) {
              parsed.semesterYears = {
                  1: parsed.year || '2024/2025', 2: parsed.year || '2024/2025',
                  3: parsed.year || '2024/2025', 4: parsed.year || '2024/2025',
                  5: parsed.year || '2024/2025', 6: parsed.year || '2024/2025',
              };
          }
          // Ensure semesterDates exists
          if (!parsed.semesterDates) {
              parsed.semesterDates = { 1: parsed.reportDate, 2: '', 3: '', 4: '', 5: '', 6: '' };
          }
          setAcademicData(parsed);
      }
  }, []);

  const handleSave = () => {
      // Save all configs
      localStorage.setItem('sys_class_config', JSON.stringify(classConfig));
      localStorage.setItem('sys_p5_config', JSON.stringify(p5Config));
      localStorage.setItem('sys_academic_data', JSON.stringify(academicData));
      alert("Pengaturan berhasil disimpan.");
  };

  const handleInitialSync = async () => {
      if(!window.confirm("Ini akan menimpa data di Google Sheets dengan Data Mockup lokal. Lanjutkan?")) return;
      
      setIsSyncing(true);
      const success = await api.syncInitialData(MOCK_STUDENTS);
      setIsSyncing(false);
      
      if (success) alert("Sinkronisasi Berhasil!");
      else alert("Sinkronisasi Gagal. Cek Console.");
  };

  // Class Config Handlers
  const handleWaliChange = (className: string, field: 'teacher' | 'nip', value: string) => {
      // Key format: YEAR-SEMESTER-CLASS (allows different teachers per semester if needed)
      const key = `${selectedYearClass}-${selectedSemesterClass}-${className}`;
      setClassConfig(prev => ({
          ...prev,
          [key]: {
              ...prev[key],
              [field]: value
          }
      }));
  };

  // P5 Config Handlers
  const getCurrentP5Key = () => `${p5Filter.year}-${p5Filter.level}-${p5Filter.semester}`;
  
  const getCurrentP5List = () => {
      return p5Config[getCurrentP5Key()] || [];
  };

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

  const TabButton = ({ id, label, icon: Icon }: any) => (
      <button 
        onClick={() => setActiveTab(id)}
        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === id ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
      >
          <Icon className="w-4 h-4" />
          {label}
      </button>
  );

  return (
    <div className="flex flex-col h-full animate-fade-in space-y-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">Pengaturan Sistem</h2>
            <div className="flex gap-2">
                <button 
                    onClick={handleInitialSync} 
                    disabled={isSyncing}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-sm transition-transform active:scale-95 disabled:opacity-50"
                >
                    {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                    Sync Data Awal
                </button>
                <button onClick={handleSave} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-transform active:scale-95">
                    <Save className="w-4 h-4 mr-2" /> Simpan Perubahan
                </button>
            </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1">
            <div className="flex border-b border-gray-200 overflow-x-auto">
                <TabButton id="IDENTITY" label="Identitas Sekolah" icon={School} />
                <TabButton id="ACADEMIC" label="Tahun Ajaran (Rapor)" icon={Calendar} />
                <TabButton id="KELAS" label="Data Kelas & Wali" icon={BookOpen} />
                <TabButton id="P5" label="Setting P5" icon={LayoutList} />
                <TabButton id="USERS" label="Manajemen User" icon={Users} />
            </div>

            <div className="p-6 flex-1 overflow-auto bg-gray-50/50">
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

                {activeTab === 'ACADEMIC' && (
                    <div className="max-w-2xl space-y-4 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                         <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                             <p className="text-sm text-blue-800">Pengaturan ini akan ditampilkan pada kop/header Rapor Nilai siswa sesuai dengan semester yang dipilih.</p>
                         </div>
                         
                         {/* SETTING TAHUN PELAJARAN */}
                         <div className="border-b pb-4 mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Setting Tahun Pelajaran per Semester</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[1, 2, 3, 4, 5, 6].map(sem => (
                                    <div key={sem} className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-gray-600">Semester {sem}</label>
                                        <input 
                                            type="text" 
                                            className="w-full p-2 border rounded-lg text-sm font-medium"
                                            placeholder="Contoh: 2024/2025"
                                            value={academicData.semesterYears?.[sem] || ''}
                                            onChange={e => setAcademicData(prev => ({
                                                ...prev,
                                                semesterYears: {
                                                    ...prev.semesterYears,
                                                    [sem]: e.target.value
                                                }
                                            }))}
                                        />
                                    </div>
                                ))}
                            </div>
                         </div>

                         {/* SETTING TANGGAL RAPOR */}
                         <div className="border-b pb-4 mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Setting Tanggal Rapor per Semester</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[1, 2, 3, 4, 5, 6].map(sem => (
                                    <div key={sem} className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-gray-600">Tanggal Rapor Semester {sem}</label>
                                        <input 
                                            type="date" 
                                            className="w-full p-2 border rounded-lg text-sm font-medium"
                                            value={academicData.semesterDates?.[sem] || ''}
                                            onChange={e => setAcademicData(prev => ({
                                                ...prev,
                                                semesterDates: {
                                                    ...prev.semesterDates,
                                                    [sem]: e.target.value
                                                }
                                            }))}
                                        />
                                    </div>
                                ))}
                            </div>
                         </div>

                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Semester Aktif (Sistem)</label>
                            <div className="flex gap-4 mb-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="sem" checked={academicData.semester === '1'} onChange={() => setAcademicData({...academicData, semester: '1'})} />
                                    <span className="text-sm">Ganjil (1)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="sem" checked={academicData.semester === '2'} onChange={() => setAcademicData({...academicData, semester: '2'})} />
                                    <span className="text-sm">Genap (2)</span>
                                </label>
                            </div>
                         </div>
                    </div>
                )}

                {/* --- TAB DATA KELAS --- */}
                {activeTab === 'KELAS' && (
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row items-center gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
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
                                    {CLASS_LIST.map(cls => {
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
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- TAB KONFIGURASI P5 --- */}
                {activeTab === 'P5' && (
                    <div className="space-y-4">
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
                                    onChange={(e) => setP5Filter({...p5Filter, level: e.target.value})}
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
                                    {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Semester {s}</option>)}
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

                {activeTab === 'USERS' && (
                    <div className="space-y-4 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                         <div className="flex justify-between items-center mb-4">
                             <h3 className="text-sm font-bold text-gray-700">Akun Terdaftar</h3>
                             <button className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded border">Reset Password Masal</button>
                         </div>
                         <table className="w-full text-left border-collapse text-sm">
                             <thead className="bg-gray-50 border-b">
                                 <tr>
                                     <th className="p-3">Username</th>
                                     <th className="p-3">Role</th>
                                     <th className="p-3">Status</th>
                                     <th className="p-3 text-right">Aksi</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 <tr className="border-b">
                                     <td className="p-3">admin@smpn3pacet.sch.id</td>
                                     <td className="p-3"><span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">ADMIN</span></td>
                                     <td className="p-3 text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> Aktif</td>
                                     <td className="p-3 text-right"><button className="text-blue-600 hover:underline text-xs">Ubah Password</button></td>
                                 </tr>
                                 <tr className="border-b">
                                     <td className="p-3">siswa (All Students)</td>
                                     <td className="p-3"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">STUDENT</span></td>
                                     <td className="p-3 text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> Aktif</td>
                                     <td className="p-3 text-right"><button className="text-blue-600 hover:underline text-xs">Reset Default</button></td>
                                 </tr>
                             </tbody>
                         </table>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default SettingsView;