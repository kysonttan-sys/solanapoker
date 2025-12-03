
import React, { useMemo } from 'react';
import { Modal } from './ui/Modal';
import { ShieldCheck, Zap, Wallet } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletName } from '@solana/wallet-adapter-base';

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectWalletModal: React.FC<ConnectWalletModalProps> = ({ isOpen, onClose }) => {
  const { select, wallets, connect } = useWallet();

  const handleConnect = (walletName: WalletName) => {
    select(walletName);
    setTimeout(() => {
        connect().catch(() => {});
    }, 50);
    onClose();
  };

  const installedWallets = useMemo(() => {
    return wallets.filter(w => w.readyState === 'Installed');
  }, [wallets]);

  const otherWallets = useMemo(() => {
    return wallets.filter(w => w.readyState !== 'Installed');
  }, [wallets]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connect Wallet" size="sm">
      <div className="space-y-6 pt-2">
        
        {/* Info Banner */}
        <div className="bg-sol-blue/10 border border-sol-blue/20 rounded-lg p-3 flex gap-3 items-start">
            <Zap size={16} className="text-sol-blue shrink-0 mt-0.5" />
            <p className="text-xs text-gray-300">
                Connect a Solana wallet to play. 
                <span className="block mt-1 text-gray-500 text-[10px]">Recommended: Phantom or Solflare</span>
            </p>
        </div>

        {/* Wallets List */}
        <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
            {installedWallets.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Detected</p>
                    {installedWallets.map((wallet) => (
                        <button
                            key={wallet.adapter.name}
                            onClick={() => handleConnect(wallet.adapter.name)}
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-[#1A1A24] border border-white/5 hover:border-sol-green/50 hover:bg-[#222230] transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-black p-1 shadow-inner">
                                    <img src={wallet.adapter.icon} alt={wallet.adapter.name} className="w-full h-full object-contain" />
                                </div>
                                <span className="font-bold text-white group-hover:text-sol-green transition-colors">{wallet.adapter.name}</span>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-sol-green animate-pulse"></span>
                        </button>
                    ))}
                </div>
            )}

            {otherWallets.length > 0 && (
                <div className="space-y-2 mt-4">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">More Options</p>
                    {otherWallets.map((wallet) => (
                        <button
                            key={wallet.adapter.name}
                            onClick={() => handleConnect(wallet.adapter.name)}
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-black p-1 shadow-inner opacity-70 group-hover:opacity-100 transition-opacity">
                                    <img src={wallet.adapter.icon} alt={wallet.adapter.name} className="w-full h-full object-contain" />
                                </div>
                                <span className="font-medium text-gray-300 group-hover:text-white transition-colors">{wallet.adapter.name}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* Footer Info */}
        <div className="bg-white/5 rounded-lg p-3 flex gap-3 items-start border border-white/5">
            <ShieldCheck size={16} className="text-gray-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-gray-500 leading-relaxed">
                By connecting, you accept our Terms. SOLPOKER X is non-custodial. 
                <span className="text-gray-400 font-bold ml-1">Your keys, your crypto.</span>
            </p>
        </div>

      </div>
    </Modal>
  );
};
