# Filter YouTube Videos

A lightweight browser extension that automatically filters YouTube videos from channel pages (@channelname), keeping your YouTube channel feeds fresh and uncluttered.

## Features

- Filters out videos marked as "watched" on YouTube channel pages.
- Works on pages with URLs containing @channelname.
- Simple, fast, and no configuration needed.

## Installation

1. Download the extension from the [Firefox Add-ons](#) (links TBD).
2. Add the extension to your browser.
3. Enjoy a cleaner YouTube experience!

## Permissions

- Access to YouTube channel pages (`https://www.youtube.com/@*`) to detect and filter videos.
- No data collection or external requests.

## Development

- Clone this repository.
- Load the extension in your browser:
  - Firefox: Go to `about:debugging#/runtime/this-firefox` and select "Load Temporary Add-on."
- Modify `src/manifest.json` and other files as needed.
- Use Rollup for building (see `rollup.config.js`).

## License

MIT License

## Feedback

Report issues or suggest features on [GitHub Issues](https://github.com/your-repo/filter-youtube-videos/issues).
