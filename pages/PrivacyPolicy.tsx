import React from 'react';
import { Card } from '../components/ui/Card';
import { Shield, Eye, Lock, Database, Globe, Server } from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="space-y-4 text-center md:text-left">
        <h1 className="text-4xl font-bold text-white">Privacy Policy</h1>
        <p className="text-gray-400">Last updated: March 20, 2024</p>
      </div>

      <Card className="space-y-8 bg-sol-dark/60">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sol-green">
            <Shield size={24} />
            <h2 className="text-xl font-bold">1. Introduction</h2>
          </div>
          <p className="text-gray-300 leading-relaxed">
            At SOLPOKER X, we prioritize your privacy while providing a transparent, decentralized gaming experience. 
            As a Web3 platform, we collect minimal personal information compared to traditional gaming services. 
            This policy outlines how we handle the data necessary to operate the Platform.
          </p>
        </section>

        <section className="space-y-4">
           <div className="flex items-center gap-2 text-sol-blue">
            <Database size={24} />
            <h2 className="text-xl font-bold">2. Information We Collect</h2>
          </div>
          <p className="text-gray-300 leading-relaxed mb-2">
            Due to the decentralized nature of our application, we do not maintain user accounts with names, emails, or passwords by default. We collect:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-400">
            <li><strong className="text-white">Public Wallet Address:</strong> Collected when you connect your Solana wallet to identify your session and assets.</li>
            <li><strong className="text-white">On-Chain Data:</strong> Transaction history, game outcomes, and token balances related to the game smart contracts.</li>
            <li><strong className="text-white">Technical Usage Data:</strong> IP address, browser type, device information, and interaction logs for security and performance optimization.</li>
            <li><strong className="text-white">Profile Information (Optional):</strong> If you choose to add a username, bio, or email for notifications, this data is stored off-chain.</li>
          </ul>
        </section>

         <section className="space-y-4">
           <div className="flex items-center gap-2 text-sol-purple">
            <Globe size={24} />
            <h2 className="text-xl font-bold">3. Blockchain Transparency</h2>
          </div>
          <p className="text-gray-300 leading-relaxed">
            Please be aware that all transactions on the Solana blockchain are public. Your wallet address and its history on our platform are permanently recorded on the public ledger. SOLPOKER X cannot hide or delete data that has been written to the blockchain.
          </p>
        </section>

        <section className="space-y-4">
           <div className="flex items-center gap-2 text-yellow-500">
            <Eye size={24} />
            <h2 className="text-xl font-bold">4. How We Use Your Information</h2>
          </div>
          <ul className="list-disc pl-6 space-y-2 text-gray-400">
            <li>To facilitate gameplay and execute smart contract interactions.</li>
            <li>To display your public profile and game statistics on the Leaderboard.</li>
            <li>To detect and prevent fraud, botting, and collusion.</li>
            <li>To analyze platform performance and improve user experience.</li>
          </ul>
        </section>

         <section className="space-y-4">
           <div className="flex items-center gap-2 text-red-500">
            <Server size={24} />
            <h2 className="text-xl font-bold">5. Third-Party Services</h2>
          </div>
          <p className="text-gray-300 leading-relaxed">
            We may use third-party services for:
          </p>
           <ul className="list-disc pl-6 space-y-2 text-gray-400">
            <li><strong>RPC Providers:</strong> To communicate with the Solana network.</li>
            <li><strong>Analytics:</strong> To understand website traffic (e.g., Google Analytics, anonymous data).</li>
            <li><strong>Wallet Providers:</strong> Authentication is handled by your chosen wallet (Phantom, Solflare, etc.). We do not access your private keys.</li>
          </ul>
        </section>

        <section className="space-y-4">
            <div className="flex items-center gap-2 text-sol-green">
            <Lock size={24} />
            <h2 className="text-xl font-bold">6. Data Security</h2>
            </div>
            <p className="text-gray-300 leading-relaxed">
                We implement industry-standard security measures to protect off-chain data. However, no method of transmission over the Internet is 100% secure. You are responsible for securing your wallet's private keys and seed phrases.
            </p>
        </section>
        
         <section className="space-y-4 border-t border-white/10 pt-6">
            <p className="text-sm text-gray-500">
                If you have privacy concerns, please contact us at privacy@solpokerx.io or via our community telegram.
            </p>
        </section>
      </Card>
    </div>
  );
};