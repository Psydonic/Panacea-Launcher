# Panacea-Launcher

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