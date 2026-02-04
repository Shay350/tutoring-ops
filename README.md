This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Supabase

- Apply SQL migrations from `supabase/migrations` in the Supabase SQL editor after pulling updates.
- Required env vars in `.env.local` (see `.env.example`):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase Dashboard → Authentication → URL Configuration:
  - Site URL:
    - Dev: `http://localhost:3000`
    - Prod: `https://<your-prod-domain>`
  - Additional Redirect URLs:
    - `http://localhost:3000/auth/callback`
    - `https://<your-prod-domain>/auth/callback`
- Google OAuth redirect URL template (Google Console):
  - `https://<project-ref>.supabase.co/auth/v1/callback`

## Reports & exports

- Manager reports live at `/manager/reports` (monthly summaries + CSV exports).
- CSV endpoints (manager-only, server-side): `/manager/reports/export/sessions?month=YYYY-MM` and `/manager/reports/export/session-logs?month=YYYY-MM`.
- VS6 smoke test is gated by `E2E_RUN_VS6=1`.

## Seeding test data

1) Start local Supabase (or reset): `supabase db reset`
2) Set env vars (service role required):
   - `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`)
   - `SUPABASE_SERVICE_ROLE_KEY`
   - Optional: `SEED_DEFAULT_PASSWORD` (defaults to `Password123!`)
3) Run: `npm run seed`

Seeded accounts (password = `Password123!` unless overridden):
- manager@tutorops.local (Manager)
- tutor1@tutorops.local (Tutor)
- tutor2@tutorops.local (Tutor)
- parent1@tutorops.local (Customer)
- parent2@tutorops.local (Customer)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
