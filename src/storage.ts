import * as vscode from 'vscode';
import { get_context } from './context';

interface ProjectTimeInfo {
    readonly project_name: string, // TODO: support other way to identify projects
    total_seconds: number
}

const Cache = new Map<string, ProjectTimeInfo>(); // key -> time_info
let last_flush = Date.now();

export function get_project_time_info(project_name: string): ProjectTimeInfo {
    const context = get_context();
    const key = `timerStorage-${project_name}`;
    if (Cache.has(key)) {
        return Cache.get(key)!;
    }
    const time_info = context.globalState.get<ProjectTimeInfo>(key) || {
        project_name: project_name,
        total_seconds: 0
    };
    Cache.set(key, time_info);
    return time_info;
}

export function flush() {
    for (const [key, time_info] of Cache.entries()) {
        const context = get_context();
        context.globalState.update(key, time_info);
    }
    last_flush = Date.now();
}

export function set_project_time_info(project_name: string, time_info: ProjectTimeInfo) {
    const key = `timerStorage-${project_name}`;
    Cache.set(key, time_info);
    if (Date.now() - last_flush > 60 * 1000) { // flush every 5 seconds
        flush();
    }
}

export function delete_all_time_info() {
    // 1. delete cache
    Cache.clear();
    last_flush = Date.now();
    // 2. delete from global state
    const context = get_context();
    context.globalState.keys().forEach(key => {
        context.globalState.update(key, undefined);
    });
}