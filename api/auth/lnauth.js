/**
 * LNURL-auth — single handler for all 4 flows (1 Vercel function)
 *
 * Routing via query params (all GET):
 *   ?                           → START    — generate k1 + LNURL, return { k1, lnurl }
 *   ?tag=login&k1=              → METADATA — wallet fetches LNURL-auth params (LUD-04 step 2)
 *   ?k1=&sig=&key=              → CALLBACK — wallet sends signed challenge
 *   ?k1=                        → STATUS   — client polls until authenticated, returns JWT
 *
 * Supabase table required:
 *   lnauth_sessions (k1 char(64) PK, lnauth_key varchar(66), authenticated bool, expires_at timestamptz)
 */
import crypto from 'crypto'
import { supabase }         from '../_lib/supabase.js'
import { setCors }           from '../_lib/cors.js'
import { sign }              from '../_lib/jwt.js'
import { toLnurl, verifyLnauthSig } from '../_lib/lnurl.js'

const SESSION_TTL_MS = 10 * 60 * 1000   // 10 minutes
const ADMIN_PUBKEYS  = new Set(
  (process.env.ADMIN_PUBKEYS || '').split(',').map(s => s.trim()).filter(Boolean)
)

function getHost(req) {
  return process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`
}

export default async function handler(req, res) {
  if (setCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { k1, sig, key, tag } = req.query

  // LNURL-auth spec LUD-04: wallet fetches the encoded URL → must return metadata JSON
  if (k1 && tag === 'login' && !sig && !key) return handleMetadata(req, res, k1)
  if (k1 && sig && key)                      return handleCallback(req, res, k1, sig, key)
  if (k1)                                    return handleStatus(req, res, k1)
  return handleStart(req, res)
}

// ── START ─────────────────────────────────────────────────────────────────────
// Generate k1, store in Supabase, return { k1, lnurl }
async function handleStart(req, res) {
  try {
    const k1 = crypto.randomBytes(32).toString('hex')

    const host  = getHost(req)
    const callbackUrl = `${host}/api/auth/lnauth?tag=login&k1=${k1}&action=login`
    const lnurl = toLnurl(callbackUrl)

    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

    // Purge stale sessions first
    await supabase
      .from('lnauth_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString())

    const { error } = await supabase.from('lnauth_sessions').insert({
      k1,
      authenticated: false,
      expires_at:    expiresAt,
    })

    if (error) {
      console.error('[lnauth/start] DB error:', error.message)
      return res.status(500).json({ error: 'Failed to create session' })
    }

    return res.status(200).json({ k1, lnurl })
  } catch (err) {
    console.error('[lnauth/start] error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// ── METADATA ──────────────────────────────────────────────────────────────────
// LUD-04 step 2: wallet decoded the LNURL and GETs the URL.
// Must return { tag, k1, callback, domain } so the wallet knows where to send the sig.
async function handleMetadata(req, res, k1) {
  res.setHeader('Content-Type', 'application/json')
  try {
    // Verify session exists and is not expired
    const { data: session, error } = await supabase
      .from('lnauth_sessions')
      .select('k1')
      .eq('k1', k1)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !session) {
      return res.status(200).json({ status: 'ERROR', reason: 'Unknown or expired challenge' })
    }

    const host     = getHost(req)
    const callback = `${host}/api/auth/lnauth`
    const domain   = new URL(host).hostname

    return res.status(200).json({ tag: 'login', k1, callback, domain })
  } catch (err) {
    console.error('[lnauth/metadata] error:', err)
    return res.status(200).json({ status: 'ERROR', reason: 'Internal error' })
  }
}

// ── CALLBACK ──────────────────────────────────────────────────────────────────
// Called by Lightning wallet after user approves. Must return { status: 'OK' }.
async function handleCallback(req, res, k1, sig, key) {
  // LNURL-auth spec: always respond with application/json
  res.setHeader('Content-Type', 'application/json')
  try {
    // Fetch session
    const { data: session, error: fetchErr } = await supabase
      .from('lnauth_sessions')
      .select('k1, authenticated, expires_at')
      .eq('k1', k1)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (fetchErr || !session) {
      return res.status(200).json({ status: 'ERROR', reason: 'Unknown or expired challenge' })
    }

    if (session.authenticated) {
      // Already authenticated (duplicate callback) — treat as OK
      return res.status(200).json({ status: 'OK' })
    }

    // Verify secp256k1 DER signature
    if (!verifyLnauthSig(k1, sig, key)) {
      return res.status(200).json({ status: 'ERROR', reason: 'Invalid signature' })
    }

    // Mark session as authenticated, store the wallet pubkey
    const { error: updateErr } = await supabase
      .from('lnauth_sessions')
      .update({ authenticated: true, lnauth_key: key })
      .eq('k1', k1)

    if (updateErr) {
      console.error('[lnauth/callback] update error:', updateErr.message)
      return res.status(200).json({ status: 'ERROR', reason: 'DB update failed' })
    }

    return res.status(200).json({ status: 'OK' })
  } catch (err) {
    console.error('[lnauth/callback] error:', err)
    return res.status(200).json({ status: 'ERROR', reason: 'Internal error' })
  }
}

// ── STATUS ────────────────────────────────────────────────────────────────────
// Client polls this. Returns { authenticated: false } or { authenticated: true, token, user }
async function handleStatus(req, res) {
  try {
    const { data: session, error } = await supabase
      .from('lnauth_sessions')
      .select('authenticated, lnauth_key, expires_at')
      .eq('k1', req.query.k1)
      .single()

    if (error || !session) {
      return res.status(404).json({ error: 'Session not found or expired' })
    }

    if (new Date(session.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Session expired' })
    }

    if (!session.authenticated) {
      return res.status(200).json({ authenticated: false })
    }

    // Session authenticated — create/upsert user and issue JWT
    // LNAUTH key = 33-byte compressed pubkey (66 hex). Strip parity prefix → 64-char.
    const rawKey = session.lnauth_key
    const pubkey = rawKey.length === 66 ? rawKey.slice(2) : rawKey
    const isAdmin = ADMIN_PUBKEYS.has(pubkey)

    const { data: user, error: upsertErr } = await supabase
      .from('users')
      .upsert(
        { pubkey_nostr: pubkey, role: isAdmin ? 'admin' : 'user', updated_at: new Date().toISOString() },
        { onConflict: 'pubkey_nostr' }
      )
      .select('id, pubkey_nostr, role')
      .single()

    if (upsertErr) {
      console.error('[lnauth/status] upsert error:', upsertErr.message)
      return res.status(500).json({ error: 'Failed to create user' })
    }

    // Delete consumed session
    await supabase.from('lnauth_sessions').delete().eq('k1', req.query.k1)

    const token = sign({ pubkey, is_admin: isAdmin, user_id: user.id })

    return res.status(200).json({
      authenticated: true,
      token,
      user: { id: user.id, pubkey: user.pubkey_nostr, role: user.role, is_admin: isAdmin },
    })
  } catch (err) {
    console.error('[lnauth/status] error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
