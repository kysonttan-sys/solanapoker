import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Buffer } from 'buffer';

// Essential Polyfill for Solana libraries in browser
// We declare global types to fix TS errors
declare global {
    interface Window {
        Buffer: typeof Buffer;
        global: any;
    }
}

// This must run before any other imports that might use Buffer
if (typeof window !== 'undefined') {
    window.Buffer = window.Buffer || Buffer;
    if (typeof window.global === 'undefined') {
        window.global = window;
    }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
      <App />
  </React.StrictMode>
);