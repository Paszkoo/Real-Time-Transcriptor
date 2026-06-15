---
description: Po zakończeniu taska — stage, commit na dedykowanym branchu, push, merge do main
alwaysApply: false
---

# push-task

Działasz **po** ukończeniu implementacji (typowo po `verify-task-completion`, gdy brak braków).

**Cel:** zapisać wszystkie zmiany taska na osobnym branchu, wypchnąć go na remote, wrócić na `main` i zmergować tam ten branch.

## Zanim zaczniesz

1. Ustal z kontekstu wątku **identyfikator taska** (np. `REP-09`, `REP2-2`) — użyj go w nazwie brancha i w treści commita.
2. Jeśli w wątku nie ma jawnego ID, wygeneruj krótką nazwę kebab-case z opisu taska (np. `feat/walidacja-uploadow`).
3. Domyślny branch główny w tym repo to **`main`** (nie `master`). Jeśli lokalnie istnieje tylko `master`, użyj go zamiast `main`.
4. **Nie commituj** plików z sekretami (`.env`, klucze API itp.) — jeśli są w diffie, ostrzeż użytkownika i wyklucz je z `git add`.

## Nazewnictwo

- Branch: `<ID-taska>` lub `feat/<krótki-slug>` — zgodnie z konwencją istniejących branchy (`REP-06`, `REP2-1`…).
- Commit: 1–2 zdania po angielsku, styl repo (`feat:`, `fix:`, `chore:`…) + ID taska, np. `feat: REP-09 Dodanie walidacji uploadów`.

## Kroki (wykonaj sekwencyjnie, nie tylko opisuj)

```text
1. git status + git diff          → upewnij się, że są zmiany do zapisania
2. git add -A                     → dodaj wszystkie zmiany (z wyjątkiem sekretów)
3. Utwórz / przełącz na branch taska:
   - jeśli NIE jesteś na branchu taska: git checkout -b <branch-taska>
   - jeśli JUŻ jesteś na branchu taska: zostań na nim
4. git commit z sensowną wiadomością
5. git push -u origin <branch-taska>
6. git checkout main
7. git pull origin main           → zsynchronizuj main przed merge (jeśli pull się nie uda, zatrzymaj się i zgłoś)
8. git merge <branch-taska>       → merge lokalny; przy konfliktach zatrzymaj się, nie rozwiązuj na siłę
9. git push origin main           → wypchnij zmergowany main
```

## Zasady

- Wykonuj komendy sam (Shell), nie proś użytkownika o ręczne `git`.
- Przed commitem: `git status` + `git diff` + `git log -5 --oneline` — dopasuj styl wiadomości do ostatnich commitów.
- Po każdym kroku sprawdź exit code; przy błędzie przerwij i podaj co poszło nie tak oraz sugerowany następny krok.
- **Nie** rób `push --force` na `main`.
- **Nie** zmieniaj `git config`.
- **Nie** twórz PR — ten flow zakłada bezpośredni merge do `main` (w przeciwieństwie do `pr-message` / `gh pr create`).

## Wynik dla użytkownika

Krótkie podsumowanie po polsku:

- nazwa brancha taska i wiadomość commita,
- czy push brancha i merge do `main` się powiodły,
- hash ostatniego commita na `main` (`git log -1 --oneline`),
- ewentualne ostrzeżenia (sekrety, konflikty, pominięte pliki).
