
import { Server, Socket } from 'socket.io';
import { PokerEngine, GameState } from './utils/pokerGameLogic';
import { db } from './db';
import { generateServerSeed, hashSeed, generateProvablyFairDeck } from './utils/fairness';
import { getGameBlockchainHelper } from './gameBlockchain';

export class GameManager {
    private io: Server;
    private tables: Map<string, GameState> = new Map();
    private gameSpeedMultiplier: number = 1; // Issue #6: Admin can speed up game (1 = normal, 0.5 = 2x faster, 0.1 = 10x faster)
    private botsEnabled: Map<string, boolean> = new Map(); // Issue #5: Track which tables have bots enabled

    constructor(io: Server) {
        this.io = io;
        this.initializeDemoTables();
    }

    private initializeDemoTables() {
        const demoTable = PokerEngine.initializeGame('t1', 6, 1, 2, 'cash');
        this.tables.set('t1', demoTable);
        
        const whaleTable = PokerEngine.initializeGame('table_whale_9', 9, 5, 10, 'cash');
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
            table = PokerEngine.initializeGame(tableId, seats, sb, bb, mode);
            this.tables.set(tableId, table);
            if (DEBUG) console.log(`[handleJoin] Created new table ${tableId}`);
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

        try {
            const dbUser = await db.user.findUnique({ where: { id: user.id } });
            if (!dbUser || dbUser.balance < amount) {
                return socket.emit('error', { message: 'Insufficient funds' });
            }

            // Note: Blockchain balance verification is handled client-side

            // DB Transaction - Deduct buy-in from off-chain balance
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
            
            socket.emit('balanceUpdate', updatedUser.balance);

        } catch (e) {
            return socket.emit('error', { message: 'Transaction failed' });
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

    public handleAction(socket: Socket, tableId: string, action: any, amount: number) {
        const DEBUG = process.env.NODE_ENV === 'development';
        const table = this.tables.get(tableId);
        if (!table) return;

        const player = table.players.find((p: any) => p.socketId === socket.id);
        if (player) {
            if (DEBUG) console.log(`[Action] ${player.name} at table ${tableId}: ${action} ${amount || ''}`);
            
            let newState = PokerEngine.handleAction(table, player.id, action, amount);
            
            if (DEBUG) console.log(`[State] After action - Phase: ${newState.phase}, CurrentTurn: ${newState.currentTurnPlayerId}`);
            if (newState.currentTurnPlayerId === null) {
                if (DEBUG) console.log('[GameFlow] Betting round complete, advancing phase...');
                newState = PokerEngine.advancePhase(newState);
                if (DEBUG) console.log(`[GameFlow] Advanced to phase: ${newState.phase}, new turn: ${newState.currentTurnPlayerId}`);
                console.log(`[GameFlow] Advanced to phase: ${newState.phase}, new turn: ${newState.currentTurnPlayerId}`);
            }
            
            // Handle Winners -> DB Update AND Hand History
            if (newState.winners && newState.winners.length > 0) {
                // Track hand completion for fairness verification
                const handToSave = {
                    tableId: table.tableId,
                    handNumber: table.handNumber || 1,
                    fairnessHash: table.fairness?.previousServerHash || '',
                    fairnessReveal: table.fairness?.previousServerSeed || undefined,
                    clientSeed: table.fairness?.previousClientSeed || undefined,
                    nonce: table.fairness?.previousNonce || undefined,
                    communityCards: JSON.stringify(newState.communityCards || []),
                    winnerIds: JSON.stringify(newState.winners.map(w => w.playerId)),
                    potAmount: newState.pot || 0,
                    rakeAmount: Math.round((newState.pot || 0) * 0.05), // 5% rake
                    user: { connect: { id: newState.winners[0].playerId } } // Required by Prisma schema
                };

                newState.winners.forEach(async (winner) => {
                    if (!winner.playerId.startsWith('bot_')) {
                        try {
                            await db.$transaction([
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
                                }),
                                // Save hand for fairness verification
                                db.hand.create({
                                    data: handToSave
                                })
                            ]);

                            // Note: Rake distribution is automatic via protocol fee split
                        } catch(e) { console.error('DB Update Error on Win', e); }
                    }
                });
            }

            this.tables.set(tableId, newState);
            this.broadcastState(tableId);

            if (newState.winners) {
                setTimeout(async () => {
                    const t = this.tables.get(tableId);
                    if (t) {
                        try {
                            // Check if we have enough active players
                            const activePlayers = t.players.filter((p: any) => 
                                p.status === 'active' && p.balance > t.bigBlind
                            );
                            
                            if (activePlayers.length < 2) {
                                console.log(`[GameFlow] Not enough active players (${activePlayers.length}) for next hand at table ${tableId}`);
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
        }
    }

    public async handleDisconnect(socket: Socket) {
        for (const [tableId, table] of this.tables.entries()) {
            const player = table.players.find((p: any) => p.socketId === socket.id);
            if (player) {
                console.log(`[Disconnect] Player ${player.name} (${player.id}) leaving table ${tableId} with balance: ${player.balance}`);
                
                // Return table chips to database balance
                if (player.balance > 0 && !player.id.startsWith('bot_')) {
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
                    } catch (error) {
                        console.error(`[Disconnect] ❌ Failed to return balance to ${player.id}:`, error);
                    }
                }
                
                const updatedTable = {
                    ...table,
                    players: table.players.filter(p => p.id !== player.id)
                };
                this.tables.set(tableId, updatedTable);
                this.broadcastState(tableId);
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
                    const updatedTable = PokerEngine.handleAction(table, botId, action as any, raiseAmount);
                    this.tables.set(tableId, updatedTable);
                    this.broadcastState(tableId);

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