/**
 * auth.js — Nostr NIP-98 authentication
 * Requires window.nostr (Alby / nos2x / any NIP-07 extension)
 */
window.Auth = {
  getToken() { return localStorage.getItem(CONFIG.TOKEN_KEY) },

  getUser() {
    try { return JSON.parse(localStorage.getItem(CONFIG.USER_KEY)) }
    catch { return null }
  },

  // Check if JWT token is present and not expired
  isLoggedIn() {
    const token = this.getToken()
    if (!token) return false
    // Decode JWT payload (base64url, no crypto needed — just check exp)
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        this.clearSession() // expired
        return false
      }
    } catch {
      // Malformed token — treat as logged out
      return false
    }
    return true
  },

  isAdmin() { return this.getUser()?.is_admin === true },

  // Check if a Nostr extension is available
  hasNostrExtension() { return !!(window.nostr) },

  setSession(token, user) {
    localStorage.setItem(CONFIG.TOKEN_KEY, token)
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user))
  },

  clearSession() {
    localStorage.removeItem(CONFIG.TOKEN_KEY)
    localStorage.removeItem(CONFIG.USER_KEY)
  },

  async login() {
    if (!window.nostr) {
      throw new Error(
        'No Nostr extension found. Install Alby (getalby.com) or nos2x to continue.'
      )
    }

    let pubkey
    try {
      pubkey = await window.nostr.getPublicKey()
    } catch (e) {
      throw new Error('Could not get public key from extension. Did you approve the request?')
    }

    if (!pubkey || !/^[0-9a-f]{64}$/.test(pubkey)) {
      throw new Error('Invalid public key returned by extension.')
    }

    // Request challenge from backend
    const { challenge } = await api.post('/api/auth/challenge', { pubkey })

    // Build NIP-98 HTTP Auth event (kind 27235)
    const eventTemplate = {
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['u', window.location.origin + '/api/auth/verify'],
        ['method', 'POST'],
      ],
      content: challenge,
    }

    let signedEvent
    try {
      signedEvent = await window.nostr.signEvent(eventTemplate)
    } catch (e) {
      throw new Error('Signing was rejected or cancelled.')
    }

    if (!signedEvent?.sig) throw new Error('Extension did not return a signature.')

    // Exchange signed event for JWT
    const { token, user } = await api.post('/api/auth/verify', { event: signedEvent })

    this.setSession(token, user)
    return user
  },

  logout() {
    this.clearSession()
    window.location.href = '/'
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/'
      return false
    }
    return true
  },

  requireAdmin() {
    if (!this.requireAuth()) return false
    if (!this.isAdmin()) {
      window.location.href = '/dashboard.html'
      return false
    }
    return true
  },
}
