"""Simulasi harga pangan (seed tetap), validasi/pembersihan, EDA, dan ekspor JSON dashboard.
(Simulate commodity prices with a fixed seed, validate/clean, run EDA, export the dashboard JSON.)

Run order:  generate_data.py -> process_data.py -> build_dashboard_data.py
Inputs : data/raw/*.csv, data/processed/dashboard_data.json (from process_data.py)
Outputs: data/raw/commodity_prices_monthly.csv, data/processed/*.csv,
         data/processed/descriptive_statistics.csv, data/processed/eda_summary.json,
         data/processed/dashboard_site.json (the only file the website reads)
All data are synthetic (SIMULASI AKADEMIK).
"""
import json
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW, OUT = ROOT / 'data' / 'raw', ROOT / 'data' / 'processed'; WEB = OUT

SEED, SRC = 2025, 'SIMULASI AKADEMIK'
rec = lambda df: json.loads(df.round(4).to_json(orient='records'))  # NaN -> null (= N/A)

# 1. Simulate monthly commodity prices -----------------------------------------------------------
# log(price) = log(base) + log(CPI/100) [shared inflation factor] + festive uplift + AR(1) noise
cpi = pd.read_csv(RAW / 'inflation_monthly.csv').sort_values('period').reset_index(drop=True)
lcpi = np.log(cpi.cpi.to_numpy() / 100)
EID = {2021: 5, 2022: 5, 2023: 4, 2024: 4, 2025: 3}  # month of Eid al-Fitr (demand peak)
SPEC = {  # komoditas: (satuan, harga dasar Jan-2021 dalam Rp, sd gejolak, kenaikan musiman)
    'Beras': ('Rp/kg', 11800, .004, .010), 'Cabai Merah': ('Rp/kg', 42000, .080, .120),
    'Bawang Merah': ('Rp/kg', 33000, .060, .080), 'Telur Ayam': ('Rp/kg', 26500, .020, .040),
    'Daging Ayam': ('Rp/kg', 34500, .020, .040), 'Minyak Goreng': ('Rp/liter', 15500, .012, .010)}
rng, rows = np.random.default_rng(SEED), []
for name, (unit, base, sd, fest) in SPEC.items():
    e = 0.0
    for i, p in enumerate(cpi.period):
        y, m = int(p[:4]), int(p[5:])
        e = .6 * e + rng.normal(0, sd)
        up = fest * {EID[y]: 1, EID[y] - 1: .5, 12: .5}.get(m, 0)
        rows.append((p, 'Jawa Timur', name, unit, int(round(base * np.exp(lcpi[i] + up + e) / 50) * 50), SRC))
pd.DataFrame(rows, columns=['period', 'region', 'commodity', 'unit', 'price_idr', 'source']).to_csv(
    RAW / 'commodity_prices_monthly.csv', index=False)

# 2. Validate, clean, calculate ---------------------------------------------------------------
c = pd.read_csv(RAW / 'commodity_prices_monthly.csv')
assert not c.isna().any().any() and not c.duplicated(['period', 'commodity']).any()
assert (c.price_idr > 0).all() and (c.source == SRC).all() and len(c) == 60 * len(SPEC)
c['year'], c['month'] = c.period.str[:4].astype(int), c.period.str[5:].astype(int)
c['commodity'] = pd.Categorical(c.commodity, list(SPEC), ordered=True)
c = c.sort_values(['commodity', 'period']).reset_index(drop=True)
g = c.groupby('commodity', observed=True).price_idr
c['price_mom_pct'] = g.pct_change(fill_method=None) * 100        # price / previous month - 1
c['price_yoy_pct'] = g.pct_change(12, fill_method=None) * 100    # price / same month last year - 1
c['ma3_price_idr'] = g.transform(lambda s: s.rolling(3).mean())  # simple 3-month moving average
c = c.sort_values(['period', 'commodity']).reset_index(drop=True)
c['commodity'] = c.commodity.astype(str)
c = c[['period', 'year', 'month', 'region', 'commodity', 'unit', 'price_idr', 'price_mom_pct',
       'price_yoy_pct', 'ma3_price_idr', 'source']]
c.to_csv(OUT / 'commodity_prices_monthly.csv', index=False)

ys = c.groupby(['commodity', 'year']).price_idr.agg(avg_price_idr='mean', min_price_idr='min',
                                                    max_price_idr='max', sd='std').reset_index()
