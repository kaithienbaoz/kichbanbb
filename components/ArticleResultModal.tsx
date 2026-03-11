import React, { useState, useEffect, useRef } from 'react';
import { LongArticleResult } from '../types';
import { updateEnglishParagraph } from '../services/geminiService';

interface ArticleResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialResult: LongArticleResult;
  title: string;
}

interface ParagraphPair {
  english: string;
  vietnamese: string;
}

export const ArticleResultModal: React.FC<ArticleResultModalProps> = ({ 
  isOpen, 
  onClose, 
  initialResult,
  title
}) => {
  const [pairs, setPairs] = useState<ParagraphPair[]>([]);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [copyStatus, setCopyStatus] = useState<'none' | 'eng' | 'vie'>('none');
  
  const engScrollRef = useRef<HTMLDivElement>(null);
  const vieScrollRef = useRef<HTMLDivElement>(null);
  const syncLock = useRef(false);

  useEffect(() => {
    if (isOpen && initialResult) {
      // Split by double newlines to get paragraphs
      const engParas = initialResult.english.split(/\n\n+/).filter(p => p.trim());
      const vieParas = initialResult.vietnamese.split(/\n\n+/).filter(p => p.trim());
      
      const newPairs: ParagraphPair[] = [];
      const maxLen = Math.max(engParas.length, vieParas.length);
      
      for (let i = 0; i < maxLen; i++) {
        newPairs.push({
          english: engParas[i] || "",
          vietnamese: vieParas[i] || ""
        });
      }
      setPairs(newPairs);
    }
  }, [isOpen, initialResult]);

  const handleSyncScroll = (source: 'eng' | 'vie') => {
    if (syncLock.current) return;
    syncLock.current = true;

    const sourceEl = source === 'eng' ? engScrollRef.current : vieScrollRef.current;
    const targetEl = source === 'eng' ? vieScrollRef.current : engScrollRef.current;

    if (sourceEl && targetEl) {
      const scrollPercentage = sourceEl.scrollTop / (sourceEl.scrollHeight - sourceEl.clientHeight);
      targetEl.scrollTop = scrollPercentage * (targetEl.scrollHeight - targetEl.clientHeight);
    }

    setTimeout(() => { syncLock.current = false; }, 20);
  };

  const handleVieChange = async (index: number, newVie: string) => {
    const newPairs = [...pairs];
    newPairs[index].vietnamese = newVie;
    setPairs(newPairs);
  };

  const handleVieBlur = async (index: number) => {
    const pair = pairs[index];
    if (!pair.vietnamese.trim()) return;
    
    setIsUpdating(index);
    try {
      const updatedEng = await updateEnglishParagraph(pair.vietnamese, pair.english);
      const newPairs = [...pairs];
      newPairs[index].english = updatedEng;
      setPairs(newPairs);
    } catch (err) {
      console.error("Failed to update English paragraph", err);
    } finally {
      setIsUpdating(null);
    }
  };

  const copyText = async (type: 'eng' | 'vie') => {
    const text = pairs.map(p => type === 'eng' ? p.english : p.vietnamese).join("\n\n");
    await navigator.clipboard.writeText(text);
    setCopyStatus(type);
    setTimeout(() => setCopyStatus('none'), 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/95 backdrop-blur-xl"
        onClick={onClose}
      ></div>
      
      {/* Modal Content */}
      <div className="relative w-full max-w-[95vw] h-[90vh] bg-drama-950 border border-drama-800 rounded-[2.5rem] shadow-[0_0_150px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-fade-in">
        {/* Modal Header */}
        <div className="p-8 border-b border-drama-800 flex flex-col md:flex-row md:items-center justify-between bg-drama-900/50 gap-4">
          <div className="flex-grow">
            <h2 className="text-2xl md:text-3xl font-black text-gold-500 uppercase tracking-tighter truncate max-w-3xl">
              KẾT QUẢ BÀI VIẾT: {title}
            </h2>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">
              Hệ thống song ngữ &bull; Tự động đồng bộ hóa đoạn văn
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => copyText('eng')}
              className={`px-6 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all shadow-xl ${copyStatus === 'eng' ? 'bg-green-600 text-white' : 'bg-drama-800 text-gold-500 hover:bg-gold-500 hover:text-drama-950 border border-gold-500/30'}`}
            >
              {copyStatus === 'eng' ? '✓ ĐÃ SAO CHÉP ENGLISH' : 'SAO CHÉP ENGLISH'}
            </button>
            <button 
              onClick={() => copyText('vie')}
              className={`px-6 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all shadow-xl ${copyStatus === 'vie' ? 'bg-green-600 text-white' : 'bg-drama-800 text-gold-500 hover:bg-gold-500 hover:text-drama-950 border border-gold-500/30'}`}
            >
              {copyStatus === 'vie' ? '✓ ĐÃ SAO CHÉP TIẾNG VIỆT' : 'SAO CHÉP TIẾNG VIỆT'}
            </button>
            <button 
              onClick={onClose}
              className="p-3 hover:bg-drama-800 rounded-full text-gray-400 hover:text-white transition-all border border-transparent hover:border-drama-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>

        {/* Dual Pane Content */}
        <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
          {/* English Pane */}
          <div 
            ref={engScrollRef}
            onScroll={() => handleSyncScroll('eng')}
            className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar bg-black/40 border-r border-drama-800/50"
          >
            <div className="max-w-4xl mx-auto space-y-12">
              {pairs.map((pair, idx) => (
                <div key={idx} className={`relative p-6 rounded-2xl transition-all ${isUpdating === idx ? 'bg-blue-900/20 border border-blue-500/30 animate-pulse' : 'bg-transparent border border-transparent'}`}>
                  {isUpdating === idx && (
                    <div className="absolute -top-3 left-6 bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                      Đang dịch lại đoạn này...
                    </div>
                  )}
                  <div className="text-gray-100 text-lg leading-[1.8] whitespace-pre-wrap font-serif">
                    {pair.english}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vietnamese Pane */}
          <div 
            ref={vieScrollRef}
            onScroll={() => handleSyncScroll('vie')}
            className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar bg-black/20"
          >
            <div className="max-w-4xl mx-auto space-y-12">
              {pairs.map((pair, idx) => (
                <div key={idx} className="group relative">
                  <div className="absolute -left-8 top-2 text-[10px] text-gray-700 font-black opacity-0 group-hover:opacity-100 transition-opacity">
                    #{idx + 1}
                  </div>
                  <textarea
                    value={pair.vietnamese}
                    onChange={(e) => handleVieChange(idx, e.target.value)}
                    onBlur={() => handleVieBlur(idx)}
                    className="w-full bg-transparent text-gray-200 text-lg leading-[1.8] whitespace-pre-wrap font-serif border-none focus:ring-0 p-0 resize-none min-h-[100px] outline-none hover:bg-white/5 rounded-xl transition-colors p-6"
                    placeholder="Nhập nội dung tiếng Việt..."
                    rows={pair.vietnamese.split('\n').length + 1}
                  />
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-drama-800 to-transparent mt-4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-drama-800 bg-drama-900/80 flex justify-between items-center">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em]">
            Chỉnh sửa tiếng Việt để tự động cập nhật tiếng Anh tương ứng &bull; B&B Drama Spoilers
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Hệ thống sẵn sàng</span>
          </div>
        </div>
      </div>
    </div>
  );
};
