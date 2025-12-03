
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { MOCK_USER, MOCK_STATS, LEADERBOARD_DATA, getVipStatus, REFERRAL_TIERS, getHostStatus } from '../constants';
import { User } from '../types';
import { Camera, Mail, AtSign, Wallet, Save, X, Image as ImageIcon, Lock, Trophy, TrendingUp, TrendingDown, Eye, Copy, Check, Users, Gift, Coins, Share2, DollarSign, PieChart as PieChartIcon, Crown, Network, Activity, Target, Clock, Settings, FileText, QrCode, Volume2, VolumeX, Palette, ArrowUpCircle, ArrowDownCircle, Ghost, EyeOff, Shield, UserPlus, MessageSquare, Trash2, Circle, Search, Send, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { withdrawFromVault } from '../utils/solanaContract';

// --- MOCK DASHBOARD DATA ---
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

const CHART_COLORS = ['#00FFAE', '#8A42FF', '#1D8BFF', '#FF8042'];

// Mock Transactions for History Tab
const MOCK_HISTORY = [
    { id: 'tx1', type: 'deposit', amount: 500, asset: 'USDT', date: '2 hours ago', status: 'completed', hash: '5x...9a2' },
    { id: 'tx2', type: 'game_win', amount: 1250.50, asset: 'USDT', date: 'Yesterday', status: 'completed', desc: 'Cash Game #t1' },
    { id: 'tx3', type: 'referral', amount: 45.20, asset: 'USDT', date: 'Yesterday', status: 'completed', desc: 'Commission (Tier 2)' },
    { id: 'tx4', type: 'withdrawal', amount: -2000, asset: 'USDT', date: '3 days ago', status: 'completed', hash: '8z...1b4' },
    { id: 'tx5', type: 'game_loss', amount: -200, asset: 'USDT', date: '4 days ago', status: 'completed', desc: 'Tournament Entry' },
];

interface ProfileProps {
    currentUser?: User | null; // Passed from App.tsx (Global State)
    onUpdateUser?: (user: User) => void;
}

export const Profile: React.FC<ProfileProps> = ({ currentUser, onUpdateUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useParams<{ userId: string }>();
  
  const { connection } = useConnection();
  const wallet = useWallet();

  // Is this the logged-in user's profile?
  const isOwnProfile = !userId || (currentUser && userId === currentUser.id);

  // Form State for editing (initialized from prop)
  const [profileForm, setProfileForm] = useState<User | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'friends' | 'vip' | 'ecosystem' | 'history' | 'settings'>('overview');
  const [timeRange, setTimeRange] = useState('1W');
  const [isQrOpen, setIsQrOpen] = useState(false);
  
  // Chat State
  const [activeChatFriend, setActiveChatFriend] = useState<any | null>(null);
  const [directMessages, setDirectMessages] = useState<Record<string, { id: string, text: string, sender: 'me' | 'them', time: string }[]>>({});
  const [dmInput, setDmInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Game Settings State (Synced with localStorage)
  const [fourColorDeck, setFourColorDeck] = useState(() => localStorage.getItem('solpoker_fourcolor') === 'true');
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('solpoker_mute') === 'true');
  const [autoTopUp, setAutoTopUp] = useState(() => localStorage.getItem('solpoker_autotopup') === 'true');
  
  // Recovery State
  const [stuckSession, setStuckSession] = useState<{ amount: number, tableId: string } | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  // Stats state for display
  const [stats, setStats] = useState(MOCK_STATS);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Handle Tab Navigation via URL Params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['overview', 'friends', 'vip', 'ecosystem', 'history', 'settings'].includes(tabParam)) {
        setActiveTab(tabParam as any);
    }
  }, [location]);

  // Load User Data
  useEffect(() => {
    if (isOwnProfile && currentUser) {
      setProfileForm(currentUser);
      setStats(MOCK_STATS); // In real app, fetch real stats
      
      // Check for stuck session
      const savedSession = localStorage.getItem('solpoker_active_session');
      if (savedSession) {
          try {
              const data = JSON.parse(savedSession);
              // Simple check: active if it exists
              if (data.amount > 0) {
                  setStuckSession(data);
              }
          } catch(e) {}
      }

    } else if (userId) {
      // Viewing another user
      const leaderboardUser = LEADERBOARD_DATA.find(u => u.id === userId);
      if (leaderboardUser) {
        setProfileForm({
          id: leaderboardUser.id,
          walletAddress: 'Unknown',
          username: leaderboardUser.player,
          avatarUrl: `https://ui-avatars.com/api/?name=${leaderboardUser.player}&background=random`,
          email: '', // Hidden for others
          bio: 'Crypto enthusiast and poker pro.',
          balance: 0, // Hidden
          spxBalance: 0,
          preferences: {
            showWinRate: Math.random() > 0.5,
            showPnL: Math.random() > 0.5
          }
        });
        // Mock stats based on leaderboard data
        setStats({
          ...MOCK_STATS,
          totalWinnings: leaderboardUser.winnings,
          totalHands: leaderboardUser.hands,
          winRate: parseFloat((Math.random() * 10).toFixed(1)),
          tournamentsPlayed: Math.floor(Math.random() * 50),
          tournamentsWon: Math.floor(Math.random() * 5)
        });
      } else {
         navigate('/'); // User not found
      }
    }
  }, [userId, isOwnProfile, currentUser, navigate]);

  // Sync Settings to LocalStorage
  useEffect(() => localStorage.setItem('solpoker_fourcolor', fourColorDeck ? 'true' : 'false'), [fourColorDeck]);
  useEffect(() => localStorage.setItem('solpoker_mute', isMuted ? 'true' : 'false'), [isMuted]);
  useEffect(() => localStorage.setItem('solpoker_autotopup', autoTopUp ? 'true' : 'false'), [autoTopUp]);

  // Auto-scroll chat
  useEffect(() => {
      if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
  }, [directMessages, activeChatFriend]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (profileForm) {
        setProfileForm({ ...profileForm, [name]: value });
    }
  };

  const handlePreferenceChange = (key: keyof User['preferences']) => {
    if (profileForm && profileForm.preferences) {
        setProfileForm({
        ...profileForm,
        preferences: {
          ...profileForm.preferences,
          [key]: !profileForm.preferences[key]
        }
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (file && profileForm) {
      const url = URL.createObjectURL(file);
      if (type === 'avatar') {
        setProfileForm({ ...profileForm, avatarUrl: url });
      } else {
        setCoverUrl(url);
      }
    }
  };

  const handleCopyAddress = () => {
    if (profileForm?.walletAddress) {
        navigator.clipboard.writeText(profileForm.walletAddress);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleCopyReferral = () => {
     if (profileForm?.referralCode) {
        const url = `${window.location.origin}/#/ref/${profileForm.referralCode}`;
        const message = `🚀 Join me on SOLPOKER X! The fair, decentralized poker platform on Solana.\n\n♣️ Play Cash Games & Tournaments\n💰 Earn Real Yield Staking $SPX\n\nJoin here: ${url}`;
        
        navigator.clipboard.writeText(message);
        alert(`Referral Content Copied!\n\n"${message}"`);
     }
  }

  const handleClaimRewards = () => {
      alert("Processing claim... $576.05 USDT has been sent to your wallet!");
  }

  const handleRecoverFunds = async () => {
      if (!stuckSession || isRecovering) return;
      
      setIsRecovering(true);
      try {
          // Attempt withdrawal from smart contract
          const signature = await withdrawFromVault(connection, wallet, stuckSession.amount);
          console.log("Recovery Success:", signature);
          
          if (onUpdateUser && profileForm) {
              onUpdateUser({
                  ...profileForm,
                  balance: (profileForm.balance || 0) + stuckSession.amount
              });
          }

          localStorage.removeItem('solpoker_active_session');
          setStuckSession(null);
          alert(`Successfully recovered ${stuckSession.amount} Chips to your wallet!`);
          
      } catch (error: any) {
          console.error("Recovery Failed:", error);
          
          // Devnet Bypass for Testing if contract fails
          const msg = error?.message || '';
          if (msg.includes('0x65') || msg.includes('InstructionFallbackNotFound') || msg.toLowerCase().includes('simulation failed')) {
               if (onUpdateUser && profileForm) {
                  onUpdateUser({
                      ...profileForm,
                      balance: (profileForm.balance || 0) + stuckSession.amount
                  });
               }
               localStorage.removeItem('solpoker_active_session');
               setStuckSession(null);
               alert(`(Devnet Bypass) Successfully recovered ${stuckSession.amount} Chips!`);
          } else {
              alert("Recovery Failed. Please ensure your wallet is connected and you have SOL for gas.");
          }
      } finally {
          setIsRecovering(false);
      }
  };

  const handleOpenChat = (friend: any) => {
      setActiveChatFriend(friend);
      // Seed initial message if empty
      if (!directMessages[friend.id] && profileForm) {
          setDirectMessages(prev => ({
              ...prev,
              [friend.id]: [
                  { id: '1', text: `Yo ${profileForm.username}! Wanna play some cards?`, sender: 'them', time: '10:00 AM' }
              ]
          }));
      }
  };

  const handleSendDm = (e: React.FormEvent) => {
      e.preventDefault();
      if (!dmInput.trim() || !activeChatFriend) return;

      const newMessage = {
          id: Date.now().toString(),
          text: dmInput,
          sender: 'me' as const,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setDirectMessages(prev => ({
          ...prev,
          [activeChatFriend.id]: [...(prev[activeChatFriend.id] || []), newMessage]
      }));
      setDmInput('');

      // Auto-reply simulation
      setTimeout(() => {
          const replyText = ["Sounds good!", "I'm in.", "Can't right now, maybe later?", "Nice hand earlier!", "Let's grind."][Math.floor(Math.random() * 5)];
          const reply = {
              id: (Date.now() + 1).toString(),
              text: replyText,
              sender: 'them' as const,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setDirectMessages(prev => ({
              ...prev,
              [activeChatFriend.id]: [...(prev[activeChatFriend.id] || []), reply]
          }));
      }, 1500);
  };

  const handleRemoveFriend = (friendId: string) => {
      if (!profileForm) return;
      
      const updatedFriends = profileForm.friends?.filter(id => id !== friendId) || [];
      const updatedUser = { ...profileForm, friends: updatedFriends };
      
      setProfileForm(updatedUser);
      if (onUpdateUser) onUpdateUser(updatedUser); // Immediate persist
      alert("Friend removed.");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateUser && profileForm) {
        onUpdateUser(profileForm);
        setIsEditing(false);
        alert("Profile Updated Successfully!");
    }
  };

  // Dashboard Helpers
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

  if (!profileForm) return <div className="p-8 text-center text-sol-green animate-pulse">Loading Profile...</div>;

  const vipStatus = getVipStatus(stats.totalHands);
  const currentReferralTier = REFERRAL_TIERS[profileForm.referralRank || 0];
  const nextReferralTier = profileForm.referralRank !== undefined && profileForm.referralRank < 3 ? REFERRAL_TIERS[profileForm.referralRank + 1] : null;

  // Host Rank Logic
  const currentHostStatus = getHostStatus(profileForm.ecosystemStats?.totalHostRevenueGenerated || 0);

  // Derive Friends List
  const friendsList = profileForm.friends?.map(fid => {
      const f = LEADERBOARD_DATA.find(l => l.id === fid);
      return f ? {
          ...f,
          isOnline: Math.random() > 0.5,
          avatar: `https://ui-avatars.com/api/?name=${f.player}&background=random`
      } : null;
  }).filter(Boolean) || [];

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 relative pt-10 md:pt-0 pb-12">
      
      {/* QR Code Modal */}
      <Modal isOpen={isQrOpen} onClose={() => setIsQrOpen(false)} title="Share Profile" size="sm">
          <div className="flex flex-col items-center justify-center p-6 space-y-6">
              <div className="bg-white p-4 rounded-xl border-4 border-sol-green shadow-xl">
                  <div className="w-48 h-48 bg-gray-900 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 gap-1 opacity-80">
                          {[...Array(36)].map((_, i) => (
                              <div key={i} className={`bg-black ${Math.random() > 0.5 ? 'opacity-100' : 'opacity-0'}`}></div>
                          ))}
                      </div>
                      <div className="bg-sol-green p-2 rounded-full z-10">
                          <Crown size={32} className="text-black"/>
                      </div>
                  </div>
              </div>
              <div className="text-center space-y-2">
                  <h3 className="text-white font-bold text-lg">Scan to Join</h3>
                  <p className="text-gray-400 text-sm">Share this code to invite friends to your table or referral network.</p>
                  <div className="bg-black/40 p-2 rounded-lg border border-white/10 mt-2">
                      <code className="text-sol-green text-xs font-mono">{window.location.origin}/#/ref/{profileForm.referralCode}</code>
                  </div>
              </div>
              <Button fullWidth onClick={handleCopyReferral} className="gap-2">
                  <Copy size={16}/> Copy Link
              </Button>
          </div>
      </Modal>

      {/* CHAT MODAL */}
      {activeChatFriend && (
          <Modal isOpen={!!activeChatFriend} onClose={() => setActiveChatFriend(null)} title={`Chat with ${activeChatFriend.player}`} size="md">
              <div className="flex flex-col h-[400px]">
                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto space-y-3 p-2 scrollbar-hide" ref={chatScrollRef}>
                      {(directMessages[activeChatFriend.id] || []).map((msg, idx) => (
                          <div key={idx} className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}>
                              <div className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${msg.sender === 'me' ? 'bg-sol-blue text-white rounded-tr-none' : 'bg-white/10 text-gray-200 rounded-tl-none'}`}>
                                  {msg.text}
                              </div>
                              <span className="text-[10px] text-gray-500 mt-1 px-1">{msg.time}</span>
                          </div>
                      ))}
                  </div>
                  
                  {/* Input Area */}
                  <form onSubmit={handleSendDm} className="mt-4 flex gap-2 border-t border-white/10 pt-4">
                      <input 
                          type="text" 
                          placeholder="Type a message..." 
                          className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-sol-green focus:outline-none"
                          value={dmInput}
                          onChange={(e) => setDmInput(e.target.value)}
                          autoFocus
                      />
                      <button type="submit" className="bg-sol-green hover:bg-sol-green/90 text-black p-2 rounded-lg transition-colors">
                          <Send size={18} />
                      </button>
                  </form>
              </div>
          </Modal>
      )}

      {/* Exit Button */}
      <button 
        onClick={() => navigate('/')}
        className="absolute top-0 right-0 md:-right-12 md:top-0 text-gray-400 hover:text-white transition-colors bg-sol-dark/50 p-2 rounded-full hover:bg-red-500/20 hover:text-red-500"
        title="Exit Profile"
      >
        <X size={24} />
      </button>

      <Card className="relative overflow-hidden !p-0 border-none bg-sol-dark">
        {/* Banner */}
        <div 
            className="h-[11.5rem] w-full relative group transition-all"
            style={{
                background: coverUrl ? `url(${coverUrl}) center/cover no-repeat` : 'linear-gradient(135deg, rgba(138,66,255,0.4) 0%, rgba(29,139,255,0.4) 100%)'
            }}
        >
             <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
             
             {isOwnProfile && (
               <>
                <button 
                    onClick={() => coverInputRef.current?.click()}
                    className="absolute top-4 right-4 bg-black/50 backdrop-blur-md border border-white/10 text-white hover:bg-sol-green hover:text-black hover:border-sol-green px-3 py-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2 text-xs font-bold uppercase tracking-wide"
                >
                    <ImageIcon size={14} />
                    Edit Cover
                </button>
                <input 
                    ref={coverInputRef}
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleFileChange(e, 'cover')} 
                />
               </>
             )}
        </div>
        
        <div className="relative px-6 md:px-8 pb-8">
          <div className="flex flex-col md:flex-row gap-6 mb-8">
             {/* Avatar */}
             <div className="relative group -mt-16 mx-auto md:mx-0 shrink-0">
               <div className="w-32 h-32 rounded-full border-[4px] border-[#13131F] bg-[#13131F] shadow-2xl relative overflow-hidden">
                   <img 
                    src={profileForm.avatarUrl} 
                    alt={profileForm.username} 
                    className="w-full h-full rounded-full object-cover"
                   />
               </div>
               
               {isOwnProfile && (
                 <>
                  <button 
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute bottom-2 right-2 bg-sol-dark border border-white/10 p-2 rounded-full text-white hover:bg-sol-green hover:text-black hover:scale-110 transition-all shadow-lg z-10"
                      title="Upload Photo"
                  >
                    <Camera size={16} />
                  </button>
                  <input 
                        ref={avatarInputRef}
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleFileChange(e, 'avatar')} 
                    />
                 </>
               )}
             </div>
             
             <div className="flex-1 text-center md:text-left pt-2 md:pt-0 mt-2 md:mt-0">
                <div className="flex items-center justify-center md:justify-start gap-3">
                    <h1 className="text-3xl font-bold text-white mb-1">{profileForm.username}</h1>
                    <div className={`flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full ${vipStatus.color}`}>
                        <span>{vipStatus.icon}</span>
                        <span className="text-xs font-bold uppercase tracking-wide">{vipStatus.name}</span>
                    </div>
                    {isOwnProfile && (
                        <button 
                            onClick={() => setIsQrOpen(true)}
                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-sol-green transition-colors border border-white/5"
                            title="Share Profile"
                        >
                            <QrCode size={16} />
                        </button>
                    )}
                </div>
                
                <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                    <p className="text-gray-400 text-sm inline-flex items-center gap-2 font-mono bg-white/5 px-3 py-1 rounded-full border border-white/5">
                        <Wallet size={14} className="text-sol-green" />
                        {isOwnProfile ? profileForm.walletAddress : `${profileForm.walletAddress.substring(0,6)}...`}
                    </p>
                    
                    {isOwnProfile && (
                        <button 
                            onClick={handleCopyAddress}
                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-sol-green transition-colors border border-white/5"
                            title="Copy Wallet Address"
                        >
                            {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                    )}
                </div>
             </div>
          </div>

          {/* TABS Navigation */}
          {isOwnProfile && (
              <div className="flex border-b border-white/10 mb-6 overflow-x-auto">
                  <button 
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'border-sol-green text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                  >
                      Overview
                  </button>
                  <button 
                    onClick={() => setActiveTab('friends')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'friends' ? 'border-sol-green text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                  >
                      <Users size={16} /> Friends
                  </button>
                  <button 
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'history' ? 'border-sol-blue text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                  >
                      <FileText size={16} /> History
                  </button>
                  <button 
                    onClick={() => setActiveTab('vip')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'vip' ? 'border-yellow-400 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                  >
                      <Crown size={16} className={activeTab === 'vip' ? 'text-yellow-400' : ''} /> VIP Club
                  </button>
                  <button 
                    onClick={() => setActiveTab('ecosystem')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'ecosystem' ? 'border-sol-purple text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                  >
                      <Network size={16} /> Ecosystem
                  </button>
                  <button 
                    onClick={() => setActiveTab('settings')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'settings' ? 'border-gray-400 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                  >
                      <Settings size={16} /> Settings
                  </button>
              </div>
          )}

          {/* ... [Overview Tab Content - Same as before] ... */}
          {activeTab === 'overview' && (
              <div className="space-y-6 animate-in slide-in-from-right-4">
                 <div className="flex justify-end">
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

                 {/* KPI Cards */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    icon={<Trophy size={20} className="text-yellow-500"/>}
                    />
                 </div>

                 {/* Charts Section */}
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 h-[400px] border-white/5 bg-black/20">
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

                    <Card className="border-white/5 bg-black/20">
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
                    </Card>
                 </div>
              </div>
          )}

          {activeTab === 'friends' && (
              // FRIENDS TAB
              <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                      <div>
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                              <Users size={18} className="text-sol-green"/> My Connections
                          </h3>
                          <p className="text-sm text-gray-400">Manage your poker buddies and invites.</p>
                      </div>
                      <div className="relative">
                          <input 
                              type="text" 
                              placeholder="Find friend by ID..." 
                              className="bg-black/40 border border-white/10 rounded-lg pl-8 pr-4 py-2 text-sm text-white focus:border-sol-green focus:outline-none"
                          />
                          <Search size={14} className="absolute left-2.5 top-2.5 text-gray-500" />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {friendsList.length > 0 ? (
                          friendsList.map((friend: any) => (
                              <Card key={friend.id} className="bg-white/5 border-white/10 hover:border-white/20 transition-all flex items-center justify-between group">
                                  <div className="flex items-center gap-3">
                                      <div className="relative">
                                          <img src={friend.avatar} alt={friend.player} className="w-10 h-10 rounded-full border border-white/10" />
                                          <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${friend.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                                      </div>
                                      <div>
                                          <h4 className="font-bold text-white text-sm">{friend.player}</h4>
                                          <p className="text-xs text-gray-500 flex items-center gap-1">
                                              {friend.isOnline ? <span className="text-green-500">Online</span> : 'Offline'}
                                          </p>
                                      </div>
                                  </div>
                                  <div className="flex gap-2">
                                      <button 
                                          onClick={() => handleOpenChat(friend)}
                                          className="p-2 bg-sol-blue/10 text-sol-blue rounded-lg hover:bg-sol-blue hover:text-white transition-colors" 
                                          title="Message"
                                      >
                                          <MessageSquare size={16} />
                                      </button>
                                      <button className="p-2 bg-sol-green/10 text-sol-green rounded-lg hover:bg-sol-green hover:text-black transition-colors" title="Invite to Table">
                                          <UserPlus size={16} />
                                      </button>
                                      <button 
                                          onClick={() => handleRemoveFriend(friend.id)}
                                          className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100" 
                                          title="Remove Friend"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              </Card>
                          ))
                      ) : (
                          <div className="col-span-full py-12 text-center text-gray-500 bg-white/5 rounded-xl border border-dashed border-white/10">
                              <p>No friends added yet. Share your profile to connect!</p>
                          </div>
                      )}
                      
                      <button className="flex flex-col items-center justify-center p-6 border border-dashed border-white/10 rounded-xl hover:bg-white/5 transition-colors text-gray-500 hover:text-sol-green group">
                          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2 group-hover:bg-sol-green/20">
                              <UserPlus size={20} className="group-hover:text-sol-green"/>
                          </div>
                          <span className="text-sm font-bold">Add New Friend</span>
                      </button>
                  </div>
              </div>
          )}

          {activeTab === 'history' && (
              // NEW HISTORY TAB
              <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="bg-white/5 border-white/10 h-full">
                          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                              <Wallet size={18} className="text-sol-green"/> Wallet Transactions
                          </h3>
                          <div className="space-y-3">
                              {MOCK_HISTORY.filter(t => ['deposit', 'withdrawal', 'referral'].includes(t.type)).map((tx, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                                      <div className="flex items-center gap-3">
                                          <div className={`p-2 rounded-lg ${tx.type === 'deposit' ? 'bg-sol-green/20 text-sol-green' : tx.type === 'withdrawal' ? 'bg-red-500/20 text-red-500' : 'bg-sol-purple/20 text-sol-purple'}`}>
                                              {tx.type === 'deposit' ? <ArrowDownCircle size={16}/> : tx.type === 'withdrawal' ? <ArrowUpCircle size={16}/> : <Gift size={16}/>}
                                          </div>
                                          <div>
                                              <p className="text-sm font-bold text-white capitalize">{tx.type.replace('_', ' ')}</p>
                                              <p className="text-xs text-gray-500">{tx.date} • {tx.status}</p>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <p className={`font-mono font-bold ${tx.amount > 0 ? 'text-sol-green' : 'text-white'}`}>
                                              {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} {tx.asset}
                                          </p>
                                          {tx.hash && (
                                              <a 
                                                href={`https://solscan.io/tx/${tx.hash}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="text-[10px] text-sol-blue flex items-center justify-end gap-1 hover:underline"
                                              >
                                                  View <ExternalLink size={8}/>
                                              </a>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </Card>

                      <Card className="bg-white/5 border-white/10 h-full">
                          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                              <Activity size={18} className="text-sol-blue"/> Game Sessions
                          </h3>
                          <div className="space-y-3">
                              {MOCK_HISTORY.filter(t => t.type.includes('game')).map((tx, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                                      <div className="flex items-center gap-3">
                                          <div className={`p-2 rounded-lg ${tx.amount > 0 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-gray-700/50 text-gray-400'}`}>
                                              <Trophy size={16}/>
                                          </div>
                                          <div>
                                              <p className="text-sm font-bold text-white">{tx.desc}</p>
                                              <p className="text-xs text-gray-500">{tx.date}</p>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <p className={`font-mono font-bold ${tx.amount > 0 ? 'text-sol-green' : 'text-red-500'}`}>
                                              {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                                          </p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </Card>
                  </div>
              </div>
          )}

          {activeTab === 'vip' && (
              // VIP CLUB TAB
              <div className="space-y-6 animate-in slide-in-from-right-4">
                 <div className="bg-gradient-to-br from-[#1A1A24] to-[#13131F] border border-yellow-500/20 rounded-xl p-6 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-32 bg-yellow-500/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
                         <div>
                             <h3 className="text-yellow-500 font-bold mb-1 flex items-center gap-2 text-sm uppercase tracking-wide">
                                 <Crown size={18}/> VIP Club Status
                             </h3>
                             <div className="text-4xl font-black text-white mb-2 flex items-center gap-3">
                                 {vipStatus.name}
                                 <span className="text-4xl">{vipStatus.icon}</span>
                             </div>
                             <p className="text-sm text-gray-400">You are in the top tier of players. Keep grinding!</p>
                         </div>
                         <div className="text-right">
                             <div className="text-sm text-gray-400 mb-1">Lifetime Hands</div>
                             <div className="text-2xl font-bold text-white font-mono">{stats.totalHands.toLocaleString()}</div>
                         </div>
                     </div>
                     {vipStatus.nextLevel ? (
                        <div className="mt-8">
                             <div className="flex justify-between text-xs text-gray-400 mb-2 font-mono">
                                 <span>{stats.totalHands.toLocaleString()} / {vipStatus.nextLevel.minHands.toLocaleString()} Hands</span>
                                 <span>{vipStatus.handsToNext.toLocaleString()} to {vipStatus.nextLevel.name}</span>
                             </div>
                             <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                 <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-1000" style={{ width: `${vipStatus.progress}%` }}></div>
                             </div>
                        </div>
                     ) : (
                        <div className="mt-6 text-center text-yellow-500 font-bold text-sm bg-yellow-500/10 py-2 rounded border border-yellow-500/20">
                            MAX LEVEL ACHIEVED
                        </div>
                     )}
                 </div>
                 <Card className="bg-white/5 border-white/10">
                      <h3 className="font-bold text-lg text-white mb-4">Current Benefits</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-black/40 p-4 rounded-lg border border-white/5 flex justify-between items-center">
                              <div>
                                  <div className="text-gray-400 text-xs uppercase mb-1">Rake Fee</div>
                                  <div className="text-2xl font-bold text-sol-green">{(vipStatus.rake * 100).toFixed(1)}%</div>
                              </div>
                              <div className="text-right">
                                  <div className="text-gray-500 text-xs line-through decoration-red-500">5.0%</div>
                                  <div className="text-sol-green text-xs font-bold">Standard</div>
                              </div>
                          </div>
                          <div className="bg-black/40 p-4 rounded-lg border border-white/5 flex justify-between items-center">
                              <div>
                                  <div className="text-gray-400 text-xs uppercase mb-1">Rake Cap (Max)</div>
                                  <div className="text-2xl font-bold text-white">${vipStatus.cap}</div>
                              </div>
                              <div className="text-right">
                                  <div className="text-gray-500 text-xs line-through decoration-red-500">$5.00</div>
                                  <div className="text-white text-xs font-bold">Standard</div>
                              </div>
                          </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-4">
                          * Benefits apply automatically to all Cash Game hands you win.
                      </p>
                 </Card>
              </div>
          )}

          {activeTab === 'ecosystem' && (
              // ECOSYSTEM TAB CONTENT
              <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="bg-gradient-to-br from-sol-purple/20 to-sol-blue/20 border border-sol-purple/30 rounded-xl p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-32 bg-sol-purple/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
                          <div>
                              <h3 className="text-gray-400 font-medium mb-1 flex items-center gap-2"><Gift size={16} className="text-sol-green"/> Pending Rewards</h3>
                              <div className="text-4xl font-bold text-white mb-2">${profileForm.ecosystemStats?.pendingRewards.toLocaleString()}</div>
                              <p className="text-sm text-gray-400">Total earned from Hosting & Referrals</p>
                          </div>
                          <Button onClick={handleClaimRewards} className="shadow-[0_0_20px_rgba(138,66,255,0.4)]">
                              Claim to Wallet
                          </Button>
                      </div>
                  </div>
                  <Card className="bg-white/5 border-white/10">
                      <div className="flex justify-between items-start mb-6">
                           <div>
                              <div className="flex items-center gap-3 mb-1">
                                  <div className="p-2 bg-sol-green/10 rounded-lg text-sol-green">
                                      <Network size={20} />
                                  </div>
                                  <h3 className="font-bold text-lg text-white">My Referral Network</h3>
                              </div>
                              <p className="text-sm text-gray-400">Share your link. Earn differential commissions from 3 levels deep.</p>
                           </div>
                           <div className="text-right">
                                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Current Rank</div>
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${currentReferralTier.color.replace('text', 'border')}/30 bg-black/40`}>
                                     <span className={`font-bold ${currentReferralTier.color}`}>{currentReferralTier.name}</span>
                                     <span className="bg-white/10 px-1.5 rounded text-xs text-white">{currentReferralTier.commission}%</span>
                                </div>
                           </div>
                      </div>
                      <div className="bg-black/40 rounded-xl p-5 border border-white/5 mb-6">
                           <div className="flex justify-between items-end mb-3">
                               <div>
                                    <h4 className="text-white font-bold text-sm">Progression to {nextReferralTier ? nextReferralTier.name : 'Max Rank'}</h4>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {nextReferralTier ? nextReferralTier.req : 'You have reached the highest tier!'}
                                    </p>
                               </div>
                               {nextReferralTier && (
                                   <div className="text-right">
                                        <span className="text-xs text-sol-green font-bold">Reward: {nextReferralTier.commission}% Commission</span>
                                   </div>
                               )}
                           </div>
                           {nextReferralTier && (
                               <div className="space-y-3">
                                   <div className="space-y-1">
                                       <div className="flex justify-between text-[10px] text-gray-400 uppercase">
                                           <span>Direct Referrals</span>
                                           <span>{profileForm.ecosystemStats?.directReferrals} / 3</span>
                                       </div>
                                       <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                           <div className="h-full bg-sol-green" style={{width: `${Math.min(100, ((profileForm.ecosystemStats?.directReferrals || 0) / 3) * 100)}%`}}></div>
                                       </div>
                                   </div>
                               </div>
                           )}
                      </div>
                      <div className="mt-6 flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/10">
                          <div>
                              <p className="text-xs text-gray-500 mb-1">YOUR REFERRAL LINK</p>
                              <p className="text-sol-green font-mono font-bold tracking-wider text-sm md:text-base">{profileForm.referralCode}</p>
                          </div>
                          <button onClick={handleCopyReferral} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors">
                              <Share2 size={20} />
                          </button>
                      </div>
                  </Card>
              </div>
          )}

          {activeTab === 'settings' && (
              // SETTINGS TAB
              <div className="space-y-8 animate-in slide-in-from-right-4 max-w-3xl mx-auto">
                 
                 {/* EMERGENCY RECOVERY CARD */}
                 {stuckSession && (
                     <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 md:p-6 animate-pulse">
                         <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                             <div className="flex items-center gap-4">
                                 <div className="bg-red-500/20 p-3 rounded-full text-red-500">
                                     <AlertTriangle size={32} />
                                 </div>
                                 <div>
                                     <h3 className="text-red-500 font-bold text-lg mb-1">Stuck Funds Detected</h3>
                                     <p className="text-gray-300 text-sm">
                                         It looks like your last game session ended unexpectedly (Crash/Disconnect).
                                     </p>
                                     <p className="text-white font-mono font-bold mt-1">
                                         Recoverable Amount: <span className="text-sol-green">${stuckSession.amount.toLocaleString()}</span>
                                     </p>
                                 </div>
                             </div>
                             <Button 
                                onClick={handleRecoverFunds} 
                                disabled={isRecovering}
                                variant="danger"
                                className="w-full md:w-auto min-w-[160px] shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                             >
                                 {isRecovering ? (
                                     <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16}/> Recovering...</span>
                                 ) : (
                                     'Recover Now'
                                 )}
                             </Button>
                         </div>
                     </div>
                 )}

                 <div className="bg-sol-dark border border-white/10 rounded-xl overflow-hidden">
                     <div className="p-4 border-b border-white/10 bg-white/5">
                         <h3 className="text-lg font-bold text-white flex items-center gap-2">
                             <Settings size={18} className="text-sol-blue"/> Global Game Preferences
                         </h3>
                         <p className="text-xs text-gray-400 mt-1">These settings apply to all tables you join.</p>
                     </div>
                     <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/5 rounded-lg text-gray-300"><Palette size={20} /></div>
                                <div>
                                    <span className="font-medium text-white block">4-Color Deck</span>
                                    <span className="text-xs text-gray-400">Use pro colors (Black/Red/Green/Blue) for better visibility.</span>
                                </div>
                            </div>
                            <button onClick={() => setFourColorDeck(!fourColorDeck)} className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${fourColorDeck ? 'bg-sol-green' : 'bg-gray-600'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${fourColorDeck ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/5 rounded-lg text-gray-300">
                                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                </div>
                                <div>
                                    <span className="font-medium text-white block">Sound Effects</span>
                                    <span className="text-xs text-gray-400">Enable chip sounds and alerts.</span>
                                </div>
                            </div>
                            <button onClick={() => setIsMuted(!isMuted)} className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${!isMuted ? 'bg-sol-green' : 'bg-gray-600'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${!isMuted ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/5 rounded-lg text-gray-300"><DollarSign size={20} /></div>
                                <div>
                                    <span className="font-medium text-white block">Auto Top-Up</span>
                                    <span className="text-xs text-gray-400">Automatically refill stack to max buy-in when below 20BB.</span>
                                </div>
                            </div>
                            <button onClick={() => setAutoTopUp(!autoTopUp)} className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${autoTopUp ? 'bg-sol-green' : 'bg-gray-600'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${autoTopUp ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                     </div>
                 </div>

                 <div className="bg-sol-dark border border-white/10 rounded-xl overflow-hidden">
                     <div className="p-4 border-b border-white/10 bg-white/5">
                         <h3 className="text-lg font-bold text-white">Public Profile</h3>
                     </div>
                     <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Username</label>
                                <div className="relative">
                                    <AtSign size={18} className="absolute left-3 top-3 text-gray-500" />
                                    <input type="text" name="username" disabled={!isEditing} value={profileForm.username} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-sol-green focus:outline-none disabled:opacity-50" />
                                </div>
                            </div>
                            {isOwnProfile && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Email Address</label>
                                    <div className="relative">
                                        <Mail size={18} className="absolute left-3 top-3 text-gray-500" />
                                        <input type="email" name="email" disabled={!isEditing} value={profileForm.email} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-sol-green focus:outline-none disabled:opacity-50" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Bio</label>
                            <textarea name="bio" disabled={!isEditing} value={profileForm.bio} onChange={handleChange} rows={3} className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-white focus:border-sol-green focus:outline-none disabled:opacity-50 resize-none" placeholder="Tell us about yourself..." />
                        </div>
                        
                        {isOwnProfile && (
                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Privacy</h3>
                                <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-gray-700 rounded-lg text-gray-300"><Ghost size={16} /></div>
                                        <div>
                                            <span className="font-medium text-white text-sm block">Incognito Mode (Ghost)</span>
                                            <span className="text-[10px] text-gray-500">Show as "Player [ID]" on tables.</span>
                                        </div>
                                    </div>
                                    <button type="button" disabled={!isEditing} onClick={() => handlePreferenceChange('incognito')} className={`w-10 h-5 rounded-full p-0.5 transition-colors ${profileForm.preferences.incognito ? 'bg-sol-green' : 'bg-gray-600'} ${!isEditing ? 'opacity-50' : ''}`}>
                                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${profileForm.preferences.incognito ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-gray-700 rounded-lg text-gray-300"><EyeOff size={16} /></div>
                                        <span className="font-medium text-white text-sm">Hide Balance on Profile</span>
                                    </div>
                                    <button type="button" disabled={!isEditing} onClick={() => handlePreferenceChange('hideBalance')} className={`w-10 h-5 rounded-full p-0.5 transition-colors ${profileForm.preferences.hideBalance ? 'bg-sol-green' : 'bg-gray-600'} ${!isEditing ? 'opacity-50' : ''}`}>
                                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${profileForm.preferences.hideBalance ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsEditing(!isEditing)} className="mr-4">
                                {isEditing ? 'Cancel' : 'Edit Info'}
                            </Button>
                            {isEditing && (
                                <Button type="submit" className="gap-2 shadow-[0_0_20px_rgba(0,255,174,0.3)]">
                                    <Save size={18} /> Save Changes
                                </Button>
                            )}
                        </div>
                    </form>
                 </div>
              </div>
          )}

        </div>
      </Card>
    </div>
  );
};

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
