// ===== ŹRÓDŁO DANYCH HUBA: prywatna skrzynka w Arkuszu Google =====
// Adres skrzynki jest tu jawny, ale bez tajnego klucza nic z niej nie odczytasz.
// Klucz NIE jest w kodzie – hub pyta o niego raz i zapamiętuje go na danym urządzeniu.

const ADRES = 'https://script.google.com/macros/s/AKfycbw0flZzbPKhArNT3YRoXY3QBtalC2kI4CqUSkz6TYiM7DVyFsInHmlcscWul6hfeYy2VA/exec';
const KLUCZ_KLUCZA = 'hub-klucz';
const KOPIA = 'hub-kopia-wpisow'; // ostatnio pobrane notatki – żeby hub działał też bez internetu

export function maKlucz() { return !!localStorage.getItem(KLUCZ_KLUCZA); }
export function ustawKlucz(k) { localStorage.setItem(KLUCZ_KLUCZA, k.trim()); }
export function usunKlucz() { localStorage.removeItem(KLUCZ_KLUCZA); localStorage.removeItem(KOPIA); }

export async function pobierzWpisy() {
  const k = localStorage.getItem(KLUCZ_KLUCZA);
  if (!k) throw new Error('BRAK_KLUCZA');
  try {
    const r = await fetch(`${ADRES}?k=${encodeURIComponent(k)}&t=${Date.now()}`);
    const d = await r.json();
    if (!d.ok) {
      if (d.blad === 'zly klucz') { usunKlucz(); throw new Error('ZLY_KLUCZ'); }
      throw new Error(d.blad || 'Błąd skrzynki');
    }
    const wpisy = d.wpisy.sort((a, b) => b.data.localeCompare(a.data));
    localStorage.setItem(KOPIA, JSON.stringify(wpisy));
    return wpisy;
  } catch (e) {
    if (e.message === 'ZLY_KLUCZ') throw e;
    const kopia = JSON.parse(localStorage.getItem(KOPIA) || 'null');
    if (kopia) return kopia; // brak internetu – pokaż ostatnio pobrane
    throw new Error('Brak połączenia ze skrzynką.');
  }
}

export async function oznaczPrzeczytane(id, wartosc) {
  // aktualizujemy też lokalną kopię, żeby zmiana była widoczna od razu
  const kopia = JSON.parse(localStorage.getItem(KOPIA) || '[]');
  const w = kopia.find(x => x.id === id);
  if (w) { w.przeczytane = wartosc; localStorage.setItem(KOPIA, JSON.stringify(kopia)); }
  // text/plain – żeby przeglądarka wysłała to bez dodatkowych pytań (CORS)
  await fetch(ADRES, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ k: localStorage.getItem(KLUCZ_KLUCZA), akcja: 'oznacz', id, przeczytane: wartosc })
  }).catch(() => {});
}
