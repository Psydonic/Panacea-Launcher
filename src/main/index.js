const { app } = require("electron");
const { dockerInstalled, ensureDockerRunning, startCompose, waitForHealthy, stopCompose } = require("./docker");
const { createLoadingWindow, showError, createMainWindow, getMainWindow } = require("./windows");
const { createTray } = require("./tray");
const { setupUpdater } = require("./updater");

process.env.APP_DATA_PATH = app.getPath("userData");

app.isQuitting = false;

/* ---------------- App lifecycle ---------------- */

/**
 * This method will be called when Electron has finished
 * initialization and is ready to create browser windows.
 * Some APIs can only be used after this event occurs.
 */
app.whenReady().then(async () => {
  const mainWindow = getMainWindow();

  createTray(app, getMainWindow);
  createLoadingWindow();

  setupUpdater();

  if (!(await dockerInstalled())) {
    showError("Docker is not installed.");
    return;
  }

  try {
    console.log("Checking Docker daemon…");
    await ensureDockerRunning();
    await startCompose();
    await waitForHealthy();
    createMainWindow();
  } catch (err) {
    console.error(err);
    showError(err.message);
  }
});

/**
 * Emitted before the application starts closing its windows.
 * Calling event.preventDefault() will prevent the default behavior, which is terminating the application.
 */
app.on("before-quit", async (e) => {
  if (app.isQuitting) return;
  e.preventDefault();
  app.isQuitting = true;
  await stopCompose();
  app.quit();
});

/**
 * Emitted when all windows have been closed.
 * If you do not subscribe to this event and all windows are closed, the default behavior is to quit the app.
 * However, we want to keep the tray app alive, so we prevent the default behavior.
 */
app.on("window-all-closed", (e) => {
  e.preventDefault(); // keep tray app alive
});