const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  const rows = [];

  // Date/timestamp fields that need conversion
  const dateFields = ['createdAt', 'updatedAt', 'lastChainSync', 'startTime', 'finishTime'];
  // Boolean fields that need conversion from 0/1
  const booleanFields = ['isVerified', 'walletVerified'];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = lines[i].split(',');
    const row = {};

    headers.forEach((header, index) => {
      let value = values[index];

      // Handle empty values
      if (value === '' || value === 'null' || value === undefined) {
        value = null;
      } else if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else if (booleanFields.includes(header)) {
        // Convert 0/1 to boolean
        value = value === '1' || value === 1;
      } else if (dateFields.includes(header) && !isNaN(value) && value !== '') {
        // Convert Unix timestamp to Date object
        value = new Date(parseFloat(value));
      } else if (!isNaN(value) && value !== '') {
        // Convert to number if it's numeric
        value = parseFloat(value);
      }

      row[header] = value;
    });

    rows.push(row);
  }

  return rows;
}

async function importCSV(tableName, filePath) {
  console.log(`\nImporting ${tableName}...`);

  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const rows = parseCSV(content);

  if (rows.length === 0) {
    console.log(`  ℹ️  No data to import`);
    return;
  }

  console.log(`  Found ${rows.length} rows`);

  try {
    // Import based on table name
    switch (tableName) {
      case 'SystemState':
        for (const row of rows) {
          await prisma.systemState.upsert({
            where: { id: row.id },
            update: row,
            create: row
          });
        }
        break;

      case 'User':
        for (const row of rows) {
          await prisma.user.upsert({
            where: { id: row.id },
            update: row,
            create: row
          });
        }
        break;

      case 'Transaction':
        for (const row of rows) {
          await prisma.transaction.create({
            data: row
          });
        }
        break;

      case 'Hand':
        for (const row of rows) {
          await prisma.hand.create({
            data: row
          });
        }
        break;

      case 'RakeDistribution':
        for (const row of rows) {
          await prisma.rakeDistribution.create({
            data: row
          });
        }
        break;

      case 'Tournament':
        for (const row of rows) {
          await prisma.tournament.create({
            data: row
          });
        }
        break;

      default:
        console.log(`  ⚠️  Unknown table: ${tableName}`);
        return;
    }

    console.log(`  ✅ Successfully imported ${rows.length} rows`);
  } catch (error) {
    console.error(`  ❌ Error importing ${tableName}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Starting CSV import to PostgreSQL...\n');

  const csvDir = path.join(__dirname, '../prisma/csv_export');

  // Import in order (respecting foreign keys)
  await importCSV('SystemState', path.join(csvDir, 'SystemState.csv'));
  await importCSV('User', path.join(csvDir, 'User.csv'));
  await importCSV('Hand', path.join(csvDir, 'Hand.csv'));
  await importCSV('Transaction', path.join(csvDir, 'Transaction.csv'));
  await importCSV('RakeDistribution', path.join(csvDir, 'RakeDistribution.csv'));
  await importCSV('Tournament', path.join(csvDir, 'Tournament.csv'));

  console.log('\n✅ Import complete!');
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
