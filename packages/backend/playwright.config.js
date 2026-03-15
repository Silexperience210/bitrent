/**
 * Playwright Configuration
 * BitRent Phase 4: E2E Testing
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.js',
  
  // Test timeout
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  
  // Global timeout
  globalTimeout: 30 * 60 * 1000,
  
  // Parallel execution
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  
  // Retries
  retries: process.env.CI ? 2 : 0,
  
  // Reporter
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'junit-results.xml' }],
    ['list'],
  ],
  
  // Shared settings
  use: {
    // Base URL for API tests
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    
    // Browser options
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // API options
    httpCredentials: {
      username: process.env.E2E_USERNAME || 'test',
      password: process.env.E2E_PASSWORD || 'test',
    },
  },
  
  // Web server configuration
  webServer: {
    command: process.env.CI ? 'npm run start:test-server' : 'npm run dev',
    url: process.env.E2E_BASE_URL || 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  
  // Projects (browser configurations)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile devices
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});
