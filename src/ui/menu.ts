import * as vscode from 'vscode';
import * as storage from '../core/storage';
import * as context from '../utils/context';

function formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
        return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
}

export function getMenu(): vscode.MarkdownString {
    const projectName = storage.get().displayName;
    const timeInfo = storage.get();

    const todayKey = new Date().toISOString().split('T')[0];
    const todayRecord = timeInfo.history[todayKey] || { seconds: 0, languages: {}, files: {} };

    const totalSeconds = storage.getTotalSeconds();
    const formattedTotal = formatDuration(totalSeconds);
    const formattedToday = formatDuration(todayRecord.seconds);
    const tooltip = new vscode.MarkdownString('', true);
    tooltip.supportHtml = true;
    tooltip.isTrusted = true;

    // header
    const extId = context.get().extension.id;
    const header = `
## Project Timer &nbsp; [$(settings-gear)](command:workbench.action.openSettings?%22@ext:${extId}%22 "Open Settings")
**Current project:**  \`${projectName}\` 

---
    `;
    tooltip.appendMarkdown(header);

    // summary row
    const summary = `
<span style="color:var(--vscode-descriptionForeground);">Today:</span> **${formattedToday}** &nbsp;&nbsp;|&nbsp;&nbsp; <span style="color:var(--vscode-descriptionForeground);">Total:</span> **${formattedTotal}** 

    `;
    tooltip.appendMarkdown(summary);

    // Top Languages Bar Chart
    const sortedLangs = Object.entries(todayRecord.languages)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);
    if (sortedLangs.length > 0) {
        // calculate percentage
        const total_session = Object.values(todayRecord.languages).reduce((a, b) => a + b, 0) || 1;

        tooltip.appendMarkdown(`\n**Top Languages**\n\n`);

        sortedLangs.forEach(([lang, secs], index) => {
            const percent = Math.round((secs / total_session) * 100);

            tooltip.appendMarkdown(`- **${lang}**: ${percent}%\n\n`);
        });
    }

    // Top file chart
    const sortedFiles = Object.entries(todayRecord.files)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);
    if (sortedFiles.length > 0) {
        // calculate percentage
        const totalSessionFiles = Object.values(todayRecord.files).reduce((a, b) => a + b, 0) || 1;

        tooltip.appendMarkdown(`\n**Top Files**\n\n`);

        sortedFiles.forEach(([file, secs], index) => {
            const percent = Math.round((secs / totalSessionFiles) * 100);

            tooltip.appendMarkdown(`- **${file}**: ${percent}%\n\n`);
        });
    }

    // bottom
    const bottom = `
---
$(graph) [View Detailed Statistics](command:project-timer.openStatistics)
    `;
    tooltip.appendMarkdown(bottom);

    return tooltip;
}