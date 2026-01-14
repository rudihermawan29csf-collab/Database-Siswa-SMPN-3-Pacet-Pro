import React, { useState } from 'react';
import { Search, CreditCard, Download, Eye, FileText } from 'lucide-react';
import { Student } from '../types';

interface DapodikListProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
}

const DapodikList: React.FC<DapodikListProps> = ({ students, onSelectStudent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredStudents = students.filter(student => 
    student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    student.dapodik.nik.includes(searchTerm) ||
    student.nisn.includes(searchTerm)
  );

  const Th: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <th className={`px-6 py-4 bg-gray-50 text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 text-left ${className}`}>
      {children}
    </th>
  );

  const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <td className={`px-6 py-3 text-sm text-gray-600 border-b border-gray-100 ${className}`}>
      {children}
    </td>
  );

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in">
      {/* Toolbar Dapodik */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100 whitespace-nowrap">
            <CreditCard className="w-4 h-4 text-purple-600" />
            <span className="font-semibold text-purple-900">Database Dapodik</span>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
            <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                    type="text"
                    placeholder="Cari Nama, NISN, atau NIK..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <button className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm text-sm font-medium whitespace-nowrap">
                <Download className="w-4 h-4 mr-2" />
                Export Excel
            </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col relative mt-0">
        <div className="overflow-auto flex-1 w-full">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 shadow-sm bg-gray-50">
              <tr>
                <Th className="text-center w-20">No</Th>
                <Th>Nama Siswa</Th>
                <Th>NIPD</Th>
                <Th>NISN</Th>
                <Th className="text-center">L/P</Th>
                <Th className="text-center">Kelas</Th>
                <Th className="text-center w-20">Action</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredStudents.length > 0 ? filteredStudents.map((student, index) => (
                <tr key={student.id} className="hover:bg-purple-50/30 transition-colors group">
                    <Td className="text-center bg-gray-50 font-medium">{index + 1}</Td>
                    <Td className="font-semibold text-gray-900">
                        {student.fullName}
                    </Td>
                    <Td>{student.nis}</Td>
                    <Td>{student.nisn}</Td>
                    <Td className="text-center">
                         <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${student.gender === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                            {student.gender}
                        </span>
                    </Td>
                    <Td className="text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {student.className}
                        </span>
                    </Td>
                    <Td className="text-center">
                        <button 
                            onClick={() => onSelectStudent(student)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-all shadow-sm border border-blue-200"
                            title="Lihat Detail Dapodik"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                    </Td>
                </tr>
              )) : (
                  <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                          <FileText className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                          <p>Tidak ada data siswa ditemukan.</p>
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer info */}
        <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
            Menampilkan {filteredStudents.length} siswa. Klik tombol mata untuk melihat detail lengkap Dapodik.
        </div>
      </div>
    </div>
  );
};

export default DapodikList;