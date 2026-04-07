# AtVenture Deal Flow Review Portal

A full-stack deal flow review portal for AtVenture — a Dutch early-stage VC fund. IC members receive a magic link, click it, and land directly on their personal review dashboard.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** (PostgreSQL database + Auth with magic links)
- **Tailwind CSS**
- **Vercel** (deployment)

---

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **anon key** (under Settings → API).
3. Note your **service role key** (under Settings → API — keep this secret).

### 2. Run the migrations

In the Supabase dashboard go to **SQL Editor** and run the following files in order:

1. `supabase/migrations/001_schema.sql` — creates tables and RLS policies
2. `supabase/migrations/002_seed.sql` — seeds IC members and an example startup

> **Important:** Update the email addresses in `002_seed.sql` to match your team's actual email addresses before running. The emails in the seed file use `@atventure.vc` as a placeholder.

### 3. Configure Supabase Auth

In the Supabase dashboard:

1. Go to **Authentication → Settings**
2. Set **Site URL** to your production URL (e.g. `https://your-app.vercel.app`)
3. Add `http://localhost:3000/**` and `https://your-app.vercel.app/**` to **Redirect URLs**
4. (Optional) Customise the magic link email template under **Authentication → Email Templates**

### 4. Set environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ADMIN_EMAIL=laurie@atventure.vc
```

> `ADMIN_EMAIL` must exactly match the email Laurie uses to log in. This controls the admin vs. IC member routing.

### 5. Install dependencies and run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Add all five environment variables from above in the Vercel project settings.
4. Update `NEXT_PUBLIC_SITE_URL` to your Vercel deployment URL.
5. Update the **Site URL** and **Redirect URLs** in Supabase Auth settings to match your Vercel URL.
6. Deploy.

---

## How it works

### Authentication

- Users enter their email on `/login` → Supabase sends a magic link
- Clicking the link lands on `/auth/callback` which:
  - Exchanges the OTP code for a session
  - Links the Supabase auth user to their `ic_members` record (first login only)
  - Redirects admin to `/admin`, everyone else to `/review`

### IC Member flow

1. Receive magic link email → click → land on `/review`
2. See list of startups matching their sector (Health / Retail / Both)
3. Click a startup → fill in 12 scoring criteria (0–5 each)
4. Live weighted total updates as scores change
5. Select YES / MAYBE / NO recommendation
6. Save draft or submit (submitted reviews are locked)

### Admin flow (Laurie)

1. Log in with admin email → land on `/admin`
2. See overview table: all startups with aggregate scores, Y/M/N counts, overall recommendation
3. Click a startup → see per-reviewer breakdown + aggregate row
4. Add new startups via the **Add Startup** button
5. Send magic link invitations to IC members via **Send Invitations** button
6. Update startup status (pending → reviewed → invited → rejected → portco)

### Weighted score formula

```
weighted_total =
  score_market        × 0.15  +
  score_audience      × 0.075 +
  score_competition   × 0.075 +
  score_gtm           × 0.075 +
  score_value_prop    × 0.075 +
  score_financials    × 0.075 +
  score_product_ip    × 0.075 +
  score_business_model × 0.05 +
  score_team          × 0.20  +
  score_timing        × 0.05  +
  score_validation    × 0.05  +
  score_risks         × 0.05
```

Max score = 5.0

---

## IC Members (seeded)

| Name       | Email                    | IC Type |
|------------|--------------------------|---------|
| Mara       | mara@atventure.vc        | Health  |
| Warnyta    | warnyta@atventure.vc     | Health  |
| Tessa      | tessa@atventure.vc       | Both    |
| Laurie     | laurie@atventure.vc      | Both    |
| Danielle   | danielle@atventure.vc    | Retail  |
| Femke      | femke@atventure.vc       | Retail  |
| Jelena     | jelena@atventure.vc      | Health  |
| Marsha     | marsha@atventure.vc      | Health  |
| Maud       | maud@atventure.vc        | Retail  |
| Annemieke  | annemieke@atventure.vc   | Both    |

> Update emails in `supabase/migrations/002_seed.sql` before running migrations.

---

## Database schema

```
startups        id, name, one_liner, sector, pitch_deck_url, status, created_at
ic_members      id, name, email, ic_type, auth_user_id
reviews         id, startup_id, ic_member_id, score_* (×12), weighted_total,
                comments, recommendation, submitted_at, created_at, updated_at
```

Row Level Security ensures IC members can only read/write their own reviews. All admin operations use the service role key (server-side only).

---

## Project structure

```
src/
  app/
    login/          Magic link login page
    auth/callback/  OTP exchange + user linking + redirect
    review/         IC member dashboard + review form
    admin/          Admin dashboard + startup detail
    api/            REST endpoints for mutations
  components/       Shared UI components
  lib/
    supabase/       Browser / server / admin Supabase clients
    types.ts        TypeScript types
    criteria.ts     Score criteria definitions
    weighted-score.ts  Weighted total calculation
```
