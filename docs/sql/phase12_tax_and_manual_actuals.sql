-- Fase 12 (extra): fiscaal aftrekbare categorieën (voor het jaaroverzicht/belastingexport)
-- en handmatig ingevoerde werkelijke uitgaven per budgetregel (voor correcte boekhouding
-- ook wanneer niet elke uitgave als losse transactie wordt ingevoerd).
-- Voer dit uit in Supabase: Project -> SQL Editor -> New query -> plak -> Run.

alter table categories add column if not exists tax_deductible boolean not null default false;

alter table budgets add column if not exists actual_amount numeric(12, 2);
