import React, { useState, useRef } from 'react';
import { Student, DocumentFile } from '../types';
import { UploadCloud, CheckCircle2, Eye, Trash2, AlertCircle, FileText, Image as ImageIcon, X, Lock, RefreshCw } from 'lucide-react';

interface UploadRaporViewProps {
  student: Student;
  onUpdate: () => void;
}

const SEMESTERS = [1, 2, 3, 4, 5, 6];
const PAGES_PER_SEMESTER = [1, 2, 3, 4, 5];

const UploadRaporView: React.FC<UploadRaporViewProps> = ({ student, onUpdate }) => {
  const [activeSemester, setActiveSemester] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stagingPage, setStagingPage] = useState<number | null>(null);

  const getRaporDoc = (semester: number, page: number) => {
      return student.documents.find(d => 
          d.category === 'RAPOR' && 
          d.subType?.semester === semester && 
          d.subType?.page === page
      );
  };

  const handleUploadClick = (page: number) => {
      setStagingPage(page);
      if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && stagingPage !== null) {
          const newDoc: DocumentFile = {
              id: Math.random().toString(36).substr(2, 9),
              name: file.name,
              type: file.type.includes('pdf') ? 'PDF' : 'IMAGE',
              url: URL.createObjectURL(file),
              category: 'RAPOR',
              uploadDate: new Date().toISOString().split('T')[0],
              size: `${(file.size / 1024).toFixed(0)} KB`,
              status: 'PENDING',
              subType: { semester: activeSemester, page: stagingPage }
          };

          // Remove existing file for this slot if any (replace)
          const otherDocs = student.documents.filter(d => 
              !(d.category === 'RAPOR' && d.subType?.semester === activeSemester && d.subType?.page === stagingPage)
          );
          
          student.documents = [...otherDocs, newDoc];
          if (onUpdate) onUpdate();
      }
      // Reset
      if (fileInputRef.current) fileInputRef.current.value = '';
      setStagingPage(null);
  };

  const handleDelete = (docId: string) => {
      if (window.confirm("Hapus file ini?")) {
          student.documents = student.documents.filter(d => d.id !== docId);
          if (onUpdate) onUpdate();
      }
  };

  const StatusBadge = ({ status }: { status: string }) => {
      switch(status) {
          case 'APPROVED':
              return (
                  <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-200 shadow-sm">
                      <CheckCircle2 className="w-3 h-3" /> Disetujui
                  </span>
              );
          case 'REVISION':
              return (
                  <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200 shadow-sm animate-pulse">
                      <AlertCircle className="w-3 h-3" /> Revisi
                  </span>
              );
          default:
              return (
                  <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-yellow-200 shadow-sm">
                      <Lock className="w-3 h-3" /> Menunggu
                  </span>
              );
      }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
        
        {/* Header & Tabs */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-600" />
                Upload Dokumen Rapor
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {SEMESTERS.map(sem => {
                    const uploadedCount = PAGES_PER_SEMESTER.filter(p => getRaporDoc(sem, p)).length;
                    const isComplete = uploadedCount === 5;
                    const hasRevision = PAGES_PER_SEMESTER.some(p => getRaporDoc(sem, p)?.status === 'REVISION');

                    return (
                        <button
                            key={sem}
                            onClick={() => setActiveSemester(sem)}
                            className={`flex flex-col items-center justify-center px-6 py-3 rounded-lg border-2 transition-all min-w-[100px] relative
                                ${activeSemester === sem 
                                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                    : 'border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100'}
                            `}
                        >
                            {hasRevision && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                            )}
                            <span className="text-xs font-bold uppercase">Semester</span>
                            <span className="text-xl font-black">{sem}</span>
                            <div className="mt-1 flex items-center gap-1 text-[10px]">
                                {isComplete ? (
                                    <span className="text-green-600 font-bold flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Lengkap</span>
                                ) : (
                                    <span className="text-gray-400">{uploadedCount}/5 Hal</span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>

        {/* Content Grid */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex-1 overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700 uppercase">Dokumen Semester {activeSemester}</h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Pastikan foto jelas dan terbaca</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {PAGES_PER_SEMESTER.map(page => {
                    const doc = getRaporDoc(activeSemester, page);
                    const isApproved = doc?.status === 'APPROVED';
                    const isRevision = doc?.status === 'REVISION';
                    
                    return (
                        <div key={page} className="flex flex-col gap-2">
                            <div className={`relative aspect-[3/4] rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-4 transition-all group overflow-hidden
                                ${doc 
                                    ? (isRevision ? 'border-red-400 bg-red-50' : isApproved ? 'border-green-300 bg-green-50' : 'border-blue-200 bg-blue-50') 
                                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50 cursor-pointer'}
                            `}
                            onClick={() => !doc && handleUploadClick(page)}
                            >
                                {doc ? (
                                    <>
                                        {doc.type === 'IMAGE' ? (
                                            <img src={doc.url} alt={`Hal ${page}`} className="w-full h-full object-cover rounded-lg shadow-sm" />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-center">
                                                <FileText className="w-12 h-12 text-red-500 mb-2" />
                                                <span className="text-[10px] text-gray-500 line-clamp-2">{doc.name}</span>
                                            </div>
                                        )}
                                        
                                        {/* Status Badge Top Right */}
                                        <div className="absolute top-2 right-2 z-10">
                                            {isApproved && <CheckCircle2 className="w-6 h-6 text-green-500 bg-white rounded-full shadow-sm" />}
                                            {isRevision && <AlertCircle className="w-6 h-6 text-red-500 bg-white rounded-full shadow-sm animate-pulse" />}
                                        </div>

                                        {/* Overlay Hover Actions */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-col items-center justify-center gap-2 p-4 z-20">
                                            <a href={doc.url} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-white text-blue-600 rounded text-xs font-bold flex items-center gap-1 hover:bg-gray-100 w-full justify-center shadow-sm">
                                                <Eye className="w-3 h-3" /> Lihat
                                            </a>
                                            {!isApproved && (
                                                <>
                                                    <button onClick={(e) => { e.stopPropagation(); handleUploadClick(page); }} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 w-full flex items-center justify-center gap-1 shadow-sm">
                                                        <RefreshCw className="w-3 h-3" /> {isRevision ? 'Upload Ulang' : 'Ganti'}
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }} className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700 w-full flex items-center justify-center gap-1 shadow-sm">
                                                        <Trash2 className="w-3 h-3" /> Hapus
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
                                            <UploadCloud className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 group-hover:text-blue-600">Upload Hal {page}</span>
                                    </>
                                )}
                            </div>
                            
                            {/* Footer Info */}
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-gray-700">Halaman {page}</span>
                                </div>
                                {doc && <StatusBadge status={doc.status} />}
                                
                                {isRevision && doc.adminNote && (
                                    <div className="mt-2 text-left bg-red-50 border border-red-100 p-2 rounded-lg">
                                        <p className="text-[9px] font-bold text-red-600 uppercase mb-0.5">Catatan Admin:</p>
                                        <p className="text-[10px] text-gray-700 leading-tight italic">"{doc.adminNote}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );
};

export default UploadRaporView;