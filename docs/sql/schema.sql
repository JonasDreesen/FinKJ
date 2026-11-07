-- =============================================================================
-- FinKJ — volledig databaseschema + beveiliging
-- =============================================================================
-- Voer dit uit in Supabase: SQL Editor -> New query -> plak alles -> Run.
--
-- Dit script is IDEMPOTENT: je mag het zo vaak uitvoeren als je wil. Het werkt
-- zowel op een lege database als op een database waarop de oude
-- phaseX-scripts al gedraaid hebben. Bestaande data blijft behouden.
--
-- Vereiste: maak EERST jullie twee gebruikers aan (Authentication -> Users).
-- Alle gebruikers die op dat moment bestaan, worden lid van het huishouden.
-- Enkel leden kunnen data zien of wijzigen.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Leden van het huishouden (allowlist) + hulpfuncties
-- -----------------------------------------------------------------------------
create table if not exists public.app_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

insert into public.app_members (user_id, display_name)
select u.id, left(initcap(split_part(coalesce(u.email, 'lid'), '@', 1)), 40)
from auth.users u
on conflict (user_id) do nothing;

create or replace function public.is_app_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.app_members m where m.user_id = auth.uid());
$$;

-- Wie tweestapsverificatie heeft ingesteld, moet ook met de tweede stap
-- aangemeld zijn (aal2) voordat de database iets teruggeeft.
create or replace function public.mfa_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    or not exists (
      select 1 from auth.factors f
      where f.user_id = auth.uid() and f.status = 'verified'
    );
$$;

-- -----------------------------------------------------------------------------
-- 2. Tabellen
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
alter table public.categories add column if not exists tax_deductible boolean not null default false;

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  is_shared boolean not null default false,
  type text not null check (type in ('income', 'expense')),
  amount numeric(12, 2) not null check (amount > 0),
  description text,
  category_id uuid references public.categories(id) on delete set null,
  occurred_on date not null default current_date,
  is_recurring boolean not null default false,
  recurrence_interval text check (recurrence_interval in ('weekly', 'monthly', 'yearly')),
  recurrence_end_date date,
  next_due_date date,
  parent_transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.transactions add column if not exists receipt_path text;
alter table public.transactions add column if not exists receipt_text text;
alter table public.transactions add column if not exists pending_review boolean not null default false;
alter table public.transactions add column if not exists paid_by uuid references auth.users(id) on delete set null;
alter table public.transactions alter column paid_by set default auth.uid();
update public.transactions set paid_by = user_id where paid_by is null;

create table if not exists public.transaction_tags (
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (transaction_id, tag_id)
);

create table if not exists public.transaction_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(12, 2) not null check (amount > 0),
  category_id uuid references public.categories(id) on delete set null,
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  is_shared boolean not null default false,
  month date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  rollover boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.budgets add column if not exists actual_amount numeric(12, 2);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  is_shared boolean not null default false,
  name text not null,
  target_amount numeric(12, 2) not null check (target_amount > 0),
  current_amount numeric(12, 2) not null default 0 check (current_amount >= 0),
  target_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.investments (
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
alter table public.investments add column if not exists currency text not null default 'EUR';

create table if not exists public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  twelvedata_api_key text,
  updated_at timestamptz not null default now()
);
alter table public.user_settings alter column user_id set default auth.uid();

-- Afrekeningen van de gedeelde balans: paid_by = wie het geld overmaakte,
-- user_id = wie het registreerde (dat mag dus ook de ontvanger zijn).
create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  settled_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
alter table public.settlements add column if not exists paid_by uuid references auth.users(id) on delete cascade;
update public.settlements set paid_by = user_id where paid_by is null;
alter table public.settlements alter column paid_by set default auth.uid();
alter table public.settlements alter column paid_by set not null;

-- -----------------------------------------------------------------------------
-- 3. Invoerlimieten (NOT VALID: gelden voor nieuwe/gewijzigde rijen, bestaande
--    data blijft ongemoeid)
-- -----------------------------------------------------------------------------
do $$
declare
  c record;
