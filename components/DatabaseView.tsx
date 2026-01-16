import React, { useState, useMemo } from 'react';
import { Search, Plus, Pencil, Trash2, Save, X, Loader2 } from 'lucide-react';
import { Student } from '../types';
import { api } from '../services/api';

interface DatabaseViewProps {
  students: Student[];
  onUpdateStudents: (students: Student[]) => void;
}

const DatabaseView: React.FC<DatabaseViewProps> = ({ students, onUpdateStudents }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  // Filter Logic
  const filteredStudents = useMemo(() => {
      return students.filter(s => 
          s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.nisn.includes(searchTerm) ||
          s.nis.includes(searchTerm)
      );
  }, [students, searchTerm]);

  const handleEdit = (student: Student) => {
      setFormData(JSON.parse(JSON.stringify(student))); // Deep copy
      setIsEditing(true);
      setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
      if (window.confirm("Yakin ingin menghapus data siswa ini?")) {
          const newStudents = students.filter(s => s.id !== id);
          onUpdateStudents(newStudents);
          await api.syncInitialData(newStudents); // Using sync to persist deletion if possible
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
      setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-lg font-bold text-gray-800">Database Siswa</h2>
        <div className="flex gap-2 w-full md:w-auto">
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
            <button onClick={openAddModal} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> Tambah
            </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 pb-32">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                    <tr>
                        <th className="px-6 py-4">Nama Siswa</th>
                        <th className="px-6 py-4">NIS / NISN</th>
                        <th className="px-6 py-4">Kelas</th>
                        <th className="px-6 py-4">L/P</th>
                        <th className="px-6 py-4 text-center">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredStudents.length > 0 ? filteredStudents.map(student => (
                        <tr key={student.id} className="hover:bg-blue-50/50 transition-colors">
                            <td className="px-6 py-3 font-medium text-gray-900">{student.fullName}</td>
                            <td className="px-6 py-3 text-sm text-gray-500">{student.nis} / {student.nisn}</td>
                            <td className="px-6 py-3">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {student.className}
                                </span>
                            </td>
                            <td className="px-6 py-3 text-sm">{student.gender}</td>
                            <td className="px-6 py-3 text-center flex justify-center gap-2">
                                <button onClick={() => handleEdit(student)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(student.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">Tidak ada data.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                  <div className="flex justify-between items-center p-4 border-b border-gray-200">
                      <h3 className="text-lg font-bold text-gray-800">{isEditing ? 'Edit Siswa' : 'Tambah Siswa Baru'}</h3>
                      <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-500" /></button>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                        {/* Identitas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Lengkap</label>
                                <input type="text" className="w-full p-2 border rounded-lg text-sm" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">NISN</label>
                                <input type="text" className="w-full p-2 border rounded-lg text-sm" value={formData.nisn} onChange={(e) => setFormData({...formData, nisn: e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">NIS Lokal</label>
                                <input type="text" className="w-full p-2 border rounded-lg text-sm" value={formData.nis} onChange={(e) => setFormData({...formData, nis: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">NIK (Kependudukan)</label>
                                <input type="text" className="w-full p-2 border rounded-lg text-sm" value={formData.dapodik.nik} onChange={(e) => setFormData({...formData, dapodik: {...formData.dapodik, nik: e.target.value}})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kelas</label>
                                <select className="w-full p-2 border rounded-lg text-sm" value={formData.className} onChange={(e) => setFormData({...formData, className: e.target.value})}>
                                    {['VII A', 'VII B', 'VII C', 'VIII A', 'VIII B', 'VIII C', 'IX A', 'IX B', 'IX C'].map(c => <option key={c} value={c}>Kelas {c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jenis Kelamin</label>
                                <select className="w-full p-2 border rounded-lg text-sm" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value as 'L'|'P'})}>
                                    <option value="L">Laki-laki</option>
                                    <option value="P">Perempuan</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tempat Lahir</label>
                                <input type="text" className="w-full p-2 border rounded-lg text-sm" value={formData.birthPlace} onChange={(e) => setFormData({...formData, birthPlace: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal Lahir</label>
                                <input type="date" className="w-full p-2 border rounded-lg text-sm" value={formData.birthDate} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} />
                            </div>
                        </div>

                        {/* Orang Tua */}
                        <div className="border-t pt-4">
                            <h4 className="text-sm font-bold text-gray-700 mb-3">Data Orang Tua</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Ayah</label>
                                    <input type="text" className="w-full p-2 border rounded-lg text-sm" value={formData.father.name} onChange={(e) => setFormData({...formData, father: {...formData.father, name: e.target.value}})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Ibu</label>
                                    <input type="text" className="w-full p-2 border rounded-lg text-sm" value={formData.mother.name} onChange={(e) => setFormData({...formData, mother: {...formData.mother, name: e.target.value}})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">No HP Orang Tua</label>
                                    <input type="text" className="w-full p-2 border rounded-lg text-sm" value={formData.father.phone} onChange={(e) => setFormData({...formData, father: {...formData.father, phone: e.target.value}})} />
                                </div>
                            </div>
                        </div>
                  </form>

                  <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
                      <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100">Batal</button>
                      <button onClick={handleSubmit} disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center">
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Simpan
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default DatabaseView;