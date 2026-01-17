const { BrowserWindow, app } = require("electron");
const path = require("path");
const { APP_URL } = require("./config");

let loadingWindow;
let mainWindow;
let tokenWindow;

/**
 * Creates the loading window.
 * @returns {Promise<BrowserWindow>} - The loading window.
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
  return new Promise((resolve) => {
    loadingWindow.webContents.on("did-finish-load", () => {
      resolve(loadingWindow);
    });
  });
}

/**
 * Shows an error message in a popup dialog. And closes the loading window if it exists.
 * Then shuts down the app.
 * @param {string} message - The error message to show.
 */
function showError(message) {

  // close main window if it exists
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }

  // Show error dialog and quit app
  const { dialog } = require("electron");
  dialog.showErrorBox("Error", message);

  app.quit();
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
  tokenWindow = new BrowserWindow({
    width: 500,
    height: 400,
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
  getLoadingWindow: () => loadingWindow,
};