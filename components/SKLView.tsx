import React, { useState, useMemo, useEffect } from 'react';
import { Student } from '../types';
import { Search, FileDown, FileBadge, Filter, Settings, Save, X, RotateCcw, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface SKLViewProps {
  students: Student[];
  userRole?: 'ADMIN' | 'STUDENT' | 'GURU';
  loggedInStudent?: Student;
}

const CLASS_LIST = ['VII A', 'VII B', 'VII C', 'VIII A', 'VIII B', 'VIII C', 'IX A', 'IX B', 'IX C'];

// Subject mapping specifically for SKL format
const SKL_SUBJECTS = [
    { key: 'PAI', label: 'Pendidikan Agama dan Budi Pekerti' },
    { key: 'Pendidikan Pancasila', label: 'Pendidikan Pancasila' },
    { key: 'Bahasa Indonesia', label: 'Bahasa Indonesia' },
    { key: 'Matematika', label: 'Matematika' },
    { key: 'IPA', label: 'Ilmu Pengetahuan Alam' },
    { key: 'IPS', label: 'Ilmu Pengetahuan Sosial' },
    { key: 'Bahasa Inggris', label: 'Bahasa Inggris' },
    { key: 'PJOK', label: 'Pendidikan Jasmani, Olahraga, dan Kesehatan' },
    { key: 'Informatika', label: 'Informatika' },
    { key: 'Seni dan Prakarya', label: 'Seni Budaya atau Prakarya' },
    { key: 'Bahasa Jawa', label: 'Muatan Lokal: Bahasa Jawa' },
];

const SKLView: React.FC<SKLViewProps> = ({ students, userRole = 'ADMIN', loggedInStudent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [appSettings, setAppSettings] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- EDIT CONFIG STATE ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [sklConfig, setSklConfig] = useState({
      nomorSurat: '421.3/ 1457 /416-101.64/2025',
      nomorSK: '421.3/1456/416-101.64/2025',
      tanggalKeputusan: '2 Juni 2025',
      tanggalSurat: '2 Juni 2025',
      titimangsa: 'Mojokerto'
  });

  useEffect(() => {
      const fetchData = async () => {
          try {
              const settings = await api.getAppSettings();
              if (settings) setAppSettings(settings);
              
              // Load saved SKL config from localStorage
              const savedConfig = localStorage.getItem('skl_config');
              if (savedConfig) {
                  setSklConfig(JSON.parse(savedConfig));
              }
          } catch (e) {
              console.error("Failed to load settings for SKL", e);
          }
      };
      fetchData();
  }, []);

  // Force selection for student role
  useEffect(() => {
      if (userRole === 'STUDENT' && loggedInStudent) {
          setSelectedStudent(loggedInStudent);
      }
  }, [userRole, loggedInStudent]);

  const filteredStudents = useMemo(() => {
      if (userRole === 'STUDENT' && loggedInStudent) return [loggedInStudent];
      
      return students.filter(s => {
          const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.nisn.includes(searchTerm);
          const matchClass = selectedClass === 'ALL' || s.className === selectedClass;
          return matchSearch && matchClass;
      }).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [students, searchTerm, selectedClass, userRole, loggedInStudent]);

  // --- Grade Calculation Logic ---
  const calculateAverageScore = (student: Student, subjectKey: string) => {
      let total = 0;
      let count = 0;
      
      for (let i = 1; i <= 6; i++) {
          const record = student.academicRecords?.[i];
          if (record) {
              const subj = record.subjects.find(s => 
                  s.subject === subjectKey || 
                  s.subject.startsWith(subjectKey) ||
                  (subjectKey === 'PAI' && s.subject.includes('Agama')) ||
                  (subjectKey === 'IPA' && (s.subject === 'IPA' || s.subject.includes('Alam'))) || // Robust check for IPA
                  (subjectKey === 'IPS' && (s.subject === 'IPS' || s.subject.includes('Sosial'))) || // Robust check for IPS
                  (subjectKey === 'Seni dan Prakarya' && (s.subject.includes('Seni') || s.subject.includes('Prakarya')))
              );
              
              if (subj && subj.score > 0) {
                  total += subj.score;
                  count++;
              }
          }
      }
      
      return count > 0 ? (total / count) : 0;
  };

  const calculateTotalAverage = (student: Student) => {
      let sum = 0;
      let count = 0;
      SKL_SUBJECTS.forEach(sub => {
          const score = calculateAverageScore(student, sub.key);
          if (score > 0) {
              sum += score;
              count++;
          }
      });
      return count > 0 ? (sum / count) : 0;
  };

  // Helper: Format Date
  const formatDateIndo = (dateStr: string) => {
      if(!dateStr) return '-';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr; 
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Helper: Title Case for Headmaster Name with specific Gelar fix
  const toTitleCase = (str: string) => {
      // 1. Standarisasi huruf besar di awal kata
      let converted = str.replace(/\w\S*/g, (txt) => {
          return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      });
      
      // 2. Perbaikan spesifik untuk gelar M.M.Pd.
      // Mengubah M.m.pd atau variasi lain menjadi M.M.Pd.
      return converted.replace(/M\.m\.pd/gi, 'M.M.Pd');
  };

  const handleDownloadPDF = () => {
      if (!selectedStudent) return;
      setIsGenerating(true);

      setTimeout(() => {
          const element = document.getElementById('skl-content');
          const filename = `SKL_${selectedStudent.fullName.replace(/\s+/g, '_')}.pdf`;

          const opt = {
            margin: 0,
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
            // UPDATED TO F4 SIZE (Folio) ~ 215mm x 330mm
            jsPDF: { unit: 'mm', format: [215, 330], orientation: 'portrait' }
          };

          // @ts-ignore
          const html2pdf = window.html2pdf;

          if (html2pdf) {
              html2pdf().set(opt).from(element).save().then(() => {
                  setIsGenerating(false);
              }).catch((err: any) => {
                  console.error(err);
                  setIsGenerating(false);
                  alert("Gagal mengunduh PDF.");
              });
          } else {
              setIsGenerating(false);
              alert("Library PDF belum siap. Silakan refresh halaman.");
          }
      }, 500);
  };

  const handleSaveConfig = () => {
      localStorage.setItem('skl_config', JSON.stringify(sklConfig));
      setIsEditModalOpen(false);
  };

  const handleResetConfig = () => {
      const defaults = {
          nomorSurat: '421.3/ 1457 /416-101.64/2025',
          nomorSK: '421.3/1456/416-101.64/2025',
          tanggalKeputusan: '2 Juni 2025',
          tanggalSurat: '2 Juni 2025',
          titimangsa: 'Mojokerto'
      };
      setSklConfig(defaults);
  };

  // Dynamic Data Sources
  const activeYear = appSettings?.academicData?.year || new Date().getFullYear();
  const headmasterName = appSettings?.schoolData?.headmaster || 'DIDIK SULISTYO, M.M.Pd';
  const headmasterNip = appSettings?.schoolData?.nip || '19660518 198901 1 002';

  return (
    <div className="flex flex-col h-full animate-fade-in space-y-4">
        
        {/* EDIT MODAL */}
        {isEditModalOpen && (
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 transform scale-100 transition-all">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-gray-600" />
                            Edit Kop & Konten SKL
                        </h3>
                        <button onClick={() => setIsEditModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>
                    
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
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
                        
                        <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-xs text-yellow-800">
                            <p className="font-bold mb-1">Info Data Dinamis:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Tahun Pelajaran: {activeYear} (dari Pengaturan Admin)</li>
                                <li>Kepala Sekolah: {headmasterName} (dari Pengaturan Admin)</li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-6 pt-4 border-t">
                        <button onClick={handleResetConfig} className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-lg text-sm hover:bg-gray-200 flex items-center gap-1">
                            <RotateCcw className="w-4 h-4" /> Reset
                        </button>
                        <div className="flex-1"></div>
                        <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-50">Batal</button>
                        <button onClick={handleSaveConfig} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
                            <Save className="w-4 h-4" /> Simpan
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg font-bold text-sm border border-blue-100">
                    <FileBadge className="w-4 h-4" /> Surat Keterangan Lulus
                </div>
                {userRole === 'ADMIN' && (
                    <>
                        <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg border border-gray-200">
                            <Filter className="w-4 h-4 text-gray-500" />
                            <select 
                                className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer"
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                            >
                                <option value="ALL">Semua Kelas</option>
                                {CLASS_LIST.map(c => <option key={c} value={c}>Kelas {c}</option>)}
                            </select>
                        </div>
                        <button 
                            onClick={() => setIsEditModalOpen(true)}
                            className="flex items-center gap-2 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-gray-900 transition-colors"
                            title="Edit Header & Konten SKL"
                        >
                            <Settings className="w-4 h-4" /> Edit SKL
                        </button>
                    </>
                )}
            </div>

            {userRole !== 'STUDENT' && (
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Cari Siswa..." 
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 transition-all" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                </div>
            )}

            {selectedStudent && (
                <button 
                    onClick={handleDownloadPDF} 
                    disabled={isGenerating}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-50"
                >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                    {isGenerating ? 'Memproses...' : 'Download PDF (F4)'}
                </button>
            )}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex gap-4 overflow-hidden relative">
            
            {/* List Sidebar (Admin/Guru only) */}
            {userRole !== 'STUDENT' && (
                <div className="w-80 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase">
                        Daftar Siswa ({filteredStudents.length})
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredStudents.length > 0 ? (
                            filteredStudents.map((s) => (
                                <div 
                                    key={s.id} 
                                    onClick={() => setSelectedStudent(s)}
                                    className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${selectedStudent?.id === s.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
                                >
                                    <p className="text-sm font-bold text-gray-800">{s.fullName}</p>
                                    <p className="text-xs text-gray-500">{s.nisn} | {s.className}</p>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-400 text-sm">Tidak ada data.</div>
                        )}
                    </div>
                </div>
            )}

            {/* Document Preview */}
            <div className="flex-1 bg-gray-100 overflow-auto flex justify-center p-8">
                {selectedStudent ? (
                    /* UPDATED TO F4 SIZE (215mm x 330mm) */
                    <div id="skl-content" className="w-[215mm] min-h-[330mm] bg-white shadow-2xl p-[20mm] text-black font-serif relative box-border">
                        
                        {/* --- KOP SURAT --- */}
                        <div className="border-b-4 border-double border-black mb-6 pb-2 relative">
                            {/* Logo Left (Kabupaten) - Updated to Wikimedia URL for stability */}
                            <div className="absolute left-0 top-0 w-24 h-24 flex items-center justify-center -ml-4">
                                <img 
                                    src="https://upload.wikimedia.org/wikipedia/commons/e/eb/Lambang_Kabupaten_Mojokerto.png" 
                                    alt="Logo Kabupaten" 
                                    className="w-20 h-auto object-contain"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                            </div>
                            
                            <div className="text-center px-16">
                                <h3 className="text-lg font-bold font-serif leading-tight">PEMERINTAH KABUPATEN MOJOKERTO</h3>
                                <h3 className="text-lg font-bold font-serif leading-tight">DINAS PENDIDIKAN</h3>
                                <h1 className="text-2xl font-black font-serif leading-tight mt-1">SMPN 3 PACET</h1>
                                <p className="text-xs font-serif mt-1 leading-tight">
                                    Jl. Tirtawening Ds. Kembangbelor Kec. Pacet Kab. Mojokerto Kode Pos 61374<br/>
                                    NSS: 201050314970 NIS: 200970 NPSN: 20555784<br/>
                                    Email : smpn3pacet2007@gmail.com, HP: 0815 5386 0273
                                </p>
                            </div>
                        </div>

                        {/* --- JUDUL SURAT --- */}
                        <div className="text-center mb-6">
                            <h2 className="text-lg font-bold underline decoration-1 underline-offset-4">SURAT KETERANGAN LULUS</h2>
                            <p className="text-sm">NOMOR: {sklConfig.nomorSurat}</p>
                        </div>

                        {/* --- ISI SURAT --- */}
                        <div className="text-sm font-serif leading-relaxed text-justify mb-4">
                            <p className="mb-4">
                                Yang bertanda tangan di bawah ini, Kepala SMPN 3 Pacet Kabupaten Mojokerto, Provinsi Jawa Timur menerangkan bahwa
                            </p>
                            
                            <table className="w-full mb-4">
                                <tbody>
                                    <tr>
                                        <td className="w-52 py-0.5 align-top">nama</td>
                                        <td className="w-4 align-top">:</td>
                                        <td className="font-bold uppercase align-top">{selectedStudent.fullName}</td>
                                    </tr>
                                    <tr>
                                        <td className="w-52 py-0.5 align-top">tempat, tanggal lahir</td>
                                        <td className="w-4 align-top">:</td>
                                        <td className="capitalize align-top">{selectedStudent.birthPlace}, {formatDateIndo(selectedStudent.birthDate)}</td>
                                    </tr>
                                    <tr>
                                        <td className="w-52 py-0.5 align-top">nomor induk siswa</td>
                                        <td className="w-4 align-top">:</td>
                                        <td className="align-top">{selectedStudent.nis}</td>
                                    </tr>
                                    <tr>
                                        <td className="w-52 py-0.5 align-top">NISN</td>
                                        <td className="w-4 align-top">:</td>
                                        <td className="align-top">{selectedStudent.nisn}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <p className="mb-4">
                                Berdasarkan Keputusan Kepala SMPN 3 Pacet Nomor: {sklConfig.nomorSK} tanggal {sklConfig.tanggalKeputusan} telah memenuhi seluruh Kriteria Kelulusan dinyatakan:
                            </p>

                            <div className="text-center my-6">
                                <h1 className="text-2xl font-black uppercase tracking-widest">LULUS</h1>
                                <p className="text-sm mt-2">dari:</p>
                            </div>

                            <table className="w-full mb-4">
                                <tbody>
                                    <tr>
                                        <td className="w-52 py-0.5 align-top">Satuan Pendidikan</td>
                                        <td className="w-4 align-top">:</td>
                                        <td className="align-top">SMPN 3 Pacet</td>
                                    </tr>
                                    <tr>
                                        <td className="w-52 py-0.5 align-top">NPSN</td>
                                        <td className="w-4 align-top">:</td>
                                        <td className="align-top">20555784</td>
                                    </tr>
                                </tbody>
                            </table>

                            <p className="mb-2">Dengan nilai sebagai berikut:</p>

                            {/* --- TABEL NILAI --- */}
                            <table className="w-full border-collapse border border-black text-sm mb-4">
                                <thead>
                                    <tr>
                                        <th className="border border-black p-1 w-10 text-center">No</th>
                                        <th className="border border-black p-1 text-center">Mata Pelajaran</th>
                                        <th className="border border-black p-1 w-24 text-center">Nilai</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {SKL_SUBJECTS.map((sub, index) => {
                                        const score = calculateAverageScore(selectedStudent, sub.key);
                                        return (
                                            <tr key={sub.key}>
                                                <td className="border border-black p-1 text-center">{index + 1}</td>
                                                <td className="border border-black p-1 pl-2">{sub.label}</td>
                                                <td className="border border-black p-1 text-center">
                                                    {score > 0 ? score.toFixed(2).replace('.', ',') : ''}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr>
                                        <td className="border border-black p-1 pl-2 font-bold text-center" colSpan={2}>Rata-Rata</td>
                                        <td className="border border-black p-1 text-center font-bold">
                                            {calculateTotalAverage(selectedStudent).toFixed(2).replace('.', ',')}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            <p className="mb-8">
                                Surat Keterangan Lulus ini berlaku sementara sampai diterbitkannya Ijazah tahun pelajaran {activeYear}.
                            </p>

                            {/* --- FOOTER TTD --- */}
                            <div className="flex justify-end mt-8">
                                <div className="text-center w-64 relative">
                                    <p className="mb-1">{sklConfig.titimangsa}, {sklConfig.tanggalSurat}</p>
                                    <p className="mb-24">Kepala SMPN 3 Pacet</p>
                                    
                                    {/* PHOTO BOX REMOVED */}

                                    <p className="font-bold underline">{toTitleCase(headmasterName)}</p>
                                    <p>NIP. {headmasterNip}</p>
                                </div>
                            </div>

                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <FileBadge className="w-16 h-16 mb-4 opacity-20" />
                        <p>Pilih siswa untuk melihat Surat Keterangan Lulus.</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default SKLView;