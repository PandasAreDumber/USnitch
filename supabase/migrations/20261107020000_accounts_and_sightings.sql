-- Supabase Auth manages accounts; photos stay private to signed-in app users.
create table public.sightings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  latitude double precision not null check (latitude between 40.748 and 40.777),
  longitude double precision not null check (longitude between -111.86 and -111.812),
  photo_path text not null unique,
  note text not null default '' check (char_length(note) <= 280),
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint sighting_photo_owner check (photo_path = user_id::text || '/' || id::text || '.jpg'),
  constraint sighting_observation_time check (
    observed_at <= now() + interval '5 minutes'
    and observed_at >= now() - interval '24 hours'
  )
);

create index sightings_observed_at_idx on public.sightings (observed_at desc, id);
alter table public.sightings enable row level security;
revoke all on public.sightings from anon, authenticated;
grant select on public.sightings to authenticated;
grant insert (id, user_id, latitude, longitude, photo_path, note, observed_at)
  on public.sightings to authenticated;

create policy "Signed-in users can view sightings"
  on public.sightings for select to authenticated using (true);
create policy "Users can submit their own sightings"
  on public.sightings for insert to authenticated
  with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sighting-photos', 'sighting-photos', false, 5242880, array['image/jpeg']);

create policy "Signed-in users can view sighting photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'sighting-photos');
create policy "Users can upload photos to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'sighting-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and storage.extension(name) = 'jpg'
  );
-- Allows cleanup if creating a report fails, but not deletion of published photos.
create policy "Users can remove their unsubmitted photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'sighting-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (select 1 from public.sightings where photo_path = name)
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sightings'
  ) then
    alter publication supabase_realtime add table public.sightings;
  end if;
end $$;
