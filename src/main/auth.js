const Store = require('electron-store');
const { safeStorage } = require('electron');

const store = new Store();
const TOKEN_KEY = 'github-pat-token';

const auth = {
  /**
   * Encrypts and stores the GitHub PAT.
   * @param {string} token - The plaintext GitHub PAT.
   */
  setToken: (token) => {
    if (safeStorage.isEncryptionAvailable()) {
      const encryptedToken = safeStorage.encryptString(token);
      store.set(TOKEN_KEY, encryptedToken.toString('hex'));
    } else {
      // Fallback or error handling if encryption is not available
      console.warn('Encryption not available. Storing token unencrypted (not recommended).');
      store.set(TOKEN_KEY, token);
    }
  },

  /**
   * Retrieves and decrypts the GitHub PAT.
   * @returns {string | null} The plaintext GitHub PAT, or null if not found/decryptable.
   */
  getToken: () => {
    const stored = store.get(TOKEN_KEY);
    if (!stored) {
      return null;
    }

    if (safeStorage.isEncryptionAvailable()) {
      try {
        const encryptedToken = Buffer.from(stored, 'hex');
        return safeStorage.decryptString(encryptedToken);
      } catch (error) {
        console.error('Failed to decrypt token:', error);
        auth.clearToken(); // Clear potentially corrupted token
        return null;
      }
    } else {
      // Fallback for unencrypted token retrieval
      console.warn('Encryption not available. Retrieving unencrypted token (not recommended).');
      return stored;
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
