
import { Server, Socket } from 'socket.io';
import { PokerEngine, GameState } from './utils/pokerGameLogic';
import { db } from './db';
import { generateServerSeed, hashSeed, generateProvablyFairDeck } from './utils/fairness';

export class GameManager {
    private io: Server;
    private tables: Map<string, GameState> = new Map();

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
            gameMode: table.gameMode
        }));
    }

    public async handleJoin(socket: Socket, tableId: string, user: any, config?: any) {
        let table = this.tables.get(tableId);
        
        if (!table) {
            const configSeats = Number(config?.maxSeats);
            const seats: 6 | 9 = (configSeats === 9) ? 9 : 6;
            const sb = Number(config?.smallBlind) || 1;
            const bb = Number(config?.bigBlind) || 2;
            const mode = config?.gameMode || 'cash';
            
            table = PokerEngine.initializeGame(tableId, seats, sb, bb, mode);
            this.tables.set(tableId, table);
        }

        socket.join(tableId);

        // Fetch User and send balance
        if (user && user.id && user.id !== 'spectator') {
            try {
                let dbUser = await db.user.findUnique({ where: { id: user.id } });
                if (!dbUser) {
                    dbUser = await db.user.create({
                        data: {
                            id: user.id,
                            username: user.username || `Player_${user.id.slice(0,4)}`,
                            avatarUrl: user.avatarUrl,
                            balance: 10000 // Welcome Bonus
                        }
                    });
                }
                socket.emit('balanceUpdate', dbUser.balance);
            } catch(e) { console.error(e); }
        }

        // Reconnection logic
        const existingPlayer = table.players.find(p => p.id === user?.id);
        if (existingPlayer) {
            const updatedTable = PokerEngine.updatePlayerSocket(table, user.id, socket.id);
            this.tables.set(tableId, updatedTable);
            socket.emit('gameStateUpdate', updatedTable);
        } else {
            socket.emit('gameStateUpdate', table);
        }
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

            // DB Transaction
            await db.$transaction([
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

            const updatedUser = await db.user.findUnique({ where: { id: user.id } });
            if(updatedUser) socket.emit('balanceUpdate', updatedUser.balance);

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
    }

    public handleAction(socket: Socket, tableId: string, action: any, amount: number) {
        const table = this.tables.get(tableId);
        if (!table) return;

        const player = table.players.find((p: any) => p.socketId === socket.id);
        if (player) {
            let newState = PokerEngine.handleAction(table, player.id, action, amount);
            if (newState.currentTurnPlayerId === null) {
                newState = PokerEngine.advancePhase(newState);
            }
            
            // Handle Winners -> DB Update
            if (newState.winners && newState.winners.length > 0) {
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
                                        status: 'COMPLETED'
                                    }
                                })
                            ]);
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
                if (player.balance > 0 && !player.id.startsWith('bot_')) {
                    await db.user.update({
                        where: { id: player.id },
                        data: { balance: { increment: player.balance } }
                    });
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
}