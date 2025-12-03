
import { CardData, Rank } from './pokerGameLogic';

// Rank Values
const RANK_VALUE: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export interface HandResult {
  score: number;
  name: string;
  desc: string;
  winningCards: CardData[]; // The exact 5 cards that make the hand
}

// Hand Tier Multipliers
const TIERS = {
  ROYAL_FLUSH: 9000000,
  STRAIGHT_FLUSH: 8000000,
  QUADS: 7000000,
  FULL_HOUSE: 6000000,
  FLUSH: 5000000,
  STRAIGHT: 4000000,
  TRIPS: 3000000,
  TWO_PAIR: 2000000,
  PAIR: 1000000,
  HIGH_CARD: 0
};

export const evaluateHand = (allCards: CardData[]): HandResult => {
  if (allCards.length === 0) return { score: 0, name: 'Folded', desc: '', winningCards: [] };

  // Sort by value descending
  const cards = [...allCards].sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank]);
  
  // Helpers
  const getSuitCounts = () => {
      const counts: Record<string, CardData[]> = {};
      cards.forEach(c => {
          if (!counts[c.suit]) counts[c.suit] = [];
          counts[c.suit].push(c);
      });
      return counts;
  };

  const getRankCounts = () => {
      const counts: Record<number, CardData[]> = {};
      cards.forEach(c => {
          const val = RANK_VALUE[c.rank];
          if (!counts[val]) counts[val] = [];
          counts[val].push(c);
      });
      return counts;
  };

  // Check Straight
  const getStraight = (inputCards: CardData[]): CardData[] | null => {
      const uniqueRankCards: CardData[] = [];
      const seen = new Set<number>();
      
      inputCards.forEach(c => {
          const val = RANK_VALUE[c.rank];
          if (!seen.has(val)) {
              seen.add(val);
              uniqueRankCards.push(c);
          }
      });

      if (uniqueRankCards.length < 5) return null;

      for (let i = 0; i <= uniqueRankCards.length - 5; i++) {
          const v1 = RANK_VALUE[uniqueRankCards[i].rank];
          const v2 = RANK_VALUE[uniqueRankCards[i+4].rank];
          if (v1 - v2 === 4) {
              return uniqueRankCards.slice(i, i+5);
          }
      }

      // Check Wheel (A-2-3-4-5)
      const hasAce = uniqueRankCards[0].rank === 'A';
      if (hasAce) {
          const wheelCards = uniqueRankCards.filter(c => ['5','4','3','2'].includes(c.rank));
          if (wheelCards.length === 4) {
              return [...wheelCards, uniqueRankCards[0]];
          }
      }
      return null;
  };

  // --- 1. Straight Flush / Royal Flush ---
  const suitCounts = getSuitCounts();
  const flushSuit = Object.keys(suitCounts).find(s => suitCounts[s].length >= 5);
  
  if (flushSuit) {
      const flushCards = suitCounts[flushSuit];
      const straightFlushCards = getStraight(flushCards);
      
      if (straightFlushCards) {
          const highRank = RANK_VALUE[straightFlushCards[0].rank];
          if (highRank === 14 && straightFlushCards[1].rank === 'K') { 
              return { score: TIERS.ROYAL_FLUSH, name: 'Royal Flush', desc: 'Unbeatable', winningCards: straightFlushCards };
          }
          const scoreHigh = straightFlushCards[0].rank === '5' ? 5 : highRank;
          return { score: TIERS.STRAIGHT_FLUSH + scoreHigh, name: 'Straight Flush', desc: `${getRankName(scoreHigh)} High`, winningCards: straightFlushCards };
      }
  }

  const rankCounts = getRankCounts();
  const quads = Object.keys(rankCounts).filter(k => rankCounts[parseInt(k)].length === 4).map(Number).sort((a,b) => b-a);
  const trips = Object.keys(rankCounts).filter(k => rankCounts[parseInt(k)].length === 3).map(Number).sort((a,b) => b-a);
  const pairs = Object.keys(rankCounts).filter(k => rankCounts[parseInt(k)].length === 2).map(Number).sort((a,b) => b-a);

  // --- 2. Four of a Kind ---
  if (quads.length > 0) {
      const quadRank = quads[0];
      const quadCards = rankCounts[quadRank];
      const kickers = cards.filter(c => RANK_VALUE[c.rank] !== quadRank);
      return {
          score: TIERS.QUADS + quadRank * 100 + RANK_VALUE[kickers[0].rank],
          name: 'Four of a Kind',
          desc: `${getRankName(quadRank)}s`,
          winningCards: [...quadCards, kickers[0]]
      };
  }

  // --- 3. Full House ---
  if (trips.length > 0 && (trips.length > 1 || pairs.length > 0)) {
      const topTrip = trips[0];
      const topPair = trips.length > 1 ? trips[1] : pairs[0];
      
      return {
          score: TIERS.FULL_HOUSE + topTrip * 100 + topPair,
          name: 'Full House',
          desc: `${getRankName(topTrip)}s full of ${getRankName(topPair)}s`,
          winningCards: [...rankCounts[topTrip], ...rankCounts[topPair].slice(0, 2)]
      };
  }

  // --- 4. Flush ---
  if (flushSuit) {
      const flushCards = suitCounts[flushSuit].slice(0, 5);
      let score = TIERS.FLUSH;
      flushCards.forEach((c, i) => score += RANK_VALUE[c.rank] * Math.pow(0.1, i));
      
      return {
          score,
          name: 'Flush',
          desc: `${getRankName(RANK_VALUE[flushCards[0].rank])} High`,
          winningCards: flushCards
      };
  }

  // --- 5. Straight ---
  const straightCards = getStraight(cards);
  if (straightCards) {
      const highRank = RANK_VALUE[straightCards[0].rank];
      return {
          score: TIERS.STRAIGHT + highRank,
          name: 'Straight',
          desc: `${getRankName(highRank)} High`,
          winningCards: straightCards
      };
  }

  // --- 6. Three of a Kind ---
  if (trips.length > 0) {
      const tripRank = trips[0];
      const tripCards = rankCounts[tripRank];
      const kickers = cards.filter(c => RANK_VALUE[c.rank] !== tripRank).slice(0, 2);
      
      let score = TIERS.TRIPS + tripRank * 100;
      if (kickers[0]) score += RANK_VALUE[kickers[0].rank];
      if (kickers[1]) score += RANK_VALUE[kickers[1].rank] * 0.01;

      return {
          score,
          name: 'Three of a Kind',
          desc: `${getRankName(tripRank)}s`,
          winningCards: [...tripCards, ...kickers]
      };
  }

  // --- 7. Two Pair ---
  if (pairs.length >= 2) {
      const highPair = pairs[0];
      const lowPair = pairs[1];
      const kicker = cards.filter(c => RANK_VALUE[c.rank] !== highPair && RANK_VALUE[c.rank] !== lowPair)[0];
      
      return {
          score: TIERS.TWO_PAIR + highPair * 100 + lowPair + (RANK_VALUE[kicker.rank] * 0.01),
          name: 'Two Pair',
          desc: `${getRankName(highPair)}s and ${getRankName(lowPair)}s`,
          winningCards: [...rankCounts[highPair], ...rankCounts[lowPair], kicker]
      };
  }

  // --- 8. One Pair ---
  if (pairs.length === 1) {
      const pairRank = pairs[0];
      const kickers = cards.filter(c => RANK_VALUE[c.rank] !== pairRank).slice(0, 3);
      
      let score = TIERS.PAIR + pairRank * 100;
      kickers.forEach((k, i) => score += RANK_VALUE[k.rank] * Math.pow(0.01, i + 1));

      return {
          score,
          name: 'Pair',
          desc: `Pair of ${getRankName(pairRank)}s`,
          winningCards: [...rankCounts[pairRank], ...kickers]
      };
  }

  // --- 9. High Card ---
  const best5 = cards.slice(0, 5);
  let score = TIERS.HIGH_CARD;
  best5.forEach((c, i) => score += RANK_VALUE[c.rank] * Math.pow(0.1, i));

  return {
      score,
      name: 'High Card',
      desc: `${getRankName(RANK_VALUE[best5[0].rank])} High`,
      winningCards: best5
  };
};

export const getRankName = (val: number): string => {
    if (val === 14) return 'Ace';
    if (val === 13) return 'King';
    if (val === 12) return 'Queen';
    if (val === 11) return 'Jack';
    return val.toString();
};

export const getPreFlopStrength = (c1: CardData, c2: CardData): number => {
    if (!c1 || !c2) return 0;
    const v1 = RANK_VALUE[c1.rank];
    const v2 = RANK_VALUE[c2.rank];
    const high = Math.max(v1, v2);
    const score = high === 14 ? 10 : high === 13 ? 8 : high === 12 ? 7 : high === 11 ? 6 : high / 2;
    return Math.min(100, Math.max(5, score * (v1 === v2 ? 2 : 1) + (c1.suit === c2.suit ? 2 : 0)));
};
