
import { test as base, expect } from '@playwright/test';
import type { ElectronApplication } from 'playwright';

// Extend the base test to include the electronApp fixture.
export const test = base.extend<{ electronApp: ElectronApplication }>({
  // The electronApp fixture is provided by the Playwright test runner when running in an Electron environment.
  // This extension simply defines the type for TypeScript.
  electronApp: async ({}, use) => {
    // This is a placeholder. The actual electronApp is provided by the test runner.
    // The fixture function itself doesn't need to do anything here.
  },
});

export { expect };
