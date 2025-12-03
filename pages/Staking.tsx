
import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Layers, ArrowRight, Wallet, Lock, TrendingUp, RefreshCw, AlertCircle, Coins, Gift, Zap, History, CheckCircle, Loader2 } from 'lucide-react';
import { STAKING_POOL_INFO, PROTOCOL_FEE_SPLIT } from '../constants';
import { User } from '../types';

interface StakingProps {
    user: User | null;
    onUserUpdate: (user: User) => void;
}

// 7 Days in Milliseconds
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; 

export const Staking: React.FC<StakingProps> = ({ user, onUserUpdate }) => {
    const [activeTab, setActiveTab] = useState<'stake' | 'unstake'>('stake');
    const [amount, setAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    // Simulate fetching Global Pool Data from Chain
    const [poolInfo, setPoolInfo] = useState(STAKING_POOL_INFO);

    // Simulation state for rewards (visual ticker)
    const [pendingRewards, setPendingRewards] = useState(0);

    // 1. Simulate "Fetching from Chain" on Mount
    useEffect(() => {
        setIsLoading(true);
        const fetchChainData = setTimeout(() => {
            // Simulate slight TVL fluctuation (Live Market Data)
            const randomFluctuation = (Math.random() - 0.5) * 50000; 
            setPoolInfo(prev => ({
                ...prev,
                tvl: prev.tvl + randomFluctuation
            }));
            
            // Sync User Data
            if (user?.stakingStats?.rewardsEarned !== undefined) {
                setPendingRewards(user.stakingStats.rewardsEarned);
            }
            
            setIsLoading(false);
        }, 1200); // 1.2s RPC Simulation Delay

        return () => clearTimeout(fetchChainData);
    }, [user?.id]); // Refetch if user changes

    // 2. Simulate real-time reward accrual (Client-side estimation based on APY)
    useEffect(() => {
        if (!user || !user.stakingStats?.stakedAmount || isLoading) return;
        
        const interval = setInterval(() => {
            // Tiny increment to visualize "Live" earning
            // APY 24% -> approx 0.000000007 per second per token (just for visual effect)
            const secondRate = (user.stakingStats!.stakedAmount * (poolInfo.apy / 100)) / (365 * 24 * 60 * 60);
            setPendingRewards(prev => prev + secondRate);
        }, 1000);

        return () => clearInterval(interval);
    }, [user?.stakingStats?.stakedAmount, isLoading, poolInfo.apy]);

    const handleMax = () => {
        if (!user) return;
        if (activeTab === 'stake') {
            setAmount(user.spxBalance ? user.spxBalance.toString() : '0');
        } else {
            setAmount(user.stakingStats ? user.stakingStats.stakedAmount.toString() : '0');
        }
    };

    // Calculate Cooldown Status
    const lastStaked = user?.stakingStats?.lastStakedTime || 0;
    const timeSinceStake = Date.now() - lastStaked;
    const isEarlyExit = timeSinceStake < COOLDOWN_MS;
    
    const feePercent = isEarlyExit ? 2.0 : 0;
    
    // Calculate Return Amount if Unstaking
    const unstakeInput = parseFloat(amount) || 0;
    const penaltyAmount = unstakeInput * (feePercent / 100);
    const returnAmount = unstakeInput - penaltyAmount;

    const handleAction = () => {
        if (!amount || isNaN(parseFloat(amount))) return;
        setIsProcessing(true);
        
        const val = parseFloat(amount);

        setTimeout(() => {
            if (!user) return;
            
            const newStats = { ...user.stakingStats! };
            let newSpxBalance = user.spxBalance || 0;
            let msg = '';

            if (activeTab === 'stake') {
                // Stake Logic
                newSpxBalance -= val;
                newStats.stakedAmount += val;
                // STRICT LOCK: Reset timer on new deposit
                newStats.lastStakedTime = Date.now();
                msg = `Successfully staked ${val.toLocaleString()} SPX! Yield generation started.`;
            } else {
                // Unstake Logic
                newStats.stakedAmount -= val;
                
                // Deduct Fee
                if (feePercent > 0) {
                    newSpxBalance += (val * (1 - feePercent/100));
                    msg = `Unstaked ${val.toLocaleString()} SPX. Fee: ${penaltyAmount.toFixed(2)} SPX. Returned: ${returnAmount.toFixed(2)} SPX.`;
                } else {
                    newSpxBalance += val;
                    msg = `Successfully unstaked ${val.toLocaleString()} SPX! No fee applied.`;
                }
            }

            const updatedUser = {
                ...user,
                spxBalance: newSpxBalance,
                stakingStats: newStats
            };

            onUserUpdate(updatedUser);
            setIsProcessing(false);
            setAmount('');
            alert(msg);
        }, 1500);
    };

    const handleClaim = () => {
        if (pendingRewards <= 0) return;
        setIsProcessing(true);
        
        setTimeout(() => {
            if (!user) return;
            
            const claimedAmount = pendingRewards;
            const updatedUser = {
                ...user,
                spxBalance: (user.spxBalance || 0) + claimedAmount,
                stakingStats: {
                    ...user.stakingStats!,
                    rewardsEarned: 0, // Reset rewards on chain (mock)
                    totalRewardsClaimed: (user.stakingStats?.totalRewardsClaimed || 0) + claimedAmount
                }
            };

            onUserUpdate(updatedUser);
            setPendingRewards(0);
            setIsProcessing(false);
            alert(`Claimed ${claimedAmount.toFixed(4)} SPX to wallet!`);
        }, 1500);
    };

    if (!user) return <div className="p-12 text-center text-gray-500">Please connect wallet to view staking.</div>;

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto min-h-[60vh] flex flex-col items-center justify-center space-y-4 animate-in fade-in">
                <Loader2 size={48} className="text-sol-green animate-spin" />
                <p className="text-sol-green font-mono text-sm tracking-wider animate-pulse">Synchronizing with Solana Blockchain...</p>
                <p className="text-gray-500 text-xs">Fetching Global State & User PDA Accounts</p>
            </div>
        );
    }

    const spxBalance = user.spxBalance || 0;
    const stakedBalance = user.stakingStats?.stakedAmount || 0;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
            
            {/* Header Hero */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sol-dark to-black border border-white/10 p-8 md:p-12">
                <div className="absolute top-0 right-0 w-96 h-96 bg-sol-purple/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-sol-green/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="max-w-xl text-center md:text-left">
                        <div className="flex items-center gap-2 mb-4 justify-center md:justify-start">
                            <span className="px-3 py-1 rounded-full bg-sol-green/20 text-sol-green text-xs font-bold uppercase tracking-wider border border-sol-green/30 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-sol-green animate-pulse"></span> Staking Live
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 font-sans tracking-tight text-white">
                            Stake $SPX. <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sol-purple to-sol-blue">Earn Passive Yield.</span>
                        </h1>
                        <p className="text-gray-400 text-lg">
                            Lock your SolPokerX tokens to earn rewards. <span className="text-white font-bold">{PROTOCOL_FEE_SPLIT.buyback}% of all platform revenue</span> is used to Buyback & Burn SPX, driving value to stakers.
                        </p>
                    </div>

                    {/* Global Stats Grid - Refined for Visual Balance */}
                    <div className="flex flex-col sm:flex-row w-full md:w-auto bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm divide-y sm:divide-y-0 sm:divide-x divide-white/10">
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 min-w-[140px]">
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Value Locked</p>
                            <p className="text-xl md:text-2xl font-bold text-white font-mono">${(poolInfo.tvl * poolInfo.tokenPrice).toLocaleString()}</p>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 min-w-[140px]">
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Current APY</p>
                            <p className="text-xl md:text-2xl font-bold text-sol-green font-mono">{poolInfo.apy}%</p>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 min-w-[140px]">
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Staked</p>
                            <p className="text-xl md:text-2xl font-bold text-white font-mono">{(poolInfo.tvl / 1000000).toFixed(1)}M <span className="text-xs text-gray-500">SPX</span></p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN: Staking Interface */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="bg-sol-dark/60 border-white/5">
                        <div className="flex bg-black/40 p-1 rounded-xl mb-6 border border-white/5">
                            <button
                                onClick={() => { setActiveTab('stake'); setAmount(''); }}
                                className={`flex-1 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${activeTab === 'stake' ? 'bg-sol-green text-black shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                            >
                                Stake
                            </button>
                            <button
                                onClick={() => { setActiveTab('unstake'); setAmount(''); }}
                                className={`flex-1 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${activeTab === 'unstake' ? 'bg-sol-purple text-white shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                            >
                                Unstake
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">
                                    {activeTab === 'stake' ? 'Available to Stake' : 'Available to Unstake'}
                                </span>
                                <span className="font-mono font-bold text-white flex items-center gap-2">
                                    <Wallet size={14} className="text-gray-500"/>
                                    {activeTab === 'stake' ? spxBalance.toLocaleString() : stakedBalance.toLocaleString()} SPX
                                </span>
                            </div>

                            <div className="relative">
                                <div className="absolute right-3 top-3 flex gap-2">
                                    <button onClick={() => setAmount(((activeTab === 'stake' ? spxBalance : stakedBalance) * 0.25).toFixed(2))} className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-gray-300 font-bold transition-colors">25%</button>
                                    <button onClick={() => setAmount(((activeTab === 'stake' ? spxBalance : stakedBalance) * 0.5).toFixed(2))} className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-gray-300 font-bold transition-colors">50%</button>
                                    <button onClick={handleMax} className="text-[10px] bg-sol-green/20 hover:bg-sol-green/30 text-sol-green px-2 py-1 rounded font-bold transition-colors">MAX</button>
                                </div>
                                <input 
                                    type="number" 
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-6 text-2xl font-mono text-white focus:outline-none focus:border-sol-green transition-colors"
                                />
                            </div>

                            <div className="bg-white/5 rounded-xl p-4 border border-white/5 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Exchange Rate</span>
                                    <span className="text-white font-mono">1 SPX = 1 sSPX</span>
                                </div>
                                {activeTab === 'stake' ? (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Est. Annual Reward</span>
                                        <span className="text-sol-green font-mono font-bold">
                                            {amount ? (parseFloat(amount) * (poolInfo.apy / 100)).toFixed(2) : '0.00'} SPX
                                        </span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between text-sm items-center">
                                            <span className="text-gray-400">Unstaking Fee</span>
                                            {feePercent > 0 ? (
                                                <span className="text-red-500 font-mono font-bold flex items-center gap-1">
                                                    {feePercent.toFixed(2)}% (Early Exit) <AlertCircle size={12}/>
                                                </span>
                                            ) : (
                                                <span className="text-green-500 font-mono font-bold">0.00% (Cooldown Passed)</span>
                                            )}
                                        </div>
                                        {feePercent > 0 && (
                                            <div className="flex justify-between text-sm border-t border-white/5 pt-2">
                                                <span className="text-gray-400">You Receive</span>
                                                <span className="text-white font-mono font-bold">
                                                    {amount ? returnAmount.toLocaleString() : '0.00'} SPX
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <Button 
                                fullWidth 
                                size="lg" 
                                variant={activeTab === 'stake' ? 'primary' : 'secondary'}
                                onClick={handleAction}
                                disabled={!amount || parseFloat(amount) <= 0 || isProcessing || (activeTab === 'stake' ? parseFloat(amount) > spxBalance : parseFloat(amount) > stakedBalance)}
                                className={activeTab === 'stake' ? 'shadow-[0_0_20px_rgba(0,255,174,0.3)]' : ''}
                            >
                                {isProcessing ? 'Processing on Solana...' : (activeTab === 'stake' ? 'STAKE SPX' : feePercent > 0 ? `UNSTAKE (${feePercent}% FEE)` : 'UNSTAKE SPX')}
                            </Button>

                            <p className="text-xs text-center text-gray-500">
                                By staking, you agree to the smart contract terms. <br/>
                                7-day cooldown applies for unstaking without 2% fee.
                            </p>
                        </div>
                    </Card>

                    {/* How It Works */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="bg-sol-green/10 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                                <Lock size={20} className="text-sol-green" />
                            </div>
                            <h3 className="font-bold text-white text-sm mb-1">1. Stake SPX</h3>
                            <p className="text-xs text-gray-400">Deposit your tokens into the audited smart contract vault.</p>
                        </div>
                         <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="bg-sol-blue/10 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                                <Zap size={20} className="text-sol-blue" />
                            </div>
                            <h3 className="font-bold text-white text-sm mb-1">2. Accrue Yield</h3>
                            <p className="text-xs text-gray-400">Rewards compound automatically. {PROTOCOL_FEE_SPLIT.buyback}% of revenue burns supply.</p>
                        </div>
                         <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="bg-sol-purple/10 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                                <RefreshCw size={20} className="text-sol-purple" />
                            </div>
                            <h3 className="font-bold text-white text-sm mb-1">3. Claim Anytime</h3>
                            <p className="text-xs text-gray-400">Withdraw your rewards instantly or restake to compound.</p>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: User Stats */}
                <div className="space-y-6">
                    {/* My Position Card */}
                    <Card className="bg-gradient-to-br from-[#1A1A24] to-[#13131F] border-sol-purple/30 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-24 bg-sol-purple/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
                        
                        <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2 relative z-10">
                            <Layers size={16} /> My Position
                        </h3>

                        <div className="space-y-6 relative z-10">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Staked Balance</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-mono font-bold text-white">{stakedBalance.toLocaleString()}</span>
                                    <span className="text-sm text-sol-purple font-bold">SPX</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">≈ ${(stakedBalance * poolInfo.tokenPrice).toLocaleString()} USD</p>
                            </div>

                             <div>
                                <p className="text-xs text-gray-500 mb-1">Unclaimed Rewards</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-mono font-bold text-sol-green animate-pulse">{pendingRewards.toFixed(5)}</span>
                                    <span className="text-sm text-sol-green font-bold">SPX</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">≈ ${(pendingRewards * poolInfo.tokenPrice).toFixed(4)} USD</p>
                            </div>
                            
                            <Button fullWidth onClick={handleClaim} disabled={pendingRewards <= 0 || isProcessing} className="shadow-[0_0_15px_rgba(138,66,255,0.3)] bg-gradient-to-r from-sol-purple to-sol-blue hover:from-sol-purple/90 hover:to-sol-blue/90">
                                {isProcessing ? 'Processing...' : 'Claim Rewards'}
                            </Button>
                        </div>
                    </Card>
                    
                    {/* Token Info Card */}
                    <Card className="bg-white/5 border-white/10">
                        <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Coins size={16} className="text-yellow-500" /> Token Info
                        </h3>
                        <div className="space-y-3">
                             <div className="flex justify-between items-center p-3 bg-black/40 rounded-lg border border-white/5">
                                <span className="text-gray-400 text-xs">Price</span>
                                <span className="text-white font-mono font-bold">${poolInfo.tokenPrice}</span>
                             </div>
                             <div className="flex justify-between items-center p-3 bg-black/40 rounded-lg border border-white/5">
                                <span className="text-gray-400 text-xs">Contract</span>
                                <span className="text-sol-blue text-xs font-mono truncate max-w-[120px]">SPX...92x</span>
                             </div>
                             <div className="flex justify-between items-center p-3 bg-black/40 rounded-lg border border-white/5">
                                <span className="text-gray-400 text-xs">Wallet Balance</span>
                                <span className="text-white text-xs font-mono">{spxBalance.toLocaleString()} SPX</span>
                             </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <a href="#" className="flex items-center justify-between text-xs text-gray-400 hover:text-white transition-colors group">
                                Buy SPX on Jupiter <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform"/>
                            </a>
                        </div>
                    </Card>
                </div>
            </div>

        </div>
    );
};
