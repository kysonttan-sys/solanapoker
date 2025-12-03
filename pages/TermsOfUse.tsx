
import React from 'react';
import { Card } from '../components/ui/Card';
import { Shield, AlertTriangle, Scale, Lock, FileText } from 'lucide-react';

export const TermsOfUse: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="space-y-4 text-center md:text-left">
        <h1 className="text-4xl font-bold text-white">Terms of Service</h1>
        <p className="text-gray-400">Last updated: March 15, 2024</p>
      </div>

      <Card className="space-y-8 bg-sol-dark/60">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sol-green">
            <FileText size={24} />
            <h2 className="text-xl font-bold">1. Agreement to Terms</h2>
          </div>
          <p className="text-gray-300 leading-relaxed">
            By accessing or using SOLPOKER X ("the Platform"), connecting your Solana wallet, or participating in any games, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the service.
          </p>
        </section>

        <section className="space-y-4">
           <div className="flex items-center gap-2 text-sol-blue">
            <Shield size={24} />
            <h2 className="text-xl font-bold">2. Decentralized Nature of Service</h2>
          </div>
          <p className="text-gray-300 leading-relaxed">
            SOLPOKER X is a non-custodial, decentralized interface interacting with smart contracts on the Solana Blockchain. We do not hold your funds, private keys, or personal data. All game logic and fund transfers are executed automatically by code. You acknowledge that you retain full control and responsibility for your digital wallet and assets at all times.
          </p>
        </section>

         <section className="space-y-4">
           <div className="flex items-center gap-2 text-sol-purple">
            <Scale size={24} />
            <h2 className="text-xl font-bold">3. Eligibility</h2>
          </div>
          <p className="text-gray-300 leading-relaxed">
            You must be at least 18 years of age, or the age of legal majority in your jurisdiction, to use the Platform. Access to the Platform is prohibited from jurisdictions where online gambling or decentralized finance usage is restricted by law. It is your sole responsibility to comply with applicable local laws.
          </p>
        </section>

        <section className="space-y-4">
           <div className="flex items-center gap-2 text-yellow-500">
            <AlertTriangle size={24} />
            <h2 className="text-xl font-bold">4. Risk Disclosure</h2>
          </div>
          <p className="text-gray-300 leading-relaxed">
            Using blockchain technology involves significant risks. By using the Platform, you accept inherent risks including but not limited to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-400">
            <li>Smart contract vulnerabilities or bugs.</li>
            <li>Loss of private keys or seed phrases.</li>
            <li>Network congestion or latency on the Solana blockchain.</li>
            <li>Price volatility of SOL or other cryptocurrencies used.</li>
          </ul>
          <p className="text-gray-300 leading-relaxed mt-2">
            SOLPOKER X is not responsible for any losses resulting from blockchain network failures, wallet errors, or third-party interactions.
          </p>
        </section>

         <section className="space-y-4">
           <div className="flex items-center gap-2 text-red-500">
            <Lock size={24} />
            <h2 className="text-xl font-bold">5. Prohibited Activities</h2>
          </div>
          <p className="text-gray-300 leading-relaxed">
            Users are strictly prohibited from:
          </p>
           <ul className="list-disc pl-6 space-y-2 text-gray-400">
            <li>Colluding with other players to manipulate game outcomes.</li>
            <li>Using unauthorized bots or AI assistance tools during live gameplay.</li>
            <li>Exploiting vulnerabilities in the smart contracts or UI.</li>
            <li>Money laundering or using funds from illicit sources.</li>
          </ul>
          <p className="text-gray-300 leading-relaxed mt-2">
            Violation of these terms may result in wallet blacklisting from the frontend interface.
          </p>
        </section>

        <section className="space-y-4">
            <h2 className="text-xl font-bold text-white">6. Limitation of Liability</h2>
            <p className="text-gray-300 leading-relaxed">
                To the maximum extent permitted by law, SOLPOKER X shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
            </p>
        </section>
        
         <section className="space-y-4 border-t border-white/10 pt-6">
            <p className="text-sm text-gray-500">
                For questions regarding these terms, please contact our community moderators via our official social media channels.
            </p>
        </section>
      </Card>
    </div>
  );
};
