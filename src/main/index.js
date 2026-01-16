const { app, ipcMain } = require("electron");
const { dockerInstalled, pullModel, ensureDockerRunning, startCompose, waitForHealthy, stopCompose, loginToGithubRegistry } = require("./docker");
const { createLoadingWindow, showError, createMainWindow, getMainWindow, createTokenWindow, getTokenWindow } = require("./windows");
const { createTray } = require("./tray");
const { setupUpdater } = require("./updater");
const auth = require("./auth");

process.env.APP_DATA_PATH = app.getPath("userData");

app.isQuitting = false;

/* ---------------- App lifecycle ---------------- */

/**
 * This method will be called when Electron has finished
 * initialization and is ready to create browser windows.
 * Some APIs can only be used after this event occurs.
 */
app.whenReady().then(async () => {
  createTray(app, getMainWindow);
  createLoadingWindow();

  setupUpdater();

  if (!(await dockerInstalled())) {
    showError("Docker is not installed.");
    return;
  }

  ipcMain.handle('submit-token', async (event, token) => {
    const success = await loginToGithubRegistry(token);
    if (success) {
      auth.setToken(token);
      if (getTokenWindow()) {
        getTokenWindow().webContents.send('submit-token-success', token);
      }
      return true;
    } else {
      auth.clearToken();
      if (getTokenWindow()) {
        getTokenWindow().webContents.send('submit-token-failure');
      }
      return false;
    }
  });

  try {
    console.log("Checking Docker daemon…");
    await ensureDockerRunning();

    let token = auth.getToken();
    let loggedIn = false;

    while (!loggedIn) {
      if (token) {
        loggedIn = await loginToGithubRegistry(token);
        if (!loggedIn) {
          auth.clearToken(); // Clear expired/invalid token
          token = null; // Ensure we prompt again
          showError("Stored GitHub PAT is invalid or expired. Please re-enter.");
          // Delay to allow user to read the error message before token window appears
          await new Promise(resolve => setTimeout(resolve, 3000)); 
        }
      }

      if (!loggedIn) {
        // If no token or login failed, prompt the user for a new one
        const tokenWindow = createTokenWindow(getMainWindow());
        token = await new Promise(resolve => {
          // Listen for a token to be successfully submitted via IPC
          ipcMain.once('submit-token-success', (event, submittedToken) => {
            resolve(submittedToken);
          });
          // If the token window is closed without submission, resolve with null
          tokenWindow.on('closed', () => {
            resolve(null);
          });
        });

        if (!token) {
          showError("GitHub PAT is required to proceed.");
          return; // User closed the token window without providing a token
        }
        // Loop will re-attempt login with the new token
      }
    }

    await pullModel();
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