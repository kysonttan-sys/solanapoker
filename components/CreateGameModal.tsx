
import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { GameType, Speed, PokerTable } from '../types';
import { Coins, TrendingUp, Info, PieChart, Crown, Gift, Layers, Globe, Zap, Smile, Lock, Key, Calculator } from 'lucide-react';
import { getHostStatus, MOCK_USER, PROTOCOL_FEE_SPLIT } from '../constants'; // Importing Mock User for demo state
import { getApiUrl } from '../utils/api';
import { useWallet } from './WalletContextProvider';

interface CreateGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType: GameType;
  onGameCreated: (game: PokerTable, type: GameType) => void;
}

export const CreateGameModal: React.FC<CreateGameModalProps> = ({ isOpen, onClose, defaultType, onGameCreated }) => {
  const { publicKey } = useWallet();
  const [type, setType] = useState<GameType>(defaultType);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [name, setName] = useState('');
  
  // Blinds State (Flexible)
  const [smallBlindInput, setSmallBlindInput] = useState<string>('1');
  
  const [seats, setSeats] = useState<6 | 9>(6);
  const [speed, setSpeed] = useState<Speed>(Speed.REGULAR);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  
  // Cash Game specific
  const [minBuyInBB, setMinBuyInBB] = useState('50'); // Stored as BB multiplier
  const [maxBuyInBB, setMaxBuyInBB] = useState('100'); // Stored as BB multiplier
  
  // Standard Rake Cap (Fixed)
  const defaultRakeCap = 5;

  // Logic for Host Rank (Using Mock User for Demo context)
  const currentHostStatus = getHostStatus(MOCK_USER.ecosystemStats?.totalHostRevenueGenerated || 0);
  const hostShare = currentHostStatus.share;
  
  // Revenue Projection State
  const [projectedEarnings, setProjectedEarnings] = useState(0);

  // Update Revenue Projection
  useEffect(() => {
      if (type === GameType.FUN) {
          setProjectedEarnings(0);
          return;
      }

      let estimatedRevenue = 0;

      // 1. Hands Per Hour Estimation based on Speed AND Seats
      // 6-max is faster than 9-max due to fewer players acting.
      let handsPerHour = 0;

      if (seats === 6) {
          if (speed === Speed.REGULAR) handsPerHour = 60;
          else if (speed === Speed.TURBO) handsPerHour = 90;
          else if (speed === Speed.HYPER) handsPerHour = 140;
      } else {
          // 9-Max is slower
          if (speed === Speed.REGULAR) handsPerHour = 45;
          else if (speed === Speed.TURBO) handsPerHour = 70;
          else if (speed === Speed.HYPER) handsPerHour = 100;
      }

      const sb = parseFloat(smallBlindInput) || 0;
      const bb = sb * 2;

      // 2. Average Pot Estimation based on Stack Depth (Buy-in)
      // Deeper stacks = Larger average pots (implied odds, larger bluffs)
      const minBuyIn = bb * (parseFloat(minBuyInBB) || 50);
      const maxBuyIn = bb * (parseFloat(maxBuyInBB) || 100);
      const avgStack = (minBuyIn + maxBuyIn) / 2;

      // Heuristic: Average pot is roughly 10% of the average stack in play
      // (Includes small pots, folded blinds, and massive all-ins averaged out)
      const avgPot = avgStack * 0.10;

      // 3. Rake Calculation (3% capped at $5)
      const rakePerHand = Math.min(avgPot * 0.03, defaultRakeCap);

      const hourlyTableRevenue = rakePerHand * handsPerHour;
      estimatedRevenue = hourlyTableRevenue * (hostShare / 100);

      setProjectedEarnings(estimatedRevenue);
  }, [type, smallBlindInput, hostShare, speed, minBuyInBB, maxBuyInBB, seats]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
        let sb = parseFloat(smallBlindInput) || 0;
        let bb = sb * 2;

        // Calculate actual buy-in limits based on BB multipliers
        let buyInMinVal = bb * (parseFloat(minBuyInBB) || 50);
        let buyInMaxVal = bb * (parseFloat(maxBuyInBB) || 100);

        // FUN MODE: Multiplier for blinds
        if (type === GameType.FUN) {
            sb *= 100;
            bb *= 100;
            buyInMinVal = bb * 100;
            buyInMaxVal = bb * 100;
        }

        const newTable: PokerTable = {
            id: `table_${Date.now()}`,
            name,
            smallBlind: sb,
            bigBlind: bb,
            seats,
            occupiedSeats: 0, // Starts empty
            buyInMin: buyInMinVal,
            buyInMax: buyInMaxVal,
            speed,
            rakeCap: type === GameType.FUN ? 0 : defaultRakeCap,
            type: type,
            creatorId: publicKey?.toBase58() || MOCK_USER.id,
            isPrivate,
            password: isPrivate ? password : undefined
        };
        onGameCreated(newTable, type);

        if (type === GameType.FUN) {
             alert(`Fun Table "${name}" Created!\n\nType: Play Money (Free)\nBlinds: ${sb}/${bb}\nStart Chips: ${buyInMinVal} (100bb Auto)\n\nNo deposits required - just for fun!`);
        } else {
             alert(`Cash Game "${name}" Created!\n\nRake: 3% (Cap $${defaultRakeCap})\nYour Share: ${hostShare}% (${currentHostStatus.name})`);
        }

        // Reset and close
        onClose();
        setName('');
        setIsPrivate(false);
        setPassword('');
    } catch (error) {
        console.error('Error creating game:', error);
        alert('Failed to create game. Please try again.');
    } finally {
        setIsCreating(false);
    }
  };

  const speedOptions = [
    { value: Speed.REGULAR, label: 'Regular (60 sec)' },
    { value: Speed.TURBO, label: 'Turbo (30 sec)' },
    { value: Speed.HYPER, label: 'Hyper (15 sec)' },
  ];

  return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={type === GameType.CASH ? 'Host Cash Game' : 'Host Fun Game'}
        size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        <div className="flex bg-white/5 p-1 rounded-lg mb-6">
             <button
                type="button"
                onClick={() => setType(GameType.CASH)}
                className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${type === GameType.CASH ? 'bg-sol-green text-black' : 'text-gray-400 hover:text-white'}`}
             >
                Cash Game
             </button>
             <button
                type="button"
                onClick={() => setType(GameType.FUN)}
                className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${type === GameType.FUN ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'}`}
             >
                Just for Fun
             </button>
        </div>

        {/* Host Earnings Projector */}
        {type !== GameType.FUN && (
            <div className="bg-gradient-to-r from-[#13131F] to-black border border-sol-green/30 rounded-xl p-4 flex justify-between items-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-sol-green/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2 group-hover:bg-sol-green/20 transition-all"></div>
                
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Calculator size={16} className="text-sol-green" />
                        <h4 className="text-gray-300 text-xs font-bold uppercase tracking-wider">Projected Host Earnings</h4>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-mono font-bold text-white">${projectedEarnings.toFixed(2)}</span>
                        <span className="text-xs text-gray-500">/ hour</span>
                    </div>
                </div>
                
                <div className="text-right z-10">
                    <div className="text-[10px] text-gray-500 uppercase">Share of Fees</div>
                    <div className={`text-xl font-bold ${currentHostStatus.color}`}>{hostShare}%</div>
                </div>
            </div>
        )}

        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Table Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={type === GameType.CASH ? "e.g. Friday Night Poker" : "e.g. Friendly Match"}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-sol-green focus:outline-none"
                    required
                />
            </div>

            {/* Private Table Toggle */}
            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-white cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={isPrivate}
                            onChange={(e) => setIsPrivate(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-600 text-sol-green focus:ring-sol-green bg-black"
                        />
                        <span className="flex items-center gap-2">
                            {isPrivate ? <Lock size={16} className="text-sol-green"/> : <Lock size={16} className="text-gray-500"/>}
                            Private Table
                        </span>
                    </label>
                </div>
                {isPrivate && (
                    <div className="animate-in slide-in-from-top-2">
                        <div className="relative">
                            <Key size={16} className="absolute left-3 top-2.5 text-gray-500" />
                            <input 
                                type="text"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Set Access Password"
                                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white text-sm focus:border-sol-green focus:outline-none"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Flexible Blinds Setting */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Small Blind ($)</label>
                    <input
                        type="number"
                        value={smallBlindInput}
                        onChange={(e) => setSmallBlindInput(e.target.value)}
                        min="0.01"
                        step="0.01"
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-sol-green focus:outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Big Blind ($)</label>
                    <input
                        type="number"
                        value={(parseFloat(smallBlindInput) * 2) || 0}
                        disabled
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-gray-400 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Auto-calculated (2x SB)</p>
                </div>
            </div>

            {type === GameType.CASH && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Min Buy-in (BBs)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={minBuyInBB}
                                onChange={(e) => setMinBuyInBB(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-sol-green focus:outline-none"
                            />
                            <span className="absolute right-3 top-2.5 text-gray-500 text-xs font-bold">BB</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">
                            ${((parseFloat(minBuyInBB) || 0) * (parseFloat(smallBlindInput) * 2 || 0)).toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Max Buy-in (BBs)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={maxBuyInBB}
                                onChange={(e) => setMaxBuyInBB(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-sol-green focus:outline-none"
                            />
                            <span className="absolute right-3 top-2.5 text-gray-500 text-xs font-bold">BB</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">
                            ${((parseFloat(maxBuyInBB) || 0) * (parseFloat(smallBlindInput) * 2 || 0)).toLocaleString()}
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Seats</label>
                     <div className="flex gap-2">
                        {[6, 9].map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setSeats(s as 6 | 9)}
                                className={`flex-1 py-2 rounded-lg border text-sm font-medium ${seats === s ? 'border-sol-green bg-sol-green/10 text-sol-green' : 'border-white/10 bg-black/20 text-gray-400'}`}
                            >
                                {s} Max
                            </button>
                        ))}
                     </div>
                 </div>
                 <div>
                     <label className="block text-sm font-medium text-gray-400 mb-1">Speed</label>
                     <select 
                         value={speed}
                         onChange={(e) => setSpeed(e.target.value as Speed)}
                         className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-sol-green focus:outline-none"
                    >
                        {speedOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                 </div>
            </div>
        </div>

        <div className="pt-4">
            <Button
                fullWidth
                type="submit"
                variant={type === GameType.CASH ? 'primary' : 'outline'}
                disabled={isCreating}
            >
                {isCreating ? 'Creating...' : (type === GameType.CASH ? 'Create Table & Start Earning' : 'Create Fun Table')}
            </Button>
        </div>
      </form>
    </Modal>
  );
};