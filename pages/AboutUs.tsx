import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ShieldCheck, Zap, Users, Coins, Lock, Globe, Rocket, Crown, Network, PieChart, Send } from 'lucide-react';

export const AboutUs: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Zap size={32} className="text-sol-green" />,
      title: "Built on Solana",
      desc: "Experience the fastest poker on the blockchain. With sub-second finality and near-zero gas fees, SOLPOKER X offers a seamless, lag-free gaming experience that rivals centralized platforms."
    },
    {
      icon: <ShieldCheck size={32} className="text-sol-blue" />,
      title: "Provably Fair RNG",
      desc: "Trust, but verify. Our shuffling logic uses a cryptographic commitment scheme involving both Server and Client seeds. You can verify the fairness of every single hand played."
    },
    {
      icon: <Lock size={32} className="text-sol-purple" />,
      title: "Non-Custodial",
      desc: "Not your keys, not your coins? Not here. We never hold your funds. All buy-ins and payouts are handled instantly via smart contracts directly to and from your wallet."
    },
    {
      icon: <Users size={32} className="text-yellow-500" />,
      title: "Refer-to-Earn",
      desc: "Build your poker network and earn up to 60% override commissions when your downline plays. Our Hybrid Override Model rewards you for growing the community."
    },
    {
      icon: <Network size={32} className="text-orange-500" />,
      title: "Multi-Tier Rewards",
      desc: "Grow the ecosystem and get paid forever. Our multi-tier referral system allows you to earn up to 60% override commissions on every hand your referred players play."
    },
    {
      icon: <PieChart size={32} className="text-red-500" />,
      title: "Community Economy",
      desc: "Platform revenue fuels the ecosystem. 5% of all fees feed a massive Community Jackpot distributed monthly, while 5% goes to the Global Partner Pool."
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-16 animate-in fade-in duration-500 pb-12">
      
      {/* Hero Section */}
      <div className="relative text-center space-y-6 pt-12">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sol-green/5 rounded-full blur-3xl -z-10" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sol-green text-sm font-bold uppercase tracking-wider mb-4">
            <Rocket size={16} /> The Future of Poker
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-sol-green to-sol-blue">
            Decentralized.<br/>Transparent.<br/>Yours.
        </h1>
        
        <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            SOLPOKER X isn't just a poker site; it's a protocol owned by its players. 
            We are eliminating the "Black Box" of traditional gambling and replacing it with verifiable code.
        </p>

        <div className="flex justify-center gap-4 pt-4">
            <Button size="lg" onClick={() => navigate('/lobby')} className="shadow-[0_0_20px_rgba(0,255,174,0.3)]">
                Start Playing
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/documentation')}>
                Read Whitepaper
            </Button>
        </div>
      </div>

      {/* Mission Statement */}
      <Card className="bg-gradient-to-br from-[#1A1A24] to-[#13131F] border-sol-purple/30 p-8 md:p-12 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-32 bg-sol-purple/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
         <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
             <div className="flex-1 space-y-4">
                 <h2 className="text-3xl font-bold text-white">Our Mission</h2>
                 <p className="text-gray-300 text-lg leading-relaxed">
                     We believe online poker is broken. High rake, slow withdrawals, opaque RNG, and centralized risk have plagued players for decades.
                 </p>
                 <p className="text-gray-300 text-lg leading-relaxed">
                     SOLPOKER X was built to solve this using the Solana Blockchain. We aim to create a self-sustaining ecosystem where players and network builders all share in the success of the platform. We don't just want you to play; we want you to own a piece of the action.
                 </p>
             </div>
             <div className="shrink-0">
                 <Globe size={180} className="text-sol-purple opacity-20 animate-pulse" />
             </div>
         </div>
      </Card>

      {/* Unique Advantages Grid */}
      <div>
          <h2 className="text-3xl font-bold text-center text-white mb-12">Why We Are Different</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, idx) => (
                  <Card key={idx} className="hover:border-sol-green/30 transition-all hover:-translate-y-1 duration-300 bg-white/5 border-white/5">
                      <div className="bg-black/40 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-white/5">
                          {feature.icon}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                      <p className="text-gray-400 leading-relaxed text-sm">
                          {feature.desc}
                      </p>
                  </Card>
              ))}
          </div>
      </div>

      {/* Team / DAO Section */}
      <div className="text-center space-y-6 pt-8 border-t border-white/5">
           <h2 className="text-2xl font-bold text-white">Join the Community</h2>
           <p className="text-gray-400 max-w-xl mx-auto">
               SOLPOKER X is governed by a decentralized spirit. Join our social channels to propose features, vote on new game types, and meet fellow players.
           </p>
           <div className="flex justify-center gap-4">
               <a href="https://t.me/solpokerx" target="_blank" className="flex items-center gap-2 bg-sol-blue/10 text-sol-blue px-6 py-3 rounded-lg font-bold hover:bg-sol-blue hover:text-white transition-all">
                   <Send size={20} /> Join Telegram
               </a>
               <a href="#" className="flex items-center gap-2 bg-white/5 text-white px-6 py-3 rounded-lg font-bold hover:bg-white/10 transition-all">
                   <Crown size={20} /> Follow on X
               </a>
           </div>
      </div>

    </div>
  );
};