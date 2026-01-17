import React, { useState, useMemo } from 'react';
import { Student } from '../types';
import { Search, Printer, User, ArrowLeft, ChevronRight, School, FileDown, Loader2, Filter, Files } from 'lucide-react';

interface BukuIndukViewProps {
  students: Student[];
}

// --- HELPER COMPONENTS & FUNCTIONS ---

const formatClassName = (name: string) => {
    if (!name) return '-';
    return name.toLowerCase().startsWith('kelas') ? name : `Kelas ${name}`;
};

const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr; 
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return dateStr; }
};

const FormField = ({ label, value, labelCol = "w-1/3", valueCol = "flex-1", className = "" }: any) => (
    <div className={`flex border-b border-gray-300 min-h-[20px] ${className}`}>
        <div className={`${labelCol} px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px] flex items-center`}>
            {label}
        </div>
        <div className={`${valueCol} px-1.5 py-0.5 text-[9px] font-medium flex items-center uppercase leading-tight`}>
            {value || '-'}
        </div>
    </div>
);

const SubHeader = ({ children }: { children?: React.ReactNode }) => (
    <div className="bg-gray-300 px-2 py-0.5 text-[9px] font-bold border-y border-gray-400 text-center uppercase">
        {children}
    </div>
);

// --- REUSABLE TEMPLATE ---
const BukuIndukTemplate = ({ student }: { student: Student }) => {
    return (
        <div className="w-[190mm] bg-white p-5 flex flex-col font-serif shadow-xl text-[9px] leading-tight box-border relative page-break-inside-avoid">
            {/* HEADER */}
            <div className="border-2 border-black p-0.5 mb-1 bg-black">
                <h1 className="text-lg font-black text-white text-center tracking-widest uppercase">
                    FORMULIR PESERTA DIDIK
                </h1>
            </div>

            <div className="flex justify-between border-b border-gray-800 mb-0.5">
                <div className="flex-1 flex">
                    <div className="w-24 text-[9px] font-bold">Tanggal</div>
                    <div className="flex-1 text-[9px]">: {new Date().toLocaleDateString('id-ID')}</div>
                </div>
                <div className="flex-1 flex border-l border-gray-800 pl-4">
                    <div className="w-24 text-[9px] font-bold">REG :</div>
                    <div className="flex-1 text-[9px]">: -</div>
                </div>
            </div>
            <div className="flex justify-between border-b border-gray-800 mb-1">
                <div className="flex-1 flex">
                    <div className="w-24 text-[9px] font-bold"> - Tingkat</div>
                    <div className="flex-1 text-[9px]">: {formatClassName(student.className)}</div>
                </div>
                <div className="flex-1 flex border-l border-gray-800 pl-4">
                    <div className="w-24 text-[9px] font-bold">Program :</div>
                    <div className="flex-1 text-[9px]">: -</div>
                </div>
            </div>

            {/* SECTION 1: IDENTITAS */}
            <SubHeader>IDENTITAS PESERTA DIDIK (WAJIB DIISI)</SubHeader>
            <div className="border-x border-t border-gray-800">
                <FormField label="1. Nama Lengkap" value={student.fullName} />
                <FormField label="2. Jenis Kelamin" value={student.gender === 'L' ? 'Laki-Laki' : 'Perempuan'} />
                <div className="flex border-b border-gray-300 min-h-[20px]">
                    <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">3. NISN</div>
                    <div className="w-1/3 px-1.5 py-0.5 text-[9px] font-medium uppercase">{student.nisn}</div>
                    <div className="w-12 px-1.5 py-0.5 bg-gray-100 border-x border-gray-300 text-[9px] font-bold">NIS :</div>
                    <div className="flex-1 px-1.5 py-0.5 text-[9px] font-bold bg-gray-200">{student.nis}</div>
                </div>
                <FormField label="4. No Seri Ijazah" value={student.diplomaNumber} />
                <FormField label="5. No Seri SKHUN" value={student.dapodik.skhun} />
                <FormField label="6. No. Ujian Nasional" value={student.dapodik.unExamNumber} />
                <FormField label="7. NIK" value={student.dapodik.nik} />
                <FormField label="NPSN Sekolah Asal" value={student.previousSchool ? "20502873" : "-"} />
                <FormField label="Nama Sekolah Asal" value={student.previousSchool} />
                <FormField label="8. Tempat, Tgl Lahir" value={`${student.birthPlace}, ${formatDateIndo(student.birthDate)}`} />
                <FormField label="9. Agama" value={student.religion} />
                <FormField label="10. Berkebutuhan Khusus" value={student.dapodik.specialNeeds} />
                <FormField label="11. Alamat Tempat Tinggal" value={student.address} />
                <div className="flex border-b border-gray-300 min-h-[20px]">
                    <div className="w-1/3 flex flex-col">
                        <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[8px] italic"> - Dusun</div>
                        <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[8px] italic"> - Kelurahan / Desa</div>
                        <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[8px] italic"> - Kecamatan</div>
                        <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[8px] italic"> - Kabupaten / Kota</div>
                        <div className="flex-1 px-1.5 py-0.5 text-[8px] italic"> - Propinsi</div>
                    </div>
                    <div className="w-1/3 flex flex-col border-x border-gray-300">
                        <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[9px] uppercase">{student.dapodik.dusun}</div>
                        <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[9px] uppercase">{student.dapodik.kelurahan}</div>
                        <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[9px] uppercase">{student.subDistrict}</div>
                        <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[9px] uppercase">{student.district}</div>
                        <div className="flex-1 px-1.5 py-0.5 text-[9px] uppercase">Jawa Timur</div>
                    </div>
                    <div className="flex-1 flex flex-col">
                        <div className="flex border-b border-gray-200 h-1/3">
                            <div className="w-10 px-1 py-0.5 bg-gray-50 border-r border-gray-300 text-[8px] font-bold">RT:</div>
                            <div className="flex-1 px-1 py-0.5 text-[9px]">{student.dapodik.rt}</div>
                            <div className="w-10 px-1 py-0.5 bg-gray-50 border-x border-gray-300 text-[8px] font-bold">RW:</div>
                            <div className="flex-1 px-1 py-0.5 text-[9px]">{student.dapodik.rw}</div>
                        </div>
                        <div className="flex border-b border-gray-200 h-1/3">
                            <div className="w-20 px-1 py-0.5 bg-gray-50 border-r border-gray-300 text-[8px] font-bold">Kode Pos</div>
                            <div className="flex-1 px-1 py-0.5 text-[9px]">{student.postalCode}</div>
                        </div>
                        <div className="flex-1 bg-gray-100"></div>
                    </div>
                </div>
                <FormField label="12. Transportasi" value={student.dapodik.transportation} />
                <FormField label="13. Jenis Tinggal" value={student.dapodik.livingStatus} />
                <div className="flex border-b border-gray-300 min-h-[20px]">
                    <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">14. No. Telp Rumah</div>
                    <div className="w-1/3 px-1.5 py-0.5 text-[9px] font-medium uppercase">-</div>
                    <div className="w-12 px-1.5 py-0.5 bg-gray-100 border-x border-gray-300 text-[9px] font-bold">HP :</div>
                    <div className="flex-1 px-1.5 py-0.5 text-[9px] bg-gray-100">{student.father.phone || student.mother.phone || '0'}</div>
                </div>
                <FormField label="15. Email" value={student.dapodik.email} />
                <FormField label="16. No. KKS" value={student.dapodik.kksNumber} />
                <div className="flex border-b border-gray-300 min-h-[20px]">
                    <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">17. Penerima KPS/KPH</div>
                    <div className="w-1/6 px-1.5 py-0.5 text-[9px] border-r border-gray-200 uppercase">{student.dapodik.kpsReceiver}</div>
                    <div className="w-24 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">No. KPS</div>
                    <div className="flex-1 px-1.5 py-0.5 text-[9px] uppercase">{student.dapodik.kpsNumber}</div>
                </div>
                <div className="flex border-b border-gray-300 min-h-[20px]">
                    <div className="w-1/3 px-1.5 py-0.5 text-[8px] italic"> - Usulan PIP</div>
                    <div className="w-1/6 px-1.5 py-0.5 text-[9px] border-x border-gray-300 uppercase">{student.dapodik.pipEligible}</div>
                    <div className="w-24 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">Alasan</div>
                    <div className="flex-1 px-1.5 py-0.5 text-[9px] uppercase">{student.dapodik.pipReason}</div>
                </div>
                <div className="flex border-b border-gray-300 min-h-[20px]">
                    <div className="w-1/3 px-1.5 py-0.5 text-[8px] italic"> - Penerima PIP</div>
                    <div className="w-1/6 px-1.5 py-0.5 text-[9px] border-x border-gray-300 uppercase">{student.dapodik.kipReceiver}</div>
                    <div className="w-24 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">No. KIP</div>
                    <div className="flex-1 px-1.5 py-0.5 text-[9px] uppercase">{student.dapodik.kipNumber}</div>
                </div>
                <FormField label=" - Nama di KIP" value={student.dapodik.kipName} />
                <FormField label=" - No Reg Akta Lahir" value={student.dapodik.birthRegNumber} />
                <FormField label=" - Lintang / Bujur" value={`${student.dapodik.latitude} / ${student.dapodik.longitude}`} />
            </div>

            {/* SECTION 2: DATA AYAH */}
            <SubHeader>DATA AYAH KANDUNG (WAJIB DIISI)</SubHeader>
            <div className="border-x border-t border-gray-800">
                <div className="flex border-b border-gray-300 min-h-[20px]">
                    <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">18. Nama Ayah</div>
                    <div className="w-1/2 px-1.5 py-0.5 text-[9px] font-bold uppercase">{student.father.name}</div>
                    <div className="w-24 px-1.5 py-0.5 bg-gray-50 border-x border-gray-300 text-[9px]">Tahun:</div>
                    <div className="flex-1 px-1.5 py-0.5 text-[9px] bg-gray-100 font-bold">{student.father.birthPlaceDate}</div>
                </div>
                <FormField label=" - Pekerjaan" value={student.father.job} />
                <FormField label=" - Pendidikan" value={student.father.education} />
                <FormField label=" - Penghasilan" value={student.father.income} />
            </div>

            {/* SECTION 3: DATA IBU */}
            <SubHeader>DATA IBU KANDUNG (WAJIB DIISI)</SubHeader>
            <div className="border-x border-t border-gray-800">
                <div className="flex border-b border-gray-300 min-h-[20px]">
                    <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">19. Nama Ibu</div>
                    <div className="w-1/2 px-1.5 py-0.5 text-[9px] font-bold uppercase">{student.mother.name}</div>
                    <div className="w-24 px-1.5 py-0.5 bg-gray-50 border-x border-gray-300 text-[9px]">Tahun:</div>
                    <div className="flex-1 px-1.5 py-0.5 text-[9px] bg-gray-100 font-bold">{student.mother.birthPlaceDate}</div>
                </div>
                <FormField label=" - Pekerjaan" value={student.mother.job} />
                <FormField label=" - Pendidikan" value={student.mother.education} />
                <FormField label=" - Penghasilan" value={student.mother.income} />
            </div>

            {/* SECTION 4: DATA WALI */}
            <SubHeader>DATA WALI</SubHeader>
            <div className="border-x border-t border-gray-800">
                <div className="flex border-b border-gray-300 min-h-[20px]">
                    <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">20. Nama Wali</div>
                    <div className="w-1/2 px-1.5 py-0.5 text-[9px] uppercase">{student.guardian?.name || '-'}</div>
                    <div className="w-24 px-1.5 py-0.5 bg-gray-50 border-x border-gray-300 text-[9px]">Tahun:</div>
                    <div className="flex-1 px-1.5 py-0.5 text-[9px] bg-gray-100 font-bold">{student.guardian?.birthPlaceDate || '-'}</div>
                </div>
                <FormField label=" - Pekerjaan" value={student.guardian?.job || '-'} />
                <FormField label=" - Pendidikan" value={student.guardian?.education || '-'} />
                <FormField label=" - Penghasilan" value={student.guardian?.income || '-'} />
            </div>

            {/* SECTION 5: PERIODIK */}
            <div className="border border-gray-800 mt-1">
                <div className="flex border-b border-gray-300 h-6">
                    <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px] flex items-center">21. Tinggi Badan</div>
                    <div className="w-20 px-1.5 py-0.5 text-[9px] font-bold flex items-center justify-center bg-gray-200">{student.height}</div>
                    <div className="w-10 px-1.5 py-0.5 border-r border-gray-300 text-[9px] flex items-center">cm</div>
                    <div className="w-24 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px] flex items-center">Berat Badan:</div>
                    <div className="w-20 px-1.5 py-0.5 text-[9px] font-bold flex items-center justify-center bg-gray-200">{student.weight}</div>
                    <div className="flex-1 px-1.5 py-0.5 text-[9px] flex items-center">Kg</div>
                </div>
                <div className="flex border-b border-gray-300 h-6">
                    <div className="w-1/2 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[8px] flex items-center">22. Jarak Ke Sekolah</div>
                    <div className="w-20 px-1.5 py-0.5 text-[9px] font-bold flex items-center justify-center bg-gray-200">{student.dapodik.distanceToSchool}</div>
                    <div className="w-10 px-1.5 py-0.5 border-r border-gray-300 text-[9px] flex items-center">km</div>
                    <div className="flex-1 px-1.5 py-0.5 text-[8px] italic flex items-center leading-tight">2) &gt; 1km sebutkan: {Number(student.dapodik.distanceToSchool) > 1 ? student.dapodik.distanceToSchool : '-'} Km</div>
                </div>
                <div className="flex border-b border-gray-300 h-6">
                    <div className="w-1/2 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[8px] flex items-center">23. Waktu Tempuh</div>
                    <div className="w-20 px-1.5 py-0.5 text-[9px] font-bold flex items-center justify-center bg-gray-200">{student.dapodik.travelTimeMinutes}</div>
                    <div className="w-12 px-1.5 py-0.5 border-r border-gray-300 text-[9px] flex items-center">menit</div>
                    <div className="flex-1 px-1.5 py-0.5 text-[8px] italic flex items-center leading-tight">2) &gt; 60 menit: - Menit</div>
                </div>
                <div className="flex h-5">
                    <div className="w-1/2 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px] flex items-center">24. Jml Saudara Kandung</div>
                    <div className="w-20 px-1.5 py-0.5 text-[9px] font-bold flex items-center justify-center bg-gray-200">{student.siblingCount}</div>
                    <div className="flex-1 bg-gray-100"></div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN VIEW COMPONENT ---
