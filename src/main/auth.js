const Store = require('electron-store');
const { safeStorage } = require('electron');

const store = new Store();
const TOKEN_KEY = 'github-pat-token';

const Store = require('electron-store');
const { safeStorage } = require('electron');

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
   * @returns {string | null} The plaintext GitHub PAT, or null if not found/decryptable or if encryption is unavailable.
   */
  getToken: () => {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn("Secure storage is not available on this system. Cannot retrieve credentials.");
      return null;
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

module.exports = auth;


module.exports = auth;
