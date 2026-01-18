
import React, { useRef, useState } from 'react';
import { DocumentFile } from '../types';
import { UploadCloud, FileText, Image as ImageIcon, CheckCircle2, AlertCircle, Eye, RefreshCw, Trash2, Lock, Plus } from 'lucide-react';

interface FileManagerProps {
  documents: DocumentFile[];
  onUpload: (file: File, category: string) => void;
  onDelete?: (id: string) => void;
  allowDeleteApproved?: boolean;
  allowedCategories?: string[]; // New prop for filtering based on settings
}

const MASTER_DOCS_LIST = [
    { id: 'IJAZAH', label: 'Ijazah SD/MI', required: true },
    { id: 'AKTA', label: 'Akta Kelahiran', required: true },
    { id: 'KK', label: 'Kartu Keluarga', required: true },
    { id: 'KTP_AYAH', label: 'KTP Ayah', required: false },
    { id: 'KTP_IBU', label: 'KTP Ibu', required: false },
    { id: 'NISN', label: 'Bukti NISN', required: false },
    { id: 'KIP', label: 'KIP / PKH', required: false },
    { id: 'FOTO', label: 'Pas Foto', required: true },
    { id: 'SKL', label: 'Surat Ket. Lulus', required: false },
    { id: 'KARTU_PELAJAR', label: 'Kartu Pelajar', required: false },
    { id: 'PIAGAM', label: 'Piagam/Prestasi', required: false },
];

const getDriveUrl = (url: string, type: 'preview' | 'direct') => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
        let id = '';
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            id = match[1];
        } else {
            const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (matchId) id = matchId[1];
        }

        if (id) {
            if (type === 'preview') return `https://drive.google.com/file/d/${id}/preview`;
            if (type === 'direct') return `https://drive.google.com/uc?export=view&id=${id}`;
        }
    }
    return url;
};

