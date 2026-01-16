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
 * @param {BrowserWindow} parentWindow - The parent window for the modal.
 * @returns {BrowserWindow} The token input window.
 */
function createTokenWindow(parentWindow) {
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.close();
  }
  tokenWindow = new BrowserWindow({
    width: 500,
    height: 350,
    frame: true,
    resizable: false,
    modal: true,
    parent: parentWindow || null, // Make it modal to the main window if it exists
    webPreferences: {
      preload: path.join(__dirname, "../preload/tokenPreload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  tokenWindow.loadFile(path.join(__dirname, "../renderer/token.html"));

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