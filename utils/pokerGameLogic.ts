
import { getVipStatus } from '../constants';
import { evaluateHand, getPreFlopStrength, HandResult } from './handEvaluator';

// Types for the Poker Engine
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface CardData {
  suit: Suit;
  rank: Rank;
  hidden?: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  avatarUrl: string;
  balance: number; // Chip stack
  bet: number; // Current bet in this round
  totalBet: number; // Total bet in the hand (for pot calcs)
  cards: CardData[];
  status: 'active' | 'folded' | 'all-in' | 'sitting-out' | 'eliminated';
  isDealer: boolean;
  isTurn: boolean;
  position: number; // 0-8 (Seat Index)
  lastAction?: string; // e.g., "Check", "Raise 50"
  handStrength?: number; // 0-100, used for Bot AI
  handResult?: HandResult; // The actual poker hand score
  winningHand?: CardData[]; // The specific 5 cards if they won
  totalHands?: number; // Added for VIP tracking
}

export type GamePhase = 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface FairnessState {
    currentServerSeed: string; // The unhashed seed (Secret until hand over)
    currentServerHash: string; // The hashed seed (Public)
    clientSeed: string;
    nonce: number;
    // Previous hand data for verification
    previousServerSeed?: string;
    previousServerHash?: string;
    previousClientSeed?: string;
    previousNonce?: number;
}

export interface GameState {
  tableId: string;
  gameMode: 'cash' | 'fun';
  maxSeats: 6 | 9;
  creatorId?: string | null; // Table creator's user ID for Host-to-Earn attribution
  players: PlayerState[];
  pot: number;
  communityCards: CardData[];
  phase: GamePhase;
  currentTurnPlayerId: string | null;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  minBet: number; // Current highest bet to match
  deck: CardData[]; // Keep deck in state to deal streets
  fairness: FairnessState; // PROVABLY FAIR DATA
  winners?: { playerId: string; amount: number; handDescription?: string; name: string; cards: CardData[] }[];
  lastHand?: {
      handNumber: number;
      communityCards: CardData[];
      winners: { playerId: string; amount: number; handDescription?: string; name: string; cards: CardData[] }[];
  };
  lastLog?: string;
  lastAggressorId?: string; // Track for showdown order
  handNumber: number; // Track total hands played
  rakeCap?: number; // Cap for cash games (Table Limit)
}

// --- LOGIC ---

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Realistic Bot Names
export const BOT_NAMES = [
  "Durrrr", "Isildur1", "Phil_Ivey", "KidPoker", "ActionJackson", 
  "LooseCannon", "NitBox", "CheckRaise", "RiverRat", "AllInAnyTwo",
  "SolDegen", "WhaleHunter", "GTO_Wizard", "PokerFace", "TiltMaster",
  "CoinFlip", "DeepStack", "SlowPlay", "BluffCatcher", "VegasPro"
];

// Helper to sanitize money
const safeMoney = (amount: number, gameMode: 'cash' | 'fun') => {
    const fixed = Number(amount.toFixed(4));
    return Math.floor(fixed * 100) / 100;
};

export class PokerEngine {
  
  // NOTE: Deck generation is now handled externally via `fairness.ts` for Provably Fair compliance.
  // We keep this for fallback/tests only.
  static createDeck(): CardData[] {
    const deck: CardData[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank });
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  // Initial State Factory
  static initializeGame(
      tableId: string,
      maxSeats: 6 | 9,
      smallBlind: number,
      bigBlind: number,
      gameMode: 'cash' | 'fun' = 'cash',
      rakeCap: number = 5
    ): GameState {

    return {
      tableId,
      gameMode,
      maxSeats,
      players: [],
      pot: 0,
      communityCards: [],
      phase: 'pre-flop',
      currentTurnPlayerId: null,
      dealerIndex: 0,
      smallBlind,
      bigBlind,
      minBet: bigBlind,
      deck: [],
      handNumber: 0,
      rakeCap,
      fairness: {
          currentServerSeed: '',
          currentServerHash: '',
          clientSeed: 'init',
          nonce: 0
      }
    };
  }

