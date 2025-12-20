const { app, BrowserWindow, Tray, Menu } = require("electron");
const { execFile } = require("child_process");
const path = require("path");
const { autoUpdater } = require("electron-updater");

// Global variables for window and tray instances
let loadingWindow;
let mainWindow;
let tray;
let quitting = false; // Flag to prevent multiple quit attempts

// --- Configuration Constants ---
const APP_URL = "http://localhost:3000"; // URL where the Electron app's frontend is served
const SERVICE_NAME = "web"; // Name of the Docker service to monitor
const WAIT_TIMEOUT = 60_000; // Maximum time in milliseconds to wait for Docker or services to become ready

/* ---------------- Utilities ---------------- */

/**
 * Executes a shell command and returns its stdout.
 * @param {string} cmd - The command to execute.
 * @param {string[]} [args=[]] - An array of arguments for the command.
 * @returns {Promise<string>} A promise that resolves with the trimmed stdout.
 */
function exec(cmd, args = []) {
  // Execute command in the current directory (where main.js is located)
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd: __dirname }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}

/**
 * Pauses execution for a specified duration.
 * @param {number} ms - The duration in milliseconds to sleep.
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Sends status updates to the loading window's renderer process.
 * @param {string} msg - The status message to send.
 */
function status(msg) {
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.webContents.send("status", msg);
  }
}

/* ---------------- Docker Management ---------------- */

/**
 * Checks if Docker is installed and accessible by trying to run 'docker --version'.
 * @returns {Promise<boolean>} True if Docker is installed, false otherwise.
 */
async function dockerInstalled() {
  try {
    await exec("docker", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures the Docker daemon is running and accessible.
 * Attempts to start Docker Desktop or systemd service if not running.
 * @throws {Error} If Docker does not start within the defined timeout.
 */
async function ensureDockerRunning() {
  const start = Date.now();

  while (Date.now() - start < WAIT_TIMEOUT) {
    try {
      // Try to get Docker info; if successful, it's running
      await exec("docker", ["info"]);
      return; // Docker is running
    } catch {
      // Docker is not running, attempt to start it
      status("Starting Docker…");
      if (process.platform === "win32") {
        // Path to Docker Desktop executable on Windows
        execFile(
          "C:\Program Files\Docker\Docker\Docker Desktop.exe",
          [],
          { detached: true } // Run in background so it doesn't block Electron
        );
      } else if (process.platform === "darwin") {
        // Open Docker application on macOS
        await exec("open", ["-a", "Docker"]);
      } else {
        // Start Docker service on Linux using systemctl
        await exec("systemctl", ["start", "docker"]);
      }
      await sleep(2000); // Wait a bit before retrying
    }
  }

  // If loop finishes without returning, Docker failed to start
  throw new Error("Docker did not start in time");
}

/**
 * Starts the Docker Compose services defined in docker-compose.yml.
 * Uses 'docker compose up -d' to run services in detached mode.
 * @throws {Error} If docker compose command fails.
 */
async function startCompose() {
  status("Starting services…");
  await exec("docker", ["compose", "up", "-d"]);
}

/**
 * Waits for the specified Docker service to reach a 'healthy' state.
 * Polls the Docker inspect command periodically.
 * @throws {Error} If the service does not become healthy within the timeout.
 */
async function waitForHealthy() {
  status("Waiting for services to become healthy…");
  const start = Date.now();

  while (Date.now() - start < WAIT_TIMEOUT) {
    try {
      // Get the health status of the specified service
      const state = await exec("docker", [
        "inspect",
        "--format={{.State.Health.Status}}",
        SERVICE_NAME
      ]);
      if (state === "healthy") return; // Service is healthy
    } catch {
      // Container might not exist yet, or status is not available, continue waiting
    }
    await sleep(1000); // Check every second
  }

  throw new Error("Service did not become healthy");
}

/**
 * Stops and removes all containers, networks, and volumes associated with the Docker Compose project.
 * Gracefully handles potential errors during shutdown.
 */
async function stopCompose() {
  try {
    await exec("docker", ["compose", "down"]);
  } catch (err) {
    console.error("Failed to stop compose:", err);
    // Continue quitting even if compose fails to stop
  }
}

/* ---------------- Window Management ---------------- */

/**
 * Creates the initial loading window displayed while services start up.
 * This window is frameless and non-resizable for a cleaner splash screen experience.
 */
function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 420,
    height: 280,
    frame: false, // No window borders or title bar
    resizable: false, // Window size cannot be changed
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // For inter-process communication
      nodeIntegration: false, // Disable Node.js integration for security
      contextIsolation: true // Isolate context for security
    }
  });
  // Load the HTML file for the loading screen
  loadingWindow.loadFile("loading.html");
}

