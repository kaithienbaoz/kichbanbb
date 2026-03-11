
import React, { useState, useEffect } from 'react';
import { BrainActiveData, TimelineEntry } from '../types';
import { loadBrainData, addTimelineEntry } from '../services/brainService';
import { analyzeArticleForBrain, generateTimelineTitle } from '../services/geminiService';

interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChange: () => void;
}

export const TimelineModal: React.FC<TimelineModalProps> = ({ isOpen, onClose, onDataChange }) => {
  const [data, setData] = useState<BrainActiveData | null>(null);
  const [isFeeding, setIsFeeding] = useState(false);
  const [feedText, setFeedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimelineEntry | null>(null);

  useEffect(() => {
    if (isOpen) {
      setData(loadBrainData());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFeedData = async () => {
    if (!feedText.trim()) {
      alert('Vui lòng nhập nội dung bài viết.');
      return;
    }

    setIsProcessing(true);
    try {
      // 0. Generate Title Automatically
      const now = new Date();
      const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
      const autoTitle = await generateTimelineTitle(feedText, dateStr);
      
      // 1. Add to Timeline
      addTimelineEntry(autoTitle, feedText);
      
      // 2. Update Brain (Global Plot & Characters)
      await analyzeArticleForBrain(feedText);
      
      // 3. Refresh UI
      const newData = loadBrainData();
      setData(newData);
      onDataChange();
      
      setFeedText('');
      setIsFeeding(false);
      alert('Nạp dữ liệu Dòng thời gian và cập nhật BRAIN thành công!');
    } catch (e) {
      alert('Lỗi khi nạp dữ liệu: ' + (e instanceof Error ? e.message : 'Lỗi không xác định'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-drama-950 border border-drama-700 w-[80vw] h-[80vh] rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-fade-in relative">
        
        {/* Header */}
        <div className="p-6 border-b border-drama-800 flex justify-between items-center bg-gradient-to-r from-drama-900 to-drama-950">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <div className="w-2 h-8 bg-gold-500 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
              Dòng Thời Gian (Timeline)
            </h2>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">Lưu trữ & Đối soát dữ liệu thực tế</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsFeeding(true)}
              className="px-5 py-2.5 bg-gold-500 text-drama-950 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20 active:scale-95"
            >
              Nạp Dữ Liệu Mới
            </button>
            <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-white hover:bg-drama-800 rounded-xl transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-grow overflow-hidden flex">
          
          {/* List Side */}
          <div className="w-1/3 border-r border-drama-800 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-black/20">
            {data?.timeline && data.timeline.length > 0 ? (
              data.timeline.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 group ${
                    selectedEntry?.id === entry.id 
                      ? 'bg-gold-500 border-gold-400 shadow-lg shadow-gold-500/10' 
                      : 'bg-drama-900/40 border-drama-800 hover:border-gold-500/50 hover:bg-drama-800'
                  }`}
                >
                  <h4 className={`text-sm font-bold leading-snug ${selectedEntry?.id === entry.id ? 'text-drama-950' : 'text-gray-200 group-hover:text-white'}`}>
                    <span className={selectedEntry?.id === entry.id ? 'text-drama-950/70' : 'text-gold-500'}>[{entry.fedDate}]</span> | {entry.contentTitle}
                  </h4>
                </button>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-30">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <p className="font-black uppercase tracking-widest text-xs">Chưa có dữ liệu</p>
              </div>
            )}
          </div>

          {/* Detail Side */}
          <div className="w-2/3 overflow-y-auto p-10 custom-scrollbar bg-drama-950/50">
            {selectedEntry ? (
              <div className="animate-fade-in">
                <div className="mb-8 pb-8 border-b border-drama-800">
                  <div className="inline-block px-3 py-1 bg-gold-500/10 text-gold-500 rounded-md text-[10px] font-black uppercase tracking-widest mb-4">
                    Ngày nạp: {selectedEntry.fedDate}
                  </div>
                  <h3 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">
                    {selectedEntry.contentTitle}
                  </h3>
                </div>
                <div className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap font-medium opacity-90">
                  {selectedEntry.content}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-700">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-drama-800 flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                </div>
                <p className="font-bold uppercase tracking-[0.3em] text-[10px]">Chọn một bài viết để xem chi tiết</p>
              </div>
            )}
          </div>
        </div>

        {/* Feed Data Overlay */}
        {isFeeding && (
          <div className="absolute inset-0 z-20 bg-drama-950 flex flex-col animate-slide-up">
            <div className="p-6 border-b border-drama-800 flex justify-between items-center bg-drama-900">
              <h3 className="text-xl font-black text-gold-500 uppercase tracking-tighter">Nạp Dữ Liệu Dòng Thời Gian</h3>
              <button 
                onClick={() => setIsFeeding(false)}
                className="text-gray-400 hover:text-white font-bold text-[10px] uppercase tracking-widest bg-drama-800 px-4 py-2 rounded-lg"
              >
                Hủy bỏ
              </button>
            </div>
            <div className="flex-grow p-6 overflow-y-auto custom-scrollbar flex flex-col space-y-6">
              <div className="flex-grow flex flex-col">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-2">Nội dung bài viết (Dùng để cập nhật BRAIN ACTIVE & Tự tạo tiêu đề)</label>
                <textarea 
                  value={feedText}
                  onChange={(e) => setFeedText(e.target.value)}
                  placeholder="Dán nội dung bài viết recap hoặc spoiler tại đây..."
                  className="w-full flex-grow bg-black/40 border border-drama-800 rounded-2xl p-6 text-white leading-relaxed focus:border-gold-500 outline-none transition-all shadow-inner resize-none custom-scrollbar min-h-[200px] text-sm"
                />
              </div>
            </div>
            <div className="p-6 border-t border-drama-800 bg-drama-900 flex justify-center">
              <button 
                onClick={handleFeedData}
                disabled={isProcessing}
                className={`px-12 py-4 rounded-xl font-black text-drama-950 uppercase tracking-widest shadow-2xl transition-all transform hover:-translate-y-1 active:translate-y-0 text-xs ${isProcessing ? 'bg-gray-600 cursor-not-allowed' : 'bg-gold-500 hover:bg-gold-400 shadow-gold-500/30'}`}
              >
                {isProcessing ? (
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-drama-950 border-t-transparent rounded-full animate-spin"></div>
                    Đang xử lý...
                  </div>
                ) : 'Xác nhận nạp dữ liệu'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
