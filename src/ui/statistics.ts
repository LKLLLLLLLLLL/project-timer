import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as context from '../utils/context';
import * as storage from '../core/storage';
import { todayDate } from '../utils';

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

    const projectName = storage.getProjectName();
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

    // 2. build and send payload (merged across all synced devices)
    function buildPayload() {
        const allDevices = storage.getAllDevicesForCurrentProject();
        const machineId = vscode.env.machineId;
        const today = todayDate();

        // Merge histories from all devices
        let mergedHistory = allDevices[0]?.history ?? {};
        for (let i = 1; i < allDevices.length; i++) {
            mergedHistory = storage.mergeHistory(mergedHistory, allDevices[i].history);
        }

        // Per-device summaries for the devices panel
        const devices = allDevices.map(d => {
            let totalSeconds = 0;
            let todaySeconds = 0;
            for (const [date, rec] of Object.entries(d.history)) {
                totalSeconds += rec.seconds;
                if (date === today) { todaySeconds += rec.seconds; }
            }
            return {
                deviceName: d.deviceName || d.deviceId,
                isLocal: d.deviceId === machineId,
                totalSeconds,
                todaySeconds,
                history: d.history
            };
        });

        return {
            projectName: storage.getProjectName(),
            history: mergedHistory,
            devices
        };
    }

    panel.webview.postMessage({ command: 'initData', payload: buildPayload() });

    // 3. listen to messages from Webview
    panel.webview.onDidReceiveMessage(message => {
        if (message.command === 'refresh') {
            panel.webview.postMessage({ command: 'initData', payload: buildPayload() });
        }
    });
}