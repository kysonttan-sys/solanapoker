
import { evaluateHand, getPreFlopStrength, HandResult } from './handEvaluator';

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface CardData {
  suit: Suit;
  rank: Rank;
  hidden?: boolean;
}

export interface PlayerState {
  id: string;
  socketId?: string; // Backend specific
  name: string;
  avatarUrl: string;
  balance: number;
  bet: number; 
  totalBet: number; 
  cards: CardData[];
  status: 'active' | 'folded' | 'all-in' | 'sitting-out' | 'eliminated';
  isDealer: boolean;
  isTurn: boolean;
  position: number;
  lastAction?: string;
  handStrength?: number;
  handResult?: HandResult;
  winningHand?: CardData[];
  totalHands?: number;
  finishRank?: number;
  finishWinnings?: number;
}

export type GamePhase = 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface FairnessState {
    currentServerSeed: string;
    currentServerHash: string;
    clientSeed: string;
    nonce: number;
    previousServerSeed?: string;
    previousServerHash?: string;
    previousClientSeed?: string;
    previousNonce?: number;
}

export interface GameState {
  tableId: string;
  gameMode: 'cash' | 'tournament' | 'fun';
  maxSeats: 6 | 9;
  players: PlayerState[];
  pot: number;
  communityCards: CardData[];
  phase: GamePhase;
  currentTurnPlayerId: string | null;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  minBet: number;
  deck: CardData[];
  fairness: FairnessState;
  winners?: { playerId: string; amount: number; handDescription?: string; name: string; cards: CardData[] }[];
  lastLog?: string;
  lastAggressorId?: string;
  handNumber: number;
  rakeCap?: number;
  tournamentDetails?: any;
  lastHand?: any;
}

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Helper to sanitize money
const safeMoney = (amount: number, gameMode: string) => {
    if (gameMode === 'tournament') return Math.floor(amount);
    const fixed = Number(amount.toFixed(4));
    return Math.floor(fixed * 100) / 100;
};

