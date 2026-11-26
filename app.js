import { pobierzWpisy, oznaczPrzeczytane, ustawKlucz, dodajNotatke } from './dane.js';

// Ikonki folderów – można tu dopisywać kolejne.
const IKONY = { chemia: '🧪', angielski: '📘', notatki: '📝', praca: '💼', biologia: '🧬', fizyka: '⚛️', historia: '📜', newsy: '📰', matematyka: '📐' };

let wpisy = [];
// ekran: 'lista' (folder === null oznacza "Najnowsze" ze wszystkich folderów) albo 'czytaj'
let stan = { ekran: 'lista', folder: null };

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const duza = s => s ? s[0].toLocaleUpperCase('pl') + s.slice(1) : s;
const MIESIACE = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
const nowychTekst = n => n === 1 ? '1 nowa' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? `${n} nowe` : `${n} nowych`;

// Zapamiętane rozwinięcia nagłówków: { "angielski|2026": true, "angielski|2026-10": false, ... }
const KLUCZ_ROZW = 'hub-rozwiniete';
let rozwiniete = {};
try { rozwiniete = JSON.parse(localStorage.getItem(KLUCZ_ROZW) || '{}'); } catch { rozwiniete = {}; }
const zapiszRozw = () => { try { localStorage.setItem(KLUCZ_ROZW, JSON.stringify(rozwiniete)); } catch {} };

// Treść lekcji: rysunki SVG pokazujemy jako obrazki (bezpiecznie, jako <img>), a nagłówki WIELKIMI LITERAMI – pogrubione.
function formatujTresc(t) {
  return String(t ?? '').split(/(<svg[\s\S]*?<\/svg>)/i).map(cz => {
    if (/^<svg/i.test(cz)) {
      const svg = /xmlns=/.test(cz) ? cz : cz.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
      return `<img class="rysunek" alt="Rysunek do lekcji" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}">`;
    }
    return esc(cz)
      .replace(/^([A-ZĄĆĘŁŃÓŚŹŻ][A-ZĄĆĘŁŃÓŚŹŻ0-9 ,.:;!?()–-]{2,})\n?/gm, '<b class="sekcja-lekcji">$1</b>')
      // linki (np. do ofert pracy) – klikalne, otwierają się w nowej karcie
      .replace(/https?:\/\/[^\s<]+/g, u => `<a href="${u}" target="_blank" rel="noopener">${/linkedin\.com\/jobs/.test(u) ? '👉 Zobacz ofertę na LinkedIn' : u}</a>`);
  }).join('');
}

// Do wyszukiwania: bez rysunków, małe litery, bez polskich znaków (żeby "mitoza" = "MITOZA", "zolw" = "żółw").
const bezSvg = t => String(t ?? '').replace(/<svg[\s\S]*?<\/svg>/gi, ' ');
const norm = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');

