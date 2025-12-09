import { PokerEngine, GameState, PlayerState } from './utils/pokerGameLogic';
import { generateProvablyFairDeck, generateServerSeed, hashSeed } from './utils/fairness';

interface TestResult {
    handNumber: number;
    error?: string;
    warning?: string;
    phase: string;
    winners?: any[];
    pot: number;
    actions: string[];
}

const results: TestResult[] = [];
let errorsFound: string[] = [];
let warningsFound: string[] = [];

// Create test players
const createTestPlayers = (count: number): PlayerState[] => {
    const players: PlayerState[] = [];
    for (let i = 0; i < count; i++) {
        players.push({
            id: `player_${i}`,
            name: `Player${i}`,
            avatarUrl: '',
            balance: 1000,
            bet: 0,
            totalBet: 0,
            cards: [],
            status: 'active',
            isDealer: false,
            isTurn: false,
            position: i
        });
    }
    return players;
};

// Simulate a full hand with random actions
const playHand = (handNum: number, playerCount: number): TestResult => {
    const result: TestResult = {
        handNumber: handNum,
        phase: 'pre-flop',
        pot: 0,
        actions: []
    };

    try {
        // Initialize game
        let state = PokerEngine.initializeGame(`test_table`, 6, 1, 2, 'cash');
        state.players = createTestPlayers(playerCount);
        
        // Generate deck
        const serverSeed = generateServerSeed();
        const clientSeed = `client_${handNum}`;
        const deck = generateProvablyFairDeck(serverSeed, clientSeed, handNum);
        
        const fairness = {
            currentServerSeed: serverSeed,
            currentServerHash: hashSeed(serverSeed),
            clientSeed,
            nonce: handNum
        };

        // Deal hand
        state = PokerEngine.dealHand(state, deck, fairness);
        result.actions.push(`Dealt hand #${handNum} to ${playerCount} players`);

        if (state.players.filter(p => p.status === 'active').length < 2) {
            throw new Error('Not enough active players after deal');
        }

        // Play through all phases
        let loopGuard = 0;
        const maxActions = 100;

        while (state.phase !== 'showdown' && loopGuard < maxActions) {
            loopGuard++;
            
            if (!state.currentTurnPlayerId) {
                // Phase complete, advance
                const activePlayers = state.players.filter(p => p.status === 'active' || p.status === 'all-in');
                const canActPlayers = activePlayers.filter(p => p.status === 'active');
                
                if (canActPlayers.length <= 1 && activePlayers.length > 1) {
                    // Auto-advance through remaining streets
                    while (state.phase !== 'showdown') {
                        state = PokerEngine.advancePhase(state);
                        result.actions.push(`Auto-advanced to ${state.phase}`);
                    }
                    break;
                } else {
                    state = PokerEngine.advancePhase(state);
                    result.phase = state.phase;
                    result.actions.push(`Advanced to ${state.phase}`);
                }
                continue;
            }

            const currentPlayer = state.players.find(p => p.id === state.currentTurnPlayerId);
            if (!currentPlayer) {
                throw new Error(`Current turn player ${state.currentTurnPlayerId} not found`);
            }

            if (!currentPlayer.isTurn) {
                throw new Error(`Player ${currentPlayer.name} is marked as current but isTurn is false`);
            }

            // Decide action based on simple strategy
            const toCall = state.minBet - currentPlayer.bet;
            let action: string;
            let amount = 0;

            // Simple AI strategy
            const random = Math.random();
            const handStrength = currentPlayer.handStrength || 0;
            
            if (toCall === 0) {
                // No bet to call
                if (handStrength > 70 && random > 0.5 && currentPlayer.balance >= state.bigBlind * 3) {
                    action = 'raise';
                    amount = state.minBet + state.bigBlind * (1 + Math.floor(random * 3));
                } else {
                    action = 'check';
                }
            } else {
                // Need to call or fold
                if (handStrength < 30 && random > 0.7) {
                    action = 'fold';
                } else if (handStrength > 60 && random > 0.6 && currentPlayer.balance >= toCall + state.bigBlind * 2) {
                    action = 'raise';
                    amount = state.minBet + state.lastRaiseAmount;
                } else {
                    action = 'call';
                }
            }

            // Execute action
            const beforePot = state.pot;
            const beforePhase = state.phase;
            state = PokerEngine.handleAction(state, currentPlayer.id, action, amount);
            
            // Verify state consistency
            if (state.pot < 0) {
                throw new Error(`Negative pot after ${action}: ${state.pot}`);
            }

            if (action === 'raise' && state.minBet <= beforePot) {
                warningsFound.push(`Hand ${handNum}: Raise didn't increase minBet properly`);
            }

            result.actions.push(`${currentPlayer.name} ${action}${amount ? ` ${amount}` : ''}`);

            // Check if winners determined early (all folded)
            if (state.winners && state.winners.length > 0) {
                result.phase = 'showdown';
                break;
            }
        }

        if (loopGuard >= maxActions) {
            throw new Error('Infinite loop detected - exceeded max actions');
        }

        // Verify final state
        result.phase = state.phase;
        result.pot = state.pot;
        result.winners = state.winners;

        if (state.phase === 'showdown') {
            if (!state.winners || state.winners.length === 0) {
                throw new Error('Showdown reached but no winners determined');
            }

            // Verify winner balances
            const totalWinnings = state.winners.reduce((sum, w) => sum + w.amount, 0);
            if (Math.abs(totalWinnings - result.pot) > 0.01 && result.pot > 0) {
                warningsFound.push(`Hand ${handNum}: Winner total ${totalWinnings} doesn't match pot ${result.pot}`);
            }

            result.actions.push(`Winners: ${state.winners.map(w => `${w.name} ($${w.amount})`).join(', ')}`);
        }

        // Check for negative balances
        state.players.forEach(p => {
            if (p.balance < 0) {
                throw new Error(`Player ${p.name} has negative balance: ${p.balance}`);
            }
        });

    } catch (error: any) {
        result.error = error.message;
        errorsFound.push(`Hand ${handNum}: ${error.message}`);
    }

    return result;
};

