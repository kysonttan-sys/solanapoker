
import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { AlertTriangle, Shield, Wifi, ExternalLink } from 'lucide-react';

export const TestnetDisclaimer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeen = sessionStorage.getItem('solpoker_testnet_seen');
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    sessionStorage.setItem('solpoker_testnet_seen', 'true');
    setIsOpen(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Devnet Environment" hideClose>
      <div className="space-y-6">
        <div className="bg-sol-blue/10 border border-sol-blue/20 p-4 rounded-xl flex items-start gap-4">
           <AlertTriangle className="text-sol-blue shrink-0" size={24} />
           <div>
             <h3 className="font-bold text-white text-lg">You are on Devnet</h3>
             <p className="text-gray-400 text-sm mt-1">
               This is a testing environment. You need <span className="text-white font-bold">Devnet SOL</span> to pay for gas fees.
             </p>
           </div>
        </div>

        <div className="space-y-3">
            <p className="text-sm text-gray-300 font-bold">Need SOL? Try these faucets (Official is often busy):</p>
            <div className="grid grid-cols-1 gap-2">
                <a href="https://faucet.quicknode.com/solana/devnet" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors group">
                    <span className="text-sm font-bold text-white">QuickNode Faucet (Reliable)</span>
                    <ExternalLink size={16} className="text-gray-500 group-hover:text-white" />
                </a>
                <a href="https://solfaucet.com/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors group">
                    <span className="text-sm font-bold text-white">SolFaucet.com</span>
                    <ExternalLink size={16} className="text-gray-500 group-hover:text-white" />
                </a>
                <a href="https://faucet.solana.com/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors group">
                    <span className="text-sm font-bold text-white">Official Solana Faucet</span>
                    <ExternalLink size={16} className="text-gray-500 group-hover:text-white" />
                </a>
            </div>
        </div>

        <div className="space-y-4 text-sm text-gray-300 border-t border-white/10 pt-4">
           <div className="flex gap-3">
              <Wifi className="text-sol-green shrink-0" size={20} />
              <p>
                <strong className="text-white block mb-0.5">Wallet Connection</strong> 
                Please ensure your Phantom/Solflare wallet is set to <span className="text-sol-green font-bold">Devnet</span> in Developer Settings.
              </p>
           </div>
        </div>

        <Button fullWidth onClick={handleClose} className="bg-sol-blue text-white hover:bg-sol-blue/90 font-bold">
          I Have Devnet SOL - Enter App
        </Button>
      </div>
    </Modal>
  );
};
