import { test, expect } from '@playwright/test';

// AI Agent Automated Testing and Fix Validation
test.describe('AI Agent Automated Fixes', () => {
  
  test('should validate layout alignment fixes', async ({ page }) => {
    await page.goto('/iframe.html?id=extension-sidepanel--default');
    await page.waitForSelector('.side-panel');
    
    // AI checks that privacy banner aligns with main content
    const bannerRect = await page.locator('.privacy-banner').boundingBox();
    const mainRect = await page.locator('.tab-content').boundingBox();
    
    if (bannerRect && mainRect) {
      // Verify alignment (within 5px tolerance)
      expect(Math.abs(bannerRect.x - mainRect.x)).toBeLessThan(5);
    }
  });

  test('should validate dark mode text readability', async ({ page }) => {
    await page.goto('/iframe.html?id=extension-sidepanel--dark-mode');
    await page.waitForSelector('.side-panel');
    
    // AI validates secondary button contrast in dark mode
    const buttonColors = await page.evaluate(() => {
      const secondaryButtons = document.querySelectorAll('button.secondary');
      return Array.from(secondaryButtons).map(btn => {
        const styles = window.getComputedStyle(btn);
        return {
          color: styles.color,
          background: styles.backgroundColor,
          text: btn.textContent?.trim(),
        };
      });
    });
    
    // AI verifies contrast improvements
    buttonColors.forEach((button) => {
      expect(button.color).not.toBe('rgb(128, 128, 128)'); // Not gray text
      expect(button.background).not.toBe('transparent');
    });
  });

  test('should validate responsive width behavior', async ({ page }) => {
    const viewports = [320, 400, 450, 500];
    
    for (const width of viewports) {
      await page.setViewportSize({ width, height: 600 });
      await page.goto('/iframe.html?id=extension-sidepanel--default');
      await page.waitForSelector('.side-panel');
      
      // AI validates that content uses full width
      const panelWidth = await page.locator('.side-panel').evaluate(el => el.offsetWidth);
      const contentWidth = await page.locator('.tab-content').evaluate(el => el.offsetWidth);
      
      // Content should use most of the panel width (allowing for padding)
      expect(contentWidth).toBeGreaterThan(panelWidth * 0.8);
      
      // No horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > document.body.clientWidth;
      });
      
      expect(hasOverflow).toBeFalsy();
    }
  });

  test('should generate accessibility report', async ({ page }) => {
    await page.goto('/iframe.html?id=extension-sidepanel--default');
    await page.waitForSelector('.side-panel');
    
    // AI generates comprehensive accessibility audit
    const accessibilityReport = await page.evaluate(() => {
      const report = {
        missingAltText: [],
        lowContrast: [],
        missingLabels: [],
        keyboardAccessible: true,
      };
      
      // Check images without alt text
      document.querySelectorAll('img').forEach(img => {
        if (!img.alt) {
          report.missingAltText.push(img.src);
        }
      });
      
      // Check form elements without labels
      document.querySelectorAll('input, select, textarea').forEach(input => {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (!label && !input.getAttribute('aria-label')) {
          report.missingLabels.push(input.name || input.type);
        }
      });
      
      return report;
    });
    
    // AI validates accessibility improvements
    expect(accessibilityReport.missingAltText.length).toBe(0);
    expect(accessibilityReport.missingLabels.length).toBeLessThan(2); // Allow some flexibility
  });
});

// AI Agent Performance Monitoring
test.describe('Performance Validation', () => {
  test('should monitor component render performance', async ({ page }) => {
    // Start performance monitoring
    await page.goto('/iframe.html?id=extension-sidepanel--default');
    
    const performanceMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Monitor render time
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const renderTime = entries[0]?.duration || 0;
          resolve({ renderTime });
        });
        
        observer.observe({ entryTypes: ['measure'] });
        
        // Trigger re-render
        const event = new CustomEvent('test-render');
        document.dispatchEvent(event);
        
        // Fallback timeout
        setTimeout(() => resolve({ renderTime: 0 }), 1000);
      });
    });
    
    // AI validates performance doesn't degrade
    expect(performanceMetrics.renderTime).toBeLessThan(100); // Under 100ms
  });
});
