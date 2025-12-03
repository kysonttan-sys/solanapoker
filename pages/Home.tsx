
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Filter, Plus, Award, ArrowRight, Coins, Users, Layers, Activity, Globe, Zap, CheckCircle, Gift, Crown, Timer, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { GameType, PokerTable, Tournament } from '../types';
import { TableCard, TournamentCard } from '../components/GameCards';
import { PRIZE_POOL_INFO } from '../constants';

interface HomeProps {
  onCreateGame: (type: GameType) => void;
  onJoinGame: (id: string) => void;
  tables: PokerTable[];
  tournaments: Tournament[];
}

export const Home: React.FC<HomeProps> = ({ onCreateGame, onJoinGame, tables, tournaments }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'cash' | 'tournament' | 'fun'>('cash');

  // Filter & Sort Logic:
  // 1. Hide full rooms (occupiedSeats < seats / registeredPlayers < maxPlayers)
  // 2. Sort by popularity (most players first)
  // 3. Show top 3

  const displayTables = tables
    .filter(t => (!t.type || t.type === GameType.CASH) && t.occupiedSeats < t.seats)
    .sort((a, b) => b.occupiedSeats - a.occupiedSeats)
    .slice(0, 3);

  const displayFunTables = tables
    .filter(t => t.type === GameType.FUN && t.occupiedSeats < t.seats)
    .sort((a, b) => b.occupiedSeats - a.occupiedSeats)
    .slice(0, 3);

  const displayTournaments = tournaments
    .filter(t => t.status === 'REGISTERING' && t.registeredPlayers < t.maxPlayers)
    .sort((a, b) => b.registeredPlayers - a.registeredPlayers)
    .slice(0, 3);

  // Platform Statistics Data
  const platformStats = [
    { label: 'Total Volume', value: '$142.5M+', icon: <Coins size={18} className="text-yellow-500" />, sub: 'Lifetime Traded' },
    { label: 'Hands Dealt', value: '25.4M', icon: <Layers size={18} className="text-sol-purple" />, sub: 'Verifiable RNG' },
    { label: 'Active Players', value: '2,405', icon: <Users size={18} className="text-sol-blue" />, sub: 'Online Now' },
    { label: 'Avg Payout', value: '< 2s', icon: <Zap size={18} className="text-sol-green" />, sub: 'Instant Settlement' },
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      
      {/* Hero / CTA */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sol-dark to-sol-black border border-white/10 p-8 md:p-12">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sol-green/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-sol-purple/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
            
            {/* Left Content */}
            <div className="max-w-2xl text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 font-sans tracking-tight">
                Fair. Transparent. <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sol-green to-sol-blue">Decentralized Poker.</span>
              </h1>
              <p className="text-gray-400 text-lg mb-8 max-w-lg mx-auto lg:mx-0">
                Join the future of online poker on Solana. Instant payouts, verifiable RNG, and lowest fees in the galaxy.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" onClick={() => navigate('/lobby')}>
                  <Play className="mr-2" size={20} /> Play Now
                </Button>
                <Button variant="outline" size="lg" onClick={() => onCreateGame(GameType.CASH)}>
                  <Plus className="mr-2" size={20} /> Create Table
                </Button>
              </div>
            </div>

            {/* Right Side - Stats Box */}
            <div className="w-full lg:w-auto bg-black/20 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4 justify-center lg:justify-start">
                    <Activity size={16} className="text-sol-green animate-pulse" />
                    <span className="text-xs font-bold text-sol-green uppercase tracking-widest">Live Protocol Stats</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {platformStats.map((stat, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all group min-w-[150px]">
                            <div className="flex items-start justify-between mb-2">
                                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{stat.label}</span>
                                <div className="p-1.5 bg-black/40 rounded-lg group-hover:scale-110 transition-transform shadow-inner">
                                    {stat.icon}
                                </div>
                            </div>
                            <div className="text-xl md:text-2xl font-bold text-white font-mono tracking-tight mb-1">{stat.value}</div>
                            <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                <CheckCircle size={10} className="text-sol-green"/> {stat.sub}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
      </div>

      {/* Community Jackpot Section */}
      <div className="bg-gradient-to-r from-yellow-900/20 via-sol-dark to-sol-dark border border-yellow-500/20 rounded-2xl p-6 md:p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-32 bg-yellow-500/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 group-hover:bg-yellow-500/10 transition-all"></div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                      <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <Sparkles size={10} /> COMMUNITY POOL
                      </span>
                      <span className="text-yellow-500 text-xs font-mono">5% OF ALL FEES</span>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-2 font-mono tracking-tight">
                      ${PRIZE_POOL_INFO.currentAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </h2>
                  <p className="text-gray-400 max-w-md text-sm">
                      Every hand played contributes to the Community Jackpot. Automatically distributed via smart contract to:
                  </p>
              </div>

              <div className="grid grid-cols-3 gap-2 md:gap-4 w-full md:w-auto">
                  <div className="bg-black/40 border border-yellow-500/20 rounded-xl p-3 text-center">
                      <Crown size={20} className="mx-auto text-yellow-500 mb-1" />
                      <div className="text-xl font-bold text-white">{PRIZE_POOL_INFO.distribution.topPlayer}%</div>
                      <div className="text-[10px] text-gray-500 uppercase">Top Player</div>
                  </div>
                  <div className="bg-black/40 border border-yellow-500/20 rounded-xl p-3 text-center">
                      <Users size={20} className="mx-auto text-sol-blue mb-1" />
                      <div className="text-xl font-bold text-white">{PRIZE_POOL_INFO.distribution.topEarner}%</div>
                      <div className="text-[10px] text-gray-500 uppercase">Top Earner</div>
                  </div>
                  <div className="bg-black/40 border border-yellow-500/20 rounded-xl p-3 text-center">
                      <Gift size={20} className="mx-auto text-sol-purple mb-1" />
                      <div className="text-xl font-bold text-white">{PRIZE_POOL_INFO.distribution.luckyDraw}%</div>
                      <div className="text-[10px] text-gray-500 uppercase">10x Lucky Draw</div>
                  </div>
              </div>

              <div className="text-right">
                  <div className="flex items-center gap-2 justify-end text-gray-400 text-xs uppercase mb-1">
                      <Timer size={14} /> Next Payout
                  </div>
                  <div className="text-2xl font-bold text-white font-mono">3D 14H 20M</div>
                  <Button size="sm" variant="outline" className="mt-3 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500 hover:text-black">
                      View Leaderboard
                  </Button>
              </div>
          </div>
      </div>

      {/* Ecosystem Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-[#1A1A24] to-[#13131F] border border-sol-purple/30 rounded-xl p-6 relative overflow-hidden group cursor-pointer" onClick={() => onCreateGame(GameType.TOURNAMENT)}>
               <div className="absolute right-0 top-0 w-32 h-32 bg-sol-purple/20 rounded-full blur-2xl transform translate-x-10 -translate-y-10 group-hover:bg-sol-purple/30 transition-all"></div>
               <div className="relative z-10">
                   <div className="flex items-center gap-2 mb-3">
                       <div className="p-2 bg-sol-purple/20 rounded-lg text-sol-purple"><Coins size={20} /></div>
                       <h3 className="text-xl font-bold text-white">Host to Earn</h3>
                   </div>
                   <p className="text-gray-400 text-sm mb-4">Be the House. Create tables or tournaments and earn <span className="text-white font-bold">up to 40%</span> of all rake and fees generated.</p>
                   <span className="text-sol-purple text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">Start Hosting <ArrowRight size={14}/></span>
               </div>
          </div>

          <div className="bg-gradient-to-br from-[#1A1A24] to-[#13131F] border border-sol-green/30 rounded-xl p-6 relative overflow-hidden group cursor-pointer" onClick={() => navigate('/profile?tab=ecosystem')}>
               <div className="absolute right-0 top-0 w-32 h-32 bg-sol-green/20 rounded-full blur-2xl transform translate-x-10 -translate-y-10 group-hover:bg-sol-green/30 transition-all"></div>
               <div className="relative z-10">
                   <div className="flex items-center gap-2 mb-3">
                       <div className="p-2 bg-sol-green/20 rounded-lg text-sol-green"><Users size={20} /></div>
                       <h3 className="text-xl font-bold text-white">Share to Earn</h3>
                   </div>
                   <p className="text-gray-400 text-sm mb-4">Grow the ecosystem. Invite friends using your unique link and earn <span className="text-white font-bold">up to 20%</span> of their fees forever.</p>
                   <span className="text-sol-green text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">Get Referral Link <ArrowRight size={14}/></span>
               </div>
          </div>

          <div className="bg-gradient-to-br from-[#1A1A24] to-[#13131F] border border-sol-blue/30 rounded-xl p-6 relative overflow-hidden group cursor-pointer" onClick={() => navigate('/staking')}>
               <div className="absolute right-0 top-0 w-32 h-32 bg-sol-blue/20 rounded-full blur-2xl transform translate-x-10 -translate-y-10 group-hover:bg-sol-blue/30 transition-all"></div>
               <div className="relative z-10">
                   <div className="flex items-center gap-2 mb-3">
                       <div className="p-2 bg-sol-blue/20 rounded-lg text-sol-blue"><Layers size={20} /></div>
                       <h3 className="text-xl font-bold text-white">Staking</h3>
                   </div>
                   <p className="text-gray-400 text-sm mb-4">Stake $SPX to earn yield. Current <span className="text-sol-green font-bold">24.5% APY</span> rewarded in real-time.</p>
                   <span className="text-sol-blue text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">View Pool <ArrowRight size={14}/></span>
               </div>
          </div>
      </div>

      {/* Game Browser Preview */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-lg w-fit overflow-x-auto">
            <button
              onClick={() => setActiveTab('cash')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'cash' ? 'bg-sol-green text-sol-black shadow-lg' : 'text-gray-400 hover:text-white'
              }`}
            >
              Cash Games
            </button>
            <button
              onClick={() => setActiveTab('tournament')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'tournament' ? 'bg-sol-purple text-white shadow-lg' : 'text-gray-400 hover:text-white'
              }`}
            >
              Tournaments
            </button>
            <button
              onClick={() => setActiveTab('fun')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'fun' ? 'bg-yellow-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'
              }`}
            >
              Just for Fun
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/lobby')}>
              <Filter size={16} /> Filter
            </Button>
            <Button 
                variant="secondary" 
                size="sm" 
                className="gap-2" 
                onClick={() => onCreateGame(activeTab === 'cash' ? GameType.CASH : activeTab === 'tournament' ? GameType.TOURNAMENT : GameType.FUN)}
            >
              <Plus size={16} /> Create {activeTab === 'cash' ? 'Table' : activeTab === 'tournament' ? 'Event' : 'Fun Table'}
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTab === 'cash' ? (
            displayTables.length > 0 ? (
                displayTables.map((table) => (
                <TableCard key={table.id} table={table} onJoin={onJoinGame} />
                ))
            ) : (
                <div className="col-span-full text-center py-12 text-gray-500 bg-white/5 rounded-xl border border-white/5 border-dashed">
                    <p>No available tables found.</p>
                    <Button variant="ghost" className="mt-2 text-sol-green" onClick={() => onCreateGame(GameType.CASH)}>Create one?</Button>
                </div>
            )
          ) : activeTab === 'tournament' ? (
             displayTournaments.length > 0 ? (
                displayTournaments.map((tour) => (
                <TournamentCard key={tour.id} tournament={tour} onJoin={onJoinGame} />
                ))
             ) : (
                <div className="col-span-full text-center py-12 text-gray-500 bg-white/5 rounded-xl border border-white/5 border-dashed">
                    <p>No open tournaments found.</p>
                    <Button variant="ghost" className="mt-2 text-sol-purple" onClick={() => onCreateGame(GameType.TOURNAMENT)}>Create one?</Button>
                </div>
             )
          ) : (
             displayFunTables.length > 0 ? (
                displayFunTables.map((table) => (
                <TableCard key={table.id} table={table} onJoin={onJoinGame} />
                ))
             ) : (
                <div className="col-span-full text-center py-12 text-gray-500 bg-white/5 rounded-xl border border-white/5 border-dashed">
                    <p>No fun tables found. Start a friendly match!</p>
                    <Button variant="ghost" className="mt-2 text-yellow-500" onClick={() => onCreateGame(GameType.FUN)}>Create one?</Button>
                </div>
             )
          )}
        </div>

        {/* More Button */}
        <div className="flex justify-center pt-4">
            <Button 
                variant="outline" 
                className="gap-2 w-full md:w-auto min-w-[200px] border-dashed hover:border-solid hover:bg-white/5 hover:text-white"
                onClick={() => navigate('/lobby')}
            >
                View Full Lobby <ArrowRight size={16} />
            </Button>
        </div>
      </div>
    </div>
  );
};
