
import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { ArrowRightLeft, Globe, CreditCard, AlertTriangle, Wallet } from 'lucide-react';
import { User } from '../types';

interface SwapProps {
    user?: User | null;
}

// NOTE: This is a public staging key for demo purposes. 
// For production, you must register at https://dashboard.transak.com to get a Production Key.
const TRANSAK_API_KEY = '4fcd6904-706b-4e3c-905d-8389ce1d2222'; 

export const Swap: React.FC<SwapProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'swap' | 'bridge' | 'buy'>('swap');

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12 pt-4">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-white">DeFi Hub</h1>
        <p className="text-gray-400">Swap, Bridge, and On-Ramp assets directly to your wallet.</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center flex-wrap">
        <div className="bg-white/5 p-1 rounded-xl flex gap-2">
            <button
                onClick={() => setActiveTab('swap')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'swap' 
                    ? 'bg-sol-green text-black shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
                <ArrowRightLeft size={18} /> Jupiter Swap
            </button>
            <button
                onClick={() => setActiveTab('bridge')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'bridge' 
                    ? 'bg-sol-blue text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
                <Globe size={18} /> Cross-Chain Bridge
            </button>
            <button
                onClick={() => setActiveTab('buy')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'buy' 
                    ? 'bg-white text-black shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
                <CreditCard size={18} /> Buy Crypto
            </button>
        </div>
      </div>

      <div className="flex justify-center">
        
        {/* JUPITER SWAP */}
        {activeTab === 'swap' && (
            <div className="w-full max-w-[500px] animate-in fade-in slide-in-from-bottom-4">
                <Card className="p-0 overflow-hidden bg-transparent border-none shadow-2xl relative">
                    {/* Jupiter Terminal Embed */}
                    <div className="relative w-full h-[600px] bg-[#304256] rounded-2xl overflow-hidden border border-white/10">
                        <iframe 
                            src="https://terminal.jup.ag/" 
                            className="w-full h-full"
                            title="Jupiter Terminal"
                            style={{ border: 0 }}
                            allow="clipboard-read; clipboard-write; usb; web-share"
                            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                        />
                    </div>
                    <div className="mt-4 text-center">
                        <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                            Powered by <span className="font-bold text-sol-green">Jupiter Aggregator</span>. The best prices on Solana.
                        </p>
                    </div>
                </Card>
            </div>
        )}

        {/* BRIDGE AGGREGATOR (Real deBridge Widget) */}
        {activeTab === 'bridge' && (
            <div className="w-full max-w-[500px] animate-in fade-in slide-in-from-bottom-4">
                <Card className="p-0 bg-sol-dark border-white/10 relative overflow-hidden">
                    <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                         <h3 className="font-bold text-white flex items-center gap-2">
                             <Globe size={20} className="text-sol-blue"/> Cross-Chain Bridge
                         </h3>
                         <span className="text-[10px] bg-sol-blue/10 text-sol-blue px-2 py-1 rounded border border-sol-blue/20 font-bold">
                             Powered by deBridge
                         </span>
                     </div>

                    <div className="relative w-full h-[680px] bg-[#12131a]">
                        <iframe 
                            src={`https://app.debridge.finance/widget?v=1&primaryColor=00FFAE&justifyContent=center&borderRadius=12&fontFamily=Inter&inputChain=1&outputChain=7565164&inputCurrency=&outputCurrency=USDC&address=${user?.walletAddress || ''}`}
                            className="w-full h-full"
                            title="deBridge Widget"
                            style={{ border: 0 }}
                            allow="clipboard-read; clipboard-write; usb; web-share"
                        />
                    </div>
                    
                    <div className="p-4 bg-white/5 border-t border-white/10 text-center">
                        <p className="text-xs text-gray-500">
                            Move assets between Ethereum, BNB, Polygon, Arbitrum, and Solana instantly.
                        </p>
                    </div>
                </Card>
            </div>
        )}

        {/* TRANSAK BUY (Real On-Ramp) */}
        {activeTab === 'buy' && (
            <div className="w-full max-w-[500px] animate-in fade-in slide-in-from-bottom-4">
                <Card className="p-0 overflow-hidden bg-sol-dark border-white/10 relative">
                     <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                         <h3 className="font-bold text-white flex items-center gap-2">
                             <CreditCard size={20} className="text-sol-green"/> Buy via Transak
                         </h3>
                         <span className="text-[10px] bg-sol-green/10 text-sol-green px-2 py-1 rounded border border-sol-green/20 font-bold">
                             Secure Gateway
                         </span>
                     </div>
                     
                     <div className="relative w-full h-[650px] bg-white">
                        {user ? (
                            <iframe 
                                src={`https://global-stg.transak.com/?apiKey=${TRANSAK_API_KEY}&cryptoCurrencyCode=USDT&network=solana&themeColor=00FFAE&walletAddress=${user.walletAddress}`}
                                className="w-full h-full"
                                title="Transak On-Ramp"
                                style={{ border: 0 }}
                                allow="camera;microphone;payment"
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#13131F] text-center p-8">
                                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
                                    <Wallet size={32} className="text-gray-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Connect Wallet</h3>
                                <p className="text-gray-400 mb-6">Please connect your Solana wallet to purchase USDT directly to your address.</p>
                            </div>
                        )}
                     </div>
                     <div className="p-4 bg-white/5 border-t border-white/10 text-center">
                        <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                            <AlertTriangle size={12} className="text-yellow-500" />
                            Testnet Mode: No real funds will be charged.
                        </p>
                     </div>
                </Card>
            </div>
        )}
      </div>
    </div>
  );
};
