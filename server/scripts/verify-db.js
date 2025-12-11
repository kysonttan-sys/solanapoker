const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying PostgreSQL Database...\n');

  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connection successful!\n');

    // Check SystemState
    const systemState = await prisma.systemState.findFirst();
    console.log('📊 SystemState:');
    console.log(`   - Jackpot: ${systemState?.jackpot}`);
    console.log(`   - TVL: ${systemState?.tvl}`);
    console.log(`   - Total Volume: ${systemState?.totalVolume}`);
    console.log(`   - Total Hands: ${systemState?.totalHands}\n`);

    // Count Users
    const userCount = await prisma.user.count();
    const users = await prisma.user.findMany();
    console.log(`👥 Users: ${userCount} total`);
    users.forEach(user => {
      console.log(`   - ${user.username} (Balance: ${user.balance}, Wallet: ${user.walletAddress.substring(0, 8)}...)`);
    });
    console.log();

    // Count Transactions
    const txCount = await prisma.transaction.count();
    console.log(`💰 Transactions: ${txCount} total`);
    if (txCount > 0) {
      const recentTx = await prisma.transaction.findFirst({
        orderBy: { createdAt: 'desc' },
        include: { user: true }
      });
      console.log(`   - Most recent: ${recentTx?.type} (${recentTx?.amount}) by ${recentTx?.user.username}`);
    }
    console.log();

    // Count Hands
    const handCount = await prisma.hand.count();
    console.log(`🃏 Hands: ${handCount} total`);

    // Count RakeDistribution
    const rakeCount = await prisma.rakeDistribution.count();
    console.log(`💸 Rake Distributions: ${rakeCount} total`);

    // Count Tournaments
    const tournamentCount = await prisma.tournament.count();
    console.log(`🏆 Tournaments: ${tournamentCount} total\n`);

    console.log('✅ Database verification complete!');
    console.log('🎉 Your PostgreSQL database is ready to use!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
