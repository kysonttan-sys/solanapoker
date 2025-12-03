
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Crown, Sparkles, TrendingUp } from 'lucide-react';

export const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'players' | 'referrals'>('players'); // Issue #12
  const [timeframe, setTimeframe] = useState<'all' | '30d' | '7d' | '24h'>('all'); // Issue #13

  useEffect(() => {
    const fetchLeaderboard = async () => {
        try {
            const res = await fetch(`http://localhost:4000/api/leaderboard?type=${filterType}&timeframe=${timeframe}`);
            const json = await res.json();
            // Map API response to UI format
            const formatted = json.map((u: any, i: number) => ({
                id: u.id,
                rank: i + 1,
                player: u.username,
                winnings: u.totalWinnings,
                hands: u.totalHands,
                avatar: u.avatarUrl,
                referrals: u.referralCount || 0 // Issue #12: Add referral data
            }));
            setData(formatted);
        } catch (e) {
            console.error("Failed to load leaderboard");
        } finally {
            setIsLoading(false);
        }
    };
    fetchLeaderboard();
  }, [filterType, timeframe]);

  const topEarner = data[0];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sol-purple via-white to-sol-green">
            Global Leaderboard
            </h1>
            <p className="text-gray-400">Live Rankings from Protocol Data.</p>
        </div>
        {/* Issue #12 & #13: Filter tabs and timeline */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2 bg-white/5 p-1 rounded-lg">
            <button
              onClick={() => setFilterType('players')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                filterType === 'players' ? 'bg-sol-green text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              Top Players
            </button>
            <button
              onClick={() => setFilterType('referrals')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                filterType === 'referrals' ? 'bg-sol-purple text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              Top Referrers
            </button>
          </div>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-sol-green focus:outline-none"
          >
            <option value="all">All Time</option>
            <option value="30d">Last 30 Days</option>
            <option value="7d">Last 7 Days</option>
            <option value="24h">Last 24 Hours</option>
          </select>
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
