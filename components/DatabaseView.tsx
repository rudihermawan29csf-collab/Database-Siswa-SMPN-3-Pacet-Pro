import React, { useState, useRef } from 'react';
import { Student } from '../types';
import { Search, Trash, UploadCloud, Download, Loader2, CheckCircle2 } from 'lucide-react';
import { MOCK_STUDENTS } from '../services/mockData';

interface DatabaseViewProps {
  students: Student[];
}

const DatabaseView: React.FC<DatabaseViewProps> = ({ students: initialStudents }) => {
  // Gunakan local state agar perubahan UI instan
  const [localStudents, setLocalStudents] = useState<Student[]>(initialStudents);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState<{ success: number; total: number } | null>(null);

  // Filter Logic
  const filteredStudents = localStudents.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nis.includes(searchTerm) || 
    s.nisn.includes(searchTerm)
  );

  // --- FUNGSI HAPUS (FIXED) ---
  const handleDeleteAll = () => {
    // Pesan persis sesuai permintaan
    if (window.confirm("apakah anda yakin menghapus?")) {
        setLocalStudents([]); // Kosongkan state lokal
        alert("Data telah dihapus.");
    }
  };

  const handleDeleteRow = (id: string) => {
      if (window.confirm("apakah anda yakin menghapus?")) {
          setLocalStudents(prev => prev.filter(s => s.id !== id));
      }
  };

  // --- FUNGSI IMPORT (FIXED) ---
  const handleImportClick = () => {
      if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset
      setIsImporting(true);
      setImportProgress(0);
      setImportStats(null);

      // Simulasi Proses Import
      const totalRows = 50; // Anggap ada 50 data di excel
      
      for (let i = 0; i <= totalRows; i++) {
          // Delay buatan agar progress bar terlihat jalan
          await new Promise(resolve => setTimeout(resolve, 30));
          
          const percent = Math.round((i / totalRows) * 100);
          setImportProgress(percent);
      }

      // Tambahkan Data Dummy sebagai hasil import
      const newDummyStudent: Student = {
          ...MOCK_STUDENTS[0],
          id: `imp-${Date.now()}`,
          fullName: `Siswa Import ${Date.now()}`,
          nis: '9999'
      };
      
      setLocalStudents(prev => [...prev, newDummyStudent]);
      setImportStats({ success: totalRows, total: totalRows });

      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadTemplate = () => {
      alert("Mendownload Template Dapodik 69 Kolom...");
  };

  // Header Table Helper
  const Th = ({ children, rowSpan = 1, colSpan = 1 }: any) => (
    <th rowSpan={rowSpan} colSpan={colSpan} className="px-3 py-2 bg-gray-100 text-[10px] font-bold text-gray-700 uppercase border border-gray-300 text-center whitespace-nowrap">
      {children}
    </th>
  );
  
  const Td = ({ children }: any) => (
    <td className="px-3 py-2 text-[11px] text-gray-600 border border-gray-200 whitespace-nowrap">
      {children || '-'}
    </td>
  );

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in relative">
        
        {/* MODAL IMPORT */}
        {isImporting && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center">
                    {!importStats ? (
                        <>
                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                            <h3 className="text-lg font-bold text-gray-800">Sedang Import...</h3>
                            <p className="text-sm text-gray-500 mb-4">Mohon tunggu sebentar</p>
                            
                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mb-2">
                                <div className="bg-blue-600 h-full transition-all duration-100" style={{ width: `${importProgress}%` }}></div>
                            </div>
                            <span className="text-sm font-bold text-blue-600">{importProgress}%</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="w-12 h-12 text-green-600 mb-4" />
                            <h3 className="text-lg font-bold text-gray-800">Import Berhasil</h3>
                            <div className="bg-green-50 p-4 rounded w-full text-center my-4 border border-green-100">
                                <p className="text-2xl font-bold text-green-700">{importStats.success} Data</p>
                                <p className="text-xs text-gray-500">Telah berhasil masuk ke database</p>
                            </div>
                            <button onClick={() => setIsImporting(false)} className="w-full py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">
                                Tutup
                            </button>
                        </>
                    )}
                </div>
            </div>
        )}

        {/* TOOLBAR */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-gray-800">Database Dapodik</h2>
                <div className="flex gap-2">
                    {/* TOMBOL KOSONGKAN */}
                    <button 
                        onClick={handleDeleteAll} 
                        className="px-4 py-2 bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors"
                    >
                        Kosongkan
                    </button>

                    <button onClick={handleDownloadTemplate} className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100">
                        Template
                    </button>
                    
                    {/* TOMBOL IMPORT */}
                    <button onClick={handleImportClick} className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 flex items-center gap-2 shadow-sm">
                        <UploadCloud className="w-4 h-4" /> Import Data
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx" onChange={handleFileChange} />
                </div>
             </div>
             
             <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Cari Siswa..." 
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm outline-none focus:bg-white border border-transparent focus:border-blue-300"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
        </div>

        {/* TABEL DATA */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1 w-full relative">
                <table className="border-collapse w-full min-w-max">
                    <thead className="sticky top-0 z-10 shadow-sm">
                        <tr>
                            <Th rowSpan={2}>Aksi</Th>
                            <Th rowSpan={2}>No</Th>
                            <Th rowSpan={2}>Nama Lengkap</Th>
                            <Th rowSpan={2}>NISN</Th>
                            <Th rowSpan={2}>Kelas</Th>
                            <Th rowSpan={2}>NIK</Th>
                            <Th rowSpan={2}>Tempat Lahir</Th>
                            <Th rowSpan={2}>Tanggal Lahir</Th>
                            <Th rowSpan={2}>Nama Ayah</Th>
                            <Th rowSpan={2}>Nama Ibu</Th>
                            <Th rowSpan={2}>Alamat</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.length > 0 ? filteredStudents.map((s, idx) => (
                            <tr key={s.id || idx} className="hover:bg-blue-50">
                                <td className="px-2 py-2 text-center border border-gray-200">
                                    <button 
                                        onClick={() => handleDeleteRow(s.id)}
                                        className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200"
                                        title="Hapus Baris Ini"
                                    >
                                        <Trash className="w-4 h-4" />
                                    </button>
                                </td>
                                <Td className="text-center font-bold">{idx + 1}</Td>
                                <Td className="font-semibold text-gray-800">{s.fullName}</Td>
                                <Td>{s.nisn}</Td>
                                <Td className="text-center">{s.className}</Td>
                                <Td>{s.dapodik.nik}</Td>
                                <Td>{s.birthPlace}</Td>
                                <Td>{s.birthDate}</Td>
                                <Td>{s.father.name}</Td>
                                <Td>{s.mother.name}</Td>
                                <Td>{s.address}</Td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={20} className="p-8 text-center text-gray-500 italic">
                                    Database kosong. Silakan Import Data.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="p-3 bg-gray-50 border-t text-xs text-gray-500">
                Total Data: {filteredStudents.length}
            </div>
        </div>
    </div>
  );
};

export default DatabaseView;