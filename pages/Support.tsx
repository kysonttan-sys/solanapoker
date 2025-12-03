import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Mail, FileQuestion, Bug, ArrowRight, ExternalLink, Send, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Support: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-12 pt-8">
      
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-white">Support Center</h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          Need help? We are here for you 24/7. Choose the channel that best fits your needs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Telegram / Live Chat */}
          <Card className="bg-gradient-to-br from-sol-blue/10 to-transparent border-sol-blue/30 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-24 bg-sol-blue/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 group-hover:bg-sol-blue/10 transition-all"></div>
               <div className="relative z-10">
                   <div className="w-12 h-12 bg-sol-blue/20 rounded-xl flex items-center justify-center text-sol-blue mb-4 border border-sol-blue/30">
                       <Send size={24} />
                   </div>
                   <h2 className="text-2xl font-bold text-white mb-2">Live Community Support</h2>
                   <p className="text-gray-400 mb-6 min-h-[48px]">
                       The fastest way to get help. Join our official Telegram group to chat with moderators and the community.
                   </p>
                   <Button onClick={() => window.open('https://t.me/solpokerx', '_blank')} className="w-full gap-2 shadow-[0_0_15px_rgba(29,139,255,0.3)]">
                       Join Telegram <ExternalLink size={16} />
                   </Button>
               </div>
          </Card>

          {/* Email Support */}
          <Card className="bg-white/5 border-white/10 group hover:border-white/20 transition-all">
               <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white mb-4 border border-white/20">
                   <Mail size={24} />
               </div>
               <h2 className="text-2xl font-bold text-white mb-2">Email Support</h2>
               <p className="text-gray-400 mb-6 min-h-[48px]">
                   For sensitive inquiries, partnership proposals, or account issues. We typically respond within 24 hours.
               </p>
               <Button variant="outline" onClick={() => window.location.href = 'mailto:support@solpokerx.io'} className="w-full gap-2">
                   support@solpokerx.io <ArrowRight size={16} />
               </Button>
          </Card>
      </div>

      {/* Self Service Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button 
            onClick={() => navigate('/faq')}
            className="bg-sol-dark/60 p-6 rounded-xl border border-white/5 hover:border-sol-green/30 hover:bg-sol-green/5 transition-all text-left group"
          >
              <FileQuestion size={32} className="text-gray-500 group-hover:text-sol-green mb-4 transition-colors" />
              <h3 className="text-lg font-bold text-white mb-1">FAQs</h3>
              <p className="text-sm text-gray-400">Common questions about gameplay, deposits, and rules.</p>
          </button>

          <button 
            onClick={() => navigate('/rules')}
            className="bg-sol-dark/60 p-6 rounded-xl border border-white/5 hover:border-sol-purple/30 hover:bg-sol-purple/5 transition-all text-left group"
          >
              <div className="text-gray-500 group-hover:text-sol-purple mb-4 transition-colors font-bold text-2xl">A♠</div>
              <h3 className="text-lg font-bold text-white mb-1">Game Rules</h3>
              <p className="text-sm text-gray-400">Learn how to play Texas Hold'em and understand hand rankings.</p>
          </button>

          <button 
            onClick={() => window.open('https://github.com/solpokerx/issues', '_blank')}
            className="bg-sol-dark/60 p-6 rounded-xl border border-white/5 hover:border-red-500/30 hover:bg-red-500/5 transition-all text-left group"
          >
              <Bug size={32} className="text-gray-500 group-hover:text-red-500 mb-4 transition-colors" />
              <h3 className="text-lg font-bold text-white mb-1">Report a Bug</h3>
              <p className="text-sm text-gray-400">Found a glitch? Let our dev team know and earn a bounty.</p>
          </button>
      </div>

      {/* Contact Form */}
      <Card className="bg-white/5 border-white/10">
          <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-sol-green/10 rounded-lg text-sol-green">
                  <MessageSquare size={24} />
              </div>
              <h2 className="text-2xl font-bold text-white">Send us a message / Feedback</h2>
          </div>

          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Message sent!'); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400">Name (Optional)</label>
                      <input type="text" className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-sol-green focus:outline-none" placeholder="Your name" />
                  </div>
                  <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400">Email Address</label>
                      <input type="email" className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-sol-green focus:outline-none" placeholder="name@example.com" />
                  </div>
              </div>

              <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Category</label>
                  <select className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-sol-green focus:outline-none appearance-none">
                      <option value="feedback">Feedback & Suggestions</option>
                      <option value="general">General Inquiry</option>
                      <option value="technical">Technical Support</option>
                      <option value="account">Account Issue</option>
                      <option value="bug">Report a Bug</option>
                      <option value="partnership">Partnership / Business</option>
                  </select>
              </div>

              <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Message</label>
                  <textarea rows={4} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-sol-green focus:outline-none" placeholder="How can we help you?" />
              </div>
              <div className="flex justify-end">
                  <Button type="submit" className="min-w-[150px]">Send Message</Button>
              </div>
          </form>
      </Card>

    </div>
  );
};