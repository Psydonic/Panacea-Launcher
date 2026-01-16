const { app, ipcMain } = require("electron");
const { dockerInstalled, pullModel, ensureDockerRunning, startCompose, waitForHealthy, stopCompose, loginToGithubRegistry } = require("./docker");
const { createLoadingWindow, showError, createMainWindow, getMainWindow, createTokenWindow, getTokenWindow } = require("./windows");
const { createTray } = require("./tray");
const { setupUpdater } = require("./updater");
const auth = require("./auth");

process.env.APP_DATA_PATH = app.getPath("userData");

app.isQuitting = false;

/**
 * Handles the entire GitHub PAT authentication flow.
 * It tries to use a stored token, and if that fails or doesn't exist,
 * it prompts the user for a new one.
 * @returns {Promise<boolean>} - True if authentication is successful, false otherwise.
 */
async function handleAuthentication() {
  let token = auth.getToken();
  let loginResult = { success: false, reason: null };

  if (token) {
    loginResult = await loginToGithubRegistry(token);
    if (loginResult.success) {
      return true;
    }
    // If login fails, clear the invalid token unless it was a network issue
    if (loginResult.reason !== 'network') {
      auth.clearToken();
    }
  }

  let errorMessage;
  if (loginResult.reason === 'auth') {
    errorMessage = "Stored token is invalid or expired. Please enter a new one.";
  } else if (loginResult.reason === 'network') {
    errorMessage = "Network error. Please check your internet and try again.";
  }

  const tokenWindow = createTokenWindow({ parent: getMainWindow(), errorMessage });

  return new Promise(resolve => {
    ipcMain.once('submit-token', async (event, newToken) => {
      const submissionLoginResult = await loginToGithubRegistry(newToken);
      if (submissionLoginResult.success) {
        auth.setToken(newToken);
        if (tokenWindow && !tokenWindow.isDestroyed()) {
          tokenWindow.close();
        }
        resolve(true);
      } else {
        let failureMessage = 'Login failed. Please check the token and try again.';
        if (submissionLoginResult.reason === 'network') {
          failureMessage = 'Network error. Please check your internet and try again.';
        }
        tokenWindow.webContents.send('set-initial-error', failureMessage);
      }
    });

    tokenWindow.on('closed', () => {
      ipcMain.removeAllListeners('submit-token');
      resolve(false); // Resolve with false if the user closes the window
    });
  });
}

/* ---------------- App lifecycle ---------------- */

/**
 * This method will be called when Electron has finished
 * initialization and is ready to create browser windows.
 * Some APIs can only be used after this event occurs.
 */
app.whenReady().then(async () => {
  createTray(app, getMainWindow);
  const loading = createLoadingWindow();

  try {
    setupUpdater();

    if (!(await dockerInstalled())) {
      showError("Docker is not installed.");
      return;
    }
    
    console.log("Checking Docker daemon…");
    await ensureDockerRunning();
    
    loading?.close(); // Close loading window before auth
    const isAuthenticated = await handleAuthentication();

    if (!isAuthenticated) {
      showError("GitHub authentication is required to proceed.");
      return;
    }

    createLoadingWindow(); // Re-open for pulling model etc.
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