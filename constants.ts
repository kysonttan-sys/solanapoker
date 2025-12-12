
import { PokerTable, Speed, GameStats, User, GameType } from './types';

export const APP_NAME = "SOLPOKER X";

// The Program ID you deployed to Devnet/Testnet
export const SOL_POKER_PROGRAM_ID = 'FMuPdx45D9yvsGTVPBJuZ4SVK7zTDbYuGCLnDz2CW8cR';

// FOR DEMO: We treat the Mock User's wallet as the Admin Wallet so you can access the page immediately.
// In production, change this to your actual cold wallet address.
export const ADMIN_WALLET_ADDRESS = 'GvYPMAk8CddRucjwLHDud1yy51QQtQDhgiB9AWdRtAoD'; 

export const PRIZE_POOL_INFO = {
    currentAmount: 0, // Starts from 0, accumulates 5% of rake
    nextPayout: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    distribution: {
        topPlayer: 30,  // 30% to Top 3 Players by hands (50%/30%/20% tiered)
        topEarner: 30,  // 30% to Top 3 Earners by profit (50%/30%/20% tiered)
        luckyDraw: 40   // 40% to 10 Lucky Random Winners (equal split)
    }
};

// Hybrid Override Referral Model (v1.1)
// Base Rake: 3-5% depending on VIP level
// Example: $60 pot with 5% rake = $3 total rake collected
//
// DISTRIBUTION BREAKDOWN:
// 1. Referral Overrides: 0-60% (based on Hybrid Override Model)
//    - Direct upline (Level 1) gets FULL rank %
//    - Indirect uplines (Level 2+) get override difference
//    - Max 60% when Master exists in chain
// 2. Protocol Allocations:
//    - Community Jackpot: 5%
//    - Global Partner Pool: 5% (distributed weekly to Masters)
//    - Developer Treasury: Remainder (minimum 30% when Master exists)
//
// EXAMPLE CALCULATION (from RAKE_DISTRIBUTION_GUIDE.md Example 1):
// Pot: $60, Rake: 5% = $3.00
// Chain: Master (60%) → Broker (35%) → Agent (20%) → Free (0%)
// - Agent (Direct upline): 20% = $0.60
// - Broker (Override): 35% - 20% = 15% = $0.45
// - Master (Override): 60% - 35% = 25% = $0.75
// - Total Referral: $1.80 (60%)
// - Jackpot (5%): $0.15
// - Global Pool (5%): $0.15
// - Developer (30%): $0.90
// Total: $3.00 ✓

export const PROTOCOL_FEE_SPLIT = {
    jackpot: 5,         // 5% of total rake to Community Jackpot
    globalPool: 5,      // 5% of total rake to Global Partner Pool (Masters only)
    referrerMax: 60,    // Max Referral overrides (60% when Master in chain)
    referrerMin: 0,     // Min Referral overrides (0% when no referrer)
    developerMin: 30,   // Min Developer share (30% when Master exists)
    developerMax: 90,   // Max Developer share (90% when no referrer)
    // Developer receives remainder after all allocations
    // Formula: developer = rake - (referralOverrides + jackpot + globalPool)
};

export const VIP_LEVELS = [
  { name: 'Fish', minHands: 0, rake: 0.05, cap: 5, icon: '🐟', color: 'text-gray-400', desc: 'Beginner' },
  { name: 'Grinder', minHands: 1000, rake: 0.045, cap: 4.5, icon: '🔨', color: 'text-blue-400', desc: 'Dedicated' },
  { name: 'Shark', minHands: 5000, rake: 0.04, cap: 4, icon: '🦈', color: 'text-purple-400', desc: 'Pro' },
  { name: 'High Roller', minHands: 20000, rake: 0.035, cap: 3.5, icon: '💎', color: 'text-pink-500', desc: 'Elite' },
  { name: 'Legend', minHands: 100000, rake: 0.03, cap: 3, icon: '👑', color: 'text-yellow-400', desc: 'Godlike' },
];

export const REFERRAL_TIERS = [
  {
    rank: 'FREE',
    name: 'Free User',
    commission: 0,
    color: 'text-gray-400',
    req: 'Default (can play, cannot earn)',
    nextReq: 'Recruit 3 Directs with 1,000+ Hands each'
  },
  {
    rank: 'AGENT',
    name: 'Agent',
    commission: 20,
    color: 'text-sol-blue',
    req: '3 Direct Referrals with 1,000+ Hands EACH',
    nextReq: 'Help 3 Directs reach Agent Rank'
  },
  {
    rank: 'BROKER',
    name: 'Broker',
    commission: 35,
    color: 'text-sol-purple',
    req: '3 Direct Agents',
    nextReq: 'Help 3 Directs reach Broker Rank'
  },
  {
    rank: 'PARTNER',
    name: 'Partner',
    commission: 50,
    color: 'text-sol-green',
    req: '3 Direct Brokers',
    nextReq: 'Help 3 Directs reach Partner Rank'
  },
  {
    rank: 'MASTER',
    name: 'Master',
    commission: 60,
    color: 'text-yellow-500',
    req: '3 Direct Partners',
    nextReq: 'Weekly Global Pool Distribution'
  },
];