const BukuIndukView: React.FC<BukuIndukViewProps> = ({ students }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  
  // FILTERS
  const [classFilter, setClassFilter] = useState('ALL');
  const [studentFilter, setStudentFilter] = useState('ALL');

  // Derive unique classes
  const uniqueClasses = useMemo(() => {
      const classes = new Set(students.map(s => s.className));
      return Array.from(classes).sort((a: string, b: string) => {
          const aNum = parseInt(a.replace(/\D/g, '')) || 0;
          const bNum = parseInt(b.replace(/\D/g, '')) || 0;
          if (aNum !== bNum) return aNum - bNum;
          return a.localeCompare(b);
      });
  }, [students]);

  // Derive available students for the filter dropdown
  const availableStudentsForFilter = useMemo(() => {
      let list = students;
      if (classFilter !== 'ALL') {
          list = list.filter(s => s.className === classFilter);
      }
      return list.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [students, classFilter]);

  // Main Filter Logic
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
        const matchesSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              s.nisn.includes(searchTerm) ||
                              s.nis.includes(searchTerm);
        const matchesClass = classFilter === 'ALL' || s.className === classFilter;
        const matchesStudent = studentFilter === 'ALL' || s.id === studentFilter;

        return matchesSearch && matchesClass && matchesStudent;
    });
  }, [students, searchTerm, classFilter, studentFilter]);

  // Dynamically extract unique classes from the filtered student list to render groups
  const availableClasses = useMemo(() => {
      const classes = new Set(filteredStudents.map(s => s.className));
      return Array.from(classes).sort((a: string, b: string) => {
          const aNum = parseInt(a.replace(/\D/g, '')) || 0;
          const bNum = parseInt(b.replace(/\D/g, '')) || 0;
          if (aNum !== bNum) return aNum - bNum;
          return a.localeCompare(b);
      });
  }, [filteredStudents]);

  const handleDownloadPDF = () => {
    if (!selectedStudent) return;
    setIsGenerating(true);

    setTimeout(() => {
        const element = document.getElementById('buku-induk-content');
        const filename = `Buku_Induk_${selectedStudent.fullName.replace(/\s+/g, '_')}.pdf`;

        // Optimasi margin dan ukuran agar tidak terpotong (A4 Width 210mm - Margin Kiri/Kanan 10mm = Max Content 190mm)
        const opt = {
          margin: [5, 10, 5, 10], // Top, Left, Bottom, Right (mm)
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: 'avoid-all' }
        };

        // @ts-ignore
        const html2pdf = window.html2pdf;

        if (html2pdf) {
            html2pdf().set(opt).from(element).save().then(() => {
                setIsGenerating(false);
            }).catch((err: any) => {
                console.error(err);
                setIsGenerating(false);
            });
        } else {
            setIsGenerating(false);
            alert("Library PDF belum siap.");
        }
    }, 100);
  };

  const handleDownloadAll = () => {
      if (filteredStudents.length === 0) {
          alert("Tidak ada siswa untuk didownload.");
          return;
      }
      if (filteredStudents.length > 50 && !window.confirm(`Anda akan mendownload ${filteredStudents.length} Buku Induk sekaligus. Proses ini mungkin memakan waktu. Lanjutkan?`)) {
          return;
      }

      setIsBatchGenerating(true);

      setTimeout(() => {
          const element = document.getElementById('batch-buku-induk-container');
          const className = classFilter === 'ALL' ? 'Semua_Kelas' : classFilter.replace(/\s+/g, '_');
          const filename = `Buku_Induk_Batch_${className}.pdf`;

          const opt = {
            margin: [5, 10, 5, 10],
            filename: filename,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 1.5, useCORS: true, scrollY: 0 },
            pagebreak: { mode: ['css', 'legacy'] },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };

          // @ts-ignore
          const html2pdf = window.html2pdf;

          if (html2pdf) {
              html2pdf().set(opt).from(element).save().then(() => {
                  setIsBatchGenerating(false);
              }).catch((err: any) => {
                  console.error(err);
                  setIsBatchGenerating(false);
                  alert("Gagal melakukan batch download.");
              });
          }
      }, 3000); // 3 seconds wait for rendering
  };

  if (selectedStudent) {
      return (
          <div className="flex flex-col h-full space-y-4 animate-fade-in">
              {/* Toolbar Single View */}
              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
                  <button 
                    onClick={() => setSelectedStudent(null)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
                  >
                      <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
                  </button>
                  <div className="flex gap-2">
                    <button 
                        onClick={handleDownloadPDF}
                        disabled={isGenerating}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                        {isGenerating ? 'Sedang Mendownload...' : 'Download PDF'}
                    </button>
                  </div>
              </div>

              {/* Wrapper Scrollable (Layar) */}
              <div className="bg-white p-4 md:p-8 rounded-xl border border-gray-200 shadow-sm flex-1 overflow-auto flex justify-center bg-gray-50/50 pb-32">
                  <div id="buku-induk-content">
                      <BukuIndukTemplate student={selectedStudent} />
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in relative">
        
        {/* Toolbar Buku Induk List View */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-2">
                <School className="w-6 h-6 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-800">
                    Buku Induk Siswa
                </h2>
             </div>
             
             {/* FILTERS */}
             <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select 
                        className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer w-32"
                        value={classFilter}
                        onChange={(e) => { setClassFilter(e.target.value); setStudentFilter('ALL'); }}
                    >
                        <option value="ALL">Semua Kelas</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    <User className="w-4 h-4 text-gray-500" />
                    <select 
                        className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer w-48 md:w-56"
                        value={studentFilter}
                        onChange={(e) => setStudentFilter(e.target.value)}
                    >
                        <option value="ALL">Semua Siswa</option>
                        {availableStudentsForFilter.map(s => (
                            <option key={s.id} value={s.id}>{s.fullName}</option>
                        ))}
                    </select>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Cari Nama atau NISN..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <button 
                    onClick={handleDownloadAll} 
                    disabled={isBatchGenerating}
                    className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black flex items-center gap-2 shadow-lg disabled:opacity-50 whitespace-nowrap"
                    title="Download semua siswa terfilter dalam satu PDF"
                >
                    {isBatchGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Files className="w-4 h-4" />}
                    {isBatchGenerating ? 'Memproses...' : 'Download Semua'}
                </button>
             </div>
        </div>

        {/* Grouped Table List */}
        <div className="flex-1 overflow-auto bg-mac-bg space-y-6 pb-32">
            {availableClasses.map((className) => {
                const studentsInClass = filteredStudents.filter(s => s.className === className);
                if (studentsInClass.length === 0) return null;

                return (
                    <div key={className} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mx-1">
                        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <ChevronRight className="w-4 h-4 text-blue-600" />
                                Kelas {className}
                            </h3>
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {studentsInClass.length} Siswa
                            </span>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100">
                                    <th className="px-6 py-3 w-16 text-center">No</th>
                                    <th className="px-6 py-3">Nama Siswa</th>
                                    <th className="px-6 py-3">NISN</th>
                                    <th className="px-6 py-3">Kelas</th>
                                    <th className="px-6 py-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {studentsInClass.map((s, idx) => (
                                    <tr key={s.id} className="hover:bg-blue-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedStudent(s)}>
                                        <td className="px-6 py-3 text-center text-xs text-gray-500 font-medium">{idx + 1}</td>
                                        <td className="px-6 py-3 text-sm font-bold text-gray-800 group-hover:text-blue-600">{s.fullName}</td>
                                        <td className="px-6 py-3 text-xs text-gray-500 font-mono tracking-tight">{s.nisn}</td>
                                        <td className="px-6 py-3 text-xs">
                                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">{formatClassName(s.className)}</span>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <button className="text-[10px] font-bold text-blue-600 uppercase border border-blue-200 px-3 py-1 rounded-md group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                Buka Form
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            })}
            
            {availableClasses.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Search className="w-12 h-12 mb-4 opacity-20" />
                    <p>Tidak ada siswa ditemukan.</p>
                </div>
            )}
        </div>

        {/* VISIBLE OVERLAY FOR BATCH DOWNLOAD */}
        {isBatchGenerating && (
            <div className="fixed inset-0 z-[9999] bg-gray-900/90 flex flex-col items-center justify-start overflow-auto pt-20 pb-20">
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center animate-bounce-in">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                    <h3 className="text-xl font-bold text-gray-900">Memproses PDF...</h3>
                    <p className="text-gray-500 text-sm mt-2">Sedang menggabungkan {filteredStudents.length} dokumen buku induk.</p>
                    <p className="text-xs text-gray-400 mt-1">Mohon tunggu, jangan tutup halaman ini.</p>
                </div>

                <div id="batch-buku-induk-container" className="bg-white w-[190mm]">
                    {filteredStudents.map((student, index) => (
                        <div key={student.id} className="relative">
                            <BukuIndukTemplate student={student} />
                            {index < filteredStudents.length - 1 && (
                                <div className="html2pdf__page-break" style={{ pageBreakAfter: 'always', height: 0, display: 'block' }}></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};

export default BukuIndukView;