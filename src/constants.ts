/**
 * Frequency of the main timer loop for tracking activity and active files.
 */
export const TIMER_TICK_MS = 1000; // 1 second

/**
 * Cache duration for time calculations. 
 * Controls how frequently aggregated data (including remote syncs) is re-calculated.
 */
export const CALCULATOR_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Interval to flush local tracking data to VS Code's global storage.
 */
export const FLUSH_INTERVAL_MS = 60 * 1000; // 60 seconds

/**
 * Interval to refresh project metadata (Git URLs, folder paths).
 * Automatically resets on workspace changes.
 * This will only influence how often project timer will update when user add git repository.
 */
export const MATCHINFO_REFRESH_INTERVAL_MS = 60 * 1000; // 60 seconds

/**
 * Throttle interval for re-rendering the status bar hover menu content.
 */
export const MENU_UPDATE_INTERVAL_MS = 60 * 1000; // 60 seconds

/**
 * Interval to update the status bar text.
 * The interval depends on the display precision of status bar item.
 */
export const STATUS_BAR_UPDATE_INTERVAL_MS = {
    "second": 1000,        // 1 second
    "minute": 60 * 1000,   // 1 minute
    "hour": 60 * 60 * 1000 // 10 minutes
};
