
import React, { useState, useEffect } from 'react';
import { GameState } from '../../utils/pokerGameLogic';
import { Seat } from './Seat';
import { Card } from './Card';

interface TableProps {
  gameState: GameState;
  heroId: string;
  timeLeft: number;
  totalTime: number;
  onSit?: (seatIndex?: number) => void;
  fourColor?: boolean;
  showBB?: boolean;
}

export const Table: React.FC<TableProps> = ({ gameState, heroId, timeLeft, totalTime, onSit, fourColor = false, showBB = false }) => {
  // Ensure maxSeats is a number to prevent "9" (string) vs 9 (number) logic errors
  const rawSeats = (gameState as any).seats || gameState.maxSeats;
  const maxSeats = parseInt(String(rawSeats), 10) || 6;
  
  const { players, communityCards, pot, winners, bigBlind, gameMode } = gameState;
  
  // Responsive States
  const [isVertical, setIsVertical] = useState(false);
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const vertical = height > width;
        const mobile = width < 768;
        
        setIsVertical(vertical);
        setIsMobile(mobile);

        if (!vertical) {
            // Desktop landscape: scale down for shorter screens
            if (height < 700) {
                setScale(0.7);
            } else if (height < 850) {
                setScale(0.85);
            } else {
                setScale(1);
            }
        } else {
            // Portrait: scale based on width for smaller phones
            if (width < 375) {
                setScale(0.85);
            } else {
                setScale(1);
            }
        }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const heroPlayer = players.find(p => p.id === heroId);
  const heroSeat = heroPlayer ? heroPlayer.position : 0; 
  
  const allWinningCards = winners 
    ? players.filter(p => winners.some(w => w.playerId === p.id)).flatMap(p => p.winningHand || []) 
    : [];

  // --- POSITIONS ---
  const positions9MaxDesktop = [
    { top: '86%', left: '50%' }, { top: '80%', left: '20%' }, { top: '55%', left: '8%' },
    { top: '20%', left: '20%' }, { top: '12%', left: '35%' }, { top: '12%', left: '65%' },
    { top: '20%', left: '80%' }, { top: '55%', left: '92%' }, { top: '80%', left: '80%' },
  ];

  const positions6MaxDesktop = [
    { top: '86%', left: '50%' }, { top: '65%', left: '10%' }, { top: '20%', left: '20%' },
    { top: '12%', left: '50%' }, { top: '20%', left: '80%' }, { top: '65%', left: '90%' },
  ];

  const positions9MaxMobile = [
    { top: '90%', left: '50%' }, { top: '80%', left: '18%' }, { top: '60%', left: '8%' },
    { top: '35%', left: '8%' }, { top: '15%', left: '20%' }, { top: '15%', left: '80%' },
    { top: '35%', left: '92%' }, { top: '60%', left: '92%' }, { top: '80%', left: '82%' },
  ];

  const positions6MaxMobile = [
    { top: '90%', left: '50%' }, { top: '70%', left: '12%' }, { top: '30%', left: '12%' },
    { top: '10%', left: '50%' }, { top: '30%', left: '88%' }, { top: '70%', left: '88%' },
  ];

  const positions = isVertical 
    ? (maxSeats > 6 ? positions9MaxMobile : positions6MaxMobile)
    : (maxSeats > 6 ? positions9MaxDesktop : positions6MaxDesktop);
  
  const renderSeats = () => {
    return Array.from({ length: maxSeats }).map((_, physicalSeatIdx) => {
        // Rotation Logic: Always center Hero at bottom (index 0)
        const logicalSeatIndex = (heroSeat + physicalSeatIdx) % maxSeats;
        
        const player = players.find(p => p.position === logicalSeatIndex);
        const winData = winners?.find(w => w.playerId === player?.id);
        const pos = positions[physicalSeatIdx] || { top: '50%', left: '50%' };

        return (
             <Seat 
                key={physicalSeatIdx} 
                position={pos} 
                player={player}
                isHero={player?.id === heroId}
                isWinner={!!winData}
                winAmount={winData?.amount}
                timeLeft={timeLeft}
                totalTime={totalTime}
                // IMPORTANT: Pass the LOGICAL seat index, so backend knows which real seat to fill
                onSit={onSit && !player ? () => onSit(logicalSeatIndex) : undefined}
                fourColor={fourColor}
                showBB={showBB}
                bigBlind={bigBlind}
                gameType={gameMode}
             />
        );
    });
  };

  const formatPot = (amount: number) => {
      if (showBB && bigBlind > 0) return (amount / bigBlind).toFixed(1) + ' BB';
      if (gameMode === 'cash') return '$' + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return amount.toLocaleString();
  };

  return (
    <div 
        className={`relative mx-auto select-none ${
            isVertical 
            ? 'w-[95%] max-w-[450px] h-[60vh] min-h-[400px] max-h-[600px]' 
            : 'w-[95%] max-w-[900px] aspect-[16/10]'
        }`}
        style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
    >
      {/* Table felt */}
      <div className={`absolute inset-0 bg-gradient-to-br from-[#1a5438] via-[#1a4731] to-[#143d2a] shadow-[inset_0_0_60px_rgba(0,0,0,0.7)] border-[8px] sm:border-[10px] md:border-[12px] border-[#3a3d4a] ${
          isVertical ? 'rounded-[120px] sm:rounded-[150px]' : 'rounded-[140px] sm:rounded-[180px]'
      }`}>
         <div className={`absolute inset-3 sm:inset-5 md:inset-8 border border-white/10 ${
             isVertical ? 'rounded-[100px] sm:rounded-[130px]' : 'rounded-[120px] sm:rounded-[160px]'
         }`}></div>
         
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.08] pointer-events-none text-center">
            <span className={`block font-bold tracking-[0.2em] text-white whitespace-nowrap ${isVertical ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'}`}>
                SOLPOKER X
            </span>
         </div>
      </div>

      <div className={`absolute left-1/2 -translate-x-1/2 flex z-20 ${
          isVertical 
            ? 'top-[38%] -translate-y-1/2 flex-wrap justify-center max-w-[200px] sm:max-w-[280px] gap-1 sm:gap-2' 
            : 'top-[45%] -translate-y-1/2 gap-2 sm:gap-3'
      }`}>
         {communityCards.length === 0 ? (
             <div className={`flex opacity-15 ${
               isVertical ? 'gap-1 sm:gap-2' : 'gap-2 sm:gap-3'
             }`}>
                 {[1,2,3,4,5].map(i => (
                     <div key={i} className={`rounded-lg border-2 border-white/30 border-dashed bg-white/5 ${
                       isVertical 
                         ? 'w-9 h-13 sm:w-11 sm:h-16' 
                         : 'w-11 h-16 sm:w-14 sm:h-20'
                     }`}></div>
                 ))}
             </div>
         ) : (
             communityCards.map((card, idx) => {
                 const isHighlight = allWinningCards.some(wc => wc.rank === card.rank && wc.suit === card.suit);
                 return (
                    <Card 
                      key={idx} 
                      suit={card.suit} 
                      rank={card.rank} 
                      highlight={isHighlight} 
                      fourColor={fourColor}
                      size={isVertical && isMobile ? 'sm' : 'md'}
                    />
                 );
             })
         )}
      </div>

      {pot > 0 && (
         <div className={`absolute left-1/2 -translate-x-1/2 bg-black/90 rounded-full border border-sol-green/50 text-white font-bold tabular-nums flex items-center gap-2 shadow-xl z-30 ${
             isVertical 
               ? 'top-[56%] px-4 py-2' 
               : 'top-[63%] px-5 py-2'
         }`}>
             <span className="text-sol-green font-bold text-xs sm:text-sm">POT</span>
             <span className="font-mono text-white text-sm sm:text-lg">{formatPot(pot)}</span>
         </div>
      )}

      {renderSeats()}
    </div>
  );
};
