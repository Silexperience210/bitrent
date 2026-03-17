/**
 * Data validation schemas
 */

export const schemas = {
  // User
  user: {
    create: {
      nostr_pubkey: 'required|string|min:60|max:66',
      display_name: 'string|max:255'
    },
    update: {
      display_name: 'string|max:255',
      role: 'string|in:admin,user'
    }
  },

  // Miner
  miner: {
    create: {
      name: 'required|string|max:255',
      model: 'string|max:100',
      serial_number: 'string|max:100',
      ip_address: 'string|max:45',
      hashrate: 'integer',
      power_consumption: 'integer',
      price_per_minute: 'required|integer|min:1',
      owner_id: 'required|uuid'
    },
    update: {
      name: 'string|max:255',
      status: 'string|in:online,offline,maintenance',
      price_per_minute: 'integer|min:1',
      hashrate: 'integer'
    }
  },

  // Rental
  rental: {
    create: {
      miner_id: 'required|uuid',
      client_id: 'required|uuid',
      start_time: 'required|date'
    },
    update: {
      status: 'string|in:pending,active,completed,cancelled',
      end_time: 'date'
    }
  },

  // Payment
  payment: {
    create: {
      rental_id: 'required|uuid',
      amount_sats: 'required|integer|min:1'
    },
    update: {
      status: 'string|in:pending,confirmed,failed,expired'
    }
  }
};

/**
 * Validate request data against schema
 */
export function validate(data, schema) {
  const errors = {};
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    const ruleList = rules.split('|');

    for (const rule of ruleList) {
      if (rule === 'required' && !value) {
        errors[field] = `${field} is required`;
      }
      if (rule === 'string' && value && typeof value !== 'string') {
        errors[field] = `${field} must be a string`;
      }
      if (rule === 'integer' && value && !Number.isInteger(value)) {
        errors[field] = `${field} must be an integer`;
      }
      if (rule === 'date' && value && isNaN(new Date(value).getTime())) {
        errors[field] = `${field} must be a valid date`;
      }
      if (rule === 'uuid' && value && !isValidUUID(value)) {
        errors[field] = `${field} must be a valid UUID`;
      }

      const minMatch = rule.match(/^min:(\d+)$/);
      if (minMatch && value && (value.toString().length < parseInt(minMatch[1]))) {
        errors[field] = `${field} must be at least ${minMatch[1]} characters`;
      }

      const maxMatch = rule.match(/^max:(\d+)$/);
      if (maxMatch && value && (value.toString().length > parseInt(maxMatch[1]))) {
        errors[field] = `${field} must be at most ${maxMatch[1]} characters`;
      }

      const inMatch = rule.match(/^in:(.+)$/);
      if (inMatch && value) {
        const allowedValues = inMatch[1].split(',');
        if (!allowedValues.includes(value)) {
          errors[field] = `${field} must be one of: ${allowedValues.join(', ')}`;
        }
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
