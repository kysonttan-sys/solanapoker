Prisma + Postgres: Update datasource and run migrations
=======================================================

1) Provision a managed Postgres DB
- Create a new Postgres database on Supabase / Neon / Render / Railway.
- Save the connection string (DATABASE_URL) in the form:
  postgres://USER:PASSWORD@HOST:PORT/DATABASE

2) Update `server/prisma/schema.prisma`
- Open `server/prisma/schema.prisma` and change the datasource block to:

  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }

- Keep your `generator client` block unchanged.

3) Set `DATABASE_URL` locally (PowerShell)

```powershell
$env:DATABASE_URL = 'postgres://user:password@host:5432/dbname'
```

Or place it in a `.env` in `server/` with:

DATABASE_URL="postgres://user:password@host:5432/dbname"

4) Apply migrations / push schema
- If you already have migrations and want to apply them to the new DB (CI/production):

  npx prisma migrate deploy
  npx prisma generate

- For local development (create migration from current schema and apply):

  npx prisma migrate dev --name init
  npx prisma generate

- Alternatively, to push schema without creating a migration (use with care):

  npx prisma db push
  npx prisma generate

5) Import CSVs (if you exported from SQLite)
- Use the script: `server/scripts/import_csv_to_postgres.ps1`
- Example:

  $env:DATABASE_URL = 'postgres://user:password@host:5432/dbname'
  powershell -File server\scripts\import_csv_to_postgres.ps1 -CsvDir "server/prisma/csv_export"

6) Post-import checklist
- Verify important tables: `User`, `Transaction`, `Hand`, `RakeDistribution`, `Tournament`.
- Ensure string IDs (cuid) and foreign keys imported as expected.
- If any tables used serial integer PKs, set sequences to max(id) + 1.
- Recreate necessary indexes if not auto-created.

7) Create read-only user for analytics
- Connect with psql and run (example):

  CREATE ROLE analytics WITH LOGIN PASSWORD 'strongpassword';
  GRANT CONNECT ON DATABASE dbname TO analytics;
  \c dbname
  GRANT USAGE ON SCHEMA public TO analytics;
  GRANT SELECT ON TABLE "User" TO analytics;
  -- Repeat GRANT SELECT for other tables required

8) Backups & security
- Enable automatic backups on provider dashboard.
- Restrict firewall/IPs where possible.
- Rotate DB credentials after migration.

If you want, I can now:
- Generate `COPY` statements tailored to your CSV files (I can inspect the CSV headers and produce a `COPY` script), or
- Prepare a `pgloader` command instead if you'd prefer direct conversion.

Tell me which import method you prefer (CSV/psql or pgloader) and I will prepare the next script or commands.  