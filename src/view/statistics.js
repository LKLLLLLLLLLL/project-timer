// @ts-nocheck

// ── Palette ───────────────────────────────────────────────
const PALETTE = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#F97316', '#6366F1', '#EC4899', '#0EA5A4'
];

// ── ECharts instance (single chart) ──────────────────────
const chartDom = document.getElementById('chart-main');
const mainChart = echarts.init(chartDom);
chartDom.style.background = 'transparent';

// ── State ─────────────────────────────────────────────────
let _data = null;
let _currentRange = 30; // 7 | 30 | 90 | 0 (= all)

// ── Initialize data ───────────────────────────────────────────
const vscode = acquireVsCodeApi();
vscode.postMessage({ command: 'getData' });

// ── Message handler ───────────────────────────────────────
window.addEventListener('message', e => {
    if (e.data.command === 'data') {
        _data = e.data.payload;
        updateUI(_data);
    }
});

// ── Range tab wiring ──────────────────────────────────────
document.querySelectorAll('.range-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.range-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _currentRange = parseInt(btn.dataset.range, 10);
        if (_data) { renderChart(_data.history, _currentRange); }
    });
});

// ── Resize Observer for Chart (Debounced) ──────────────────
let _resizeTimer = null;
const _ro = new ResizeObserver(() => {
    if (_resizeTimer) { clearTimeout(_resizeTimer); }
    _resizeTimer = setTimeout(() => {
        mainChart.resize();
    }, 100);
});
_ro.observe(document.body);

// ── Event Delegation for Clickable Files ──────────────────
document.getElementById('top-files').addEventListener('click', (e) => {
    const item = e.target.closest('.item-group--clickable');
    if (item && item.dataset.path) {
        vscode.postMessage({ command: 'openFile', path: item.dataset.path });
    }
});

// ── Helpers ───────────────────────────────────────────────

function fmtDuration(sec) {
    if (!sec) { return '0 m'; }
    if (sec < 60) { return Math.round(sec) + ' s'; }
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h === 0) { return m + ' m'; }
    if (m === 0) { return h + ' h'; }
    return h + ' h ' + m + ' m';
}

function getCssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function lastNDates(n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        out.push(d.toLocaleDateString('sv').slice(0, 10));
    }
    return out;
}

function escapeHtml(str) {
    if (!str) { return ''; }
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
}

// ── Main UI Entry ─────────────────────────────────────────

function updateUI(data) {
    const history = data.history || {};
    const allDates = Object.keys(history).sort();
    const todayKey = new Date().toLocaleDateString('sv').slice(0, 10);

    let totalSec = 0;
    const langTotals = {};
    const fileTotals = {};

    for (const d of allDates) {
        const rec = history[d] || {};
        totalSec += rec.seconds || 0;
        for (const [l, s] of Object.entries(rec.languages || {})) {
            langTotals[l] = (langTotals[l] || 0) + s;
        }
        for (const [f, s] of Object.entries(rec.files || {})) {
            fileTotals[f] = (fileTotals[f] || 0) + s;
        }
    }

    const todaySec = (history[todayKey] || {}).seconds || 0;
    const avgSec = allDates.length ? totalSec / allDates.length : 0;
    const devices = data.devices || [];
    const multiDev = devices.length > 1;

    document.getElementById('project-name').textContent = data.projectName || '—';

    const firstDate = allDates.length ? allDates[0] : null;
    document.getElementById('subtitle').textContent =
        (firstDate ? 'Since ' + firstDate : 'No data')
        + (multiDev ? ' · ' + devices.length + ' devices' : '');

    let bestDaySec = 0;
    let bestDayDate = '';
    for (const d of allDates) {
        const s = (history[d] || {}).seconds || 0;
        if (s > bestDaySec) { bestDaySec = s; bestDayDate = d; }
    }

    document.getElementById('kpi-total').textContent = fmtDuration(totalSec);
    document.getElementById('kpi-today').textContent = fmtDuration(todaySec);
    document.getElementById('kpi-avg').textContent = fmtDuration(Math.round(avgSec));

    const kpiDaysEl = document.getElementById('kpi-days');
    kpiDaysEl.firstChild.textContent = fmtDuration(bestDaySec);
    document.getElementById('kpi-days-date').textContent = bestDayDate ? '· ' + bestDayDate : '';

    renderChart(history, _currentRange);
    renderLanguages(Object.entries(langTotals));
    renderFiles(Object.entries(fileTotals), data.existingFiles || []);
    renderDevices(devices);
}

// ── Activity chart ────────────────────────────────────────

