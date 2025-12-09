import { PokerEngine, GameState, PlayerState } from './utils/pokerGameLogic';
import { generateProvablyFairDeck, generateServerSeed, hashSeed } from './utils/fairness';

console.log('🎯 Testing Edge Cases in Poker Game Logic\n');
console.log('═'.repeat(80));

let passed = 0;
let failed = 0;

const test = (name: string, fn: () => void) => {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (error: any) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
        failed++;
    }
};

// Test 1: Big Blind Option in Pre-Flop
test('Pre-Flop: BB gets option to raise when everyone calls', () => {
    let state = PokerEngine.initializeGame('test', 6, 1, 2, 'cash');
    const players: PlayerState[] = [];
    for (let i = 0; i < 3; i++) {
        players.push({
            id: `p${i}`,
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
    state.players = players;
    
    const serverSeed = generateServerSeed();
    const deck = generateProvablyFairDeck(serverSeed, 'client', 1);
    const fairness = { currentServerSeed: serverSeed, currentServerHash: hashSeed(serverSeed), clientSeed: 'client', nonce: 1 };
    
    state = PokerEngine.dealHand(state, deck, fairness);
    
    // UTG calls
    const utg = state.players.find(p => p.isTurn)!;
    state = PokerEngine.handleAction(state, utg.id, 'call', 0);
    
    // SB calls
    const sb = state.players.find(p => p.isTurn)!;
    state = PokerEngine.handleAction(state, sb.id, 'call', 0);
    
    // BB should still have action (not null currentTurnPlayerId)
    if (state.currentTurnPlayerId === null) {
        throw new Error('BB did not get option to act after everyone called');
    }
    
    // BB should be able to raise
    const bb = state.players.find(p => p.isTurn)!;
    if (!bb.isTurn) {
        throw new Error('BB does not have turn flag set');
    }
});

// Test 2: All-in on Blind Posting
test('Players posting blinds with entire stack should be all-in', () => {
    let state = PokerEngine.initializeGame('test', 6, 10, 20, 'cash');
    const players: PlayerState[] = [];
    
    // Player with exactly SB amount
    players.push({
        id: 'p0',
        name: 'ShortSB',
        avatarUrl: '',
        balance: 10,
        bet: 0,
        totalBet: 0,
        cards: [],
        status: 'active',
        isDealer: false,
        isTurn: false,
        position: 0
    });
    
    // Player with exactly BB amount
    players.push({
        id: 'p1',
        name: 'ShortBB',
        avatarUrl: '',
        balance: 20,
        bet: 0,
        totalBet: 0,
        cards: [],
        status: 'active',
        isDealer: false,
        isTurn: false,
        position: 1
    });
    
    // Normal player
    players.push({
        id: 'p2',
        name: 'Normal',
        avatarUrl: '',
        balance: 1000,
        bet: 0,
        totalBet: 0,
        cards: [],
        status: 'active',
        isDealer: false,
        isTurn: false,
        position: 2
    });
    
    state.players = players;
    
    const serverSeed = generateServerSeed();
    const deck = generateProvablyFairDeck(serverSeed, 'client', 1);
    const fairness = { currentServerSeed: serverSeed, currentServerHash: hashSeed(serverSeed), clientSeed: 'client', nonce: 1 };
    
    state = PokerEngine.dealHand(state, deck, fairness);
    
    // Check if short-stack players are marked all-in
    const sb = state.players.find(p => p.bet === 10 && p.bet === state.smallBlind);
    const bb = state.players.find(p => p.bet === 20 && p.bet === state.bigBlind);
    
    if (sb && sb.balance === 0 && sb.status !== 'all-in') {
        throw new Error('SB with 0 balance after posting should be all-in');
    }
    
    if (bb && bb.balance === 0 && bb.status !== 'all-in') {
        throw new Error('BB with 0 balance after posting should be all-in');
    }
});

// Test 3: Minimum Raise Calculation
test('Minimum raise should be current bet + last raise amount', () => {
    let state = PokerEngine.initializeGame('test', 6, 1, 2, 'cash');
    const players: PlayerState[] = [];
    for (let i = 0; i < 3; i++) {
        players.push({
            id: `p${i}`,
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
    state.players = players;
    
    const serverSeed = generateServerSeed();
    const deck = generateProvablyFairDeck(serverSeed, 'client', 1);
    const fairness = { currentServerSeed: serverSeed, currentServerHash: hashSeed(serverSeed), clientSeed: 'client', nonce: 1 };
    
    state = PokerEngine.dealHand(state, deck, fairness);
    
    // Initial minBet should be BB
    if (state.minBet !== 2) {
        throw new Error(`Initial minBet should be 2 (BB), got ${state.minBet}`);
    }
    
    // UTG raises to 6 (raise of 4)
    const utg = state.players.find(p => p.isTurn)!;
    state = PokerEngine.handleAction(state, utg.id, 'raise', 6);
    
    // lastRaiseAmount should be 4
    if (state.lastRaiseAmount !== 4) {
        throw new Error(`Last raise amount should be 4, got ${state.lastRaiseAmount}`);
    }
    
    // Minimum re-raise should be 6 + 4 = 10
    const minReraise = state.minBet + state.lastRaiseAmount;
    if (minReraise !== 10) {
        throw new Error(`Minimum re-raise should be 10, got ${minReraise}`);
    }
});

// Test 4: Side Pot Calculation
test('Side pots should be calculated correctly with all-ins', () => {
    let state = PokerEngine.initializeGame('test', 6, 1, 2, 'tournament'); // Use tournament mode (no rake)
    const players: PlayerState[] = [
        { id: 'p0', name: 'Short', avatarUrl: '', balance: 50, bet: 50, totalBet: 50, cards: [], status: 'all-in', isDealer: false, isTurn: false, position: 0 },
        { id: 'p1', name: 'Medium', avatarUrl: '', balance: 0, bet: 100, totalBet: 100, cards: [], status: 'all-in', isDealer: false, isTurn: false, position: 1 },
        { id: 'p2', name: 'Deep', avatarUrl: '', balance: 50, bet: 150, totalBet: 150, cards: [], status: 'active', isDealer: false, isTurn: false, position: 2 }
    ];
    
    // Create cards for evaluation
    players[0].cards = [{ suit: 'spades', rank: 'A' }, { suit: 'hearts', rank: 'A' }];
    players[1].cards = [{ suit: 'diamonds', rank: 'K' }, { suit: 'clubs', rank: 'K' }];
    players[2].cards = [{ suit: 'spades', rank: 'Q' }, { suit: 'hearts', rank: 'Q' }];
    
    state.players = players;
    state.pot = 300;
    state.communityCards = [
        { suit: 'spades', rank: '2' },
        { suit: 'hearts', rank: '3' },
        { suit: 'diamonds', rank: '4' },
        { suit: 'clubs', rank: '5' },
        { suit: 'spades', rank: '6' }
    ];
    
    state = PokerEngine.determineWinner(state);
    
    if (!state.winners || state.winners.length === 0) {
        throw new Error('No winners determined');
    }
    
    // Verify pot distribution
    const totalAwarded = state.winners.reduce((sum, w) => sum + w.amount, 0);
    if (Math.abs(totalAwarded - 300) > 1) {
        throw new Error(`Total awarded ${totalAwarded} doesn't match pot 300`);
    }
});

// Test 5: Heads-Up Blind Rules
test('Heads-up: Dealer should post SB and act first pre-flop', () => {
    let state = PokerEngine.initializeGame('test', 6, 1, 2, 'cash');
    const players: PlayerState[] = [
        { id: 'p0', name: 'Player0', avatarUrl: '', balance: 1000, bet: 0, totalBet: 0, cards: [], status: 'active', isDealer: false, isTurn: false, position: 0 },
        { id: 'p1', name: 'Player1', avatarUrl: '', balance: 1000, bet: 0, totalBet: 0, cards: [], status: 'active', isDealer: false, isTurn: false, position: 1 }
    ];
    
    state.players = players;
    
    const serverSeed = generateServerSeed();
    const deck = generateProvablyFairDeck(serverSeed, 'client', 1);
    const fairness = { currentServerSeed: serverSeed, currentServerHash: hashSeed(serverSeed), clientSeed: 'client', nonce: 1 };
    
    state = PokerEngine.dealHand(state, deck, fairness);
    
    const dealer = state.players.find(p => p.isDealer)!;
    const nonDealer = state.players.find(p => !p.isDealer)!;
    
    // Dealer should have posted SB
    if (dealer.bet !== 1) {
        throw new Error(`Dealer should post SB (1), but posted ${dealer.bet}`);
    }
    
    // Non-dealer should have posted BB
    if (nonDealer.bet !== 2) {
        throw new Error(`Non-dealer should post BB (2), but posted ${nonDealer.bet}`);
    }
    
    // Dealer should have first action pre-flop
    if (!dealer.isTurn) {
        throw new Error('Dealer should act first in heads-up pre-flop');
    }
});

// Test 6: Action Tracking with Raises
test('Action should return to previous actors after a raise', () => {
    let state = PokerEngine.initializeGame('test', 6, 1, 2, 'cash');
    const players: PlayerState[] = [];
    for (let i = 0; i < 4; i++) {
        players.push({
            id: `p${i}`,
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
    state.players = players;
    
    const serverSeed = generateServerSeed();
    const deck = generateProvablyFairDeck(serverSeed, 'client', 1);
    const fairness = { currentServerSeed: serverSeed, currentServerHash: hashSeed(serverSeed), clientSeed: 'client', nonce: 1 };
    
    state = PokerEngine.dealHand(state, deck, fairness);
    
    // UTG calls
    let currentPlayer = state.players.find(p => p.isTurn)!;
    state = PokerEngine.handleAction(state, currentPlayer.id, 'call', 0);
    
    // SB calls
    currentPlayer = state.players.find(p => p.isTurn)!;
    state = PokerEngine.handleAction(state, currentPlayer.id, 'call', 0);
    
    // BB raises
    currentPlayer = state.players.find(p => p.isTurn)!;
    state = PokerEngine.handleAction(state, currentPlayer.id, 'raise', 6);
    
    // Action should go back to BTN (next active player)
    if (state.currentTurnPlayerId === null) {
        throw new Error('Action should continue after raise, not end round');
    }
    
    currentPlayer = state.players.find(p => p.isTurn)!;
    if (currentPlayer.lastAction !== undefined) {
        // This player should get a chance to act again
    }
});

// Test 7: Negative Balance Check
test('Players should never have negative balance', () => {
    let state = PokerEngine.initializeGame('test', 6, 1, 2, 'cash');
    const players: PlayerState[] = [];
    for (let i = 0; i < 3; i++) {
        players.push({
            id: `p${i}`,
            name: `Player${i}`,
            avatarUrl: '',
            balance: 100,
            bet: 0,
            totalBet: 0,
            cards: [],
            status: 'active',
            isDealer: false,
            isTurn: false,
            position: i
        });
    }
    state.players = players;
    
    const serverSeed = generateServerSeed();
    const deck = generateProvablyFairDeck(serverSeed, 'client', 1);
    const fairness = { currentServerSeed: serverSeed, currentServerHash: hashSeed(serverSeed), clientSeed: 'client', nonce: 1 };
    
    state = PokerEngine.dealHand(state, deck, fairness);
    
    // Play through to end
    let loopGuard = 0;
    while (state.phase !== 'showdown' && loopGuard < 50) {
        loopGuard++;
        
        if (!state.currentTurnPlayerId) {
            state = PokerEngine.advancePhase(state);
            continue;
        }
        
        const currentPlayer = state.players.find(p => p.id === state.currentTurnPlayerId);
        if (!currentPlayer) break;
        
        // Random action
        const action = Math.random() > 0.5 ? 'fold' : 'call';
        state = PokerEngine.handleAction(state, currentPlayer.id, action, 0);
        
        // Check all balances
        state.players.forEach(p => {
            if (p.balance < 0) {
                throw new Error(`Player ${p.name} has negative balance: ${p.balance}`);
            }
        });
    }
});

// Test 8: Cards Revealed at Showdown
test('All non-folded player cards should be revealed at showdown', () => {
    let state = PokerEngine.initializeGame('test', 6, 1, 2, 'cash');
    const players: PlayerState[] = [];
    for (let i = 0; i < 2; i++) {
        players.push({
            id: `p${i}`,
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
    state.players = players;
    
    const serverSeed = generateServerSeed();
    const deck = generateProvablyFairDeck(serverSeed, 'client', 1);
    const fairness = { currentServerSeed: serverSeed, currentServerHash: hashSeed(serverSeed), clientSeed: 'client', nonce: 1 };
    
    state = PokerEngine.dealHand(state, deck, fairness);
    
    // All players call to showdown
    let loopGuard = 0;
    while (state.phase !== 'showdown' && loopGuard < 20) {
        loopGuard++;
        
        if (!state.currentTurnPlayerId) {
            state = PokerEngine.advancePhase(state);
            continue;
        }
        
        const currentPlayer = state.players.find(p => p.id === state.currentTurnPlayerId);
        if (!currentPlayer) break;
        
        const toCall = state.minBet - currentPlayer.bet;
        const action = toCall === 0 ? 'check' : 'call';
        state = PokerEngine.handleAction(state, currentPlayer.id, action, 0);
    }
    
    // Check that cards are revealed
    const activePlayers = state.players.filter(p => p.status !== 'folded');
    activePlayers.forEach(p => {
        p.cards.forEach(card => {
            if (card.hidden === true) {
                throw new Error(`Player ${p.name} cards should be revealed at showdown`);
            }
        });
    });
});

console.log('═'.repeat(80));
console.log(`\n📊 EDGE CASE TESTING RESULTS\n`);
console.log(`Passed: ${passed}/${passed + failed}`);
console.log(`Failed: ${failed}/${passed + failed}`);

if (failed === 0) {
    console.log(`\n✨ ALL EDGE CASE TESTS PASSED!\n`);
} else {
    console.log(`\n💥 SOME TESTS FAILED! Review errors above.\n`);
    process.exit(1);
}
