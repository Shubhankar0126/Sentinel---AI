# Seed Fix Report

Date: Thursday, July 16, 2026

## Issue Confirmed

Live PostgreSQL verification showed the `users` table existed but was empty.

Query:

```sql
SELECT email, role FROM users;
```

Initial result:

```text
(0 rows)
```

## Root Cause

The shared seeding flow in `backend/app/database/seed.py` already called `ensure_default_admin()`, but the real script used for live generated-data seeding, `scripts/seed_generated_data.py`, did not.

That created two problems:

1. The validator path could appear correct because it used `seed_database()`.
2. The live seed script skipped admin creation entirely, so the real PostgreSQL `users` table stayed empty.

There was also a durability gap in `seed.py`:

- the admin insert was not committed immediately
- if a later seed stage failed before the first commit, the admin row could be rolled back

## Fix Applied

Updated:

- `backend/app/services/ingestion.py`
- `backend/app/database/seed.py`
- `scripts/seed_generated_data.py`

### `backend/app/services/ingestion.py`

`ensure_default_admin()` is now idempotent and corrective:

- creates the default admin if missing
- updates the existing admin’s:
  - name
  - password hash
  - role
  - status

This guarantees the default admin remains:

- email: `admin@sentinelai.com`
- password: `Admin123!`
- role: `ADMIN`
- status: `ACTIVE`

### `backend/app/database/seed.py`

The admin is now:

- ensured first
- committed immediately
- included in the seed summary

This prevents later ETL/seed failures from rolling back the admin insert.

### `scripts/seed_generated_data.py`

The live generated-data seed script now:

- calls `ensure_default_admin()`
- commits the admin before other seed stages
- prints the admin details in the seed result

## Live Seed Verification

Executed:

```text
python scripts/seed_generated_data.py
```

Observed result:

```text
{
  'default_admin': {'email': 'admin@sentinelai.com', 'role': 'admin'},
  'foundation': {'plant_created': 1, 'zones_created': 0, 'workers_created': 0},
  'operations': {'permits_created': 0, 'maintenance_created': 5}
}
```

## Database Verification

Query:

```sql
SELECT email, role FROM users ORDER BY email;
```

Final result:

```text
admin@sentinelai.com|ADMIN
```

## Backend Verification

Verified against the running FastAPI backend at `http://127.0.0.1:8000`:

- `POST /api/v1/auth/login` -> `200`
- `GET /api/v1/auth/me` -> `200`

Verified response identity:

- `admin@sentinelai.com`

## Frontend Login Verification

Verified the live frontend login page at:

- `http://127.0.0.1:3000/login`

Checks:

- `/login` returned `200`
- page title contained `Sentinel AI`
- existing frontend auth modules authenticated successfully against the live backend

Frontend auth verification result:

```json
{
  "loginEmail": "admin@sentinelai.com",
  "meEmail": "admin@sentinelai.com",
  "accessTokenStored": true,
  "refreshTokenStored": true
}
```

This confirms the frontend login flow succeeded with the seeded default admin.

## Final Status

- Seed scripts debugged: complete
- Missing admin insertion cause identified: complete
- `seed.py` fixed: complete
- Default admin inserted: complete
- Seeding made idempotent: complete
- SQL verification passed: complete
- Backend auth verification passed: complete
- Frontend login verification passed: complete
