# CliKy

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

**CliKy** is a modern, cross-platform clicker and macro tool built with Tauri and React. It features a sleek, transparent UI, powerful macro capabilities, and an in-game overlay for real-time status monitoring.

## Features

- **High-Performance Clicking**: Optimized backend for low-latency click simulation.
- **Advanced Macros**: Record and replay complex mouse and keyboard sequences.
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
    git clone https://github.com/motas/cliky.git
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
