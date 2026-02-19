# CliKy

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.1-green.svg)

**CliKy** is a modern, cross-platform clicker and macro tool built with Tauri and React. It is **specifically designed for Arc Raiders** to assist with advanced mechanics and duplication glitches.

This tool features a sleek, transparent UI, powerful macro capabilities for "snap hook tech", and an in-game overlay for real-time status monitoring. It has been heavily tested, is **undetected**, and is currently considered safe to use (not bannable).

## Features

- **Inhuman Click Speed**: Optimized for "Kettle" and "Burletta" usage, clicking significantly faster than humanly possible.
- **Snap Hook Automation**: Dedicated macro split into two seamless parts:
    1.  Instantly moves your snap hook from **Safe Pocket** to **Quick Use**.
    2.  Moves it back to **Safe Pocket** just as fast.
    - All actions are performed in **less than a second**—making complex tech effortless (just aim and shoot).
- **Overlay Mode**: Always-on-top overlay to monitor status and CPS while in-game.
- **Modern UI**: Beautiful, transparent interface built with React and Tailwind CSS.
- **Cross-Platform**: Runs on Windows, macOS, and Linux (tested primarily on Windows).

## Prerequisites

Before getting started, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v16 or newer)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (for Windows)

## Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/jynxzio5/cliky.git
    cd cliky
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

## Development

To run the application in development mode with hot-reloading:

```bash
npm run tauri dev
```

## Build

To build the application for production:

```bash
npm run tauri build
```

The executable will be located in `src-tauri/target/release/bundle`.

## Contributing

Contributions are welcome! Please check out the [CONTRIBUTING.md](CONTRIBUTING.md) guide for details on how to get started.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
