# Change Log

All notable changes to the "Project Timer" extension will be documented in this file.

## [Unreleased]
### Added
- MatchInfo cache to improve performance.

### Fixed
- Fixed the appearance of multi-project records for single project on same device.

## [0.2.0] - 2026-2-20
### Added
- Supports matching projects using Git remote URLs.
- Added a new command `Project Timer: Rename Project` and button on the status bar menu to allow personalized display names for your projects.
- Implemented a cache for status bar text to minimize CPU usage.

## [0.1.1] - 2026-2-20
### Added
- Storage cache system to improve performance.

### Fixed
- Fixed timer remaining at 0/1s when multiple windows were open simultaneously.
- Fixed issue where statistics were incorrectly merged when multiple project folders existed under the same parent directory.

## [0.1.0] - 2026-02-18
### Added
- Introduced new **V2 storage**, to support more functions.
    - New `deviceId` entry for better synchronization support.
    - New `displayName` entry to support customize project name (to be implemented in future versions).
    - Enhanced metadata to match project folders across different devices.
    - Support aggregation queries to analyze all statistics across all devices.
    - Automatic migration of legacy V1 data to V2.
- **Synchronization**: All statistics are now synchronized across devices by default via VS Code Settings Sync Service. This can be configured via new `project-timer.synchronization.enabled` setting.

### Changed
- Refactored file structure, code style, and naming conventions to improve maintainability.
- Standardized `Project Timer: Import Data` command behavior: 
    - Importing data from the **same device** overwrites existing local data.
    - Importing data from a **different device** overwrites that specific device's remote data, which is then aggregated in statistics.
    
    *Note: While multi-importing V2 files is idempotent (safe), importing the same V1 data multiple times will result in cumulative data accumulation due to backward compatibility logic.*
- Standardized `Project Timer: Export Data` command: Now exports all version-wide records from all devices, including both local and cloud-synced data.
- Standardized `Project Timer: Delete All` command: Deletes all version-wide storage across all devices, including both local and cloud-synced data.

## [0.0.2] - 2026-02-13
### Added
- Add `project-timer.timer.unfocusedThreshold` setting.
- Add `project-timer.timer.pauseWhenIdle` setting.

### Changed
- Updated default `project-timer.timer.idleThreshold` from `10` to `5` minutes to increase precision.
- Standardized behavior of `0` value for `project-timer.timer.idleThreshold`
    - Before: `0` would disable idle detection.
    - After: `0` will be treated as `0` minutes (pause immediately when idle).
- Changed project name style on status bar menu.
- Refactored `project-timer.statusBar.displayToday` into a more versatile `displayTimeMode` setting, allowing users to choose between showing `today`, `total`, or `both` time metrics.

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