# Dashboard Ekonomi Jawa Timur
**Analisis dan Visualisasi Data Ekonomi Regional** — prototipe akademik pendukung proposal Kerja Praktik (Program Studi S1 Sains Data, Telkom University Kampus Surabaya) di Kantor Perwakilan Bank Indonesia Provinsi Jawa Timur.

> **Data Simulasi.** Seluruh data bersifat sintetis (SIMULASI AKADEMIK). Dashboard ini tidak merepresentasikan data maupun sistem resmi Bank Indonesia atau Badan Pusat Statistik (BPS).

Teknologi: Python (Pandas, NumPy) · HTML5 · CSS3 · Vanilla JavaScript (ES modules) · Chart.js · Lucide Icons. Tanpa Node.js/npm, framework, backend, database, atau proses build.

## Halaman
| Menu | Isi |
|---|---|
| Ringkasan Ekonomi | Pertumbuhan Ekonomi, Inflasi Tahunan, Tingkat Pengangguran, Tingkat Kemiskinan, dan grafik pendukung |
| Inflasi dan Harga Pangan | IHK, inflasi MoM/YoY/YTD, perkembangan harga enam komoditas pangan, tabel ringkasan harga |
| Ekonomi Daerah | Perbandingan PDRB harga konstan, pertumbuhan, dan kontribusi 38 kabupaten/kota |
| Eksplorasi Data | Telusur, filter, pencarian, sorting, pagination, dan Unduh CSV untuk setiap dataset |

## Struktur folder
```
index.html                 Kerangka halaman (sidebar, header, footer, disclaimer) — di root folder
css/style.css              Seluruh gaya tampilan
js/main.js                 Router (hash) dan pemuatan data
js/utils.js                Format angka/tanggal Indonesia, komponen UI, pembungkus Chart.js, tabel (sort/pagination/Unduh CSV)
js/overview.js  inflation.js  regional.js  explorer.js    Satu modul per halaman
data/raw/                  Dataset mentah (+ commodity_prices_monthly.csv hasil simulasi)
data/processed/            Hasil olahan Python: CSV, descriptive_statistics.csv, eda_summary.json,
                           dashboard_site.json  <- satu-satunya file data yang dibaca website
data/data_dictionary.csv   Kamus data (aturan penggunaan data: data/SOURCE_PACKAGE_README.md)
python/                    generate_data.py, process_data.py, build_dashboard_data.py
.nojekyll                  Agar GitHub Pages menyajikan file apa adanya
requirements.txt
```
Folder `data/processed/` sudah berisi hasil olahan, sehingga website langsung berjalan **tanpa menjalankan Python kembali**.

## 1. Menjalankan website (VS Code Live Server)
1. Buka folder ini di VS Code.
2. Pasang ekstensi **Live Server** (jika belum ada).
3. Klik kanan `index.html` → **Open with Live Server**.

Alternatif tanpa VS Code: jalankan `python -m http.server` di folder ini, lalu buka http://localhost:8000.

Membuka `index.html` langsung dari folder (alamat `file://`) tidak akan memuat data karena browser memblokir ES modules dan `fetch`; halaman akan menampilkan petunjuk. Chart.js, Lucide, dan font Inter dimuat melalui HTTPS dari CDN, sehingga diperlukan koneksi internet. Semua file lokal memakai *relative path*.

## 2. Deployment ke GitHub Pages
1. Buat repository baru di GitHub, lalu unggah **isi** folder ini (bukan folder pembungkusnya) sehingga `index.html` berada di root repository.
   ```bash
   git init
   git add .
   git commit -m "Dashboard Ekonomi Jawa Timur"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```
2. Di GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Pilih branch `main` dan folder `/ (root)`, lalu **Save**.
4. Tunggu beberapa menit; situs tersedia di `https://<username>.github.io/<repo>/`.

Tidak ada proses build dan tidak ada langkah tambahan. Nama file dan folder ditulis dengan huruf kecil karena GitHub Pages membedakan huruf besar/kecil.

## 3. Memproses ulang data dengan Python (opsional)
```bash
python -m pip install -r requirements.txt
python python/generate_data.py          # data mentah (seed tetap, hasil identik)
python python/process_data.py           # validasi; IHK, inflasi MoM/YoY/YTD; pertumbuhan PDRB; kontribusi PDRB; indikator sosial
python python/build_dashboard_data.py   # simulasi harga pangan (seed 2025), pemeriksaan kualitas, EDA, statistik deskriptif,
                                        # perubahan harga MoM/YoY, rata-rata bergerak 3 bulan, KPI, katalog, ekspor JSON
```
Semua KPI, grafik, dan tabel dihitung dari file hasil Python; tidak ada angka yang ditulis manual di JavaScript.

## Format tampilan Indonesia
- Angka memakai koma desimal dan titik ribuan (`5,56%`, `Rp15.000`); bulan memakai nama Indonesia (`Desember 2025`); triwulan ditulis `Triwulan I`; nilai kosong ditampilkan `Tidak tersedia`.
- Format hanya memengaruhi tampilan. Nilai asli dan hasil perhitungan Python tidak berubah.
- **Unduh CSV** menghasilkan file dengan nama kolom internal dan angka berformat mesin (titik desimal, tanpa pemisah ribuan) agar mudah diolah ulang; nilai kosong berupa sel kosong.
- Perubahan indikator berupa persentase dinyatakan dalam **poin persentase** (selisih dua nilai persen), sedangkan perubahan harga dan inflasi dinyatakan dalam **persen**.
- Singkatan: MoM (dibanding bulan sebelumnya), YoY (dibanding periode yang sama tahun lalu), QoQ (dibanding triwulan sebelumnya), YTD (sejak Desember tahun lalu), IHK (Indeks Harga Konsumen), PDRB (Produk Domestik Regional Bruto).

## Aturan metodologi
- **Ringkasan Ekonomi** memakai periode acuan tiap indikator: inflasi YoY Desember, pertumbuhan PDRB tahunan dari total PDRB, pengangguran Agustus, kemiskinan September. Perubahan dibandingkan periode yang sama tahun sebelumnya (poin persentase), tanpa pewarnaan baik/buruk.
- Periode utama 2022–2025; 2021 menjadi dasar perhitungan antarperiode (tersedia di Eksplorasi Data).
- Inflasi hanya tingkat provinsi; YTD memakai Desember sebelumnya sebagai penyebut (tidak menjumlahkan inflasi bulanan).
- PDRB: triwulanan tingkat provinsi, tahunan untuk 38 kabupaten/kota; kontribusi dihitung dari total 38 wilayah; pertumbuhan provinsi tidak dirata-ratakan dari daerah.
- Indikator sosial bersifat semesteran dan tidak diinterpolasi. Nilai yang belum tersedia ditampilkan **Tidak tersedia** (sel kosong pada CSV).
- Harga pangan: simulasi bergerak mengikuti IHK, lonjakan sekitar Idulfitri/Desember, dan gangguan acak AR(1); bukan data harga aktual.
- Unduh CSV di Eksplorasi Data memuat seluruh baris hasil filter dengan urutan saat ini (sebelum pagination).

Sumber: Data simulasi akademik yang diolah menggunakan Python. Desain mengacu pada karakter visual Zenith Dashboard (implementasi orisinal dengan HTML/CSS/JS).
