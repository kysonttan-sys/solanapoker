
import React from 'react';
import { Card } from '../components/ui/Card';
import { Cookie, Settings, Info, CheckCircle, XCircle } from 'lucide-react';

export const CookiePolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="space-y-4 text-center md:text-left">
        <h1 className="text-4xl font-bold text-white">Cookie Policy</h1>
        <p className="text-gray-400">Last updated: March 20, 2024</p>
      </div>

      <Card className="space-y-8 bg-sol-dark/60">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sol-green">
            <Info size={24} />
            <h2 className="text-xl font-bold">1. What Are Cookies?</h2>
          </div>
          <p className="text-gray-300 leading-relaxed">
            Cookies are small text files stored on your device when you visit a website. They allow the website to recognize your device and remember if you've been to the website before. At SOLPOKER X, we use cookies to ensure the platform functions correctly and to improve your gaming experience.
          </p>
        </section>

        <section className="space-y-4">
           <div className="flex items-center gap-2 text-sol-blue">
            <Cookie size={24} />
            <h2 className="text-xl font-bold">2. Types of Cookies We Use</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 mb-2 text-sol-purple">
                      <CheckCircle size={18} />
                      <h3 className="font-bold">Essential Cookies</h3>
                  </div>
                  <p className="text-sm text-gray-400">
                      Strictly necessary for the website to function. They handle wallet connection states, session security, and basic navigation. These cannot be disabled.
                  </p>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 mb-2 text-sol-green">
                      <Settings size={18} />
                      <h3 className="font-bold">Functional Cookies</h3>
                  </div>
                  <p className="text-sm text-gray-400">
                      Remember your preferences such as sound settings, table layout choices, and language selection to provide a personalized experience.
                  </p>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 mb-2 text-yellow-500">
                      <Info size={18} />
                      <h3 className="font-bold">Analytics Cookies</h3>
                  </div>
                  <p className="text-sm text-gray-400">
                      Help us understand how visitors interact with the website, discovering errors and performance issues. Data is aggregated and anonymous.
                  </p>
              </div>
          </div>
        </section>

         <section className="space-y-4">
           <div className="flex items-center gap-2 text-sol-purple">
            <Settings size={24} />
            <h2 className="text-xl font-bold">3. Managing Cookies</h2>
          </div>
          <p className="text-gray-300 leading-relaxed">
            Most web browsers automatically accept cookies, but you can usually modify your browser setting to decline cookies if you prefer. However, this may prevent you from taking full advantage of the website, such as maintaining a stable wallet connection during gameplay.
          </p>
          <div className="bg-sol-dark border border-white/10 p-4 rounded-lg mt-2">
              <p className="text-sm text-gray-400 mb-2 font-bold">To manage cookies in your browser:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-500">
                  <li>Check the "Settings" or "Preferences" menu of your browser.</li>
                  <li>Look for "Privacy" or "Security" sections.</li>
                  <li>Select options to clear or block cookies.</li>
              </ul>
          </div>
        </section>

        <section className="space-y-4 border-t border-white/10 pt-6">
            <p className="text-sm text-gray-500">
                This Cookie Policy works in conjunction with our <a href="/#/privacy" className="text-sol-green hover:underline">Privacy Policy</a>.
            </p>
        </section>
      </Card>
    </div>
  );
};