  static addPlayer(state: GameState, player: Partial<PlayerState>): GameState {
    if (state.players.length >= state.maxSeats) return state;
    
    let botName = player.name;
    if (!botName) {
        const usedNames = state.players.map(p => p.name);
        const availableNames = BOT_NAMES.filter(n => !usedNames.includes(n));
        botName = availableNames[Math.floor(Math.random() * availableNames.length)] || `Bot_${Date.now()}`;
    }

    const randomBotHands = Math.floor(Math.random() * 15000);
    const initialStatus = state.handNumber === 0 ? 'active' : 'folded';

    const takenSeats = state.players.map(p => p.position);
    let newPos = -1;

    if (player.position !== undefined && player.position >= 0 && player.position < state.maxSeats) {
        if (!takenSeats.includes(player.position)) {
            newPos = player.position;
        }
    }

    if (newPos === -1) {
        let candidate = 0;
        while (takenSeats.includes(candidate)) {
            candidate++;
            if (candidate >= state.maxSeats) break; 
        }
        newPos = candidate;
    }

    const newPlayer: PlayerState = {
      id: player.id || `bot_${Date.now()}_${Math.random()}`,
      name: botName,
      avatarUrl: player.avatarUrl || `https://ui-avatars.com/api/?name=${botName}&background=random`,
      balance: safeMoney(player.balance || 1000, state.gameMode),
      bet: 0,
      totalBet: 0,
      cards: [],
      status: initialStatus,
      isDealer: false,
      isTurn: false,
      position: newPos,
      totalHands: player.totalHands !== undefined ? player.totalHands : randomBotHands
    };

    return {
      ...state,
      players: [...state.players, newPlayer].sort((a, b) => a.position - b.position)
    };
  }

  static rebuyPlayer(state: GameState, playerId: string, amount: number): GameState {
      const playerIndex = state.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return state;

      const newPlayers = [...state.players];
      const player = newPlayers[playerIndex];
      
      newPlayers[playerIndex] = {
          ...player,
          balance: safeMoney(player.balance + amount, state.gameMode),
          status: player.status === 'eliminated' ? 'sitting-out' : player.status
      };

      return {
          ...state,
          players: newPlayers,
          lastLog: `${player.name} rebuys for $${amount.toLocaleString()}.`
      };
  }

