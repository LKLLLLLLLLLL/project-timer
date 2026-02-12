import * as vscode from 'vscode';
import { get_context } from './context';

export interface DailyRecord {
    seconds: number;
    languages: Record<string, number>;
    files: Record<string, number>;
}

export function create_default_daily_record(): DailyRecord {
    return { seconds: 0, languages: {}, files: {} };
}

export interface ProjectTimeInfo {
    readonly project_name: string;
    history: Record<string, DailyRecord>;
}

export function calculate_total_seconds(info: ProjectTimeInfo): number {
    let total = 0;
    for (const record of Object.values(info.history)) {
        total += record.seconds;
    }
    return total;
}

const cache = new Map<string, ProjectTimeInfo>(); // key -> time_info
let last_flush = Date.now();

export function get_project_time_info(project_name: string): ProjectTimeInfo {
    const context = get_context();
    const key = `timerStorage-${project_name}`;
    if (cache.has(key)) {
        return cache.get(key)!;
    }
    const time_info = context.globalState.get<ProjectTimeInfo>(key) || { project_name, history: {} };
    cache.set(key, time_info);
    return time_info;
}

export function flush() {
    for (const [key, time_info] of cache.entries()) {
        const context = get_context();
        context.globalState.update(key, time_info);
    }
    last_flush = Date.now();
}

export function set_project_time_info(project_name: string, time_info: ProjectTimeInfo) {
    const key = `timerStorage-${project_name}`;
    cache.set(key, time_info);
    if (Date.now() - last_flush > 60 * 1000) { // flush every 5 seconds
        flush();
    }
}

export function delete_all_time_info() {
    // 1. delete cache
    cache.clear();
    last_flush = Date.now();
    // 2. delete from global state
    const context = get_context();
    context.globalState.keys().forEach(key => {
        context.globalState.update(key, undefined);
    });
}

export function export_all_data_obj() {
    flush();
    const context = get_context();
    const allData: Record<string, ProjectTimeInfo> = {};
    context.globalState.keys().forEach(key => {
        const data = context.globalState.get<ProjectTimeInfo>(key);
        if (data) {
            allData[key] = data;
        }
    });
    return allData;
}

export function import_data_obj(data: Record<string, ProjectTimeInfo>) {
    flush();
    cache.clear();
    const context = get_context();
    for (const [key, time_info] of Object.entries(data)) {
        context.globalState.update(key, time_info);
    }
}