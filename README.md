# PayrollAuto

Construction timekeeping app that feeds **ComputerEase** payroll.

Workers clock in/out from their phone, pick a job, and submit. The back end
enriches each entry with the department, worker class, WC code, hours type,
etc., and produces a ComputerEase-importable file.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Auth + Storage + RLS)
- Deployed on Vercel, installable as a PWA

## Roles

- **Worker** — clock in/out, sick/PTO entry, request changes, upload photos
- **Manager** — weekly approval, can override class / job / phase / cat
- **Admin** — full CRUD, password resets, ComputerEase export

## Local development

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase URL + keys
pnpm dev
```

Apply the schema:

```bash
# requires: npm i -g supabase
supabase link --project-ref <ref>
supabase db push
```

## Deploy

Connect the repo to Vercel. Set the same env vars in the Vercel project
settings. Every push to this branch deploys a preview; merges to `main` deploy
production.

## ComputerEase export

The export file matches `payroll+import+layout (2).xls` — see
`src/lib/computerease.ts` for the serializer and field widths.
