
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Crown, Sparkles, TrendingUp } from 'lucide-react';

export const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/leaderboard');
            const json = await res.json();
            // Map API response to UI format
            const formatted = json.map((u: any, i: number) => ({
                id: u.id,
                rank: i + 1,
                player: u.username,
                winnings: u.totalWinnings,
                hands: u.totalHands,
                avatar: u.avatarUrl
            }));
            setData(formatted);
        } catch (e) {
            console.error("Failed to load leaderboard");
        } finally {
            setIsLoading(false);
        }
    };
    fetchLeaderboard();
  }, []);

  const topEarner = data[0];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end gap-6">
        <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sol-purple via-white to-sol-green">
            Global Leaderboard
            </h1>
            <p className="text-gray-400">Live Rankings from Protocol Data.</p>
        </div>
      </div>

      {!isLoading && topEarner && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-900/40 via-yellow-600/10 to-sol-dark border border-yellow-500/30 p-6 md:p-8 flex items-center justify-between cursor-pointer" onClick={() => navigate(`/profile/${topEarner.id}`)}>
              <div className="flex items-center gap-6 relative z-10">
                  <div className="relative">
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-yellow-500 overflow-hidden">
                           <img src={topEarner.avatar} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce text-yellow-500">
                           <Crown size={32} fill="currentColor" />
                      </div>
                  </div>
                  <div>
                      <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs uppercase tracking-widest flex items-center gap-1 text-yellow-500">
                              <Sparkles size={12}/> #1 Champion
                          </span>
                      </div>
                      <h2 className="text-2xl md:text-4xl font-black text-white">{topEarner.player}</h2>
                      <p className="text-gray-400 text-sm font-mono">${topEarner.winnings.toLocaleString()} Won</p>
                  </div>
              </div>
          </div>
      )}

      <Card className="overflow-hidden p-0 min-h-[400px] border-white/5 bg-sol-dark/60">
        {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-gray-500 gap-3">
                <div className="w-8 h-8 border-2 border-sol-green border-t-transparent rounded-full animate-spin" />
            </div>
        ) : (
            <table className="w-full">
                <thead>
                <tr className="bg-white/5 text-left border-b border-white/5">
                    <th className="p-4 pl-6 text-gray-400 font-medium text-xs uppercase">Rank</th>
                    <th className="p-4 text-gray-400 font-medium text-xs uppercase">Player</th>
                    <th className="p-4 text-gray-400 font-medium text-xs uppercase text-right">Winnings</th>
                    <th className="p-4 text-gray-400 font-medium text-xs uppercase text-right">Hands</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                {data.map((entry) => (
                    <tr key={entry.id} onClick={() => navigate(`/profile/${entry.id}`)} className="hover:bg-white/5 transition-colors cursor-pointer">
                        <td className="p-4 pl-6 font-mono text-gray-500">#{entry.rank}</td>
                        <td className="p-4 font-bold text-white">{entry.player}</td>
                        <td className="p-4 text-right font-mono text-sol-green">${entry.winnings.toLocaleString()}</td>
                        <td className="p-4 text-right text-gray-400">{entry.hands}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        )}
      </Card>
    </div>
  );
};
