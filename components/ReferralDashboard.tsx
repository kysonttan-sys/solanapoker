import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, DollarSign, Award, Copy, Check, Share2, ChevronRight, ChevronDown, ExternalLink } from 'lucide-react';
import { Card } from './ui/Card';
import { getApiUrl } from '../utils/api';

interface ReferralStats {
    totalReferrals: number;
    directReferrals: number;
    level2Referrals: number;
    level3Referrals: number;
    totalEarnings: number;
    thisMonthEarnings: number;
    referralCode: string;
    rank: number;
    rankName: string;
    nextRankRequirements: {
        requirement: string;
        directsNeeded: number;
        currentProgress: number;
    } | null;
}

interface Referral {
    id: string;
    username: string;
    joinedAt: string;
    level: number;
    totalHands: number;
    earnings: number;
    children?: Referral[];
}

export const ReferralDashboard: React.FC<{ userId: string }> = ({ userId }) => {
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchReferralData();
    }, [userId]);

    const fetchReferralData = async () => {
        try {
            const response = await fetch(`${getApiUrl()}/api/referrals/${userId}`);
            const data = await response.json();
            setStats(data.stats);
            setReferrals(data.tree);
        } catch (error) {
            console.error('Failed to fetch referral data:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyReferralLink = () => {
        if (!stats) return;
        const link = `${window.location.origin}/ref/${stats.referralCode}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleNode = (id: string) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedNodes(newExpanded);
    };

    const getRankColor = (rank: number) => {
        switch (rank) {
            case 0: return 'text-gray-400';
            case 1: return 'text-blue-400';
            case 2: return 'text-purple-400';
            case 3: return 'text-yellow-400';
            default: return 'text-gray-400';
        }
    };

    const getRankBadge = (rank: number, rankName: string) => {
        const colors = {
            0: 'bg-gray-600',
            1: 'bg-blue-600',
            2: 'bg-purple-600',
            3: 'bg-yellow-600',
        };
        return (
            <span className={`${colors[rank as keyof typeof colors] || 'bg-gray-600'} text-white text-xs px-2 py-1 rounded-full`}>
                {rankName}
            </span>
        );
    };

    const ReferralTreeNode: React.FC<{ referral: Referral; depth: number }> = ({ referral, depth }) => {
        const hasChildren = referral.children && referral.children.length > 0;
        const isExpanded = expandedNodes.has(referral.id);

        return (
            <div className="ml-4">
                <div
                    className={`flex items-center gap-2 p-2 rounded-lg mb-1 ${
                        depth === 1 ? 'bg-blue-900/20 border-l-2 border-blue-500' :
                        depth === 2 ? 'bg-purple-900/20 border-l-2 border-purple-500' :
                        'bg-gray-900/20 border-l-2 border-gray-500'
                    }`}
                >
                    {hasChildren && (
                        <button onClick={() => toggleNode(referral.id)} className="text-gray-400 hover:text-white">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                    )}
                    {!hasChildren && <div className="w-4" />}

                    <Users size={14} className="text-gray-500" />
                    <span className="text-sm text-white font-medium">{referral.username}</span>
                    <span className="text-xs text-gray-500">L{referral.level}</span>

                    <div className="flex-1"></div>

                    <span className="text-xs text-gray-400">{referral.totalHands} hands</span>
                    <span className="text-xs text-sol-green font-semibold">${referral.earnings.toFixed(2)}</span>
                </div>

                {hasChildren && isExpanded && (
                    <div className="ml-4">
                        {referral.children?.map(child => (
                            <ReferralTreeNode key={child.id} referral={child} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sol-green"></div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center py-12 text-gray-400">
                Failed to load referral data
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-900/30 to-blue-900/10 border-blue-500/30">
                    <div className="flex items-center justify-between mb-2">
                        <Users className="text-blue-400" size={24} />
                        <span className="text-2xl font-bold text-white">{stats.totalReferrals}</span>
                    </div>
                    <div className="text-sm text-gray-400">Total Network</div>
                    <div className="text-xs text-blue-300 mt-1">
                        L1: {stats.directReferrals} | L2: {stats.level2Referrals} | L3: {stats.level3Referrals}
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-green-900/30 to-green-900/10 border-green-500/30">
                    <div className="flex items-center justify-between mb-2">
                        <DollarSign className="text-green-400" size={24} />
                        <span className="text-2xl font-bold text-white">${stats.totalEarnings.toFixed(2)}</span>
                    </div>
                    <div className="text-sm text-gray-400">Total Earnings</div>
                    <div className="text-xs text-green-300 mt-1">
                        This month: ${stats.thisMonthEarnings.toFixed(2)}
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-purple-900/30 to-purple-900/10 border-purple-500/30">
                    <div className="flex items-center justify-between mb-2">
                        <Award className={getRankColor(stats.rank)} size={24} />
                        {getRankBadge(stats.rank, stats.rankName)}
                    </div>
                    <div className="text-sm text-gray-400">Current Rank</div>
                    <div className="text-xs text-purple-300 mt-1">
                        Commission: {[5, 10, 15, 20][stats.rank]}%
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-900/30 to-yellow-900/10 border-yellow-500/30">
                    <div className="flex items-center justify-between mb-2">
                        <TrendingUp className="text-yellow-400" size={24} />
                        {stats.nextRankRequirements ? (
                            <span className="text-sm text-white">Next: {['Scout', 'Agent', 'Broker', 'Partner'][stats.rank + 1]}</span>
                        ) : (
                            <span className="text-sm text-yellow-400">Max Rank!</span>
                        )}
                    </div>
                    <div className="text-sm text-gray-400">Progress</div>
                    {stats.nextRankRequirements && (
                        <div className="text-xs text-yellow-300 mt-1">
                            {stats.nextRankRequirements.currentProgress}/{stats.nextRankRequirements.currentProgress + stats.nextRankRequirements.directsNeeded} - {stats.nextRankRequirements.requirement}
                        </div>
                    )}
                </Card>
            </div>

            {/* Referral Link */}
            <Card>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Share2 size={20} className="text-sol-green" />
                    Your Referral Link
                </h3>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={`${window.location.origin}/ref/${stats.referralCode}`}
                        readOnly
                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white font-mono"
                    />
                    <button
                        onClick={copyReferralLink}
                        className="bg-sol-green hover:bg-sol-green/90 text-black font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                    >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                    Share this link to earn {[5, 10, 15, 20][stats.rank]}% commission on your referrals' rake!
                </p>
            </Card>

            {/* Commission Structure */}
            <Card>
                <h3 className="text-lg font-bold text-white mb-4">Commission Structure</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {[
                        { rank: 'Scout', commission: '5%', color: 'gray', requirement: 'Active Player (1+ Hand)' },
                        { rank: 'Agent', commission: '10%', color: 'blue', requirement: '3 Directs (1,000 Hands each)' },
                        { rank: 'Broker', commission: '15%', color: 'purple', requirement: '3 Direct Agents' },
                        { rank: 'Partner', commission: '20%', color: 'yellow', requirement: '3 Direct Brokers' }
                    ].map((tier, idx) => (
                        <div
                            key={tier.rank}
                            className={`p-4 rounded-lg border ${
                                stats.rank === idx
                                    ? `bg-${tier.color}-900/30 border-${tier.color}-500`
                                    : 'bg-gray-900/20 border-gray-700'
                            }`}
                        >
                            <div className="font-bold text-white mb-1">{tier.rank}</div>
                            <div className={`text-2xl font-bold text-${tier.color}-400 mb-1`}>{tier.commission}</div>
                            <div className="text-xs text-gray-400">{tier.requirement}</div>
                            {stats.rank === idx && (
                                <div className="text-xs text-green-400 mt-2">✓ Current</div>
                            )}
                        </div>
                    ))}
                </div>
            </Card>

            {/* Referral Tree */}
            <Card>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Users size={20} className="text-sol-blue" />
                    Referral Network ({stats.totalReferrals} total)
                </h3>

                {referrals.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <Users size={48} className="mx-auto mb-3 opacity-50" />
                        <p>No referrals yet. Share your link to start earning!</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {referrals.map(referral => (
                            <ReferralTreeNode key={referral.id} referral={referral} depth={1} />
                        ))}
                    </div>
                )}
            </Card>

            {/* How It Works */}
            <Card className="bg-blue-900/10 border-blue-500/20">
                <h3 className="text-lg font-bold text-white mb-3">How Referrals Work</h3>
                <div className="space-y-2 text-sm text-gray-300">
                    <p>• Share your referral link with friends</p>
                    <p>• Earn {[5, 10, 15, 20][stats.rank]}% commission every time they play poker</p>
                    <p>• Build a 3-level deep network (you earn from all levels!)</p>
                    <p>• Rank up by helping your team advance: Scout → Agent (3 active players) → Broker (3 Agents) → Partner (3 Brokers)</p>
                    <p>• Commissions paid instantly to your balance</p>
                </div>
            </Card>
        </div>
    );
};
