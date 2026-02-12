import * as vscode from 'vscode';
import { get_seconds, is_timer_running } from './timer';
import { get_project_name, on_active } from './utils';
import { get_config } from './config';
import { get_context } from './context';
import { get_menu } from './menu';

type Precision = 'second' | 'minute' | 'hour';

/// Get 'displayPrecision' from config and convert it into Precision.
/// This will automatically calculate 'auto' to concrete precision type.
function get_precision(seconds: number): Precision {
    const config = get_config();
    if (config.statusBar.displayPrecision === "auto") {
        if (seconds < 3600) {
            return "second";
        } else {
            return "minute";
        }
    }
    return config.statusBar.displayPrecision;
}

function formatSeconds(seconds: number): string {
    let display_precision = get_precision(seconds);
    let buf = '';
    switch (display_precision) {
        case "second": {
            const hrs = Math.floor(seconds / 3600);
            if (hrs > 0) {
                buf += `${hrs.toFixed(0)}h `;
            }
            const mins = Math.floor((seconds % 3600) / 60);
            if (mins > 0) {
                buf += `${mins.toFixed(0)}m `;
            }
            const secs = seconds % 60;
            buf += `${secs.toFixed(0)}s`; // last digit must be displayed
            return buf.trim();
        }
        case "minute": {
            const hrs = Math.floor(seconds / 3600);
            if (hrs > 0) {
                buf += `${hrs.toFixed(0)}h `;
            }
            const mins = Math.floor((seconds % 3600) / 60);
            buf += `${mins.toFixed(0)}m `; // last digit must be displayed
            return buf.trim();
        }
        case "hour": {
            const hrs = Math.floor(seconds / 3600);
            return `${hrs.toFixed(0)}h`;
        }
        default: {
            console.error(`Unknown display precision: ${get_config().statusBar.displayPrecision}`);
            throw new Error(`Unknown display precision: ${get_config().statusBar.displayPrecision}`);
        }
    }
}

let last_tooltip = "";
function render_status_bar() {
    const seconds = get_seconds();
    // 1. update status bar text
    let stats_bar_text: string;
    const display_style = get_config().statusBar.displayStyle;
    switch (display_style) {
        case 'compact': {
            stats_bar_text = formatSeconds(seconds);
            break;
        }
        case 'verbose': {
            const project_name = get_project_name();
            stats_bar_text = `${project_name}: ${formatSeconds(seconds)}`;
            break;
        }
        default: {
            console.error(`Unknown display style: ${display_style}`);
            throw Error(`Unknown display style: ${display_style}`);
        }
    }
    if (is_timer_running()) {
        statusBarItem.text = `$(clockface) ${stats_bar_text}`;
    } else {
        statusBarItem.text = `$(coffee) ${stats_bar_text}`;
    }
    // 2. update hover menu
    const tooltip = get_menu(seconds);
    if (tooltip.value !== last_tooltip) {
        last_tooltip = tooltip.value;
        statusBarItem.tooltip = tooltip;
    }
    // 3. add click event
    statusBarItem.command = 'project-timer.openStatistics';
    statusBarItem.show();
}

let statusBarItem: vscode.StatusBarItem;
let last_precision: Precision | undefined;
function update_status_bar() {
    if (get_project_name() === undefined) { // no folder is opened
        console.log("No project folder opened");
        statusBarItem.hide();
        return;
    }
    const current_precision = get_precision(get_seconds());
    if (last_precision === undefined) {
        last_precision = current_precision;
    } else { // check if precision changed, if changed update interval
        if (current_precision !== last_precision) {
            console.log(`Display precision changed from ${last_precision} to ${current_precision}`);
            last_precision = current_precision;
            register_interval(current_precision);
            return;
        }
    }
    render_status_bar();
}

let status_bar_interval: NodeJS.Timeout | undefined;

function register_interval(precision: Precision) {
    render_status_bar(); // render for the first time
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
        update_status_bar();
    }, refresh_interval);
}

export function activate_status_bar() {
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    const context = get_context();
    context.subscriptions.push(statusBarItem);
    context.subscriptions.push({
        dispose: () => {
            if (status_bar_interval) {
                clearInterval(status_bar_interval);
            }
        }
    });
    // register updater
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(change => { // listen config change
        if (change.affectsConfiguration('project-timer.statusBar')) {
            register_interval(get_precision(get_seconds()));
        }
    }));
    on_active(() => {
        update_status_bar();
    });
    register_interval(get_precision(get_seconds()));
}