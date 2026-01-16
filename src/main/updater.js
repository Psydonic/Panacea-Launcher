const { autoUpdater } = require("electron-updater");
const { status } = require("./utils");

/**
 * Sets up the auto-updater to check for updates and notify the user.
 */
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
  autoUpdater.allowPrerelease = true;
  autoUpdater.checkForUpdatesAndNotify().catch(err => {
    // This is common in development.
    console.warn("Could not check for updates:", err.message);
  });
}

module.exports = { setupUpdater };