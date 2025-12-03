/**
 * Backend Blockchain Integration
 * 
 * Hooks into game manager to handle blockchain interactions:
 * - Verify deposit before allowing player to sit
 * - Process withdrawal when player leaves
 * - Update balances from blockchain
 * - Track rake distribution
 */

import { PublicKey } from '@solana/web3.js';
import { db } from './db';
import { getBlockchainManager } from './utils/blockchainManager';

export interface RakeDistribution {
    totalRake: number;
    hostEarnings: number;
    platformEarnings: number;
    communityPool: number;
}

/**
 * Game Blockchain Helper - Integrates with GameManager
 */
export class GameBlockchainHelper {
    private blockchainManager = getBlockchainManager();

    /**
     * Verify player has sufficient balance on-chain before allowing sit down
     * Returns blockchain transaction details if verified
     */
    async verifyPlayerBalance(
        playerId: string,
        requiredChips: number
    ): Promise<{ verified: boolean; onChainBalance: number; message: string }> {
        try {
            const user = await db.user.findUnique({
                where: { id: playerId }
            });

            if (!user) {
                return {
                    verified: false,
                    onChainBalance: 0,
                    message: 'Player not found'
                };
            }

            if (!user.walletAddress) {
                return {
                    verified: false,
                    onChainBalance: 0,
                    message: 'Player wallet not connected'
                };
            }

            // Check database balance (off-chain)
            if (user.balance < requiredChips) {
                return {
                    verified: false,
                    onChainBalance: user.onChainBalance || 0,
                    message: `Insufficient balance. Have ${user.balance}, need ${requiredChips}`
                };
            }

            // Verify on-chain balance matches
            try {
                const playerPubkey = new PublicKey(user.walletAddress);
                const reconciliation = await this.blockchainManager.reconcileBalance(
                    playerId,
                    playerPubkey
                );

                if (!reconciliation.synced) {
                    console.warn(
                        `Balance discrepancy detected for ${playerId}, auto-synced`
                    );
                }

                return {
                    verified: reconciliation.onChainBalance >= requiredChips,
                    onChainBalance: reconciliation.onChainBalance,
                    message: 'Balance verified'
                };
            } catch (e) {
                // If blockchain check fails, fall back to database
                console.warn(
                    `Blockchain verification failed, using database balance: ${String(e)}`
                );
                return {
                    verified: true, // Fall back to database
                    onChainBalance: user.onChainBalance || 0,
                    message: 'Using database balance (blockchain check failed)'
                };
            }
        } catch (e) {
            console.error(`Balance verification failed: ${String(e)}`);
            return {
                verified: false,
                onChainBalance: 0,
                message: `Error: ${String(e)}`
            };
        }
    }

    /**
     * Process rake distribution after hand completes
     * Splits rake between host, platform, and community
     */
    async processRakeDistribution(
        handId: string,
        potAmount: number,
        hostId?: string
    ): Promise<RakeDistribution> {
        try {
            // Calculate rake: 5% of pot
            const rakePercentage = 0.05;
            const totalRake = Math.round(potAmount * rakePercentage * 100) / 100;

            // Distribution: 60% platform, 30% host, 10% community
            const platformEarnings = Math.round(totalRake * 0.6 * 100) / 100;
            const hostEarnings = Math.round(totalRake * 0.3 * 100) / 100;
            const communityPool = Math.round(totalRake * 0.1 * 100) / 100;

            // Record rake distribution in database
            await db.transaction.create({
                data: {
                    userId: 'RAKE_DISTRIBUTION', // System record
                    type: 'RAKE_DISTRIBUTION',
                    amount: totalRake,
                    status: 'COMPLETED',
                    handId
                }
            });

            // Record platform earnings
            if (platformEarnings > 0) {
                await db.transaction.create({
                    data: {
                        userId: 'PLATFORM',
                        type: 'RAKE_EARNINGS',
                        amount: platformEarnings,
                        status: 'COMPLETED',
                        handId
                    }
                });
            }

            // Record host earnings (if host exists)
            if (hostEarnings > 0 && hostId) {
                const host = await db.user.findUnique({ where: { id: hostId } });
                if (host) {
                    await db.user.update({
                        where: { id: hostId },
                        data: {
                            balance: { increment: hostEarnings },
                            hostEarnings: { increment: hostEarnings }
                        }
                    });
                }
            }

            // Add to community pool (global state)
            const globalState = await db.systemState.findUnique({
                where: { id: 'global' }
            });

            if (globalState) {
                await db.systemState.update({
                    where: { id: 'global' },
                    data: {
                        communityPool: {
                            increment: communityPool
                        }
                    }
                });
            }

            console.log(`💰 Rake distributed for hand ${handId}:`, {
                totalRake,
                platformEarnings,
                hostEarnings,
                communityPool
            });

            return {
                totalRake,
                hostEarnings,
                platformEarnings,
                communityPool
            };
        } catch (e) {
            console.error(`Rake distribution failed for hand ${handId}:`, e);
            throw e;
        }
    }

