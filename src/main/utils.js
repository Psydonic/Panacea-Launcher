const { getLoadingWindow } = require("./windows");

function status(msg) {
  const loadingWindow = getLoadingWindow();
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.webContents.send("status", msg);
  }
}

function progress(data) {
  const loadingWindow = getLoadingWindow();
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.webContents.send("progress", data);
  }
}

module.exports = { status, progress };