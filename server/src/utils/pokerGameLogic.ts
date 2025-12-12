
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
  gameMode: 'cash' | 'fun';
  maxSeats: 6 | 9;
  creatorId: string | null; // Table creator's user ID for Host-to-Earn attribution
  players: PlayerState[];
  pot: number;
  communityCards: CardData[];
  phase: GamePhase;
  currentTurnPlayerId: string | null;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  minBet: number;
  lastRaiseAmount: number;
  deck: CardData[];
  fairness: FairnessState;
  winners?: { playerId: string; amount: number; handDescription?: string; name: string; cards: CardData[] }[];
  lastLog?: string;
  lastAggressorId?: string;
  handNumber: number;
  rakeCap?: number;
  lastHand?: any;
}

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Helper to sanitize money
const safeMoney = (amount: number, gameMode: string) => {
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

  static initializeGame(tableId: string, maxSeats: 6 | 9, smallBlind: number, bigBlind: number, gameMode: 'cash' | 'fun' = 'cash', creatorId: string | null = null): GameState {
    return {
      tableId,
      gameMode,
      maxSeats,
      creatorId,
      players: [],
      pot: 0,
      communityCards: [],
      phase: 'pre-flop',
      currentTurnPlayerId: null,
      dealerIndex: 0,
      smallBlind,
      bigBlind,
      minBet: bigBlind,
      lastRaiseAmount: bigBlind,
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
      if (activePlayers.length < 2) {
          // Not enough players to start - reset to waiting state
          return {
              ...state,
              phase: 'pre-flop',
              winners: undefined,
              currentTurnPlayerId: null,
              communityCards: [],
              pot: 0,
              lastLog: 'Waiting for more players...'
          };
      }

      // Dealer & Blinds Logic
      let nextDealerIndex = (state.dealerIndex + 1) % players.length;
      let loopGuard = 0;
      while(players[nextDealerIndex].status !== 'active' && loopGuard < players.length) {
          nextDealerIndex = (nextDealerIndex + 1) % players.length;
          loopGuard++;
      }
      players[nextDealerIndex].isDealer = true;

      // HEADS-UP RULE: Dealer is Small Blind when only 2 players
      let sbIndex, bbIndex, utgIndex;
      
      if (activePlayers.length === 2) {
          // Heads-up: Dealer posts SB, other player posts BB
          sbIndex = nextDealerIndex;
          bbIndex = (nextDealerIndex + 1) % players.length;
          loopGuard = 0;
          while(players[bbIndex].status !== 'active' && loopGuard < players.length) {
              bbIndex = (bbIndex + 1) % players.length;
              loopGuard++;
          }
          utgIndex = sbIndex; // Dealer acts first pre-flop in heads-up
      } else {
          // Standard: SB left of dealer
          sbIndex = (nextDealerIndex + 1) % players.length;
          loopGuard = 0;
          while(players[sbIndex].status !== 'active' && loopGuard < players.length) {
              sbIndex = (sbIndex + 1) % players.length;
              loopGuard++;
          }
          
          // BB left of SB
          bbIndex = (sbIndex + 1) % players.length;
          loopGuard = 0;
          while(players[bbIndex].status !== 'active' && loopGuard < players.length) {
              bbIndex = (bbIndex + 1) % players.length;
              loopGuard++;
          }

          // UTG left of BB
          utgIndex = (bbIndex + 1) % players.length;
          loopGuard = 0;
          while(players[utgIndex].status !== 'active' && loopGuard < players.length) {
              utgIndex = (utgIndex + 1) % players.length;
              loopGuard++;
          }
      }

      // Post Blinds
      const sbAmt = Math.min(state.smallBlind, players[sbIndex].balance);
      players[sbIndex].balance -= sbAmt;
      players[sbIndex].bet = sbAmt;
      players[sbIndex].totalBet = sbAmt;
      players[sbIndex].status = (players[sbIndex].balance === 0) ? 'all-in' : 'active';
      pot += sbAmt;

      const bbAmt = Math.min(state.bigBlind, players[bbIndex].balance);
      players[bbIndex].balance -= bbAmt;
      players[bbIndex].bet = bbAmt;
      players[bbIndex].totalBet = bbAmt;
      players[bbIndex].status = (players[bbIndex].balance === 0) ? 'all-in' : 'active';
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
          lastRaiseAmount: state.bigBlind,
          lastAggressorId: players[bbIndex].id, // BB is pre-flop aggressor
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
      
      // --- ACTION VALIDATION ---
      // Ensure it's their turn
      if (!player.isTurn) {
          console.warn(`[PokerEngine] Invalid turn: ${playerId} is not current player`);
          return state;
      }
      
      // Validate action legality based on betting state
      const roundBetAmount = state.minBet - player.bet;
      
      switch (action) {
          case 'check':
              // Can only check if no bet to call
              if (roundBetAmount > 0 && player.balance > 0) {
                  console.warn(`[PokerEngine] Invalid check: ${player.name} must call/fold (${roundBetAmount} to call)`);
                  return state;
              }
              break;
          case 'call':
              // Must have a bet to call
              if (roundBetAmount <= 0 && state.minBet > 0) {
                  console.warn(`[PokerEngine] Invalid call: no bet to call`);
                  return state;
              }
              break;
          case 'raise':
              // Raise amount must be at least current bet + last raise amount
              const minRaise = state.minBet + state.lastRaiseAmount;
              if (amount < minRaise && player.balance >= (minRaise - player.bet)) {
                  console.warn(`[PokerEngine] Invalid raise: ${amount} < minimum ${minRaise}`);
                  return state;
              }
              break;
      }

      let newPlayers = [...state.players];
      let newPot = state.pot;
      let newMinBet = state.minBet;
      let newLastRaiseAmount = state.lastRaiseAmount;
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
              const raiseTo = amount;
              const addedAmt = Math.min(raiseTo - player.bet, player.balance);
              const previousMinBet = state.minBet;
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
              newLastRaiseAmount = newMinBet - previousMinBet;
              state.lastAggressorId = player.id; // Track who raised last
              logMsg = `${player.name} raises to ${newMinBet}.`;
              break;
      }

      // CRITICAL: Check if only one active player remains (all others folded)
      const activePlayers = newPlayers.filter(p => p.status === 'active' || p.status === 'all-in');
      if (activePlayers.length === 1) {
          console.log('[PokerEngine] Only 1 active player remains, awarding pot immediately');
          // Award pot to last remaining player
          const winner = activePlayers[0];
          const winnerIndex = newPlayers.findIndex(p => p.id === winner.id);
          newPlayers[winnerIndex] = {
              ...newPlayers[winnerIndex],
              balance: safeMoney(newPlayers[winnerIndex].balance + newPot, state.gameMode)
          };

          return {
              ...state,
              players: newPlayers,
              pot: 0,
              phase: 'showdown',
              currentTurnPlayerId: null,
              winners: [{
                  playerId: winner.id,
                  amount: newPot,
                  name: winner.name,
                  handDescription: 'Winner by fold',
                  cards: winner.cards
              }],
              lastLog: `${winner.name} wins ${newPot} (all others folded)`
          };
      }

      // Check if betting round is complete
      const allMatched = activePlayers.every(p => p.bet === newMinBet || p.status === 'all-in' || p.status === 'folded');
      const allActed = activePlayers.every(p => p.lastAction !== undefined || p.status === 'all-in');
      
      // In pre-flop, if there was a raise, action must return to last aggressor
      // In post-flop, action must go back to first player after dealer
      let actionComplete = allMatched && allActed;
      
      if (actionComplete && state.lastAggressorId) {
          const aggressor = newPlayers.find(p => p.id === state.lastAggressorId);
          // If aggressor is still active and can act, they must have acted since the last raise
          if (aggressor && aggressor.status === 'active' && aggressor.balance > 0) {
              // Check if action has returned to aggressor
              const aggressorActedSinceRaise = aggressor.lastAction !== undefined;
              if (!aggressorActedSinceRaise) {
                  actionComplete = false;
              }
          }
      }

      if (actionComplete) {
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
      let loopGuard = 0;
      while(newPlayers[nextIndex].status !== 'active' && loopGuard < newPlayers.length) {
          nextIndex = (nextIndex + 1) % newPlayers.length;
          loopGuard++;
      }
      
      if (loopGuard >= newPlayers.length) {
          console.error('[PokerEngine] No active players found for next turn!');
          return state; // Return unchanged state to prevent crash
      }
      
      newPlayers[nextIndex].isTurn = true;

      return {
          ...state,
          players: newPlayers,
          pot: safeMoney(newPot, state.gameMode),
          minBet: newMinBet,
          lastRaiseAmount: action === 'raise' ? newLastRaiseAmount : state.lastRaiseAmount,
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
      let loopGuard = 0;
      while(players[nextIndex].status !== 'active' && loopGuard < players.length) {
          nextIndex = (nextIndex + 1) % players.length;
          loopGuard++;
      }
      
      if (loopGuard >= players.length) {
          console.error('[PokerEngine] No active players in advancePhase!');
          return this.determineWinner({ ...state, communityCards: newCommunityCards });
      }
      
      players[nextIndex].isTurn = true;

      return {
          ...state,
          phase: nextPhase,
          deck: newDeck,
          communityCards: newCommunityCards,
          players,
          minBet: 0,
          lastRaiseAmount: 0,
          lastAggressorId: undefined, // No pre-set aggressor post-flop
          currentTurnPlayerId: players[nextIndex].id,
          lastLog: msg
      };
  }

  static determineWinner(state: GameState): GameState {
      const players = state.players;
      const activeCandidates = players.filter(p => p.status !== 'folded' && p.status !== 'sitting-out' && p.status !== 'eliminated');

      if (activeCandidates.length === 0) {
          console.error('[PokerEngine] No active candidates for winner determination!');
          return { ...state, phase: 'showdown', pot: 0 };
      }

      // Evaluate all hands
      activeCandidates.forEach(p => {
          p.handResult = evaluateHand([...p.cards, ...state.communityCards]);
          // Reveal cards at showdown
          p.cards = p.cards.map(c => ({ ...c, hidden: false }));
      });

      // Create side pots based on all-in amounts
      const sidePots = this.calculateSidePots(activeCandidates);
      
      const winners: { playerId: string; amount: number; handDescription?: string; name: string; cards: CardData[] }[] = [];
      let totalAwarded = 0;
      let logMessages: string[] = [];

      // Award each pot to eligible winners
      sidePots.forEach((pot, index) => {
          const eligible = activeCandidates.filter(p => pot.eligiblePlayerIds.includes(p.id));
          eligible.sort((a, b) => (b.handResult?.score || 0) - (a.handResult?.score || 0));
          
          const topScore = eligible[0].handResult?.score || 0;
          const potWinners = eligible.filter(p => p.handResult?.score === topScore);
          
          // Calculate rake (only for main pot in cash games)
          // Note: VIP level should be passed from gameManager
          let rake = 0;
          let rakeDistribution = null;
          if (index === 0 && state.gameMode === 'cash') {
              rake = this.calculateRake(pot.amount, state, 0); // Default VIP level 0
              // Rake distribution calculated in gameManager where we have user data
          }
          
          const netPot = pot.amount - rake;
          const splitAmount = safeMoney(netPot / potWinners.length, state.gameMode);
          
          potWinners.forEach(w => {
              const existingWinner = winners.find(win => win.playerId === w.id);
              if (existingWinner) {
                  existingWinner.amount = safeMoney(existingWinner.amount + splitAmount, state.gameMode);
              } else {
                  winners.push({
                      playerId: w.id,
                      amount: splitAmount,
                      name: w.name,
                      handDescription: w.handResult?.name,
                      cards: w.cards
                  });
              }
              totalAwarded += splitAmount;
          });
          
          if (potWinners.length === 1) {
              const potType = index === 0 ? 'main pot' : `side pot ${index}`;
              logMessages.push(`${potWinners[0].name} wins ${potType} $${splitAmount.toLocaleString()} with ${potWinners[0].handResult?.name}`);
          } else {
              const potType = index === 0 ? 'main pot' : `side pot ${index}`;
              const names = potWinners.map(w => w.name).join(', ');
              logMessages.push(`${names} split ${potType} ($${splitAmount.toLocaleString()} each)`);
          }
          
          if (rake > 0) {
              logMessages.push(`Rake: $${rake.toFixed(2)}`);
          }
      });

      // Award winnings to players
      const newPlayers = players.map(p => {
          const winner = winners.find(w => w.playerId === p.id);
          if (winner) {
              return { 
                  ...p, 
                  balance: safeMoney(p.balance + winner.amount, state.gameMode),
                  winningHand: p.handResult?.winningCards
              };
          }
          return p;
      });

      return {
          ...state,
          players: newPlayers,
          phase: 'showdown',
          pot: 0,
          winners,
          lastLog: logMessages.join(' | ')
      };
  }

  static calculateSidePots(players: PlayerState[]): { amount: number; eligiblePlayerIds: string[] }[] {
      const pots: { amount: number; eligiblePlayerIds: string[] }[] = [];
      
      // Sort players by totalBet (all-in amounts)
      const sorted = [...players].sort((a, b) => a.totalBet - b.totalBet);
      
      let previousBet = 0;
      
      sorted.forEach((player, index) => {
          const betForThisPot = player.totalBet - previousBet;
          
          if (betForThisPot > 0) {
              // All players from this index onward are eligible
              const eligiblePlayerIds = sorted.slice(index).map(p => p.id);
              
              // Calculate pot amount: betForThisPot * number of eligible players
              const potAmount = betForThisPot * eligiblePlayerIds.length;
              
              pots.push({
                  amount: potAmount,
                  eligiblePlayerIds
              });
              
              previousBet = player.totalBet;
          }
      });
      
      return pots;
  }

  static calculateRake(potAmount: number, state: GameState, vipLevel?: number): number {
      if (state.gameMode !== 'cash') return 0; // No rake in fun games
      if (potAmount <= 0) return 0;

      // VIP Levels from constants.ts
      const vipRakes = [0.05, 0.045, 0.04, 0.035, 0.03]; // Fish to Legend
      const vipCaps = [5, 4.5, 4, 3.5, 3];
      
      const level = vipLevel || 0;
      const rakePercent = vipRakes[level] || 0.05;
      const rakeCap = vipCaps[level] || 5;
      
      const calculatedRake = potAmount * rakePercent;
      return Math.min(calculatedRake, rakeCap);
  }

  static distributeRake(rake: number, totalReferralAmount: number = 0): {
      referrer: number;
      jackpot: number;
      globalPool: number;
      developer: number;
  } {
      if (rake <= 0) {
          return { referrer: 0, jackpot: 0, globalPool: 0, developer: 0 };
      }

      // Referrer share: calculated from chain (0-60% max based on Hybrid Override Model)
      const referrerShare = totalReferralAmount;

      // Protocol allocations (% of total rake)
      const jackpotShare = (rake * 5) / 100;      // 5% to Jackpot
      const globalPoolShare = (rake * 5) / 100;   // 5% to Global Pool

      // Developer gets remainder after referral overrides, jackpot, and global pool
      const developerShare = rake - (referrerShare + jackpotShare + globalPoolShare);

      return {
          referrer: Number(referrerShare.toFixed(4)),
          jackpot: Number(jackpotShare.toFixed(4)),
          globalPool: Number(globalPoolShare.toFixed(4)),
          developer: Number(developerShare.toFixed(4))
      };
  }

  static calculateRake_OLD(potAmount: number, state: GameState): number {
      if (state.gameMode !== 'cash' || potAmount === 0) return 0;
      
      // VIP levels from constants (simplified - in production, fetch from user record)
      // Fish: 5%, cap $5 | Grinder: 4.5%, cap $4.50 | Shark: 4%, cap $4 | High Roller: 3.5%, cap $3.50 | Legend: 3%, cap $3
      const VIP_LEVELS = [
          { minHands: 0, rate: 0.05, cap: 5 },
          { minHands: 1000, rate: 0.045, cap: 4.5 },
          { minHands: 5000, rate: 0.04, cap: 4 },
          { minHands: 20000, rate: 0.035, cap: 3.5 },
          { minHands: 100000, rate: 0.03, cap: 3 }
      ];
      
      // Use default rake (assume Fish level if no hands data available)
      // In production, pass player hands data to calculate actual VIP level
      const rakeRate = VIP_LEVELS[0].rate; // Default to 5%
      const rakeCap = state.rakeCap || VIP_LEVELS[0].cap; // Use table rakeCap or default
      
      const calculatedRake = potAmount * rakeRate;
      const finalRake = Math.min(calculatedRake, rakeCap);
      
      return safeMoney(finalRake, state.gameMode);
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
