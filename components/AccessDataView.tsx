import React, { useState, useMemo, useEffect } from 'react';
import { Student } from '../types';
import { KeyRound, Search, Filter, Download, CreditCard, FileSpreadsheet, Loader2, GraduationCap, X, Eye, QrCode } from 'lucide-react';
// @ts-ignore
import QRCode from 'qrcode';

interface AccessDataViewProps {
  students: Student[];
}

// Helper to chunk array for pagination (10 items per page)
const chunkArray = (array: any[], size: number) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
};

// --- REDESIGNED CARD COMPONENT (APPLE STYLE) ---
const LoginCard: React.FC<{ student: Student, index: number }> = ({ student, index }) => {
    const [qrSrc, setQrSrc] = useState('');
    // Point to the live app url
    const APP_URL = "https://database-siswa-smpn-3-pacet-pro.vercel.app";
    const qrPayload = `${APP_URL}?nisn=${student.nisn}&pass=${student.nis}`;

    useEffect(() => {
        QRCode.toDataURL(qrPayload, { 
            width: 200, 
            margin: 0,
            color: { dark: '#1f2937', light: '#ffffff' } // Dark gray instead of pure black
        })
        .then((url: string) => setQrSrc(url))
        .catch((err: any) => console.error(err));
    }, [qrPayload]);

    return (
        <div className="w-[90mm] h-[55mm] relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col box-border font-sans">
            {/* Decorative Top Gradient Line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

            {/* Header */}
            <div className="px-4 py-2 flex justify-between items-center border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <div className="bg-gray-100 p-1 rounded-md text-gray-700">
                        <GraduationCap className="w-3 h-3" />
                    </div>
                    <div>
                        <h1 className="text-[9px] font-bold text-gray-800 leading-none">SMPN 3 PACET</h1>
                        <p className="text-[6px] text-gray-500 font-medium tracking-wide">STUDENT ID CARD</p>
                    </div>
                </div>
                <div className="text-[7px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                    AKSES SISWA
                </div>
            </div>

            <div className="flex flex-1 p-3 gap-3 items-center">
                {/* Kiri: Data Siswa */}
                <div className="flex-1 flex flex-col justify-center space-y-2">
                    <div>
                        <p className="text-[6px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Nama Lengkap</p>
                        <p className="text-[10px] font-black text-gray-900 leading-tight line-clamp-2">{student.fullName}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <div>
                            <p className="text-[6px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Kelas</p>
                            <span className="text-[9px] font-bold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                {student.className}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-1 pt-1">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-0.5 border-dashed">
                            <span className="text-[7px] text-gray-500 font-medium">Username</span>
                            <span className="text-[9px] font-mono font-bold text-gray-800">{student.nisn}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-100 pb-0.5 border-dashed">
                            <span className="text-[7px] text-gray-500 font-medium">Password</span>
                            <span className="text-[9px] font-mono font-bold text-gray-800">{student.nis}</span>
                        </div>
                    </div>
                </div>

                {/* Kanan: QR Code Besar */}
                <div className="w-[28mm] flex flex-col items-center justify-center">
                    <div className="bg-white p-1 rounded-lg border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                        {qrSrc ? (
                            <img src={qrSrc} alt="QR" className="w-[24mm] h-[24mm] object-contain block rounded-sm" />
                        ) : (
                            <div className="w-[24mm] h-[24mm] bg-gray-50 animate-pulse rounded-sm"></div>
                        )}
                    </div>
                    <p className="text-[5px] font-bold text-gray-400 mt-1 text-center tracking-widest uppercase">Scan Me</p>
                </div>
            </div>
        </div>
    );
};

