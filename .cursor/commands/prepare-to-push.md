---
alwaysApply: true
---

Przygotowanie working tree do pusha: stage wszystkich zmian, potem weryfikacja jakości i testów.

## Kroki (wykonaj sekwencyjnie, nie tylko opisuj)

1. **`git status`** — sprawdź, czy są zmiany; jeśli nie ma nic do dodania, zakończ krótkim komunikatem.
2. **Sekrety** — jeśli w diffie są `.env`, klucze API lub inne pliki z credentialami, **nie** dodawaj ich; ostrzeż użytkownika i wyklucz z stage.
3. **`git add .`** — dodaj wszystkie zmiany (z wyjątkiem sekretów z kroku 2).
4. **`pnpm check`** — Prettier, ESLint, `check-api-auth`, `next build`. Przy błędzie: napraw, ponów od kroku 3 jeśli były nowe zmiany, albo zatrzymaj się i podaj błąd.
5. **`pnpm test`** — Vitest (`vitest run`). Przy błędzie: zatrzymaj się i podaj które testy padły; nie pushuj.
6. **`git status`** — potwierdź co jest staged; krótkie podsumowanie po polsku.

## Zasady

- Uruchamiaj komendy sam (Shell); na Windows PowerShell używaj `;` zamiast `&&` między komendami w jednej linii.
- **Nie** rób `git commit`, `git push` ani merge — to tylko przygotowanie; commit/push to osobny flow (np. `push-task`).
- **Nie** zmieniaj `git config`.
- W tym repo skrypt testów to `pnpm test` (nie `tests`).

## Wynik dla użytkownika

Krótko po polsku:

- czy `git add .` się powiodło i ile plików jest staged,
- wynik `pnpm check` (OK / błąd),
- wynik `pnpm test` (OK / które testy),
- gotowość do commita/pusha albo co naprawić przed dalszym krokiem.
