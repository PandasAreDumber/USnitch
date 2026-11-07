-- One ML observation per uploaded sighting. Preserve requested column casing.
-- Parking node source: data/parking/parking_nodes.geojson (132 campus facilities).
create table public.parking_lots (
  "Lot_ID" text primary key,
  lot_number integer not null,
  name text not null,
  facility_type text not null check (facility_type in ('surface_lot', 'garage')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180)
);

alter table public.parking_lots enable row level security;
revoke all on public.parking_lots from public, anon, authenticated;
grant select on public.parking_lots to authenticated, service_role;
create policy "Signed-in users can read parking lot IDs"
  on public.parking_lots for select to authenticated using (true);

insert into public.parking_lots ("Lot_ID", lot_number, name, facility_type, latitude, longitude) values
  ('utah-surface-001', 1, 'West Stadium', 'surface_lot', 40.75957255366207, -111.85114031232175),
  ('utah-surface-002', 2, 'Law', 'surface_lot', 40.76162237508433, -111.85098235635499),
  ('utah-surface-004', 4, 'Chemistry', 'surface_lot', 40.76181931167352, -111.84876396800979),
  ('utah-surface-005', 5, 'Marriott South', 'surface_lot', 40.76169884361947, -111.84672477890072),
  ('utah-surface-006', 6, 'Marriott Library', 'surface_lot', 40.762623870509366, -111.84792590298855),
  ('utah-surface-008', 8, 'Social Work', 'surface_lot', 40.76057602153199, -111.84546750027701),
  ('utah-surface-009', 9, 'East Stadium', 'surface_lot', 40.75967299864291, -111.84613941103541),
  ('utah-surface-010', 10, 'Sculpture', 'surface_lot', 40.76021147642087, -111.8443459319679),
  ('utah-garages-011', 11, 'Central Garage', 'garage', 40.76162570009147, -111.84113859098352),
  ('utah-surface-012', 12, 'Business', 'surface_lot', 40.76059309438078, -111.84233498283132),
  ('utah-surface-013', 13, 'University Services', 'surface_lot', 40.76075636157175, -111.8408955029187),
  ('utah-surface-014', 14, 'Huntsman West', 'surface_lot', 40.760766362218185, -111.84010690986581),
  ('utah-garages-015', 15, 'LDS Garage', 'garage', 40.760633196539644, -111.83759335588522),
  ('utah-surface-016', 16, 'Madsen Clinic', 'surface_lot', 40.75851014140544, -111.83565469967917),
  ('utah-surface-017', 17, 'LDS Pavilion', 'surface_lot', 40.759173398364396, -111.83659407824923),
  ('utah-surface-018', 18, 'LDS West', 'surface_lot', 40.75914720890218, -111.83892685130147),
  ('utah-surface-019', 19, 'LDS East', 'surface_lot', 40.75983543970543, -111.83672991884194),
  ('utah-surface-020', 20, 'Huntsman South', 'surface_lot', 40.76126213069639, -111.83839710238968),
  ('utah-surface-021', 21, 'Tanner Dance', 'surface_lot', 40.76201300884122, -111.84019002670905),
  ('utah-surface-022', 22, 'Huntsman East', 'surface_lot', 40.762765298314136, -111.8372267892784),
  ('utah-surface-023', 23, 'Epicenter', 'surface_lot', 40.76581871287412, -111.84094426349196),
  ('utah-surface-024', 24, 'Lassonde', 'surface_lot', 40.76491875688748, -111.84242167201162),
  ('utah-surface-025', 25, 'Student Life', 'surface_lot', 40.76555937110769, -111.83779950482824),
  ('utah-surface-026', 26, 'Soccer', 'surface_lot', 40.76767167690637, -111.83999680611396),
  ('utah-surface-027', 27, 'Broadcast Center', 'surface_lot', 40.76795337814322, -111.8372665619273),
  ('utah-surface-028', 28, 'Union East', 'surface_lot', 40.76487306163099, -111.8445937101882),
  ('utah-surface-029', 29, 'Union North', 'surface_lot', 40.76550485978903, -111.84645857493368),
  ('utah-surface-030', 30, 'Alumni', 'surface_lot', 40.76659453334018, -111.84345477979491),
  ('utah-surface-031', 31, 'Warnock Engineering', 'surface_lot', 40.76719543060591, -111.844649299048),
  ('utah-surface-032', 32, 'Sorenson', 'surface_lot', 40.77006416479955, -111.8442551302353),
  ('utah-surface-033', 33, 'Student Services', 'surface_lot', 40.765852093635345, -111.84785109438013),
  ('utah-surface-034', 34, 'Naval Science', 'surface_lot', 40.76641109152901, -111.84908589873672),
  ('utah-surface-035', 35, 'Presidents Circle', 'surface_lot', 40.7648361542228, -111.8494942549035),
  ('utah-surface-036', 36, 'Fine Arts West', 'surface_lot', 40.76332351668886, -111.85327547676192),
  ('utah-surface-037', 37, 'Gardner Hall', 'surface_lot', 40.766692373096845, -111.8514662298317),
  ('utah-garages-038', 38, 'Northwest Garage', 'garage', 40.76654025380978, -111.84863669052856),
  ('utah-surface-039', 39, 'Merrill Engineering', 'surface_lot', 40.769886804475355, -111.84628995418691),
  ('utah-surface-040', 40, 'Guardsman Way', 'surface_lot', 40.757133251168526, -111.84455021640002),
  ('utah-surface-041', 41, 'Athletic Training Center', 'surface_lot', 40.754835167785735, -111.84619149535507),
  ('utah-garages-042', 42, 'Price Computing Garage', 'garage', 40.76808870474386, -111.84318642692875),
  ('utah-surface-042', 42, 'Baseball', 'surface_lot', 40.75384337257167, -111.84446979901273),
  ('utah-surface-043', 43, 'HEDCO', 'surface_lot', 40.76609077443805, -111.8456450028379),
  ('utah-surface-044', 44, 'Kennecott', 'surface_lot', 40.76819075170867, -111.84817793374772),
  ('utah-garages-045', 45, 'ACC Garage', 'garage', 40.770632987834176, -111.84106384690037),
  ('utah-surface-046', 46, 'USTAR', 'surface_lot', 40.76869503061607, -111.84352927877109),
  ('utah-surface-047', 47, 'East Wasatch', 'surface_lot', 40.769815972194436, -111.84151636338922),
  ('utah-garages-048', 48, 'PCH Garage', 'garage', 40.77230315304108, -111.83972293864878),
  ('utah-surface-049', 49, 'PCH South', 'surface_lot', 40.77111855845334, -111.83985850091071),
  ('utah-garages-050', 50, 'North Medical Garage', 'garage', 40.77172345762644, -111.83796495267512),
  ('utah-garages-051', 51, 'Helipad Garage', 'garage', 40.77264701191707, -111.83726252528648),
  ('utah-surface-052', 52, 'Hospital Loop', 'surface_lot', 40.772338245952966, -111.83812683695263),
  ('utah-surface-053', 53, 'Rehab', 'surface_lot', 40.77177067715867, -111.83583935851365),
  ('utah-surface-054', 54, 'Hospital West', 'surface_lot', 40.76877017358284, -111.83682521977967),
  ('utah-garages-055', 55, 'Nursing Garage', 'garage', 40.769138355440404, -111.83494328173599),
  ('utah-garages-056', 56, 'West Medical Garage', 'garage', 40.77011806684805, -111.83708609154706),
  ('utah-garages-057', 57, 'Moran Garage', 'garage', 40.769927399346756, -111.83735298101487),
  ('utah-surface-059', 59, 'Jewish Community Center', 'surface_lot', 40.77371330334002, -111.83908255402869),
  ('utah-garages-061', 61, 'HSEB Garage', 'garage', 40.76899732063565, -111.83360484673057),
  ('utah-surface-062', 62, 'Genetics', 'surface_lot', 40.76959293258402, -111.83327759309675),
  ('utah-surface-063', 63, 'Guest House', 'surface_lot', 40.767014998871396, -111.83534356912763),
  ('utah-garages-064', 64, 'South Medical Garage', 'garage', 40.769301468754165, -111.83255092574298),
  ('utah-surface-065', 65, 'Comparative Medicine', 'surface_lot', 40.769799212118386, -111.83268390922251),
  ('utah-surface-066', 66, 'Hospital East', 'surface_lot', 40.769496460798194, -111.8312173108987),
  ('utah-garages-067', 67, 'Health Sciences Garage', 'garage', 40.7736871819656, -111.83762544067508),
  ('utah-garages-068', 68, 'HCI Garage', 'garage', 40.773015045835606, -111.83563663999439),
  ('utah-surface-069', 69, 'Chapel Glenn', 'surface_lot', 40.767259758716534, -111.83438857073128),
  ('utah-surface-070', 70, 'Pharmacy', 'surface_lot', 40.768397820943335, -111.83308233684073),
  ('utah-surface-071', 71, 'CVRTI', 'surface_lot', 40.767377128966274, -111.83201473664812),
  ('utah-surface-072', 72, 'Biopolymers', 'surface_lot', 40.76770470035005, -111.83173985800914),
  ('utah-surface-073', 73, 'Medical Towers', 'surface_lot', 40.767978558157594, -111.83084668055292),
  ('utah-surface-074', 74, 'Shoreline', 'surface_lot', 40.76626634355141, -111.82900881979648),
  ('utah-surface-075', 75, 'Red Butte Garden', 'surface_lot', 40.766217715086796, -111.82816232314397),
  ('utah-surface-076', 76, 'Bath House', 'surface_lot', 40.76548830887044, -111.8292625303481),
  ('utah-surface-077', 77, 'Officers Club', 'surface_lot', 40.76559111677025, -111.83492099001953),
  ('utah-surface-078', 78, 'Stilwell Field', 'surface_lot', 40.76432205413866, -111.83358790279604),
  ('utah-surface-079', 79, 'Gateway Heights', 'surface_lot', 40.76531571057186, -111.8318664373125),
  ('utah-surface-080', 80, 'East Sage Point', 'surface_lot', 40.76434944391841, -111.82901968496705),
  ('utah-garages-081', 81, 'Shoreline Ridge Garage', 'garage', 40.767890461998284, -111.83047438835634),
  ('utah-surface-082', 82, 'Benchmark', 'surface_lot', 40.76560453048096, -111.83008372748293),
  ('utah-surface-083', 83, 'Museum', 'surface_lot', 40.76396523850047, -111.83315924385087),
  ('utah-surface-084', 84, 'Theater', 'surface_lot', 40.76449561401003, -111.83155190903895),
  ('utah-surface-087', 87, 'Sage Point', 'surface_lot', 40.762597967743446, -111.82934355851182),
  ('utah-surface-088', 88, 'Shuttles', 'surface_lot', 40.76141256982021, -111.83038127486523),
  ('utah-surface-089', 89, 'Fort Douglas Northwest', 'surface_lot', 40.76093819483397, -111.8347016409401),
  ('utah-surface-090', 90, 'Fort Douglas South', 'surface_lot', 40.758706517942684, -111.8330979222516),
  ('utah-surface-091', 91, 'Fort Douglas Northeast', 'surface_lot', 40.76147736554422, -111.83192965617073),
  ('utah-surface-092', 92, 'Soldiers Circle', 'surface_lot', 40.76232940497964, -111.83204501442822),
  ('utah-surface-093', 93, 'West USA', 'surface_lot', 40.752785191584906, -111.83432727075183),
  ('utah-surface-094', 94, 'East USA', 'surface_lot', 40.752538287395936, -111.82731812924642),
  ('utah-garages-099', 99, 'UUSOD Garage', 'garage', 40.75759947421649, -111.8320362849796),
  ('utah-garages-100', 100, 'Ortho Garage', 'garage', 40.756954073742875, -111.8324984739012),
  ('utah-surface-101', 101, 'Health Professions', 'surface_lot', 40.757960470514234, -111.83061238493434),
  ('utah-surface-102', 102, '480 Wakara Way', 'surface_lot', 40.75894178753238, -111.82957947522299),
  ('utah-surface-103', 103, '420 Wakara', 'surface_lot', 40.76020362073596, -111.82961870863474),
  ('utah-surface-104', 104, '400 Wakara', 'surface_lot', 40.76072073721729, -111.82915126863662),
  ('utah-surface-105', 105, '390 Wakara', 'surface_lot', 40.76114878628405, -111.82785154765014),
  ('utah-surface-106', 106, '360 Wakara', 'surface_lot', 40.76182936226549, -111.8281293240947),
  ('utah-garages-107', 107, 'Myriad Garage', 'garage', 40.76403650820113, -111.82598657117761),
  ('utah-garages-108', 108, '295 Chipeta Garage', 'garage', 40.76455588166858, -111.82582332349841),
  ('utah-garages-109', 109, '310 Wakara Garage', 'garage', 40.76319913136351, -111.82497525456114),
  ('utah-garages-110', 110, '320 Wakara Garage', 'garage', 40.76220148118614, -111.82640981876006),
  ('utah-garages-111', 111, '305 Chipeta Garage', 'garage', 40.76273405421439, -111.82691515837354),
  ('utah-surface-112', 112, 'Red Butte Visitors Center', 'surface_lot', 40.76508131602033, -111.82432457645689),
  ('utah-surface-113', 113, 'Natural History', 'surface_lot', 40.76350348757768, -111.82339057246493),
  ('utah-surface-115', 115, '375 Chipeta', 'surface_lot', 40.761349278720814, -111.82487437940344),
  ('utah-surface-116', 116, '391 Chipeta', 'surface_lot', 40.76136754929209, -111.8245373850997),
  ('utah-surface-117', 117, 'North HMHI', 'surface_lot', 40.7588005238253, -111.82233657318969),
  ('utah-surface-118', 118, '383 Colorow', 'surface_lot', 40.76155995287748, -111.82234200230596),
  ('utah-garages-119', 119, 'HMHI Garage', 'garage', 40.759527860905564, -111.82222766437326),
  ('utah-surface-120', 120, 'South HMHI', 'surface_lot', 40.757440957992074, -111.82276808260035),
  ('utah-surface-121', 121, '500 Chipeta', 'surface_lot', 40.75939345080211, -111.81874106054613),
  ('utah-surface-122', 122, '515 Colorow', 'surface_lot', 40.75774315679479, -111.81783942897209),
  ('utah-surface-123', 123, '575 Chipeta', 'surface_lot', 40.75586934729468, -111.82209596700824),
  ('utah-surface-124', 124, '675 Arapeen', 'surface_lot', 40.75532883233297, -111.82403140473471),
  ('utah-surface-125', 125, 'North INC', 'surface_lot', 40.75390744705392, -111.82559542872306),
  ('utah-surface-126', 126, '410 Chipeta Way', 'surface_lot', 40.75978739892052, -111.82595625797666),
  ('utah-surface-127', 127, '540 Chipeta', 'surface_lot', 40.75715957182256, -111.82635296891284),
  ('utah-surface-128', 128, 'Wakara East', 'surface_lot', 40.75955431824462, -111.8264208938936),
  ('utah-surface-129', 129, 'Wakara West', 'surface_lot', 40.75815885901571, -111.82774377255731),
  ('utah-surface-130', 130, '505 Wakara', 'surface_lot', 40.75802691214184, -111.82925615686062),
  ('utah-surface-131', 131, '615 Arapeen', 'surface_lot', 40.75687771627341, -111.8276774924891),
  ('utah-surface-136', 136, 'Blackhawk', 'surface_lot', 40.75570757269794, -111.82879493180072),
  ('utah-surface-137', 137, 'South Komas', 'surface_lot', 40.75575699169221, -111.82934259455075),
  ('utah-surface-138', 138, 'North Komas', 'surface_lot', 40.75670133971157, -111.83030632431698),
  ('utah-surface-139', 139, '600 Komas', 'surface_lot', 40.75556923704192, -111.8307494701598),
  ('utah-surface-140', 140, '630 Komas', 'surface_lot', 40.754626548390476, -111.8320413577609),
  ('utah-surface-141', 141, '650 Komas', 'surface_lot', 40.75397245403135, -111.8296715135799),
  ('utah-surface-142', 142, '770 Komas', 'surface_lot', 40.752672520153865, -111.82989394746602),
  ('utah-surface-143', 143, 'South Blackhawk', 'surface_lot', 40.75504551663471, -111.82715559839362),
  ('utah-surface-144', 144, 'South INC', 'surface_lot', 40.752850138842184, -111.82546585720306),
  ('utah-surface-200', 200, 'PCMC West Drive', 'surface_lot', 40.77067207744946, -111.84225781527397),
  ('utah-surface-201', 201, 'Ivory University House', 'surface_lot', 40.76047607506142, -111.83589123256571);

