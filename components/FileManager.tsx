import React, { useRef, useState } from 'react';
import { FileText, Image as ImageIcon, Download, Eye, Plus, Trash2, FolderOpen, AlertCircle, CheckCircle2, UploadCloud, X, Save, RefreshCw, AlertTriangle } from 'lucide-react';
import { DocumentFile } from '../types';

interface FileManagerProps {
  documents: DocumentFile[];
  onUpload: (file: File, category: string) => void;
  onDelete?: (id: string) => void;
  highlightDocumentId?: string; // New prop for visual highlighting
}

const REQUIRED_DOCS = [
  { id: 'IJAZAH', label: 'Ijazah SD', required: true, desc: 'PDF/JPG' },
  { id: 'AKTA', label: 'Akta Kelahiran', required: true, desc: 'Scan Asli' },
  { id: 'KK', label: 'Kartu Keluarga', required: true, desc: 'Terbaru' },
  { id: 'KTP_AYAH', label: 'KTP Ayah', required: true, desc: 'Scan' },
  { id: 'KTP_IBU', label: 'KTP Ibu', required: true, desc: 'Scan' },
  { id: 'SKL', label: 'Surat Keterangan Lulus', required: true, desc: 'Asli' },
  { id: 'FOTO', label: 'Pas Foto Siswa', required: true, desc: '3x4 Warna' },
  { id: 'KARTU_PELAJAR', label: 'Kartu Pelajar', required: true, desc: 'Depan Belakang' },
  { id: 'KIP', label: 'KIP / PKH', required: false, desc: 'Jika ada' },
];