  // UPDATED: Now accepts a pre-shuffled deck and fairness data
  static dealHand(
      state: GameState,
      provablyFairDeck: CardData[],
      newFairnessState: FairnessState
    ): GameState {

    const deck = provablyFairDeck;
    let handNumber = state.handNumber || 0;

    // Archive Last Hand
    let lastHand = state.lastHand;
    if (state.phase === 'showdown' && state.winners && state.winners.length > 0) {
        lastHand = {
            handNumber: state.handNumber,
            communityCards: state.communityCards,
            winners: state.winners
        };
    }

    handNumber++;

    let currentSb = state.smallBlind;
    let currentBb = state.bigBlind;

    // Reset players
    let pot = 0;
    const players = state.players.map(p => {
        let balance = p.balance;
        let status = p.status;
        let bet = 0;
        let totalBet = 0;

        if (state.gameMode === 'cash' && !p.id.startsWith('u') && status !== 'sitting-out' && balance < currentBb * 10) {
            balance += currentBb * 100;
        }

        if (status !== 'sitting-out' && status !== 'eliminated') {
            status = balance > 0 ? 'active' : 'sitting-out';
        }

        const cards = (status === 'sitting-out' || status === 'eliminated') ? [] : [{...deck.pop()!, hidden: true}, {...deck.pop()!, hidden: true}];

        const preFlopStrength = cards.length === 2 ? getPreFlopStrength(cards[0], cards[1]) : 0;

        return {
            ...p,
            balance,
            status,
            cards,
            bet,
            totalBet,
            isTurn: false,
            isDealer: false,
            lastAction: undefined,
            handStrength: preFlopStrength,
            winningHand: undefined,
            handResult: undefined,
            totalHands: (status === 'active' || status === 'all-in') ? (p.totalHands || 0) + 1 : p.totalHands
        };
    }) as PlayerState[];

    const activePlayers = players.filter(p => p.status !== 'sitting-out' && p.status !== 'eliminated');
    if (activePlayers.length < 2) {
        return state;
    }

    let nextDealerIndex = (state.dealerIndex + 1) % players.length;
    while(players[nextDealerIndex].status === 'sitting-out' || players[nextDealerIndex].status === 'eliminated') {
        nextDealerIndex = (nextDealerIndex + 1) % players.length;
    }
    players[nextDealerIndex].isDealer = true;

    // Post Blinds
    let sbIndex = (nextDealerIndex + 1) % players.length;
    while(players[sbIndex].status === 'sitting-out' || players[sbIndex].status === 'eliminated') sbIndex = (sbIndex + 1) % players.length;

    let bbIndex = (sbIndex + 1) % players.length;
    while(players[bbIndex].status === 'sitting-out' || players[bbIndex].status === 'eliminated') bbIndex = (bbIndex + 1) % players.length;

    let utgIndex = (bbIndex + 1) % players.length;
    while(players[utgIndex].status === 'sitting-out' || players[utgIndex].status === 'eliminated') utgIndex = (utgIndex + 1) % players.length;

    const sbAmount = Math.min(currentSb, players[sbIndex].balance);
    players[sbIndex].balance = safeMoney(players[sbIndex].balance - sbAmount, state.gameMode);
    players[sbIndex].bet = sbAmount;
    players[sbIndex].totalBet = sbAmount;
    if (players[sbIndex].balance === 0) players[sbIndex].status = 'all-in';
    pot += sbAmount;

    const bbAmount = Math.min(currentBb, players[bbIndex].balance);
    players[bbIndex].balance = safeMoney(players[bbIndex].balance - bbAmount, state.gameMode);
    players[bbIndex].bet = bbAmount;
    players[bbIndex].totalBet = bbAmount;
    if (players[bbIndex].balance === 0) players[bbIndex].status = 'all-in';
    pot += bbAmount;

    players[utgIndex].isTurn = true;

    const msg = `Hand #${handNumber} started. Blinds ${currentSb}/${currentBb}.`;

    return {
        ...state,
        players,
        pot: safeMoney(pot, state.gameMode),
        communityCards: [],
        phase: 'pre-flop',
        currentTurnPlayerId: players[utgIndex].id,
        dealerIndex: nextDealerIndex,
        minBet: currentBb,
        smallBlind: currentSb,
        bigBlind: currentBb,
        deck,
        winners: undefined,
        lastHand,
        lastLog: msg,
        lastAggressorId: undefined,
        handNumber,
        fairness: newFairnessState // Update with Provably Fair data
    };
  }

  // --- BOT AI LOGIC ---
  static getBotDecision(state: GameState, playerId: string): { action: 'fold' | 'check' | 'call' | 'raise', amount: number } {
      const player = state.players.find(p => p.id === playerId);
      if (!player) return { action: 'fold', amount: 0 };

      const toCall = safeMoney(state.minBet - player.bet, state.gameMode);
      
      const strength = player.handStrength || 50; 
      let effectiveStrength = strength;
      
      effectiveStrength += (Math.random() * 10) - 5;

      const activePlayers = state.players.filter(p => p.status === 'active' || p.status === 'all-in');
      const positionIndex = activePlayers.findIndex(p => p.id === playerId);
      const relativePos = positionIndex / activePlayers.length; 

      // Tightened ranges for more realistic play
      const foldThreshold = (40 - (relativePos * 5));
      const raiseThreshold = (70 - (relativePos * 10)); 

      const rng = Math.random();

      if (toCall === 0) {
          if (effectiveStrength > raiseThreshold || (rng > 0.9)) { 
             if (effectiveStrength > 90 && rng < 0.5) return { action: 'check', amount: 0 };
             return { action: 'raise', amount: state.bigBlind * 3 }; 
          }
          return { action: 'check', amount: 0 };
      }

      if (effectiveStrength < foldThreshold) {
          if (rng > 0.95 && state.phase === 'pre-flop') { 
               return { action: 'raise', amount: state.minBet * 2.5 };
          }
          return { action: 'fold', amount: 0 };
      } 
      else if (effectiveStrength > raiseThreshold) {
          return { action: 'raise', amount: state.minBet * 2.5 };
      } 
      else {
          return { action: 'call', amount: 0 };
      }
  }

