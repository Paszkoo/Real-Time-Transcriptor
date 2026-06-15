Zaimplementuj zadanie przedstawione na końcu. Kod czytelny i ustrukturyzowany. Jeśli wymagania są niepoprawne lub niezgodne z codebase — dostosuj do projektu i powiedz co zmieniłeś w założeniach przed wdrożeniem.

REGUŁY REPO — przeczytaj i stosuj odpowiednie pliki z .cursor/rules/ (nie zgaduj):

- zawsze TS/TSX w src/: clean-code.mdc
- backend, moduły, oRPC: backend-architecture.mdc
- błędy, Sentry, oRPC: error-handling.mdc
- UI, strony, komponenty: frontend.mdc
- schema, migracje, SQL: database.mdc
- Stripe: stripe-payments.mdc

CHECKLIST przed uznaniem za gotowe:

- logika biznesowa tylko w modules/ — nie w app/, nie w orpc/ poza transportem
- oRPC: walidacja inputu + use-case; błędy przez rethrowAsOrpc / ORPCError
- nowe błędy domenowe: klasa + code + mapa w rethrowAsOrpc (przed generic branch)
- frontend: Server Components domyślnie; mutacje z onError; match błędów po data.code / instanceof
- nowe widoki: design w design/ jeśli task dotyczy UI — ścieżki 1:1 z src/app/
- nazewnictwo i kolejność w pliku: export główny na górze, helpery niżej (clean-code)
- minimalny diff — bez niepowiązanych refaktorów

Jeśli task dotyka obszaru a reguła nie została zastosowana — popraw zanim uznasz implementację za gotową.

FLOW:

1. Pytania jeśli masz wątpliwości — czekaj na odpowiedź.
2. Krótka propozycja: co, gdzie, jak, dlaczego — skondensowana.
3. Iteracja aż do akceptacji.
4. Wdrożenie po zgodzie.

OUT OF SCOPE: code review (review-code, review-tests, review-code-quality); pisanie testów (implement-tests).

ZADANIE:
