
import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Wallet, Loader2 } from 'lucide-react';

interface BuyInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  min: number;
  max: number;
  balance: number;
  bigBlind: number;
  isDepositing?: boolean;
}

export const BuyInModal: React.FC<BuyInModalProps> = ({ isOpen, onClose, onConfirm, min, max, balance, bigBlind, isDepositing = false }) => {
  const effectiveMax = Math.min(max, balance);
  const [amount, setAmount] = useState(min);
  const isFixedBuyIn = min === max;

  useEffect(() => {
    if (isOpen) {
        // If fixed (tournament), set to min. Else default logic.
        if (isFixedBuyIn) {
            setAmount(min);
        } else {
            const defaultBuyIn = Math.min(effectiveMax, bigBlind * 100);
            setAmount(Math.max(min, defaultBuyIn));
        }
    }
  }, [isOpen, min, effectiveMax, bigBlind, isFixedBuyIn]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(Number(e.target.value));
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(amount);
  };

  if (!isOpen) return null;

  const bbCount = (amount / bigBlind).toFixed(1);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isFixedBuyIn ? "Tournament Entry" : "Buy In"} hideClose={isDepositing}>
      <form onSubmit={handleConfirm} className="space-y-6">
        <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Wallet Balance</span>
                <span className="text-white font-mono flex items-center gap-2">
                    <Wallet size={14} className="text-gray-500" />
                    ${balance.toLocaleString()}
                </span>
            </div>

            {isFixedBuyIn ? (
                <div className="bg-sol-blue/10 border border-sol-blue/30 p-6 rounded-xl text-center space-y-2">
                    <p className="text-gray-400 text-xs uppercase font-bold">Entry Fee Required</p>
                    <p className="text-3xl font-bold text-white font-mono">${min.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">You will receive standard starting stack.</p>
                </div>
            ) : (
                <>
                    <div className="bg-black/40 p-6 rounded-xl border border-white/10 text-center">
                        <div className="text-3xl font-bold text-sol-green font-mono mb-1">
                            ${amount.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                            {bbCount} BB
                        </div>
                    </div>

                    <div className="space-y-2">
                        <input 
                            type="range" 
                            min={min} 
                            max={effectiveMax} 
                            step={bigBlind}
                            value={amount}
                            onChange={handleSliderChange}
                            className="w-full accent-sol-green h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            disabled={isDepositing}
                        />
                        <div className="flex justify-between text-xs text-gray-500 font-mono">
                            <span>Min: ${min}</span>
                            <span>Max: ${effectiveMax}</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 text-xs"
                            onClick={() => setAmount(min)}
                            disabled={isDepositing}
                        >
                            Min
                        </Button>
                        {effectiveMax >= bigBlind * 50 && (
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                className="flex-1 text-xs"
                                onClick={() => setAmount(Math.min(effectiveMax, bigBlind * 50))}
                                disabled={isDepositing}
                            >
                                50 BB
                            </Button>
                        )}
                        {effectiveMax >= bigBlind * 100 && (
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                className="flex-1 text-xs"
                                onClick={() => setAmount(Math.min(effectiveMax, bigBlind * 100))}
                                disabled={isDepositing}
                            >
                                100 BB
                            </Button>
                        )}
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 text-xs"
                            onClick={() => setAmount(effectiveMax)}
                            disabled={isDepositing}
                        >
                            Max
                        </Button>
                    </div>
                </>
            )}
        </div>

        <Button fullWidth type="submit" disabled={amount < min || amount > balance || isDepositing} className="shadow-[0_0_20px_rgba(0,255,174,0.3)]">
            {isDepositing ? (
                <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={18} /> Confirming...
                </span>
            ) : (
                isFixedBuyIn ? `Pay Entry ($${amount})` : 'Sit Down'
            )}
        </Button>
        {isDepositing && (
            <p className="text-center text-xs text-yellow-500 animate-pulse">
                Please approve the transaction in your wallet.
            </p>
        )}
      </form>
    </Modal>
  );
};
