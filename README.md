# BotForge

A no-code Telegram bot builder platform. Users can create, configure, deploy, and manage
production-ready Telegram bots through a simple web interface — no code required.

## Repository Structure

```
botforge/
├── apps/
│   ├── web/        # Next.js frontend (deployed to Vercel)
│   ├── api/        # NestJS backend API (deployed to VPS)
│   └── worker/     # BullMQ async job worker (deployed to VPS)
├── packages/
│   ├── shared/     # Shared TypeScript types, enums, constants
│   └── templates/  # Bot template definitions and schemas
└── prisma/         # Database schema (PostgreSQL via Prisma)
```

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker (for local PostgreSQL + Redis)

## Local Development Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start infrastructure (PostgreSQL + Redis)

```bash
docker-compose up -d
```

### 3. Configure environment variables

```bash
# Root (used by Prisma CLI)
cp .env.example .env

# API
cp apps/api/.env.example apps/api/.env

# Worker
cp apps/worker/.env.example apps/worker/.env

# Web
cp apps/web/.env.example apps/web/.env.local
```

### 4. Initialize database

```bash
pnpm db:generate   # Generate Prisma client
pnpm db:push       # Push schema to database (dev only)
# or
pnpm db:migrate    # Run migrations (production-style)
```

### 5. Start services (each in a separate terminal)

```bash
pnpm dev:web       # Frontend  → http://localhost:3000
pnpm dev:api       # API       → http://localhost:3001/api/v1
pnpm dev:worker    # Worker    → connects to Redis queue
```

## Key Endpoints

| Endpoint                    | Description          |
|-----------------------------|----------------------|
| `GET /api/v1/health`        | API health check     |

## Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | Next.js 14, TypeScript, Tailwind CSS    |
| Backend   | NestJS 10, TypeScript, Prisma 5         |
| Worker    | Node.js, BullMQ, ioredis                |
| Database  | PostgreSQL 16                           |
| Queue     | Redis 7 + BullMQ                        |
| Payments  | Stripe Checkout (Layer 2)               |
| Hosting   | Vercel (web) + VPS (api, worker, bots)  |
