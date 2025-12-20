# Panacea-Launcher

This is an Electron application designed to launch Docker Compose services for the Panacea project. It includes features for auto-updates and runs in the system tray.

## Prerequisites

- **Node.js and npm:** Ensure you have Node.js and npm installed.
- **Docker:** Docker must be installed and running on your system. The application will attempt to start Docker Desktop (Windows/macOS) or the Docker service (Linux) if it's not already running.

## Project Structure

The main Electron application logic is now located in the `src/` directory.

## Installation

1. Clone the repository.
2. Install project dependencies:
   ```sh
   npm ci
   ```

## Running the Application

### Development

To start the application in development mode:

```sh
npm run start
```

This command will launch the Electron app, which will then attempt to start the necessary Docker Compose services and load the application interface.

### Building for Production

To build the distributable application package:

```sh
npm run build
```

This command utilizes `electron-builder` to create installers for different platforms.

## Releasing

To manage releases:

1. Create a draft release and associated tag on GitHub.
2. Update the `version` in `package.json` to match the release tag.
3. Make commits to the `main` branch. The CI/CD pipeline will build and upload the artifacts to the GitHub release.
