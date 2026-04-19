import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ 
  icon: Icon, 
  error, 
  className = '', 
  ...props 
}) => {
  return (
    <div className="w-full relative">
      {Icon && (
        <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
      )}
      <input 
        className={`w-full bg-white/4 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-primary-cyan/50 focus:bg-white/5 ${Icon ? 'pl-11 pr-4' : 'px-4'} py-3.5 ${error ? 'border-red-500/50 focus:border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p className="text-red-400 text-xs mt-1.5 ml-1">{error}</p>
      )}
    </div>
  );
};
