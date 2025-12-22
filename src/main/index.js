const { app } = require("electron");
const { dockerInstalled, ensureDockerRunning, startCompose, waitForHealthy, stopCompose } = require("./docker");
const { createLoadingWindow, showError, createMainWindow, getMainWindow } = require("./windows");
const { createTray } = require("./tray");
const { setupUpdater } = require("./updater");

let quitting = false;

/* ---------------- App lifecycle ---------------- */

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

app.on("before-quit", async (e) => {
  if (quitting) return;
  e.preventDefault();
  quitting = true;
  await stopCompose();
  app.quit();
});

app.on("window-all-closed", (e) => {
  e.preventDefault(); // keep tray app alive
});