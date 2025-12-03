
import React from 'react';
import { Modal } from './ui/Modal';
import { TOURNAMENT_STRUCTURE } from '../utils/pokerGameLogic';
import { Trophy, Clock, Layers, Calendar } from 'lucide-react';

interface TournamentInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentDetails?: {
      level: number;
      prizePool: number;
      payouts: number[];
      nextBlinds?: string;
  };
  startTime?: string;
}

export const TournamentInfoModal: React.FC<TournamentInfoModalProps> = ({ isOpen, onClose, tournamentDetails, startTime }) => {
  if (!tournamentDetails) return null;

  const dateObj = startTime ? new Date(startTime) : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tournament Information" size="lg">
       <div className="space-y-6">
           {/* Top Stats Bar */}
           <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                <div>
                    <h3 className="text-gray-400 text-xs font-bold uppercase mb-1">Total Prize Pool</h3>
                    <div className="text-2xl font-bold text-sol-green">${tournamentDetails.prizePool.toLocaleString()}</div>
                </div>
                <div className="text-right">
                    <h3 className="text-gray-400 text-xs font-bold uppercase mb-1">Current Level</h3>
                    <div className="text-2xl font-bold text-white">Level {tournamentDetails.level}</div>
                </div>
           </div>

           {/* Start Time Section (If available) */}
           {dateObj && (
               <div className="flex items-center gap-4 bg-sol-purple/10 p-3 rounded-lg border border-sol-purple/20">
                   <div className="bg-sol-purple/20 p-2 rounded-full">
                       <Calendar size={20} className="text-sol-purple" />
                   </div>
                   <div>
                       <h3 className="text-sol-purple font-bold text-sm">Start Date & Time</h3>
                       <p className="text-white text-base">
                           {dateObj.toLocaleDateString([], { weekday: 'short', month: 'long', day: 'numeric' })} 
                           <span className="text-gray-400 mx-2">at</span> 
                           {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </p>
                   </div>
               </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Payout Structure */}
                <div className="space-y-3">
                    <h3 className="flex items-center gap-2 font-bold text-white"><Trophy size={16} className="text-yellow-500"/> Payouts</h3>
                    <div className="bg-sol-dark border border-white/10 rounded-lg overflow-hidden">
                        {tournamentDetails.payouts.map((amount, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-gray-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-gray-700 text-white'}`}>
                                        {idx + 1}
                                    </div>
                                    <span className="text-sm text-gray-300">Place</span>
                                </div>
                                <span className="font-mono font-bold text-white">${amount.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Blind Structure */}
                <div className="space-y-3">
                    <h3 className="flex items-center gap-2 font-bold text-white"><Layers size={16} className="text-sol-blue"/> Blind Structure</h3>
                    <div className="bg-sol-dark border border-white/10 rounded-lg overflow-hidden max-h-[250px] overflow-y-auto">
                         <div className="grid grid-cols-3 p-2 bg-white/5 text-xs font-bold text-gray-400 sticky top-0">
                             <span>Level</span>
                             <span>Blinds</span>
                             <span>Ante</span>
                         </div>
                         {TOURNAMENT_STRUCTURE.map((level) => (
                             <div key={level.level} className={`grid grid-cols-3 p-2 border-b border-white/5 text-sm ${level.level === tournamentDetails.level ? 'bg-sol-green/10 text-sol-green' : 'text-gray-400'}`}>
                                 <span>{level.level}</span>
                                 <span>{level.sb}/{level.bb}</span>
                                 <span>{level.ante}</span>
                             </div>
                         ))}
                    </div>
                </div>
           </div>
       </div>
    </Modal>
  );
};
