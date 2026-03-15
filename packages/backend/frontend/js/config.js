// Frontend API Configuration

// Determine API base URL based on environment
let API_BASE_URL = 'http://localhost:3000'; // Default for local development

if (typeof window !== 'undefined') {
  // Browser environment
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Production environment
    API_BASE_URL = window.location.origin.replace(/:\d+$/, ':3000');
    
    // If on Railway or custom domain
    if (window.location.hostname.includes('railway') || window.location.hostname.includes('.app')) {
      API_BASE_URL = `https://${window.location.hostname}/api`;
    }
  }
}

export const config = {
  API_BASE_URL,
  JWT_TOKEN_KEY: 'bitrent_token',
  JWT_PUBKEY_KEY: 'bitrent_pubkey',
  ADMIN_PUBKEY_KEY: 'bitrent_admin',
};

export default config;
