const { app, ipcMain } = require("electron");
const { dockerInstalled, pullModel, ensureDockerRunning, startCompose, waitForHealthy, stopCompose, loginToGithubRegistry } = require("./docker");
const { createLoadingWindow, showError, createMainWindow, getMainWindow, createTokenWindow } = require("./windows");
const { createTray } = require("./tray");
const { setupUpdater } = require("./updater");
const auth = require("./auth");
const { status } = require("./utils");

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

  status("Awaiting GitHub authentication...");
  let errorMessage;
  if (loginResult.reason === 'auth') {
    errorMessage = "Stored token is invalid or expired. Please enter a new one.";
  } else if (loginResult.reason === 'network') {
    errorMessage = "Network error. Please check your internet and try again.";
  }

  // Make the token window modal to the loading window to prevent UI flicker
  const tokenWindow = createTokenWindow({ errorMessage });

  return new Promise((resolve) => {
    const handleSubmitToken = async (event, newToken) => {
      const submissionLoginResult = await loginToGithubRegistry(newToken);
      if (submissionLoginResult.success) {
        try {
          auth.setToken(newToken);
          if (tokenWindow && !tokenWindow.isDestroyed()) {
            tokenWindow.close();
          }
          resolve(true);
        } catch (err) {
          // This happens if safeStorage is unavailable
          showError(err.message);
          if (tokenWindow && !tokenWindow.isDestroyed()) {
            tokenWindow.close();
          }
          resolve(false);
        }
      } else {
        let failureMessage =
          "Login failed. Please check the token and try again.";
        if (submissionLoginResult.reason === "network") {
          failureMessage =
            "Network error. Please check your internet and try again.";
        }
        if (tokenWindow && !tokenWindow.isDestroyed()) {
          tokenWindow.webContents.send("set-initial-error", failureMessage);
        }
        // Re-arm the listener for the next submission attempt
        ipcMain.once("submit-token", handleSubmitToken);
      }
    };

    const handleTokenWindowClosed = () => {
      // If the window is closed, the listener might still be waiting.
      // We remove it to prevent leaks and resolve false.
      ipcMain.removeListener("submit-token", handleSubmitToken);
      resolve(false);
    };

    ipcMain.once("submit-token", handleSubmitToken);
    tokenWindow.on("closed", handleTokenWindowClosed);
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
  createLoadingWindow();

  try {
    setupUpdater();

    if (!(await dockerInstalled())) {
      showError("Docker is not installed.");
      return;
    }
    
    console.log("Checking Docker daemon…");
    await ensureDockerRunning();
    
    const isAuthenticated = await handleAuthentication();

    if (!isAuthenticated) {
      // showError will close the loading window and show the error window
      showError("GitHub authentication is required to proceed.");
      return;
    }

    await pullModel();
    await startCompose();
    await waitForHealthy();
    createMainWindow(); // This closes the loading window

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