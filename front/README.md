# USnitch app

Expo SDK 58 / React Native app for University of Utah parking sightings.

## Run

```sh
npm ci
npm run web
# Or: npm start, then open the project with a compatible native development build.
```

Copy `.env.example` to `.env.local` and set the Supabase project URL and
**publishable** client key. The current checkout's ignored `.env.local` is already
configured for the linked USnitch project. Restart Expo after changing environment
variables. Never put a secret/service-role key in an `EXPO_PUBLIC_` variable.

Expo Router loads screens from `src/app/`; `index.ts` is the entry point. Native
permissions are configured in `app.json`. Camera/library and one-time foreground
location are used only when the user selects those actions. There is no background
location tracking.

## Accounts and sightings

- Email/password sign-up and sign-in use Supabase Auth. Email confirmation is
  disabled on the linked hackathon project so new accounts sign in immediately.
  Any syntactically valid test email can be used; no working inbox is needed.
  Passwords can be simple (for example `123456`); Supabase's minimum is six
  characters, with no character-class requirements. The app adds no extra length
  or email-domain restrictions. If confirmation is enabled on another project,
  open its confirmation email, then return to the app and sign in.
- Sessions persist across reloads and refresh while the native app is foregrounded.
- Signed-in users can pick/take a photo, tap a location on the campus map (or use
  their location), choose when they saw the vehicle, and add up to 280 characters.
- Photos are re-encoded to JPEG, resized to at most 1600 px on the longest side,
  and limited to 5 MB. Original EXIF location data is not used for the map pin.
- The private `sighting-photos` Supabase Storage bucket holds images in
  `<user UUID>/<sighting UUID>.jpg` paths. The database stores paths, not expiring
  photo URLs. Clicking a marker requests a fresh 15-minute signed URL.
- Sightings are shared with all signed-in users. Map updates use Realtime with a
  30-second refresh fallback and foreground refresh. Markers show observations
  from the past 24 hours; older rows/photos remain stored for future analysis.
- The sightings box includes a time dropdown: past 15 minutes, 30 minutes,
  1 hour, or 24 hours (default). The marker count and map filter together using
  observation time, and the cutoff updates every 30 seconds. Switching to a
  longer window immediately restores matching sightings from the cached feed.
- The map covers the existing campus map bounds. Both the client and database
  reject locations outside that area.
- Each saved sighting also creates a backend-only training row with `UID`,
  `Lot_ID`, and `timestamp`. The database assigns the nearest lot node and rounds
  the observation time down to a 30-minute boundary in the same transaction.
  See [training-table documentation](../supabase/README.md).

## Backend

`supabase/migrations/20261107020000_accounts_and_sightings.sql` creates the table,
indexes, private image bucket, RLS policies, and Realtime publication. It has
already been applied to the linked project in this checkout.

Clients cannot create reports under another account, upload to another account's
folder, overwrite photos, or delete published photos. Anonymous visitors cannot
read reports or obtain photo URLs. No account email addresses are exposed in map
reports. The existing FastAPI server is not required for this feature.

For a different project, link the CLI and apply migrations from the repository
root before running the app. Check `supabase db push --help` for target flags for
your installed CLI version (this checkout uses `--remote`).

## Checks

```sh
npm run lint
npm run typecheck
npx expo export --platform web
```

The feature was also verified against the hosted project with two temporary
accounts: password sign-in, own-folder upload, cross-user read/photo download,
Realtime insert delivery, and rejection of anonymous and cross-account writes.
Temporary accounts and test uploads are removed after verification.
