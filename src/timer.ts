import { get_project_time_info, set_project_time_info } from './storage';
import { get_project_name } from './utils';
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
    const duration = Date.now() - last_update;
    last_update = Date.now();
    const time_info = get_project_time_info(project_name);
    time_info.total_seconds += duration / 1000; // convert back to seconds
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
    context.subscriptions.push( {
        dispose: () => {
            
        }
    });
}

/// Get seconds for current project
export function get_seconds(): number {
    const project_name = get_project_name(); 
    if (project_name === undefined) {
        return 0;
    }
    const time_info = get_project_time_info(project_name);
    return time_info.total_seconds;
}