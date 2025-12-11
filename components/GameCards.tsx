
import React, { useState } from 'react';
import { Users, Clock, Check, Trophy, Layers, Lock, Calendar } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { PokerTable, Tournament, Speed, GameType } from '../types';
import { getApiUrl } from '../utils/api';
import { useWallet } from './WalletContextProvider';

export const Badge = ({ type }: { type: Speed }) => {
  const colors = {
    [Speed.REGULAR]: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    [Speed.TURBO]: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    [Speed.HYPER]: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${colors[type]}`}>
      {type}
    </span>
  );
};

export const TableCard: React.FC<{ table: PokerTable, onJoin: (id: string) => void }> = ({ table, onJoin }) => {
  const [isJoining, setIsJoining] = useState(false);
  const isFun = table.type === GameType.FUN;

  const handleJoin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (table.isPrivate) {
        const password = prompt("Enter Table Password:");
        if (password !== table.password) {
            alert("Incorrect Password");
            return;
        }
    }
    
    setIsJoining(true);
    
    // Simulate slight delay for effect before calling parent handler
    setTimeout(() => {
        setIsJoining(false);
        onJoin(table.id);
    }, 500);
  };

  return (
    <Card hoverEffect className="group cursor-pointer">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-sol-green transition-colors flex items-center gap-2">
              {table.name}
              {table.isPrivate && <Lock size={14} className="text-yellow-500"/>}
          </h3>
          <p className="text-sm text-gray-400 font-mono">
              Blinds: {isFun ? `${table.smallBlind}/${table.bigBlind}` : `$${table.smallBlind}/$${table.bigBlind}`}
          </p>
        </div>
        <Badge type={table.speed} />
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 flex items-center gap-1"><Users size={14}/> Seats</span>
          <span className="text-white">{table.occupiedSeats}/{table.seats}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">Buy-in</span>
          <span className="text-sol-blue font-mono">
              {isFun 
                ? `${table.buyInMin.toLocaleString()} Chips` 
                : `$${table.buyInMin} - $${table.buyInMax}`
              }
          </span>
        </div>
        
        <div className="w-full bg-white/5 rounded-full h-1.5 mt-2">
          <div 
            className="bg-sol-green h-1.5 rounded-full transition-all duration-1000" 
            style={{ width: `${(table.occupiedSeats / table.seats) * 100}%` }}
          />
        </div>

        <Button 
          fullWidth 
          variant={'outline'} 
          className={`mt-4 border-white/10 group-hover:bg-sol-green group-hover:text-sol-black`}
          onClick={handleJoin}
          disabled={isJoining}
        >
          {isJoining ? 'Joining...' : table.isPrivate ? 'Enter Password' : 'Join Table'}
        </Button>
      </div>
    </Card>
  );
};

export const TournamentCard: React.FC<{ tournament: Tournament, onJoin: (id: string) => void }> = ({ tournament, onJoin }) => {
  const [hasRegistered, setHasRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegister = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (tournament.isPrivate) {
        const password = prompt("Enter Tournament Password:");
        if (password !== tournament.password) {
            alert("Incorrect Password");
            return;
        }
    }

    setIsRegistering(true);

    try {
        // Get user data from localStorage (set by WalletContextProvider)
        const walletAddress = localStorage.getItem('connectedWallet');
        const userDataStr = localStorage.getItem(`solpoker_user_${walletAddress}`);

        if (!walletAddress || !userDataStr) {
            alert('Please connect your wallet first');
            return;
        }

        const userData = JSON.parse(userDataStr);

        // Confirm registration
        const confirmed = window.confirm(
            `Register for ${tournament.name}?\n\nBuy-in: ${tournament.buyIn} chips\nYour balance: ${userData.balance} chips\n\nTop 3 get prizes (50%/30%/20%)`
        );

        if (!confirmed) {
            setIsRegistering(false);
            return;
        }

        // Call registration API
        const response = await fetch(`${getApiUrl()}/api/tournaments/${tournament.id}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userData.id,
                username: userData.username
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Registration failed');
        }

        setHasRegistered(true);
        alert(`Successfully registered for ${tournament.name}!\n\nYou can now wait for the tournament to start.`);

        // Optionally navigate to tournament room
        // onJoin(tournament.id);
    } catch (error: any) {
        console.error('Registration error:', error);
        alert(`Registration failed: ${error.message}`);
    } finally {
        setIsRegistering(false);
    }
  };

  const startDate = new Date(tournament.startTime);
  const dateStr = startDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const timeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Card hoverEffect className="group cursor-pointer border-sol-purple/20 h-full flex flex-col">
       {/* Header: Name, Speed, Status badge */}
       <div className="flex justify-between items-start mb-3">
          <div className="flex-1 mr-2">
             <h3 className="text-lg font-bold text-white group-hover:text-sol-purple transition-colors line-clamp-1 flex items-center gap-2">
                 {tournament.name}
                 {tournament.isPrivate && <Lock size={14} className="text-yellow-500"/>}
             </h3>
             <div className="flex items-center gap-2 mt-1">
                <Badge type={tournament.speed} />
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider bg-white/5 px-1.5 py-0.5 rounded">
                   {tournament.distribution || 'Standard'}
                </span>
             </div>
          </div>
          <div className="text-right whitespace-nowrap">
             <div className="text-xl font-bold text-sol-green">${tournament.prizePool.toLocaleString()}</div>
             <div className="text-[10px] text-gray-500 uppercase tracking-wide">Guaranteed</div>
          </div>
       </div>

       {/* Detailed Info Grid */}
       <div className="grid grid-cols-2 gap-2 mb-4 bg-white/5 p-3 rounded-lg border border-white/5 text-sm">
          <div className="flex flex-col">
             <span className="text-[10px] text-gray-500 flex items-center gap-1 mb-0.5"><Calendar size={12}/> Start Date</span>
             <span className="text-sm font-mono text-white">{dateStr} <span className="text-gray-500">at</span> {timeStr}</span>
          </div>
          <div className="flex flex-col">
             <span className="text-[10px] text-gray-500 flex items-center gap-1 mb-0.5"><Users size={12}/> Players</span>
             <span className="text-sm font-mono text-white">{hasRegistered ? tournament.registeredPlayers + 1 : tournament.registeredPlayers}/{tournament.maxPlayers}</span>
          </div>
          <div className="flex flex-col">
             <span className="text-[10px] text-gray-500 flex items-center gap-1 mb-0.5"><Trophy size={12}/> Paid Places</span>
             <span className="text-sm font-mono text-white">{tournament.winnersCount || 'Top 15%'}</span>
          </div>
           <div className="flex flex-col">
             <span className="text-[10px] text-gray-500 flex items-center gap-1 mb-0.5"><Layers size={12}/> Start Stack</span>
             <span className="text-sm font-mono text-white">{tournament.startingChips?.toLocaleString() || '10,000'}</span>
          </div>
       </div>

       {/* Footer: Buy-in & Action */}
       <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/10">
           <div>
               <span className="text-xs text-gray-500 block mb-0.5">Buy-in</span>
               <span className="text-lg font-bold text-sol-purple font-mono">${tournament.buyIn}</span>
           </div>
           
           <Button 
             size="sm"
             variant={hasRegistered ? 'secondary' : 'secondary'} 
             className={`min-w-[120px] ${hasRegistered ? 'bg-sol-purple/20 text-sol-purple border border-sol-purple/50' : ''}`}
             onClick={handleRegister}
             disabled={hasRegistered || isRegistering}
           >
              {isRegistering ? 'Processing...' : hasRegistered ? (
                 <span className="flex items-center gap-2"><Check size={14}/> Registered</span>
              ) : tournament.isPrivate ? 'Join Private' : 'Register Now'}
           </Button>
       </div>
    </Card>
  );
};
