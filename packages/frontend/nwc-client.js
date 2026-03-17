/**
 * Nostr Wallet Connect (NWC) Client
 * Real Lightning Network payments via NWC
 */

const NWC_RELAYS = [
  'wss://relay.getalby.com/v1',
  'wss://relay.mutinywallet.com',
  'wss://nos.lol'
];

let nwcConnection = null;
let walletPubkey = null;

/**
 * Initialize NWC connection
 * Requires NWC connection string: nostr+walletconnect://...
 */
export async function initNWC(nwcConnectionString) {
  try {
    if (!nwcConnectionString) {
      throw new Error('NWC connection string required');
    }

    // Parse NWC connection string
    const url = new URL(nwcConnectionString);
    const walletPubkeyParam = url.searchParams.get('relay');
    
    if (!walletPubkeyParam) {
      throw new Error('Invalid NWC connection string');
    }

    walletPubkey = walletPubkeyParam;
    console.log('✅ NWC initialized:', walletPubkey.substring(0, 16) + '...');
    return true;
  } catch (error) {
    console.error('❌ NWC init failed:', error);
    return false;
  }
}

/**
 * Create NWC pay_invoice request
 * Sends payment via Nostr Wallet Connect
 */
export async function payWithNWC(invoice) {
  if (!window.nostr || !walletPubkey) {
    throw new Error('NWC not initialized or wallet unavailable');
  }

  try {
    // Create NWC pay_invoice event (kind 23194)
    const payEvent = {
      kind: 23194,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['method', 'pay_invoice'],
        ['invoice', invoice],
        ['result_type', 'pay_invoice']
      ],
      content: '',
      pubkey: localStorage.getItem('bitrent_pubkey')
    };

    console.log('🔐 Signing NWC request...');
    const signedEvent = await window.nostr.signEvent(payEvent);
    
    console.log('📡 Sending to NWC relay...');
    const result = await publishToNWCRelay(signedEvent);
    
    if (result.success) {
      console.log('✅ Payment sent to wallet:', result.preimage);
      return {
        success: true,
        preimage: result.preimage,
        status: 'sent'
      };
    } else {
      throw new Error(result.error || 'Payment failed');
    }
  } catch (error) {
    console.error('❌ NWC payment failed:', error);
    throw error;
  }
}

/**
 * Publish event to NWC relay and get response
 */
async function publishToNWCRelay(signedEvent) {
  return new Promise((resolve, reject) => {
    let connected = false;
    let timeout = setTimeout(() => {
      reject(new Error('NWC relay timeout'));
    }, 30000);

    // Try each relay
    NWC_RELAYS.forEach(relayUrl => {
      const ws = new WebSocket(relayUrl);

      ws.onopen = () => {
        connected = true;
        console.log('📡 Connected to NWC relay:', relayUrl);
        ws.send(JSON.stringify(['EVENT', signedEvent]));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        // Listen for response events (kind 23195)
        if (message[0] === 'EVENT' && message[2].kind === 23195) {
          clearTimeout(timeout);
          const response = JSON.parse(message[2].content);
          
          if (response.result_type === 'pay_invoice' && response.result.preimage) {
            resolve({
              success: true,
              preimage: response.result.preimage
            });
            ws.close();
          }
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    });
  });
}

/**
 * Get wallet balance via NWC
 */
export async function getWalletBalance() {
  if (!window.nostr) {
    throw new Error('Wallet not available');
  }

  try {
    const balanceEvent = {
      kind: 23194,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['method', 'get_balance']
      ],
      content: '',
      pubkey: localStorage.getItem('bitrent_pubkey')
    };

    const signedEvent = await window.nostr.signEvent(balanceEvent);
    const result = await publishToNWCRelay(signedEvent);
    
    return result.balance || 0;
  } catch (error) {
    console.error('❌ Failed to get balance:', error);
    return 0;
  }
}

/**
 * Pay invoice with automatic retry
 */
export async function payWithRetry(invoice, maxAttempts = 3) {
  let lastError;
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      console.log(`💳 Payment attempt ${i + 1}/${maxAttempts}...`);
      const result = await payWithNWC(invoice);
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Attempt ${i + 1} failed:`, error.message);
      
      if (i < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, 2000)); // Wait 2s before retry
      }
    }
  }
  
  throw lastError;
}

/**
 * Check if NWC is available
 */
export function isNWCAvailable() {
  return !!(window.nostr && walletPubkey);
}
