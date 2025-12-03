
import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { TableCard, TournamentCard } from '../components/GameCards';
import { GameType, Speed, PokerTable, Tournament } from '../types';

interface LobbyProps {
  onCreateGame: (type: GameType) => void;
  onJoinGame: (id: string) => void;
  tables: PokerTable[];
  tournaments: Tournament[];
}

export const Lobby: React.FC<LobbyProps> = ({ onCreateGame, onJoinGame, tables, tournaments }) => {
  const [activeTab, setActiveTab] = useState<'cash' | 'tournament' | 'fun'>('cash');
  const [searchQuery, setSearchQuery] = useState('');
  const [speedFilter, setSpeedFilter] = useState<Speed | 'ALL'>('ALL');

  // Logic: 
  // 1. Hide Full Rooms (occupiedSeats < seats or registeredPlayers < maxPlayers)
  // 2. Sort by Player Count Descending

  const filteredTables = tables
    .filter(t => 
      (!t.type || t.type === GameType.CASH) &&
      t.occupiedSeats < t.seats && // Hide if full
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
      (speedFilter === 'ALL' || t.speed === speedFilter)
    )
    .sort((a, b) => b.occupiedSeats - a.occupiedSeats); // Sort most players

  const filteredFunTables = tables
    .filter(t => 
      (t.type === GameType.FUN) &&
      t.occupiedSeats < t.seats && // Hide if full
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
      (speedFilter === 'ALL' || t.speed === speedFilter)
    )
    .sort((a, b) => b.occupiedSeats - a.occupiedSeats); // Sort most players

  const filteredTournaments = tournaments
    .filter(t => 
      t.status === 'REGISTERING' && // Only show open
      t.registeredPlayers < t.maxPlayers && // Hide if full
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
      (speedFilter === 'ALL' || t.speed === speedFilter)
    )
    .sort((a, b) => b.registeredPlayers - a.registeredPlayers); // Sort most players

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="items-start">
           <h1 className="text-3xl font-bold text-white mb-2">Game Lobby</h1>
           <p className="text-gray-400">Find the perfect table or tournament.</p>
        </div>
        
        <div className="flex gap-3 bg-white/5 p-1 rounded-lg w-full md:w-auto flex-1 md:flex-none overflow-x-auto">
             <button
                onClick={() => setActiveTab('cash')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all text-center whitespace-nowrap ${
                  activeTab === 'cash' ? 'bg-sol-green text-sol-black shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
             >
                Cash Games
             </button>
             <button
                onClick={() => setActiveTab('tournament')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all text-center whitespace-nowrap ${
                  activeTab === 'tournament' ? 'bg-sol-purple text-white shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
             >
                Tournaments
             </button>
             <button
                onClick={() => setActiveTab('fun')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all text-center whitespace-nowrap ${
                  activeTab === 'fun' ? 'bg-yellow-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
             >
                Just for Fun
             </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-sol-dark/50 p-4 rounded-xl border border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center">
         <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
            <input 
                type="text" 
                placeholder="Search tables..." 
                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:border-sol-green focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
         </div>
         
         <div className="flex gap-4 w-full md:w-auto">
             <select 
                className="flex-1 md:flex-none bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-sol-green focus:outline-none appearance-none"
                value={speedFilter}
                onChange={(e) => setSpeedFilter(e.target.value as Speed | 'ALL')}
             >
                <option value="ALL">All Speeds</option>
                <option value={Speed.REGULAR}>Regular</option>
                <option value={Speed.TURBO}>Turbo</option>
                <option value={Speed.HYPER}>Hyper</option>
             </select>
             
             <Button 
                variant="outline" 
                className="flex-1 md:flex-none gap-2 whitespace-nowrap" 
                onClick={() => onCreateGame(activeTab === 'tournament' ? GameType.TOURNAMENT : activeTab === 'fun' ? GameType.FUN : GameType.CASH)}
             >
                <Plus size={18} /> Create New
             </Button>
         </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTab === 'cash' ? (
             filteredTables.length > 0 ? (
                filteredTables.map(table => <TableCard key={table.id} table={table} onJoin={onJoinGame} />)
             ) : (
                <div className="col-span-full text-center py-12 text-gray-500 bg-white/5 rounded-xl border border-white/5 border-dashed">
                    <p>No cash tables found matching your filters.</p>
                    <Button variant="ghost" className="mt-2 text-sol-green" onClick={() => onCreateGame(GameType.CASH)}>Create one?</Button>
                </div>
             )
          ) : activeTab === 'fun' ? (
             filteredFunTables.length > 0 ? (
                filteredFunTables.map(table => <TableCard key={table.id} table={table} onJoin={onJoinGame} />)
             ) : (
                <div className="col-span-full text-center py-12 text-gray-500 bg-white/5 rounded-xl border border-white/5 border-dashed">
                    <p>No fun tables found. Start a friendly match!</p>
                    <Button variant="ghost" className="mt-2 text-yellow-500" onClick={() => onCreateGame(GameType.FUN)}>Create Fun Table</Button>
                </div>
             )
          ) : (
             filteredTournaments.length > 0 ? (
                filteredTournaments.map(tour => <TournamentCard key={tour.id} tournament={tour} onJoin={onJoinGame} />)
             ) : (
                <div className="col-span-full text-center py-12 text-gray-500 bg-white/5 rounded-xl border border-white/5 border-dashed">
                    <p>No tournaments found matching your filters.</p>
                    <Button variant="ghost" className="mt-2 text-sol-purple" onClick={() => onCreateGame(GameType.TOURNAMENT)}>Create one?</Button>
                </div>
             )
          )}
      </div>
    </div>
  );
};
