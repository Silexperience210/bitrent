import { verifySignature } from 'nostr-tools';

/**
 * Verify a Nostr NIP-98 HTTP Auth signature
 * Expects: Authorization header with format "Nostr <base64-encoded-event>"
 */
export function verifyNostrAuth(authHeader, method, path, body = '') {
  if (!authHeader || !authHeader.startsWith('Nostr ')) {
    throw new Error('Invalid authorization header format');
  }

  try {
    const eventString = Buffer.from(
      authHeader.slice(6),
      'base64'
    ).toString('utf-8');
    
    const event = JSON.parse(eventString);

    // Verify signature
    if (!verifySignature(event)) {
      throw new Error('Invalid signature');
    }

    // Verify it's an http auth event (kind 27235)
    if (event.kind !== 27235) {
      throw new Error('Invalid event kind - expected 27235 (http auth)');
    }

    // Verify tags contain required fields
    const methodTag = event.tags.find(t => t[0] === 'method')?.[1];
    const uTag = event.tags.find(t => t[0] === 'u')?.[1];
    const payloadTag = event.tags.find(t => t[0] === 'payload')?.[1];

    if (!methodTag || !uTag) {
      throw new Error('Missing required tags in auth event');
    }

    if (methodTag !== method) {
      throw new Error(`Method mismatch: expected ${method}, got ${methodTag}`);
    }

    if (uTag !== `${path}`) {
      throw new Error(`Path mismatch: expected ${path}, got ${uTag}`);
    }

    // Verify timestamp is recent (within 5 minutes)
    const eventTime = event.created_at * 1000;
    const now = Date.now();
    const timeDiff = now - eventTime;

    if (timeDiff > 5 * 60 * 1000 || timeDiff < -5 * 60 * 1000) {
      throw new Error('Event timestamp too old or in future');
    }

    return {
      valid: true,
      pubkey: event.pubkey,
      event
    };
  } catch (error) {
    throw new Error(`Nostr auth verification failed: ${error.message}`);
  }
}

/**
 * Extract pubkey from Nostr auth header
 */
export function extractNostrPubkey(authHeader) {
  const result = verifyNostrAuth(authHeader, 'GET', '/');
  return result.pubkey;
}

/**
 * Middleware for Express to verify Nostr auth
 */
export function nostrAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Missing authorization header',
        code: 'NO_AUTH_HEADER'
      });
    }

    const result = verifyNostrAuth(
      authHeader,
      req.method,
      req.path,
      req.body ? JSON.stringify(req.body) : ''
    );

    // Attach user info to request
    req.user = {
      nostrPubkey: result.pubkey,
      event: result.event
    };

    next();
  } catch (error) {
    res.status(401).json({
      error: error.message,
      code: 'INVALID_NOSTR_AUTH'
    });
  }
}