  static handleAction(state: GameState, playerId: string, action: 'fold' | 'check' | 'call' | 'raise', amount: number = 0): GameState {
    const playerIndex = state.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return state;

    const player = state.players[playerIndex];
    if (!player.isTurn && action !== 'fold') return state; 

    let newPlayers = [...state.players];
    let newPot = state.pot;
    let newMinBet = state.minBet;
    let logMsg = '';
    let lastAggressorId = state.lastAggressorId;

    switch (action) {
        case 'fold':
            newPlayers[playerIndex] = { ...player, status: 'folded', isTurn: false, lastAction: 'Fold' };
            logMsg = `${player.name} folds.`;
            break;

        case 'check':
            newPlayers[playerIndex] = { ...player, isTurn: false, lastAction: 'Check' };
            logMsg = `${player.name} checks.`;
            break;

        case 'call':
            const callAmount = safeMoney(state.minBet - player.bet, state.gameMode);
            const actualCall = Math.min(callAmount, player.balance);
            const remainingAfterCall = safeMoney(player.balance - actualCall, state.gameMode);
            
            newPlayers[playerIndex] = { 
                ...player, 
                balance: remainingAfterCall,
                bet: safeMoney(player.bet + actualCall, state.gameMode),
                totalBet: safeMoney(player.totalBet + actualCall, state.gameMode),
                isTurn: false,
                lastAction: remainingAfterCall === 0 ? 'All In' : 'Call',
                status: remainingAfterCall === 0 ? 'all-in' : player.status
            };
            newPot = safeMoney(newPot + actualCall, state.gameMode);
            logMsg = remainingAfterCall === 0 ? `${player.name} goes All In!` : `${player.name} calls.`;
            break;

        case 'raise':
            // Detect All-In: if amount >= player's balance, go all-in
            const isAllInRaise = amount >= player.balance;

            let actualRaise: number;
            let finalBet: number;
            let remainingAfterRaise: number;

            if (isAllInRaise) {
                // ALL-IN: Take entire balance
                actualRaise = player.balance;
                finalBet = safeMoney(player.bet + actualRaise, state.gameMode);
                remainingAfterRaise = 0;
            } else {
                // NORMAL RAISE: amount is the total bet to make this round
                let raiseTo = amount;
                if (raiseTo < state.minBet * 2) raiseTo = state.minBet * 2;

                const addedAmt = safeMoney(raiseTo - player.bet, state.gameMode);
                actualRaise = Math.min(addedAmt, player.balance);
                remainingAfterRaise = safeMoney(player.balance - actualRaise, state.gameMode);
                finalBet = safeMoney(player.bet + actualRaise, state.gameMode);
            }

            newPlayers[playerIndex] = {
                ...player,
                balance: remainingAfterRaise,
                bet: finalBet,
                totalBet: safeMoney(player.totalBet + actualRaise, state.gameMode),
                isTurn: false,
                lastAction: remainingAfterRaise === 0 ? 'All In' : `Raise to ${finalBet}`,
                status: remainingAfterRaise === 0 ? 'all-in' : player.status
            };
            newPot = safeMoney(newPot + actualRaise, state.gameMode);
            newMinBet = Math.max(state.minBet, finalBet);

            logMsg = remainingAfterRaise === 0 ? `${player.name} raises All In!` : `${player.name} raises to ${newMinBet}.`;
            lastAggressorId = player.id;
            break;
    }

    const activeAndAllIn = newPlayers.filter(p => p.status !== 'folded' && p.status !== 'sitting-out' && p.status !== 'eliminated');
    if (activeAndAllIn.length === 1) {
        return this.distributePot(state, newPlayers);
    }

    const bettingComplete = activeAndAllIn.every(p => 
        (p.bet === newMinBet || p.status === 'all-in') && 
        (p.lastAction !== undefined)
    );

    if (bettingComplete) {
         newPlayers[playerIndex].isTurn = false;
         return {
            ...state,
            players: newPlayers,
            pot: newPot,
            minBet: newMinBet,
            currentTurnPlayerId: null, 
            lastLog: logMsg,
            lastAggressorId
         };
    }

    // Determine Next Turn
    let nextIndex = (playerIndex + 1) % newPlayers.length;
    let loopCount = 0;
    while(newPlayers[nextIndex].status !== 'active') { 
        if (loopCount > newPlayers.length) break; 
        nextIndex = (nextIndex + 1) % newPlayers.length;
        loopCount++;
    }

    if (newPlayers[nextIndex].status !== 'active') {
         return {
            ...state,
            players: newPlayers,
            pot: newPot,
            minBet: newMinBet,
            currentTurnPlayerId: null, 
            lastLog: logMsg,
            lastAggressorId
         };
    }

    newPlayers[nextIndex].isTurn = true;
    
    return {
        ...state,
        players: newPlayers,
        pot: newPot,
        minBet: newMinBet,
        currentTurnPlayerId: newPlayers[nextIndex].id,
        lastLog: logMsg,
        lastAggressorId
    };
  }

