
import React from 'react';
import { Smartphone, RotateCw } from 'lucide-react';

export const TurnDeviceOverlay: React.FC = () => {
  return (
    <>
      <style>{`
        #turn-device-overlay { display: none; }
        /* 
           Only show overlay if:
           1. Orientation is Landscape
           2. Height is less than 600px (Typical Mobile Phone limit)
           Tablets usually have height > 600px in landscape (iPad Mini is ~744px)
        */
        @media screen and (orientation: landscape) and (max-height: 600px) {
          #turn-device-overlay { display: flex !important; }
        }
      `}</style>
      <div id="turn-device-overlay" className="fixed inset-0 z-[100] bg-[#0B0B0F] flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300 touch-none">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-sol-green/20 blur-xl rounded-full animate-pulse"></div>
          <div className="relative animate-[spin_3s_ease-in-out_infinite]">
               <Smartphone size={64} className="text-gray-600" />
               <RotateCw size={32} className="text-sol-green absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">Please Rotate Device</h2>
        <p className="text-gray-400 max-w-xs leading-relaxed">
          SOLPOKER X is optimized for <span className="text-sol-green font-bold">Portrait Mode</span> on mobile phones.
        </p>
        <div className="mt-8 text-xs text-gray-600 font-mono">
          Tablets & Desktops support Landscape.
        </div>
      </div>
    </>
  );
};