ys['cv_pct'] = ys.sd / ys.avg_price_idr * 100
ys = ys.drop(columns='sd'); ys.to_csv(OUT / 'commodity_summary_yearly.csv', index=False)

# 3. Overview KPIs: each indicator uses its own reference period (see data README) ---------------
J = json.loads((OUT / 'dashboard_data.json').read_text(encoding='utf-8'))
inf, soc = pd.DataFrame(J['inflation_monthly']), pd.DataFrame(J['social_indicators'])
ap = pd.DataFrame(J['gdp_annual_province']).set_index('year')
k = pd.DataFrame(index=pd.Index(range(2021, 2026), name='year'))
k['gdp_growth'] = ap.growth_yoy_pct
k['inflation'] = inf[inf.period.str.endswith('-12')].set_index('year').inflation_yoy_pct
k['unemployment'] = soc[(soc.indicator == 'unemployment_rate') & soc.period.str.endswith('-08')].set_index('year').value_pct
k['poverty'] = soc[(soc.indicator == 'poverty_rate') & soc.period.str.endswith('-09')].set_index('year').value_pct
for col in list(k.columns):
    k[col + '_chg_pp'] = k[col].diff()  # percentage-point change vs same reference period last year
k = k.reset_index(); k.to_csv(OUT / 'overview_kpis.csv', index=False)

# 4. EDA: descriptive statistics and data-quality checks ------------------------------------------
series = {'IHK (indeks)': inf.cpi, 'Inflasi bulanan MoM (%)': inf.inflation_mom_pct, 'Inflasi tahunan YoY (%)': inf.inflation_yoy_pct,
          'Pertumbuhan PDRB provinsi QoQ (%)': pd.DataFrame(J['gdp_quarterly_province']).growth_qoq_pct,
          'Pertumbuhan PDRB provinsi YoY (%)': pd.DataFrame(J['gdp_quarterly_province']).growth_yoy_pct,
          'PDRB tahunan kabupaten/kota (Rp miliar)': pd.DataFrame(J['gdp_annual_regional']).real_gdp_billion_idr,
          'Tingkat pengangguran (%)': soc[soc.indicator == 'unemployment_rate'].value_pct,
          'Tingkat kemiskinan (%)': soc[soc.indicator == 'poverty_rate'].value_pct,
          **{f'Harga {n} (Rp)': c[c.commodity == n].price_idr for n in SPEC}}
desc = pd.DataFrame({n: s.describe() for n, s in series.items()}).T
desc.round(4).to_csv(OUT / 'descriptive_statistics.csv', index_label='series')
tables = {'inflation_monthly': inf, 'commodity_prices_monthly': c, **{n: pd.DataFrame(J[n]) for n in
          ['gdp_quarterly_province', 'gdp_quarterly_regional', 'gdp_annual_province', 'gdp_annual_regional', 'social_indicators']}}
(OUT / 'eda_summary.json').write_text(json.dumps({
    'seed': SEED, 'rows': {n: len(t) for n, t in tables.items()},
    'null_cells': {n: int(t.isna().sum().sum()) for n, t in tables.items()},
    'duplicate_rows': {n: int(t.duplicated().sum()) for n, t in tables.items()},
    'commodity_yoy_range_pct': {n: [round(float(s.min()), 2), round(float(s.max()), 2)] for n, s in
                                c.groupby('commodity').price_yoy_pct}}, indent=2))

# 5. Dataset catalog (source, unit, period, columns) for the Data Explorer ----------------------
COLS = {'period': ('Periode', ''), 'year': ('Tahun', ''), 'quarter': ('Triwulan', ''), 'month': ('Bulan', ''),
        'region': ('Wilayah', ''), 'cpi': ('IHK', 'indeks, Des 2020 = 100'), 'inflation_mom_pct': ('Inflasi MoM', '%'),
        'inflation_yoy_pct': ('Inflasi YoY', '%'), 'inflation_ytd_pct': ('Inflasi YTD', '%'),
        'real_gdp_billion_idr': ('PDRB Harga Konstan', 'Rp miliar'), 'growth_qoq_pct': ('Pertumbuhan QoQ', '%'),
        'growth_yoy_pct': ('Pertumbuhan YoY', '%'), 'province_gdp_billion_idr': ('PDRB Provinsi', 'Rp miliar'),
        'share_pct': ('Kontribusi PDRB', '%'), 'indicator': ('Indikator', ''), 'value_pct': ('Tingkat', '%'),
        'change_yoy_pp': ('Perubahan YoY', 'poin persentase'), 'commodity': ('Komoditas', ''), 'unit': ('Satuan', ''),
        'price_idr': ('Harga', 'Rp'), 'price_mom_pct': ('Perubahan Harga MoM', '%'), 'price_yoy_pct': ('Perubahan Harga YoY', '%'),
        'ma3_price_idr': ('Rata-rata Bergerak 3 Bulan', 'Rp')}
