// sanitize_csvs.js
// Usage: node sanitize_csvs.js <csvDir> [outDir]
// This will SHA256-hash columns named 'email' and 'walletAddress' (case-insensitive) and write sanitized CSVs.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function hash(value, salt = 'solpoker_salt') {
  return crypto.createHash('sha256').update(salt + String(value)).digest('hex');
}

function parseCsvLine(line) {
  // naive CSV split (handles quoted fields)
  const res = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      res.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  res.push(cur);
  return res;
}

function toCsvLine(arr) {
  return arr.map(v => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('\n') || s.includes('"')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }).join(',');
}

async function main() {
  const csvDir = process.argv[2] || 'server/prisma/csv_export';
  const outDir = process.argv[3] || csvDir + '_sanitized';
  if (!fs.existsSync(csvDir)) { console.error('CSV dir not found:', csvDir); process.exit(1); }
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const files = fs.readdirSync(csvDir).filter(f => f.endsWith('.csv'));
  for (const f of files) {
    const infile = path.join(csvDir, f);
    const outfile = path.join(outDir, f);
    const data = fs.readFileSync(infile, 'utf8').split(/\r?\n/);
    if (data.length === 0) continue;
    const headers = parseCsvLine(data[0]);
    const emailIdx = headers.findIndex(h => h.toLowerCase() === 'email');
    const walletIdx = headers.findIndex(h => h.toLowerCase() === 'walletaddress');

    const out = [data[0]]; // header
    for (let i = 1; i < data.length; i++) {
      if (!data[i]) { out.push(''); continue; }
      const cols = parseCsvLine(data[i]);
      if (emailIdx >= 0) cols[emailIdx] = cols[emailIdx] ? hash(cols[emailIdx]) : '';
      if (walletIdx >= 0) cols[walletIdx] = cols[walletIdx] ? hash(cols[walletIdx]) : '';
      out.push(toCsvLine(cols));
    }
    fs.writeFileSync(outfile, out.join('\n'), 'utf8');
    console.log('Sanitized', infile, '->', outfile);
  }
  console.log('Sanitization complete. Output dir:', outDir);
}

main();