  static toggleSitOut(state: GameState, playerId: string): GameState {
      const playerIndex = state.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return state;

      const player = state.players[playerIndex];
      let newState = state;
      let logMsg = '';

      if (player.status === 'sitting-out') {
          const newPlayers = [...state.players];
          newPlayers[playerIndex] = { ...player, status: 'folded' }; 
          logMsg = `${player.name} sits back in.`;
          return { ...state, players: newPlayers, lastLog: logMsg };

      } else {
          logMsg = `${player.name} stands up (sitting out).`;
          
          if (player.status === 'active' || player.status === 'all-in') {
              if (player.isTurn) {
                  newState = this.handleAction(state, playerId, 'fold');
                  const pIdx = newState.players.findIndex(p => p.id === playerId);
                  newState.players[pIdx].status = 'sitting-out';
              } else {
                  const newPlayers = [...state.players];
                  newPlayers[playerIndex] = { ...player, status: 'sitting-out', cards: [], isTurn: false };
                  
                  const activeLeft = newPlayers.filter(p => p.status !== 'folded' && p.status !== 'sitting-out' && p.status !== 'eliminated');
                  if (activeLeft.length === 1) {
                      return this.distributePot(newState, newPlayers);
                  }
                  newState = { ...state, players: newPlayers };
              }
          } else {
               const newPlayers = [...state.players];
               newPlayers[playerIndex] = { ...player, status: 'sitting-out' };
               newState = { ...state, players: newPlayers };
          }
      }

      return { ...newState, lastLog: logMsg };
  }

