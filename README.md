# FinKJ

Privé budget-app voor Jonas & Kim: uitgaven, budgetten, spaardoelen, gedeelde kosten en beleggingen. Installeerbaar als app op je gsm.

**Installatie en beveiliging:** zie [`docs/SETUP.md`](docs/SETUP.md).

## Functies

- **Overzicht** — saldo per maand, budgetten, gedeelde balans, uitgaven per categorie, trend en vaste lasten die eraan komen
- **Transacties** — snel toevoegen via de +-knop, sjablonen, categorievoorstel, tags, zoeken over alle maanden (ook in bonnetjes)
- **Bonnetjes scannen** — tekstherkenning in de browser vult bedrag, winkel en datum in; de foto blijft privé
- **Vaste lasten** — huur, loon, abonnementen worden automatisch ingeboekt en eerst ter bevestiging getoond
- **Budgetten** — per categorie, persoonlijk of gedeeld, met overdracht naar volgende maand, handmatige correctie en "overnemen van vorige maand"
- **Spaardoelen** — storten/opnemen, met "nog X per maand nodig"
- **Samen** — wie betaalde wat, wie wie hoeveel verschuldigd is, afrekeningen registreren
- **Beleggingen** — volledig privé, totalen per munt, koersen via Twelve Data
- **Gegevens** — CSV-export/-import (Excel-formaat), fiscaal jaaroverzicht, volledige back-up
- **Privacymodus**, donker thema, offline lezen

## Beveiliging

- Row Level Security op elke tabel: enkel aangemelde **leden** van het huishouden, nooit de publieke sleutel alleen
- Tweestapsverificatie (TOTP), afgedwongen in de database zelf zodra ingesteld
- Eigenaar van een rij kan niet gewijzigd worden; persoonlijke data van je partner is onzichtbaar
- Bonnetjes in een privé-opslag, per gebruiker afgeschermd; foto-metadata (GPS) wordt verwijderd vóór upload
- Content Security Policy, geen scripts of lettertypes van derden, bescherming tegen iframes en CSV-injectie
- Lokale cache per gebruiker, gewist bij uitloggen
- `npm audit` en lint als poort in de deploy, Dependabot voor updates

## Techniek

React 18 · Vite 6 · Tailwind 3 · Supabase (Postgres, Auth, Storage) · GitHub Pages · vite-plugin-pwa · Recharts · Tesseract.js (zelf gehost)

```bash
npm install
npm run dev     # lokaal
npm run lint
npm run build
```
