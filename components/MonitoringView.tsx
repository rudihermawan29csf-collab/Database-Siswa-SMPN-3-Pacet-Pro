
import React, { useState, useMemo, useEffect } from 'react';
import { Student } from '../types';
import { Search, Filter, AlertCircle, CheckCircle2, ChevronRight, BookOpen, ClipboardList, FolderOpen, FileText, ArrowLeft, Calendar, UserCheck, LayoutDashboard, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../services/api';

interface MonitoringViewProps {
  students: Student[];
  userRole: 'ADMIN' | 'STUDENT' | 'GURU';
  loggedInStudent?: Student;
}

// Function to fetch active document config from storage
const getActiveDocs = () => {
    try {
        const saved = localStorage.getItem('sys_doc_config');
        return saved ? JSON.parse(saved) : ['IJAZAH', 'AKTA', 'KK', 'KTP_AYAH', 'KTP_IBU', 'FOTO'];
    } catch (e) {
        return ['IJAZAH', 'AKTA', 'KK', 'KTP_AYAH', 'KTP_IBU', 'FOTO'];
    }
};

const getRaporPageCount = () => {
    try {
        const saved = localStorage.getItem('sys_rapor_config');
        return saved ? parseInt(saved) : 3;
    } catch {
        return 3;
    }
}

const analyzeStudent = (student: Student) => {
    // Dynamic settings
    const activeDocsId = getActiveDocs();
    const raporPageCount = getRaporPageCount();

    // 1. Bio (Buku Induk)
    const missingBioFields = [];
    if (!student.nisn) missingBioFields.push('NISN');
    if (!student.dapodik?.nik) missingBioFields.push('NIK'); // Safe Access
    if (!student.address || student.address === '-') missingBioFields.push('Alamat');
    if (!student.father.name || student.father.name === 'Nama Ayah') missingBioFields.push('Nama Ayah');
    if (!student.mother.name || student.mother.name === 'Nama Ibu') missingBioFields.push('Nama Ibu');
    const bioPercent = Math.round(((5 - missingBioFields.length) / 5) * 100);

    // 2. Grades (CHECK ALL 6 SEMESTERS for Monitoring)
    const allSemesters = [1, 2, 3, 4, 5, 6];
    const missingGradesSemesters = allSemesters.filter(sem => {
        return !(student.academicRecords && student.academicRecords[sem] && student.academicRecords[sem].subjects.length > 0);
    });
    const gradePercent = Math.round(((allSemesters.length - missingGradesSemesters.length) / allSemesters.length) * 100);

    // 3. Docs (Dynamic)
    const missingDocs = activeDocsId.filter((id: string) => !student.documents.find(d => d.category === id && d.status !== 'REVISION'));
    const docPercent = activeDocsId.length > 0 ? Math.round(((activeDocsId.length - missingDocs.length) / activeDocsId.length) * 100) : 100;

    // 4. Rapor Pages (Check ALL 6 Semesters based on Dynamic Config)
    const totalExpectedPages = 6 * raporPageCount;
    let totalUploadedPages = 0;

    allSemesters.forEach(sem => {
        const uploadedForSem = student.documents.filter(d => d.category === 'RAPOR' && d.subType?.semester === sem).length;
        totalUploadedPages += uploadedForSem;
    });

    // Cap uploaded pages to max expected per semester to prevent over-100% bugs if user uploads extra
    // Logic: we trust the simple count for monitoring purposes
    const raporPercent = totalExpectedPages > 0 ? Math.min(100, Math.round((totalUploadedPages / totalExpectedPages) * 100)) : 100;
    const missingRaporPages = Math.max(0, totalExpectedPages - totalUploadedPages);

    return {
        bioPercent,
        gradePercent,
        docPercent,
        raporPercent,
        missingBioFields,
        missingDocs,
        missingGradesSemesters,
        missingRaporPages,
        raporPageCount
    };
};

const ProgressRing = ({ percent, size = 30 }: { percent: number, size?: number }) => {
    const radius = size / 2 - 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percent / 100) * circumference;
    const color = percent === 100 ? 'text-green-500' : percent > 50 ? 'text-orange-500' : 'text-red-500';

    return (
      <div className="relative flex items-center justify-center">
          <svg width={size} height={size} className="transform -rotate-90">
              <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" className="text-gray-200" />
              <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} className={color} strokeLinecap="round" />
          </svg>
          <span className="absolute text-[8px] font-bold text-gray-700">{percent}%</span>
      </div>
    );
};

