import * as vscode from 'vscode';

interface ProjectTimeInfo {
    readonly project_name: string, // TODO: support other way to identify projects
    total_seconds: number
}

export function get_project_time_info(context: vscode.ExtensionContext, project_name: string): ProjectTimeInfo {
    const time_info = context.globalState.get<ProjectTimeInfo>(`timerStorage-${project_name}`) || {
        project_name: project_name,
        total_seconds: 0
    };
    return time_info;
}

export function set_project_time_info(context: vscode.ExtensionContext, project_name: string, time_info: ProjectTimeInfo) {
    context.globalState.update(`timerStorage-${project_name}`, time_info);
}

export function delete_all_time_info(context: vscode.ExtensionContext) {
    context.globalState.keys().forEach(key => {
        context.globalState.update(key, undefined);
    });
}