
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Leaderboard } from './pages/Leaderboard';
import { Profile } from './pages/Profile';
import { Lobby } from './pages/Lobby';
import { GameRoom } from './pages/GameRoom';
import { Staking } from './pages/Staking';
import { Swap } from './pages/Swap';
import { Admin } from './pages/Admin';
import { Documentation } from './pages/Documentation'; 
import { TermsOfUse } from './pages/TermsOfUse';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { CookiePolicy } from './pages/CookiePolicy';
import { AboutUs } from './pages/AboutUs';
import { RulesOfPoker } from './pages/RulesOfPoker';
import { FAQ } from './pages/FAQ';
import { Support } from './pages/Support';
import { FairnessVerification } from './pages/FairnessVerification';
import { CreateGameModal } from './components/CreateGameModal';
import { ConnectWalletModal } from './components/ConnectWalletModal';
import { DepositWithdraw } from './components/DepositWithdraw';
import { CookieConsent } from './components/CookieConsent';
import { TurnDeviceOverlay } from './components/TurnDeviceOverlay';
import { TestnetDisclaimer } from './components/TestnetDisclaimer';
import { WalletContextProvider } from './components/WalletContextProvider';
import { MOCK_USER, MOCK_TABLES, MOCK_TOURNAMENTS, ADMIN_WALLET_ADDRESS } from './constants';
import { User, GameType, PokerTable, Tournament } from './types';
import { Twitter, Facebook, Instagram, Music, Send, Radio } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  
  // Cookie Consent State (Issue #7: Enforce cookie acceptance)
  const [cookieConsent, setCookieConsent] = useState<boolean | null>(null);
  
  useEffect(() => {
    // Check existing consent on mount
    const consent = localStorage.getItem('solpoker_cookie_consent');
    setCookieConsent(consent === 'accepted' ? true : consent === 'declined' ? false : null);
  }, []);

  const handleConsentChange = (accepted: boolean) => {
    setCookieConsent(accepted);
  };
  
  // Sync User state with Wallet Connection and Fetch Balance
  useEffect(() => {
      const initializeUser = async () => {
          if (connected && publicKey) {
              const address = publicKey.toBase58();
              
              // Check if wallet changed from current user
              if (user && user.walletAddress !== address) {
                  console.log(`[Wallet Change] Detected wallet change from ${user.walletAddress} to ${address}`);
                  // Clear old user data and force re-initialization
                  setUser(null);
              }
              
              // Fetch user data from backend database
              let currentUser: User;
              try {
                  const response = await fetch(`http://localhost:4000/api/user/${address}`);
                  if (response.ok) {
                      const userData = await response.json();
                      currentUser = {
                          id: userData.id,
                          walletAddress: userData.walletAddress,
                          username: userData.username,
                          balance: userData.balance, // Use database balance (reflects deposits)
                          isVerified: true,
                          avatarUrl: userData.avatarUrl || `https://ui-avatars.com/api/?name=${address}`
                      };
                      console.log(`[User] Loaded from database - Balance: ${userData.balance} chips`);
                  } else {
                      // User doesn't exist in database, will be auto-created on first API call
                      currentUser = {
                          ...MOCK_USER,
                          id: address,
                          walletAddress: address,
                          username: `Player_${address.slice(0,4)}`,
                          balance: 0, // Start with 0 until they deposit
                          isVerified: true
                      };
                      console.log(`[User] New user detected - Balance: 0 (deposit required)`);
                  }
              } catch (e) {
                  console.error("Failed to fetch user from database", e);
                  // Fallback to local user with 0 balance
                  currentUser = {
                      ...MOCK_USER,
                      id: address,
                      walletAddress: address,
                      username: `Player_${address.slice(0,4)}`,
                      balance: 0,
                      isVerified: true
                  };
              }
              
              setUser(currentUser);
              localStorage.setItem(`solpoker_user_${address}`, JSON.stringify(currentUser));
          } else {
              setUser(null);
          }
      };

      initializeUser();
  }, [connected, publicKey, connection, user?.walletAddress]);

  // Persist User updates to LocalStorage keyed by Wallet Address
  const handleUserUpdate = (updatedUser: User) => {
      setUser(updatedUser);
      if (updatedUser.walletAddress) {
          localStorage.setItem(`solpoker_user_${updatedUser.walletAddress}`, JSON.stringify(updatedUser));
      }
  };

  // Data State (Lifted from constants to allow updates)
  const [tables, setTables] = useState<PokerTable[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  
  // Fetch live tables from backend
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/tables');
        if (response.ok) {
          const data = await response.json();
          setTables(data);
          console.log('[App] Live tables loaded:', data.length);
        }
      } catch (error) {
        console.error('[App] Failed to fetch tables:', error);
        // Fallback to mock data on error
        setTables(MOCK_TABLES);
      }
    };
    
    fetchTables();
    // Refresh tables every 5 seconds
    const interval = setInterval(fetchTables, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // Fetch live tournaments from backend
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/tournaments');
        if (response.ok) {
          const data = await response.json();
          setTournaments(data);
          console.log('[App] Live tournaments loaded:', data.length);
        }
      } catch (error) {
        console.error('[App] Failed to fetch tournaments:', error);
        // Fallback to mock data on error
        setTournaments(MOCK_TOURNAMENTS);
      }
    };
    
    fetchTournaments();
    // Refresh tournaments every 5 seconds
    const interval = setInterval(fetchTournaments, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // Modal State
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isDepositWithdrawOpen, setIsDepositWithdrawOpen] = useState(false);
  const [createGameType, setCreateGameType] = useState<GameType>(GameType.CASH);

  const handleVerification = () => {
      if (user) {
          handleUserUpdate({ ...user, isVerified: true });
      }
  };

  const handleBalanceUpdate = (newBalance: number) => {
      if (user) {
          handleUserUpdate({ ...user, balance: newBalance });
      }
  };

  const openCreateModal = (type: GameType) => {
    // Issue #7: Enforce cookie consent before actions
    if (cookieConsent !== true) {
        alert('Please accept cookies to use this feature.');
        return;
    }
    if (!connected) {
        setIsWalletModalOpen(true); // Open Custom Wallet Modal
        return;
    }
    setCreateGameType(type);
    setCreateModalOpen(true);
  };

  const handleJoinGame = (gameId: string) => {
      // Issue #7: Enforce cookie consent before actions
      if (cookieConsent !== true) {
          alert('Please accept cookies to join games.');
          return;
      }
      if (!connected) {
          setIsWalletModalOpen(true); // Open Custom Wallet Modal
          return;
      }
      // Navigate with join intent parameter to trigger auto-join flow
      navigate(`/game/${gameId}?join=true`);
  };

  const handleGameCreated = (newGame: PokerTable | Tournament, type: GameType) => {
    if (type === GameType.CASH || type === GameType.FUN) {
        setTables(prev => [newGame as PokerTable, ...prev]);
    } else {
        setTournaments(prev => [newGame as Tournament, ...prev]);
    }
  };

  return (
      <div className="min-h-screen bg-[#0B0B0F] text-white font-sans selection:bg-sol-green selection:text-black flex flex-col">
        {/* Force Portrait Mode on Mobile */}
        <TurnDeviceOverlay />
        
        {/* Testnet Warning Modal */}
        <TestnetDisclaimer />

        <Routes>
           <Route path="/game/:tableId" element={null} />
           <Route path="*" element={
               <Navbar 
                user={user} 
                onOpenWalletModal={() => setIsWalletModalOpen(true)}
                onOpenDepositWithdraw={() => setIsDepositWithdrawOpen(true)}
               />
           } />
        </Routes>
        
        <main className={`flex-grow w-full ${window.location.hash.includes('game') ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}`}>
          <Routes>
            <Route 
                path="/" 
                element={
                    <Home 
                        onCreateGame={openCreateModal}
                        onJoinGame={handleJoinGame}
                        tables={tables}
                        tournaments={tournaments}
                    />
                } 
            />
            <Route 
                path="/lobby" 
                element={
                    <Lobby 
                        onCreateGame={openCreateModal} 
                        onJoinGame={handleJoinGame}
                        tables={tables}
                        tournaments={tournaments}
                    />
                } 
            />
            <Route path="/staking" element={<Staking user={user} onUserUpdate={handleUserUpdate} />} />
            <Route path="/swap" element={<Swap user={user} />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/fairness" element={<FairnessVerification />} />
            <Route path="/terms" element={<TermsOfUse />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="/documentation" element={<Documentation />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/rules" element={<RulesOfPoker />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/support" element={<Support />} />
            
            {/* Protected Routes */}
            <Route 
              path="/profile" 
              element={user ? <Profile currentUser={user} onUpdateUser={handleUserUpdate} /> : <Navigate to="/" replace />} 
            />
             <Route 
              path="/profile/:userId" 
              element={user ? <Profile currentUser={user} onUpdateUser={handleUserUpdate} /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/game/:tableId" 
              element={<GameRoom tables={tables} tournaments={tournaments} user={user} onVerify={handleVerification} onBalanceUpdate={handleBalanceUpdate} />} 
            />
            
            {/* Admin Route - Let Admin component handle loading/auth */}
            <Route 
              path="/admin" 
              element={<Admin user={user} />} 
            />
          </Routes>
        </main>

        <CreateGameModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setCreateModalOpen(false)}
          defaultType={createGameType}
          onGameCreated={handleGameCreated}
        />

        <ConnectWalletModal 
            isOpen={isWalletModalOpen}
            onClose={() => setIsWalletModalOpen(false)}
        />

        <DepositWithdraw 
            isOpen={isDepositWithdrawOpen}
            onClose={() => setIsDepositWithdrawOpen(false)}
            onBalanceUpdate={handleBalanceUpdate}
        />

        <CookieConsent onConsentChange={handleConsentChange} />
        
        {/* Footer - Hide on Game Room */}
        <Routes>
            <Route path="/game/:tableId" element={null} />
            <Route path="*" element={
                <footer className="bg-sol-dark border-t border-white/10 mt-auto pt-16 pb-8 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                         <div>
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">General Terms</h3>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li><Link to="/terms" className="hover:text-sol-green transition-colors">Terms of Use</Link></li>
                            <li><Link to="/privacy" className="hover:text-sol-green transition-colors">Privacy Policy</Link></li>
                            <li><Link to="/cookies" className="hover:text-sol-green transition-colors">Cookie Policy</Link></li>
                        </ul>
                        </div>

                        <div>
                        <h3 className="text-white font-bold mb-4">Help & Support</h3>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li><Link to="/rules" className="hover:text-sol-green transition-colors">Rules of Poker</Link></li>
                            <li><Link to="/faq" className="hover:text-sol-green transition-colors">FAQ</Link></li>
                            <li><Link to="/support" className="hover:text-sol-green transition-colors">Support</Link></li>
                        </ul>
                        </div>

                        <div>
                        <h3 className="text-white font-bold mb-4">Information</h3>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li><Link to="/about" className="hover:text-sol-green transition-colors">About Us</Link></li>
                            <li><Link to="/documentation" className="hover:text-sol-green transition-colors">Documentation</Link></li>
                        </ul>
                        </div>

                        <div>
                        <h3 className="text-white font-bold mb-4">Social Media</h3>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li>
                                <a href="#" className="flex items-center gap-2 hover:text-sol-green transition-colors">
                                <Twitter size={16} /> X
                                </a>
                            </li>
                            <li>
                                <a href="#" className="flex items-center gap-2 hover:text-sol-green transition-colors">
                                <Facebook size={16} /> Facebook
                                </a>
                            </li>
                            <li>
                                <a href="#" className="flex items-center gap-2 hover:text-sol-green transition-colors">
                                <Instagram size={16} /> IG
                                </a>
                            </li>
                            <li>
                                <a href="#" className="flex items-center gap-2 hover:text-sol-green transition-colors">
                                <Music size={16} /> Tiktok
                                </a>
                            </li>
                            <li>
                                <a href="#" className="flex items-center gap-2 hover:text-sol-green transition-colors">
                                <Send size={16} /> Telegram Community
                                </a>
                            </li>
                        </ul>
                        </div>
                    </div>

                    <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
                        <p className="text-gray-500">© 2024 SOLPOKER X. All rights reserved.</p>
                        <div className="flex items-center gap-2 text-gray-600">
                        <span>Powered by Solana Blockchain</span>
                        <div className="w-2 h-2 rounded-full bg-sol-green animate-pulse"></div>
                        </div>
                    </div>
                </div>
                </footer>
            } />
        </Routes>

        {/* NETWORK INDICATOR */}
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-sol-blue/50 shadow-lg pointer-events-none">
            <Radio size={12} className="text-sol-blue animate-pulse" />
            <span className="text-[10px] font-bold text-sol-blue uppercase tracking-widest">Devnet Live (1 SOL = 100k USDT)</span>
        </div>
      </div>
  );
};

const App: React.FC = () => (
    <HashRouter>
        <WalletContextProvider>
            <AppContent />
        </WalletContextProvider>
    </HashRouter>
);

export default App;
