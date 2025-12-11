import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

interface TournamentPlayer {
    userId: string;
    username: string;
    chips: number;
    position: number | null; // Finish position (1st, 2nd, 3rd, etc.) or null if still playing
    eliminatedAt: Date | null;
}

interface TournamentWinner {
    userId: string;
    username: string;
    position: number;
    prize: number;
}

export class TournamentManager {
    /**
     * Create a new tournament
     */
    async createTournament(params: {
        name: string;
        buyIn: number;
        maxPlayers: number;
        minPlayers: number;
        maxSeats: number;
        startingChips: number;
        smallBlind: number;
        bigBlind: number;
        creatorId?: string;
    }) {
        const tournament = await db.tournament.create({
            data: {
                name: params.name,
                buyIn: params.buyIn,
                maxPlayers: params.maxPlayers,
                minPlayers: params.minPlayers,
                maxSeats: params.maxSeats,
                startingChips: params.startingChips,
                smallBlind: params.smallBlind,
                bigBlind: params.bigBlind,
                prizePool: 0,
                status: 'REGISTERING',
                creatorId: params.creatorId,
                players: JSON.stringify([]),
                registeredCount: 0
            }
        });

        console.log(`[Tournament] Created tournament ${tournament.id}: ${tournament.name}`);
        return tournament;
    }

    /**
     * Register a player for a tournament
     */
    async registerPlayer(tournamentId: string, userId: string, username: string): Promise<{ success: boolean; message: string; tournament?: any }> {
        const tournament = await db.tournament.findUnique({
            where: { id: tournamentId }
        });

        if (!tournament) {
            return { success: false, message: 'Tournament not found' };
        }

        if (tournament.status !== 'REGISTERING') {
            return { success: false, message: 'Tournament registration is closed' };
        }

        const players: TournamentPlayer[] = JSON.parse(tournament.players ?? '[]');

        // Check if already registered
        if (players.some(p => p.userId === userId)) {
            return { success: false, message: 'Already registered for this tournament' };
        }

        // Check if tournament is full
        if (players.length >= tournament.maxPlayers) {
            return { success: false, message: 'Tournament is full' };
        }

        // Check user balance
        const user = await db.user.findUnique({
            where: { id: userId }
        });

        if (!user || user.balance < tournament.buyIn) {
            return { success: false, message: 'Insufficient balance' };
        }

        // Deduct buy-in from user balance
        await db.user.update({
            where: { id: userId },
            data: {
                balance: { decrement: tournament.buyIn }
            }
        });

        // Add player to tournament
        players.push({
            userId,
            username,
            chips: tournament.startingChips,
            position: null,
            eliminatedAt: null
        });

        // Update prize pool (90% of buy-ins go to prize pool, 10% to host)
        const prizePoolShare = tournament.buyIn * 0.9;
        const hostShare = tournament.buyIn * 0.1;

        const updatedTournament = await db.tournament.update({
            where: { id: tournamentId },
            data: {
                players: JSON.stringify(players),
                registeredCount: players.length,
                prizePool: { increment: prizePoolShare },
                hostShare: { increment: hostShare }
            }
        });

        // Credit host (if exists)
        if (tournament.creatorId) {
            await db.user.update({
                where: { id: tournament.creatorId },
                data: {
                    balance: { increment: hostShare },
                    hostEarnings: { increment: hostShare }
                }
            });
        }

        console.log(`[Tournament] Player ${username} registered for ${tournament.name}. Players: ${players.length}/${tournament.maxPlayers}`);

        // Auto-start if we hit minimum players
        if (players.length >= tournament.minPlayers && tournament.status === 'REGISTERING') {
            // We'll start it manually or after a delay
            // For now, just notify that it's ready to start
            console.log(`[Tournament] ${tournament.name} has enough players to start!`);
        }

        return { success: true, message: 'Registration successful', tournament: updatedTournament };
    }

    /**
     * Start a tournament (transition from REGISTERING to RUNNING)
     */
    async startTournament(tournamentId: string): Promise<{ success: boolean; message: string; tournament?: any }> {
        const tournament = await db.tournament.findUnique({
            where: { id: tournamentId }
        });

        if (!tournament) {
            return { success: false, message: 'Tournament not found' };
        }

        if (tournament.status !== 'REGISTERING') {
            return { success: false, message: 'Tournament already started or finished' };
        }

        const players: TournamentPlayer[] = JSON.parse(tournament.players ?? '[]');

        if (players.length < tournament.minPlayers) {
            return { success: false, message: `Need at least ${tournament.minPlayers} players to start` };
        }

        const updatedTournament = await db.tournament.update({
            where: { id: tournamentId },
            data: {
                status: 'RUNNING',
                startTime: new Date()
            }
        });

        console.log(`[Tournament] Started tournament ${tournament.name} with ${players.length} players`);

        return { success: true, message: 'Tournament started', tournament: updatedTournament };
    }

    /**
     * Increase blind level (called after every N hands)
     */
    async increaseBlinds(tournamentId: string): Promise<void> {
        const tournament = await db.tournament.findUnique({
            where: { id: tournamentId }
        });

        if (!tournament || tournament.status !== 'RUNNING') {
            return;
        }

        const newBlindLevel = tournament.blindLevel + 1;
        const blindMultiplier = Math.pow(1.5, newBlindLevel - 1); // Blinds increase by 1.5x each level

        const newSmallBlind = Math.floor(tournament.smallBlind * blindMultiplier);
        const newBigBlind = Math.floor(tournament.bigBlind * blindMultiplier);

        await db.tournament.update({
            where: { id: tournamentId },
            data: {
                blindLevel: newBlindLevel,
                smallBlind: newSmallBlind,
                bigBlind: newBigBlind,
                currentHand: 0 // Reset hand counter for new level
            }
        });

        console.log(`[Tournament] ${tournament.name} - Blinds increased to Level ${newBlindLevel}: ${newSmallBlind}/${newBigBlind}`);
    }

