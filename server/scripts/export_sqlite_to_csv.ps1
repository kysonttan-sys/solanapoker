param(
    [string]$SqlitePath = "server/prisma/dev.db",
    [string]$OutDir = "server/prisma/csv_export"
)

# Exports all user tables from a SQLite DB into CSV files using sqlite3 CLI.
# Requires sqlite3 installed and available on PATH. PowerShell only.

if (-not (Test-Path $SqlitePath)) {
    Write-Error "SQLite DB not found at $SqlitePath"
    exit 1
}

if (-not (Get-Command sqlite3 -ErrorAction SilentlyContinue)) {
    Write-Error "sqlite3 CLI not found. Install SQLite (https://www.sqlite.org/download.html) or run on WSL.";
    exit 1
}

if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir | Out-Null
}

# Get table list
$tableQuery = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
$tables = & sqlite3 $SqlitePath $tableQuery | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }

Write-Host "Found tables:`n  $($tables -join "`n  ")"

foreach ($t in $tables) {
    $outFile = Join-Path $OutDir ("$t.csv")
    Write-Host "Exporting table '$t' -> $outFile"

    # Export with headers
    $cmd = "sqlite3 -header -csv `"$SqlitePath`" `"select * from '$t';`" > `"$outFile`""
    # Execute with cmd.exe to allow redirection
    cmd /c $cmd
}

Write-Host "Export completed. CSVs are in: $OutDir"
Write-Host "Notes: - After importing to Postgres, you may need to adjust serial/sequence fields and types."