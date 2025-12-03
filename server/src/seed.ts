
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Database...');

  try {
    // 1. Initialize System Stats
    await prisma.systemState.upsert({
      where: { id: 'global' },
      update: {},
      create: {
        id: 'global',
        jackpot: 15420.50,
        tvl: 12500000,
        totalVolume: 142500000,
        activePlayers: 2405
      }
    });
    console.log('✅ System stats initialized');

    // 2. Create Leaderboard Players (using wallet-like addresses as IDs)
    const players = [
      { 
        id: 'PhantomUser1234567890', 
        username: 'PhantomAce', 
        winnings: 154000, 
        hands: 105020 
      },
      { 
        id: 'SolDegen9876543210', 
        username: 'SolDegen', 
        winnings: 98000, 
        hands: 12300 
      },
      { 
        id: 'MoonBagHolder2024', 
        username: 'MoonBag', 
        winnings: 87500, 
        hands: 8400 
      },
      { 
        id: 'HODLer_Pro5432', 
        username: 'HODLer_Pro', 
        winnings: 65000, 
        hands: 3200 
      },
    ];

    for (const p of players) {
      await prisma.user.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          username: p.username,
          avatarUrl: `https://ui-avatars.com/api/?name=${p.username}&background=random`,
          balance: 5000,
          totalWinnings: p.winnings,
          totalHands: p.hands,
          vipRank: p.hands > 10000 ? 3 : 1
        }
      });
    }
    console.log('✅ Players created');

    console.log('✅ Seeding Complete');
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
