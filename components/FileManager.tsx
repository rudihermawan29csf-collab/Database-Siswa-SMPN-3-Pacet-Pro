                            {/* Hover Actions / Re-upload button */}
                            <div className="absolute inset-0 bg-white/95 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-col items-center justify-center gap-2 z-20 p-2">
                                <a href={doc.url} target="_blank" rel="noreferrer" className="w-full px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-200 hover:bg-blue-100 flex items-center justify-center" title="Preview">
                                    <Eye className="w-3 h-3 mr-1" /> Lihat
                                </a>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleUploadTrigger(req.id); }}
                                    className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center justify-center ${doc.status === 'REVISION' ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                                >
                                    <RefreshCw className="w-3 h-3 mr-1" /> {doc.status === 'REVISION' ? 'Revisi' : 'Ganti File'}
                                </button>
                                
                                {onDelete && (allowDeleteApproved || doc.status !== 'APPROVED') && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
                                        className="w-full px-3 py-1.5 bg-white text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-50 flex items-center justify-center"
                                    >
                                        <Trash2 className="w-3 h-3 mr-1" /> Hapus
                                    </button>
                                )}
                            </div>