  static advancePhase(state: GameState): GameState {
      let nextPhase: GamePhase = 'pre-flop';
      let newDeck = [...state.deck];
      let newCommunityCards = [...state.communityCards];
      let logMsg = '';

      if (state.phase === 'pre-flop') {
          nextPhase = 'flop';
          newDeck.pop(); 
          if (newDeck.length >= 3) {
             newCommunityCards.push(newDeck.pop()!, newDeck.pop()!, newDeck.pop()!);
          }
          logMsg = 'Dealing Flop...';
      } else if (state.phase === 'flop') {
          nextPhase = 'turn';
          newDeck.pop();
          if (newDeck.length >= 1) {
              newCommunityCards.push(newDeck.pop()!);
          }
          logMsg = 'Dealing Turn...';
      } else if (state.phase === 'turn') {
          nextPhase = 'river';
          newDeck.pop();
           if (newDeck.length >= 1) {
              newCommunityCards.push(newDeck.pop()!);
          }
          logMsg = 'Dealing River...';
      } else if (state.phase === 'river') {
          nextPhase = 'showdown';
          logMsg = 'Showdown!';
          return this.determineWinner({ ...state, phase: nextPhase, communityCards: newCommunityCards, lastLog: logMsg });
      }

      if (newDeck.length === 0) {
           logMsg = 'Deck Empty! Forcing Showdown.';
           return this.determineWinner({ ...state, phase: 'showdown', communityCards: newCommunityCards, lastLog: logMsg });
      }

      const playersWithUpdatedStrength = state.players.map(p => {
          if (p.status !== 'active' && p.status !== 'all-in') return p;
          
          const result = evaluateHand([...p.cards, ...newCommunityCards]);
          
          let strength = 0;
          if (result.score >= 9000000) strength = 100; // Royal
          else if (result.score >= 5000000) strength = 95; // Flush/FullHouse+
          else if (result.score >= 4000000) strength = 85; // Straight
          else if (result.score >= 3000000) strength = 75; // Trips
          else if (result.score >= 2000000) strength = 65; // Two Pair
          else if (result.score >= 1000000) strength = 50; // Pair
          else strength = Math.min(40, (result.score / 15) * 40); 

          return { ...p, bet: 0, lastAction: undefined, handStrength: strength, handResult: result };
      });
      
      const activePlayers = playersWithUpdatedStrength.filter(p => p.status === 'active');
      const allInPlayers = playersWithUpdatedStrength.filter(p => p.status === 'all-in');
      
      if (activePlayers.length < 2 && (activePlayers.length + allInPlayers.length) >= 2) {
           return this.advancePhase({
               ...state,
               phase: nextPhase,
               deck: newDeck,
               communityCards: newCommunityCards,
               players: playersWithUpdatedStrength,
               minBet: 0,
               currentTurnPlayerId: null, 
               lastLog: logMsg
           });
      }

      let nextIndex = (state.dealerIndex + 1) % playersWithUpdatedStrength.length;
      let loop = 0;
      while(playersWithUpdatedStrength[nextIndex].status !== 'active') {
        if(loop > 20) break;
        nextIndex = (nextIndex + 1) % playersWithUpdatedStrength.length;
        loop++;
      }
      
      if (playersWithUpdatedStrength[nextIndex].status !== 'active') {
           return this.advancePhase({
               ...state,
               phase: nextPhase,
               deck: newDeck,
               communityCards: newCommunityCards,
               players: playersWithUpdatedStrength,
               minBet: 0,
               currentTurnPlayerId: null, 
               lastLog: logMsg
           });
      }

      playersWithUpdatedStrength.forEach(p => p.isTurn = false);
      playersWithUpdatedStrength[nextIndex].isTurn = true;

      return {
          ...state,
          phase: nextPhase,
          deck: newDeck,
          communityCards: newCommunityCards,
          players: playersWithUpdatedStrength,
          minBet: 0,
          currentTurnPlayerId: playersWithUpdatedStrength[nextIndex].id,
          lastLog: logMsg
      };
  }

  static determineWinner(state: GameState): GameState {
      // Reveal cards
      const playersRevealed = state.players.map(p => {
          if (p.status !== 'folded' && p.status !== 'sitting-out' && p.status !== 'eliminated') {
               return {
                   ...p,
                   cards: p.cards.map(c => ({ ...c, hidden: false }))
               };
          }
          return p;
      });

      return this.distributePot({ ...state, players: playersRevealed }, playersRevealed);
  }

