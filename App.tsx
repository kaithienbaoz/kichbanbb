
// FIX: Added missing React import to resolve errors where the React namespace was not found for types like FC and KeyboardEvent
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateSpoilers, updateBrainFromSearch, updateBrainFromSpecificSources } from './services/geminiService';
import { loadBrainData } from './services/brainService';
import { SpoilerCard } from './components/SpoilerCard';
import { Loader } from './components/Loader';
import { BrainActiveModal } from './components/BrainActiveModal';
import { ArchiveModal } from './components/ArchiveModal';
import { TimelineModal } from './components/TimelineModal';
import { Spoiler, BrainActiveData } from './types';

const App: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [spoilers, setSpoilers] = useState<Spoiler[]>([]);
  const [brainData, setBrainData] = useState<BrainActiveData | null>(null);
  const [showCharPicker, setShowCharPicker] = useState(false);
  const [showBrainModal, setShowBrainModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingBrain, setIsUpdatingBrain] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  const charPickerRef = useRef<HTMLDivElement>(null);

  const characters: string[] = Array.from(
    new Map<string, string>((brainData?.characters || []).map(c => [c.name.trim().toLowerCase(), c.name.trim()])).values()
  ).sort((a, b) => a.localeCompare(b));

  // Fetch initial brain data
  useEffect(() => {
    setBrainData(loadBrainData());
  }, []);

  const refreshBrainData = () => {
    setBrainData(loadBrainData());
  };

  const playTingSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.warn("Audio playback failed:", e));
    } catch (e) {
      console.warn("Audio initialization failed:", e);
    }
  };

  // Close char picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (charPickerRef.current && !charPickerRef.current.contains(event.target as Node)) {
        setShowCharPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGenerate = useCallback(async (forcedTopic?: string) => {
    const topic = forcedTopic !== undefined ? forcedTopic : inputValue;
    
    setIsLoading(true);
    setError(null);
    setSpoilers([]);
    setHasSearched(false);
    setShowCharPicker(false);
    
    try {
      // Optimized: Single call for both spoilers and brain update
      const response = await generateSpoilers(topic, []);
      setSpoilers(response.spoilers);
      setHasSearched(true);
      playTingSound();
      
      // Refresh brain data since generateSpoilers already updated it
      refreshBrainData();
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi không xác định.");
    } finally {
      setIsLoading(false);
    }
  }, [inputValue]);

  const handleSelectCharacter = (name: string) => {
    setInputValue(name);
    handleGenerate(name);
  };

  const handleLoadMore = useCallback(async () => {
    setIsLoadingMore(true);
    setError(null);
    
    try {
      const currentTitles = spoilers.map(s => s.title);
      const response = await generateSpoilers(inputValue, currentTitles);
      setSpoilers(prev => [...prev, ...response.spoilers]);
      playTingSound();

      // Refresh brain data
      refreshBrainData();
    } catch (err: any) {
      setError(err.message || "Không thể tải thêm kịch bản.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [inputValue, spoilers]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGenerate();
    }
  };

  return (
    <div className="min-h-screen bg-drama-950 flex flex-col text-gray-100 font-sans selection:bg-gold-500 selection:text-black selection:bg-opacity-30">
      {/* Header */}
      <header className="bg-drama-900/90 backdrop-blur-xl border-b border-drama-800 py-8 px-4 sticky top-0 z-50 shadow-2xl">
        <div className="container mx-auto flex flex-col items-center">
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-white to-gold-600 mb-2 text-center tracking-tighter uppercase">
            B&B Drama Spoilers
          </h1>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <p className="text-gold-500/80 text-[10px] md:text-xs tracking-[0.3em] uppercase font-bold">
                Hệ thống sáng tạo kịch bản cao cấp
              </p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <button 
                onClick={() => setShowBrainModal(true)}
                className="flex items-center gap-2 text-[10px] text-gray-500 hover:text-gold-400 transition-colors font-bold uppercase tracking-widest bg-drama-800/50 px-3 py-1 rounded-full border border-drama-700"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                Quản lý BRAIN ACTIVE
              </button>
              <button 
                onClick={() => setShowTimelineModal(true)}
                className="flex items-center gap-2 text-[10px] text-gray-500 hover:text-green-400 transition-colors font-bold uppercase tracking-widest bg-drama-800/50 px-3 py-1 rounded-full border border-drama-700"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                DÒNG THỜI GIAN
              </button>
              <button 
                onClick={() => setShowArchiveModal(true)}
                className="flex items-center gap-2 text-[10px] text-gray-500 hover:text-amber-400 transition-colors font-bold uppercase tracking-widest bg-drama-800/50 px-3 py-1 rounded-full border border-drama-700"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                KHO LƯU TRỮ
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center relative overflow-hidden">
        {/* Background ambient light effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold-600/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-drama-800/20 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="container mx-auto px-4 py-12 max-w-5xl relative z-10">
          
          {/* Input Section */}
          <div className="bg-gradient-to-b from-drama-900 to-drama-950 border border-drama-700/50 rounded-3xl p-6 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-16 mx-auto transition-all hover:border-drama-600/50">
            <div className="flex items-center justify-between mb-4">
              <label htmlFor="topic-input" className="block text-gold-500 text-xs font-black uppercase tracking-[0.2em]">
                Nhân vật hoặc chủ đề trung tâm
              </label>
              <div className="hidden md:flex gap-3">
                <span className="text-[10px] text-gray-400 font-bold bg-drama-800/80 px-3 py-1.5 rounded-full border border-drama-700">
                  Model: Gemini 3 Pro
                </span>
                <span className="text-[10px] text-gray-400 font-bold bg-drama-800/80 px-3 py-1.5 rounded-full border border-drama-700">
                  Brain: Active
                </span>
                {brainData?.backupLink1 && (
                  <a 
                    href={brainData.backupLink1.startsWith('http') ? brainData.backupLink1 : `https://${brainData.backupLink1}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-gold-500 font-bold bg-drama-800/80 px-3 py-1.5 rounded-full border border-gold-500/30 hover:bg-gold-500 hover:text-drama-950 transition-all"
                  >
                    DỰ PHÒNG 1
                  </a>
                )}
                {brainData?.backupLink2 && (
                  <a 
                    href={brainData.backupLink2.startsWith('http') ? brainData.backupLink2 : `https://${brainData.backupLink2}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-gold-500 font-bold bg-drama-800/80 px-3 py-1.5 rounded-full border border-gold-500/30 hover:bg-gold-500 hover:text-drama-950 transition-all"
                  >
                    DỰ PHÒNG 2
                  </a>
                )}
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 relative">
              <div className="flex-grow flex flex-col md:flex-row gap-3">
                <div className="relative flex-grow">
                  <input
                    id="topic-input"
                    type="text"
                    className="w-full bg-drama-950/50 text-white text-lg p-5 border border-drama-700 rounded-2xl focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none transition-all placeholder-gray-700 shadow-inner"
                    placeholder="Nhập tên nhân vật (Hope, Steffy, Finn...) hoặc để trống"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading || isLoadingMore}
                  />
                </div>
                
                <div className="relative" ref={charPickerRef}>
                  <button
                    onClick={() => setShowCharPicker(!showCharPicker)}
                    disabled={isLoading || isLoadingMore}
                    className="h-full px-6 py-5 bg-drama-800 border border-gold-500/30 text-gold-500 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gold-500 hover:text-drama-950 transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    Nhân Vật
                  </button>
                                   {showCharPicker && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                      {/* Backdrop */}
                      <div 
                        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
                        onClick={() => setShowCharPicker(false)}
                      ></div>
                      
                      {/* Modal Content */}
                      <div className="relative w-full max-w-6xl max-h-[90vh] bg-drama-950 border border-drama-800 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-fade-in">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-drama-800 flex items-center justify-between bg-drama-900/50">
                          <div>
                            <h2 className="text-2xl md:text-3xl font-black text-gold-500 uppercase tracking-tighter">Chọn Nhân Vật Trung Tâm</h2>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Danh sách từ BRAIN ACTIVE ({characters.length})</p>
                          </div>
                          <button 
                            onClick={() => setShowCharPicker(false)}
                            className="p-3 hover:bg-drama-800 rounded-full text-gray-400 hover:text-white transition-all border border-transparent hover:border-drama-700"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                          </button>
                        </div>

                        {/* Character Grid */}
                        <div className="flex-grow overflow-y-auto p-4 md:p-8 custom-scrollbar bg-gradient-to-b from-transparent to-black/20">
                          {characters.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                              {characters.map((name) => (
                                <button
                                  key={name}
                                  id={`picker-char-${name.trim().replace(/\s+/g, '-')}`}
                                  onClick={() => handleSelectCharacter(name)}
                                  className="group relative flex flex-col items-center justify-center p-4 bg-drama-900/40 hover:bg-gold-500 border border-drama-800 hover:border-gold-400 rounded-2xl transition-all duration-300 hover:-translate-y-1 shadow-lg"
                                >
                                  <div className="w-10 h-10 rounded-full bg-drama-800 group-hover:bg-drama-950 flex items-center justify-center mb-2 transition-colors">
                                    <span className="text-lg font-black text-gold-500 group-hover:text-gold-400">{name.charAt(0).toUpperCase()}</span>
                                  </div>
                                  <span className="text-gray-300 group-hover:text-drama-950 text-[11px] font-black uppercase tracking-tight text-center break-words w-full">
                                    {name.split(' ')[0]}
                                  </span>
                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg className="w-3 h-3 text-drama-950" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                                  </div>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-600">
                              <svg className="w-20 h-20 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                              <p className="text-xl font-bold uppercase tracking-widest">Chưa có nhân vật nào</p>
                              <p className="text-sm mt-2">Hãy thêm nhân vật trong mục Quản lý BRAIN ACTIVE</p>
                            </div>
                          )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-drama-800 bg-drama-900/80 text-center">
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em]">Hệ thống sáng tạo kịch bản cao cấp &bull; B&B Drama Spoilers</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleGenerate()}
                disabled={isLoading || isLoadingMore}
                className={`px-10 py-5 rounded-2xl font-black text-drama-950 shadow-2xl transition-all transform hover:-translate-y-1 active:translate-y-0 flex-shrink-0 uppercase tracking-wider ${
                  isLoading 
                    ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                    : 'bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 hover:shadow-gold-500/40'
                }`}
              >
                {isLoading ? 'Đang sáng tạo...' : 'Tạo 10 Cú Twist'}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="max-w-2xl mx-auto bg-red-950/30 border border-red-500/50 text-red-200 p-6 mb-12 rounded-2xl text-center backdrop-blur-md animate-bounce-slow" role="alert">
              <p className="font-bold">{error}</p>
            </div>
          )}

          {/* Loader (Initial) */}
          {(isLoading || isUpdatingBrain) && (
            <div className="mb-16 w-full animate-fade-in">
              <Loader 
                message={isUpdatingBrain ? "Đang quét 20+ bài báo mới nhất để cập nhật BRAIN ACTIVE..." : "Đang sáng tạo kịch bản drama..."} 
              />
            </div>
          )}

          {/* Vertical List Results */}
          {!isLoading && spoilers.length > 0 && (
            <div className="animate-fade-in space-y-8 pb-20">
               <div className="flex items-center justify-between mb-10 px-2">
                 <div className="flex items-center">
                    <div className="h-10 w-1.5 bg-gold-500 rounded-full mr-5 shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
                    <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight font-serif">
                      {inputValue ? `Kịch bản xoay quanh "${inputValue}"` : "Sự kiện bùng nổ sắp tới"}
                    </h2>
                 </div>
                 <span className="text-gold-500/50 font-bold text-sm hidden md:block">{spoilers.length} Scenarios Generated</span>
               </div>
              
              <div className="grid grid-cols-1 gap-8">
                {spoilers.map((spoiler, index) => (
                  <SpoilerCard 
                    key={spoiler.id} 
                    spoiler={spoiler} 
                    index={index} 
                    perplexityTemplate={brainData?.perplexityTemplate}
                    customPromptTemplate={brainData?.customPromptTemplate}
                    articlePromptTemplate={brainData?.articlePromptTemplate}
                  />
                ))}
              </div>

              {/* Load More Button */}
              <div className="flex justify-center pt-12">
                 <button 
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className={`
                      group relative px-12 py-5 bg-drama-900 border-2 border-gold-500/50 text-gold-500 rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:bg-gold-500 hover:text-drama-950 transition-all duration-500 shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:shadow-gold-500/30
                      ${isLoadingMore ? 'opacity-70 cursor-wait scale-95' : 'hover:-translate-y-1'}
                    `}
                 >
                    {isLoadingMore ? (
                      <span className="flex items-center gap-3">
                         <span className="block w-5 h-5 border-3 border-current border-t-transparent rounded-full animate-spin"></span>
                         Biên kịch thêm...
                      </span>
                    ) : (
                      "Viết tiếp 10 kịch bản mới"
                    )}
                 </button>
              </div>
            </div>
          )}

          {!isLoading && !error && hasSearched && spoilers.length === 0 && (
              <div className="text-center text-gray-500 py-20 bg-drama-900/50 rounded-3xl border border-drama-800">
                  <p className="text-xl font-medium">Hiện không có drama nào mới đủ kịch tính. Thử lại sau?</p>
              </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-drama-800 py-12 text-center bg-drama-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4">
          <p className="text-gray-500 text-sm font-medium mb-2 tracking-wide uppercase">
            The Bold and the Beautiful Spoilers AI &bull; Premium Series
          </p>
          <p className="text-gray-600 text-[10px] md:text-xs">
            Dữ liệu đối chiếu chuẩn xác từ BRAIN ACTIVE. 
            Mọi kịch bản đều mang tính chất sáng tạo và giả định dựa trên diễn biến phim.
          </p>
        </div>
      </footer>
      
      <style>{`
        .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
        .animate-bounce-slow { animation: bounce 3s infinite; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
      <BrainActiveModal 
        isOpen={showBrainModal} 
        onClose={() => setShowBrainModal(false)} 
        onDataChange={refreshBrainData}
      />
      <ArchiveModal 
        isOpen={showArchiveModal} 
        onClose={() => setShowArchiveModal(false)} 
      />

      <TimelineModal 
        isOpen={showTimelineModal}
        onClose={() => setShowTimelineModal(false)}
        onDataChange={refreshBrainData}
      />
    </div>
  );
};

export default App;
