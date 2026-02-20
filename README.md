# <img src="./icon.png" alt="Project Timer icon" style="height: 28px">&nbsp;&nbsp; Project Timer

Project Timer is a lightweight VS Code extension that tracks the time you spend on your projects. It provides detailed insights into your productivity by analyzing your coding activity by dates, programming languages and specific files.

## Features

- **Privacy-first Storage**: Stores data locally in VS Code; synchronization happens only through Settings Sync.
- **Cross-device synchronization**: Optionally, you can enable synchronization across multiple devices using VS Code Settings Sync.
- **Real-time Status Bar Timer**: Displays a timer in the VS Code status bar showing your progress in real-time. The display format is customizable.
- **Smart Idle Detection**: Automatically pauses the timer when you are inactive for a configurable duration.
- **Visual Statistics**: Provides a comprehensive webview with charts and insights into your coding habits.

## Usage

Simply open a folder or workspace, and **Project Timer** will begin tracking. 
The timer will appear in the status bar. Click on the status bar item to quickly open the statistics view.

*Note: On the first launch of this version, you will be prompted to choose whether to enable synchronization.*

## Extension Settings

This extension contributes the following settings:

- `project-timer.statusBar.enabled`: Enable or disable the status bar timer.
- `project-timer.statusBar.displayPrecision`: Set time precision to `second`, `minute`, `hour`, or `auto`.
- `project-timer.statusBar.displayProjectName`: Toggle the visibility of the project name in the status bar.
- `project-timer.statusBar.displayTimeMode`: Set the display mode to `today`, `total`, or `both`.
- `project-timer.timer.pauseWhenUnfocused`: Automatically pause the timer when VS Code is not the active window.
- `project-timer.timer.unfocusedThreshold`: Set the threshold (in minutes) for unfocused pause. If the window is unfocused for longer than this threshold, the timer will pause.
- `project-timer.timer.pauseWhenIdle`: Automatically pause the timer when user is idle.
- `project-timer.timer.idleThreshold`: Set the idle time threshold (in minutes) after which the timer pauses. Set to `0` to disable.
- `project-timer.synchronization.enabled`: Enable or disable data synchronization via VS Code Settings Sync.

## Commands

- `Project Timer: Open Statistics`: View your project's time tracking dashboard.
- `Project Timer: Export Data`: Save your tracking history to a JSON file.
- `Project Timer: Import Data`: Load tracking history from a previously exported JSON file.
- `Project Timer: Delete All Storage`: Clear all local tracking data, both current device and remote devices (requires confirmation).

## Development

1. clone repository
    ```bash
    git clone https://github.com/LKLLLLLLLLLL/project-timer.git
    cd project-timer
    ```
2. install dependencies
    ```bash
    npm install
    ```
3. debug extension  
    Press F5 to toggle debug mode.
4. build VSIX
    ```bash
    npm run build
    ```
5. prepare to release
   ```bash
   git run prerelease
   ```
6. release
   - release on github
    ```bash
    git tag vX.X.X
    git push origin vX.X.X # Toggle github action to release
    ```
   - release on marketplace
    ```bash
    npm run build -- -o project-timer_vX.X.X.vsix
    ```
    Then manually upload to [Marketplace](https://marketplace.visualstudio.com/manage).


## TODO
- [x] Support data synchronization across multiple devices.
- [ ] Support more identifiers to recognize project, e.g. workspace name / workspace folder / git repo url...
- [ ] Support project name customization.
- [ ] support upgrade workspace folder to multi-root workspace.
- [ ] Support time period statistics (weekly/monthly reports).

## Relative links
- [Project Timer in VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=LKL.project-timer)
- [Project Timer github repository](https://github.com/LKLLLLLLLLLL/project-timer) 
- [Project Timer icon](https://pictogrammers.com/library/mdi/icon/timeline-clock-outline/)

## Release Notes

### 0.1.1
- Introduced Storage cache system to improve performance.
- Fixed timer remaining at 0/1s when multiple windows were open simultaneously.
- Fixed issue where statistics were incorrectly merged when multiple project folders existed under the same parent directory.

### 0.1.0
- Introduced V2 data storage structure with automatic migration from V1.
- Added synchronization support via VS Code Settings Sync.
- Added a one-time prompt to choose synchronization preference on startup.
- Refined Import, Export, and Delete command behaviors for multi-device data management.
- Fixed a bug where the status bar timer failed to refresh periodically.

### 0.0.2
- Improved time tracking precision with new setting items.
- Refactored status bar display modes for better customization.
- UI refinements and optimized default configurations.

### 0.0.1

- Initial release of Project Timer.
- Automatic time tracking with idle detection and focus awareness.
- Visual statistics dashboard.
- Data export/import and management tools.
