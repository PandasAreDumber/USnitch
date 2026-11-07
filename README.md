# USnitch

University of Utah parking facility nodes and an interactive map are available
in [data/parking](data/parking/README.md).

Mobile app built with Expo (React Native), styled with Tailwind via NativeWind and daisyUI theme colors.

The app uses Supabase for email/password accounts, private sighting photos, and
shared live map reports. See [app setup and feature documentation](front/README.md).

## Project layout

- `front/` — the Expo mobile app
- `server/` — optional FastAPI backend for future prediction work
- `supabase/` — database migrations, storage policies, and local configuration

## Getting started

```bash
cd front
npm ci
# Configure .env.local using .env.example if this is a fresh checkout.
npm start
```

Scan the QR code with the Expo Go app (Android) or the Camera app (iOS).

## Styling

- Use Tailwind classes through the `className` prop, e.g. `<View className="flex-1 bg-base-100 p-4" />`.
- daisyUI color tokens (`primary`, `secondary`, `accent`, `neutral`, `base-100/200/300`, `base-content`, `info`, `success`, `warning`, `error`, and their `-content` pairs) work on iOS, Android and web, and follow the device's light/dark setting. Their values live in `front/global.css`.
- daisyUI component classes (`btn`, `card`, `modal`, ...) are written for browsers and only render correctly on web. On mobile, build components from utility classes.
