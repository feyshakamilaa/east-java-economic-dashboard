# Pemantauan Ekonomi Jawa Timur — Simulasi Akademik

Seluruh pengamatan ekonomi dalam paket ini bersifat sintetis, termasuk angka yang dikaitkan dengan nama wilayah sebenarnya. Data ini BUKAN data resmi Bank Indonesia maupun BPS dan tidak boleh dipakai untuk keputusan ekonomi. Basis harga PDRB 2020 dan basis IHK Desember 2020 adalah konvensi sintetis, bukan tahun dasar statistik resmi. PDRB provinsi dibentuk sebagai penjumlahan 38 seri PDRB kabupaten/kota sintetis; ini kemudahan pemodelan, bukan klaim tentang metodologi penyusunan resmi.

## Reproduksi
```sh
python -m pip install -r requirements.txt
python generate_data.py
python process_data.py
```
`generate_data.py` memakai seed acak tetap; `process_data.py` memvalidasi file mentah serta mengekspor CSV dan JSON olahan. Dashboard harus membaca data hasil olahan, bukan membuat nilai sendiri. Tahun dasar 2021 tersedia untuk mendukung perbandingan YoY; tampilkan 2022–2025 sebagai bawaan. Nilai pertumbuhan kosong (null) berarti periode pembanding belum tersedia, bukan nol.

## Data mentah (840 pengamatan)
- `raw/inflation_monthly.csv`: 60 catatan IHK bulanan tingkat provinsi, 2021–2025.
- `raw/regional_gdp_quarterly.csv`: 760 catatan PDRB triwulanan (38 kabupaten/kota × 20 triwulan), dalam Rp miliar pada harga konstan sintetis 2020.
- `raw/social_indicators.csv`: 20 pengamatan tingkat provinsi; pengangguran pada Februari/Agustus dan kemiskinan pada Maret/September setiap tahun.
- `raw/commodity_prices_monthly.csv`: harga simulasi enam komoditas pangan (hasil `build_dashboard_data.py`).

## Dataset olahan
- `inflation_monthly`: IHK serta inflasi MoM, YoY, dan YTD.
- `gdp_quarterly_province`: agregat PDRB kabupaten/kota dan pertumbuhan QoQ/YoY.
- `gdp_quarterly_regional`: PDRB dan pertumbuhan QoQ/YoY per kabupaten/kota.
- `gdp_annual_province`: PDRB tahunan dan pertumbuhan tahunan.
- `gdp_annual_regional`: PDRB tahunan, pertumbuhan, dan kontribusi terhadap PDRB provinsi.
- `social_indicators`: tingkat dan perubahan dibanding bulan acuan yang sama tahun lalu (poin persentase).
- `commodity_prices_monthly`, `commodity_summary_yearly`: harga pangan, perubahan MoM/YoY, rata-rata bergerak 3 bulan, serta ringkasan tahunan.
- `dashboard_data.json`: enam tabel dan metadata untuk integrasi antarmuka; `dashboard_site.json`: seluruh tabel yang dibaca website.
- `data_dictionary.csv`: arti dan satuan kolom.

## Aturan dashboard
- Pemilihan tahun pada Ringkasan Ekonomi: inflasi YoY Desember; pertumbuhan PDRB tahunan dihitung dari total PDRB tahunan; pengangguran Agustus; kemiskinan September. Selalu tampilkan periode acuan tiap indikator. Untuk tingkat (rate), bandingkan dengan periode acuan yang sama tahun lalu dalam poin persentase; jangan menyiratkan arah baik/buruk hanya dari warna.
- Inflasi: hanya tingkat provinsi. Jangan membuat IHK per wilayah. YTD memakai Desember sebelumnya sebagai penyebut; persentase bulanan tidak boleh dijumlahkan untuk menghitung YTD.
- PDRB: seri triwulanan provinsi; perbandingan tahunan antarwilayah (38 daerah). Peringkat berdasarkan PDRB tahunan, pertumbuhan YoY tahunan, atau kontribusi. Kontribusi berjumlah 100% untuk seluruh 38 wilayah, bukan subset hasil filter. Jangan merata-ratakan pertumbuhan daerah untuk menghitung pertumbuhan provinsi.
- Indikator sosial: hanya pengamatan semesteran; jangan diinterpolasi atau dibuat angka bulanan. Jangan merata-ratakan tingkat atau menjumlahkan persentase untuk membuat agregat wilayah baru.
- Eksplorasi Data: pemilih dataset tersendiri, filter yang relevan saja, sorting, pagination, dan unduh data sesuai hasil filter (sebelum pagination). Hindari penggabungan lintas frekuensi. Nilai null berarti tidak tersedia (ditampilkan "Tidak tersedia").
- Gunakan data hasil filter dari JSON untuk tampilan; basis pembanding sudah dihitung Python. Filter tanggal tidak boleh merusak perbandingan antarperiode. Jika tidak ada data yang cocok, tampilkan keadaan kosong yang jelas. Tidak ada angka manual pada kartu atau grafik.
- Paket ini hanya berisi data dan pipeline Python; kode sumber template Zenith tidak disertakan.