const AccessDataView: React.FC<AccessDataViewProps> = ({ students }) => {
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // PREVIEW MODAL STATE
  const [showPreview, setShowPreview] = useState(false);

  const uniqueClasses = useMemo(() => {
      const classes = Array.from(new Set(students.map(s => s.className))).filter(Boolean).sort();
      return ['ALL', ...classes];
  }, [students]);

  const filteredStudents = useMemo(() => {
      let filtered = students;
      if (selectedClass !== 'ALL') {
          filtered = filtered.filter(s => s.className === selectedClass);
      }
      if (searchTerm) {
          filtered = filtered.filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.nisn.includes(searchTerm));
      }
      return filtered.sort((a, b) => a.className.localeCompare(b.className) || a.fullName.localeCompare(b.fullName));
  }, [students, selectedClass, searchTerm]);

  // EXPORT EXCEL
  const handleDownloadExcel = () => {
      try {
          // @ts-ignore
          const xlsx = window.XLSX;
          if (!xlsx) { alert("Library Excel belum siap."); return; }

          const dataToExport = filteredStudents.map((s, index) => ({
              'No': index + 1,
              'Nama Siswa': s.fullName,
              'Kelas': s.className,
              'NISN (Username)': s.nisn,
              'NIS (Password)': s.nis,
          }));

          const ws = xlsx.utils.json_to_sheet(dataToExport);
          const wb = xlsx.utils.book_new();
          xlsx.utils.book_append_sheet(wb, ws, "Data Akses Siswa");
          xlsx.writeFile(wb, `Password_Siswa_${selectedClass}.xlsx`);
      } catch (e) { console.error(e); alert("Gagal download excel."); }
  };

  // EXPORT PDF CARDS (F4)
  const handleDownloadCards = () => {
      if (filteredStudents.length === 0) {
          alert("Tidak ada data untuk dicetak.");
          return;
      }

      setIsGenerating(true);
      
      setTimeout(() => {
          const element = document.getElementById('access-cards-print');
          const filename = `Kartu_Login_Siswa_${selectedClass}.pdf`;
          
          const opt = {
              margin: 0, // Margin is handled by CSS in container
              filename: filename,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
              // UKURAN F4 (215mm x 330mm)
              jsPDF: { unit: 'mm', format: [215, 330], orientation: 'portrait' },
              pagebreak: { mode: ['css', 'legacy'] } 
          };

          // @ts-ignore
          if (window.html2pdf) {
              // @ts-ignore
              window.html2pdf().set(opt).from(element).save().then(() => {
                  setIsGenerating(false);
              }).catch((err: any) => {
                  console.error(err);
                  setIsGenerating(false);
                  alert("Gagal membuat PDF.");
              });
          } else {
              setIsGenerating(false);
              alert("Library PDF belum siap.");
          }
      }, 1000); 
  };

  // OPEN PREVIEW
  const handlePreviewCards = () => {
      if (filteredStudents.length === 0) {
          alert("Tidak ada data siswa untuk ditampilkan.");
          return;
      }
      if (filteredStudents.length > 100 && !window.confirm(`Anda akan memproses ${filteredStudents.length} kartu. Ini mungkin agak lambat. Lanjutkan?`)) {
          return;
      }
      setShowPreview(true);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in space-y-4">
        
        {/* PREVIEW MODAL */}
        {showPreview && (
            <div className="fixed inset-0 z-[100] bg-gray-900/95 backdrop-blur-sm flex flex-col animate-fade-in">
                {/* Modal Header */}
                <div className="flex justify-between items-center px-6 py-4 bg-gray-800 border-b border-gray-700">
                    <div className="text-white">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-blue-400" /> Preview Kartu Login
                        </h2>
                        <p className="text-xs text-gray-400">Total {filteredStudents.length} Kartu siap cetak (Ukuran F4 - 10 Kartu/Hal)</p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowPreview(false)}
                            disabled={isGenerating}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-bold transition-colors"
                        >
                            Tutup
                        </button>
                        <button 
                            onClick={handleDownloadCards}
                            disabled={isGenerating}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-colors"
                        >
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4" />}
                            Download PDF (F4)
                        </button>
                    </div>
                </div>

                {/* Modal Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-gray-900 custom-scrollbar">
                    {/* Visual Preview Container */}
                    <div className="bg-white p-8 shadow-2xl min-h-[1000px] w-[215mm] flex flex-col gap-6">
                        <div className="text-center border-b pb-4 mb-4">
                            <h3 className="font-bold text-xl text-gray-800">PREVIEW HALAMAN 1 (10 KARTU)</h3>
                            <p className="text-sm text-gray-500">Layout sesuai F4 (215mm x 330mm) - Modern Style</p>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-6 justify-center">
                            {filteredStudents.slice(0, 10).map((s, idx) => ( 
                                <div key={s.id} className="flex justify-center transform scale-100 hover:scale-105 transition-transform duration-300">
                                    <LoginCard student={s} index={idx} />
                                </div>
                            ))}
                        </div>
                        {filteredStudents.length > 10 && (
                            <div className="text-center p-4 bg-gray-100 rounded text-gray-500 mt-4 font-bold border border-gray-200">
                                ... {filteredStudents.length - 10} kartu lainnya di halaman berikutnya (Auto Generate di PDF) ...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-2 rounded-lg font-bold text-sm border border-purple-100">
                    <KeyRound className="w-4 h-4" /> Data Akses & Kartu Login
                </div>
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
            </div>

            <div className="flex gap-2 w-full md:w-auto flex-wrap justify-end">
                <div className="relative w-full md:w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="text" placeholder="Cari..." className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-lg text-sm border-none focus:ring-2 focus:ring-purple-200 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <button onClick={handleDownloadExcel} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-bold flex items-center gap-1 shadow-sm">
                    <FileSpreadsheet className="w-4 h-4" /> Excel
                </button>
                <button onClick={handlePreviewCards} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-bold flex items-center gap-1 shadow-sm transition-transform active:scale-95">
                    <Eye className="w-4 h-4" /> Kartu Login
                </button>
            </div>
        </div>

        {/* Display Table (Screen) */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1 pb-32">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 text-xs font-bold text-gray-700 uppercase sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-4 w-12 text-center">No</th>
                            <th className="px-6 py-4">Nama Siswa</th>
                            <th className="px-6 py-4 text-center">Kelas</th>
                            <th className="px-6 py-4">Username (NISN)</th>
                            <th className="px-6 py-4">Password (NIS)</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {filteredStudents.length > 0 ? filteredStudents.map((s, idx) => (
                            <tr key={s.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                                <td className="px-6 py-3 text-center text-gray-500">{idx + 1}</td>
                                <td className="px-6 py-3 font-bold text-gray-800">{s.fullName}</td>
                                <td className="px-6 py-3 text-center"><span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs font-bold">{s.className}</span></td>
                                <td className="px-6 py-3 font-mono text-blue-600">{s.nisn}</td>
                                <td className="px-6 py-3 font-mono text-purple-600 font-bold">{s.nis}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">Tidak ada data ditemukan.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* HIDDEN PRINT AREAS - PAGINATED FOR F4 (10 Cards per Page) */}
        <div className="hidden">
            {/* We divide students into chunks of 10 */}
            <div id="access-cards-print" className="w-[215mm] bg-white text-black">
                {chunkArray(filteredStudents, 10).map((studentChunk, pageIdx) => (
                    <div 
                        key={pageIdx} 
                        className="w-[215mm] h-[330mm] p-[10mm] relative box-border" 
                        style={{ pageBreakAfter: 'always' }}
                    >
                        {/* Grid: 2 Cols x 5 Rows = 10 Cards */}
                        <div className="grid grid-cols-2 gap-x-[10mm] gap-y-[6mm] justify-center content-start h-full">
                            {studentChunk.map((s: Student, idx: number) => (
                                <div key={s.id} className="flex justify-center items-center break-inside-avoid">
                                    <LoginCard student={s} index={idx} />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default AccessDataView;