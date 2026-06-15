---
description: Weryfikacja założeń taska i biznesowe podsumowanie ostatniego commita
alwaysApply: false
---

# working-tree-summit

Podsumowanie **ostatniego commita** z perspektywy biznesowej — co użytkownik/system zyskuje, nie jak to zrobiono w kodzie.

## Zanim zaczniesz

1. Odtwórz z wątku **założenia taska**: ID (np. `E2`), cel, DoD, AC z `prepare-task` / akceptacji `implement-taks`, to co było out of scope.
2. Jeśli w wątku brak jawnych założeń — wnioskuj z `git log -1`, treści commita i diffu; zaznacz to explicite.

## Kroki (wykonaj sekwencyjnie, nie tylko opisuj)

1. **`git log -1 --format=fuller`** + **`git show --stat HEAD`** — ustal co zawiera ostatni commit.
2. **`git show HEAD`** (lub `git diff HEAD~1..HEAD`) — zrozum zakres funkcjonalny; **ignoruj** nazwy plików, biblioteki i strukturę folderów w outputcie dla użytkownika.
3. **Weryfikacja założeń** — porównaj commit z AC/DoD z wątku:
   - każde założenie: spełnione / częściowe / brak (krótko dlaczego),
   - out of scope — nie traktuj jako brak, chyba że commit to obiecuje.
4. Jeśli są **lokalne zmiany** po commicie (`git status`, diff unstaged) — nie wliczaj ich do podsumowania commita; wspomnij jednym zdaniem tylko gdy istotne.

## OUTPUT (po polsku, zwięźle)

**Wyłącznie** poniższy układ — bez list plików, bez stacku, bez pochwał implementacji.

```markdown
## Status założeń

**Wobec założeń taska:** spełnione / częściowo / niespełnione

<Opcjonalnie, tylko gdy nie w 100%: 1–3 bullet'y — co brakuje lub jest częściowe, językiem domeny>

## Podsumowanie commita `<skrócony hash>` — `<tytuł commita>`

<3–6 bulletów: co **nowego potrafi** aplikacja / użytkownik / system po tym commicie>

<1 zdanie domknięcia: dla kogo / w jakim scenariuszu to ma wartość>
```

### Zasady outputu

- **Język domeny**, nie developera (np. „użytkownik wybiera mikrofon i uruchamia nagrywanie”, nie „`CaptureService` + sounddevice”).
- **Funkcje i efekty**, nie architektura ani refaktory (chyba że refaktor był jedynym celem taska).
- **Krótko** — całość mieści się w ~15–25 linii; bez sekcji „co dalej”, bez code review.
- Commit bez sensownej wiadomości — opisz diff, ale nadal biznesowo.

## Zasady pracy

- Uruchamiaj `git` sam (Shell).
- **Nie** commituj, **nie** pushuj, **nie** naprawiaj kodu.
- **Nie** duplikuj pełnego `verify-task-completion` — tu chodzi o **podsumowanie biznesowe ostatniego commita**, z uprzednią oceną założeń.

## OUT OF SCOPE

- Code review (`review-code`, `review-code-quality`).
- Testy (`review-tests`).
- Instrukcje merge/push (`push-task`, `prepare-to-push`).
