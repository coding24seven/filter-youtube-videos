# YouTube Magic

A browser extension that filters out watched and members-only YouTube videos, keeping your YouTube feeds fresh and uncluttered.

## Features

- Filters out YouTube videos that contain a progress bar or members-only badge.

## Installation

1. Install the extension from the [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/youtube-magic/) page.

## Permissions

- Access to YouTube pages (`https://www.youtube.com`) to detect and filter videos.
- No data collection or external requests.

## System Requirements for development and build

- Must be a Unix-based system (Linux, macOS, Windows WSL)

## Development

- git clone this repository.
- Run `npm i`
- Run `npm start` or `./ddstart` for docker-desktop on Linux
- Load the extension in your browser:
  - Firefox: Go to `about:debugging#/runtime/this-firefox` and select "Load Temporary Add-on."
- Create a `feature/`, `bugfix/`, etc. branch from the `main` base, where you'll commit your code

## Build and Package (for Mozilla code reviewers)

- to build and package into `artifacts/youtube_magic-<version>.zip`: run: `npm run build` or `./ddbuild` for docker-desktop on Linux

## Manual Build Pipeline (for extension developers)

- Create a pull request to merge your `feature/`, `bugfix/`, etc. branch into the `develop` branch
- Create `release/v<version>` off `develop` branch
- Update `version` in `package.json`, `manifest.json`, `CHANGELOG.md`
- Run `npm install` to update the version in `package-lock.json`
- Commit the changes on the `release/v<version>` branch
- To build for production, and package into `artifacts/youtube_magic-<version>.zip`: run: `npm run build` or `./ddbuild` for docker-desktop on Linux
- Submit zip file from `artifacts/` to https://addons.mozilla.org
- Once the extension is live, merge `release/v<version>` into `develop` and `main`
- Tag the latest commit: `git tag -a v<version> -m "Release <version>: <Summary of changes> - Published to Firefox Add-ons"`

## Zip Source Code

- run: `npm run zip-source`

## Directories

- `watch-output`: development bundle
- `build-output`: production bundle
- `artifacts`: publish-ready zip file created with`web-ext`

## License

MIT License

## Feedback

Report issues or suggest features on [GitHub Issues](https://github.com/coding24seven/youtube-magic/issues).
