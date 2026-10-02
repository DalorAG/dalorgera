# Deploy with Coolify

Coolify builds the API from `backend/Dockerfile`, runs it, and serves it over HTTPS
(Let's Encrypt via its built-in proxy). Supabase stays managed by Supabase.

```
app ──https──> gewaga.dalostudio.com (Coolify proxy) ──> API :3000 (NestJS) ──> Supabase
```

## 1. DNS (Cloudflare)

| Type | Name   | Content                    | Proxy status |
|------|--------|----------------------------|--------------|
| A    | gewaga | `<Coolify server IPv4>`    | DNS only     |

Use *DNS only* (grey cloud) so Coolify can obtain the certificate itself.
If you switch the proxy on later, set Cloudflare SSL/TLS mode to **Full (strict)**.

## 2. New resource in Coolify

1. **+ New → Application →** your Git repository (GitHub app or public/private repo), branch `main`.
2. **Build Pack:** `Dockerfile`
3. **Base Directory:** `/backend`  ·  **Dockerfile Location:** `/Dockerfile`
4. **Ports Exposes:** `3000`
5. **Domains:** `https://gewaga.dalostudio.com`
6. **Health check:** path `/health`, port `3000` (the Dockerfile also defines one).

## 3. Environment variables

Set these under *Environment Variables* (mark the keys as secret):

| Name | Value |
|------|-------|
| `SUPABASE_URL` | `https://lunokowximvnzefgfnib.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
| `SUPABASE_SECRET_KEY` | secret key from Supabase → Project Settings → API Keys |
| `OPENAI_API_KEY` | your OpenAI key |
| `OPENAI_MODEL` | `gpt-4o-mini` |
| `REMINDERS_WORKER_ENABLED` | `true` |
| `CORS_ORIGINS` | `*` or the web app origin(s), comma separated |
| `EXPO_ACCESS_TOKEN` | optional |

`PORT` defaults to `3000`.

## 4. Deploy and check

Press **Deploy**, then:

```bash
curl https://gewaga.dalostudio.com/health      # {"status":"ok"}
open https://gewaga.dalostudio.com/docs        # API docs
```

Enable *Auto Deploy* to redeploy on every push to `main`.

## 5. Point the app at the server

```
EXPO_PUBLIC_API_URL=https://gewaga.dalostudio.com/v1
```

in `app/.env` for development, or as an EAS environment variable for builds.
If the web version is hosted, add its origin to `CORS_ORIGINS` and its URL to
Supabase → Authentication → URL Configuration → Redirect URLs.

## Notes

- Several replicas are fine: reminders are claimed with `FOR UPDATE SKIP LOCKED`.
- Database migrations live in `backend/supabase/migrations` and are applied to Supabase, not by the container.
