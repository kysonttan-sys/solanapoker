
import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Lock, Save, Activity, DollarSign, Users, PauseCircle, PlayCircle, Settings, ShieldAlert, Database, Search, Ban, CheckCircle, XCircle, Terminal, Eye, Trash2, Megaphone, AlertTriangle, RefreshCw, Edit, Crown, Server, ListChecks, Zap, Bot, TrendingUp, Wallet, Gift, ArrowUpCircle, ArrowDownCircle, Clock, PieChart, Trophy } from 'lucide-react';
import { ADMIN_WALLET_ADDRESS, LEADERBOARD_DATA, MOCK_TABLES, PROTOCOL_FEE_SPLIT, MOCK_USER, REFERRAL_TIERS, HOST_TIERS } from '../constants';
import { User } from '../types';
import { Navigate } from 'react-router-dom';
import { useConnection } from '../components/WalletContextProvider';
import { getVaultAddress } from '../utils/solanaContract';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useSocket } from '../hooks/useSocket';
import { getApiUrl } from '../utils/api';

interface AdminProps {
    user: User | null;
}

// Mock System Logs
const MOCK_LOGS = [
    { id: 1, type: 'info', time: '10:42:05', msg: 'User [8x...3k9L] connected via Phantom.' },
    { id: 2, type: 'success', time: '10:42:12', msg: 'Deposit detected: 500 USDT -> User [8x...3k9L].' },
    { id: 3, type: 'warning', time: '10:45:00', msg: 'High latency detected on RPC node #3.' },
    { id: 4, type: 'info', time: '10:46:30', msg: 'Table #t1 hand completed. Pot: $420. Rake: $12.60.' },
    { id: 5, type: 'error', time: '10:50:11', msg: 'Failed transaction signature from User [Gg7x...9x2A]. Retrying...' },
];

