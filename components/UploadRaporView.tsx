
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Student, DocumentFile } from '../types';
import { UploadCloud, CheckCircle2, Eye, Trash2, AlertCircle, FileText, Image as ImageIcon, X, Lock, RefreshCw, Loader2, Maximize2 } from 'lucide-react';
import { api } from '../services/api';

interface UploadRaporViewProps {
  student: Student;
  onUpdate: () => void;
}

const SEMESTERS = [1, 2, 3, 4, 5, 6];

// Helper untuk format URL Google Drive agar bisa dipreview/tampil
const getDriveUrl = (url: string, type: 'preview' | 'direct') => {
    if (!url) return '';
    if (url.startsWith('blob:')) return url; 

    // Cek pattern Google Drive
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
        let id = '';
        const parts = url.split(/\/d\//);
        if (parts.length > 1) {
            id = parts[1].split('/')[0];
        } else {
            const match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (match) id = match[1];
        }

        if (id) {
            if (type === 'preview') return `https://drive.google.com/file/d/${id}/preview`;
            if (type === 'direct') return `https://drive.google.com/uc?export=view&id=${id}`;
        }
    }
    return url;
};

const UploadRaporView: React.FC<UploadRaporViewProps> = ({ student, onUpdate }) => {
  const [activeSemester, setActiveSemester] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stagingPage, setStagingPage] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // State untuk Modal Preview
  const [previewDoc, setPreviewDoc] = useState<DocumentFile | null>(null);
  const [useFallbackViewer, setUseFallbackViewer] = useState(false);

  // Reset fallback state when doc changes
  useEffect(() => {
      setUseFallbackViewer(false);
  }, [previewDoc]);

  // Dynamic Page Count from Settings
  const pagesPerSemester = useMemo(() => {
      try {
          const savedCount = localStorage.getItem('sys_rapor_config');
          const count = savedCount ? parseInt(savedCount) : 3;
          return Array.from({length: count}, (_, i) => i + 1);
      } catch {
          return [1, 2, 3];
      }
  }, []);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && stagingPage !== null) {
          setIsUploading(true);
          
          try {
              // Upload to Google Drive via API
              const driveUrl = await api.uploadFile(file, student.id, 'RAPOR');
              
              if (driveUrl) {
                  const newDoc: DocumentFile = {
                      id: Math.random().toString(36).substr(2, 9),
                      name: file.name,
                      type: file.type.includes('pdf') ? 'PDF' : 'IMAGE',
                      url: driveUrl, 
                      category: 'RAPOR',
                      uploadDate: new Date().toISOString().split('T')[0],
                      size: `${(file.size / 1024).toFixed(0)} KB`,
                      status: 'PENDING',
                      subType: { semester: activeSemester, page: stagingPage }
                  };

                  // Filter old doc out
                  const otherDocs = student.documents.filter(d => 
                      !(d.category === 'RAPOR' && d.subType?.semester === activeSemester && d.subType?.page === stagingPage)
                  );
                  
                  const updatedStudent = {
                      ...student,
                      documents: [...otherDocs, newDoc]
                  };

                  await api.updateStudent(updatedStudent);
                  if (onUpdate) onUpdate();
              } else {
                  alert("Gagal upload ke Google Drive (URL kosong).");
              }
          } catch (error) {
              console.error("Upload failed", error);
              alert("Terjadi kesalahan saat mengupload file.");
          } finally {
              setIsUploading(false);
          }
      }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
      setStagingPage(null);
  };

  const handleDelete = async (docId: string) => {
      if (window.confirm("Hapus file ini?")) {
          setIsUploading(true); // Reuse loading overlay to show progress
          try {
              const updatedDocs = student.documents.filter(d => d.id !== docId);
              const updatedStudent = { ...student, documents: updatedDocs };
              
              await api.updateStudent(updatedStudent);
              if (onUpdate) onUpdate();
          } catch (error) {
              console.error(error);
              alert("Gagal menghapus file.");
          } finally {
              setIsUploading(false);
          }
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

  const isImage = (doc: DocumentFile) => {
      return doc.type === 'IMAGE' || doc.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in relative">
        {/* Loading Overlay */}
        {isUploading && (
            <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-2" />
                <p className="text-gray-600 font-bold animate-pulse">Memproses...</p>
                <p className="text-xs text-gray-400">Mohon jangan tutup halaman ini.</p>
            </div>
        )}

        {/* PREVIEW MODAL */}
        {previewDoc && (
            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="relative w-full max-w-5xl h-[85vh] bg-gray-900 rounded-xl flex flex-col overflow-hidden shadow-2xl border border-gray-700">
                    {/* Modal Header */}
                    <div className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-700 rounded-lg">
                                {previewDoc.type === 'PDF' ? <FileText className="w-5 h-5 text-red-400"/> : <ImageIcon className="w-5 h-5 text-blue-400"/>}
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm">{previewDoc.name}</h3>
                                <p className="text-gray-400 text-xs">Semester {previewDoc.subType?.semester} - Halaman {previewDoc.subType?.page}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <a 
                                href={getDriveUrl(previewDoc.url, 'preview')} 
                                target="_blank" 
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded-lg transition-colors"
                            >
                                Buka Tab Baru
                            </a>
                            <button 
                                onClick={() => setPreviewDoc(null)} 
                                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Modal Content */}
                    <div className="flex-1 bg-black/50 flex items-center justify-center overflow-auto p-4 relative">
                        {!useFallbackViewer && isImage(previewDoc) ? (
                            <img 
                                src={getDriveUrl(previewDoc.url, 'direct')} 
                                alt="Preview" 
                                className="max-w-full max-h-full object-contain rounded shadow-lg" 
                                referrerPolicy="no-referrer"
                                onError={() => setUseFallbackViewer(true)}
                            />
                        ) : (
                            <iframe 
                                src={getDriveUrl(previewDoc.url, 'preview')} 
                                className="w-full h-full rounded bg-white shadow-lg" 
                                title="PDF Viewer"
                                allow="autoplay"
                            />
                        )}
                    </div>
                </div>
            </div>
        )}

        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
        
        {/* Header & Tabs */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-600" />
                Upload Dokumen Rapor ({pagesPerSemester.length} Halaman / Semester)
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {SEMESTERS.map(sem => {
                    const uploadedCount = pagesPerSemester.filter(p => getRaporDoc(sem, p)).length;
                    const isComplete = uploadedCount === pagesPerSemester.length;
                    const hasRevision = pagesPerSemester.some(p => getRaporDoc(sem, p)?.status === 'REVISION');

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
                                    <span className="text-gray-400">{uploadedCount}/{pagesPerSemester.length} Hal</span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>

        {/* Content Grid */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex-1 overflow-y-auto pb-32">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700 uppercase">Dokumen Semester {activeSemester}</h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Pastikan foto jelas dan terbaca</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {pagesPerSemester.map(page => {
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
                                        {isImage(doc) ? (
                                            <img 
                                                src={getDriveUrl(doc.url, 'direct')} 
                                                alt={`Hal ${page}`} 
                                                className="w-full h-full object-cover rounded-lg shadow-sm"
                                                referrerPolicy="no-referrer"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Error+Loading';
                                                }}
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-center">
                                                <FileText className="w-12 h-12 text-red-500 mb-2" />
                                                <span className="text-[10px] text-gray-500 line-clamp-2 px-2">{doc.name}</span>
                                            </div>
                                        )}
                                        
                                        {/* Status Badge Top Right */}
                                        <div className="absolute top-2 right-2 z-10">
                                            {isApproved && <CheckCircle2 className="w-6 h-6 text-green-500 bg-white rounded-full shadow-sm" />}
                                            {isRevision && <AlertCircle className="w-6 h-6 text-red-500 bg-white rounded-full shadow-sm animate-pulse" />}
                                        </div>

                                        {/* Overlay Hover Actions */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-col items-center justify-center gap-2 p-4 z-20">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setPreviewDoc(doc); }} 
                                                className="px-3 py-1.5 bg-white text-blue-600 rounded text-xs font-bold flex items-center gap-1 hover:bg-gray-100 w-full justify-center shadow-sm"
                                            >
                                                <Eye className="w-3 h-3" /> Lihat
                                            </button>
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