function renderChart(history, range) {
    let displayDates;
    if (range === 0) {
        const allKeys = Object.keys(history).sort();
        if (allKeys.length === 0) {
            displayDates = lastNDates(30);
        } else {
            const start = new Date(allKeys[0]);
            const end = new Date();
            displayDates = [];
            for (const cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
                displayDates.push(cur.toLocaleDateString('sv').slice(0, 10));
            }
        }
    } else {
        displayDates = lastNDates(range);
    }

    const MIN_COL = 14;
    const MAX_COL = 24;
    const scrollWrap = chartDom.parentElement;
    const containerW = scrollWrap ? scrollWrap.clientWidth : window.innerWidth;
    const idealColW = containerW / displayDates.length;
    const colW = Math.min(MAX_COL, Math.max(MIN_COL, idealColW));
    const totalW = colW * displayDates.length;

    if (totalW > containerW) {
        chartDom.style.width = totalW + 'px';
        chartDom.style.minWidth = totalW + 'px';
        if (scrollWrap) { scrollWrap.style.overflowX = 'auto'; }
    } else {
        chartDom.style.width = '100%';
        chartDom.style.minWidth = '';
        if (scrollWrap) { scrollWrap.style.overflowX = 'hidden'; }
    }

    const langTotalsInRange = {};
    for (const d of displayDates) {
        if (history[d]) {
            for (const [l, s] of Object.entries(history[d].languages || {})) {
                langTotalsInRange[l] = (langTotalsInRange[l] || 0) + s;
            }
        }
    }
    const top5 = Object.entries(langTotalsInRange)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(e => e[0]);

    const hasOther = displayDates.some(d => {
        if (!d || !history[d]) { return false; }
        const totalSec = history[d].seconds || 0;
        const top5Sec = top5.reduce((sum, l) => sum + ((history[d].languages || {})[l] || 0), 0);
        return totalSec - top5Sec > 1;
    });

    const languages = hasOther ? [...top5, 'Other'] : top5;

    const tooltipBg = getCssVar('--vscode-editorWidget-background') || getCssVar('--vscode-editor-background') || '#1e1e1e';
    const tooltipFg = getCssVar('--vscode-foreground') || '#ccc';
    const borderColor = getCssVar('--vscode-panel-border') || 'rgba(128,128,128,0.2)';
    const mutedColor = getCssVar('--vscode-descriptionForeground') || '#888';
    const otherColor = 'rgba(128,128,128,0.45)';

    let series;
    if (top5.length > 0) {
        series = top5.map((lang, i) => ({
            name: lang,
            type: 'bar',
            stack: 'total',
            barMaxWidth: 100,
            emphasis: { focus: 'series' },
            itemStyle: { color: PALETTE[i % PALETTE.length] },
            data: displayDates.map(d => {
                if (!d) { return 0; }
                const s = ((history[d] || {}).languages || {})[lang] || 0;
                return Math.round(s / 36) / 100;
            })
        }));
        if (hasOther) {
            series.push({
                name: 'Other',
                type: 'bar',
                stack: 'total',
                barMaxWidth: 100,
                emphasis: { focus: 'series' },
                itemStyle: { color: otherColor },
                data: displayDates.map(d => {
                    if (!d || !history[d]) { return 0; }
                    const totalSec = history[d].seconds || 0;
                    const top5Sec = top5.reduce((sum, l) => sum + ((history[d].languages || {})[l] || 0), 0);
                    const other = Math.max(0, totalSec - top5Sec);
                    return Math.round(other / 36) / 100;
                })
            });
        }
    } else {
        series = [{
            name: 'Hours',
            type: 'bar',
            barMaxWidth: 100,
            data: displayDates.map(d => d ? Math.round(((history[d] || {}).seconds || 0) / 36) / 100 : 0),
            itemStyle: { color: PALETTE[0] }
        }];
    }

    const hasLegend = languages.length > 1;
    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            confine: true,
            axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(128,128,128,0.04)' } },
            backgroundColor: tooltipBg,
            textStyle: { color: tooltipFg, fontSize: 12 },
            borderColor: borderColor,
            borderWidth: 1,
            extraCssText: 'box-shadow:0 4px 16px rgba(0,0,0,0.25);border-radius:6px;',
            formatter: (params) => {
                if (!params || !params.length) { return ''; }
                const nonZero = params
                    .filter(p => Number(p.data) > 0)
                    .sort((a, b) => Number(b.data) - Number(a.data));
                if (!nonZero.length) { return params[0].axisValue || ''; }
                var rows = '';
                var total = 0;
                nonZero.forEach(p => {
                    rows += '<div style="display:flex;align-items:center;gap:6px;padding:2px 0">' +
                        '<span style="width:8px;height:8px;border-radius:2px;background:' + p.color + ';flex-shrink:0;display:inline-block"></span>' +
                        '<span style="flex:1">' + p.seriesName + '</span>' +
                        '<span style="font-weight:600;font-variant-numeric:tabular-nums">' + p.data + ' h</span>' +
                        '</div>';
                    total += Number(p.data) || 0;
                });
                var totalRow = nonZero.length > 1
                    ? '<div style="border-top:1px solid ' + borderColor + ';margin-top:4px;padding-top:4px;display:flex;justify-content:space-between">' +
                    '<span>Total</span><span style="font-weight:700">' + (Math.round(total * 100) / 100) + ' h</span></div>'
                    : '';
                return '<div style="min-width:150px"><div style="font-weight:600;margin-bottom:5px">' + params[0].axisValue + '</div>' + rows + totalRow + '</div>';
            }
        },
        legend: hasLegend ? {
            top: 4, left: 50,
            textStyle: { color: mutedColor, fontSize: 12 },
            icon: 'roundRect', itemWidth: 10, itemHeight: 10,
            data: languages
        } : { show: false },
        grid: {
            left: 44, right: 12,
            top: hasLegend ? 36 : 10,
            bottom: 44,
            containLabel: false
        },
        xAxis: {
            type: 'category',
            data: displayDates,
            axisLine: { lineStyle: { color: borderColor } },
            axisTick: { show: false },
            axisLabel: {
                color: mutedColor,
                fontSize: 12,
                rotate: 0,
                interval: displayDates.length > 60 ? Math.floor(displayDates.length / 15)
                    : displayDates.length > 30 ? 6
                        : displayDates.length > 14 ? 2 : 0,
                formatter: (v) => { return v ? v.slice(5) : ''; }
            }
        },
        yAxis: {
            type: 'value',
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { lineStyle: { color: borderColor } },
            axisLabel: { color: mutedColor, fontSize: 12, formatter: (v) => { return v + ' h'; } }
        },
        series: series
    };

    mainChart.setOption(option, { notMerge: true });
    // Safe resize will be caught by ResizeObserver, no manual resize needed here
}

