
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
       <div className="bg-[#13131F] border-t border-white/10 px-4 py-3 pb-4 rounded-t-xl shadow-2xl relative">
            
            {/* Top Bar Stats */}
            <div className="absolute top-0 left-0 right-0 -translate-y-full flex justify-between px-4 pb-2 items-end">
                <div className="flex gap-2">
                    {potOdds > 0 && (
                        <div className="bg-black/80 backdrop-blur text-white px-3 py-1 rounded-t-lg border-t border-x border-white/10 flex items-center gap-2">
                            <Calculator size={12} className="text-sol-purple"/>
                            <span className="text-[10px] uppercase font-bold text-gray-400">Pot Odds</span>
                            <span className="text-sm font-mono font-bold text-sol-purple">{potOdds.toFixed(1)}%</span>
                        </div>
                    )}
                    {/* Gasless Indicator */}
                    <div className="bg-black/80 backdrop-blur text-white px-3 py-1 rounded-t-lg border-t border-x border-sol-green/20 flex items-center gap-2" title="Game actions are signed off-chain. No gas fees per hand.">
                        <Zap size={12} className="text-sol-green fill-sol-green animate-pulse"/>
                        <span className="text-[10px] uppercase font-bold text-gray-400">Gasless Session</span>
                    </div>
                </div>

                {showRebuy && onRebuy && (
                    <button 
                        onClick={onRebuy}
                        className="bg-sol-green/20 hover:bg-sol-green/30 backdrop-blur text-sol-green px-3 py-1 rounded-t-lg border-t border-x border-sol-green/30 flex items-center gap-2 transition-colors ml-auto"
                    >
                        <RefreshCw size={12} className="animate-spin-slow"/>
                        <span className="text-xs font-bold uppercase">Rebuy Chips</span>
                    </button>
                )}
            </div>

            <div className="max-w-md mx-auto space-y-3 w-full">
                     <div className="flex justify-between items-center px-1">
                          <span className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Action Info</span>
                          <span className="text-[10px] md:text-xs text-gray-300 font-mono">
                              To call: <span className="text-sol-green font-bold">{fmt(Math.min(toCall, userBalance))}</span> · Min raise to: <span className="text-sol-green font-bold">{fmt(minRaiseTo)}</span> · Stack: <span className="text-sol-green font-bold">{fmt(userBalance)}</span>
                          </span>
                     </div>
                 <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Your Stack</span>
                      <span className="text-sol-green font-mono font-bold text-sm shadow-black drop-shadow-sm">{fmt(userBalance)}</span>
                 </div>

                 <div className="flex gap-2">
                     <PresetBtn onClick={() => applyPreset('min')} label="Min" />
                     <PresetBtn onClick={() => applyPreset('half')} label="1/2 Pot" />
                     <PresetBtn onClick={() => applyPreset('pot')} label="Pot" />
                     <PresetBtn onClick={() => applyPreset('max')} label="Max" />
                 </div>
                 
                 <div className="flex items-center gap-3">
                     <div className="hidden md:block">
                         <span className="text-[9px] md:text-xs font-bold font-sans tabular-nums text-gray-400 w-16 text-right">{fmt(raiseAmount)}</span>
                     </div>
                     <input 
                        type="range" 
                        min={minRaise} 
                        max={userBalance} 
                        step={sliderStep} 
                        value={raiseAmount} 
                        onChange={(e) => handleSliderChange(Number(e.target.value))}
                        className="flex-1 accent-sol-green h-2 bg-white/10 rounded-lg appearance-none cursor-pointer w-full"
                        disabled={minRaise >= userBalance}
                     />
                 </div>
            </div>
       </div>

       <div className="grid grid-cols-3 h-12 md:h-24">
            <button 
                onClick={() => onAction('fold')}
                className="flex flex-col items-center justify-center bg-[#1A1A1A] border-r border-white/5 hover:bg-red-900/20 active:bg-red-900/40 transition-colors"
            >
                <span className="text-red-500 font-bold text-[10px] md:text-xl tracking-wider">FOLD</span>
            </button>

            <button 
                onClick={() => toCall === 0 ? onAction('check') : onAction('call')}
                className="flex flex-col items-center justify-center bg-[#241b35] border-r border-white/5 hover:bg-[#2f2245] active:bg-[#3a2a5a] transition-colors"
            >
                <span className="text-sol-purple font-bold text-[10px] md:text-xl tracking-wider">
                    {toCall === 0 ? 'CHECK' : isCallAllIn ? 'ALL IN' : 'CALL'}
                </span>
                {toCall > 0 && <span className="text-[8px] md:text-sm text-gray-300 font-bold font-sans tabular-nums mt-0.5">{fmt(Math.min(toCall, userBalance))}</span>}
            </button>

            <button 
                onClick={() => onAction('raise', raiseAmount)}
                className="flex flex-col items-center justify-center bg-[#0d2626] hover:bg-[#113333] active:bg-[#164040] transition-colors"
            >
                <span className="text-sol-blue font-bold text-[10px] md:text-xl tracking-wider">
                    {isRaiseAllIn ? 'ALL IN' : currentBet === 0 ? 'BET' : 'RAISE'}
                </span>
                <span className="text-[8px] md:text-sm text-gray-300 font-bold font-sans tabular-nums mt-0.5">{fmt(raiseAmount)}</span>
            </button>
       </div>
    </div>
  );
};

const PresetBtn = ({ onClick, label }: { onClick: () => void, label: string }) => (
    <button 
        onClick={onClick} 
        className="flex-1 py-1.5 bg-white/5 border border-white/10 rounded text-[9px] md:text-xs font-bold text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all uppercase tracking-wide"
    >
        {label}
    </button>
);
