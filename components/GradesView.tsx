import React, { useState, useEffect, useRef } from 'react';
import { Student, AcademicRecord, CorrectionRequest } from '../types';
import { Search, FileSpreadsheet, Download, UploadCloud, Trash2, Save, Pencil, X, CheckCircle2, Loader2, LayoutList, ArrowLeft, Printer, FileDown, AlertTriangle, Eye, Activity, School } from 'lucide-react';
import { api } from '../services/api';

interface GradesViewProps {
  students: Student[];
  userRole?: 'ADMIN' | 'STUDENT' | 'GURU';
  loggedInStudent?: Student;
  onUpdate?: () => void;
}

const CLASS_LIST = ['VII A', 'VII B', 'VII C', 'VIII A', 'VIII B', 'VIII C', 'IX A', 'IX B', 'IX C'];

const GradesView: React.FC<GradesViewProps> = ({ students, userRole = 'ADMIN', loggedInStudent, onUpdate }) => {
  const [viewMode, setViewMode] = useState<'REPORT' | 'DATABASE'>('DATABASE');
  const [searchTerm, setSearchTerm] = useState('');
  const [dbClassFilter, setDbClassFilter] = useState<string>('ALL');
  const [dbSemester, setDbSemester] = useState<number>(1); 
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [renderKey, setRenderKey] = useState(0); 
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScores, setEditScores] = useState<Record<string, number>>({});
  // New States for Extras/Attendance/Promotion
  const [editAttendance, setEditAttendance] = useState({ sick: 0, permitted: 0, noReason: 0 });
  const [editExtra, setEditExtra] = useState('');
  const [editPromotion, setEditPromotion] = useState('');

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

  // Force view for Student (Initial Only)
  useEffect(() => {
      if (userRole === 'STUDENT' && loggedInStudent && viewMode !== 'REPORT') {
          setViewMode('REPORT');
          setSelectedStudent(loggedInStudent);
      }
  }, [userRole, loggedInStudent]); 

  const effectiveStudents = (userRole === 'STUDENT' && loggedInStudent) ? [loggedInStudent] : students;

  const filteredStudents = effectiveStudents.filter(s => {
      const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.nisn.includes(searchTerm);
      const matchClass = userRole === 'STUDENT' ? true : (dbClassFilter === 'ALL' || s.className === dbClassFilter);
      return matchSearch && matchClass;
  });

  const getScore = (s: Student, subjKey: string, semesterOverride?: number) => {
      const sem = semesterOverride || dbSemester;
      const record = s.academicRecords?.[sem];
      if (!record) return 0;
      
      const mapItem = SUBJECT_MAP.find(m => m.key === subjKey);
      const subj = record.subjects.find(sub => {
           // Robust matching: Check Exact Full Name OR Starts With Key OR Special Cases
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

  const getRecord = (s: Student): AcademicRecord | undefined => {
      return s.academicRecords?.[dbSemester];
  };

  const setScore = (s: Student, subjKey: string, val: number) => {
      if (userRole === 'GURU') return; 

      if (!s.academicRecords) s.academicRecords = {};
      if (!s.academicRecords[dbSemester]) {
          const level = (dbSemester <= 2) ? 'VII' : (dbSemester <= 4) ? 'VIII' : 'IX';
          s.academicRecords[dbSemester] = { 
              semester: dbSemester, classLevel: level, phase: 'D', year: '2024', 
              subjects: [], p5Projects: [], extracurriculars: [], teacherNote: '', promotionStatus: '', 
              attendance: { sick: 0, permitted: 0, noReason: 0 } 
          };
      }

      const record = s.academicRecords[dbSemester];
      const mapItem = SUBJECT_MAP.find(m => m.key === subjKey);
      
      let subj = record.subjects.find(sub => {
           if (mapItem) {
               return sub.subject === mapItem.full || 
                      sub.subject === mapItem.key ||
                      sub.subject.startsWith(mapItem.key) || 
                      (mapItem.key === 'PAI' && sub.subject.includes('Agama'));
           }
           return sub.subject.startsWith(subjKey);
      });
      
      if (subj) {
          subj.score = val;
      } else {
          // Use full name for new entries if available
          const subjectName = mapItem ? mapItem.full : (subjKey === 'PAI' ? 'Pendidikan Agama' : subjKey);
          record.subjects.push({ no: record.subjects.length + 1, subject: subjectName, score: val, competency: '-' });
      }
  };

  // --- EXCEL HANDLERS ---
  const handleDownloadTemplate = () => {
      try {
          // @ts-ignore
          const xlsx = window.XLSX;
          if (!xlsx) { alert("Library Excel belum siap."); return; }

          const headers = [
              "No", "Nama Siswa", "NISN", "Kelas", 
              ...SUBJECT_MAP.map(s => s.label),
              "Ekstrakurikuler", "Sakit", "Izin", "Alfa", "Keterangan Naik (NAIK/TINGGAL)"
          ];

          const dataRows = filteredStudents.map((s, idx) => {
              const record = getRecord(s);
              const row: any = {
                  "No": idx + 1,
                  "Nama Siswa": s.fullName,
                  "NISN": s.nisn,
                  "Kelas": s.className
              };
              SUBJECT_MAP.forEach(sub => { row[sub.label] = getScore(s, sub.key) || 0; });
              row["Ekstrakurikuler"] = record?.extracurriculars?.[0]?.name || '';
              row["Sakit"] = record?.attendance?.sick || 0;
              row["Izin"] = record?.attendance?.permitted || 0;
              row["Alfa"] = record?.attendance?.noReason || 0;
              row["Keterangan Naik (NAIK/TINGGAL)"] = record?.promotionStatus || '';
              return row;
          });

          const ws = xlsx.utils.json_to_sheet(dataRows, { header: headers });
          const wb = xlsx.utils.book_new();
          xlsx.utils.book_append_sheet(wb, ws, `Nilai Sem ${dbSemester}`);
          xlsx.writeFile(wb, `Template_Nilai_Sem${dbSemester}.xlsx`);
      } catch (e) { alert("Gagal mendownload template."); }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsImporting(true);
      const reader = new FileReader();
      
      reader.onload = async (evt) => {
          try {
              const buffer = evt.target?.result;
              // @ts-ignore
              const wb = window.XLSX.read(buffer, { type: 'array' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              // @ts-ignore
              const data = window.XLSX.utils.sheet_to_json(ws);

              // Map untuk optimasi pencarian siswa (O(1) lookup)
              const studentMapByNISN = new Map<string, Student>();
              const studentMapByName = new Map<string, Student>();
              
              students.forEach(s => {
                  studentMapByNISN.set(String(s.nisn).trim(), s);
                  studentMapByName.set(s.fullName.toLowerCase().trim(), s);
              });

              const studentsToUpdate: Student[] = [];
              let updatedCount = 0;

              // Helper untuk membersihkan nilai string angka (misal "80,5" -> 80.5)
              const parseScore = (val: any): number => {
                  if (val === undefined || val === null || val === '') return 0;
                  if (typeof val === 'number') return val;
                  const str = String(val).replace(',', '.').trim();
                  const num = parseFloat(str);
                  return isNaN(num) ? 0 : num;
              };

              // Helper untuk mencocokkan key kolom dengan fleksibel
              const findValueByKey = (row: any, keys: string[]) => {
                  const rowKeys = Object.keys(row);
                  for (const key of keys) {
                      const foundKey = rowKeys.find(rk => rk.trim().toUpperCase() === key.toUpperCase());
                      if (foundKey) return row[foundKey];
                  }
                  for (const key of keys) {
                      const foundKey = rowKeys.find(rk => rk.trim().toUpperCase().includes(key.toUpperCase()));
                      if (foundKey) return row[foundKey];
                  }
                  return undefined;
              };

              // Loop data dan collect updates
              for (const row of (data as any[])) {
                  let nisn = String(row['NISN'] || row['Nisn'] || row['nisn'] || '').trim();
                  let student = studentMapByNISN.get(nisn);
                  
                  if (!student && row['Nama Siswa']) {
                      student = studentMapByName.get(String(row['Nama Siswa']).toLowerCase().trim());
                  }

                  if (student) {
                      // 1. Pastikan Record Ada
                      if (!student.academicRecords) student.academicRecords = {};
                      if (!student.academicRecords[dbSemester]) {
                          const level = (dbSemester <= 2) ? 'VII' : (dbSemester <= 4) ? 'VIII' : 'IX';
                          student.academicRecords[dbSemester] = { 
                              semester: dbSemester, classLevel: level, phase: 'D', year: '2024', 
                              subjects: [], p5Projects: [], extracurriculars: [], teacherNote: '', promotionStatus: '', 
                              attendance: { sick: 0, permitted: 0, noReason: 0 } 
                          };
                      }
                      
                      const record = student.academicRecords[dbSemester];
                      let hasChanges = false;

                      // 2. Update Nilai Mapel
                      SUBJECT_MAP.forEach(sub => {
                          const val = findValueByKey(row, [sub.label, sub.key, sub.full]);
                          if (val !== undefined) {
                              const numVal = parseScore(val);
                              if (numVal >= 0 && numVal <= 100) {
                                  // Fix: Match against Full Name AND Key to cover all cases (IPA/IPS issue fix)
                                  let subj = record.subjects.find(s => 
                                      s.subject === sub.full || 
                                      s.subject === sub.key || 
                                      s.subject.startsWith(sub.key) || 
                                      (sub.key === 'PAI' && s.subject.includes('Agama'))
                                  );
                                  
                                  if (subj) {
                                      if (subj.score !== numVal) { subj.score = numVal; hasChanges = true; }
                                  } else {
                                      // Prefer Full Name for new records
                                      record.subjects.push({ no: record.subjects.length + 1, subject: sub.full, score: numVal, competency: '-' });
                                      hasChanges = true;
                                  }
                              }
                          }
                      });

                      // 3. Update Extras & Attendance
                      const extraVal = findValueByKey(row, ['Ekstrakurikuler', 'Ekskul']);
                      if (extraVal) { record.extracurriculars = [{ name: String(extraVal), score: 'A' }]; hasChanges = true; }
                      
                      const sickVal = findValueByKey(row, ['Sakit', 'S']);
                      if (sickVal !== undefined) { record.attendance.sick = Number(sickVal); hasChanges = true; }
                      
                      const permVal = findValueByKey(row, ['Izin', 'I']);
                      if (permVal !== undefined) { record.attendance.permitted = Number(permVal); hasChanges = true; }
                      
                      const alfaVal = findValueByKey(row, ['Alfa', 'A', 'Tanpa Keterangan']);
                      if (alfaVal !== undefined) { record.attendance.noReason = Number(alfaVal); hasChanges = true; }
                      
                      const promVal = findValueByKey(row, ['Keterangan Naik', 'Keterangan']);
                      if (promVal) { record.promotionStatus = String(promVal); hasChanges = true; }

                      // 4. Masukkan ke antrian update jika ada perubahan
                      if (hasChanges) {
                          studentsToUpdate.push(student);
                          updatedCount++;
                      }
                  }
              }

              // --- BULK UPDATE ---
              if (studentsToUpdate.length > 0) {
                  // Gunakan fungsi bulk update yang baru di API
                  await api.updateStudentsBulk(studentsToUpdate);
                  alert(`Berhasil mengimport dan menyimpan nilai untuk ${updatedCount} siswa.`);
              } else {
                  alert("Tidak ada data siswa yang perlu diupdate.");
              }

              setRenderKey(prev => prev + 1);
              if (onUpdate) onUpdate();

          } catch (error: any) {
              console.error(error);
              if (error.message?.includes("Unsupported ZIP encryption")) {
                  alert("Gagal: File Excel dilindungi password. Harap hilangkan password sebelum upload.");
              } else {
                  alert("Gagal membaca file Excel. Pastikan format sesuai template.");
              }
          } finally {
              setIsImporting(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      };
      
      // Gunakan readAsArrayBuffer agar lebih stabil untuk file Excel biner
      reader.readAsArrayBuffer(file);
  };

  const startEdit = (s: Student) => {
      if (userRole === 'GURU') return;
      setEditingId(s.id);
      const initialScores: any = {};
      SUBJECT_MAP.forEach(sub => initialScores[sub.key] = getScore(s, sub.key));
      setEditScores(initialScores);
      const record = getRecord(s);
      setEditAttendance(record?.attendance || { sick: 0, permitted: 0, noReason: 0 });
      setEditExtra(record?.extracurriculars?.[0]?.name || '');
      setEditPromotion(record?.promotionStatus || '');
  };

  const saveEdit = (s: Student) => {
      SUBJECT_MAP.forEach(sub => setScore(s, sub.key, editScores[sub.key]));
      if (!s.academicRecords) s.academicRecords = {};
      if (s.academicRecords[dbSemester]) {
          const rec = s.academicRecords[dbSemester];
          rec.attendance = editAttendance;
          rec.extracurriculars = editExtra ? [{ name: editExtra, score: 'A' }] : [];
          if ([2, 4, 6].includes(dbSemester)) { rec.promotionStatus = editPromotion; } else { rec.promotionStatus = ''; }
      }
      setEditingId(null);
      setRenderKey(prev => prev + 1);
      // Panggil API update manual saat save edit (single update is fine here)
      api.updateStudent(s).then(() => {
          if (onUpdate) onUpdate();
      });
  };

  const handleViewReport = (s: Student) => { setSelectedStudent(s); setViewMode('REPORT'); };
  
  const handlePrint = () => { window.print(); };

  const handleDownloadPDF = () => {
      if (!selectedStudent) return;
      setIsGeneratingPdf(true);
      
      const element = document.getElementById('report-content');
      const filename = `Rapor_S${dbSemester}_${selectedStudent.fullName.replace(/\s+/g, '_')}.pdf`;

      // @ts-ignore
      const html2pdf = window.html2pdf;
      if (!html2pdf) { 
          alert("Library PDF belum siap."); 
          setIsGeneratingPdf(false);
          return; 
      }

      const opt = {
          margin: 0,
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(element).save().then(() => {
          setIsGeneratingPdf(false);
      });
  };

  // --- REPORT VIEW (UPDATED TO MATCH IMAGE) ---
  const ReportView = ({ student }: { student: Student }) => {
      const record = student.academicRecords?.[dbSemester];
      
      if (!record) {
          return (
              <div className="flex flex-col items-center justify-center h-full p-10 bg-white rounded-xl shadow-sm border border-gray-200">
                  <Activity className="w-16 h-16 text-gray-200 mb-4" />
                  <h3 className="text-lg font-bold text-gray-700">Data Akademik Belum Tersedia</h3>
                  {userRole === 'ADMIN' && <button onClick={() => setViewMode('DATABASE')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">Input Nilai</button>}
              </div>
          );
      }

      return (
          <div id="report-content" className="bg-white shadow-xl min-h-[297mm] w-[210mm] mx-auto p-[10mm] text-black font-sans relative print:shadow-none print:w-full print:m-0 print:p-0 box-border">
              {/* Header Identity */}
              <div className="text-xs mb-4">
                  <table className="w-full">
                      <tbody>
                          <tr><td className="w-32 py-0.5">Nama Peserta Didik</td><td>: {student.fullName}</td><td className="w-24">Kelas</td><td>: {student.className}</td></tr>
                          <tr><td className="py-0.5">NISN / NIS</td><td>: {student.nisn} / {student.nis}</td><td>Fase</td><td>: D</td></tr>
                          <tr><td className="py-0.5">Sekolah</td><td>: SMP NEGERI 3 PACET</td><td>Semester</td><td>: {dbSemester} (2024-2025)</td></tr>
                          <tr><td className="py-0.5" valign="top">Alamat</td><td colSpan={3}>: {student.address}</td></tr>
                      </tbody>
                  </table>
              </div>

              {/* A. INTRAKURIKULER */}
              <div className="mb-4">
                  <h3 className="font-bold text-sm mb-1">A. INTRAKURIKULER</h3>
                  <table className="w-full border-collapse border border-black text-xs">
                      <thead className="bg-black text-white text-center">
                          <tr>
                              <th className="border border-black p-1 w-8">NO</th>
                              <th className="border border-black p-1">MATA PELAJARAN</th>
                              <th className="border border-black p-1 w-16">NILAI AKHIR</th>
                              <th className="border border-black p-1">CAPAIAN KOMPETENSI</th>
                          </tr>
                      </thead>
                      <tbody>
                          {record.subjects.length > 0 ? record.subjects.map((sub, idx) => (
                              <tr key={idx} className={idx % 2 !== 0 ? 'bg-gray-100' : ''}>
                                  <td className="border border-black p-1 text-center">{idx + 1}</td>
                                  <td className="border border-black p-1">{sub.subject}</td>
                                  <td className="border border-black p-1 text-center font-bold">{sub.score}</td>
                                  <td className="border border-black p-1 text-[10px]">{sub.competency || '-'}</td>
                              </tr>
                          )) : <tr><td colSpan={4} className="border border-black p-2 text-center">-</td></tr>}
                      </tbody>
                  </table>
              </div>

              {/* B. P5 */}
              <div className="mb-4">
                  <h3 className="font-bold text-sm mb-1">B. DESKRIPSI NILAI P5</h3>
                  <table className="w-full border-collapse border border-black text-xs">
                      <thead className="bg-black text-white text-center">
                          <tr>
                              <th className="border border-black p-1 w-8">NO</th>
                              <th className="border border-black p-1 w-1/3">TEMA</th>
                              <th className="border border-black p-1">DESKRIPSI</th>
                          </tr>
                      </thead>
                      <tbody>
                          {record.p5Projects && record.p5Projects.length > 0 ? record.p5Projects.map((p, idx) => (
                              <tr key={idx} className={idx % 2 !== 0 ? 'bg-gray-100' : ''}>
                                  <td className="border border-black p-1 text-center">{idx + 1}</td>
                                  <td className="border border-black p-1">{p.theme}</td>
                                  <td className="border border-black p-1 text-[10px]">{p.description}</td>
                              </tr>
                          )) : (
                              <>
                                  <tr className="bg-gray-100"><td className="border border-black p-1 text-center">1</td><td className="border border-black p-1">Suara Demokrasi</td><td className="border border-black p-1">Berkembang sesuai harapan</td></tr>
                                  <tr><td className="border border-black p-1 text-center">2</td><td className="border border-black p-1">-</td><td className="border border-black p-1">-</td></tr>
                              </>
                          )}
                      </tbody>
                  </table>
              </div>

              {/* C. EKSTRAKURIKULER */}
              <div className="mb-4 w-1/2">
                  <h3 className="font-bold text-sm mb-1">C. EKSTRAKURIKULER</h3>
                  <table className="w-full border-collapse border border-black text-xs">
                      <thead className="bg-black text-white text-left">
                          <tr>
                              <th className="border border-black p-1 w-8 text-center">NO</th>
                              <th className="border border-black p-1">KEGIATAN EKSTRAKURIKULER</th>
                              <th className="border border-black p-1 w-16 text-center">PREDIKAT</th>
                          </tr>
                      </thead>
                      <tbody>
                          {record.extracurriculars && record.extracurriculars.length > 0 ? (
                              record.extracurriculars.map((ex, idx) => (
                                  <tr key={idx} className={idx % 2 !== 0 ? 'bg-gray-100' : ''}>
                                      <td className="border border-black p-1 text-center">{idx + 1}</td>
                                      <td className="border border-black p-1">{ex.name}</td>
                                      <td className="border border-black p-1 text-center">{ex.score}</td>
                                  </tr>
                              ))
                          ) : (
                              <>
                                <tr className="bg-gray-100"><td className="border border-black p-1 text-center">1</td><td className="border border-black p-1">Pramuka</td><td className="border border-black p-1 text-center">-</td></tr>
                                <tr><td className="border border-black p-1 text-center">2</td><td className="border border-black p-1">-</td><td className="border border-black p-1 text-center">-</td></tr>
                              </>
                          )}
                      </tbody>
                  </table>
              </div>

              {/* D. CATATAN WALI KELAS */}
              <div className="mb-4">
                  <h3 className="font-bold text-sm mb-1 pl-1 border-l-4 border-green-600">D. CATATAN WALI KELAS</h3>
                  <div className="border border-black bg-gray-200 p-2 text-xs min-h-[40px]">
                      {record.teacherNote || 'Pertahankan Prestasimu belajarmu!'}
                  </div>
              </div>

              {/* E. KENAIKAN KELAS & F. KETIDAKHADIRAN */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                  <div>
                      <h3 className="font-bold text-sm mb-1">KENAIKAN KELAS</h3>
                      <div className="border border-black p-2 bg-gray-100 text-xs h-full">
                          {[2, 4, 6].includes(dbSemester) ? (
                              <>
                                <p>Naik Kelas : {record.promotionStatus === 'NAIK' ? `YA (Ke Kelas ${student.className.includes('VII') ? 'VIII' : 'IX'})` : '-'}</p>
                                <p>Tanggal : 20 Juni 2025</p>
                              </>
                          ) : (
                              <p className="text-gray-400 italic">Hanya muncul di semester genap</p>
                          )}
                      </div>
                  </div>
                  <div>
                      <h3 className="font-bold text-sm mb-1">KETIDAKHADIRAN</h3>
                      <table className="w-full border-collapse border border-black text-xs">
                          <tbody>
                              <tr><td className="border border-black p-1 w-8 text-center">1.</td><td className="border border-black p-1">Sakit</td><td className="border border-black p-1 w-10 text-center">{record.attendance.sick}</td><td className="border border-black p-1 w-10">Hari</td></tr>
                              <tr><td className="border border-black p-1 w-8 text-center">2.</td><td className="border border-black p-1">Ijin</td><td className="border border-black p-1 w-10 text-center">{record.attendance.permitted}</td><td className="border border-black p-1 w-10">Hari</td></tr>
                              <tr><td className="border border-black p-1 w-8 text-center">3.</td><td className="border border-black p-1">Tanpa Keterangan</td><td className="border border-black p-1 w-10 text-center">{record.attendance.noReason}</td><td className="border border-black p-1 w-10">Hari</td></tr>
                          </tbody>
                      </table>
                  </div>
              </div>

              {/* Footer Signatures */}
              <div className="flex justify-between items-start text-xs font-bold mt-8 bg-gray-200 p-4 border border-gray-300">
                  <div className="text-center w-1/3">
                      <p className="mb-16 uppercase">Kepala Sekolah</p>
                      <p className="underline">DIDIK SULISTYO, M.M.Pd</p>
                      <p>NIP. 19660518 198901 1 002</p>
                  </div>
                  <div className="text-center w-1/3">
                      <p className="mb-16">Wali Kelas</p>
                      <p className="underline">#NAMA_WALI_KELAS#</p>
                      <p>NIP. -</p>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in relative">
      <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx" onChange={handleImportExcel} />

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden">
        <div className="flex gap-2 w-full xl:w-auto">
             <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
                {userRole === 'ADMIN' && (
                    <button onClick={() => setViewMode('DATABASE')} className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm border transition-colors ${viewMode === 'DATABASE' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-gray-600'}`}>
                        <FileSpreadsheet className="w-4 h-4" /> <span>Input Nilai</span>
                    </button>
                )}
                {userRole === 'ADMIN' && (
                    <>
                        <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm border bg-white text-gray-600 hover:bg-gray-50">
                            <Download className="w-4 h-4" /> Template
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm border bg-white text-blue-600 border-blue-200 hover:bg-blue-50">
                            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />} Import Excel
                        </button>
                    </>
                )}

                {userRole === 'GURU' && <div className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm border bg-gray-50 text-gray-500"><Eye className="w-4 h-4" /> Mode Lihat (Guru)</div>}
                {userRole === 'STUDENT' && <div className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm border bg-blue-50 text-blue-600 border-blue-100"><LayoutList className="w-4 h-4" /> Rapor Saya</div>}
                
                {(userRole === 'ADMIN' || userRole === 'GURU') && (
                    <select className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium" value={dbClassFilter} onChange={(e) => setDbClassFilter(e.target.value)}>
                        <option value="ALL">Semua Kelas</option>
                        {CLASS_LIST.map(c => <option key={c} value={c}>Kelas {c}</option>)}
                    </select>
                )}

                <select className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium" value={dbSemester} onChange={(e) => setDbSemester(Number(e.target.value))}>
                    {[1, 2, 3, 4, 5, 6].map(sem => (<option key={sem} value={sem}>Semester {sem}</option>))}
                </select>
            </div>
        </div>
        
        {/* Detail View Controls */}
        {viewMode === 'REPORT' && (
            <div className="flex items-center gap-2">
                <button onClick={() => { setViewMode('DATABASE'); setSelectedStudent(null); }} className="p-2 hover:bg-gray-100 rounded text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
                <button onClick={handleDownloadPDF} disabled={isGeneratingPdf} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                    {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} Download PDF
                </button>
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-bold hover:bg-black"><Printer className="w-4 h-4" /> Cetak Rapor</button>
            </div>
        )}
      </div>

      {/* Main Content */}
      <div className={`bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col relative ${viewMode === 'REPORT' ? 'bg-gray-100' : ''}`}>
          {viewMode === 'DATABASE' ? (
              <div className="overflow-auto flex-1 w-full pb-32">
                  {/* Database Table Code - Unchanged logic */}
                  <table className="border-collapse w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm text-gray-600 uppercase text-xs">
                          <tr>
                              <th className="px-4 py-3 text-left w-16 bg-gray-50 sticky left-0 z-20">Aksi</th>
                              <th className="px-4 py-3 text-left min-w-[200px] bg-gray-50 sticky left-[64px] z-20">Nama Siswa</th>
                              {SUBJECT_MAP.map(sub => <th key={sub.key} className="px-2 py-3 text-center min-w-[50px]">{sub.label}</th>)}
                              <th className="px-2 py-3 text-center min-w-[120px]">Ekstrakurikuler</th>
                              <th className="px-2 py-3 text-center min-w-[40px]">S</th><th className="px-2 py-3 text-center min-w-[40px]">I</th><th className="px-2 py-3 text-center min-w-[40px]">A</th>
                              {[2, 4, 6].includes(dbSemester) && <th className="px-4 py-3 text-center min-w-[120px]">Ket. Naik Kelas</th>}
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredStudents.length > 0 ? filteredStudents.map((student) => {
                              const isEditingRow = editingId === student.id;
                              const record = getRecord(student);
                              return (
                                  <tr key={student.id + renderKey} className="hover:bg-blue-50 transition-colors group">
                                      <td className="px-4 py-2 flex gap-1 items-center sticky left-0 bg-white z-10 group-hover:bg-blue-50">
                                          {isEditingRow ? (
                                              <><button onClick={() => saveEdit(student)} className="p-1.5 bg-green-100 text-green-700 rounded"><Save className="w-4 h-4" /></button><button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-100 text-gray-600 rounded"><X className="w-4 h-4" /></button></>
                                          ) : (
                                              <><button onClick={() => startEdit(student)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title="Edit"><Pencil className="w-4 h-4" /></button><button onClick={() => handleViewReport(student)} className="p-1.5 text-purple-600 hover:bg-purple-100 rounded" title="Rapor"><LayoutList className="w-4 h-4" /></button></>
                                          )}
                                      </td>
                                      <td className="px-4 py-2 font-medium text-gray-900 sticky left-[64px] bg-white z-10 group-hover:bg-blue-50"><div>{student.fullName}</div><div className="text-xs text-gray-400 font-mono">{student.className}</div></td>
                                      {SUBJECT_MAP.map(sub => { const score = isEditingRow ? (editScores[sub.key] || 0) : getScore(student, sub.key); return <td key={sub.key} className="px-2 py-2 text-center">{isEditingRow ? <input type="number" className="w-10 text-center border rounded p-1 text-xs" value={editScores[sub.key] || 0} onChange={(e) => setEditScores({...editScores, [sub.key]: Number(e.target.value)})} /> : <span className={`font-semibold ${score < 75 && score > 0 ? 'text-red-500' : 'text-gray-700'}`}>{score || '-'}</span>}</td>; })}
                                      <td className="px-2 py-2 text-center">{isEditingRow ? <input type="text" className="w-full text-xs border rounded p-1" value={editExtra} onChange={(e)=>setEditExtra(e.target.value)} /> : <span className="text-xs">{record?.extracurriculars?.[0]?.name || '-'}</span>}</td>
                                      <td className="px-2 py-2 text-center">{isEditingRow ? <input type="number" className="w-8 text-center text-xs border rounded" value={editAttendance.sick} onChange={(e)=>setEditAttendance({...editAttendance, sick: Number(e.target.value)})} /> : record?.attendance?.sick || 0}</td>
                                      <td className="px-2 py-2 text-center">{isEditingRow ? <input type="number" className="w-8 text-center text-xs border rounded" value={editAttendance.permitted} onChange={(e)=>setEditAttendance({...editAttendance, permitted: Number(e.target.value)})} /> : record?.attendance?.permitted || 0}</td>
                                      <td className="px-2 py-2 text-center">{isEditingRow ? <input type="number" className="w-8 text-center text-xs border rounded" value={editAttendance.noReason} onChange={(e)=>setEditAttendance({...editAttendance, noReason: Number(e.target.value)})} /> : record?.attendance?.noReason || 0}</td>
                                      {[2, 4, 6].includes(dbSemester) && <td className="px-2 py-2 text-center">{isEditingRow ? <select className="text-xs border rounded p-1 w-full" value={editPromotion} onChange={(e)=>setEditPromotion(e.target.value)}><option value="">- Pilih -</option><option value="NAIK">Naik Kelas</option><option value="TINGGAL">Tinggal Kelas</option>{dbSemester === 6 && <option value="LULUS">Lulus</option>}</select> : <span className="text-xs font-bold text-blue-600">{record?.promotionStatus || '-'}</span>}</td>}
                                  </tr>
                              );
                          }) : <tr><td colSpan={20} className="p-8 text-center text-gray-500">Tidak ada data.</td></tr>}
                      </tbody>
                  </table>
              </div>
          ) : (
              <div className="overflow-auto flex-1 bg-gray-500/10 p-4 md:p-8 flex justify-center pb-32">
                  {selectedStudent && <ReportView student={selectedStudent} />}
              </div>
          )}
      </div>
    </div>
  );
};

export default GradesView;