INFO = {  # id: (judul, frekuensi, ringkasan satuan, deskripsi)
    'inflation_monthly': ('IHK dan Inflasi', 'Bulanan', 'IHK (indeks, Des 2020 = 100); inflasi dalam %', 'IHK tingkat provinsi beserta inflasi bulanan (MoM), tahunan (YoY), dan sejak awal tahun (YTD).'),
    'commodity_prices_monthly': ('Harga Pangan', 'Bulanan', 'Rp per kg atau liter; perubahan dalam %', 'Harga simulasi enam komoditas pangan tingkat provinsi (seed acak tetap), lengkap dengan perubahan MoM, YoY, dan rata-rata bergerak 3 bulan.'),
    'gdp_quarterly_province': ('PDRB Triwulanan (Provinsi)', 'Triwulanan', 'Rp miliar, harga konstan 2020; pertumbuhan dalam %', 'Penjumlahan 38 kabupaten/kota beserta pertumbuhan antartriwulan (QoQ) dan tahunan (YoY).'),
    'gdp_quarterly_regional': ('PDRB Triwulanan (Kabupaten/Kota)', 'Triwulanan', 'Rp miliar, harga konstan 2020; pertumbuhan dalam %', 'PDRB triwulanan 38 kabupaten/kota.'),
    'gdp_annual_province': ('PDRB Tahunan (Provinsi)', 'Tahunan', 'Rp miliar, harga konstan 2020; pertumbuhan dalam %', 'PDRB tahunan provinsi beserta pertumbuhan tahunan (YoY).'),
    'gdp_annual_regional': ('PDRB Tahunan (Kabupaten/Kota)', 'Tahunan', 'Rp miliar, harga konstan 2020; pertumbuhan dan kontribusi dalam %', 'PDRB tahunan, pertumbuhan, dan kontribusi terhadap PDRB provinsi untuk 38 kabupaten/kota.'),
    'social_indicators': ('Pengangguran dan Kemiskinan', 'Semesteran', 'Tingkat dalam %; perubahan dalam poin persentase', 'Tingkat pengangguran (Februari dan Agustus) serta tingkat kemiskinan (Maret dan September); tidak diinterpolasi menjadi data bulanan.')}
catalog = []
for n, (title, freq, unit, d) in INFO.items():
    t = tables[n]; key = 'period' if 'period' in t else 'year'
    catalog.append({'id': n, 'title': title, 'frequency': freq, 'unit': unit, 'description': d, 'source': 'Data simulasi akademik yang diolah menggunakan Python',
                    'period_start': str(t[key].min()), 'period_end': str(t[key].max()), 'rows': len(t), 'null_cells': int(t.isna().sum().sum()),
                    'columns': [{'key': col, 'label': COLS[col][0], 'unit': COLS[col][1]} for col in t.columns if col != 'source']})

# 6. Export ------------------------------------------------------------------------------------
payload = {'metadata': {'display_years': J['metadata']['display_years'], 'baseline_year': J['metadata']['baseline_year'],
                        'commodities': [{'name': n, 'unit': v[0]} for n, v in SPEC.items()],
                        'kpi_reference': {'gdp_growth': 'Sepanjang tahun', 'inflation': 'Desember', 'unemployment': 'Agustus', 'poverty': 'September'}},
           'catalog': catalog, 'overview_kpis': rec(k), 'commodity_prices_monthly': rec(c), 'commodity_summary_yearly': rec(ys),
           **{n: rec(pd.DataFrame(J[n])) for n in ['inflation_monthly', 'gdp_quarterly_province', 'gdp_quarterly_regional', 'gdp_annual_province', 'gdp_annual_regional', 'social_indicators']}}
(WEB / 'dashboard_site.json').write_text(json.dumps(payload, ensure_ascii=False, allow_nan=False, separators=(',', ':')), encoding='utf-8')
print('Exported', WEB / 'dashboard_site.json', f"({(WEB / 'dashboard_site.json').stat().st_size / 1024:.0f} KB)")
print(c[c.period.isin(['2025-12'])][['commodity', 'price_idr', 'price_mom_pct', 'price_yoy_pct']].round(2).to_string(index=False))
