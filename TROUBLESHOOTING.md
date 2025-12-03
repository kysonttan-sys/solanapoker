# 🔧 Socket.io Connection Troubleshooting Guide

## Problem: "Stuck at Connecting to Live Server"

This means the frontend cannot connect to the backend via Socket.io. Here's how to fix it:

---

## ✅ Quick Checklist

### 1. **Backend Server Running?** 
```bash
# Check backend logs show this:
✅ Database Connected
🚀 Server running on port 3001
```

**If NOT running:**
```bash
cd server
npm run dev
```

**Wait 3-5 seconds** for the message to appear.

---

### 2. **Frontend on Different Port?**
The frontend might be on port 3000, 3001, or 3002 (if ports are busy).

**Solution:** The frontend code now auto-detects the correct backend URL.

**Action:** Reload the frontend page (F5)

---

### 3. **Browser Console Check** (F12 → Console tab)

Look for these messages:

✅ **Good - You should see:**
```
✅ Connected to Game Server: <socket-id>
```

❌ **Bad - You might see:**
```
❌ Connection Error: connect ECONNREFUSED 127.0.0.1:3001
```

or

```
❌ Connection Error: Error during WebSocket handshake: Unexpected response code: 400
```

---

## 🔍 Diagnostic Steps

### Step 1: Test Backend Directly
Open your browser and go to:
- `http://localhost:3001/api/stats`

You should see JSON data like:
```json
{
  "id": "global",
  "jackpot": 15420.50,
  "tvl": 12500000,
  "totalVolume": 142500000,
  "activePlayers": 2405
}
```

**If you see this:** ✅ Backend is running correctly

**If you see ERROR:** ❌ Backend is not responding
- Check backend terminal for errors
- Restart backend: `cd server && npm run dev`

---

### Step 2: Check Frontend Console

1. Open your app in browser
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Look for connection messages

**Copy any error messages and check below.**

---

### Step 3: Run Diagnostic Tool

1. Open **Console** in DevTools (F12)
2. Copy the entire content from `DIAGNOSTIC.js`
3. Paste it into console
4. Press Enter
5. Review the output

This will tell you:
- ✅/❌ Backend is reachable
- ✅/❌ WebSocket is supported
- ✅/❌ Socket.io is loaded

---

## 🚨 Common Error Messages & Fixes

### Error: "connect ECONNREFUSED"
**Meaning:** Frontend cannot reach backend on port 3001

**Fix:**
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Wait for: "🚀 Server running on port 3001"

# Terminal 2 - Frontend (in separate terminal)
cd <solpoker root>
npm run dev
```

---

### Error: "Unexpected response code: 400"
**Meaning:** Backend responded but Socket.io handshake failed

**Fix:**
1. Check backend logs for errors
2. Verify Node.js and dependencies:
   ```bash
   cd server
   npm install --force
   npm run dev
   ```

---

### Error: "WebSocket is not defined"
**Meaning:** Browser doesn't support WebSocket

**Fix:**
- Try a different browser (Chrome, Firefox, Edge)
- WebSocket should work in all modern browsers

---

## 🔄 Complete Reset Procedure

If nothing works, try a full reset:

```bash
# Terminal 1: Kill everything
# Ctrl + C to stop both servers

# Terminal 2: Clear and reinstall
cd server
rm -r node_modules package-lock.json
npm install
npm run dev

# Wait for: "✅ Database Connected" and "🚀 Server running on port 3001"

# Terminal 3: Frontend
cd <solpoker root>
npm install
npm run dev
```

Wait 10 seconds, then **reload browser (F5)**.

---

## 📋 Verify Connection Steps

After backend and frontend are running:

1. **Frontend should show:**
   - No errors in console
   - "✅ Connected to Game Server" in console
   - Wallet connection working

2. **Connect Wallet:**
   - Click "Connect Wallet" button
   - Approve in wallet
   - See your balance

3. **Join Game:**
   - Go to Lobby
   - Click "View" on a table
   - Should NOT see "Connecting to Live Server" stuck message

4. **Play:**
   - Click "Buy In"
   - Select seat
   - See yourself seated on table
   - Click actions (Fold, Check, Call, etc.)

---

## 🐛 Still Stuck? Collect This Info

If still not working, gather this information:

1. **Backend terminal output:**
   ```
   [Copy everything shown after "npm run dev"]
   ```

2. **Frontend console errors:**
   ```
   [Press F12 → Console → Copy all red error messages]
   ```

3. **Test if backend responds:**
   ```
   [Open http://localhost:3001/api/stats in browser]
   [Does it show JSON? Or error?]
   ```

4. **Your port numbers:**
   - Backend: _____ (should be 3001)
   - Frontend: _____ (shown in browser URL bar)

---

## ✨ Network Debugging (Advanced)

**Monitor Socket.io traffic:**

```javascript
// Paste in console (F12)
const socket = window.io && window.io.managers && window.io.managers[0];
if (socket) {
    socket.on('*', (event, ...args) => {
        console.log('📨 Socket event:', event, args);
    });
}
```

This will show all Socket.io messages in real-time.

---

## 🎯 Success Indicators

✅ Connection successful when you see:

- Console: `✅ Connected to Game Server: <id>`
- Navbar: Wallet address showing
- Lobby: Tables loading
- Table: Game state showing
- Actions: Buttons responsive

---

**Still need help?**
- Check `/support` page in app
- Review server logs for specific errors
- Verify both terminals are running without crashes
