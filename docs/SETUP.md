# Setup — Fase 1

Stappen die jij zelf moet doen. Alles wat hier niet staat, is al door mij geregeld in de code.

## 1. Supabase account + project

1. Ga naar https://supabase.com en maak een gratis account (bv. met je Google-account).
2. Klik op "New project".
3. Kies een naam (bv. `finkj-budget`), een sterk database-wachtwoord (bewaar dit veilig, los van je login-wachtwoord) en een regio dicht bij jullie (bv. Frankfurt/EU).
4. Wacht tot het project klaar is (duurt ~1-2 minuten).

## 2. API-sleutels ophalen

1. Ga in je Supabase project naar **Project Settings → API**.
2. Je hebt twee waarden nodig:
   - **Project URL** (bv. `https://abcdefgh.supabase.co`)
   - **anon public key** (een lange string) — dit is een publieke sleutel, veilig om in de browser te gebruiken zolang Row Level Security aanstaat (dat regel ik in de database).
   - Gebruik NIET de `service_role` key hiervoor — die geeft volledige toegang en mag nooit in de frontend of GitHub Actions komen.

## 3. Lokaal testen (optioneel, voor als je zelf iets wil proberen)

1. Kopieer `.env.example` naar `.env` in de hoofdmap van het project.
2. Vul `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` in met de waarden van stap 2.
3. `.env` staat al in `.gitignore`, dus dit bestand wordt nooit meegecommit.

## 4. Sign-up uitschakelen in Supabase

1. Ga naar **Authentication → Providers → Email**.
2. Zet **"Allow new users to sign up"** UIT. Zo kan niemand — ook niet via de publieke frontend-code — zelf een account aanmaken.

## 5. Jullie twee accounts aanmaken

1. Ga naar **Authentication → Users**.
2. Klik **"Add user"** → **"Create new user"**.
3. Vul jouw e-mail + een wachtwoord in, en herhaal dit voor je vriendin.
4. Vink **"Auto Confirm User"** aan zodat je meteen kan inloggen zonder bevestigingsmail.

## 6. GitHub Secrets instellen (zodat de sleutels niet in de repo komen)

1. Ga naar de GitHub-repo → **Settings → Secrets and variables → Actions**.
2. Klik **"New repository secret"** en maak er twee aan:
   - `VITE_SUPABASE_URL` = jouw Project URL
   - `VITE_SUPABASE_ANON_KEY` = jouw anon public key
3. Deze secrets worden alleen tijdens het bouwen van de app door GitHub Actions gebruikt — ze zijn niet zichtbaar in de repo of voor bezoekers. Let op: de anon key komt uiteindelijk wél in de gebouwde JavaScript-bestanden terecht (dat is normaal en bedoeld — die key is alleen bruikbaar in combinatie met Row Level Security die bepaalt wie welke data mag zien).

## 7. GitHub Pages inschakelen

1. Ga naar **Settings → Pages**.
2. Zet **"Source"** op **"GitHub Actions"** (niet "Deploy from a branch").
3. Na de volgende push naar `main` bouwt en publiceert de workflow (`.github/workflows/deploy.yml`) de app automatisch.

## 8. Testen na deze fase

- Lokaal: `npm install` dan `npm run dev`, open de getoonde localhost-URL. Je zou een login-scherm moeten zien.
- Log in met een van de twee aangemaakte accounts → je komt in het dashboard met navigatie (Dashboard, Transacties, Budgetten, Instellingen — nog leeg).
- Probeer een fout wachtwoord → je krijgt een foutmelding, geen toegang.
- Er is geen "registreren"-link of -knop.