export class PokerEngine {
  static createDeck(): CardData[] {
    const deck: CardData[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank });
      }
    }
    // Fisher-Yates Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  static initializeGame(tableId: string, maxSeats: 6 | 9, smallBlind: number, bigBlind: number, gameMode: 'cash' | 'tournament' | 'fun' = 'cash', prizePool = 0): GameState {
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
    
    const takenSeats = state.players.map(p => p.position);
    let newPos = -1;

    // 1. Prioritize requested position
    if (player.position !== undefined && player.position >= 0 && player.position < state.maxSeats) {
        if (!takenSeats.includes(player.position)) {
            newPos = player.position;
        } else {
            console.warn(`[PokerEngine] Requested seat ${player.position} is taken.`);
        }
    }

    // 2. Fallback to first available if invalid or taken
    if (newPos === -1) {
        let candidate = 0;
        while (takenSeats.includes(candidate)) {
            candidate++;
            if (candidate >= state.maxSeats) break;
        }
        newPos = candidate;
    }

    // Double check to prevent crash
    if (newPos >= state.maxSeats) return state;

    const newPlayer: PlayerState = {
      id: player.id || `bot_${Date.now()}`,
      socketId: player.socketId,
      name: player.name || `Player`,
      avatarUrl: player.avatarUrl || "https://ui-avatars.com/api/?background=random",
      balance: player.balance || 1000,
      bet: 0,
      totalBet: 0,
      cards: [],
      status: state.handNumber === 0 ? 'active' : 'folded',
      isDealer: false,
      isTurn: false,
      position: newPos,
      totalHands: 0
    };

    return {
      ...state,
      players: [...state.players, newPlayer].sort((a, b) => a.position - b.position)
    };
  }

  // --- NEW METHOD: Handle Reconnection ---
  static updatePlayerSocket(state: GameState, playerId: string, newSocketId: string): GameState {
      const players = state.players.map(p => {
          if (p.id === playerId) {
              return { ...p, socketId: newSocketId };
          }
          return p;
      });
      return { ...state, players };
  }

  static dealHand(state: GameState, deck: CardData[], fairness: FairnessState): GameState {
      let handNumber = state.handNumber + 1;
      
      // Archive Last Hand
      let lastHand = state.lastHand;
      if (state.phase === 'showdown' && state.winners) {
          lastHand = {
              handNumber: state.handNumber,
              communityCards: state.communityCards,
              winners: state.winners
          };
      }

      // Reset players
      let pot = 0;
      const players = state.players.map(p => {
          let balance = p.balance;
          let status = p.status;
          
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
              bet: 0,
              totalBet: 0,
              isTurn: false,
              isDealer: false,
              lastAction: undefined,
              handStrength: preFlopStrength,
              winningHand: undefined,
              handResult: undefined,
              totalHands: (status === 'active') ? (p.totalHands || 0) + 1 : p.totalHands
          };
      }) as PlayerState[];

      const activePlayers = players.filter(p => p.status === 'active');
      if (activePlayers.length < 2) return state;

      // Dealer & Blinds Logic
      let nextDealerIndex = (state.dealerIndex + 1) % players.length;
      while(players[nextDealerIndex].status !== 'active') {
          nextDealerIndex = (nextDealerIndex + 1) % players.length;
      }
      players[nextDealerIndex].isDealer = true;

      // SB
      let sbIndex = (nextDealerIndex + 1) % players.length;
      while(players[sbIndex].status !== 'active') sbIndex = (sbIndex + 1) % players.length;
      
      // BB
      let bbIndex = (sbIndex + 1) % players.length;
      while(players[bbIndex].status !== 'active') bbIndex = (bbIndex + 1) % players.length;

      // UTG
      let utgIndex = (bbIndex + 1) % players.length;
      while(players[utgIndex].status !== 'active') utgIndex = (utgIndex + 1) % players.length;

      // Post Blinds
      const sbAmt = Math.min(state.smallBlind, players[sbIndex].balance);
      players[sbIndex].balance -= sbAmt;
      players[sbIndex].bet = sbAmt;
      players[sbIndex].totalBet = sbAmt;
      pot += sbAmt;

      const bbAmt = Math.min(state.bigBlind, players[bbIndex].balance);
      players[bbIndex].balance -= bbAmt;
      players[bbIndex].bet = bbAmt;
      players[bbIndex].totalBet = bbAmt;
      pot += bbAmt;

      players[utgIndex].isTurn = true;

      return {
          ...state,
          players,
          pot: safeMoney(pot, state.gameMode),
          communityCards: [],
          phase: 'pre-flop',
          currentTurnPlayerId: players[utgIndex].id,
          dealerIndex: nextDealerIndex,
          minBet: state.bigBlind,
          deck,
          winners: undefined,
          lastHand,
          lastLog: `Hand #${handNumber} started.`,
          handNumber,
          fairness
      };
  }

  static handleAction(state: GameState, playerId: string, action: string, amount: number = 0): GameState {
      const playerIndex = state.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return state;

      const player = state.players[playerIndex];
      // Basic check: ensure it's their turn
      if (!player.isTurn) return state;

      let newPlayers = [...state.players];
      let newPot = state.pot;
      let newMinBet = state.minBet;
      let logMsg = '';

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
              const callAmt = Math.min(state.minBet - player.bet, player.balance);
              newPlayers[playerIndex] = { 
                  ...player, 
                  balance: safeMoney(player.balance - callAmt, state.gameMode),
                  bet: safeMoney(player.bet + callAmt, state.gameMode),
                  totalBet: safeMoney(player.totalBet + callAmt, state.gameMode),
                  isTurn: false,
                  lastAction: 'Call',
                  status: (player.balance - callAmt === 0) ? 'all-in' : 'active'
              };
              newPot += callAmt;
              logMsg = `${player.name} calls.`;
              break;
          case 'raise':
              const raiseTo = Math.max(amount, state.minBet * 2);
              const addedAmt = Math.min(raiseTo - player.bet, player.balance);
              newPlayers[playerIndex] = {
                  ...player,
                  balance: safeMoney(player.balance - addedAmt, state.gameMode),
                  bet: safeMoney(player.bet + addedAmt, state.gameMode),
                  totalBet: safeMoney(player.totalBet + addedAmt, state.gameMode),
                  isTurn: false,
                  lastAction: `Raise ${raiseTo}`,
                  status: (player.balance - addedAmt === 0) ? 'all-in' : 'active'
              };
              newPot += addedAmt;
              newMinBet = Math.max(newMinBet, player.bet + addedAmt);
              logMsg = `${player.name} raises to ${newMinBet}.`;
              break;
      }

      // Check if betting round is complete
      const activePlayers = newPlayers.filter(p => p.status === 'active' || p.status === 'all-in');
      const allMatched = activePlayers.every(p => p.bet === newMinBet || p.status === 'all-in' || p.status === 'folded');
      const allActed = activePlayers.every(p => p.lastAction !== undefined || p.status === 'all-in');

      if (allMatched && allActed) {
          // Round complete
          return {
              ...state,
              players: newPlayers,
              pot: safeMoney(newPot, state.gameMode),
              minBet: newMinBet,
              currentTurnPlayerId: null, // Signals end of phase
              lastLog: logMsg
          };
      }

      // Pass turn
      let nextIndex = (playerIndex + 1) % newPlayers.length;
      while(newPlayers[nextIndex].status !== 'active') {
          nextIndex = (nextIndex + 1) % newPlayers.length;
          // Loop guard omitted for brevity in snippet
      }
      newPlayers[nextIndex].isTurn = true;

      return {
          ...state,
          players: newPlayers,
          pot: safeMoney(newPot, state.gameMode),
          minBet: newMinBet,
          currentTurnPlayerId: newPlayers[nextIndex].id,
          lastLog: logMsg
      };
  }

  static advancePhase(state: GameState): GameState {
      // Move to next street
      let nextPhase: GamePhase = 'pre-flop';
      let newDeck = [...state.deck];
      let newCommunityCards = [...state.communityCards];
      let msg = '';

      if (state.phase === 'pre-flop') {
          nextPhase = 'flop';
          newDeck.pop(); // Burn
          newCommunityCards.push(newDeck.pop()!, newDeck.pop()!, newDeck.pop()!);
          msg = 'Flop dealt.';
      } else if (state.phase === 'flop') {
          nextPhase = 'turn';
          newDeck.pop();
          newCommunityCards.push(newDeck.pop()!);
          msg = 'Turn dealt.';
      } else if (state.phase === 'turn') {
          nextPhase = 'river';
          newDeck.pop();
          newCommunityCards.push(newDeck.pop()!);
          msg = 'River dealt.';
      } else if (state.phase === 'river') {
          return this.determineWinner({ ...state, communityCards: newCommunityCards });
      }

      // Prepare players for next round (reset bets)
      const players = state.players.map(p => ({ 
          ...p, 
          bet: 0, 
          lastAction: undefined,
          isTurn: false 
      }));

      // Find first active player left of dealer
      let nextIndex = (state.dealerIndex + 1) % players.length;
      while(players[nextIndex].status !== 'active') {
          nextIndex = (nextIndex + 1) % players.length;
      }
      players[nextIndex].isTurn = true;

      return {
          ...state,
          phase: nextPhase,
          deck: newDeck,
          communityCards: newCommunityCards,
          players,
          minBet: 0,
          currentTurnPlayerId: players[nextIndex].id,
          lastLog: msg
      };
  }

  static determineWinner(state: GameState): GameState {
      // Simplified Winner Determination
      // In production, this uses evaluateHand from handEvaluator
      const players = state.players;
      const activeCandidates = players.filter(p => p.status !== 'folded' && p.status !== 'sitting-out');

      activeCandidates.forEach(p => {
          p.handResult = evaluateHand([...p.cards, ...state.communityCards]);
      });

      // Simple winner sort (highest score)
      activeCandidates.sort((a, b) => (b.handResult?.score || 0) - (a.handResult?.score || 0));
      
      const winner = activeCandidates[0];
      const winAmount = state.pot;

      // Award Pot
      const newPlayers = players.map(p => {
          if (p.id === winner.id) {
              return { ...p, balance: safeMoney(p.balance + winAmount, state.gameMode), winningHand: winner.handResult?.winningCards };
          }
          return p;
      });

      return {
          ...state,
          players: newPlayers,
          phase: 'showdown',
          pot: 0,
          winners: [{
              playerId: winner.id,
              amount: winAmount,
              name: winner.name,
              handDescription: winner.handResult?.name,
              cards: winner.cards
          }],
          lastLog: `${winner.name} wins $${winAmount} with ${winner.handResult?.name}!`
      };
  }

  static toggleSitOut(state: GameState, playerId: string): GameState {
      const players = state.players.map(p => {
          if (p.id === playerId) {
              return { ...p, status: p.status === 'sitting-out' ? 'folded' : 'sitting-out' };
          }
          return p;
      });
      return { ...state, players: players as any }; // Cast for strict type mismatch in status string
  }
}