    /**
     * Increment hand count and check if blinds should increase
     */
    async incrementHand(tournamentId: string): Promise<void> {
        const tournament = await db.tournament.findUnique({
            where: { id: tournamentId }
        });

        if (!tournament || tournament.status !== 'RUNNING') {
            return;
        }

        const newHandCount = tournament.currentHand + 1;

        await db.tournament.update({
            where: { id: tournamentId },
            data: {
                currentHand: newHandCount
            }
        });

        // Check if we should increase blinds
        if (newHandCount >= tournament.handsPerLevel) {
            await this.increaseBlinds(tournamentId);
        }
    }

    /**
     * Eliminate a player (when they run out of chips)
     */
    async eliminatePlayer(tournamentId: string, userId: string): Promise<void> {
        const tournament = await db.tournament.findUnique({
            where: { id: tournamentId }
        });

        if (!tournament || tournament.status !== 'RUNNING') {
            return;
        }

        const players: TournamentPlayer[] = JSON.parse(tournament.players ?? '[]');
        const playerIndex = players.findIndex(p => p.userId === userId);

        if (playerIndex === -1) {
            return;
        }

        // Count remaining players
        const remainingPlayers = players.filter(p => p.position === null).length;

        // Set finish position (based on remaining players)
        players[playerIndex].position = remainingPlayers;
        players[playerIndex].eliminatedAt = new Date();

        await db.tournament.update({
            where: { id: tournamentId },
            data: {
                players: JSON.stringify(players)
            }
        });

        console.log(`[Tournament] ${tournament.name} - Player ${players[playerIndex].username} eliminated in position ${remainingPlayers}`);

        // Check if tournament is over (only 1 player left)
        const playersLeft = players.filter(p => p.position === null).length;
        if (playersLeft <= 1) {
            await this.finishTournament(tournamentId);
        }
    }

    /**
     * Finish tournament and distribute prizes
     */
    async finishTournament(tournamentId: string): Promise<void> {
        const tournament = await db.tournament.findUnique({
            where: { id: tournamentId }
        });

        if (!tournament || tournament.status !== 'RUNNING') {
            return;
        }

        const players: TournamentPlayer[] = JSON.parse(tournament.players ?? '[]');

        // Find winner (player with no position set)
        const winner = players.find(p => p.position === null);
        if (winner) {
            winner.position = 1;
        }

        // Sort players by finish position
        const rankedPlayers = players
            .filter(p => p.position !== null)
            .sort((a, b) => (a.position! - b.position!));

        // Prize distribution: 50% / 30% / 20%
        const prizePool = tournament.prizePool;
        const prizes = [
            prizePool * 0.50, // 1st place
            prizePool * 0.30, // 2nd place
            prizePool * 0.20  // 3rd place
        ];

        const winners: TournamentWinner[] = [];

        // Distribute prizes to top 3
        for (let i = 0; i < Math.min(3, rankedPlayers.length); i++) {
            const player = rankedPlayers[i];
            const prize = prizes[i];

            winners.push({
                userId: player.userId,
                username: player.username,
                position: player.position!,
                prize
            });

            // Credit prize to player balance
            await db.user.update({
                where: { id: player.userId },
                data: {
                    balance: { increment: prize },
                    totalWinnings: { increment: prize }
                }
            });

            console.log(`[Tournament] ${tournament.name} - ${player.username} wins ${prize} chips (${player.position}${player.position === 1 ? 'st' : player.position === 2 ? 'nd' : 'rd'} place)`);
        }

        // Update tournament status
        await db.tournament.update({
            where: { id: tournamentId },
            data: {
                status: 'FINISHED',
                finishTime: new Date(),
                winners: JSON.stringify(winners),
                players: JSON.stringify(players)
            }
        });

        console.log(`[Tournament] ${tournament.name} finished! Winner: ${winners[0]?.username}`);
    }

    /**
     * Get active tournaments
     */
    async getActiveTournaments() {
        return await db.tournament.findMany({
            where: {
                status: {
                    in: ['REGISTERING', 'RUNNING']
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }

    /**
     * Get tournament by ID
     */
    async getTournament(tournamentId: string) {
        return await db.tournament.findUnique({
            where: { id: tournamentId }
        });
    }

    /**
     * Update player chips during the tournament
     */
    async updatePlayerChips(tournamentId: string, userId: string, newChips: number): Promise<void> {
        const tournament = await db.tournament.findUnique({
            where: { id: tournamentId }
        });

        if (!tournament) {
            return;
        }

        const players: TournamentPlayer[] = JSON.parse(tournament.players);
        const player = players.find(p => p.userId === userId);

        if (player) {
            player.chips = newChips;

            await db.tournament.update({
                where: { id: tournamentId },
                data: {
                    players: JSON.stringify(players)
                }
            });

            // If player has 0 chips, eliminate them
            if (newChips <= 0 && player.position === null) {
                await this.eliminatePlayer(tournamentId, userId);
            }
        }
    }
}

export const tournamentManager = new TournamentManager();
