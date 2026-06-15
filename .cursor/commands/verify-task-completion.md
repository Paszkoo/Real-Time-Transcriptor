Zweryfikuj czy wszystkie AC zaakceptowane w implement-taks są spełnione w staged changes (git diff --cached). Działasz po: prepare-task → implement-taks → implement-tests → review-_ → repair-_ → review-task-completion.

CEL: twarda checklista AC vs wystage'owane. Nie oceniaj czy task był dobrym pomysłem — to review-task-completion.

KROKI (wykonaj, nie opisuj narzędzi użytkownikowi):

1. odtwórz AC z wątku (funkcje, UI, API, uprawnienia, docs/design jeśli w scope). Brak AC → "brak jawnych AC w wątku" + wnioski ze staged diff
2. git status, git diff --cached — porównaj wyłącznie staged z AC. Unstaged/untracked = brak w stagingu, nie "jest w repo"
3. mapowanie AC → dowód: spełnione / brak / częściowe (dlaczego, plik)

WYNIK:

- jedno zdanie: "Wobec AC z implement-taks (staged): kompletne / niekompletne"
- Braki / ryzyka: tylko luki względem AC
- jeśli brakujące elementy są tylko unstaged — wskaż explicite

NIE: pochwały; pełny review; nowe AC; ocena sensu biznesowego.

OUT OF SCOPE: implementacja, naprawy (chyba że użytkownik poprosi).
