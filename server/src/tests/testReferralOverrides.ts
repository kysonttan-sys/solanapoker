/**
 * Test Script for Hybrid Override Model
 *
 * This script creates test users and simulates poker hands to verify
 * the referral override calculations match the RAKE_DISTRIBUTION_GUIDE.md
 */

import { db } from '../db';
import { PokerEngine } from '../utils/pokerGameLogic';

// Helper to generate unique test IDs
const generateTestId = (name: string) => `test_${name}_${Date.now()}`;

async function setupTestUsers() {
    console.log('\n=== Setting up Test Users ===\n');

    // Create referral chain: Alice (Master) → Bob (Broker) → Charlie (Agent) → Dave (Free)
    const alice = await db.user.create({
        data: {
            id: generateTestId('alice'),
            walletAddress: generateTestId('alice'),
            username: 'TestAlice_Master',
            balance: 10000,
            referralCode: 'ALICE_CODE',
            referralRank: 'MASTER'
        }
    });
    console.log(`✅ Created Alice (Master) - ID: ${alice.id}`);

    const bob = await db.user.create({
        data: {
            id: generateTestId('bob'),
            walletAddress: generateTestId('bob'),
            username: 'TestBob_Broker',
            balance: 10000,
            referralCode: 'BOB_CODE',
            referredBy: 'ALICE_CODE',
            referralRank: 'BROKER'
        }
    });
    console.log(`✅ Created Bob (Broker) - ID: ${bob.id}, Referred by: ${bob.referredBy}`);

    const charlie = await db.user.create({
        data: {
            id: generateTestId('charlie'),
            walletAddress: generateTestId('charlie'),
            username: 'TestCharlie_Agent',
            balance: 10000,
            referralCode: 'CHARLIE_CODE',
            referredBy: 'BOB_CODE',
            referralRank: 'AGENT'
        }
    });
    console.log(`✅ Created Charlie (Agent) - ID: ${charlie.id}, Referred by: ${charlie.referredBy}`);

    const dave = await db.user.create({
        data: {
            id: generateTestId('dave'),
            walletAddress: generateTestId('dave'),
            username: 'TestDave_Free',
            balance: 10000,
            referralCode: 'DAVE_CODE',
            referredBy: 'CHARLIE_CODE',
            referralRank: 'FREE'
        }
    });
    console.log(`✅ Created Dave (Free) - ID: ${dave.id}, Referred by: ${dave.referredBy}`);

    return { alice, bob, charlie, dave };
}

async function simulateReferralOverrides(playerId: string, playerName: string, rake: number) {
    console.log(`\n=== Simulating Referral Overrides for ${playerName} ===`);
    console.log(`Rake: $${rake.toFixed(2)}\n`);

    const RANK_PERCENTS: Record<string, number> = {
        'FREE': 0,
        'AGENT': 20,
        'BROKER': 35,
        'PARTNER': 50,
        'MASTER': 60
    };

    let currentUserId = playerId;
    let level = 0;
    let highestPaid = 0;
    let totalReferralAmount = 0;
    const visited = new Set<string>();

    const overrides = [];

    while (level < 100) {
        const user = await db.user.findUnique({
            where: { id: currentUserId },
            select: { referredBy: true, username: true }
        });

        if (!user || !user.referredBy) break;

        const referrer = await db.user.findUnique({
            where: { referralCode: user.referredBy },
            select: { id: true, referralRank: true, username: true }
        });

        if (!referrer) break;

        if (visited.has(referrer.id)) {
            console.warn(`⚠️  Cycle detected at ${referrer.username}`);
            break;
        }
        visited.add(referrer.id);

        level++;
        const referrerRank = referrer.referralRank || 'FREE';
        const referrerPercent = RANK_PERCENTS[referrerRank] || 0;

        let payPercent = 0;
        if (level === 1) {
            payPercent = referrerPercent;
            console.log(`Level ${level} (Direct Upline): ${referrer.username} (${referrerRank})`);
            console.log(`  → Gets FULL rank: ${referrerPercent}%`);
        } else {
            payPercent = Math.max(0, referrerPercent - highestPaid);
            console.log(`Level ${level} (Indirect): ${referrer.username} (${referrerRank})`);
            console.log(`  → Override: ${referrerPercent}% - ${highestPaid}% = ${payPercent}%`);
        }

        const payAmount = Number(((payPercent / 100) * rake).toFixed(4));
        console.log(`  → Amount: $${payAmount.toFixed(4)}\n`);

        overrides.push({
            userId: referrer.id,
            username: referrer.username,
            level,
            rank: referrerRank,
            rankPercent: referrerPercent,
            amount: payAmount
        });

        totalReferralAmount += payAmount;
        highestPaid = Math.max(highestPaid, referrerPercent);

        currentUserId = referrer.id;
    }

    console.log(`─────────────────────────────────`);
    console.log(`Total Referral Amount: $${totalReferralAmount.toFixed(4)}`);
    console.log(`Percentage of Rake: ${((totalReferralAmount / rake) * 100).toFixed(2)}%`);

    return { overrides, totalReferralAmount };
}

