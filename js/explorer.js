import { $, LABELS, NA, bind, card, fmtVal, head, icons, option, per, select, table, uniq } from './utils.js';

export function mount(root, D) {
  let ds = D.catalog[0].id, q = '', fl = {}, tbl, filters = [];
  root.innerHTML = head('Eksplorasi Data', 'Telusuri, saring, dan unduh dataset yang mendasari dashboard.') +
    '<div class="card toolbar"><div class="filters" id="tools"></div><div class="info" id="info"></div></div><div id="tbl"></div>';

  function buildTools() {
    const meta = D.catalog.find(c => c.id === ds), data = D[ds], keys = meta.columns.map(c => c.key);
    // a filter is offered only when the dataset has that column and it varies
    filters = ['year', 'region', 'commodity', 'indicator'].filter(k => keys.includes(k) && uniq(data, k).length > 1)
      .map(k => ({ k, label: meta.columns.find(c => c.key === k).label, vals: uniq(data, k).map(String) }));
    $('#tools').innerHTML = select('ds', 'Dataset', D.catalog.map(c => option(c.id, c.title)), ds) +
      filters.map(x => select(`f-${x.k}`, x.label, [option('all', 'Semua'), ...x.vals.map(v => option(v, LABELS[v] ?? v))], 'all')).join('') +
      '<label class="field search" style="flex:1">Cari<input type="search" id="q" placeholder="Cari di semua kolom…"><i data-lucide="search"></i></label>';
    const range = (a, b) => a === b ? per(a) : `${per(a)} – ${per(b)}`;
    $('#info').innerHTML = `<div class="desc">${meta.description}</div><div><div>Sumber</div><div>${meta.source}</div></div><div><div>Satuan</div><div>${meta.unit}</div></div>
      <div><div>Periode</div><div>${range(meta.period_start, meta.period_end)} · ${meta.frequency}</div></div>
      <div><div>Jumlah Data</div><div>${meta.rows.toLocaleString('id-ID')} baris · ${meta.null_cells} sel ${NA.toLowerCase()} (periode pembanding belum ada)</div></div>`;
    bind('ds', v => { ds = v; q = ''; fl = {}; buildTools(); tbl = null; build(); });
    filters.forEach(x => bind(`f-${x.k}`, v => { fl[x.k] = v; apply(); }));
    $('#q').addEventListener('input', e => { q = e.target.value; apply(); });
    icons();
  }
  function build() {
    const meta = D.catalog.find(c => c.id === ds);
    tbl = table($('#tbl'), { title: meta.title, exportName: () => ds, columns: meta.columns });
    apply();
  }
  function apply() {
    const needle = q.trim().toLowerCase(), cols = D.catalog.find(c => c.id === ds).columns;
    // pencarian mencocokkan teks yang tampil (mis. "Januari 2025", "5,56") maupun nilai asli (mis. "2025-01")
    const hay = r => (cols.map(c => fmtVal(c.key, r[c.key], c.unit)).join(' ') + ' ' + Object.values(r).join(' ')).toLowerCase();
    tbl.set(D[ds].filter(r => filters.every(x => !fl[x.k] || fl[x.k] === 'all' || String(r[x.k]) === fl[x.k]) && (!needle || hay(r).includes(needle))));
  }
  buildTools(); build();
}
