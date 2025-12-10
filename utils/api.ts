// API Configuration - Centralized server URL management
// Uses environment variable or falls back to localhost for development

/**
 * Get the backend API URL
 * Set VITE_API_URL environment variable for production/testing
 */
export const getApiUrl = (): string => {
  // Check for environment variable first (set this for team testing)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Fallback to localhost for local development
  return 'http://localhost:4000';
};

/**
 * Get the WebSocket URL (same as API URL for Socket.io)
 */
export const getSocketUrl = (): string => {
  return getApiUrl();
};

/**
 * API helper for making fetch requests
 */
export const api = {
  get: async (endpoint: string) => {
    const response = await fetch(`${getApiUrl()}${endpoint}`);
    return response.json();
  },
  
  post: async (endpoint: string, data: any) => {
    const response = await fetch(`${getApiUrl()}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  
  put: async (endpoint: string, data: any) => {
    const response = await fetch(`${getApiUrl()}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};

export default api;
