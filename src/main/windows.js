const { BrowserWindow, app } = require("electron");
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
  loadingWindow.on("closed", () => {
    loadingWindow = null;
  });
  return loadingWindow;
}

/**
 * Shows an error message in the loading window.
 * @param {string} message - The error message to show.
 */
function showError(message) {
  if (!loadingWindow || loadingWindow.isDestroyed()) return;
  loadingWindow.loadFile(path.join(__dirname, "../renderer/error.html"), {
    query: { message },
  });
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
function createTokenWindow({ errorMessage }) {
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.close();
  }
  tokenWindow = new BrowserWindow({
    width: 500,
    height: 350,
    frame: true,
    resizable: false,
    modal: true,
    parent: loadingWindow,
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
};