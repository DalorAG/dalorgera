# Garantie-Radar API

NestJS backend for the Garantie-Radar app. Supabase provides auth, Postgres and file storage.

## Run

```bash
cp .env.example .env   # fill in the keys
npm install
npm run start:dev      # http://localhost:3000, API docs at /docs
```

## How it fits together

- **Auth**: the app signs users in with Supabase Auth (`supabase-js`). It sends the access token as
  `Authorization: Bearer <token>`. The API verifies it locally against the project's JWKS.
- **Data access**: requests run against Supabase *as the user*, so Row Level Security protects every table even if
  the API has a bug. The secret key is only used by the reminders worker.
- **Photos** (receipts, warranty cards) go straight from the phone to Storage:
  1. `POST /v1/documents/upload-url` returns `{ storagePath, signedUrl, token }`
  2. upload the file with `supabase.storage.from('documents').uploadToSignedUrl(storagePath, token, file)`
  3. `POST /v1/documents` with `storagePath`, `kind` and an optional `deviceId`
- **Recognition**: `OPENAI_API_KEY` enables reading receipts and warranty cards with an OpenAI vision model.
  The model must return JSON that matches a strict schema, and the values are checked again before they are used.
  Without a key the endpoint returns 503, and the app falls back to manual entry.
- **Deadlines**: Postgres computes `warranty_until` (Garantie), `statutory_until` (2-year Gewährleistung) and
  `protected_until`.
- **Reminders**: a trigger schedules reminders 30 and 7 days before each deadline at 09:00 Berlin time. Every
  5 minutes the worker claims due reminders and sends Expo push notifications. Claiming uses `SKIP LOCKED`, so it is
  safe to run several API instances.

## Endpoints (`/v1`)

| Method | Path | |
|---|---|---|
| GET | `/health` | public, no prefix |
| GET | `/me` | current user |
| GET/POST | `/devices` | list (`?status=active\|expiring\|expired&limit&offset`) / create |
| GET/PATCH/DELETE | `/devices/:id` | |
| POST | `/documents/upload-url` | signed upload URL |
| GET/POST | `/documents` | list (`?deviceId&kind`) / register an uploaded file |
| PATCH/DELETE | `/documents/:id` | |
| POST | `/documents/:id/recognize` | read merchant, date, products (OpenAI, cached per photo) |
| GET | `/documents/:id/url` | signed download URL (10 min) |
| GET | `/reminders` | upcoming reminders |
| PUT | `/push-tokens` | register an Expo push token |
| DELETE | `/push-tokens/:token` | on sign-out |

## Database

Migrations are in `supabase/migrations/` and are already applied to the project `dalorgewa`.
After schema changes, regenerate `src/supabase/database.types.ts`.

## Tests

```bash
npm test           # unit
npm run test:e2e   # app boots, auth guard
```
