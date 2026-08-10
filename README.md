# Bilal Pharmacy Management System

End-to-end pharmacy operations platform for inventory, POS, prescriptions, purchases, customers, returns, reporting, user administration, and settings — built for Bilal Pharmacy.

## Tech stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Auth:** NextAuth.js v5 (`next-auth` beta) with Credentials + optional Google OAuth
- **Database:** PostgreSQL via Prisma ORM
- **UI:** Tailwind CSS, Radix UI, shadcn-style components, Sonner toasts
- **State / data:** TanStack Query, Zustand, React Hook Form + Zod
- **Deploy target:** Vercel (Postgres, Blob, KV, Cron)

## Features

- Role-based dashboard and navigation (ADMIN, MANAGER, PHARMACIST, CASHIER)
- Medicine & batch inventory with stock / expiry alerts
- Point of Sale (POS) with cart, payments, loyalty, and receipts
- Prescription intake and dispensing workflow
- Customer, supplier, and purchase order management
- Sales history and returns processing
- Notifications for operational alerts
- User management with role assignment and soft deactivation (ADMIN)
- Filterable audit log viewer (ADMIN)
- Pharmacy settings: profile, tax, currency, stock/expiry thresholds, receipt, loyalty
- JSON database backup export (ADMIN)
- Login audit events (`LOGIN`)

## Setup

```bash
# 1. Clone
git clone <your-repo-url>
cd "Bilal Pharmacy"

# 2. Install dependencies
npm install

# 3. Environment
cp .env.example .env
# Edit .env with your DATABASE_URL, NEXTAUTH_SECRET, etc.

# 4. Database schema
npm run db:push

# 5. Seed demo data
npm run db:seed

# 6. Dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Required environment variables

Copy from `.env.example`. Minimum for local development:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `DIRECT_URL` | Direct Postgres URL (migrations / push) |
| `NEXTAUTH_SECRET` | Auth JWT secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | App URL (e.g. `http://localhost:3000`) |

Optional: `AUTH_SECRET` (alias used by middleware), Google OAuth, Vercel Blob / KV tokens, `CRON_SECRET`.

## Demo credentials

| Email | Password | Role |
| --- | --- | --- |
| `admin@bm.com` | `passwordbmADMIN` | ADMIN |
| `admin@pharmacy.com` | `Admin@123` | ADMIN |
| `pharmacist@pharmacy.com` | `Pharma@123` | PHARMACIST |
| `cashier@pharmacy.com` | `Cashier@123` | CASHIER |
| `manager@pharmacy.com` | `Manager@123` | MANAGER |

## Vercel deployment

1. Push this repo to GitHub (`voltrix422/bilal-pharmacy`).
2. In [Vercel](https://vercel.com): **Add New Project** → import the repo.
3. **Storage → Create Database → Postgres** (or Neon). Link it to the project.
4. Set environment variables:
   - `DATABASE_URL` / `DIRECT_URL` (from Postgres)
   - `AUTH_SECRET` and `NEXTAUTH_SECRET` (same random secret)
   - `NEXTAUTH_URL` = your Vercel URL (`https://….vercel.app`)
   - Optional: `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`
5. Build uses `npm run vercel-build` which:
   - switches to the PostgreSQL Prisma schema
   - runs `prisma db push`
   - seeds users, stocked medicines, batches, and web products from `prisma/production-seed-data.json`
6. Deploy. Sign in with `admin@bm.com` / `passwordbmADMIN`.

Local development stays on SQLite (`DATABASE_URL="file:./dev.db"`).

## Role permissions matrix

| Area | ADMIN | MANAGER | PHARMACIST | CASHIER |
| --- | --- | --- | --- | --- |
| Dashboard | Yes | Yes | Yes | Yes |
| Inventory / batches | Yes | Yes | Yes | No |
| POS | Yes | Yes | Yes | Yes |
| Sales | Yes | Yes | Yes | Yes |
| Prescriptions | Yes | Yes | Yes | No |
| Customers | Yes | Yes | Yes | Yes |
| Suppliers / purchases | Yes | Yes | Yes* | No |
| Returns | Yes | Yes | Yes | No |
| Reports | Yes | Yes | Yes* | No |
| Notifications | Yes | Yes | Yes | Yes |
| Settings | Yes (edit + backup) | Yes (edit) | Read | No |
| Users & audit log | Yes | No | No | No |

\*Manager and pharmacist route access follows `middleware.ts` and sidebar nav; ADMIN has full access (`*`).

Default landing routes after login / visiting `/`:

- **ADMIN** → `/dashboard`
- **MANAGER** → `/reports`
- **PHARMACIST** → `/inventory`
- **CASHIER** → `/pos`

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start Next.js development server |
| `npm run build` | Generate Prisma client and build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | `prisma generate` |
| `npm run db:push` | Push schema to the database |
| `npm run db:migrate` | Create / apply Prisma migrations |
| `npm run db:seed` | Seed users, catalog, sales, and settings |
| `npm run db:studio` | Open Prisma Studio |

## Project structure (high level)

```
app/
  (auth)/login          # Sign-in
  (dashboard)/…         # App pages (POS, inventory, users, settings, …)
  api/                  # REST route handlers
components/             # UI, layout, feature components
lib/
  auth.ts               # NextAuth config
  api.ts                # Session helpers, audit helper, responses
  hooks/                # TanStack Query hooks
  validations/          # Zod schemas
prisma/                 # Schema + seed
middleware.ts           # Auth + role route guards
```

## License

Private / proprietary — Bilal Pharmacy internal use unless otherwise specified.
