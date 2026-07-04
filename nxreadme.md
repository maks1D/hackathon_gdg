# Architektura Nx i Struktura Projektu

Ten projekt to monorepo zarządzane przez **Nx**, zbudowane z wykorzystaniem nowoczesnego stacku: **Angular** na frontendzie (klient) oraz **NestJS** na backendzie (API). Nx pozwala na efektywne zarządzanie tymi projektami, współdzielenie kodu oraz inteligentne cachowanie.

## Struktura Katalogów

Główny podział projektu wygląda następująco:

```text
c:\X\hackathon_gdg\
├── apps/
│   ├── api/          # Serwer backendowy (NestJS)
│   └── client/       # Aplikacja frontendowa (Angular)
├── libs/
│   ├── shared/       # Współdzielone interfejsy i typy
│   └── http/         # Narzędzia i logika związana z zapytaniami HTTP
├── prisma/           # Schematy bazy danych i migracje (SQLite)
├── package.json      # Główne pliki konfiguracyjne Node.js
├── nx.json           # Globalna konfiguracja Nx i tasków
├── tsconfig.base.json# Główne aliasy (używane przez Nx pod maską)
└── tsconfig.json     # Główny konfigurator Solution-Style dla IDE (np. VSCode)
```

## Opis Poszczególnych Modułów i Rzeczywisty Graf Zależności

Zgodnie z aktualnym stanem statycznym grafu wygenerowanym przez Nx (`nx graph`), relacje między projektami zostały zrefaktoryzowane i zintegrowane w prawidłowy, bezpieczny łańcuch: `[apps/client] -> [libs/http] -> [libs/shared] <- [apps/api]`.

Stan grafu (Project Graph) po najnowszych usprawnieniach prezentuje się następująco:

- **`@hackathon/source`** (Korzeń / Root): Występuje w grafie jako centralny punkt spinający, połączony z resztą projektów za pomocą krawędzi typu `implicit` (skonfigurowanych w `package.json`).
- **`apps/api` (NestJS)**: 
  **Zależności:** Posiada jedną bezpośrednią krawędź skierowaną do `libs/shared` (importuje z niego typy DTO i interfejsy jako Single Source of Truth). Jest to kontrolowane przez tag `scope:api`.
- **`libs/shared`**: 
  Projekt docelowy, rdzeń typowania. Zależy od niego bezpośrednio zarówno serwer (API), jak i cały pion frontendowy (Client oraz HTTP lib). Dostarcza współdzielone DTOs, definicje LLM (OpenRouter) i modele aplikacji. Tag `scope:shared`.
- **`libs/http`**: 
  Biblioteka serwująca wyspecjalizowanych klientów API dla Angulara (np. `LlmApiService`, `TrizApiService`). 
  **Zależności:** `http` bezpośrednio importuje typy z `libs/shared`. Tag zmieniony na `scope:client`, by chronić przed przypadkowym zaimportowaniem na serwerze!
- **`apps/client` (Angular)**: 
  Aplikacja wizualna (SPA). 
  **Zależności:** Statycznie importuje serwisy sieciowe z `libs/http` oraz interfejsy domenowe bezpośrednio z `libs/shared`. Zależności ułożone w bezpieczną relację dzięki tagowi `scope:client`.

### Graf Zadań (Task Graph)
Dzięki aktualizacjom w `nx.json`, cele takie jak `serve`, `lint`, czy `test` nie stanowią już "samotnych wysp". Np. polecenie `api:serve` posiada krawędzie wymuszające wpierw zadania zależne (`build` lokalny oraz bibliotek), więc w środowisku CI/CD cały build odbędzie się synchronicznie przed odpaleniem aplikacji.

## Dlaczego Nx? Jakie daje nam korzyści?

1. **Współdzielony kod (Shared Libraries):**
   Możemy bezboleśnie importować rzeczy z `@libs/shared` prosto do `api` lub `client`. Nx dba o aliasy ścieżek (ustawiane w `tsconfig.base.json`).

2. **Jeden Package.json:**
   Wszystkie zależności (wersja Angulara, wersja NestJS, TypeScript, Zod) są zablokowane w jednym `package.json`. Nie mamy problemu, że backend używa innej wersji TS, a frontend innej. 

3. **Inteligentne Wykonywanie Zadań (Task Runner & Cache):**
   Nx analizuje kod (np. używając `nx graph`) i dokładnie wie, z czego składa się nasz projekt. Jeżeli zmienisz tylko jeden plik w `apps/client`, wywołanie `nx build api` skorzysta z Cache'a (wykona się w milisekundach), bo Nx wie, że kod API się nie zmienił.
   Dodatkowo flaga `--parallel` (której użyliśmy np. przy wywołaniu obok siebie `api:serve` i `client:serve` przez pakiet `concurrently`) idealnie współgra z Nx.

4. **Wymuszanie Granic Architektonicznych:**
   Dzięki modułom odseparowano poszczególne domeny. Konfiguracja lintera w `eslint.config.mjs` z wtyczką `@nx/enforce-module-boundaries` gwarantuje, że kod jest sterylnie oddzielony (np. `scope:api` importuje tylko z `scope:shared`, uniemożliwiając wciągnięcie kodu Angulara na serwer). Do prawidłowego działania IntelliSense we wszystkich nowoczesnych edytorach wdrożyliśmy centralny plik Solution-Style `tsconfig.json`.

## Podsumowanie Działania Środowiska (Dev)
Kiedy odpalasz `npm start`:
- `concurrently` odpala dwa procesy: `npx nx serve api` oraz `npx nx serve client`.
- Zmiany są obserwowane natywnie.
- Frontend wystawia się na `localhost:4200`, a jego `proxy.conf.json` przekierowuje wywołania REST zaczynające się od `/api` do `localhost:3000` (tam, gdzie pracuje NestJS).
- Wszystko jest spinane Prisma ORM z bazą `dev.db` (SQLite) dla bezproblemowego rozwoju na każdym systemie operacyjnym.
