# Kustom Kreations — Local Development Setup

## Prerequisites
- Node.js 20+ (https://nodejs.org)
- PostgreSQL 16 for Windows (installer below)

---

## 1. Install PostgreSQL on Windows

1. Download the installer from **https://www.postgresql.org/download/windows/**
   - Choose **PostgreSQL 16**, Windows x86-64
2. Run the installer — accept defaults, but **remember the password** you set for the `postgres` user
3. When asked which components to install, keep all ticked (Server, pgAdmin, Stack Builder, Command Line Tools)
4. Default port is **5432** — leave it

Once installed, open **pgAdmin** (installed alongside PostgreSQL) or use the psql command line.

### Create the database

Open **pgAdmin → right-click Databases → Create → Database**, name it `kustom_kreations`.

Or use the command line (Start Menu → "SQL Shell (psql)"):

```sql
CREATE DATABASE kustom_kreations;
```

### Run the schema

In pgAdmin: open the Query Tool on `kustom_kreations`, paste in the contents of `backend/src/db/schema.sql`, and run it.

Or via psql:

```bash
psql -U postgres -d kustom_kreations -f backend/src/db/schema.sql
```

This creates all tables and inserts the seed data (product, bulk discount tiers, shipping zones).

---

## 2. Backend

```bash
cd backend
copy .env.example .env
```

Edit `.env` — the only values you **must** set to run locally:

| Variable | What to put |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:YOUR_PASSWORD@localhost:5432/kustom_kreations` |
| `JWT_SECRET` | Any long random string (e.g. mash the keyboard) |
| `JWT_REFRESH_SECRET` | A different long random string |

Everything else can stay as-is for now. Emails will silently skip if SMTP is not configured.

Then:

```bash
npm install      # already done if you followed the initial setup
npm run dev
```

The API runs at **http://localhost:4000**

Uploaded photos are saved to `backend/uploads/` and served at `http://localhost:4000/uploads/...`

---

## 3. Frontend

```bash
cd frontend
copy .env.local.example .env.local
```

Edit `.env.local`:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` |

Then:

```bash
npm install      # already done
npm run dev
```

Frontend runs at **http://localhost:3000**

---

## 4. Payments

Stripe integration is not yet wired up — orders are created with `status: 'pending'` and no payment is taken. This will be added in a later phase. When ready, set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `backend/.env`.

---

## 5. Email (optional for dev)

Sign up for a free **Mailtrap** account (https://mailtrap.io) — it catches emails locally so you can see order confirmations without sending real emails.

Copy the SMTP credentials from Mailtrap into `backend/.env`.

---

## Project structure

```
Kustom kreations/
  frontend/      Next.js 16 app  →  http://localhost:3000
  backend/       Express API     →  http://localhost:4000
  SETUP.md       This file
```

### When you're ready to go live

| What | Where to host |
|---|---|
| Frontend | Vercel (free tier works) |
| Backend API | Railway or Render (free tiers available) |
| PostgreSQL | Railway, Supabase, or Neon (all have free tiers) |
| File storage | Switch `storage.ts` to Cloudflare R2 or AWS S3 |
