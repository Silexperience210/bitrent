// Auto-detect API base (same origin on Vercel, localhost for dev)
window.CONFIG = {
  API_BASE: window.location.hostname === 'localhost' ? 'http://localhost:3000' : '',
  TOKEN_KEY: 'br_token',
  USER_KEY: 'br_user',
  POLL_MS: 3000,
}
