import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { get_context } from './context';
import { get_project_time_info } from './storage';
import { get_project_name } from './utils';

export function openStatistics() {
    const panel = vscode.window.createWebviewPanel(
        'statistics',
        'Project Statistics',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            // restrict local resource roots to the view folder (copied to out/view during build)
            localResourceRoots: [vscode.Uri.file(path.join(get_context().extensionPath, 'out', 'view'))]
        }
    );

    const project_name = get_project_name();
    if (!project_name) {
        return;
    }

    // 1. get html file from packaged `out/view` (fall back to src during local dev)
    const outHtmlPath = path.join(get_context().extensionPath, 'out', 'view', 'stastics.html');
    const srcHtmlPath = path.join(get_context().extensionPath, 'src', 'view', 'stastics.html');
    const htmlPath = fs.existsSync(outHtmlPath) ? outHtmlPath : srcHtmlPath;
    let html = fs.readFileSync(htmlPath, 'utf8');

    // set a base href so relative resources inside the html resolve via the webview
    const baseUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(get_context().extensionPath, fs.existsSync(outHtmlPath) ? 'out' : 'src', 'view')));
    html = html.replace(/<head>/i, `<head><base href="${baseUri}/">`);
    panel.webview.html = html;

    // 2. send data to webview
    const info = get_project_time_info(project_name);
    panel.webview.postMessage({
        command: 'initData',
        payload: {
            projectName: info.project_name,
            history: info.history
        }
    });

    // 3. listen to messages from Webview
    panel.webview.onDidReceiveMessage(message => {
        if (message.command === 'refresh') {
            // Webview can also actively request to refresh data
            panel.webview.postMessage({ command: 'initData', payload: get_project_time_info(project_name) });
        }
    });
}