const { app, BrowserWindow, Tray, Menu } = require("electron");
const { execFile } = require("child_process");
const path = require("path");
const { autoUpdater } = require("electron-updater");

let loadingWindow;
let mainWindow;
let tray;
let quitting = false;

const APP_URL = "http://localhost:3000";
const SERVICE_NAME = "web";
const WAIT_TIMEOUT = 60_000; // 60 seconds

/* ---------------- Utilities ---------------- */

function exec(cmd, args = []) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd: __dirname }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function status(msg) {
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.webContents.send("status", msg);
  }
}

/* ---------------- Docker ---------------- */

async function dockerInstalled() {
  try {
    await exec("docker", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

async function ensureDockerRunning() {
  const start = Date.now();

  while (Date.now() - start < WAIT_TIMEOUT) {
    try {
      await exec("docker", ["info"]);
      return;
    } catch {
      status("Starting Docker…");
      if (process.platform === "win32") {
        execFile(
          "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe",
          [],
          { detached: true }
        );
      } else if (process.platform === "darwin") {
        await exec("open", ["-a", "Docker"]);
      } else {
        await exec("systemctl", ["start", "docker"]);
      }
      await sleep(2000);
    }
  }

  throw new Error("Docker did not start in time");
}

async function startCompose() {
  status("Starting services…");
  await exec("docker", ["compose", "up", "-d"]);
}

async function waitForHealthy() {
  status("Waiting for services to become healthy…");
  const start = Date.now();

  while (Date.now() - start < WAIT_TIMEOUT) {
    try {
      const state = await exec("docker", [
        "inspect",
        "--format={{.State.Health.Status}}",
        SERVICE_NAME
      ]);
      if (state === "healthy") return;
    } catch {
      // container may not exist yet
    }
    await sleep(1000);
  }

  throw new Error("Service did not become healthy");
}

async function stopCompose() {
  try {
    await exec("docker", ["compose", "down"]);
  } catch (err) {
    console.error("Failed to stop compose:", err);
  }
}

/* ---------------- Windows ---------------- */

function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 420,
    height: 280,
    frame: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  loadingWindow.loadFile("loading.html");
}

function showError(message) {
  if (!loadingWindow || loadingWindow.isDestroyed()) return;
  loadingWindow.webContents.send("error", message);
  loadingWindow.loadFile("error.html");
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.on("close", (e) => {
    if (!quitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  loadingWindow?.close();
}

function createTray() {
  tray = new Tray(path.join(__dirname, "icon.png"));
  tray.setToolTip("Panacea");

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Show",
        click: () => mainWindow?.show(),
        enabled: () => !!mainWindow
      },
      {
        label: "Quit",
        click: () => app.quit()
      }
    ])
  );
}

/* ---------------- App lifecycle ---------------- */

app.whenReady().then(async () => {
  createTray();
  createLoadingWindow();

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

  if (!(await dockerInstalled())) {
    showError("Docker is not installed.");
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
    showError(err.message);
  }
});

app.on("before-quit", async (e) => {
  if (quitting) return;
  e.preventDefault();
  quitting = true;
  await stopCompose();
  app.quit();
});

app.on("window-all-closed", (e) => {
  e.preventDefault(); // keep tray app alive
});