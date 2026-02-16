# <img src="./icon.png" alt="Project Timer icon" style="height: 28px">&nbsp;&nbsp; Project Timer

Project Timer is a lightweight VS Code extension that tracks the time you spend on your projects. It provides detailed insights into your productivity by analyzing your coding activity by dates, programming languages and specific files.

## Features

- **Local Storage**: The extension runs entirely locally. Your data is never uploaded or tracked.
- **Real-time Status Bar Timer**: Displays a timer in the VS Code status bar showing your progress in real-time. The display format is customizable.
- **Smart Idle Detection**: Automatically pauses the timer when you are inactive for a configurable duration.
- **Visual Statistics**: Provides a comprehensive webview with charts and insights into your coding habits.

## Usage

Simply open a folder or workspace, and **Project Timer** will begin tracking. The timer will appear in the status bar. Click on the status bar item to quickly open the statistics view.

## Extension Settings

This extension contributes the following settings:

* `project-timer.statusBar.enabled`: Enable or disable the status bar timer.
* `project-timer.statusBar.displayPrecision`: Set time precision to `second`, `minute`, `hour`, or `auto`.
* `project-timer.statusBar.displayProjectName`: Toggle the visibility of the project name in the status bar.
* `project-timer.statusBar.displayTimeMode`: Set the display mode to `today`, `total`, or `both`.
* `project-timer.timer.pauseWhenUnfocused`: Automatically pause the timer when VS Code is not the active window.
* `project-timer.timer.unfocusedThreshold`: Set the threshold (in minutes) for unfocused pause. If the window is unfocused for longer than this threshold, the timer will pause.
* `project-timer.timer.pauseWhenIdle`: Automatically pause the timer when user is idle.
* `project-timer.timer.idleThreshold`: Set the idle time threshold (in minutes) after which the timer pauses. Set to `0` to disable.

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
- [ ] Support data synchronization across multiple devices.
- [ ] Support more identifier to recoginize project, e.g. workspace name / workspace folder / git repo url...
- [ ] support upgrade workspace folder to multi-root workspace.
- [ ] support time period statistics.

## Relative links
- [Project Timer in VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=LKL.project-timer)
- [Project Timer github repository](https://github.com/LKLLLLLLLLLL/project-timer) 
- [Project Timer icon](https://pictogrammers.com/library/mdi/icon/timeline-clock-outline/)

## Release Notes

### 0.0.2
- Improved time tracking precision with new setting items.
- Refactored status bar display modes for better customization.
- UI refinements and optimized default configurations.

### 0.0.1

- Initial release of Project Timer.
- Automatic time tracking with idle detection and focus awareness.
- Visual statistics dashboard.
- Data export/import and management tools.
