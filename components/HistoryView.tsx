import React from 'react';
import { Student, DocumentFile, CorrectionRequest } from '../types';
import { History, CheckCircle2, XCircle } from 'lucide-react';

interface HistoryViewProps {
  students: Student[];
}

const HistoryView: React.FC<HistoryViewProps> = ({ students }) => {
  // Helper to safely get date from either DocumentFile or CorrectionRequest
  const getHistoryDate = (item: DocumentFile | CorrectionRequest): string | undefined => {
      // 'verificationDate' exists on DocumentFile, 'processedDate' on CorrectionRequest
      if ('verificationDate' in item) return item.verificationDate;
      if ('processedDate' in item) return item.processedDate;
      return undefined;
  };

  // Derive History Items from data
  const historyItems = students.flatMap(s => [
      ...s.documents.filter(d => d.status !== 'PENDING').map(d => ({ type: 'DOC' as const, item: d, student: s })),
      ...(s.correctionRequests || []).filter(r => r.status !== 'PENDING').map(r => ({ type: 'REQ' as const, item: r, student: s }))
  ]).sort((a, b) => {
      const dateA = getHistoryDate(a.item) || '';
      const dateB = getHistoryDate(b.item) || '';
      return dateB.localeCompare(dateA); // Newest first
  });

  return (
      <div className="flex flex-col h-full space-y-4 animate-fade-in">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
               <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                   <History className="w-5 h-5 text-gray-600" />
                   Riwayat Verifikasi
               </h2>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden">
              <div className="overflow-auto h-full p-4">
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
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            {historyItems.map((entry, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
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