/**
 * Test Data Fixtures
 * BitRent Phase 4: Testing & Quality Assurance
 */

export const testUsers = {
  admin: {
    id: 'user_admin_001',
    publicKey: 'npub1admin00000000000000000000000000000000000000000000000',
    email: 'admin@bitrent.test',
    role: 'admin',
    createdAt: new Date('2025-01-01'),
  },
  client1: {
    id: 'user_client_001',
    publicKey: 'npub1client0000000000000000000000000000000000000000000000',
    email: 'client1@bitrent.test',
    role: 'client',
    createdAt: new Date('2025-01-15'),
  },
  client2: {
    id: 'user_client_002',
    publicKey: 'npub1client0000000000000000000000000000000000000000000001',
    email: 'client2@bitrent.test',
    role: 'client',
    createdAt: new Date('2025-02-01'),
  },
};

export const testMineurs = [
  {
    id: 'miner_001',
    name: 'BitAxe#1',
    modelId: 'bitaxe-ultra',
    macAddress: 'AA:BB:CC:DD:EE:01',
    hashRate: 520,
    powerConsumption: 25,
    location: 'DataCenter-A',
    rentalPrice: 0.00025, // BTC per hour
    status: 'available',
    ownerId: testUsers.admin.id,
    createdAt: new Date('2025-01-10'),
  },
  {
    id: 'miner_002',
    name: 'BitAxe#2',
    modelId: 'bitaxe-ultra',
    macAddress: 'AA:BB:CC:DD:EE:02',
    hashRate: 520,
    powerConsumption: 25,
    location: 'DataCenter-A',
    rentalPrice: 0.00025,
    status: 'rented',
    ownerId: testUsers.admin.id,
    createdAt: new Date('2025-01-10'),
  },
  {
    id: 'miner_003',
    name: 'BitAxe#3',
    modelId: 'bitaxe-plus',
    macAddress: 'AA:BB:CC:DD:EE:03',
    hashRate: 260,
    powerConsumption: 15,
    location: 'DataCenter-B',
    rentalPrice: 0.00015,
    status: 'available',
    ownerId: testUsers.admin.id,
    createdAt: new Date('2025-01-20'),
  },
];

export const testRentals = [
  {
    id: 'rental_001',
    minerId: testMineurs[0].id,
    clientId: testUsers.client1.id,
    startTime: new Date('2025-03-01T10:00:00Z'),
    endTime: new Date('2025-03-01T12:00:00Z'),
    durationHours: 2,
    hourlyRate: 0.00025,
    totalCost: 0.0005,
    status: 'completed',
    hashRateProof: 520,
    powerConsumption: 25,
  },
  {
    id: 'rental_002',
    minerId: testMineurs[1].id,
    clientId: testUsers.client1.id,
    startTime: new Date('2025-03-10T14:00:00Z'),
    endTime: null,
    durationHours: null,
    hourlyRate: 0.00025,
    totalCost: 0,
    status: 'active',
    hashRateProof: null,
    powerConsumption: null,
  },
  {
    id: 'rental_003',
    minerId: testMineurs[2].id,
    clientId: testUsers.client2.id,
    startTime: new Date('2025-03-05T09:00:00Z'),
    endTime: new Date('2025-03-05T11:00:00Z'),
    durationHours: 2,
    hourlyRate: 0.00015,
    totalCost: 0.0003,
    status: 'completed',
    hashRateProof: 260,
    powerConsumption: 15,
  },
];

export const testPayments = [
  {
    id: 'payment_001',
    rentalId: testRentals[0].id,
    clientId: testUsers.client1.id,
    amount: 0.0005,
    currency: 'BTC',
    status: 'confirmed',
    transactionHash: 'tx_0000000000000000000000000000000000000001',
    nwcEventId: 'nwc_001',
    paidAt: new Date('2025-03-01T12:05:00Z'),
    confirmedAt: new Date('2025-03-01T12:10:00Z'),
    createdAt: new Date('2025-03-01T12:00:00Z'),
  },
  {
    id: 'payment_002',
    rentalId: testRentals[2].id,
    clientId: testUsers.client2.id,
    amount: 0.0003,
    currency: 'BTC',
    status: 'confirmed',
    transactionHash: 'tx_0000000000000000000000000000000000000002',
    nwcEventId: 'nwc_002',
    paidAt: new Date('2025-03-05T11:05:00Z'),
    confirmedAt: new Date('2025-03-05T11:10:00Z'),
    createdAt: new Date('2025-03-05T11:00:00Z'),
  },
];

export const testAuthChallenge = {
  challenge: 'challenge_test_12345678',
  expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
};

export const testNostrEvent = {
  id: 'event_000000000000000000000000000000000000000000000000000000',
  pubkey: testUsers.client1.publicKey,
  created_at: Math.floor(Date.now() / 1000),
  kind: 1,
  tags: [],
  content: 'Test Nostr event',
  sig: 'sig_' + 'a'.repeat(128),
};

export const testNWCResponse = {
  result_type: 'pay_invoice',
  result: {
    preimage: 'preimage_' + 'a'.repeat(64),
  },
};

export const testBitAxeStatus = {
  version: 'v0.1.0',
  model: 'BitAxe 602',
  macaddr: 'AA:BB:CC:DD:EE:01',
  hostname: 'bitaxe-001',
  uptime: 3600,
  power_consumption_w: 25,
  temp: {
    frontend: 45.5,
    chip: 60.2,
    backend: 48.1,
  },
  hashrate: {
    since_boot: 520000,
    average: 515000,
    high: 530000,
    low: 510000,
  },
  pools: [
    {
      url: 'stratum+tcp://pool.example.com:3333',
      user: 'test.worker1',
      shares: {
        valid: 1250,
        stale: 5,
        invalid: 2,
      },
    },
  ],
  fan: {
    percent: 65,
    rpm: 3500,
  },
};

export const testValidationRules = {
  rentalMinimumHours: 0.5,
  rentalMaximumHours: 720, // 30 days
  minPaymentAmount: 0.00001,
  maxPaymentAmount: 1.0,
};

export const createTestUser = (overrides = {}) => ({
  ...testUsers.client1,
  ...overrides,
});

export const createTestMineur = (overrides = {}) => ({
  ...testMineurs[0],
  ...overrides,
});

export const createTestRental = (overrides = {}) => ({
  ...testRentals[0],
  ...overrides,
});

export const createTestPayment = (overrides = {}) => ({
  ...testPayments[0],
  ...overrides,
});
