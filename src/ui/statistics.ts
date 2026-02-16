import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as context from '../utils/context';
import * as storage from '../core/storage';

export function openStatistics() {
    const panel = vscode.window.createWebviewPanel(
        'statistics',
        'Project Statistics',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            // restrict local resource roots to the view folder (copied to out/view during build)
            localResourceRoots: [vscode.Uri.file(path.join(context.get().extensionPath, 'src', 'view'))]
        }
    );

    const projectName = storage.get().displayName;
    if (!projectName) {
        return;
    }

    // 1. get html file from packaged `out/view` (fall back to src during local dev)
    const devWebviewPath = path.join(context.get().extensionPath, 'src', 'view');
    const podWebviewPath = path.join(context.get().extensionPath, 'out', 'view');
    const webviewPath = fs.existsSync(devWebviewPath) ? devWebviewPath : podWebviewPath;
    const htmlPath = path.join(webviewPath, 'statistics.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    // set a base href so relative resources inside the html resolve via the webview
    const baseUri = panel.webview.asWebviewUri(vscode.Uri.file(webviewPath));
    html = html.replace(/<head>/i, `<head><base href="${baseUri}/">`);
    panel.webview.html = html;

    // 2. send data to webview
    const info = storage.get();
    panel.webview.postMessage({
        command: 'initData',
        payload: {
            projectName: info.displayName,
            history: info.history
        }
    });

    // 3. listen to messages from Webview
    panel.webview.onDidReceiveMessage(message => {
        if (message.command === 'refresh') {
            // Webview can also actively request to refresh data
            panel.webview.postMessage({ command: 'initData', payload: storage.get() });
        }
    });
}