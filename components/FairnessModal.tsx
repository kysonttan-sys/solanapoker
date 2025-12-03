
import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { ShieldCheck, Lock, Unlock, RefreshCw, CheckCircle, ExternalLink, Hash, Copy, ChevronRight } from 'lucide-react';
import { GameState } from '../../utils/pokerGameLogic';

interface FairnessModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState | null;
  onUpdateClientSeed: (seed: string) => void;
}

export const FairnessModal: React.FC<FairnessModalProps> = ({ isOpen, onClose, gameState, onUpdateClientSeed }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'verify' | 'learn'>('active');
  const [localClientSeed, setLocalClientSeed] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
      if (gameState) {
          setLocalClientSeed(gameState.fairness.clientSeed);
      }
  }, [gameState?.fairness.clientSeed, isOpen]);

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
  };

  const handleClientSeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalClientSeed(e.target.value);
  };

  const handleSaveSeed = () => {
      onUpdateClientSeed(localClientSeed);
      alert("Client seed updated! It will take effect on the NEXT hand.");
  };

  if (!gameState) return null;

  const { fairness } = gameState;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Provably Fair Verification" size="lg">
      <div className="space-y-6">
        
        {/* Navigation */}
        <div className="flex bg-white/5 p-1 rounded-lg">
             <button
                onClick={() => setActiveTab('active')}
                className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${activeTab === 'active' ? 'bg-sol-green text-black' : 'text-gray-400 hover:text-white'}`}
             >
                Active Hand
             </button>
             <button
                onClick={() => setActiveTab('verify')}
                className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${activeTab === 'verify' ? 'bg-sol-blue text-white' : 'text-gray-400 hover:text-white'}`}
             >
                Verify Previous
             </button>
             <button
                onClick={() => setActiveTab('learn')}
                className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${activeTab === 'learn' ? 'bg-sol-purple text-white' : 'text-gray-400 hover:text-white'}`}
             >
                How it Works
             </button>
        </div>

        {activeTab === 'active' && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
                <div className="bg-sol-green/10 border border-sol-green/30 p-4 rounded-xl flex items-start gap-3">
                    <ShieldCheck size={24} className="text-sol-green mt-1 shrink-0"/>
                    <div>
                        <h3 className="text-sol-green font-bold text-sm uppercase tracking-wider mb-1">Encrypted Session</h3>
                        <p className="text-sm text-gray-300 leading-relaxed">
                            The deck for this hand has been pre-shuffled. We provide the <span className="text-white font-bold">Hash</span> below as proof. 
                            We cannot change the cards without changing this Hash.
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-black/40 p-4 rounded-xl border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs text-gray-500 font-bold uppercase flex items-center gap-2">
                                <Lock size={12} /> Server Seed (Hashed)
                            </label>
                            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-400">Public Commitment</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/5">
                            <code className="text-xs text-sol-green break-all font-mono">{fairness.currentServerHash}</code>
                            <button onClick={() => copyToClipboard(fairness.currentServerHash)} className="p-1 hover:text-white text-gray-500">
                                {isCopied ? <CheckCircle size={14} className="text-green-500"/> : <Copy size={14}/>}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-black/40 p-4 rounded-xl border border-white/10">
                            <label className="text-xs text-gray-500 font-bold uppercase mb-2 block flex items-center gap-2">
                                <Hash size={12} /> Client Seed (You)
                            </label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={localClientSeed}
                                    onChange={handleClientSeedChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-sol-green focus:outline-none"
                                />
                                <button onClick={handleSaveSeed} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-sol-green font-bold text-xs">Save</button>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2">
                                Changing this completely alters the shuffle order for the NEXT hand.
                            </p>
                        </div>
                        <div className="bg-black/40 p-4 rounded-xl border border-white/10">
                            <label className="text-xs text-gray-500 font-bold uppercase mb-2 block flex items-center gap-2">
                                <RefreshCw size={12} /> Nonce (Hand #)
                            </label>
                            <div className="text-2xl font-mono font-bold text-white">{fairness.nonce}</div>
                            <p className="text-[10px] text-gray-500 mt-1">
                                Increments every hand to ensure uniqueness.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'verify' && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
                {fairness.previousServerSeed ? (
                    <>
                        <div className="text-center space-y-2">
                            <div className="inline-flex p-3 rounded-full bg-sol-blue/20 text-sol-blue mb-2">
                                <Unlock size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white">Hand #{fairness.previousNonce} Revealed</h3>
                            <p className="text-sm text-gray-400">
                                Verify that <span className="font-mono text-sol-blue">SHA256(Seed)</span> matches the hash we showed you before the hand started.
                            </p>
                        </div>

                        <div className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-4">
                            <div>
                                <span className="text-xs text-gray-500 font-bold uppercase block mb-1">1. Revealed Server Seed</span>
                                <div className="bg-sol-blue/10 border border-sol-blue/30 p-2 rounded text-xs text-white font-mono break-all">
                                    {fairness.previousServerSeed}
                                </div>
                            </div>
                            
                            <div className="flex justify-center">
                                <ChevronRight className="text-gray-600 rotate-90 md:rotate-0" />
                            </div>

                            <div>
                                <span className="text-xs text-gray-500 font-bold uppercase block mb-1">2. Previous Hash (Commitment)</span>
                                <div className="bg-white/5 p-2 rounded text-xs text-gray-300 font-mono break-all flex justify-between items-center">
                                    {fairness.previousServerHash}
                                    <CheckCircle size={16} className="text-green-500 shrink-0"/>
                                </div>
                            </div>

                            <div className="border-t border-white/10 my-2 pt-2">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>Client Seed Used:</span>
                                    <span className="text-white font-mono">{fairness.previousClientSeed}</span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>Nonce Used:</span>
                                    <span className="text-white font-mono">{fairness.previousNonce}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <button className="flex items-center gap-2 text-xs text-sol-blue hover:text-white transition-colors">
                                <ExternalLink size={12} /> Verify Shuffle on 3rd Party Tool
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        <p>No previous hand data available yet.</p>
                        <p className="text-sm">Play a hand to generate verification data.</p>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'learn' && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
                <div className="prose prose-invert prose-sm max-w-none">
                    <h3 className="text-white font-bold">Why is this fair?</h3>
                    <p className="text-gray-400">
                        SOLPOKER X uses a <strong className="text-sol-purple">Provably Fair</strong> system. This means the shuffle is generated using inputs from both the Server AND You (the Player).
                    </p>
                    
                    <div className="bg-white/5 p-4 rounded-xl my-4 border border-white/5">
                        <h4 className="text-white font-bold mb-2">The Formula</h4>
                        <code className="block bg-black/40 p-3 rounded text-sol-green text-xs font-mono">
                            Shuffle = HMAC_SHA256(ServerSeed, ClientSeed + Nonce)
                        </code>
                    </div>

                    <ul className="space-y-2 text-gray-300 list-disc pl-4">
                        <li>We commit to a <strong>Server Seed</strong> (Hashed) before the hand starts. We cannot change it later.</li>
                        <li>You provide a <strong>Client Seed</strong>. Since we don't know your seed ahead of time, we cannot pre-rig the deck to favor us.</li>
                        <li>The combination of these two unpredictable numbers creates the random shuffle.</li>
                    </ul>
                </div>
            </div>
        )}

      </div>
    </Modal>
  );
};
