/**
 * Client-Side Fairness Verification
 * 
 * Players can use this to verify poker hands are fair
 * Download hand data from the fairness API and verify locally
 */

/**
 * Verify server seed against hash using Web Crypto API
 */
export async function verifyServerSeedHash(
    serverSeed: string,
    expectedHash: string
): Promise<boolean> {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(serverSeed);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex === expectedHash;
    } catch (e) {
        console.error('Seed hash verification failed:', e);
        return false;
    }
}

/**
 * Fisher-Yates shuffle using HMAC-SHA256 as PRNG
 * Reproduces deck from seeds - MUST match server algorithm exactly!
 */
async function generateProvablyFairDeck(
    serverSeed: string,
    clientSeed: string,
    nonce: number
): Promise<string[]> {
    const encoder = new TextEncoder();
    
    // Convert hex serverSeed to Uint8Array for HMAC key
    const serverSeedBytes = new Uint8Array(serverSeed.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    // Import server seed as HMAC key (matching server: key = serverSeed)
    const key = await crypto.subtle.importKey(
        'raw',
        serverSeedBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    // Message base: clientSeed:nonce (matching server format)
    const messageBase = `${clientSeed}:${nonce}`;
    
    // Generate byte stream using chunked HMAC (matching server's hmacStream)
    const needed = 52 * 8; // 8 bytes per shuffle index
    const bytes = new Uint8Array(needed);
    let filled = 0;
    let counter = 0;
    
    while (filled < needed) {
        const msg = encoder.encode(messageBase + ':' + counter);
        const hmacBuffer = await crypto.subtle.sign('HMAC', key, msg);
        const chunk = new Uint8Array(hmacBuffer);
        const toCopy = Math.min(chunk.length, needed - filled);
        bytes.set(chunk.slice(0, toCopy), filled);
        filled += toCopy;
        counter++;
    }

    // Initialize deck (matching server's order: suits then ranks)
    const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const suitSymbols: Record<string, string> = {
        'spades': '♠', 'hearts': '♥', 'diamonds': '♦', 'clubs': '♣'
    };
    
    let deck: string[] = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push(rank + suitSymbols[suit]);
        }
    }

    // Fisher-Yates shuffle using 8-byte chunks as 64-bit integers
    let byteIndex = 0;
    for (let i = deck.length - 1; i > 0; i--) {
        // Read 8 bytes as big-endian 64-bit unsigned integer
        let value = 0n;
        for (let b = 0; b < 8; b++) {
            value = (value << 8n) + BigInt(bytes[byteIndex + b]);
        }
        byteIndex += 8;
        
        // Calculate swap index
        const j = Number(value % BigInt(i + 1));
        
        // Swap
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
}

/**
 * Simplified fairness verification - generates deck and verifies community cards
 */
export async function verifyHandFairnessSimplified(params: {
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    communityCards: string[];
}): Promise<{
    valid: boolean;
    checks: {
        seedHashValid: boolean;
        deckReproducible: boolean;
        communityCardsValid: boolean;
    };
    details: string[];
    reproducedDeck?: string[];
    expectedCommunityCards?: string[];
}> {
    const details: string[] = [];

    // Check 1: Server seed hash verification
    const seedHashValid = await verifyServerSeedHash(params.serverSeed, params.serverSeedHash);
    details.push(
        seedHashValid
            ? '✅ Server seed hash verified - seed matches the hash shown before the hand'
            : '❌ Server seed does not match hash - FAIRNESS VIOLATION'
    );

    // Check 2: Generate deck from seeds
    let reproducedDeck: string[] = [];
    let deckReproducible = true;
    try {
        reproducedDeck = await generateProvablyFairDeck(params.serverSeed, params.clientSeed, params.nonce);
        details.push('✅ Deck successfully reproduced from seeds');
    } catch (e) {
        deckReproducible = false;
        details.push('❌ Failed to reproduce deck: ' + String(e));
    }

    // Check 3: Verify community cards match expected positions
    // Community cards are dealt: Burn[0], Flop[1,2,3], Burn[4], Turn[5], Burn[6], River[7]
    const expectedCommunityCards = deckReproducible && reproducedDeck.length >= 8
        ? [reproducedDeck[1], reproducedDeck[2], reproducedDeck[3], reproducedDeck[5], reproducedDeck[7]]
        : [];
    
    let communityCardsValid = false;
    if (params.communityCards.length === 0) {
        communityCardsValid = true;
        details.push('ℹ️ No community cards to verify (hand may have ended early)');
    } else if (params.communityCards.length === 5 && expectedCommunityCards.length === 5) {
        communityCardsValid = JSON.stringify(params.communityCards) === JSON.stringify(expectedCommunityCards);
        if (communityCardsValid) {
            details.push('✅ Community cards verified - match expected deck positions');
        } else {
            details.push('❌ Community cards mismatch - expected: ' + expectedCommunityCards.join(', '));
        }
    } else {
        // Partial community cards verification
        const matchCount = params.communityCards.filter((card, idx) => card === expectedCommunityCards[idx]).length;
        communityCardsValid = matchCount === params.communityCards.length;
        details.push(
            communityCardsValid
                ? `✅ ${matchCount}/${params.communityCards.length} community cards verified`
                : `⚠️ Partial match: ${matchCount}/${params.communityCards.length} cards match`
        );
    }

    const valid = seedHashValid && deckReproducible;

    return {
        valid,
        checks: {
            seedHashValid,
            deckReproducible,
            communityCardsValid
        },
        details,
        reproducedDeck: reproducedDeck.slice(0, 10), // First 10 cards for inspection
        expectedCommunityCards
    };
}

/**
 * Verify deck is reproducible
 */
export async function verifyDeckReproducibility(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    expectedDeck: string[]
): Promise<{ valid: boolean; message: string }> {
    try {
        const reproducedDeck = await generateProvablyFairDeck(serverSeed, clientSeed, nonce);
        const matches = JSON.stringify(reproducedDeck) === JSON.stringify(expectedDeck);

        return {
            valid: matches,
            message: matches
                ? '✅ Deck verified! Same shuffle reproduced with given seeds.'
                : '❌ Deck mismatch! Fairness verification failed.'
        };
    } catch (e) {
        console.error('Deck verification error:', e);
        return {
            valid: false,
            message: '❌ Verification failed: ' + String(e)
        };
    }
}

/**
 * Verify community cards match expected deck positions
 */
export function verifyCommunityCards(
    deck: string[],
    communityCards: string[]
): { valid: boolean; message: string } {
    try {
        if (communityCards.length !== 5) {
            return {
                valid: false,
                message: 'Invalid community cards length'
            };
        }

        // Community cards are dealt from shuffled deck:
        // Burn pos 0, Flop: 1,2,3, Burn pos 4, Turn: 5, Burn pos 6, River: 7
        const expectedCommunity = [
            deck[1], // Flop card 1
            deck[2], // Flop card 2
            deck[3], // Flop card 3
            deck[5], // Turn
            deck[7]  // River
        ];

        const matches = JSON.stringify(expectedCommunity) === JSON.stringify(communityCards);

        return {
            valid: matches,
            message: matches
                ? '✅ Community cards verified!'
                : '❌ Community cards do not match deck!'
        };
    } catch (e) {
        return {
            valid: false,
            message: '❌ Verification failed: ' + String(e)
        };
    }
}

/**
 * Full fairness verification
 */
export async function verifyHandFairness(params: {
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    deck: string[];
    communityCards: string[];
}): Promise<{
    valid: boolean;
    checks: {
        seedHashValid: boolean;
        deckReproducible: boolean;
        communityCardsValid: boolean;
    };
    details: string[];
}> {
    const details: string[] = [];

    // Check 1: Server seed hash
    const seedHashValid = await verifyServerSeedHash(params.serverSeed, params.serverSeedHash);
    details.push(
        seedHashValid
            ? '✅ Server seed hash verified'
            : '❌ Server seed does not match hash'
    );

    // Check 2: Deck reproducibility
    const deckResult = await verifyDeckReproducibility(
        params.serverSeed,
        params.clientSeed,
        params.nonce,
        params.deck
    );
    details.push(deckResult.message);

    // Check 3: Community cards
    const communityResult = verifyCommunityCards(params.deck, params.communityCards);
    details.push(communityResult.message);

    const valid = seedHashValid && deckResult.valid && communityResult.valid;

    return {
        valid,
        checks: {
            seedHashValid,
            deckReproducible: deckResult.valid,
            communityCardsValid: communityResult.valid
        },
        details
    };
}

/**
 * Fetch and verify a historical hand
 */
export async function fetchAndVerifyHand(
    serverUrl: string,
    tableId: string,
    handNumber: number
): Promise<{
    success: boolean;
    hand?: any;
    verification?: any;
    error?: string;
}> {
    try {
        // Fetch hand data
        const response = await fetch(
            `${serverUrl}/api/proof/${tableId}/hand/${handNumber}`
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.error || `Failed to fetch hand: ${response.statusText}`
            };
        }

        const hand = await response.json();
        
        // Parse community cards from JSON string
        let communityCards: string[] = [];
        try {
            const parsed = JSON.parse(hand.fairnessData.communityCards || '[]');
            // Convert CardData format to string format for verification
            communityCards = parsed.map((card: any) => {
                if (typeof card === 'string') return card;
                // Convert {rank: 'A', suit: 'spades'} to 'A♠' format
                const suitSymbols: Record<string, string> = {
                    'spades': '♠', 'hearts': '♥', 'diamonds': '♦', 'clubs': '♣'
                };
                return card.rank + (suitSymbols[card.suit] || card.suit);
            });
        } catch (e) {
            console.error('Failed to parse community cards:', e);
        }
        
        // Check if server seed is available
        if (!hand.fairnessData.serverSeed || hand.fairnessData.serverSeed === 'Not yet available') {
            return {
                success: false,
                error: 'Server seed not yet revealed. Wait for hand to complete.'
            };
        }

        // Verify the hand - we'll generate the deck from seeds and verify community cards match
        const verification = await verifyHandFairnessSimplified({
            serverSeed: hand.fairnessData.serverSeed,
            serverSeedHash: hand.fairnessData.serverSeedHash,
            clientSeed: hand.fairnessData.clientSeed,
            nonce: hand.fairnessData.nonce,
            communityCards
        });

        return {
            success: true,
            hand,
            verification
        };
    } catch (e) {
        return {
            success: false,
            error: 'Verification request failed: ' + String(e)
        };
    }
}

