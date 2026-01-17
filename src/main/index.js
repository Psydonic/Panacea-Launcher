const { app, ipcMain } = require("electron");
const { pullModel, ensureDockerRunning, startCompose, waitForHealthy, stopCompose } = require("./docker");
const { createLoadingWindow, showError, createMainWindow, getMainWindow, getLoadingWindow } = require("./windows");
const { createTray } = require("./tray");
const { setupUpdater } = require("./updater");
const { handleAuthentication } = require("./auth");
const { status } = require("./utils");

process.env.APP_DATA_PATH = app.getPath("userData");

// Global error handlers
process.on("uncaughtException", handleFatalError);
process.on("unhandledRejection", handleFatalError);

app.isQuitting = false;

/* ---------------- App lifecycle ---------------- */

/**
 * This method will be called when Electron has finished
 * initialization and is ready to create browser windows.
 * Some APIs can only be used after this event occurs.
 */
app.whenReady().then(async () => {
  createTray(app, getMainWindow);
  await createLoadingWindow();
  status("Initializing…");

  try {
    setupUpdater();

    console.log("Checking Docker daemon…");
    await ensureDockerRunning();
    console.log("Docker is running.");
    
    console.log("Starting authentication flow…");
    const authSuccess = await handleAuthentication();
    if (!authSuccess) {
      throw new Error("Authentication failed or was cancelled by the user.");
    }
    console.log("Authentication successful.");

    console.log("Pulling model...");
    await pullModel();
    console.log("Model pulled.");

    console.log("Starting services…");
    await startCompose();
    console.log("Services started. Waiting for healthy status…");
    await waitForHealthy();

    console.log("Services are healthy. Launching main window…");
    createMainWindow(); // This closes the loading window

  } catch (err) {
    handleFatalError(err);
  }
});

// handle fatal error function
function handleFatalError(err) {
  console.error("Fatal error:", err);
  showError(err.message);
}

/**
 * Emitted before the application starts closing its windows.
 * Calling event.preventDefault() will prevent the default behavior, which is terminating the application.
 * The loading screen will be shown while the services are being stopped.
 */
app.on("before-quit", async (e) => {
  console.log("Quitting application...");
  if (app.isQuitting) return;
  e.preventDefault();
  app.isQuitting = true;
  
  // Show loading window while stopping services (might exist already)
  let loadingWindow = getLoadingWindow();
  if (!loadingWindow) {
    loadingWindow = await createLoadingWindow();
  }
  status("Shutting down services…");

  // Stop services and then quit
  await stopCompose();
  app.quit();
});

/**
 * Emitted when all windows have been closed.
 * If you do not subscribe to this event and all windows are closed, the default behavior is to quit the app.
 * However, we want to keep the tray app alive, so we prevent the default behavior.
 */
app.on("window-all-closed", (e) => {
  console.log("All windows closed.");
  e.preventDefault(); // keep tray app alive
});