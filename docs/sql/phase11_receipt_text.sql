-- Fase 11 (extra): automatisch herkende tekst van bonnetje-foto's (OCR), zodat je
-- er ook op kan zoeken in de transactielijst.
-- Voer dit uit in Supabase: Project -> SQL Editor -> New query -> plak -> Run.

alter table transactions add column if not exists receipt_text text;
