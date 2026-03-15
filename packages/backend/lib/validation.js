/**
 * Input Validation for Vercel API Routes
 * Simple validation helper functions
 */

/**
 * Validate challenge request
 */
export function validateChallengeRequest(body) {
  const errors = [];

  if (!body.pubkey) {
    errors.push('pubkey is required');
  } else if (typeof body.pubkey !== 'string' || !/^[0-9a-f]{64}$/i.test(body.pubkey)) {
    errors.push('pubkey must be a 64-character hex string');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate verify signature request
 */
export function validateVerifyRequest(body) {
  const errors = [];

  if (!body.challenge) {
    errors.push('challenge is required');
  } else if (typeof body.challenge !== 'string') {
    errors.push('challenge must be a string');
  }

  if (!body.signature) {
    errors.push('signature is required');
  } else if (typeof body.signature !== 'string' || !/^[0-9a-f]{128}$/i.test(body.signature)) {
    errors.push('signature must be a 128-character hex string');
  }

  if (!body.pubkey) {
    errors.push('pubkey is required');
  } else if (typeof body.pubkey !== 'string' || !/^[0-9a-f]{64}$/i.test(body.pubkey)) {
    errors.push('pubkey must be a 64-character hex string');
  }

  if (!body.timestamp) {
    errors.push('timestamp is required');
  } else if (typeof body.timestamp !== 'number' || body.timestamp <= 0) {
    errors.push('timestamp must be a positive number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate rental request
 */
export function validateRentalRequest(body) {
  const errors = [];

  if (!body.miner_id) {
    errors.push('miner_id is required');
  }

  if (!body.duration_hours || typeof body.duration_hours !== 'number' || body.duration_hours <= 0) {
    errors.push('duration_hours must be a positive number');
  }

  if (body.duration_hours > 168) { // 7 days max
    errors.push('duration_hours cannot exceed 168 (7 days)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate miner update request
 */
export function validateMinerUpdateRequest(body) {
  const errors = [];

  if (body.status && !['active', 'inactive', 'maintenance'].includes(body.status)) {
    errors.push('status must be one of: active, inactive, maintenance');
  }

  if (body.price_per_hour_sats && (typeof body.price_per_hour_sats !== 'number' || body.price_per_hour_sats <= 0)) {
    errors.push('price_per_hour_sats must be a positive number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate payment verification request
 */
export function validatePaymentVerifyRequest(body) {
  const errors = [];

  if (!body.payment_hash) {
    errors.push('payment_hash is required');
  }

  if (!body.invoice) {
    errors.push('invoice is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  validateChallengeRequest,
  validateVerifyRequest,
  validateRentalRequest,
  validateMinerUpdateRequest,
  validatePaymentVerifyRequest,
};
