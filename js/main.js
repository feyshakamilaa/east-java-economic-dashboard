import { loadData, $, destroyCharts, icons } from './utils.js';
import * as overview from './overview.js';
import * as inflation from './inflation.js';
import * as regional from './regional.js';
import * as explorer from './explorer.js';

const VIEWS = { overview, inflation, regional, explorer };
const TITLES = { overview: 'Ringkasan Ekonomi', inflation: 'Inflasi dan Harga Pangan', regional: 'Ekonomi Daerah', explorer: 'Eksplorasi Data' };
let D;

function route() {
  const name = VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : 'overview';
  destroyCharts();
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.v === name));
  $('#crumb').textContent = TITLES[name];
  document.title = `${TITLES[name]} · Dashboard Ekonomi Jawa Timur`;
  $('#sidebar').classList.remove('open');
  const main = $('#view');
  main.style.animation = 'none'; main.offsetHeight; main.style.animation = '';
  VIEWS[name].mount(main, D);
  icons(); window.scrollTo(0, 0);
}

$('#menu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
window.addEventListener('hashchange', route);
icons();
loadData().then(d => { D = d; route(); }).catch(() => {
  $('#view').innerHTML = '<div class="card err"><b>Data tidak dapat dimuat.</b><br>Buka situs ini melalui server lokal (misalnya VS Code Live Server) atau GitHub Pages, karena browser memblokir pemuatan data jika <code>index.html</code> dibuka langsung dari folder. Pastikan file <code>data/processed/dashboard_site.json</code> tersedia (jalankan skrip Python bila belum ada).</div>';
});