// ── Components Rendering (HTML Templates) ────────────────

function renderLanguages(entries) {
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    const totalSec = sorted.reduce((s, e) => s + e[1], 0);
    // Limit to 20 rendering items; CSS will smoothly clip or allow scrolling if desired
    const limit = 20;

    document.getElementById('lang-list').innerHTML = sorted.length === 0
        ? '<div class="empty">No language data</div>'
        : sorted.slice(0, limit).map(([lang, sec], i) => {
            const pct = totalSec > 0 ? Math.round(sec / totalSec * 100) : 0;
            const color = PALETTE[i % PALETTE.length];
            return `
                <div class="item-group">
                    <div class="item-row">
                        <span class="lang-dot" style="background:${color}"></span>
                        <span class="item-name">${escapeHtml(lang)}</span>
                        <span class="item-time">${fmtDuration(sec)}</span>
                    </div>
                    <div class="item-bar-wrap">
                        <div class="item-bar" style="width:${pct}%;background:${color}"></div>
                    </div>
                </div>`;
        }).join('');
}

function renderFiles(entries, existingPaths) {
    // Limit to 20 rendering items
    const limit = 20;
    const sorted = entries.sort((a, b) => b[1] - a[1]).slice(0, limit);
    const maxSec = sorted.length > 0 ? sorted[0][1] : 1;
    const existingSet = new Set(existingPaths);
    const accentColor = getCssVar('--vscode-button-background') || PALETTE[0];

    document.getElementById('top-files').innerHTML = sorted.length === 0
        ? '<div class="empty">No file data</div>'
        : sorted.map(([f, sec]) => {
            const pct = Math.round((sec / maxSec) * 100);
            const exists = existingSet.has(f);
            const parts = f.split('/');
            const filename = parts.pop() || f;
            const dir = parts.length ? parts.join('/') + '/ ' : '';

            const stateClass = exists ? 'item-group--clickable' : 'item-group--missing';
            const dataPath = exists ? `data-path="${escapeHtml(f)}"` : '';
            const dirSpan = dir ? `<span class="item-dir-prefix">${escapeHtml(dir)}</span>` : '';

            return `
                <div class="item-group ${stateClass}" ${dataPath}>
                    <div class="item-row">
                        <div class="item-name" title="${escapeHtml(f)}">
                            ${dirSpan}${escapeHtml(filename)}
                        </div>
                        <span class="item-time">${fmtDuration(sec)}</span>
                    </div>
                    <div class="item-bar-wrap">
                        <div class="item-bar" style="width:${pct}%;background:${accentColor}"></div>
                    </div>
                </div>`;
        }).join('');
}

function renderDevices(devices) {
    const card = document.getElementById('devices-card');
    const grid = document.getElementById('bottom-grid');

    if (!devices || devices.length <= 1) {
        card.style.display = 'none';
        grid.classList.remove('three-col');
        return;
    }

    card.style.display = 'flex';
    grid.classList.add('three-col');

    const limit = 20;
    document.getElementById('devices-list').innerHTML = devices.slice(0, limit).map(dev => {
        const name = escapeHtml(dev.deviceName || 'Unknown Device');
        const badge = dev.isLocal ? `<span class="badge">this device</span>` : '';
        const sub = dev.todaySeconds > 0
            ? `<div class="item-sub">+ ${fmtDuration(dev.todaySeconds)} today</div>`
            : '';

        return `
            <div class="item-group">
                <div class="item-row">
                    <div style="flex:1;min-width:0">
                        <div class="item-name" title="${name}">${name}${badge}</div>
                        ${sub}
                    </div>
                    <span class="item-time">${fmtDuration(dev.totalSeconds)}</span>
                </div>
            </div>`;
    }).join('');
}
