
import React, { useState, useMemo, useEffect } from 'react';
import { Student, DocumentFile } from '../types';
import { Search, Filter, FolderOpen, FileText, Loader2 } from 'lucide-react';
import FileManager from './FileManager';
import UploadRaporView from './UploadRaporView';
import { api } from '../services/api';

interface StudentDocsAdminViewProps {
  students: Student[];
  onUpdate?: () => void;
}

const StudentDocsAdminView: React.FC<StudentDocsAdminViewProps> = ({ students, onUpdate }) => {
  // DINAMIS: Ambil daftar kelas unik dari data siswa yang ada
  const uniqueClasses = useMemo(() => {
      const classes = Array.from(new Set(students.map(s => s.className))).filter(Boolean).sort();
      return classes.length > 0 ? classes : ['VII A']; // Fallback jika data kosong
  }, [students]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [activeTab, setActiveTab] = useState<'DOCS' | 'RAPOR'>('DOCS');
  const [isUploading, setIsUploading] = useState(false);
  const [studentVisibleDocs, setStudentVisibleDocs] = useState<string[] | undefined>(undefined);

  // Set default class saat data dimuat pertama kali
  useEffect(() => {
      if ((!selectedClass || !uniqueClasses.includes(selectedClass)) && uniqueClasses.length > 0) {
          setSelectedClass(uniqueClasses[0]);
      }
  }, [uniqueClasses, selectedClass]);

  // Load Settings for Doc Visibility
  useEffect(() => {
      const loadSettings = async () => {
          try {
              const settings = await api.getAppSettings();
              if (settings && settings.docConfig && settings.docConfig.studentVisible) {
                  setStudentVisibleDocs(settings.docConfig.studentVisible);
              }
          } catch(e) { console.error("Failed loading settings"); }
      };
      loadSettings();
  }, []);

  // Filter Students based on selected Class
  const filteredStudents = useMemo(() => {
      if (!selectedClass) return [];
      return students.filter(s => s.className === selectedClass).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [students, selectedClass]);

  const currentStudent = students.find(s => s.id === selectedStudentId);

  // Auto-select first student when list updates or class changes
  useEffect(() => {
      if (filteredStudents.length > 0) {
          const isCurrentSelectedValid = filteredStudents.find(s => s.id === selectedStudentId);
          if (!selectedStudentId || !isCurrentSelectedValid) {
              setSelectedStudentId(filteredStudents[0].id);
          }
      } else {
          setSelectedStudentId('');
      }
  }, [filteredStudents, selectedStudentId]);

  const handleUpload = async (file: File, category: string) => {
    if (!currentStudent) return;
    setIsUploading(true);
    
    // Optimistic Update (Temporary)
    const tempId = 'temp-' + Math.random();
    const newDocs = category === 'LAINNYA' ? [...currentStudent.documents] : currentStudent.documents.filter(d => d.category !== category);
    
    const tempDoc: DocumentFile = {
        id: tempId,
        name: file.name,
        type: file.type.includes('pdf') ? 'PDF' : 'IMAGE',
        url: URL.createObjectURL(file), 
        category: category as any,
        uploadDate: new Date().toISOString().split('T')[0],
        size: 'Uploading...',
        status: 'APPROVED' // Admin uploads are auto-approved
    };
    
    currentStudent.documents = [...newDocs, tempDoc];
    
    try {
        // Upload to Drive via API
        const driveUrl = await api.uploadFile(file, currentStudent.id, category);
        
        if (driveUrl) {
            const realDoc: DocumentFile = {
                ...tempDoc,
                id: Math.random().toString(36).substr(2, 9),
                url: driveUrl,
                size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
            };
            
            // Replace Temp with Real
            currentStudent.documents = [...newDocs, realDoc];
            
            // Save Metadata
            await api.updateStudent(currentStudent);
            if (onUpdate) onUpdate();
        } else {
            alert("Gagal upload ke Drive. File hanya tersimpan lokal sementara.");
        }
    } catch (e) {
        console.error(e);
        alert("Terjadi kesalahan saat upload.");
        // Revert to prev state if needed, or keep local preview
    } finally {
        setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
      if (!currentStudent) return;
      if (window.confirm('Hapus dokumen ini?')) {
          currentStudent.documents = currentStudent.documents.filter(d => d.id !== id);
          await api.updateStudent(currentStudent);
          if (onUpdate) onUpdate();
      }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in relative">
        {isUploading && (
            <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-2" />
                <p className="text-gray-600 font-bold animate-pulse">Mengupload ke Google Drive...</p>
            </div>
        )}

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-600" />
                Upload Dokumen & Rapor Siswa
            </h2>
            <div className="flex gap-3 w-full md:w-auto">
                 <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg border border-gray-200">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select 
                        className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer min-w-[100px]"
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                    >
                        {uniqueClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg border border-gray-200 w-64 relative">
                    <Search className="w-4 h-4 text-gray-500 absolute left-3 pointer-events-none" />
                    <select 
                        className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer w-full pl-6"
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                    >
                        {filteredStudents.length > 0 ? (
                            filteredStudents.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)
                        ) : (
                            <option value="">Tidak ada siswa</option>
                        )}
                    </select>
                </div>
            </div>
        </div>

        {currentStudent ? (
            <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button 
                        onClick={() => setActiveTab('DOCS')}
                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'DOCS' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <FolderOpen className="w-4 h-4" /> Dokumen Persyaratan
                    </button>
                    <button 
                        onClick={() => setActiveTab('RAPOR')}
                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'RAPOR' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <FileText className="w-4 h-4" /> File Rapor
                    </button>
                </div>

                <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50 pb-32">
                    {activeTab === 'DOCS' ? (
                        <FileManager 
                            documents={currentStudent.documents} 
                            onUpload={handleUpload}
                            onDelete={handleDelete}
                            allowDeleteApproved={true} // Allow admin to delete
                            allowedCategories={studentVisibleDocs}
                        />
                    ) : (
                        <UploadRaporView 
                            student={currentStudent}
                            onUpdate={onUpdate || (() => {})}
                        />
                    )}
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                {students.length === 0 ? (
                    <>
                        <Loader2 className="w-10 h-10 animate-spin mb-2 opacity-50" />
                        <p>Memuat data siswa...</p>
                    </>
                ) : (
                    <p>Pilih Siswa untuk memulai.</p>
                )}
            </div>
        )}
    </div>
  );
};

export default StudentDocsAdminView;
