"""Validate and calculate all dashboard metrics from CSV, then export static JSON."""
from pathlib import Path
import json
import numpy as np
import pandas as pd
ROOT=Path(__file__).resolve().parent.parent/'data'
RAW=ROOT/'raw'; OUT=ROOT/'processed'; OUT.mkdir(exist_ok=True)

def read(name,keys,cols):
    df=pd.read_csv(RAW/name)
    assert not df.isna().any().any(), f'Missing: {name}'
    assert not df.duplicated(keys).any(), f'Duplicate: {name}'
    assert (df.source=='SIMULASI AKADEMIK').all()
    for col in cols: assert np.isfinite(df[col]).all(), f'Invalid: {col}'
    return df

def save(df,name):
    df.to_csv(OUT/f'{name}.csv',index=False)
    return json.loads(df.to_json(orient='records',double_precision=10))

c=read('inflation_monthly.csv',['period','region'],['cpi']).sort_values('period').reset_index(drop=True)
assert len(c)==60 and (c.cpi>0).all()
assert c.period.tolist()==pd.period_range('2021-01','2025-12',freq='M').astype(str).tolist()
c['year']=c.period.str[:4].astype(int)
c['inflation_mom_pct']=c.cpi.pct_change(fill_method=None)*100
c['inflation_yoy_pct']=c.cpi.pct_change(12,fill_method=None)*100
# Known synthetic Dec 2020 base, previous December for each calendar year.
prev_dec={2021:100.0,**{int(r.year)+1:r.cpi for r in c[c.period.str.endswith('-12')].itertuples()}}
c['inflation_ytd_pct']=(c.cpi/c.year.map(prev_dec)-1)*100
# January 2021 MoM has a known synthetic base; 2021 YoY remains unavailable.
c.loc[c.period=='2021-01','inflation_mom_pct']=(c.loc[c.period=='2021-01','cpi']/100-1)*100

r=read('regional_gdp_quarterly.csv',['year','quarter','region'],['real_gdp_billion_idr']).sort_values(['region','year','quarter']).reset_index(drop=True)
assert len(r)==760 and r.region.nunique()==38 and (r.real_gdp_billion_idr>0).all()
assert r.groupby('region').size().eq(20).all() and set(r.quarter)=={1,2,3,4}
assert set(r.year)==set(range(2021,2026))
assert r.groupby(['year','quarter']).size().eq(38).all()

def growth(df,group=None):
    df=df.copy()
    series=df.groupby(group).real_gdp_billion_idr if group else df.real_gdp_billion_idr
    df['growth_qoq_pct']=series.pct_change(1,fill_method=None)*100
    df['growth_yoy_pct']=series.pct_change(4,fill_method=None)*100
    df['period']=df.year.astype(str)+'-Q'+df.quarter.astype(str)
    return df
p=r.groupby(['year','quarter'],as_index=False).real_gdp_billion_idr.sum(); p['region']='Jawa Timur'; p['source']='SIMULASI AKADEMIK'
p=growth(p); r=growth(r,'region')
a=r.groupby(['region','year'],as_index=False).real_gdp_billion_idr.sum().sort_values(['region','year'])
a['growth_yoy_pct']=a.groupby('region').real_gdp_billion_idr.pct_change(fill_method=None)*100
annual=p.groupby('year',as_index=False).real_gdp_billion_idr.sum(); annual['growth_yoy_pct']=annual.real_gdp_billion_idr.pct_change(fill_method=None)*100; annual['region']='Jawa Timur'; annual['source']='SIMULASI AKADEMIK'
a=a.merge(annual[['year','real_gdp_billion_idr']].rename(columns={'real_gdp_billion_idr':'province_gdp_billion_idr'}),on='year',validate='many_to_one'); a['share_pct']=100*a.real_gdp_billion_idr/a.province_gdp_billion_idr; a['source']='SIMULASI AKADEMIK'
assert np.allclose(a.groupby('year').share_pct.sum(),100)
s=read('social_indicators.csv',['period','region','indicator'],['value_pct']).sort_values(['indicator','period']); s['year']=s.period.str[:4].astype(int)
assert len(s)==20 and s.value_pct.between(0,100).all()
assert set(s[s.indicator=='unemployment_rate'].period.str[-2:])=={'02','08'}
assert set(s[s.indicator=='poverty_rate'].period.str[-2:])=={'03','09'}
s['change_yoy_pp']=s.groupby('indicator').value_pct.diff(2)
# Retain 2021 in processed files for audit/comparison; UI defaults to 2022–2025.
payload={'metadata':{'data_status':'SIMULASI AKADEMIK — bukan data resmi BPS atau Bank Indonesia','display_years':[2022,2023,2024,2025],'baseline_year':2021,'gdp_unit':'Rp miliar, harga konstan simulasi 2020','cpi_base':'Desember 2020 = 100 (simulasi)','region_count':38},'inflation_monthly':save(c,'inflation_monthly'),'gdp_quarterly_province':save(p,'gdp_quarterly_province'),'gdp_quarterly_regional':save(r,'gdp_quarterly_regional'),'gdp_annual_province':save(annual,'gdp_annual_province'),'gdp_annual_regional':save(a,'gdp_annual_regional'),'social_indicators':save(s,'social_indicators')}
(OUT/'dashboard_data.json').write_text(json.dumps(payload,ensure_ascii=False,allow_nan=False,indent=2),encoding='utf-8')
print('Validated:',len(c),'monthly CPI;',len(r),'regional quarters;',len(s),'social observations.')
print('2025 simulated annual GDP growth:',annual.iloc[-1].growth_yoy_pct)