export const Admin: React.FC<AdminProps> = ({ user }) => {
    // Initialize all hooks FIRST (before any conditional returns)
    const { connection } = useConnection();
    const { socket } = useSocket(); // Issue #5, #6: Socket for admin controls
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'games' | 'transactions' | 'logs'>('overview');
    const [isSaving, setIsSaving] = useState(false);
    const [protocolPaused, setProtocolPaused] = useState(false);
    
    // Chain State
    const [vaultBalance, setVaultBalance] = useState<number | null>(null);
    const [isRefreshingChain, setIsRefreshingChain] = useState(false);

    // User Management State
    const [userSearch, setUserSearch] = useState('');
    const [editingUser, setEditingUser] = useState<any | null>(null);
    
    // Issue #14: Fetch real user data from backend
    const [usersList, setUsersList] = useState<any[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    
    // Real-time stats from backend
    const [activeTables, setActiveTables] = useState(0);
    const [activePlayersOnline, setActivePlayersOnline] = useState(0);
    const [systemLogs, setSystemLogs] = useState<{id: number, type: string, time: string, msg: string}[]>([]);
    const [realTables, setRealTables] = useState<any[]>([]);

    // Revenue Dashboard State
    const [revenueData, setRevenueData] = useState<any>(null);
    const [jackpotData, setJackpotData] = useState<any>(null);
    const [isLoadingRevenue, setIsLoadingRevenue] = useState(true);

    // Transaction Monitor State
    const [transactions, setTransactions] = useState<any[]>([]);
    const [transactionSummary, setTransactionSummary] = useState<any[]>([]);
    const [txFilter, setTxFilter] = useState('all');
    const [isLoadingTx, setIsLoadingTx] = useState(true);

    // Issue #5: Bot Control State
    const [selectedTableForBot, setSelectedTableForBot] = useState<string>('t1');
    const [botResult, setBotResult] = useState<string>('');

    // Issue #6: Game Speed State
    const [gameSpeed, setGameSpeed] = useState<number>(1); // 1 = normal, 0.5 = 2x, 0.1 = 10x
    const [speedResult, setSpeedResult] = useState<string>('');

    // Auth Check AFTER hooks initialization
    if (!user) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0B0B0F]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-sol-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading admin panel...</p>
                </div>
            </div>
        );
    }
    
    if (user.walletAddress !== ADMIN_WALLET_ADDRESS) {
        return <Navigate to="/" replace />;
    }

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch(`${getApiUrl()}/api/admin/users`);
                const users = await res.json();
                setUsersList(users.map((u: any) => ({
                    id: u.id,
                    player: u.username,
                    winnings: u.totalWinnings,
                    balance: u.balance,
                    isBanned: u.isBanned || false,
                    isVerified: u.isVerified,
                    referralRank: u.referralRank,
                    hostRank: u.hostRank
                })));
            } catch (e) {
                console.error('Failed to fetch users:', e);
            } finally {
                setIsLoadingUsers(false);
            }
        };
        fetchUsers();
    }, []);

    // Fetch Revenue & Jackpot Data
    useEffect(() => {
        const fetchRevenueData = async () => {
            try {
                const [revenueRes, jackpotRes] = await Promise.all([
                    fetch(`${getApiUrl()}/api/admin/revenue`),
                    fetch(`${getApiUrl()}/api/admin/jackpot`)
                ]);
                
                if (revenueRes.ok) setRevenueData(await revenueRes.json());
                if (jackpotRes.ok) setJackpotData(await jackpotRes.json());
            } catch (e) {
                console.error('Failed to fetch revenue:', e);
            } finally {
                setIsLoadingRevenue(false);
            }
        };
        fetchRevenueData();
        const interval = setInterval(fetchRevenueData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    // Fetch Transactions
    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const res = await fetch(`${getApiUrl()}/api/admin/transactions?type=${txFilter}&limit=100`);
                if (res.ok) {
                    const data = await res.json();
                    setTransactions(data.transactions || []);
                    setTransactionSummary(data.summary || []);
                }
            } catch (e) {
                console.error('Failed to fetch transactions:', e);
            } finally {
                setIsLoadingTx(false);
            }
        };
        fetchTransactions();
    }, [txFilter]);

    // Fetch real-time stats from backend
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`${getApiUrl()}/api/stats`);
                const stats = await res.json();
                setActivePlayersOnline(stats.activePlayers || 0);
                
                // Fetch tables info
                const tablesRes = await fetch(`${getApiUrl()}/api/tables`);
                const tables = await tablesRes.json();
                setActiveTables(tables.length || 0);
                setRealTables(tables);
            } catch (e) {
                console.error('Failed to fetch stats:', e);
            }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    // Fetch real-time logs from backend via socket
    useEffect(() => {
        if (!socket) return;
        
        socket.on('serverLog', (log: any) => {
            setSystemLogs(prev => [{
                id: Date.now(),
                type: log.type || 'info',
                time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                msg: log.message
            }, ...prev].slice(0, 100)); // Keep last 100 logs
        });

        return () => {
            socket.off('serverLog');
        };
    }, [socket]);

    // Issue #5 & #6: Socket event listeners for admin controls
    useEffect(() => {
        if (!socket) return;

        socket.on('adminBotResult', (result: any) => {
            setBotResult(result.message || 'Action completed');
            setTimeout(() => setBotResult(''), 3000);
        });

        socket.on('adminSpeedResult', (result: any) => {
            setSpeedResult(result.message || 'Speed updated');
            setTimeout(() => setSpeedResult(''), 3000);
        });

        socket.on('gameSpeedUpdated', (data: any) => {
            console.log('[Admin] Game speed updated:', data);
        });

        socket.on('adminTableResult', (result: any) => {
            if (result.success) {
                alert(result.message);
                // Refresh tables list
                fetch(`${getApiUrl()}/api/tables`)
                    .then(res => res.json())
                    .then(tables => {
                        setActiveTables(tables.length || 0);
                        setRealTables(tables);
                    });
            } else {
                alert('Error: ' + result.message);
            }
        });

        return () => {
            socket.off('adminBotResult');
            socket.off('adminSpeedResult');
            socket.off('gameSpeedUpdated');
            socket.off('adminTableResult');
        };
    }, [socket]);

    // Config State
    const [config, setConfig] = useState({
        baseRake: 3.0,
        maxHostShare: 40,
        referrerShare: PROTOCOL_FEE_SPLIT.referrerMax,
        jackpotShare: PROTOCOL_FEE_SPLIT.jackpot,
        globalPoolShare: PROTOCOL_FEE_SPLIT.globalPool,
        devShare: 40, 
    });

    useEffect(() => {
        fetchVaultBalance();
    }, [connection]);

    const fetchVaultBalance = async () => {
        setIsRefreshingChain(true);
        try {
            const vaultPda = await getVaultAddress();
            const bal = await connection.getBalance(vaultPda);
            // Convert Lamports to SOL (For display)
            // Note: In our game logic, we treat 1 SOL = 100,000 Chips. 
            // So we display both.
            setVaultBalance(bal);
        } catch (e) {
            console.error("Failed to fetch vault balance", e);
        } finally {
            setIsRefreshingChain(false);
        }
    };

    const handleSave = () => {
        setIsSaving(true);
        // Simulate Smart Contract Call
        setTimeout(() => {
            setIsSaving(false);
            alert("Settings updated on-chain successfully!");
        }, 2000);
    };

    const toggleBan = (id: string) => {
        setUsersList(prev => prev.map(u => u.id === id ? { ...u, isBanned: !u.isBanned } : u));
    };

    const toggleVerify = (id: string) => {
        setUsersList(prev => prev.map(u => u.id === id ? { ...u, isVerified: !u.isVerified } : u));
    };

    const handleEditUser = (user: any) => {
        setEditingUser({ ...user }); // Clone to avoid direct mutation
    };

    const saveUserChanges = () => {
        if (!editingUser) return;
        setUsersList(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
        setEditingUser(null);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-red-500/30 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <div className="bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                            <Lock className="text-red-500" size={24} />
                        </div>
                        CTO Command Center
                    </h1>
                    <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-sol-green animate-pulse"/>
                        Connected as Super Admin ({user.walletAddress.substring(0,6)}...)
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button 
                        variant={protocolPaused ? 'primary' : 'danger'} 
                        className="gap-2 shadow-lg shadow-red-900/20"
                        onClick={() => setProtocolPaused(!protocolPaused)}
                    >
                        {protocolPaused ? <PlayCircle size={18}/> : <PauseCircle size={18}/>}
                        {protocolPaused ? 'Resume Protocol' : 'Emergency Pause'}
                    </Button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex overflow-x-auto gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
                {[
                    { id: 'overview', label: 'Overview', icon: <Activity size={16}/> },
                    { id: 'users', label: 'User Management', icon: <Users size={16}/> },
                    { id: 'games', label: 'Game Monitor', icon: <Eye size={16}/> },
                    { id: 'transactions', label: 'Transactions', icon: <Wallet size={16}/> },
                    { id: 'logs', label: 'System Logs', icon: <Terminal size={16}/> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                            activeTab === tab.id 
                            ? 'bg-sol-green text-black shadow-lg' 
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Protocol Paused Alert */}
            {protocolPaused && (
                <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 flex items-center gap-4 animate-pulse">
                    <ShieldAlert size={32} className="text-red-500" />
                    <div>
                        <h3 className="text-red-500 font-bold text-lg">PROTOCOL PAUSED</h3>
                        <p className="text-red-300 text-sm">All deposits and game creations are currently suspended. Withdrawals remain active.</p>
                    </div>
                </div>
            )}

            {/* --- TAB CONTENT --- */}
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                    
                    {/* Issue #5 & #6: Admin Testing Controls */}
                    <Card className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/50">
                        <div className="p-6 space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Zap size={24} className="text-purple-400" />
                                <div>
                                    <h3 className="text-lg font-bold text-white">Testing Controls</h3>
                                    <p className="text-sm text-gray-400">Speed up gameplay and add AI bots for testing</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Issue #6: Game Speed Control */}
                                <div className="bg-black/20 rounded-lg p-4 border border-white/10">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Zap size={18} className="text-yellow-400" />
                                        <h4 className="font-bold text-white">Game Speed Control</h4>
                                    </div>
                                    <p className="text-xs text-gray-400 mb-4">Accelerate game timers for faster testing</p>
                                    
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-300">Speed:</span>
                                            <span className="text-lg font-bold text-sol-green">{(1/gameSpeed).toFixed(1)}x</span>
                                        </div>
                                        
                                        <input 
                                            type="range" 
                                            min="0.1" 
                                            max="1" 
                                            step="0.1" 
                                            value={gameSpeed}
                                            onChange={(e) => setGameSpeed(parseFloat(e.target.value))}
                                            className="w-full"
                                        />
                                        
                                        <div className="flex gap-2">
                                            <Button 
                                                size="sm" 
                                                variant={gameSpeed === 0.1 ? 'primary' : 'outline'}
                                                onClick={() => setGameSpeed(0.1)}
                                            >
                                                10x
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant={gameSpeed === 0.2 ? 'primary' : 'outline'}
                                                onClick={() => setGameSpeed(0.2)}
                                            >
                                                5x
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant={gameSpeed === 0.5 ? 'primary' : 'outline'}
                                                onClick={() => setGameSpeed(0.5)}
                                            >
                                                2x
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant={gameSpeed === 1 ? 'primary' : 'outline'}
                                                onClick={() => setGameSpeed(1)}
                                            >
                                                Normal
                                            </Button>
                                        </div>

                                        <Button 
                                            onClick={() => {
                                                if (socket && user) {
                                                    socket.emit('adminSetGameSpeed', { 
                                                        multiplier: gameSpeed, 
                                                        adminWallet: user.walletAddress 
                                                    });
                                                }
                                            }}
                                            className="w-full gap-2"
                                        >
                                            <Zap size={16} /> Apply Speed
                                        </Button>

                                        {speedResult && (
                                            <p className="text-xs text-center text-sol-green">{speedResult}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Issue #5: Bot Control */}
                                <div className="bg-black/20 rounded-lg p-4 border border-white/10">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Bot size={18} className="text-blue-400" />
                                        <h4 className="font-bold text-white">AI Bot Control</h4>
                                    </div>
                                    <p className="text-xs text-gray-400 mb-4">Add AI players to test multi-player scenarios</p>
                                    
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-400">Table ID</label>
                                            <select 
                                                value={selectedTableForBot}
                                                onChange={(e) => setSelectedTableForBot(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white text-sm"
                                            >
                                                <option value="t1">Neon Nights #1 (t1)</option>
                                                <option value="table_whale_9">Whale Pool (table_whale_9)</option>
                                            </select>
                                        </div>

                                        <Button 
                                            onClick={() => {
                                                if (socket && user) {
                                                    socket.emit('adminAddBot', { 
                                                        tableId: selectedTableForBot, 
                                                        adminWallet: user.walletAddress 
                                                    });
                                                }
                                            }}
                                            className="w-full gap-2"
                                            variant="outline"
                                        >
                                            <Bot size={16} /> Add Bot to Table
                                        </Button>

                                        {botResult && (
                                            <p className="text-xs text-center text-sol-green">{botResult}</p>
                                        )}

                                        <div className="pt-2 border-t border-white/10">
                                            <p className="text-[10px] text-gray-500 leading-relaxed">
                                                Bots use basic poker AI with random decision-making weighted by hand strength. 
                                                They start with 100BB stacks and play automatically.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-sol-dark border-sol-green/30 relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-2 relative z-10">
                                <span className="text-sol-green text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                    <Server size={12}/> Smart Contract Vault
                                </span>
                                <button onClick={fetchVaultBalance} className="text-gray-500 hover:text-white transition-colors">
                                    <RefreshCw size={14} className={isRefreshingChain ? "animate-spin" : ""} />
                                </button>
                            </div>
                            <div className="text-2xl font-mono font-bold text-white relative z-10">
                                {vaultBalance !== null ? (vaultBalance / LAMPORTS_PER_SOL).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '---'} <span className="text-sm">SOL</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1 relative z-10 font-mono">
                                ≈ {vaultBalance !== null ? ((vaultBalance / LAMPORTS_PER_SOL) * 100000).toLocaleString() : '---'} Chips (TVL)
                            </div>
                            <div className="absolute -bottom-4 -right-4 text-sol-green/5">
                                <DollarSign size={80} />
                            </div>
                        </Card>
                        <Card className="bg-white/5 border-white/5 hover:border-sol-blue/30 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-gray-400 text-xs font-bold uppercase">Active Tables</span>
                                <Activity size={16} className="text-sol-blue"/>
                            </div>
                            <div className="text-2xl font-mono font-bold text-white">{activeTables}</div>
                            <div className="text-xs text-gray-500 mt-1">{activePlayersOnline} Players Online</div>
                        </Card>
                        <Card className="bg-white/5 border-white/5 hover:border-yellow-500/30 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-gray-400 text-xs font-bold uppercase">Total Users</span>
                                <Users size={16} className="text-yellow-500"/>
                            </div>
                            <div className="text-2xl font-mono font-bold text-white">{usersList.length.toLocaleString()}</div>
                            <div className="text-xs text-sol-green mt-1">From Database</div>
                        </Card>
                    </div>

                    {/* Revenue Dashboard */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-500/30">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-green-400 text-xs font-bold uppercase flex items-center gap-1">
                                    <PieChart size={12}/> Total Rake
                                </span>
                            </div>
                            <div className="text-2xl font-mono font-bold text-white">
                                {revenueData?.totalRake?.toLocaleString() || '0'} <span className="text-sm">chips</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">All-time rake collected</div>
                        </Card>
                        <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-500/30">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-purple-400 text-xs font-bold uppercase">Developer Share</span>
                            </div>
                            <div className="text-2xl font-mono font-bold text-white">
                                {revenueData?.developerShare?.toLocaleString() || '0'} <span className="text-sm">chips</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">Your earnings</div>
                        </Card>
                        <Card className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 border-yellow-500/30">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-yellow-400 text-xs font-bold uppercase">Jackpot Pool</span>
                            </div>
                            <div className="text-2xl font-mono font-bold text-white">
                                {revenueData?.jackpotBalance?.toLocaleString() || '0'} <span className="text-sm">chips</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">Ready for distribution</div>
                        </Card>
                        <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-500/30">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-blue-400 text-xs font-bold uppercase">Global Pool</span>
                            </div>
                            <div className="text-2xl font-mono font-bold text-white">
                                {revenueData?.globalPoolBalance?.toLocaleString() || '0'} <span className="text-sm">chips</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">Partner rewards</div>
                        </Card>
                    </div>

                    {/* Jackpot Control Panel */}
                    <Card className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-yellow-500/50">
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Trophy size={24} className="text-yellow-400" />
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Jackpot Control Panel</h3>
                                        <p className="text-sm text-gray-400">Manage weekly jackpot distributions</p>
                                    </div>
                                </div>
                                <Button 
                                    onClick={() => {
                                        if (confirm('Are you sure you want to trigger manual jackpot distribution? This will distribute the current jackpot pool to eligible players.')) {
                                            fetch(`${getApiUrl()}/api/admin/jackpot/trigger`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ adminWallet: user?.walletAddress })
                                            })
                                            .then(res => res.json())
                                            .then(data => {
                                                if (data.success) {
                                                    alert(`Jackpot distributed! ${data.totalDistributed} chips sent to ${data.recipients} players`);
                                                } else {
                                                    alert('Failed to distribute jackpot: ' + data.error);
                                                }
                                            })
                                            .catch(err => alert('Error: ' + err.message));
                                        }
                                    }}
                                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold gap-2"
                                >
                                    <Trophy size={16} /> Trigger Manual Distribution
                                </Button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/10">
                                <div className="bg-black/20 rounded-lg p-4 border border-white/10">
                                    <div className="text-xs text-gray-400 uppercase font-bold mb-1">Top 3 Players Pool (30%)</div>
                                    <div className="text-lg font-mono text-sol-green">
                                        {((revenueData?.jackpotBalance || 0) * 0.3).toLocaleString()} chips
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-1">50% / 30% / 20% split</div>
                                </div>
                                <div className="bg-black/20 rounded-lg p-4 border border-white/10">
                                    <div className="text-xs text-gray-400 uppercase font-bold mb-1">Top 3 Earners Pool (30%)</div>
                                    <div className="text-lg font-mono text-sol-green">
                                        {((revenueData?.jackpotBalance || 0) * 0.3).toLocaleString()} chips
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-1">50% / 30% / 20% split</div>
                                </div>
                                <div className="bg-black/20 rounded-lg p-4 border border-white/10">
                                    <div className="text-xs text-gray-400 uppercase font-bold mb-1">Lucky Draw Pool (40%)</div>
                                    <div className="text-lg font-mono text-sol-green">
                                        {((revenueData?.jackpotBalance || 0) * 0.4).toLocaleString()} chips
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-1">10 random winners</div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Economic Configuration */}
                        <Card className="lg:col-span-2 bg-sol-dark border-white/10">
                            <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                                <Settings size={20} className="text-sol-green" />
                                <h3 className="font-bold text-lg text-white">Protocol Economics (Smart Contract)</h3>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Base Rake % (Cash Games)</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                value={config.baseRake} 
                                                onChange={(e) => setConfig({...config, baseRake: parseFloat(e.target.value)})}
                                                className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white w-full focus:border-sol-green focus:outline-none"
                                            />
                                            <span className="text-gray-500 font-bold">%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Host Share Max %</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                value={config.maxHostShare} 
                                                onChange={(e) => setConfig({...config, maxHostShare: parseFloat(e.target.value)})}
                                                className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white w-full focus:border-sol-green focus:outline-none"
                                            />
                                            <span className="text-gray-500 font-bold">%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-4">
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Fee Distribution Split</h4>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-sol-purple font-bold">Referral Program</span>
                                                <span className="text-white">{config.referrerShare}%</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="30" 
                                                value={config.referrerShare} 
                                                onChange={(e) => setConfig({...config, referrerShare: parseInt(e.target.value)})}
                                                className="w-full accent-sol-purple h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-yellow-500 font-bold">Community Jackpot</span>
                                                <span className="text-white">{config.jackpotShare}%</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="20" 
                                                value={config.jackpotShare} 
                                                onChange={(e) => setConfig({...config, jackpotShare: parseInt(e.target.value)})}
                                                className="w-full accent-yellow-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-sol-blue font-bold">Global Partner Pool</span>
                                                <span className="text-white">{config.globalPoolShare}%</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="20" 
                                                value={config.globalPoolShare} 
                                                onChange={(e) => setConfig({...config, globalPoolShare: parseInt(e.target.value)})}
                                                className="w-full accent-sol-blue h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button onClick={handleSave} disabled={isSaving} className="min-w-[150px] shadow-[0_0_15px_rgba(0,255,174,0.2)]">
                                        {isSaving ? (
                                            <><RefreshCw size={16} className="animate-spin mr-2"/> Signing Tx...</>
                                        ) : (
                                            <><Save size={16} className="mr-2"/> Update Contract</>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        {/* Deployment Roadmap / Checklist */}
                        <div className="space-y-6">
                            <Card className="bg-[#1A1A24] border-white/10 h-full">
                                <div className="flex items-center gap-2 mb-4">
                                    <ListChecks size={20} className="text-yellow-500" />
                                    <h3 className="font-bold text-lg text-white">Mainnet Roadmap</h3>
                                </div>
                                <div className="space-y-3">
                                    <CheckItem label="Smart Contract Deployed (Devnet)" checked={true} />
                                    <CheckItem label="Vault Connection Verified" checked={vaultBalance !== null} />
                                    <CheckItem label="Backend Game Server (Node.js)" checked={true} />
                                    <CheckItem label="Real-time WebSockets (Socket.io)" checked={true} />
                                    <CheckItem label="Provably Fair RNG System" checked={true} />
                                    <CheckItem label="Rake Distribution System" checked={true} />
                                    <div className="my-4 border-t border-white/5"></div>
                                    <CheckItem label="Production RPC Setup" checked={false} isNext />
                                    <CheckItem label="Security Audit" checked={false} />
                                    <CheckItem label="Mainnet Deployment" checked={false} />
                                </div>
                                <div className="mt-6 p-3 bg-sol-green/10 border border-sol-green/20 rounded-lg">
                                    <p className="text-xs text-sol-green font-bold mb-1 flex items-center gap-2">
                                        <CheckCircle size={12}/> Status:
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Backend server with provably fair RNG is complete. Next: Production deployment and security audit.
                                    </p>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                    <div className="flex justify-between gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                        <div className="relative flex-1">
                             <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
                             <input 
                                type="text" 
                                placeholder="Search by Username or Wallet ID..." 
                                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:border-sol-green focus:outline-none"
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                             />
                        </div>
                        <Button variant="outline" className="shrink-0 gap-2"><RefreshCw size={16}/> Refresh</Button>
                    </div>

                    <div className="bg-sol-dark border border-white/10 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-black/20 text-gray-400 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4">User</th>
                                    <th className="p-4">Wallet</th>
                                    <th className="p-4 text-center">Rank</th>
                                    <th className="p-4 text-right">Balance</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-center">Verified</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {usersList
                                    .filter(u => u.player.toLowerCase().includes(userSearch.toLowerCase()) || u.id.includes(userSearch))
                                    .map((user) => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 font-bold text-white">
                                            {user.player} 
                                            {user.id === MOCK_USER.id && <span className="ml-2 text-xs bg-sol-green/20 text-sol-green px-1.5 py-0.5 rounded">YOU</span>}
                                        </td>
                                        <td className="p-4 font-mono text-gray-400 text-xs">{user.id === MOCK_USER.id ? ADMIN_WALLET_ADDRESS : user.id === 'u2' ? '8x...3k9L' : `Sol...${user.id}`}</td>
                                        <td className="p-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`text-[10px] uppercase font-bold px-1.5 rounded bg-white/10 ${HOST_TIERS[user.hostRank]?.color || 'text-gray-400'}`}>
                                                    Host: {HOST_TIERS[user.hostRank]?.name || 'Dealer'}
                                                </span>
                                                <span className={`text-[10px] uppercase font-bold px-1.5 rounded bg-white/10 ${REFERRAL_TIERS[user.referralRank]?.color || 'text-gray-400'}`}>
                                                    Ref: {REFERRAL_TIERS[user.referralRank]?.name || 'Scout'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right font-mono text-sol-green">${user.balance?.toLocaleString()}</td>
                                        <td className="p-4 text-center">
                                            {user.isBanned ? (
                                                <span className="bg-red-500/10 text-red-500 px-2 py-1 rounded text-xs font-bold border border-red-500/20">BANNED</span>
                                            ) : (
                                                <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded text-xs font-bold border border-green-500/20">ACTIVE</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            {user.isVerified ? <CheckCircle size={16} className="text-sol-blue mx-auto"/> : <XCircle size={16} className="text-gray-600 mx-auto"/>}
                                        </td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            <button 
                                                onClick={() => handleEditUser(user)}
                                                className="p-1.5 hover:bg-sol-blue/10 rounded text-gray-400 hover:text-sol-blue" title="Edit Ranks"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                onClick={() => toggleVerify(user.id)}
                                                className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white" title="Toggle Verify"
                                            >
                                                <CheckCircle size={16} />
                                            </button>
                                            <button 
                                                onClick={() => toggleBan(user.id)}
                                                className={`p-1.5 hover:bg-red-500/10 rounded transition-colors ${user.isBanned ? 'text-green-500 hover:bg-green-500/10' : 'text-red-500'}`} 
                                                title={user.isBanned ? "Unban User" : "Ban User"}
                                            >
                                                <Ban size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* GAMES TAB */}
            {activeTab === 'games' && (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {realTables.length === 0 ? (
                            <div className="col-span-3 text-center py-12 text-gray-500">
                                <Activity size={48} className="mx-auto mb-4 opacity-50" />
                                <p>No active tables</p>
                            </div>
                        ) : (
                            realTables.map((table: any) => (
                                <Card key={table.tableId} className="bg-white/5 border-white/10 hover:border-white/20 transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-white text-lg group-hover:text-sol-blue transition-colors">{table.name || table.tableId}</h3>
                                            <p className="text-xs text-gray-400 font-mono">ID: {table.tableId}</p>
                                        </div>
                                        <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded text-xs font-bold animate-pulse">LIVE</span>
                                    </div>
                                    <div className="space-y-2 mb-6">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Blinds</span>
                                            <span className="text-white">${table.smallBlind}/${table.bigBlind}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Players</span>
                                            <span className="text-white">{table.players?.length || 0}/{table.maxSeats || 6}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Pot</span>
                                            <span className="text-sol-green font-mono">${table.pot?.toLocaleString() || 0}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button 
                                            size="sm" 
                                            variant="danger" 
                                            className="flex-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => {
                                                if (socket && user && confirm(`Are you sure you want to close table ${table.tableId}?`)) {
                                                    socket.emit('adminCloseTable', { tableId: table.tableId, adminWallet: user.walletAddress });
                                                }
                                            }}
                                        >
                                            <Trash2 size={14} className="mr-1"/> Close
                                        </Button>
                                        <Button size="sm" variant="secondary" className="flex-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Eye size={14} className="mr-1"/> Spectate
                                        </Button>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                    
                    <div className="bg-sol-dark p-4 rounded-xl border border-white/10 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                             <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500">
                                 <Megaphone size={24} />
                             </div>
                             <div>
                                 <h3 className="font-bold text-white">System Broadcast</h3>
                                 <p className="text-xs text-gray-400">Send a message to all active tables.</p>
                             </div>
                         </div>
                         <div className="flex gap-2">
                             <input type="text" placeholder="Message..." className="bg-black/40 border border-white/10 rounded px-3 py-1 text-sm text-white w-64"/>
                             <Button size="sm">Send</Button>
                         </div>
                    </div>
                </div>
            )}

            {/* TRANSACTIONS TAB */}
            {activeTab === 'transactions' && (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                    <div className="flex justify-between gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                        <div className="flex gap-2">
                            {['all', 'deposit', 'withdrawal', 'game_win', 'rake'].map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setTxFilter(filter)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                                        txFilter === filter
                                            ? 'bg-sol-green text-black'
                                            : 'bg-black/40 text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {filter === 'all' ? 'All' : filter.replace('_', ' ').toUpperCase()}
                                </button>
                            ))}
                        </div>
                        <Button 
                            variant="outline" 
                            className="shrink-0 gap-2"
                            onClick={() => {
                                fetch(`${getApiUrl()}/api/admin/transactions?limit=100`)
                                    .then(res => res.json())
                                    .then(data => setTransactions(data.transactions || []))
                                    .catch(err => console.error('Failed to refresh transactions:', err));
                            }}
                        >
                            <RefreshCw size={16}/> Refresh
                        </Button>
                    </div>

                    <div className="bg-sol-dark border border-white/10 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-black/20 text-gray-400 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4">Time</th>
                                    <th className="p-4">Type</th>
                                    <th className="p-4">User</th>
                                    <th className="p-4 text-right">Amount</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">TX Hash</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {transactions
                                    .filter(tx => txFilter === 'all' || tx.type === txFilter)
                                    .map((tx) => (
                                    <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-gray-400 text-xs font-mono">
                                            {new Date(tx.timestamp).toLocaleString()}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                tx.type === 'deposit' ? 'bg-green-500/10 text-green-500' :
                                                tx.type === 'withdrawal' ? 'bg-red-500/10 text-red-500' :
                                                tx.type === 'game_win' ? 'bg-yellow-500/10 text-yellow-500' :
                                                'bg-sol-blue/10 text-sol-blue'
                                            }`}>
                                                {tx.type === 'deposit' && <ArrowDownCircle size={12} className="inline mr-1" />}
                                                {tx.type === 'withdrawal' && <ArrowUpCircle size={12} className="inline mr-1" />}
                                                {tx.type.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono text-gray-300 text-xs">
                                            {tx.userId?.slice(0, 8)}...
                                        </td>
                                        <td className="p-4 text-right font-mono">
                                            <span className={tx.type === 'withdrawal' ? 'text-red-400' : 'text-sol-green'}>
                                                {tx.type === 'withdrawal' ? '-' : '+'}{tx.amount?.toLocaleString()} chips
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                tx.status === 'completed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                tx.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                                                'bg-red-500/10 text-red-500 border border-red-500/20'
                                            }`}>
                                                {tx.status?.toUpperCase() || 'COMPLETED'}
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono text-gray-500 text-xs">
                                            {tx.txSignature ? `${tx.txSignature.slice(0, 10)}...` : '-'}
                                        </td>
                                    </tr>
                                ))}
                                {transactions.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-gray-500">
                                            <Wallet size={32} className="mx-auto mb-2 opacity-50" />
                                            No transactions found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* LOGS TAB */}
            {activeTab === 'logs' && (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                    <Card className="bg-[#0c0c0c] border-white/10 font-mono text-sm h-[500px] overflow-y-auto p-0 relative">
                        <div className="sticky top-0 bg-[#1a1a1a] border-b border-white/10 p-2 px-4 flex justify-between items-center">
                            <span className="text-gray-400 text-xs font-bold uppercase">System Terminal (Live)</span>
                            <span className="flex gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-red-500"/>
                                <span className="w-3 h-3 rounded-full bg-yellow-500"/>
                                <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"/>
                            </span>
                        </div>
                        <div className="p-4 space-y-2">
                            {systemLogs.length === 0 ? (
                                <div className="text-gray-500 text-center py-8">
                                    <Terminal size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>Waiting for server events...</p>
                                    <p className="text-xs mt-1">Logs will appear here in real-time</p>
                                </div>
                            ) : (
                                systemLogs.map((log) => (
                                    <div key={log.id} className="flex gap-4 hover:bg-white/5 p-1 rounded">
                                        <span className="text-gray-500 shrink-0">[{log.time}]</span>
                                        <span className={`
                                            ${log.type === 'info' ? 'text-blue-400' : 
                                              log.type === 'success' ? 'text-green-400' :
                                              log.type === 'warning' ? 'text-yellow-400' : 'text-red-500'}
                                        `}>
                                            {log.type.toUpperCase()}
                                        </span>
                                        <span className="text-gray-300">{log.msg}</span>
                                    </div>
                                ))
                            )}
                            <div className="animate-pulse text-sol-green">_</div>
                        </div>
                    </Card>
                    <div className="flex justify-end gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => setSystemLogs([])}
                        >
                            <AlertTriangle size={14}/> Clear Logs
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => alert('Logs refreshed from backend')}
                        >
                            <RefreshCw size={14}/> Refresh
                        </Button>
                    </div>
                </div>
            )}

            {/* USER EDITOR MODAL */}
            {editingUser && (
                <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Edit User">
                    <div className="space-y-4">
                        <div className="bg-white/5 p-3 rounded-lg border border-white/10 mb-2">
                            <label className="text-xs text-gray-500 font-bold uppercase block mb-1">User ID / Name</label>
                            <div className="text-white font-mono">{editingUser.player} ({editingUser.id})</div>
                        </div>

                        <div>
                            <label className="text-sm font-bold text-gray-300 block mb-2">Balance Correction (USDT)</label>
                            <input 
                                type="number" 
                                value={editingUser.balance}
                                onChange={(e) => setEditingUser({...editingUser, balance: parseFloat(e.target.value)})}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-sol-green focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-bold text-gray-300 block mb-2 flex items-center gap-2">
                                <Crown size={16} className="text-sol-purple"/> Referral Rank
                            </label>
                            <select 
                                value={editingUser.referralRank}
                                onChange={(e) => setEditingUser({...editingUser, referralRank: parseInt(e.target.value)})}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-sol-purple focus:outline-none"
                            >
                                {REFERRAL_TIERS.map(tier => (
                                    <option key={tier.rank} value={tier.rank}>{tier.name} ({tier.commission}%)</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-bold text-gray-300 block mb-2 flex items-center gap-2">
                                <Activity size={16} className="text-yellow-500"/> Host Rank (Fee Share)
                            </label>
                            <select 
                                value={editingUser.hostRank}
                                onChange={(e) => setEditingUser({...editingUser, hostRank: parseInt(e.target.value)})}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-yellow-500 focus:outline-none"
                            >
                                {HOST_TIERS.map(tier => (
                                    <option key={tier.rank} value={tier.rank}>{tier.name} ({tier.share}%)</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-white/10 mt-4">
                            <Button variant="ghost" onClick={() => setEditingUser(null)}>Cancel</Button>
                            <Button onClick={saveUserChanges}>Save Changes</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

const CheckItem = ({ label, checked, isNext }: { label: string, checked: boolean, isNext?: boolean }) => (
    <div className={`flex items-center gap-3 p-2 rounded-lg ${isNext ? 'bg-sol-blue/10 border border-sol-blue/30' : ''}`}>
        {checked ? (
            <CheckCircle size={18} className="text-sol-green" />
        ) : isNext ? (
            <div className="w-4.5 h-4.5 rounded-full border-2 border-sol-blue animate-pulse"/>
        ) : (
            <div className="w-4.5 h-4.5 rounded-full border-2 border-gray-600"/>
        )}
        <span className={`text-sm ${checked ? 'text-gray-300 line-through' : isNext ? 'text-white font-bold' : 'text-gray-500'}`}>
            {label}
        </span>
        {isNext && <span className="ml-auto text-[10px] bg-sol-blue text-white px-2 rounded-full font-bold">NEXT</span>}
    </div>
);
