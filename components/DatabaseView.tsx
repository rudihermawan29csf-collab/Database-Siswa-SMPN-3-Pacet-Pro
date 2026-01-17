import React, { useState, useMemo, useRef } from 'react';
import { Search, Plus, Pencil, Trash2, Save, X, Loader2, Download, UploadCloud, RotateCcw, User, Users, Wallet, Ruler, Home, DownloadCloud } from 'lucide-react';
import { Student } from '../types';
import { api } from '../services/api';

interface DatabaseViewProps {
  students: Student[];
  onUpdateStudents: (students: Student[]) => void;
}

const CLASS_OPTIONS = ['VII A', 'VII B', 'VII C', 'VIII A', 'VIII B', 'VIII C', 'IX A', 'IX B', 'IX C'];

const DatabaseView: React.FC<DatabaseViewProps> = ({ students, onUpdateStudents }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'FAMILY' | 'ADDRESS' | 'PERIODIC' | 'WELFARE'>('PROFILE');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial Empty Student for Form
  const initialFormState: Student = {
      id: '',
      fullName: '',
      nis: '',
      nisn: '',
      gender: 'L',
      birthPlace: '',
      birthDate: '',
      religion: 'Islam',
      nationality: 'WNI',
      address: '',
      subDistrict: '',
      district: '',
      postalCode: '',
      className: 'VII A',
      height: 0,
      weight: 0,
      bloodType: '-',
      siblingCount: 0,
      childOrder: 1,
      father: { name: '', nik: '', birthPlaceDate: '', education: '', job: '', income: '', phone: '' },
      mother: { name: '', nik: '', birthPlaceDate: '', education: '', job: '', income: '', phone: '' },
      guardian: { name: '', nik: '', birthPlaceDate: '', education: '', job: '', income: '', phone: '' },
      entryYear: new Date().getFullYear(),
      status: 'AKTIF',
      previousSchool: '',
      diplomaNumber: '',
      dapodik: {
          nik: '', noKK: '', rt: '', rw: '', dusun: '', kelurahan: '', kecamatan: '', kodePos: '',
          livingStatus: '', transportation: '', email: '', skhun: '', kpsReceiver: 'Tidak', kpsNumber: '',
          kipReceiver: 'Tidak', kipNumber: '', kipName: '', kksNumber: '', birthRegNumber: '', bank: '',
          bankAccount: '', bankAccountName: '', pipEligible: 'Tidak', pipReason: '', specialNeeds: 'Tidak ada',
          latitude: '', longitude: '', headCircumference: 0, distanceToSchool: '', unExamNumber: '',
          travelTimeMinutes: 0
      },
      documents: []
  };

  const [formData, setFormData] = useState<Student>(initialFormState);

  // Filter Logic
  const filteredStudents = useMemo(() => {
      return students.filter(s => 
          s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.nisn.includes(searchTerm) ||
          s.nis.includes(searchTerm)
      );
  }, [students, searchTerm]);

  const handleEdit = (student: Student) => {
      // Ensure nested objects exist to prevent crashes (Deep Copy & Defaults)
      const safeStudent = JSON.parse(JSON.stringify(student));
      if (!safeStudent.father) safeStudent.father = { ...initialFormState.father };
      if (!safeStudent.mother) safeStudent.mother = { ...initialFormState.mother };
      if (!safeStudent.guardian) safeStudent.guardian = { ...initialFormState.guardian };
      if (!safeStudent.dapodik) safeStudent.dapodik = { ...initialFormState.dapodik };

      setFormData(safeStudent); 
      setIsEditing(true);
      setActiveTab('PROFILE');
      setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
      if (window.confirm("Yakin ingin menghapus data siswa ini?")) {
          const newStudents = students.filter(s => s.id !== id);
          onUpdateStudents(newStudents);
          await api.syncInitialData(newStudents); 
      }
  };

  // --- FEATURE: PULL CLOUD (Manual Force) ---
  const handleResetCloud = async () => {
      if(!window.confirm("PERINGATAN: Ini akan mengambil data dari Google Spreadsheet dan MENIMPA data lokal saat ini. Data lokal yang belum tersimpan akan hilang. Lanjutkan?")) return;
      setIsLoading(true);
      setLoadingText('Mengunduh data...');
      try {
          const onlineStudents = await api.getStudents();
          const sanitizedOnline = onlineStudents.map(s => ({
              ...s,
              className: s.className ? s.className.replace(/kelas/gi, '').trim() : '-'
          }));
          
          onUpdateStudents(sanitizedOnline);
          localStorage.setItem('sidata_students_cache_v3', JSON.stringify(sanitizedOnline));
          alert(`Berhasil sinkronisasi. Total: ${sanitizedOnline.length} Siswa dari Cloud.`);
      } catch (e) {
          console.error(e);
          alert("Gagal mengambil data dari cloud. Periksa koneksi internet.");
      } finally {
          setIsLoading(false);
          setLoadingText('');
      }
  };

  // --- FEATURE: PUSH CLOUD (BATCH UPLOAD) ---
  const handlePushCloud = async () => {
      if (students.length === 0) {
          alert("Tidak ada data untuk diupload.");
          return;
      }
      
      const confirmMsg = `Anda akan mengirim ${students.length} data siswa dari Aplikasi ke Cloud.\n\nSistem akan menggunakan metode BATCH UPLOAD (bertahap) untuk mencegah kegagalan koneksi pada data besar.\n\nLanjutkan?`;
      
      if (!window.confirm(confirmMsg)) return;

      setIsLoading(true);
      
      try {
          // BATCH STRATEGY: Split into chunks of 50
          const BATCH_SIZE = 50;
          const chunks = [];
          for (let i = 0; i < students.length; i += BATCH_SIZE) {
              chunks.push(students.slice(i, i + BATCH_SIZE));
          }

          let successCount = 0;

          for (let i = 0; i < chunks.length; i++) {
              setLoadingText(`Mengupload Batch ${i + 1}/${chunks.length}...`);
              // Use updateStudentsBulk for chunks
              const success = await api.updateStudentsBulk(chunks[i]);
              if (success) {
                  successCount++;
              } else {
                  console.error(`Gagal upload batch ke-${i+1}`);
              }
          }

          if (successCount === chunks.length) {
              alert(`✅ Sukses! ${students.length} data berhasil diupload ke Cloud.`);
          } else {
              alert(`⚠️ Upload Selesai Sebagian. Berhasil: ${successCount} batch dari ${chunks.length}. Silakan coba lagi.`);
          }

      } catch (e) {
          console.error(e);
          alert("❌ Gagal upload ke cloud. Terjadi kesalahan koneksi atau server sibuk.");
      } finally {
          setIsLoading(false);
          setLoadingText('');
      }
  };

  // --- FEATURE: DOWNLOAD EXCEL TEMPLATE / DATA (ALL FIELDS) ---
  const handleDownloadData = () => {
      try {
          // @ts-ignore
          const xlsx = window.XLSX;
          if (!xlsx || !xlsx.utils) { alert("Library Excel belum siap. Silakan refresh."); return; }

          // Flatten Data for Excel - COMPLETE DAPODIK FIELDS
          const dataToExport = students.map((s, idx) => ({
              'No': idx + 1,
              'Nama Lengkap': s.fullName,
              'NIS': s.nis,
              'NISN': s.nisn,
              'Kelas': s.className,
              'L/P': s.gender,
              'Tempat Lahir': s.birthPlace,
              'Tanggal Lahir': s.birthDate,
              'Agama': s.religion,
              'Kewarganegaraan': s.nationality,
              'Status Siswa': s.status,
              
              // Alamat
              'Alamat Jalan': s.address,
              'RT': s.dapodik.rt, 'RW': s.dapodik.rw,
              'Dusun': s.dapodik.dusun, 'Kelurahan': s.dapodik.kelurahan,
              'Kecamatan': s.subDistrict, 'Kabupaten': s.district,
              'Kode Pos': s.postalCode,
              'Lintang': s.dapodik.latitude, 'Bujur': s.dapodik.longitude,
              'Jenis Tinggal': s.dapodik.livingStatus,
              'Transportasi': s.dapodik.transportation,
              'Jarak Sekolah (km)': s.dapodik.distanceToSchool,
              'Waktu Tempuh (menit)': s.dapodik.travelTimeMinutes,

              // Data Pribadi Lain
              'NIK': s.dapodik.nik, 'No KK': s.dapodik.noKK,
              'No Reg Akta Lahir': s.dapodik.birthRegNumber,
              'Berkebutuhan Khusus': s.dapodik.specialNeeds,
              'Email': s.dapodik.email,
              'Sekolah Asal': s.previousSchool,
              'Tahun Masuk': s.entryYear,

              // Periodik
              'Anak Ke': s.childOrder, 'Jml Saudara': s.siblingCount,
              'Tinggi Badan (cm)': s.height, 'Berat Badan (kg)': s.weight, 
              'Lingkar Kepala (cm)': s.dapodik.headCircumference,
              'Golongan Darah': s.bloodType,

              // Data Ayah
              'Nama Ayah': s.father.name, 'NIK Ayah': s.father.nik, 'Tahun Lahir Ayah': s.father.birthPlaceDate,
              'Pendidikan Ayah': s.father.education, 'Pekerjaan Ayah': s.father.job, 
              'Penghasilan Ayah': s.father.income, 'No HP Ayah': s.father.phone,

              // Data Ibu
              'Nama Ibu': s.mother.name, 'NIK Ibu': s.mother.nik, 'Tahun Lahir Ibu': s.mother.birthPlaceDate,
              'Pendidikan Ibu': s.mother.education, 'Pekerjaan Ibu': s.mother.job, 
              'Penghasilan Ibu': s.mother.income, 'No HP Ibu': s.mother.phone,

              // Data Wali
              'Nama Wali': s.guardian?.name || '', 'NIK Wali': s.guardian?.nik || '', 
              'Tahun Lahir Wali': s.guardian?.birthPlaceDate || '',
              'Pendidikan Wali': s.guardian?.education || '', 'Pekerjaan Wali': s.guardian?.job || '', 
              'Penghasilan Wali': s.guardian?.income || '', 'No HP Wali': s.guardian?.phone || '',

              // Kesejahteraan & UN
              'No SKHUN': s.dapodik.skhun, 'No Ijazah (SD)': s.diplomaNumber, 'No Peserta UN': s.dapodik.unExamNumber,
              'Penerima KPS': s.dapodik.kpsReceiver, 'No KPS': s.dapodik.kpsNumber,
              'Penerima KIP': s.dapodik.kipReceiver, 'No KIP': s.dapodik.kipNumber, 'Nama di KIP': s.dapodik.kipName,
              'Layak PIP': s.dapodik.pipEligible, 'Alasan PIP': s.dapodik.pipReason,
              'No KKS': s.dapodik.kksNumber,
              
              // Bank
              'Bank': s.dapodik.bank, 'No Rekening': s.dapodik.bankAccount, 'Atas Nama Rekening': s.dapodik.bankAccountName
          }));

          // If empty, create a dummy template row
          if (dataToExport.length === 0) {
              dataToExport.push({
                  'No': 1, 'Nama Lengkap': 'Contoh Siswa', 'NIS': '1001', 'NISN': '0012345678', 'Kelas': 'VII A',
                  'L/P': 'L', 'Tempat Lahir': 'Mojokerto', 'Tanggal Lahir': '2010-01-01', 'Agama': 'Islam',
                  'Kewarganegaraan': 'WNI', 'Status Siswa': 'AKTIF',
                  'Alamat Jalan': 'Jl. Contoh No. 1', 'RT': '01', 'RW': '02',
                  'Dusun': 'Dusun A', 'Kelurahan': 'Desa B', 'Kecamatan': 'Pacet', 'Kabupaten': 'Mojokerto',
                  'Kode Pos': '61374', 'Lintang': '-7.123', 'Bujur': '112.123',
                  'Jenis Tinggal': 'Bersama Orang Tua', 'Transportasi': 'Jalan Kaki',
                  'Jarak Sekolah (km)': '1', 'Waktu Tempuh (menit)': 10,
                  'NIK': '3516000000000001', 'No KK': '3516000000000002', 'No Reg Akta Lahir': '',
                  'Berkebutuhan Khusus': 'Tidak', 'Email': 'siswa@contoh.com',
                  'Sekolah Asal': 'SDN Pacet 1', 'Tahun Masuk': 2024,
                  'Anak Ke': 1, 'Jml Saudara': 2, 'Tinggi Badan (cm)': 150, 'Berat Badan (kg)': 45, 'Lingkar Kepala (cm)': 50, 'Golongan Darah': 'O',
                  'Nama Ayah': 'Ayah Budi', 'NIK Ayah': '351600...', 'Tahun Lahir Ayah': '1980', 'Pendidikan Ayah': 'SMA', 'Pekerjaan Ayah': 'Wiraswasta', 'Penghasilan Ayah': '2000000', 'No HP Ayah': '08123...',
                  'Nama Ibu': 'Ibu Budi', 'NIK Ibu': '351600...', 'Tahun Lahir Ibu': '1985', 'Pendidikan Ibu': 'SMA', 'Pekerjaan Ibu': 'Ibu Rumah Tangga', 'Penghasilan Ibu': '0', 'No HP Ibu': '08123...',
                  'Nama Wali': '', 'NIK Wali': '', 'Tahun Lahir Wali': '', 'Pendidikan Wali': '', 'Pekerjaan Wali': '', 'Penghasilan Wali': '', 'No HP Wali': '',
                  'No SKHUN': '', 'No Ijazah (SD)': '', 'No Peserta UN': '',
                  'Penerima KPS': 'Tidak', 'No KPS': '',
                  'Penerima KIP': 'Tidak', 'No KIP': '', 'Nama di KIP': '',
                  'Layak PIP': 'Ya', 'Alasan PIP': 'Kurang Mampu', 'No KKS': '',
                  'Bank': '', 'No Rekening': '', 'Atas Nama Rekening': ''
              });
          }

          const ws = xlsx.utils.json_to_sheet(dataToExport);
          const wb = xlsx.utils.book_new();
          xlsx.utils.book_append_sheet(wb, ws, "Database Siswa Lengkap");
          xlsx.writeFile(wb, `Database_Dapodik_Full_${new Date().toISOString().split('T')[0]}.xlsx`);

      } catch (e) {
          console.error(e);
          alert("Gagal mengunduh data.");
      }
  };

  // --- FEATURE: IMPORT EXCEL (ALL FIELDS) ---
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsLoading(true);
      setLoadingText('Membaca file Excel...');
      const reader = new FileReader();
      
      reader.onload = async (evt) => {
          try {
              const bstr = evt.target?.result;
              // @ts-ignore
              const xlsx = window.XLSX;
              const wb = xlsx.read(bstr, { type: 'binary' });
              const wsName = wb.SheetNames[0];
              const ws = wb.Sheets[wsName];
              const data = xlsx.utils.sheet_to_json(ws);

              if (!data || data.length === 0) {
                  alert("File kosong atau format salah.");
                  setIsLoading(false);
                  setLoadingText('');
                  return;
              }

              // Map Excel rows back to Student Object (COMPREHENSIVE MAPPING)
              const newStudents: Student[] = data.map((row: any) => {
                  return {
                      id: Math.random().toString(36).substr(2, 9),
                      fullName: row['Nama Lengkap'] || '',
                      nis: String(row['NIS'] || ''),
                      nisn: String(row['NISN'] || ''),
                      gender: (row['L/P'] === 'P' ? 'P' : 'L') as 'L' | 'P',
                      birthPlace: row['Tempat Lahir'] || '',
                      birthDate: row['Tanggal Lahir'] || '', 
                      religion: row['Agama'] || 'Islam',
                      nationality: row['Kewarganegaraan'] || 'WNI',
                      className: row['Kelas'] || 'VII A',
                      status: row['Status Siswa'] || 'AKTIF',
                      
                      address: row['Alamat Jalan'] || '',
                      subDistrict: row['Kecamatan'] || '',
                      district: row['Kabupaten'] || 'Mojokerto',
                      postalCode: String(row['Kode Pos'] || ''),
                      
                      height: Number(row['Tinggi Badan (cm)']) || 0,
                      weight: Number(row['Berat Badan (kg)']) || 0,
                      bloodType: row['Golongan Darah'] || '-',
                      siblingCount: Number(row['Jml Saudara']) || 0,
                      childOrder: Number(row['Anak Ke']) || 1,
                      entryYear: Number(row['Tahun Masuk']) || new Date().getFullYear(),
                      previousSchool: row['Sekolah Asal'] || '',
                      diplomaNumber: String(row['No Ijazah (SD)'] || ''),
                      
                      father: { 
                          name: row['Nama Ayah'] || '', 
                          nik: String(row['NIK Ayah'] || ''), 
                          birthPlaceDate: String(row['Tahun Lahir Ayah'] || ''), 
                          education: row['Pendidikan Ayah'] || '', 
                          job: row['Pekerjaan Ayah'] || '', 
                          income: String(row['Penghasilan Ayah'] || ''), 
                          phone: String(row['No HP Ayah'] || '') 
                      },
                      mother: { 
                          name: row['Nama Ibu'] || '', 
                          nik: String(row['NIK Ibu'] || ''), 
                          birthPlaceDate: String(row['Tahun Lahir Ibu'] || ''), 
                          education: row['Pendidikan Ibu'] || '', 
                          job: row['Pekerjaan Ibu'] || '', 
                          income: String(row['Penghasilan Ibu'] || ''), 
                          phone: String(row['No HP Ibu'] || '') 
                      },
                      guardian: { 
                          name: row['Nama Wali'] || '', 
                          nik: String(row['NIK Wali'] || ''), 
                          birthPlaceDate: String(row['Tahun Lahir Wali'] || ''), 
                          education: row['Pendidikan Wali'] || '', 
                          job: row['Pekerjaan Wali'] || '', 
                          income: String(row['Penghasilan Wali'] || ''), 
                          phone: String(row['No HP Wali'] || '') 
                      },

                      dapodik: {
                          nik: String(row['NIK'] || ''),
                          noKK: String(row['No KK'] || ''),
                          rt: String(row['RT'] || ''),
                          rw: String(row['RW'] || ''),
                          dusun: row['Dusun'] || '',
                          kelurahan: row['Kelurahan'] || '',
                          kecamatan: row['Kecamatan'] || '',
                          kodePos: String(row['Kode Pos'] || ''),
                          livingStatus: row['Jenis Tinggal'] || 'Bersama Orang Tua',
                          transportation: row['Transportasi'] || '',
                          email: row['Email'] || '',
                          skhun: String(row['No SKHUN'] || ''),
                          kpsReceiver: row['Penerima KPS'] || 'Tidak', 
                          kpsNumber: String(row['No KPS'] || ''),
                          kipReceiver: row['Penerima KIP'] || 'Tidak', 
                          kipNumber: String(row['No KIP'] || ''), 
                          kipName: row['Nama di KIP'] || '',
                          kksNumber: String(row['No KKS'] || ''), 
                          birthRegNumber: String(row['No Reg Akta Lahir'] || ''),
                          bank: row['Bank'] || '', 
                          bankAccount: String(row['No Rekening'] || ''), 
                          bankAccountName: row['Atas Nama Rekening'] || '',
                          pipEligible: row['Layak PIP'] || 'Tidak', 
                          pipReason: row['Alasan PIP'] || '', 
                          specialNeeds: row['Berkebutuhan Khusus'] || 'Tidak ada',
                          latitude: String(row['Lintang'] || ''), 
                          longitude: String(row['Bujur'] || ''),
                          headCircumference: Number(row['Lingkar Kepala (cm)']) || 0,
                          distanceToSchool: String(row['Jarak Sekolah (km)'] || ''),
                          unExamNumber: String(row['No Peserta UN'] || ''),
                          travelTimeMinutes: Number(row['Waktu Tempuh (menit)']) || 0
                      },
                      documents: [],
                      academicRecords: {},
                      correctionRequests: [],
                      adminMessages: []
                  };
              });

              // Merge Logic (Client Side First)
              const updatedStudents = [...students];
              let addedCount = 0;
              let updatedCount = 0;

              newStudents.forEach(newS => {
                  const existingIdx = updatedStudents.findIndex(s => s.nisn === newS.nisn && newS.nisn !== '');
                  if (existingIdx >= 0) {
                      updatedStudents[existingIdx] = { 
                          ...newS, 
                          id: updatedStudents[existingIdx].id,
                          documents: updatedStudents[existingIdx].documents,
                          academicRecords: updatedStudents[existingIdx].academicRecords,
                          correctionRequests: updatedStudents[existingIdx].correctionRequests,
                          adminMessages: updatedStudents[existingIdx].adminMessages
                      };
                      updatedCount++;
                  } else {
                      updatedStudents.push(newS);
                      addedCount++;
                  }
              });

              // 1. Update State & Cache Immediately (Success in App)
              onUpdateStudents(updatedStudents);
              localStorage.setItem('sidata_students_cache_v3', JSON.stringify(updatedStudents));
              
              alert(`Import Berhasil di APLIKASI (${addedCount} baru, ${updatedCount} update).\n\n⚠️ PENTING: Data ini belum tersimpan di Cloud (Google Sheet).\n\nKlik tombol 'Upload Cloud' (Oranye) untuk menyimpan permanen.`);

          } catch (e) {
              console.error(e);
              alert("Gagal membaca file Excel. Pastikan format sesuai Template.");
          } finally {
              setIsLoading(false);
              setLoadingText('');
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      };
      
      reader.readAsBinaryString(file);
  };

  // --- FEATURE: RESET ALL DATA ---
  const handleResetData = async () => {
      if (window.confirm("ANDA YAKIN HAPUS SEMUA DATA? Data lokal dan Cloud akan dikosongkan.")) {
          setIsLoading(true);
          setLoadingText('Mengosongkan database...');
          try {
              onUpdateStudents([]); 
              await api.syncInitialData([]); 
              alert("Database berhasil dikosongkan.");
          } catch (e) {
              console.error(e);
              alert("Gagal melakukan reset data.");
          } finally {
              setIsLoading(false);
              setLoadingText('');
          }
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setLoadingText('Menyimpan data...');
      try {
          let studentToSave: Student;
          let updatedStudents = [...students];

          if (isEditing) {
              studentToSave = formData;
              updatedStudents = updatedStudents.map(s => s.id === studentToSave.id ? studentToSave : s);
          } else {
              studentToSave = { ...formData, id: Math.random().toString(36).substr(2, 9) };
              updatedStudents.push(studentToSave);
          }

          // Optimistic update
          onUpdateStudents(updatedStudents);
          
          const success = await api.updateStudent(studentToSave);
          if (success) {
              setIsModalOpen(false);
              setFormData(initialFormState);
          } else {
              alert("Gagal menyimpan ke database cloud. Data tersimpan lokal.");
              setIsModalOpen(false);
          }
      } catch (e) {
          console.error(e);
          alert("Terjadi kesalahan.");
      } finally {
          setIsLoading(false);
          setLoadingText('');
      }
  };

  // Helper UI Components
  const TabButton = ({ id, label, icon: Icon }: any) => (
      <button 
        type="button"
        onClick={() => setActiveTab(id)} 
        className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === id ? 'text-blue-600 border-blue-600 bg-blue-50' : 'text-gray-500 border-transparent hover:bg-gray-50'}`}
      >
          <Icon className="w-4 h-4" /> {label}
      </button>
  );

  const InputGroup = ({ label, value, onChange, type = "text", placeholder = "", required = false, options = [] }: any) => (
      <div className="flex flex-col">
          <label className="text-[10px] font-bold text-gray-500 uppercase mb-1">{label}</label>
          {options.length > 0 ? (
              <select className="w-full p-2 border border-gray-300 rounded text-sm bg-white focus:ring-1 focus:ring-blue-500 outline-none" value={value} onChange={onChange}>
                  {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
          ) : (
              <input 
                type={type} 
                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                value={value} 
                onChange={onChange} 
                placeholder={placeholder} 
                required={required} 
              />
          )}
      </div>
  );

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in relative">
        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />

        {/* MODAL FORM */}
        {isModalOpen && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                        <h3 className="font-bold text-gray-800">{isEditing ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</h3>
                        <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
                    </div>
                    
                    <div className="flex border-b overflow-x-auto">
                        <TabButton id="PROFILE" label="Pribadi" icon={User} />
                        <TabButton id="FAMILY" label="Keluarga" icon={Users} />
                        <TabButton id="ADDRESS" label="Alamat" icon={Home} />
                        <TabButton id="PERIODIC" label="Periodik" icon={Ruler} />
                        <TabButton id="WELFARE" label="Kesejahteraan" icon={Wallet} />
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 bg-gray-50">
                        {/* ... Existing Tab Content ... */}
                        {activeTab === 'PROFILE' && (
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-blue-600 border-b pb-1 mb-3">Identitas Utama</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <InputGroup label="Nama Lengkap" required value={formData.fullName} onChange={(e: any) => setFormData({...formData, fullName: e.target.value})} />
                                    <InputGroup label="NISN" required value={formData.nisn} onChange={(e: any) => setFormData({...formData, nisn: e.target.value})} />
                                    <InputGroup label="NIS" value={formData.nis} onChange={(e: any) => setFormData({...formData, nis: e.target.value})} />
                                    <InputGroup label="NIK Siswa" value={formData.dapodik.nik} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, nik: e.target.value}})} />
                                    <InputGroup label="No. KK" value={formData.dapodik.noKK} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, noKK: e.target.value}})} />
                                    <InputGroup label="Kelas" value={formData.className} onChange={(e: any) => setFormData({...formData, className: e.target.value})} options={CLASS_OPTIONS} />
                                    <InputGroup label="Jenis Kelamin" value={formData.gender} onChange={(e: any) => setFormData({...formData, gender: e.target.value})} options={['L', 'P']} />
                                    <InputGroup label="Agama" value={formData.religion} onChange={(e: any) => setFormData({...formData, religion: e.target.value})} options={['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Khonghucu']} />
                                    <InputGroup label="Kewarganegaraan" value={formData.nationality} onChange={(e: any) => setFormData({...formData, nationality: e.target.value})} options={['WNI', 'WNA']} />
                                </div>
                                
                                <h4 className="text-sm font-bold text-blue-600 border-b pb-1 mb-3 mt-4">Data Kelahiran</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <InputGroup label="Tempat Lahir" value={formData.birthPlace} onChange={(e: any) => setFormData({...formData, birthPlace: e.target.value})} />
                                    <InputGroup label="Tanggal Lahir" type="date" value={formData.birthDate} onChange={(e: any) => setFormData({...formData, birthDate: e.target.value})} />
                                    <InputGroup label="No Reg Akta Lahir" value={formData.dapodik.birthRegNumber} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, birthRegNumber: e.target.value}})} />
                                    <InputGroup label="Berkebutuhan Khusus" value={formData.dapodik.specialNeeds} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, specialNeeds: e.target.value}})} />
                                </div>

                                <h4 className="text-sm font-bold text-blue-600 border-b pb-1 mb-3 mt-4">Data Sekolah Asal & UN</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <InputGroup label="Sekolah Asal" value={formData.previousSchool} onChange={(e: any) => setFormData({...formData, previousSchool: e.target.value})} />
                                    <InputGroup label="No. Seri Ijazah (SD)" value={formData.diplomaNumber} onChange={(e: any) => setFormData({...formData, diplomaNumber: e.target.value})} />
                                    <InputGroup label="No. Seri SKHUN" value={formData.dapodik.skhun} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, skhun: e.target.value}})} />
                                    <InputGroup label="No. Peserta UN" value={formData.dapodik.unExamNumber} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, unExamNumber: e.target.value}})} />
                                    <InputGroup label="Tahun Masuk" type="number" value={formData.entryYear} onChange={(e: any) => setFormData({...formData, entryYear: Number(e.target.value)})} />
                                    <InputGroup label="Status Siswa" value={formData.status} onChange={(e: any) => setFormData({...formData, status: e.target.value})} options={['AKTIF', 'LULUS', 'PINDAH', 'KELUAR']} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'FAMILY' && (
                            <div className="space-y-6">
                                <div className="p-4 bg-blue-50/50 rounded border border-blue-100">
                                    <h4 className="font-bold text-sm mb-3 text-blue-700">Data Ayah Kandung</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <InputGroup label="Nama Ayah" value={formData.father.name} onChange={(e: any) => setFormData({...formData, father: {...formData.father, name: e.target.value}})} />
                                        <InputGroup label="NIK Ayah" value={formData.father.nik} onChange={(e: any) => setFormData({...formData, father: {...formData.father, nik: e.target.value}})} />
                                        <InputGroup label="Tahun Lahir" value={formData.father.birthPlaceDate} onChange={(e: any) => setFormData({...formData, father: {...formData.father, birthPlaceDate: e.target.value}})} />
                                        <InputGroup label="Pendidikan" value={formData.father.education} onChange={(e: any) => setFormData({...formData, father: {...formData.father, education: e.target.value}})} options={['SD', 'SMP', 'SMA', 'D3', 'S1', 'S2', 'S3', 'Tidak Sekolah']} />
                                        <InputGroup label="Pekerjaan" value={formData.father.job} onChange={(e: any) => setFormData({...formData, father: {...formData.father, job: e.target.value}})} />
                                        <InputGroup label="Penghasilan" value={formData.father.income} onChange={(e: any) => setFormData({...formData, father: {...formData.father, income: e.target.value}})} options={['< 500rb', '500rb-1jt', '1jt-2jt', '2jt-5jt', '> 5jt']} />
                                        <InputGroup label="No HP Ayah" value={formData.father.phone} onChange={(e: any) => setFormData({...formData, father: {...formData.father, phone: e.target.value}})} />
                                    </div>
                                </div>

                                <div className="p-4 bg-pink-50/50 rounded border border-pink-100">
                                    <h4 className="font-bold text-sm mb-3 text-pink-700">Data Ibu Kandung</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <InputGroup label="Nama Ibu" value={formData.mother.name} onChange={(e: any) => setFormData({...formData, mother: {...formData.mother, name: e.target.value}})} />
                                        <InputGroup label="NIK Ibu" value={formData.mother.nik} onChange={(e: any) => setFormData({...formData, mother: {...formData.mother, nik: e.target.value}})} />
                                        <InputGroup label="Tahun Lahir" value={formData.mother.birthPlaceDate} onChange={(e: any) => setFormData({...formData, mother: {...formData.mother, birthPlaceDate: e.target.value}})} />
                                        <InputGroup label="Pendidikan" value={formData.mother.education} onChange={(e: any) => setFormData({...formData, mother: {...formData.mother, education: e.target.value}})} options={['SD', 'SMP', 'SMA', 'D3', 'S1', 'S2', 'S3', 'Tidak Sekolah']} />
                                        <InputGroup label="Pekerjaan" value={formData.mother.job} onChange={(e: any) => setFormData({...formData, mother: {...formData.mother, job: e.target.value}})} />
                                        <InputGroup label="Penghasilan" value={formData.mother.income} onChange={(e: any) => setFormData({...formData, mother: {...formData.mother, income: e.target.value}})} options={['Tidak Berpenghasilan', '< 500rb', '500rb-1jt', '1jt-2jt', '2jt-5jt', '> 5jt']} />
                                        <InputGroup label="No HP Ibu" value={formData.mother.phone} onChange={(e: any) => setFormData({...formData, mother: {...formData.mother, phone: e.target.value}})} />
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50/50 rounded border border-gray-200">
                                    <h4 className="font-bold text-sm mb-3 text-gray-700">Data Wali (Jika Ada)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <InputGroup label="Nama Wali" value={formData.guardian?.name} onChange={(e: any) => setFormData({...formData, guardian: {...formData.guardian!, name: e.target.value}})} />
                                        <InputGroup label="NIK Wali" value={formData.guardian?.nik} onChange={(e: any) => setFormData({...formData, guardian: {...formData.guardian!, nik: e.target.value}})} />
                                        <InputGroup label="Tahun Lahir" value={formData.guardian?.birthPlaceDate} onChange={(e: any) => setFormData({...formData, guardian: {...formData.guardian!, birthPlaceDate: e.target.value}})} />
                                        <InputGroup label="Pendidikan" value={formData.guardian?.education} onChange={(e: any) => setFormData({...formData, guardian: {...formData.guardian!, education: e.target.value}})} options={['-', 'SD', 'SMP', 'SMA', 'D3', 'S1', 'S2', 'S3']} />
                                        <InputGroup label="Pekerjaan" value={formData.guardian?.job} onChange={(e: any) => setFormData({...formData, guardian: {...formData.guardian!, job: e.target.value}})} />
                                        <InputGroup label="Penghasilan" value={formData.guardian?.income} onChange={(e: any) => setFormData({...formData, guardian: {...formData.guardian!, income: e.target.value}})} options={['-', '< 500rb', '500rb-1jt', '1jt-2jt', '2jt-5jt', '> 5jt']} />
                                        <InputGroup label="No HP Wali" value={formData.guardian?.phone} onChange={(e: any) => setFormData({...formData, guardian: {...formData.guardian!, phone: e.target.value}})} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'ADDRESS' && (
                            <div className="space-y-4">
                                <InputGroup label="Alamat Jalan" value={formData.address} onChange={(e: any) => setFormData({...formData, address: e.target.value})} placeholder="Jl. Raya Pacet No..." />
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <InputGroup label="RT" value={formData.dapodik.rt} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, rt: e.target.value}})} />
                                    <InputGroup label="RW" value={formData.dapodik.rw} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, rw: e.target.value}})} />
                                    <InputGroup label="Dusun" value={formData.dapodik.dusun} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, dusun: e.target.value}})} />
                                    <InputGroup label="Kelurahan / Desa" value={formData.dapodik.kelurahan} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, kelurahan: e.target.value}})} />
                                    <InputGroup label="Kecamatan" value={formData.subDistrict} onChange={(e: any) => setFormData({...formData, subDistrict: e.target.value})} />
                                    <InputGroup label="Kabupaten / Kota" value={formData.district} onChange={(e: any) => setFormData({...formData, district: e.target.value})} />
                                    <InputGroup label="Kode Pos" value={formData.postalCode} onChange={(e: any) => setFormData({...formData, postalCode: e.target.value})} />
                                </div>
                                
                                <h4 className="text-sm font-bold text-blue-600 border-b pb-1 mb-3 mt-4">Koordinat & Jarak</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <InputGroup label="Lintang (Latitude)" value={formData.dapodik.latitude} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, latitude: e.target.value}})} />
                                    <InputGroup label="Bujur (Longitude)" value={formData.dapodik.longitude} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, longitude: e.target.value}})} />
                                    <InputGroup label="Jarak ke Sekolah (km)" value={formData.dapodik.distanceToSchool} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, distanceToSchool: e.target.value}})} />
                                    <InputGroup label="Waktu Tempuh (menit)" type="number" value={formData.dapodik.travelTimeMinutes} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, travelTimeMinutes: Number(e.target.value)}})} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                    <InputGroup label="Jenis Tinggal" value={formData.dapodik.livingStatus} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, livingStatus: e.target.value}})} options={['Bersama Orang Tua', 'Wali', 'Kos', 'Asrama', 'Panti Asuhan']} />
                                    <InputGroup label="Transportasi" value={formData.dapodik.transportation} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, transportation: e.target.value}})} options={['Jalan Kaki', 'Kendaraan Pribadi', 'Angkutan Umum', 'Jemputan Sekolah', 'Ojek']} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'PERIODIC' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <InputGroup label="Tinggi Badan (cm)" type="number" value={formData.height} onChange={(e: any) => setFormData({...formData, height: Number(e.target.value)})} />
                                <InputGroup label="Berat Badan (kg)" type="number" value={formData.weight} onChange={(e: any) => setFormData({...formData, weight: Number(e.target.value)})} />
                                <InputGroup label="Lingkar Kepala (cm)" type="number" value={formData.dapodik.headCircumference} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, headCircumference: Number(e.target.value)}})} />
                                <InputGroup label="Golongan Darah" value={formData.bloodType} onChange={(e: any) => setFormData({...formData, bloodType: e.target.value})} options={['-','A','B','AB','O']} />
                                <InputGroup label="Jumlah Saudara Kandung" type="number" value={formData.siblingCount} onChange={(e: any) => setFormData({...formData, siblingCount: Number(e.target.value)})} />
                                <InputGroup label="Anak Ke-" type="number" value={formData.childOrder} onChange={(e: any) => setFormData({...formData, childOrder: Number(e.target.value)})} />
                                <div className="md:col-span-3">
                                    <InputGroup label="Email Pribadi" type="email" value={formData.dapodik.email} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, email: e.target.value}})} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'WELFARE' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-4 border rounded bg-yellow-50/50">
                                        <h4 className="font-bold text-sm text-yellow-700 mb-3">KIP (Kartu Indonesia Pintar)</h4>
                                        <div className="space-y-3">
                                            <InputGroup label="Penerima KIP?" value={formData.dapodik.kipReceiver} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, kipReceiver: e.target.value}})} options={['Ya', 'Tidak']} />
                                            <InputGroup label="Nomor KIP" value={formData.dapodik.kipNumber} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, kipNumber: e.target.value}})} />
                                            <InputGroup label="Nama Tertera di KIP" value={formData.dapodik.kipName} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, kipName: e.target.value}})} />
                                        </div>
                                    </div>
                                    <div className="p-4 border rounded bg-green-50/50">
                                        <h4 className="font-bold text-sm text-green-700 mb-3">PIP (Program Indonesia Pintar)</h4>
                                        <div className="space-y-3">
                                            <InputGroup label="Layak PIP?" value={formData.dapodik.pipEligible} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, pipEligible: e.target.value}})} options={['Ya', 'Tidak']} />
                                            <InputGroup label="Alasan Layak PIP" value={formData.dapodik.pipReason} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, pipReason: e.target.value}})} />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-4 border rounded bg-blue-50/50">
                                        <h4 className="font-bold text-sm text-blue-700 mb-3">KPS / PKH / KKS</h4>
                                        <div className="space-y-3">
                                            <InputGroup label="Penerima KPS?" value={formData.dapodik.kpsReceiver} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, kpsReceiver: e.target.value}})} options={['Ya', 'Tidak']} />
                                            <InputGroup label="Nomor KPS" value={formData.dapodik.kpsNumber} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, kpsNumber: e.target.value}})} />
                                            <InputGroup label="Nomor KKS" value={formData.dapodik.kksNumber} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, kksNumber: e.target.value}})} />
                                        </div>
                                    </div>
                                    <div className="p-4 border rounded bg-purple-50/50">
                                        <h4 className="font-bold text-sm text-purple-700 mb-3">Data Rekening Bank</h4>
                                        <div className="space-y-3">
                                            <InputGroup label="Nama Bank" value={formData.dapodik.bank} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, bank: e.target.value}})} />
                                            <InputGroup label="Nomor Rekening" value={formData.dapodik.bankAccount} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, bankAccount: e.target.value}})} />
                                            <InputGroup label="Atas Nama Rekening" value={formData.dapodik.bankAccountName} onChange={(e: any) => setFormData({...formData, dapodik: {...formData.dapodik, bankAccountName: e.target.value}})} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </form>

                    <div className="flex justify-end gap-3 p-4 bg-white border-t">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-200">
                            Batal
                        </button>
                        <button onClick={handleSubmit} disabled={isLoading} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 shadow-lg flex items-center gap-2">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Simpan Data
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* TOOLBAR */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" /> Database Dapodik
            </h2>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Cari Nama / NISN..." 
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                </div>
                <button onClick={() => { setFormData(initialFormState); setIsEditing(false); setIsModalOpen(true); setActiveTab('PROFILE'); }} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold shadow-sm">
                    <Plus className="w-4 h-4 mr-2" /> Tambah
                </button>
                <button onClick={handleResetCloud} disabled={isLoading} className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-bold shadow-sm disabled:opacity-50">
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <DownloadCloud className="w-4 h-4 mr-2" />} Reset Cloud
                </button>
                <button onClick={handlePushCloud} disabled={isLoading} className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-bold shadow-sm disabled:opacity-50">
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />} 
                    {isLoading && loadingText ? loadingText : 'Upload Cloud'}
                </button>
                <button onClick={handleDownloadData} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold shadow-sm">
                    <Download className="w-4 h-4 mr-2" /> Export
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-bold shadow-sm">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />} Import
                </button>
                <button onClick={handleResetData} className="flex items-center px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-bold shadow-sm border border-red-200">
                    <RotateCcw className="w-4 h-4" /> Reset
                </button>
            </div>
        </div>

        {/* TABLE */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden">
            <div className="overflow-auto h-full pb-32">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">
                        <tr>
                            <th className="px-6 py-3 w-16 text-center">No</th>
                            <th className="px-6 py-3">Nama Lengkap</th>
                            <th className="px-6 py-3">NISN</th>
                            <th className="px-6 py-3">Kelas</th>
                            <th className="px-6 py-3">L/P</th>
                            <th className="px-6 py-3 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {filteredStudents.length > 0 ? (
                            filteredStudents.map((s, idx) => (
                                <tr key={s.id} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="px-6 py-3 text-center text-gray-500">{idx + 1}</td>
                                    <td className="px-6 py-3 font-bold text-gray-800">{s.fullName}</td>
                                    <td className="px-6 py-3 text-gray-600 font-mono">{s.nisn}</td>
                                    <td className="px-6 py-3"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600">{s.className}</span></td>
                                    <td className="px-6 py-3">{s.gender}</td>
                                    <td className="px-6 py-3 text-right flex justify-end gap-2">
                                        <button onClick={() => handleEdit(s)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(s.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={6} className="text-center py-10 text-gray-400">Tidak ada data siswa ditemukan.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default DatabaseView;