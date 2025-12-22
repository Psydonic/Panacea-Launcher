const { getLoadingWindow } = require("./windows");

function status(msg) {
  const loadingWindow = getLoadingWindow();
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.webContents.send("status", msg);
  }
}

module.exports = { status };