const dataPL = iso => {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleString('pl-PL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
};

async function wczytaj(cicho = false) {
  if (!cicho) $('widok').innerHTML = '<p class="info">Ładowanie…</p>';
  try { wpisy = await pobierzWpisy(); rysuj(); }
  catch (e) {
    if (e.message === 'BRAK_KLUCZA' || e.message === 'ZLY_KLUCZ') return ekranKlucza(e.message === 'ZLY_KLUCZ');
    if (!cicho) $('widok').innerHTML = `<p class="info">Nie udało się wczytać wpisów.<br>${esc(e.message)}</p>`;
  }
}

// Ekran, na którym raz wpisujesz tajny klucz do skrzynki (zapamiętywany na tym urządzeniu).
function ekranKlucza(zly) {
  $('menu').hidden = true; $('wstecz').hidden = true; $('szukaj').hidden = true; $('dodaj').hidden = true;
  $('tytul').textContent = 'Mój Hub';
  $('widok').innerHTML = `
    <form id="formKlucz" class="klucz">
      <p><b>Połącz hub ze swoją skrzynką</b></p>
      <p class="data">Wpisz swój tajny klucz. Wystarczy raz – to urządzenie go zapamięta.</p>
      ${zly ? '<p class="blad">Ten klucz nie pasuje. Sprawdź, czy wkleiłeś go w całości.</p>' : ''}
      <input id="poleKlucz" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="hub_…">
      <button class="akcja" type="submit">Połącz</button>
    </form>`;
  $('formKlucz').onsubmit = ev => {
    ev.preventDefault();
    const k = $('poleKlucz').value.trim();
    if (!k) return;
    ustawKlucz(k);
    $('menu').hidden = false; $('szukaj').hidden = false; $('dodaj').hidden = false;
    wczytaj();
  };
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
  const podstrona = stan.ekran !== 'lista'; // czytanie, szukanie, nowa notatka
  $('menu').hidden = podstrona;
  $('wstecz').hidden = !podstrona;
  $('szukaj').hidden = podstrona;
  $('odswiez').hidden = podstrona;
  $('dodaj').hidden = podstrona;

  if (stan.ekran === 'szukaj') return rysujSzukanie();
  if (stan.ekran === 'nowa') return rysujNowa();

  if (stan.ekran === 'lista') {
    $('tytul').textContent = stan.folder ? duza(stan.folder) : 'Najnowsze';
    const lista = stan.folder ? wpisy.filter(w => w.folder === stan.folder) : wpisy;
    if (!lista.length) {
      $('widok').innerHTML = '<p class="info">Na razie pusto.<br>Wpisy od automatów pojawią się tutaj.</p>';
      return;
    }
    const kafelek = (w, zFolderem) => `
      <button class="wpis ${w.przeczytane ? '' : 'nowy'}" data-id="${esc(w.id)}">
        <b>${esc(w.tytul || '(bez tytułu)')}</b>
        <small>${zFolderem ? `${IKONY[w.folder] || '📁'} ${esc(duza(w.folder))} · ` : ''}${dataPL(w.data)}</small>
      </button>`;

    if (!stan.folder) {
      // "Najnowsze" – jedna płaska lista ze wszystkich folderów
      $('widok').innerHTML = lista.map(w => kafelek(w, true)).join('');
    } else {
      // Folder – grupowanie: rok → miesiąc → notatki
      const lata = new Map();
      for (const w of lista) {
        const d = new Date(w.data);
        const r = d.getFullYear(), m = d.getMonth();
        if (!lata.has(r)) lata.set(r, new Map());
        const mies = lata.get(r);
        if (!mies.has(m)) mies.set(m, []);
        mies.get(m).push(w);
      }
      const lataPosort = [...lata.keys()].sort((a, b) => b - a);
      const najR = lataPosort[0];
      const najM = Math.max(...lata.get(najR).keys());
      const czyRozw = (klucz, domyslnie) => klucz in rozwiniete ? rozwiniete[klucz] : domyslnie;

      let html = '';
      for (const r of lataPosort) {
        const kR = `${stan.folder}|${r}`;
        const otwR = czyRozw(kR, r === najR);
        const wszystkieR = [...lata.get(r).values()].flat();
        const noweR = wszystkieR.filter(w => !w.przeczytane).length;
        html += `<button class="naglowek rok" data-k="${esc(kR)}" data-d="${r === najR}">
            <span>${r}</span>
            <small>${otwR ? '' : `${wszystkieR.length}${noweR ? ' · ' + nowychTekst(noweR) : ''}`}</small>
            <span class="strzalka">${otwR ? '▾' : '▸'}</span></button>`;
        if (!otwR) continue;
        const miesPosort = [...lata.get(r).keys()].sort((a, b) => b - a);
        for (const m of miesPosort) {
          const kM = `${stan.folder}|${r}-${m + 1}`;
          const dom = r === najR && m === najM;
          const otwM = czyRozw(kM, dom);
          const notatki = lata.get(r).get(m);
          const noweM = notatki.filter(w => !w.przeczytane).length;
          html += `<button class="naglowek miesiac" data-k="${esc(kM)}" data-d="${dom}">
              <span>${MIESIACE[m]}</span>
              <small>${notatki.length}${noweM ? ' · ' + nowychTekst(noweM) : ''}</small>
              <span class="strzalka">${otwM ? '▾' : '▸'}</span></button>`;
          if (otwM) html += `<div class="grupa">${notatki.map(w => kafelek(w, false)).join('')}</div>`;
        }
      }
      $('widok').innerHTML = html;
      document.querySelectorAll('.naglowek').forEach(b => b.onclick = () => {
        rozwiniete[b.dataset.k] = !czyRozw(b.dataset.k, b.dataset.d === 'true');
        zapiszRozw();
        rysuj();
      });
    }
    document.querySelectorAll('.wpis').forEach(b => b.onclick = () => {
      // zapamiętaj, gdzie byłeś na liście, żeby po powrocie wrócić w to samo miejsce
      history.replaceState({ ...stan, scroll: window.scrollY }, '');
      idzDo({ ekran: 'czytaj', folder: stan.folder, id: b.dataset.id });
    });
  }

  else if (czytanie) {
    const w = wpisy.find(x => x.id === stan.id);
    if (!w) { stan = { ekran: 'lista', folder: stan.folder }; return rysuj(); }
    $('tytul').textContent = w.tytul || duza(w.folder);
    $('widok').innerHTML = `
      <p class="data">${IKONY[w.folder] || '📁'} ${esc(duza(w.folder))} · ${dataPL(w.data)}</p>
      <article class="tresc">${formatujTresc(w.tresc)}</article>
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

// ---------- WYSZUKIWARKA ----------
function rysujSzukanie() {
  $('tytul').textContent = 'Szukaj';
  if (!$('poleSzukaj')) {
    $('widok').innerHTML = `
      <input id="poleSzukaj" class="pole" type="search" placeholder="Np. mitoza, kwasy, atom…" autocomplete="off">
      <div id="wyniki"></div>`;
    $('poleSzukaj').value = stan.q || '';
    $('poleSzukaj').oninput = () => { stan.q = $('poleSzukaj').value; history.replaceState({ ...stan }, ''); pokazWyniki(); };
    setTimeout(() => $('poleSzukaj').focus(), 50);
  }
  pokazWyniki();
}

function pokazWyniki() {
  const q = norm((stan.q || '').trim());
  if (q.length < 2) { $('wyniki').innerHTML = '<p class="info">Wpisz co najmniej 2 litery.</p>'; return; }
  const slowa = q.split(/\s+/);
  const trafienia = wpisy
    .map(w => {
      const tytulN = norm(w.tytul || ''), trescCzysta = bezSvg(w.tresc), trescN = norm(trescCzysta);
      if (!slowa.every(sl => tytulN.includes(sl) || trescN.includes(sl))) return null;
      const wynik = slowa.reduce((s, sl) => s + (tytulN.includes(sl) ? 10 : 0), 0);
      // fragment tekstu wokół pierwszego trafienia
      const i = trescN.indexOf(slowa[0]);
      const fragment = i < 0 ? '' : (i > 50 ? '…' : '') + trescCzysta.slice(Math.max(0, i - 50), i + 90).replace(/\s+/g, ' ') + '…';
      return { w, wynik, fragment };
    })
    .filter(Boolean)
    .sort((a, b) => b.wynik - a.wynik || b.w.data.localeCompare(a.w.data));
  $('wyniki').innerHTML = trafienia.length
    ? `<p class="data">Znaleziono: ${trafienia.length}</p>` + trafienia.map(({ w, fragment }) => `
      <button class="wpis ${w.przeczytane ? '' : 'nowy'}" data-id="${esc(w.id)}">
        <b>${esc(w.tytul || '(bez tytułu)')}</b>
        <small>${IKONY[w.folder] || '📁'} ${esc(duza(w.folder))} · ${dataPL(w.data)}</small>
        ${fragment ? `<span class="fragment">${esc(fragment)}</span>` : ''}
      </button>`).join('')
    : '<p class="info">Nic nie znaleziono.</p>';
  document.querySelectorAll('#wyniki .wpis').forEach(b => b.onclick = () => idzDo({ ekran: 'czytaj', folder: null, id: b.dataset.id }));
}

// ---------- NOWA WŁASNA NOTATKA ----------
function rysujNowa() {
  $('tytul').textContent = 'Nowa notatka';
  const foldery = [...new Set(wpisy.map(w => w.folder))].sort((a, b) => a.localeCompare(b, 'pl'));
  const domyslny = stan.folder || 'notatki';
  if (!foldery.includes(domyslny)) foldery.unshift(domyslny);
  $('widok').innerHTML = `
    <form id="formNowa" class="formularz">
      <label>Folder</label>
      <select id="nFolder" class="pole">
        ${foldery.map(f => `<option value="${esc(f)}" ${f === domyslny ? 'selected' : ''}>${IKONY[f] || '📁'} ${esc(duza(f))}</option>`).join('')}
        <option value="__nowy">➕ Nowy folder…</option>
      </select>
      <input id="nNowyFolder" class="pole" placeholder="Nazwa nowego folderu" hidden>
      <label>Tytuł</label>
      <input id="nTytul" class="pole" placeholder="O czym jest ta notatka?">
      <label>Treść</label>
      <textarea id="nTresc" class="pole" rows="10" placeholder="Pisz…"></textarea>
      <p id="nBlad" class="blad" hidden></p>
      <button class="akcja" type="submit" id="nZapisz">Zapisz notatkę</button>
    </form>`;
  $('nFolder').onchange = () => { $('nNowyFolder').hidden = $('nFolder').value !== '__nowy'; if (!$('nNowyFolder').hidden) $('nNowyFolder').focus(); };
  $('formNowa').onsubmit = async ev => {
    ev.preventDefault();
    const folder = ($('nFolder').value === '__nowy' ? $('nNowyFolder').value : $('nFolder').value).trim().toLowerCase();
    const tytul = $('nTytul').value.trim(), tresc = $('nTresc').value.trim();
    const blad = m => { $('nBlad').textContent = m; $('nBlad').hidden = false; };
    if (!folder) return blad('Podaj nazwę folderu.');
    if (!tresc && !tytul) return blad('Notatka jest pusta.');
    $('nZapisz').disabled = true; $('nZapisz').textContent = 'Zapisywanie…'; $('nBlad').hidden = true;
    try {
      await dodajNotatke(folder, tytul || tresc.split('\n')[0].slice(0, 60), tresc || tytul);
      wpisy = await pobierzWpisy();
      history.back(); // wróć do listy, z której przyszedłeś
    } catch (e) {
      blad('Nie udało się zapisać: ' + e.message + ' Sprawdź internet i spróbuj jeszcze raz.');
      $('nZapisz').disabled = false; $('nZapisz').textContent = 'Zapisz notatkę';
    }
  };
}

$('szukaj').onclick = () => idzDo({ ekran: 'szukaj', folder: stan.folder, q: '' });
$('dodaj').onclick = () => idzDo({ ekran: 'nowa', folder: stan.folder });
$('menu').onclick = otworzMenu;
$('zaslona').onclick = zamknijMenu;
$('wstecz').onclick = () => history.back();
$('odswiez').onclick = () => wczytaj();
// Po powrocie do aplikacji (np. odblokowanie telefonu) – po cichu pobierz nowe notatki.
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && stan.ekran === 'lista') wczytaj(true); });
// Systemowy przycisk/gest "wstecz" zamyka menu albo wraca do listy.
window.addEventListener('popstate', e => {
  const s = e.state || { ekran: 'lista', folder: null };
  stan = { ekran: s.ekran, folder: s.folder ?? null, id: s.id, q: s.q };
  rysuj();
  if (!s.menu) window.scrollTo(0, s.scroll || 0);
});

history.replaceState(stan, '');
wczytaj();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
