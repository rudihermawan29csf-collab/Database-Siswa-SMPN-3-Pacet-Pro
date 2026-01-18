
import React, { useState, useMemo, useEffect } from 'react';
import { Student } from '../types';
import { Search, FileDown, FileBadge, Filter, Loader2, Files } from 'lucide-react';
import { api } from '../services/api';

interface SKLViewProps {
  students: Student[];
  userRole?: 'ADMIN' | 'STUDENT' | 'GURU';
  loggedInStudent?: Student;
}

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

// --- HELPER FUNCTIONS ---
const formatDateIndo = (dateStr: string) => {
    if(!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; 
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

// HELPER: Format Nama Kepala Sekolah & Gelar
const formatHeadmasterName = (name: string) => {
    if (!name) return '';
    
    // 1. Ubah semua ke lowercase dulu, lalu Capitalize setiap awal kata
    let formatted = name.toLowerCase().replace(/(?:^|\s)\S/g, function(a) { 
        return a.toUpperCase(); 
    });
    
    // 2. Perbaikan Khusus Gelar (Hardcoded fixes)
    // Menangani M.M.Pd. (d kecil)
    formatted = formatted.replace(/M\.m\.pd\.?/gi, 'M.M.Pd.');
    
    // Gelar umum lainnya (opsional, untuk jaga-jaga)
    formatted = formatted.replace(/S\.pd\.?/gi, 'S.Pd.');
    formatted = formatted.replace(/M\.pd\.?/gi, 'M.Pd.');
    formatted = formatted.replace(/S\.ag\.?/gi, 'S.Ag.');
    
    return formatted;
};

const calculateAverageScore = (student: Student, subjectKey: string) => {
    let total = 0;
    let count = 0;
    
    for (let i = 1; i <= 6; i++) {
        // Access safely with string or number key
        const record = student.academicRecords?.[i] || student.academicRecords?.[String(i)];
        if (record) {
            const subj = record.subjects.find(s => 
                s.subject === subjectKey || 
                s.subject.startsWith(subjectKey) ||
                (subjectKey === 'PAI' && s.subject.includes('Agama')) ||
                (subjectKey === 'IPA' && (s.subject === 'IPA' || s.subject.includes('Alam'))) || 
                (subjectKey === 'IPS' && (s.subject === 'IPS' || s.subject.includes('Sosial'))) || 
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

// --- REUSABLE SKL TEMPLATE COMPONENT ---
const SKLTemplate = ({ student, config, activeYear, headmasterName, headmasterNip }: { student: Student, config: any, activeYear: string, headmasterName: string, headmasterNip: string }) => {
    // Pastikan Logo URL ada isinya
    const logoUrl = config.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Lambang_Kabupaten_Mojokerto.png';

    return (
        /* 
           UKURAN F4: 215mm x 330mm
           Using h-[328mm] (slightly less than 330) to prevent page break overflow
        */
        <div className="w-[215mm] h-[328mm] bg-white p-[15mm] text-black font-serif relative box-border flex flex-col justify-between overflow-hidden page-break-after-always">
            
            <div>
                {/* --- KOP SURAT --- */}
                <div className="border-b-4 border-double border-black mb-4 pb-2 relative">
                    <div className="absolute left-0 top-0 w-24 h-24 flex items-center justify-center -ml-2">
                        <img 
                            src={logoUrl} 
                            alt="Logo" 
                            className="w-20 h-auto object-contain"
                            crossOrigin="anonymous"
                            onError={(e) => { 
                                // Fallback jika gambar gagal load (opsional: ganti ke placeholder atau hide)
                                // (e.target as HTMLImageElement).style.visibility = 'hidden'; 
                                console.warn("Logo failed to load");
                            }}
                        />
                    </div>
                    
                    <div className="text-center px-12">
                        <h3 className="text-lg font-bold font-serif leading-tight">PEMERINTAH KABUPATEN MOJOKERTO</h3>
                        <h3 className="text-lg font-bold font-serif leading-tight">DINAS PENDIDIKAN</h3>
                        <h1 className="text-2xl font-black font-serif leading-tight mt-1">SMPN 3 PACET</h1>
                        <p className="text-xs font-serif mt-1 leading-tight">
                            {config.headerLine1}<br/>
                            {config.headerLine2}<br/>
                            {config.headerLine3}
                        </p>
                    </div>
                </div>

                {/* --- JUDUL SURAT --- */}
                <div className="text-center mb-4">
                    <h2 className="text-lg font-bold underline decoration-1 underline-offset-2 mb-1">SURAT KETERANGAN LULUS</h2>
                    <p className="text-sm">NOMOR: {config.nomorSurat}</p>
                </div>

                {/* --- ISI SURAT --- */}
                <div className="text-sm font-serif leading-relaxed text-justify mb-2">
                    <p className="mb-2">
                        Yang bertanda tangan di bawah ini, Kepala SMPN 3 Pacet Kabupaten Mojokerto, Provinsi Jawa Timur menerangkan bahwa
                    </p>
                    
                    <table className="w-full mb-2 ml-4">
                        <tbody>
                            <tr>
                                <td className="w-48 py-0.5 align-top">nama</td>
                                <td className="w-4 align-top">:</td>
                                <td className="font-bold uppercase align-top">{student.fullName}</td>
                            </tr>
                            <tr>
                                <td className="w-48 py-0.5 align-top">tempat, tanggal lahir</td>
                                <td className="w-4 align-top">:</td>
                                <td className="capitalize align-top">{student.birthPlace}, {formatDateIndo(student.birthDate)}</td>
                            </tr>
                            <tr>
                                <td className="w-48 py-0.5 align-top">nomor induk siswa</td>
                                <td className="w-4 align-top">:</td>
                                <td className="align-top">{student.nis}</td>
                            </tr>
                            <tr>
                                <td className="w-48 py-0.5 align-top">NISN</td>
                                <td className="w-4 align-top">:</td>
                                <td className="align-top">{student.nisn}</td>
                            </tr>
                        </tbody>
                    </table>

                    <p className="mb-2">
                        Berdasarkan Keputusan Kepala SMPN 3 Pacet Nomor: {config.nomorSK} tanggal {config.tanggalKeputusan} telah memenuhi seluruh Kriteria Kelulusan dinyatakan:
                    </p>

                    <div className="text-center my-4">
                        <h1 className="text-2xl font-black uppercase tracking-widest border-2 border-black inline-block px-8 py-1">LULUS</h1>
                    </div>

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
                                const score = calculateAverageScore(student, sub.key);
                                return (
                                    <tr key={sub.key}>
                                        <td className="border border-black p-1 text-center">{index + 1}</td>
                                        <td className="border border-black p-1 pl-2">{sub.label}</td>
                                        <td className="border border-black p-1 text-center font-bold">
                                            {score > 0 ? score.toFixed(2).replace('.', ',') : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                            <tr>
                                <td className="border border-black p-1 pl-2 font-bold text-center" colSpan={2}>Rata-Rata</td>
                                <td className="border border-black p-1 text-center font-bold bg-gray-100">
                                    {calculateTotalAverage(student).toFixed(2).replace('.', ',')}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <p className="mb-4">
                        Surat Keterangan Lulus ini berlaku sementara sampai diterbitkannya Ijazah tahun pelajaran {activeYear}.
                    </p>
                </div>
            </div>

            {/* --- FOOTER TTD --- */}
            <div className="flex justify-end pb-10">
                <div className="text-center w-64 relative">
                    <p className="mb-1">{config.titimangsa}, {config.tanggalSurat}</p>
                    <p className="mb-20">Kepala SMPN 3 Pacet</p>
                    {/* Menggunakan helper baru: Huruf Kapital Depan + Gelar Benar */}
                    <p className="font-bold underline">{formatHeadmasterName(headmasterName)}</p>
                    <p>NIP. {headmasterNip}</p>
                </div>
            </div>
        </div>
    );
};

const SKLView: React.FC<SKLViewProps> = ({ students, userRole = 'ADMIN', loggedInStudent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [appSettings, setAppSettings] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  // Default SKL Config
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

  useEffect(() => {
      const fetchData = async () => {
          try {
              const settings = await api.getAppSettings();
              if (settings) {
                  setAppSettings(settings);
                  if (settings.sklConfig) {
                      setSklConfig(prev => ({ ...prev, ...settings.sklConfig }));
                  }
              }
          } catch (e) {
              console.error("Failed to load settings for SKL", e);
          }
      };
      fetchData();
  }, []);

  const uniqueClasses = useMemo(() => {
      const classes = Array.from(new Set(students.map(s => s.className))).filter(Boolean) as string[];
      return ['ALL', ...classes.sort((a, b) => {
          const levelA = a.split(' ')[0];
          const levelB = b.split(' ')[0];
          const romanMap: Record<string, number> = { 'VII': 7, 'VIII': 8, 'IX': 9 };
          
          const numA = romanMap[levelA] || 0;
          const numB = romanMap[levelB] || 0;

          if (numA !== numB) return numA - numB;
          return a.localeCompare(b);
      })];
  }, [students]);

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

  const activeYear = appSettings?.academicData?.activeYear || appSettings?.academicData?.year || new Date().getFullYear();
  const headmasterName = appSettings?.schoolData?.headmaster || 'DIDIK SULISTYO, M.M.Pd';
  const headmasterNip = appSettings?.schoolData?.nip || '19660518 198901 1 002';

  const handleDownloadPDF = () => {
      if (!selectedStudent) return;
      setIsGenerating(true);

      setTimeout(() => {
          const element = document.getElementById('skl-content-print');
          const filename = `SKL_${selectedStudent.fullName.replace(/\s+/g, '_')}.pdf`;

          const opt = {
            margin: 0,
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
            jsPDF: { unit: 'mm', format: [215, 330], orientation: 'portrait' }, // F4 Size
            pagebreak: { mode: 'avoid-all' }
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
              alert("Library PDF belum siap.");
          }
      }, 1000);
  };

  const handleDownloadAll = () => {
      if (filteredStudents.length === 0) {
          alert("Tidak ada siswa untuk didownload.");
          return;
      }
      if (filteredStudents.length > 50 && !window.confirm(`Anda akan mendownload ${filteredStudents.length} SKL sekaligus. Proses ini mungkin memakan waktu. Lanjutkan?`)) {
          return;
      }

      setIsBatchGenerating(true);

      setTimeout(() => {
          const element = document.getElementById('batch-skl-container');
          const className = selectedClass === 'ALL' ? 'Semua_Kelas' : selectedClass.replace(/\s+/g, '_');
          const filename = `SKL_Batch_${className}.pdf`;

          const opt = {
            margin: 0,
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
            jsPDF: { unit: 'mm', format: [215, 330], orientation: 'portrait' }, // F4 Size
            pagebreak: { mode: ['css', 'legacy'] }
          };

          // @ts-ignore
          const html2pdf = window.html2pdf;

          if (html2pdf) {
              html2pdf().set(opt).from(element).save().then(() => {
                  setIsBatchGenerating(false);
              }).catch((err: any) => {
                  console.error(err);
                  setIsBatchGenerating(false);
                  alert("Gagal melakukan batch download.");
              });
          }
      }, 5000); // Increased timeout to 5s for reliable rendering
  };

  return (
    <div className="flex flex-col h-full animate-fade-in space-y-4">
        
        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg font-bold text-sm border border-blue-100">
                    <FileBadge className="w-4 h-4" /> Surat Keterangan Lulus
                </div>
                {userRole === 'ADMIN' && (
                    <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg border border-gray-200">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select 
                            className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer"
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                        >
                            {uniqueClasses.map(c => <option key={c} value={c}>{c === 'ALL' ? 'Semua Kelas' : `Kelas ${c}`}</option>)}
                        </select>
                    </div>
                )}
            </div>

            <div className="flex gap-2 w-full md:w-auto">
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

                {userRole === 'ADMIN' && (
                    <button 
                        onClick={handleDownloadAll} 
                        disabled={isBatchGenerating}
                        className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black flex items-center gap-2 shadow-lg disabled:opacity-50"
                        title="Download semua siswa dalam satu PDF"
                    >
                        {isBatchGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Files className="w-4 h-4" />}
                        {isBatchGenerating ? 'Memproses...' : 'Download Semua'}
                    </button>
                )}

                {selectedStudent && (
                    <button 
                        onClick={handleDownloadPDF} 
                        disabled={isGenerating || isBatchGenerating}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                        Download PDF
                    </button>
                )}
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex gap-4 overflow-hidden relative">
            
            {/* List Sidebar (Admin/Guru only) */}
            {userRole !== 'STUDENT' && (
                <div className="w-80 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase flex justify-between">
                        <span>Daftar Siswa</span>
                        <span>{filteredStudents.length} Data</span>
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
                    <div id="skl-content-print" className="shadow-2xl">
                        <SKLTemplate 
                            student={selectedStudent} 
                            config={sklConfig} 
                            activeYear={activeYear} 
                            headmasterName={headmasterName} 
                            headmasterNip={headmasterNip} 
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <FileBadge className="w-16 h-16 mb-4 opacity-20" />
                        <p>Pilih siswa untuk melihat Surat Keterangan Lulus.</p>
                    </div>
                )}
            </div>
        </div>

        {/* VISIBLE OVERLAY FOR BATCH DOWNLOAD */}
        {isBatchGenerating && (
            <div className="fixed inset-0 z-[9999] bg-gray-900/90 flex flex-col items-center justify-start overflow-auto pt-20 pb-20">
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center animate-bounce-in">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                    <h3 className="text-xl font-bold text-gray-900">Memproses PDF...</h3>
                    <p className="text-gray-500 text-sm mt-2">Sedang menggabungkan {filteredStudents.length} dokumen.</p>
                    <p className="text-xs text-gray-400 mt-1">Mohon tunggu, jangan tutup halaman ini.</p>
                </div>

                {/* Batch Container - Rendered purely for PDF generation */}
                <div id="batch-skl-container" className="bg-white w-[215mm]">
                    {filteredStudents.map((student, index) => (
                        <div key={student.id} className="relative">
                            <SKLTemplate 
                                student={student} 
                                config={sklConfig} 
                                activeYear={activeYear} 
                                headmasterName={headmasterName} 
                                headmasterNip={headmasterNip} 
                            />
                            {/* Manual Page Break div for html2pdf */}
                            <div className="html2pdf__page-break" style={{ pageBreakAfter: 'always', height: 0, display: 'block' }}></div>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};

export default SKLView;
