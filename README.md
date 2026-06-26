# Locations & Bookings API

A RESTful backend that manages a hierarchical tree of building locations
(Building → Floor → Room/area, arbitrary depth) and a room booking system that
validates bookings against location, department, capacity and open-hours rules.

---

## 1. Overview

- **What it does**
  - **Locations**: full CRUD over a self-referencing tree of locations. Returns
    the hierarchy as nested JSON. Structural nodes (Building/Floor/Lobby/Corridor)
    are not bookable; only leaf rooms are.
  - **Bookings**: create/list/get/cancel bookings. Every booking request runs a
    strict validation pipeline (location validity → department → capacity →
    open-hours → overlap) and returns precise error messages.
- **Tech stack**: Node.js, NestJS, TypeScript, TypeORM, PostgreSQL 16,
  class-validator/class-transformer, Swagger (`@nestjs/swagger`), Jest, Docker /
  docker-compose.
- **Time handling**: everything is UTC+0 (`TZ=UTC` in app & DB, `timestamptz`
  columns).

## 2. Prerequisites

- **Docker** + **Docker Compose v2** (`docker compose ...`). This is the only
  hard requirement for the recommended path — **no local PostgreSQL install
  needed**, Postgres runs in a container.
- For the "local without Docker" path only: **Node.js ≥ 20** (tested on Node 22)
  and npm.

## 3. Project structure

```
.
├── src/
│   ├── modules/
│   │   ├── locations/          # Location entity (closure-tree), DTOs, service, controller
│   │   └── bookings/           # Booking entity, DTOs, validation pipeline, time util
│   ├── common/
│   │   ├── filters/            # global HttpExceptionFilter (consistent error shape)
│   │   ├── interceptors/       # LoggingInterceptor (method/route/status/latency)
│   │   └── exceptions/         # domain exceptions (DepartmentMismatch, etc.)
│   ├── config/
│   │   ├── configuration.ts    # typed env access (@nestjs/config)
│   │   └── database/
│   │       ├── data-source.ts  # standalone DataSource for CLI migrations + seed
│   │       └── migrations/     # generated TypeORM migrations
│   ├── seeds/seed.ts           # idempotent Building A/B tree loader
│   ├── app.module.ts           # root module (DB + feature modules)
│   └── main.ts                 # bootstrap: ValidationPipe, filter, interceptor, Swagger
├── docs/                       # SYSTEM_DESIGN.md, DATABASE_DESIGN.md
├── Dockerfile                  # multi-stage (deps → development → builder → runner)
├── docker-compose.yml          # postgres + backend (production-like)
├── docker-compose.override.yml # dev hot-reload (auto-merged by docker compose)
├── Makefile                    # up/down/build/logs/db-shell/migrate/seed/test/...
├── .env.example                # template for .env
└── README.md
```

## 4. Environment setup

Copy the template and adjust if needed:

```bash
cp .env.example .env
```