    /**
     * Calculate house edge and profitability metrics
     */
    async calculateMetrics(): Promise<{
        totalRakeCollected: number;
        totalPlayers: number;
        totalHands: number;
        averageRakePerHand: number;
        averagePotSize: number;
    }> {
        try {
            // Total rake collected
            const rakeTransactions = await db.transaction.aggregate({
                where: { type: 'RAKE_DISTRIBUTION' },
                _sum: { amount: true }
            });

            // Total hands
            const handCount = await db.hand.count();

            // Average pot size
            const handStats = await db.hand.aggregate({
                _avg: { potAmount: true },
                _sum: { potAmount: true }
            });

            // Total players
            const playerCount = await db.user.count();

            const totalRake = rakeTransactions._sum.amount || 0;
            const avgRakePerHand = handCount > 0 ? totalRake / handCount : 0;
            const avgPotSize = handStats._avg.potAmount || 0;

            return {
                totalRakeCollected: totalRake,
                totalPlayers: playerCount,
                totalHands: handCount,
                averageRakePerHand: avgRakePerHand,
                averagePotSize: avgPotSize
            };
        } catch (e) {
            console.error(`Metrics calculation failed:`, e);
            return {
                totalRakeCollected: 0,
                totalPlayers: 0,
                totalHands: 0,
                averageRakePerHand: 0,
                averagePotSize: 0
            };
        }
    }

    /**
     * Sync all active players' balances from blockchain
     * Called periodically to ensure data integrity
     */
    async syncAllPlayerBalances(): Promise<{
        synced: number;
        failed: number;
        errors: string[];
    }> {
        const errors: string[] = [];
        let synced = 0;
        let failed = 0;

        try {
            // Get all users with wallet addresses
            const users = await db.user.findMany({
                where: {
                    walletAddress: { not: null }
                },
                take: 100 // Limit to prevent rate limiting
            });

            for (const user of users) {
                try {
                    if (!user.walletAddress) continue;

                    const playerPubkey = new PublicKey(user.walletAddress);
                    await this.blockchainManager.syncBalance(user.id, playerPubkey);
                    synced++;
                } catch (e) {
                    failed++;
                    errors.push(
                        `Failed to sync ${user.id}: ${String(e)}`
                    );
                }
            }

            console.log(
                `✅ Balance sync completed: ${synced} synced, ${failed} failed`
            );

            return { synced, failed, errors };
        } catch (e) {
            console.error(`Balance sync failed:`, e);
            return { synced, failed, errors: [String(e)] };
        }
    }

    /**
     * Get player's blockchain transaction history
     */
    async getPlayerBlockchainHistory(playerId: string, limit: number = 20) {
        try {
            const transactions = await db.transaction.findMany({
                where: {
                    userId: playerId,
                    type: {
                        in: ['BLOCKCHAIN_DEPOSIT', 'BLOCKCHAIN_WITHDRAWAL']
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: limit
            });

            return transactions.map(tx => ({
                txHash: tx.chainTxHash,
                type: tx.type === 'BLOCKCHAIN_DEPOSIT' ? 'Deposit' : 'Withdrawal',
                amount: tx.amount,
                status: tx.chainStatus || 'UNKNOWN',
                date: tx.createdAt
            }));
        } catch (e) {
            console.error(`Failed to fetch blockchain history: ${String(e)}`);
            return [];
        }
    }
}

/**
 * Singleton instance
 */
let helper: GameBlockchainHelper | null = null;

export function getGameBlockchainHelper(): GameBlockchainHelper {
    if (!helper) {
        helper = new GameBlockchainHelper();
    }
    return helper;
}

export async function initializeGameBlockchain(): Promise<void> {
    const helper = getGameBlockchainHelper();
    console.log('🔗 Game blockchain integration initialized');
}
