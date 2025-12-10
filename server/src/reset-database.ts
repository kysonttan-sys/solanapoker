// Reset all users data and start fresh
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function resetAllData() {
    console.log('🔄 Starting database reset...');
    
    try {
        // Delete all records in order (respecting foreign key constraints)
        console.log('🗑️  Deleting RakeDistribution records...');
        await db.rakeDistribution.deleteMany({});
        
        console.log('🗑️  Deleting Hand records...');
        await db.hand.deleteMany({});
        
        console.log('🗑️  Deleting Transaction records...');
        await db.transaction.deleteMany({});
        
        console.log('🗑️  Deleting User records...');
        await db.user.deleteMany({});
        
        console.log('🗑️  Resetting SystemState...');
        await db.systemState.upsert({
            where: { id: 'global' },
            create: {
                id: 'global',
                jackpot: 0,
                tvl: 0,
                totalVolume: 0,
                totalHands: 0,
                activePlayers: 0,
                communityPool: 0
            },
            update: {
                jackpot: 0,
                tvl: 0,
                totalVolume: 0,
                totalHands: 0,
                activePlayers: 0,
                communityPool: 0
            }
        });
        
        console.log('✅ Database reset complete!');
        console.log('📊 All user data cleared and ready for fresh start.');
        
    } catch (error) {
        console.error('❌ Error resetting database:', error);
        throw error;
    } finally {
        await db.$disconnect();
    }
}

resetAllData()
    .then(() => {
        console.log('✅ Reset script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Reset script failed:', error);
        process.exit(1);
    });
