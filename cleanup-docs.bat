@echo off
echo ================================================
echo  Quick Documentation Cleanup - Before Sleep
echo ================================================
echo.
echo This will delete tournament-related docs that are
echo no longer needed after today's removal.
echo.
pause

echo.
echo [1/4] Deleting TOURNAMENT_SYSTEM.md...
if exist "TOURNAMENT_SYSTEM.md" (
    del "TOURNAMENT_SYSTEM.md"
    echo ✓ Deleted TOURNAMENT_SYSTEM.md
) else (
    echo - File not found
)

echo.
echo [2/4] Deleting server migration docs...
if exist "server\MIGRATION_TO_POSTGRES.md" (
    del "server\MIGRATION_TO_POSTGRES.md"
    echo ✓ Deleted MIGRATION_TO_POSTGRES.md
) else (
    echo - File not found
)

if exist "server\PRISMA_POSTGRES_INSTRUCTIONS.md" (
    del "server\PRISMA_POSTGRES_INSTRUCTIONS.md"
    echo ✓ Deleted PRISMA_POSTGRES_INSTRUCTIONS.md
) else (
    echo - File not found
)

if exist "server\pgloader_sqlite_to_postgres.load" (
    del "server\pgloader_sqlite_to_postgres.load"
    echo ✓ Deleted pgloader_sqlite_to_postgres.load
) else (
    echo - File not found
)

echo.
echo [3/4] Deleting disabled tournament manager...
if exist "server\src\tournamentManager.ts.disabled" (
    del "server\src\tournamentManager.ts.disabled"
    echo ✓ Deleted tournamentManager.ts.disabled
) else (
    echo - File not found
)

echo.
echo [4/4] Optional: Delete TournamentInfoModal component...
echo (Press Y to delete, N to keep)
choice /C YN /M "Delete components\TournamentInfoModal.tsx"
if errorlevel 2 (
    echo - Kept TournamentInfoModal.tsx
) else (
    if exist "components\TournamentInfoModal.tsx" (
        del "components\TournamentInfoModal.tsx"
        echo ✓ Deleted TournamentInfoModal.tsx
    ) else (
        echo - File not found
    )
)

echo.
echo ================================================
echo  Cleanup Complete!
echo ================================================
echo.
echo Files deleted:
echo   - TOURNAMENT_SYSTEM.md
echo   - Migration documentation files
echo   - Disabled tournament manager
echo.
echo Still need to update tomorrow:
echo   - PROJECT_SUMMARY.md
echo   - IMPLEMENTATION_SUMMARY.md
echo   - COMPREHENSIVE_AUDIT_REPORT.md
echo.
echo Check DOCS_CLEANUP_SUMMARY.md for details.
echo.
pause
