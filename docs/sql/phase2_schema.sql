-- Fase 2: categorieën, tags en transacties (persoonlijk vs. gedeeld, terugkerend)
-- Voer dit uit in Supabase: Project -> SQL Editor -> New query -> plak -> Run.

create extension if not exists "pgcrypto";

-- Categorieën: zichtbaar voor beide gebruikers, maar enkel de maker mag wijzigen/verwijderen.
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table categories enable row level security;

create policy "categories_select_all" on categories
  for select using (true);

create policy "categories_insert_own" on categories
  for insert with check (user_id = auth.uid());

create policy "categories_update_own" on categories
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "categories_delete_own" on categories
  for delete using (user_id = auth.uid());

-- Tags: zelfde principe als categorieën.
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table tags enable row level security;

create policy "tags_select_all" on tags
  for select using (true);

create policy "tags_insert_own" on tags
  for insert with check (user_id = auth.uid());

create policy "tags_update_own" on tags
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "tags_delete_own" on tags
  for delete using (user_id = auth.uid());

-- Transacties: persoonlijke transacties enkel zichtbaar/bewerkbaar voor de eigenaar.
-- Gedeelde transacties (is_shared = true) zijn zichtbaar en bewerkbaar voor beide gebruikers.
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  is_shared boolean not null default false,
  type text not null check (type in ('income', 'expense')),
  amount numeric(12, 2) not null check (amount > 0),
  description text,
  category_id uuid references categories(id) on delete set null,
  occurred_on date not null default current_date,
  -- Terugkerende transacties: een rij met is_recurring = true is de "sjabloon"-regel zelf,
  -- geen echte boeking. De app genereert losse boekingen (is_recurring = false) op basis
  -- van next_due_date, met parent_transaction_id die terugwijst naar het sjabloon.
  is_recurring boolean not null default false,
  recurrence_interval text check (recurrence_interval in ('weekly', 'monthly', 'yearly')),
  recurrence_end_date date,
  next_due_date date,
  parent_transaction_id uuid references transactions(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table transactions enable row level security;

create policy "transactions_select" on transactions
  for select using (user_id = auth.uid() or is_shared = true);

create policy "transactions_insert" on transactions
  for insert with check (user_id = auth.uid());

create policy "transactions_update" on transactions
  for update using (user_id = auth.uid() or is_shared = true)
  with check (user_id = auth.uid() or is_shared = true);

create policy "transactions_delete" on transactions
  for delete using (user_id = auth.uid() or is_shared = true);

-- Koppeltabel transacties <-> tags
create table if not exists transaction_tags (
  transaction_id uuid not null references transactions(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (transaction_id, tag_id)
);

alter table transaction_tags enable row level security;

create policy "transaction_tags_select" on transaction_tags
  for select using (
    exists (
      select 1 from transactions t
      where t.id = transaction_tags.transaction_id
        and (t.user_id = auth.uid() or t.is_shared = true)
    )
  );

create policy "transaction_tags_insert" on transaction_tags
  for insert with check (
    exists (
      select 1 from transactions t
      where t.id = transaction_tags.transaction_id
        and (t.user_id = auth.uid() or t.is_shared = true)
    )
  );

create policy "transaction_tags_delete" on transaction_tags
  for delete using (
    exists (
      select 1 from transactions t
      where t.id = transaction_tags.transaction_id
        and (t.user_id = auth.uid() or t.is_shared = true)
    )
  );

create index if not exists transactions_user_id_idx on transactions(user_id);
create index if not exists transactions_occurred_on_idx on transactions(occurred_on);
create index if not exists transactions_next_due_date_idx on transactions(next_due_date) where is_recurring = true;
