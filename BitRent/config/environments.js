/**
 * BitRent Environment Configuration
 * Centralized configuration for all environments
 */

const environments = {
  development: {
    name: 'development',
    nodeEnv: 'development',
    logLevel: 'debug',
    api: {
      port: 3000,
      host: 'localhost',
      prefix: '/api/v1',
    },
    database: {
      url: process.env.DATABASE_URL || 'postgresql://bitrent:dev_password@localhost:5432/bitrent_dev',
      ssl: false,
      poolSize: 10,
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      prefix: 'bitrent:dev:',
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'dev_secret_key_change_in_production',
      expiresIn: '24h',
    },
    supabase: {
      url: process.env.SUPABASE_URL || 'http://localhost:8000',
      anonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
    },
    nwc: {
      relayUrl: process.env.NWC_RELAY_URL || '',
      testMode: true,
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_',
    },
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // requests per windowMs
    },
    cache: {
      ttl: 300, // 5 minutes
      enabled: true,
    },
  },

  staging: {
    name: 'staging',
    nodeEnv: 'production',
    logLevel: 'info',
    api: {
      port: 3000,
      host: '0.0.0.0',
      prefix: '/api/v1',
    },
    database: {
      url: process.env.DATABASE_URL || 'postgresql://bitrent_user:password@db-staging:5432/bitrent_staging',
      ssl: {
        rejectUnauthorized: false,
      },
      poolSize: 20,
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://redis-staging:6379',
      prefix: 'bitrent:staging:',
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: '24h',
    },
    supabase: {
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
      serviceKey: process.env.SUPABASE_SERVICE_KEY,
    },
    nwc: {
      relayUrl: process.env.NWC_RELAY_URL,
      testMode: false,
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    },
    cors: {
      origin: ['https://staging.bitrent.io'],
      credentials: true,
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 100,
    },
    cache: {
      ttl: 600, // 10 minutes
      enabled: true,
    },
  },

  production: {
    name: 'production',
    nodeEnv: 'production',
    logLevel: 'warn',
    api: {
      port: 3000,
      host: '0.0.0.0',
      prefix: '/api/v1',
    },
    database: {
      url: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: true,
      },
      poolSize: 50,
      idleTimeoutMillis: 30000,
    },
    redis: {
      url: process.env.REDIS_URL,
      prefix: 'bitrent:prod:',
      tls: {
        rejectUnauthorized: false,
      },
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: '24h',
    },
    supabase: {
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
      serviceKey: process.env.SUPABASE_SERVICE_KEY,
    },
    nwc: {
      relayUrl: process.env.NWC_RELAY_URL,
      testMode: false,
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    },
    cors: {
      origin: ['https://bitrent.io', 'https://www.bitrent.io'],
      credentials: true,
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 100, // Stricter in production
    },
    cache: {
      ttl: 1800, // 30 minutes
      enabled: true,
    },
    monitoring: {
      sentryDsn: process.env.SENTRY_DSN,
      datadog: {
        apiKey: process.env.DATADOG_API_KEY,
        site: 'datadoghq.com',
      },
    },
  },
};

/**
 * Get configuration for current environment
 */
function getConfig() {
  const env = process.env.NODE_ENV || 'development';
  const config = environments[env];

  if (!config) {
    throw new Error(`Unknown environment: ${env}`);
  }

  return config;
}

/**
 * Merge custom configuration with defaults
 */
function mergeConfig(customConfig) {
  const baseConfig = getConfig();
  return {
    ...baseConfig,
    ...customConfig,
  };
}

module.exports = {
  environments,
  getConfig,
  mergeConfig,
};
