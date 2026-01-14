import React, { useState } from 'react';
import { Student } from '../types';
import { Search, Printer, User, ArrowLeft, ChevronRight, School, FileDown, Loader2 } from 'lucide-react';

interface BukuIndukViewProps {
  students: Student[];
}

const CLASS_LIST = ['VII A', 'VII B', 'VII C', 'VIII A', 'VIII B', 'VIII C', 'IX A', 'IX B', 'IX C'];

const BukuIndukView: React.FC<BukuIndukViewProps> = ({ students }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nisn.includes(searchTerm) ||
    s.nis.includes(searchTerm)
  );

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
          html2canvas: { 
            scale: 2, 
            useCORS: true, 
            scrollY: 0
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
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
            console.error("html2pdf library not loaded");
            setIsGenerating(false);
            alert("Library PDF belum siap. Silakan refresh halaman.");
        }
    }, 100);
  };

  // Compact Form Field
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

  if (selectedStudent) {
      return (
          <div className="flex flex-col h-full space-y-4 animate-fade-in">
              {/* Toolbar */}
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
              <div className="bg-white p-4 md:p-8 rounded-xl border border-gray-200 shadow-sm flex-1 overflow-auto flex justify-center bg-gray-50/50">
                  
                  {/* === DOCUMENT CONTENT === */}
                  {/* Reduced width to 190mm to ensure proper margins in A4 PDF (210mm) */}
                  <div id="buku-induk-content" className="w-[190mm] bg-white p-5 flex flex-col font-serif shadow-xl text-[9px] leading-tight box-border relative">
                      
                      {/* HEADER */}
                      <div className="border-2 border-black p-0.5 mb-1 bg-black">
                          <h1 className="text-lg font-black text-white text-center tracking-widest uppercase">
                              FORMULIR PESERTA DIDIK
                          </h1>
                      </div>

                      <div className="flex justify-between border-b border-gray-800 mb-0.5">
                          <div className="flex-1 flex">
                              <div className="w-24 text-[9px] font-bold">Tanggal</div>
                              <div className="flex-1 text-[9px]">: 17 Juli 2022</div>
                          </div>
                          <div className="flex-1 flex border-l border-gray-800 pl-4">
                              <div className="w-24 text-[9px] font-bold">REG :</div>
                              <div className="flex-1 text-[9px]">: -</div>
                          </div>
                      </div>
                      <div className="flex justify-between border-b border-gray-800 mb-1">
                          <div className="flex-1 flex">
                              <div className="w-24 text-[9px] font-bold"> - Tingkat</div>
                              <div className="flex-1 text-[9px]">: {selectedStudent.className.split(' ')[0]}</div>
                          </div>
                          <div className="flex-1 flex border-l border-gray-800 pl-4">
                              <div className="w-24 text-[9px] font-bold">Program :</div>
                              <div className="flex-1 text-[9px]">: -</div>
                          </div>
                      </div>

                      {/* SECTION 1: IDENTITAS */}
                      <SubHeader>IDENTITAS PESERTA DIDIK (WAJIB DIISI)</SubHeader>
                      <div className="border-x border-t border-gray-800">
                          <FormField label="1. Nama Lengkap" value={selectedStudent.fullName} />
                          <FormField label="2. Jenis Kelamin" value={selectedStudent.gender === 'L' ? 'Laki-Laki' : 'Perempuan'} />
                          <div className="flex border-b border-gray-300 min-h-[20px]">
                              <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">3. NISN</div>
                              <div className="w-1/3 px-1.5 py-0.5 text-[9px] font-medium uppercase">{selectedStudent.nisn}</div>
                              <div className="w-12 px-1.5 py-0.5 bg-gray-100 border-x border-gray-300 text-[9px] font-bold">NIS :</div>
                              <div className="flex-1 px-1.5 py-0.5 text-[9px] font-bold bg-gray-200">{selectedStudent.nis}</div>
                          </div>
                          <FormField label="4. No Seri Ijazah" value={selectedStudent.diplomaNumber} />
                          <FormField label="5. No Seri SKHUN" value={selectedStudent.dapodik.skhun} />
                          <FormField label="6. No. Ujian Nasional" value={selectedStudent.dapodik.unExamNumber} />
                          <FormField label="7. NIK" value={selectedStudent.dapodik.nik} />
                          <FormField label="NPSN Sekolah Asal" value={selectedStudent.previousSchool ? "20502873" : "-"} />
                          <FormField label="Nama Sekolah Asal" value={selectedStudent.previousSchool} />
                          <FormField label="8. Tempat, Tgl Lahir" value={`${selectedStudent.birthPlace}, ${selectedStudent.birthDate}`} />
                          <FormField label="9. Agama" value={selectedStudent.religion} />
                          <FormField label="10. Berkebutuhan Khusus" value={selectedStudent.dapodik.specialNeeds} />
                          <FormField label="11. Alamat Tempat Tinggal" value={selectedStudent.address} />
                          <div className="flex border-b border-gray-300 min-h-[20px]">
                               <div className="w-1/3 flex flex-col">
                                   <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[8px] italic"> - Dusun</div>
                                   <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[8px] italic"> - Kelurahan / Desa</div>
                                   <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[8px] italic"> - Kecamatan</div>
                                   <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[8px] italic"> - Kabupaten / Kota</div>
                                   <div className="flex-1 px-1.5 py-0.5 text-[8px] italic"> - Propinsi</div>
                               </div>
                               <div className="w-1/3 flex flex-col border-x border-gray-300">
                                   <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[9px] uppercase">{selectedStudent.dapodik.dusun}</div>
                                   <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[9px] uppercase">{selectedStudent.dapodik.kelurahan}</div>
                                   <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[9px] uppercase">{selectedStudent.subDistrict}</div>
                                   <div className="flex-1 px-1.5 py-0.5 border-b border-gray-200 text-[9px] uppercase">{selectedStudent.district}</div>
                                   <div className="flex-1 px-1.5 py-0.5 text-[9px] uppercase">Jawa Timur</div>
                               </div>
                               <div className="flex-1 flex flex-col">
                                   <div className="flex border-b border-gray-200 h-1/3">
                                        <div className="w-10 px-1 py-0.5 bg-gray-50 border-r border-gray-300 text-[8px] font-bold">RT:</div>
                                        <div className="flex-1 px-1 py-0.5 text-[9px]">{selectedStudent.dapodik.rt}</div>
                                        <div className="w-10 px-1 py-0.5 bg-gray-50 border-x border-gray-300 text-[8px] font-bold">RW:</div>
                                        <div className="flex-1 px-1 py-0.5 text-[9px]">{selectedStudent.dapodik.rw}</div>
                                   </div>
                                   <div className="flex border-b border-gray-200 h-1/3">
                                        <div className="w-20 px-1 py-0.5 bg-gray-50 border-r border-gray-300 text-[8px] font-bold">Kode Pos</div>
                                        <div className="flex-1 px-1 py-0.5 text-[9px]">{selectedStudent.postalCode}</div>
                                   </div>
                                   <div className="flex-1 bg-gray-100"></div>
                               </div>
                          </div>
                          <FormField label="12. Transportasi" value={selectedStudent.dapodik.transportation} />
                          <FormField label="13. Jenis Tinggal" value={selectedStudent.dapodik.livingStatus} />
                          <div className="flex border-b border-gray-300 min-h-[20px]">
                              <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">14. No. Telp Rumah</div>
                              <div className="w-1/3 px-1.5 py-0.5 text-[9px] font-medium uppercase">-</div>
                              <div className="w-12 px-1.5 py-0.5 bg-gray-100 border-x border-gray-300 text-[9px] font-bold">HP :</div>
                              <div className="flex-1 px-1.5 py-0.5 text-[9px] bg-gray-100">{selectedStudent.father.phone || selectedStudent.mother.phone || '0'}</div>
                          </div>
                          <FormField label="15. Email" value={selectedStudent.dapodik.email} />
                          <FormField label="16. No. KKS" value={selectedStudent.dapodik.kksNumber} />
                          <div className="flex border-b border-gray-300 min-h-[20px]">
                              <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">17. Penerima KPS/KPH</div>
                              <div className="w-1/6 px-1.5 py-0.5 text-[9px] border-r border-gray-200 uppercase">{selectedStudent.dapodik.kpsReceiver}</div>
                              <div className="w-24 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">No. KPS</div>
                              <div className="flex-1 px-1.5 py-0.5 text-[9px] uppercase">{selectedStudent.dapodik.kpsNumber}</div>
                          </div>
                          <div className="flex border-b border-gray-300 min-h-[20px]">
                              <div className="w-1/3 px-1.5 py-0.5 text-[8px] italic"> - Usulan PIP</div>
                              <div className="w-1/6 px-1.5 py-0.5 text-[9px] border-x border-gray-300 uppercase">{selectedStudent.dapodik.pipEligible}</div>
                              <div className="w-24 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">Alasan</div>
                              <div className="flex-1 px-1.5 py-0.5 text-[9px] uppercase">{selectedStudent.dapodik.pipReason}</div>
                          </div>
                          <div className="flex border-b border-gray-300 min-h-[20px]">
                              <div className="w-1/3 px-1.5 py-0.5 text-[8px] italic"> - Penerima PIP</div>
                              <div className="w-1/6 px-1.5 py-0.5 text-[9px] border-x border-gray-300 uppercase">{selectedStudent.dapodik.kipReceiver}</div>
                              <div className="w-24 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">No. KIP</div>
                              <div className="flex-1 px-1.5 py-0.5 text-[9px] uppercase">{selectedStudent.dapodik.kipNumber}</div>
                          </div>
                          <FormField label=" - Nama di KIP" value={selectedStudent.dapodik.kipName} />
                          <FormField label=" - No Reg Akta Lahir" value={selectedStudent.dapodik.birthRegNumber} />
                          <FormField label=" - Lintang / Bujur" value={`${selectedStudent.dapodik.latitude} / ${selectedStudent.dapodik.longitude}`} />
                      </div>

                      {/* SECTION 2: DATA AYAH */}
                      <SubHeader>DATA AYAH KANDUNG (WAJIB DIISI)</SubHeader>
                      <div className="border-x border-t border-gray-800">
                          <div className="flex border-b border-gray-300 min-h-[20px]">
                              <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">18. Nama Ayah</div>
                              <div className="w-1/2 px-1.5 py-0.5 text-[9px] font-bold uppercase">{selectedStudent.father.name}</div>
                              <div className="w-24 px-1.5 py-0.5 bg-gray-50 border-x border-gray-300 text-[9px]">Tahun:</div>
                              <div className="flex-1 px-1.5 py-0.5 text-[9px] bg-gray-100 font-bold">{selectedStudent.father.birthPlaceDate}</div>
                          </div>
                          <FormField label=" - Pekerjaan" value={selectedStudent.father.job} />
                          <FormField label=" - Pendidikan" value={selectedStudent.father.education} />
                          <FormField label=" - Penghasilan" value={selectedStudent.father.income} />
                      </div>

                      {/* SECTION 3: DATA IBU */}
                      <SubHeader>DATA IBU KANDUNG (WAJIB DIISI)</SubHeader>
                      <div className="border-x border-t border-gray-800">
                          <div className="flex border-b border-gray-300 min-h-[20px]">
                              <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">19. Nama Ibu</div>
                              <div className="w-1/2 px-1.5 py-0.5 text-[9px] font-bold uppercase">{selectedStudent.mother.name}</div>
                              <div className="w-24 px-1.5 py-0.5 bg-gray-50 border-x border-gray-300 text-[9px]">Tahun:</div>
                              <div className="flex-1 px-1.5 py-0.5 text-[9px] bg-gray-100 font-bold">{selectedStudent.mother.birthPlaceDate}</div>
                          </div>
                          <FormField label=" - Pekerjaan" value={selectedStudent.mother.job} />
                          <FormField label=" - Pendidikan" value={selectedStudent.mother.education} />
                          <FormField label=" - Penghasilan" value={selectedStudent.mother.income} />
                      </div>

                      {/* SECTION 4: DATA WALI */}
                      <SubHeader>DATA WALI</SubHeader>
                      <div className="border-x border-t border-gray-800">
                          <div className="flex border-b border-gray-300 min-h-[20px]">
                              <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px]">20. Nama Wali</div>
                              <div className="w-1/2 px-1.5 py-0.5 text-[9px] uppercase">{selectedStudent.guardian?.name || '-'}</div>
                              <div className="w-24 px-1.5 py-0.5 bg-gray-50 border-x border-gray-300 text-[9px]">Tahun:</div>
                              <div className="flex-1 px-1.5 py-0.5 text-[9px] bg-gray-100 font-bold">{selectedStudent.guardian?.birthPlaceDate || '-'}</div>
                          </div>
                          <FormField label=" - Pekerjaan" value={selectedStudent.guardian?.job || '-'} />
                          <FormField label=" - Pendidikan" value={selectedStudent.guardian?.education || '-'} />
                          <FormField label=" - Penghasilan" value={selectedStudent.guardian?.income || '-'} />
                      </div>

                      {/* SECTION 5: PERIODIK */}
                      <div className="border border-gray-800 mt-1">
                          <div className="flex border-b border-gray-300 h-6">
                              <div className="w-1/3 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px] flex items-center">21. Tinggi Badan</div>
                              <div className="w-20 px-1.5 py-0.5 text-[9px] font-bold flex items-center justify-center bg-gray-200">{selectedStudent.height}</div>
                              <div className="w-10 px-1.5 py-0.5 border-r border-gray-300 text-[9px] flex items-center">cm</div>
                              <div className="w-24 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px] flex items-center">Berat Badan:</div>
                              <div className="w-20 px-1.5 py-0.5 text-[9px] font-bold flex items-center justify-center bg-gray-200">{selectedStudent.weight}</div>
                              <div className="flex-1 px-1.5 py-0.5 text-[9px] flex items-center">Kg</div>
                          </div>
                          <div className="flex border-b border-gray-300 h-6">
                              <div className="w-1/2 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[8px] flex items-center">22. Jarak Ke Sekolah</div>
                              <div className="w-20 px-1.5 py-0.5 text-[9px] font-bold flex items-center justify-center bg-gray-200">{selectedStudent.dapodik.distanceToSchool}</div>
                              <div className="w-10 px-1.5 py-0.5 border-r border-gray-300 text-[9px] flex items-center">km</div>
                              <div className="flex-1 px-1.5 py-0.5 text-[8px] italic flex items-center leading-tight">2) &gt; 1km sebutkan: {Number(selectedStudent.dapodik.distanceToSchool) > 1 ? selectedStudent.dapodik.distanceToSchool : '-'} Km</div>
                          </div>
                          <div className="flex border-b border-gray-300 h-6">
                              <div className="w-1/2 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[8px] flex items-center">23. Waktu Tempuh</div>
                              <div className="w-20 px-1.5 py-0.5 text-[9px] font-bold flex items-center justify-center bg-gray-200">5</div>
                              <div className="w-12 px-1.5 py-0.5 border-r border-gray-300 text-[9px] flex items-center">menit</div>
                              <div className="flex-1 px-1.5 py-0.5 text-[8px] italic flex items-center leading-tight">2) &gt; 60 menit: - Menit</div>
                          </div>
                          <div className="flex h-5">
                              <div className="w-1/2 px-1.5 py-0.5 bg-gray-50 border-r border-gray-300 text-[9px] flex items-center">24. Jml Saudara Kandung</div>
                              <div className="w-20 px-1.5 py-0.5 text-[9px] font-bold flex items-center justify-center bg-gray-200">{selectedStudent.siblingCount}</div>
                              <div className="flex-1 bg-gray-100"></div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in">
        {/* Toolbar Buku Induk */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
             <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <School className="w-5 h-5 text-mac-accent" />
                Buku Induk Siswa (Per Kelas)
             </h2>
             <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                    type="text"
                    placeholder="Cari Nama atau NISN..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-mac-accent focus:bg-white transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
        </div>

        {/* Grouped Table List */}
        <div className="flex-1 overflow-auto bg-mac-bg space-y-6 pb-10">
            {CLASS_LIST.map((className) => {
                const studentsInClass = filteredStudents.filter(s => s.className === className);
                if (studentsInClass.length === 0 && !searchTerm) return null;
                if (studentsInClass.length === 0 && searchTerm) return null;

                return (
                    <div key={className} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mx-1">
                        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <ChevronRight className="w-4 h-4 text-mac-accent" />
                                Kelas {className}
                            </h3>
                            <span className="text-[10px] font-bold bg-mac-accent/10 text-mac-accent px-2 py-0.5 rounded-full uppercase tracking-wider">
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
                                        <td className="px-6 py-3 text-sm font-bold text-gray-800 group-hover:text-mac-accent">{s.fullName}</td>
                                        <td className="px-6 py-3 text-xs text-gray-500 font-mono tracking-tight">{s.nisn}</td>
                                        <td className="px-6 py-3 text-xs">
                                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">{s.className}</span>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <button className="text-[10px] font-bold text-mac-accent uppercase border border-mac-accent/20 px-3 py-1 rounded-md group-hover:bg-mac-accent group-hover:text-white transition-all">
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
            
            {filteredStudents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Search className="w-12 h-12 mb-4 opacity-20" />
                    <p>Tidak ada siswa ditemukan.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default BukuIndukView;