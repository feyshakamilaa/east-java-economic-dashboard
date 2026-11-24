import { $, C, MON_FULL, YEARS, axis, num, barDs, bind, canvas, card, draw, f, head, hint, icons, kpi, lineDs, marks, mon, option, pad, pct, per, rp, select, signed, table, tickPct, xAxis, yearOptions } from './utils.js';

const COLORS = [C.navy, C.blue, C.teal, C.sky, C.slate, C.amber];
const MONTHS = MON_FULL.map((m, i) => option(i + 1, m));

export function mount(root, D) {
  const names = D.metadata.commodities.map(c => c.name);
  let year = YEARS[YEARS.length - 1], month = 12, com = 'all', tbl;
  root.innerHTML = head('Inflasi dan Harga Pangan', 'IHK tingkat provinsi dan harga pangan simulasi. Bulan acuan ditandai pada grafik.',
      select('year', 'Tahun', yearOptions(), year) + select('month', 'Bulan acuan', MONTHS, month) +
      select('com', 'Komoditas', [option('all', 'Semua komoditas'), ...names.map(n => option(n, n))], com)) +
    '<div class="grid g4" id="kpis"></div>' + hint('IHK (Indeks Harga Konsumen) mengukur perubahan harga barang dan jasa yang dibeli rumah tangga. MoM: perubahan dari bulan sebelumnya. YoY: perubahan dari bulan yang sama tahun lalu. YTD: perubahan sejak Desember tahun lalu.') +
    `<div class="grid g3">${card('Tren IHK', 'Indeks, Desember 2020 = 100', canvas('c-cpi'))}${card('Inflasi Bulanan (MoM)', 'Perubahan IHK dibanding bulan sebelumnya (%)', canvas('c-mom'))}${card('Inflasi Tahunan (YoY)', 'Perubahan IHK dibanding bulan yang sama tahun lalu (%)', canvas('c-yoy'))}</div>` +
    `<div class="grid g3">${card('Perkembangan Harga Pangan', '<span id="trend-desc"></span>', canvas('c-price', 'tall'), 'span2')}${card('Perubahan Harga', 'Perubahan harga dibanding bulan sebelumnya (MoM) dan bulan yang sama tahun lalu (YoY), dalam %', canvas('c-chg', 'tall'))}</div>` +
    '<div id="tbl"></div>';
  bind('year', v => { year = +v; update(); }); bind('month', v => { month = +v; update(); }); bind('com', v => { com = v; update(); });

  tbl = table($('#tbl'), { title: 'Ringkasan Harga Pangan', exportName: () => `ringkasan_harga_pangan_${year}-${pad(month)}`, columns: [
    { key: 'commodity', label: 'Komoditas' }, { key: 'unit', label: 'Satuan' }, { key: 'price_idr', label: 'Harga', fmt: v => rp(v) },
    { key: 'price_mom_pct', label: 'Perubahan MoM', fmt: v => signed(v, '%') }, { key: 'price_yoy_pct', label: 'Perubahan YoY', fmt: v => signed(v, '%') },
    { key: 'avg_price_idr', label: 'Rata-rata Harga', unit: 'setahun', fmt: v => rp(v) }, { key: 'min_price_idr', label: 'Harga Terendah', unit: 'setahun', fmt: v => rp(v) }, { key: 'max_price_idr', label: 'Harga Tertinggi', unit: 'setahun', fmt: v => rp(v) }] });

  function update() {
    const refP = `${year}-${pad(month)}`, list = com === 'all' ? names : [com];
    const infl = D.inflation_monthly.filter(r => r.year === year), now = infl.find(r => r.period === refP) ?? {};
    const labels = infl.map(r => r.period), isRef = p => p === refP;
    const mScale = { x: xAxis({ ticks: { autoSkip: false, minRotation: 45, maxRotation: 45, font: { size: 11 }, callback(i) { return mon(this.getLabelForValue(i)); } } }) };
    const ttl = { title: i => per(i[0].label) };

    $('#kpis').innerHTML = kpi('Indeks Harga Konsumen (IHK)', 'gauge', f(now.cpi), `${per(refP)} · Des 2020 = 100`) +
      kpi('Inflasi Bulanan (MoM)', 'calendar', pct(now.inflation_mom_pct), `${per(refP)} dibanding bulan sebelumnya`) +
      kpi('Inflasi Tahunan (YoY)', 'percent', pct(now.inflation_yoy_pct), `${per(refP)} dibanding ${per(`${year - 1}-${pad(month)}`)}`) +
      kpi('Inflasi Sejak Awal Tahun (YTD)', 'trending-up', pct(now.inflation_ytd_pct), `${per(refP)} dibanding Desember ${year - 1}`);

    draw('c-cpi', 'line', { labels, datasets: [lineDs('IHK', infl.map(r => r.cpi), C.navy, { fill: true, backgroundColor: '#3b82f61f', pointRadius: marks(labels, isRef) })] },
      { scales: { ...mScale, y: axis(num) }, tip: { ...ttl, label: i => ` IHK: ${f(i.raw)}` } });
    draw('c-mom', 'bar', { labels, datasets: [barDs('MoM', infl.map(r => r.inflation_mom_pct), labels.map(p => isRef(p) ? C.navy : C.sky), { maxBarThickness: 20 })] },
      { scales: { ...mScale, y: axis(tickPct) }, tip: { ...ttl, label: i => ` MoM: ${pct(i.raw)}` } });
    draw('c-yoy', 'line', { labels, datasets: [lineDs('YoY', infl.map(r => r.inflation_yoy_pct), C.teal, { pointRadius: marks(labels, isRef) })] },
      { scales: { ...mScale, y: axis(tickPct) }, tip: { ...ttl, label: i => ` YoY: ${pct(i.raw)}` } });

    const prices = D.commodity_prices_monthly.filter(r => r.year === year);
    const series = c => labels.map(p => prices.find(r => r.period === p && r.commodity === c));
    const unitOf = n => D.metadata.commodities.find(c => c.name === n)?.unit ?? '';
    const unit = com === 'all' ? '' : unitOf(com);
    $('#trend-desc').textContent = com === 'all' ? 'Harga bulanan (Rp/kg; minyak goreng Rp/liter)' : `Harga ${com} (${unit}) dan rata-rata bergerak 3 bulan`;
    const ds = com === 'all' ? names.map((n, i) => lineDs(n, series(n).map(r => r.price_idr), COLORS[i], { pointRadius: 0, pointHoverRadius: 4 })) :
      [lineDs(com, series(com).map(r => r.price_idr), C.navy, { fill: true, backgroundColor: '#3b82f61f', pointRadius: marks(labels, isRef) }),
       lineDs('Rata-rata bergerak 3 bulan', series(com).map(r => r.ma3_price_idr), C.amber, { borderDash: [5, 4], pointRadius: 0 })];
    draw('c-price', 'line', { labels, datasets: ds }, { legend: true, scales: { ...mScale, y: axis(v => f(v, 0)) }, tip: { ...ttl, label: i => ` ${i.dataset.label}: ${rp(i.raw)}${(unitOf(i.dataset.label) || unit).replace('Rp', '')}` } });

    const atRef = prices.filter(r => r.period === refP && list.includes(r.commodity));
    draw('c-chg', 'bar', { labels: atRef.map(r => r.commodity.split(' ')), datasets: [barDs('MoM', atRef.map(r => r.price_mom_pct), C.sky, { maxBarThickness: 18 }), barDs('YoY', atRef.map(r => r.price_yoy_pct), C.navy, { maxBarThickness: 18 })] },
      { legend: true, scales: { x: xAxis({ ticks: { autoSkip: false, minRotation: 0, maxRotation: 0, font: { size: 10 } } }), y: axis(tickPct) }, tip: { title: i => atRef[i[0].dataIndex].commodity, label: i => ` ${i.dataset.label}: ${pct(i.raw)}` } });

    const yearly = Object.fromEntries(D.commodity_summary_yearly.filter(s => s.year === year).map(s => [s.commodity, s]));
    tbl.set(atRef.map(r => ({ ...r, ...yearly[r.commodity] })), `Ringkasan Harga Pangan · ${per(refP)}`);
    icons();
  }
  update();
}
