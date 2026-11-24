import { $, C, YEARS, barDs, bind, canvas, card, draw, f, head, hint, icons, kpi, lineDs, mon, pct, per, perShort, qLabel, select, short, signed, tickPct, xAxis, axis, yearOptions } from './utils.js';

const KPIS = [['gdp_growth', 'Pertumbuhan Ekonomi', 'trending-up'], ['inflation', 'Inflasi Tahunan', 'percent'], ['unemployment', 'Tingkat Pengangguran', 'briefcase'], ['poverty', 'Tingkat Kemiskinan', 'wallet']];

export function mount(root, D) {
  let year = YEARS[YEARS.length - 1];
  root.innerHTML = head('Ringkasan Ekonomi', 'Indikator utama ekonomi Jawa Timur. Setiap indikator memakai periode acuannya sendiri.', select('year', 'Tahun', yearOptions(), year)) +
    '<div class="grid g4" id="kpis"></div>' + hint('Perubahan pada kartu dinyatakan dalam poin persentase, yaitu selisih antara dua nilai persen, dibandingkan periode yang sama tahun sebelumnya.') +
    `<div class="grid g3">${card('Inflasi Bulanan', 'Perubahan IHK dibanding bulan sebelumnya (MoM) dan bulan yang sama tahun lalu (YoY), dalam %', canvas('c-infl'), 'span2')}${card('Pertumbuhan Ekonomi Tahunan', 'Pertumbuhan PDRB harga konstan dibanding tahun sebelumnya (%); tahun terpilih berwarna navy', canvas('c-annual'))}</div>` +
    `<div class="grid g3">${card('Pertumbuhan Ekonomi Triwulanan', 'PDRB provinsi: dibanding triwulan sebelumnya (QoQ) dan triwulan yang sama tahun lalu (YoY), dalam %', canvas('c-qtr'))}${card('Kabupaten/Kota dengan PDRB Terbesar', '10 teratas dari 38 kabupaten/kota menurut PDRB harga konstan (Rp triliun)', canvas('c-top'), 'span2')}</div>` +
    `<div class="grid g2">${card('Tingkat Pengangguran', 'Pengamatan Februari dan Agustus (%); tahun terpilih ditandai', canvas('c-unemp'))}${card('Tingkat Kemiskinan', 'Pengamatan Maret dan September (%); tahun terpilih ditandai', canvas('c-pov'))}</div>`;
  bind('year', v => { year = +v; update(); });

  function social(id, indicator, color) {
    const rows = D.social_indicators.filter(r => r.indicator === indicator && YEARS.includes(r.year));
    draw(id, 'line', { labels: rows.map(r => r.period), datasets: [lineDs('Tingkat', rows.map(r => r.value_pct), color, {
      pointRadius: rows.map(r => r.year === year ? 6 : 3), pointBackgroundColor: rows.map(r => r.year === year ? color : '#fff'), pointBorderWidth: 2 })] },
      { scales: { x: xAxis({ ticks: { callback(i) { return perShort(this.getLabelForValue(i)); } } }), y: axis(tickPct) },
        tip: { title: i => per(i[0].label), label: i => ` ${pct(i.raw)}` } });
  }

  function update() {
    const k = D.overview_kpis.find(r => r.year === year) ?? {}, ref = D.metadata.kpi_reference;
    $('#kpis').innerHTML = KPIS.map(([key, title, icon]) => kpi(title, icon, pct(k[key]), `${ref[key]} ${year}`, k[key + '_chg_pp'], `${signed(k[key + '_chg_pp'], ' poin')} dibanding ${year - 1}`)).join('');

    const infl = D.inflation_monthly.filter(r => r.year === year);
    draw('c-infl', 'bar', { labels: infl.map(r => r.period), datasets: [barDs('MoM', infl.map(r => r.inflation_mom_pct), C.sky, { maxBarThickness: 22 }), lineDs('YoY', infl.map(r => r.inflation_yoy_pct), C.navy)] },
      { legend: true, scales: { x: xAxis({ ticks: { callback(i) { return mon(this.getLabelForValue(i)); } } }), y: axis(tickPct) }, tip: { title: i => per(i[0].label), label: i => ` ${i.dataset.label}: ${pct(i.raw)}` } });

    const ann = D.gdp_annual_province.filter(r => YEARS.includes(r.year));
    draw('c-annual', 'bar', { labels: ann.map(r => r.year), datasets: [barDs('Pertumbuhan', ann.map(r => r.growth_yoy_pct), ann.map(r => r.year === year ? C.navy : '#cbd5e1'), { maxBarThickness: 44 })] },
      { scales: { y: axis(tickPct, { beginAtZero: true }) }, tip: { label: i => ` Pertumbuhan: ${pct(i.raw)}` } });

    const q = D.gdp_quarterly_province.filter(r => r.year === year);
    draw('c-qtr', 'bar', { labels: q.map(r => ['Triwulan', qLabel(r.period).split(' ')[1]]), datasets: [barDs('QoQ', q.map(r => r.growth_qoq_pct), C.sky, { maxBarThickness: 28 }), lineDs('YoY', q.map(r => r.growth_yoy_pct), C.teal)] },
      { legend: true, scales: { x: xAxis({ ticks: { maxRotation: 0 } }), y: axis(tickPct) }, tip: { title: i => `${qLabel(q[i[0].dataIndex].period)} ${year}`, label: i => ` ${i.dataset.label}: ${pct(i.raw)}` } });

    const top = D.gdp_annual_regional.filter(r => r.year === year).sort((a, b) => b.real_gdp_billion_idr - a.real_gdp_billion_idr).slice(0, 10);
    draw('c-top', 'bar', { labels: top.map(r => short(r.region)), datasets: [barDs('PDRB Harga Konstan', top.map(r => r.real_gdp_billion_idr), C.navy, { maxBarThickness: 14, borderRadius: 3 })] },
      { indexAxis: 'y', scales: { x: axis(v => f(v / 1000, 0)), y: xAxis() }, tip: { label: i => ` Rp${f(i.raw, 0)} miliar` } });

    social('c-unemp', 'unemployment_rate', C.navy); social('c-pov', 'poverty_rate', C.teal);
    icons();
  }
  update();
}
