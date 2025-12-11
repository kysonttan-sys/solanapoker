import { db } from './db';
import cron from 'node-cron';
import crypto from 'crypto';

/**
 * Distribution Manager
 * Handles automatic distribution of:
 * 1. Global Partner Pool - Distributed to all Rank 3 Partners proportionally
 * 2. Monthly Jackpot - Distributed on 1st day of every month
 */

export class DistributionManager {
    private static instance: DistributionManager;
    private globalPoolBalance: number = 0;
    private jackpotBalance: number = 0;

    private constructor() {
        this.initializeBalances();
        this.startScheduledJobs();
    }

    public static getInstance(): DistributionManager {
        if (!DistributionManager.instance) {
            DistributionManager.instance = new DistributionManager();
        }
        return DistributionManager.instance;
    }

    /**
     * Cryptographically secure Fisher-Yates shuffle
     * Uses crypto.randomBytes() instead of Math.random() for true randomness
     */
    private cryptoShuffle<T>(array: T[]): T[] {
        const shuffled = [...array]; // Create a copy to avoid mutation
        for (let i = shuffled.length - 1; i > 0; i--) {
            // Generate cryptographically secure random number
            const randomBytes = crypto.randomBytes(4);
            const randomInt = randomBytes.readUInt32BE(0);
            const j = randomInt % (i + 1);

            // Swap elements
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    private async initializeBalances() {
        try {
            const systemState = await db.systemState.findUnique({
                where: { id: 'global' }
            });

            if (systemState) {
                this.globalPoolBalance = systemState.communityPool || 0;
                this.jackpotBalance = systemState.jackpot || 0;
            } else {
                // Create system state if doesn't exist
                await db.systemState.create({
                    data: {
                        id: 'global',
                        jackpot: 0,
                        tvl: 0,
                        totalVolume: 0,
                        totalHands: 0,
                        activePlayers: 0,
                        communityPool: 0
                    }
                });
            }

            console.log(`[Distribution] Initialized - Global Pool: $${this.globalPoolBalance.toFixed(2)}, Jackpot: $${this.jackpotBalance.toFixed(2)}`);
        } catch (e) {
            console.error('[Distribution] Error initializing balances:', e);
        }
    }

    /**
     * Add funds to Global Partner Pool
     * This is called automatically when rake is collected
     */
    public async addToGlobalPool(amount: number) {
        if (amount <= 0) return;

        try {
            this.globalPoolBalance += amount;

            await db.systemState.update({
                where: { id: 'global' },
                data: { communityPool: this.globalPoolBalance }
            });

            console.log(`[Global Pool] Added $${amount.toFixed(2)}, New Balance: $${this.globalPoolBalance.toFixed(2)}`);

            // Check if pool is large enough to distribute (e.g., every $100)
            if (this.globalPoolBalance >= 100) {
                await this.distributeGlobalPool();
            }
        } catch (e) {
            console.error('[Global Pool] Error adding funds:', e);
        }
    }

    /**
     * Add funds to Monthly Jackpot
     * This is called automatically when rake is collected
     */
    public async addToJackpot(amount: number) {
        if (amount <= 0) return;

        try {
            this.jackpotBalance += amount;

            await db.systemState.update({
                where: { id: 'global' },
                data: { jackpot: this.jackpotBalance }
            });

            console.log(`[Jackpot] Added $${amount.toFixed(2)}, New Balance: $${this.jackpotBalance.toFixed(2)}`);
        } catch (e) {
            console.error('[Jackpot] Error adding funds:', e);
        }
    }

    /**
     * Manual trigger for jackpot distribution (Admin only)
     */
    public async triggerManualJackpot(): Promise<void> {
        console.log('[Jackpot] Manual trigger initiated by admin');
        await this.distributeMonthlyJackpot();
    }

    /**
     * Get current jackpot balance
     */
    public getJackpotBalance(): number {
        return this.jackpotBalance;
    }

    /**
     * Get current global pool balance
     */
    public getGlobalPoolBalance(): number {
        return this.globalPoolBalance;
    }

    /**
     * Distribute Global Partner Pool to all Rank 3 Partners
     * Distribution is proportional to their team's rake generation
     */
    private async distributeGlobalPool() {
        try {
            // Get all Rank 3 Partners
            const partners = await db.user.findMany({
                where: { referralRank: 3 },
                select: {
                    id: true,
                    username: true,
                    balance: true,
                    totalWinnings: true // Use as proxy for team activity
                }
            });

            if (partners.length === 0) {
                console.log('[Global Pool] No Rank 3 Partners found, skipping distribution');
                return;
            }

            // Calculate total team activity (sum of all partners' total winnings as proxy)
            const totalActivity = partners.reduce((sum, p) => sum + (p.totalWinnings || 0), 0);

            if (totalActivity === 0) {
                console.log('[Global Pool] No partner activity, equal distribution');
                // Equal distribution if no activity tracked
                const sharePerPartner = this.globalPoolBalance / partners.length;

                for (const partner of partners) {
                    await db.user.update({
                        where: { id: partner.id },
                        data: { balance: { increment: sharePerPartner } }
                    });

                    await db.transaction.create({
                        data: {
                            userId: partner.id,
                            type: 'GLOBAL_POOL_SHARE',
                            amount: sharePerPartner,
                            status: 'COMPLETED'
                        }
                    });

                    console.log(`[Global Pool] Distributed $${sharePerPartner.toFixed(2)} to ${partner.username} (equal share)`);
                }
            } else {
                // Proportional distribution based on team activity
                for (const partner of partners) {
                    const activityRatio = (partner.totalWinnings || 0) / totalActivity;
                    const share = this.globalPoolBalance * activityRatio;

                    if (share > 0) {
                        await db.user.update({
                            where: { id: partner.id },
                            data: { balance: { increment: share } }
                        });

                        await db.transaction.create({
                            data: {
                                userId: partner.id,
                                type: 'GLOBAL_POOL_SHARE',
                                amount: share,
                                status: 'COMPLETED'
                            }
                        });

                        console.log(`[Global Pool] Distributed $${share.toFixed(2)} to ${partner.username} (${(activityRatio * 100).toFixed(1)}% of pool)`);
                    }
                }
            }

            // Reset pool balance
            this.globalPoolBalance = 0;
            await db.systemState.update({
                where: { id: 'global' },
                data: { communityPool: 0 }
            });

            console.log(`[Global Pool] ✅ Distribution complete to ${partners.length} partners`);
        } catch (e) {
            console.error('[Global Pool] Error during distribution:', e);
        }
    }

    /**
     * Distribute Monthly Jackpot on 1st day of every month
     * Distribution:
     * - 30% to Top Players by hands played
     * - 30% to Top Earners by profit
     * - 40% to 10 Lucky Random Winners
     */
    private async distributeMonthlyJackpot() {
        if (this.jackpotBalance <= 0) {
            console.log('[Jackpot] No balance to distribute');
            return;
        }

        try {
            console.log(`[Jackpot] 🎰 Starting monthly distribution of $${this.jackpotBalance.toFixed(2)}`);

            const topPlayersShare = this.jackpotBalance * 0.30; // 30%
            const topEarnersShare = this.jackpotBalance * 0.30; // 30%
            const luckyDrawShare = this.jackpotBalance * 0.40;  // 40%

            // 1. Top Players by Hands (30% - split among top 3)
            const topPlayers = await db.user.findMany({
                where: { totalHands: { gt: 0 } },
                orderBy: { totalHands: 'desc' },
                take: 3,
                select: { id: true, username: true, totalHands: true, balance: true }
            });

            if (topPlayers.length > 0) {
                // Tiered distribution: 1st = 50%, 2nd = 30%, 3rd = 20%
                const tierPercentages = [0.50, 0.30, 0.20];
                
                for (let i = 0; i < topPlayers.length; i++) {
                    const player = topPlayers[i];
                    const tierShare = topPlayersShare * tierPercentages[i];
                    
                    await db.user.update({
                        where: { id: player.id },
                        data: { balance: { increment: tierShare } }
                    });

                    await db.transaction.create({
                        data: {
                            userId: player.id,
                            type: 'JACKPOT_TOP_PLAYER',
                            amount: tierShare,
                            status: 'COMPLETED'
                        }
                    });

                    console.log(`[Jackpot] Top Player #${i + 1}: ${player.username} won $${tierShare.toFixed(2)} (${player.totalHands} hands)`);
                }
            }

            // 2. Top Earners by Profit (30% - split among top 3)
            const topEarners = await db.user.findMany({
                where: { totalWinnings: { gt: 0 } },
                orderBy: { totalWinnings: 'desc' },
                take: 3,
                select: { id: true, username: true, totalWinnings: true, balance: true }
            });

            if (topEarners.length > 0) {
                // Tiered distribution: 1st = 50%, 2nd = 30%, 3rd = 20%
                const tierPercentages = [0.50, 0.30, 0.20];
                
                for (let i = 0; i < topEarners.length; i++) {
                    const player = topEarners[i];
                    const tierShare = topEarnersShare * tierPercentages[i];
                    
                    await db.user.update({
                        where: { id: player.id },
                        data: { balance: { increment: tierShare } }
                    });

                    await db.transaction.create({
                        data: {
                            userId: player.id,
                            type: 'JACKPOT_TOP_EARNER',
                            amount: tierShare,
                            status: 'COMPLETED'
                        }
                    });

                    console.log(`[Jackpot] Top Earner #${i + 1}: ${player.username} won $${tierShare.toFixed(2)} ($${player.totalWinnings.toFixed(2)} total)`);
                }
            }

            // 3. Lucky Draw (40% - split among 10 random winners)
            const allActivePlayers = await db.user.findMany({
                where: { totalHands: { gte: 10 } }, // Must have played at least 10 hands
                select: { id: true, username: true, balance: true }
            });

            if (allActivePlayers.length > 0) {
                // Randomly select 10 winners (or all if less than 10)
                const luckyWinnerCount = Math.min(10, allActivePlayers.length);
                const shuffled = this.cryptoShuffle(allActivePlayers);
                const luckyWinners = shuffled.slice(0, luckyWinnerCount);
                
                const sharePerLuckyWinner = luckyDrawShare / luckyWinnerCount;

                for (let i = 0; i < luckyWinners.length; i++) {
                    const winner = luckyWinners[i];
                    await db.user.update({
                        where: { id: winner.id },
                        data: { balance: { increment: sharePerLuckyWinner } }
                    });

                    await db.transaction.create({
                        data: {
                            userId: winner.id,
                            type: 'JACKPOT_LUCKY_DRAW',
                            amount: sharePerLuckyWinner,
                            status: 'COMPLETED'
                        }
                    });

                    console.log(`[Jackpot] Lucky Winner #${i + 1}: ${winner.username} won $${sharePerLuckyWinner.toFixed(2)} 🍀`);
                }
            }

            // Reset jackpot balance
            this.jackpotBalance = 0;
            await db.systemState.update({
                where: { id: 'global' },
                data: { jackpot: 0 }
            });

            console.log('[Jackpot] ✅ Monthly distribution complete!');
        } catch (e) {
            console.error('[Jackpot] Error during distribution:', e);
        }
    }

    /**
     * Start scheduled jobs
     * - Global Pool: Distributes when balance reaches threshold
     * - Jackpot: Distributes on 1st day of every month at midnight
     */
    private startScheduledJobs() {
        // Monthly Jackpot Distribution - 1st day of every month at 00:00 UTC
        cron.schedule('0 0 1 * *', async () => {
            console.log('[Cron] Running monthly jackpot distribution...');
            await this.distributeMonthlyJackpot();
        }, {
            timezone: 'UTC'
        });

        console.log('[Distribution] Scheduled jobs started');
        console.log('  - Global Pool: Auto-distributes when balance >= $100');
        console.log('  - Monthly Jackpot: 1st day of every month at 00:00 UTC');
    }

    /**
     * Manual trigger for testing
     */
    public async manualDistributeJackpot() {
        console.log('[Manual] Triggering jackpot distribution...');
        await this.distributeMonthlyJackpot();
    }

    public async manualDistributeGlobalPool() {
        console.log('[Manual] Triggering global pool distribution...');
        await this.distributeGlobalPool();
    }

    /**
     * Get current balances
     */
    public getBalances() {
        return {
            globalPool: this.globalPoolBalance,
            jackpot: this.jackpotBalance
        };
    }
}

// Export singleton instance
export const distributionManager = DistributionManager.getInstance();
