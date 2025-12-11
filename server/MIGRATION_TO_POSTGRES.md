Migration from SQLite (dev.db) to Managed Postgres
===============================================

This document provides safe, repeatable steps to migrate your local SQLite `server/prisma/dev.db` to a managed Postgres instance (Supabase/Neon/Render/Railway). It also includes fallback CSV import options and Prisma configuration notes.

Overview (recommended flow)
1. Provision a managed Postgres DB (Supabase/Neon/Render/Railway).
2. Export SQLite tables to CSV (script included) or use `pgloader` for direct conversion.
3. Create a new empty Postgres DB and a migration user.
4. Import CSVs into Postgres or run `pgloader` conversion.
5. Update `server/prisma/schema.prisma` datasource to Postgres and run Prisma migrations.
6. Point your `DATABASE_URL` env var to the new DB and run `npx prisma generate`.

Important safety notes
- Do NOT share raw `dev.db` publicly. Keep an encrypted backup if needed.
- Use a read-only DB user for any third-party analytics or ETL connectors.
- Enable automated backups and restrict access by IP and strong credentials.

Quick choices
- Small/simple projects: use `pgloader` to convert SQLite -> Postgres directly.
- Controlled export: export CSV per-table and `COPY` into Postgres (recommended for auditing and sanitization).

pgloader (direct conversion)
- If you can install `pgloader` (Linux/macOS), it's the fastest method.

Example command:

pgloader sqlite:///C:/Users/kyson/OneDrive/Desktop/solanapoker/server/prisma/dev.db postgres://user:password@host:5432/dbname

This creates tables and copies data. You may need to adjust types manually.

CSV export + import (PowerShell)
- Use the included `server/scripts/export_sqlite_to_csv.ps1` script to create CSVs for each table.
- Then on Postgres machine run `psql` and use `\copy` or `COPY` to load each CSV.

Prisma steps after importing data
1. Edit `server/prisma/schema.prisma`:
   - Change `datasource db` to use your Postgres `DATABASE_URL` (e.g., `url = env("DATABASE_URL")` and `provider = "postgresql"`).
2. Create a migration (if you changed schema) or push the schema:
   - For CI/production: `npx prisma migrate deploy`
   - For local dev (will create migrations): `npx prisma migrate dev --name init`
3. Generate client: `npx prisma generate`

Create a read-only user for analytics
- Create a DB role with `LOGIN` and `CONNECT` but limited privileges.
- Grant `SELECT` on required tables only. Use this role for 3rd-party ETL tools.

Sanitization for third parties
- If a vendor requests access, prefer sanitized exports (hash emails/wallet addresses):
  - Use `SHA256` or other strong hash with a salt only you know.
  - Remove or bucket balances if not necessary.

Troubleshooting tips
- If `pgloader` fails on types, export to CSV and import.
- If Prisma complains about nullability or default values, inspect `schema.prisma` and adjust columns.

Contact me to:
- Prepare a `pgloader` command tailored to your dev.db OR
- Generate per-table CSVs (I already added the export script) and a Postgres import script.

---

Commands summary (PowerShell)

# Export CSVs (runs script):
powershell -File server\scripts\export_sqlite_to_csv.ps1 -SqlitePath "server\prisma\dev.db" -OutDir "server\prisma\csv_export"

# Example pgloader (Linux/macOS):
pgloader sqlite:///full/path/to/dev.db postgres://user:password@host:5432/dbname

# After importing, update Prisma datasource and run:
# Set environment variable (Windows PowerShell):
$env:DATABASE_URL = 'postgres://user:password@host:5432/dbname'
npx prisma migrate deploy
npx prisma generate

