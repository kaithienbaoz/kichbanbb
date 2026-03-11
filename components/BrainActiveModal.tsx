import React, { useState, useEffect } from 'react';
import { BrainActiveData, CharacterKnowledge, PastPlot } from '../types';
import { loadBrainData, saveBrainData, deleteCharacter, updateGlobalPlot, syncCharactersFromSheet } from '../services/brainService';
import { analyzeArticleForBrain, updateBrainFromSearch } from '../services/geminiService';

interface BrainActiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChange: () => void;
}

export const BrainActiveModal: React.FC<BrainActiveModalProps> = ({ isOpen, onClose, onDataChange }) => {
  const [data, setData] = useState<BrainActiveData | null>(null);
  const [editingChar, setEditingChar] = useState<CharacterKnowledge | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isFeeding, setIsFeeding] = useState(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [feedText, setFeedText] = useState('');
  const [isProcessingFeed, setIsProcessingFeed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setData(loadBrainData());
    }
  }, [isOpen]);

  if (!isOpen || !data) return null;

  const handleSaveGlobal = (plot: string) => {
    updateGlobalPlot(plot);
    const newData = loadBrainData();
    setData(newData);
    onDataChange();
  };

  const handleSaveTemplate = (key: 'perplexityTemplate' | 'customPromptTemplate' | 'articlePromptTemplate' | 'backupLink1' | 'backupLink2', val: string) => {
    const newData = { ...data, [key]: val };
    saveBrainData(newData);
    setData(newData);
    onDataChange();
  };

  const handleSaveCharacter = (char: CharacterKnowledge, originalName?: string) => {
    const trimmedName = char.name.trim();
    if (!trimmedName) return alert('Tên nhân vật không được để trống');

    let newChars = [...data.characters];
    
    // If renaming, remove the old name first
    if (originalName && originalName.trim().toLowerCase() !== trimmedName.toLowerCase()) {
      newChars = newChars.filter(c => c.name.trim().toLowerCase() !== originalName.trim().toLowerCase());
    }

    const index = newChars.findIndex(c => c.name.trim().toLowerCase() === trimmedName.toLowerCase());
    
    const updatedChar = { ...char, name: trimmedName, lastUpdated: new Date().toISOString() };

    if (index >= 0) {
      newChars[index] = updatedChar;
    } else {
      newChars.push(updatedChar);
    }

    const newData = { ...data, characters: newChars };
    saveBrainData(newData);
    
    // Refresh from loadBrainData to get the cleaned/deduplicated state
    const cleanData = loadBrainData();
    setData(cleanData);
    setEditingChar(null);
    setIsAdding(false);
    onDataChange();
  };

  const handleDeleteChar = (name: string): boolean => {
    deleteCharacter(name);
    // Force a fresh load and state update
    const freshData = loadBrainData();
    setData({ ...freshData }); 
    onDataChange();
    return true;
  };

  const handleProcessFeed = async () => {
    if (!feedText.trim()) return alert('Vui lòng dán nội dung bài báo');
    
    setIsProcessingFeed(true);
    try {
      await analyzeArticleForBrain(feedText);
      const newData = loadBrainData();
      setData(newData);
      setFeedText('');
      setIsFeeding(false);
      onDataChange();
      alert('Nạp dữ liệu thành công! BRAIN ACTIVE đã được cập nhật.');
    } catch (e) {
      alert('Lỗi khi phân tích dữ liệu: ' + (e instanceof Error ? e.message : 'Lỗi không xác định'));
    } finally {
      setIsProcessingFeed(false);
    }
  };

  const handleSyncSheet = async () => {
    console.log("Sync button clicked");
    setIsSyncingSheet(true);
    try {
      const result = await syncCharactersFromSheet();
      console.log("Sync result:", result);
      
      const newData = loadBrainData();
      setData(newData);
      onDataChange();
      
      if (!result) {
        alert('Không thể kết nối với Google Sheet. Vui lòng kiểm tra lại đường truyền.');
      } else if (result.total === 0 && result.added.length === 0) {
        alert('Cảnh báo: Không tìm thấy nhân vật nào trong Cột N của Google Sheet. Vui lòng kiểm tra lại file.');
      } else if (result.added.length === 0 && result.removed.length === 0) {
        alert('Đồng bộ hoàn tất: Không có gì thay đổi so với danh sách hiện tại.');
      } else {
        let msg = `Đồng bộ hoàn tất! (Tổng cộng: ${result.total} nhân vật)\n`;
        if (result.added.length > 0) {
          msg += `\n+ Thêm mới (${result.added.length}): ${result.added.join(', ')}`;
        }
        if (result.removed.length > 0) {
          msg += `\n- Loại bỏ (${result.removed.length}): ${result.removed.join(', ')}`;
        }
        alert(msg);
      }
    } catch (e) {
      console.error("Sync error:", e);
      alert('Lỗi khi đồng bộ từ Sheet: ' + (e instanceof Error ? e.message : 'Lỗi không xác định'));
    } finally {
      setIsSyncingSheet(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-drama-900 border border-drama-700 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="p-6 border-b border-drama-800 flex justify-between items-center bg-gradient-to-r from-drama-900 to-drama-800">
          <div>
            <h2 className="text-2xl font-black text-gold-500 uppercase tracking-tighter">BRAIN ACTIVE</h2>
            <p className="text-xs text-gray-400">Hệ thống lưu trữ cốt truyện và nhân vật</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-drama-700 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Global Plot */}
          <section>
            <h3 className="text-gold-500 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-gold-500 rounded-full"></span>
              Cốt truyện tổng thể (Global Plot - English Only)
            </h3>
            <textarea
              className="w-full bg-drama-950 border border-drama-700 rounded-xl p-4 text-sm text-gray-300 focus:ring-1 focus:ring-gold-500 outline-none h-32"
              value={data.generalPlot}
              onChange={(e) => handleSaveGlobal(e.target.value)}
              placeholder="- Point 1\n- Point 2\n- Point 3..."
            />
            <p className="text-[10px] text-gray-500 mt-2 italic">Cập nhật lần cuối: {data.lastGlobalUpdate ? new Date(data.lastGlobalUpdate).toLocaleString('vi-VN') : 'N/A'}</p>
          </section>

          {/* Past Plots */}
          {data.pastPlots && data.pastPlots.length > 0 && (
            <section>
              <h3 className="text-gold-500 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                Cốt truyện cũ (Past Plots)
              </h3>
              <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                {data.pastPlots.map((plot) => (
                  <div key={plot.id} className="bg-drama-950/50 border border-drama-800 rounded-xl p-4 text-xs text-gray-500">
                    <div className="flex justify-between mb-2 border-b border-drama-800 pb-1">
                      <span className="font-bold text-gold-500/50 uppercase tracking-widest">Lưu trữ ngày: {plot.date ? new Date(plot.date).toLocaleString('vi-VN') : 'N/A'}</span>
                    </div>
                    <p className="line-clamp-3 italic">"{plot.content}"</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Backup Links Section */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-gold-500 text-[10px] font-black uppercase tracking-widest mb-1">Link DỰ PHÒNG 1</h3>
              <input
                type="text"
                className="w-full bg-drama-950 border border-drama-700 rounded-xl p-3 text-xs text-gray-400 focus:ring-1 focus:ring-gold-500 outline-none"
                value={data.backupLink1 || ''}
                onChange={(e) => handleSaveTemplate('backupLink1', e.target.value)}
                placeholder="Nhập link dự phòng 1..."
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-gold-500 text-[10px] font-black uppercase tracking-widest mb-1">Link DỰ PHÒNG 2</h3>
              <input
                type="text"
                className="w-full bg-drama-950 border border-drama-700 rounded-xl p-3 text-xs text-gray-400 focus:ring-1 focus:ring-gold-500 outline-none"
                value={data.backupLink2 || ''}
                onChange={(e) => handleSaveTemplate('backupLink2', e.target.value)}
                placeholder="Nhập link dự phòng 2..."
              />
            </div>
          </section>

          {/* Characters List */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-gold-500 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-gold-500 rounded-full"></span>
                Dữ liệu nhân vật ({data.characters.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={handleSyncSheet}
                  disabled={isSyncingSheet}
                  className={`px-4 py-2 bg-drama-800 border border-green-500/30 text-green-400 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-green-500 hover:text-white transition-colors flex items-center gap-2 ${isSyncingSheet ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSyncingSheet ? (
                    <>
                      <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                      Đang đồng bộ...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                      Đồng bộ Nhân vật (Sheet)
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setIsFeeding(true)}
                  className="px-4 py-2 bg-drama-800 border border-gold-500/30 text-gold-500 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-gold-500 hover:text-drama-950 transition-colors"
                >
                  Nạp dữ liệu
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from(new Map<string, CharacterKnowledge>((data.characters || []).map(c => [c.name.trim().toLowerCase(), c])).values())
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((char) => (
                <div 
                  key={char.name} 
                  id={`char-node-${char.name.trim().replace(/\s+/g, '-')}`}
                  className="bg-drama-800/50 border border-drama-700 rounded-2xl p-4 hover:border-gold-500/50 transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-bold text-white">{char.name.split(' ')[0]}</h4>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingChar(char)} className="p-1.5 hover:bg-drama-700 rounded-lg text-gold-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteChar(char.name);
                        }} 
                        className="p-1.5 hover:bg-red-900/30 rounded-lg text-red-500 transition-colors"
                        title="Xóa nhân vật"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-gray-400">
                    <p className="line-clamp-1"><span className="text-gold-500/70 font-bold">Status:</span> {char.status}</p>
                    <p className="line-clamp-1"><span className="text-gold-500/70 font-bold">Plot:</span> {char.currentPlot}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Data Feed Modal */}
      {isFeeding && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-drama-900 border border-gold-500/30 w-full max-w-3xl rounded-3xl p-8 shadow-2xl space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-gold-500 uppercase tracking-tighter">Nạp dữ liệu vào BRAIN ACTIVE</h3>
              <button onClick={() => setIsFeeding(false)} className="text-gray-500 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <p className="text-xs text-gray-400">Dán nội dung bài báo, recap hoặc spoilers vào đây. AI sẽ tự động phân tích và cập nhật thông tin nhân vật cũng như cốt truyện tổng thể.</p>
            
            <textarea 
              className="w-full bg-drama-950 border border-drama-700 rounded-2xl p-5 text-white outline-none focus:border-gold-500 h-64 custom-scrollbar text-sm leading-relaxed"
              placeholder="Dán nội dung bài báo tại đây..."
              value={feedText}
              onChange={(e) => setFeedText(e.target.value)}
              disabled={isProcessingFeed}
            />

            <div className="flex gap-3">
              <button 
                onClick={handleProcessFeed}
                disabled={isProcessingFeed}
                className={`flex-grow py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${isProcessingFeed ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gold-500 text-drama-950 hover:bg-gold-400'}`}
              >
                {isProcessingFeed ? (
                  <>
                    <div className="w-4 h-4 border-2 border-drama-950 border-t-transparent rounded-full animate-spin"></div>
                    Đang phân tích dữ liệu...
                  </>
                ) : 'Bắt đầu nạp dữ liệu'}
              </button>
              <button 
                onClick={() => setIsFeeding(false)}
                disabled={isProcessingFeed}
                className="px-8 py-4 bg-drama-800 text-gray-400 rounded-2xl font-black uppercase tracking-widest hover:bg-drama-700 transition-all"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Add Modal */}
      {(editingChar || isAdding) && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90">
          <div className="bg-drama-900 border border-gold-500/30 w-full max-w-2xl rounded-3xl p-8 shadow-2xl space-y-6">
            <h3 className="text-xl font-black text-gold-500 uppercase tracking-tighter">
              {isAdding ? 'Thêm nhân vật mới' : `Chỉnh sửa: ${editingChar?.name}`}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gold-500 uppercase mb-1">Tên nhân vật (English Name)</label>
                <input 
                  type="text" 
                  className="w-full bg-drama-950 border border-drama-700 rounded-xl p-3 text-white outline-none focus:border-gold-500"
                  defaultValue={editingChar?.name || ''}
                  id="char-name"
                  placeholder="e.g. Steffy Forrester"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gold-500 uppercase mb-1">Trạng thái (Status - English)</label>
                  <textarea 
                    className="w-full bg-drama-950 border border-drama-700 rounded-xl p-3 text-white outline-none focus:border-gold-500 h-20"
                    defaultValue={editingChar?.status || ''}
                    id="char-status"
                    placeholder="- CEO of Forrester Creations\n- Currently in Los Angeles..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gold-500 uppercase mb-1">Mối quan hệ (Relationships - English)</label>
                  <textarea 
                    className="w-full bg-drama-950 border border-drama-700 rounded-xl p-3 text-white outline-none focus:border-gold-500 h-20"
                    defaultValue={editingChar?.relationships || ''}
                    id="char-rel"
                    placeholder="- Married to Finn\n- Rivalry with Hope..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gold-500 uppercase mb-1">Quá khứ (Past - English)</label>
                <textarea 
                  className="w-full bg-drama-950 border border-drama-700 rounded-xl p-3 text-white outline-none focus:border-gold-500 h-20"
                  defaultValue={editingChar?.past || ''}
                  id="char-past"
                  placeholder="- Point 1\n- Point 2..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gold-500 uppercase mb-1">Cốt truyện hiện tại (Current Plot - English)</label>
                <textarea 
                  className="w-full bg-drama-950 border border-drama-700 rounded-xl p-3 text-white outline-none focus:border-gold-500 h-24"
                  defaultValue={editingChar?.currentPlot || ''}
                  id="char-plot"
                  placeholder="- Point 1\n- Point 2..."
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <button 
                onClick={() => {
                  const name = (document.getElementById('char-name') as HTMLInputElement).value;
                  const status = (document.getElementById('char-status') as HTMLTextAreaElement).value;
                  const relationships = (document.getElementById('char-rel') as HTMLTextAreaElement).value;
                  const past = (document.getElementById('char-past') as HTMLTextAreaElement).value;
                  const currentPlot = (document.getElementById('char-plot') as HTMLTextAreaElement).value;
                  
                  if (!name) return alert('Vui lòng nhập tên nhân vật');
                  
                  handleSaveCharacter({
                    name, status, relationships, past, currentPlot,
                    lastUpdated: new Date().toISOString()
                  }, editingChar?.name);
                }}
                className="flex-grow py-4 bg-gold-500 text-drama-950 rounded-2xl font-black uppercase tracking-widest hover:bg-gold-400 transition-all"
              >
                Lưu dữ liệu
              </button>
              
              {!isAdding && editingChar && (
                <button 
                  onClick={() => {
                    if (handleDeleteChar(editingChar.name)) {
                      setEditingChar(null);
                    }
                  }}
                  className="px-6 py-4 bg-red-600/20 text-red-500 border border-red-500/30 rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
                >
                  Xóa nhân vật
                </button>
              )}

              <button 
                onClick={() => { setEditingChar(null); setIsAdding(false); }}
                className="px-8 py-4 bg-drama-800 text-gray-400 rounded-2xl font-black uppercase tracking-widest hover:bg-drama-700 transition-all"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
