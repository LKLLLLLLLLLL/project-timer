import * as vscode from 'vscode';
import { get_project_name } from './utils';
import { get_seconds } from './timer';
import { get_project_time_info } from './storage';

/// Open a new tab to display statistics
export function openStatistics() {
    const panel = vscode.window.createWebviewPanel(
        'statistics',
        'Statistics',
        vscode.ViewColumn.One,
        {}
    );
    const project_name = get_project_name();
    if (!project_name) {
        return;
    }
    const total_seconds = get_seconds();

    const hrs = Math.floor(total_seconds / 3600);
    const mins = Math.floor((total_seconds % 3600) / 60);
    const secs = total_seconds % 60;
    const formatted_time = `${hrs.toFixed(0)}h ${mins.toFixed(0)}m ${secs.toFixed(0)}s`;

    const info = get_project_time_info(project_name);

    let htmlContent = `
        <h1>Project Timer Statistics</h1>
        <p><strong>Current Project: </strong>${project_name}</p>
        <p><strong>Total Time: </strong>${formatted_time}</p>
        <h2>History</h2>
    `;

    for (const [date, record] of Object.entries(info.history)) {
        htmlContent += `<h3>${date}</h3><p>Total Seconds: ${record.seconds}</p>`;
        if (Object.keys(record.languages).length > 0) {
            htmlContent += `<h4>Languages:</h4><ul>`;
            for (const [lang, secs] of Object.entries(record.languages)) {
                htmlContent += `<li>${lang}: ${secs} seconds</li>`;
            }
            htmlContent += `</ul>`;
        }
        if (Object.keys(record.files).length > 0) {
            htmlContent += `<h4>Files:</h4><ul>`;
            for (const [file, secs] of Object.entries(record.files)) {
                htmlContent += `<li>${file}: ${secs} seconds</li>`;
            }
            htmlContent += `</ul>`;
        }
    }
    panel.webview.html = htmlContent;
}