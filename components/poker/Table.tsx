
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

  useEffect(() => {
    const handleResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const vertical = height > width;
        setIsVertical(vertical);

        if (!vertical) {
            if (height < 850) {
                const scaleFactor = Math.min(1, height / 900); 
                setScale(scaleFactor < 0.75 ? 0.75 : scaleFactor);
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
        className={`relative mx-auto select-none transition-all duration-300 ${
            isVertical 
            ? 'w-[95%] max-w-[420px] md:max-w-[650px] md:w-[85%] h-[70vh] md:h-[75vh] mt-[10vh]' 
            : `w-full max-w-[1000px] aspect-[16/9] origin-top mt-[5vh]`
        }`}
        style={!isVertical ? { transform: `scale(${scale})` } : {}}
    >
      <div className={`absolute inset-0 bg-[#1a4731] shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] border-[12px] border-[#2c2e3a] ${
          isVertical ? 'rounded-[160px] md:rounded-[240px]' : 'rounded-[200px]'
      }`}>
         <div className={`absolute inset-4 md:inset-8 border-2 border-white/5 opacity-50 ${
             isVertical ? 'rounded-[140px] md:rounded-[220px]' : 'rounded-[160px]'
         }`}></div>
         
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none text-center">
            <span className={`block font-bold tracking-widest text-white whitespace-nowrap ${isVertical ? 'text-3xl rotate-90' : 'text-4xl'}`}>
                SOLPOKER<span className="whitespace-nowrap"> X</span>
            </span>
            {maxSeats > 6 && (
                <span className={`block mt-2 font-mono font-bold text-sol-green ${isVertical ? 'text-xs rotate-90' : 'text-sm'}`}>
                    9-MAX PRO
                </span>
            )}
         </div>
      </div>

      <div className={`absolute left-1/2 -translate-x-1/2 flex gap-2 md:gap-3 z-10 ${
          isVertical ? 'top-[42%] flex-wrap justify-center w-[180px] md:w-auto md:flex-nowrap' : 'top-1/2 -translate-y-1/2'
      }`}>
         {communityCards.length === 0 ? (
             <div className="flex gap-2 opacity-20">
                 {[1,2,3,4,5].map(i => (
                     <div key={i} className="w-10 h-14 md:w-14 md:h-20 rounded border-2 border-white border-dashed"></div>
                 ))}
             </div>
         ) : (
             communityCards.map((card, idx) => {
                 const isHighlight = allWinningCards.some(wc => wc.rank === card.rank && wc.suit === card.suit);
                 return (
                    <Card key={idx} suit={card.suit} rank={card.rank} highlight={isHighlight} fourColor={fourColor} />
                 );
             })
         )}
      </div>

      {pot > 0 && (
         <div className={`absolute left-1/2 -translate-x-1/2 bg-black/90 px-5 py-2 rounded-full border border-sol-green/50 text-white font-bold tabular-nums flex items-center gap-2 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)] z-40 animate-in zoom-in duration-300 ${
             isVertical ? 'top-[60%]' : 'top-[60%]'
         }`}>
             <span className="text-sol-green font-extrabold text-xs md:text-sm tracking-wider">POT</span>
             <span className="font-mono text-sm md:text-lg text-white">{formatPot(pot)}</span>
         </div>
      )}

      {renderSeats()}
    </div>
  );
};
