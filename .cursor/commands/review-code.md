Review poprawności i funkcjonalności zmian w obecnym working tree.

ZAKRES: błędy logiczne, regresje, edge case'y, zgodność z architekturą, API/UI flow, naruszenia .cursor/rules dot. architektury. Nie styl/DRY (review-code-quality). Nie testy (review-tests).

KROKI:

1. git status, git diff, git diff --cached
2. odczytaj dotknięte pliki i odpowiednie reguły (.cursor/rules): backend → backend-architecture, error-handling, database; frontend → frontend; płatności → stripe-payments
3. oceń czy rozwiązanie realizuje zamierzoną funkcję bez defektów

WYNIK: zwięzły, punktowany, po polsku. Propozycje zmiany podejścia tylko jeśli istotne (uzasadnij). Podział: krytyczne / ważne / pozostałe.

OUT OF SCOPE: chwalenie; styl/DRY; testy; kompletność AC (verify-task-completion, review-task-completion).