-- UID is the reporter's account ID, not a unique observation ID. Multiple
-- sightings from the same reporter/lot/time bin intentionally remain separate.
create table public.ml_training_data (
  "UID" uuid not null references auth.users(id) on delete cascade,
  "Lot_ID" text not null references public.parking_lots("Lot_ID"),
  "timestamp" timestamptz not null,
  constraint ml_timestamp_half_hour check (
    "timestamp" = pg_catalog.date_bin(
      interval '30 minutes', "timestamp", timestamptz '2000-01-01 00:00:00+00'
    )
  )
);
create index ml_training_lot_timestamp_idx
  on public.ml_training_data ("Lot_ID", "timestamp");
create index ml_training_uid_idx on public.ml_training_data ("UID");

-- Model/backend access only. App clients cannot forge or edit training records.
-- The trigger below runs with its owner's privileges, in the sighting transaction.
alter table public.ml_training_data enable row level security;
revoke all on public.ml_training_data from public, anon, authenticated;
grant select on public.ml_training_data to service_role;

create function public.closest_parking_lot(
  sighting_latitude double precision,
  sighting_longitude double precision
) returns text
language sql stable strict
set search_path = ''
as $$
  -- Minimize the haversine term: monotonic in great-circle distance. This avoids
  -- planar degree distances and needs no additional database extension.
  select lot."Lot_ID"
  from public.parking_lots as lot
  order by
    pg_catalog.power(pg_catalog.sin(pg_catalog.radians(lot.latitude - sighting_latitude) / 2), 2)
    + pg_catalog.cos(pg_catalog.radians(sighting_latitude))
      * pg_catalog.cos(pg_catalog.radians(lot.latitude))
      * pg_catalog.power(pg_catalog.sin(pg_catalog.radians(lot.longitude - sighting_longitude) / 2), 2),
    lot."Lot_ID"
  limit 1;
