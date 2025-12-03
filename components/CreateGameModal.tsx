
import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { GameType, Speed, PokerTable, Tournament } from '../types';
import { Coins, TrendingUp, Info, PieChart, Crown, Gift, Layers, Globe, Zap, Smile, Lock, Key, Calculator } from 'lucide-react';
import { getHostStatus, MOCK_USER, PROTOCOL_FEE_SPLIT } from '../constants'; // Importing Mock User for demo state

interface CreateGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType: GameType;
  onGameCreated: (game: PokerTable | Tournament, type: GameType) => void;
}

export const CreateGameModal: React.FC<CreateGameModalProps> = ({ isOpen, onClose, defaultType, onGameCreated }) => {
  const [type, setType] = useState<GameType>(defaultType);

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

  // Tournament specific
  const [entryFee, setEntryFee] = useState('');
  const [tournamentFeePercent, setTournamentFeePercent] = useState('10'); // Default 10%
  const [guaranteedPrize, setGuaranteedPrize] = useState('');
  const [startTime, setStartTime] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('100');
  const [winnersCount, setWinnersCount] = useState('15');
  const [distribution, setDistribution] = useState('Standard');
  const [startingChips, setStartingChips] = useState('10000');

  // Logic for Host Rank (Using Mock User for Demo context)
  const currentHostStatus = getHostStatus(MOCK_USER.ecosystemStats?.totalHostRevenueGenerated || 0);
  const hostShare = currentHostStatus.share;
  
  // Revenue Projection State
  const [projectedEarnings, setProjectedEarnings] = useState(0);

  // Auto-Adjust Winners Count based on Max Players
  useEffect(() => {
      const max = parseInt(maxPlayers) || 0;
      const winners = parseInt(winnersCount) || 0;
      
      // If winners count exceeds players, or is unrealistically high/low
      if (max > 0) {
          // Default to ~15% of field
          const optimalWinners = Math.max(1, Math.floor(max * 0.15));
          
          if (winners > max || winners === 0 || (max < 20 && winners > 3)) {
              setWinnersCount(optimalWinners.toString());
          }
      }
  }, [maxPlayers]);

  // Update Revenue Projection
  useEffect(() => {
      if (type === GameType.FUN) {
          setProjectedEarnings(0);
          return;
      }

      let estimatedRevenue = 0;

      if (type === GameType.CASH) {
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
      } else {
          // Calculation: Total Fees Collected * Host Share
          // Total Fees = (BuyIn * Players) * Fee%
          const buyInVal = parseFloat(entryFee) || 0;
          const playersVal = parseInt(maxPlayers) || 100;
          const feePct = parseFloat(tournamentFeePercent) / 100;
          
          const totalVolume = buyInVal * playersVal;
          const totalFees = totalVolume * feePct; 
          
          estimatedRevenue = totalFees * (hostShare / 100);
      }

      setProjectedEarnings(estimatedRevenue);
  }, [type, smallBlindInput, entryFee, maxPlayers, tournamentFeePercent, hostShare, speed, minBuyInBB, maxBuyInBB, seats]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (type === GameType.CASH || type === GameType.FUN) {
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
            creatorId: MOCK_USER.id,
            isPrivate,
            password: isPrivate ? password : undefined
        };
        onGameCreated(newTable, type);
        
        if (type === GameType.FUN) {
             alert(`Fun Table "${name}" Created!\n\nType: Play Money\nBlinds: ${sb}/${bb}\nStart Chips: ${buyInMinVal} (100bb Auto)`);
        } else {
             alert(`Cash Game "${name}" Created!\n\nRake: 3% (Cap $${defaultRakeCap})\nYour Share: ${hostShare}% (${currentHostStatus.name})`);
        }
    } else {
        const newTourney: Tournament = {
            id: `tour_${Date.now()}`,
            name,
            buyIn: parseFloat(entryFee) || 0,
            prizePool: parseFloat(guaranteedPrize) || 0,
            registeredPlayers: 1, // You are the first registrant
            maxPlayers: parseInt(maxPlayers) || 100,
            startTime: startTime || new Date(Date.now() + 3600000).toISOString(),
            speed,
            status: 'REGISTERING',
            winnersCount,
            distribution,
            startingChips: parseInt(startingChips) || 10000,
            creatorId: MOCK_USER.id,
            isPrivate,
            password: isPrivate ? password : undefined,
            seats // Include seats from state
        };
        onGameCreated(newTourney, GameType.TOURNAMENT);
        alert(`Tournament "${name}" Created!\n\nPlatform Fee: ${tournamentFeePercent}%\nYour Share: ${hostShare}% (${currentHostStatus.name})`);
    }
    
    // Reset and close
    onClose();
    setName('');
    setIsPrivate(false);
    setPassword('');
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
        title={type === GameType.CASH ? 'Host Cash Game' : type === GameType.FUN ? 'Host Friendly Game' : 'Host Tournament'} 
        size={type === GameType.TOURNAMENT ? 'lg' : 'md'}
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
                onClick={() => setType(GameType.TOURNAMENT)}
                className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${type === GameType.TOURNAMENT ? 'bg-sol-purple text-white' : 'text-gray-400 hover:text-white'}`}
             >
                Tournament
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
                        <span className="text-xs text-gray-500">{type === GameType.CASH ? '/ hour' : 'for this event'}</span>
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
                <label className="block text-sm font-medium text-gray-400 mb-1">{type === GameType.TOURNAMENT ? "Tournament Name" : "Table Name"}</label>
                <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={type === GameType.CASH ? "e.g. Friday Night Poker" : type === GameType.FUN ? "e.g. Friendly Match" : "e.g. Sunday Million"}
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

            {(type === GameType.CASH || type === GameType.FUN) ? (
                <>
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
                </>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-gray-400 mb-1">Entry Fee (USDT)</label>
                             <input 
                                type="number"
                                value={entryFee}
                                onChange={(e) => setEntryFee(e.target.value)}
                                placeholder="50"
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-sol-purple focus:outline-none"
                            />
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-400 mb-1">Guaranteed Prize</label>
                             <input 
                                type="number"
                                value={guaranteedPrize}
                                onChange={(e) => setGuaranteedPrize(e.target.value)}
                                placeholder="10000"
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-sol-purple focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Tournament Fee Slider */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Tournament Fee (%)</label>
                        <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                            <input 
                                type="range"
                                min="0"
                                max="20"
                                step="0.5"
                                value={tournamentFeePercent}
                                onChange={(e) => setTournamentFeePercent(e.target.value)}
                                className="flex-1 accent-sol-purple h-2 bg-black/40 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="relative w-20">
                                <input 
                                    type="number"
                                    min="0"
                                    max="20"
                                    step="0.5"
                                    value={tournamentFeePercent}
                                    onChange={(e) => setTournamentFeePercent(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 pl-2 pr-6 text-right text-white text-sm focus:border-sol-purple focus:outline-none"
                                />
                                <span className="absolute right-2 top-1.5 text-gray-500 text-xs font-bold">%</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-2 px-1">
                            <span className="text-[10px] text-gray-500">Min 0%</span>
                            <p className="text-[10px] text-gray-400">
                                Player pays <span className="text-white font-mono">${(parseFloat(entryFee) || 0).toLocaleString()}</span> + <span className="text-sol-purple font-bold font-mono">${((parseFloat(entryFee) || 0) * (parseFloat(tournamentFeePercent)/100)).toFixed(2)}</span> Fee
                            </p>
                            <span className="text-[10px] text-gray-500">Max 20%</span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="block text-sm font-medium text-gray-400 mb-1">Max Players</label>
                             <input 
                                type="number"
                                value={maxPlayers}
                                onChange={(e) => setMaxPlayers(e.target.value)}
                                placeholder="1000"
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-sol-purple focus:outline-none"
                            />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-400 mb-1">Starting Chips</label>
                             <select 
                                value={startingChips}
                                onChange={(e) => setStartingChips(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-sol-purple focus:outline-none"
                             >
                                <option value="5000">5,000 (Short Stack)</option>
                                <option value="10000">10,000 (Standard)</option>
                                <option value="25000">25,000 (Deep Stack)</option>
                                <option value="50000">50,000 (Monster Stack)</option>
                             </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-gray-400 mb-1">Paid Places</label>
                             <input 
                                type="number"
                                value={winnersCount}
                                onChange={(e) => setWinnersCount(e.target.value)}
                                max={maxPlayers}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-sol-purple focus:outline-none"
                            />
                            <p className="text-[10px] text-gray-500 mt-1">Recommended: {Math.max(1, Math.floor((parseInt(maxPlayers)||0) * 0.15))}</p>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-400 mb-1">Start Time</label>
                             <input 
                                type="datetime-local"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-sol-purple focus:outline-none text-xs"
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">{type === GameType.TOURNAMENT ? "Table Size" : "Seats"}</label>
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
            <Button fullWidth type="submit" variant={type === GameType.CASH ? 'primary' : type === GameType.FUN ? 'outline' : 'secondary'}>
                {type === GameType.CASH ? 'Create Table & Start Earning' : type === GameType.FUN ? 'Create Fun Table' : 'Host Tournament'}
            </Button>
        </div>
      </form>
    </Modal>
  );
};