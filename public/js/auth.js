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

  // ── LNURL-auth ─────────────────────────────────────────────────────────────

  /** Request a new LNAUTH challenge. Returns { k1, lnurl }. */
  async startLnauth() {
    return api.get('/api/auth/lnauth')
  },

  /**
   * Poll until Lightning wallet confirms login.
   * @param {string} k1  challenge from startLnauth()
   * @returns {Promise<user>}
   */
  waitLnauth(k1) {
    return new Promise((resolve, reject) => {
      let attempts = 0
      const MAX = 150  // 5 min @ 2s intervals

      const poll = async () => {
        try {
          const data = await api.get(`/api/auth/lnauth?k1=${encodeURIComponent(k1)}`)
          if (data.authenticated) {
            this.setSession(data.token, data.user)
            resolve(data.user)
          } else if (++attempts >= MAX) {
            reject(new Error('LNAUTH timed out — please try again.'))
          } else {
            setTimeout(poll, 2000)
          }
        } catch (e) {
          // 404 = session gone/expired
          if (e.message?.includes('404') || e.message?.includes('expired')) {
            reject(new Error('Session expired — please try again.'))
          } else if (++attempts >= MAX) {
            reject(new Error('LNAUTH timed out — please try again.'))
          } else {
            setTimeout(poll, 2000)
          }
        }
      }

      setTimeout(poll, 1000) // first check after 1s
    })
  },

  // ── NIP-07 login ───────────────────────────────────────────────────────────

  async login() {
    if (!window.nostr) {
      throw new Error(
        'Nostr extension not detected. If you just installed Alby, ' +
        'please refresh this page and try again.'
      )
    }

    let pubkey
    try {
      pubkey = await window.nostr.getPublicKey()
    } catch (e) {
      const detail = e?.message || e?.toString() || ''
      throw new Error(detail
        ? `Extension error: ${detail}`
        : 'Could not get public key. Make sure your extension has allowed this site (check extension settings).'
      )
    }

    if (!pubkey) {
      throw new Error('Extension returned no public key. Try clicking the extension icon and connecting it to this site.')
    }
    if (!/^[0-9a-f]{64}$/i.test(pubkey)) {
      throw new Error(`Invalid public key format: "${pubkey.slice(0, 20)}…"`)
    }
    pubkey = pubkey.toLowerCase()

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
