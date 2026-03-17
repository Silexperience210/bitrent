// BitRent Frontend Configuration
export const API_URL = 'https://workspace-omega-opal.vercel.app/api';
export const API_ENDPOINTS = {
  health: `${API_URL}/health`,
  auth: {
    challenge: `${API_URL}/auth/challenge`,
    verify: `${API_URL}/auth/verify`,
    profile: `${API_URL}/auth/profile`,
    logout: `${API_URL}/auth/logout`
  },
  mineurs: {
    list: `${API_URL}/mineurs`,
    detail: (id) => `${API_URL}/mineurs/${id}`
  },
  rentals: {
    list: `${API_URL}/rentals`,
    create: `${API_URL}/rentals`,
    detail: (id) => `${API_URL}/rentals/${id}`
  },
  payments: {
    create: `${API_URL}/payments`,
    verify: `${API_URL}/payments/verify`,
    list: `${API_URL}/payments`
  }
};

// Helper function to make API calls
export async function apiCall(url, options = {}) {
  const token = localStorage.getItem('bitrent_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

// Nostr-specific functions
export async function getNostrChallenge() {
  return apiCall(API_ENDPOINTS.auth.challenge, { method: 'POST' });
}

export async function verifyNostrSignature(challenge, signature, pubkey) {
  return apiCall(API_ENDPOINTS.auth.verify, {
    method: 'POST',
    body: JSON.stringify({
      challenge,
      signature,
      pubkey
    })
  });
}

// Miner functions
export async function getMiners() {
  return apiCall(API_ENDPOINTS.mineurs.list);
}

export async function getMinerDetail(id) {
  return apiCall(API_ENDPOINTS.mineurs.detail(id));
}

// Rental functions
export async function getRentals() {
  return apiCall(API_ENDPOINTS.rentals.list);
}

export async function createRental(minerId, durationMinutes) {
  return apiCall(API_ENDPOINTS.rentals.create, {
    method: 'POST',
    body: JSON.stringify({
      miner_id: minerId,
      duration_minutes: durationMinutes
    })
  });
}

// Payment functions
export async function createPayment(rentalId, amountSats) {
  return apiCall(API_ENDPOINTS.payments.create, {
    method: 'POST',
    body: JSON.stringify({
      rental_id: rentalId,
      amount_sats: amountSats
    })
  });
}

export async function verifyPayment(invoiceHash) {
  return apiCall(API_ENDPOINTS.payments.verify, {
    method: 'POST',
    body: JSON.stringify({ invoice_hash: invoiceHash })
  });
}
