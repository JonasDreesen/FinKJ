# FinKJ — installatie en beveiliging

Stappen die jij zelf moet doen. Alles wat hier niet staat, zit in de code.

## 0. Project gepauzeerd? Gratis herstellen

Een gratis Supabase-project pauzeert automatisch na 7 dagen zonder activiteit. Je hebt **geen Pro-abonnement** nodig:

1. Ga naar [supabase.com/dashboard](https://supabase.com/dashboard) en open het project.
2. Klik **Restore project** (gratis). Na enkele minuten is alles terug, met al jullie gegevens.
3. Voer stap 1 hieronder uit (die voegt ook de keep-alive-functie toe).
4. GitHub → **Actions → Supabase keep-alive → Run workflow**. Wordt die groen, dan werkt het.

Vanaf dan spreekt die workflow de database om de 3 dagen aan, zodat ze niet meer pauzeert. Ze leest geen gegevens: ze roept enkel een functie aan die `true` teruggeeft.

> Staat er geen "Restore"-knop meer? Na 90 dagen gepauzeerd kan je het project niet meer herstellen, maar wel nog een back-up downloaden (Project → Database → Backups). Laat het me weten, dan zetten we die over naar een nieuw gratis project.
>
> GitHub zet geplande workflows stil in een publieke repo die 60 dagen geen nieuwe commits krijgt. Je krijgt dan een e-mail; één klik op **Enable workflow** volstaat.

## 1. Database bijwerken (verplicht na deze update)

1. Supabase → **SQL Editor** → **New query**.
2. Plak de volledige inhoud van [`docs/sql/schema.sql`](sql/schema.sql) en klik **Run**.
3. Controle: `select * from public.app_members;` moet jullie twee accounts tonen.

Dit ene script vervangt alle oude `phaseX`-scripts. Het is veilig om opnieuw uit te voeren en behoudt alle bestaande gegevens.

> **Waarom dit dringend is:** met het oude schema kon *iedereen* die de publieke sleutel uit de website haalde (en die staat er altijd in) jullie gedeelde transacties en sjablonen lezen, én gedeelde transacties wijzigen of verwijderen — zonder in te loggen. Het nieuwe schema sluit dat volledig af.

## 2. Supabase-instellingen (eenmalig, ±5 minuten)

In het Supabase-dashboard:

| Waar | Instelling | Waarom |
|---|---|---|
| Authentication → Sign In / Providers → Email | **Allow new users to sign up: UIT** | Niemand kan zelf een account maken |
| Authentication → Sign In / Providers | **Anonymous sign-ins: UIT** | Geen anonieme sessies |
| Authentication → Sign In / Providers → Email | **Secure password change: AAN** | Wachtwoord wijzigen vraagt recente login |
| Authentication → Sign In / Providers → Email | **Minimum password length: 12** | Sterkere wachtwoorden |
| Authentication → Multi-Factor | **TOTP: aan** (standaard aan) | Tweestapsverificatie in de app |
| Authentication → URL Configuration | **Site URL** = `https://<jouw-gebruikersnaam>.github.io/FinKJ/` | Juiste links in e-mails |
| Advisors → Security Advisor | Moet **geen fouten** meer tonen | Controle achteraf |

Gebruik **nooit** de `service_role`-sleutel in de app of in GitHub.

## 3. Tweestapsverificatie aanzetten (sterk aangeraden)

In de app: **Instellingen → Beveiliging → Tweestapsverificatie → Instellen**. Scan de QR-code met een authenticator-app (Google Authenticator, Microsoft Authenticator, 1Password…). Zodra dat aanstaat, weigert de database élke toegang tot jouw gegevens zonder de code — ook als iemand je wachtwoord kent.

## 4. App op je gsm zetten

- **iPhone:** open de site in **Safari** → deel-knop → **Zet op beginscherm**.
- **Android:** open de site in **Chrome** → menu (⋮) → **App installeren**.

De app opent dan zonder adresbalk, start sneller en toont offline je laatst bekende gegevens. Nieuwe versies melden zich vanzelf ("Nieuwe versie beschikbaar → Vernieuwen").

## 5. GitHub (enkel bij een nieuwe installatie)

1. **Settings → Secrets and variables → Actions**: secrets `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY`.
2. **Settings → Pages → Source: GitHub Actions**.
3. Elke push naar `main` controleert de afhankelijkheden op lekken (`npm audit`), lint de code, bouwt en publiceert.
4. Dependabot opent automatisch pull requests voor beveiligingsupdates; voeg die gerust samen als de controles groen zijn.

## 6. Een lid toevoegen of wijzigen

Maak de gebruiker aan in **Authentication → Users** en voer daarna uit:

```sql
insert into public.app_members (user_id, display_name)
values ('<uuid uit Authentication → Users>', 'Naam');
```

Iemand verwijderen: `delete from public.app_members where user_id = '<uuid>';` (de persoon verliest meteen alle toegang).

## 7. Lokaal ontwikkelen

```bash
cp .env.example .env    # vul je Supabase-URL en anon key in
npm install
npm run dev
```

## Probleem oplossen

| Melding in de app | Oplossing |
|---|---|
| "Database nog niet ingericht" | Stap 1 uitvoeren |
| "Geen toegang" | Je account staat niet in `app_members` → stap 6 |
| Tweestapsverificatie kwijt (gsm verloren) | Supabase → Authentication → Users → gebruiker → MFA-factor verwijderen |
| "Dubbele terugkerende boekingen gevonden" bij het script | Verwijder de dubbele boekingen en voer het script opnieuw uit |
