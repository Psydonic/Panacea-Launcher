const Store = require('electron-store');
const { safeStorage } = require('electron');
const { status } = require('./utils');
const { ipcMain } = require('electron');
const { createTokenWindow, showError } = require('./windows');
const { loginToGithubRegistry } = require('./docker');

const store = new Store();
const TOKEN_KEY = 'github-pat-token';

const auth = {
  /**
   * Encrypts and stores the GitHub PAT.
   * Throws an error if encryption is not available.
   * @param {string} token - The plaintext GitHub PAT.
   */
  setToken: (token) => {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Secure storage is not available on this system. Cannot store credentials.");
    }
    const encryptedToken = safeStorage.encryptString(token);
    store.set(TOKEN_KEY, encryptedToken.toString('hex'));
  },

  /**
   * Retrieves and decrypts the GitHub PAT.
   * @throws {Error} If decryption fails or secure storage is unavailable.
   * @returns {string | null} The plaintext GitHub PAT or null if not set.
   */
  getToken: () => {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Secure storage is not available on this system. Cannot retrieve credentials.");
    }

    const stored = store.get(TOKEN_KEY);
    if (!stored) {
      return null;
    }

    try {
      const encryptedToken = Buffer.from(stored, 'hex');
      return safeStorage.decryptString(encryptedToken);
    } catch (error) {
      console.error('Failed to decrypt token:', error);
      auth.clearToken(); // Clear potentially corrupted token
      return null;
    }
  },

  /**
   * Clears the stored GitHub PAT.
   */
  clearToken: () => {
    store.delete(TOKEN_KEY);
  },
};

/**
 * Handles the entire GitHub PAT authentication flow.
 * It tries to use a stored token, and if that fails or doesn't exist,
 * it prompts the user for a new one.
 * If authentication fails, call show error and return false.
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
          if (tokenWindow && !tokenWindow.isDestroyed()) {
            tokenWindow.close();
          }
          showError(err.message);
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

module.exports = { handleAuthentication };
