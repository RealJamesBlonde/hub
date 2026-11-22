// ===== ŹRÓDŁO DANYCH HUBA =====
// Na razie wpisy są zapisywane w pamięci telefonu (localStorage) i są tu przykładowe treści.
// W następnym kroku podmienimy tylko ten plik, żeby wpisy przychodziły od automatów z internetu.
// Reszta aplikacji (app.js) nie będzie musiała się zmieniać.

const KLUCZ_PAMIECI = 'hub-wpisy-v2';

// Przykładowe wpisy z różnych miesięcy i lat – żeby było widać grupowanie.
const PRZYKLADY = [
  { folder: 'notatki', data: 'teraz', tytul: 'Witaj w swoim hubie 👋',
    tresc: 'Menu ☰ w lewym górnym rogu pokazuje foldery.\n\nW każdym folderze wpisy są same układane w lata i miesiące. Stuknij nagłówek, żeby go rozwinąć albo zwinąć.' },
  { folder: 'angielski', data: '2026-11-22T07:00', tytul: '5 zwrotów na dziś',
    tresc: '1. to be on the same page – mieć to samo zdanie\n2. to cut corners – iść na skróty\n3. a blessing in disguise – szczęście w nieszczęściu\n4. to get the hang of it – załapać, o co chodzi\n5. to call it a day – skończyć na dziś' },
  { folder: 'angielski', data: '2026-11-20T07:00', tytul: 'Czas Present Perfect', przeczytane: true,
    tresc: 'Przykładowa lekcja z listopada.' },
  { folder: 'angielski', data: '2026-11-18T07:00', tytul: 'Phrasal verbs z „get”', przeczytane: true,
    tresc: 'Przykładowa lekcja z listopada.' },
  { folder: 'angielski', data: '2026-10-15T07:00', tytul: 'Idiomy o pogodzie',
    tresc: 'Przykładowa lekcja z października.' },
  { folder: 'angielski', data: '2026-10-03T07:00', tytul: 'Słówka: podróże', przeczytane: true,
    tresc: 'Przykładowa lekcja z października.' },
  { folder: 'angielski', data: '2025-12-10T07:00', tytul: 'Świąteczne słownictwo', przeczytane: true,
    tresc: 'Przykładowa lekcja z grudnia 2025.' },
  { folder: 'chemia', data: '2026-11-22T07:00', tytul: 'Wiązania kowalencyjne – 10 minut',
    tresc: 'Tutaj automat od chemii będzie codziennie wrzucał tekst do przeczytania w około 10 minut.\n\nPytania:\n1. Czym różni się wiązanie kowalencyjne spolaryzowane od niespolaryzowanego?\n2. Podaj przykład cząsteczki z wiązaniem potrójnym.' },
  { folder: 'chemia', data: '2026-10-28T07:00', tytul: 'Układ okresowy – grupy i okresy', przeczytane: true,
    tresc: 'Przykładowa lekcja z października.' }
];

function zapisz_(wpisy) {
  localStorage.setItem(KLUCZ_PAMIECI, JSON.stringify(wpisy));
}

export async function pobierzWpisy() {
  let wpisy = JSON.parse(localStorage.getItem(KLUCZ_PAMIECI) || 'null');
  if (!wpisy) {
    wpisy = PRZYKLADY.map((p, i) => ({
      ...p,
      id: 'przyklad-' + i,
      data: (p.data === 'teraz' ? new Date() : new Date(p.data)).toISOString(),
      przeczytane: !!p.przeczytane
    }));
    zapisz_(wpisy);
  }
  return wpisy.sort((a, b) => b.data.localeCompare(a.data));
}

export async function oznaczPrzeczytane(id, wartosc) {
  const wpisy = await pobierzWpisy();
  const w = wpisy.find(x => x.id === id);
  if (w) { w.przeczytane = wartosc; zapisz_(wpisy); }
}
