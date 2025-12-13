import { db } from '../db';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
    try {
        console.log('🚀 Running Hybrid Override Model migration...\n');

        const sqlPath = path.join(__dirname, '../../prisma/migrations/hybrid_override_model.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

        // Remove comments first
        const lines = sqlContent.split('\n').filter(line => !line.trim().startsWith('--') && line.trim().length > 0);
        const cleanedSql = lines.join('\n');

        // Split by semicolon to get individual statements
        const statements = cleanedSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Found ${statements.length} SQL statements to execute...\n`);

        // Execute each statement separately
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            try {
                console.log(`[${i + 1}/${statements.length}] ${statement.substring(0, 70)}...`);
                await db.$executeRawUnsafe(statement + ';');
                console.log('✅ Success\n');
            } catch (error: any) {
                // Ignore errors for statements that are safe to fail (like DROP IF EXISTS)
                if (error.code === 'P2010' && (statement.includes('DROP') || statement.includes('IF NOT EXISTS'))) {
                    console.log('⚠️  Skipped (already applied or does not exist)\n');
                } else {
                    throw error;
                }
            }
        }

        console.log('✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await db.$disconnect();
    }
}

runMigration();
