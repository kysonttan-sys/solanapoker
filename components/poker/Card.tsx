
import React from 'react';
import { Suit, Rank } from '../../utils/pokerGameLogic';

interface CardProps {
  suit: Suit;
  rank: Rank;
  hidden?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  highlight?: boolean;
  fourColor?: boolean;
}

const suitIcons: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export const Card: React.FC<CardProps> = ({ suit, rank, hidden = false, className = '', size = 'md', highlight = false, fourColor = false }) => {
  // Optimized sizes for better mobile card visibility
  const sizeClasses = {
    sm: 'w-7 h-10 xs:w-8 xs:h-11 sm:w-9 sm:h-13 md:w-10 md:h-14 text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs',
    md: 'w-8 h-11 xs:w-9 xs:h-13 sm:w-11 sm:h-16 md:w-14 md:h-20 text-[9px] xs:text-[10px] sm:text-xs md:text-base',
    lg: 'w-11 h-16 xs:w-13 xs:h-18 sm:w-16 sm:h-23 md:w-20 md:h-28 text-sm xs:text-base sm:text-lg md:text-xl',
  };

  const highlightClass = highlight ? 'ring-2 xs:ring-3 sm:ring-4 ring-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)] xs:shadow-[0_0_15px_rgba(250,204,21,0.8)] z-50 border-yellow-300' : '';

  const getSuitColor = (s: Suit) => {
      if (s === 'spades') return 'text-gray-900';
      if (s === 'hearts') return 'text-red-500';
      if (s === 'clubs') return 'text-green-600';
      if (s === 'diamonds') return fourColor ? 'text-blue-500' : 'text-red-500';
      return 'text-gray-900';
  };

  const colorClass = getSuitColor(suit);

  if (hidden) {
    return (
      <div 
        className={`bg-sol-blue/80 border-2 border-white/20 rounded-md shadow-md flex items-center justify-center ${sizeClasses[size]} ${className}`}
        style={{ 
            backgroundImage: 'repeating-linear-gradient(45deg, #1D8BFF 0, #1D8BFF 2px, #13131F 2px, #13131F 4px)' 
        }}
      >
        <div className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 rounded-full bg-sol-green/20" />
      </div>
    );
  }

  return (
    <div className={`bg-gray-100 rounded-md shadow-lg flex flex-col items-center p-0.5 xs:p-0.5 sm:p-0.5 md:p-1 select-none transform transition-transform ${sizeClasses[size]} ${highlightClass} ${className} ${!highlight && 'hover:-translate-y-1'} border border-gray-200`}>
      <div className={`self-start font-bold leading-none ${colorClass}`}>{rank}</div>
      <div className={`flex-1 flex items-center justify-center ${colorClass} text-base xs:text-lg sm:text-xl md:text-2xl`}>{suitIcons[suit]}</div>
    </div>
  );
};