const FileManager: React.FC<FileManagerProps> = ({ documents, onUpload, onDelete, highlightDocumentId }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetCategory, setTargetCategory] = useState<string>('LAINNYA');
  
  // Staging State for Confirmation Modal
  const [stagingFile, setStagingFile] = useState<File | null>(null);

  const getIcon = (type: string) => {
    if (type === 'PDF') return <FileText className="w-10 h-10 text-red-500" />;
    return <ImageIcon className="w-10 h-10 text-blue-500" />;
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'APPROVED': return <span className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1 border-2 border-white shadow-sm z-10"><CheckCircle2 className="w-3 h-3 text-white" /></span>;
          case 'REVISION': return <span className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 border-2 border-white shadow-sm z-10"><X className="w-3 h-3 text-white" /></span>;
          case 'PENDING': return <span className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-1 border-2 border-white shadow-sm z-10"><AlertCircle className="w-3 h-3 text-white" /></span>;
          default: return null;
      }
  };

  // Helper to check if a category has been uploaded
  const getFileByCategory = (category: string) => documents.find(d => d.category === category);

  // Calculate stats
  const requiredCount = REQUIRED_DOCS.filter(d => d.required).length;
  const uploadedRequiredCount = REQUIRED_DOCS.filter(d => d.required && getFileByCategory(d.id)).length;
  const completeness = Math.round((uploadedRequiredCount / requiredCount) * 100);

  const handleUploadTrigger = (category: string) => {
    setTargetCategory(category);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStagingFile(file); // Open Confirmation Modal instead of direct upload
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmUpload = () => {
      if (stagingFile) {
          onUpload(stagingFile, targetCategory);
          setStagingFile(null);
      }
  };

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 h-[550px] flex flex-col relative">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*,application/pdf"
        onChange={handleFileChange}
      />

      {/* CONFIRMATION MODAL */}
      {stagingFile && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm rounded-xl flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm transform scale-100 transition-transform">
                  <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                          <UploadCloud className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">Konfirmasi Upload</h3>
                      <p className="text-sm text-gray-500 mb-6">Anda akan mengunggah dokumen untuk kategori <span className="font-bold text-blue-600">{REQUIRED_DOCS.find(r => r.id === targetCategory)?.label || targetCategory}</span></p>
                      
                      <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-3 mb-6">
                          {stagingFile.type.includes('pdf') ? <FileText className="w-8 h-8 text-red-500" /> : <ImageIcon className="w-8 h-8 text-blue-500" />}
                          <div className="text-left flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{stagingFile.name}</p>
                              <p className="text-xs text-gray-500">{(stagingFile.size / 1024).toFixed(0)} KB</p>
                          </div>
                      </div>

                      <div className="flex gap-3 w-full">
                          <button 
                            onClick={() => setStagingFile(null)}
                            className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                          >
                              Batal
                          </button>
                          <button 
                            onClick={confirmUpload}
                            className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-transform transform active:scale-95 flex items-center justify-center gap-2"
                          >
                              <Save className="w-4 h-4" />
                              Simpan File
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Finder Toolbar */}
      <div className="bg-white border-b border-gray-200 p-3 rounded-t-xl flex justify-between items-center">
        <div className="flex space-x-2">
           <div className="flex items-center px-3 py-1 bg-gray-100 rounded-md text-sm text-gray-600 border border-gray-200 shadow-sm">
               <FolderOpen className="w-4 h-4 mr-2 text-blue-500" />
               <span className="font-medium">Dokumen Siswa</span>
           </div>
        </div>
        <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg text-xs font-medium border border-gray-200">
                {completeness === 100 ? (
                    <span className="flex items-center text-green-600 gap-1"><CheckCircle2 className="w-3 h-3" /> Lengkap</span>
                ) : (
                    <span className="flex items-center text-orange-500 gap-1"><AlertCircle className="w-3 h-3" /> {uploadedRequiredCount}/{requiredCount} Wajib</span>
                )}
             </div>
            <button 
                onClick={() => handleUploadTrigger('LAINNYA')}
                className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
            <Plus className="w-4 h-4 mr-2" />
            Upload File
            </button>
        </div>
      </div>

      {/* File Grid */}
      <div className="p-6 overflow-y-auto flex-1 bg-white">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            
            {/* Render Required Slots First */}
            {REQUIRED_DOCS.map((req) => {
                const doc = getFileByCategory(req.id);
                const isHighlighted = doc && highlightDocumentId === doc.id;
                
                if (doc) {
                    // Render Actual File
                    return (
                        <div 
                            key={doc.id} 
                            id={`doc-${doc.id}`}
                            className={`group relative flex flex-col items-center p-4 rounded-xl transition-all cursor-pointer border shadow-sm hover:shadow-md bg-white 
                                ${isHighlighted ? 'ring-4 ring-blue-500 ring-offset-2 bg-blue-50 border-blue-400' : ''}
                                ${doc.status === 'REVISION' ? 'border-red-400 bg-red-50' : doc.status === 'APPROVED' ? 'border-green-200 bg-green-50/30' : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50'}
                            `}
                        >
                            <div className="w-20 h-20 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform relative">
                                {getIcon(doc.type)}
                                {getStatusBadge(doc.status)}
                            </div>
                            <span className="text-sm text-gray-800 font-medium text-center truncate w-full px-1">{doc.name}</span>
                            <span className="text-xs text-gray-500 mt-0.5">{req.label}</span>
                            
                             {/* Status Text & Admin Note */}
                             {doc.status === 'REVISION' && (
                                <div className="mt-2 text-center w-full">
                                    <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full flex items-center justify-center gap-1 mx-auto mb-1">
                                        <AlertTriangle className="w-3 h-3" /> Perlu Revisi
                                    </span>
                                    {doc.adminNote && (
                                        <div className="text-[10px] text-red-700 bg-red-50 p-1.5 rounded border border-red-200 italic leading-tight text-center" title={doc.adminNote}>
                                            "{doc.adminNote}"
                                        </div>
                                    )}
                                </div>
                             )}
                             {doc.status === 'PENDING' && <span className="text-[10px] font-bold text-yellow-600 mt-1">Menunggu Verifikasi</span>}
                             {doc.status === 'APPROVED' && <span className="text-[10px] font-bold text-green-600 mt-1">Disetujui</span>}
                            
                            {/* Hover Actions / Re-upload button */}
                            <div className="absolute inset-0 bg-white/95 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-col items-center justify-center gap-2 z-20 p-2">
                                <button className="w-full px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-200 hover:bg-blue-100 flex items-center justify-center" title="Preview">
                                    <Eye className="w-3 h-3 mr-1" /> Lihat
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleUploadTrigger(req.id); }}
                                    className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center justify-center ${doc.status === 'REVISION' ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                                >
                                    <RefreshCw className="w-3 h-3 mr-1" /> {doc.status === 'REVISION' ? 'Revisi' : 'Ganti File'}
                                </button>
                            </div>
                        </div>
                    );
                } else {
                    // Render Placeholder
                    return (
                         <div 
                            key={req.id} 
                            onClick={() => handleUploadTrigger(req.id)}
                            className="group flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer h-[220px]"
                         >
                            <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center mb-3 transition-colors">
                                <UploadCloud className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600 text-center">{req.label}</span>
                            <span className="text-xs text-gray-400 text-center mt-1">{req.desc}</span>
                            {req.required && (
                                <span className="mt-2 px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full uppercase tracking-wider">Wajib</span>
                            )}
                         </div>
                    );
                }
            })}

            {/* Render 'Others' */}
            {documents.filter(d => !REQUIRED_DOCS.find(r => r.id === d.category)).map((doc) => {
                const isHighlighted = highlightDocumentId === doc.id;
                return (
                    <div 
                        key={doc.id} 
                        id={`doc-${doc.id}`}
                        className={`group relative flex flex-col items-center p-4 rounded-xl transition-all cursor-pointer border shadow-sm hover:shadow-md bg-white 
                             ${isHighlighted ? 'ring-4 ring-blue-500 ring-offset-2 bg-blue-50 border-blue-400' : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50'}
                             ${doc.status === 'REVISION' ? 'border-red-400 bg-red-50' : ''}
                        `}
                    >
                        <div className="w-20 h-20 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform relative">
                            {getIcon(doc.type)}
                            {getStatusBadge(doc.status)}
                        </div>
                        <span className="text-sm text-gray-800 font-medium text-center truncate w-full px-1">{doc.name}</span>
                        <span className="text-xs text-gray-500 mt-0.5">{doc.category}</span>
                        
                        {doc.status === 'REVISION' && (
                            <div className="mt-2 text-center w-full">
                                <span className="text-[10px] font-bold text-red-500 animate-pulse">Perlu Revisi</span>
                                {doc.adminNote && (
                                    <div className="text-[10px] text-red-700 bg-red-50 p-1 rounded border border-red-100 italic line-clamp-2 mt-1">
                                        "{doc.adminNote}"
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Hover Actions */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 z-10">
                             {doc.status !== 'APPROVED' && onDelete && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
                                    className="p-1.5 bg-white rounded-full shadow-md hover:text-red-600 text-gray-500 border border-gray-100" title="Delete"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                        
                         {/* Hover Actions / Re-upload button */}
                            <div className="absolute inset-0 bg-white/95 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-col items-center justify-center gap-2 z-20 p-2">
                                <button className="w-full px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-200 hover:bg-blue-100 flex items-center justify-center" title="Preview">
                                    <Eye className="w-3 h-3 mr-1" /> Lihat
                                </button>
                                {/* For Custom docs, we don't have a category trigger so easily, but simplified here */}
                            </div>
                    </div>
                );
            })}

          </div>
      </div>
      
      {/* Footer Status */}
      <div className="bg-gray-50 border-t border-gray-200 p-2 px-4 rounded-b-xl text-xs text-gray-500 flex justify-between items-center">
          <span>Total {documents.length} dokumen tersimpan</span>
          <div className="flex gap-4">
              <span>{Math.round((documents.length * 1.5))} MB Terpakai</span>
          </div>
      </div>
    </div>
  );
};

export default FileManager;