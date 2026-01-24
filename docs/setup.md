# Setup (PostgreSQL + Prisma)

## Environment variables

Create a `.env.local` file in the project root:

```bash
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/env_dashboard?schema=public"
```

Tip: you can copy `env.example` to `.env.local` and then adjust the URL.

## Install

```bash
pnpm install
```

If you see a pnpm warning about ignored build scripts, run:

```bash
pnpm approve-builds
```

## Prisma

```bash
pnpm prisma:generate
pnpm prisma:migrate
```

## Optional: seed demo data

```bash
pnpm prisma:seed
```

## Run

```bash
pnpm dev
```

