Review wdrożenia testów dla zmian w obecnym working tree.

ZAKRES: tylko testy — zgodność z .cursor/rules/testing.mdc i konwencjami repo.

KROKI:

1. git status, git diff, git diff --cached — filtruj _.test.ts, _.spec.ts, **tests**/, e2e/
2. przeczytaj testing.mdc, porównaj z dodanymi/zmienionymi testami
3. sprawdź: właściwa warstwa (unit vs integration) i lokalizacja; unit bez DB/IO; integration tam gdzie unit nie wystarcza; nazewnictwo (\*.unit.test.ts); sensowne przypadki (nie pass-through); braki testów dla nowej logiki z diffa (tylko gdzie strategia repo je przewiduje)

WYNIK: krytyczne / ważne / pozostałe. Każdy punkt: co nie tak + gdzie (plik). Zwięźle, po polsku.

OUT OF SCOPE: globalna strategia testów w repo (osobny task); jakość kodu produkcyjnego; poprawność funkcjonalna bez testów (review-code).
