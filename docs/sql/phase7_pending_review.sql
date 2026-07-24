-- Fase 7: bevestigingsstap voor automatisch gegenereerde terugkerende boekingen.
-- Voer dit uit in Supabase: Project -> SQL Editor -> New query -> plak -> Run.

alter table transactions add column if not exists pending_review boolean not null default false;
