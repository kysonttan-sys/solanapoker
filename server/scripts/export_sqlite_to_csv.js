// export_sqlite_to_csv.js
// Usage: node export_sqlite_to_csv.js <path/to/dev.db> <outDir>
// Example: node export_sqlite_to_csv.js ../prisma/dev.db.bak ../prisma/csv_export

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { promisify } = require('util');

async function main() {
  const dbPath = process.argv[2] || 'server/prisma/dev.db';
  const outDir = process.argv[3] || 'server/prisma/csv_export';

  if (!fs.existsSync(dbPath)) {
    console.error('Database file not found:', dbPath);
    process.exit(1);
  }

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const db = new sqlite3.Database(dbPath);
  const allAsync = promisify(db.all.bind(db));

  try {
    const tables = await allAsync("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
    for (const row of tables) {
      const t = row.name;
      console.log('Exporting table', t);
      const rows = await allAsync(`SELECT * FROM "${t}"`);
      const outFile = path.join(outDir, `${t}.csv`);

      if (rows.length === 0) {
        // still output headers by reading PRAGMA table_info
        const info = await allAsync(`PRAGMA table_info('${t}')`);
        const headers = info.map(c => c.name);
        fs.writeFileSync(outFile, headers.join(',') + '\n');
        console.log('Wrote empty CSV (headers only):', outFile);
        continue;
      }

      const headers = Object.keys(rows[0]);
      const stream = fs.createWriteStream(outFile, { encoding: 'utf8' });
      stream.write(headers.join(',') + '\n');
      for (const r of rows) {
        const line = headers.map(h => {
          let v = r[h];
          if (v === null || v === undefined) return '';
          v = String(v).replace(/"/g, '""');
          if (v.includes(',') || v.includes('\n') || v.includes('"')) return `"${v}"`;
          return v;
        }).join(',');
        stream.write(line + '\n');
      }
      stream.end();
      console.log('Wrote', outFile);
    }
    console.log('Export completed to', outDir);
  } catch (e) {
    console.error('Export failed:', e);
  } finally {
    db.close();
  }
}

main();
