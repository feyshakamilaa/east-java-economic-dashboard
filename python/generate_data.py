"""Generate fully synthetic economic observations. No official data is used."""
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent / 'data'
RAW = ROOT / 'raw'
RAW.mkdir(exist_ok=True)
rng = np.random.default_rng(20261124)
regions = ['Kabupaten Pacitan','Kabupaten Ponorogo','Kabupaten Trenggalek','Kabupaten Tulungagung','Kabupaten Blitar','Kabupaten Kediri','Kabupaten Malang','Kabupaten Lumajang','Kabupaten Jember','Kabupaten Banyuwangi','Kabupaten Bondowoso','Kabupaten Situbondo','Kabupaten Probolinggo','Kabupaten Pasuruan','Kabupaten Sidoarjo','Kabupaten Mojokerto','Kabupaten Jombang','Kabupaten Nganjuk','Kabupaten Madiun','Kabupaten Magetan','Kabupaten Ngawi','Kabupaten Bojonegoro','Kabupaten Tuban','Kabupaten Lamongan','Kabupaten Gresik','Kabupaten Bangkalan','Kabupaten Sampang','Kabupaten Pamekasan','Kabupaten Sumenep','Kota Kediri','Kota Blitar','Kota Malang','Kota Probolinggo','Kota Pasuruan','Kota Mojokerto','Kota Madiun','Kota Surabaya','Kota Batu']
source='SIMULASI AKADEMIK'
def write(rows, name):
    df=pd.DataFrame(rows); df['source']=source; df.to_csv(RAW/name,index=False)
# 2021 included to support prior-year comparisons; fixed synthetic CPI base Dec 2020 = 100.
rows=[]; cpi=100.0
for d in pd.date_range('2021-01-01','2025-12-01',freq='MS'):
    trend={2021:.0016,2022:.0040,2023:.0027,2024:.0016,2025:.0020}[d.year]
    seasonal={1:.001,3:.0018,4:.002,5:.0006,8:-.0018,9:-.001,12:.002}[d.month] if d.month in [1,3,4,5,8,9,12] else 0
    cpi*=1+trend+seasonal+rng.normal(0,.0019)
    rows.append(dict(period=d.strftime('%Y-%m'),region='Jawa Timur',cpi=round(cpi,4)))
write(rows,'inflation_monthly.csv')
# Regional quarterly constant-price GDP, illustrative 2020 price basis, Rp billion.
# The synthetic province is deliberately constructed as the sum of all 38 regions.
weights=rng.lognormal(0,.65,len(regions));
for region, factor in {'Kota Surabaya':7,'Kabupaten Sidoarjo':3.4,'Kabupaten Gresik':3.0,'Kabupaten Malang':2.4,'Kota Kediri':2.5}.items(): weights[regions.index(region)]*=factor
weights/=weights.sum(); annual=1_650_000*weights
regional_growth=rng.uniform(-.012,.012,len(regions)); rows=[]
for year in range(2021,2026):
    if year>2021:
        annual*=1+{2022:.052,2023:.049,2024:.048,2025:.051}[year]+regional_growth+rng.normal(0,.006,len(regions))
    for j,region in enumerate(regions):
        shares=np.array([.239,.248,.252,.261])+rng.normal(0,.0025,4); shares/=shares.sum()
        for q,val in enumerate(annual[j]*shares,1):
            rows.append(dict(year=year,quarter=q,region=region,real_gdp_billion_idr=round(val,3)))
write(rows,'regional_gdp_quarterly.csv')
# Separate reference months, no false monthly interpolation.
rows=[]
for year in range(2021,2026):
    for metric,months,base,slope,season in [('unemployment_rate',[2,8],5.7,-.31,.16),('poverty_rate',[3,9],11.3,-.37,-.10)]:
        for i,m in enumerate(months):
            rows.append(dict(period=f'{year}-{m:02}',region='Jawa Timur',indicator=metric,value_pct=round(base+slope*(year-2021)+i*season+rng.normal(0,.13),2)))
write(rows,'social_indicators.csv')
print('Generated synthetic raw datasets.')
