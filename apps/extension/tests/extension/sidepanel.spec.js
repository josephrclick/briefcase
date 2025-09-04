import { test, expect } from '@playwright/test';

test.describe('Extension Side Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to extension side panel
    // You'll need to adjust this based on your extension setup
    await page.goto('chrome-extension://your-extension-id/sidepanel/index.html');
  });

  test('should render side panel correctly', async ({ page }) => {
    // Check if main elements are visible
    await expect(page.locator('.side-panel')).toBeVisible();
    await expect(page.locator('.theme-toggle')).toBeVisible();
    await expect(page.locator('.tabs')).toBeVisible();
  });

  test('should toggle between light and dark themes', async ({ page }) => {
    // Click theme toggle
    await page.click('.theme-toggle');
    
    // Verify dark theme is applied
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    
    // Take screenshot for visual comparison
    await page.screenshot({ path: 'dark-mode-test.png' });
  });

  test('should navigate between tabs', async ({ page }) => {
    // Test tab navigation
    await page.click('[role="tab"]:has-text("History")');
    await expect(page.locator('[role="tabpanel"][aria-label="History"]')).toBeVisible();
    
    await page.click('[role="tab"]:has-text("Settings")');
    await expect(page.locator('[role="tabpanel"][aria-label="Settings"]')).toBeVisible();
  });

  test('should handle responsive layout', async ({ page }) => {
    // Test different viewport sizes
    await page.setViewportSize({ width: 320, height: 600 });
    await expect(page.locator('.side-panel')).toBeVisible();
    
    await page.setViewportSize({ width: 450, height: 600 });
    await expect(page.locator('.side-panel')).toBeVisible();
    
    // Take screenshots for comparison
    await page.screenshot({ path: 'responsive-wide.png' });
  });

  test('should display privacy banner correctly', async ({ page }) => {
    // Check if privacy banner is visible (if not dismissed)
    const banner = page.locator('.privacy-banner');
    if (await banner.isVisible()) {
      // Verify banner alignment and content
      await expect(banner).toBeVisible();
      await expect(banner.locator('h3')).toContainText('Privacy First');
      
      // Test dismiss functionality
      await banner.locator('.dismiss-button').click();
      await expect(banner).not.toBeVisible();
    }
  });

  test('should have readable text in dark mode', async ({ page }) => {
    // Switch to dark mode
    await page.click('.theme-toggle');
    
    // Check button contrast
    const secondaryButton = page.locator('button.secondary').first();
    if (await secondaryButton.isVisible()) {
      const styles = await secondaryButton.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
        };
      });
      
      // Verify we have proper contrast (basic check)
      expect(styles.color).not.toBe(styles.backgroundColor);
    }
  });
});
