import { pobierzWpisy, oznaczPrzeczytane } from './dane.js';

// Ikonki folderów – można tu dopisywać kolejne.
const IKONY = { chemia: '🧪', angielski: '🇬🇧', notatki: '📝', biologia: '🧬', fizyka: '⚛️', historia: '📜', newsy: '📰', matematyka: '📐' };

let wpisy = [];
let stan = { ekran: 'foldery' };

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dataPL = iso => {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleString('pl-PL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
};

async function wczytaj() {
  $('widok').innerHTML = '<p class="info">Ładowanie…</p>';
  try { wpisy = await pobierzWpisy(); rysuj(); }
  catch (e) { $('widok').innerHTML = `<p class="info">Nie udało się wczytać wpisów.<br>${esc(e.message)}</p>`; }
}

function idzDo(nowyStan) {
  stan = nowyStan;
  history.pushState(stan, '');
  rysuj();
  window.scrollTo(0, 0);
}

function rysuj() {
  $('wstecz').hidden = stan.ekran === 'foldery';
  $('tytul').classList.toggle('folderowy', stan.ekran === 'lista');

  if (stan.ekran === 'foldery') {
    $('tytul').textContent = 'Mój Hub';
    const foldery = {};
    for (const w of wpisy) {
      const f = (foldery[w.folder] ??= { razem: 0, nowe: 0 });
      f.razem++; if (!w.przeczytane) f.nowe++;
    }
    const nazwy = Object.keys(foldery).sort((a, b) => foldery[b].nowe - foldery[a].nowe || a.localeCompare(b, 'pl'));
    if (!nazwy.length) { $('widok').innerHTML = '<p class="info">Na razie pusto.<br>Wpisy od automatów pojawią się tutaj.</p>'; return; }
    $('widok').innerHTML = '<div class="siatka">' + nazwy.map(n => `
      <button class="folder" data-f="${esc(n)}">
        ${foldery[n].nowe ? `<span class="licznik">${foldery[n].nowe}</span>` : ''}
        <span class="ikona">${IKONY[n] || '📁'}</span>
        <b>${esc(n)}</b>
        <small>${foldery[n].razem} ${foldery[n].razem === 1 ? 'wpis' : 'wpisów'}</small>
      </button>`).join('') + '</div>';
    document.querySelectorAll('.folder').forEach(b => b.onclick = () => idzDo({ ekran: 'lista', folder: b.dataset.f }));
  }

  else if (stan.ekran === 'lista') {
    $('tytul').textContent = stan.folder;
    const lista = wpisy.filter(w => w.folder === stan.folder);
    $('widok').innerHTML = lista.map(w => `
      <button class="wpis ${w.przeczytane ? '' : 'nowy'}" data-id="${esc(w.id)}">
        <b>${esc(w.tytul || '(bez tytułu)')}</b>
        <small>${dataPL(w.data)}</small>
      </button>`).join('') || '<p class="info">Brak wpisów.</p>';
    document.querySelectorAll('.wpis').forEach(b => b.onclick = () => idzDo({ ekran: 'czytaj', folder: stan.folder, id: b.dataset.id }));
  }

  else if (stan.ekran === 'czytaj') {
    const w = wpisy.find(x => x.id === stan.id);
    if (!w) { stan = { ekran: 'lista', folder: stan.folder }; return rysuj(); }
    $('tytul').textContent = w.tytul || stan.folder;
    $('widok').innerHTML = `
      <p class="data">${dataPL(w.data)}</p>
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

// Przycisk "wstecz" w aplikacji i systemowy (np. gest na Androidzie) działają tak samo.
$('wstecz').onclick = () => history.back();
window.addEventListener('popstate', e => { stan = e.state || { ekran: 'foldery' }; rysuj(); });
$('odswiez').onclick = wczytaj;

history.replaceState(stan, '');
wczytaj();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
