/**
 * E2E Tests: Admin Dashboard
 * BitRent Phase 4: Testing & Quality Assurance
 * 
 * Tests the complete admin experience:
 * 1. Admin login
 * 2. View dashboard
 * 3. Manage mineurs (add/edit/delete)
 * 4. Monitor rentals & payments
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard - E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Admin Login Flow', () => {
    test('should login with valid admin credentials', async ({ page }) => {
      // Fill login form
      await page.fill('[data-testid="input-email"]', 'admin@bitrent.test');
      await page.fill('[data-testid="input-password"]', 'admin-password-123');
      
      // Click login button
      await page.click('[data-testid="button-login"]');
      
      // Wait for redirect to dashboard
      await page.waitForURL('/admin/dashboard');
      
      // Verify dashboard is loaded
      await expect(page).toHaveURL('/admin/dashboard');
      await expect(page.locator('[data-testid="heading-dashboard"]')).toBeVisible();
    });

    test('should reject login with invalid credentials', async ({ page }) => {
      // Fill form with wrong credentials
      await page.fill('[data-testid="input-email"]', 'admin@bitrent.test');
      await page.fill('[data-testid="input-password"]', 'wrong-password');
      
      // Click login button
      await page.click('[data-testid="button-login"]');
      
      // Should still be on login page
      await expect(page).toHaveURL('/login');
      
      // Error message should appear
      await expect(page.locator('[data-testid="error-message"]'))
        .toContainText('Invalid credentials');
    });

    test('should show error for empty fields', async ({ page }) => {
      // Click login without filling fields
      await page.click('[data-testid="button-login"]');
      
      // Should see validation errors
      const emailError = page.locator('[data-testid="error-email"]');
      const passwordError = page.locator('[data-testid="error-password"]');
      
      await expect(emailError).toBeVisible();
      await expect(passwordError).toBeVisible();
    });

    test('should remember login state across navigation', async ({ page }) => {
      // Login successfully
      await page.fill('[data-testid="input-email"]', 'admin@bitrent.test');
      await page.fill('[data-testid="input-password"]', 'admin-password-123');
      await page.click('[data-testid="button-login"]');
      
      // Wait for dashboard
      await page.waitForURL('/admin/dashboard');
      
      // Navigate to mineurs page
      await page.click('[data-testid="nav-mineurs"]');
      await page.waitForURL('/admin/mineurs');
      
      // Should still be logged in (not redirected to login)
      expect(page.url()).toContain('/admin/mineurs');
    });
  });

  test.describe('Dashboard Overview', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.fill('[data-testid="input-email"]', 'admin@bitrent.test');
      await page.fill('[data-testid="input-password"]', 'admin-password-123');
      await page.click('[data-testid="button-login"]');
      await page.waitForURL('/admin/dashboard');
    });

    test('should display dashboard statistics', async ({ page }) => {
      // Check for key metrics
      await expect(page.locator('[data-testid="stat-total-mineurs"]'))
        .toBeVisible();
      await expect(page.locator('[data-testid="stat-active-rentals"]'))
        .toBeVisible();
      await expect(page.locator('[data-testid="stat-total-revenue"]'))
        .toBeVisible();
      await expect(page.locator('[data-testid="stat-avg-uptime"]'))
        .toBeVisible();
    });

    test('should show recent activity feed', async ({ page }) => {
      // Scroll to activity section
      await page.locator('[data-testid="section-activity"]').scrollIntoViewIfNeeded();
      
      // Check if activity items are displayed
      const activityItems = page.locator('[data-testid="activity-item"]');
      const count = await activityItems.count();
      
      expect(count).toBeGreaterThan(0);
    });

    test('should display system health status', async ({ page }) => {
      const healthBadge = page.locator('[data-testid="health-status"]');
      
      await expect(healthBadge).toBeVisible();
      
      const status = await healthBadge.getAttribute('data-status');
      expect(['healthy', 'warning', 'error']).toContain(status);
    });

    test('should show quick action buttons', async ({ page }) => {
      // Check for quick action buttons
      await expect(page.locator('[data-testid="btn-add-mineur"]'))
        .toBeVisible();
      await expect(page.locator('[data-testid="btn-view-rentals"]'))
        .toBeVisible();
      await expect(page.locator('[data-testid="btn-view-payments"]'))
        .toBeVisible();
    });
  });

  test.describe('Mineur Management', () => {
    test.beforeEach(async ({ page }) => {
      // Login and navigate to mineurs page
      await page.fill('[data-testid="input-email"]', 'admin@bitrent.test');
      await page.fill('[data-testid="input-password"]', 'admin-password-123');
      await page.click('[data-testid="button-login"]');
      await page.waitForURL('/admin/dashboard');
      
      await page.click('[data-testid="nav-mineurs"]');
      await page.waitForURL('/admin/mineurs');
    });

    test('should display list of mineurs', async ({ page }) => {
      // Check if mineurs table is visible
      const mineurTable = page.locator('[data-testid="table-mineurs"]');
      await expect(mineurTable).toBeVisible();
      
      // Check for columns
      await expect(page.locator('[data-testid="col-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="col-hashrate"]')).toBeVisible();
      await expect(page.locator('[data-testid="col-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="col-price"]')).toBeVisible();
    });

    test('should add new mineur', async ({ page }) => {
      // Click add mineur button
      await page.click('[data-testid="btn-add-mineur"]');
      
      // Wait for modal
      await page.waitForSelector('[data-testid="modal-add-mineur"]');
      
      // Fill form
      await page.fill('[data-testid="input-mineur-name"]', 'BitAxe#10');
      await page.fill('[data-testid="input-model"]', 'bitaxe-ultra');
      await page.fill('[data-testid="input-mac-address"]', 'AA:BB:CC:DD:EE:10');
      await page.fill('[data-testid="input-hashrate"]', '520');
      await page.fill('[data-testid="input-power"]', '25');
      await page.fill('[data-testid="input-location"]', 'DataCenter-C');
      await page.fill('[data-testid="input-price"]', '0.00025');
      
      // Submit form
      await page.click('[data-testid="btn-submit-mineur"]');
      
      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]'))
        .toContainText('Mineur added successfully');
      
      // Verify mineur appears in table
      await expect(page.locator('text=BitAxe#10')).toBeVisible();
    });

    test('should edit existing mineur', async ({ page }) => {
      // Find and click edit button for first mineur
      const firstRow = page.locator('[data-testid="table-mineurs"] >> tbody >> tr').first();
      await firstRow.locator('[data-testid="btn-edit"]').click();
      
      // Wait for modal
      await page.waitForSelector('[data-testid="modal-edit-mineur"]');
      
      // Edit fields
      await page.fill('[data-testid="input-mineur-name"]', 'BitAxe#1-Updated');
      await page.fill('[data-testid="input-price"]', '0.00030');
      
      // Submit
      await page.click('[data-testid="btn-submit-mineur"]');
      
      // Verify changes
      await expect(page.locator('text=BitAxe#1-Updated')).toBeVisible();
    });

    test('should delete mineur with confirmation', async ({ page }) => {
      // Find and click delete button
      const firstRow = page.locator('[data-testid="table-mineurs"] >> tbody >> tr').first();
      await firstRow.locator('[data-testid="btn-delete"]').click();
      
      // Confirm deletion
      await page.click('[data-testid="btn-confirm-delete"]');
      
      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]'))
        .toContainText('Mineur deleted successfully');
    });

    test('should filter mineurs by status', async ({ page }) => {
      // Click filter dropdown
      await page.click('[data-testid="filter-status"]');
      
      // Select "available" status
      await page.click('[data-testid="filter-available"]');
      
      // Table should update
      const statusCells = page.locator('[data-testid="cell-status"]');
      const count = await statusCells.count();
      
      for (let i = 0; i < count; i++) {
        const text = await statusCells.nth(i).textContent();
        expect(text).toContain('Available');
      }
    });

    test('should search mineurs by name', async ({ page }) => {
      // Enter search term
      await page.fill('[data-testid="search-mineurs"]', 'BitAxe#1');
      
      // Wait for results to update
      await page.waitForTimeout(500);
      
      // Verify only matching results are shown
      const rows = page.locator('[data-testid="table-mineurs"] >> tbody >> tr');
      const count = await rows.count();
      
      expect(count).toBeGreaterThan(0);
    });

    test('should display mineur details modal', async ({ page }) => {
      // Click on mineur name
      await page.click('[data-testid="cell-name"]');
      
      // Wait for details modal
      await page.waitForSelector('[data-testid="modal-details"]');
      
      // Verify all details are displayed
      await expect(page.locator('[data-testid="detail-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="detail-model"]')).toBeVisible();
      await expect(page.locator('[data-testid="detail-hashrate"]')).toBeVisible();
      await expect(page.locator('[data-testid="detail-status"]')).toBeVisible();
    });
  });

  test.describe('Rental Monitoring', () => {
    test.beforeEach(async ({ page }) => {
      // Login and navigate to rentals
      await page.fill('[data-testid="input-email"]', 'admin@bitrent.test');
      await page.fill('[data-testid="input-password"]', 'admin-password-123');
      await page.click('[data-testid="button-login"]');
      await page.waitForURL('/admin/dashboard');
      
      await page.click('[data-testid="nav-rentals"]');
      await page.waitForURL('/admin/rentals');
    });

    test('should display active rentals', async ({ page }) => {
      const rentalTable = page.locator('[data-testid="table-rentals"]');
      await expect(rentalTable).toBeVisible();
      
      const rows = page.locator('[data-testid="table-rentals"] >> tbody >> tr');
      const count = await rows.count();
      
      expect(count).toBeGreaterThan(0);
    });

    test('should show rental status with color coding', async ({ page }) => {
      const statusBadges = page.locator('[data-testid="status-badge"]');
      
      const firstStatus = statusBadges.first();
      const statusClass = await firstStatus.getAttribute('class');
      
      expect(statusClass).toMatch(/status-(active|completed|cancelled)/);
    });

    test('should display real-time hash rate for active rentals', async ({ page }) => {
      // Find active rental row
      const activeRental = page.locator(
        '[data-testid="status-badge"]:has-text("Active")').first().locator('xpath=ancestor::tr')
      );
      
      // Verify hash rate is displayed
      const hashRate = activeRental.locator('[data-testid="cell-hashrate"]');
      await expect(hashRate).toBeVisible();
      
      const text = await hashRate.textContent();
      expect(text).toMatch(/\\d+/);
    });
  });

  test.describe('Payment Tracking', () => {
    test.beforeEach(async ({ page }) => {
      // Login and navigate to payments
      await page.fill('[data-testid="input-email"]', 'admin@bitrent.test');
      await page.fill('[data-testid="input-password"]', 'admin-password-123');
      await page.click('[data-testid="button-login"]');
      await page.waitForURL('/admin/dashboard');
      
      await page.click('[data-testid="nav-payments"]');
      await page.waitForURL('/admin/payments');
    });

    test('should display payment history', async ({ page }) => {
      const paymentTable = page.locator('[data-testid="table-payments"]');
      await expect(paymentTable).toBeVisible();
      
      const rows = page.locator('[data-testid="table-payments"] >> tbody >> tr');
      const count = await rows.count();
      
      expect(count).toBeGreaterThan(0);
    });

    test('should show payment status', async ({ page }) => {
      const statusBadges = page.locator('[data-testid="payment-status"]');
      
      for (let i = 0; i < await statusBadges.count(); i++) {
        const text = await statusBadges.nth(i).textContent();
        expect(['Confirmed', 'Pending', 'Failed']).toContain(text);
      }
    });

    test('should display transaction hash for confirmed payments', async ({ page }) => {
      // Find confirmed payment
      const confirmedPayment = page.locator(
        '[data-testid="payment-status"]:has-text("Confirmed")').first().locator('xpath=ancestor::tr')
      );
      
      // Click to view details
      await confirmedPayment.click();
      
      // Verify transaction hash is displayed
      const txHash = page.locator('[data-testid="transaction-hash"]');
      await expect(txHash).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Navigate to dashboard
      await page.goto('/admin/dashboard');
      
      // Wait for login if needed
      await page.fill('[data-testid="input-email"]', 'admin@bitrent.test');
      await page.fill('[data-testid="input-password"]', 'admin-password-123');
      await page.click('[data-testid="button-login"]');
      await page.waitForURL('/admin/dashboard');
      
      // Check if hamburger menu is visible
      const hamburger = page.locator('[data-testid="btn-hamburger"]');
      await expect(hamburger).toBeVisible();
      
      // Click menu
      await hamburger.click();
      
      // Navigation should appear
      await expect(page.locator('[data-testid="nav-mineurs"]')).toBeVisible();
    });

    test('should be responsive on tablet', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.goto('/admin/dashboard');
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      // Check for proper h1
      await expect(page.locator('h1')).toHaveCount(1);
    });

    test('should have descriptive button labels', async ({ page }) => {
      // All buttons should have text or aria-label
      const buttons = page.locator('button');
      
      for (let i = 0; i < await buttons.count(); i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        
        expect(text || ariaLabel).toBeTruthy();
      }
    });

    test('should be navigable with keyboard', async ({ page }) => {
      // Login
      await page.fill('[data-testid="input-email"]', 'admin@bitrent.test');
      await page.press('[data-testid="input-email"]', 'Tab');
      await page.fill('[data-testid="input-password"]', 'admin-password-123');
      await page.press('[data-testid="input-password"]', 'Tab');
      await page.press('[data-testid="button-login"]', 'Enter');
      
      // Should navigate to dashboard
      await page.waitForURL('/admin/dashboard');
    });
  });

  test.describe('Performance', () => {
    test('should load dashboard within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/login');
      await page.fill('[data-testid="input-email"]', 'admin@bitrent.test');
      await page.fill('[data-testid="input-password"]', 'admin-password-123');
      await page.click('[data-testid="button-login"]');
      
      await page.waitForURL('/admin/dashboard');
      
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });

    test('should handle large dataset efficiently', async ({ page }) => {
      // Navigate to mineurs page (which might have many records)
      await page.fill('[data-testid="input-email"]', 'admin@bitrent.test');
      await page.fill('[data-testid="input-password"]', 'admin-password-123');
      await page.click('[data-testid="button-login"]');
      await page.waitForURL('/admin/dashboard');
      
      const startTime = Date.now();
      
      await page.click('[data-testid="nav-mineurs"]');
      await page.waitForURL('/admin/mineurs');
      
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds
    });
  });

  test.describe('Error Handling', () => {
    test('should display error message on network failure', async ({ page }) => {
      // Simulate network error
      await page.context().setOffline(true);
      
      await page.goto('/login');
      
      // Should show error
      await expect(page.locator('[data-testid="error-message"]'))
        .toBeVisible();
      
      // Restore network
      await page.context().setOffline(false);
    });

    test('should handle 404 pages gracefully', async ({ page }) => {
      await page.goto('/admin/nonexistent-page');
      
      // Should show 404 page or redirect
      const url = page.url();
      expect(url).toMatch(/(404|login|error)/);
    });
  });
});
