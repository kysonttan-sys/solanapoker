
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
  // Cleaner, more consistent sizing
  const sizeClasses = {
    sm: 'w-9 h-13 sm:w-11 sm:h-16 text-[10px] sm:text-xs',
    md: 'w-11 h-16 sm:w-14 sm:h-20 text-xs sm:text-sm',
    lg: 'w-14 h-20 sm:w-18 sm:h-26 text-sm sm:text-lg',
  };

  const highlightClass = highlight ? 'ring-2 sm:ring-3 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.7)] z-50 border-yellow-300' : '';

  const getSuitColor = (s: Suit) => {
      if (s === 'spades') return 'text-gray-900';
      if (s === 'hearts') return 'text-red-600';
      if (s === 'clubs') return fourColor ? 'text-green-700' : 'text-gray-900';
      if (s === 'diamonds') return fourColor ? 'text-blue-600' : 'text-red-600';
      return 'text-gray-900';
  };

  const colorClass = getSuitColor(suit);

  if (hidden) {
    return (
      <div 
        className={`bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-white/30 rounded-lg shadow-md flex items-center justify-center ${sizeClasses[size]} ${className}`}
      >
        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
          <span className="text-white/60 text-lg sm:text-xl font-bold">?</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg flex flex-col items-center justify-between p-1 sm:p-1.5 select-none ${sizeClasses[size]} ${highlightClass} ${className} border border-gray-200`}>
      <div className={`self-start font-bold leading-none ${colorClass}`}>{rank}</div>
      <div className={`${colorClass} text-xl sm:text-2xl`}>{suitIcons[suit]}</div>
      <div className={`self-end font-bold leading-none rotate-180 ${colorClass}`}>{rank}</div>
    </div>
  );
};