begin
  for c in
    select * from (values
      ('app_members', 'app_members_name_len', 'char_length(display_name) between 1 and 40'),
      ('categories', 'categories_name_len', 'char_length(name) between 1 and 60'),
      ('categories', 'categories_color_fmt', $c$color is null or color ~ '^#[0-9a-fA-F]{6}$'$c$),
      ('tags', 'tags_name_len', 'char_length(name) between 1 and 40'),
      ('transactions', 'transactions_desc_len', 'description is null or char_length(description) <= 300'),
      ('transactions', 'transactions_receipt_text_len', 'receipt_text is null or char_length(receipt_text) <= 20000'),
      ('transactions', 'transactions_receipt_path_len', 'receipt_path is null or char_length(receipt_path) <= 200'),
      ('transactions', 'transactions_amount_max', 'amount <= 100000000'),
      ('transaction_templates', 'templates_name_len', 'char_length(name) between 1 and 80'),
      ('budgets', 'budgets_month_first', 'extract(day from month) = 1'),
      ('budgets', 'budgets_actual_nonneg', 'actual_amount is null or actual_amount >= 0'),
      ('savings_goals', 'savings_goals_name_len', 'char_length(name) between 1 and 80'),
      ('investments', 'investments_symbol_len', 'char_length(symbol) between 1 and 24'),
      ('investments', 'investments_name_len', 'name is null or char_length(name) <= 120'),
      ('investments', 'investments_currency_fmt', $c$currency ~ '^[A-Z]{3}$'$c$),
      ('user_settings', 'user_settings_key_len', 'twelvedata_api_key is null or char_length(twelvedata_api_key) <= 100'),
      ('settlements', 'settlements_note_len', 'note is null or char_length(note) <= 200')
    ) as v(tbl, cname, expr)
  loop
    if not exists (select 1 from pg_constraint where conname = c.cname) then
      execute format('alter table public.%I add constraint %I check (%s) not valid', c.tbl, c.cname, c.expr);
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 4. Triggers: eigenaar is onveranderbaar, betaler moet een lid zijn,
--    bonnetjes enkel uit je eigen opslagmap
-- -----------------------------------------------------------------------------
create or replace function public.tg_lock_owner()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.user_id := old.user_id;
  return new;
end $$;

create or replace function public.tg_transactions_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id;
  end if;

  if new.paid_by is null or not new.is_shared then
    new.paid_by := new.user_id;
  end if;

  if not exists (select 1 from public.app_members m where m.user_id = new.paid_by) then
    raise exception 'Betaler moet een lid van het huishouden zijn';
  end if;

  if new.receipt_path is not null
     and auth.uid() is not null
     and (tg_op = 'INSERT' or new.receipt_path is distinct from old.receipt_path)
     and split_part(new.receipt_path, '/', 1) <> auth.uid()::text then
    raise exception 'Ongeldig pad voor bonnetje';
  end if;

  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['app_members', 'categories', 'tags', 'transaction_templates', 'budgets', 'savings_goals', 'investments', 'settlements'] loop
    execute format('drop trigger if exists lock_owner on public.%I', t);
    execute format('create trigger lock_owner before update on public.%I for each row execute function public.tg_lock_owner()', t);
  end loop;
end $$;

drop trigger if exists transactions_guard on public.transactions;
create trigger transactions_guard
  before insert or update on public.transactions
  for each row execute function public.tg_transactions_guard();

-- -----------------------------------------------------------------------------
-- 5. Indexen
-- -----------------------------------------------------------------------------
create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_occurred_on_idx on public.transactions(occurred_on);
create index if not exists transactions_shared_idx on public.transactions(is_shared) where is_shared;
create index if not exists transactions_next_due_date_idx on public.transactions(next_due_date) where is_recurring;
create index if not exists transactions_parent_idx on public.transactions(parent_transaction_id);
create index if not exists budgets_month_idx on public.budgets(month);
create unique index if not exists budgets_shared_unique on public.budgets (category_id, month) where is_shared;
create unique index if not exists budgets_personal_unique on public.budgets (user_id, category_id, month) where not is_shared;

