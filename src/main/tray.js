const { Tray, Menu } = require("electron");
const path = require("path");

let tray;

/**
 * Creates the tray icon.
 * @param {import('electron').App} app - The electron app.
 * @param {function(): import('electron').BrowserWindow} getMainWindow - A function that returns the main window.
 * @returns {Tray} - The tray icon.
 */
function createTray(app, getMainWindow) {
  tray = new Tray(path.join(__dirname, "../assets/icon.png"));
  tray.setToolTip("Panacea");

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Show",
        click: () => {
          const mainWindow = getMainWindow();
          if (!mainWindow) return;
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.show();
          mainWindow.focus();
        },
        get enabled() {
          return !!getMainWindow();
        },
      },
      {
        label: "Quit",
        click: () => app.quit(),
      },
    ])
  );
  return tray;
}

module.exports = { createTray };