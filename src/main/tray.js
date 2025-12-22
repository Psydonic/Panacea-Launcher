const { Tray, Menu } = require("electron");
const path = require("path");

let tray;

function createTray(app, getMainWindow) {
  tray = new Tray(path.join(__dirname, "../assets/icon.png"));
  tray.setToolTip("Panacea");

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Show",
        click: () => getMainWindow()?.show(),
        enabled: () => !!getMainWindow(),
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