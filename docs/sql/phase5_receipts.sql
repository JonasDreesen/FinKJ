-- Fase 5 (extra): bonnetje-foto's bij transacties.
-- Voer dit uit in Supabase: Project -> SQL Editor -> New query -> plak -> Run.

alter table transactions add column if not exists receipt_path text;

-- Privé opslagruimte (bucket) voor bonnetje-foto's. "public = false" betekent
-- dat foto's niet rechtstreeks via een publieke URL te bekijken zijn, enkel
-- via een tijdelijke "signed URL" die de app zelf aanvraagt.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Enkel ingelogde gebruikers (jullie twee) mogen bestanden in deze bucket
-- uploaden, bekijken en verwijderen.
create policy "receipts_select" on storage.objects
  for select using (bucket_id = 'receipts' and auth.role() = 'authenticated');

create policy "receipts_insert" on storage.objects
  for insert with check (bucket_id = 'receipts' and auth.role() = 'authenticated');

create policy "receipts_delete" on storage.objects
  for delete using (bucket_id = 'receipts' and auth.role() = 'authenticated');
