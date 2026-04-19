import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  message = "Failed to load cryptographic data.", 
  onRetry,
  className = "" 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 space-y-4 zoom-in-95 duration-500 ${className}`}>
      <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center">
        <ShieldAlert className="w-6 h-6 text-red-500" />
      </div>
      <div className="text-center">
        <p className="text-xs font-bold text-red-200/80 mb-1">{message}</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-red-500/60 transition-all">Protocol Interruption Detected</p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-5 py-2 rounded-xl border border-red-500/30 transition-all font-black uppercase tracking-widest text-[10px] active:scale-95"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Establish Link
      </button>
    </div>
  );
};