export const getVipStatus = (hands: number) => {
    // Find the highest level achieved
    const currentLevelIndex = VIP_LEVELS.slice().reverse().findIndex(lvl => hands >= lvl.minHands);
    // Reverse index fix
    const index = currentLevelIndex >= 0 ? (VIP_LEVELS.length - 1 - currentLevelIndex) : 0;
    
    const current = VIP_LEVELS[index];
    const next = VIP_LEVELS[index + 1];
    
    let progress = 100;
    let handsToNext = 0;
    
    if (next) {
        const range = next.minHands - current.minHands;
        const gained = hands - current.minHands;
        progress = Math.min(100, Math.floor((gained / range) * 100));
        handsToNext = next.minHands - hands;
    }

    return { ...current, nextLevel: next, progress, handsToNext };
};

export const MOCK_USER: User = {
  id: 'u1',
  walletAddress: ADMIN_WALLET_ADDRESS,
  username: 'SolanaShark',
  avatarUrl: 'https://picsum.photos/200/200',
  email: 'shark@solpokerx.io',
  bio: 'All in or nothing. Solana believer.',
  balance: 5430.50,
  totalHands: 15420, // Sync with MOCK_STATS
  friends: ['u2', 'u3', 'u5'], // PhantomAce, SolDegen, HODLer_Pro
  preferences: {
    showWinRate: true,
    showPnL: true,
    incognito: false,
    hideBalance: false,
    allowFriendRequests: true
  },
  isVerified: false,
  referralCode: 'SHARK77',
  referralRank: 'PARTNER', // Partner rank (50% commission)
  ecosystemStats: {
    totalReferrals: 142,
    directReferrals: 12,
    networkHands: 25400,
    referralEarnings: 450.25,
    pendingRewards: 576.05,
    directAgents: 4,
    directBrokers: 3,
    directPartners: 0 // Need 3 direct Partners to become Master
  }
};

export const MOCK_TABLES: PokerTable[] = [
  {
    id: 't1',
    name: 'Neon Nights #1',
    creatorId: 'u1',
    smallBlind: 1,
    bigBlind: 2,
    seats: 6,
    occupiedSeats: 4,
    buyInMin: 100,
    buyInMax: 200,
    speed: Speed.REGULAR,
    rakeCap: 5,
    type: GameType.CASH
  },
  {
    id: 'table_whale_9', // CHANGED ID to force new table state on server
    name: 'Whale Pool',
    smallBlind: 5,
    bigBlind: 10,
    seats: 9,
    occupiedSeats: 7,
    buyInMin: 500,
    buyInMax: 2000,
    speed: Speed.TURBO,
    rakeCap: 10,
    type: GameType.CASH
  },
  {
    id: 't3',
    name: 'Beginner Luck',
    smallBlind: 0.5,
    bigBlind: 1,
    seats: 6,
    occupiedSeats: 2,
    buyInMin: 50,
    buyInMax: 100,
    speed: Speed.HYPER,
    rakeCap: 3,
    type: GameType.CASH
  },
  {
    id: 't4',
    name: 'Casual Play',
    smallBlind: 50,
    bigBlind: 100,
    seats: 6,
    occupiedSeats: 3,
    buyInMin: 10000,
    buyInMax: 10000,
    speed: Speed.REGULAR,
    rakeCap: 0,
    type: GameType.FUN
  }
];

export const MOCK_STATS: GameStats = {
  totalHands: 15420, // This puts the mock user in 'Shark' tier
  winRate: 5.4,
  totalWinnings: 12450.00,
  roi: 12.5,
  bestHand: 'Royal Flush'
};

// Added ecosystemEarnings and networkVolume for Leaderboard toggles
export const LEADERBOARD_DATA = [
  { id: 'u2', rank: 1, player: 'PhantomAce', winnings: 154000, hands: 105020, ecosystemEarnings: 4200.50, networkVolume: 250000 },
  { id: 'u3', rank: 2, player: 'SolDegen', winnings: 98000, hands: 12300, ecosystemEarnings: 28500.00, networkVolume: 1850000 }, // Top Earner
  { id: 'u4', rank: 3, player: 'MoonBag', winnings: 87500, hands: 8400, ecosystemEarnings: 1250.25, networkVolume: 85000 },
  { id: 'u5', rank: 4, player: 'HODLer_Pro', winnings: 65000, hands: 3200, ecosystemEarnings: 850.00, networkVolume: 42000 },
  { id: 'u6', rank: 5, player: 'PaperHands', winnings: 42000, hands: 500, ecosystemEarnings: 120.00, networkVolume: 5000 },
];
