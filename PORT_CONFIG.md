# SOLPOKER X - Port Management Guide

## Current Issue
- Frontend (Vite) running on port 3001
- Backend trying to run on port 3001 (CONFLICT!)
- Solution: Backend now uses port 5000

## Port Configuration

| Service | Port | Status |
|---------|------|--------|
| Backend Server | 5000 | ✅ Default |
| Frontend (Vite) | 3000/3001/3002 | ✅ Auto-increment |
| Wallet Adapter | (embedded) | ✅ OK |
| Database | (local SQLite) | ✅ OK |

## Kill All Node Processes (Windows)

```powershell
# Kill all Node processes
taskkill /F /IM node.exe

# Verify they're gone
Get-Process -Name "node" -ErrorAction SilentlyContinue
```

## Start Services in Order

### Terminal 1: Backend (Port 5000)
```bash
cd "c:\Users\kyson\OneDrive\Desktop\solpoker\server"
npm run dev
```

**Expected Output:**
```
✅ Database Connected
🚀 Backend Server running on port 5000
📡 Socket.io listening for connections...
```

### Terminal 2: Frontend (Port 3000/3001/3002)
```bash
cd "c:\Users\kyson\OneDrive\Desktop\solpoker"
npm run dev
```

**Expected Output:**
```
VITE v5.4.21 ready in XXX ms
  ➜ Local: http://localhost:3000/
```

## Verify Connection

1. Open http://localhost:3000 (or 3001/3002 if shown)
2. Press F12 → Console
3. Look for: `✅ Connected to Game Server: <socket-id>`

If you see that message, the connection is working!

## Troubleshooting

### "Address already in use"
```powershell
# Kill all Node processes
taskkill /F /IM node.exe
taskkill /F /IM npm.exe

# Wait 2 seconds
Start-Sleep -Seconds 2

# Try again
```

### Backend on wrong port
- Frontend: Any port is OK (shows in terminal)
- Backend: Should be 5000
- Frontend auto-detects backend on port 5000

### Still stuck on "Connecting to Live Server"
1. Check Console (F12) for errors
2. Verify backend running: `http://localhost:5000/api/stats`
3. Run diagnostic: Copy content from `DIAGNOSTIC.js` and paste in console

## Environment Variables (Optional)

To override default ports:

```bash
# Backend - use port 4000 instead of 5000
$env:SERVER_PORT=4000; npm run dev

# Frontend - let Vite handle port selection
npm run dev
```

Then update frontend to match in hooks/useSocket.ts

## Quick Reference Commands

```powershell
# Start fresh
taskkill /F /IM node.exe
cd "c:\Users\kyson\OneDrive\Desktop\solpoker\server" ; npm run dev

# In another terminal
cd "c:\Users\kyson\OneDrive\Desktop\solpoker" ; npm run dev

# Then open http://localhost:3000
```
