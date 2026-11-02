# ADR-0017: A small footprint on Railway: Postgres sized to a 10 MB database, a smaller API heap

- **Status:** Accepted
- **Date:** 2026-11-03
- **Deciders:** Uy ("để railway 1 tháng tốn nhiêu vậy, tối ưu giúp tôi")

## Context

- **Railway bills usage** (docs.railway.com, Nov 3): RAM $10 per GB-month, CPU $20 per vCPU-month, volumes
  $0.15 per GB-month, egress $0.05 per GB. The Hobby plan is $5 a month and includes $5 of usage.
- **Measured on the first hour** ([ADR-0016](0016-deploy-railway-and-vercel.md)): `hunch-api` 103 MB and
  0.01 vCPU; Postgres 134 MB, under 0.01 vCPU, a 198 MB volume, 17 connections. About $2.80 a month, and
  RAM is nearly all of it.
- **The database is 9.5 MB,** but the Postgres template is tuned for a large machine: `shared_buffers`
  160 MB, 100 connections, 8 parallel workers, WAL up to 1 GB.
- **The worker loops must keep running,** so Railway's app sleeping doesn't fit.

## Decision

- **Postgres** (`ALTER SYSTEM`, kept on its volume): `shared_buffers` 32 MB, `max_connections` 25,
  `effective_cache_size` 128 MB, `maintenance_work_mem` 16 MB, one autovacuum worker, no parallel
  workers, WAL between 32 and 256 MB.
- **The API's pool** opens at most 4 connections and closes idle ones after 30 s.
- **Bun runs with `--smol`,** a smaller heap that collects more often; the API is mostly idle between
  loop ticks.

## Consequences

- **Less RAM on both services,** measured after the change in the deploy notes; the CPU barely moves.
- **If the database grows past a few hundred MB,** raise `shared_buffers` again.

## Links

[ADR-0016](0016-deploy-railway-and-vercel.md) · [Railway pricing](https://docs.railway.com/reference/pricing/plans)
