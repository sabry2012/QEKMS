import React from 'react';
import { Button } from './ui/Button';

interface GoogleAuthButtonProps {
  id: string;
  text?: string;
}

/**
 * A "Quantum" styled Google Auth button that matches the system's aesthetic
 * while hosting the actual Google Identity Services button invisibly on top.
 */
export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({ id, text = "Continue with Google" }) => {
  return (
    <div className="relative w-full group">
      {/* The System-Styled Mock Button */}
      <Button 
        type="button" 
        className="w-full h-12 bg-mesh-gradient shadow-mesh-glow font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 border border-white/10 group-hover:border-primary-cyan/40 transition-all"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {text}
      </Button>

      {/* The Actual Invisible Google Button (Captures clicks) */}
      <div 
        id={id} 
        className="absolute inset-0 opacity-0 cursor-pointer overflow-hidden rounded-2xl"
      ></div>
    </div>
  );
};
