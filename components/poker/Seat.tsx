
import React from 'react';
import { PlayerState } from '../../utils/pokerGameLogic';
import { Card } from './Card';
import { DollarSign, Trophy, UserPlus } from 'lucide-react';
import { getVipStatus } from '../../constants';

interface SeatProps {
  player?: PlayerState;
  position: { top: string; left: string }; // Percentage strings
  isHero?: boolean;
  isWinner?: boolean;
  winAmount?: number;
  timeLeft?: number;
  totalTime?: number;
  onSit?: () => void;
  fourColor?: boolean;
  showBB?: boolean;
  bigBlind?: number;
  gameType?: 'cash' | 'tournament' | 'fun';
}

export const Seat: React.FC<SeatProps> = ({ 
    player, 
    position, 
    isHero, 
    isWinner, 
    winAmount, 
    timeLeft = 0, 
    totalTime = 30, 
    onSit, 
    fourColor = false,
    showBB = false,
    bigBlind = 1,
    gameType = 'cash'
}) => {
  const leftVal = parseFloat(position.left);
  const isRightSide = !isNaN(leftVal) && leftVal > 50;

  const formatMoney = (amount: number) => {
      if (showBB && bigBlind > 0) return (amount / bigBlind).toFixed(1) + ' BB';
      if (gameType === 'cash') return '$' + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return amount.toLocaleString();
  };

  const formatBet = (amount: number) => {
      if (showBB && bigBlind > 0) return (amount / bigBlind).toFixed(1) + ' BB';
      if (gameType === 'cash') return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return amount.toLocaleString(); 
  };

  // --- EMPTY SEAT (CLICKABLE) ---
  if (!player) {
    return (
        <button 
            onClick={onSit}
            disabled={!onSit}
            className={`absolute flex flex-col items-center justify-center w-10 h-10 xs:w-11 xs:h-11 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full border-2 border-dashed transition-all group z-10
            ${onSit 
                ? 'cursor-pointer border-white/20 bg-black/40 hover:border-sol-green hover:bg-sol-green/10 hover:scale-110 active:scale-95 hover:shadow-[0_0_15px_rgba(0,255,174,0.3)]' 
                : 'cursor-default border-white/5 bg-transparent opacity-30'
            }`}
            style={{ top: position.top, left: position.left, transform: 'translate(-50%, -50%)' }}
            title={onSit ? "Sit Here" : "Seat Occupied or Reserved"}
        >
            {onSit ? (
                <>
                    <UserPlus size={16} className="text-gray-400 group-hover:text-sol-green transition-colors xs:w-[18px] xs:h-[18px] sm:w-5 sm:h-5" />
                    <div className="absolute -bottom-6 xs:-bottom-7 sm:-bottom-8 bg-black/90 text-white text-[8px] xs:text-[9px] sm:text-[10px] font-bold px-1.5 xs:px-2 py-0.5 xs:py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Sit Here
                    </div>
                </>
            ) : (
                <span className="text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs text-white/30 font-medium">Empty</span>
            )}
        </button>
    );
  }

  const vipStatus = getVipStatus(player.totalHands || 0);
  const timerColor = timeLeft <= 5 ? '#ef4444' : '#00FFAE';

  const CardsComponent = (
    <div className={`flex -space-x-2 xs:-space-x-2.5 sm:-space-x-3 md:-space-x-4 ${isHero ? 'mb-[-12px] xs:mb-[-15px] sm:mb-[-18px] md:mb-[-20px] z-10' : 'mb-0.5 xs:mb-1 sm:mb-1.5 md:mb-2'} transition-all`}>
      {player.cards.map((card, idx) => {
        const isHighlight = isWinner && player.winningHand?.some(
            winCard => winCard.rank === card.rank && winCard.suit === card.suit
        );
        return (
            <div key={idx} className={`transform origin-bottom transition-transform duration-300 ${isHero ? 'hover:-translate-y-1 xs:hover:-translate-y-2' : ''} ${isHighlight ? 'z-20 scale-105 xs:scale-110 -translate-y-2 xs:-translate-y-3 sm:-translate-y-4' : ''}`} style={{ transform: isHighlight ? undefined : `rotate(${(idx - 0.5) * (isHero ? 10 : 8)}deg)` }}>
                <Card 
                suit={card.suit} 
                rank={card.rank} 
                hidden={!isHero && card.hidden} 
                size={isHero ? 'lg' : 'sm'} 
                highlight={isHighlight}
                fourColor={fourColor}
                />
            </div>
        );
      })}
    </div>
  );

  const AvatarComponent = (
     <div className="relative">
            {player.isTurn && timeLeft > 0 && (
            <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 pointer-events-none z-0 w-[60px] h-[60px] xs:w-[70px] xs:h-[70px] sm:w-[80px] sm:h-[80px] md:w-[90px] md:h-[90px]">
                <circle cx="45" cy="45" r={36} fill="none" stroke="#ffffff10" strokeWidth="3" className="xs:stroke-[3.5] sm:stroke-[4]" />
                <circle cx="45" cy="45" r={36} fill="none" stroke={timerColor} strokeWidth="3" className="xs:stroke-[3.5] sm:stroke-[4]" strokeDasharray={2 * Math.PI * 36} strokeDashoffset={((totalTime - timeLeft) / totalTime) * (2 * Math.PI * 36)} strokeLinecap="round" className="transition-all duration-1000 ease-linear" />
            </svg>
          )}
          <div className={`relative w-9 h-9 xs:w-10 xs:h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full border-2 bg-sol-dark shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-colors duration-300 z-10
            ${isWinner ? 'border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.6)]' : player.isTurn ? 'border-transparent' : 'border-white/10'}
          `}>
            <img src={player.avatarUrl} alt={player.name} className={`w-full h-full rounded-full object-cover ${player.status === 'folded' ? 'opacity-40 grayscale' : ''}`} />
            {player.isDealer && <div className="absolute -top-0.5 -right-0.5 xs:-top-1 xs:-right-1 w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-white text-black text-[6px] xs:text-[7px] sm:text-[8px] md:text-[10px] font-bold rounded-full flex items-center justify-center border border-gray-300 shadow-md z-10">D</div>}
            <div className="absolute -bottom-0.5 -right-0.5 xs:-bottom-1 xs:-right-1 w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 shadow-md z-10" title={vipStatus.name}>
                <span className="text-[7px] xs:text-[8px] sm:text-[9px] md:text-xs">{vipStatus.icon}</span>
            </div>
            {player.status === 'all-in' && <div className="absolute -bottom-1.5 xs:-bottom-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[5px] xs:text-[6px] sm:text-[6px] md:text-[7px] px-1 xs:px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider whitespace-nowrap shadow-sm z-10">All In</div>}
            {isWinner && <div className="absolute -top-4 xs:-top-5 sm:-top-6 md:-top-8 left-1/2 -translate-x-1/2 animate-bounce"><Trophy size={12} className="text-yellow-500 fill-yellow-500 xs:w-[14px] xs:h-[14px] sm:w-4 sm:h-4 md:w-5 md:h-5" /></div>}
          </div>
      </div>
  );

  const InfoComponent = (
      <div className={`bg-sol-black/80 backdrop-blur-sm px-1 xs:px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-0.5 md:py-1 rounded-full border flex flex-col items-center min-w-[50px] xs:min-w-[55px] sm:min-w-[60px] md:min-w-[80px] transition-colors z-20 ${isWinner ? 'border-yellow-500/50 bg-yellow-900/20' : 'border-white/10'} ${isHero ? 'mb-1 xs:mb-1.5 sm:mb-2' : 'mt-0.5 xs:mt-1 sm:mt-1.5 md:mt-2'}`}>
        <span className={`text-[7px] xs:text-[8px] sm:text-[9px] md:text-xs font-bold max-w-[48px] xs:max-w-[53px] sm:max-w-[58px] md:max-w-[80px] truncate ${isWinner ? 'text-yellow-500' : 'text-white'}`}>{player.name}</span>
        <div className="flex items-center gap-0.5 text-[7px] xs:text-[8px] sm:text-[9px] md:text-xs text-sol-green font-bold tabular-nums tracking-tight">
           {!showBB && gameType === 'cash' && <DollarSign size={7} className="xs:w-[8px] xs:h-[8px] sm:w-2 sm:h-2 md:w-2.5 md:h-2.5" />}
           {formatMoney(player.balance).replace('$', '')}
        </div>
      </div>
  );

  return (
    <div className={`absolute flex flex-col items-center transition-all duration-500 ${player.isTurn ? 'z-20 scale-105' : 'z-10'}`} style={{ top: position.top, left: position.left, transform: 'translate(-50%, -50%)' }}>
      {isHero ? <>{InfoComponent}{CardsComponent}{AvatarComponent}</> : <>{CardsComponent}{AvatarComponent}{InfoComponent}</>}
      
      {player.bet > 0 && (
          <div className={`absolute top-0 bg-black/90 text-white px-1 xs:px-1.5 sm:px-1.5 md:px-2 py-0.5 sm:py-0.5 md:py-1 rounded-lg border border-sol-blue/50 font-bold tabular-nums animate-in zoom-in shadow-lg z-30 whitespace-nowrap text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs ${isRightSide ? '-left-4 xs:-left-5 sm:-left-6 md:-left-10' : '-right-4 xs:-right-5 sm:-right-6 md:-right-10'}`}>
              {!showBB && gameType === 'cash' && <span className="text-sol-blue mr-0.5">$</span>}
              {formatBet(player.bet)}
          </div>
      )}
      {isWinner && winAmount && (
          <div className="absolute -bottom-6 xs:-bottom-7 sm:-bottom-8 md:-bottom-10 left-1/2 -translate-x-1/2 font-black tabular-nums text-yellow-400 drop-shadow-md animate-in slide-in-from-bottom-4 fade-in duration-700 whitespace-nowrap z-50 text-sm xs:text-base sm:text-lg md:text-2xl">
              +{formatMoney(winAmount)}
          </div>
      )}
      {player.lastAction && !isWinner && (
          <div className={`absolute left-1/2 -translate-x-1/2 bg-gray-800/80 px-1.5 xs:px-2 py-0.5 rounded text-gray-300 font-medium whitespace-nowrap animate-in fade-in zoom-in z-30 text-[6px] xs:text-[7px] sm:text-[8px] md:text-[10px] ${
              isHero ? 'top-10 xs:top-11 sm:top-12 md:top-16' : '-top-3 xs:-top-3.5 sm:-top-4 md:-top-8'
          }`}>
              {player.lastAction}
          </div>
      )}
    </div>
  );
};
