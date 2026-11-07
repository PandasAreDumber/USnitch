-- Run with: supabase db query --remote --file supabase/tests/ml_training_data.sql --yes
-- All test users, sightings, and training records are rolled back. No photos
-- are uploaded and no test sightings become visible to other app users.
begin;

do $$
begin
  assert (select count(*) from public.parking_lots) = 132, 'Expected 132 campus lots';
  assert (select array_agg(column_name::text order by ordinal_position)
    from information_schema.columns where table_schema = 'public' and table_name = 'ml_training_data')
    = array['UID', 'Lot_ID', 'timestamp'], 'Training column names/casing changed';
  assert (select count(*) from public.parking_lots where lot_number = 42) = 2,
    'The two distinct facilities numbered 42 must retain distinct IDs';
  assert public.closest_parking_lot(40.75957255366207, -111.85114031232175) = 'utah-surface-001', 'Nearest lot mismatch at 40.75957255366207, -111.85114031232175';
  assert public.closest_parking_lot(40.7649, -111.8421) = 'utah-surface-024', 'Nearest lot mismatch at 40.7649, -111.8421';
  assert public.closest_parking_lot(40.7595, -111.8222) = 'utah-garages-119', 'Nearest lot mismatch at 40.7595, -111.8222';
  assert public.closest_parking_lot(40.76808, -111.84318) = 'utah-garages-042', 'Nearest lot mismatch at 40.76808, -111.84318';
  assert public.closest_parking_lot(40.75384, -111.84447) = 'utah-surface-042', 'Nearest lot mismatch at 40.75384, -111.84447';
  assert public.closest_parking_lot(40.748, -111.86) = 'utah-surface-041', 'Nearest lot mismatch at 40.748, -111.86';
end;
$$;

select set_config('usnitch.test_uid', gen_random_uuid()::text, true);
select set_config('usnitch.test_base', (date_trunc('hour', now()) - interval '2 hours')::text, true);
insert into auth.users (id, aud, role, email)
values (current_setting('usnitch.test_uid')::uuid, 'authenticated', 'authenticated',
  'usnitch-ml-rollback-' || current_setting('usnitch.test_uid') || '@example.invalid');

-- Exercise the same authenticated INSERT path as the app. The trigger must
-- succeed even though this role cannot insert into the training table itself.
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('usnitch.test_uid'), true);
with reports as materialized (
  select gen_random_uuid() as id, elapsed
  from (values (interval '0 minutes'), (interval '29 minutes 59.999 seconds'),
    (interval '30 minutes'), (interval '59 minutes 59.999 seconds')) as offsets(elapsed)
)
insert into public.sightings (id, user_id, latitude, longitude, photo_path, observed_at)
select id, current_setting('usnitch.test_uid')::uuid,
  40.75957255366207, -111.85114031232175,
  current_setting('usnitch.test_uid') || '/' || id::text || '.jpg',
  current_setting('usnitch.test_base')::timestamptz + elapsed
from reports;

do $$
declare
  denied boolean := false;
begin
  begin
    insert into public.ml_training_data ("UID", "Lot_ID", "timestamp")
    values (current_setting('usnitch.test_uid')::uuid, 'utah-surface-001', now());
  exception when insufficient_privilege then
    denied := true;
  end;
  assert denied, 'App clients must not be able to forge training observations';
  denied := false;
  begin
    perform 1 from public.ml_training_data limit 1;
  exception when insufficient_privilege then
    denied := true;
  end;
  assert denied, 'Training data must remain backend-only';
end;
$$;
reset role;

do $$
begin
  assert (select count(*) from public.ml_training_data
    where "UID" = current_setting('usnitch.test_uid')::uuid) = 4,
    'Expected one training record for every sighting, including repeated user/lot/bin';
  assert not exists (select 1 from public.ml_training_data
    where "UID" = current_setting('usnitch.test_uid')::uuid and "Lot_ID" <> 'utah-surface-001'),
    'Training Lot_ID does not match nearest node';
  assert (select count(*) from public.ml_training_data
    where "UID" = current_setting('usnitch.test_uid')::uuid
      and "timestamp" = current_setting('usnitch.test_base')::timestamptz) = 2,
    '00:00 and 29:59.999 must clamp to the hour';
  assert (select count(*) from public.ml_training_data
    where "UID" = current_setting('usnitch.test_uid')::uuid
      and "timestamp" = current_setting('usnitch.test_base')::timestamptz + interval '30 minutes') = 2,
    '30:00 and 59:59.999 must clamp to the half hour';
end;
$$;

savepoint atomic_sighting;
with report as materialized (select gen_random_uuid() as id)
insert into public.sightings (id, user_id, latitude, longitude, photo_path, observed_at)
select id, current_setting('usnitch.test_uid')::uuid, 40.75957255366207, -111.85114031232175,
  current_setting('usnitch.test_uid') || '/' || id::text || '.jpg', now() from report;
do $$ begin
  assert (select count(*) from public.ml_training_data where "UID" = current_setting('usnitch.test_uid')::uuid) = 5,
    'Training record was not added in the sighting transaction';
end; $$;
rollback to savepoint atomic_sighting;
do $$ begin
  assert (select count(*) from public.ml_training_data where "UID" = current_setting('usnitch.test_uid')::uuid) = 4,
    'Training record did not roll back with its source sighting';
  assert (select count(*) from public.sightings where user_id = current_setting('usnitch.test_uid')::uuid) = 4,
    'Source sighting did not roll back';
end; $$;

-- Store UTC instants, retaining the distinction between the two 1:30 a.m.
-- intervals during Denver's fall daylight-saving transition.
set local time zone 'America/Denver';
do $$ begin
  assert date_bin(interval '30 minutes', timestamptz '2026-11-01 01:47:00-06', timestamptz '2000-01-01 00:00:00+00')
    = timestamptz '2026-11-01 07:30:00+00', 'Daylight-time bin incorrect';
  assert date_bin(interval '30 minutes', timestamptz '2026-11-01 01:47:00-07', timestamptz '2000-01-01 00:00:00+00')
    = timestamptz '2026-11-01 08:30:00+00', 'Standard-time bin incorrect';
end; $$;

rollback;
select 'PASS: exact schema, nearest lots, timestamp bins, authenticated upload trigger, access controls, and atomic rollback; test fixtures rolled back' as result;
