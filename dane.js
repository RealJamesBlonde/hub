// ===== ŹRÓDŁO DANYCH HUBA =====
// Na razie wpisy są zapisywane w pamięci telefonu (localStorage) i są tu przykładowe treści.
// W następnym kroku podmienimy tylko ten plik, żeby wpisy przychodziły od automatów z internetu.
// Reszta aplikacji (app.js) nie będzie musiała się zmieniać.

const KLUCZ_PAMIECI = 'hub-wpisy';

const PRZYKLADY = [
  {
    folder: 'chemia',
    tytul: 'Wiązania kowalencyjne – 10 minut',
    tresc: 'To jest przykładowy wpis. Tutaj automat od chemii będzie codziennie wrzucał tekst do przeczytania w około 10 minut.\n\nNa końcu mogą być pytania sprawdzające:\n1. Czym różni się wiązanie kowalencyjne spolaryzowane od niespolaryzowanego?\n2. Podaj przykład cząsteczki z wiązaniem potrójnym.'
  },
  {
    folder: 'angielski',
    tytul: '5 zwrotów na dziś',
    tresc: 'Przykładowy wpis z innego automatu.\n\n1. to be on the same page – mieć to samo zdanie\n2. to cut corners – iść na skróty\n3. a blessing in disguise – szczęście w nieszczęściu\n4. to get the hang of it – załapać, o co chodzi\n5. to call it a day – skończyć na dziś'
  },
  {
    folder: 'notatki',
    tytul: 'Witaj w swoim hubie 👋',
    tresc: 'Każdy folder pojawia się sam, gdy przyjdzie do niego pierwszy wpis.\n\nKliknij „Przeczytane”, żeby zniknęła niebieska kropka.'
  }
];

function zapisz_(wpisy) {
  localStorage.setItem(KLUCZ_PAMIECI, JSON.stringify(wpisy));
}

export async function pobierzWpisy() {
  let wpisy = JSON.parse(localStorage.getItem(KLUCZ_PAMIECI) || 'null');
  if (!wpisy) {
    const teraz = Date.now();
    wpisy = PRZYKLADY.map((p, i) => ({
      id: 'przyklad-' + i,
      data: new Date(teraz - i * 3600e3).toISOString(),
      przeczytane: false,
      ...p
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