const FileManager: React.FC<FileManagerProps> = ({ documents, onUpload, onDelete, allowDeleteApproved = false, allowedCategories }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [targetCategory, setTargetCategory] = useState<string>('');

    // Filter categories based on settings (if provided)
    const activeCategories = allowedCategories 
        ? MASTER_DOCS_LIST.filter(doc => allowedCategories.includes(doc.id))
        : MASTER_DOCS_LIST.filter(doc => ['IJAZAH','AKTA','KK','FOTO'].includes(doc.id)); // Fallback default

    const handleTriggerUpload = (category: string) => {
        setTargetCategory(category);
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && targetCategory) {
            onUpload(file, targetCategory);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTargetCategory('');
    };

    // Helper to determine status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-700 border-green-200';
            case 'REVISION': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,application/pdf"
                onChange={handleFileChange} 
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {activeCategories.map((cat) => {
                    const doc = documents.find(d => d.category === cat.id);
                    const isApproved = doc?.status === 'APPROVED';
                    const isRevision = doc?.status === 'REVISION';

                    return (
                        <div key={cat.id} className="group relative bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col h-64">
                            {/* Header */}
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{cat.label}</span>
                                {cat.required && <span className="text-[10px] text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded">Wajib</span>}
                            </div>

                            {/* Content */}
                            <div className="flex-1 relative bg-gray-50/50 flex flex-col items-center justify-center p-4">
                                {doc ? (
                                    <>
                                        <div className="w-full h-full flex flex-col items-center justify-center relative">
                                            {doc.type === 'IMAGE' ? (
                                                <img 
                                                    src={getDriveUrl(doc.url, 'direct')} 
                                                    alt={doc.category} 
                                                    className="w-full h-32 object-contain rounded-lg shadow-sm bg-white" 
                                                />
                                            ) : (
                                                <div className="w-full h-32 flex flex-col items-center justify-center bg-white rounded-lg border border-gray-200 shadow-sm">
                                                    <FileText className="w-12 h-12 text-red-500 mb-2" />
                                                    <span className="text-[10px] text-gray-500 line-clamp-1 px-2">{doc.name}</span>
                                                </div>
                                            )}
                                            
                                            {/* Status Badge */}
                                            <div className={`absolute -top-2 right-0 px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm border ${getStatusColor(doc.status)}`}>
                                                {doc.status === 'APPROVED' ? <CheckCircle2 className="w-3 h-3" /> : doc.status === 'REVISION' ? <AlertCircle className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                                {doc.status === 'APPROVED' ? 'Valid' : doc.status === 'REVISION' ? 'Revisi' : 'Verifikasi'}
                                            </div>
                                        </div>

                                        {/* Overlay Actions */}
                                        <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4 z-10 backdrop-blur-[1px]">
                                            <a 
                                                href={getDriveUrl(doc.url, 'preview')} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-200 hover:bg-blue-100 flex items-center justify-center"
                                            >
                                                <Eye className="w-3 h-3 mr-1.5" /> Lihat Dokumen
                                            </a>
                                            
                                            {!isApproved && (
                                                <button 
                                                    onClick={() => handleTriggerUpload(cat.id)}
                                                    className={`w-full py-2 rounded-lg text-xs font-bold border flex items-center justify-center ${isRevision ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                                                >
                                                    <RefreshCw className="w-3 h-3 mr-1.5" /> {isRevision ? 'Upload Revisi' : 'Ganti File'}
                                                </button>
                                            )}

                                            {onDelete && (allowDeleteApproved || !isApproved) && (
                                                <button 
                                                    onClick={() => onDelete(doc.id)}
                                                    className="w-full py-2 bg-white text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-50 flex items-center justify-center"
                                                >
                                                    <Trash2 className="w-3 h-3 mr-1.5" /> Hapus
                                                </button>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <button 
                                        onClick={() => handleTriggerUpload(cat.id)}
                                        className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group/btn"
                                    >
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 group-hover/btn:bg-blue-200 transition-colors">
                                            <UploadCloud className="w-6 h-6 text-gray-400 group-hover/btn:text-blue-600" />
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 group-hover/btn:text-blue-600">Upload File</span>
                                        <span className="text-[10px] text-gray-400 mt-1">PDF / JPG / PNG</span>
                                    </button>
                                )}
                            </div>

                            {/* Footer Status Message */}
                            {doc?.status === 'REVISION' && doc.adminNote && (
                                <div className="px-3 py-2 bg-red-50 border-t border-red-100 text-[10px] text-red-700">
                                    <span className="font-bold">Admin:</span> "{doc.adminNote}"
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Additional Files Section */}
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-6 text-center hover:border-blue-400 transition-colors cursor-pointer" onClick={() => handleTriggerUpload('LAINNYA')}>
                    <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                        <Plus className="w-6 h-6 text-gray-400" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-600">Dokumen Lainnya</h4>
                    <p className="text-xs text-gray-400 mt-1">Upload dokumen pendukung tambahan (Sertifikat, Piagam, dll)</p>
                </div>
            </div>

            {/* List for 'LAINNYA' category docs if any */}
            {documents.filter(d => !activeCategories.some(c => c.id === d.category)).length > 0 && (
                <div className="mt-8">
                    <h3 className="text-sm font-bold text-gray-700 mb-4 border-b pb-2">Dokumen Tambahan</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {documents.filter(d => !activeCategories.some(c => c.id === d.category)).map((doc) => (
                            <div key={doc.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        {doc.type === 'PDF' ? <FileText className="w-5 h-5 text-red-500" /> : <ImageIcon className="w-5 h-5 text-blue-500" />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-gray-800 truncate">{doc.name}</p>
                                        <p className="text-[10px] text-gray-500">{doc.category} • {doc.size}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <a href={doc.url} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-gray-100 rounded text-blue-600"><Eye className="w-4 h-4"/></a>
                                    {onDelete && <button onClick={() => onDelete(doc.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4"/></button>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileManager;
