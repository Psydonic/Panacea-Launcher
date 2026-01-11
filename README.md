# Panacea-Launcher

## Windows requirements

- Docker Desktop
- WSL2
- Latest Graphics Drivers Installed
- WSL2 Backend enabled in Docker Desktop

## Build and Run

### Install Dependencies

```sh
npm ci
```

### Dev

```sh
npm run start
```

### Prod

```sh
npm run build
```

## Release



- Create a draft release and associated tag on GitHub

- Update the version to match in package.json

- Make commits to main, which will be built and uploaded to the release

- Publish the release



## Persistent Data Storage



The `docker-compose.yml` file is configured to use an environment variable `APP_DATA_PATH` to store persistent application data. This allows the application to store data in the appropriate location for each operating system.



The recommended locations for the `APP_DATA_PATH` are:



- **Windows:** `%APPDATA%/Panacea Desktop Launcher`

- **macOS:** `$HOME/Library/Application Support/Panacea Desktop Launcher`

- **Linux:** `$HOME/.config/Panacea Desktop Launcher`



The Panacea-Launcher application will automatically set the `APP_DATA_PATH` environment variable to the appropriate location for the current operating system.
