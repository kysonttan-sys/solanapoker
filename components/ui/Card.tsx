import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hoverEffect = false, ...props }) => {
  return (
    <div className={`
      bg-sol-dark/60 backdrop-blur-md border border-white/5 rounded-xl p-6
      ${hoverEffect ? 'hover:border-sol-green/30 transition-colors duration-300' : ''}
      ${className}
    `}
    {...props}
    >
      {children}
    </div>
  );
};