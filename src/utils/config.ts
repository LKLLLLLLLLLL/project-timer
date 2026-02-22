import * as vscode from 'vscode';
import * as refresher from './refresher';
import * as logger from './logger';

let _cache: Config | undefined;

interface Config {
    statusBar: {
        enabled: boolean;
        displayPrecision: "second" | "minute" | "hour" | "auto";
        displayProjectName: boolean;
        displayTimeMode: "today" | "total" | "both";
    };
    timer: {
        pauseWhenUnfocused: boolean;
        unfocusedThreshold: number;
        pauseWhenIdle: boolean;
        idleThreshold: number;
    };
    synchronization: {
        enabled: boolean;
    };
}

export function init(): vscode.Disposable {
    const disposable = vscode.workspace.onDidChangeConfiguration(() => {
        _cache = undefined;
    });
    refresher.onRefresh(() => {
        _cache = undefined;
    });
    return disposable;
}

export function get(): Config {
    if (_cache) {
        return _cache;
    }
    const config = vscode.workspace.getConfiguration('project-timer');
    // check if configs legal
    if (config.get("timer.unfocusedThreshold") && config.get("timer.unfocusedThreshold") as number < 0) {
        logger.warn(`Invalid value for 'project-timer.timer.unfocusedThreshold': ${config.get("timer.unfocusedThreshold")}. Must be a non-negative number.`);
    }
    if (config.get("timer.idleThreshold") && config.get("timer.idleThreshold") as number < 0) {
        logger.warn(`Invalid value for 'project-timer.timer.idleThreshold': ${config.get("timer.idleThreshold")}. Must be a non-negative number.`);
    }
    _cache = {
        statusBar: {
            enabled: config.get("statusBar.enabled", true) as Config['statusBar']['enabled'],
            displayPrecision: config.get("statusBar.displayPrecision", "auto") as Config['statusBar']['displayPrecision'],
            displayProjectName: config.get("statusBar.displayProjectName", true) as Config['statusBar']['displayProjectName'],
            displayTimeMode: config.get("statusBar.displayTimeMode", "total") as Config['statusBar']['displayTimeMode']
        },
        timer: {
            pauseWhenUnfocused: config.get("timer.pauseWhenUnfocused", true) as Config['timer']['pauseWhenUnfocused'],
            unfocusedThreshold: config.get("timer.unfocusedThreshold", 5) as Config['timer']['unfocusedThreshold'],
            pauseWhenIdle: config.get("timer.pauseWhenIdle", false) as Config['timer']['pauseWhenIdle'],
            idleThreshold: config.get("timer.idleThreshold", 5) as Config['timer']['idleThreshold']
        },
        synchronization: {
            enabled: config.get("synchronization.enabled", false) as Config['synchronization']['enabled']
        }
    };
    return _cache;
}