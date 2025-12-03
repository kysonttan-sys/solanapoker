
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
  // Updated sizes for better mobile responsiveness
  const sizeClasses = {
    sm: 'w-6 h-9 md:w-8 md:h-12 text-[9px] md:text-xs',
    md: 'w-10 h-14 md:w-14 md:h-20 text-xs md:text-base',
    lg: 'w-14 h-20 md:w-20 md:h-28 text-base md:text-xl', // Reduced mobile size for Hero
  };

  const highlightClass = highlight ? 'ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)] z-50 border-yellow-300' : '';

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
        <div className="w-4 h-4 rounded-full bg-sol-green/20" />
      </div>
    );
  }

  return (
    <div className={`bg-gray-100 rounded-md shadow-lg flex flex-col items-center p-0.5 md:p-1 select-none transform transition-transform ${sizeClasses[size]} ${highlightClass} ${className} ${!highlight && 'hover:-translate-y-1'}`}>
      <div className={`self-start font-bold leading-none ${colorClass}`}>{rank}</div>
      <div className={`flex-1 flex items-center justify-center text-lg md:text-2xl ${colorClass}`}>{suitIcons[suit]}</div>
    </div>
  );
};
