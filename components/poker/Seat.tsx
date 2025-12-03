
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
            className={`absolute flex flex-col items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-dashed transition-all group z-10
            ${onSit 
                ? 'cursor-pointer border-white/20 bg-black/40 hover:border-sol-green hover:bg-sol-green/10 hover:scale-110 active:scale-95 hover:shadow-[0_0_15px_rgba(0,255,174,0.3)]' 
                : 'cursor-default border-white/5 bg-transparent opacity-30'
            }`}
            style={{ top: position.top, left: position.left, transform: 'translate(-50%, -50%)' }}
            title={onSit ? "Sit Here" : "Seat Occupied or Reserved"}
        >
            {onSit ? (
                <>
                    <UserPlus size={20} className="text-gray-400 group-hover:text-sol-green transition-colors" />
                    <div className="absolute -bottom-8 bg-black/90 text-white text-[10px] font-bold px-2 py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Sit Here
                    </div>
                </>
            ) : (
                <span className="text-[9px] md:text-xs text-white/30 font-medium">Empty</span>
            )}
        </button>
    );
  }

  const vipStatus = getVipStatus(player.totalHands || 0);
  const timerColor = timeLeft <= 5 ? '#ef4444' : '#00FFAE';

  const CardsComponent = (
    <div className={`flex -space-x-3 md:-space-x-4 ${isHero ? 'mb-[-15px] md:mb-[-20px] z-10' : 'mb-1 md:mb-2'} transition-all`}>
      {player.cards.map((card, idx) => {
        const isHighlight = isWinner && player.winningHand?.some(
            winCard => winCard.rank === card.rank && winCard.suit === card.suit
        );
        return (
            <div key={idx} className={`transform origin-bottom transition-transform duration-300 ${isHero ? 'hover:-translate-y-2' : ''} ${isHighlight ? 'z-20 scale-110 -translate-y-4' : ''}`} style={{ transform: isHighlight ? undefined : `rotate(${(idx - 0.5) * 10}deg)` }}>
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
            <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90px] h-[90px] -rotate-90 pointer-events-none z-0 scale-[0.65] md:scale-100">
                <circle cx="45" cy="45" r={36} fill="none" stroke="#ffffff10" strokeWidth="4" />
                <circle cx="45" cy="45" r={36} fill="none" stroke={timerColor} strokeWidth="4" strokeDasharray={2 * Math.PI * 36} strokeDashoffset={((totalTime - timeLeft) / totalTime) * (2 * Math.PI * 36)} strokeLinecap="round" className="transition-all duration-1000 ease-linear" />
            </svg>
          )}
          <div className={`relative w-10 h-10 md:w-16 md:h-16 rounded-full border-2 bg-sol-dark shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-colors duration-300 z-10
            ${isWinner ? 'border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.6)]' : player.isTurn ? 'border-transparent' : 'border-white/10'}
          `}>
            <img src={player.avatarUrl} alt={player.name} className={`w-full h-full rounded-full object-cover ${player.status === 'folded' ? 'opacity-40 grayscale' : ''}`} />
            {player.isDealer && <div className="absolute -top-1 -right-1 w-3 h-3 md:w-6 md:h-6 bg-white text-black text-[6px] md:text-[10px] font-bold rounded-full flex items-center justify-center border border-gray-300 shadow-md z-10">D</div>}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 md:w-6 md:h-6 bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 shadow-md z-10" title={vipStatus.name}>
                <span className="text-[8px] md:text-xs">{vipStatus.icon}</span>
            </div>
            {player.status === 'all-in' && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[6px] md:text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider whitespace-nowrap shadow-sm z-10">All In</div>}
            {isWinner && <div className="absolute -top-6 md:-top-8 left-1/2 -translate-x-1/2 animate-bounce"><Trophy size={16} className="text-yellow-500 fill-yellow-500 md:w-5 md:h-5" /></div>}
          </div>
      </div>
  );

  const InfoComponent = (
      <div className={`bg-sol-black/80 backdrop-blur-sm px-1.5 md:px-3 py-0.5 md:py-1 rounded-full border flex flex-col items-center min-w-[60px] md:min-w-[80px] transition-colors z-20 ${isWinner ? 'border-yellow-500/50 bg-yellow-900/20' : 'border-white/10'} ${isHero ? 'mb-2' : 'mt-1 md:mt-2'}`}>
        <span className={`text-[8px] md:text-xs font-bold max-w-[60px] md:max-w-[80px] truncate ${isWinner ? 'text-yellow-500' : 'text-white'}`}>{player.name}</span>
        <div className="flex items-center gap-0.5 text-[8px] md:text-xs text-sol-green font-bold tabular-nums tracking-tight">
           {!showBB && gameType === 'cash' && <DollarSign size={8} className="md:w-2.5 md:h-2.5" />}
           {formatMoney(player.balance).replace('$', '')}
        </div>
      </div>
  );

  return (
    <div className={`absolute flex flex-col items-center transition-all duration-500 ${player.isTurn ? 'z-20 scale-105' : 'z-10'}`} style={{ top: position.top, left: position.left, transform: 'translate(-50%, -50%)' }}>
      {isHero ? <>{InfoComponent}{CardsComponent}{AvatarComponent}</> : <>{CardsComponent}{AvatarComponent}{InfoComponent}</>}
      
      {player.bet > 0 && (
          <div className={`absolute top-0 bg-black/90 text-white text-[9px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg border border-sol-blue/50 font-bold tabular-nums animate-in zoom-in shadow-lg z-30 whitespace-nowrap ${isRightSide ? '-left-6 md:-left-10' : '-right-6 md:-right-10'}`}>
              {!showBB && gameType === 'cash' && <span className="text-sol-blue mr-0.5">$</span>}
              {formatBet(player.bet)}
          </div>
      )}
      {isWinner && winAmount && (
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-lg md:text-2xl font-black tabular-nums text-yellow-400 drop-shadow-md animate-in slide-in-from-bottom-4 fade-in duration-700 whitespace-nowrap z-50">
              +{formatMoney(winAmount)}
          </div>
      )}
      {player.lastAction && !isWinner && (
          <div className="absolute -top-4 md:-top-8 left-1/2 -translate-x-1/2 bg-gray-800/80 px-2 py-0.5 rounded text-[7px] md:text-[10px] text-gray-300 font-medium whitespace-nowrap animate-in fade-in zoom-in z-30">
              {player.lastAction}
          </div>
      )}
    </div>
  );
};
