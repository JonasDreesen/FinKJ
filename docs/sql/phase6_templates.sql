-- Fase 6: sjablonen voor terugkerende kosten/inkomens (bv. loon, huur, abonnementen).
-- Voer dit uit in Supabase: Project -> SQL Editor -> New query -> plak -> Run.

create table if not exists transaction_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(12, 2) not null check (amount > 0),
  category_id uuid references categories(id) on delete set null,
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table transaction_templates enable row level security;

-- Zichtbaar voor beide gebruikers (net als categorieën/tags), enkel de maker mag wijzigen/verwijderen.
create policy "transaction_templates_select_all" on transaction_templates
  for select using (true);

create policy "transaction_templates_insert_own" on transaction_templates
  for insert with check (user_id = auth.uid());

create policy "transaction_templates_update_own" on transaction_templates
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "transaction_templates_delete_own" on transaction_templates
  for delete using (user_id = auth.uid());
