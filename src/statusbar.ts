import * as vscode from 'vscode';
import { get_seconds } from './timer';
import { get_config } from './utils';

let statusBarItem: vscode.StatusBarItem;

function formatSeconds(seconds: number): string {
    let display_precision = get_config().displayPrecision;
    let buf = '';
    switch (display_precision) {
        case "second": {
            const hrs = Math.floor(seconds / 3600);
            if (hrs > 0) {
                buf += `${hrs}h `;
            }
            const mins = Math.floor((seconds % 3600) / 60);
            if (mins > 0) {
                buf += `${mins}m `;
            }
            const secs = seconds % 60;
            buf += `${secs}s`; // last digit must be displayed
            return buf.trim();
        }
        case "minute": {
            const hrs = Math.floor(seconds / 3600);
            if (hrs > 0) {
                buf += `${hrs}h `;
            }
            const mins = Math.floor((seconds % 3600) / 60);
            buf += `${mins}m `; // last digit must be displayed
            return buf.trim();
        }
        case "hour": {
            const hrs = Math.floor(seconds / 3600);
            return `${hrs}h`;
        }
        default: {
            console.error(`Unknown display precision: ${get_config().displayPrecision}`);
            throw new Error(`Unknown display precision: ${get_config().displayPrecision}`);
        }
    }
}

function update_status_bar(context: vscode.ExtensionContext) {
    const seconds = get_seconds(context);
    const stats_bar_text = formatSeconds(seconds as number);
    statusBarItem.text = `$(clock) ${stats_bar_text}`;
    // statusBarItem.text = `$(pulse) ${stats_bar_text}`;
    statusBarItem.show();
}

let status_bar_interval: NodeJS.Timeout | undefined;

function register_interval(context: vscode.ExtensionContext) {
    if (status_bar_interval) {
        clearInterval(status_bar_interval);
    }
    const config = get_config();
    let refresh_interval: number; // in milisecond
    switch (config.displayPrecision) {
        case 'hour': {
            refresh_interval = 10 * 60 * 1000; // 10 min
            break;
        }
        case 'minute': {
            refresh_interval = 60 * 1000; // 1 min
            break;
        }
        case 'second': {
            refresh_interval = 1000; // 1 second
            break;
        }
        default: {
            console.error(`Unknown display precision: ${config.displayPrecision}`);
            throw new Error(`Unknown display precision: ${config.displayPrecision}`);
        }
    }
    status_bar_interval = setInterval(() => {
        update_status_bar(context);
    }, refresh_interval);
}
export function activate_status_bar(context: vscode.ExtensionContext) {
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    context.subscriptions.push(statusBarItem);
    context.subscriptions.push({ dispose: () => {
        if (status_bar_interval) {
            clearInterval(status_bar_interval);
        }
    }});
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(change => {
        if (change.affectsConfiguration('project-timer.displayPrecision')) {
            update_status_bar(context);
            register_interval(context);
        }
    }));
    update_status_bar(context); // update for the first time
    register_interval(context);
}