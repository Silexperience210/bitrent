/**
 * Lightning Network Payments via NWC (Nostr Wallet Connect)
 */

const API_URL = 'https://workspace-omega-opal.vercel.app/api';

/**
 * Create a rental and get payment invoice
 */
export async function createRental(minerId, durationMinutes) {
  const token = localStorage.getItem('bitrent_token');
  
  const response = await fetch(`${API_URL}/rentals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      miner_id: minerId,
      duration_minutes: durationMinutes
    })
  });

  if (!response.ok) {
    throw new Error(`Rental creation failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create payment invoice for rental
 */
export async function createPaymentInvoice(rentalId, amountSats) {
  const token = localStorage.getItem('bitrent_token');

  const response = await fetch(`${API_URL}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      rental_id: rentalId,
      amount_sats: amountSats
    })
  });

  if (!response.ok) {
    throw new Error(`Payment creation failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data; // { invoice_hash, amount_sats, expires_at }
}

/**
 * Pay Lightning invoice via NWC
 * Requires NWC connection string in wallet
 */
export async function payLightningInvoice(invoice) {
  if (!window.nostr) {
    throw new Error('Nostr wallet not available');
  }

  try {
    // Create NWC pay request (kind 23194)
    const payEvent = {
      kind: 23194, // NWC pay_invoice
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['method', 'pay_invoice'],
        ['invoice', invoice]
      ],
      content: '',
      pubkey: localStorage.getItem('bitrent_pubkey')
    };

    // Sign payment request
    const signedPayEvent = await window.nostr.signEvent(payEvent);
    
    console.log('✅ Payment signed and sent to wallet');
    return {
      success: true,
      event: signedPayEvent
    };
  } catch (error) {
    console.error('❌ Payment failed:', error);
    throw error;
  }
}

/**
 * Verify payment status
 */
export async function verifyPayment(invoiceHash) {
  const token = localStorage.getItem('bitrent_token');

  const response = await fetch(`${API_URL}/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ invoice_hash: invoiceHash })
  });

  if (!response.ok) {
    throw new Error('Payment verification failed');
  }

  return response.json();
}

/**
 * Complete rental payment flow
 * 1. Create rental
 * 2. Get invoice
 * 3. Pay via NWC
 * 4. Verify payment
 */
export async function completeRentalPaymentFlow(minerId, durationMinutes, amountSats) {
  console.log('🚀 Starting rental payment flow...');
  
  try {
    // Step 1: Create rental
    console.log('📝 Creating rental...');
    const rentalRes = await createRental(minerId, durationMinutes);
    const rentalId = rentalRes.data.id;
    console.log('✅ Rental created:', rentalId);

    // Step 2: Create payment invoice
    console.log('💳 Creating invoice...');
    const paymentData = await createPaymentInvoice(rentalId, amountSats);
    const invoiceHash = paymentData.invoice_hash;
    console.log('✅ Invoice created:', invoiceHash);

    // Step 3: Pay invoice
    console.log('⚡ Paying invoice via Lightning...');
    await payLightningInvoice(paymentData.invoice);
    console.log('✅ Payment sent');

    // Step 4: Verify payment (poll for confirmation)
    console.log('🔍 Verifying payment...');
    let paymentVerified = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 * 2s = 60s timeout

    while (!paymentVerified && attempts < maxAttempts) {
      const verifyRes = await verifyPayment(invoiceHash);
      
      if (verifyRes.data.status === 'confirmed') {
        paymentVerified = true;
        console.log('✅ Payment confirmed!');
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`⏳ Waiting for payment... (${attempts}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
        }
      }
    }

    if (!paymentVerified) {
      throw new Error('Payment timeout - invoice not confirmed');
    }

    console.log('🎉 Rental payment completed!');
    return {
      success: true,
      rentalId,
      invoiceHash,
      amountSats
    };
  } catch (error) {
    console.error('❌ Rental payment flow failed:', error);
    throw error;
  }
}

/**
 * Format sats amount with thousands separator
 */
export function formatSats(sats) {
  return sats.toLocaleString('en-US');
}

/**
 * Calculate rental cost
 */
export function calculateRentalCost(pricePerMinute, durationMinutes) {
  return pricePerMinute * durationMinutes;
}
