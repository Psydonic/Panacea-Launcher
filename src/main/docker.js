const { spawn } = require("child_process");
const { app } = require("electron");
const path = require("path");
const { WAIT_TIMEOUT, SERVICE_NAME, MODEL_NAME, GITHUB_USER, GITHUB_REGISTRY } = require("./config");
const { status, progress } = require("./utils");

const DOCKER_COMPOSE_DIR = app.isPackaged
  ? path.resolve(app.getAppPath(), "..", "docker")
  : path.resolve(app.getAppPath(), "docker");

/**
 * Executes a command and returns the output.
 * @param {string} cmd - The command to execute.
 * @param {string[]} args - The arguments to pass to the command.
 * @param {function(string): void} onData - A callback to handle data as it's received.
 * @returns {Promise<string>} - A promise that resolves with the command's stdout.
 */
function exec(cmd, args = [], onData) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: DOCKER_COMPOSE_DIR,
      env: process.env,
    });
    let stdout = "";
    child.stdout.on("data", (data) => {
      const output = data.toString();
      if (onData) onData(output);
      stdout += output;
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    child.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Securely logs into the GitHub Container Registry using a Personal Access Token.
 * The token is passed via stdin to avoid exposing it in process lists.
 * @param {string} token - The GitHub Personal Access Token.
 * @returns {Promise<{success: boolean, reason: 'network' | 'auth' | 'unknown'}>} - Resolves with login status and reason.
 */
function loginToGithubRegistry(token) {
  return new Promise((resolve) => {
    status("Logging into GitHub Container Registry…");
    const child = spawn(
      "docker",
      ["login", GITHUB_REGISTRY, "-u", GITHUB_USER, "--password-stdin"],
      {
        cwd: DOCKER_COMPOSE_DIR,
        env: process.env,
      }
    );

    let stderr = "";
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.stdin.write(token);
    child.stdin.end();

    child.on("close", (code) => {
      if (code === 0) {
        console.log("Successfully logged into GitHub Container Registry.");
        resolve({ success: true, reason: null });
      } else {
        console.error(`Docker login failed with exit code ${code}. Stderr: ${stderr}`);
        if (stderr.includes("net/http") || stderr.includes("dial tcp")) {
          resolve({ success: false, reason: 'network' });
        } else if (stderr.includes("denied") || stderr.includes("unauthorized")) {
          resolve({ success: false, reason: 'auth' });
        } else {
          resolve({ success: false, reason: 'unknown' });
        }
      }
    });

    child.on("error", (err) => {
      console.error("Docker login spawn error:", err);
      // A spawn error is likely a system/network issue
      resolve({ success: false, reason: 'network' });
    });
  });
}

/**
 * Starts the docker-compose services.
 * @returns {Promise<void>} - A promise that resolves when the services have started.
 */
async function startCompose() {
  status("Starting services…");
  const layerRegex = /\[\s*(\d+\s*of\s*\d+)\s*\]\s*Pulling\s*fs\s*layer/;
  const progressRegex = /(\d+(\.\d+)?)\s*%/;
  await exec("docker", ["compose", "up", "-d"], (data) => {
    const layerMatch = data.match(layerRegex);
    if (layerMatch) {
      status(`Downloading images (${layerMatch[1]})`);
    } else {
      const progressMatch = data.match(progressRegex);
      if (progressMatch) {
        progress({ percent: parseFloat(progressMatch[1]) });
      }
    }
  });
}

/**
 * Waits for the main service to become healthy.
 * @returns {Promise<void>} - A promise that resolves when the service is healthy.
 */
async function waitForHealthy() {
  status("Waiting for services to become healthy…");
  const start = Date.now();
  
  while (Date.now() - start < WAIT_TIMEOUT) {
    try {
      const containerId = await exec("docker", [
        "compose",
        "ps",
        "-q",
        SERVICE_NAME,
      ]);
      if (containerId) {
        const state = await exec("docker", [
          "inspect",
          "--format={{.State.Health.Status}}",
          containerId,
        ]);
        if (state === "healthy") return;
      }
    } catch {
      // container may not exist yet
    }
    await sleep(1000);
  }

  throw new Error("Service did not become healthy");
}

/**
 * Stops the docker-compose services.
 * @returns {Promise<void>} - A promise that resolves when the services have been stopped.
 */
async function stopCompose() {
  try {
    await exec("docker", ["compose", "down"]);
  } catch (err) {
    console.error("Failed to stop compose:", err);
  }
}

/**
 * Pauses execution for a specified amount of time.
 * @param {number} ms - The number of milliseconds to sleep.
 * @returns {Promise<void>} - A promise that resolves after the specified time.
 */
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Checks if docker is installed (return void)
 * @throws {Error} If an unexpected error occurs while checking for Docker or if Docker is not installed.
 */
async function dockerInstalled() {
  status("Checking for Docker installation…");
  await exec("docker", ["--version"]).catch((err) => {
    if (err.message.includes("ENOENT")) {
      throw new Error("Docker is not installed.");
    } else {
      throw new Error(`Error checking Docker installation: ${err.message}`);
    }
  });
}

/**
 * Ensures that docker is running.
 * @returns {Promise<void>} - A promise that resolves when docker is running.
 */
async function ensureDockerRunning() {
  const start = Date.now();

  while (Date.now() - start < WAIT_TIMEOUT) {
    try {
      await exec("docker", ["info"]);
      return;
    } catch {
      status("Starting Docker…");
      if (process.platform === "win32") {
        spawn(
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

// Function to pull configured model from ./config
// docker model pull <configured model>

/**
 * Pulls the configured model using the docker CLI.
 * @returns {Promise<void>} - A promise that resolves when the model has been pulled.
 */
async function pullModel() {
  status("Pulling model…");
  await exec("docker", ["model", "pull", MODEL_NAME], (data) => {
    const progressRegex = /(\d+(\.\d+)?)\s*%/;
    const progressMatch = data.match(progressRegex);
    if (progressMatch) {
      progress({ percent: parseFloat(progressMatch[1]) });
    }
  });
}
  

module.exports = {
  dockerInstalled,
  ensureDockerRunning,
  startCompose,
  waitForHealthy,
  stopCompose,
  pullModel,
  loginToGithubRegistry,
};