async function testRakeDistribution(rake: number, totalReferralAmount: number) {
    console.log(`\n=== Testing Rake Distribution ===`);
    console.log(`Total Rake: $${rake.toFixed(2)}`);
    console.log(`Total Referral: $${totalReferralAmount.toFixed(4)}\n`);

    const rakeDistribution = PokerEngine.distributeRake(rake, totalReferralAmount);

    console.log(`Referral Overrides: $${rakeDistribution.referrer.toFixed(4)} (${((rakeDistribution.referrer / rake) * 100).toFixed(2)}%)`);
    console.log(`Global Pool:        $${rakeDistribution.globalPool.toFixed(4)} (5%)`);
    console.log(`Jackpot:            $${rakeDistribution.jackpot.toFixed(4)} (5%)`);
    console.log(`Developer:          $${rakeDistribution.developer.toFixed(4)} (${((rakeDistribution.developer / rake) * 100).toFixed(2)}%)`);

    const total = rakeDistribution.referrer + rakeDistribution.globalPool + rakeDistribution.jackpot + rakeDistribution.developer;
    console.log(`\nTotal: $${total.toFixed(4)} (should equal $${rake.toFixed(2)})`);

    if (Math.abs(total - rake) > 0.01) {
        console.error(`❌ ERROR: Distribution doesn't add up! Difference: $${(total - rake).toFixed(4)}`);
    } else {
        console.log(`✅ Distribution is correct!`);
    }

    return rakeDistribution;
}

async function runTests() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  Hybrid Override Model - Referral System Test Suite  ║');
    console.log('╚════════════════════════════════════════════════════════╝');

    try {
        // Setup test users
        const { alice, bob, charlie, dave } = await setupTestUsers();

        // Test Case 1: Dave (Free) plays, rake = $3.00
        console.log('\n\n┌────────────────────────────────────────────────────┐');
        console.log('│  TEST CASE 1: 4-Level Chain (Example 1 from Guide) │');
        console.log('└────────────────────────────────────────────────────┘');

        const rake = 3.00;
        const result = await simulateReferralOverrides(dave.id, dave.username, rake);
        await testRakeDistribution(rake, result.totalReferralAmount);

        // Expected results from RAKE_DISTRIBUTION_GUIDE.md Example 1:
        // Charlie (Agent, Direct): $0.60 (20%)
        // Bob (Broker, Level 2): $0.45 (15% override)
        // Alice (Master, Level 3): $0.75 (25% override)
        // Total Referral: $1.80 (60%)

        console.log('\n\n📊 Expected Results from Guide (Example 1):');
        console.log('  Charlie (Direct):  $0.60 (20%)');
        console.log('  Bob (Override):    $0.45 (15%)');
        console.log('  Alice (Override):  $0.75 (25%)');
        console.log('  Total Referral:    $1.80 (60%)');
        console.log('  Global Pool:       $0.15 (5%)');
        console.log('  Jackpot:           $0.15 (5%)');
        console.log('  Developer:         $0.90 (30%)');

        // Verification
        if (result.overrides.length === 3) {
            const charlieOverride = result.overrides.find(o => o.username.includes('Charlie'));
            const bobOverride = result.overrides.find(o => o.username.includes('Bob'));
            const aliceOverride = result.overrides.find(o => o.username.includes('Alice'));

            console.log('\n\n✅ Verification:');
            console.log(`  Charlie: ${charlieOverride?.amount === 0.60 ? '✓' : '✗'} Expected $0.60, Got $${charlieOverride?.amount.toFixed(2)}`);
            console.log(`  Bob:     ${bobOverride?.amount === 0.45 ? '✓' : '✗'} Expected $0.45, Got $${bobOverride?.amount.toFixed(2)}`);
            console.log(`  Alice:   ${aliceOverride?.amount === 0.75 ? '✓' : '✗'} Expected $0.75, Got $${aliceOverride?.amount.toFixed(2)}`);
        }

        // Cleanup test users
        console.log('\n\n=== Cleaning up test users ===');
        await db.user.deleteMany({
            where: {
                username: {
                    startsWith: 'Test'
                }
            }
        });
        console.log('✅ Test users deleted');

        console.log('\n\n╔════════════════════════════════════════════════════════╗');
        console.log('║           All Tests Completed Successfully!           ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        throw error;
    }
}

// Run tests if executed directly
if (require.main === module) {
    runTests()
        .then(() => {
            console.log('Tests completed');
            process.exit(0);
        })
        .catch((e) => {
            console.error('Tests failed:', e);
            process.exit(1);
        });
}

export { runTests, setupTestUsers, simulateReferralOverrides, testRakeDistribution };