  static distributePot(state: GameState, currentPlayers: PlayerState[]): GameState {
      const players = [...currentPlayers];
      const activeCandidates = players.filter(p => p.status !== 'folded' && p.status !== 'sitting-out' && p.status !== 'eliminated');

      activeCandidates.forEach(p => {
          if (!p.handResult) {
              p.handResult = evaluateHand([...p.cards, ...state.communityCards]);
          }
      });

      const sortedBets = Array.from(new Set(activeCandidates.map(p => p.totalBet).filter(b => b > 0))).sort((a, b) => a - b);

      const winnersMap = new Map<string, { amount: number, desc: string, winningHand: CardData[] }>();
      let totalRakeCollected = 0;
      let prevLevel = 0;

      for (const level of sortedBets) {
          const potSliceAmount = safeMoney(level - prevLevel, state.gameMode);
          if (potSliceAmount <= 0) continue;

          let slicePot = 0;
          players.forEach(p => {
              const contribution = Math.max(0, Math.min(p.totalBet, level) - prevLevel);
              slicePot = safeMoney(slicePot + contribution, state.gameMode);
          });

          const eligibleWinners = activeCandidates.filter(p => p.totalBet >= level);

          if (eligibleWinners.length === 0) continue;

          let bestScore = -1;
          let sliceWinners: PlayerState[] = [];
          
          eligibleWinners.forEach(p => {
               const score = p.handResult?.score || 0;
               if (score > bestScore) {
                   bestScore = score;
                   sliceWinners = [p];
               } else if (score === bestScore) {
                   sliceWinners.push(p);
               }
          });

          if (state.gameMode === 'cash' && state.rakeCap) {
             const winnerVip = getVipStatus(sliceWinners[0].totalHands || 0);
             const rakeRate = winnerVip.rake;
             const rakeAmt = Math.min(slicePot * rakeRate, state.rakeCap / sortedBets.length); 
             
             const actualRake = safeMoney(rakeAmt, 'cash');
             
             slicePot = safeMoney(slicePot - actualRake, 'cash');
             totalRakeCollected = safeMoney(totalRakeCollected + actualRake, 'cash');
          }

          const share = slicePot / sliceWinners.length;
          
          sliceWinners.forEach(w => {
              const current = winnersMap.get(w.id) || { amount: 0, desc: '', winningHand: [] };
              const desc = w.handResult?.name || 'Hand';
              
              const addedAmount = safeMoney(share, state.gameMode);

              winnersMap.set(w.id, { 
                  amount: safeMoney(current.amount + addedAmount, state.gameMode), 
                  desc: desc,
                  winningHand: w.handResult?.winningCards || []
              });
          });

          prevLevel = level;
      }

      const survivorsBefore = players.filter(p => p.status !== 'eliminated' && p.status !== 'sitting-out').length;
      
      const newPlayers = players.map(p => {
          const winData = winnersMap.get(p.id);
          let newBal = p.balance;
          let winningHand = undefined;
          
          if (winData) {
              newBal = safeMoney(newBal + winData.amount, state.gameMode);
              winningHand = winData.winningHand;
          }

          let newStatus = p.status;

          if (p.status === 'all-in' && newBal > 0) {
              newStatus = 'active';
          }

          return { ...p, balance: newBal, isTurn: false, bet: 0, totalBet: 0, status: newStatus, winningHand };
      });

      const winnersArray = Array.from(winnersMap.entries()).map(([id, data]) => ({
          playerId: id,
          amount: data.amount,
          handDescription: data.desc,
          name: players.find(p => p.id === id)?.name || 'Unknown',
          cards: players.find(p => p.id === id)?.cards || []
      }));

      winnersArray.sort((a,b) => b.amount - a.amount);

      let logMsg = winnersArray.length > 0 
        ? winnersArray.map(w => `${w.name} wins ${state.gameMode === 'cash' ? '$' : ''}${w.amount.toLocaleString(undefined, {minimumFractionDigits: state.gameMode === 'cash' ? 2 : 0})} (${w.handDescription})`).join(', ')
        : `Pot distributed.`;
      
      if (totalRakeCollected > 0) {
          logMsg += ` (Rake: $${totalRakeCollected.toFixed(2)})`;
      }

      return {
          ...state,
          players: newPlayers,
          pot: 0,
          phase: 'showdown',
          currentTurnPlayerId: null, 
          winners: winnersArray,
          lastLog: logMsg,
      };
  }
}
