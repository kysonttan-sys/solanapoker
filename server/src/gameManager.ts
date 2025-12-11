
import { Server, Socket } from 'socket.io';
import { PokerEngine, GameState } from './utils/pokerGameLogic';
import { db } from './db';
import { generateServerSeed, hashSeed, generateProvablyFairDeck } from './utils/fairness';
import { getGameBlockchainHelper } from './gameBlockchain';
import { distributionManager } from './distributionManager';

export class GameManager {
    private io: Server;
    private tables: Map<string, GameState> = new Map();
    private gameSpeedMultiplier: number = 1; // Issue #6: Admin can speed up game (1 = normal, 0.5 = 2x faster, 0.1 = 10x faster)
    private botsEnabled: Map<string, boolean> = new Map(); // Issue #5: Track which tables have bots enabled

    constructor(io: Server) {
        this.io = io;
        this.initializeDemoTables();
    }

    // Update active players count in database
    private async updateActivePlayersCount() {
        try {
            // Count unique non-bot players across all tables
            const uniquePlayers = new Set<string>();
            for (const table of this.tables.values()) {
                for (const player of table.players) {
                    if (!player.id.startsWith('bot_')) {
                        uniquePlayers.add(player.id);
                    }
                }
            }

            await db.systemState.upsert({
                where: { id: 'global' },
                create: {
                    id: 'global',
                    activePlayers: uniquePlayers.size
                },
                update: {
                    activePlayers: uniquePlayers.size
                }
            });
        } catch (e) {
            console.error('[GameManager] Failed to update active players count:', e);
        }
    }

