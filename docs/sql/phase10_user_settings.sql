-- Extra: persoonlijke instellingen per gebruiker (bv. Twelve Data API-key),
-- permanent opgeslagen en gekoppeld aan je account i.p.v. enkel lokaal in de browser.
-- Voer dit uit in Supabase: Project -> SQL Editor -> New query -> plak -> Run.

create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  twelvedata_api_key text,
  updated_at timestamptz not null default now()
);

alter table user_settings enable row level security;

-- Volledig privé: enkel de eigenaar kan zijn/haar eigen instellingen zien of wijzigen.
create policy "user_settings_select_own" on user_settings
  for select using (user_id = auth.uid());

create policy "user_settings_insert_own" on user_settings
  for insert with check (user_id = auth.uid());

create policy "user_settings_update_own" on user_settings
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
