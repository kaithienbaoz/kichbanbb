
import React from 'react';

interface LoaderProps {
  message?: string;
}

export const Loader: React.FC<LoaderProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 w-full">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500 mb-4 shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
      <p className="text-gray-300 text-lg animate-pulse tracking-wide text-center uppercase font-black text-xs tracking-[0.2em]">
        {message || "Đang xử lý dữ liệu..."}
      </p>
    </div>
  );
};
