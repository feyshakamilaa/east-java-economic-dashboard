import { $, C, YEARS, axis, barDs, bind, bindSeg, canvas, card, draw, f, head, icons, kpi, lineDs, option, pct, per, perShort, rankBy, select, seg, short, sum, table, tickPct, uniq, xAxis, yearOptions } from './utils.js';

const SHARE = ['#1e3a8a', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#0d9488', '#2dd4bf', '#99f6e4', '#cbd5e1'];

export function mount(root, D) {
  const regions = uniq(D.gdp_annual_regional, 'region').sort();
  let year = YEARS[YEARS.length - 1], focus = 'Kota Surabaya', gdpView = '10', growthView = 'top', tbl;
  root.innerHTML = head('Ekonomi Daerah', 'Perbandingan ekonomi 38 kabupaten/kota di Jawa Timur menurut PDRB harga konstan (data simulasi, Rp miliar, harga konstan 2020).',
      select('year', 'Tahun', yearOptions(), year) + select('focus', 'Wilayah fokus', regions.map(r => option(r, r)), focus)) +
    '<div class="grid g4" id="kpis"></div>' +
    `<div class="grid g2" style="align-items:start">${card('PDRB Harga Konstan menurut Kabupaten/Kota', 'Rp triliun; wilayah fokus berwarna teal', `<div class="chart" id="gdp-box" style="height:320px"><canvas id="c-gdp"></canvas></div>`, '', seg('gdp-view', [{ v: '10', l: '10 Teratas' }, { v: 'all', l: 'Semua 38' }], gdpView))}` +
    `${card('Peringkat Pertumbuhan Ekonomi', 'Pertumbuhan PDRB dibanding tahun sebelumnya (YoY, %); 10 wilayah', canvas('c-growth', 'tall'), '', seg('growth-view', [{ v: 'top', l: 'Tertinggi' }, { v: 'low', l: 'Terendah' }], growthView))}</div>` +
    `<div class="grid g3">${card('Kontribusi PDRB', 'Porsi terhadap total PDRB 38 kabupaten/kota', '<div class="donut"><div class="chart"><canvas id="c-share"></canvas></div><ul class="legend" id="share-legend"></ul></div>')}` +
    `${card('Tren Pertumbuhan Ekonomi', '<span id="trend-desc"></span>', canvas('c-trend', 'tall'), 'span2')}</div><div id="tbl"></div>`;
  bind('year', v => { year = +v; update(); }); bind('focus', v => { focus = v; update(); });
  bindSeg('gdp-view', v => { gdpView = v; update(); }); bindSeg('growth-view', v => { growthView = v; update(); });
  tbl = table($('#tbl'), { title: 'Indikator Ekonomi Daerah', exportName: () => `indikator_ekonomi_daerah_${year}`, pageSize: 50, highlight: r => r.region === focus, columns: [
    { key: 'gdp_rank', label: 'Peringkat PDRB', fmt: v => String(v) }, { key: 'region', label: 'Kabupaten/Kota' }, { key: 'real_gdp_billion_idr', label: 'PDRB Harga Konstan', unit: 'Rp miliar' },
    { key: 'growth_yoy_pct', label: 'Pertumbuhan YoY', unit: '%' }, { key: 'growth_rank', label: 'Peringkat Pertumbuhan', fmt: v => String(v) }, { key: 'share_pct', label: 'Kontribusi PDRB', unit: '%' }] });

  function update() {
    const all = D.gdp_annual_regional.filter(r => r.year === year), gr = rankBy(all, 'real_gdp_billion_idr'), wr = rankBy(all, 'growth_yoy_pct');
    const rows = all.map(r => ({ ...r, gdp_rank: gr[r.region], growth_rank: wr[r.region] })).sort((a, b) => a.gdp_rank - b.gdp_rank);
    const prov = D.gdp_annual_province.find(r => r.year === year) ?? {}, me = rows.find(r => r.region === focus), fastest = rows.find(r => r.growth_rank === 1), largest = rows[0];
    $('#kpis').innerHTML = kpi('PDRB Provinsi', 'landmark', `Rp${f(prov.real_gdp_billion_idr / 1000, 0)} triliun`, `Jumlah ${rows.length} kabupaten/kota, ${year}`, prov.growth_yoy_pct, `${pct(prov.growth_yoy_pct)} dibanding ${year - 1}`) +
      kpi('Pertumbuhan Tercepat', 'rocket', short(fastest.region), `Tumbuh ${pct(fastest.growth_yoy_pct)} pada ${year}`) +
      kpi('Ekonomi Terbesar', 'building-2', short(largest.region), `${pct(largest.share_pct)} dari PDRB provinsi`) +
      kpi(`Fokus: ${short(focus)}`, 'map-pin', pct(me?.growth_yoy_pct), `Peringkat PDRB ${me?.gdp_rank} · peringkat pertumbuhan ${me?.growth_rank} dari ${rows.length}`);

    const g = gdpView === 'all' ? rows : rows.slice(0, 10);
    $('#gdp-box').style.height = gdpView === 'all' ? '860px' : '320px';
    draw('c-gdp', 'bar', { labels: g.map(r => short(r.region)), datasets: [barDs('PDRB Harga Konstan', g.map(r => r.real_gdp_billion_idr), g.map(r => r.region === focus ? C.teal : C.navy), { maxBarThickness: 14, borderRadius: 3 })] },
      { indexAxis: 'y', scales: { x: axis(v => f(v / 1000, 0)), y: xAxis({ ticks: { autoSkip: false, font: { size: 11 } } }) }, tip: { label: i => ` Rp${f(i.raw, 0)} miliar` } });

    const byG = [...rows].sort((a, b) => b.growth_yoy_pct - a.growth_yoy_pct), gd = growthView === 'top' ? byG.slice(0, 10) : byG.slice(-10).reverse();
    draw('c-growth', 'bar', { labels: gd.map(r => short(r.region)), datasets: [barDs('Pertumbuhan YoY', gd.map(r => r.growth_yoy_pct), gd.map(r => r.region === focus ? C.teal : C.sky), { maxBarThickness: 16, borderRadius: 3 })] },
      { indexAxis: 'y', scales: { x: axis(tickPct), y: xAxis({ ticks: { autoSkip: false } }) }, tip: { label: i => ` ${pct(i.raw)}` } });

    const share = [...rows.slice(0, 8).map(r => ({ n: short(r.region), v: r.share_pct })), { n: `${rows.length - 8} kabupaten/kota lainnya`, v: sum(rows.slice(8).map(r => r.share_pct)) }];
    draw('c-share', 'doughnut', { labels: share.map(s => s.n), datasets: [{ data: share.map(s => s.v), backgroundColor: SHARE, borderWidth: 0 }] },
      { cutout: '66%', interaction: { mode: 'nearest' }, tip: { label: i => ` ${i.label}: ${pct(i.raw)}` } });
    $('#share-legend').innerHTML = share.map((s, i) => `<li><i style="background:${SHARE[i]}"></i><span>${s.n}</span><em>${pct(s.v, 1)}</em></li>`).join('');

    const reg = Object.fromEntries(D.gdp_quarterly_regional.filter(r => r.region === focus).map(r => [r.period, r]));
    const q = D.gdp_quarterly_province.filter(r => YEARS.includes(r.year)), labels = q.map(r => r.period), inYear = p => p.startsWith(String(year));
    $('#trend-desc').textContent = `${short(focus)} dibanding provinsi: pertumbuhan PDRB triwulanan terhadap triwulan yang sama tahun lalu (YoY, %); tahun terpilih ditandai`;
    draw('c-trend', 'line', { labels, datasets: [lineDs(short(focus), labels.map(p => reg[p]?.growth_yoy_pct ?? null), C.teal, { pointRadius: labels.map(p => inYear(p) ? 5 : 2.5) }),
      lineDs('Jawa Timur (provinsi)', q.map(r => r.growth_yoy_pct), C.navy, { borderDash: [5, 4], pointRadius: 0 })] },
      { legend: true, scales: { x: xAxis({ ticks: { callback(i) { return perShort(this.getLabelForValue(i)); }, maxTicksLimit: 8 } }), y: axis(tickPct) }, tip: { title: i => per(i[0].label), label: i => ` ${i.dataset.label}: ${pct(i.raw)}` } });

    tbl.set(rows, `Indikator Ekonomi Daerah · ${year}`);
    icons();
  }
  update();
}
