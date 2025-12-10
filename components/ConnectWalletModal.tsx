import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { ShieldCheck, Zap, Wallet, CreditCard, Mail, Loader2 } from 'lucide-react';
import { useWallet } from './WalletContextProvider';

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectWalletModal: React.FC<ConnectWalletModalProps> = ({ isOpen, onClose }) => {
  const { openModal, connected, connectWithGoogle, connecting } = useWallet();
  const [socialLoading, setSocialLoading] = useState(false);

  const handleConnect = () => {
    // Open Reown AppKit modal with all wallet options
    openModal();
    onClose();
  };

  const handleSocialLogin = async () => {
    setSocialLoading(true);
    try {
      await connectWithGoogle();
      // Close modal on success - the useEffect below will handle this
    } catch (error) {
      console.error('Social login error:', error);
    } finally {
      setSocialLoading(false);
    }
  };

  // If already connected, close the modal
  React.useEffect(() => {
    if (connected && isOpen) {
      onClose();
    }
  }, [connected, isOpen, onClose]);

  const isLoading = connecting || socialLoading;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connect to SOLPOKER X" size="sm">
      <div className="space-y-6 pt-2">

        {/* Info Banner */}
        <div className="bg-sol-blue/10 border border-sol-blue/20 rounded-lg p-4 flex gap-3 items-start">
          <Zap size={18} className="text-sol-blue shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-200 font-medium">Connect Your Solana Wallet</p>
            <p className="text-xs text-gray-400 mt-1">
              Choose from 100+ Solana wallets, use social login, or buy crypto directly.
            </p>
          </div>
        </div>

        {/* Connection Options */}
        <div className="space-y-3">

          {/* Solana Wallets - Primary Option */}
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="w-full text-left bg-gradient-to-r from-green-900/30 to-teal-900/30 border border-sol-green/30 rounded-xl p-4 hover:border-sol-green/60 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-sol-green/20 flex items-center justify-center">
                <Wallet size={20} className="text-sol-green" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold">Solana Wallets</p>
                <p className="text-xs text-gray-400">Connect with Phantom, Solflare, Backpack, etc.</p>
              </div>
              <span className="px-2 py-1 bg-sol-green/20 text-sol-green text-[10px] font-bold rounded-full">RECOMMENDED</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-sol-green/20 border border-sol-green/30 rounded text-[10px] text-sol-green font-medium">Phantom</span>
              <span className="px-2 py-1 bg-sol-green/20 border border-sol-green/30 rounded text-[10px] text-sol-green font-medium">Solflare</span>
              <span className="px-2 py-1 bg-white/10 rounded text-[10px] text-gray-300">Backpack</span>
              <span className="px-2 py-1 bg-white/10 rounded text-[10px] text-gray-300">Trust</span>
              <span className="px-2 py-1 bg-white/10 rounded text-[10px] text-gray-300">+ 100 more</span>
            </div>
          </button>

          {/* Social Login - NEW */}
          <button
            onClick={handleSocialLogin}
            disabled={isLoading}
            className="w-full text-left bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-xl p-4 hover:border-purple-500/60 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                {socialLoading ? (
                  <Loader2 size={20} className="text-purple-400 animate-spin" />
                ) : (
                  <Mail size={20} className="text-purple-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold">Email & Social Login</p>
                <p className="text-xs text-gray-400">Sign in with Google, Apple, X, Discord & more</p>
              </div>
              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-[10px] font-bold rounded-full">NEW</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-2 py-1 bg-white/10 rounded text-[10px] text-gray-300 flex items-center gap-1">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </span>
              <span className="px-2 py-1 bg-white/10 rounded text-[10px] text-gray-300">Apple</span>
              <span className="px-2 py-1 bg-white/10 rounded text-[10px] text-gray-300">X (Twitter)</span>
              <span className="px-2 py-1 bg-white/10 rounded text-[10px] text-gray-300">Discord</span>
              <span className="px-2 py-1 bg-white/10 rounded text-[10px] text-gray-300">Email</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">
              ✨ Auto-generates a Solana wallet secured by Web3Auth MPC
            </p>
          </button>

          {/* Buy Crypto */}
          <div className="bg-gradient-to-r from-orange-900/30 to-yellow-900/30 border border-orange-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <CreditCard size={20} className="text-orange-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Buy Crypto with Card</p>
                <p className="text-xs text-gray-400">No wallet? Purchase SOL with credit/debit card via Meld.io</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-2 py-1 bg-white/10 rounded text-[10px] text-gray-300">Visa</span>
              <span className="px-2 py-1 bg-white/10 rounded text-[10px] text-gray-300">Mastercard</span>
              <span className="px-2 py-1 bg-white/10 rounded text-[10px] text-gray-300">Apple Pay</span>
              <span className="px-2 py-1 bg-white/10 rounded text-[10px] text-gray-300">Google Pay</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">
              Available after connecting a wallet
            </p>
          </div>

        </div>

        {/* Footer Info */}
        <div className="bg-white/5 rounded-lg p-3 flex gap-3 items-start border border-white/5">
          <ShieldCheck size={16} className="text-gray-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-500 leading-relaxed">
            By connecting, you accept our Terms. SOLPOKER X is non-custodial.
            <span className="text-gray-400 font-bold ml-1">Your keys, your crypto.</span>
            <span className="block mt-1 text-gray-600">Powered by Reown AppKit & Web3Auth</span>
          </p>
        </div>

      </div>
    </Modal>
  );
};