    // Emit updated user profile to all connected sockets for that user
    private async emitUserProfileUpdate(userId: string) {
        try {
            if (userId.startsWith('bot_')) return; // Skip bots

            const user = await db.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    username: true,
                    walletAddress: true,
                    balance: true,
                    totalHands: true,
                    totalWinnings: true,
                    vipRank: true,
                    referralRank: true,
                    referralCode: true,
                    referredBy: true,
                    avatarUrl: true
                }
            });

            if (!user) {
                console.warn(`[ProfileSync] User ${userId} not found in DB`);
                return;
            }

            // Find all sockets for this user across all tables
            const userSockets: Socket[] = [];
            for (const table of this.tables.values()) {
                for (const player of table.players) {
                    if (player.id === userId && player.socketId) {
                        const socket = this.io.sockets.sockets.get(player.socketId);
                        if (socket && !userSockets.includes(socket)) {
                            userSockets.push(socket);
                        }
                    }
                }
            }

            // Emit to all found sockets
            for (const socket of userSockets) {
                socket.emit('userProfileUpdate', user);
                console.log(`[ProfileSync] 📤 Emitted profile update to socket ${socket.id} for user ${user.username}`);
            }

            // Also emit balance update for backward compatibility
            for (const socket of userSockets) {
                socket.emit('balanceUpdate', user.balance);
            }
        } catch (error) {
            console.error(`[ProfileSync] Error emitting profile update:`, error);
        }
    }

    private initializeDemoTables() {
        const demoTable = PokerEngine.initializeGame('t1', 6, 1, 2, 'cash', 0, null);
        this.tables.set('t1', demoTable);

        const whaleTable = PokerEngine.initializeGame('table_whale_9', 9, 5, 10, 'cash', 0, null);
        this.tables.set('table_whale_9', whaleTable);
        console.log('[GameManager] Demo tables initialized');
    }

    // New Helper for API
    public getAllTables() {
        return Array.from(this.tables.values()).map(table => ({
            id: table.tableId,
            name: table.tableId === 't1' ? 'Neon Nights #1' : 'Whale Pool', // Simplified name mapping
            seats: table.maxSeats,
            occupiedSeats: table.players.filter(p => p.status !== 'sitting-out').length,
            smallBlind: table.smallBlind,
            bigBlind: table.bigBlind,
            buyInMin: table.bigBlind * 50, // Standard 50 BB min
            buyInMax: table.bigBlind * 200, // Standard 200 BB max
            gameMode: table.gameMode,
            type: table.gameMode === 'fun' ? 'FUN' : 'CASH', // Add type for frontend
            speed: 'REGULAR', // Default speed
            isPrivate: false // Default not private
        }));
    }

    public async handleJoin(socket: Socket, tableId: string, user: any, config?: any) {
        const DEBUG = process.env.NODE_ENV === 'development';
        if (DEBUG) console.log(`[handleJoin] User: ${user?.id}, Table: ${tableId}`);
        let table = this.tables.get(tableId);
        
        if (!table) {
            const configSeats = Number(config?.maxSeats);
            const seats: 6 | 9 = (configSeats === 9) ? 9 : 6;
            const sb = Number(config?.smallBlind) || 1;
            const bb = Number(config?.bigBlind) || 2;
            const mode = config?.gameMode || 'cash';
            const creatorId = (user && user.id && user.id !== 'spectator') ? user.id : null;
            table = PokerEngine.initializeGame(tableId, seats, sb, bb, mode, 0, creatorId);
            this.tables.set(tableId, table);
            if (DEBUG) console.log(`[handleJoin] Created new table ${tableId} by creator ${creatorId}`);
        }

        socket.join(tableId);
        if (DEBUG) console.log(`[handleJoin] Socket ${socket.id} joined room ${tableId}`);
        console.log(`[handleJoin] Socket ${socket.id} joined room ${tableId}`);

        // Fetch User and send balance
        if (user && user.id && user.id !== 'spectator') {
            try {
                if (DEBUG) console.log(`[handleJoin] Fetching DB user: ${user.id}`);
                let dbUser = await db.user.findUnique({ where: { id: user.id } });
                if (!dbUser) {
                    if (DEBUG) console.log(`[handleJoin] Creating new user: ${user.id}`);
                    dbUser = await db.user.create({
                        data: {
                            id: user.id,
                            walletAddress: user.id, // Set walletAddress same as id
                            username: user.username || `Player_${user.id.slice(0,4)}`,
                            avatarUrl: user.avatarUrl,
                            balance: 10000 // Welcome Bonus
                        }
                    });
                }
                if (DEBUG) console.log(`[handleJoin] Sending balance: ${dbUser.balance}`);
                socket.emit('balanceUpdate', dbUser.balance);
            } catch(e) { 
                console.error('[handleJoin] DB Error:', e); 
            }
        }

        // Reconnection logic
        const existingPlayer = table.players.find(p => p.id === user?.id);
        if (existingPlayer) {
            if (DEBUG) console.log(`[handleJoin] Existing player reconnecting`);
            const updatedTable = PokerEngine.updatePlayerSocket(table, user.id, socket.id);
            this.tables.set(tableId, updatedTable);
            socket.emit('gameStateUpdate', updatedTable);
        } else {
            if (DEBUG) console.log(`[handleJoin] New spectator, sending game state`);
            socket.emit('gameStateUpdate', table);
        }
        if (DEBUG) console.log(`[handleJoin] Completed for ${user?.id || 'spectator'}`);
    }

    public async handleSit(socket: Socket, tableId: string, user: any, amount: number, seatIndex?: number) {
        const table = this.tables.get(tableId);
        if (!table) return socket.emit('error', { message: 'Table not found' });
        if (amount <= 0) return socket.emit('error', { message: 'Invalid amount' });

        if (seatIndex !== undefined && table.players.some((p: any) => p.position === seatIndex)) {
            return socket.emit('error', { message: 'Seat taken' });
        }

        const isFunGame = table.gameMode === 'fun';

        try {
            const dbUser = await db.user.findUnique({ where: { id: user.id } });
            console.log(`[handleSit] DB User lookup for ${user.id}:`, dbUser ? { balance: dbUser.balance } : 'NOT FOUND');

            if (!dbUser) {
                console.log(`[handleSit] User ${user.id} not found in database, creating...`);
                // Create user if they don't exist (for social login users)
                await db.user.create({
                    data: {
                        id: user.id,
                        walletAddress: user.id,
                        username: user.name || user.username || 'Player',
                        balance: isFunGame ? 0 : 0 // Fun games don't need balance
                    }
                });

                if (!isFunGame) {
                    return socket.emit('error', { message: 'Please deposit funds first. Your balance is 0.' });
                }
            }

            // For fun games, skip balance check and transactions
            if (!isFunGame) {
                if (dbUser && dbUser.balance < amount) {
                    console.log(`[handleSit] Insufficient funds: has ${dbUser.balance}, needs ${amount}`);
                    return socket.emit('error', { message: `Insufficient funds. You have ${dbUser.balance.toLocaleString()} chips but need ${amount.toLocaleString()}.` });
                }

                // Note: Blockchain balance verification is handled client-side

                // DB Transaction - Deduct buy-in from off-chain balance (CASH games only)
                const [updatedUser] = await db.$transaction([
                    db.user.update({
                        where: { id: user.id },
                        data: { balance: { decrement: amount } }
                    }),
                    db.transaction.create({
                        data: {
                            userId: user.id,
                            type: 'GAME_BUYIN',
                            amount: -amount,
                            status: 'COMPLETED'
                        }
                    })
                ]);

                console.log(`[handleSit] Buy-in successful: ${amount} chips, new balance: ${updatedUser.balance}`);
                socket.emit('balanceUpdate', updatedUser.balance);

                // Emit full profile update to sync all user data
                await this.emitUserProfileUpdate(user.id);
            } else {
                console.log(`[handleSit] Fun game - skipping balance deduction. Player gets ${amount} free chips.`);
                // For fun games, just emit current balance (unchanged)
                if (dbUser) {
                    socket.emit('balanceUpdate', dbUser.balance);
                }
            }

        } catch (e: any) {
            console.error(`[handleSit] Transaction error:`, e);
            return socket.emit('error', { message: e?.message || 'Transaction failed' });
        }

        const updatedTable = PokerEngine.addPlayer(table, {
            id: user.id,
            name: user.username,
            balance: amount,
            avatarUrl: user.avatarUrl,
            socketId: socket.id,
            position: seatIndex
        });

        this.tables.set(tableId, updatedTable);
        this.broadcastState(tableId);
        
        // Update active players count in database
        this.updateActivePlayersCount();
        
        // Auto-start game if we have 2+ active players and game hasn't started
        const activePlayers = updatedTable.players.filter((p: any) => p.status !== 'sitting-out' && p.balance > 0);
        if (activePlayers.length >= 2 && updatedTable.currentTurnPlayerId === null && updatedTable.communityCards.length === 0) {
            console.log(`[GameManager] Auto-starting game on table ${tableId} with ${activePlayers.length} players`);
            setTimeout(async () => {
                const currentTable = this.tables.get(tableId);
                if (currentTable) {
                    // Generate fairness seeds and deck
                    const serverSeed = generateServerSeed();
                    const clientSeed = 'client-seed-' + Date.now();
                    const nonce = 1;
                    const deck = generateProvablyFairDeck(serverSeed, clientSeed, nonce);
                    
                    const fairnessState = {
                        currentServerSeed: serverSeed,
                        currentServerHash: hashSeed(serverSeed),
                        clientSeed,
                        nonce
                    };
                    
                    // Deal cards to start the hand
                    const newHand = PokerEngine.dealHand(currentTable, deck, fairnessState);
                    this.tables.set(tableId, newHand);
                    this.broadcastState(tableId);
                    console.log(`[GameManager] Game started on table ${tableId}`);
                }
            }, 2000); // 2 second delay before starting
        }
    }

    // Shared action processing logic for both players and bots
    private processAction(tableId: string, playerId: string, playerName: string, action: any, amount: number): boolean {
        const DEBUG = process.env.NODE_ENV === 'development';
        const table = this.tables.get(tableId);
        if (!table) return false;

        if (DEBUG) console.log(`[Action] ${playerName} at table ${tableId}: ${action} ${amount || ''}`);
        
        let newState = PokerEngine.handleAction(table, playerId, action, amount);
        
        if (DEBUG) console.log(`[State] After action - Phase: ${newState.phase}, CurrentTurn: ${newState.currentTurnPlayerId}`);
        
        // Auto-advance if betting round is complete OR everyone is all-in/folded
        const activePlayers = newState.players.filter(p => p.status === 'active' || p.status === 'all-in');
        const canActPlayers = activePlayers.filter(p => p.status === 'active');
        
        if (newState.currentTurnPlayerId === null || canActPlayers.length <= 1) {
            if (DEBUG) console.log('[GameFlow] Betting round complete or all players all-in/folded, advancing phase...');
            newState = PokerEngine.advancePhase(newState);
            if (DEBUG) console.log(`[GameFlow] Advanced to phase: ${newState.phase}, new turn: ${newState.currentTurnPlayerId}`);
            console.log(`[GameFlow] Advanced to phase: ${newState.phase}, new turn: ${newState.currentTurnPlayerId}`);
            
            // If still no one can act, keep advancing until showdown
            while (newState.phase !== 'showdown' && canActPlayers.length <= 1 && activePlayers.length > 1) {
                newState = PokerEngine.advancePhase(newState);
                if (DEBUG) console.log(`[GameFlow] Auto-advancing to: ${newState.phase}`);
            }
        }

        // Handle Winners -> DB Update AND Hand History
        if (newState.winners && newState.winners.length > 0) {
            this.handleWinners(tableId, table, newState);
        }

        this.tables.set(tableId, newState);
        this.broadcastState(tableId);
        return true;
    }

    public handleAction(socket: Socket, tableId: string, action: any, amount: number) {
        const table = this.tables.get(tableId);
        if (!table) return;

        const player = table.players.find((p: any) => p.socketId === socket.id);
        if (player) {
            this.processAction(tableId, player.id, player.name, action, amount);
        }
    }

    private async handleWinners(tableId: string, table: any, newState: any) {
        // Calculate and distribute rake
        let totalRake = 0;
        let rakeDistribution: { host: number; referrer: number; jackpot: number; globalPool: number; developer: number } | null = null;
        
        if (table.gameMode === 'cash' && newState.pot > 0) {
            // Get winner's VIP level for rake calculation
            const mainWinner = newState.winners[0];
            let vipLevel = 0;
            
            try {
                if (mainWinner && !mainWinner.playerId.startsWith('bot_')) {
                    const winnerUser = await db.user.findUnique({
                        where: { id: mainWinner.playerId },
                        select: { vipRank: true, totalHands: true }
                    });

                    if (winnerUser) {
                        // Use stored vipRank if set, otherwise calculate from hands
                        if (winnerUser.vipRank > 0) {
                            vipLevel = winnerUser.vipRank;
                        } else {
                            // Auto-calculate VIP level based on hands
                            if (winnerUser.totalHands >= 100000) vipLevel = 4; // Legend
                            else if (winnerUser.totalHands >= 20000) vipLevel = 3; // High Roller
                            else if (winnerUser.totalHands >= 5000) vipLevel = 2; // Shark
                            else if (winnerUser.totalHands >= 1000) vipLevel = 1; // Grinder
                            else vipLevel = 0; // Fish

                            // Update user's vipRank in database if it changed
                            if (vipLevel > 0) {
                                await db.user.update({
                                    where: { id: mainWinner.playerId },
                                    data: { vipRank: vipLevel }
                                }).catch(e => console.error('[VIP] Error updating vipRank:', e));
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('[Rake] Error fetching VIP level:', e);
            }
            
            totalRake = PokerEngine.calculateRake(newState.pot, table, vipLevel);

            // Get host info from table creator
            let hostTier = 0;
            let hostUserId: string | null = null;
            if (table.creatorId) {
                try {
                    const host = await db.user.findUnique({
                        where: { id: table.creatorId },
                        select: { hostRank: true }
                    });
                    if (host) {
                        hostTier = host.hostRank || 0;
                        hostUserId = table.creatorId;
                    }
                } catch (e) {
                    console.error('[Rake] Error fetching host info:', e);
                }
            }

            // Get referrer info from winner's referredBy field
            let referrerRank = 0;
            let referrerUserId: string | null = null;
            if (mainWinner && !mainWinner.playerId.startsWith('bot_')) {
                try {
                    const winner = await db.user.findUnique({
                        where: { id: mainWinner.playerId },
                        select: { referredBy: true }
                    });

                    if (winner?.referredBy) {
                        // Find the user who has this referral code
                        const referrer = await db.user.findUnique({
                            where: { referralCode: winner.referredBy },
                            select: { id: true, referralRank: true }
                        });

                        if (referrer) {
                            referrerRank = referrer.referralRank || 0;
                            referrerUserId = referrer.id;
                        }
                    }
                } catch (e) {
                    console.error('[Rake] Error fetching referrer info:', e);
                }
            }

            rakeDistribution = PokerEngine.distributeRake(totalRake, hostTier, referrerRank);

            // Credit referrer share to referrer's balance
            if (referrerUserId && rakeDistribution.referrer > 0) {
                try {
                    await db.user.update({
                        where: { id: referrerUserId },
                        data: { balance: { increment: rakeDistribution.referrer } }
                    });
                    console.log(`[Rake] Credited $${rakeDistribution.referrer.toFixed(2)} to referrer ${referrerUserId}`);
                } catch (e) {
                    console.error('[Rake] Error crediting referrer:', e);
                }
            }

            // Credit host share to host's balance
            if (hostUserId && rakeDistribution.host > 0) {
                try {
                    await db.user.update({
                        where: { id: hostUserId },
                        data: {
                            balance: { increment: rakeDistribution.host },
                            hostEarnings: { increment: rakeDistribution.host }
                        }
                    });
                    console.log(`[Rake] Credited $${rakeDistribution.host.toFixed(2)} to host ${hostUserId}`);
                } catch (e) {
                    console.error('[Rake] Error crediting host:', e);
                }
            }

            // Save rake distribution to database
            try {
                // @ts-ignore - rakeDistribution model may not be in Prisma types yet
                await db.rakeDistribution.create({
                    data: {
                        handId: table.handNumber?.toString() || '0',
                        totalRake,
                        hostShare: rakeDistribution.host,
                        hostUserId,
                        hostTier,
                        referrerShare: rakeDistribution.referrer,
                        referrerUserId,
                        referrerRank,
                        jackpotShare: rakeDistribution.jackpot,
                        globalPoolShare: rakeDistribution.globalPool,
                        developerShare: rakeDistribution.developer
                    }
                });

                // Add to Global Partner Pool (auto-distributes to Rank 3 Partners)
                await distributionManager.addToGlobalPool(rakeDistribution.globalPool);

                // Add to Monthly Jackpot (distributes on 1st of every month)
                await distributionManager.addToJackpot(rakeDistribution.jackpot);
                
                console.log(`[Rake] Distributed $${totalRake.toFixed(2)} - Host: $${rakeDistribution.host.toFixed(2)}, Jackpot: $${rakeDistribution.jackpot.toFixed(2)}, Global Pool: $${rakeDistribution.globalPool.toFixed(2)}, Dev: $${rakeDistribution.developer.toFixed(2)}`);
            } catch (e) {
                console.error('[Rake] Error saving distribution:', e);
            }
        }

        // Track hand completion for fairness verification
        // Use CURRENT fairness state (this is the hand that just completed)
        // Find first human winner to associate the hand with (bots don't exist in DB)
        const humanWinner = newState.winners.find((w: any) => !w.playerId.startsWith('bot_'));
        
        const handToSave = humanWinner ? {
            tableId: table.tableId,
            handNumber: table.handNumber || 1,
            fairnessHash: table.fairness?.currentServerHash || '',
            fairnessReveal: table.fairness?.currentServerSeed || undefined, // Server seed revealed after hand ends
            clientSeed: table.fairness?.clientSeed || undefined,
            nonce: table.fairness?.nonce || undefined,
            communityCards: JSON.stringify(newState.communityCards || []),
            winnerIds: JSON.stringify(newState.winners.map((w: any) => w.playerId)),
            potAmount: newState.pot || 0,
            rakeAmount: Math.round((newState.pot || 0) * 0.05), // 5% rake
            user: { connect: { id: humanWinner.playerId } }
        } : null;

        // Update system-wide stats (totalHands)
        try {
            await db.systemState.upsert({
                where: { id: 'global' },
                create: { 
                    id: 'global',
                    totalHands: 1,
                    totalVolume: newState.pot || 0
                },
                update: { 
                    totalHands: { increment: 1 },
                    totalVolume: { increment: newState.pot || 0 }
                }
            });
        } catch(e) { console.error('SystemState Update Error', e); }

        // Process each winner - update balances and record transactions
        const isFunGame = table.gameMode === 'fun';

        for (const winner of newState.winners) {
            // Skip bots - they don't have DB records
            if (winner.playerId.startsWith('bot_')) {
                console.log(`[Win] Bot ${winner.playerId} won $${winner.amount} (not saved to DB)`);
                continue;
            }

            // Skip database updates for fun games
            if (isFunGame) {
                console.log(`[Win] Fun game - Player ${winner.playerId} won $${winner.amount} (not saved to DB)`);
                continue;
            }

            try {
                // Build transaction array
                const dbOps: any[] = [
                    db.user.update({
                        where: { id: winner.playerId },
                        data: {
                            balance: { increment: winner.amount },
                            totalWinnings: { increment: winner.amount },
                            totalHands: { increment: 1 }
                        }
                    }),
                    db.transaction.create({
                        data: {
                            userId: winner.playerId,
                            type: 'GAME_WIN',
                            amount: winner.amount,
                            status: 'COMPLETED',
                            handId: table.handNumber?.toString() || '1'
                        }
                    })
                ];

                // Only save hand history if we have valid handToSave data
                if (handToSave) {
                    dbOps.push(db.hand.create({ data: handToSave }));
                }

                await db.$transaction(dbOps);
                console.log(`[Win] Player ${winner.playerId} won $${winner.amount} - saved to DB`);

                // Emit full profile update to sync totalHands, totalWinnings, VIP rank, etc.
                await this.emitUserProfileUpdate(winner.playerId);
            } catch(e) {
                console.error('DB Update Error on Win:', e);
            }
        }

        // Schedule next hand
        setTimeout(async () => {
            const t = this.tables.get(tableId);
            if (t) {
                try {
                    // Check if we have enough eligible players for next hand
                    // After showdown, ALL players (except sitting-out/eliminated) with sufficient balance can play
                    const eligiblePlayers = t.players.filter((p: any) => 
                        p.status !== 'sitting-out' && 
                        p.status !== 'eliminated' && 
                        p.balance >= t.bigBlind
                    );
                    
                    console.log(`[GameFlow] Checking next hand eligibility - ${eligiblePlayers.length} eligible players:`, 
                        eligiblePlayers.map((p: any) => `${p.name}(${p.status}, $${p.balance})`).join(', '));
                    
                    if (eligiblePlayers.length < 2) {
                        console.log(`[GameFlow] Not enough eligible players (${eligiblePlayers.length}) for next hand at table ${tableId}`);
                        // Reset game state to waiting for players
                        const resetState = {
                            ...t,
                            phase: 'pre-flop' as const,
                            winners: undefined,
                            currentTurnPlayerId: null,
                            communityCards: [],
                            pot: 0
                        };
                        this.tables.set(tableId, resetState);
                        this.broadcastState(tableId);
                        return;
                    }
                    
                    const serverSeed = generateServerSeed();
                    const serverHash = hashSeed(serverSeed);
                    const clientSeed = t.fairness?.clientSeed || `client_${Date.now()}`;
                    const nonce = (t.handNumber || 0) + 1;

                    const deck = generateProvablyFairDeck(serverSeed, clientSeed, nonce);

                    const newFairness = {
                        currentServerSeed: serverSeed,
                        currentServerHash: serverHash,
                        clientSeed,
                        nonce,
                        previousServerSeed: t.fairness?.currentServerSeed || undefined,
                        previousServerHash: t.fairness?.currentServerHash || undefined,
                        previousClientSeed: t.fairness?.clientSeed || undefined,
                        previousNonce: t.fairness?.nonce || undefined
                    } as any;

                    const nextState = PokerEngine.dealHand(t, deck, newFairness);
                    this.tables.set(tableId, nextState);
                    this.broadcastState(tableId);
                    console.log(`[GameFlow] Next hand dealt for table ${tableId}, Hand #${nextState.handNumber}`);
                } catch (e) {
                    console.error('Error generating next hand deck', e);
                }
            }
        }, 5000);
    }

    public async handleDisconnect(socket: Socket) {
        for (const [tableId, table] of this.tables.entries()) {
            const player = table.players.find((p: any) => p.socketId === socket.id);
            if (player) {
                console.log(`[Disconnect] Player ${player.name} (${player.id}) leaving table ${tableId} with balance: ${player.balance}`);

                const isFunGame = table.gameMode === 'fun';

                // Return table chips to database balance (skip for fun games)
                if (player.balance > 0 && !player.id.startsWith('bot_') && !isFunGame) {
                    try {
                        const updatedUser = await db.user.update({
                            where: { id: player.id },
                            data: { balance: { increment: player.balance } }
                        });

                        // Log the cashout transaction
                        await db.transaction.create({
                            data: {
                                userId: player.id,
                                type: 'GAME_CASHOUT',
                                amount: player.balance,
                                status: 'COMPLETED'
                            }
                        });

                        console.log(`[Disconnect] ✅ Returned ${player.balance} chips to ${player.name}. New DB balance: ${updatedUser.balance}`);

                        // Emit balance update to the user's socket immediately
                        socket.emit('balanceUpdate', updatedUser.balance);
                        console.log(`[Disconnect] 📤 Emitted balanceUpdate: ${updatedUser.balance} to socket ${socket.id}`);

                        // Emit full profile update to sync all user data
                        await this.emitUserProfileUpdate(player.id);
                    } catch (error) {
                        console.error(`[Disconnect] ❌ Failed to return balance to ${player.id}:`, error);
                    }
                } else if (isFunGame) {
                    console.log(`[Disconnect] Fun game - no balance return needed for ${player.name}`);
                }

                const updatedTable = {
                    ...table,
                    players: table.players.filter(p => p.id !== player.id)
                };
                this.tables.set(tableId, updatedTable);
                this.broadcastState(tableId);

                // Update active players count in database
                this.updateActivePlayersCount();
            }
        }
    }

    private broadcastState(tableId: string) {
        this.io.to(tableId).emit('gameStateUpdate', this.tables.get(tableId));
    }

    // API accessor
    public getTable(tableId: string) {
        return this.tables.get(tableId);
    }

    // Issue #6: Admin Game Speed Control
    public setGameSpeed(multiplier: number) {
        this.gameSpeedMultiplier = Math.max(0.1, Math.min(1, multiplier)); // Clamp between 0.1 (10x) and 1 (normal)
        console.log(`[GameManager] Game speed set to ${this.gameSpeedMultiplier}x (${1/this.gameSpeedMultiplier}x faster)`);
    }

    public getGameSpeed() {
        return this.gameSpeedMultiplier;
    }

    // Admin Close Table
    public closeTable(tableId: string): { success: boolean, message: string } {
        const table = this.tables.get(tableId);
        if (!table) {
            return { success: false, message: 'Table not found' };
        }

        // Return all player balances before closing
        for (const player of table.players) {
            if (!player.id.startsWith('bot_') && player.balance > 0) {
                db.user.update({
                    where: { id: player.id },
                    data: { balance: { increment: player.balance } }
                }).catch(e => console.error(`[CloseTable] Failed to return balance to ${player.id}:`, e));
            }
        }

        // Notify all players in the room
        this.io.to(tableId).emit('tableClosed', { tableId, reason: 'Table closed by admin' });

        // Remove the table
        this.tables.delete(tableId);
        console.log(`[GameManager] Table ${tableId} closed by admin`);
        
        return { success: true, message: `Table ${tableId} closed successfully` };
    }

    // Issue #5: Admin Bot Control
    public async addBot(tableId: string, adminWallet: string) {
        const ADMIN_WALLET = 'GvYPMAk8CddRucjwLHDud1yy51QQtQDhgiB9AWdRtAoD';
        if (adminWallet !== ADMIN_WALLET) {
            console.warn('[GameManager] Unauthorized bot add attempt');
            return { success: false, message: 'Unauthorized' };
        }

        const table = this.tables.get(tableId);
        if (!table) return { success: false, message: 'Table not found' };

        const emptySeats = Array.from({ length: table.maxSeats }, (_, i) => i)
            .filter(i => !table.players.some(p => p.position === i));

        if (emptySeats.length === 0) {
            return { success: false, message: 'Table is full' };
        }

        const botPosition = emptySeats[Math.floor(Math.random() * emptySeats.length)];
        const botId = `bot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const botNames = ['AlphaBot', 'BetaBot', 'GammaBot', 'DeltaBot', 'EpsilonBot', 'ZetaBot'];
        const botName = botNames[Math.floor(Math.random() * botNames.length)];

        const botPlayer = {
            id: botId,
            name: botName,
            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${botId}`,
            balance: table.bigBlind * 100, // 100 BB stack
            bet: 0,
            cards: [],
            position: botPosition,
            status: 'active' as const,
            isTurn: false,
            socketId: 'bot',
            isBot: true
        } as any;

        const updatedTable: any = {
            ...table,
            players: [...table.players, botPlayer]
        };

        this.tables.set(tableId, updatedTable);
        this.botsEnabled.set(tableId, true);
        this.broadcastState(tableId);

        // Start bot AI loop
        this.startBotAI(tableId, botId);

        return { success: true, message: `Bot ${botName} added to table`, botId };
    }

    public removeBot(tableId: string, botId: string, adminWallet: string) {
        const ADMIN_WALLET = 'GvYPMAk8CddRucjwLHDud1yy51QQtQDhgiB9AWdRtAoD';
        if (adminWallet !== ADMIN_WALLET) {
            return { success: false, message: 'Unauthorized' };
        }

        const table = this.tables.get(tableId);
        if (!table) return { success: false, message: 'Table not found' };

        const updatedTable = {
            ...table,
            players: table.players.filter((p: any) => p.id !== botId)
        };

        this.tables.set(tableId, updatedTable);
        this.broadcastState(tableId);

        return { success: true, message: 'Bot removed' };
    }

    private startBotAI(tableId: string, botId: string) {
        const botThink = () => {
            const table = this.tables.get(tableId);
            if (!table) return;

            const bot = table.players.find((p: any) => p.id === botId);
            if (!bot || !bot.isTurn) {
                setTimeout(botThink, 500 * this.gameSpeedMultiplier);
                return;
            }

            // Simple bot logic: Random action weighted by hand strength
            const actions = ['fold', 'check', 'call', 'raise'];
            const weights = [0.2, 0.3, 0.3, 0.2]; // Adjust based on sophistication
            const rand = Math.random();
            let action: string = 'fold'; // Initialize with default
            let cumulative = 0;

            for (let i = 0; i < actions.length; i++) {
                cumulative += weights[i];
                if (rand <= cumulative) {
                    action = actions[i];
                    break;
                }
            }

            // Validate action
            const toCall = Math.max(0, (table.minBet || 0) - bot.bet);
            if (action === 'check' && toCall > 0) action = 'fold';
            if (action === 'call' && toCall === 0) action = 'check';
            if (action === 'raise' && bot.balance < table.bigBlind * 2) action = toCall > 0 ? 'call' : 'check';

            const raiseAmount = action === 'raise' ? table.bigBlind * (2 + Math.floor(Math.random() * 3)) : 0;

            setTimeout(() => {
                try {
                    // Use the shared processAction method to ensure proper game flow
                    this.processAction(tableId, botId, bot.name, action as any, raiseAmount);

                    // Continue thinking
                    setTimeout(botThink, 500 * this.gameSpeedMultiplier);
                } catch (e) {
                    console.error('[Bot AI] Error processing action:', e);
                }
            }, (1000 + Math.random() * 2000) * this.gameSpeedMultiplier); // Bot thinks for 1-3 seconds
        };

        setTimeout(botThink, 1000 * this.gameSpeedMultiplier);
    }
}