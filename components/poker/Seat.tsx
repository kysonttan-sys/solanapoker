
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
            className={`absolute flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full border-2 border-dashed transition-all group z-10
            ${onSit 
                ? 'cursor-pointer border-white/30 bg-black/50 hover:border-sol-green hover:bg-sol-green/20 hover:scale-110 active:scale-95 hover:shadow-[0_0_20px_rgba(0,255,174,0.4)]' 
                : 'cursor-default border-white/10 bg-black/20 opacity-40'
            }`}
            style={{ top: position.top, left: position.left, transform: 'translate(-50%, -50%)' }}
            title={onSit ? "Click to Sit" : ""}
        >
            {onSit && (
                <>
                    <UserPlus size={18} className="text-gray-300 group-hover:text-sol-green transition-colors sm:w-5 sm:h-5" />
                    <span className="text-[8px] sm:text-[9px] text-gray-400 group-hover:text-sol-green mt-0.5 font-medium">SIT</span>
                </>
            )}
        </button>
    );
  }

  const vipStatus = getVipStatus(player.totalHands || 0);
  const timerColor = timeLeft <= 5 ? '#ef4444' : '#00FFAE';

  const CardsComponent = (
    <div className={`flex -space-x-2 sm:-space-x-3 ${isHero ? 'mb-[-15px] sm:mb-[-20px] z-10' : 'mb-1 sm:mb-2'}`}>
      {player.cards.map((card, idx) => {
        const isHighlight = isWinner && player.winningHand?.some(
            winCard => winCard.rank === card.rank && winCard.suit === card.suit
        );
        return (
            <div key={idx} className={`transform origin-bottom transition-transform duration-200 ${isHero ? 'hover:-translate-y-2' : ''} ${isHighlight ? 'z-20 scale-110 -translate-y-3' : ''}`} style={{ transform: isHighlight ? undefined : `rotate(${(idx - 0.5) * (isHero ? 8 : 6)}deg)` }}>
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
            <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 pointer-events-none z-0 w-16 h-16 sm:w-20 sm:h-20">
                <circle cx="50%" cy="50%" r="38%" fill="none" stroke="#ffffff15" strokeWidth="3" />
                <circle cx="50%" cy="50%" r="38%" fill="none" stroke={timerColor} strokeWidth="3" className="transition-all duration-500" strokeDasharray="100" strokeDashoffset={100 - ((timeLeft / totalTime) * 100)} strokeLinecap="round" />
            </svg>
          )}
          <div className={`relative w-11 h-11 sm:w-14 sm:h-14 rounded-full border-2 bg-sol-dark shadow-lg transition-colors z-10
            ${isWinner ? 'border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.5)]' : player.isTurn ? 'border-sol-green' : 'border-white/20'}
          `}>
            <img src={player.avatarUrl} alt={player.name} className={`w-full h-full rounded-full object-cover ${player.status === 'folded' ? 'opacity-30 grayscale' : ''}`} />
            {player.isDealer && <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-yellow-400 text-black text-[9px] sm:text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow z-10">D</div>}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-black/90 rounded-full flex items-center justify-center border border-white/30 shadow z-10" title={vipStatus.name}>
                <span className="text-[10px] sm:text-xs">{vipStatus.icon}</span>
            </div>
            {player.status === 'all-in' && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[7px] sm:text-[8px] px-2 py-0.5 rounded-full font-bold uppercase shadow z-10">ALL IN</div>}
            {isWinner && <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce"><Trophy size={16} className="text-yellow-400 fill-yellow-400 sm:w-5 sm:h-5" /></div>}
          </div>
      </div>
  );

  const InfoComponent = (
      <div className={`bg-black/80 backdrop-blur-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border flex flex-col items-center min-w-[60px] sm:min-w-[80px] z-20 ${isWinner ? 'border-yellow-400/60 bg-yellow-900/30' : 'border-white/15'} ${isHero ? 'mb-1 sm:mb-2' : 'mt-1 sm:mt-2'}`}>
        <span className={`text-[9px] sm:text-[11px] font-bold max-w-[70px] sm:max-w-[90px] truncate ${isWinner ? 'text-yellow-400' : 'text-white'}`}>{player.name}</span>
        <div className="flex items-center gap-0.5 text-[9px] sm:text-[11px] text-sol-green font-bold tabular-nums">
           {!showBB && gameType === 'cash' && <DollarSign size={9} className="sm:w-2.5 sm:h-2.5" />}
           {formatMoney(player.balance).replace('$', '')}
        </div>
      </div>
  );

  return (
    <div className={`absolute flex flex-col items-center transition-transform ${player.isTurn ? 'z-30 scale-105' : 'z-10'}`} style={{ top: position.top, left: position.left, transform: 'translate(-50%, -50%)' }}>
      {isHero ? <>{InfoComponent}{CardsComponent}{AvatarComponent}</> : <>{CardsComponent}{AvatarComponent}{InfoComponent}</>}
      
      {player.bet > 0 && (
          <div className={`absolute top-1/2 -translate-y-1/2 bg-black/90 text-white px-2 sm:px-3 py-1 rounded-lg border border-sol-blue/50 font-bold tabular-nums shadow-lg z-30 whitespace-nowrap text-[10px] sm:text-xs ${isRightSide ? '-left-8 sm:-left-12' : '-right-8 sm:-right-12'}`}>
              {!showBB && gameType === 'cash' && <span className="text-sol-blue mr-0.5">$</span>}
              {formatBet(player.bet)}
          </div>
      )}
      {isWinner && winAmount && (
          <div className="absolute -bottom-8 sm:-bottom-10 left-1/2 -translate-x-1/2 font-black tabular-nums text-yellow-400 drop-shadow-lg whitespace-nowrap z-50 text-base sm:text-xl animate-pulse">
              +{formatMoney(winAmount)}
          </div>
      )}
      {player.lastAction && !isWinner && (
          <div className={`absolute left-1/2 -translate-x-1/2 bg-gray-800/90 px-2 py-0.5 rounded text-gray-200 font-semibold whitespace-nowrap z-30 text-[9px] sm:text-[10px] ${
              isHero ? 'top-14 sm:top-18' : '-top-4 sm:-top-5'
          }`}>
              {player.lastAction.toUpperCase()}
          </div>
      )}
    </div>
  );
};