-- Voorkomt dubbele automatische boekingen. Wordt enkel aangemaakt als er nog
-- geen dubbels bestaan (die kan je dan eerst zelf opruimen).
do $$
begin
  if not exists (
    select 1 from public.transactions
    where parent_transaction_id is not null
    group by parent_transaction_id, occurred_on having count(*) > 1
  ) then
    create unique index if not exists transactions_recurring_instance_unique
      on public.transactions (parent_transaction_id, occurred_on)
      where parent_transaction_id is not null;
  else
    raise notice 'Dubbele terugkerende boekingen gevonden: unieke index overgeslagen.';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 6. Row Level Security
--    Alle oude policies worden verwijderd en opnieuw opgebouwd. Elke policy
--    geldt enkel voor ingelogde gebruikers ("to authenticated"); daarbovenop
--    eist een restrictieve policy lidmaatschap + tweestapsverificatie.
-- -----------------------------------------------------------------------------
do $$
declare
  p record;
  t text;
  tables text[] := array['app_members', 'categories', 'tags', 'transactions', 'transaction_tags',
                         'transaction_templates', 'budgets', 'savings_goals', 'investments',
                         'user_settings', 'settlements'];
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename = any(tables)
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;

  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated
         using (public.is_app_member() and public.mfa_ok())
         with check (public.is_app_member() and public.mfa_ok())',
      t || '_guard', t);
    execute format('revoke all on table public.%I from anon, public', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
  end loop;
end $$;

-- Leden: iedereen ziet de namen, je past enkel je eigen naam aan.
create policy app_members_select on public.app_members for select to authenticated using (true);
create policy app_members_update on public.app_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Categorieën en tags: gedeeld huishouden; iedereen mag aanpassen, enkel de
-- maker mag verwijderen.
create policy categories_select on public.categories for select to authenticated using (true);
create policy categories_insert on public.categories for insert to authenticated with check (user_id = auth.uid());
create policy categories_update on public.categories for update to authenticated using (true) with check (true);
create policy categories_delete on public.categories for delete to authenticated using (user_id = auth.uid());

create policy tags_select on public.tags for select to authenticated using (true);
create policy tags_insert on public.tags for insert to authenticated with check (user_id = auth.uid());
create policy tags_update on public.tags for update to authenticated using (true) with check (true);
create policy tags_delete on public.tags for delete to authenticated using (user_id = auth.uid());

-- Persoonlijk of gedeeld: transacties, budgetten, spaardoelen, sjablonen.
do $$
declare t text;
begin
  foreach t in array array['transactions', 'budgets', 'savings_goals', 'transaction_templates'] loop
    execute format('create policy %I on public.%I for select to authenticated using (user_id = auth.uid() or is_shared)', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = auth.uid())', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = auth.uid() or is_shared) with check (user_id = auth.uid() or is_shared)', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = auth.uid() or is_shared)', t || '_delete', t);
  end loop;
end $$;

create policy transaction_tags_select on public.transaction_tags for select to authenticated using (
  exists (select 1 from public.transactions t where t.id = transaction_id and (t.user_id = auth.uid() or t.is_shared))
);
create policy transaction_tags_insert on public.transaction_tags for insert to authenticated with check (
  exists (select 1 from public.transactions t where t.id = transaction_id and (t.user_id = auth.uid() or t.is_shared))
);
create policy transaction_tags_delete on public.transaction_tags for delete to authenticated using (
  exists (select 1 from public.transactions t where t.id = transaction_id and (t.user_id = auth.uid() or t.is_shared))
);

-- Volledig privé: beleggingen en persoonlijke instellingen.
do $$
declare t text;
begin
  foreach t in array array['investments', 'user_settings'] loop
    execute format('create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_own', t);
  end loop;
end $$;

-- Afrekeningen: zichtbaar voor beiden, enkel de betaler voegt toe/verwijdert.
create policy settlements_select on public.settlements for select to authenticated using (true);
create policy settlements_insert on public.settlements for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from public.app_members m where m.user_id = paid_by)
);
create policy settlements_delete on public.settlements for delete to authenticated using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 7. Functies
-- -----------------------------------------------------------------------------

