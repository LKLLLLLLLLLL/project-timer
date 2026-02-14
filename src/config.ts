import * as vscode from 'vscode';

interface Config {
    statusBar: {
        enabled: boolean;
        displayPrecision: "second" | "minute" | "hour" | "auto";
        displayProjectName: boolean;
        displayToday: boolean;
    };
    timer: {
        pauseWhenUnfocused: boolean;
        unfocusedThreshold: number;
        pauseWhenIdle: boolean;
        idleThreshold: number;
    };
}

export function get_config(): Config {
    const config = vscode.workspace.getConfiguration('project-timer');
    if (config.get("timer.unfocusedThreshold") && config.get("timer.unfocusedThreshold") as number < 0) {
        console.warn(`Invalid value for 'project-timer.timer.unfocusedThreshold': ${config.get("timer.unfocusedThreshold")}. Must be a non-negative number.`);
    }
    if (config.get("timer.idleThreshold") && config.get("timer.idleThreshold") as number < 0) {
        console.warn(`Invalid value for 'project-timer.timer.idleThreshold': ${config.get("timer.idleThreshold")}. Must be a non-negative number.`);
    }
    return {
        statusBar: {
            enabled: config.get("statusBar.enabled", true) as Config['statusBar']['enabled'],
            displayPrecision: config.get("statusBar.displayPrecision", "auto") as Config['statusBar']['displayPrecision'],
            displayProjectName: config.get("statusBar.displayProjectName", true) as Config['statusBar']['displayProjectName'],
            displayToday: config.get("statusBar.displayToday", false) as Config['statusBar']['displayToday']
        },
        timer: {
            pauseWhenUnfocused: config.get("timer.pauseWhenUnfocused", true) as Config['timer']['pauseWhenUnfocused'],
            unfocusedThreshold: config.get("timer.unfocusedThreshold", 5) as Config['timer']['unfocusedThreshold'],
            pauseWhenIdle: config.get("timer.pauseWhenIdle", false) as Config['timer']['pauseWhenIdle'],
            idleThreshold: config.get("timer.idleThreshold", 5) as Config['timer']['idleThreshold']
        }
    };
}