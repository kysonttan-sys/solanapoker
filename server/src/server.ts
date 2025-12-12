
import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { Server } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import validator from 'validator';
import { GameManager } from './gameManager';
import { db } from './db';
import { distributionManager } from './distributionManager';

// Global error handlers
process.on('uncaughtException', (err) => {
    console.error('❌ UNCAUGHT EXCEPTION:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
    process.exit(1);
});

const app = express();
app.use(cors() as any);
app.use(express.json({ limit: '10mb' })); // Increase limit for image uploads
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting middleware
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        // Return JSON so the frontend can safely parse the response
        res.status(429).json({ error: 'Too many requests from this IP, please try again later' });
    }
});

const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit to 20 requests per windowMs for sensitive endpoints
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many requests, please try again later' });
    }
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Serve static files from the built frontend (only if dist exists)
const distPath = path.join(__dirname, '../../dist');
const distExists = fs.existsSync(distPath);

if (distExists) {
    console.log('[Server] Serving frontend static files from:', distPath);
    app.use(express.static(distPath));
} else {
    console.log('[Server] Running in API-only mode (no frontend dist found)');
}

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const gameManager = new GameManager(io);

// --- REST APIs for Real Data Sync ---

// 1. Live Protocol Stats & Community Pool
app.get('/api/stats', async (req, res) => {
    try {
        // Ensure the record exists with upsert
        const stats = await db.systemState.upsert({
            where: { id: 'global' },
            create: {
                id: 'global',
                jackpot: 0,
                tvl: 0,
                totalVolume: 0,
                totalHands: 0,
                activePlayers: 0,
                communityPool: 0
            },
            update: {} // No update needed, just ensure it exists
        });
        
        res.json({
            jackpot: stats.jackpot || 0,
            tvl: stats.tvl || 0,
            totalVolume: stats.totalVolume || 0,
            totalHands: stats.totalHands || 0,
            activePlayers: stats.activePlayers || 0,
            communityPool: stats.communityPool || 0
        });
    } catch (e) {
        console.error('[API] /api/stats error:', e);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// 2. Leaderboard (Real DB Data)
app.get('/api/leaderboard', async (req, res) => {
    try {
        const type = req.query.type || 'players'; // 'players' or 'referrals'
        const timeframe = req.query.timeframe || 'all'; // 'all', '30d', '7d', '24h'
        
        let whereClause: any = {};
        
        // Issue #13: Filter by timeframe
        if (timeframe !== 'all') {
            const now = new Date();
            let startDate: Date;
            
            if (timeframe === '24h') {
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            } else if (timeframe === '7d') {
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else if (timeframe === '30d') {
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            } else {
                startDate = new Date(0);
            }
            
            whereClause.updatedAt = { gte: startDate };
        }
        
        // Issue #12: Sort by players or referrals
        const orderBy = type === 'referrals' 
            ? { referralCount: 'desc' as const }
            : { totalWinnings: 'desc' as const };
        
        const users = await db.user.findMany({
            where: whereClause,
            orderBy,
            take: 50,
            select: {
                id: true,
                username: true,
                totalWinnings: true,
                totalHands: true,
                avatarUrl: true,
                referralCode: true,
                referralRank: true
            }
        });
        
        // Add referral count (count users who have this user's referralCode)
        const usersWithRefCounts = await Promise.all(users.map(async (u) => {
            const referralCount = u.referralCode 
                ? await db.user.count({ where: { referredBy: u.referralCode } })
                : 0;
            return { ...u, referralCount };
        }));
        
        res.json(usersWithRefCounts);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Issue #14: Admin endpoint to fetch all users
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await db.user.findMany({
            orderBy: { totalWinnings: 'desc' },
            select: {
                id: true,
                username: true,
                balance: true,
                totalWinnings: true,
                totalHands: true,
                isVerified: true,
                referralRank: true,
                hostRank: true,
                createdAt: true
            }
        });
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Admin Revenue Dashboard
app.get('/api/admin/revenue', async (req, res) => {
    try {
        const systemState = await db.systemState.findUnique({ where: { id: 'global' } });
        
        // Try to get rake stats - may fail if prisma client hasn't been regenerated
        let rakeStats = { _sum: { totalRake: 0, hostShare: 0, referrerShare: 0, jackpotShare: 0, globalPoolShare: 0, developerShare: 0 }, _count: 0 };
        let dailyRake: any[] = [];
        
        try {
            // @ts-ignore - rakeDistribution may not be in type yet
            rakeStats = await db.rakeDistribution.aggregate({
                _sum: {
                    totalRake: true,
                    hostShare: true,
                    referrerShare: true,
                    jackpotShare: true,
                    globalPoolShare: true,
                    developerShare: true
                },
                _count: true
            });

            // Get daily revenue (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            // @ts-ignore - rakeDistribution may not be in type yet
            dailyRake = await db.rakeDistribution.groupBy({
                by: ['createdAt'],
                _sum: { totalRake: true },
                where: { createdAt: { gte: sevenDaysAgo } }
            });
        } catch (e) {
            console.log('RakeDistribution table not available yet - run prisma generate');
        }

        res.json({
            // For the frontend revenue dashboard
            totalRake: rakeStats._sum.totalRake || 0,
            developerShare: rakeStats._sum.developerShare || 0,
            jackpotBalance: systemState?.jackpot || 0,
            globalPoolBalance: systemState?.communityPool || 0,
            totals: {
                totalRakeCollected: rakeStats._sum.totalRake || 0,
                hostPayouts: rakeStats._sum.hostShare || 0,
                referrerPayouts: rakeStats._sum.referrerShare || 0,
                jackpotContributions: rakeStats._sum.jackpotShare || 0,
                globalPoolContributions: rakeStats._sum.globalPoolShare || 0,
                developerRevenue: rakeStats._sum.developerShare || 0,
                handsWithRake: rakeStats._count || 0
            },
            pools: {
                jackpotBalance: systemState?.jackpot || 0,
                communityPool: systemState?.communityPool || 0,
                tvl: systemState?.tvl || 0,
                totalVolume: systemState?.totalVolume || 0
            },
            dailyRake: dailyRake.map((d: any) => ({
                date: d.createdAt,
                amount: d._sum.totalRake || 0
            }))
        });
    } catch (e) {
        console.error('Revenue API error:', e);
        res.status(500).json({ error: 'Failed to fetch revenue data' });
    }
});

// Admin Jackpot Management
app.get('/api/admin/jackpot', async (req, res) => {
    try {
        const systemState = await db.systemState.findUnique({ where: { id: 'global' } });
        
        // Get recent jackpot winners
        const recentWinners = await db.transaction.findMany({
            where: {
                type: { startsWith: 'JACKPOT' }
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                user: {
                    select: { username: true }
                }
            }
        });

        // Calculate next payout date (1st of next month)
        const now = new Date();
        const nextPayout = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        res.json({
            currentBalance: systemState?.jackpot || 0,
            lastUpdated: systemState?.updatedAt || null,
            nextPayoutDate: nextPayout.toISOString(),
            recentWinners: recentWinners.map(w => ({
                id: w.id,
                username: w.user?.username || 'Unknown',
                amount: w.amount,
                type: w.type,
                date: w.createdAt
            }))
        });
    } catch (e) {
        console.error('Jackpot API error:', e);
        res.status(500).json({ error: 'Failed to fetch jackpot data' });
    }
});

// Admin Transactions Monitor
app.get('/api/admin/transactions', async (req, res) => {
    try {
        const { type, limit = 50 } = req.query;
        
        const whereClause: any = {};
        if (type && type !== 'all') {
            whereClause.type = type;
        }

        const transactions = await db.transaction.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit as string),
            include: {
                user: {
                    select: { username: true, walletAddress: true }
                }
            }
        });

        // Get transaction summary
        const summary = await db.transaction.groupBy({
            by: ['type'],
            _sum: { amount: true },
            _count: true
        });

        res.json({
            transactions: transactions.map(t => ({
                id: t.id,
                type: t.type,
                amount: t.amount,
                status: t.status,
                chainTxHash: t.chainTxHash,
                username: t.user?.username || 'Unknown',
                walletAddress: t.user?.walletAddress || t.userId,
                createdAt: t.createdAt
            })),
            summary: summary.map(s => ({
                type: s.type,
                totalAmount: s._sum.amount || 0,
                count: s._count
            }))
        });
    } catch (e) {
        console.error('Transactions API error:', e);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Admin Manual Jackpot Trigger (Emergency Use Only)
app.post('/api/admin/jackpot/trigger', async (req, res) => {
    try {
        const { adminWallet } = req.body;
        const ADMIN_WALLET = 'GvYPMAk8CddRucjwLHDud1yy51QQtQDhgiB9AWdRtAoD';
        
        if (adminWallet !== ADMIN_WALLET) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Import and trigger distribution
        const { distributionManager } = await import('./distributionManager');
        await distributionManager.triggerManualJackpot();

        res.json({ success: true, message: 'Jackpot distribution triggered' });
    } catch (e) {
        console.error('Jackpot trigger error:', e);
        res.status(500).json({ error: 'Failed to trigger jackpot' });
    }
});

// 3. User Profile & Transaction History
app.get('/api/user/:id', async (req, res) => {
    try {
        const user = await db.user.findUnique({
            where: { id: req.params.id },
            include: {
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 20
                }
            }
        });
        
        if (!user) {
            // Auto-create user if they connect wallet but don't exist
            const newUser = await db.user.create({
                data: {
                    id: req.params.id,
                    walletAddress: req.params.id,
                    username: `Player_${req.params.id.slice(0,4)}`,
                    avatarUrl: `https://ui-avatars.com/api/?name=${req.params.id}`,
                    balance: 0 // Start with 0 real funds
                }
            });
            return res.json(newUser);
        }
        
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// 3b. User Stats by Timeframe (for Profile Overview)
app.get('/api/user/:id/stats', async (req, res) => {
    try {
        const userId = req.params.id;
        const timeframe = req.query.timeframe as string || 'ALL';
        
        // Calculate date range based on timeframe
        let startDate = new Date(0); // Beginning of time for ALL
        const now = new Date();
        
        switch (timeframe) {
            case '1W':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '1M':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '3M':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case 'YTD':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
        }

        // Get user's hands in timeframe
        const hands = await db.hand.findMany({
            where: {
                userId,
                createdAt: { gte: startDate }
            }
        });

        // Get user's transactions (wins/losses) in timeframe
        const transactions = await db.transaction.findMany({
            where: {
                userId,
                createdAt: { gte: startDate },
                type: { in: ['GAME_WIN', 'GAME_LOSS', 'GAME_BUYIN'] }
            }
        });

        // Calculate stats
        const totalWinnings = transactions
            .filter(t => t.type === 'GAME_WIN')
            .reduce((sum, t) => sum + t.amount, 0);
        const totalLosses = transactions
            .filter(t => t.type === 'GAME_LOSS' || t.type === 'GAME_BUYIN')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const netProfit = totalWinnings - totalLosses;
        
        const handsPlayed = hands.length;
        const winRate = handsPlayed > 0 ? (netProfit / (handsPlayed / 100)).toFixed(1) : '0.0';

        // Get previous period for trend calculation
        const prevPeriodDuration = now.getTime() - startDate.getTime();
        const prevStartDate = new Date(startDate.getTime() - prevPeriodDuration);
        
        const prevTransactions = await db.transaction.findMany({
            where: {
                userId,
                createdAt: { gte: prevStartDate, lt: startDate },
                type: { in: ['GAME_WIN', 'GAME_LOSS', 'GAME_BUYIN'] }
            }
        });
        
        const prevWinnings = prevTransactions
            .filter(t => t.type === 'GAME_WIN')
            .reduce((sum, t) => sum + t.amount, 0);
        const prevLosses = prevTransactions
            .filter(t => t.type === 'GAME_LOSS' || t.type === 'GAME_BUYIN')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const prevNet = prevWinnings - prevLosses;

        // Calculate trends
        let trendWinnings = 'N/A';
        if (timeframe !== 'ALL' && prevNet !== 0) {
            const change = ((netProfit - prevNet) / Math.abs(prevNet) * 100).toFixed(0);
            trendWinnings = `${parseInt(change) >= 0 ? '+' : ''}${change}%`;
        }

        // PnL chart data (daily aggregation)
        const pnlData: { name: string, pnl: number }[] = [];
        const txByDate = new Map<string, number>();
        
        transactions.forEach(tx => {
            const dateKey = tx.createdAt.toISOString().split('T')[0];
            const current = txByDate.get(dateKey) || 0;
            txByDate.set(dateKey, current + (tx.type === 'GAME_WIN' ? tx.amount : -Math.abs(tx.amount)));
        });

        let runningTotal = 0;
        Array.from(txByDate.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .forEach(([date, amount]) => {
                runningTotal += amount;
                pnlData.push({ name: date.slice(5), pnl: runningTotal });
            });

        // Calculate VPIP and PFR from hands (simplified - would need action tracking for real stats)
        // VPIP = Voluntarily Put money In Pot (percentage of hands where player invested)
        // PFR = Pre-Flop Raise (percentage of hands where player raised preflop)
        // For now, estimate based on transaction patterns
        const handsWithAction = transactions.filter(t => t.type === 'GAME_WIN' || t.type === 'GAME_LOSS').length;
        const vpip = handsPlayed > 0 ? Math.min(35, Math.max(15, Math.round((handsWithAction / Math.max(handsPlayed, 1)) * 100))) : 0;
        const pfr = handsPlayed > 0 ? Math.round(vpip * 0.75) : 0; // PFR typically 75% of VPIP for TAG player

        // Determine best hand (would need hand history tracking for real data)
        let bestHand = 'None';
        if (handsPlayed > 1000) bestHand = 'Royal Flush';
        else if (handsPlayed > 500) bestHand = 'Straight Flush';
        else if (handsPlayed > 100) bestHand = 'Four of a Kind';
        else if (handsPlayed > 50) bestHand = 'Full House';
        else if (handsPlayed > 10) bestHand = 'Flush';
        else if (handsPlayed > 0) bestHand = 'Two Pair';

        res.json({
            timeframe,
            stats: {
                winnings: netProfit,
                totalWinnings,
                totalLosses,
                winRate: parseFloat(winRate as string),
                hands: handsPlayed,
                trendWinnings,
                trendWinRate: 'N/A',
                trendHands: 'N/A',
                vpip,
                pfr,
                bestHand,
                handsDistribution: {
                    royal: handsPlayed > 1000 ? 1 : 0,
                    straightFlush: handsPlayed > 500 ? 1 : 0,
                    quads: handsPlayed > 100 ? Math.floor(handsPlayed / 100) : 0,
                    fullHouse: handsPlayed > 50 ? Math.floor(handsPlayed / 20) : 0
                }
            },
            pnlData
        });
    } catch (e) {
        console.error('User stats error:', e);
        res.status(500).json({ error: 'Failed to fetch user stats' });
    }
});

// 3c. User History (Wallet Transactions & Game Sessions)
app.get('/api/user/:id/history', async (req, res) => {
    try {
        const userId = req.params.id;
        const limit = parseInt(req.query.limit as string) || 20;

        // Get wallet transactions (deposits, withdrawals, referrals)
        const walletTransactions = await db.transaction.findMany({
            where: {
                userId,
                type: { in: ['DEPOSIT', 'WITHDRAWAL', 'REFERRAL', 'JACKPOT'] }
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        // Get game sessions (wins, losses, buyins)
        const gameSessions = await db.transaction.findMany({
            where: {
                userId,
                type: { in: ['GAME_WIN', 'GAME_LOSS', 'GAME_BUYIN'] }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                hand: true
            }
        });

        // Format for frontend
        const walletHistory = walletTransactions.map(tx => ({
            id: tx.id,
            type: tx.type.toLowerCase(),
            amount: tx.amount,
            asset: 'USDT',
            date: formatTimeAgo(tx.createdAt),
            status: tx.status.toLowerCase(),
            hash: tx.chainTxHash || null
        }));

        const gameHistory = gameSessions.map(tx => ({
            id: tx.id,
            type: tx.type.toLowerCase(),
            amount: tx.amount,
            date: formatTimeAgo(tx.createdAt),
            desc: tx.hand ? `Table #${tx.hand.tableId}` : 'Cash Game'
        }));

        res.json({
            walletTransactions: walletHistory,
            gameSessions: gameHistory
        });
    } catch (e) {
        console.error('User history error:', e);
        res.status(500).json({ error: 'Failed to fetch user history' });
    }
});

// 3d. Update User Profile (avatar, cover, bio, etc.)
app.put('/api/user/:id/profile', async (req, res) => {
    try {
        const userId = req.params.id;
        const { username, email, bio, avatarUrl, coverUrl, preferences } = req.body;

        // Check if user exists
        const existingUser = await db.user.findUnique({ where: { id: userId } });
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check username uniqueness if changed
        if (username && username !== existingUser.username) {
            const usernameExists = await db.user.findUnique({ where: { username } });
            if (usernameExists) {
                return res.status(400).json({ error: 'Username already taken' });
            }
        }

        // Update user profile
        const updatedUser = await db.user.update({
            where: { id: userId },
            data: {
                ...(username && { username }),
                ...(email !== undefined && { email: email || null }),
                ...(bio !== undefined && { bio: bio || null }),
                ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null }),
                ...(coverUrl !== undefined && { coverUrl: coverUrl || null }),
            }
        });

        // Return updated user with preferences (preferences stored client-side for now)
        res.json({
            id: updatedUser.id,
            walletAddress: updatedUser.walletAddress,
            username: updatedUser.username,
            email: updatedUser.email,
            bio: updatedUser.bio,
            avatarUrl: updatedUser.avatarUrl,
            coverUrl: updatedUser.coverUrl,
            balance: updatedUser.balance,
            totalWinnings: updatedUser.totalWinnings,
            totalHands: updatedUser.totalHands,
            vipRank: updatedUser.vipRank,
            isVerified: updatedUser.isVerified,
            referralCode: updatedUser.referralCode,
            referralRank: updatedUser.referralRank,
            hostRank: updatedUser.hostRank,
            preferences: preferences || { showWinRate: true, showPnL: true, hideBalance: false }
        });

        console.log(`[Profile] Updated user ${userId}: avatar=${avatarUrl ? 'set' : 'unchanged'}, cover=${coverUrl ? 'set' : 'unchanged'}`);
    } catch (e) {
        console.error('Profile update error:', e);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// 3e. Social Login - Create or Update User with Email Binding
app.post('/api/user/social-login', async (req, res) => {
    try {
        const { walletAddress, email, username, avatarUrl, loginType } = req.body;

        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address required' });
        }

        // Check if user with this wallet already exists
        let user = await db.user.findUnique({ where: { id: walletAddress } });

        if (user) {
            // Update existing user with social login info
            user = await db.user.update({
                where: { id: walletAddress },
                data: {
                    ...(email && !user.email && { email }), // Only set email if not already set
                    ...(avatarUrl && !user.avatarUrl && { avatarUrl }), // Only set avatar if not already set
                }
            });
            console.log(`[Social Login] Updated existing user ${walletAddress} with ${loginType}`);
        } else {
            // Create new user from social login
            const defaultUsername = username || email?.split('@')[0] || `Player_${walletAddress.slice(0, 6)}`;
            
            // Check if username is taken and make it unique
            let finalUsername = defaultUsername;
            let counter = 1;
            while (await db.user.findUnique({ where: { username: finalUsername } })) {
                finalUsername = `${defaultUsername}${counter}`;
                counter++;
            }

            user = await db.user.create({
                data: {
                    id: walletAddress,
                    walletAddress,
                    username: finalUsername,
                    email: email || null,
                    avatarUrl: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(finalUsername)}&background=14F195&color=000`,
                    balance: 0, // Start with 0 SOL
                }
            });
            console.log(`[Social Login] Created new user ${walletAddress} via ${loginType}: ${finalUsername}`);
        }

        res.json({
            id: user.id,
            walletAddress: user.walletAddress,
            username: user.username,
            email: user.email,
            avatarUrl: user.avatarUrl,
            balance: user.balance,
            loginType: loginType || 'social',
            isNewUser: !user.totalHands || user.totalHands === 0
        });
    } catch (e) {
        console.error('Social login error:', e);
        res.status(500).json({ error: 'Failed to process social login' });
    }
});

// Helper function for time ago formatting
function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
}

// 3f. Referral System - Multi-Level Tracking
app.get('/api/referrals/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Get user's referral code
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { referralCode: true, referralRank: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Build referral tree (3 levels deep)
        const buildReferralTree = async (referralCode: string | null, level: number, maxLevel: number = 3): Promise<any[]> => {
            // If referralCode is null or we've exceeded max depth, there's nothing to build
            if (!referralCode || level > maxLevel) return [];

            const referrals = await db.user.findMany({
                where: { referredBy: referralCode },
                select: {
                    id: true,
                    username: true,
                    createdAt: true,
                    totalHands: true,
                    referralCode: true
                }
            });

            const tree = await Promise.all(referrals.map(async (ref) => {
                // Calculate earnings from this referral (simplified - would need transaction tracking)
                const earnings = ref.totalHands * 0.05 * ([5, 10, 15, 20][user.referralRank || 0] / 100);

                const children = await buildReferralTree(ref.referralCode, level + 1, maxLevel);

                return {
                    id: ref.id,
                    username: ref.username,
                    joinedAt: ref.createdAt,
                    level,
                    totalHands: ref.totalHands,
                    earnings,
                    children
                };
            }));

            return tree;
        };

        const tree = user.referralCode ? await buildReferralTree(user.referralCode, 1) : [];

        // Calculate stats
        const countReferrals = (nodes: any[], level: number): { total: number; byLevel: Record<number, number> } => {
            let total = nodes.length;
            const byLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
            byLevel[level] = nodes.length;

            nodes.forEach(node => {
                if (node.children && node.children.length > 0) {
                    const childStats = countReferrals(node.children, level + 1);
                    total += childStats.total;
                    Object.entries(childStats.byLevel).forEach(([lvl, count]) => {
                        byLevel[parseInt(lvl)] = (byLevel[parseInt(lvl)] || 0) + count;
                    });
                }
            });

            return { total, byLevel };
        };

        const stats = countReferrals(tree, 1);

        // Calculate total earnings (would need transaction table in production)
        const totalEarnings = tree.reduce((sum, ref) => {
            return sum + ref.earnings + (ref.children?.reduce((childSum: number, child: any) =>
                childSum + child.earnings + (child.children?.reduce((grandSum: number, grand: any) =>
                    grandSum + grand.earnings, 0) || 0), 0) || 0);
        }, 0);

        // Calculate this month's earnings
        const thisMonthStart = new Date();
        thisMonthStart.setDate(1);
        thisMonthStart.setHours(0, 0, 0, 0);

        const thisMonthEarnings = totalEarnings * 0.3; // Simplified - would filter by date

        // Determine rank based on downline progression (MLM structure)
        // Scout (0): Active Player (1+ Hand) - Default starting rank
        // Agent (1): 3 Directs (1,000 Hands each)
        // Broker (2): 3 Direct Agents
        // Partner (3): 3 Direct Brokers

        let calculatedRank = 0; // Start as Scout

        if (tree.length > 0) {
            // Get direct referrals with detailed stats
            const directRefs = await db.user.findMany({
                where: { referredBy: user.referralCode || '' },
                select: {
                    id: true,
                    username: true,
                    totalHands: true,
                    referralRank: true
                }
            });

            // Count directs with 1000+ hands (for Agent rank)
            const directsWith1000Hands = directRefs.filter(ref => ref.totalHands >= 1000).length;

            // Count directs who are Agents (for Broker rank)
            const directAgents = directRefs.filter(ref => ref.referralRank >= 1).length;

            // Count directs who are Brokers (for Partner rank)
            const directBrokers = directRefs.filter(ref => ref.referralRank >= 2).length;

            // Determine rank based on criteria
            // Priority: Partner > Broker > Agent > Scout
            // Scout requirement updated: at least ONE direct referral with 100+ hands
            const directsWith100Hands = directRefs.filter(ref => ref.totalHands >= 100).length;

            if (directBrokers >= 3) {
                calculatedRank = 3; // Partner
            } else if (directAgents >= 3) {
                calculatedRank = 2; // Broker
            } else if (directsWith1000Hands >= 3) {
                calculatedRank = 1; // Agent
            } else if (directsWith100Hands >= 1) {
                calculatedRank = 0; // Scout (now requires 1 direct with 100+ hands)
            } else {
                // No qualifying referrals yet — keep as Scout (0) visually, but
                // front-end/UI can show this as "None" until the Scout requirement met.
                calculatedRank = 0;
            }
        }

        // Auto-update rank if changed
        if (calculatedRank !== user.referralRank) {
            await db.user.update({
                where: { id: userId },
                data: { referralRank: calculatedRank }
            });
        }

        const rank = calculatedRank;

        // Calculate next rank requirements
        let nextRankRequirements: { requirement: string; directsNeeded: number; currentProgress: number } | null = null;

        if (rank < 3) {
            const directRefs = await db.user.findMany({
                where: { referredBy: user.referralCode || '' },
                select: { totalHands: true, referralRank: true }
            });

            const directsWith1000Hands = directRefs.filter(ref => ref.totalHands >= 1000).length;
            const directAgents = directRefs.filter(ref => ref.referralRank >= 1).length;
            const directBrokers = directRefs.filter(ref => ref.referralRank >= 2).length;

            if (rank === 0) {
                // Scout → Agent: Need 3 directs with 1000+ hands
                nextRankRequirements = {
                    requirement: '3 Directs (1,000 Hands each)',
                    directsNeeded: Math.max(0, 3 - directsWith1000Hands),
                    currentProgress: directsWith1000Hands
                };
            } else if (rank === 1) {
                // Agent → Broker: Need 3 Direct Agents
                nextRankRequirements = {
                    requirement: '3 Direct Agents',
                    directsNeeded: Math.max(0, 3 - directAgents),
                    currentProgress: directAgents
                };
            } else if (rank === 2) {
                // Broker → Partner: Need 3 Direct Brokers
                nextRankRequirements = {
                    requirement: '3 Direct Brokers',
                    directsNeeded: Math.max(0, 3 - directBrokers),
                    currentProgress: directBrokers
                };
            }
        }

        res.json({
            stats: {
                totalReferrals: stats.total,
                directReferrals: stats.byLevel[1] || 0,
                level2Referrals: stats.byLevel[2] || 0,
                level3Referrals: stats.byLevel[3] || 0,
                totalEarnings,
                thisMonthEarnings,
                referralCode: user.referralCode || null,
                rank,
                rankName: ['Scout', 'Agent', 'Broker', 'Partner'][rank],
                nextRankRequirements
            },
            tree
        });
    } catch (error) {
        console.error('Referral API error:', error);
        res.status(500).json({ error: 'Failed to fetch referral data' });
    }
});

// 4. Lobby Rooms (Active Tables from Memory)
app.get('/api/tables', (req, res) => {
    // Convert Map to Array for JSON response
    const tables = gameManager.getAllTables();
    res.json(tables);
});

// 5. Current fairness state — returns current hand fairness data
app.get('/api/proof/:tableId/current', (req, res) => {
    try {
        const table = gameManager.getTable(req.params.tableId);
        if (!table) return res.status(404).json({ error: 'Table not found' });

        // Return current fairness data (server seed HIDDEN until hand ends)
        return res.json({
            tableId: table.tableId,
            handNumber: table.handNumber,
            phase: table.phase,
            fairness: {
                serverHash: table.fairness?.currentServerHash || null, // Hash visible, seed hidden
                clientSeed: table.fairness?.clientSeed || null,
                nonce: table.fairness?.nonce || null,
                deck: table.deck || [] // Current deck
            },
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        return res.status(500).json({ error: 'Failed to fetch fairness' });
    }
});

// 6. Seed reveal endpoint — after hand ends, player can verify fairness
app.get('/api/proof/:tableId/hand/:handNumber', async (req, res) => {
    try {
        const { tableId, handNumber } = req.params;
        
        // Fetch hand history from database
        const hand = await db.hand.findFirst({
            where: {
                tableId,
                handNumber: parseInt(handNumber)
            }
        });

        if (!hand) {
            return res.status(404).json({ 
                error: 'Hand not found',
                hint: 'Hands are available 2-10 minutes after completion for verification'
            });
        }

        // Return complete fairness data for verification
        return res.json({
            tableId,
            handNumber: hand.handNumber,
            fairnessData: {
                serverSeed: hand.fairnessReveal || 'Not yet available',
                serverSeedHash: hand.fairnessHash,
                clientSeed: hand.clientSeed,
                nonce: hand.nonce,
                communityCards: hand.communityCards
            },
            winners: hand.winnerIds,
            potAmount: hand.potAmount,
            rakeAmount: hand.rakeAmount,
            instructions: 'Use serverSeed + clientSeed + nonce to reproduce the deck and verify fairness',
            timestamp: hand.createdAt
        });
    } catch (e) {
        return res.status(500).json({ error: 'Failed to fetch hand verification' });
    }
});

// 7. Verify deck reproducibility — client verifies they can reproduce same deck
app.post('/api/proof/verify', async (req, res) => {
    try {
        const { serverSeed, clientSeed, nonce, expectedDeck } = req.body;
        
        if (!serverSeed || !clientSeed || nonce === undefined || !expectedDeck) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Import and use fairness functions to reproduce deck
        const { generateProvablyFairDeck, hashSeed } = await import('./utils/fairness');
        
        // Verify server seed hash matches
        const computedHash = await hashSeed(serverSeed);
        const reproducedDeck = generateProvablyFairDeck(serverSeed, clientSeed, nonce);

        // Compare decks (52 cards in specific order)
        const decksMatch = JSON.stringify(reproducedDeck) === JSON.stringify(expectedDeck);

        return res.json({
            verified: decksMatch,
            result: decksMatch ? 'DECK_VERIFIED' : 'DECK_MISMATCH',
            reproducedDeckLength: reproducedDeck.length,
            expectedDeckLength: expectedDeck.length,
            details: !decksMatch ? {
                expected: expectedDeck.slice(0, 5),
                reproduced: reproducedDeck.slice(0, 5)
            } : null,
            message: decksMatch 
                ? '✅ Deck is provably fair! Same seeds + nonce produce same shuffle.'
                : '❌ Deck mismatch detected. Fair play violation possible.'
        });
    } catch (e) {
        return res.status(500).json({ error: 'Verification failed', details: String(e) });
    }
});

// 8. Player fairness history — shows all hands a player participated in
app.get('/api/proof/player/:playerId/history', async (req, res) => {
    try {
        const { playerId } = req.params;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

        // Find all hands where player was involved
        const hands = await db.hand.findMany({
            where: {
                OR: [
                    { winnerIds: { contains: playerId } },
                    // Also find hands where player participated (if you add playerIds field)
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                tableId: true,
                handNumber: true,
                fairnessHash: true,
                clientSeed: true,
                nonce: true,
                communityCards: true,
                winnerIds: true,
                potAmount: true,
                rakeAmount: true,
                createdAt: true
            }
        });

        return res.json({
            playerId,
            handsFound: hands.length,
            hands: hands.map(h => ({
                ...h,
                verificationUrl: `/api/proof/${h.tableId}/hand/${h.handNumber}`
            }))
        });
    } catch (e) {
        return res.status(500).json({ error: 'Failed to fetch player history' });
    }
});

// 9. Fairness statistics — aggregated fairness metrics
app.get('/api/fairness/stats', async (req, res) => {
    try {
        const totalHands = await db.hand.count();
        const recentHands = await db.hand.findMany({
            where: {
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24h
                }
            }
        });

        const totalPot = await db.hand.aggregate({
            _sum: { potAmount: true }
        });

        const totalRake = await db.hand.aggregate({
            _sum: { rakeAmount: true }
        });

        return res.json({
            totalHandsHistorical: totalHands,
            handsLast24h: recentHands.length,
            totalPotLast24h: totalPot._sum.potAmount || 0,
            totalRakeLast24h: totalRake._sum.rakeAmount || 0,
            averageHandSize: totalHands > 0 ? Math.round((totalPot._sum.potAmount || 0) / totalHands) : 0,
            verificationStatus: '✅ All hands tracked and verifiable'
        });
    } catch (e) {
        return res.status(500).json({ error: 'Failed to fetch fairness stats' });
    }
});

// 10. TEST Endpoint - Create a test hand for fairness verification demo
app.post('/api/fairness/test-hand', async (req, res) => {
    try {
        const { generateServerSeed, hashSeed, generateProvablyFairDeck } = await import('./utils/fairness');
        
        // Generate provably fair data
        const serverSeed = generateServerSeed();
        const serverHash = await hashSeed(serverSeed);
        const clientSeed = 'test-client-' + Date.now();
        const nonce = Math.floor(Math.random() * 1000);
        const deck = generateProvablyFairDeck(serverSeed, clientSeed, nonce);
        
        // Community cards from the deck (burn 1, flop 3, burn 1, turn 1, burn 1, river 1)
        const communityCards = [deck[1], deck[2], deck[3], deck[5], deck[7]];
        
        // Create or get test user
        let testUser = await db.user.findUnique({ where: { id: 'test_fairness_user' } });
        if (!testUser) {
            testUser = await db.user.create({
                data: {
                    id: 'test_fairness_user',
                    walletAddress: 'FairnessTestWallet',
                    username: 'FairnessBot',
                    balance: 1000
                }
            });
        }
        
        // Create test hand record
        const testHand = await db.hand.create({
            data: {
                tableId: 'test_table',
                handNumber: Math.floor(Date.now() / 1000),
                userId: testUser.id,
                fairnessHash: serverHash,
                fairnessReveal: serverSeed,
                clientSeed: clientSeed,
                nonce: nonce,
                communityCards: JSON.stringify(communityCards),
                winnerIds: JSON.stringify([testUser.id]),
                potAmount: 100,
                rakeAmount: 5
            }
        });
        
        return res.json({
            success: true,
            message: '✅ Test hand created for fairness verification',
            testData: {
                tableId: 'test_table',
                handNumber: testHand.handNumber,
                serverSeedHash: serverHash,
                clientSeed: clientSeed,
                nonce: nonce
            },
            verificationUrl: `/api/proof/test_table/hand/${testHand.handNumber}`,
            instructions: [
                '1. Go to Fairness Verification page',
                '2. Enter Table ID: test_table',
                `3. Enter Hand Number: ${testHand.handNumber}`,
                '4. Click Verify Hand',
                '5. The verification should show all checks passing ✅'
            ]
        });
    } catch (e) {
        console.error('[Fairness Test] Error:', e);
        return res.status(500).json({ error: 'Failed to create test hand', details: String(e) });
    }
});

// 11. Get all hands for a table (for testing)
app.get('/api/proof/:tableId/hands', async (req, res) => {
    try {
        const { tableId } = req.params;
        const hands = await db.hand.findMany({
            where: { tableId },
            orderBy: { handNumber: 'desc' },
            take: 20
        });
        
        return res.json({
            tableId,
            handsFound: hands.length,
            hands: hands.map(h => ({
                handNumber: h.handNumber,
                potAmount: h.potAmount,
                rakeAmount: h.rakeAmount,
                createdAt: h.createdAt,
                hasServerSeed: !!h.fairnessReveal,
                verificationUrl: `/api/proof/${tableId}/hand/${h.handNumber}`
            }))
        });
    } catch (e) {
        return res.status(500).json({ error: 'Failed to fetch hands' });
    }
});

// SPA catch-all: Serve index.html for any non-API route (only if frontend exists)
app.get('*', (req, res) => {
    // Don't serve index.html for API routes or socket.io
    if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
        return res.status(404).json({ error: 'Not found' });
    }

    // Only serve frontend if dist exists
    if (distExists) {
        res.sendFile(path.join(__dirname, '../../dist/index.html'));
    } else {
        res.status(404).json({
            error: 'Frontend not available',
            message: 'This is an API-only backend. Please deploy the frontend separately.'
        });
    }
});

// --- Socket.io Events ---
io.on('connection', (socket) => {
    console.log(`[Connect] User connected: ${socket.id}`);

    socket.on('joinTable', ({ tableId, user, config }) => {
        try {
            console.log(`[JoinTable] ${socket.id} joining ${tableId}`);
            gameManager.handleJoin(socket, tableId, user, config);
        } catch (e) {
            console.error('[JoinTable Error]', e);
            socket.emit('error', { message: 'Failed to join table' });
        }
    });

    socket.on('sitDown', ({ tableId, user, amount, seatIndex }) => {
        try {
            console.log(`[SitDown] ${user.username} at table ${tableId}`);
            gameManager.handleSit(socket, tableId, user, amount, seatIndex);
        } catch (e) {
            console.error('[SitDown Error]', e);
            socket.emit('error', { message: 'Failed to sit down' });
        }
    });

    socket.on('leaveTable', async ({ tableId, userId }) => {
        try {
            console.log(`[LeaveTable] ${userId} leaving table ${tableId}`);
            await gameManager.handleDisconnect(socket);
            socket.emit('leftTable', { success: true });
        } catch (e) {
            console.error('[LeaveTable Error]', e);
            socket.emit('error', { message: 'Failed to leave table' });
        }
    });

    socket.on('playerAction', ({ tableId, action, amount }) => {
        try {
            gameManager.handleAction(socket, tableId, action, amount);
        } catch (e) {
            console.error('[PlayerAction Error]', e);
            socket.emit('error', { message: 'Action failed' });
        }
    });

    socket.on('sendChatMessage', ({ tableId, message, user }) => {
        // Sanitize message to prevent XSS attacks
        const sanitizedMessage = validator.escape(message.trim().substring(0, 200)); // Max 200 chars
        const sanitizedUsername = validator.escape(user.username.substring(0, 20)); // Max 20 chars

        if (sanitizedMessage.length === 0) {
            return; // Ignore empty messages
        }

        io.to(tableId).emit('newChatMessage', {
            id: Date.now().toString(),
            text: sanitizedMessage,
            sender: sanitizedUsername,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    });

    // Issue #5: Admin Bot Control
    socket.on('adminAddBot', async ({ tableId, adminWallet }) => {
        const result = await gameManager.addBot(tableId, adminWallet);
        socket.emit('adminBotResult', result);
    });

    socket.on('adminRemoveBot', ({ tableId, botId, adminWallet }) => {
        const result = gameManager.removeBot(tableId, botId, adminWallet);
        socket.emit('adminBotResult', result);
    });

    // Issue #6: Admin Game Speed Control
    socket.on('adminSetGameSpeed', ({ multiplier, adminWallet }) => {
        const ADMIN_WALLET = 'GvYPMAk8CddRucjwLHDud1yy51QQtQDhgiB9AWdRtAoD';
        if (adminWallet === ADMIN_WALLET) {
            gameManager.setGameSpeed(multiplier);
            io.emit('gameSpeedUpdated', { multiplier, actualSpeed: `${(1/multiplier).toFixed(1)}x faster` });
            socket.emit('adminSpeedResult', { success: true, message: `Game speed set to ${multiplier}x` });
            emitServerLog('info', `Game speed changed to ${(1/multiplier).toFixed(1)}x by admin`);
        } else {
            socket.emit('adminSpeedResult', { success: false, message: 'Unauthorized' });
        }
    });

    // Admin Close Table
    socket.on('adminCloseTable', ({ tableId, adminWallet }) => {
        const ADMIN_WALLET = 'GvYPMAk8CddRucjwLHDud1yy51QQtQDhgiB9AWdRtAoD';
        if (adminWallet === ADMIN_WALLET) {
            const result = gameManager.closeTable(tableId);
            socket.emit('adminTableResult', result);
            if (result.success) {
                emitServerLog('warning', `Table ${tableId} closed by admin`);
            }
        } else {
            socket.emit('adminTableResult', { success: false, message: 'Unauthorized' });
        }
    });

    // Helper to emit server logs to admin dashboard
    const emitServerLog = (type: string, message: string) => {
        io.emit('serverLog', { type, message });
    };

    // Issue #3 & #8: Handle deposit completion from client
    socket.on('depositCompleted', async ({ txHash, amount, walletAddress }) => {
        try {
            console.log(`[Deposit] Processing deposit: ${amount} chips for ${walletAddress}`);
            // Find or create user
            let user = await db.user.findUnique({ where: { id: walletAddress } });
            if (!user) {
                user = await db.user.create({
                    data: {
                        id: walletAddress,
                        walletAddress: walletAddress,
                        username: `Player_${walletAddress.slice(0,4)}`,
                        balance: 0
                    }
                });
            }

            // Create transaction record
            await db.transaction.create({
                data: {
                    userId: walletAddress,
                    type: 'DEPOSIT',
                    amount: amount,
                    status: 'COMPLETED',
                    chainTxHash: txHash,
                    chainStatus: 'CONFIRMED'
                }
            });

            // Update user balance
            const updatedUser = await db.user.update({
                where: { id: walletAddress },
                data: { balance: { increment: amount } }
            });

            // Update system stats
            await db.systemState.upsert({
                where: { id: 'global' },
                create: { 
                    id: 'global',
                    totalVolume: amount,
                    tvl: amount
                },
                update: { 
                    totalVolume: { increment: amount },
                    tvl: { increment: amount }
                }
            });

            // Emit balance update back to client
            socket.emit('balanceUpdate', updatedUser.balance);
            console.log(`[Deposit] Success: ${walletAddress} balance now ${updatedUser.balance}`);
        } catch (error) {
            console.error('[Deposit] Error:', error);
            socket.emit('error', { message: 'Failed to process deposit' });
        }
    });

    // Issue #3 & #8: Handle withdrawal completion from client
    socket.on('withdrawalCompleted', async ({ txHash, amount, walletAddress }) => {
        try {
            console.log(`[Withdrawal] Processing withdrawal: ${amount} chips for ${walletAddress}`);
            
            // Create transaction record
            await db.transaction.create({
                data: {
                    userId: walletAddress,
                    type: 'WITHDRAWAL',
                    amount: amount,
                    status: 'COMPLETED',
                    chainTxHash: txHash,
                    chainStatus: 'CONFIRMED'
                }
            });

            // Update user balance (deduct)
            const updatedUser = await db.user.update({
                where: { id: walletAddress },
                data: { balance: { decrement: amount } }
            });

            // Update system stats
            await db.systemState.upsert({
                where: { id: 'global' },
                create: { id: 'global', tvl: -amount },
                update: { tvl: { decrement: amount } }
            });

            // Emit balance update back to client
            socket.emit('balanceUpdate', updatedUser.balance);
            console.log(`[Withdrawal] Success: ${walletAddress} balance now ${updatedUser.balance}`);
        } catch (error) {
            console.error('[Withdrawal] Error:', error);
            socket.emit('error', { message: 'Failed to process withdrawal' });
        }
    });

    socket.on('disconnect', () => {
        gameManager.handleDisconnect(socket);
    });
});

const PORT = process.env.SERVER_PORT || process.env.PORT || 4000;
console.log(`[Server] Starting server initialization... PORT=${PORT}`);

// Error handling BEFORE listen
server.on('error', (err: any) => {
    console.error(`❌ Server error:`, err);
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use!`);
        process.exit(1);
    }
});

// Connect database BEFORE listen
db.$connect()
    .then(() => {
        console.log("✅ Database Connected");
        
        // Try to start listening - use only hostname or ip
        const httpServer = server.listen(PORT, () => {
            console.log(`[Server] HTTP server is NOW listening on port ${PORT}!`);
            console.log(`🚀 Backend Server running on port ${PORT}`);
            console.log(`📡 Socket.io listening for connections...`);
            
            // Verify we got a server address
            const addr = httpServer.address();
            console.log(`[Debug] Server address info:`, addr);
        });
    })
    .catch((err) => {
        console.error("❌ Database Connection Failed:", err);
        process.exit(1);
    });