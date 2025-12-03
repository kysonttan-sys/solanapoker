
import React, { useState, useEffect } from 'react';
import { Cookie } from 'lucide-react';
import { Button } from './ui/Button';
import { Link } from 'react-router-dom';

interface CookieConsentProps {
  onConsentChange?: (accepted: boolean) => void;
}

export const CookieConsent: React.FC<CookieConsentProps> = ({ onConsentChange }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('solpoker_cookie_consent');
    if (!consent) {
      // Small delay for smooth entrance animation
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    } else {
      // Notify parent of existing consent
      onConsentChange?.(consent === 'accepted');
    }
  }, [onConsentChange]);

  const handleAccept = () => {
    localStorage.setItem('solpoker_cookie_consent', 'accepted');
    onConsentChange?.(true);
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('solpoker_cookie_consent', 'declined');
    onConsentChange?.(false);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6 animate-in slide-in-from-bottom-full duration-700 pointer-events-none">
      <div className="pointer-events-auto max-w-5xl mx-auto bg-[#13131F]/95 backdrop-blur-xl border border-sol-green/20 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        
        {/* Top Gradient Line */}
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-sol-purple via-sol-blue to-sol-green" />
        
        <div className="flex items-start gap-4 max-w-2xl relative z-10">
          <div className="p-3 bg-sol-green/10 rounded-xl hidden sm:flex items-center justify-center shrink-0">
            <Cookie className="text-sol-green" size={28} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <span className="sm:hidden"><Cookie size={18} className="text-sol-green inline"/></span>
              Cookie Preferences
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              We use cookies to manage your wallet session, ensure fair play, and analyze platform performance. 
              By continuing, you agree to our <Link to="/cookies" className="text-sol-green hover:text-white underline decoration-dashed underline-offset-4 transition-colors">Cookie Policy</Link>.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0 relative z-10">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDecline} 
            className="border-white/10 hover:bg-white/5 text-gray-400 hover:text-white min-w-[120px]"
          >
            Essential Only
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleAccept} 
            className="shadow-[0_0_20px_rgba(0,255,174,0.2)] min-w-[120px]"
          >
            Accept All
          </Button>
        </div>
      </div>
    </div>
  );
};
