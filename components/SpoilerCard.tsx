
import React, { useState, useEffect, useRef } from 'react';
import { Spoiler, LongArticleResult } from '../types';
import { generateLongArticle, updateBrainFromSearch } from '../services/geminiService';
import { saveSpoilerToArchive } from '../services/storageService';
import { ArticleResultModal } from './ArticleResultModal';

interface SpoilerCardProps {
  spoiler: Spoiler;
  index: number;
  perplexityTemplate?: string;
  customPromptTemplate?: string;
  articlePromptTemplate?: string;
  onArchiveChange?: () => void;
  isArchivedView?: boolean;
}

export const SpoilerCard: React.FC<SpoilerCardProps> = ({ 
  spoiler, 
  index, 
  perplexityTemplate,
  customPromptTemplate,
  articlePromptTemplate,
  onArchiveChange,
  isArchivedView = false
}) => {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedWriteMode, setSelectedWriteMode] = useState<1 | 2 | 3 | null>(null);
  const [editedLines, setEditedLines] = useState<string[]>([]);
  const [isWriting, setIsWriting] = useState(false);
  const [articleResult, setArticleResult] = useState<LongArticleResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [copyEngStatus, setCopyEngStatus] = useState(false);

  const engScrollRef = useRef<HTMLDivElement>(null);
  const vieScrollRef = useRef<HTMLDivElement>(null);
  const linesScrollRef = useRef<HTMLDivElement>(null);
  const syncLock = useRef(false);

  useEffect(() => {
    if (spoiler.content) {
      const lines = spoiler.content
        .split('.')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => s + '.');
      setEditedLines(lines);
    }
  }, [spoiler.content]);

  useEffect(() => {
    if (isEditing && linesScrollRef.current) {
      linesScrollRef.current.scrollTop = linesScrollRef.current.scrollHeight;
    }
  }, [editedLines, isEditing]);

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

  const handleCopy = async () => {
    const textToCopy = spoiler.content;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch (err) { console.error(err); }
  };

  const handleSave = () => {
    const success = saveSpoilerToArchive(spoiler);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (onArchiveChange) onArchiveChange();
    } else {
      alert("Kịch bản này đã được lưu trữ trước đó.");
    }
  };

  const handleGenerateArticle = async () => {
    if (!selectedWriteMode) return;
    
    setIsWriting(true);
    setArticleResult(null);
    setGenerationStep('Đang tìm kiếm 15+ bài báo liên quan...');
    
    try {
      // Step 1: Update Brain from Search for this specific spoiler
      await updateBrainFromSearch(spoiler.content);
      
      setGenerationStep('Đang sáng tạo bài viết song ngữ...');
      
      let template = "";
      if (selectedWriteMode === 1) template = perplexityTemplate || "";
      else if (selectedWriteMode === 2) template = customPromptTemplate || "";
      else if (selectedWriteMode === 3) template = articlePromptTemplate || "";
      
      const result = await generateLongArticle(editedLines, template);
      setArticleResult(result);
      setShowResultModal(true);
    } catch (err: any) {
      alert(err.message || "Đã xảy ra lỗi khi tạo bài viết.");
    } finally {
      setIsWriting(false);
      setGenerationStep('');
    }
  };

  const handleLineChange = (idx: number, newVal: string) => {
    const newLines = [...editedLines];
    newLines[idx] = newVal;
    setEditedLines(newLines);
  };

  const deleteLine = (idx: number) => {
    setEditedLines(editedLines.filter((_, i) => i !== idx));
  };

  const addLine = () => {
    setEditedLines([...editedLines, ""]);
  };

  const copyEnglish = async () => {
    if (articleResult) {
      await navigator.clipboard.writeText(articleResult.english);
      setCopyEngStatus(true);
      setTimeout(() => setCopyEngStatus(false), 2000);
    }
  };

  return (
    <div className="group relative bg-drama-900/40 backdrop-blur-sm rounded-2xl shadow-xl border border-drama-700/50 hover:border-gold-500/50 transition-all duration-500 w-full overflow-hidden mb-8">
      <div className="p-6 md:p-10 relative z-10">
        {!isEditing ? (
          <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-start gap-5">
              <div className="flex-shrink-0">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-gold-600 to-gold-400 text-drama-950 font-black text-xl shadow-lg">
                  {index + 1}
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="text-2xl md:text-3xl font-extrabold text-white group-hover:text-gold-400 leading-tight mb-4">
                  {spoiler.title}
                </h3>
                <div className="w-16 h-1 bg-gold-500 mb-6 group-hover:w-32 transition-all duration-500 rounded-full"></div>
                <p className="text-gray-300 text-lg md:text-xl leading-relaxed mb-6">
                  {spoiler.content}
                </p>

                {/* Grounding Sources Display */}
                {spoiler.sources && spoiler.sources.length > 0 && (
                  <div className="mb-8 p-6 bg-black/40 rounded-2xl border border-drama-800 shadow-inner">
                    <p className="text-[11px] text-gold-500 font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                      Nguồn đối soát thực tế (Grounding Sources):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {spoiler.sources.map((source, sIdx) => (
                        <a 
                          key={sIdx} 
                          href={source.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-drama-800/50 hover:bg-gold-500 hover:text-drama-950 rounded-xl transition-all duration-300 border border-drama-700 hover:border-gold-400 group/source"
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-drama-900 group-hover/source:bg-drama-950 flex items-center justify-center transition-colors">
                            <svg className="w-4 h-4 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                          </div>
                          <div className="flex-grow min-w-0">
                            <p className="text-[11px] font-bold leading-tight truncate">{source.title}</p>
                            <p className="text-[9px] opacity-50 truncate mt-0.5">{source.uri}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-drama-700/30">
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all ${copied ? 'bg-green-600 text-white' : 'bg-drama-800 text-gold-500 border border-gold-500/30 hover:bg-gold-500 hover:text-drama-950 shadow-lg'}`}
                  >
                    {copied ? 'ĐÃ SAO CHÉP' : 'SAO CHÉP'}
                  </button>
                  {!isArchivedView && (
                    <button
                      onClick={handleSave}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all ${saved ? 'bg-amber-600 text-white' : 'bg-drama-800 text-amber-500 border border-amber-500/30 hover:bg-amber-500 hover:text-white shadow-lg'}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                      {saved ? 'ĐÃ LƯU' : 'LƯU TRỮ'}
                    </button>
                  )}
                </div>
                {isWriting && generationStep && (
                  <div className="mt-4 text-center">
                    <p className="text-[10px] text-gold-500 font-black uppercase tracking-[0.2em] animate-pulse">
                      {generationStep}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xl font-black text-gold-500 uppercase tracking-widest">Bảng Chỉnh Sửa Dòng</h4>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-white text-xs uppercase font-bold bg-drama-800 px-3 py-1 rounded-md">Đóng</button>
            </div>
            
            <div 
              ref={linesScrollRef}
              className="space-y-3 mb-6 max-h-80 overflow-y-auto pr-2 custom-scrollbar"
            >
              {editedLines.map((line, idx) => (
                <div key={idx} className="flex gap-2 group/line">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-drama-700 flex items-center justify-center text-[10px] text-gray-400 font-bold self-start mt-2">
                    {idx + 1}
                  </div>
                  <textarea
                    value={line}
                    onChange={(e) => handleLineChange(idx, e.target.value)}
                    className="flex-grow bg-black/40 border border-drama-700 rounded-lg p-4 text-white text-base focus:border-gold-500 outline-none min-h-[50px] resize-none transition-all shadow-inner"
                  />
                  <button 
                    onClick={() => deleteLine(idx)}
                    className="flex-shrink-0 text-red-500/50 hover:text-red-500 p-2 self-center opacity-0 group-hover/line:opacity-100 transition-opacity"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4">
              <button 
                onClick={addLine}
                className="w-full py-3 border border-dashed border-drama-700 text-gray-500 hover:border-gold-500/50 hover:text-gold-500 rounded-xl transition-all font-bold text-xs uppercase tracking-widest"
              >
                + Chèn thêm một dòng sự kiện mới
              </button>
            </div>

            {articleResult && (
              <div className="mt-12 animate-fade-in border-t border-drama-700 pt-10">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                  <h5 className="text-xl font-black text-white uppercase tracking-widest text-center md:text-left">
                    NỘI DUNG BÀI VIẾT SONG NGỮ ({articleResult.english.length.toLocaleString()} ký tự)
                  </h5>
                  <button 
                    onClick={copyEnglish}
                    className={`px-6 py-3 rounded-xl text-xs font-black tracking-widest transition-all shadow-xl ${copyEngStatus ? 'bg-green-600 text-white shadow-green-500/20' : 'bg-gold-500 text-drama-950 hover:bg-gold-400 shadow-gold-500/20'}`}
                  >
                    {copyEngStatus ? '✓ ĐÃ SAO CHÉP' : 'SAO CHÉP BẢN ENGLISH'}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-drama-800 rounded-3xl overflow-hidden h-[700px] shadow-2xl">
                  <div 
                    ref={engScrollRef}
                    onScroll={() => handleSyncScroll('eng')}
                    className="bg-black/60 p-8 md:p-12 overflow-y-auto custom-scrollbar border-r border-drama-800/50"
                  >
                    <div className="text-gray-100 text-lg leading-[1.8] whitespace-pre-wrap">
                      {articleResult.english}
                    </div>
                  </div>
                  
                  <div 
                    ref={vieScrollRef}
                    onScroll={() => handleSyncScroll('vie')}
                    className="bg-black/40 p-8 md:p-12 overflow-y-auto custom-scrollbar"
                  >
                    <div className="text-gray-200 text-lg leading-[1.8] whitespace-pre-wrap opacity-90">
                      {articleResult.vietnamese}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex flex-col items-center gap-2">
                  <p className="text-[10px] text-gray-600 uppercase tracking-[0.3em] font-bold">
                    Nội dung cuộn đã được đồng bộ hóa hoàn toàn giữa hai ngôn ngữ
                  </p>
                  <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-gold-500/30 to-transparent"></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {articleResult && (
        <ArticleResultModal 
          isOpen={showResultModal}
          onClose={() => setShowResultModal(false)}
          initialResult={articleResult}
          title={spoiler.title}
        />
      )}

      <div className="absolute bottom-0 left-0 w-full h-[2px] overflow-hidden">
        <div className="w-full h-full bg-drama-800"></div>
        <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-transparent via-gold-400 to-transparent animate-[shimmer_3s_infinite] -translate-x-full"></div>
      </div>
    </div>
  );
};
