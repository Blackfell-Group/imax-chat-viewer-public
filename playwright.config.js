const { defineConfig } = require('@playwright/test');

// End-to-end smoke tests run against the same dev topology the demo uses:
// mock services on :5177, Vite on :5273. `npm test` boots both.
module.exports = defineConfig({
  testDir: './tests',
  testIgnore: '**/ng/**', // Angular-build-only specs run via playwright.ng.config.js
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5273',
    headless: true
  },
  webServer: [
    { command: 'node server.js', port: 5177, reuseExistingServer: true },
    { command: 'npx vite --port 5273', port: 5273, reuseExistingServer: true }
  ]
});
