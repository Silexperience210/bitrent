/**
 * api.js — Fetch wrapper with automatic JWT attachment
 */
window.api = {
  async request(path, options = {}) {
    const token = localStorage.getItem(CONFIG.TOKEN_KEY)
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(CONFIG.API_BASE + path, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const err = new Error(data.error || `HTTP ${res.status}`)
      err.status = res.status
      throw err
    }
    return data
  },

  get(path) { return this.request(path, { method: 'GET' }) },
  post(path, body) { return this.request(path, { method: 'POST', body }) },
  patch(path, body) { return this.request(path, { method: 'PATCH', body }) },
  delete(path) { return this.request(path, { method: 'DELETE' }) },
}
