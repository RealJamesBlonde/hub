import { pobierzWpisy, oznaczPrzeczytane } from './dane.js';

// Ikonki folderów – można tu dopisywać kolejne.
const IKONY = { chemia: '🧪', angielski: '📘', notatki: '📝', biologia: '🧬', fizyka: '⚛️', historia: '📜', newsy: '📰', matematyka: '📐' };

let wpisy = [];
// ekran: 'lista' (folder === null oznacza "Najnowsze" ze wszystkich folderów) albo 'czytaj'
let stan = { ekran: 'lista', folder: null };

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const duza = s => s ? s[0].toLocaleUpperCase('pl') + s.slice(1) : s;
const dataPL = iso => {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleString('pl-PL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
};

async function wczytaj() {
  $('widok').innerHTML = '<p class="info">Ładowanie…</p>';
  try { wpisy = await pobierzWpisy(); rysuj(); }
  catch (e) { $('widok').innerHTML = `<p class="info">Nie udało się wczytać wpisów.<br>${esc(e.message)}</p>`; }
}

function idzDo(nowyStan, zastap = false) {
  stan = nowyStan;
  zastap ? history.replaceState(stan, '') : history.pushState(stan, '');
  rysuj();
  window.scrollTo(0, 0);
}

// ---------- MENU Z FOLDERAMI ----------
function rysujMenu() {
  const foldery = {};
  for (const w of wpisy) {
    const f = (foldery[w.folder] ??= { razem: 0, nowe: 0 });
    f.razem++; if (!w.przeczytane) f.nowe++;
  }
  const nazwy = Object.keys(foldery).sort((a, b) => a.localeCompare(b, 'pl'));
  const nowe = wpisy.filter(w => !w.przeczytane).length;
  const pozycja = (folder, ikona, nazwa, licznik) => `
    <button class="pozycja ${stan.folder === folder ? 'aktywna' : ''}" data-f="${folder === null ? '' : esc(folder)}">
      <span class="ikona">${ikona}</span>
      <span class="nazwa">${esc(nazwa)}</span>
      ${licznik ? `<span class="licznik">${licznik}</span>` : ''}
    </button>`;

  $('lista-folderow').innerHTML =
    pozycja(null, '🕘', 'Najnowsze', nowe) +
    '<div class="sekcja">Foldery</div>' +
    (nazwy.map(n => pozycja(n, IKONY[n] || '📁', duza(n), foldery[n].nowe)).join('') || '<p class="pusto">Brak folderów</p>');

  document.querySelectorAll('.pozycja').forEach(b => b.onclick = () => {
    // wpis "menu otwarte" w historii zamieniamy na wybrany folder –
    // dzięki temu "wstecz" z folderu wraca do poprzedniego ekranu
    idzDo({ ekran: 'lista', folder: b.dataset.f || null }, true);
  });
}

function otworzMenu() {
  rysujMenu();
  document.body.classList.add('menu-otwarte');
  history.pushState({ ...stan, menu: true }, '');
}
function zamknijMenu() {
  if (history.state?.menu) history.back();
  else document.body.classList.remove('menu-otwarte');
}

// ---------- GŁÓWNY WIDOK ----------
function rysuj() {
  document.body.classList.toggle('menu-otwarte', !!history.state?.menu);
  const czytanie = stan.ekran === 'czytaj';
  $('menu').hidden = czytanie;
  $('wstecz').hidden = !czytanie;

  if (stan.ekran === 'lista') {
    $('tytul').textContent = stan.folder ? duza(stan.folder) : 'Najnowsze';
    const lista = stan.folder ? wpisy.filter(w => w.folder === stan.folder) : wpisy;
    if (!lista.length) {
      $('widok').innerHTML = '<p class="info">Na razie pusto.<br>Wpisy od automatów pojawią się tutaj.</p>';
      return;
    }
    $('widok').innerHTML = lista.map(w => `
      <button class="wpis ${w.przeczytane ? '' : 'nowy'}" data-id="${esc(w.id)}">
        <b>${esc(w.tytul || '(bez tytułu)')}</b>
        <small>${stan.folder ? '' : `${IKONY[w.folder] || '📁'} ${esc(duza(w.folder))} · `}${dataPL(w.data)}</small>
      </button>`).join('');
    document.querySelectorAll('.wpis').forEach(b =>
      b.onclick = () => idzDo({ ekran: 'czytaj', folder: stan.folder, id: b.dataset.id }));
  }

  else if (czytanie) {
    const w = wpisy.find(x => x.id === stan.id);
    if (!w) { stan = { ekran: 'lista', folder: stan.folder }; return rysuj(); }
    $('tytul').textContent = w.tytul || duza(w.folder);
    $('widok').innerHTML = `
      <p class="data">${IKONY[w.folder] || '📁'} ${esc(duza(w.folder))} · ${dataPL(w.data)}</p>
      <article class="tresc">${esc(w.tresc)}</article>
      <button class="akcja ${w.przeczytane ? 'drugorzedna' : ''}" id="oznacz">
        ${w.przeczytane ? 'Oznacz jako nieprzeczytane' : '✓ Przeczytane'}
      </button>`;
    $('oznacz').onclick = async () => {
      w.przeczytane = !w.przeczytane;
      await oznaczPrzeczytane(w.id, w.przeczytane);
      if (w.przeczytane) history.back(); else rysuj();
    };
  }
}

$('menu').onclick = otworzMenu;
$('zaslona').onclick = zamknijMenu;
$('wstecz').onclick = () => history.back();
$('odswiez').onclick = wczytaj;
// Systemowy przycisk/gest "wstecz" zamyka menu albo wraca do listy.
window.addEventListener('popstate', e => {
  const s = e.state || { ekran: 'lista', folder: null };
  stan = { ekran: s.ekran, folder: s.folder ?? null, id: s.id };
  rysuj();
});

history.replaceState(stan, '');
wczytaj();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