// Run tests
console.log('🃏 Starting 100-hand poker simulation...\n');
console.log('═'.repeat(80));

const startTime = Date.now();

for (let i = 1; i <= 100; i++) {
    const playerCount = 2 + Math.floor(Math.random() * 5); // 2-6 players
    const result = playHand(i, playerCount);
    results.push(result);

    if (result.error) {
        console.log(`❌ Hand ${i}: ERROR - ${result.error}`);
    } else if (i % 10 === 0) {
        console.log(`✅ Completed ${i} hands...`);
    }
}

const endTime = Date.now();
const duration = ((endTime - startTime) / 1000).toFixed(2);

// Print summary
console.log('═'.repeat(80));
console.log('\n📊 TEST RESULTS SUMMARY\n');
console.log(`Total Hands Played: 100`);
console.log(`Duration: ${duration}s`);
console.log(`Success Rate: ${100 - errorsFound.length}%`);
console.log(`Errors: ${errorsFound.length}`);
console.log(`Warnings: ${warningsFound.length}`);

if (errorsFound.length > 0) {
    console.log('\n🚨 ERRORS FOUND:\n');
    errorsFound.forEach(err => console.log(`  - ${err}`));
}

if (warningsFound.length > 0) {
    console.log('\n⚠️  WARNINGS FOUND:\n');
    warningsFound.slice(0, 10).forEach(warn => console.log(`  - ${warn}`));
    if (warningsFound.length > 10) {
        console.log(`  ... and ${warningsFound.length - 10} more warnings`);
    }
}

// Analyze results
const phaseDistribution: Record<string, number> = {};
results.forEach(r => {
    phaseDistribution[r.phase] = (phaseDistribution[r.phase] || 0) + 1;
});

console.log('\n📈 PHASE DISTRIBUTION:\n');
Object.entries(phaseDistribution).forEach(([phase, count]) => {
    console.log(`  ${phase}: ${count} (${(count / 100 * 100).toFixed(1)}%)`);
});

// Action statistics
const totalActions = results.reduce((sum, r) => sum + r.actions.length, 0);
console.log(`\n📝 Average actions per hand: ${(totalActions / 100).toFixed(1)}`);

if (errorsFound.length === 0) {
    console.log('\n✨ ALL TESTS PASSED! No critical errors found.\n');
} else {
    console.log('\n💥 TESTS FAILED! Please review errors above.\n');
    process.exit(1);
}
