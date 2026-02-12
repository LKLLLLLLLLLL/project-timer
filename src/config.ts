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
        idleThreshold: number;
    };
}

export function get_config(): Config {
    const config = vscode.workspace.getConfiguration('project-timer');
    return {
        statusBar: {
            enabled: config.get("statusBar.enabled", true) as Config['statusBar']['enabled'],
            displayPrecision: config.get("statusBar.displayPrecision", "minute") as Config['statusBar']['displayPrecision'],
            displayProjectName: config.get("statusBar.displayProjectName", true) as Config['statusBar']['displayProjectName'],
            displayToday: config.get("statusBar.displayToday", true) as Config['statusBar']['displayToday']
        },
        timer: {
            pauseWhenUnfocused: config.get("timer.pauseWhenUnfocused", false) as Config['timer']['pauseWhenUnfocused'],
            idleThreshold: config.get("timer.idleThreshold", 300) as Config['timer']['idleThreshold']
        }
    };
}