import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: 'none' | 'primary' | 'strong';
}

export const Card: React.FC<CardProps> = ({ children, className = '', glow = 'none', ...props }) => {
  const baseStyle = "bg-mesh-card border border-mesh-border rounded-2xl";
  const glowStyle = glow === 'primary' 
    ? 'shadow-mesh-glow border-primary-cyan/30' 
    : glow === 'strong' 
      ? 'shadow-mesh-glow-strong border-primary-cyan/50' 
      : '';

  return (
    <div className={`${baseStyle} ${glowStyle} ${className}`} {...props}>
      {children}
    </div>
  );
};
