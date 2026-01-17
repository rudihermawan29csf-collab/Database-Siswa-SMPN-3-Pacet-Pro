import React, { useState, useMemo, useEffect } from 'react';
import { Student } from '../types';
import { KeyRound, Search, Filter, Download, CreditCard, FileSpreadsheet, Loader2, GraduationCap, X, Eye } from 'lucide-react';
// @ts-ignore
import QRCode from 'qrcode';

interface AccessDataViewProps {
  students: Student[];
}

// Card Component specifically for rendering
const LoginCard: React.FC<{ student: Student, index: number }> = ({ student, index }) => {
    const [qrSrc, setQrSrc] = useState('');
    const APP_URL = "https://database-siswa-smpn-3-pacet-pro.vercel.app";

    useEffect(() => {
        QRCode.toDataURL(APP_URL, { 
            width: 100,
            margin: 0,
            color: { dark: '#000000', light: '#FFFFFF00' }
        })
        .then((url: string) => setQrSrc(url))
        .catch((err: any) => console.error(err));
    }, []);

    return (
        <div className="w-[85.6mm] h-[53.98mm] relative overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm break-inside-avoid page-break-inside-avoid print:shadow-none" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-white z-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-100 to-purple-100 rounded-bl-[100px] opacity-60"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-50 to-yellow-50 rounded-tr-[80px] opacity-60"></div>
            </div>
            
            {/* Content */}
            <div className="relative z-10 p-3 h-full flex flex-col justify-between">
                {/* Header */}
                <div className="flex items-center gap-2 border-b border-gray-100 pb-1">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-700 to-indigo-800 flex items-center justify-center shadow text-white">
                        <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-[9px] font-black text-gray-800 uppercase tracking-widest leading-tight">KARTU LOGIN SISWA</h3>
                        <p className="text-[7px] text-gray-500 font-bold tracking-wide">SMPN 3 PACET</p>
                    </div>
                </div>

                {/* Body */}
                <div className="flex justify-between items-end gap-2 mt-1 flex-1">
                    <div className="space-y-1.5 flex-1">
                        <div className="bg-gray-50 p-1.5 rounded border border-gray-100">
                            <p className="text-[6px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Nama Siswa</p>
                            <p className="text-[9px] font-bold text-gray-900 leading-tight line-clamp-2 uppercase">{student.fullName}</p>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-blue-50 p-1.5 rounded border border-blue-100">
                                <p className="text-[6px] text-blue-400 font-bold uppercase tracking-wider mb-0.5">Username</p>
                                <p className="text-[10px] font-mono font-black text-blue-700">{student.nisn}</p>
                            </div>
                            <div className="flex-1 bg-purple-50 p-1.5 rounded border border-purple-100">
                                <p className="text-[6px] text-purple-400 font-bold uppercase tracking-wider mb-0.5">Password</p>
                                <p className="text-[10px] font-mono font-black text-purple-700">{student.nis}</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* QR Code Area */}
                    <div className="flex flex-col items-center justify-center bg-white p-1 rounded border border-gray-200 w-[45px] flex-shrink-0">
                        {qrSrc ? (
                            <img src={qrSrc} alt="QR" className="w-full h-auto" />
                        ) : (
                            <div className="w-8 h-8 bg-gray-200 animate-pulse rounded"></div>
                        )}
                        <p className="text-[5px] text-center text-gray-500 font-bold mt-0.5 leading-none">SCAN ME</p>
                    </div>
                </div>
                
                {/* Footer Decor */}
                <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full mt-1 opacity-80"></div>
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

  // EXPORT PDF LIST (F4)
  const handleDownloadPDFList = () => {
      setIsGenerating(true);
      setTimeout(() => {
          const element = document.getElementById('access-list-print');
          const filename = `Data_Akses_Siswa_${selectedClass}.pdf`;
          
          const opt = {
              margin: [10, 10, 10, 10],
              filename: filename,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2 },
              jsPDF: { unit: 'mm', format: [215, 330], orientation: 'portrait' } // F4 Size
          };

          // @ts-ignore
          if (window.html2pdf) {
              // @ts-ignore
              window.html2pdf().set(opt).from(element).save().then(() => setIsGenerating(false));
          } else {
              setIsGenerating(false);
              alert("Library PDF error.");
          }
      }, 500);
  };

  // OPEN PREVIEW
  const handlePreviewCards = () => {
      if (filteredStudents.length === 0) {
          alert("Tidak ada data siswa untuk ditampilkan.");
          return;
      }
      if (filteredStudents.length > 60 && !window.confirm(`Anda akan memproses ${filteredStudents.length} kartu. Ini mungkin agak lambat. Lanjutkan?`)) {
          return;
      }
      setShowPreview(true);
  };

  // EXPORT PDF CARDS (F4)
  const handleDownloadCards = () => {
      setIsGenerating(true);
      
      setTimeout(() => {
          const element = document.getElementById('access-cards-print');
          const filename = `Kartu_Login_Siswa_${selectedClass}.pdf`;
          
          const opt = {
              margin: [10, 10, 10, 10], // Margin aman 1cm
              filename: filename,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true },
              // UKURAN F4 (215mm x 330mm)
              jsPDF: { unit: 'mm', format: [215, 330], orientation: 'portrait' },
              pagebreak: { mode: ['css', 'avoid-all'] } 
          };

          // @ts-ignore
          if (window.html2pdf) {
              // @ts-ignore
              window.html2pdf().set(opt).from(element).save().then(() => {
                  setIsGenerating(false);
                  // Optional: Close preview after download starts
                  // setShowPreview(false); 
              });
          } else {
              setIsGenerating(false);
              alert("Library PDF error.");
          }
      }, 1000); 
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
                        <p className="text-xs text-gray-400">Total {filteredStudents.length} Kartu siap cetak (Ukuran F4)</p>
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
                    {/* Visual Preview Container (Not for print, just for display) */}
                    <div className="bg-white p-8 shadow-2xl min-h-[1000px] w-[215mm] flex flex-col gap-6">
                        <div className="text-center border-b pb-4 mb-4">
                            <h3 className="font-bold text-xl text-gray-800">PREVIEW HALAMAN 1</h3>
                            <p className="text-sm text-gray-500">Tampilan ini mensimulasikan kertas F4 (215mm x 330mm)</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {filteredStudents.slice(0, 10).map((s, idx) => ( // Show first 10 only for performance in preview
                                <div key={s.id} className="flex justify-center items-center p-2 border border-dashed border-gray-200 rounded">
                                    <LoginCard student={s} index={idx} />
                                </div>
                            ))}
                        </div>
                        {filteredStudents.length > 10 && (
                            <div className="text-center p-4 bg-gray-100 rounded text-gray-500 mt-4">
                                ... dan {filteredStudents.length - 10} kartu lainnya akan tercetak di halaman berikutnya.
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
                <button onClick={handleDownloadPDFList} disabled={isGenerating} className="px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-xs font-bold flex items-center gap-1 shadow-sm disabled:opacity-50">
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4" />} List PDF
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

        {/* HIDDEN PRINT AREAS */}
        <div className="hidden">
            {/* 1. PDF LIST F4 Layout */}
            <div id="access-list-print" className="bg-white p-8 w-[215mm] text-black">
                <div className="text-center mb-6 border-b-2 border-black pb-4">
                    <h1 className="text-xl font-black uppercase">DAFTAR AKUN LOGIN SISWA</h1>
                    <h2 className="text-lg font-bold">SMPN 3 PACET</h2>
                    <p className="text-sm">Kelas: {selectedClass === 'ALL' ? 'SEMUA KELAS' : selectedClass}</p>
                </div>
                <table className="w-full border-collapse border border-black text-sm">
                    <thead>
                        <tr className="bg-gray-200 text-black">
                            <th className="border border-black p-2 text-center w-10">NO</th>
                            <th className="border border-black p-2 text-left">NAMA SISWA</th>
                            <th className="border border-black p-2 text-center w-20">KELAS</th>
                            <th className="border border-black p-2 text-center">USERNAME (NISN)</th>
                            <th className="border border-black p-2 text-center">PASSWORD (NIS)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map((s, idx) => (
                            <tr key={s.id} className={idx % 2 !== 0 ? 'bg-gray-50' : ''}>
                                <td className="border border-black p-2 text-center">{idx + 1}</td>
                                <td className="border border-black p-2 font-bold">{s.fullName}</td>
                                <td className="border border-black p-2 text-center">{s.className}</td>
                                <td className="border border-black p-2 text-center font-mono">{s.nisn}</td>
                                <td className="border border-black p-2 text-center font-mono font-bold">{s.nis}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 2. PDF CARDS Layout - F4 Size Fixed */}
            {/* Width 215mm (F4) - Padding 10mm = 195mm Content Area */}
            {/* Two cards of 85.6mm = 171.2mm. Spacing is comfortable. */}
            <div id="access-cards-print" className="bg-white w-[215mm] min-h-[330mm] p-[10mm]">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    {filteredStudents.map((s, idx) => (
                        <div key={s.id} className="flex justify-center items-center">
                            <LoginCard student={s} index={idx} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};

export default AccessDataView;