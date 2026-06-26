# System Design

## 1. Overview

A RESTful backend (NestJS + TypeORM + PostgreSQL) that manages:

1. A **hierarchical tree of building locations** (Building → Floor → Room/area) of
   arbitrary depth.
2. A **room booking system** that validates every booking against location,
   department, capacity and open-hours rules (plus an overlap check).

All timestamps are handled in **UTC+0** end-to-end: the Node process sets
`TZ=UTC`, the Postgres container runs with `TZ=UTC`/`PGTZ=UTC`, and all
time columns are `timestamptz`.

## 2. Module breakdown

```
AppModule
├── ConfigModule (global)            # @nestjs/config, typed configuration()
├── TypeOrmModule.forRootAsync       # DB connection from ConfigService, synchronize:false
├── LocationsModule
│   ├── LocationsController          # REST endpoints /locations
│   ├── LocationsService             # CRUD + tree retrieval + delete guards
│   └── entities/Location            # @Tree('closure-table') self-referencing node
└── BookingsModule
    ├── BookingsController           # REST endpoints /bookings
    ├── BookingsService              # validation pipeline + persistence
    ├── booking-time.util            # pure open-hours / day-of-week logic (unit-tested)
    └── entities/Booking             # FK -> Location, status enum

common/
├── filters/HttpExceptionFilter      # global, consistent error shape
├── interceptors/LoggingInterceptor  # method/route/status/latency logging
└── exceptions/domain.exceptions     # DepartmentMismatch, CapacityExceeded, ...

config/
├── configuration.ts                 # typed env access
└── database/
    ├── data-source.ts               # standalone DataSource for CLI (migrations/seed)
    └── migrations/                  # generated SQL migrations
seeds/seed.ts                        # idempotent Building A/B tree loader
```

### Component diagram (request flow)

```
            ┌─────────────────────── HTTP request ───────────────────────┐
            ▼                                                             │
   LoggingInterceptor ──► ValidationPipe (DTO) ──► Controller ──► Service │
            │                    (whitelist,                │             │
            │                 forbidNonWhitelisted)         ▼             │
            │                                          TypeORM Repos      │
            │                                               │             │
            │                                          PostgreSQL         │
            ▼                                                             │
   HttpExceptionFilter ◄──────────── throws (HttpException/Error) ◄───────┘
   (consistent JSON error: statusCode, message, error, timestamp, path)
```

## 3. Tree storage strategy: closure-table

We use TypeORM's `@Tree('closure-table')` strategy on `Location`. TypeORM
maintains a separate `locations_closure` table holding **every
ancestor → descendant pair** (including self-links). The main `locations` table
also keeps a `parentId` for the direct parent.

### Why closure-table

| Strategy                         | "Get full subtree"        | Inserts            | Re-parenting            | Notes                                          |
| -------------------------------- | ------------------------- | ------------------ | ----------------------- | ---------------------------------------------- |
| Adjacency list (`parentId` only) | Recursive CTE / N queries | cheap              | cheap                   | simplest, but subtree reads are recursive      |
| Materialized path                | `LIKE 'A.B.%'`            | cheap              | path rewrite of subtree | string-based, path maintenance                 |
| **Closure-table (chosen)**       | **single join, indexed**  | extra closure rows | rewrite closure rows    | natively supported by Nest/TypeORM, fast reads |

The assignment explicitly prefers closure-table, and the dominant read pattern
here is "fetch a building's whole subtree" (`GET /locations`,
`GET /locations/:id?subtree=true`). Closure-table makes those reads a single
indexed query via `TreeRepository.findTrees()` / `findDescendantsTree()` without
hand-written recursion. The tradeoff is extra write amplification (closure rows
per node) and more complex re-parenting — acceptable since the hierarchy is
mostly read, rarely restructured. For that reason `PATCH /locations/:id`
intentionally does **not** support changing `parentId`.

## 4. Booking validation pipeline

`POST /bookings` runs these checks **in order**; the first failure throws a
specific exception and short-circuits:

1. **Location validity** — location exists (`404`) and `isBookable === true`
   (`400 LocationNotBookableException`). Structural nodes (Floor/Lobby/Corridor)
   are rejected.
2. **Department matching** — `booking.department === location.department`
   (`400 DepartmentMismatchException`).
3. **Capacity** — `booking.attendees <= location.capacity`
   (`400 CapacityExceededException`).
4. **Time validation** (`booking-time.util.assertWithinOpenHours`, all UTC):
   - `endTime > startTime`,
   - start and end on the same UTC calendar day,
   - day-of-week ∈ `openTime.days`,
   - `[start,end]` time-of-day ⊆ `[openTime.startTime, openTime.endTime]`
     (`400 OutsideOpenHoursException`).
5. **Overlap check** (design addition) — no existing **CONFIRMED** booking on the
   same location intersects the requested interval, using the standard
   `existing.start < new.end AND existing.end > new.start` predicate
   (`409 BookingOverlapException`).

On success a `CONFIRMED` booking is persisted.

### Design decision — `rejectionReason` / REJECTED status

Failed validations return an HTTP error (`400`/`404`/`409`) and are **not
persisted**. This keeps the `bookings` table clean (no row-per-failed-attempt)
and gives the caller an immediate, specific message. The `rejectionReason`
column and `REJECTED` enum value are retained in the schema so the system can
later record audit rows for asynchronous/approval-style flows without a
migration. `CANCELLED` is used by the cancel endpoint.

The time util is a **pure function** (no DB), which is why the unit tests can
exercise the core business logic directly and quickly.

## 5. Exception handling

`HttpExceptionFilter` (`@Catch()`) catches both `HttpException` and any
unhandled error and returns a consistent body:

```json
{
  "statusCode": 400,
  "message": "...",
  "error": "Bad Request",
  "timestamp": "2026-07-01T09:00:00.000Z",
  "path": "/bookings"
}
```

5xx are logged at `error` level (with stack), 4xx at `warn`. Domain exceptions
in `common/exceptions/domain.exceptions.ts` extend `BadRequestException` /
`ConflictException`, so they map to the right status automatically while
carrying clear messages.

## 6. Logging

`LoggingInterceptor` logs `METHOD /url STATUS +<ms>` for every request via the
NestJS `Logger` (channel `HTTP`). Errors additionally surface through the filter.
No `console.log` is used in application code (only the standalone seed script
prints progress to stdout).

## 7. Configuration

`@nestjs/config` loads `.env` and a typed `configuration()` factory. The app
connection is built in `TypeOrmModule.forRootAsync` from `ConfigService`. A
separate `data-source.ts` reads `process.env` (via `dotenv`) for the TypeORM CLI
(migrations) and the seed script. `synchronize` is **false** everywhere — schema
changes are explicit, reviewable migrations.
