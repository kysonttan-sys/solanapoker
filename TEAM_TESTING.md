# Team Testing Guide for SolanaPoker

## Quick Start for Team Testing

### Option 1: ngrok (Recommended for Quick Testing)

ngrok creates public URLs that tunnel to your local servers, allowing anyone on the internet to access your local development environment.

#### Step 1: Sign up for ngrok (Free)
1. Go to https://ngrok.com/
2. Create a free account
3. Get your auth token from the dashboard

#### Step 2: Configure ngrok
```powershell
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

#### Step 3: Start Two Tunnels (Backend + Frontend)

**Terminal 1 - Backend (Port 4000):**
```powershell
cd solanapoker/server
npm run dev
```

**Terminal 2 - Frontend (Port 3000):**
```powershell
cd solanapoker
npm run dev
```

**Terminal 3 - ngrok for Backend:**
```powershell
ngrok http 4000
```
Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)

**Terminal 4 - Update .env and restart frontend:**
```powershell
# Create .env file with ngrok URL
echo "VITE_API_URL=https://abc123.ngrok-free.app" > solanapoker/.env

# Restart frontend
cd solanapoker
npm run dev
```

**Terminal 5 - ngrok for Frontend:**
```powershell
ngrok http 3000
```
Share this URL with your team!

#### Step 4: Share with Team
Send your team:
1. The frontend ngrok URL (e.g., `https://xyz789.ngrok-free.app`)
2. They can access and play together!

---

### Option 2: Local Network (Same WiFi)

If your team is on the same WiFi network:

1. Find your local IP:
```powershell
ipconfig | findstr IPv4
```

2. Start servers:
```powershell
# Terminal 1 - Backend
cd solanapoker/server
npm run dev

# Terminal 2 - Frontend
cd solanapoker
npm run dev -- --host
```

3. Share URL with team:
- `http://YOUR_IP:3000` (e.g., `http://192.168.0.125:3000`)

---

### Option 3: Deploy to Cloud (Production)

For permanent hosting:

#### Vercel (Frontend) + Railway/Render (Backend)

**Frontend on Vercel:**
```bash
npm install -g vercel
cd solanapoker
vercel
```

**Backend on Railway:**
1. Go to https://railway.app
2. Connect your GitHub repo
3. Select the `solanapoker/server` folder
4. Deploy!

---

## Testing Checklist for Team

### Before Testing
- [ ] All team members have Solana wallet (Phantom/Solflare)
- [ ] Wallets set to **Devnet**
- [ ] Get devnet SOL from https://faucet.solana.com

### Test Scenarios

#### 1. Cash Game (2+ Players)
1. Player A creates or joins a table
2. Player A buys in (e.g., 200 chips)
3. Player B joins same table
4. Player B buys in
5. Play poker hands!
6. Verify: Pot calculations, winner payouts

#### 2. Deposit/Withdraw
1. Deposit devnet SOL → Get chips
2. Play some hands
3. Withdraw chips → Get devnet SOL back

#### 3. Leaderboard
1. Play several hands
2. Check leaderboard shows all players
3. Verify rankings update

#### 4. Chat
1. Send messages in game
2. Verify all players see messages

---

## Troubleshooting

### "Invalid chain id" on deposit
- Make sure wallet is on Solana **Devnet**
- Try refreshing the page

### Can't connect to server
- Check if backend is running (port 4000)
- Check if ngrok is running
- Check browser console for errors

### Game stuck
- Refresh the page
- Leave and rejoin the table

### No chips after deposit
- Wait a few seconds for blockchain confirmation
- Check transaction on Solana Explorer

---

## Team Roles for Testing

| Role | Tasks |
|------|-------|
| Host | Set up ngrok, share URLs, run servers |
| Player 1-3 | Join games, test all features |
| Tester | Document bugs, take screenshots |

---

## Contact
Share bugs/issues in your team chat with:
- Screenshot
- Browser console errors
- Steps to reproduce
