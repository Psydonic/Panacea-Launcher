const { spawn } = require("child_process");
const { app } = require("electron");
const path = require("path");
const { WAIT_TIMEOUT, SERVICE_NAME } = require("./config");
const { status, progress } = require("./utils");

const DOCKER_COMPOSE_DIR = path.resolve(app.getAppPath(), "..", "docker");

function exec(cmd, args = [], onData) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: DOCKER_COMPOSE_DIR });
    let stdout = '';
    child.stdout.on('data', (data) => {
      const output = data.toString();
      if (onData) onData(output);
      stdout += output;
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    child.on('error', (err) => {
      reject(err);
    });
  });
}

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

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

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

module.exports = {
  dockerInstalled,
  ensureDockerRunning,
  startCompose,
  waitForHealthy,
  stopCompose,
};
