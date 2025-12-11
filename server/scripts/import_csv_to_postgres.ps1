param(
    [string]$CsvDir = "server/prisma/csv_export",
    [string]$DatabaseUrl = $env:DATABASE_URL
)

# Import CSV files exported from SQLite into a Postgres DB using psql's \copy.
# Usage:
#   $env:DATABASE_URL = 'postgres://user:pass@host:5432/dbname'
#   powershell -File server\scripts\import_csv_to_postgres.ps1 -CsvDir "server/prisma/csv_export"
#
# Notes:
# - This script expects CSV files named exactly after table names (e.g., "User.csv", "Transaction.csv").
# - It runs \copy in psql so psql CLI must be installed and DATABASE_URL set.
# - Review mappings and column types before running in production.

if (-not (Test-Path $CsvDir)) {
    Write-Error "CSV directory not found: $CsvDir"
    exit 1
}

if (-not $DatabaseUrl) {
    Write-Host "DATABASE_URL not provided. Prompting for it now..."
    $DatabaseUrl = Read-Host "Enter Postgres DATABASE_URL (postgres://user:pass@host:5432/db)"
}

function Find-PSQL {
    $cmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    # Common Windows installation paths
    $possible = @(
        "$env:ProgramFiles\PostgreSQL\18\bin\psql.exe",
        "$env:ProgramFiles(x86)\PostgreSQL\18\bin\psql.exe",
        "$env:ProgramFiles\PostgreSQL\15\bin\psql.exe",
        "$env:ProgramFiles\PostgreSQL\14\bin\psql.exe"
    )

    foreach ($p in $possible) {
        if (Test-Path $p) { return $p }
    }

    # Try searching Program Files if above failed (fast-ish)
    $pf = "$env:ProgramFiles\PostgreSQL"
    if (Test-Path $pf) {
        Get-ChildItem $pf -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            $candidate = Join-Path $_.FullName 'bin\psql.exe'
            if (Test-Path $candidate) { return $candidate }
        }
    }

    return $null
}

$psqlPath = Find-PSQL
if (-not $psqlPath) {
    Write-Error "psql CLI not found. Install PostgreSQL client tools or add psql to PATH."
    exit 1
} else {
    Write-Host "Using psql: $psqlPath"
}

# Parse database name and host info for psql invocation
# psql accepts the connection string directly with -d

# Get list of CSV files
$csvFiles = Get-ChildItem -Path $CsvDir -Filter *.csv | ForEach-Object { $_.FullName }
if ($csvFiles.Count -eq 0) {
    Write-Error "No CSV files found in $CsvDir"
    exit 1
}

Write-Host "Found $($csvFiles.Count) CSV files. Files:"
$csvFiles | ForEach-Object { Write-Host "  " $_ }

# Confirm before proceeding
$confirm = Read-Host "This will import CSVs into the database ($DatabaseUrl). Continue? (y/N)"
if ($confirm.ToLower() -ne 'y') { Write-Host "Aborted by user."; exit 0 }

foreach ($file in $csvFiles) {
    $filename = [System.IO.Path]::GetFileNameWithoutExtension($file)
    $tablename = $filename

    Write-Host "Importing '$file' -> table '$tablename'"

    # Run psql \copy command. Escape quotes correctly for PowerShell.
    $escapedPath = $file -replace "'","''"
    $copyCmd = "\copy `"$tablename`" FROM '$escapedPath' WITH (FORMAT csv, HEADER true)"

    # Execute psql with -c
    Write-Host "Running: $psqlPath -d '$DatabaseUrl' -c $copyCmd"

    # Write copy command to a temporary SQL file and run psql -f to avoid argument quoting issues
    $tempSql = [System.IO.Path]::Combine($env:TEMP, "psql_import_$($tablename)_$(Get-Random).sql")
    Set-Content -Path $tempSql -Value $copyCmd -Encoding UTF8

    Write-Host "Running: $psqlPath -d '$DatabaseUrl' -f $tempSql"
    & $psqlPath -d $DatabaseUrl -f $tempSql
    $exit = $LASTEXITCODE

    Remove-Item -Path $tempSql -ErrorAction SilentlyContinue

    if ($exit -ne 0) {
        Write-Error "Import failed for $file (psql exit code $exit)"
        exit $exit
    }
}

Write-Host "Import finished. Reminder: verify constraints, indexes and sequences in Postgres."