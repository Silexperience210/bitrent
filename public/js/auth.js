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
  isLoggedIn() { return !!this.getToken() },
  isAdmin() { return this.getUser()?.is_admin === true },

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
        'No Nostr extension found.\n\nInstall the Alby browser extension (getalby.com) or nos2x to continue.'
      )
    }

    // 1. Get pubkey from extension
    const pubkey = await window.nostr.getPublicKey()

    // 2. Request challenge from backend
    const { challenge } = await api.post('/api/auth/challenge', { pubkey })

    // 3. Build NIP-98 HTTP Auth event
    const eventTemplate = {
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['u', window.location.origin + '/api/auth/verify'],
        ['method', 'POST'],
      ],
      content: challenge,
    }

    // 4. Sign with wallet (extension fills id + sig + pubkey)
    const signedEvent = await window.nostr.signEvent(eventTemplate)

    if (!signedEvent?.sig) throw new Error('Wallet did not return a signature')

    // 5. Exchange for JWT
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
