/**
 * lnurl.js — LNURL-auth helpers for BitRent
 *
 * Exports:
 *   toLnurl(url)            → bech32-encoded LNURL1... string
 *   verifyLnauthSig(k1, sig, key) → bool — secp256k1 DER signature check
 */
import { secp256k1 } from '@noble/curves/secp256k1'

// ── Minimal inline bech32 encoder (no extra dep) ───────────────────────────────
const B32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'
const B32_GEN     = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]

function _polymod(v) {
  let c = 1
  for (const x of v) {
    const t = c >> 25
    c = ((c & 0x1ffffff) << 5) ^ x
    for (let i = 0; i < 5; i++) if ((t >> i) & 1) c ^= B32_GEN[i]
  }
  return c
}

function _hrpExpand(hrp) {
  const r = [...hrp].map(c => c.charCodeAt(0) >> 5)
  r.push(0)
  return r.concat([...hrp].map(c => c.charCodeAt(0) & 31))
}

function _convertBits(data, from, to) {
  let acc = 0, bits = 0
  const ret = [], maxv = (1 << to) - 1
  for (const v of data) {
    acc = (acc << from) | v
    bits += from
    while (bits >= to) { bits -= to; ret.push((acc >>> bits) & maxv) }
  }
  if (bits > 0) ret.push((acc << (to - bits)) & maxv)
  return ret
}

/**
 * Encode a URL as a LNURL1… bech32 string (uppercase).
 * @param {string} url
 * @returns {string}
 */
export function toLnurl(url) {
  const hrp  = 'lnurl'
  const data = _convertBits(Buffer.from(url, 'utf8'), 8, 5)
  const chk  = _polymod([..._hrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0]) ^ 1
  const checksum = [5, 4, 3, 2, 1, 0].map(p => (chk >> (5 * p)) & 31)
  return (hrp + '1' + [...data, ...checksum].map(d => B32_CHARSET[d]).join('')).toUpperCase()
}

/**
 * Verify a LNURL-auth secp256k1 DER signature.
 * @param {string} k1  — 64-char hex (the challenge)
 * @param {string} sig — DER-encoded signature from wallet (hex)
 * @param {string} key — 66-char compressed pubkey from wallet (hex)
 * @returns {boolean}
 */
export function verifyLnauthSig(k1, sig, key) {
  try {
    const sigObj = secp256k1.Signature.fromDER(sig)
    return secp256k1.verify(sigObj, Buffer.from(k1, 'hex'), key)
  } catch {
    return false
  }
}
