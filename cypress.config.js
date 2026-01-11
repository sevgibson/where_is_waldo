const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3001',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.js',
    video: false,
    screenshotOnRunFailure: false,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
  },
  env: {
    // Custom environment variables
    railsEnv: 'test',
  },
});
