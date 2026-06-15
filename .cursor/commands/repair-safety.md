Napraw wyłącznie problemy z review: bezpieczeństwo, obsługa błędów, granice (auth, walidacja, uprawnienia, wycieki, Sentry/oRPC).

ZASADY:

- scope: obszary z review + .cursor/rules/error-handling.mdc; przy auth/DB także backend-architecture, database
- błędy domenowe: typed errors z code, mapowanie przez rethrowAsOrpc — bez wzorców ad hoc
- frontend: onError na mutacjach; match po code/instanceof, nie message
- nie zmieniaj logiki biznesowej poza tym co wynika z naprawy
- po naprawie: zwięzłe podsumowanie

PROBLEMY DO NAPRAWY:

(user wkleja punkty)
