
import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Calculator, Zap, Wifi } from 'lucide-react';

interface GameControlsProps {
  onAction: (action: 'fold' | 'check' | 'call' | 'raise', amount?: number) => void;
  onRebuy?: () => void;
  currentBet: number;
  bigBlind: number;
  userBalance: number;
  toCall: number;
  pot: number;
  showRebuy?: boolean;
  showBB?: boolean;
  gameType?: 'cash' | 'tournament' | 'fun';
}

export const GameControls: React.FC<GameControlsProps> = ({ 
    onAction, 
    onRebuy, 
    currentBet, 
    bigBlind, 
    userBalance, 
    toCall, 
    pot, 
    showRebuy,
    showBB = false,
    gameType = 'cash'
}) => {
  // Calculate valid minimum raise (Total Wager amount)
  const minRaise = useMemo(() => {
     // Rule: If no bet (currentBet 0), min bet is BB.
     // Rule: If bet exists, min raise is usually 2x the bet (Simplified).
     const raw = currentBet === 0 ? bigBlind : currentBet * 2;
     // Clamp: Must be at least raw, but can't exceed balance. 
     return Math.min(raw, userBalance);
  }, [currentBet, bigBlind, userBalance]);
  
  const [raiseAmount, setRaiseAmount] = useState(minRaise);

  // Sync raise amount when minRaise changes (new turn, new bet)
  useEffect(() => {
    setRaiseAmount(minRaise);
  }, [minRaise]);

  const fmt = (n: number) => {
      if (showBB && bigBlind > 0) {
          return (n / bigBlind).toFixed(1) + ' BB';
      }
      
      // Formatting based on Game Type
      if (gameType === 'cash') {
          return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      
      // Tournament / Fun style
      return n >= 1000000 ? (n/1000000).toFixed(1) + 'M' : n >= 1000 ? (n/1000).toFixed(1) + 'k' : Math.floor(n).toLocaleString();
  };
  
  const isCallAllIn = toCall >= userBalance;
  // Determine if the current raiseAmount puts user all-in
  const isRaiseAllIn = raiseAmount >= userBalance;

    // Display helpers
    const minRaiseTo = useMemo(() => {
            // When there is an existing bet, min raise to = currentBet + lastRaiseAmount
            // Since client doesn't have lastRaiseAmount, approximate using bigBlind as baseline
            const baseline = Math.max(bigBlind, currentBet);
            return Math.min(userBalance, Math.max(baseline * 2, currentBet + bigBlind));
    }, [currentBet, bigBlind, userBalance]);

  // Pot Odds Calculation
  const potOdds = useMemo(() => {
      if (toCall === 0) return 0;
      const totalPot = pot + toCall; // Pot + My Call
      return (toCall / totalPot) * 100;
  }, [pot, toCall]);

  // Handle slider change
  const handleSliderChange = (val: number) => {
      setRaiseAmount(val);
  };

  const applyPreset = (type: 'min' | 'half' | 'pot' | 'max') => {
      let amount = minRaise;
      
      if (type === 'min') {
          amount = minRaise;
      } else if (type === 'max') {
          amount = userBalance;
      } else {
          // Pot Limit Logic for Pot Size Raise
          // A "Pot Size Raise" is: Call Amount + (Pot Size + Call Amount)
          // Simplified for UI: (Pot + toCall) * multiplier
          const basePot = pot + toCall;
          if (type === 'half') {
              amount = currentBet + (basePot * 0.5);
          } else if (type === 'pot') {
              amount = currentBet + basePot;
          }
      }

      // Ensure we stick to decimals for cash, integers for tournaments when calculating slider steps
      let validAmount = Math.max(minRaise, Math.min(amount, userBalance));
      
      if (gameType === 'cash') {
          validAmount = Math.floor(validAmount * 100) / 100;
      } else {
          validAmount = Math.floor(validAmount);
      }

      setRaiseAmount(validAmount);
  };

  // Ensure slider step is appropriate
  const sliderStep = gameType === 'cash' ? 0.01 : Math.max(1, bigBlind / 5);

  return (
    <div className="w-full h-full flex flex-col justify-end">
       <div className="bg-[#13131F] border-t border-white/10 px-3 sm:px-4 py-2 sm:py-3 rounded-t-xl shadow-2xl">
            <div className="max-w-lg mx-auto space-y-2 sm:space-y-3 w-full">
                 {/* Stack display */}
                 <div className="flex justify-between items-center">
                      <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">Your Stack</span>
                      <span className="text-sol-green font-mono font-bold text-sm sm:text-base">{fmt(userBalance)}</span>
                 </div>

                 {/* Preset buttons */}
                 <div className="flex gap-2">
                     <PresetBtn onClick={() => applyPreset('min')} label="Min" />
                     <PresetBtn onClick={() => applyPreset('half')} label="½ Pot" />
                     <PresetBtn onClick={() => applyPreset('pot')} label="Pot" />
                     <PresetBtn onClick={() => applyPreset('max')} label="All In" />
                 </div>
                 
                 {/* Slider */}
                 <div className="flex items-center gap-3">
                     <span className="text-xs sm:text-sm font-bold font-mono text-white w-20 text-center">{fmt(raiseAmount)}</span>
                     <input 
                        type="range" 
                        min={minRaise} 
                        max={userBalance} 
                        step={sliderStep} 
                        value={raiseAmount} 
                        onChange={(e) => handleSliderChange(Number(e.target.value))}
                        className="flex-1 accent-sol-green h-2 bg-white/10 rounded-lg cursor-pointer"
                        disabled={minRaise >= userBalance}
                     />
                 </div>
            </div>
       </div>

       {/* Action buttons */}
       <div className="grid grid-cols-3 h-16 sm:h-20">
            <button 
                onClick={() => onAction('fold')}
                className="flex flex-col items-center justify-center bg-[#1A1A1A] border-r border-white/5 hover:bg-red-900/30 active:bg-red-900/50 transition-colors"
            >
                <span className="text-red-500 font-bold text-sm sm:text-lg">FOLD</span>
            </button>

            <button 
                onClick={() => toCall === 0 ? onAction('check') : onAction('call')}
                className="flex flex-col items-center justify-center bg-[#241b35] border-r border-white/5 hover:bg-[#2f2245] active:bg-[#3a2a5a] transition-colors"
            >
                <span className="text-sol-purple font-bold text-sm sm:text-lg">
                    {toCall === 0 ? 'CHECK' : isCallAllIn ? 'ALL IN' : 'CALL'}
                </span>
                {toCall > 0 && <span className="text-[10px] sm:text-xs text-gray-300 font-mono">{fmt(Math.min(toCall, userBalance))}</span>}
            </button>

            <button 
                onClick={() => onAction('raise', raiseAmount)}
                className="flex flex-col items-center justify-center bg-[#0d2626] hover:bg-[#113333] active:bg-[#164040] transition-colors"
            >
                <span className="text-sol-green font-bold text-sm sm:text-lg">
                    {isRaiseAllIn ? 'ALL IN' : currentBet === 0 ? 'BET' : 'RAISE'}
                </span>
                <span className="text-[10px] sm:text-xs text-gray-300 font-mono">{fmt(raiseAmount)}</span>
            </button>
       </div>
    </div>
  );
};

const PresetBtn = ({ onClick, label }: { onClick: () => void, label: string }) => (
    <button 
        onClick={onClick} 
        className="flex-1 py-1.5 sm:py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] sm:text-xs font-bold text-gray-400 hover:bg-white/15 hover:text-white transition-all"
    >
        {label}
    </button>
);