/**
 * Displays an error message in the loading window and switches to an error view.
 * @param {string} message - The error message to display.
 */
function showError(message) {
  if (!loadingWindow || loadingWindow.isDestroyed()) return; // Don't proceed if window is gone
  loadingWindow.webContents.send("error", message); // Send error message to renderer
  loadingWindow.loadFile("error.html"); // Load error HTML page
}

/**
 * Creates the main application window after services are ready.
 * Loads the main application URL. Sets up the 'close' event handler.
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    // Add other window properties as needed (e.g., title, icon)
  });

  mainWindow.loadURL(APP_URL); // Load the application frontend

  // Handle window closing: hide the window instead of quitting the app
  mainWindow.on("close", (e) => {
    if (!quitting) { // If not in the process of quitting the entire app
      e.preventDefault(); // Prevent the default close action
      mainWindow.hide(); // Hide the window, keeping the app running in the background
    }
  });
}

/**
 * Creates the system tray icon and context menu.
 * Allows users to show the main window or quit the application.
 */
function createTray() {
  // Use the icon.png file located in the same directory as main.js
  tray = new Tray(path.join(__dirname, "icon.png"));
  tray.setToolTip("Panacea"); // Tooltip shown when hovering over the tray icon

  // Build the context menu for the tray icon
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Show",
        // Only enable 'Show' if the main window exists and is not already visible
        enabled: () => !!mainWindow && !mainWindow.isVisible(),
        click: () => mainWindow?.show(), // Show the main window
      },
      {
        label: "Quit",
        click: () => app.quit(), // Quit the entire application
      }
    ])
  );
}

/* ---------------- App Lifecycle Events ---------------- */

// Fired when Electron is ready to create windows and access file system
app.whenReady().then(async () => {
  createTray(); // Setup the system tray icon
  createLoadingWindow(); // Show the initial loading screen

  // --- Auto-Updater Setup ---
  autoUpdater.on("error", (err) => {
    console.error("Update error:", err);
    status("Update error"); // Display error on loading screen
  });
  autoUpdater.on("checking-for-update", () => {
    status("Checking for updates…");
  });
  autoUpdater.on("update-available", () => {
    status("Update available — downloading…"); // Inform user update is downloading
  });
  autoUpdater.on("update-not-available", () => {
    status("App is up to date"); // Inform user app is current
  });
  autoUpdater.on("update-downloaded", () => {
    status("Update ready — restart to apply"); // Prompt user to restart
  });

  // Trigger the update check
  autoUpdater.checkForUpdatesAndNotify();

  // --- Application Initialization ---
  if (!(await dockerInstalled())) {
    showError("Docker is not installed."); // Show error if Docker is missing
    return; // Stop initialization
  }

  try {
    status("Checking Docker daemon…");
    await ensureDockerRunning(); // Ensure Docker is running
    await startCompose(); // Start Docker Compose services
    await waitForHealthy(); // Wait for services to be healthy
    createMainWindow(); // Create and show the main application window
  } catch (err) {
    console.error(err);
    showError(err.message); // Display any errors encountered during startup
  }
});

// Fired before the application quits
app.on("before-quit", async (e) => {
  if (quitting) return; // If already quitting, do nothing
  e.preventDefault(); // Prevent the default quit behavior
  quitting = true; // Set the quitting flag

  await stopCompose(); // Gracefully stop Docker Compose services
  app.quit(); // Proceed with quitting the application
});

// Fired when all windows are closed.
// Prevent app from quitting by default; it will remain in the system tray.
app.on("window-all-closed", (e) => {
  e.preventDefault(); // Keep the app alive in the system tray
});
