<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SOLPOKER X

View your app in AI Studio: https://ai.studio/apps/drive/1zdENNBxu08hwtyHk4fWc0pj8SoFHDB4x

## 🚀 How to Play (The "Stupid Simple" Guide)

You need **TWO** terminals (command windows) open at the same time.

### Terminal 1: The Backend (The Brains)
This runs the game logic and card shuffling.

1.  **Install dependencies** (Do this once):
    ```bash
    npm run server:install
    ```
2.  **Start the Server**:
    ```bash
    npm run server:start
    ```
    *You should see: `🚀 SOLPOKER X Backend running on port 3001`*

### Terminal 2: The Frontend (The Face)
This runs the website you click on.

1.  **Open a NEW terminal** (Don't close the first one!)
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Start the Website**:
    ```bash
    npm run dev
    ```
    *Open the link (usually http://localhost:3000) in your browser.*

---

## Features
- **Provably Fair RNG**: Verifiable shuffling using Server+Client seeds.
- **Non-Custodial**: Direct wallet integration.
- **Host-to-Earn**: Create tables and earn rake.
