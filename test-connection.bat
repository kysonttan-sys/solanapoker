@echo off
echo Testing SOLPOKER X connection...
echo.
echo Frontend: http://localhost:3000
echo Backend: http://localhost:5000/api/stats
echo.
timeout /t 2 /nobreak
echo.
echo Attempting to reach backend...
curl.exe http://localhost:5000/api/stats
echo.
echo If you see JSON above, the backend is working!
echo.
pause
