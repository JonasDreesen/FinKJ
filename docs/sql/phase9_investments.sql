-- Extra: beleggingsportefeuille (volledig privé per gebruiker).
-- Voer dit uit in Supabase: Project -> SQL Editor -> New query -> plak -> Run.

create table if not exists investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  symbol text not null,
  name text,
  quantity numeric(14, 4) not null check (quantity > 0),
  purchase_price numeric(12, 4) not null check (purchase_price >= 0),
  purchase_date date not null default current_date,
  current_price numeric(12, 4),
  current_price_updated_at timestamptz,
  created_at timestamptz not null default now()
);

alter table investments enable row level security;

-- Volledig privé: enkel de eigenaar kan zijn/haar eigen posities zien of wijzigen.
create policy "investments_select_own" on investments
  for select using (user_id = auth.uid());

create policy "investments_insert_own" on investments
  for insert with check (user_id = auth.uid());

create policy "investments_update_own" on investments
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "investments_delete_own" on investments
  for delete using (user_id = auth.uid());
