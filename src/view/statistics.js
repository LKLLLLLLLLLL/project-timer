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
let _langTotals = {};
let _fileTotals = {};
let _trimRaf = null;
let _currentRange = 30; // 7 | 30 | 90 | 0 (= all)

// ── Message handler ───────────────────────────────────────
window.addEventListener('message', e => {
    if (e.data.command === 'initData') {
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
        if (_data) { renderChart(_data.history, _currentRange); };
    });
});

window.addEventListener('resize', function () {
    mainChart.resize();
    scheduleTrim();
});

// ── Helpers ───────────────────────────────────────────────

/** "2 h 30 m" | "45 m" | "30 s" | "0 m" */
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

/** Array of YYYY-MM-DD strings for the last n days (today is last). */
function lastNDates(n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        out.push(d.toLocaleDateString('sv').slice(0, 10));
    }
    return out;
}

// ── Main entry ────────────────────────────────────────────

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
    const daysCount = allDates.length;
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
    // Use firstChild (text node) to avoid overwriting the inner <span>
    const kpiDaysEl = document.getElementById('kpi-days');
    kpiDaysEl.firstChild.textContent = fmtDuration(bestDaySec);
    document.getElementById('kpi-days-date').textContent = bestDayDate ? '· ' + bestDayDate : '';

    _langTotals = langTotals;
    _fileTotals = fileTotals;

    renderChart(history, _currentRange);
    renderLanguages(_langTotals, 20);
    renderFiles(_fileTotals, 20);
    renderDevices(devices, 20);
    scheduleTrim();
}

// ── Activity chart ────────────────────────────────────────

