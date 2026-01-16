import React, { useState, useRef, useEffect } from 'react';
import { Student } from '../types';
import { Search, Trash, UploadCloud, Download, Loader2, CheckCircle2, Plus, X, FileMinus, Pencil, Save } from 'lucide-react';
import { api } from '../services/api';

interface DatabaseViewProps {
  students: Student[];
  onUpdateStudents: (students: Student[]) => void;
}

const DatabaseView: React.FC<DatabaseViewProps> = ({ students: initialStudents, onUpdateStudents }) => {
  const [localStudents, setLocalStudents] = useState<Student[]>(initialStudents);
  const [searchTerm, setSearchTerm] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState<{ success: number; total: number; skipped: number } | null>(null);

  // Sync with parent state when it changes
  useEffect(() => {
      setLocalStudents(initialStudents);
  }, [initialStudents]);

  // Add/Edit Manual Student State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Initialize with a complete default structure to avoid undefined errors
  const defaultStudentState: Student = {
      id: '',
      fullName: '', nisn: '', nis: '', className: 'VII A', gender: 'L',
      birthPlace: '', birthDate: '', religion: 'Islam', nationality: 'WNI',
      address: '', subDistrict: '', district: 'Mojokerto', postalCode: '',
      father: { name: '', nik: '', birthPlaceDate: '', education: '', job: '', income: '', phone: '' },
      mother: { name: '', nik: '', birthPlaceDate: '', education: '', job: '', income: '', phone: '' },
      guardian: { name: '', nik: '', birthPlaceDate: '', education: '', job: '', income: '', phone: '' },
      dapodik: {
          nik: '', noKK: '', rt: '', rw: '', dusun: '', kelurahan: '', kecamatan: '', kodePos: '',
          livingStatus: '', transportation: '', email: '', skhun: '', kpsReceiver: 'Tidak', kpsNumber: '',
          kipReceiver: 'Tidak', kipNumber: '', kipName: '', kksNumber: '', birthRegNumber: '', bank: '',
          bankAccount: '', bankAccountName: '', pipEligible: 'Tidak', pipReason: '', specialNeeds: 'Tidak',
          latitude: '', longitude: '', headCircumference: 0, distanceToSchool: '', unExamNumber: '', travelTimeMinutes: 0
      },
      documents: [], correctionRequests: [],
      childOrder: 1, siblingCount: 0, height: 0, weight: 0, bloodType: '-', entryYear: new Date().getFullYear(),
      status: 'AKTIF', previousSchool: '', graduationYear: 0, diplomaNumber: '', averageScore: 0, achievements: []
  };

  const [formData, setFormData] = useState<Student>(defaultStudentState);

  const filteredStudents = localStudents.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nis.includes(searchTerm) || 
    s.nisn.includes(searchTerm)
  );

  const handleDeleteAll = () => {
    if (window.confirm("apakah anda yakin menghapus SEMUA data di tampilan ini?")) {
        const emptyList: Student[] = [];
        setLocalStudents(emptyList);
        onUpdateStudents(emptyList);
        alert("Data tampilan telah dikosongkan.");
    }
  };

  const handleRemoveDuplicates = () => {
      if (!window.confirm("Hapus data ganda berdasarkan NISN? Sistem akan menyimpan data pertama yang ditemukan dan menghapus duplikatnya.")) return;

      const seenNISN = new Set<string>();
      const uniqueStudents: Student[] = [];
      let duplicateCount = 0;

      localStudents.forEach(student => {
          // Normalize NISN: string and trimmed
          const nisn = student.nisn ? String(student.nisn).trim() : '';
          
          if (nisn && seenNISN.has(nisn)) {
              duplicateCount++;
          } else {
              if (nisn) seenNISN.add(nisn);
              uniqueStudents.push(student);
          }
      });

      if (duplicateCount > 0) {
          setLocalStudents(uniqueStudents);
          onUpdateStudents(uniqueStudents);
          api.updateStudentsBulk(uniqueStudents).catch(console.error);
          alert(`✅ Berhasil menghapus ${duplicateCount} data duplikat.`);
      } else {
          alert("Tidak ditemukan data duplikat (NISN ganda).");
      }
  };

  const handleDeleteRow = (id: string) => {
      if (window.confirm("apakah anda yakin menghapus?")) {
          const updatedList = localStudents.filter(s => s.id !== id);
          setLocalStudents(updatedList);
          onUpdateStudents(updatedList);
      }
  };

  // --- EDIT HANDLER ---
  const handleEditRow = (student: Student) => {
      setFormData(JSON.parse(JSON.stringify(student))); // Deep copy to avoid reference issues
      setIsEditMode(true);
      setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
      setFormData({ ...defaultStudentState, id: Math.random().toString(36).substr(2, 9) });
      setIsEditMode(false);
      setIsModalOpen(true);
  };

  const handleSaveStudent = () => {
      if (!formData.fullName || !formData.nisn) {
          alert("Nama dan NISN wajib diisi!");
          return;
      }

      let updatedList: Student[];

      if (isEditMode) {
          // Update Existing
          updatedList = localStudents.map(s => s.id === formData.id ? formData : s);
          api.updateStudent(formData).catch(err => console.error("Cloud update failed", err));
          alert("Data siswa berhasil diperbarui.");
      } else {
          // Check Duplicate NISN for new entries
          if (localStudents.some(s => s.nisn === formData.nisn)) {
              alert("Gagal: NISN ini sudah terdaftar di database.");
              return;
          }
          // Create New
          updatedList = [formData, ...localStudents];
          api.updateStudent(formData).catch(err => console.error("Cloud save failed", err));
          alert("Siswa berhasil ditambahkan.");
      }

      setLocalStudents(updatedList);
      onUpdateStudents(updatedList); 
      setIsModalOpen(false);
  };

  const handleImportClick = () => {
      if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      // ... (Existing Import Logic remains unchanged) ...
      const file = e.target.files?.[0];
      if (!file) return;

      setIsImporting(true);
      setImportProgress(10);
      setImportStats(null);

      const reader = new FileReader();
      
      reader.onload = (evt) => {
          try {
              const buffer = evt.target?.result;
              // @ts-ignore
              const wb = window.XLSX.read(buffer, { type: 'array' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              // @ts-ignore
              const data = window.XLSX.utils.sheet_to_json(ws);
              
              setImportProgress(50);
              const existingNisns = new Set(localStudents.map(s => String(s.nisn).trim()));

              const processedStudents: Student[] = data.map((rawRow: any) => {
                  const row: any = {};
                  Object.keys(rawRow).forEach(k => row[k.trim()] = rawRow[k]);

                  const getVal = (keys: string[], def: any = '') => {
                      for (const k of keys) {
                          if (row[k] !== undefined) return row[k];
                          const looseKey = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
                          if (looseKey && row[looseKey] !== undefined) return row[looseKey];
                      }
                      return def;
                  };

                  const genderRaw = getVal(['L/P', 'Jenis Kelamin', 'JK'], 'L');
                  const gender = (genderRaw === 'L' || genderRaw === 'Laki-laki') ? 'L' : 'P';

                  return {
                      id: Math.random().toString(36).substr(2, 9),
                      fullName: getVal(['Nama Peserta Didik', 'Nama Lengkap', 'Nama'], ''),
                      nis: String(getVal(['NIS', 'NIPD'], '')),
                      nisn: String(getVal(['NISN'], '')),
                      className: getVal(['Kelas', 'Rombel', 'Tingkat Pendidikan', 'Rombel Saat Ini'], 'VII A'),
                      gender: gender,
                      birthPlace: getVal(['Tempat Lahir'], ''),
                      birthDate: getVal(['Tanggal Lahir'], ''),
                      religion: getVal(['Agama'], 'Islam'),
                      nationality: 'WNI',
                      address: getVal(['Alamat Jalan', 'Alamat'], ''),
                      postalCode: String(getVal(['Kode Pos'], '')),
                      subDistrict: getVal(['Kecamatan'], ''),
                      district: getVal(['Kabupaten', 'Kabupaten/Kota'], 'Mojokerto'),
                      childOrder: Number(getVal(['Anak Ke', 'Anak ke-berapa'], 1)),
                      siblingCount: Number(getVal(['Jml Saudara', 'Jumlah Saudara Kandung', 'Jml. Saudara Kandung'], 0)),
                      height: Number(getVal(['Tinggi Badan'], 0)),
                      weight: Number(getVal(['Berat Badan'], 0)),
                      bloodType: getVal(['Golongan Darah'], '-'),
                      entryYear: new Date().getFullYear(),
                      status: 'AKTIF',
                      previousSchool: getVal(['Sekolah Asal'], ''),
                      graduationYear: 0,
                      diplomaNumber: getVal(['No Seri Ijazah'], ''),
                      averageScore: 0,
                      achievements: [],
                      father: { 
                          name: getVal(['Nama Ayah', 'Data Ayah', 'Nama Ayah Kandung'], ''), 
                          nik: String(getVal(['NIK Ayah'], '')), 
                          birthPlaceDate: String(getVal(['Tahun Lahir Ayah'], '')), 
                          education: getVal(['Pendidikan Ayah'], ''), 
                          job: getVal(['Pekerjaan Ayah'], ''), 
                          income: getVal(['Penghasilan Ayah'], ''), 
                          phone: String(getVal(['No HP', 'Nomor Telepon', 'No Handphone', 'HP'], '')) 
                      },
                      mother: { 
                          name: getVal(['Nama Ibu', 'Nama Ibu Kandung', 'Data Ibu'], ''), 
                          nik: String(getVal(['NIK Ibu'], '')), 
                          birthPlaceDate: String(getVal(['Tahun Lahir Ibu'], '')), 
                          education: getVal(['Pendidikan Ibu'], ''), 
                          job: getVal(['Pekerjaan Ibu'], ''), 
                          income: getVal(['Penghasilan Ibu'], ''), 
                          phone: '' 
                      },
                      guardian: {
                          name: getVal(['Nama Wali', 'Data Wali'], ''),
                          nik: '',
                          birthPlaceDate: String(getVal(['Tahun Lahir Wali'], '')),
                          education: getVal(['Pendidikan Wali'], ''),
                          job: getVal(['Pekerjaan Wali'], ''),
                          income: getVal(['Penghasilan Wali'], ''),
                          phone: ''
                      },
                      dapodik: {
                          nik: String(getVal(['NIK', 'NIK Peserta Didik'], '')),
                          noKK: String(getVal(['No KK'], '')),
                          rt: String(getVal(['RT'], '')),
                          rw: String(getVal(['RW'], '')),
                          dusun: getVal(['Dusun'], ''),
                          kelurahan: getVal(['Kelurahan', 'Desa/Kelurahan'], ''),
                          kecamatan: getVal(['Kecamatan'], ''),
                          kodePos: String(getVal(['Kode Pos'], '')),
                          livingStatus: getVal(['Jenis Tinggal'], ''),
                          transportation: getVal(['Alat Transportasi'], ''),
                          email: getVal(['Email', 'E-Mail'], ''),
                          skhun: getVal(['No SKHUN'], ''),
                          kpsReceiver: getVal(['Penerima KPS', 'Penerima KPH'], 'Tidak'),
                          kpsNumber: String(getVal(['No KPS'], '')),
                          kipReceiver: getVal(['Penerima KIP'], 'Tidak'),
                          kipNumber: String(getVal(['No KIP', 'Nomor KIP'], '')),
                          kipName: getVal(['Nama di KIP', 'Nama KIP'], ''),
                          kksNumber: String(getVal(['No KKS', 'Nomor KKS'], '')),
                          birthRegNumber: String(getVal(['No Reg Akta', 'No Registrasi Akta Lahir'], '')),
                          bank: getVal(['Bank'], ''),
                          bankAccount: String(getVal(['No Rekening', 'Nomor Rekening Bank'], '')),
                          bankAccountName: getVal(['Atas Nama Rekening', 'Rekening Atas Nama'], ''),
                          pipEligible: getVal(['Layak PIP', 'Layak PIP (usulan dari sekolah)'], 'Tidak'),
                          pipReason: getVal(['Alasan Layak PIP'], ''),
                          specialNeeds: getVal(['Kebutuhan Khusus'], 'Tidak'),
                          latitude: String(getVal(['Lintang'], '')),
                          longitude: String(getVal(['Bujur'], '')),
                          headCircumference: Number(getVal(['Lingkar Kepala'], 0)),
                          distanceToSchool: getVal(['Jarak Rumah', 'Jarak Tempat Tinggal ke Sekolah', 'Jarak Rumah ke Sekolah (KM)'], ''),
                          unExamNumber: getVal(['No Peserta UN', 'No Peserta Ujian Nasional'], ''),
                          travelTimeHours: 0,
                          travelTimeMinutes: Number(getVal(['Waktu Tempuh (Menit)', 'Waktu Tempuh'], 0)),
                      },
                      documents: [],
                      correctionRequests: [],
                  };
              });

              const newUniqueStudents = processedStudents.filter(s => {
                  const nisn = String(s.nisn).trim();
                  return nisn && !existingNisns.has(nisn);
              });

              const skippedCount = processedStudents.length - newUniqueStudents.length;

              setTimeout(() => {
                  const updatedList = [...localStudents, ...newUniqueStudents];
                  setLocalStudents(updatedList);
                  onUpdateStudents(updatedList); 
                  
                  if (newUniqueStudents.length > 0) {
                      api.updateStudentsBulk(newUniqueStudents).catch(err => console.error("Cloud sync failed", err));
                  }

                  setImportProgress(100);
                  setImportStats({ success: newUniqueStudents.length, total: processedStudents.length, skipped: skippedCount });
              }, 500);

          } catch (error: any) {
              console.error(error);
              setIsImporting(false);
              if (error.message?.includes("Unsupported ZIP encryption")) {
                  alert("Gagal: File Excel dilindungi password.");
              } else {
                  alert("Gagal memproses file Excel.");
              }
          }
      };

      reader.onerror = () => {
          alert("Gagal membaca file.");
          setIsImporting(false);
      };

      reader.readAsArrayBuffer(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadTemplate = () => {
      // ... (Existing download logic remains unchanged) ...
      try {
          // @ts-ignore
          const xlsx = window.XLSX;
          const headers = [[
              'Nama Peserta Didik', 'NIS', 'NISN', 'Kelas', 'L/P', 'Tempat Lahir', 'Tanggal Lahir', 'Agama',
              'NIK', 'No KK', 'Alamat Jalan', 'RT', 'RW', 'Dusun', 'Kelurahan', 'Kecamatan', 'Kabupaten', 'Kode Pos',
              'Anak Ke', 'Jml Saudara', 'Tinggi Badan', 'Berat Badan', 'Lingkar Kepala', 'Jarak Rumah', 'Waktu Tempuh (Menit)',
              'Jenis Tinggal', 'Alat Transportasi', 'Email', 'No HP',
              'Nama Ayah', 'NIK Ayah', 'Tahun Lahir Ayah', 'Pendidikan Ayah', 'Pekerjaan Ayah', 'Penghasilan Ayah',
              'Nama Ibu', 'NIK Ibu', 'Tahun Lahir Ibu', 'Pendidikan Ibu', 'Pekerjaan Ibu', 'Penghasilan Ibu',
              'Nama Wali', 'Tahun Lahir Wali', 'Pendidikan Wali', 'Pekerjaan Wali', 'Penghasilan Wali',
              'Penerima KPS', 'No KPS', 'Penerima KIP', 'No KIP', 'Nama di KIP', 'No KKS', 'Layak PIP', 'Alasan Layak PIP',
              'Bank', 'No Rekening', 'Atas Nama Rekening', 'No Reg Akta', 'Sekolah Asal', 'No Seri Ijazah', 'No SKHUN', 'No Peserta UN'
          ]];
          const wb = xlsx.utils.book_new();
          const ws = xlsx.utils.aoa_to_sheet(headers);
          
          let dataRows: any[] = [];

          if (localStudents.length > 0) {
              dataRows = localStudents.map(s => ({
                  'Nama Peserta Didik': s.fullName, 'NIS': s.nis, 'NISN': s.nisn, 'Kelas': s.className, 'L/P': s.gender,
                  'Tempat Lahir': s.birthPlace, 'Tanggal Lahir': s.birthDate, 'Agama': s.religion,
                  'NIK': s.dapodik.nik, 'No KK': s.dapodik.noKK, 'Alamat Jalan': s.address, 
                  'RT': s.dapodik.rt, 'RW': s.dapodik.rw, 'Dusun': s.dapodik.dusun, 
                  'Kelurahan': s.dapodik.kelurahan, 'Kecamatan': s.subDistrict, 'Kabupaten': s.district, 'Kode Pos': s.postalCode,
                  'Anak Ke': s.childOrder, 'Jml Saudara': s.siblingCount, 'Tinggi Badan': s.height, 'Berat Badan': s.weight, 
                  'Lingkar Kepala': s.dapodik.headCircumference, 'Jarak Rumah': s.dapodik.distanceToSchool, 'Waktu Tempuh (Menit)': s.dapodik.travelTimeMinutes,
                  'Jenis Tinggal': s.dapodik.livingStatus, 'Alat Transportasi': s.dapodik.transportation, 'Email': s.dapodik.email, 'No HP': s.father.phone,
                  'Nama Ayah': s.father.name, 'NIK Ayah': s.father.nik, 'Tahun Lahir Ayah': s.father.birthPlaceDate, 
                  'Pendidikan Ayah': s.father.education, 'Pekerjaan Ayah': s.father.job, 'Penghasilan Ayah': s.father.income,
                  'Nama Ibu': s.mother.name, 'NIK Ibu': s.mother.nik, 'Tahun Lahir Ibu': s.mother.birthPlaceDate, 
                  'Pendidikan Ibu': s.mother.education, 'Pekerjaan Ibu': s.mother.job, 'Penghasilan Ibu': s.mother.income,
                  'Nama Wali': s.guardian?.name, 'Tahun Lahir Wali': s.guardian?.birthPlaceDate, 
                  'Pendidikan Wali': s.guardian?.education, 'Pekerjaan Wali': s.guardian?.job, 'Penghasilan Wali': s.guardian?.income,
                  'Penerima KPS': s.dapodik.kpsReceiver, 'No KPS': s.dapodik.kpsNumber,
                  'Penerima KIP': s.dapodik.kipReceiver, 'No KIP': s.dapodik.kipNumber, 'Nama di KIP': s.dapodik.kipName,
                  'No KKS': s.dapodik.kksNumber, 'Layak PIP': s.dapodik.pipEligible, 'Alasan Layak PIP': s.dapodik.pipReason,
                  'Bank': s.dapodik.bank, 'No Rekening': s.dapodik.bankAccount, 'Atas Nama Rekening': s.dapodik.bankAccountName,
                  'No Reg Akta': s.dapodik.birthRegNumber, 'Sekolah Asal': s.previousSchool, 'No Seri Ijazah': s.diplomaNumber,
                  'No SKHUN': s.dapodik.skhun, 'No Peserta UN': s.dapodik.unExamNumber
              }));
          } else {
              dataRows = [{
                  'Nama Peserta Didik': 'Siswa Contoh', 'NIS': '1234', 'NISN': '0012345678', 'Kelas': 'VII A', 'L/P': 'L', 
                  'Tempat Lahir': 'Mojokerto', 'Tanggal Lahir': '2010-01-01', 'Agama': 'Islam', 'NIK': '3516000000000001',
                  'Alamat Jalan': 'Jl. Raya Pacet', 'RT': '01', 'RW': '02', 'Kecamatan': 'Pacet'
              }];
          }

          xlsx.utils.sheet_add_json(ws, dataRows, {skipHeader: true, origin: -1});
          xlsx.utils.book_append_sheet(wb, ws, "Database Siswa");
          xlsx.writeFile(wb, localStudents.length > 0 ? "Database_Siswa_SMPN3Pacet.xlsx" : "Template_Dapodik_Kosong.xlsx");
      } catch (e) {
          alert("Gagal download template.");
      }
  };

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
                            <h3 className="text-lg font-bold text-gray-800">Memproses Data...</h3>
                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mb-2 mt-4">
                                <div className="bg-blue-600 h-full transition-all duration-100" style={{ width: `${importProgress}%` }}></div>
                            </div>
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="w-12 h-12 text-green-600 mb-4" />
                            <h3 className="text-lg font-bold text-gray-800">Import Berhasil</h3>
                            <div className="bg-green-50 p-4 rounded w-full text-center my-4 border border-green-100">
                                <p className="text-2xl font-bold text-green-700">{importStats.success} Data</p>
                                <p className="text-xs text-gray-500">Telah ditambahkan.</p>
                                {importStats.skipped > 0 && <p className="text-xs text-red-500 mt-1">({importStats.skipped} Data Duplikat Dilewati)</p>}
                            </div>
                            <button onClick={() => setIsImporting(false)} className="w-full py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">
                                Tutup
                            </button>
                        </>
                    )}
                </div>
            </div>
        )}

        {/* MODAL ADD/EDIT STUDENT - EXPANDED */}
        {isModalOpen && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 flex flex-col max-h-[90vh]">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="font-bold text-gray-800 text-lg">{isEditMode ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</h3>
                        <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>
                    
                    <div className="overflow-y-auto pr-2 space-y-4">
                        {/* IDENTITAS UTAMA */}
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <h4 className="text-xs font-bold text-blue-700 uppercase mb-2">Identitas Utama</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nama Lengkap</label>
                                    <input type="text" className="w-full p-2 border rounded text-sm font-bold" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} placeholder="Nama Siswa" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">NISN</label>
                                    <input type="text" className="w-full p-2 border rounded text-sm" value={formData.nisn} onChange={(e) => setFormData({...formData, nisn: e.target.value})} placeholder="NISN" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">NIS Lokal</label>
                                    <input type="text" className="w-full p-2 border rounded text-sm" value={formData.nis} onChange={(e) => setFormData({...formData, nis: e.target.value})} placeholder="NIS Lokal" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Kelas</label>
                                    <select className="w-full p-2 border rounded text-sm" value={formData.className} onChange={(e) => setFormData({...formData, className: e.target.value})}>
                                        {['VII A', 'VII B', 'VII C', 'VIII A', 'VIII B', 'VIII C', 'IX A', 'IX B', 'IX C'].map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Gender</label>
                                    <select className="w-full p-2 border rounded text-sm" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value as 'L'|'P'})}>
                                        <option value="L">Laki-Laki</option>
                                        <option value="P">Perempuan</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* BIODATA TAMBAHAN */}
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <h4 className="text-xs font-bold text-gray-600 uppercase mb-2">Biodata & Alamat</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">NIK</label>
                                    <input type="text" className="w-full p-2 border rounded text-sm" value={formData.dapodik.nik} onChange={(e) => setFormData({...formData, dapodik: {...formData.dapodik, nik: e.target.value}})} placeholder="Nomor Induk Kependudukan" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tempat Lahir</label>
                                    <input type="text" className="w-full p-2 border rounded text-sm" value={formData.birthPlace} onChange={(e) => setFormData({...formData, birthPlace: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tanggal Lahir</label>
                                    <input type="date" className="w-full p-2 border rounded text-sm" value={formData.birthDate} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Agama</label>
                                    <select className="w-full p-2 border rounded text-sm" value={formData.religion} onChange={(e) => setFormData({...formData, religion: e.target.value})}>
                                        <option value="Islam">Islam</option>
                                        <option value="Kristen">Kristen</option>
                                        <option value="Katolik">Katolik</option>
                                        <option value="Hindu">Hindu</option>
                                        <option value="Budha">Budha</option>
                                        <option value="Konghucu">Konghucu</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Alamat Jalan</label>
                                    <input type="text" className="w-full p-2 border rounded text-sm" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        {/* DATA ORANG TUA */}
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <h4 className="text-xs font-bold text-gray-600 uppercase mb-2">Data Orang Tua</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nama Ayah</label>
                                    <input type="text" className="w-full p-2 border rounded text-sm" value={formData.father.name} onChange={(e) => setFormData({...formData, father: {...formData.father, name: e.target.value}})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nama Ibu</label>
                                    <input type="text" className="w-full p-2 border rounded text-sm" value={formData.mother.name} onChange={(e) => setFormData({...formData, mother: {...formData.mother, name: e.target.value}})} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t flex justify-end gap-2">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded hover:bg-gray-200 text-sm">Batal</button>
                        <button onClick={handleSaveStudent} className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 text-sm flex items-center gap-2">
                            <Save className="w-4 h-4" /> Simpan Data
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-gray-800">Database Dapodik</h2>
                <div className="flex gap-2">
                    <button onClick={handleOpenAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm">
                        <Plus className="w-4 h-4" /> Tambah Siswa
                    </button>
                    <button onClick={handleRemoveDuplicates} className="px-4 py-2 bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-xs font-bold hover:bg-orange-200 transition-colors flex items-center gap-2">
                        <FileMinus className="w-4 h-4" /> Hapus Duplikat (NISN)
                    </button>
                    <button onClick={handleDeleteAll} className="px-4 py-2 bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors">Kosongkan</button>
                    <button onClick={handleDownloadTemplate} className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 flex items-center gap-2"><Download className="w-4 h-4"/> Download Data/Template</button>
                    <button onClick={handleImportClick} className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 flex items-center gap-2 shadow-sm"><UploadCloud className="w-4 h-4" /> Import Excel</button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx" onChange={handleFileChange} />
                </div>
             </div>
             
             <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input type="text" placeholder="Cari Siswa..." className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm outline-none focus:bg-white border border-transparent focus:border-blue-300" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
             </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1 w-full relative pb-32">
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
                                <td className="px-2 py-2 text-center border border-gray-200 flex items-center justify-center gap-1">
                                    <button onClick={() => handleEditRow(s)} className="p-1.5 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200" title="Edit"><Pencil className="w-3 h-3" /></button>
                                    <button onClick={() => handleDeleteRow(s.id)} className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200" title="Hapus"><Trash className="w-3 h-3" /></button>
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
                            <tr><td colSpan={20} className="p-8 text-center text-gray-500 italic">Database kosong. Silakan Import Data atau Tambah Manual.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="p-3 bg-gray-50 border-t text-xs text-gray-500">Total Data: {filteredStudents.length}</div>
        </div>
    </div>
  );
};

export default DatabaseView;