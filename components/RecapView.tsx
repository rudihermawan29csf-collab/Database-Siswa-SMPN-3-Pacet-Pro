
import React, { useState, useEffect, useMemo } from 'react';
import { Student } from '../types';
import { Search, FileSpreadsheet, FileText, Calculator, LayoutList, TableProperties, Columns, Rows } from 'lucide-react';
import { api } from '../services/api';

interface RecapViewProps {
  students: Student[];
  userRole?: 'ADMIN' | 'STUDENT' | 'GURU';
  loggedInStudent?: Student;
}

const RecapView: React.FC<RecapViewProps> = ({ students, userRole = 'ADMIN', loggedInStudent }) => {
  const [dbClassFilter, setDbClassFilter] = useState<string>('ALL');
  const [selected5SemSubjects, setSelected5SemSubjects] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'SUMMARY' | 'DETAIL'>('SUMMARY');

  // MATCHING SUBJECT MAP EXACTLY WITH GRADESVIEW.TSX FOR CONSISTENCY
  const SUBJECT_MAP = [
      { key: 'PAI', label: 'PAI', full: 'Pendidikan Agama dan Budi Pekerti' },
      { key: 'Pendidikan Pancasila', label: 'PPKn', full: 'Pendidikan Pancasila' },
      { key: 'Bahasa Indonesia', label: 'BIN', full: 'Bahasa Indonesia' },
      { key: 'Matematika', label: 'MTK', full: 'Matematika' },
      { key: 'IPA', label: 'IPA', full: 'Ilmu Pengetahuan Alam' },
      { key: 'IPS', label: 'IPS', full: 'Ilmu Pengetahuan Sosial' },
      { key: 'Bahasa Inggris', label: 'BIG', full: 'Bahasa Inggris' },
      { key: 'PJOK', label: 'PJOK', full: 'Pendidikan Jasmani, Olahraga, dan Kesehatan' },
      { key: 'Informatika', label: 'INF', full: 'Informatika' },
      { key: 'Seni dan Prakarya', label: 'SENI', full: 'Seni dan Prakarya' },
      { key: 'Bahasa Jawa', label: 'B.JAWA', full: 'Bahasa Jawa' },
  ];

  // ROBUST SUBJECT FINDER (COPIED FROM GRADESVIEW TO ENSURE SYNC)
  const findSubjectRecord = (subjects: any[], mapItem: any) => {
      if (!subjects) return undefined;
      return subjects.find(s => {
          const sName = (s.subject || '').toLowerCase().trim();
          const full = (mapItem.full || '').toLowerCase().trim();
          const key = (mapItem.key || '').toLowerCase().trim();
          const label = (mapItem.label || '').toLowerCase().trim();
          
          // Exact match on any field
          if (sName === full) return true;
          if (sName === key) return true;
          if (sName === label) return true;

          // Partial matches
          if (sName.includes(full)) return true;
          if (full.includes(sName) && sName.length > 3) return true; 

          // Specific cases for commonly mismatched subjects
          if (key === 'pai' && sName.includes('agama')) return true;
          if (key === 'pjok' && (sName.includes('jasmani') || sName.includes('olahraga'))) return true;
          if ((key.includes('pancasila') || label === 'ppkn') && (sName.includes('pancasila') || sName.includes('ppkn'))) return true;
          if ((key.includes('seni') || label === 'seni') && (sName.includes('seni') || sName.includes('budaya') || sName.includes('prakarya'))) return true;
          
          return false;
      });
  };

  // Helper for Score Color
  const getScoreColor = (score: number) => {
      if (!score && score !== 0) return '';
      if (score === 0) return 'text-gray-400';
      if (score < 70) return 'bg-red-100 text-red-700 font-bold';
      if (score < 85) return 'bg-yellow-100 text-yellow-800 font-bold';
      return 'bg-green-100 text-green-700 font-bold';
  };

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
      const matchClass = userRole === 'STUDENT' ? true : (dbClassFilter === 'ALL' || s.className.trim() === dbClassFilter.trim());
      return matchClass;
  });

  // UPDATED GET SCORE USING ROBUST FINDER
  const getScore = (s: Student, subjKey: string, sem: number) => {
      // Handle string or number keys safely
      const record = s.academicRecords ? (s.academicRecords[sem] || s.academicRecords[String(sem)]) : null;
      if (!record) return 0;
      
      const mapItem = SUBJECT_MAP.find(m => m.key === subjKey);
      if (!mapItem) return 0;

      const subjData = findSubjectRecord(record.subjects, mapItem);
      return subjData ? subjData.score : 0;
  };

  const calculate5SemAvg = (student: Student, subjectKey: string): number => {
      let total = 0;
      for (let i = 1; i <= 5; i++) {
          const score = getScore(student, subjectKey, i);
          total += Number(score) || 0;
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

  // Calculate Semester Average (Row Average per Semester)
  const calculateSemesterAvg = (student: Student, semester: number): number => {
      let total = 0;
      let count = 0;
      selected5SemSubjects.forEach(key => {
          const score = Number(getScore(student, key, semester));
          if (score > 0) {
              total += score;
              count++;
          }
      });
      return count > 0 ? Number((total / count).toFixed(2)) : 0;
  };

  const handleDownloadExcel = () => {
      try {
          // @ts-ignore
          const xlsx = window.XLSX;
          if (!xlsx || !xlsx.utils) { alert("Library Excel belum siap."); return; }

          let dataToExport = [];
          const sheetName = viewMode === 'SUMMARY' ? "Rekap Rata-rata" : "Detail Per Semester";

          if (viewMode === 'SUMMARY') {
              dataToExport = filteredStudents.map((s, index) => {
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
          } else {
              // DETAIL MODE
              dataToExport = filteredStudents.map((s, index) => {
                  const row: any = {
                      'No': index + 1,
                      'NISN': s.nisn,
                      'Nama Siswa': s.fullName,
                      'Kelas': s.className,
                  };

                  [1, 2, 3, 4, 5].forEach(sem => {
                      selected5SemSubjects.forEach(key => {
                          const label = SUBJECT_MAP.find(sub => sub.key === key)?.label || key;
                          row[`S${sem} - ${label}`] = getScore(s, key, sem) || 0;
                      });
                      row[`S${sem} - Rata-rata`] = calculateSemesterAvg(s, sem) || 0;
                  });
                  
                  return row;
              });
          }

          const ws = xlsx.utils.json_to_sheet(dataToExport);
          const wb = xlsx.utils.book_new();
          xlsx.utils.book_append_sheet(wb, ws, sheetName);
          xlsx.writeFile(wb, `Rekap_5_Semester_${viewMode}_${dbClassFilter === 'ALL' ? 'Semua' : dbClassFilter.replace(/\s/g, '')}.xlsx`);
      } catch (e) { console.error(e); alert("Gagal download excel."); }
  };

  // --- SPECIAL VIEW FOR STUDENT: SUBJECTS AS ROWS ---
  if (userRole === 'STUDENT' && loggedInStudent) {
      const student = loggedInStudent;
      const totalAvg = calculateTotal5SemAvg(student);

      return (
          <div className="flex flex-col h-full animate-fade-in space-y-6">
              {/* Header Card */}
              <div className="bg-white p-6 rounded-2xl border border-purple-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 bg-gradient-to-r from-purple-50 to-white">
                  <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shadow-sm border border-purple-200">
                          <Calculator className="w-8 h-8" />
                      </div>
                      <div>
                          <h2 className="text-2xl font-bold text-gray-800">Rekap Nilai 5 Semester</h2>
                          <p className="text-gray-500">Rapor Semester 1 - 5</p>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <div><p className="text-[10px] uppercase font-bold text-gray-400">Nama Lengkap</p><p className="text-sm font-bold text-gray-800">{student.fullName}</p></div>
                      <div><p className="text-[10px] uppercase font-bold text-gray-400">NISN</p><p className="text-sm font-mono font-bold text-gray-800">{student.nisn}</p></div>
                      <div><p className="text-[10px] uppercase font-bold text-gray-400">Kelas</p><p className="text-sm font-bold text-purple-700">{student.className}</p></div>
                      <div><p className="text-[10px] uppercase font-bold text-gray-400">Rata-rata Total</p><p className="text-sm font-black text-purple-600 text-lg leading-none">{totalAvg}</p></div>
                  </div>
              </div>

              {/* Transposed Table: Subjects as Rows */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  <div className="overflow-auto flex-1 pb-10">
                      <table className="w-full text-sm text-left border-collapse">
                          <thead>
                              <tr className="bg-purple-50 border-b border-gray-200 text-xs text-purple-800 uppercase tracking-wider">
                                  <th className="p-4 w-16 text-center font-bold">No</th>
                                  <th className="p-4 font-bold min-w-[200px]">Mata Pelajaran</th>
                                  {[1, 2, 3, 4, 5].map(sem => (
                                      <th key={sem} className="p-4 text-center font-bold bg-purple-100/50 border-l border-gray-100 min-w-[60px]">Sem {sem}</th>
                                  ))}
                                  <th className="p-4 text-center font-bold bg-gray-100 text-gray-800 border-l border-gray-200 min-w-[80px]">Rata-rata</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {selected5SemSubjects.map((key, idx) => {
                                  const subjectLabel = SUBJECT_MAP.find(s => s.key === key)?.label || key;
                                  const subjectFull = SUBJECT_MAP.find(s => s.key === key)?.full || key;
                                  const avg = calculate5SemAvg(student, key);
                                  
                                  return (
                                      <tr key={key} className="hover:bg-purple-50/30 transition-colors">
                                          <td className="p-4 text-center text-gray-400 font-medium">{idx + 1}</td>
                                          <td className="p-4">
                                              <div className="font-bold text-gray-700">{subjectLabel}</div>
                                              <div className="text-[10px] text-gray-400 hidden md:block">{subjectFull}</div>
                                          </td>
                                          {[1, 2, 3, 4, 5].map(sem => {
                                              const score = getScore(student, key, sem);
                                              return (
                                                  <td key={sem} className="p-4 text-center border-l border-gray-50">
                                                      {score > 0 ? (
                                                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getScoreColor(Number(score))}`}>
                                                              {score}
                                                          </span>
                                                      ) : <span className="text-gray-300">-</span>}
                                                  </td>
                                              );
                                          })}
                                          <td className="p-4 text-center font-bold text-gray-800 bg-gray-50/50 border-l border-gray-100">
                                              {avg > 0 ? avg : '-'}
                                          </td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                          {/* Footer for Semester Averages */}
                          <tfoot className="bg-gray-50/80 border-t border-gray-200 font-bold text-sm">
                              <tr>
                                  <td colSpan={2} className="p-4 text-right uppercase text-xs text-gray-500">Rata-rata Semester</td>
                                  {[1, 2, 3, 4, 5].map(sem => {
                                      const semAvg = calculateSemesterAvg(student, sem);
                                      return (
                                          <td key={sem} className="p-4 text-center text-purple-700 border-l border-gray-200">
                                              {semAvg > 0 ? semAvg : '-'}
                                          </td>
                                      );
                                  })}
                                  <td className="p-4 text-center bg-gray-100 border-l border-gray-200 text-purple-800 font-black text-lg">
                                      {totalAvg}
                                  </td>
                              </tr>
                          </tfoot>
                      </table>
                  </div>
              </div>
          </div>
      );
  }

  // --- UNIFIED VIEW (ADMIN/GURU) ---
  return (
    <div className="flex flex-col h-full animate-fade-in space-y-4">
        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 w-full xl:w-auto">
                <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-2 rounded-lg font-bold text-sm border border-purple-100">
                    <Calculator className="w-4 h-4" /> Rekap 5 Semester
                </div>
                
                {/* View Mode Toggle */}
                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button 
                        onClick={() => setViewMode('SUMMARY')} 
                        className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'SUMMARY' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <LayoutList className="w-3 h-3" /> Rata-rata
                    </button>
                    <button 
                        onClick={() => setViewMode('DETAIL')} 
                        className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'DETAIL' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <TableProperties className="w-3 h-3" /> Detail Semester
                    </button>
                </div>

                {userRole === 'ADMIN' && (
                    <select className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium" value={dbClassFilter} onChange={(e) => setDbClassFilter(e.target.value)}>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c === 'ALL' ? 'Semua Kelas' : `Kelas ${c}`}</option>)}
                    </select>
                )}
            </div>
            
            <div className="flex gap-2 w-full xl:w-auto">
                <button onClick={handleDownloadExcel} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-2 whitespace-nowrap"><FileSpreadsheet className="w-4 h-4" /> Excel</button>
            </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1 w-full pb-32" id="recap-5-sem-table">
                <table className="border-collapse min-w-full text-sm">
                    <thead className="bg-purple-50 border-b border-purple-200 sticky top-0 z-10 shadow-sm text-purple-800 uppercase text-xs">
                        {viewMode === 'SUMMARY' ? (
                            // --- SUMMARY HEADER ---
                            <tr>
                                <th className="px-4 py-3 text-center w-12 border border-purple-200 sticky left-0 bg-purple-50 z-20">No</th>
                                <th className="px-4 py-3 text-left min-w-[200px] border border-purple-200 sticky left-[48px] bg-purple-50 z-20 shadow-md">Nama Siswa</th>
                                <th className="px-4 py-3 text-center border border-purple-200">Kelas</th>
                                {selected5SemSubjects.map(key => (
                                    <th key={key} className="px-2 py-3 text-center min-w-[80px] bg-purple-100/50 border border-purple-200">
                                        {SUBJECT_MAP.find(s => s.key === key)?.label} <br/><span className="text-[9px] opacity-70">(Rata2)</span>
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-center bg-purple-200/50 border border-purple-200">Total Rata-rata</th>
                            </tr>
                        ) : (
                            // --- DETAIL HEADER ---
                            <>
                                <tr>
                                    <th className="px-4 py-3 text-center w-12 border border-purple-200 sticky left-0 bg-purple-50 z-20" rowSpan={2}>No</th>
                                    <th className="px-4 py-3 text-left min-w-[200px] border border-purple-200 sticky left-[48px] bg-purple-50 z-20 shadow-md" rowSpan={2}>Nama Siswa</th>
                                    <th className="px-4 py-3 text-center border border-purple-200 w-20" rowSpan={2}>Kelas</th>
                                    {[1, 2, 3, 4, 5].map(sem => (
                                        <th key={sem} className="px-2 py-2 text-center border border-purple-200 font-black bg-purple-100/50" colSpan={selected5SemSubjects.length + 1}>
                                            Semester {sem}
                                        </th>
                                    ))}
                                </tr>
                                <tr>
                                    {[1, 2, 3, 4, 5].map(sem => (
                                        <React.Fragment key={sem}>
                                            {selected5SemSubjects.map(key => {
                                                const label = SUBJECT_MAP.find(sub => sub.key === key)?.label || key;
                                                return (
                                                    <th key={`${sem}-${key}`} className="px-1 py-1 text-[9px] border border-purple-200 min-w-[50px] text-center whitespace-normal">
                                                        {label}
                                                    </th>
                                                );
                                            })}
                                            <th className="px-1 py-1 text-[9px] border border-purple-200 w-12 min-w-[50px] text-center bg-purple-100 font-bold">AVG</th>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </>
                        )}
                    </thead>
                    <tbody className="divide-y divide-purple-50">
                        {filteredStudents.length > 0 ? filteredStudents.map((student, idx) => {
                            if (viewMode === 'SUMMARY') {
                                // --- SUMMARY ROW ---
                                const totalAvg = calculateTotal5SemAvg(student);
                                return (
                                    <tr key={student.id} className="hover:bg-purple-50/30 transition-colors">
                                        <td className="px-4 py-2 text-center text-gray-500 border border-purple-100 sticky left-0 bg-white z-10">{idx + 1}</td>
                                        <td className="px-4 py-2 font-medium text-gray-900 border border-purple-100 sticky left-[48px] bg-white z-10 shadow-sm">
                                            <div>{student.fullName}</div>
                                            <div className="text-xs text-gray-400 font-mono">{student.nisn}</div>
                                        </td>
                                        <td className="px-4 py-2 text-center text-gray-500 border border-purple-100">{student.className}</td>
                                        {selected5SemSubjects.map(key => {
                                            const avg = calculate5SemAvg(student, key);
                                            return (
                                                <td key={key} className="px-2 py-2 text-center border border-purple-100">
                                                    <span className={`px-2 py-1 rounded text-xs ${getScoreColor(avg)}`}>
                                                        {avg > 0 ? avg : '-'}
                                                    </span>
                                                </td>
                                            );
                                        })}
                                        <td className="px-4 py-2 text-center font-bold text-purple-700 bg-purple-50/30 border border-purple-100">
                                            <span className={`px-2 py-1 rounded ${getScoreColor(totalAvg)}`}>
                                                {totalAvg > 0 ? totalAvg : '-'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            } else {
                                // --- DETAIL ROW ---
                                return (
                                    <tr key={student.id} className="hover:bg-purple-50/30 transition-colors">
                                        <td className="px-4 py-2 text-center text-gray-500 border border-purple-100 sticky left-0 bg-white z-10">{idx + 1}</td>
                                        <td className="px-4 py-2 font-medium text-gray-900 border border-purple-100 sticky left-[48px] bg-white z-10 shadow-sm min-w-[200px]">
                                            <div>{student.fullName}</div>
                                            <div className="text-xs text-gray-400 font-mono">{student.nisn}</div>
                                        </td>
                                        <td className="px-4 py-2 text-center text-gray-500 border border-purple-100 text-xs">{student.className}</td>
                                        
                                        {[1, 2, 3, 4, 5].map(sem => {
                                            const semAvg = calculateSemesterAvg(student, sem);
                                            return (
                                                <React.Fragment key={sem}>
                                                    {selected5SemSubjects.map(key => {
                                                        const score = Number(getScore(student, key, sem));
                                                        return (
                                                            <td key={`${sem}-${key}`} className="px-1 py-2 text-center border border-purple-100 min-w-[40px]">
                                                                <span className={`text-[10px] ${getScoreColor(score)} px-1 rounded`}>{score > 0 ? score : '-'}</span>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-1 py-2 text-center font-bold border border-purple-100 bg-purple-50/50">
                                                        <span className={`text-[10px] ${getScoreColor(semAvg)} px-1 rounded`}>{semAvg > 0 ? semAvg : '-'}</span>
                                                    </td>
                                                </React.Fragment>
                                            );
                                        })}
                                    </tr>
                                );
                            }
                        }) : (
                            <tr><td colSpan={viewMode === 'SUMMARY' ? selected5SemSubjects.length + 4 : selected5SemSubjects.length * 5 + 10} className="p-8 text-center text-gray-500">Tidak ada data siswa.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default RecapView;
