
import { defineConfig, devices } from '@playwright/test';

const executablePath =
  process.platform === 'win32'
    ? './dist/win-unpacked/Panacea Desktop Launcher.exe'
    : process.platform === 'darwin'
    ? './dist/mac/Panacea Desktop Launcher.app'
    : './dist/linux-unpacked/panacea-launcher';

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
        electron: process.env.CI
          ? {
              executablePath: executablePath,
            }
          : {
              appPath: './', // Use this for local development
            },
      },
    },
  ],
});