const StudentDetailCard: React.FC<{ student: Student }> = ({ student }) => {
    const analysis = analyzeStudent(student);
    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
            <div className="flex items-center gap-4 mb-6 border-b pb-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                    {student.fullName ? student.fullName.charAt(0) : '?'}
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-800">{student.fullName}</h3>
                    <p className="text-sm text-gray-500">{student.nisn} | Kelas {student.className}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-4 rounded-lg border ${analysis.bioPercent === 100 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-gray-700 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Buku Induk</h4>
                        <span className="text-xs font-bold">{analysis.bioPercent}%</span>
                    </div>
                    {analysis.missingBioFields.length > 0 ? (
                        <ul className="list-disc pl-4 text-xs text-red-700">
                            {analysis.missingBioFields.map(f => <li key={f}>{f} Kosong</li>)}
                        </ul>
                    ) : <div className="text-xs text-green-700 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Lengkap</div>}
                </div>

                <div className={`p-4 rounded-lg border ${analysis.gradePercent === 100 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-gray-700 flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Nilai (6 Sem)</h4>
                        <span className="text-xs font-bold">{analysis.gradePercent}%</span>
                    </div>
                    {analysis.missingGradesSemesters.length > 0 ? (
                        <ul className="list-disc pl-4 text-xs text-red-700">
                            {analysis.missingGradesSemesters.map(s => <li key={s}>Nilai S{s} Kosong</li>)}
                        </ul>
                    ) : <div className="text-xs text-green-700 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Lengkap</div>}
                </div>

                <div className={`p-4 rounded-lg border ${analysis.docPercent === 100 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-gray-700 flex items-center gap-2"><FolderOpen className="w-4 h-4" /> Dokumen</h4>
                        <span className="text-xs font-bold">{analysis.docPercent}%</span>
                    </div>
                    {analysis.missingDocs.length > 0 ? (
                        <ul className="list-disc pl-4 text-xs text-red-700">
                            {analysis.missingDocs.map((d: any) => <li key={d}>{d} Belum Ada</li>)}
                        </ul>
                    ) : <div className="text-xs text-green-700 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Lengkap</div>}
                </div>

                <div className={`p-4 rounded-lg border ${analysis.raporPercent === 100 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-gray-700 flex items-center gap-2"><FileText className="w-4 h-4" /> Rapor (S1-S6)</h4>
                        <span className="text-xs font-bold">{analysis.raporPercent}%</span>
                    </div>
                    {analysis.missingRaporPages > 0 ? (
                        <div className="text-xs text-red-700">Kurang {analysis.missingRaporPages} Halaman Total</div>
                    ) : <div className="text-xs text-green-700 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Lengkap</div>}
                </div>
            </div>
        </div>
    );
};

const MonitoringView: React.FC<MonitoringViewProps> = ({ students, userRole, loggedInStudent }) => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  
  // Force re-render to catch settings update
  const [_, setTick] = useState(0);
  useEffect(() => { setTick(t => t + 1) }, []);

  const uniqueClasses = Array.from(new Set(students.map(s => s.className))).sort();

  // Initialize selectedClass immediately
  useEffect(() => {
      if (uniqueClasses.length > 0 && !selectedClass) {
          setSelectedClass(uniqueClasses[0]);
      }
  }, [uniqueClasses]);

  const filteredStudents = useMemo(() => {
      if (userRole === 'STUDENT' && loggedInStudent) {
          return [loggedInStudent];
      }
      let filtered = students.filter(s => s.className === selectedClass);
      
      // SAFE SEARCH FILTER
      if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filtered = filtered.filter(s => {
              const name = (s.fullName || '').toLowerCase();
              const nisn = (s.nisn || '').toString();
              return name.includes(term) || nisn.includes(term);
          });
      }
      return filtered;
  }, [students, selectedClass, searchTerm, userRole, loggedInStudent]);

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><LayoutDashboard className="w-5 h-5 text-blue-600" /> Monitoring Data Siswa</h2>
            
            {userRole !== 'STUDENT' && (
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg border border-gray-200">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select 
                            className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer"
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                        >
                            {uniqueClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)}
                        </select>
                    </div>
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input type="text" placeholder="Cari Siswa..." className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>
            )}
        </div>

        <div className="flex-1 overflow-auto pb-32">
            {userRole === 'STUDENT' ? (
                filteredStudents.map(s => <StudentDetailCard key={s.id} student={s} />)
            ) : (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                            <tr>
                                <th className="px-6 py-4">Nama Siswa</th>
                                <th className="px-6 py-4 text-center">Buku Induk</th>
                                <th className="px-6 py-4 text-center">Nilai (6 Sem)</th>
                                <th className="px-6 py-4 text-center">Dokumen</th>
                                <th className="px-6 py-4 text-center">Rapor (S1-S6)</th>
                                <th className="px-6 py-4 text-right">Detail</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredStudents.length > 0 ? filteredStudents.map((s) => {
                                const analysis = analyzeStudent(s);
                                const totalPercent = Math.round((analysis.bioPercent + analysis.gradePercent + analysis.docPercent + analysis.raporPercent) / 4);
                                const isExpanded = expandedStudentId === s.id;

                                return (
                                    <React.Fragment key={s.id}>
                                        <tr className={`hover:bg-blue-50/50 group cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/30' : ''}`} onClick={() => setExpandedStudentId(isExpanded ? null : s.id)}>
                                            <td className="px-6 py-3">
                                                <div className="font-bold text-gray-800 text-sm">{s.fullName}</div>
                                                <div className="text-xs text-gray-500">{s.nisn}</div>
                                                {totalPercent < 100 && <span className="text-[10px] text-red-500 font-medium">Data Belum Lengkap</span>}
                                            </td>
                                            <td className="px-6 py-3 flex justify-center"><ProgressRing percent={analysis.bioPercent} /></td>
                                            <td className="px-6 py-3"><div className="flex justify-center"><ProgressRing percent={analysis.gradePercent} /></div></td>
                                            <td className="px-6 py-3"><div className="flex justify-center"><ProgressRing percent={analysis.docPercent} /></div></td>
                                            <td className="px-6 py-3"><div className="flex justify-center"><ProgressRing percent={analysis.raporPercent} /></div></td>
                                            <td className="px-6 py-3 text-right">
                                                <button className="text-xs font-bold text-blue-600 border border-blue-200 px-3 py-1 rounded bg-white hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-1 ml-auto">
                                                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                    Detail
                                                </button>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={6} className="p-4 bg-gray-50 border-b border-gray-200">
                                                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                                        <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><LayoutDashboard className="w-4 h-4"/> Detail Kelengkapan: {s.fullName}</h4>
                                                        
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                                            <div>
                                                                <p className="font-bold mb-1 text-gray-600">Buku Induk</p>
                                                                {analysis.missingBioFields.length > 0 ? (
                                                                    <ul className="list-disc pl-4 text-red-600">{analysis.missingBioFields.map(f => <li key={f}>{f}</li>)}</ul>
                                                                ) : <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Lengkap</span>}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold mb-1 text-gray-600">Nilai (6 Sem)</p>
                                                                {analysis.missingGradesSemesters.length > 0 ? (
                                                                    <ul className="list-disc pl-4 text-red-600">{analysis.missingGradesSemesters.map(s => <li key={s}>Sem {s} Kosong</li>)}</ul>
                                                                ) : <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Lengkap</span>}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold mb-1 text-gray-600">Dokumen</p>
                                                                {analysis.missingDocs.length > 0 ? (
                                                                    <ul className="list-disc pl-4 text-red-600">{analysis.missingDocs.map((d: any) => <li key={d}>{d}</li>)}</ul>
                                                                ) : <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Lengkap</span>}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold mb-1 text-gray-600">Rapor</p>
                                                                {analysis.missingRaporPages > 0 ? (
                                                                    <p className="text-red-600">Kurang {analysis.missingRaporPages} Halaman</p>
                                                                ) : <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Lengkap</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                        Tidak ada data siswa ditemukan.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    </div>
  );
};

export default MonitoringView;
