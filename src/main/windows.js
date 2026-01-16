const { BrowserWindow, ipcMain, app } = require("electron");
const path = require("path");
const { APP_URL } = require("./config");

let loadingWindow;
let mainWindow;
let tokenWindow;

/**
 * Creates the loading window.
 * @returns {BrowserWindow} - The loading window.
 */
function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 420,
    height: 280,
    frame: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  loadingWindow.loadFile(path.join(__dirname, "../renderer/loading.html"));
  return loadingWindow;
}

/**
 * Shows an error message in the loading window.
 * @param {string} message - The error message to show.
 */
function showError(message) {
  if (!loadingWindow || loadingWindow.isDestroyed()) return;
  loadingWindow.webContents.send("error", message);
  loadingWindow.loadFile(path.join(__dirname, "../renderer/error.html"));
}

/**
 * Creates the main window.
 * @returns {BrowserWindow} - The main window.
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  loadingWindow?.close();
  return mainWindow;
}

/**
 * Creates the token input window.
 * @param {{parent: BrowserWindow, errorMessage?: string}} options - The parent window and an optional error message.
 * @returns {BrowserWindow} The token input window.
 */
function createTokenWindow({ parent, errorMessage }) {
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.close();
  }
  tokenWindow = new BrowserWindow({
    width: 500,
    height: 350,
    frame: true,
    resizable: false,
    modal: true,
    parent: parent || null, // Make it modal to the main window if it exists
    webPreferences: {
      preload: path.join(__dirname, "../preload/tokenPreload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  tokenWindow.loadFile(path.join(__dirname, "../renderer/token.html"));

  if (errorMessage) {
    tokenWindow.webContents.on('did-finish-load', () => {
      tokenWindow.webContents.send('set-initial-error', errorMessage);
    });
  }

  tokenWindow.on('closed', () => {
    tokenWindow = null;
  });

  return tokenWindow;
}

module.exports = {
  createLoadingWindow,
  showError,
  createMainWindow,
  createTokenWindow,
  /**
   * Returns the main window.
   * @returns {BrowserWindow} - The main window.
   */
  getMainWindow: () => mainWindow,
  /**
   * Returns the loading window.
   * @returns {BrowserWindow} - The loading window.
   */
  getLoadingWindow: () => loadingWindow,
  /**
   * Returns the token window.
   * @returns {BrowserWindow} - The token window.
   */
  getTokenWindow: () => tokenWindow,
};