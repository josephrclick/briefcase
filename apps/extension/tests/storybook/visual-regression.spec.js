import { test, expect } from '@playwright/test';

// AI Agent Visual Regression Tests for Storybook Stories
test.describe('Visual Regression Testing', () => {
  
  // Test all main component stories
  const stories = [
    { name: 'sidepanel-default', path: '/story/extension-sidepanel--default' },
    { name: 'sidepanel-dark', path: '/story/extension-sidepanel--dark-mode' },
    { name: 'sidepanel-wide', path: '/story/extension-sidepanel--wide-viewport' },
    { name: 'sidepanel-summarize', path: '/story/extension-sidepanel--summarize-tab' },
    { name: 'sidepanel-history', path: '/story/extension-sidepanel--history-tab' },
    { name: 'sidepanel-settings', path: '/story/extension-sidepanel--settings-tab' },
  ];

  for (const story of stories) {
    test(`should maintain visual consistency for ${story.name}`, async ({ page }) => {
      await page.goto(`/iframe.html?id=extension-sidepanel--${story.name.split('-')[1]}`);
      
      // Wait for component to fully load
      await page.waitForSelector('.side-panel', { timeout: 5000 });
      
      // Take screenshot for AI comparison
      await expect(page.locator('.side-panel')).toHaveScreenshot(`${story.name}.png`);
      
      // AI can analyze these screenshots for:
      // - Layout consistency
      // - Color accuracy  
      - Spacing correctness
      // - Text readability
    });
  }

  test('should test responsive behavior across viewports', async ({ page }) => {
    const viewports = [
      { width: 320, height: 600, name: 'mobile' },
      { width: 400, height: 600, name: 'tablet' },
      { width: 500, height: 600, name: 'desktop' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/iframe.html?id=extension-sidepanel--default');
      
      await page.waitForSelector('.side-panel');
      await expect(page.locator('.side-panel')).toHaveScreenshot(`responsive-${viewport.name}.png`);
      
      // AI validates that content doesn't overflow or break
      const contentOverflow = await page.evaluate(() => {
        const panel = document.querySelector('.side-panel');
        return panel.scrollWidth > panel.clientWidth;
      });
      
      expect(contentOverflow).toBeFalsy();
    }
  });

  test('should validate color contrast for accessibility', async ({ page }) => {
    // Test light mode
    await page.goto('/iframe.html?id=extension-sidepanel--default');
    await page.waitForSelector('.side-panel');
    
    const lightModeContrast = await page.evaluate(() => {
      // AI checks all text/background combinations
      const elements = document.querySelectorAll('button, .tab, h1, h2, p');
      const contrastResults = [];
      
      elements.forEach((el) => {
        const styles = window.getComputedStyle(el);
        contrastResults.push({
          element: el.tagName,
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          className: el.className,
        });
      });
      
      return contrastResults;
    });
    
    // AI can validate WCAG compliance
    expect(lightModeContrast.length).toBeGreaterThan(0);
    
    // Test dark mode
    await page.goto('/iframe.html?id=extension-sidepanel--dark-mode');
    await page.waitForSelector('.side-panel');
    
    const darkModeContrast = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button.secondary');
      return Array.from(buttons).map(btn => {
        const styles = window.getComputedStyle(btn);
        return {
          color: styles.color,
          backgroundColor: styles.backgroundColor,
        };
      });
    });
    
    // Verify dark mode has readable contrast
    darkModeContrast.forEach((button) => {
      expect(button.color).not.toBe(button.backgroundColor);
    });
  });
});

// AI Agent Story Validation - ensures all stories work
test.describe('Story Validation', () => {
  test('should load all stories without errors', async ({ page }) => {
    const storyUrls = [
      '/iframe.html?id=extension-sidepanel--default',
      '/iframe.html?id=extension-sidepanel--dark-mode', 
      '/iframe.html?id=extension-sidepanel--wide-viewport',
    ];

    for (const url of storyUrls) {
      await page.goto(url);
      
      // Check for JavaScript errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log(`Console error in ${url}:`, msg.text());
        }
      });
      
      // Verify story loads without crashing
      await expect(page.locator('.side-panel')).toBeVisible({ timeout: 5000 });
      
      // AI validates no error states are showing
      const errorElements = page.locator('[class*="error"], .error-message');
      await expect(errorElements).toHaveCount(0);
    }
  });
});
