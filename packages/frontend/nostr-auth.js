/**
 * Nostr Authentication (NIP-98)
 * Real wallet signing with nostr-tools
 */

// Import from CDN
const NOSTR_LIB = 'https://cdn.jsdelivr.net/npm/nostr-tools@latest';

let userPublicKey = null;
let nwc = null;

/**
 * Initialize Nostr connection
 */
export async function initNostr() {
  // Check if window.nostr exists (extension like nos2x, Alby, etc)
  if (!window.nostr) {
    console.warn('⚠️ Nostr wallet not found. Install Alby or similar extension.');
    return false;
  }
  
  try {
    // Get user's public key from wallet
    userPublicKey = await window.nostr.getPublicKey();
    console.log('✅ Nostr wallet connected:', userPublicKey.substring(0, 16) + '...');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect Nostr:', error);
    return false;
  }
}

/**
 * Get authentication challenge from server
 */
export async function getAuthChallenge() {
  const response = await fetch('https://workspace-omega-opal.vercel.app/api/auth/challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (!response.ok) throw new Error('Failed to get challenge');
  return response.json();
}

/**
 * Sign challenge with Nostr wallet (NIP-98)
 */
export async function signChallenge(challenge) {
  if (!window.nostr) {
    throw new Error('Nostr wallet not available');
  }

  // Create event to sign
  const event = {
    kind: 27235, // HTTP auth event (NIP-98)
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['u', 'https://workspace-omega-opal.vercel.app/api/auth/verify'],
      ['method', 'POST'],
      ['challenge', challenge.challenge.id]
    ],
    content: challenge.challenge.message,
    pubkey: userPublicKey
  };

  try {
    // Sign with wallet
    const signedEvent = await window.nostr.signEvent(event);
    console.log('✅ Challenge signed');
    return signedEvent;
  } catch (error) {
    console.error('❌ Failed to sign:', error);
    throw error;
  }
}

/**
 * Complete authentication
 */
export async function authenticate() {
  try {
    // Step 1: Get challenge
    const challengeRes = await getAuthChallenge();
    
    // Step 2: Sign challenge
    const signedEvent = await signChallenge(challengeRes);
    
    // Step 3: Verify signature on server
    const verifyRes = await fetch('https://workspace-omega-opal.vercel.app/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challenge_id: challengeRes.challenge.id,
        signature: signedEvent.sig,
        pubkey: userPublicKey,
        event: signedEvent
      })
    });

    if (!verifyRes.ok) {
      throw new Error('Authentication failed');
    }

    const result = await verifyRes.json();
    
    // Store JWT token
    localStorage.setItem('bitrent_token', result.token);
    localStorage.setItem('bitrent_pubkey', userPublicKey);
    
    console.log('✅ Authenticated:', userPublicKey);
    return result;
  } catch (error) {
    console.error('❌ Auth error:', error);
    throw error;
  }
}

/**
 * Get current user's public key
 */
export function getCurrentPubkey() {
  return userPublicKey || localStorage.getItem('bitrent_pubkey');
}

/**
 * Get stored JWT token
 */
export function getAuthToken() {
  return localStorage.getItem('bitrent_token');
}

/**
 * Logout
 */
export function logout() {
  userPublicKey = null;
  localStorage.removeItem('bitrent_token');
  localStorage.removeItem('bitrent_pubkey');
  console.log('✅ Logged out');
}

/**
 * Check if authenticated
 */
export function isAuthenticated() {
  return !!getAuthToken();
}
