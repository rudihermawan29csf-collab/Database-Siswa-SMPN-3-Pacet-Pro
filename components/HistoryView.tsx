import React, { useState } from 'react';
import { Student, DocumentFile, CorrectionRequest } from '../types';
import { History, CheckCircle2, XCircle, Trash2, XSquare } from 'lucide-react';

interface HistoryViewProps {
  students: Student[];
}

const HistoryView: React.FC<HistoryViewProps> = ({ students: initialStudents }) => {
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  // Helper to safely get date from either DocumentFile or CorrectionRequest
  const getHistoryDate = (item: DocumentFile | CorrectionRequest): string | undefined => {
      if ('verificationDate' in item) return item.verificationDate;
      if ('processedDate' in item) return item.processedDate;
      return undefined;
  };

  const getHistoryId = (item: DocumentFile | CorrectionRequest): string => {
      return item.id;
  };

  // Derive History Items from data, filtering out removed IDs
  const historyItems = initialStudents.flatMap(s => [
      ...s.documents.filter(d => d.status !== 'PENDING').map(d => ({ type: 'DOC' as const, item: d, student: s })),
      ...(s.correctionRequests || []).filter(r => r.status !== 'PENDING').map(r => ({ type: 'REQ' as const, item: r, student: s }))
  ]).filter(entry => !removedIds.has(getHistoryId(entry.item)))
    .sort((a, b) => {
      const dateA = getHistoryDate(a.item) || '';
      const dateB = getHistoryDate(b.item) || '';
      return dateB.localeCompare(dateA); // Newest first
  });

  const handleDelete = (id: string) => {
      if (window.confirm("Hapus riwayat ini dari daftar? (Data asli tidak akan terhapus)")) {
          setRemovedIds(prev => new Set(prev).add(id));
      }
  };

  const handleClearAll = () => {
      if (window.confirm("Hapus SEMUA riwayat verifikasi dari tampilan?")) {
          const allIds = historyItems.map(h => getHistoryId(h.item));
          setRemovedIds(prev => {
              const newSet = new Set(prev);
              allIds.forEach(id => newSet.add(id));
              return newSet;
          });
      }
  };

  return (
      <div className="flex flex-col h-full space-y-4 animate-fade-in">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
               <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                   <History className="w-5 h-5 text-gray-600" />
                   Riwayat Verifikasi
               </h2>
               {historyItems.length > 0 && (
                   <button 
                        onClick={handleClearAll}
                        className="flex items-center px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 border border-red-200 transition-colors"
                   >
                       <XSquare className="w-4 h-4 mr-2" /> Hapus Semua
                   </button>
               )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden">
              <div className="overflow-auto h-full p-4 pb-32">
                  {historyItems.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                                <th className="p-3">Tanggal</th>
                                <th className="p-3">Siswa</th>
                                <th className="p-3">Tipe</th>
                                <th className="p-3">Item</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Catatan Admin</th>
                                <th className="p-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            {historyItems.map((entry, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 group">
                                    <td className="p-3 text-gray-500 font-mono text-xs">{getHistoryDate(entry.item) || '-'}</td>
                                    <td className="p-3 font-medium">{entry.student.fullName}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${entry.type === 'DOC' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                            {entry.type === 'DOC' ? 'DOKUMEN' : 'DATA'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-gray-700">
                                        {entry.type === 'DOC' 
                                            ? (entry.item as DocumentFile).name 
                                            : (entry.item as CorrectionRequest).fieldName}
                                    </td>
                                    <td className="p-3">
                                        <span className={`flex items-center gap-1 ${entry.item.status === 'APPROVED' ? 'text-green-600' : 'text-red-600'}`}>
                                            {entry.item.status === 'APPROVED' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                            {entry.item.status === 'APPROVED' ? 'Disetujui' : (entry.item.status === 'REVISION' ? 'Revisi' : 'Ditolak')}
                                        </span>
                                    </td>
                                    <td className="p-3 text-gray-500 italic max-w-xs truncate">
                                        "{entry.item.adminNote || '-'}"
                                    </td>
                                    <td className="p-3 text-center">
                                        <button 
                                            onClick={() => handleDelete(getHistoryId(entry.item))}
                                            className="text-gray-400 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                                            title="Hapus dari riwayat"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <History className="w-12 h-12 mb-2 opacity-50" />
                          <p>Belum ada riwayat verifikasi.</p>
                      </div>
                  )}
              </div>
          </div>
      </div>
  );
};

export default HistoryView;