function renderChart(history, range) {
    let displayDates;
    if (range === 0) {
        // Fill every calendar day from first recorded date to today
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

    // Dynamic column width for All mode: fit container, but clamp between MIN and MAX px per bar
    const MIN_COL = 14; // below this threshold, enable horizontal scroll
    const MAX_COL = 24; // prevent overly wide bars on sparse data
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
    // Collect per-language totals across the displayed date range,
    // keep only top 5 sorted by total seconds descending.
    const langTotalsInRange = {};
    for (const d of displayDates) {
        if (history[d]) {
            for (const [l, s] of Object.entries(history[d].languages || {})) {
                langTotalsInRange[l] = (langTotalsInRange[l] || 0) + s;
            }
        }
    }
    const languages = Object.entries(langTotalsInRange)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(e => e[0]);
    const tooltipBg = getCssVar('--vscode-editorWidget-background') || getCssVar('--vscode-editor-background') || '#1e1e1e';
    const tooltipFg = getCssVar('--vscode-foreground') || '#ccc';
    const borderColor = getCssVar('--vscode-panel-border') || 'rgba(128,128,128,0.2)';
    const mutedColor = getCssVar('--vscode-descriptionForeground') || '#888';

    let series;
    if (languages.length > 0) {
        series = languages.map((lang, i) => ({
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
            formatter: function (params) {
                if (!params || !params.length) { return ''; }
                const nonZero = params
                    .filter(function (p) { return Number(p.data) > 0; })
                    .sort(function (a, b) { return Number(b.data) - Number(a.data); });
                if (!nonZero.length) { return params[0].axisValue || ''; }
                var rows = '';
                var total = 0;
                nonZero.forEach(function (p) {
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
                formatter: function (v) { return v ? v.slice(5) : ''; }
            }
        },
        yAxis: {
            type: 'value',
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { lineStyle: { color: borderColor } },
            axisLabel: { color: mutedColor, fontSize: 12, formatter: function (v) { return v + ' h'; } }
        },
        series: series
    };

    mainChart.setOption(option, { notMerge: true });
    setTimeout(function () { mainChart.resize(); }, 80);
}

// ── Languages ─────────────────────────────────────────────

function renderLanguages(langTotals, limit) {
    const container = document.getElementById('lang-list');
    const entries = Object.entries(langTotals).sort(function (a, b) { return b[1] - a[1]; });
    const totalSec = entries.reduce(function (s, e) { return s + e[1]; }, 0);
    container.innerHTML = '';

    if (entries.length === 0) {
        container.innerHTML = '<div class="empty">No language data</div>';
        return;
    }

    entries.slice(0, limit ?? 8).forEach(function (entry, i) {
        const lang = entry[0];
        const sec = entry[1];
        const pct = totalSec > 0 ? Math.round(sec / totalSec * 100) : 0;
        const color = PALETTE[i % PALETTE.length];

        const group = document.createElement('div');
        group.className = 'item-group';

        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML =
            '<span class="lang-dot" style="background:' + color + '"></span>' +
            '<span class="item-name">' + lang + '</span>' +
            '<span class="item-time">' + fmtDuration(sec) + '</span>';

        const barWrap = document.createElement('div');
        barWrap.className = 'item-bar-wrap';
        const bar = document.createElement('div');
        bar.className = 'item-bar';
        bar.style.cssText = 'width:' + pct + '%;background:' + color;
        barWrap.appendChild(bar);

        group.appendChild(row);
        group.appendChild(barWrap);
        container.appendChild(group);
    });
}

// ── Top files ─────────────────────────────────────────────

function renderFiles(fileTotals, limit) {
    const container = document.getElementById('top-files');
    const entries = Object.entries(fileTotals).sort(function (a, b) { return b[1] - a[1]; }).slice(0, limit ?? 8);
    const maxSec = entries.length > 0 ? entries[0][1] : 1;
    container.innerHTML = '';

    if (entries.length === 0) {
        container.innerHTML = '<div class="empty">No file data</div>';
        return;
    }

    const accentColor = getCssVar('--vscode-button-background') || PALETTE[0];

    entries.forEach(function (entry) {
        const f = entry[0];
        const sec = entry[1];
        const pct = Math.round(sec / maxSec * 100);
        const parts = f.split('/');
        const filename = parts[parts.length - 1] || f;
        const dir = f.includes('/') ? f.substring(0, f.lastIndexOf('/')) : '';

        const group = document.createElement('div');
        group.className = 'item-group';

        const row = document.createElement('div');
        row.className = 'item-row';

        // Single-line: muted "dir /" prefix + filename — no sub-line needed
        const nameEl = document.createElement('div');
        nameEl.className = 'item-name';
        nameEl.title = f;
        if (dir) {
            const dirSpan = document.createElement('span');
            dirSpan.className = 'item-dir-prefix';
            dirSpan.textContent = dir + '/ ';
            nameEl.appendChild(dirSpan);
        }
        nameEl.appendChild(document.createTextNode(filename));

        const timeEl = document.createElement('span');
        timeEl.className = 'item-time';
        timeEl.textContent = fmtDuration(sec);

        row.appendChild(nameEl);
        row.appendChild(timeEl);

        const barWrap = document.createElement('div');
        barWrap.className = 'item-bar-wrap';
        const bar = document.createElement('div');
        bar.className = 'item-bar';
        bar.style.cssText = 'width:' + pct + '%;background:' + accentColor;
        barWrap.appendChild(bar);

        group.appendChild(row);
        group.appendChild(barWrap);
        container.appendChild(group);
    });
}

// ── Trim lists to fit viewport ────────────────────────────

function scheduleTrim() {
    if (_trimRaf) { cancelAnimationFrame(_trimRaf); }
    _trimRaf = requestAnimationFrame(function () {
        _trimRaf = null;
        if (!_data) { return; }

        // ── Vertical (narrow) layout: fixed item count, no height constraint ──
        if (window.innerWidth <= 600) {
            renderLanguages(_langTotals, 8);
            renderFiles(_fileTotals, 8);
            renderDevices(_data.devices || []);
            return;
        }

        // ── Horizontal layout: fit items to available card height ─────────────
        // Use the files card (always visible) as the height reference
        const filesCard = document.getElementById('files-section');
        if (!filesCard) { return; }
        const cardH = filesCard.getBoundingClientRect().height;
        if (cardH < 60) { return; } // not yet laid out

        const st = getComputedStyle(filesCard);
        const padV = (parseFloat(st.paddingTop) || 14) + (parseFloat(st.paddingBottom) || 14);
        const labelEl = filesCard.querySelector('.section-label');
        const labelH = labelEl
            ? labelEl.getBoundingClientRect().height + (parseFloat(getComputedStyle(labelEl).marginBottom) || 10)
            : 22;
        const available = cardH - padV - labelH;
        if (available < 20) { return; }

        // Measure actual rendered item heights (first item in each list)
        const langItem = document.querySelector('#lang-list .item-group');
        const fileItem = document.querySelector('#top-files .item-group');
        const devItem = document.querySelector('#devices-list .item-group');

        const langItemH = langItem ? langItem.getBoundingClientRect().height + 3 : 34;
        const fileItemH = fileItem ? fileItem.getBoundingClientRect().height + 3 : 56;
        const devItemH = devItem ? devItem.getBoundingClientRect().height + 3 : 56;

        renderLanguages(_langTotals, Math.max(1, Math.floor(available / langItemH)));
        renderFiles(_fileTotals, Math.max(1, Math.floor(available / fileItemH)));
        renderDevices(_data.devices || [], Math.max(1, Math.floor(available / devItemH)));
    });
}

// ── Devices ───────────────────────────────────────────────

function renderDevices(devices, limit) {
    const card = document.getElementById('devices-card');
    const container = document.getElementById('devices-list');
    const grid = document.getElementById('bottom-grid');
    container.innerHTML = '';

    if (!devices || devices.length <= 1) {
        card.style.display = 'none';
        grid.classList.remove('three-col');
        return;
    }

    card.style.display = 'block';
    grid.classList.add('three-col');

    const visibleDevices = limit !== null ? devices.slice(0, limit) : devices;
    visibleDevices.forEach(function (dev) {
        const group = document.createElement('div');
        group.className = 'item-group';

        const row = document.createElement('div');
        row.className = 'item-row';

        const nameWrap = document.createElement('div');
        nameWrap.style.cssText = 'flex:1;min-width:0';

        const nameEl = document.createElement('div');
        nameEl.className = 'item-name';
        nameEl.title = dev.deviceName || '';
        nameEl.textContent = dev.deviceName || 'Unknown Device';
        if (dev.isLocal) {
            const badge = document.createElement('span');
            badge.className = 'badge';
            badge.textContent = 'this device';
            nameEl.appendChild(badge);
        }
        nameWrap.appendChild(nameEl);

        if (dev.todaySeconds > 0) {
            const sub = document.createElement('div');
            sub.className = 'item-sub';
            sub.textContent = '+ ' + fmtDuration(dev.todaySeconds) + ' today';
            nameWrap.appendChild(sub);
        }

        const timeEl = document.createElement('span');
        timeEl.className = 'item-time';
        timeEl.textContent = fmtDuration(dev.totalSeconds);

        row.appendChild(nameWrap);
        row.appendChild(timeEl);
        group.appendChild(row);
        container.appendChild(group);
    });
}
