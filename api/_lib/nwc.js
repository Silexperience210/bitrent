/**
 * Nostr Wallet Connect (NWC) - NIP-47 implementation
 * Makes real Lightning payments via WebSocket relay
 */
import WebSocket from 'ws'
import { finalizeEvent, getPublicKey, nip04 } from 'nostr-tools'
import crypto from 'crypto'

const NWC_TIMEOUT_MS = 12000  // Must be < frontend 15s timeout so errors surface properly

function hexToUint8Array(hex) {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return arr
}

function parseNWC(connectionString) {
  try {
    // nostr+walletconnect://<walletPubkey>?relay=<url>&secret=<hex>
    const withoutScheme = connectionString.replace('nostr+walletconnect://', 'https://')
    const url = new URL(withoutScheme)
    const walletPubkey = url.hostname
    const relay = url.searchParams.get('relay')
    const secret = url.searchParams.get('secret')
    if (!walletPubkey || !relay || !secret) {
      throw new Error('Missing walletPubkey, relay, or secret in NWC connection string')
    }
    return { walletPubkey, relay, secret }
  } catch (e) {
    throw new Error(`Invalid NWC connection string: ${e.message}`)
  }
}

/**
 * Send a NIP-47 request to the wallet and await the response.
 */
async function nwcRequest(method, params = {}) {
  const connStr = process.env.NWC_CONNECTION_STRING
  if (!connStr) throw new Error('NWC_CONNECTION_STRING is not configured')

  const { walletPubkey, relay, secret } = parseNWC(connStr)
  const clientPrivkey = hexToUint8Array(secret)
  const clientPubkey = getPublicKey(clientPrivkey)

  // Encrypt request payload with NIP-04
  const requestPayload = JSON.stringify({ method, params })
  const encryptedContent = await nip04.encrypt(secret, walletPubkey, requestPayload)

  // Build and sign the request event (kind 23194)
  const requestEvent = finalizeEvent({
    kind: 23194,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['p', walletPubkey]],
    content: encryptedContent,
  }, clientPrivkey)

  return new Promise((resolve, reject) => {
    let settled = false
    const ws = new WebSocket(relay)

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        ws.terminate()
        reject(new Error(`NWC timeout after ${NWC_TIMEOUT_MS}ms for method: ${method}`))
      }
    }, NWC_TIMEOUT_MS)

    ws.on('open', () => {
      // Subscribe for wallet response addressed to our pubkey, referencing our event
      const subId = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      ws.send(JSON.stringify([
        'REQ', subId,
        {
          kinds: [23195],
          authors: [walletPubkey],
          '#p': [clientPubkey],
          '#e': [requestEvent.id],
          limit: 1,
        }
      ]))

      // Publish our request
      ws.send(JSON.stringify(['EVENT', requestEvent]))
    })

    ws.on('message', async (data) => {
      if (settled) return
      try {
        const msg = JSON.parse(data.toString())
        if (msg[0] !== 'EVENT') return
        const event = msg[2]
        if (!event || event.kind !== 23195) return

        // Decrypt response
        const decrypted = await nip04.decrypt(secret, walletPubkey, event.content)
        const response = JSON.parse(decrypted)

        settled = true
        clearTimeout(timeout)
        ws.close()

        if (response.error) {
          reject(new Error(`NWC error [${response.error.code}]: ${response.error.message}`))
        } else {
          resolve(response.result)
        }
      } catch (err) {
        // Non-fatal parse errors on unrelated messages
        console.warn('[nwc] Message parse error:', err?.message)
      }
    })

    ws.on('error', (err) => {
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        ws.removeAllListeners()
        ws.terminate()
        reject(new Error(`NWC WebSocket error: ${err.message}`))
      }
    })
  })
}

/**
 * Create a Lightning invoice for the given amount in satoshis.
 * Returns { invoice: string, payment_hash: string }
 */
export async function makeInvoice(amountSats, description) {
  const result = await nwcRequest('make_invoice', {
    amount: amountSats * 1000, // NIP-47 uses millisatoshis
    description: description || 'BitRent miner rental',
  })
  if (!result?.invoice) throw new Error('Wallet did not return an invoice')
  return {
    invoice: result.invoice,
    payment_hash: result.payment_hash,
  }
}

/**
 * Check if a Lightning invoice has been paid.
 * Returns { paid: boolean, settled_at?: number }
 */
export async function lookupInvoice(paymentHash) {
  try {
    const result = await nwcRequest('lookup_invoice', { payment_hash: paymentHash })
    const paid = !!(result?.settled_at || result?.preimage)
    return { paid, settled_at: result?.settled_at ?? null }
  } catch {
    // Invoice not found or not paid yet — treat as unpaid
    return { paid: false }
  }
}
