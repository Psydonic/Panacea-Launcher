const { autoUpdater } = require("electron-updater");
const { status } = require("./utils");

function setupUpdater() {
  autoUpdater.on("error", (err) => {
    console.error("Update error:", err);
    status("Update error");
  });
  autoUpdater.on("checking-for-update", () => {
    status("Checking for updates…");
  });
  autoUpdater.on("update-available", () => {
    status("Update available — downloading…");
  });
  autoUpdater.on("update-not-available", () => {
    status("App is up to date");
  });
  autoUpdater.on("update-downloaded", () => {
    status("Update ready — restart to apply");
  });
  autoUpdater.checkForUpdatesAndNotify();
}

module.exports = { setupUpdater };