-- Gedeelde balans vanuit het standpunt van de aanroeper.
-- Positief = je partner is jou geld verschuldigd.
create or replace function public.shared_balance()
returns numeric
language sql
stable
set search_path = ''
as $$
  select
    coalesce((
      select sum(case when t.paid_by = auth.uid() then t.amount else -t.amount end) / 2
      from public.transactions t
      where t.is_shared and t.type = 'expense' and not t.is_recurring
    ), 0)
    +
    coalesce((
      select sum(case when s.paid_by = auth.uid() then s.amount else -s.amount end)
      from public.settlements s
    ), 0);
$$;

-- Maakt de vervallen boekingen van terugkerende reeksen aan. Atomair (geen
-- dubbels als jullie de app tegelijk openen) en datums worden telkens vanaf de
-- startdatum berekend, zodat bv. "elke 31e" correct op de laatste dag van een
-- kortere maand valt zonder te verschuiven.
create or replace function public.generate_due_recurring(p_today date default current_date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  t record;
  occ date;
  k integer;
  step interval;
  v_today date := least(coalesce(p_today, current_date), current_date + 1);
  created integer := 0;
  n integer;
begin
  if auth.uid() is null or not public.is_app_member() or not public.mfa_ok() then
    raise exception 'Geen toegang';
  end if;

  for t in
    select * from public.transactions
    where is_recurring
      and next_due_date is not null
      and next_due_date <= v_today
      and (user_id = auth.uid() or is_shared)
    for update skip locked
  loop
    step := case t.recurrence_interval
      when 'weekly' then interval '1 week'
      when 'yearly' then interval '1 year'
      else interval '1 month'
    end;
    k := 0;
    loop
      occ := (t.occurred_on + step * k)::date;
      exit when occ > v_today
        or (t.recurrence_end_date is not null and occ > t.recurrence_end_date)
        or k > 2000;
      if occ >= t.next_due_date then
        insert into public.transactions
          (user_id, paid_by, is_shared, type, amount, description, category_id,
           occurred_on, is_recurring, parent_transaction_id, pending_review)
        values
          (t.user_id, coalesce(t.paid_by, t.user_id), t.is_shared, t.type, t.amount,
           t.description, t.category_id, occ, false, t.id, true)
        on conflict do nothing;
        get diagnostics n = row_count;
        created := created + n;
      end if;
      k := k + 1;
    end loop;

    update public.transactions
    set next_due_date = case
      when t.recurrence_end_date is not null and occ > t.recurrence_end_date then null
      else occ
    end
    where id = t.id;
  end loop;

  return created;
end $$;

revoke all on function public.is_app_member() from public, anon;
revoke all on function public.mfa_ok() from public, anon;
revoke all on function public.shared_balance() from public, anon;
revoke all on function public.generate_due_recurring(date) from public, anon;
grant execute on function public.is_app_member() to authenticated;
grant execute on function public.mfa_ok() to authenticated;
grant execute on function public.shared_balance() to authenticated;
grant execute on function public.generate_due_recurring(date) to authenticated;

-- -----------------------------------------------------------------------------
-- 8. Opslag voor bonnetjes
--    Privé bucket, max 5 MB, enkel afbeeldingen. Je uploadt enkel in je eigen
--    map ("<jouw-id>/..."). Je ziet je eigen bonnetjes + die van gedeelde
--    transacties; nooit de bonnetjes van persoonlijke uitgaven van je partner.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'receipts';

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname like 'receipts%'
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

create policy receipts_select on storage.objects for select to authenticated using (
  bucket_id = 'receipts'
  and public.is_app_member() and public.mfa_ok()
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.transactions t where t.receipt_path = name)
  )
);

create policy receipts_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'receipts'
  and public.is_app_member() and public.mfa_ok()
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy receipts_delete on storage.objects for delete to authenticated using (
  bucket_id = 'receipts'
  and public.is_app_member() and public.mfa_ok()
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- =============================================================================
-- Klaar. Controle: onderstaande query moet jullie twee accounts tonen.
--   select * from public.app_members;
-- Later een lid toevoegen:
--   insert into public.app_members (user_id, display_name) values ('<uuid>', 'Naam');
-- =============================================================================
