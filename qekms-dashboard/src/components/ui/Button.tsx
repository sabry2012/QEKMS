import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false,
  className = '',
  disabled,
  ...props 
}) => {
  const baseStyle = "inline-flex items-center justify-center font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-mesh-gradient hover:bg-mesh-gradient-hover text-white shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:shadow-mesh-glow",
    secondary: "bg-white/5 border border-white/10 hover:bg-white/10 text-white",
    ghost: "bg-transparent hover:bg-white/5 text-gray-300 hover:text-white",
    danger: "bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20",
  };

  const sizes = {
    sm: "px-4 py-2 text-xs rounded-lg gap-1.5",
    md: "px-6 py-3 text-sm rounded-xl gap-2",
    lg: "px-8 py-4 text-base rounded-2xl gap-3",
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 size={18} className="animate-spin" /> : children}
    </button>
  );
};
