import React, { useState, useMemo, useRef } from 'react';
import { Search, Plus, Pencil, Trash2, Save, X, Loader2, Download, UploadCloud, RotateCcw, User, MapPin, Users, Heart, Wallet, Filter, CheckSquare, Square, FileSpreadsheet } from 'lucide-react';
import { Student } from '../types';
import { api } from '../services/api';

interface DatabaseViewProps {
  students: Student[];
  onUpdateStudents: (students: Student[]) => void;
}

const CLASS_OPTIONS = ['VII A', 'VII B', 'VII C', 'VIII A', 'VIII B', 'VIII C', 'IX A', 'IX B', 'IX C'];

const DatabaseView: React.FC<DatabaseViewProps> = ({ students, onUpdateStudents }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('PROFILE');
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
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
      graduationYear: 0,
      diplomaNumber: '',
      averageScore: 0,
      achievements: [],
      dapodik: {
          nik: '', noKK: '', rt: '', rw: '', dusun: '', kelurahan: '', kecamatan: '', kodePos: '',
          livingStatus: '', transportation: '', email: '', skhun: '', kpsReceiver: '', kpsNumber: '',
          kipReceiver: '', kipNumber: '', kipName: '', kksNumber: '', birthRegNumber: '', bank: '',
          bankAccount: '', bankAccountName: '', pipEligible: '', pipReason: '', specialNeeds: '',
          latitude: '', longitude: '', headCircumference: 0, distanceToSchool: '', unExamNumber: '',
          travelTimeMinutes: 0
      },
      documents: []
  };

  const [formData, setFormData] = useState<Student>(initialFormState);

  const uniqueClasses = useMemo(() => {
      const classes = Array.from(new Set(students.map(s => s.className))).sort();
      return ['ALL', ...classes];
  }, [students]);

  // Filter Logic
  const filteredStudents = useMemo(() => {
      return students.filter(s => {
          const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              s.nisn.includes(searchTerm) ||
                              s.nis.includes(searchTerm);
          const matchClass = classFilter === 'ALL' || s.className === classFilter;
          return matchSearch && matchClass;
      });
  }, [students, searchTerm, classFilter]);

  // --- SELECTION HANDLERS ---
  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
      if (selectedIds.size === filteredStudents.length && filteredStudents.length > 0) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(filteredStudents.map(s => s.id)));
      }
  };

  const handleEdit = (student: Student) => {
      setFormData(JSON.parse(JSON.stringify(student))); // Deep copy
      setIsEditing(true);
      setActiveTab('PROFILE');
      setIsModalOpen(true);
  };

  const handleDelete = async (ids: string[]) => {
      if (window.confirm(`Yakin ingin menghapus ${ids.length} data siswa?`)) {
          const newStudents = students.filter(s => !ids.includes(s.id));
          onUpdateStudents(newStudents);
          await api.syncInitialData(newStudents);
          setSelectedIds(new Set());
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      try {
          let updatedStudents = [...students];
          if (isEditing) {
              updatedStudents = updatedStudents.map(s => s.id === formData.id ? formData : s);
              await api.updateStudent(formData);
          } else {
              const newStudent = { ...formData, id: Math.random().toString(36).substr(2, 9) };
              updatedStudents.push(newStudent);
              await api.updateStudent(newStudent); 
          }
          onUpdateStudents(updatedStudents);
          setIsModalOpen(false);
          setFormData(initialFormState);
      } catch (error) {
          console.error("Error saving student:", error);
          alert("Gagal menyimpan data.");
      } finally {
          setIsLoading(false);
      }
  };

  const openAddModal = () => {
      setFormData(initialFormState);
      setIsEditing(false);
      setActiveTab('PROFILE');
      setIsModalOpen(true);
  };

  // --- EXCEL EXPORT (FULL DATA - 70+ Columns) ---
  const handleDownloadExcel = () => {
      try {
          // @ts-ignore
          const xlsx = window.XLSX;
          if (!xlsx) { alert("Library Excel belum siap."); return; }

          const dataToExport = filteredStudents.map((s, index) => ({
              'No': index + 1,
              // Identitas
              'Nama Lengkap': s.fullName,
              'NIS': s.nis,
              'NISN': s.nisn,
              'Kelas': s.className,
              'L/P': s.gender,
              'Tempat Lahir': s.birthPlace,
              'Tanggal Lahir': s.birthDate,
              'NIK': s.dapodik.nik,
              'Agama': s.religion,
              'Kewarganegaraan': s.nationality,
              'Status': s.status,
              'Tahun Masuk': s.entryYear,
              
              // Alamat
              'Alamat Jalan': s.address,
              'RT': s.dapodik.rt,
              'RW': s.dapodik.rw,
              'Dusun': s.dapodik.dusun,
              'Kelurahan': s.dapodik.kelurahan,
              'Kecamatan': s.subDistrict,
              'Kabupaten': s.district,
              'Kode Pos': s.postalCode,
              'Lintang': s.dapodik.latitude,
              'Bujur': s.dapodik.longitude,
              'Jenis Tinggal': s.dapodik.livingStatus,
              'Transportasi': s.dapodik.transportation,
              'No KK': s.dapodik.noKK,

              // Data Periodik
              'Anak ke': s.childOrder,
              'Jml Saudara': s.siblingCount,
              'Tinggi Badan (cm)': s.height,
              'Berat Badan (kg)': s.weight,
              'Lingkar Kepala (cm)': s.dapodik.headCircumference,
              'Gol Darah': s.bloodType,
              'Jarak Sekolah (km)': s.dapodik.distanceToSchool,
              'Waktu Tempuh (menit)': s.dapodik.travelTimeMinutes,

              // Data Ayah
              'Nama Ayah': s.father.name,
              'NIK Ayah': s.father.nik,
              'Tahun Lahir Ayah': s.father.birthPlaceDate,
              'Pendidikan Ayah': s.father.education,
              'Pekerjaan Ayah': s.father.job,
              'Penghasilan Ayah': s.father.income,
              'No HP Ayah': s.father.phone,

              // Data Ibu
              'Nama Ibu': s.mother.name,
              'NIK Ibu': s.mother.nik,
              'Tahun Lahir Ibu': s.mother.birthPlaceDate,
              'Pendidikan Ibu': s.mother.education,
              'Pekerjaan Ibu': s.mother.job,
              'Penghasilan Ibu': s.mother.income,
              'No HP Ibu': s.mother.phone,

              // Data Wali
              'Nama Wali': s.guardian?.name || '',
              'NIK Wali': s.guardian?.nik || '',
              'Tahun Lahir Wali': s.guardian?.birthPlaceDate || '',
              'Pendidikan Wali': s.guardian?.education || '',
              'Pekerjaan Wali': s.guardian?.job || '',
              'Penghasilan Wali': s.guardian?.income || '',
              'No HP Wali': s.guardian?.phone || '',

              // Data Rinci & Kesejahteraan
              'Sekolah Asal': s.previousSchool,
              'Tahun Lulus': s.graduationYear || '',
              'No Seri Ijazah': s.diplomaNumber,
              'Nilai Rata-rata': s.averageScore || '',
              'Prestasi': s.achievements ? s.achievements.join(', ') : '',
              'No SKHUN': s.dapodik.skhun,
              'No Peserta UN': s.dapodik.unExamNumber,
              'No Reg Akta Lahir': s.dapodik.birthRegNumber,
              'Berkebutuhan Khusus': s.dapodik.specialNeeds,
              'Email': s.dapodik.email,
              'Penerima KPS': s.dapodik.kpsReceiver,
              'No KPS': s.dapodik.kpsNumber,
              'Penerima KIP': s.dapodik.kipReceiver,
              'No KIP': s.dapodik.kipNumber,
              'Nama di KIP': s.dapodik.kipName,
              'No KKS': s.dapodik.kksNumber,
              'Layak PIP': s.dapodik.pipEligible,
              'Alasan Layak PIP': s.dapodik.pipReason,
              'Bank': s.dapodik.bank,
              'No Rekening': s.dapodik.bankAccount,
              'Atas Nama Rekening': s.dapodik.bankAccountName
          }));

          const ws = xlsx.utils.json_to_sheet(dataToExport);
          const wb = xlsx.utils.book_new();
          xlsx.utils.book_append_sheet(wb, ws, "Database Lengkap");
          xlsx.writeFile(wb, `Database_Siswa_Lengkap_${classFilter}.xlsx`);
      } catch (e) { console.error(e); alert("Gagal download excel: " + e); }
  };

  // --- EXCEL IMPORT (APPEND) ---
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // @ts-ignore
      const xlsx = window.XLSX;
      if (!xlsx) { alert("Library Excel belum siap."); return; }

      const reader = new FileReader();
      reader.onload = async (evt) => {
          try {
              const bstr = evt.target?.result;
              const wb = xlsx.read(bstr, { type: 'binary' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              const data = xlsx.utils.sheet_to_json(ws);

              const newStudents: Student[] = data.map((row: any) => {
                  return {
                      id: Math.random().toString(36).substr(2, 9),
                      fullName: row['Nama Lengkap'] || row['Nama Siswa'] || '',
                      nis: String(row['NIS'] || ''),
                      nisn: String(row['NISN'] || ''),
                      className: row['Kelas'] || classFilter || 'VII A',
                      gender: (row['L/P'] || row['Gender'] || 'L') === 'P' ? 'P' : 'L',
                      birthPlace: row['Tempat Lahir'] || '',
                      birthDate: row['Tanggal Lahir'] || '', 
                      religion: row['Agama'] || 'Islam',
                      nationality: row['Kewarganegaraan'] || 'WNI',
                      status: row['Status'] || 'AKTIF',
                      entryYear: Number(row['Tahun Masuk']) || new Date().getFullYear(),
                      
                      address: row['Alamat Jalan'] || '',
                      subDistrict: row['Kecamatan'] || '',
                      district: row['Kabupaten'] || '',
                      postalCode: String(row['Kode Pos'] || ''),
                      
                      height: Number(row['Tinggi Badan (cm)']) || 0,
                      weight: Number(row['Berat Badan (kg)']) || 0,
                      bloodType: row['Gol Darah'] || '-',
                      siblingCount: Number(row['Jml Saudara']) || 0,
                      childOrder: Number(row['Anak ke']) || 1,
                      
                      // Updated Mappings
                      previousSchool: row['Sekolah Asal'] || row['Asal Sekolah'] || '',
                      graduationYear: Number(row['Tahun Lulus']) || 0,
                      diplomaNumber: row['No Seri Ijazah'] || row['No Ijazah'] || '',
                      averageScore: Number(row['Nilai Rata-rata']) || 0,
                      achievements: row['Prestasi'] ? String(row['Prestasi']).split(',').map(s => s.trim()) : [],

                      father: { 
                          name: row['Nama Ayah'] || '', 
                          nik: String(row['NIK Ayah'] || ''), 
                          birthPlaceDate: String(row['Tahun Lahir Ayah'] || ''), 
                          education: row['Pendidikan Ayah'] || '', 
                          job: row['Pekerjaan Ayah'] || '', 
                          income: row['Penghasilan Ayah'] || '', 
                          phone: String(row['No HP Ayah'] || '') 
                      },
                      mother: { 
                          name: row['Nama Ibu'] || '', 
                          nik: String(row['NIK Ibu'] || ''), 
                          birthPlaceDate: String(row['Tahun Lahir Ibu'] || ''), 
                          education: row['Pendidikan Ibu'] || '', 
                          job: row['Pekerjaan Ibu'] || '', 
                          income: row['Penghasilan Ibu'] || '', 
                          phone: String(row['No HP Ibu'] || '') 
                      },
                      guardian: { 
                          name: row['Nama Wali'] || '', 
                          nik: String(row['NIK Wali'] || ''), 
                          birthPlaceDate: String(row['Tahun Lahir Wali'] || ''), 
                          education: row['Pendidikan Wali'] || '', 
                          job: row['Pekerjaan Wali'] || '', 
                          income: row['Penghasilan Wali'] || '', 
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
                          livingStatus: row['Jenis Tinggal'] || '', 
                          transportation: row['Transportasi'] || '', 
                          email: row['Email'] || '', 
                          skhun: String(row['No SKHUN'] || ''), 
                          unExamNumber: String(row['No Peserta UN'] || ''),
                          birthRegNumber: String(row['No Reg Akta Lahir'] || ''),
                          
                          kpsReceiver: row['Penerima KPS'] || 'Tidak', 
                          kpsNumber: String(row['No KPS'] || ''), 
                          kipReceiver: row['Penerima KIP'] || 'Tidak', 
                          kipNumber: String(row['No KIP'] || ''), 
                          kipName: row['Nama di KIP'] || '', 
                          kksNumber: String(row['No KKS'] || ''), 
                          
                          pipEligible: row['Layak PIP'] || 'Tidak',
                          pipReason: row['Alasan Layak PIP'] || '',
                          bank: row['Bank'] || '', 
                          bankAccount: String(row['No Rekening'] || ''), 
                          bankAccountName: row['Atas Nama Rekening'] || '', 
                          
                          specialNeeds: row['Berkebutuhan Khusus'] || 'Tidak',
                          latitude: String(row['Lintang'] || ''), 
                          longitude: String(row['Bujur'] || ''), 
                          headCircumference: Number(row['Lingkar Kepala (cm)']) || 0, 
                          distanceToSchool: String(row['Jarak Sekolah (km)'] || ''), 
                          travelTimeMinutes: Number(row['Waktu Tempuh (menit)']) || 0
                      },
                      documents: []
                  } as Student;
              });

              if (newStudents.length > 0) {
                  // APPEND DATA LOGIC (Check for duplicates by NISN/Name first)
                  const existingNisns = new Set(students.map(s => s.nisn));
                  const nonDuplicateStudents = newStudents.filter(s => {
                      if (s.nisn && existingNisns.has(s.nisn)) return false; 
                      return true;
                  });

                  if (nonDuplicateStudents.length > 0) {
                      const mergedStudents = [...students, ...nonDuplicateStudents];
                      onUpdateStudents(mergedStudents);
                      await api.syncInitialData(mergedStudents);
                      alert(`Berhasil menambahkan ${nonDuplicateStudents.length} data siswa baru.`);
                  } else {
                      alert("Data terbaca, namun semua siswa sudah ada di database (NISN duplikat).");
                  }
              } else {
                  alert("Tidak ada data valid yang ditemukan dalam file.");
              }

          } catch (err) {
              console.error(err);
              alert("Gagal membaca file Excel. Pastikan format benar.");
          } finally {
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      };
      reader.readAsBinaryString(file);
  };

  const TabButton = ({ id, label, icon: Icon }: any) => (
      <button 
          type="button"
          onClick={() => setActiveTab(id)}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === id ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
      >
          <Icon className="w-4 h-4" /> {label}
      </button>
  );

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in">
      <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImportExcel} />

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">Database Siswa</h2>
        
        <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto">
            {/* Class Filter */}
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                <Filter className="w-4 h-4 text-gray-500" />
                <select 
                    className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer w-28"
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                >
                    {uniqueClasses.map(c => <option key={c} value={c}>{c === 'ALL' ? 'Semua Kelas' : c}</option>)}
                </select>
            </div>

            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input type="text" placeholder="Cari Nama / NISN..." className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 whitespace-nowrap shadow-sm">
                    <UploadCloud className="w-4 h-4 mr-2" /> Import Excel
                </button>
                <button onClick={handleDownloadExcel} className="flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-bold hover:bg-gray-900 whitespace-nowrap shadow-sm">
                    <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Lengkap
                </button>
                <button onClick={openAddModal} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 whitespace-nowrap shadow-sm">
                    <Plus className="w-4 h-4 mr-2" /> Tambah
                </button>
            </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2 text-red-700 font-medium text-sm">
                  <span className="bg-red-200 px-2 py-0.5 rounded text-xs font-bold">{selectedIds.size}</span>
                  Siswa terpilih
              </div>
              <button 
                  onClick={() => handleDelete(Array.from(selectedIds))}
                  className="flex items-center gap-2 px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                  <Trash2 className="w-3 h-3" /> Hapus Terpilih
              </button>
          </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 pb-32">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="px-4 py-4 w-10 text-center">
                            <button onClick={toggleSelectAll} className="text-gray-500 hover:text-blue-600">
                                {selectedIds.size === filteredStudents.length && filteredStudents.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            </button>
                        </th>
                        <th className="px-6 py-4">Nama Siswa</th>
                        <th className="px-6 py-4">NIS / NISN</th>
                        <th className="px-6 py-4">Kelas</th>
                        <th className="px-6 py-4">L/P</th>
                        <th className="px-6 py-4 text-center">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredStudents.length > 0 ? filteredStudents.map(student => (
                        <tr key={student.id} className={`hover:bg-blue-50/50 transition-colors ${selectedIds.has(student.id) ? 'bg-blue-50' : ''}`}>
                            <td className="px-4 py-3 text-center">
                                <button onClick={() => toggleSelection(student.id)} className="text-gray-400 hover:text-blue-600">
                                    {selectedIds.has(student.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                                </button>
                            </td>
                            <td className="px-6 py-3 font-medium text-gray-900">{student.fullName}</td>
                            <td className="px-6 py-3 text-sm text-gray-500">{student.nis} / {student.nisn}</td>
                            <td className="px-6 py-3"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{student.className}</span></td>
                            <td className="px-6 py-3 text-sm">{student.gender}</td>
                            <td className="px-6 py-3 text-center flex justify-center gap-2">
                                <button onClick={() => handleEdit(student)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete([student.id])} className="p-2 text-red-600 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            </td>
                        </tr>
                    )) : <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">Tidak ada data.</td></tr>}
                </tbody>
            </table>
        </div>
      </div>

      {/* Full Edit Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
                  <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                      <h3 className="text-lg font-bold text-gray-800">{isEditing ? `Edit: ${formData.fullName}` : 'Tambah Siswa Baru'}</h3>
                      <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-500" /></button>
                  </div>
                  
                  {/* Tabs */}
                  <div className="flex border-b border-gray-200 overflow-x-auto bg-white">
                      <TabButton id="PROFILE" label="Data Utama" icon={User} />
                      <TabButton id="ADDRESS" label="Alamat" icon={MapPin} />
                      <TabButton id="PARENTS" label="Orang Tua" icon={Users} />
                      <TabButton id="PERIODIK" label="Periodik" icon={Heart} />
                      <TabButton id="WELFARE" label="Kesejahteraan" icon={Wallet} />
                  </div>

                  <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                      
                      {activeTab === 'PROFILE' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="md:col-span-2"><label className="text-xs font-bold text-gray-500 uppercase">Nama Lengkap</label><input type="text" className="w-full p-2 border rounded" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required /></div>
                              <div><label className="text-xs font-bold text-gray-500 uppercase">NISN</label><input type="text" className="w-full p-2 border rounded" value={formData.nisn} onChange={e => setFormData({...formData, nisn: e.target.value})} /></div>
                              <div><label className="text-xs font-bold text-gray-500 uppercase">NIS Lokal</label><input type="text" className="w-full p-2 border rounded" value={formData.nis} onChange={e => setFormData({...formData, nis: e.target.value})} /></div>
                              <div><label className="text-xs font-bold text-gray-500 uppercase">NIK (Kependudukan)</label><input type="text" className="w-full p-2 border rounded" value={formData.dapodik.nik} onChange={e => setFormData({...formData, dapodik: {...formData.dapodik, nik: e.target.value}})} /></div>
                              <div><label className="text-xs font-bold text-gray-500 uppercase">Jenis Kelamin</label><select className="w-full p-2 border rounded bg-white" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any})}><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></div>
                              <div><label className="text-xs font-bold text-gray-500 uppercase">Tempat Lahir</label><input type="text" className="w-full p-2 border rounded" value={formData.birthPlace} onChange={e => setFormData({...formData, birthPlace: e.target.value})} /></div>
                              <div><label className="text-xs font-bold text-gray-500 uppercase">Tanggal Lahir</label><input type="date" className="w-full p-2 border rounded" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} /></div>
                              <div><label className="text-xs font-bold text-gray-500 uppercase">Kelas</label><select className="w-full p-2 border rounded bg-white" value={formData.className} onChange={e => setFormData({...formData, className: e.target.value})}>{CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                              <div><label className="text-xs font-bold text-gray-500 uppercase">Agama</label><input type="text" className="w-full p-2 border rounded" value={formData.religion} onChange={e => setFormData({...formData, religion: e.target.value})} /></div>
                              <div><label className="text-xs font-bold text-gray-500 uppercase">Kewarganegaraan</label><select className="w-full p-2 border rounded bg-white" value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value as any})}><option value="WNI">WNI</option><option value="WNA">WNA</option></select></div>
                              <div><label className="text-xs font-bold text-gray-500 uppercase">Berkebutuhan Khusus</label><input type="text" className="w-full p-2 border rounded" value={formData.dapodik.specialNeeds} onChange={e => setFormData({...formData, dapodik: {...formData.dapodik, specialNeeds: e.target.value}})} /></div>
                              <div className="md:col-span-2"><label className="text-xs font-bold text-gray-500 uppercase">Sekolah Asal</label><input type="text" className="w-full p-2 border rounded" value={formData.previousSchool} onChange={e => setFormData({...formData, previousSchool: e.target.value})} /></div>
                          </div>
                      )}

                      {activeTab === 'ADDRESS' && (
                          <div className="space-y-4">
                              <div><label className="text-xs font-bold text-gray-500 uppercase">Alamat Jalan</label><textarea rows={2} className="w-full p-2 border rounded" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div><label className="text-xs font-bold text-gray-500 uppercase">RT</label><input type="text" className="w-full p-2 border rounded" value={formData.dapodik.rt} onChange={e => setFormData({...formData, dapodik: {...formData.dapodik, rt: e.target.value}})} /></div>
                                  <div><label className="text-xs font-bold text-gray-500 uppercase">RW</label><input type="text" className="w-full p-2 border rounded" value={formData.dapodik.rw} onChange={e => setFormData({...formData, dapodik: {...formData.dapodik, rw: e.target.value}})} /></div>
                                  <div><label className="text-xs font-bold text-gray-500 uppercase">Kode Pos</label><input type="text" className="w-full p-2 border rounded" value={formData.postalCode} onChange={e => setFormData({...formData, postalCode: e.target.value})} /></div>
                                  <div><label className="text-xs font-bold text-gray-500 uppercase">Dusun</label><input type="text" className="w-full p-2 border rounded" value={formData.dapodik.dusun} onChange={e => setFormData({...formData, dapodik: {...formData.dapodik, dusun: e.target.value}})} /></div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div><label className="text-xs font-bold text-gray-500 uppercase">Kelurahan/Desa</label><input type="text" className="w-full p-2 border rounded" value={formData.dapodik.kelurahan} onChange={e => setFormData({...formData, dapodik: {...formData.dapodik, kelurahan: e.target.value}})} /></div>
                                  <div><label className="text-xs font-bold text-gray-500 uppercase">Kecamatan</label><input type="text" className="w-full p-2 border rounded" value={formData.subDistrict} onChange={e => setFormData({...formData, subDistrict: e.target.value})} /></div>
                                  <div><label className="text-xs font-bold text-gray-500 uppercase">Kabupaten</label><input type="text" className="w-full p-2 border rounded" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} /></div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div><label className="text-xs font-bold text-gray-500 uppercase">Lintang</label><input type="text" className="w-full p-2 border rounded" value={formData.dapodik.latitude} onChange={e => setFormData({...formData, dapodik: {...formData.dapodik, latitude: e.target.value}})} /></div>
                                  <div><label className="text-xs font-bold text-gray-500 uppercase">Bujur</label><input type="text" className="w-full p-2 border rounded" value={formData.dapodik.longitude} onChange={e => setFormData({...formData, dapodik: {...formData.dapodik, longitude: e.target.value}})} /></div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div><label className="text-xs font-bold text-gray-500 uppercase">Jenis Tinggal</label><input type="text" className="w-full p-2 border rounded" value={formData.dapodik.livingStatus} onChange={e => setFormData({...formData, dapodik: {...formData.dapodik, livingStatus: e.target.value}})} /></div>
                                  <div><label className="text-xs font-bold text-gray-500 uppercase">Transportasi</label><input type="text" className="w-full p-2 border rounded" value={formData.dapodik.transportation} onChange={e => setFormData({...formData, dapodik: {...formData.dapodik, transportation: e.target.value}})} /></div>
                              </div>
                          </div>
                      )}

                      {activeTab === 'PARENTS' && (
                          <div className="space-y-6">
                              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                  <h4 className="font-bold text-blue-800 mb-3 text-sm">Data Ayah</h4>
                                  <div className="grid grid-cols-2 gap-3">
                                      <div><label className="text-xs">Nama Ayah</label><input type="text" className="w-full p-1.5 border rounded text-sm" value={formData.father.name} onChange={e => setFormData({...formData, father: {...formData.father, name: e.target.value}})} /></div>
                                      <div><label className="text-xs">NIK Ayah</label><input type="text" className="w-full p-1.5 border rounded text-sm" value={formData.father.nik} onChange={e => setFormData({...formData, father: {...formData.father, nik: e.target.value}})} /></div>
                                      <div><label className="text-xs">Tahun Lahir</label><input type="text" className="w-full p-1.5 border rounded text-sm" value={formData.father.birthPlaceDate} onChange={e => setFormData({...formData, father: {...formData.father, birthPlaceDate: e.target.value}})} /></div>
                                      <div><label className="text-xs">Pendidikan</label><input type="text" className="w-full p-1.5 border rounded text-sm" value={formData.father.education} onChange={e => setFormData({...formData, father: {...formData.father, education: e.target.value}})} /></div>
                                      <div><label className="text-xs">Pekerjaan</label><input type="text" className="w-full p-1.5 border rounded text-sm" value={formData.father.job} onChange={e => setFormData({...formData, father: {...formData.father, job: e.target.value}})} /></div>
                                      <div><label className="text-xs">Penghasilan</label><input type="text" className="w-full p-1.5 border rounded text-sm" value={formData.father.income} onChange={e => setFormData({...formData, father: {...formData.father, income: e.target.value}})} /></div>
                                  </div>
                              </div>
                              <div className="bg-pink-50 p-4 rounded-lg border border-pink-100">
                                  <h4 className="font-bold text-pink-800 mb-3 text-sm">Data Ibu</h4>
                                  <div className="grid grid-cols-2 gap-3">
                                      <div><label className="text-xs">Nama Ibu</label><input type="text" className="w-full p-1.5 border rounded text-sm" value={formData.mother.name} onChange={e => setFormData({...formData, mother: {...formData.mother, name: e.target.value}})} /></div>
                                      <div><label className="text-xs">NIK Ibu</label><input type="text" className="w-full p-1.5 border rounded text-sm" value={formData.mother.nik} onChange={e => setFormData({...formData, mother: {...formData.mother, nik: e.target.value}})} /></div>
                                      <div><label className="text-xs">Tahun Lahir</label><input type="text" className="w-full p-1.5 border rounded text-sm" value={formData.mother.birthPlaceDate} onChange={e => setFormData({...formData, mother: {...formData.mother, birthPlaceDate: e.target.value}})} /></div>
                                      <div><label className="text-xs">Pendidikan</label><input type="text" className="w-full p-1.5 border rounded text-sm" value={formData.mother.education} onChange={e => setFormData({...formData, mother: {...formData.mother, education: e.target.value}})} /></div>
                                      <div><label className="text-xs">Pekerjaan</label><input type="text" className="w-full p-1.5 border rounded text-sm" value={formData.mother.job} onChange={e => setFormData({...formData, mother: {...formData.mother, job: e.target.value}})} /></div>
                                      <div><label className="text-xs">Penghasilan</label><input type="text" className="w-full p-1.5 border rounded text-sm" value={formData.mother.income} onChange={e => setFormData({...formData, mother: {...formData.mother, income: e.target.value}})} /></div>
                                  </div>
                              </div>
                              <div className="bg-gray-100 p-4 rounded-lg border border-gray-200">
                                  <h4 className="font-bold text-gray-800 mb-3 text-sm">Data Wali (Opsional)</h4>
                                  <div className="grid grid-cols-2 gap-3">
                                      <div><label className="text-xs">Nama Wali</label><input type="text" className="w-full p-1.5 border rounded text-sm" value={formData.guardian?.name} onChange={e => setFormData({...formData, guardian: {...formData.guardian, name: e.target.value} as any})} /></div>
                                      <div><label className="text-xs">NIK Wali</label><input type="text" className="w-full p-1.5 border rounded text-sm" value={formData.guardian?.nik} onChange={e => setFormData({...formData, guardian: {...formData.guardian, nik: e.target.value} as any})} /></div>
                                      {/* Add other guardian fields similarly */}
                                  </div>
                              </div>
                          </div>
                      )}

                      {activeTab === 'PERIODIK' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div><label className="text-xs font-bold text-gray-500 uppercase">Tinggi Badan (cm)</label><input type="number" className="w-full p-2 border rounded" value={formData.height} onChange={e => setFormData({...formData, height: Number(e.target.value)})} /></div>
                              <div><label className="text-xs font-bold text-gray-500 uppercase">Berat Badan (kg)</label><input type="number" className="w-full p-2 border rounded" value={formData.weight} onChange={e => setFormData({...formData, weight: Number(e.target.value)})} /></div>
                              <div><label className="text-xs font-bold text-gray-500 uppercase">Lingkar Kepala (cm)</label><input type="number" className="w-full p-2 border rounded" value={formData.dapodik.headCircumference} onChange={e => setFormData({...formData, dapodik: {...formData.dapodik, headCircumference: Number(e.target.value)}})} /></div>
                              <div><label className="text-xs font-bold text-gray-500 uppercase">Jarak ke Sekolah (km)</label><input type="text" className="w-full p-2 border rounded" value={formData.dapodik.distanceToSchool} onChange={e => setFormData({...formData, dapodik: {...formData.dapodik, distanceToSchool: e.target.value}})} /></div>
                              <div><label className="text-xs font-bold text-gray-500 uppercase">Waktu Tempuh (menit)</label><input type="number" className="w-full p-2 border rounded" value={formData.dapodik.travelTimeMinutes} onChange={e => setFormData({...formData, dapodik: {...formData.dapodik, travelTimeMinutes: Number(e.target.value)}})} /></div>
                              <div><label className="text-xs font-bold text-gray-500 uppercase">Jumlah Saudara Kandung</label><input type="number" className="w-full p-2 border rounded" value={formData.siblingCount} onChange={e => setFormData({...formData, siblingCount: Number(e.target.value)})} /></div>
                          </div>
                      )}

                      {activeTab === 'WELFARE' && (
                          <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div><label className="text-xs font-bold text-gray-500 uppercase">No SKHUN</label><input type="text" className="w-full p-2 border rounded" value={formData.dapodik.skhun} onChange={e => setFormData({...formData, dapodik: {...formData.dapodik, skhun: e.target.value}})} /></div>
                                  <div><label className="text-xs font-bold text-gray-500 uppercase">No Ujian Nasional</label><input type="text" className="w-full p-2 border rounded" value={formData.dapodik.unExamNumber} onChange={e => setFormData({...formData, dapodik: {...formData.dapodik, unExamNumber: e.target.value}})} /></div>
                                  <div><label className="text-xs font-bold text-gray-500 uppercase">No Seri Ijazah (Lama)</label><input type="text" className="w-full p-2 border rounded" value={formData.diplomaNumber} onChange={e => setFormData({...formData, diplomaNumber: e.target.value})} /></div>
                                  <div><label className="text-xs font-bold text-gray-500 uppercase">No KKS</label><input type="text" className="w-full p-2 border rounded" value={formData.dapodik.kksNumber} onChange={e => setFormData({...formData, dapodik: {...formData.dapodik, kksNumber: e.target.value}})} /></div>
                              </div>
                              <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                                  <h4 className="font-bold text-sm mb-2">Program KIP/PIP</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                      <div><label className="text-xs">Penerima KIP</label><select className="w-full p-2 border rounded bg-white" value={formData.dapodik.kipReceiver} onChange={e => setFormData({...formData, dapodik: {...formData.dapodik, kipReceiver: e.target.value}})}><option value="Tidak">Tidak</option><option value="Ya">Ya</option></select></div>
                                      <div><label className="text-xs">Nomor KIP</label><input type="text" className="w-full p-2 border rounded" value={formData.dapodik.kipNumber} onChange={e => setFormData({...formData, dapodik: {...formData.dapodik, kipNumber: e.target.value}})} /></div>
                                      <div><label className="text-xs">Nama di KIP</label><input type="text" className="w-full p-2 border rounded" value={formData.dapodik.kipName} onChange={e => setFormData({...formData, dapodik: {...formData.dapodik, kipName: e.target.value}})} /></div>
                                      <div><label className="text-xs">Layak PIP</label><select className="w-full p-2 border rounded bg-white" value={formData.dapodik.pipEligible} onChange={e => setFormData({...formData, dapodik: {...formData.dapodik, pipEligible: e.target.value}})}><option value="Tidak">Tidak</option><option value="Ya">Ya</option></select></div>
                                      <div className="md:col-span-2"><label className="text-xs">Alasan Layak PIP</label><input type="text" className="w-full p-2 border rounded" value={formData.dapodik.pipReason} onChange={e => setFormData({...formData, dapodik: {...formData.dapodik, pipReason: e.target.value}})} /></div>
                                  </div>
                              </div>
                          </div>
                      )}
                  </form>

                  <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
                      <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100">Batal</button>
                      <button onClick={handleSubmit} disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center">
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Simpan Data
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default DatabaseView;