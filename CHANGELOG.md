# Change Log

All notable changes to the "Project Timer" extension will be documented in this file.

## [Unreleased]
### Added
- Add `project-timer.timer.unfocusedThreshold` setting.
- Add `project-timer.timer.pauseWhenIdle` setting.

### Changed
- Change default value from `10` to `5` for `project-timer.timer.idleThreshold`.
- Change behavior of `0` value for `project-timer.timer.idleThreshold`
    - Before: `0` would disable idle detection.
    - After: `0` will be treated as `0` minutes (pause immediately when idle).

## [0.0.1] - 2026-02-12
Initial release of Project Timer.

### Added
#### Time Tracking
- **Core Timer**: Automatic real-time tracking of coding activity, including per-language and per-file breakdowns.
- **Idle Detection**: Configurable automatic pausing when user activity is not detected.
- **Focus Awareness**: Option to pause the timer when the VS Code window loses focus.

#### Visualization
- **Status Bar Integration**: A live-updating status bar item with customizable display options.
- **Statistics Webview**: A dedicated dashboard providing visual insights into coding history and patterns.

#### Data Management
- **Local Storage**: Secure storage within VS Code's global state.
- **Data Portability**: Commands to **Export**, **Import**, and **Reset** tracking data via JSON files.