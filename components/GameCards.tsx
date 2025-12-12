
import React, { useState } from 'react';
import { Users, Lock } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { PokerTable, Speed, GameType } from '../types';

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
