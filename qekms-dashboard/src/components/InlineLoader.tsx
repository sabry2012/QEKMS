import React from 'react';
import { Loader2 } from 'lucide-react';

interface InlineLoaderProps {
  message?: string;
  className?: string;
}

export const InlineLoader: React.FC<InlineLoaderProps> = ({ 
  message = "Syncing Node...", 
  className = "" 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 space-y-3 fade-in duration-500 ${className}`}>
      <Loader2 className="w-8 h-8 text-blue-500/50" />
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8696a0]">
        {message}
      </span>
    </div>
  );
};