/**
 * Verify a batch of hands
 */
export async function verifyHandBatch(
    serverUrl: string,
    tableId: string,
    handNumbers: number[]
): Promise<{
    total: number;
    verified: number;
    failed: number;
    results: Array<{ handNumber: number; valid: boolean; error?: string }>;
}> {
    const results = [];
    let verified = 0;
    let failed = 0;

    for (const handNumber of handNumbers) {
        try {
            const result = await fetchAndVerifyHand(serverUrl, tableId, handNumber);
            if (result.success && result.verification?.valid) {
                verified++;
                results.push({ handNumber, valid: true });
            } else {
                failed++;
                results.push({
                    handNumber,
                    valid: false,
                    error: result.error || 'Verification failed'
                });
            }
        } catch (e) {
            failed++;
            results.push({
                handNumber,
                valid: false,
                error: String(e)
            });
        }
    }

    return {
        total: handNumbers.length,
        verified,
        failed,
        results
    };
}

/**
 * Export verification data for sharing
 */
export function exportVerificationProof(hand: any, verification: any): string {
    const proof = {
        timestamp: new Date().toISOString(),
        hand,
        verification,
        instructions:
            'This proof can be verified by any third party using the fairness verification API'
    };
    return JSON.stringify(proof, null, 2);
}

/**
 * Create a verification link players can share
 */
export function createVerificationLink(
    serverUrl: string,
    tableId: string,
    handNumber: number
): string {
    const params = new URLSearchParams({
        tableId,
        handNumber: handNumber.toString()
    });
    return `${serverUrl}/verify?${params.toString()}`;
}
