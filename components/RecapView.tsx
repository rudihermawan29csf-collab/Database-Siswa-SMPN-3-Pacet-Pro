import React, { useState, useEffect, useMemo } from 'react';
import { Student } from '../types';
import { Search, FileSpreadsheet, FileText, Calculator } from 'lucide-react';
import { api } from '../services/api';

interface RecapViewProps {
  students: Student[];
  userRole?: 'ADMIN' | 'STUDENT' | 'GURU';
  loggedInStudent?: Student;
}

const RecapView: React.FC<RecapViewProps> = ({ students, userRole = 'ADMIN', loggedInStudent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dbClassFilter, setDbClassFilter] = useState<string>('ALL');
  const [selected5SemSubjects, setSelected5SemSubjects] = useState<string[]>([]);

  const SUBJECT_MAP = [
      { key: 'PAI', label: 'PAI', full: 'Pendidikan Agama dan Budi Pekerti' },
      { key: 'Pendidikan Pancasila', label: 'PPKn', full: 'Pendidikan Pancasila' },
      { key: 'Bahasa Indonesia', label: 'BIN', full: 'Bahasa Indonesia' },
      { key: 'Matematika', label: 'MTK', full: 'Matematika' },
      { key: 'IPA', label: 'IPA', full: 'Ilmu Pengetahuan Alam' },
      { key: 'IPS', label: 'IPS', full: 'Ilmu Pengetahuan Sosial' },
      { key: 'Bahasa Inggris', label: 'BIG', full: 'Bahasa Inggris' },
      { key: 'PJOK', label: 'PJOK', full: 'PJOK' },
      { key: 'Informatika', label: 'INF', full: 'Informatika' },
      { key: 'Seni dan Prakarya', label: 'SENI', full: 'Seni dan Prakarya' },
      { key: 'Bahasa Jawa', label: 'B.JAWA', full: 'Bahasa Jawa' },
  ];

  useEffect(() => {
      const initConfig = async () => {
          // 1. Try fetching from Cloud Settings first for most up-to-date config
          try {
              const settings = await api.getAppSettings();
              if (settings && settings.recapSubjects && Array.isArray(settings.recapSubjects) && settings.recapSubjects.length > 0) {
                  setSelected5SemSubjects(settings.recapSubjects);
                  return;
              }
          } catch (e) {
              console.warn("Could not fetch cloud settings for recap, falling back to local/default");
          }

          // 2. Fallback to LocalStorage if Cloud fails or empty
          const savedRecapConfig = localStorage.getItem('sys_recap_config');
          if (savedRecapConfig) {
              try {
                  setSelected5SemSubjects(JSON.parse(savedRecapConfig));
              } catch (e) {
                  console.error("Failed to parse local recap config, using default", e);
                  setSelected5SemSubjects(SUBJECT_MAP.map(s => s.key));
              }
          } else {
              // 3. Default to ALL subjects if nothing configured
              setSelected5SemSubjects(SUBJECT_MAP.map(s => s.key));
          }
      };

      initConfig();
  }, []);

  const uniqueClasses = useMemo(() => {
      const classes = Array.from(new Set(students.map(s => s.className))).filter(Boolean) as string[];
      return ['ALL', ...classes.sort((a, b) => {
          // Sort logic: VII < VIII < IX, then alphabetically
          const levelA = a.split(' ')[0];
          const levelB = b.split(' ')[0];
          const romanMap: Record<string, number> = { 'VII': 7, 'VIII': 8, 'IX': 9 };
          
          const numA = romanMap[levelA] || 0;
          const numB = romanMap[levelB] || 0;

          if (numA !== numB) return numA - numB;
          return a.localeCompare(b);
      })];
  }, [students]);

  const effectiveStudents = (userRole === 'STUDENT' && loggedInStudent) ? [loggedInStudent] : students;

  const filteredStudents = effectiveStudents.filter(s => {
      const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.nisn.includes(searchTerm);
      const matchClass = userRole === 'STUDENT' ? true : (dbClassFilter === 'ALL' || s.className === dbClassFilter);
      return matchSearch && matchClass;
  });

  const getScore = (s: Student, subjKey: string, sem: number) => {
      const record = s.academicRecords?.[sem];
      if (!record) return 0;
      const mapItem = SUBJECT_MAP.find(m => m.key === subjKey);
      
      const subj = record.subjects.find(sub => {
           if (mapItem) {
               return sub.subject === mapItem.full || 
                      sub.subject === mapItem.key ||
                      sub.subject.startsWith(mapItem.key) || 
                      (mapItem.key === 'PAI' && sub.subject.includes('Agama'));
           }
           return sub.subject.startsWith(subjKey);
      });
      return subj ? subj.score : 0;
  };

  const calculate5SemAvg = (student: Student, subjectKey: string): number => {
      let total = 0;
      for (let i = 1; i <= 5; i++) {
          const score = getScore(student, subjectKey, i);
          total += score || 0;
      }
      return Number((total / 5).toFixed(1));
  };

  const calculateTotal5SemAvg = (student: Student): number => {
      let totalOfAverages = 0;
      let count = 0;
      
      selected5SemSubjects.forEach(key => {
          const avg = calculate5SemAvg(student, key);
          if (avg > 0) {
              totalOfAverages += avg;
              count++;
          }
      });
      
      return count > 0 ? Number((totalOfAverages / count).toFixed(1)) : 0;
  }

  const handleDownloadExcel = () => {
      try {
          // @ts-ignore
          const xlsx = window.XLSX;
          if (!xlsx || !xlsx.utils) { alert("Library Excel belum siap."); return; }

          const dataToExport = filteredStudents.map((s, index) => {
              const row: any = {
                  'No': index + 1,
                  'NISN': s.nisn,
                  'Nama Siswa': s.fullName,
                  'Kelas': s.className,
              };
              
              selected5SemSubjects.forEach(key => {
                  const label = SUBJECT_MAP.find(sub => sub.key === key)?.label || key;
                  row[label] = calculate5SemAvg(s, key) || 0;
              });

              row['Total Rata-rata'] = calculateTotal5SemAvg(s) || 0;
              return row;
          });

          const ws = xlsx.utils.json_to_sheet(dataToExport);
          const wb = xlsx.utils.book_new();
          xlsx.utils.book_append_sheet(wb, ws, "Rekap 5 Sem");
          xlsx.writeFile(wb, `Rekap_5_Semester_${dbClassFilter === 'ALL' ? 'Semua' : dbClassFilter.replace(/\s/g, '')}.xlsx`);
      } catch (e) { console.error(e); alert("Gagal download excel."); }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in space-y-4">
        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-2 rounded-lg font-bold text-sm border border-purple-100">
                    <Calculator className="w-4 h-4" /> Rekap 5 Semester
                </div>
                {userRole === 'ADMIN' && (
                    <select className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium" value={dbClassFilter} onChange={(e) => setDbClassFilter(e.target.value)}>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c === 'ALL' ? 'Semua Kelas' : `Kelas ${c}`}</option>)}
                    </select>
                )}
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="text" placeholder="Cari Siswa..." className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <button onClick={handleDownloadExcel} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" /> Excel</button>
            </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1 w-full pb-32" id="recap-5-sem-table">
                <table className="border-collapse w-full text-sm">
                    <thead className="bg-purple-50 border-b border-purple-200 sticky top-0 z-10 shadow-sm text-purple-800 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3 text-center w-12 border border-purple-200">No</th>
                            <th className="px-4 py-3 text-left min-w-[200px] border border-purple-200">Nama Siswa</th>
                            <th className="px-4 py-3 text-center border border-purple-200">Kelas</th>
                            {selected5SemSubjects.map(key => (
                                <th key={key} className="px-2 py-3 text-center min-w-[80px] bg-purple-100/50 border border-purple-200">
                                    {SUBJECT_MAP.find(s => s.key === key)?.label} <br/><span className="text-[9px] opacity-70">(Rata2)</span>
                                </th>
                            ))}
                            <th className="px-4 py-3 text-center bg-purple-200/50 border border-purple-200">Total Rata-rata</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-50">
                        {filteredStudents.length > 0 ? filteredStudents.map((student, idx) => {
                            const totalAvg = calculateTotal5SemAvg(student);
                            return (
                                <tr key={student.id} className="hover:bg-purple-50/30 transition-colors">
                                    <td className="px-4 py-2 text-center text-gray-500 border border-purple-100">{idx + 1}</td>
                                    <td className="px-4 py-2 font-medium text-gray-900 border border-purple-100">
                                        <div>{student.fullName}</div>
                                        <div className="text-xs text-gray-400 font-mono">{student.nisn}</div>
                                    </td>
                                    <td className="px-4 py-2 text-center text-gray-500 border border-purple-100">{student.className}</td>
                                    {selected5SemSubjects.map(key => {
                                        const avg = calculate5SemAvg(student, key);
                                        return (
                                            <td key={key} className="px-2 py-2 text-center border border-purple-100">
                                                <span className={`font-semibold ${avg < 75 ? 'text-red-500' : 'text-gray-700'}`}>
                                                    {avg > 0 ? avg : '-'}
                                                </span>
                                            </td>
                                        );
                                    })}
                                    <td className="px-4 py-2 text-center font-bold text-purple-700 bg-purple-50/30 border border-purple-100">
                                        {totalAvg > 0 ? totalAvg : '-'}
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan={selected5SemSubjects.length + 4} className="p-8 text-center text-gray-500">Tidak ada data siswa.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default RecapView;