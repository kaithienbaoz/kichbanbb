import React, { useState, useEffect } from 'react';
import { Spoiler } from '../types';
import { getArchivedSpoilers, deleteSpoilerFromArchive } from '../services/storageService';

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchiveModal: React.FC<ArchiveModalProps> = ({ isOpen, onClose }) => {
  const [archivedSpoilers, setArchivedSpoilers] = useState<Spoiler[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setArchivedSpoilers(getArchivedSpoilers());
    }
  }, [isOpen]);

  const handleDelete = (id: string) => {
    deleteSpoilerFromArchive(id);
    setArchivedSpoilers(getArchivedSpoilers());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onClose}
      ></div>
      
      {/* Modal Content */}
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-drama-950 border border-drama-800 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-fade-in">
        {/* Modal Header */}
        <div className="p-8 border-b border-drama-800 flex items-center justify-between bg-drama-900/50">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-gold-500 uppercase tracking-tighter">Kịch Bản Đã Lưu Trữ</h2>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Danh sách các kịch bản bạn đã chọn lọc ({archivedSpoilers.length})</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-drama-800 rounded-full text-gray-400 hover:text-white transition-all border border-transparent hover:border-drama-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-grow overflow-y-auto p-4 md:p-8 custom-scrollbar bg-gradient-to-b from-transparent to-black/20">
          {archivedSpoilers.length > 0 ? (
            <div className="space-y-6">
              {archivedSpoilers.map((spoiler, idx) => (
                <div key={spoiler.id} className="bg-drama-900/40 border border-drama-800 rounded-2xl p-6 relative group">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-white pr-10">{spoiler.title}</h3>
                    <button 
                      onClick={() => handleDelete(spoiler.id)}
                      className="absolute top-6 right-6 p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Xóa khỏi lưu trữ"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                  <p className="text-gray-400 leading-relaxed mb-4">{spoiler.content}</p>
                  <div className="flex justify-end">
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(spoiler.content);
                        setCopiedId(spoiler.id);
                        setTimeout(() => setCopiedId(null), 1000);
                      }}
                      className="text-[10px] font-black uppercase tracking-widest text-gold-500 hover:text-gold-400 flex items-center gap-2"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                      {copiedId === spoiler.id ? 'ĐÃ SAO CHÉP' : 'SAO CHÉP LẠI'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 py-20">
              <svg className="w-20 h-20 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
              <p className="text-xl font-bold uppercase tracking-widest">Chưa có kịch bản lưu trữ</p>
              <p className="text-sm mt-2">Hãy bấm nút "LƯU TRỮ" ở các kịch bản bạn yêu thích.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-drama-800 bg-drama-900/80 text-center">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em]">Hệ thống lưu trữ kịch bản &bull; B&B Drama Spoilers</p>
        </div>
      </div>
    </div>
  );
};
