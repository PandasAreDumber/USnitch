# Supabase backend

The app uses Supabase Auth, private photo storage, and `public.sightings`.
Migrations in this directory are applied to the linked project with:

```sh
supabase db push --remote --skip-vault
```

## ML training data

`public.ml_training_data` is a separate table with exactly these columns:

| Column | Type | Meaning |
| --- | --- | --- |
| `UID` | UUID | Reporting user's Supabase account ID (`sightings.user_id`). |
| `Lot_ID` | text | ID of the nearest parking-lot node, e.g. `utah-surface-001`. |
| `timestamp` | timestamptz | Observation time, rounded down to the start of its 30-minute interval. |

A database `AFTER INSERT` trigger generates the training record whenever a
sighting is created. Saving the sighting and training record is atomic: both
succeed or both roll back. The app does not need to make a second API request.
Existing sightings are backfilled once by the migration.

`UID` identifies a **user**, not a unique training row. Every sighting adds one
record, so the same user can have multiple records in the same lot/time interval.
These records are observations, not confirmed independent enforcement visits.
Deleting an account removes its training records through a foreign key.

`public.parking_lots` contains the 132 campus nodes from
`data/parking/parking_nodes.geojson`. `Lot_ID` uses the full node identifier
because the university reuses numeric lot 42 for two different facilities.
Nearest means shortest great-circle distance to a node's representative point;
ties are resolved by `Lot_ID`. The SQL uses the haversine expression and requires
no geospatial database extension. This is a nearest-node assignment, not a
point-in-polygon test or an inferred vehicle route.

Examples of timestamp bins:

```text
10:00:00 → 10:00:00
10:29:59 → 10:00:00
10:30:00 → 10:30:00
10:59:59 → 10:30:00
```

The column retains the full date and timezone-aware instant. Store/read UTC and
convert to `America/Denver` when deriving local hour and weekday for a model.
Repeated local times during daylight-saving transitions remain distinct.

App clients cannot insert, edit, or read training records directly. Read them
from a trusted backend/database connection or with a server-side service role.
The Supabase dashboard Table Editor/SQL Editor can inspect the table as well.
Keep privileged credentials out of the Expo application.

SQL must quote the mixed-case names:

```sql
select "UID", "Lot_ID", "timestamp"
from public.ml_training_data
order by "timestamp";
```

## Database checks

```sh
supabase db query --remote --file supabase/tests/ml_training_data.sql --yes
```

The integration check verifies exact column casing, nearest-lot assignments,
half-hour boundaries, the authenticated sighting-insert path, training-table
permissions, and rollback atomicity. All test users and records are created in a
transaction that is rolled back; no test images are uploaded.
