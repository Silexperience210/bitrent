import Joi from 'joi';
import { AppError } from './errorHandler.js';

export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((err) => err.message).join(', ');
      return next(new AppError(`Validation error: ${messages}`, 400));
    }

    req.body = value;
    next();
  };
};

// Validation schemas
export const schemas = {
  // Auth
  nostrChallenge: Joi.object({
    pubkey: Joi.string().hex().length(64).required(),
  }),

  nostrVerify: Joi.object({
    challenge: Joi.string().required(),
    signature: Joi.string().hex().length(128).required(),
    pubkey: Joi.string().hex().length(64).required(),
    timestamp: Joi.number().integer().required(),
  }),

  // Mineurs
  createMineur: Joi.object({
    ip: Joi.string().ip().required(),
    hashrate: Joi.number().positive().required(),
    model: Joi.string().required(),
    price_per_hour_sats: Joi.number().positive().required(),
  }),

  updateMineur: Joi.object({
    ip: Joi.string().ip(),
    hashrate: Joi.number().positive(),
    model: Joi.string(),
    price_per_hour_sats: Joi.number().positive(),
    status: Joi.string().valid('active', 'inactive', 'maintenance'),
  }),

  // Rentals
  createRental: Joi.object({
    mineur_id: Joi.string().uuid().required(),
    duration_hours: Joi.number().integer().positive().required(),
  }),

  // Payments
  verifyPayment: Joi.object({
    invoice_hash: Joi.string().required(),
  }),
};

export default {
  validate,
  schemas,
};
