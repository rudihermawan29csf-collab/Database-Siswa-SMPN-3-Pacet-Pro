
import React, { useRef, useState, useEffect } from 'react';
import { DocumentFile } from '../types';
import { UploadCloud, FileText, Image as ImageIcon, CheckCircle2, AlertCircle, Eye, RefreshCw, Trash2, Lock, Plus, X, Loader2, Maximize2 } from 'lucide-react';

interface FileManagerProps {
  documents: DocumentFile[];
  onUpload: (file: File, category: string) => void;
  onDelete?: (id: string) => void;
  allowDeleteApproved?: boolean;
  allowedCategories?: string[]; 
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
        const parts = url.split(/\/d\//);
        if (parts.length > 1) {
            id = parts[1].split('/')[0];
        }
        if (!id) {
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

// --- IMAGE COMPRESSION UTILITY ---
const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        // Only compress images
        if (!file.type.match(/image.*/)) {
            return resolve(file);
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Max Dimensions (Safe for Docs)
                const MAX_WIDTH = 1280;
                const MAX_HEIGHT = 1280;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Compress to JPEG with 0.7 quality
                    canvas.toBlob((blob) => {
                        if (blob) {
                            if (blob.size > file.size) {
                                resolve(file); // Don't use if larger
                            } else {
                                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                                    type: 'image/jpeg',
                                    lastModified: Date.now(),
                                });
                                resolve(compressedFile);
                            }
                        } else {
                            resolve(file); // Fallback
                        }
                    }, 'image/jpeg', 0.7);
                } else {
                    resolve(file);
                }
            };
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
    });
};

const FileManager: React.FC<FileManagerProps> = ({ documents, onUpload, onDelete, allowDeleteApproved = false, allowedCategories }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [targetCategory, setTargetCategory] = useState<string>('');
    const [previewDoc, setPreviewDoc] = useState<DocumentFile | null>(null);
    const [useFallbackViewer, setUseFallbackViewer] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);

    // Reset fallback state when doc changes
    useEffect(() => {
        setUseFallbackViewer(false);
    }, [previewDoc]);

    const activeCategories = allowedCategories 
        ? MASTER_DOCS_LIST.filter(doc => allowedCategories.includes(doc.id))
        : MASTER_DOCS_LIST.filter(doc => ['IJAZAH','AKTA','KK','FOTO'].includes(doc.id)); 

    const handleTriggerUpload = (category: string) => {
        setTargetCategory(category);
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && targetCategory) {
            setIsCompressing(true);
            try {
                const processedFile = await compressImage(file);
                onUpload(processedFile, targetCategory);
            } catch (err) {
                console.error("Compression error", err);
                onUpload(file, targetCategory); // Fallback to original
            } finally {
                setIsCompressing(false);
            }
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTargetCategory('');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-700 border-green-200';
            case 'REVISION': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        }
    };

    const isImage = (doc: DocumentFile) => {
        return doc.type === 'IMAGE' || doc.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);
    };

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* COMPRESSING OVERLAY */}
            {isCompressing && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-2" />
                    <p className="text-gray-600 font-bold animate-pulse text-sm">Mengoptimalkan gambar...</p>
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
                                    <p className="text-gray-400 text-xs">{previewDoc.category}</p>
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
                                            {isImage(doc) ? (
                                                <img 
                                                    src={getDriveUrl(doc.url, 'direct')} 
                                                    alt={doc.category} 
                                                    className="w-full h-32 object-contain rounded-lg shadow-sm bg-white" 
                                                    referrerPolicy="no-referrer"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Preview+Error';
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-32 flex flex-col items-center justify-center bg-white rounded-lg border border-gray-200 shadow-sm">
                                                    <FileText className="w-12 h-12 text-red-500 mb-2" />
                                                    <span className="text-[10px] text-gray-500 line-clamp-1 px-2">{doc.name}</span>
                                                </div>
                                            )}
                                            
                                            <div className={`absolute -top-2 right-0 px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm border ${getStatusColor(doc.status)}`}>
                                                {doc.status === 'APPROVED' ? <CheckCircle2 className="w-3 h-3" /> : doc.status === 'REVISION' ? <AlertCircle className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                                {doc.status === 'APPROVED' ? 'Valid' : doc.status === 'REVISION' ? 'Revisi' : 'Verifikasi'}
                                            </div>
                                        </div>

                                        <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4 z-10 backdrop-blur-[1px]">
                                            <button 
                                                onClick={() => setPreviewDoc(doc)}
                                                className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-200 hover:bg-blue-100 flex items-center justify-center"
                                            >
                                                <Eye className="w-3 h-3 mr-1.5" /> Lihat Dokumen
                                            </button>
                                            
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

                            {doc?.status === 'REVISION' && doc.adminNote && (
                                <div className="px-3 py-2 bg-red-50 border-t border-red-100 text-[10px] text-red-700">
                                    <span className="font-bold">Admin:</span> "{doc.adminNote}"
                                </div>
                            )}
                        </div>
                    );
                })}

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
                                    <button onClick={() => setPreviewDoc(doc)} className="p-1.5 hover:bg-gray-100 rounded text-blue-600"><Eye className="w-4 h-4"/></button>
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
