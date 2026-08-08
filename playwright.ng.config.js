const { defineConfig } = require('@playwright/test');

// Angular variant of the e2e config: same tests/ directory, same mock services
// on :5177, but the app under test is the Phase 3 Angular build on :4200
// (`ng serve` proxies /api and /static to the mock server). The smoke suite is
// the acceptance harness — as Angular components land, their specs go green
// here with no test changes. Until feature parity, CI filters to the specs the
// shell already satisfies (see the test:ng script).
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:4200',
    headless: true
  },
  webServer: [
    { command: 'node server.js', port: 5177, reuseExistingServer: true },
    { command: 'npm --prefix angular start', port: 4200, reuseExistingServer: true, timeout: 120000 }
  ]
});
