
import React, { useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { MOCK_USER, getVipStatus } from '../constants';
import { TrendingUp, TrendingDown, Target, Clock, PieChart as PieChartIcon, Activity, Zap, Crown, Layers, Star } from 'lucide-react';

// --- Mock Data Definitions ---

const DATA_1W = [
  { name: 'Mon', pnl: 400 },
  { name: 'Tue', pnl: 300 },
  { name: 'Wed', pnl: -200 },
  { name: 'Thu', pnl: 800 },
  { name: 'Fri', pnl: 1200 },
  { name: 'Sat', pnl: 900 },
  { name: 'Sun', pnl: 2400 },
];

const DATA_1M = [
  { name: 'Week 1', pnl: 1500 },
  { name: 'Week 2', pnl: -500 },
  { name: 'Week 3', pnl: 2200 },
  { name: 'Week 4', pnl: 3400 },
];

const DATA_3M = [
  { name: 'Jan', pnl: 4500 },
  { name: 'Feb', pnl: 3200 },
  { name: 'Mar', pnl: 6800 },
];

const DATA_YTD = [
  { name: 'Jan', pnl: 4500 },
  { name: 'Feb', pnl: 3200 },
  { name: 'Mar', pnl: 6800 },
  { name: 'Apr', pnl: 5100 },
  { name: 'May', pnl: -1200 },
  { name: 'Jun', pnl: 8400 },
];

const DATA_ALL = [
  { name: '2021', pnl: 12000 },
  { name: '2022', pnl: -4000 },
  { name: '2023', pnl: 25000 },
  { name: '2024', pnl: 18500 },
];

const STATS_BY_TIMEFRAME: any = {
  '1W': {
    winnings: 4800,
    winRate: 8.5,
    hands: 1240,
    tournamentsWon: 1,
    tournamentsPlayed: 5,
    trendWinnings: '+12.5%',
    trendWinRate: '+1.2',
    trendHands: '+150',
    trendTourney: '20% ITM',
    handsDistribution: { royal: 0, straightFlush: 0, quads: 2, fullHouse: 14 }
  },
  '1M': {
    winnings: 6600,
    winRate: 6.2,
    hands: 5400,
    tournamentsWon: 3,
    tournamentsPlayed: 18,
    trendWinnings: '-5.2%',
    trendWinRate: '-0.5',
    trendHands: '+800',
    trendTourney: '16% ITM',
    handsDistribution: { royal: 0, straightFlush: 1, quads: 8, fullHouse: 45 }
  },
  '3M': {
    winnings: 14500,
    winRate: 5.8,
    hands: 12500,
    tournamentsWon: 5,
    tournamentsPlayed: 42,
    trendWinnings: '+24.0%',
    trendWinRate: '+0.1',
    trendHands: '+2200',
    trendTourney: '12% ITM',
    handsDistribution: { royal: 1, straightFlush: 2, quads: 15, fullHouse: 112 }
  },
  'YTD': {
    winnings: 26800,
    winRate: 5.4,
    hands: 28900,
    tournamentsWon: 8,
    tournamentsPlayed: 85,
    trendWinnings: '+140%',
    trendWinRate: '-0.2',
    trendHands: '+15000',
    trendTourney: '9% ITM',
    handsDistribution: { royal: 1, straightFlush: 3, quads: 28, fullHouse: 245 }
  },
  'ALL': {
    winnings: 51500,
    winRate: 4.9,
    hands: 64200,
    tournamentsWon: 14,
    tournamentsPlayed: 210,
    trendWinnings: 'N/A',
    trendWinRate: 'N/A',
    trendHands: 'N/A',
    trendTourney: '7% ITM',
    handsDistribution: { royal: 2, straightFlush: 5, quads: 54, fullHouse: 580 }
  }
};

const PIE_DATA = [
  { name: 'Cash Games', value: 65 },
  { name: 'Tournaments', value: 35 },
];

const POSITION_DATA = [
  { name: 'SB', winRate: -12 },
  { name: 'BB', winRate: -25 },
  { name: 'UTG', winRate: 8 },
  { name: 'MP', winRate: 12 },
  { name: 'CO', winRate: 22 },
  { name: 'BTN', winRate: 35 },
];

const COLORS = ['#00FFAE', '#8A42FF', '#1D8BFF', '#FF8042'];

export const Dashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState('1W');
  const [isReportOpen, setIsReportOpen] = useState(false);

  const getChartData = () => {
    switch (timeRange) {
      case '1M': return DATA_1M;
      case '3M': return DATA_3M;
      case 'YTD': return DATA_YTD;
      case 'ALL': return DATA_ALL;
      default: return DATA_1W;
    }
  };

  const currentStats = STATS_BY_TIMEFRAME[timeRange];
  const vipStatus = getVipStatus(MOCK_USER.totalHands || 0);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Performance Dashboard</h1>
          <p className="text-gray-400">Welcome back, {MOCK_USER.username}. Here is your session analysis.</p>
        </div>
        <div className="bg-white/5 rounded-lg p-1 flex gap-2">
            {['1W', '1M', '3M', 'YTD', 'ALL'].map(tf => (
                <button 
                  key={tf} 
                  onClick={() => setTimeRange(tf)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    timeRange === tf 
                      ? 'bg-sol-blue text-white shadow-lg' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                    {tf}
                </button>
            ))}
        </div>
      </div>

      {/* KPI Cards including NEW VIP Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard 
          title="Total Winnings" 
          value={`$${currentStats.winnings.toLocaleString()}`} 
          trend={currentStats.trendWinnings} 
          positive={!currentStats.trendWinnings.includes('-')} 
          icon={<TrendingUp size={20} className="text-sol-green"/>}
        />
        <StatCard 
          title="Win Rate (BB/100)" 
          value={`${currentStats.winRate}`} 
          trend={currentStats.trendWinRate} 
          positive={!currentStats.trendWinRate.includes('-')} 
          icon={<Target size={20} className="text-sol-purple"/>}
        />
        <StatCard 
          title="Hands Played" 
          value={currentStats.hands.toLocaleString()} 
          trend={currentStats.trendHands} 
          positive 
          icon={<Clock size={20} className="text-sol-blue"/>}
        />
        <StatCard 
          title="Tournaments Won" 
          value={currentStats.tournamentsWon.toString()} 
          subValue={`/${currentStats.tournamentsPlayed}`}
          trend={currentStats.trendTourney} 
          positive 
          icon={<AwardIcon />}
        />
        
        {/* NEW VIP PROGRESS CARD */}
        <Card className="relative overflow-hidden border-yellow-500/20 bg-gradient-to-br from-sol-dark to-yellow-500/5">
             <div className="flex justify-between items-center mb-1">
                 <span className="text-gray-400 text-sm font-medium flex items-center gap-1">
                     <Crown size={14} className="text-yellow-500"/> Rank
                 </span>
                 <span className={`${vipStatus.color} font-bold text-sm`}>{vipStatus.name}</span>
             </div>
             
             {vipStatus.nextLevel ? (
                <>
                    <div className="flex items-end gap-1 mb-2">
                         <span className="text-2xl font-bold text-white">{vipStatus.progress}%</span>
                         <span className="text-[10px] text-gray-500 mb-1">to {vipStatus.nextLevel.name}</span>
                    </div>
                    <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-yellow-500 h-full transition-all duration-1000" style={{width: `${vipStatus.progress}%`}} />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2 text-right">{vipStatus.handsToNext.toLocaleString()} hands left</p>
                </>
             ) : (
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-xl font-bold text-yellow-500">MAX RANK</span>
                </div>
             )}
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 h-[400px]">
          <h3 className="text-lg font-bold text-white mb-6">Profit & Loss History ({timeRange})</h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={getChartData()}>
              <defs>
                <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FFAE" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00FFAE" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" stroke="#6b7280" tick={{fill: '#6b7280'}} axisLine={false} tickLine={false} />
              <YAxis stroke="#6b7280" tick={{fill: '#6b7280'}} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#13131F', borderColor: '#ffffff20', borderRadius: '8px', color: '#fff' }}
                itemStyle={{ color: '#00FFAE' }}
              />
              <Area type="monotone" dataKey="pnl" stroke="#00FFAE" strokeWidth={3} fillOpacity={1} fill="url(#colorPnl)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
            <h3 className="text-lg font-bold text-white mb-6">Hand Analysis (AI)</h3>
            <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">Best Hand ({timeRange})</span>
                        <span className="text-sol-purple font-bold">
                            {currentStats.handsDistribution.royal > 0 ? 'Royal Flush' : 
                             currentStats.handsDistribution.straightFlush > 0 ? 'Straight Flush' : 
                             currentStats.handsDistribution.quads > 0 ? 'Four of a Kind' : 'Full House'}
                        </span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-sol-purple w-[99%]"></div>
                    </div>
                </div>
                <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">VPIP</span>
                        <span className="text-sol-blue font-bold">24%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-sol-blue w-[24%]"></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Optimal range. You are playing tight-aggressive.</p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">PFR</span>
                        <span className="text-sol-green font-bold">18%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-sol-green w-[18%]"></div>
                    </div>
                </div>
            </div>
            <Button variant="outline" fullWidth className="mt-6" onClick={() => setIsReportOpen(true)}>
              View Detailed Report
            </Button>
        </Card>
      </div>

      {/* Detailed Report Modal */}
      <Modal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} title="Detailed Game Analysis" size="4xl">
        <div className="space-y-8">
            
            {/* Rare Hand Frequency Section */}
            <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                    <Crown size={18} className="text-yellow-500"/>
                    <h3 className="font-bold text-white">Rare Hand Frequency ({timeRange})</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <HandStatBox 
                        name="Royal Flush" 
                        count={currentStats.handsDistribution.royal} 
                        color="text-yellow-500" 
                        bgColor="bg-yellow-500/10" 
                        borderColor="border-yellow-500/30"
                    />
                    <HandStatBox 
                        name="Straight Flush" 
                        count={currentStats.handsDistribution.straightFlush} 
                        color="text-sol-purple" 
                        bgColor="bg-sol-purple/10" 
                        borderColor="border-sol-purple/30"
                    />
                    <HandStatBox 
                        name="Four of a Kind" 
                        count={currentStats.handsDistribution.quads} 
                        color="text-sol-blue" 
                        bgColor="bg-sol-blue/10" 
                        borderColor="border-sol-blue/30"
                    />
                    <HandStatBox 
                        name="Full House" 
                        count={currentStats.handsDistribution.fullHouse} 
                        color="text-sol-green" 
                        bgColor="bg-sol-green/10" 
                        borderColor="border-sol-green/30"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Game Mix Pie Chart */}
                <div className="bg-white/5 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-4">
                        <PieChartIcon size={18} className="text-sol-purple"/>
                        <h3 className="font-bold text-white">Game Mix</h3>
                    </div>
                    <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                            <Pie
                                data={PIE_DATA}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {PIE_DATA.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#13131F', borderColor: '#ffffff20', borderRadius: '8px' }} />
                            <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Win Rate by Position Bar Chart */}
                <div className="bg-white/5 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity size={18} className="text-sol-green"/>
                        <h3 className="font-bold text-white">Win Rate by Position</h3>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={POSITION_DATA}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis dataKey="name" stroke="#6b7280" tick={{fill: '#6b7280'}} axisLine={false} tickLine={false}/>
                            <YAxis stroke="#6b7280" tick={{fill: '#6b7280'}} axisLine={false} tickLine={false}/>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#13131F', borderColor: '#ffffff20', borderRadius: '8px', color: '#fff' }}
                                cursor={{fill: '#ffffff10'}}
                            />
                            <Bar dataKey="winRate" fill="#00FFAE" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Additional Text Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-sol-dark border border-white/10 p-4 rounded-lg">
                    <p className="text-gray-400 text-xs uppercase mb-1">VPIP</p>
                    <p className="text-2xl font-bold text-white">24%</p>
                    <p className="text-xs text-sol-blue mt-1">Optimal Range</p>
                </div>
                <div className="bg-sol-dark border border-white/10 p-4 rounded-lg">
                    <p className="text-gray-400 text-xs uppercase mb-1">Pre-flop Raise</p>
                    <p className="text-2xl font-bold text-white">18.4%</p>
                    <p className="text-xs text-green-500 mt-1">Top 5% of players</p>
                </div>
                <div className="bg-sol-dark border border-white/10 p-4 rounded-lg">
                    <p className="text-gray-400 text-xs uppercase mb-1">3-Bet Frequency</p>
                    <p className="text-2xl font-bold text-white">7.2%</p>
                    <p className="text-xs text-gray-500 mt-1">Average</p>
                </div>
                <div className="bg-sol-dark border border-white/10 p-4 rounded-lg">
                    <p className="text-gray-400 text-xs uppercase mb-1">Fold to C-Bet</p>
                    <p className="text-2xl font-bold text-white">42%</p>
                    <p className="text-xs text-red-500 mt-1">Slightly Overfolding</p>
                </div>
            </div>
            
            <div className="flex justify-end">
                <Button variant="secondary" onClick={() => setIsReportOpen(false)}>Close Report</Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

const HandStatBox = ({ name, count, color, bgColor, borderColor }: any) => (
    <div className={`flex flex-col items-center justify-center p-4 rounded-lg border ${bgColor} ${borderColor} transition-transform hover:scale-105`}>
        <span className={`text-3xl font-bold ${color} mb-1`}>{count}</span>
        <span className="text-xs text-gray-400 uppercase tracking-wide text-center">{name}</span>
    </div>
);

const StatCard = ({ title, value, subValue, trend, positive, icon }: any) => (
  <Card>
    <div className="flex justify-between items-start mb-2">
      <span className="text-gray-400 text-sm font-medium">{title}</span>
      <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-bold text-white">{value}</span>
      {subValue && <span className="text-sm text-gray-500">{subValue}</span>}
    </div>
    <div className={`flex items-center mt-2 text-xs font-medium ${positive ? 'text-sol-green' : 'text-red-500'}`}>
      {positive ? <TrendingUp size={14} className="mr-1"/> : <TrendingDown size={14} className="mr-1"/>}
      {trend} vs last period
    </div>
  </Card>
);

const AwardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
)
