import * as vscode from 'vscode';
import { get_seconds } from './timer';
import { get_config, get_project_name } from './utils';

type Precision = 'second' | 'minute' | 'hour';

/// Get 'displayPrecision' from config and convert it into Precision.
/// This will automatically calculate 'auto' to concrete precision type.
function get_precision(seconds: number): Precision {
    const config = get_config();
    if (config.displayPrecision === "auto") {
        if (seconds < 3600) {
            return "second";
        } else {
            return "minute";
        }
    }
    return config.displayPrecision;
}

function formatSeconds(seconds: number): string {
    let display_precision = get_precision(seconds);
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

function render_status_bar(context: vscode.ExtensionContext) {
    const seconds = get_seconds(context);
    // 1. update status bar text
    const stats_bar_text = formatSeconds(seconds);
    statusBarItem.text = `$(clock) ${stats_bar_text}`;
    // statusBarItem.text = `$(pulse) ${stats_bar_text}`;
    // 2. update hover menu
    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown(`### Project Timer\n\n`);
    tooltip.appendMarkdown(`--- \n\n`);
    tooltip.appendMarkdown(`**Current Project**: \`${get_project_name()}\`  \n`);
    tooltip.appendMarkdown(`**Total Time**: \`${stats_bar_text}\`  \n\n`);
    tooltip.appendMarkdown(`Click to view detailed statistics`);
    statusBarItem.tooltip = tooltip;
    // 3. add click event
    statusBarItem.command = 'project-timer.openStatistics';
    statusBarItem.show();
}

let statusBarItem: vscode.StatusBarItem;
let last_precision: Precision | undefined;
function update_status_bar(context: vscode.ExtensionContext) {
    if (get_project_name() === undefined) { // no folder is opened
        console.log("No project folder opened");
        statusBarItem.hide();
        return;
    }
    const current_precision = get_precision(get_seconds(context));
    if (last_precision === undefined) {
        last_precision = current_precision;
    } else { // check if precision changed, if changed update interval
        if (current_precision !== last_precision) {
            last_precision = current_precision;
            register_interval(context, current_precision);
            return;
        }
    }
    render_status_bar(context);
}

let status_bar_interval: NodeJS.Timeout | undefined;

function register_interval(context: vscode.ExtensionContext, precision: Precision) {    
    render_status_bar(context); // render for the first time
    if (status_bar_interval) {
        clearInterval(status_bar_interval);
    }
    let refresh_interval: number; // in milisecond
    switch (precision) {
        case 'hour': {
            refresh_interval = 10 * 60 * 1000; // 10 min
            break;
        }
        case 'minute': {
            refresh_interval = 20 * 1000; // 20 seconds
            break;
        }
        case 'second': {
            refresh_interval = 1000; // 1 second
            break;
        }
        default: {
            console.error(`Unknown display precision: ${precision}`);
            throw new Error(`Unknown display precision: ${precision}`);
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
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(change => { // listen config change
        if (change.affectsConfiguration('project-timer.displayPrecision')) {
            register_interval(context, get_precision(get_seconds(context)));
        }
    }));
    register_interval(context, get_precision(get_seconds(context)));
}