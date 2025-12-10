
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Volume2, VolumeX, ShieldCheck, WifiOff, Wifi, Menu, UserPlus, LogIn, Loader2, Eye } from 'lucide-react';
import { Table } from '../components/poker/Table';
import { GameControls } from '../components/poker/GameControls';
import { BuyInModal } from '../components/BuyInModal';
import { TournamentInfoModal } from '../components/TournamentInfoModal';
import { FairnessModal } from '../components/FairnessModal';
import { CaptchaModal } from '../components/ui/CaptchaModal';
import { ChatBox } from '../components/ChatBox'; 
import { Button } from '../components/ui/Button';
import { GameState } from '../utils/pokerGameLogic';
import { generateSeed } from '../utils/fairness';
import { playGameSound, initAudio, setAudioEnabled } from '../utils/audio';
import { PokerTable, Tournament, User, GameType } from '../types';
import { useSocket } from '../hooks/useSocket';

interface GameRoomProps {
  tables: PokerTable[];
  tournaments: Tournament[];
  user: User | null;
  onVerify: () => void;
  onBalanceUpdate: (balance: number) => void;
}

// Strict State Machine for Joining Process
type JoinPhase = 'idle' | 'verifying' | 'buying-in' | 'joining';

export const GameRoom: React.FC<GameRoomProps> = ({ tables, tournaments, user, onVerify, onBalanceUpdate }) => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const { socket, isConnected, status } = useSocket();
  
  // Check if user wants to auto-join (from "Join Table" button)
  const [autoJoinIntent, setAutoJoinIntent] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('join') === 'true';
  });

  // --- GAME DATA ---
  const tableData = tables.find(t => t.id === tableId);
  const tournamentData = tournaments.find(t => t.id === tableId);
  const gameData = tableData || tournamentData;

  // --- STATE ---
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  
  // Join Process State
  const [joinPhase, setJoinPhase] = useState<JoinPhase>('idle');
  const [selectedSeatIndex, setSelectedSeatIndex] = useState<number | undefined>(undefined);
  const [isBuyInOpen, setIsBuyInOpen] = useState(false);
  const [isCaptchaOpen, setIsCaptchaOpen] = useState(false);

  // UI Toggles
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);
  const [isTournamentInfoOpen, setIsTournamentInfoOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  
  // User Preferences
  const [showBB, setShowBB] = useState(false);
  const [fourColor, setFourColor] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  // Gameplay Local State
  const [clientSeed, setClientSeed] = useState(generateSeed());
  const [timeLeft, setTimeLeft] = useState(30);

  // --- AUDIO INITIALIZATION ---
  // Initialize audio context on first user interaction (required by browser autoplay policy)
  useEffect(() => {
    const handleFirstInteraction = () => {
      initAudio();
      setAudioEnabled(!isMuted);
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  // Sync audio enabled state with mute toggle
  useEffect(() => {
    setAudioEnabled(!isMuted);
  }, [isMuted]);

  // --- SOCKET CONNECTION & EVENTS ---
  useEffect(() => {
    if (!socket || !tableId) return;

    console.log(`[GameRoom] Connecting to ${tableId}...`);

    // Prepare Config for Room Creation (if it doesn't exist on server)
    const config = gameData ? {
        maxSeats: gameData.seats ? parseInt(String(gameData.seats), 10) : 6,
        smallBlind: 'smallBlind' in gameData ? Number(gameData.smallBlind) : 50,
        bigBlind: 'bigBlind' in gameData ? Number(gameData.bigBlind) : 100,
        gameMode: gameData.id.startsWith('tour') ? 'tournament' : (gameData as PokerTable).type === GameType.FUN ? 'fun' : 'cash'
    } : {};

    // 1. Join Room as Spectator
    if (isConnected) {
        socket.emit('joinTable', { 
            tableId, 
            user: user ? { ...user } : { id: 'spectator', name: 'Spectator' },
            config 
        });
    }

    // 2. Listen for Game State
    socket.on('gameStateUpdate', (newState: GameState) => {
        const prevHandNumber = gameState?.handNumber;
        setGameState(newState);
        
        // If we are waiting to join and see ourselves in the list, stop loading
        if (joinPhase === 'joining' && user) {
            const amISeated = newState.players.some(p => p.id === user.id);
            if (amISeated) {
                setJoinPhase('idle');
            }
        }
        
        // Play sound when new hand starts
        if (!isMuted && prevHandNumber !== undefined && newState.handNumber > prevHandNumber) {
            playGameSound('chip');
        }
        
        // Audio Triggers for actions
        if (!isMuted && newState.lastLog) {
            if (newState.lastLog.includes('fold')) playGameSound('fold');
            else if (newState.lastLog.includes('check')) playGameSound('check');
            else if (newState.lastLog.includes('wins')) playGameSound('win');
            else if (newState.lastLog.includes('call') || newState.lastLog.includes('raise')) playGameSound('chip');
        }
    });

    // 3. Listen for Chat
    socket.on('newChatMessage', (msg) => {
        setChatMessages(prev => [...prev, msg]);
        if (!isChatOpen) setIsChatOpen(true);
    });

    // 4. Listen for Errors (Reset join phase)
    socket.on('error', (err) => {
        console.error("Game Error:", err);
        alert(err.message || "An error occurred");
        setJoinPhase('idle');
    });

    return () => {
        socket.off('gameStateUpdate');
        socket.off('newChatMessage');
        socket.off('error');
    };
  }, [socket, isConnected, tableId, user, isMuted, gameData, joinPhase]);

  // --- STRICT JOIN FLOW HANDLERS ---

  /**
   * PHASE 1: INITIATE
   * Triggered by clicking "Join Game" button OR clicking an empty Seat.
   */
  const handleJoinRequest = useCallback((seatIndex?: number) => {
      console.log(`[Join] Request initiated. Seat: ${seatIndex ?? 'Any'}`);

      if (!user) {
          alert("Please connect your wallet to join a table.");
          return;
      }

      if (!gameState) {
          console.warn("[Join] Game state not ready.");
          return;
      }

      // Check if already seated
      const isSeated = gameState.players.some(p => p.id === user.id);
      if (isSeated) {
          alert("You are already seated at this table!");
          return;
      }

      setSelectedSeatIndex(seatIndex);
      setJoinPhase('verifying'); // Move to Phase 2
      setIsCaptchaOpen(true); // Open captcha modal
  }, [user, gameState]);

  // --- AUTO-JOIN FLOW: Trigger captcha immediately if user wants to join ---
  useEffect(() => {
    console.log('[GameRoom] Auto-join check:', { 
      hasGameState: !!gameState, 
      hasUser: !!user, 
      autoJoinIntent, 
      joinPhase 
    });
    
    if (!gameState || !user || !autoJoinIntent || joinPhase !== 'idle') return;
    
    // Check if user is already seated
    const isSeated = gameState.players.some(p => p.id === user.id);
    if (isSeated) {
      console.log('[GameRoom] User already seated, skipping auto-join');
      setAutoJoinIntent(false);
      return;
    }
    
    console.log('[GameRoom] ✅ Auto-triggering join flow (from Join Table button)');
    // Clear the URL parameter
    window.history.replaceState({}, '', `/game/${tableId}`);
    setAutoJoinIntent(false);
    
    // Trigger join flow after short delay
    const timer = setTimeout(() => {
      console.log('[GameRoom] Calling handleJoinRequest...');
      handleJoinRequest();
    }, 500);
    return () => clearTimeout(timer);
  }, [gameState, user, autoJoinIntent, joinPhase, tableId, handleJoinRequest]);

  /**
   * PHASE 2: VERIFICATION COMPLETE
   * Triggered after Captcha is solved.
   */
  const handleCaptchaVerified = () => {
      console.log("[Join] Captcha verified. Moving to Buy-In.");
      setIsCaptchaOpen(false); // Close CAPTCHA modal
      onVerify(); // Update global user state
      setIsBuyInOpen(true); // Open buy-in modal
      setJoinPhase('buying-in'); // Move to Phase 3
      console.log("[Join] Buy-in modal opened, phase set to 'buying-in'");
  };

  /**
   * PHASE 3: BUY-IN CONFIRMATION
   * Triggered when user confirms amount in BuyInModal.
   */
  const handleBuyInConfirmed = (amount: number) => {
      if (!user || !tableId || !socket) return;

      console.log(`[Join] Sending sitDown request. Amount: ${amount}, Seat: ${selectedSeatIndex}`);
      setIsBuyInOpen(false); // Close buy-in modal
      setJoinPhase('joining'); // Show loading state

      // Emit Sit Down Event
      socket.emit('sitDown', { 
          tableId, 
          user: { ...user }, 
          amount,
          seatIndex: selectedSeatIndex
      });

      // We rely on 'gameStateUpdate' or 'error' event to change phase from 'joining'
      console.log("[Join] sitDown event emitted, waiting for server response");
  };

  /**
   * CANCEL FLOW
   */
  const cancelJoin = () => {
      console.log("[Join] Cancelled by user.");
      setIsCaptchaOpen(false);
      setIsBuyInOpen(false);
      setJoinPhase('idle');
      setSelectedSeatIndex(undefined);
  };

  // --- GAMEPLAY ACTIONS ---

  const handleAction = (action: 'fold' | 'check' | 'call' | 'raise', amount?: number) => {
      if (!gameState || !user || !socket) return;
      initAudio(); // Initialize audio on first user action
      socket.emit('playerAction', { tableId, action, amount: amount || 0 });
      if (!isMuted) playGameSound('chip');
  };

  const handleLeaveTable = () => {
      if (!user || !socket || !tableId) return;
      
      const hero = gameState?.players.find(p => p.id === user.id);
      if (hero && hero.balance > 0) {
          const confirmMsg = `Are you sure you want to leave?\n\nYour ${hero.balance.toLocaleString()} chips will be returned to your balance.`;
          if (!confirm(confirmMsg)) return;
      }
      
      socket.emit('leaveTable', { tableId, userId: user.id });
      navigate('/lobby');
  };

  const handleSendChat = (text: string) => {
      if (socket && user && tableId) {
          socket.emit('sendChatMessage', { tableId, message: text, user });
      }
  };

  // --- RENDER HELPERS ---
  
  const hero = gameState?.players.find(p => p.id === user?.id);
  const isSpectator = !hero;

  if (!gameState) {
      return (
          <div className="flex flex-col items-center justify-center h-screen bg-[#0B0B0F] text-white gap-4">
              <div className="w-12 h-12 border-4 border-sol-green border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sol-green font-mono animate-pulse">Connecting to Live Server...</p>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 bg-[#0B0B0F] overflow-hidden flex flex-col z-40">
        
        {/* TOP BAR */}
        <div className="flex justify-between items-center px-4 py-2 bg-[#13131F] border-b border-white/10 z-50 h-14 shadow-md">
            <div className="flex items-center gap-4">
                <button onClick={handleLeaveTable} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors" title="Leave Table">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex flex-col">
                    <h1 className="text-white font-bold text-sm leading-tight flex items-center gap-2">
                        {gameData?.name || 'Table'}
                        <span className="text-[10px] text-gray-500 font-normal">ID: {gameState.tableId}</span>
                    </h1>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-400 font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                            {gameState.gameMode === 'cash' ? `$${gameState.smallBlind}/$${gameState.bigBlind}` : `Level ${gameState.tournamentDetails?.level}`}
                        </span>
                        {status === 'connected' ? (
                            <span className="flex items-center gap-1 text-[10px] text-green-500 font-bold"><Wifi size={8}/> Live</span>
                        ) : status === 'connecting' ? (
                            <span className="flex items-center gap-1 text-[10px] text-yellow-500 font-bold"><Loader2 size={8} className="animate-spin"/> Connecting</span>
                        ) : (
                            <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold"><WifiOff size={8}/> Disconnected</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1 md:gap-2">
                <button onClick={() => setIsFairnessOpen(true)} className="p-2 text-sol-green hover:bg-sol-green/10 rounded-full" title="Provably Fair Check">
                    <ShieldCheck size={18} />
                </button>
                <div className="h-6 w-px bg-white/10 mx-1 hidden md:block"></div>
                <button onClick={() => { initAudio(); setIsMuted(!isMuted); setAudioEnabled(isMuted); }} className="p-2 text-gray-400 hover:text-white hidden md:block">
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-400 hover:text-white md:hidden">
                    <Menu size={20} />
                </button>
            </div>
        </div>

        {/* SETTINGS DROPDOWN (Mobile) */}
        {isMenuOpen && (
            <div className="absolute top-14 right-4 z-50 bg-[#1A1A24] border border-white/10 rounded-xl shadow-2xl p-2 flex flex-col gap-1 w-48 animate-in slide-in-from-top-2">
                <button onClick={() => { setFourColor(!fourColor); setIsMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg">
                    <Settings size={16} /> 4-Color Deck ({fourColor ? 'On' : 'Off'})
                </button>
                <button onClick={() => { setShowBB(!showBB); setIsMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg">
                    <Settings size={16} /> Show in BB ({showBB ? 'On' : 'Off'})
                </button>
                <button onClick={() => { initAudio(); setIsMuted(!isMuted); setAudioEnabled(isMuted); setIsMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg">
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />} Sound
                </button>
            </div>
        )}

        {/* TABLE AREA */}
        <div className="flex-1 relative bg-gradient-to-b from-[#0a1a15] via-[#0d1f1a] to-[#081210] overflow-hidden flex items-center justify-center p-2 sm:p-4">
            <Table 
                gameState={gameState} 
                heroId={user?.id || 'spectator'} 
                timeLeft={timeLeft} 
                totalTime={30}
                onSit={handleJoinRequest}
                fourColor={fourColor}
                showBB={showBB}
            />
            {isSpectator && (
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-black/80 backdrop-blur px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-sol-blue/40 flex items-center gap-2 z-30">
                    <Eye size={14} className="text-sol-blue sm:w-4 sm:h-4" />
                    <span className="text-[10px] sm:text-xs font-bold text-sol-blue uppercase tracking-wider">Spectating</span>
                </div>
            )}
        </div>

        {/* CHAT */}
        <ChatBox 
            isOpen={isChatOpen} 
            onToggle={() => setIsChatOpen(!isChatOpen)}
            messages={chatMessages}
            onSendMessage={handleSendChat}
        />

        {/* BOTTOM ACTION BAR */}
        <div className="bg-[#13131F] border-t border-white/10 safe-area-bottom shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-30">
              {!isSpectator && hero?.isTurn ? (
                  // PLAYER TURN CONTROLS
                  <GameControls 
                    onAction={handleAction} 
                    currentBet={hero.bet} 
                    bigBlind={gameState.bigBlind} 
                    userBalance={hero.balance}
                    toCall={Math.max(0, (gameState.minBet || 0) - hero.bet)}
                    pot={gameState.pot}
                    showRebuy={gameState.gameMode === 'cash'}
                    onRebuy={() => handleJoinRequest()} // Re-trigger join flow for rebuy logic if needed
                    showBB={showBB}
                    gameType={gameState.gameMode}
                  />
              ) : !isSpectator && hero ? (
                  // PLAYER WAITING STATE
                  <div className="w-full bg-[#13131F]/95 backdrop-blur-md flex items-center justify-between px-2 xs:px-3 sm:px-4 md:px-6 py-2 xs:py-3 sm:py-3 md:py-4 min-h-[60px] xs:min-h-[70px] sm:min-h-[80px]">
                      <div className="flex items-center gap-2 xs:gap-2.5 sm:gap-3">
                          <div className="relative">
                              <img src={hero.avatarUrl} className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-full border border-sol-green"/>
                              <div className="absolute -bottom-0.5 -right-0.5 xs:-bottom-1 xs:-right-1 w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 bg-sol-green rounded-full border border-black animate-pulse"></div>
                          </div>
                          <div>
                              <div className="text-white font-bold text-xs xs:text-sm">{hero.name} <span className="text-[9px] xs:text-[10px] sm:text-xs text-gray-400">(You)</span></div>
                              <div className="text-sol-green text-[10px] xs:text-xs font-mono">${hero.balance.toLocaleString()}</div>
                          </div>
                      </div>
                      <div className="text-gray-500 text-[10px] xs:text-xs sm:text-sm font-bold uppercase tracking-wider animate-pulse flex items-center gap-1.5 xs:gap-2">
                          <Loader2 size={12} className="animate-spin xs:w-[14px] xs:h-[14px] sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Waiting...</span>
                      </div>
                  </div>
              ) : (
                  // SPECTATOR / JOIN STATE
                  <div className="w-full bg-[#13131F]/95 backdrop-blur-md flex items-center justify-center p-2 xs:p-3 sm:p-4 min-h-[60px] xs:min-h-[70px] sm:min-h-[80px]">
                      {joinPhase === 'joining' ? (
                          <Button disabled className="gap-1.5 xs:gap-2 px-4 xs:px-6 sm:px-8 opacity-80 cursor-not-allowed text-xs xs:text-sm sm:text-base">
                              <Loader2 size={14} className="animate-spin xs:w-4 xs:h-4 sm:w-[18px] sm:h-[18px]" /> Seating...
                          </Button>
                      ) : (
                          <Button onClick={() => handleJoinRequest()} className="gap-1.5 xs:gap-2 shadow-lg shadow-sol-green/20 px-4 xs:px-6 sm:px-8 text-xs xs:text-sm sm:text-base font-bold">
                              <UserPlus size={14} className="xs:w-4 xs:h-4 sm:w-5 sm:h-5" /> Join Game
                          </Button>
                      )}
                  </div>
              )}
        </div>

        {/* --- MODALS (Controlled by joinPhase state) --- */}

        {/* 1. Captcha */}
        <CaptchaModal 
            isOpen={isCaptchaOpen && joinPhase === 'verifying'} 
            onVerify={handleCaptchaVerified} 
            onClose={cancelJoin}
            canClose={true}
            isVerified={false}
        />

        {/* 2. Buy In */}
        {user && (
            <BuyInModal 
                isOpen={joinPhase === 'buying-in'} 
                onClose={cancelJoin}
                onConfirm={handleBuyInConfirmed}
                min={gameState.gameMode === 'cash' ? (tableData?.buyInMin || gameState.bigBlind * 50) : (tournamentData?.buyIn || 100)}
                max={gameState.gameMode === 'cash' ? (tableData?.buyInMax || gameState.bigBlind * 100) : (tournamentData?.buyIn || 100)}
                balance={user.balance}
                bigBlind={gameState.bigBlind}
                isDepositing={false}
            />
        )}

        {/* Info Modals */}
        <FairnessModal 
            isOpen={isFairnessOpen} 
            onClose={() => setIsFairnessOpen(false)} 
            gameState={gameState}
            onUpdateClientSeed={(s) => setClientSeed(s)}
        />

        <TournamentInfoModal 
            isOpen={isTournamentInfoOpen} 
            onClose={() => setIsTournamentInfoOpen(false)} 
            tournamentDetails={gameState.tournamentDetails}
            startTime={tournamentData?.startTime}
        />

    </div>
  );
};
