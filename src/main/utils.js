const { getLoadingWindow } = require("./windows");

/**
 * Sends a status message to the loading window.
 * @param {string} msg - The message to send.
 */
function status(msg) {
  const loadingWindow = getLoadingWindow();
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.webContents.send("status", msg);
  }
}

/**
 * Sends progress data to the loading window.
 * @param {object} data - The progress data to send.
 */
function progress(data) {
  const loadingWindow = getLoadingWindow();
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.webContents.send("progress", data);
  }
}

module.exports = { status, progress };