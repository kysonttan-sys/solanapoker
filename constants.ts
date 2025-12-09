
import { PokerTable, Speed, Tournament, GameStats, User, GameType } from './types';

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

// Issue #15: Rake Distribution Model (Compliant with Documentation)
// Base Rake: 3-5% depending on VIP level
// Example: $100 pot with 3% rake = $3 total rake collected
//
// DISTRIBUTION BREAKDOWN:
// 1. Host Share: 30-40% (based on Host Tier)
//    - Dealer (Tier 0): 30% of rake
//    - Casino Mogul (Tier 4): 40% of rake
// 2. Referrer Share: 5-20% (based on Referral Tier)
//    - Scout (Tier 0): 5% of rake
//    - Partner (Tier 3): 20% of rake
// 3. Protocol Allocations (from remaining rake after host + referrer):
//    - Community Jackpot: 5%
//    - Global Partner Pool: 5%
//    - Developer Treasury: Remainder (typically 30-40%)
//
// EXAMPLE CALCULATION:
// Pot: $100, Rake: 3% = $3
// - Host (Tier 2, 35%): $1.05
// - Referrer (Tier 1, 10%): $0.30
// - Remaining: $1.65
//   * Jackpot (5% of $3): $0.15
//   * Global Pool (5% of $3): $0.15
//   * Developer (remainder): $1.35
// Total: $3.00 ✓

export const PROTOCOL_FEE_SPLIT = {
    jackpot: 5,    // 5% of total rake to Community Jackpot
    globalPool: 5, // 5% of total rake to Global Partner Pool (Rank 3 Referrers)
    referrerMax: 20, // Max Referrer commission (Partner Rank 3)
    referrerMin: 5,  // Min Referrer commission (Scout Rank 0)
    hostMax: 40,     // Max Host share (Casino Mogul Tier 4)
    hostMin: 30,     // Min Host share (Dealer Tier 0)
    // Developer receives remainder after all allocations
    // Formula: developer = rake - (host + referrer + jackpot + globalPool)
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
    rank: 0, 
    name: 'Scout', 
    commission: 5, 
    color: 'text-gray-400', 
    req: 'Active Player (1+ Hand)',
    nextReq: 'Recruit 3 Friends + 100 Team Hands'
  },
  { 
    rank: 1, 
    name: 'Agent', 
    commission: 10, 
    color: 'text-sol-blue', 
    req: '3 Directs (1,000 Hands each)',
    nextReq: 'Help 3 Directs reach Agent Rank'
  },
  { 
    rank: 2, 
    name: 'Broker', 
    commission: 15, 
    color: 'text-sol-purple', 
    req: '3 Direct Agents',
    nextReq: 'Help 3 Directs reach Broker Rank'
  },
  { 
    rank: 3, 
    name: 'Partner', 
    commission: 20, 
    color: 'text-sol-green', 
    req: '3 Direct Brokers',
    nextReq: 'Global Revenue Share'
  },
];

// UPDATED: Range 30% - 40%
export const HOST_TIERS = [
  { rank: 0, name: 'Dealer', minRevenue: 0, share: 30, color: 'text-gray-400', icon: '♣️' },
  { rank: 1, name: 'Pit Boss', minRevenue: 1000, share: 32.5, color: 'text-sol-blue', icon: '♦️' },
  { rank: 2, name: 'Floor Manager', minRevenue: 5000, share: 35, color: 'text-sol-purple', icon: '♥️' },
  { rank: 3, name: 'Director', minRevenue: 25000, share: 37.5, color: 'text-sol-green', icon: '♠️' },
  { rank: 4, name: 'Casino Mogul', minRevenue: 100000, share: 40, color: 'text-yellow-500', icon: '👑' },
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

export const getHostStatus = (revenue: number) => {
    const currentLevelIndex = HOST_TIERS.slice().reverse().findIndex(lvl => revenue >= lvl.minRevenue);
    const index = currentLevelIndex >= 0 ? (HOST_TIERS.length - 1 - currentLevelIndex) : 0;

    const current = HOST_TIERS[index];
    const next = HOST_TIERS[index + 1];

    let progress = 100;
    let revenueToNext = 0;

    if (next) {
        const range = next.minRevenue - current.minRevenue;
        const gained = revenue - current.minRevenue;
        progress = Math.min(100, Math.floor((gained / range) * 100));
        revenueToNext = next.minRevenue - revenue;
    }

    return { ...current, nextLevel: next, progress, revenueToNext };
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
  referralRank: 3, 
  hostRank: 4, // Casino Mogul (40% Share)
  ecosystemStats: {
    totalReferrals: 142,
    directReferrals: 12,
    networkHands: 25400,
    referralEarnings: 450.25,
    tablesCreated: 5,
    hostEarnings: 125.80,
    totalHostRevenueGenerated: 125000, // Fits Mogul range (100000+)
    pendingRewards: 576.05,
    directAgents: 4,
    directBrokers: 3
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

export const MOCK_TOURNAMENTS: Tournament[] = [
  {
    id: 'tour1',
    name: 'Solana Sunday Million',
    buyIn: 100,
    prizePool: 50000,
    registeredPlayers: 342,
    maxPlayers: 1000,
    startTime: new Date(Date.now() + 86400000).toISOString(),
    speed: Speed.REGULAR,
    status: 'REGISTERING',
    winnersCount: '150',
    distribution: 'Standard',
    startingChips: 10000,
    seats: 9
  },
  {
    id: 'tour2',
    name: 'Daily Hyper',
    buyIn: 10,
    prizePool: 2000,
    registeredPlayers: 150,
    maxPlayers: 200,
    startTime: new Date(Date.now() + 3600000).toISOString(),
    speed: Speed.HYPER,
    status: 'REGISTERING',
    winnersCount: '20',
    distribution: 'Top 10%',
    startingChips: 5000,
    seats: 6
  }
];

export const MOCK_STATS: GameStats = {
  totalHands: 15420, // This puts the mock user in 'Shark' tier
  winRate: 5.4,
  totalWinnings: 12450.00,
  roi: 12.5,
  bestHand: 'Royal Flush',
  tournamentsPlayed: 45,
  tournamentsWon: 3
};

// Added ecosystemEarnings and networkVolume for Leaderboard toggles
export const LEADERBOARD_DATA = [
  { id: 'u2', rank: 1, player: 'PhantomAce', winnings: 154000, hands: 105020, ecosystemEarnings: 4200.50, networkVolume: 250000 },
  { id: 'u3', rank: 2, player: 'SolDegen', winnings: 98000, hands: 12300, ecosystemEarnings: 28500.00, networkVolume: 1850000 }, // Top Earner
  { id: 'u4', rank: 3, player: 'MoonBag', winnings: 87500, hands: 8400, ecosystemEarnings: 1250.25, networkVolume: 85000 },
  { id: 'u5', rank: 4, player: 'HODLer_Pro', winnings: 65000, hands: 3200, ecosystemEarnings: 850.00, networkVolume: 42000 },
  { id: 'u6', rank: 5, player: 'PaperHands', winnings: 42000, hands: 500, ecosystemEarnings: 120.00, networkVolume: 5000 },
];
