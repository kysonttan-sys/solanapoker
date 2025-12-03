import crypto from 'crypto';
// Local minimal card types to avoid importing client TS module from server runtime
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface CardData {
  suit: Suit;
  rank: Rank;
  hidden?: boolean;
}

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS: Rank[] = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

// Server-side provably-fair utilities (Node.js)

export const generateServerSeed = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const hashSeed = (seed: string): string => {
  return crypto.createHash('sha256').update(seed).digest('hex');
};

// Helper: produce an arbitrary length byte stream from HMAC-SHA256(counter)
function hmacStream(key: string, messageBase: string, neededBytes: number): Buffer {
  const out = Buffer.alloc(neededBytes);
  let filled = 0;
  let counter = 0;
  while (filled < neededBytes) {
    const h = crypto.createHmac('sha256', Buffer.from(key, 'hex'));
    h.update(messageBase + ':' + counter);
    const chunk = h.digest();
    const toCopy = Math.min(chunk.length, neededBytes - filled);
    chunk.copy(out, filled, 0, toCopy);
    filled += toCopy;
    counter++;
  }
  return out;
}

export const generateProvablyFairDeck = (
  serverSeed: string,
  clientSeed: string,
  nonce: number
): CardData[] => {
  // Build base deck
  const deck: CardData[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }

  // Need enough randomness for 52 shuffles. We'll produce 8 bytes per shuffle index worst-case.
  const needed = 52 * 8;
  const messageBase = `${clientSeed}:${nonce}`;
  const bytes = hmacStream(serverSeed, messageBase, needed);

  // Use chunks of 8 bytes to produce 64-bit unsigned integers for uniform indices
  let byteIndex = 0;
  const seededIndex = () => {
    if (byteIndex + 8 > bytes.length) byteIndex = 0;
    const slice = bytes.slice(byteIndex, byteIndex + 8);
    byteIndex += 8;
    // little-endian to big-endian conversion
    let value = 0n;
    for (let i = 0; i < 8; i++) {
      value = (value << 8n) + BigInt(slice[i]);
    }
    return value;
  };

  for (let i = deck.length - 1; i > 0; i--) {
    const rnd = seededIndex();
    const j = Number(rnd % BigInt(i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }

  return deck;
};
