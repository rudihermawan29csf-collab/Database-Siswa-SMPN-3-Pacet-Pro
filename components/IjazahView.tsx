import React, { useState } from 'react';
import { Student } from '../types';
import { Search, FileSpreadsheet, Award, LayoutList, TableProperties } from 'lucide-react';

interface IjazahViewProps {
  students: Student[];
  userRole?: 'ADMIN' | 'STUDENT';
  loggedInStudent?: Student;
}

const CLASS_LIST = ['VII A', 'VII B', 'VII C', 'VIII A', 'VIII B', 'VIII C', 'IX A', 'IX B', 'IX C'];

const IjazahView: React.FC<IjazahViewProps> = ({ students, userRole = 'ADMIN', loggedInStudent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dbClassFilter, setDbClassFilter] = useState<string>('ALL');
  const [viewDetail, setViewDetail] = useState(false);

  const SUBJECT_MAP = [
      { key: 'PAI', label: 'PAI' },
      { key: 'Pendidikan Pancasila', label: 'PPKn' },
      { key: 'Bahasa Indonesia', label: 'BIN' },
      { key: 'Matematika', label: 'MTK' },
      { key: 'IPA', label: 'IPA' },
      { key: 'IPS', label: 'IPS' },
      { key: 'Bahasa Inggris', label: 'BIG' },
      { key: 'PJOK', label: 'PJOK' },
      { key: 'Informatika', label: 'INF' },
      { key: 'Seni dan Prakarya', label: 'SENI' },
      { key: 'Bahasa Jawa', label: 'B.JAWA' },
  ];

  const effectiveStudents = (userRole === 'STUDENT' && loggedInStudent) ? [loggedInStudent] : students;

  const filteredStudents = effectiveStudents.filter(s => {
      const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.nisn.includes(searchTerm);
      const matchClass = userRole === 'STUDENT' ? true : (dbClassFilter === 'ALL' || s.className === dbClassFilter);
      return matchSearch && matchClass;
  });

  const getScore = (s: Student, subjKey: string, sem: number) => {
      const record = s.academicRecords?.[sem];
      if (!record) return 0;
      const subj = record.subjects.find(sub => sub.subject.startsWith(subjKey) || (subjKey === 'PAI' && sub.subject.includes('Agama')));
      return subj ? subj.score : 0;
  };

  // Calculate Avg for 6 Semesters
  const calculate6SemAvg = (student: Student, subjectKey: string): number => {
      let total = 0;
      for (let i = 1; i <= 6; i++) {
          const score = getScore(student, subjectKey, i);
          total += score || 0;
      }
      return Number((total / 6).toFixed(1));
  };

  // Calculate Semester Average (Average of all subjects in one semester)
  const calculateSemesterAvg = (student: Student, sem: number): number => {
      let total = 0;
      let count = 0;
      SUBJECT_MAP.forEach(sub => {
          const score = getScore(student, sub.key, sem);
          if (score > 0) {
              total += score;
              count++;
          }
      });
      return count > 0 ? Number((total / count).toFixed(1)) : 0;
  };

  // Calculate Final Grade (Average of 6 Semester Averages)
  const calculateFinalGrade = (student: Student): number => {
      let totalAvg = 0;
      let count = 0;
      SUBJECT_MAP.forEach(sub => {
          const avg = calculate6SemAvg(student, sub.key);
          if (avg > 0) {
              totalAvg += avg;
              count++;
          }
      });
      return count > 0 ? Number((totalAvg / count).toFixed(1)) : 0;
  };

  const handleDownloadExcel = () => {
      try {
          // @ts-ignore
          const xlsx = window.XLSX;
          if (!xlsx || !xlsx.utils) { alert("Library Excel belum siap."); return; }

          let dataToExport: any[] = [];

          if (viewDetail) {
              // Detailed Export
              dataToExport = filteredStudents.map((s, index) => {
                  const row: any = {
                      'No': index + 1,
                      'NISN': s.nisn,
                      'Nama Siswa': s.fullName,
                      'Kelas': s.className,
                  };
                  
                  // Loop Semesters
                  for(let sem=1; sem<=6; sem++) {
                      SUBJECT_MAP.forEach(sub => {
                          row[`S${sem}_${sub.label}`] = getScore(s, sub.key, sem) || 0;
                      });
                      row[`Rata2_S${sem}`] = calculateSemesterAvg(s, sem) || 0;
                  }
                  row['Nilai_Akhir_Sekolah'] = calculateFinalGrade(s) || 0;
                  return row;
              });
          } else {
              // Summary Export
              dataToExport = filteredStudents.map((s, index) => {
                  const row: any = {
                      'No': index + 1,
                      'NISN': s.nisn,
                      'Nama Siswa': s.fullName,
                      'Kelas': s.className,
                  };
                  SUBJECT_MAP.forEach(sub => {
                      row[sub.label] = calculate6SemAvg(s, sub.key) || 0;
                  });
                  row['Nilai_Akhir'] = calculateFinalGrade(s) || 0;
                  return row;
              });
          }

          const ws = xlsx.utils.json_to_sheet(dataToExport);
          const wb = xlsx.utils.book_new();
          xlsx.utils.book_append_sheet(wb, ws, viewDetail ? "Detail Ijazah" : "Ringkasan Ijazah");
          xlsx.writeFile(wb, `Nilai_Ijazah_${viewDetail ? 'Detail' : 'Summary'}_${dbClassFilter === 'ALL' ? 'Semua' : dbClassFilter.replace(/\s/g, '')}.xlsx`);
      } catch (e) { console.error(e); alert("Gagal download excel."); }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in space-y-4">
        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg font-bold text-sm border border-blue-100">
                    <Award className="w-4 h-4" /> Nilai Ijazah (6 Semester)
                </div>
                {userRole === 'ADMIN' && (
                    <select className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium" value={dbClassFilter} onChange={(e) => setDbClassFilter(e.target.value)}>
                        <option value="ALL">Semua Kelas</option>
                        {CLASS_LIST.map(c => <option key={c} value={c}>Kelas {c}</option>)}
                    </select>
                )}
            </div>
            
            <div className="flex gap-2 w-full md:w-auto items-center">
                {/* View Toggle */}
                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button 
                        onClick={() => setViewDetail(false)}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 ${!viewDetail ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <LayoutList className="w-3 h-3" /> Rata-Rata
                    </button>
                    <button 
                        onClick={() => setViewDetail(true)}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 ${viewDetail ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <TableProperties className="w-3 h-3" /> Detail Lengkap
                    </button>
                </div>

                <div className="relative flex-1 md:w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
                    <input type="text" placeholder="Cari..." className="w-full pl-8 pr-4 py-2 bg-gray-100 rounded-lg text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <button onClick={handleDownloadExcel} className="bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-700 flex items-center gap-1"><FileSpreadsheet className="w-4 h-4" /> Export</button>
            </div>
        </div>

        {/* Table Container */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1 w-full" id="ijazah-table">
                <table className="border-collapse w-full text-xs">
                    <thead className="bg-blue-50 border-b border-blue-200 sticky top-0 z-10 shadow-sm text-blue-800 uppercase">
                        {viewDetail ? (
                            // DETAILED HEADER
                            <>
                                <tr>
                                    <th rowSpan={2} className="px-3 py-2 text-center border border-blue-200 bg-blue-100 min-w-[40px] sticky left-0 z-20">No</th>
                                    <th rowSpan={2} className="px-3 py-2 text-left min-w-[200px] border border-blue-200 bg-blue-100 sticky left-[40px] z-20">Nama Siswa</th>
                                    {[1,2,3,4,5,6].map(sem => (
                                        <th key={sem} colSpan={SUBJECT_MAP.length + 1} className="px-2 py-1 text-center border border-blue-200 bg-blue-50">Semester {sem}</th>
                                    ))}
                                    <th rowSpan={2} className="px-3 py-2 text-center border border-blue-200 bg-blue-200 font-bold min-w-[80px]">Nilai Akhir</th>
                                </tr>
                                <tr>
                                    {[1,2,3,4,5,6].map(sem => (
                                        <React.Fragment key={sem}>
                                            {SUBJECT_MAP.map(sub => (
                                                <th key={`${sem}-${sub.key}`} className="px-1 py-1 text-center border border-blue-200 min-w-[40px] text-[10px]">{sub.label}</th>
                                            ))}
                                            <th className="px-1 py-1 text-center border border-blue-200 bg-blue-100 font-bold text-[10px] min-w-[50px]">Rata2</th>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </>
                        ) : (
                            // SUMMARY HEADER
                            <tr>
                                <th className="px-4 py-3 text-center w-12 border border-blue-200">No</th>
                                <th className="px-4 py-3 text-left min-w-[200px] border border-blue-200">Nama Siswa</th>
                                <th className="px-4 py-3 text-center border border-blue-200">Kelas</th>
                                {SUBJECT_MAP.map(sub => (
                                    <th key={sub.key} className="px-2 py-3 text-center min-w-[60px] border border-blue-200">
                                        {sub.label} <span className="text-[9px] opacity-70 block">(Rata 6 Sem)</span>
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-center bg-blue-100 border border-blue-200">Nilai Akhir</th>
                            </tr>
                        )}
                    </thead>
                    <tbody className="divide-y divide-blue-50">
                        {filteredStudents.length > 0 ? filteredStudents.map((student, idx) => {
                            const finalGrade = calculateFinalGrade(student);
                            
                            return (
                                <tr key={student.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className={`px-3 py-2 text-center text-gray-500 border border-blue-100 ${viewDetail ? 'sticky left-0 bg-white z-10' : ''}`}>{idx + 1}</td>
                                    <td className={`px-3 py-2 font-medium text-gray-900 border border-blue-100 ${viewDetail ? 'sticky left-[40px] bg-white z-10' : ''}`}>
                                        <div className="truncate">{student.fullName}</div>
                                        {!viewDetail && <div className="text-[10px] text-gray-400 font-mono">{student.nisn}</div>}
                                    </td>
                                    
                                    {viewDetail ? (
                                        // DETAILED ROW
                                        <>
                                            {[1,2,3,4,5,6].map(sem => {
                                                const semAvg = calculateSemesterAvg(student, sem);
                                                return (
                                                    <React.Fragment key={sem}>
                                                        {SUBJECT_MAP.map(sub => {
                                                            const score = getScore(student, sub.key, sem);
                                                            return (
                                                                <td key={`${sem}-${sub.key}`} className="px-1 py-1 text-center border border-blue-50 text-[11px]">
                                                                    {score > 0 ? score : '-'}
                                                                </td>
                                                            )
                                                        })}
                                                        <td className="px-1 py-1 text-center border border-blue-50 bg-gray-50 font-bold text-[11px]">
                                                            {semAvg > 0 ? semAvg : '-'}
                                                        </td>
                                                    </React.Fragment>
                                                )
                                            })}
                                            <td className="px-2 py-1 text-center font-bold text-blue-700 bg-blue-50 border border-blue-100">
                                                {finalGrade > 0 ? finalGrade : '-'}
                                            </td>
                                        </>
                                    ) : (
                                        // SUMMARY ROW
                                        <>
                                            <td className="px-4 py-2 text-center text-gray-500 border border-blue-100">{student.className}</td>
                                            {SUBJECT_MAP.map(sub => {
                                                const avg = calculate6SemAvg(student, sub.key);
                                                return (
                                                    <td key={sub.key} className="px-2 py-2 text-center border border-blue-100">
                                                        <span className={`font-semibold ${avg < 75 ? 'text-red-500' : 'text-gray-700'}`}>
                                                            {avg > 0 ? avg : '-'}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-4 py-2 text-center font-bold text-blue-700 bg-blue-50 border border-blue-100">
                                                {finalGrade > 0 ? finalGrade : '-'}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan={viewDetail ? 100 : 20} className="p-8 text-center text-gray-500">Tidak ada data siswa.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default IjazahView;