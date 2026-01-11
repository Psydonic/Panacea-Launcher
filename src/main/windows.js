import { BrowserWindow, app } from "electron";
import { join } from "path";
import { APP_URL } from "./config";

let loadingWindow;
let mainWindow;

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
      preload: join(__dirname, "../preload/preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  loadingWindow.loadFile(join(__dirname, "../renderer/loading.html"));
  return loadingWindow;
}

/**
 * Shows an error message in the loading window.
 * @param {string} message - The error message to show.
 */
function showError(message) {
  if (!loadingWindow || loadingWindow.isDestroyed()) return;
  loadingWindow.webContents.send("error", message);
  loadingWindow.loadFile(join(__dirname, "../renderer/error.html"));
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
      preload: join(__dirname, "../preload/preload.js"),
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

export default {
  createLoadingWindow,
  showError,
  createMainWindow,
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
};