const { autoUpdater } = require("electron-updater");
const { status } = require("./utils");

/**
 * Sets up the auto-updater to check for updates and notify the user.
 */
function setupUpdater() {
  status("Checking for updates…");
  autoUpdater.on("error", (err) => {
    console.error("Update error:", err);
    status("Update error");
  });
  autoUpdater.on("checking-for-update", () => {
    console.log("Checking for updates…");
    status("Checking for updates…");
  });
  autoUpdater.on("update-available", () => {
    console.log("Update available — downloading…");
    status("Update available — downloading…");
  });
  autoUpdater.on("update-not-available", () => {
    console.log("App is up to date");
    status("App is up to date");
  });
  autoUpdater.on("download-progress", (progressObj) => {
    const percent = Math.floor(progressObj.percent);
    console.log(`Download progress: ${percent}%`);
    status(`Downloading update… ${percent}%`);
  });
  autoUpdater.on("update-downloaded", () => {
    console.log("Update ready — restart to apply");
    status("Update ready — restart to apply");
  });
  autoUpdater.allowPrerelease = true;
  // This will not run in development builds
  autoUpdater.checkForUpdatesAndNotify().catch(err => {
    // This is common in development.
    console.warn("Could not check for updates:", err.message);
  });
}

module.exports = { setupUpdater };