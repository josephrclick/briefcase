// Playwright config for AI agent testing and validation
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/extension',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report-extension' }],
    ['json', { outputFile: 'playwright-results.json' }], // For AI agent parsing
  ],
  
  use: {
    baseURL: 'http://localhost:6006', // Storybook server for AI testing
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Enable AI agent features
    video: 'retain-on-failure',
  },

  projects: [
    // Storybook testing for AI agents
    {
      name: 'storybook-validation',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:6006',
      },
      testMatch: '**/storybook/*.spec.js',
    },
    // Extension testing
    {
      name: 'extension-chrome',
      use: { 
        ...devices['Desktop Chrome'],
        contextOptions: {
          extensionPath: './dist',
        }
      },
      testMatch: '**/extension/*.spec.js',
    },
    // Mobile testing for responsive validation
    {
      name: 'mobile-validation',
      use: {
        ...devices['iPhone 12'],
        baseURL: 'http://localhost:6006',
      },
      testMatch: '**/responsive/*.spec.js',
    },
  ],

  webServer: [
    {
      command: 'npm run storybook',
      port: 6006,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run preview',
      port: 4173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
