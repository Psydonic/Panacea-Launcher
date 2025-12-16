const { app, BrowserWindow, Tray, Menu, ipcMain, shell } = require("electron");
const { exec } = require("child_process");
const path = require("path");
const { autoUpdater } = require("electron-updater");

let loadingWindow;
let mainWindow;
let tray;

const APP_URL = "http://localhost:3000";
const SERVICE_NAME = "web";

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: __dirname }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}

function status(msg) {
  if (loadingWindow) {
    loadingWindow.webContents.send("status", msg);
  }
}

/* ---------------- Docker checks ---------------- */

async function dockerInstalled() {
  try {
    await run("docker --version");
    return true;
  } catch {
    return false;
  }
}

async function ensureDockerRunning() {
  try {
    await run("docker info");
    return;
  } catch {}

  status("Starting Docker…");

  if (process.platform === "win32") {
    await run('"C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"');
  } else if (process.platform === "darwin") {
    await run("open -a Docker");
  } else {
    await run("systemctl start docker");
  }

  while (true) {
    try {
      await run("docker info");
      return;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

async function startCompose() {
  status("Starting services…");
  await run("docker compose up -d");
}

async function waitForHealthy() {
  status("Waiting for services to become healthy…");

  while (true) {
    const state = await run(
      `docker inspect --format="{{.State.Health.Status}}" ${SERVICE_NAME}`
    );
    if (state === "healthy") return;
    await new Promise(r => setTimeout(r, 1000));
  }
}

async function stopCompose() {
  await run("docker compose down");
}

/* ---------------- Windows ---------------- */

function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 420,
    height: 280,
    frame: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true
    }
  });
  loadingWindow.loadFile("loading.html");
}

function createErrorWindow() {
  loadingWindow.loadFile("error.html");
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800
  });

  mainWindow.loadURL(APP_URL);
  loadingWindow.close();
}

function createTray() {
  tray = new Tray(path.join(__dirname, "icon.png"));
  tray.setToolTip("Panacea");

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Show", click: () => mainWindow?.show() },
      { label: "Quit", click: () => app.quit() }
    ])
  );
}

/* ---------------- App lifecycle ---------------- */

app.whenReady().then(async () => {
  createTray();
  createLoadingWindow();

  autoUpdater.on("download-progress", p => {
    console.log(`Update ${Math.round(p.percent)}%`);
    });
  autoUpdater.checkForUpdatesAndNotify();

  if (!(await dockerInstalled())) {
    status("Docker not found");
    createErrorWindow();
    return;
  }

  try {
    status("Checking Docker daemon…");
    await ensureDockerRunning();

    await startCompose();
    await waitForHealthy();

    createMainWindow();
  } catch (err) {
    console.error(err);
    app.quit();
  }
});

app.on("before-quit", async (e) => {
  e.preventDefault();
  await stopCompose();
  app.exit(0);
});