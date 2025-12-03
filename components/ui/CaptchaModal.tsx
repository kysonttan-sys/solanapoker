
import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Card } from '../poker/Card';
import { Button } from './Button';
import { Suit, Rank, SUITS, RANKS } from '../../utils/pokerGameLogic';
import { ShieldCheck, AlertTriangle, RefreshCw, Bot, CheckCircle } from 'lucide-react';

interface CaptchaModalProps {
  isOpen: boolean;
  onVerify: () => void;
  canClose?: boolean;
  onClose?: () => void;
  isVerified?: boolean;
}

export const CaptchaModal: React.FC<CaptchaModalProps> = ({ isOpen, onVerify, canClose = false, onClose, isVerified = false }) => {
  const [targetCard, setTargetCard] = useState<{suit: Suit, rank: Rank} | null>(null);
  const [options, setOptions] = useState<{suit: Suit, rank: Rank, id: number}[]>([]);
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(isVerified);

  const generateCaptcha = () => {
    // Generate Target
    const targetSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const targetRank = RANKS[Math.floor(Math.random() * RANKS.length)];
    const target = { suit: targetSuit, rank: targetRank };
    
    // Generate Distractors
    const opts = [{ ...target, id: 0 }]; // id 0 is always correct for logic, but we shuffle
    
    while(opts.length < 3) {
       const s = SUITS[Math.floor(Math.random() * SUITS.length)];
       const r = RANKS[Math.floor(Math.random() * RANKS.length)];
       // Simple check to avoid duplicates
       if (!opts.find(o => o.suit === s && o.rank === r)) {
           opts.push({ suit: s, rank: r, id: opts.length });
       }
    }

    // Shuffle
    for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
    }

    setTargetCard(target);
    setOptions(opts);
    setError(false);
  };

  useEffect(() => {
      setSuccess(isVerified);
  }, [isVerified]);

  useEffect(() => {
      if (isOpen && !isVerified) generateCaptcha();
  }, [isOpen, isVerified]);

  const handleSelect = (option: {suit: Suit, rank: Rank, id: number}) => {
      // Logic relies on matching properties since we shuffled IDs but kept objects
      if (option.suit === targetCard?.suit && option.rank === targetCard?.rank) {
          setSuccess(true);
          setTimeout(() => {
              onVerify();
              // Keep success state true if we want to show it briefly or if logic requires
          }, 1000);
      } else {
          setError(true);
          setTimeout(() => {
              generateCaptcha(); // Generate new puzzle on fail
          }, 1000);
      }
  };

  const getCardName = (s: Suit, r: Rank) => {
      const suitName = s.charAt(0).toUpperCase() + s.slice(1);
      const rankName = r === '10' ? '10' : 
                       r === 'A' ? 'Ace' : 
                       r === 'K' ? 'King' : 
                       r === 'Q' ? 'Queen' : 
                       r === 'J' ? 'Jack' : r;
      return `${rankName} of ${suitName}`;
  };

  if (!targetCard && !success) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose || (() => {})} title={success ? "Verification Status" : "Fair Play Verification"} hideClose={!canClose && !success}>
       <div className="flex flex-col items-center justify-center text-center space-y-6 py-4">
           {success ? (
               <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300 w-full">
                   <div className="w-24 h-24 bg-sol-green/10 rounded-full flex items-center justify-center border-4 border-sol-green shadow-[0_0_20px_rgba(0,255,174,0.3)]">
                       <ShieldCheck size={48} className="text-sol-green" />
                   </div>
                   <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-white">System Verified</h3>
                        <p className="text-gray-400 max-w-xs mx-auto">
                            Your session is authenticated. Bot protection measures are active and you have passed the check.
                        </p>
                   </div>
                   
                   <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg border border-white/10 mt-2">
                        <CheckCircle size={16} className="text-sol-green" />
                        <span className="text-sm font-mono text-gray-300">Session ID: <span className="text-white">Active</span></span>
                   </div>

                   {canClose && (
                        <Button variant="outline" onClick={onClose} className="mt-4 min-w-[120px]">
                            Close
                        </Button>
                   )}
               </div>
           ) : (
               <>
                    <div className="flex items-center gap-3 bg-sol-blue/10 px-4 py-2 rounded-lg border border-sol-blue/30">
                        <Bot size={24} className="text-sol-blue" />
                        <span className="text-sol-blue font-bold">Anti-Bot Protection</span>
                    </div>

                    <div className="space-y-2">
                        <p className="text-lg text-white">Select the <span className="text-sol-green font-bold text-xl underline decoration-dashed underline-offset-4">{getCardName(targetCard!.suit, targetCard!.rank)}</span></p>
                        <p className="text-xs text-gray-500">Prove you are not a robot to join the table.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 md:gap-8 p-4 bg-white/5 rounded-xl border border-white/5">
                        {options.map((opt, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => handleSelect(opt)}
                                className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
                            >
                                <Card suit={opt.suit} rank={opt.rank} size="md" />
                            </div>
                        ))}
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-500 animate-pulse bg-red-500/10 px-4 py-2 rounded-lg">
                            <AlertTriangle size={18} />
                            <span className="font-bold">Incorrect! Generating new puzzle...</span>
                        </div>
                    )}

                    <div className="w-full flex justify-end">
                        <button 
                            onClick={generateCaptcha}
                            className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors"
                        >
                            <RefreshCw size={12} /> New Puzzle
                        </button>
                    </div>
               </>
           )}
       </div>
    </Modal>
  );
};
