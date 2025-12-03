import React from 'react';
import { Card as UICard } from '../components/ui/Card';
import { Card as PokerCard } from '../components/poker/Card';
import { HelpCircle, ChevronRight, AlertCircle, Info } from 'lucide-react';

export const RulesOfPoker: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <div className="text-center space-y-4 pt-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white">Rules of Texas Hold'em</h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          The most popular poker variant in the world. Learn the basics, hand rankings, and betting structure to start winning on SOLPOKER X.
        </p>
      </div>

      {/* Objective */}
      <UICard className="bg-sol-dark/60 border-sol-green/20">
        <div className="flex items-start gap-4">
            <div className="p-3 bg-sol-green/10 rounded-xl text-sol-green hidden md:block">
                <HelpCircle size={32} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">The Objective</h2>
                <p className="text-gray-300 leading-relaxed">
                    In Texas Hold'em, players receive two private cards (hole cards) and use them in combination with five community cards dealt face-up on the board to make the <strong>best possible five-card poker hand</strong>.
                </p>
                <div className="mt-4 flex gap-2 text-sm text-gray-400 bg-black/40 p-3 rounded-lg border border-white/5 inline-block">
                    <Info size={16} className="inline mr-1 text-sol-blue" />
                    You can use one, both, or none of your hole cards to make your hand.
                </div>
            </div>
        </div>
      </UICard>

      {/* Hand Rankings */}
      <section className="space-y-6">
          <h2 className="text-3xl font-bold text-white text-center">Hand Rankings</h2>
          <p className="text-center text-gray-400 mb-8">From highest to lowest. A higher rank always beats a lower rank.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Royal Flush */}
              <RankingCard 
                title="1. Royal Flush" 
                desc="A, K, Q, J, 10, all the same suit. The unbeatable hand."
                cards={[
                    {s: 'spades', r: '10'}, {s: 'spades', r: 'J'}, {s: 'spades', r: 'Q'}, {s: 'spades', r: 'K'}, {s: 'spades', r: 'A'}
                ]}
                highlight
              />

              {/* Straight Flush */}
              <RankingCard 
                title="2. Straight Flush" 
                desc="Five cards in a sequence, all in the same suit."
                cards={[
                    {s: 'hearts', r: '5'}, {s: 'hearts', r: '6'}, {s: 'hearts', r: '7'}, {s: 'hearts', r: '8'}, {s: 'hearts', r: '9'}
                ]}
              />

              {/* Four of a Kind */}
              <RankingCard 
                title="3. Four of a Kind" 
                desc="All four cards of the same rank."
                cards={[
                    {s: 'diamonds', r: 'J'}, {s: 'clubs', r: 'J'}, {s: 'spades', r: 'J'}, {s: 'hearts', r: 'J'}, {s: 'clubs', r: '5'}
                ]}
              />

              {/* Full House */}
              <RankingCard 
                title="4. Full House" 
                desc="Three of a kind with a pair."
                cards={[
                    {s: 'clubs', r: '10'}, {s: 'hearts', r: '10'}, {s: 'spades', r: '10'}, {s: 'diamonds', r: 'K'}, {s: 'spades', r: 'K'}
                ]}
              />

               {/* Flush */}
               <RankingCard 
                title="5. Flush" 
                desc="Any five cards of the same suit, but not in a sequence."
                cards={[
                    {s: 'diamonds', r: '2'}, {s: 'diamonds', r: '5'}, {s: 'diamonds', r: '9'}, {s: 'diamonds', r: 'J'}, {s: 'diamonds', r: 'K'}
                ]}
              />

               {/* Straight */}
               <RankingCard 
                title="6. Straight" 
                desc="Five cards in a sequence, but not of the same suit."
                cards={[
                    {s: 'clubs', r: '5'}, {s: 'hearts', r: '6'}, {s: 'spades', r: '7'}, {s: 'diamonds', r: '8'}, {s: 'clubs', r: '9'}
                ]}
              />

              {/* Three of a Kind */}
              <RankingCard 
                title="7. Three of a Kind" 
                desc="Three cards of the same rank."
                cards={[
                    {s: 'clubs', r: 'Q'}, {s: 'hearts', r: 'Q'}, {s: 'spades', r: 'Q'}, {s: 'diamonds', r: '5'}, {s: 'clubs', r: '2'}
                ]}
              />

              {/* Two Pair */}
              <RankingCard 
                title="8. Two Pair" 
                desc="Two different pairs."
                cards={[
                    {s: 'clubs', r: '8'}, {s: 'hearts', r: '8'}, {s: 'spades', r: '4'}, {s: 'diamonds', r: '4'}, {s: 'clubs', r: 'A'}
                ]}
              />

              {/* Pair */}
              <RankingCard 
                title="9. One Pair" 
                desc="Two cards of the same rank."
                cards={[
                    {s: 'clubs', r: '9'}, {s: 'hearts', r: '9'}, {s: 'spades', r: 'K'}, {s: 'diamonds', r: '7'}, {s: 'clubs', r: '2'}
                ]}
              />

              {/* High Card */}
              <RankingCard 
                title="10. High Card" 
                desc="When you haven't made any of the hands above, the highest card plays."
                cards={[
                    {s: 'clubs', r: 'A'}, {s: 'hearts', r: 'J'}, {s: 'spades', r: '8'}, {s: 'diamonds', r: '6'}, {s: 'clubs', r: '2'}
                ]}
              />
          </div>
      </section>

      {/* Gameplay Flow */}
      <section className="space-y-6">
           <h2 className="text-3xl font-bold text-white text-center">How a Hand is Played</h2>
           
           <div className="space-y-4">
               <Step 
                 num="1" 
                 title="The Blinds" 
                 desc="Before cards are dealt, the two players to the left of the dealer button post forced bets called the Small Blind and Big Blind to create a starting pot."
               />
               <Step 
                 num="2" 
                 title="Pre-Flop" 
                 desc="Each player is dealt two hole cards face down. Action starts to the left of the Big Blind. Players can Fold, Call (match the blind), or Raise."
               />
               <Step 
                 num="3" 
                 title="The Flop" 
                 desc="Three community cards are dealt face up. Another round of betting ensues, starting with the player to the left of the button."
               />
               <Step 
                 num="4" 
                 title="The Turn" 
                 desc="A fourth community card is dealt. Another round of betting follows."
               />
               <Step 
                 num="5" 
                 title="The River" 
                 desc="The fifth and final community card is dealt. The final round of betting takes place."
               />
               <Step 
                 num="6" 
                 title="Showdown" 
                 desc="If two or more players remain, they reveal their cards. The best hand wins the pot. If everyone else folds, the last player standing wins without showing."
               />
           </div>
      </section>

      {/* Glossary */}
      <UICard className="bg-sol-dark/60">
           <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><AlertCircle size={20} className="text-sol-purple"/> Important Terms</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
               <div>
                   <strong className="text-sol-green">Check:</strong> Pass the action to the next player without betting. Only possible if no bet has been made in the current round.
               </div>
               <div>
                   <strong className="text-sol-green">Bet:</strong> Place chips into the pot. Other players must match this amount to stay in.
               </div>
               <div>
                   <strong className="text-sol-green">Call:</strong> Match the current bet amount.
               </div>
               <div>
                   <strong className="text-sol-green">Raise:</strong> Increase the current bet amount.
               </div>
               <div>
                   <strong className="text-sol-green">Fold:</strong> Discard your hand and forfeit any chance of winning the pot.
               </div>
               <div>
                   <strong className="text-sol-green">All-In:</strong> Bet all your remaining chips. You cannot be forced out of the hand, but can only win up to the amount you covered.
               </div>
           </div>
      </UICard>

    </div>
  );
};

const RankingCard = ({ title, desc, cards, highlight }: any) => (
    <UICard className={`relative overflow-hidden ${highlight ? 'border-yellow-500/50 bg-yellow-500/5' : 'bg-white/5 border-white/5'}`}>
        <div className="flex justify-between items-start mb-3 relative z-10">
            <div>
                <h3 className={`font-bold ${highlight ? 'text-yellow-500' : 'text-white'}`}>{title}</h3>
                <p className="text-xs text-gray-400">{desc}</p>
            </div>
        </div>
        <div className="flex justify-center gap-1 md:gap-2 relative z-10">
            {cards.map((c: any, i: number) => (
                <div key={i} className="transform hover:-translate-y-2 transition-transform duration-300">
                    <PokerCard suit={c.s} rank={c.r} size="sm" />
                </div>
            ))}
        </div>
    </UICard>
);

const Step = ({ num, title, desc }: any) => (
    <div className="flex items-start gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
        <div className="w-8 h-8 rounded-full bg-sol-blue/20 text-sol-blue font-bold flex items-center justify-center shrink-0 border border-sol-blue/30">
            {num}
        </div>
        <div>
            <h3 className="font-bold text-white mb-1">{title}</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
        </div>
    </div>
);