$$;
revoke all on function public.closest_parking_lot(double precision, double precision)
  from public, anon, authenticated;
grant execute on function public.closest_parking_lot(double precision, double precision)
  to service_role;

create function public.record_sighting_for_ml()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  closest_lot text;
begin
  closest_lot := public.closest_parking_lot(new.latitude, new.longitude);
  if closest_lot is null then
    raise exception 'Cannot record sighting: no parking lots are configured.';
  end if;

  insert into public.ml_training_data ("UID", "Lot_ID", "timestamp")
  values (
    new.user_id,
    closest_lot,
    pg_catalog.date_bin(
      interval '30 minutes', new.observed_at, timestamptz '2000-01-01 00:00:00+00'
    )
  );
  return new;
end;
$$;
revoke all on function public.record_sighting_for_ml() from public, anon, authenticated;

create trigger sightings_record_ml_training
  after insert on public.sightings
  for each row execute function public.record_sighting_for_ml();

-- Import reports uploaded before this migration too. The migration runs once;
-- CREATE TRIGGER holds the source-table lock until backfill/commit completes.
insert into public.ml_training_data ("UID", "Lot_ID", "timestamp")
select
  sighting.user_id,
  public.closest_parking_lot(sighting.latitude, sighting.longitude),
  pg_catalog.date_bin(
    interval '30 minutes', sighting.observed_at, timestamptz '2000-01-01 00:00:00+00'
  )
from public.sightings as sighting;
