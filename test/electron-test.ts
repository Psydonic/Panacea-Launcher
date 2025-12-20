
import { test as base, expect, _electron } from '@playwright/test';
import type { ElectronApplication } from 'playwright';

export const test = base.extend<{ electronApp: ElectronApplication }>({
  electronApp: async ({}, use) => {
    // Launch the electron app.
    const electronApp = await _electron.launch({ args: ['.'] });

    // Wait for the main window to open.
    await electronApp.firstWindow();

    // Pass the electron app to the test.
    await use(electronApp);

    // Close the app.
    await electronApp.close();
  },
});

export { expect };
