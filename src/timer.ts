import * as vscode from 'vscode';
import { calculate_total_seconds, create_default_daily_record, get_project_time_info, set_project_time_info } from './storage';
import { get_current_file, get_current_language, get_date, get_project_name, on_active } from './utils';
import { get_config } from './config';
import { get_context } from './context';

let last_update: number | undefined; // timestamp in milliseconds

function update_timer() {
    const project_name = get_project_name();
    if (project_name === undefined) {
        return;
    }
    if (last_update === undefined) {
        last_update = Date.now();
        return;
    }
    if (!is_timer_running()) {
        last_update = undefined;
        return;
    }
    const duration = Date.now() - last_update;
    last_update = Date.now();
    const time_info = get_project_time_info(project_name);
    // update time info
    const date = get_date();
    if (time_info.history[date] === undefined) {
        time_info.history[date] = create_default_daily_record();
    }
    // 1. update seconds
    time_info.history[date].seconds += duration / 1000; // convert back to seconds
    // 2. update languages
    const current_language = get_current_language();
    if (current_language !== undefined) {
        time_info.history[date].languages[current_language] = (time_info.history[date].languages[current_language] || 0) + duration / 1000;
    }
    // 3. update files
    const file_name = get_current_file();
    if (file_name !== undefined && !file_name.startsWith('/')) { // avoid absolute path
        time_info.history[date].files[file_name] = (time_info.history[date].files[file_name] || 0) + duration / 1000;
    }
    set_project_time_info(project_name, time_info);
}

/// Init and begin timer
export function begin_timer() {
    const project_name = get_project_name();
    if (project_name === undefined) {
        console.log('No project name found.');
        return;
    }
    const interval = setInterval(() => update_timer(), 1000); // update every second
    const context = get_context();
    context.subscriptions.push({ dispose: () => clearInterval(interval) });
    // register event listener for activity
    on_active(() => {
        last_active = Date.now();
    });
}

/// Get total seconds for current project
export function get_seconds(): number {
    const project_name = get_project_name();
    if (project_name === undefined) {
        return 0;
    }
    const time_info = get_project_time_info(project_name);
    return calculate_total_seconds(time_info);
}

/// Get today seconds for current project
export function get_today_seconds(): number {
    const project_name = get_project_name();
    if (project_name === undefined) {
        return 0;
    }
    const time_info = get_project_time_info(project_name);
    const date = get_date();
    if (time_info.history[date] === undefined) {
        return 0;
    }
    return time_info.history[date].seconds;
}

let last_active: number = Date.now();

/// Detect if timer should be running
export function is_timer_running(): boolean {
    // 1. check focuse
    const config = get_config();
    if (config.timer.pauseWhenUnfocused && !vscode.window.state.focused) {
        return false;
    }
    // 2. check idle
    if (config.timer.idleThreshold > 0) {
        const idle_ms = config.timer.idleThreshold * 60 * 1000;
        if (Date.now() - last_active > idle_ms) {
            return false;
        }
    }
    return true;
}