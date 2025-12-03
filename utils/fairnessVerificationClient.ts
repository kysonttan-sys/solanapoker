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
 * Reproduces deck from seeds
 */
async function generateProvablyFairDeck(
    serverSeed: string,
    clientSeed: string,
    nonce: number
): Promise<string[]> {
    // Create HMAC key from client seed
    const encoder = new TextEncoder();
    const keyData = encoder.encode(clientSeed);
    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    // Generate HMAC with server seed
    const message = encoder.encode(serverSeed + '|' + nonce.toString());
    const hmacBuffer = await crypto.subtle.sign('HMAC', key, message);
    const hmacArray = Array.from(new Uint8Array(hmacBuffer));

    // Initialize deck
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    let deck: string[] = [];

    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push(rank + suit);
        }
    }

    // Fisher-Yates shuffle using HMAC stream
    let hmacIndex = 0;
    for (let i = deck.length - 1; i > 0; i--) {
        // Get 2 bytes from HMAC stream for random number
        if (hmacIndex >= hmacArray.length - 1) {
            // Need more random bytes - generate new HMAC
            const nextMessage = encoder.encode(
                serverSeed + '|' + nonce.toString() + '|' + (hmacIndex / hmacArray.length).toString()
            );
            const nextHmac = await crypto.subtle.sign('HMAC', key, nextMessage);
            hmacArray.splice(0, hmacArray.length, ...Array.from(new Uint8Array(nextHmac)));
            hmacIndex = 0;
        }

        const randomBytes = (hmacArray[hmacIndex] << 8) | hmacArray[hmacIndex + 1];
        const j = randomBytes % (i + 1);
        hmacIndex += 2;

        // Swap
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
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
            return {
                success: false,
                error: `Failed to fetch hand: ${response.statusText}`
            };
        }

        const hand = await response.json();

        // Verify the hand
        const verification = await verifyHandFairness({
            serverSeed: hand.fairnessData.serverSeed,
            serverSeedHash: hand.fairnessData.serverSeedHash,
            clientSeed: hand.fairnessData.clientSeed,
            nonce: hand.fairnessData.nonce,
            deck: hand.deck || [],
            communityCards: hand.communityCards || []
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
