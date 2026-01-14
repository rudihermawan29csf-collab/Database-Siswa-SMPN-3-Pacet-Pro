import React, { useState } from 'react';
import { Search, Filter, MoreHorizontal, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Student } from '../types';

interface StudentListProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
}

const StudentList: React.FC<StudentListProps> = ({ students, onSelectStudent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');

  const filteredStudents = students.filter(student => {
    const matchSearch = student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        student.nisn.includes(searchTerm);
    const matchClass = filterClass === 'ALL' || student.className === filterClass;
    return matchSearch && matchClass;
  });

  const uniqueClasses = Array.from(new Set(students.map(s => s.className))).sort();

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Cari Nama atau NISN..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative">
             <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
             <select 
                className="pl-10 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
             >
                 <option value="ALL">Semua Kelas</option>
                 {uniqueClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)}
             </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                <th className="px-6 py-4">Nama Siswa</th>
                <th className="px-6 py-4">NISN</th>
                <th className="px-6 py-4">Kelas</th>
                <th className="px-6 py-4">Gender</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="px-6 py-3">
                    <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center text-xs font-bold mr-3">
                            {student.fullName.charAt(0)}
                        </div>
                        <div>
                            <div className="font-medium text-gray-900">{student.fullName}</div>
                            <div className="text-xs text-gray-500">{student.nis}</div>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600 font-mono">{student.nisn}</td>
                  <td className="px-6 py-3">
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {student.className}
                     </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">{student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        student.status === 'AKTIF' ? 'bg-green-100 text-green-800' :
                        student.status === 'PINDAH' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button 
                        onClick={() => onSelectStudent(student)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                        title="Lihat Detail"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                  <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                          Tidak ada data siswa ditemukan.
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Mock */}
        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">Menampilkan {filteredStudents.length} dari {students.length} data</span>
            <div className="flex gap-2">
                <button className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-50" disabled><ChevronLeft className="w-4 h-4" /></button>
                <button className="p-1 rounded-md hover:bg-gray-200"><ChevronRight className="w-4 h-4" /></button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StudentList;