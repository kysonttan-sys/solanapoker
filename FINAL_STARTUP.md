# 🚀 SOLPOKER X - FINAL STARTUP INSTRUCTIONS

## ⚠️ **DO THIS EXACTLY**

### Step 1: Kill All Previous Processes
```powershell
taskkill /F /IM node.exe /IM npm.exe
```

Wait 3 seconds.

### Step 2: Start Backend (First!)

**Option A - Using Batch File (Easiest):**
Double-click: `START_BACKEND.bat`

**Option B - Manual Command:**
```powershell
cd "c:\Users\kyson\OneDrive\Desktop\solpoker\server"
npm run dev
```

**Wait until you see:**
```
[Server] HTTP server callback fired - server is listening!
```

### Step 3: Start Frontend (New Terminal/Window!)

**Important:** Open a NEW terminal/command prompt window!

**Option A - Using Batch File:**
Double-click: `START_FRONTEND.bat`

**Option B - Manual Command:**
```powershell
cd "c:\Users\kyson\OneDrive\Desktop\solpoker"
npm run dev
```

**You should see:**
```
VITE v5.4.21 ready in XXX ms
  ➜ Local: http://localhost:3000/
```

(or port 3001/3002 if 3000 is busy)

### Step 4: Open Browser

Go to: **http://localhost:3000** (or whatever port shown in terminal)

### Step 5: Check Console

Press **F12** → **Console** tab

**Look for:**
```
[Socket.io] Connecting to: http://localhost:5000
✅ Connected to Game Server: <socket-id>
```

If you see "✅ Connected" → **YOU'RE CONNECTED!** ✅

---

## 🔧 Troubleshooting

### Backend won't start
```powershell
cd c:\Users\kyson\OneDrive\Desktop\solpoker\server
npx tsc --noEmit
```

If errors show up, report them.

### Frontend shows "Connecting to Live Server"
1. Check browser console (F12 → Console)
2. Look for "[Socket.io] Connecting to:" message
3. Verify backend is running (should see log message)
4. Reload page (F5)

### Port conflicts
```powershell
netstat -ano | findstr ":5000"   # Check port 5000
netstat -ano | findstr ":3000"   # Check port 3000/3001
```

If ports are in use:
```powershell
taskkill /F /IM node.exe
```

---

## ✅ Final Verification

**Backend terminal should show:**
- ✅ Database Connected
- ✅ Backend Server running on port 5000
- ✅ Socket.io listening for connections
- ✅ [Server] HTTP server callback fired - server is listening!

**Frontend terminal should show:**
- ✅ VITE ready
- ✅ Local: http://localhost:3000 (or 3001/3002)

**Browser console should show:**
- ✅ [Socket.io] Connecting to: http://localhost:5000
- ✅ Connected to Game Server: <id>

---

## 🎮 NOW YOU CAN TEST!

1. Connect Wallet → See balance
2. Go to Lobby → Click View on a table
3. Click "Buy In" → Enter 100
4. Select seat → Click "Sit Down"
5. Wait for your turn → Click "Fold", "Call", or "Raise"
6. Play!

Good luck! 🍀
