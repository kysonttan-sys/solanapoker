import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User as UserIcon, LogOut, Trophy, PlusCircle, Grid, Layers, RefreshCw, Lock, Wallet } from 'lucide-react';
import { Button } from './ui/Button';
import { User } from '../types';
import { getVipStatus, ADMIN_WALLET_ADDRESS } from '../constants';
import { useWallet } from '@solana/wallet-adapter-react';

interface NavbarProps {
  user: User | null;
  onOpenWalletModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onOpenWalletModal }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { connected, disconnect, publicKey } = useWallet();

  const navLinks = [
    { name: 'Home', path: '/', icon: <PlusCircle size={18} /> },
    { name: 'Lobby', path: '/lobby', icon: <Grid size={18} /> },
    { name: 'Staking', path: '/staking', icon: <Layers size={18} /> },
    { name: 'Swap', path: '/swap', icon: <RefreshCw size={18} /> },
    { name: 'Leaderboard', path: '/leaderboard', icon: <Trophy size={18} /> },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Calculate VIP for display
  const vip = user ? getVipStatus(user.totalHands || 0) : null;
  const isAdmin = user?.walletAddress === ADMIN_WALLET_ADDRESS;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-sol-black/80 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center cursor-pointer group">
             <Link to="/" className="flex items-center gap-1.5">
                {/* Text Part */}
                <span className="font-bold text-2xl md:text-3xl tracking-tight text-[#00FFAE]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  SOLPOKER
                </span>
                
                {/* Graphic Part (X with Spade) */}
                <div className="relative w-9 h-9 md:w-11 md:h-11 flex items-center justify-center">
                    {/* The X Gradient SVG */}
                    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_10px_rgba(0,255,174,0.3)]">
                        <defs>
                            <linearGradient id="logo_x_gradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#00FFAE" />
                                <stop offset="100%" stopColor="#1D8BFF" />
                            </linearGradient>
                        </defs>
                        <path d="M25 25 L75 75" stroke="url(#logo_x_gradient)" strokeWidth="18" strokeLinecap="round" />
                        <path d="M75 25 L25 75" stroke="url(#logo_x_gradient)" strokeWidth="18" strokeLinecap="round" />
                    </svg>
                    
                    {/* The Spade Icon */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="#0B0B0F" xmlns="http://www.w3.org/2000/svg" className="translate-y-[0.5px]">
                          <path d="M12 2C9 8 5 11 5 15C5 18 7 20 9 20C10.5 20 11.5 19 12 18C12.5 19 13.5 20 15 20C17 20 19 18 19 15C19 11 15 8 12 2Z" />
                          <path d="M12 18V22" stroke="#0B0B0F" strokeWidth="4" strokeLinecap="round"/>
                       </svg>
                    </div>
                </div>
             </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  isActive(link.path) 
                    ? 'text-sol-green' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {link.icon}
                {link.name}
              </Link>
            ))}
            {isAdmin && (
                <Link
                    to="/admin"
                    className={`flex items-center gap-2 text-sm font-bold uppercase transition-colors px-3 py-1 rounded border ${
                    isActive('/admin') 
                        ? 'text-red-500 border-red-500 bg-red-500/10' 
                        : 'text-gray-400 border-gray-600 hover:text-white hover:border-white'
                    }`}
                >
                    <Lock size={14} /> Admin
                </Link>
            )}
          </div>

          {/* User Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            {connected && user && vip ? (
              <div className="flex items-center gap-3">
                 <Link to="/profile">
                  <div className="flex items-center gap-3 bg-sol-dark/50 border border-white/5 rounded-full pl-2 pr-4 py-1.5 hover:border-sol-green/30 transition-all cursor-pointer group">
                    <img 
                      src={user.avatarUrl} 
                      alt={user.username} 
                      className="w-8 h-8 rounded-full border border-sol-green"
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                         <span className="text-sm font-semibold text-white group-hover:text-sol-green transition-colors">{user.username}</span>
                         <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-300" title={`Rank: ${vip.name}`}>{vip.icon}</span>
                      </div>
                      <span className="text-xs text-sol-green font-mono">${user.balance.toLocaleString()}</span>
                    </div>
                  </div>
                 </Link>
                 <button 
                    onClick={() => disconnect()}
                    className="p-2.5 rounded-full bg-white/5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 border border-white/5 transition-all"
                    title="Disconnect Wallet"
                 >
                     <LogOut size={18} />
                 </button>
              </div>
            ) : (
                <Button 
                    onClick={onOpenWalletModal} 
                    className="gap-2 shadow-[0_0_15px_rgba(0,255,174,0.3)]"
                >
                    <Wallet size={18} /> Connect Wallet
                </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-400 hover:text-white p-2"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-sol-dark border-t border-white/10">
          <div className="px-4 pt-2 pb-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium ${
                   isActive(link.path)
                    ? 'bg-sol-green/10 text-sol-green'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {link.icon}
                {link.name}
              </Link>
            ))}
            {isAdmin && (
                <Link
                    to="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-bold uppercase text-red-500 hover:bg-red-500/10"
                >
                    <Lock size={18} /> Admin Panel
                </Link>
            )}
            <div className="border-t border-white/10 my-2 pt-2 space-y-3">
              {connected && user ? (
                <>
                    <Link 
                        to="/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-3 text-base font-medium text-gray-400 hover:text-white"
                    >
                        <UserIcon size={18} /> Profile ({user.username})
                    </Link>
                    <button 
                        onClick={() => { disconnect(); setIsMobileMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-3 text-base font-medium text-red-500 hover:bg-red-500/10 rounded-md"
                    >
                        <LogOut size={18} /> Disconnect
                    </button>
                </>
              ) : (
                <div className="p-2">
                    <Button fullWidth onClick={() => { onOpenWalletModal(); setIsMobileMenuOpen(false); }}>
                        Connect Wallet
                    </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};