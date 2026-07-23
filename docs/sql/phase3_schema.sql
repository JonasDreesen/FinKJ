-- Fase 3: maandbudgetten (met rollover) en spaardoelen.
-- Voer dit uit in Supabase: Project -> SQL Editor -> New query -> plak -> Run.
-- (Vereist dat phase2_schema.sql al is uitgevoerd, voor de categories-tabel.)

-- Budgetten: één regel per categorie, per maand, per scope (persoonlijk of gedeeld).
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  is_shared boolean not null default false,
  month date not null, -- altijd de eerste dag van de maand, bv. 2026-07-01
  amount numeric(12, 2) not null check (amount >= 0),
  rollover boolean not null default false,
  created_at timestamptz not null default now()
);

alter table budgets enable row level security;

create policy "budgets_select" on budgets
  for select using (user_id = auth.uid() or is_shared = true);

create policy "budgets_insert" on budgets
  for insert with check (user_id = auth.uid());

create policy "budgets_update" on budgets
  for update using (user_id = auth.uid() or is_shared = true)
  with check (user_id = auth.uid() or is_shared = true);

create policy "budgets_delete" on budgets
  for delete using (user_id = auth.uid() or is_shared = true);

-- Eén gedeeld budget per categorie per maand (ongeacht wie het aanmaakte).
create unique index if not exists budgets_shared_unique
  on budgets (category_id, month)
  where is_shared = true;

-- Eén persoonlijk budget per gebruiker per categorie per maand.
create unique index if not exists budgets_personal_unique
  on budgets (user_id, category_id, month)
  where is_shared = false;

-- Spaardoelen: persoonlijk of gedeeld, met een handmatig bijgewerkt gespaard bedrag.
create table if not exists savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  is_shared boolean not null default false,
  name text not null,
  target_amount numeric(12, 2) not null check (target_amount > 0),
  current_amount numeric(12, 2) not null default 0 check (current_amount >= 0),
  target_date date,
  created_at timestamptz not null default now()
);

alter table savings_goals enable row level security;

create policy "savings_goals_select" on savings_goals
  for select using (user_id = auth.uid() or is_shared = true);

create policy "savings_goals_insert" on savings_goals
  for insert with check (user_id = auth.uid());

create policy "savings_goals_update" on savings_goals
  for update using (user_id = auth.uid() or is_shared = true)
  with check (user_id = auth.uid() or is_shared = true);

create policy "savings_goals_delete" on savings_goals
  for delete using (user_id = auth.uid() or is_shared = true);

create index if not exists budgets_month_idx on budgets(month);