| Variable            | Default            | Description                                                                                                                                                                                                                       |
| ------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`              | `3000`             | API port (host + container).                                                                                                                                                                                                      |
| `NODE_ENV`          | `development`      | `development` / `production` / `test`.                                                                                                                                                                                            |
| `DB_HOST`           | `postgres`         | **Keep `postgres` for the full-Docker path** (compose service name). **Set to `localhost`** for the local-without-Docker path. (The backend container also force-overrides this to `postgres` so it always works inside compose.) |
| `DB_PORT`           | `5432`             | PostgreSQL port.                                                                                                                                                                                                                  |
| `DB_USER`           | `testing`          | DB user (must match `POSTGRES_USER`).                                                                                                                                                                                             |
| `DB_PASSWORD`       | `testing_password` | DB password (must match `POSTGRES_PASSWORD`).                                                                                                                                                                                     |
| `DB_NAME`           | `testing`          | DB name (must match `POSTGRES_DB`).                                                                                                                                                                                               |
| `POSTGRES_USER`     | `testing`          | Consumed by the postgres container.                                                                                                                                                                                               |
| `POSTGRES_PASSWORD` | `testing_password` | Consumed by the postgres container.                                                                                                                                                                                               |
| `POSTGRES_DB`       | `testing`          | Consumed by the postgres container.                                                                                                                                                                                               |

## 5. Running with Docker (recommended path)

```bash
cp .env.example .env
make up        # starts postgres + backend containers
make migrate   # runs TypeORM migrations against the postgres container
make seed      # loads sample Building A / B location tree
```

- API: **http://localhost:3000**
- Swagger docs: **http://localhost:3000/api/docs**

> `make up` uses `docker-compose.override.yml` automatically, so the backend
> runs in hot-reload (`start:dev`) mode with dev dependencies available — which
> is what lets `make migrate` / `make seed` run via `ts-node` inside the
> container. The base `docker-compose.yml` alone builds the production image
> (compiled `dist`, no dev deps).
>
> Tip: wait until `make logs` shows "Nest application successfully started"
> before running `make migrate`.

## 6. Running locally without Docker (alternative path)

Run only the database in Docker, but run Nest on your host:

```bash
docker compose up -d postgres
npm install
npm run migration:run
npm run seed
npm run start:dev
```

> **Gotcha — `DB_HOST`:** for this path `DB_HOST` must be **`localhost`** in
> `.env` (the host reaches the mapped container port). For the full-Docker path
> it should be **`postgres`** (the compose service name). This is the single
> most common setup mistake — set it correctly for the path you choose.

## 7. Database migrations — detailed

Schema is managed exclusively by migrations; `synchronize` is **`false`** in all
environments so every schema change is explicit, reviewable in version control,
and reproducible. The app never silently alters the schema at boot.

- **Generate** a migration from entity changes (diffs against a running DB):

  ```bash
  npm run migration:generate -- src/config/database/migrations/<Name>
  ```

- **Run** pending migrations:

  ```bash
  npm run migration:run     # locally
  make migrate              # inside the Docker backend container
  ```

- **Revert** the last migration:

  ```bash
  npm run migration:revert
  ```

The initial migration also enables the `uuid-ossp` extension (for
`uuid_generate_v4()`) and creates the `locations`, `locations_closure` and
`bookings` tables with their indexes.

## 8. Seeding data

`make seed` (or `npm run seed`) loads the sample hierarchy:

- **Building A** → Floor 1 (Lobby, Meeting Room 1 `EFM`/8, Meeting Room 2
  `EFM`/4), Floor 2 (Corridor, Room 201 `HR`/10 → Phone Booth `HR`/2 — showing
  arbitrary depth).
- **Building B** → Floor 1 (Conference Hall `SALES`/50, IT War Room `IT`/6).

The seed is **idempotent**: it upserts by `locationNumber`, so re-running it
won't create duplicates — existing nodes are skipped. It's safe on a fresh DB
and safe to re-run.

## 9. API summary

Full request/response schemas are in Swagger at `/api/docs`.

| Method | Path                   | Description                                                             |
| ------ | ---------------------- | ----------------------------------------------------------------------- |
| POST   | `/locations`           | Create a location node (parentId required unless root Building).        |
| GET    | `/locations`           | Full location tree as nested JSON.                                      |
| GET    | `/locations/:id`       | One location; `?subtree=true` includes its descendants.                 |
| PATCH  | `/locations/:id`       | Update attributes (name, capacity, openTime, department, …).            |
| DELETE | `/locations/:id`       | Delete a node; `409` if it has children or active (CONFIRMED) bookings. |
| POST   | `/bookings`            | Create a booking (runs the full validation pipeline).                   |
| GET    | `/bookings`            | List bookings; filter by `locationId`, `department`, `from`, `to`.      |
| GET    | `/bookings/:id`        | Get one booking.                                                        |
| PATCH  | `/bookings/:id/cancel` | Cancel a booking.                                                       |
| DELETE | `/bookings/:id`        | Cancel a booking (alias of the PATCH cancel).                           |

**Booking validation order** (first failure wins): location exists & bookable →
department match → capacity → open-hours/day-of-week (& `end > start`) → overlap
with existing CONFIRMED bookings. Errors are `400` (rule violations / not
bookable), `404` (location not found), `409` (overlap).

All errors share one shape:

```json
{
  "statusCode": 400,
  "message": "Capacity exceeded: room capacity is 8 but 20 attendees were requested.",
  "error": "Bad Request",
  "timestamp": "2026-07-01T09:00:00.000Z",
  "path": "/bookings"
}
```

## 10. Running tests

```bash
make test         # or: npm run test
npm run test:cov  # with coverage
```

Unit tests cover the booking validation core: department mismatch, capacity
exceeded, outside open hours, overlap, a fully valid booking, and the pure
time/day-of-week util.

## 11. Design docs

- [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md) — architecture, module
  breakdown, closure-table choice & tradeoffs, validation pipeline, exception &
  logging wiring, component diagram.
- [`docs/DATABASE_DESIGN.md`](docs/DATABASE_DESIGN.md) — ER diagram (mermaid),
  table columns/types/constraints, indexes, `openTime` JSON shape.

## 12. Useful Makefile commands

| Target          | What it does                                               |
| --------------- | ---------------------------------------------------------- |
| `make up`       | `docker compose up -d` (start postgres + backend).         |
| `make down`     | `docker compose down` (stop & remove containers).          |
| `make build`    | `docker compose build` (build/rebuild the backend image).  |
| `make logs`     | `docker compose logs -f backend` (tail backend logs).      |
| `make db-shell` | `psql` shell inside the postgres container.                |
| `make migrate`  | Run TypeORM migrations inside the backend container.       |
| `make seed`     | Load the sample Building A / B tree.                       |
| `make test`     | Run Jest unit tests (on the host).                         |
| `make restart`  | `down` then `up`.                                          |
| `make clean`    | `docker compose down -v` (also wipes the Postgres volume). |
