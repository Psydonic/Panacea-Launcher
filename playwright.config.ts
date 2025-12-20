
import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './test',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'electron',
      use: {
        ...devices['Desktop Electron'],
        electron: {
          // For local development, 'appPath' points to the directory containing your app's package.json.
          // Playwright will use the 'main' field from package.json to launch the app.
          // For CI, after building the app, you would typically use `executablePath` pointing to the built executable.
          // Example for CI (Linux AppImage):
          // executablePath: './dist/AppImage/Panacea Desktop Launcher',
          appPath: './', // Use this for local development
        },
      },
    },
  ],
});
