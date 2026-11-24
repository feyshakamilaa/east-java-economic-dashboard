// Fungsi bersama: pemuatan data, format angka/tanggal Indonesia, komponen UI, pembungkus Chart.js, tabel interaktif.
// Format hanya memengaruhi tampilan; nilai asli dan hasil perhitungan Python tidak diubah.
export const YEARS = [2022, 2023, 2024, 2025];
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export const MON_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const ROMAN = ['I', 'II', 'III', 'IV'];
export const NA = 'Tidak tersedia';
export const LOCALE = 'id-ID';
export const C = { navy: '#1e3a8a', blue: '#3b82f6', teal: '#0d9488', sky: '#7dd3fc', slate: '#94a3b8', amber: '#d97706', grid: '#e8edf3' };

export async function loadData() {
  const res = await fetch('data/processed/dashboard_site.json');
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

export const $ = (s, r = document) => r.querySelector(s);
// Angka: koma desimal dan titik ribuan (5,56% · Rp15.000)
export const f = (n, d = 2) => n == null ? NA : n.toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d });
export const num = n => n.toLocaleString(LOCALE, { maximumFractionDigits: 2 });          // untuk label sumbu grafik
export const pct = (n, d = 2) => n == null ? NA : `${f(n, d)}%`;
export const tickPct = v => `${num(v)}%`;
export const rp = n => n == null ? NA : `Rp${f(n, 0)}`;
export const signed = (n, suffix = '') => n == null ? NA : `${n > 0 ? '+' : ''}${f(n)}${suffix}`;
// Periode: 2025-12 -> Desember 2025 · 2025-Q1 -> Triwulan I 2025
export const per = p => p.length === 4 ? p : p.includes('-Q') ? `Triwulan ${ROMAN[+p.slice(-1) - 1]} ${p.slice(0, 4)}` : `${MON_FULL[+p.slice(5, 7) - 1]} ${p.slice(0, 4)}`;
export const perShort = p => p.includes('-Q') ? `TW ${ROMAN[+p.slice(-1) - 1]} ${p.slice(0, 4)}` : `${MON[+p.slice(5, 7) - 1]} ${p.slice(0, 4)}`;
export const qLabel = p => `Triwulan ${ROMAN[+p.slice(-1) - 1]}`;
export const mon = p => MON[+p.slice(5, 7) - 1];
export const short = r => r.replace('Kabupaten ', 'Kab. ');
export const pad = n => String(n).padStart(2, '0');
export const uniq = (rows, k) => [...new Set(rows.map(r => r[k]))];
export const sum = a => a.reduce((s, x) => s + x, 0);
export const rankBy = (rows, key) => Object.fromEntries([...rows].sort((a, b) => b[key] - a[key]).map((r, i) => [r.region, i + 1]));

export const LABELS = { unemployment_rate: 'Tingkat Pengangguran', poverty_rate: 'Tingkat Kemiskinan' };
export function fmtVal(key, v, unit = '') {
  if (v == null) return NA;
  if (typeof v !== 'number') return key === 'period' ? per(v) : (LABELS[v] ?? String(v));
  if (key === 'year') return String(v);
  if (key === 'quarter') return `Triwulan ${ROMAN[v - 1]}`;
  if (key === 'month') return MON_FULL[v - 1];
  if (key === 'cpi' || unit.includes('%') || unit === 'poin persentase') return f(v, 2);
  return f(v, unit === 'Rp' ? 0 : 1);
}

// ---------- UI snippets ----------
export const option = (v, l) => ({ v, l });
export const select = (id, label, opts, val) => `<label class="field">${label}<select id="${id}">${opts.map(o =>
  `<option value="${o.v}"${String(o.v) === String(val) ? ' selected' : ''}>${o.l}</option>`).join('')}</select></label>`;
