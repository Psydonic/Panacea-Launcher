const { execFile } = require("child_process");
const { app } = require("electron");
const path = require("path");
const { WAIT_TIMEOUT, SERVICE_NAME } = require("./config");
const { status } = require("./utils");

const DOCKER_COMPOSE_DIR = path.resolve(app.getAppPath(), "..", "docker");

function exec(cmd, args = []) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd: DOCKER_COMPOSE_DIR }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
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

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = {
  dockerInstalled,
  ensureDockerRunning,
  startCompose,
  waitForHealthy,
  stopCompose,
};
