Review jakości kodu zmian w obecnym working tree.

ZAKRES: prostota, DRY, czytelność, struktura pliku — clean-code.mdc i konwencje sąsiedniego kodu. Nie błędy logiczne. Nie luki w testach.

KROKI:

1. git status, git diff, git diff --cached
2. przeczytaj clean-code.mdc, oceń tylko jakość nowego/zmienionego kodu
3. sprawdź: nadmiarowa abstrakcja, zbędne helpery, duplikacja; nazwy zrozumiałe; top-down w pliku; jeden poziom abstrakcji na funkcję; minimalny diff

WYNIK: krytyczne / ważne / pozostałe. Uproszczenia tylko gdy realnie poprawiają czytelność. Zwięźle, po polsku.

OUT OF SCOPE: chwalenie; błędy funkcjonalne (review-code); bezpieczeństwo; testy (review-tests).