export const yearOptions = () => YEARS.map(y => option(y, y));
export const head = (title, desc, filters = '') => `<div class="head"><div><h1>${title}</h1><p>${desc}</p></div><div class="filters">${filters}</div></div>`;
export const card = (title, desc, body, cls = '', action = '') =>
  `<div class="card cc ${cls}"><div class="cc-head"><div><h3>${title}</h3><p>${desc}</p></div>${action}</div>${body}</div>`;
export const canvas = (id, cls = '') => `<div class="chart ${cls}"><canvas id="${id}"></canvas></div>`;
export const seg = (id, opts, val) => `<div class="seg" id="${id}">${opts.map(o => `<button data-v="${o.v}" class="${o.v === val ? 'on' : ''}">${o.l}</button>`).join('')}</div>`;
export function kpi(title, icon, value, sub, delta, deltaLabel) {
  const chip = deltaLabel === undefined ? '' :
    `<div class="chip"><i data-lucide="${delta == null ? 'minus' : delta > 0 ? 'arrow-up' : delta < 0 ? 'arrow-down' : 'minus'}"></i>${delta == null ? 'Tidak ada pembanding' : deltaLabel}</div>`;
  return `<div class="card kpi"><div class="kpi-top"><span>${title}</span><i data-lucide="${icon}"></i></div><div><div class="kpi-val">${value}</div><div class="kpi-sub">${sub}</div></div>${chip}</div>`;
}
export const hint = text => `<p class="hint"><i data-lucide="info"></i><span>${text}</span></p>`;
export const icons = () => window.lucide.createIcons();
export const bind = (id, fn) => { $('#' + id).addEventListener('change', e => fn(e.target.value)); };
export function bindSeg(id, fn) {
  $('#' + id).addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $('#' + id).querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); fn(b.dataset.v);
  });
}

// ---------- Chart.js wrapper ----------
Chart.defaults.locale = LOCALE;
Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#5b6b82';
Chart.defaults.animation.duration = 500;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.boxWidth = 8;
Object.assign(Chart.defaults.plugins.tooltip, { backgroundColor: '#fff', titleColor: '#0f172a', bodyColor: '#334155', borderColor: '#e2e8f0', borderWidth: 1, padding: 10, boxPadding: 4, usePointStyle: true });
Chart.defaults.interaction = { mode: 'index', intersect: false };

const charts = {};
export const destroyCharts = () => Object.keys(charts).forEach(k => { charts[k].destroy(); delete charts[k]; });
/** axis(fmt, extra): value-axis options with light grid and formatted ticks */
export const axis = (fmt, extra = {}) => ({ grid: { color: C.grid }, border: { display: false }, ticks: { callback: fmt }, ...extra });
export const xAxis = (extra = {}) => ({ grid: { display: false }, border: { display: false }, ...extra });
export function draw(id, type, data, { scales = {}, tip = {}, legend = false, ...options } = {}) {
  charts[id]?.destroy();
  charts[id] = new Chart(document.getElementById(id), {
    type, data,
    options: { responsive: true, maintainAspectRatio: false, ...options,
      plugins: { legend: { display: legend, position: 'bottom' }, tooltip: { callbacks: tip } },
      ...(type === 'doughnut' ? {} : { scales: { x: xAxis(), y: axis(v => v), ...scales } }) },
  });
}
export const lineDs = (label, data, color, extra = {}) => ({ type: 'line', label, data, borderColor: color, backgroundColor: color, borderWidth: 2, tension: 0.25, pointRadius: 3, pointHoverRadius: 5, ...extra });
export const barDs = (label, data, color, extra = {}) => ({ type: 'bar', label, data, backgroundColor: color, borderRadius: 4, maxBarThickness: 28, ...extra });
/** larger markers for points that belong to the highlighted selection */
export const marks = (labels, test, on = 5, off = 3) => labels.map(l => test(l) ? on : off);

// ---------- Interactive table: sort, paginate, export CSV (filtered + sorted, before pagination) ----------
const csvCell = v => v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
export function table(root, { columns, title, exportName, pageSize = 10, highlight }) {
  let rows = [], sort = null, page = 0, size = pageSize;
  root.innerHTML = `<div class="card"><div class="tbl-head"><div><b class="t-title"></b> <span class="t-count"></span></div>
    <button class="btn t-export"><i data-lucide="download"></i>Unduh CSV</button></div><div class="scroll"><table><thead></thead><tbody></tbody></table><div class="t-empty"></div></div>
    <div class="pager"><span class="t-range"></span><div><select class="t-size">${[10, 25, 50].map(n => `<option value="${n}"${n === size ? ' selected' : ''}>${n} / halaman</option>`).join('')}</select>
    <button class="btn t-prev" aria-label="Halaman sebelumnya"><i data-lucide="chevron-left"></i></button><span class="t-page"></span>
    <button class="btn t-next" aria-label="Halaman berikutnya"><i data-lucide="chevron-right"></i></button></div></div></div>`;
  const q = s => root.querySelector(s);
  q('.t-title').textContent = title;
  const sorted = () => !sort ? rows : [...rows].sort((a, b) => {
    const x = a[sort.key], y = b[sort.key];
    if (x == null || y == null) return x == null && y == null ? 0 : x == null ? 1 : -1; // Tidak tersedia selalu di urutan terakhir
    return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * sort.dir;
  });
  function paint() {
    const data = sorted(), pages = Math.max(1, Math.ceil(data.length / size));
    page = Math.min(page, pages - 1);
    q('thead').innerHTML = '<tr>' + columns.map(c => `<th class="${sort?.key === c.key ? 'sorted' : ''}" aria-sort="${sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}"><button data-k="${c.key}">${c.label}${c.unit ? ` <small>(${c.unit})</small>` : ''}
      <i data-lucide="${sort?.key === c.key ? (sort.dir === 1 ? 'arrow-up' : 'arrow-down') : 'arrow-up-down'}"></i></button></th>`).join('') + '</tr>';
    q('tbody').innerHTML = data.slice(page * size, page * size + size).map(r => `<tr class="${highlight?.(r) ? 'hl' : ''}">` + columns.map(c => {
      const v = r[c.key]; return `<td class="${v == null ? 'na' : ''}">${c.fmt ? c.fmt(v, r) : fmtVal(c.key, v, c.unit)}</td>`; }).join('') + '</tr>').join('');
    q('.t-empty').innerHTML = data.length ? '' : '<div class="empty"><i data-lucide="search-x"></i>Tidak ada data yang sesuai dengan filter.</div>';
    q('.t-count').textContent = `· ${data.length.toLocaleString(LOCALE)} data`;
    q('.t-range').textContent = data.length ? `${page * size + 1}–${Math.min(data.length, page * size + size)} dari ${data.length}` : '0 dari 0';
    q('.t-page').textContent = `Halaman ${page + 1} dari ${pages}`;
    q('.t-prev').disabled = page === 0; q('.t-next').disabled = page >= pages - 1; q('.t-export').disabled = !data.length;
    icons();
  }
  q('thead').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
    sort = sort?.key === b.dataset.k ? { key: sort.key, dir: -sort.dir } : { key: b.dataset.k, dir: 1 }; paint(); });
  q('.t-prev').onclick = () => { page--; paint(); };
  q('.t-next').onclick = () => { page++; paint(); };
  q('.t-size').onchange = e => { size = +e.target.value; page = 0; paint(); };
  q('.t-export').onclick = () => {
    const keys = [...columns.map(c => c.key), ...(rows[0]?.source !== undefined ? ['source'] : [])];
    const text = [keys.join(','), ...sorted().map(r => keys.map(k => csvCell(r[k])).join(','))].join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })), download: `${exportName()}.csv` });
    a.click(); URL.revokeObjectURL(a.href);
  };
  return { set(newRows, newTitle) { rows = newRows; page = 0; if (newTitle) q('.t-title').textContent = newTitle; paint(); } };
}
