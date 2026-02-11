import * as vscode from 'vscode';
import { get_project_name } from './utils';
import { get_seconds } from './timer';

/// Open a new tab to display statistics
export function openStatistics(context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel(
        'statistics',
        'Statistics',
        vscode.ViewColumn.One,
        {}
    );
    const project_name = get_project_name();
    const total_seconds = get_seconds(context);
    
    const hrs = Math.floor(total_seconds / 3600);
    const mins = Math.floor((total_seconds % 3600) / 60);
    const secs = total_seconds % 60;
    const formatted_time = `${hrs}h ${mins}m ${secs}s`;

    panel.webview.html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Project Timer Statistics</title>
        </head>
        <body>
            <h1>Project Timer Statistics</h1>
            <p><strong>Current Project: </strong>${project_name}</p>
            <p><strong>Total Time: </strong>${formatted_time}</p>
        </body>
        </html>
    `;
}