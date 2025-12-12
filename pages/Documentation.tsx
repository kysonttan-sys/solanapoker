import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { BookOpen, ShieldCheck, Coins, Network, Crown, Zap, Lock, Sparkles, Gift } from 'lucide-react';
import { PROTOCOL_FEE_SPLIT, VIP_LEVELS, REFERRAL_TIERS, HOST_TIERS, PRIZE_POOL_INFO } from '../constants';

const SECTIONS = [
    { id: 'intro', title: 'Introduction', icon: <BookOpen size={18} /> },
    { id: 'fairness', title: 'Provably Fair & Security', icon: <ShieldCheck size={18} /> },
    { id: 'economy', title: 'Fees & Distribution', icon: <Coins size={18} /> },
    { id: 'ecosystem', title: 'Earn: Host & Refer', icon: <Network size={18} /> },
    { id: 'vip', title: 'VIP Club', icon: <Crown size={18} /> },
];

export const Documentation: React.FC = () => {
    const [activeSection, setActiveSection] = useState('intro');

    const scrollToSection = (id: string) => {
        setActiveSection(id);
        const element = document.getElementById(id);
        if (element) {
            const offset = 100;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = element.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    // Intersection Observer to update active section on scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { threshold: 0.5, rootMargin: "-100px 0px -50% 0px" }
        );

        SECTIONS.forEach((section) => {
            const element = document.getElementById(section.id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, []);

    return (
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 animate-in fade-in duration-500 pb-12">
            
            {/* Sidebar Navigation */}
            <div className="md:w-64 shrink-0">
                <div className="sticky top-24 space-y-1 bg-sol-dark/50 backdrop-blur-md p-4 rounded-xl border border-white/5">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">Documentation</h3>
                    {SECTIONS.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => scrollToSection(section.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
                                activeSection === section.id 
                                ? 'bg-sol-green/10 text-sol-green border border-sol-green/20' 
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {section.icon}
                            {section.title}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 space-y-16">
                
                {/* Introduction */}
                <section id="intro" className="scroll-mt-32">
                    <h1 className="text-4xl font-bold text-white mb-6">Welcome to SOLPOKER X</h1>
                    <Card className="bg-sol-dark/60 space-y-6">
                        <p className="text-gray-300 leading-relaxed">
                            SOLPOKER X is a next-generation decentralized poker platform built on the Solana blockchain. 
                            We combine the speed and transparency of Web3 with the user experience of professional poker software.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <h3 className="font-bold text-white mb-2 flex items-center gap-2"><Zap className="text-yellow-500" size={18}/> Instant Settlement</h3>
                                <p className="text-sm text-gray-400">Funds are settled directly to your wallet via smart contracts. No deposits held by the house.</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <h3 className="font-bold text-white mb-2 flex items-center gap-2"><ShieldCheck className="text-sol-green" size={18}/> Non-Custodial</h3>
                                <p className="text-sm text-gray-400">You retain full control of your assets. We never ask for your private keys.</p>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* Provably Fair */}
                <section id="fairness" className="scroll-mt-32">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <ShieldCheck className="text-sol-blue"/> Provably Fair RNG
                    </h2>
                    <Card className="bg-sol-dark/60 space-y-6">
                        <p className="text-gray-300">
                            Trust is paramount. Unlike traditional sites using black-box servers, SOLPOKER X uses a cryptographically verifiable shuffling mechanism.
                        </p>
                        
                        <div className="bg-black/40 p-6 rounded-xl border border-white/10 font-mono text-sm space-y-4">
                            <div className="text-sol-green font-bold">The Formula:</div>
                            <div className="bg-white/5 p-3 rounded text-gray-300 break-all">
                                HMAC_SHA256(ServerSeed, ClientSeed + Nonce)
                            </div>
                            <ul className="list-disc pl-5 space-y-2 text-gray-400 font-sans">
                                <li><strong>Server Seed:</strong> Generated by us and hashed (hidden) before the hand starts.</li>
                                <li><strong>Client Seed:</strong> Provided by your browser (or manually set by you). We cannot predict this.</li>
                                <li><strong>Nonce:</strong> Hand number, ensuring every shuffle is unique.</li>
                            </ul>
                        </div>
                        <p className="text-sm text-gray-400">
                            Because we commit to the Server Seed hash <em>before</em> we know your Client Seed, it is mathematically impossible for us to rig the deck in our favor. You can verify every hand in the Game Room settings.
                        </p>
                    </Card>
                </section>

                {/* Economy */}
                <section id="economy" className="scroll-mt-32">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <Coins className="text-yellow-500"/> Protocol Economy
                    </h2>
                    <Card className="bg-sol-dark/60 space-y-8">
                        <div>
                            <h3 className="text-lg font-bold text-white mb-4">Fees & Rake</h3>
                            <ul className="space-y-3">
                                <li className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                    <span className="text-gray-300">Cash Game Rake</span>
                                    <span className="text-sol-green font-bold font-mono">3% - 5% (Capped)</span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-white mb-4">Where do the fees go?</h3>
                            <p className="text-gray-400 mb-4 text-sm">Every dollar of revenue generated by the platform is instantly split by the Smart Contract:</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-gradient-to-br from-sol-green/10 to-transparent border border-sol-green/20">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sol-green font-bold">Host (Table Creator)</span>
                                        <span className="text-white font-mono">30% - 40%</span>
                                    </div>
                                    <p className="text-xs text-gray-400">Paid to the user who created the table.</p>
                                </div>
                                <div className="p-4 rounded-xl bg-gradient-to-br from-sol-purple/10 to-transparent border border-sol-purple/20">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sol-purple font-bold">Referrers</span>
                                        <span className="text-white font-mono">5% - 20%</span>
                                    </div>
                                    <p className="text-xs text-gray-400">Paid to the upline network of players.</p>
                                </div>
                                <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-yellow-500 font-bold">Community Jackpot</span>
                                        <span className="text-white font-mono">{PROTOCOL_FEE_SPLIT.jackpot}%</span>
                                    </div>
                                    <p className="text-xs text-gray-400">Accumulated into a prize pool for top players.</p>
                                </div>
                                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-blue-500 font-bold">Global Partner Pool</span>
                                        <span className="text-white font-mono">{PROTOCOL_FEE_SPLIT.globalPool}%</span>
                                    </div>
                                    <p className="text-xs text-gray-400">Shared among Rank 3 Partners.</p>
                                </div>
                                <div className="p-4 rounded-xl bg-gradient-to-br from-gray-700/10 to-transparent border border-gray-600/20">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-gray-400 font-bold">Developer (Platform)</span>
                                        <span className="text-white font-mono">Remainder</span>
                                    </div>
                                    <p className="text-xs text-gray-400">Used for server costs, maintenance, and development.</p>
                                </div>
                            </div>
                        </div>

                        {/* PRIZE POOL EXPLANATION */}
                        <div className="border-t border-white/5 pt-6 mt-2">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Sparkles size={20} className="text-yellow-500"/> Community Jackpot (Monthly Draw)
                            </h3>
                            <div className="bg-white/5 p-5 rounded-xl border border-yellow-500/10">
                                <p className="text-gray-300 text-sm mb-4">
                                    {PROTOCOL_FEE_SPLIT.jackpot}% of every pot is automatically routed to the "Community Jackpot". This prize pool accumulates all month and triggers a Smart Contract payout on the 1st of each month.
                                </p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div className="bg-black/40 p-4 rounded-lg">
                                        <div className="text-yellow-500 font-bold text-lg text-center mb-2">{PRIZE_POOL_INFO.distribution.topPlayer}%</div>
                                        <div className="text-xs text-gray-500 uppercase text-center mb-3">Top 3 Players (Hands)</div>
                                        <div className="space-y-1 text-xs">
                                            <div className="flex justify-between"><span className="text-yellow-400">🥇 1st</span><span className="text-white">50%</span></div>
                                            <div className="flex justify-between"><span className="text-gray-400">🥈 2nd</span><span className="text-white">30%</span></div>
                                            <div className="flex justify-between"><span className="text-orange-400">🥉 3rd</span><span className="text-white">20%</span></div>
                                        </div>
                                    </div>
                                    <div className="bg-black/40 p-4 rounded-lg">
                                        <div className="text-sol-blue font-bold text-lg text-center mb-2">{PRIZE_POOL_INFO.distribution.topEarner}%</div>
                                        <div className="text-xs text-gray-500 uppercase text-center mb-3">Top 3 Earners (Profit)</div>
                                        <div className="space-y-1 text-xs">
                                            <div className="flex justify-between"><span className="text-yellow-400">🥇 1st</span><span className="text-white">50%</span></div>
                                            <div className="flex justify-between"><span className="text-gray-400">🥈 2nd</span><span className="text-white">30%</span></div>
                                            <div className="flex justify-between"><span className="text-orange-400">🥉 3rd</span><span className="text-white">20%</span></div>
                                        </div>
                                    </div>
                                    <div className="bg-black/40 p-4 rounded-lg">
                                        <div className="text-sol-purple font-bold text-lg text-center mb-2">{PRIZE_POOL_INFO.distribution.luckyDraw}%</div>
                                        <div className="text-xs text-gray-500 uppercase text-center mb-3">Lucky Draw</div>
                                        <div className="text-xs text-gray-400 text-center">
                                            10 random winners<br/>split equally
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-lg">
                                    <h4 className="text-yellow-500 font-bold text-xs uppercase mb-2 flex items-center gap-2">
                                        <Gift size={14}/> How the Lucky Draw is Fair
                                    </h4>
                                    <ul className="text-xs text-gray-400 space-y-2">
                                        <li>
                                            1. <strong>Participation:</strong> Every unique wallet that plays at least 10 hands during the month is entered into the draw.
                                        </li>
                                        <li>
                                            2. <strong>Verifiable Randomness:</strong> We use <span className="text-white">Chainlink VRF (Verifiable Random Function)</span> on-chain. This provides cryptographic proof that the winner selection is truly random and cannot be tampered with by the developers.
                                        </li>
                                        <li>
                                            3. <strong>Distribution:</strong> The Smart Contract automatically airdrops the prize (USDT) to the 10 selected wallet addresses immediately after the random number generation.
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* Ecosystem (Host/Referral) */}
                <section id="ecosystem" className="scroll-mt-32">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <Network className="text-sol-purple"/> Earn: Host & Refer
                    </h2>
                    <Card className="bg-sol-dark/60 space-y-8">
                        <div>
                            <h3 className="text-lg font-bold text-white mb-4">Referral Program (Share-to-Earn)</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10 text-gray-500 uppercase">
                                            <th className="pb-3">Rank</th>
                                            <th className="pb-3">Commission</th>
                                            <th className="pb-3">Requirement</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {REFERRAL_TIERS.map((tier) => (
                                            <tr key={tier.rank}>
                                                <td className={`py-3 font-bold ${tier.color}`}>{tier.name}</td>
                                                <td className="py-3 text-white">{tier.commission}%</td>
                                                <td className="py-3 text-gray-400">{tier.req}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-gray-500 mt-3">
                                * Commissions are differential. If you are a Partner (20%) and you refer an Agent (10%), you earn the 10% difference on their network volume.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-white mb-4">Host-to-Earn</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10 text-gray-500 uppercase">
                                            <th className="pb-3">Rank</th>
                                            <th className="pb-3">Revenue Share</th>
                                            <th className="pb-3">Fees Generated</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {HOST_TIERS.map((tier) => (
                                            <tr key={tier.rank}>
                                                <td className={`py-3 font-bold ${tier.color} flex items-center gap-2`}>
                                                    {tier.icon} {tier.name}
                                                </td>
                                                <td className="py-3 text-white">{tier.share}%</td>
                                                <td className="py-3 text-gray-400 font-mono">${tier.minRevenue.toLocaleString()}+</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* VIP Club */}
                <section id="vip" className="scroll-mt-32">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <Crown className="text-yellow-500"/> VIP Club (Rakeback)
                    </h2>
                    <Card className="bg-sol-dark/60">
                        <p className="text-gray-300 mb-6">
                            The more you play, the less you pay. Climb the ranks to unlock lower rake fees and higher caps.
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-white/10 text-gray-500 uppercase">
                                        <th className="pb-3">Rank</th>
                                        <th className="pb-3">Hands Played</th>
                                        <th className="pb-3">Rake Fee</th>
                                        <th className="pb-3">Cap Limit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {VIP_LEVELS.map((level) => (
                                        <tr key={level.name}>
                                            <td className={`py-3 font-bold ${level.color} flex items-center gap-2`}>
                                                {level.icon} {level.name}
                                            </td>
                                            <td className="py-3 text-gray-400 font-mono">{level.minHands.toLocaleString()}</td>
                                            <td className="py-3 text-sol-green font-bold">{(level.rake * 100).toFixed(1)}%</td>
                                            <td className="py-3 text-white font-mono">${level.cap}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </section>

            </div>
        </div>
    );
};