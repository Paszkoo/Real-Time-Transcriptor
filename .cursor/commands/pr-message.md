Przygotuj **wyłącznie** opis PR w markdown — tekst dla człowieka, który **nie musi** otwierać zmienionych plików, żeby zrozumieć o co chodzi.

## Obowiązkowe kroki

1. `git status`, `git diff`, `git diff --cached` (oraz `git log` jeśli kilka commitów) — zrozum **efekt** zmian, nie tylko listę plików.
2. Oceń **czy ten PR wymaga uważnego czytania**:
   - **Niski priorytet review** — powtarzalny wzorzec, kosmetyka, oczywisty boilerplate, zmiana copy; agent/linia produkcyjna i tak wymusza poprawność.
   - **Wysoki priorytet review** — nowa logika biznesowa, auth/płatności, migracje, kontrakty API, nietrywialne edge case'y.
3. Napisz opis tak, jak tłumaczysz koledze z produktu: **co się zmienia dla użytkownika/systemu i dlaczego**, w języku naturalnym po polsku.

## Format odpowiedzi

Zwróć **tylko** jeden blok markdown (do skopiowania), bez komentarza meta poza nim:

```markdown
## Czy warto czytać ten PR?

<niski / średni / wysoki priorytet> — <1–2 zdania uzasadnienia>

## Co się zmienia

<akapit lub krótkie akapity: efekt biznesowy, kontekst „dlaczego teraz”>

## Na co zwrócić uwagę przy review

<tylko jeśli priorytet średni/wysoki; inaczej pomiń sekcję lub jedna linia „przejściówka — wzorzec znany”>
```

## Zasady pisania

- **Nie** wypisuj plików ani diffów — opisuj **zachowanie i skutek**.
- **Nie** używaj żargonu implementacyjnego tam, gdzie wystarczy język domeny (np. „użytkownik może anulować rezerwację do X” zamiast „dodano handler w module Y”).
- Dla PR o niskim priorytecie — **krótko** (kilka zdań); nie sztucznie rozbudowuj.
- Szczegóły techniczne tylko gdy decyzja architektoniczna wpływa na przyszłe zmiany — wtedy wyjaśnij **po co**, nie **jak w kodzie**.

**Out of scope:** test plan, checklista commitów, lista ścieżek plików.
