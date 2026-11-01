# Kaif's GYM

Kaif's GYM is a single-branch gym management system for an admin/owner. The
approved application architecture is a React + Vite frontend and a Node.js +
Express modular-monolith backend with MongoDB.

The repository has implemented M0 through M5, including admin sign-in, member
management, membership plans and membership history, integrated with the
backend's cookie-based authentication. Freeze/unfreeze remains deferred pending
approved date policies. Trainers, payments, commissions and other later
modules are not implemented yet.

## Requirements

- Node.js 22.12 or newer and npm
- Git
- A reachable MongoDB instance

## Backend setup

In PowerShell, from the repository root:

```powershell
cd server
npm ci
Copy-Item .env.example .env
npm run seed:admin
npm run dev
```

Edit `server/.env` before starting: set `MONGODB_URI` to a reachable database
and replace the example `JWT_SECRET` with a private random value of at least 32
characters. The server validates configuration before connecting and starts
listening only after MongoDB connects.

The bootstrap command requires an interactive terminal. It prompts for the
admin name and email, then reads and confirms the password without echoing its
characters. Passwords must be at least 12 characters and no more than 72
UTF-8 bytes. Only one owner admin can be created; public registration is not
available.

Run backend tests with:

```powershell
npm test
```

Use `npm start` for the non-watch server process.

### Backend environment

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development`, `test`, or `production` (defaults to `development`) |
| `PORT` | HTTP port from 1 to 65535 (defaults to `5000`) |
| `MONGODB_URI` | Required `mongodb://` or `mongodb+srv://` connection URI |
| `JWT_SECRET` | Required secret with at least 32 characters |
| `JWT_EXPIRES_IN` | Required positive duration such as `15m`, `12h`, or `1d`; used for the JWT and cookie lifetime |
| `COOKIE_NAME` | Required name for the HTTP-only admin session cookie |
| `COOKIE_SECURE` | Required `true` or `false` cookie flag; must be `true` in production |
| `COOKIE_SAME_SITE` | Required `strict`, `lax`, or `none`; `none` requires secure cookies |
| `CLIENT_URL` | Required frontend HTTP(S) origin |
| `CORS_ORIGIN` | Required comma-separated HTTP(S) origin allowlist; must include `CLIENT_URL` |

Origins are matched exactly; wildcard CORS is not enabled. The backend reads
`server/.env` regardless of the current working directory. Real secrets belong
in `.env`, which Git ignores.

### API foundation

- `GET /api/v1` reports that the versioned API is available.
- `GET /api/v1/health` reports application and MongoDB connection status. It
  returns HTTP 503 when MongoDB is not connected.
- `POST /api/v1/auth/login` accepts `{ "email": "...", "password": "..." }`,
  sets the configured HTTP-only cookie and returns only the admin profile.
- `POST /api/v1/auth/logout` clears the configured cookie.
- `GET /api/v1/auth/me` returns the authenticated admin profile; it requires
  the session cookie.

Successful API responses use `{ "success": true, "message": "...", "data": ... }`.
Errors use `{ "success": false, "message": "...", "errors": [] }`; internal
errors are not returned to clients.

JWTs are signed with HS256, carry the admin ID as their subject, and are read
only from the HTTP-only cookie (not returned in JSON). Login requests are
limited to five attempts per IP per 15 minutes per server process. Invalid
credentials share a generic response; inactive admins cannot log in or
continue using a session. Protected admin routes must use the authentication
middleware.

### Member management API (M4)

All member endpoints require an authenticated admin session cookie. Members
do not receive login accounts.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/members` | Create a member |
| `GET` | `/api/v1/members` | Search, filter and paginate members |
| `GET` | `/api/v1/members/:memberId` | Get member details |
| `PATCH` | `/api/v1/members/:memberId` | Update profile fields |
| `PATCH` | `/api/v1/members/:memberId/status` | Set status to `active`, `inactive` or `archived` |

List query parameters: `page` (default 1), `limit` (default 20, maximum 100),
`search`, `status`, `sortBy` (`registrationDate`, `firstName`, `lastName`,
`memberCode`, `createdAt`, `updatedAt`) and `sortOrder` (`asc` or `desc`).
Search covers member code, names, email and phone. List responses include
pagination metadata.

Member records follow `DATABASE_DESIGN.md`: first/last name, phone, optional
email, gender, date of birth, address, profile image, emergency contact,
registration date, status, notes and timestamps. The agreed M4 profile shape
uses `address: { text }` and an optional `emergencyContact: { name, phone }`.
Local ten-digit Indian mobile numbers are normalized to `+91`; international
numbers must include a country code and use E.164 format. Emails are
lowercased; phone and email are not unique because the approved database
design only defines `memberCode` uniqueness. Generated member codes use
`KG-` plus 12 random uppercase hex characters, backed by a unique index and
collision retry.

Member indexes: unique `memberCode`, non-unique `phone` and `status`.
Administrative create, update, status and archive actions write append-only
records to `auditLogs`; audit snapshots contain member code, status and changed
field names, not profile contact values. Members are deactivated/archived, not
permanently deleted; related history is not cascaded or removed.

Member updates and their audit records are saved sequentially rather than in a
multi-document transaction to remain compatible with the project's current
standalone MongoDB setup. Audit errors are returned rather than swallowed, but
a database failure between the profile write and audit write can leave a
completed profile change without its audit record. Use a replica set and a
transaction if atomic member-plus-audit persistence becomes a deployment
requirement.

Backend tests use a unique temporary database name derived from
`MONGODB_TEST_URI` (or a local MongoDB test URI) and drop only that temporary
database after tests complete. Ensure the test MongoDB account can
create and drop databases; the normal `MONGODB_URI` development database is not
used for auth test data.

Multi-document MongoDB transactions require a replica set (including a
single-node replica set) or a sharded cluster; a standalone MongoDB server does
not support them. Future financial amounts should be represented as integer
paise, not floating-point rupees.

### Membership plans and memberships (M5)

All M5 endpoints require the authenticated admin session cookie. Plans are
deactivated rather than deleted, and membership records are immutable history
entries linked by `renewalOf`.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/membership-plans` | Search, filter and paginate plans |
| `POST` | `/api/v1/membership-plans` | Create a plan |
| `GET` | `/api/v1/membership-plans/:planId` | Get a plan |
| `PATCH` | `/api/v1/membership-plans/:planId` | Edit plan details and current price |
| `PATCH` | `/api/v1/membership-plans/:planId/status` | Activate or safely deactivate a plan |
| `GET` | `/api/v1/memberships` | Search, filter and paginate membership history |
| `GET` | `/api/v1/memberships/summary` | Return current, expired and active-plan counts |
| `GET` | `/api/v1/memberships/member/:memberId` | Get a member's membership history |
| `POST` | `/api/v1/memberships` | Assign the first plan to an existing member |
| `GET` | `/api/v1/memberships/:membershipId` | Get membership details |
| `POST` | `/api/v1/memberships/:membershipId/renew` | Create the next membership in the renewal chain |

Plan bodies use `name`, `durationMonths` (`1`, `3`, `6`, or `12`),
`pricePaise` (a non-negative safe integer), and optional `description`.
Membership assignment accepts `{ "memberId": "...", "planId": "...",
"startDate": "YYYY-MM-DD" }`. Renewal accepts `planId` and an optional
`startDate`; an early renewal always starts at the current record's expiry
boundary. A later requested date is honored after expiry, but a date before the
prior expiry is clamped to that boundary.

Dates are date-only UTC values. The start is inclusive and expiry is exclusive:
expiry is the start date plus the plan's calendar-month duration, clamped to
the target month's last day. A renewal starts at the previous expiry date,
so membership validity periods do not overlap. Membership fee and price
snapshots are stored as integer paise (`totalFeePaise`,
`amountPaidPaise`, and `outstandingBalancePaise`). Amount paid starts at zero;
payment recording and balance updates belong to a later milestone.

Memberships preserve a plan-name, duration and price snapshot. Changing the
plan later does not change existing membership records. Unique membership
sequence indexes prevent duplicate initial assignments or competing renewals.
An expiry worker synchronizes expired statuses every minute; membership list,
detail and summary requests also synchronize status before responding.
Automatic expiry is attributed to the system in the append-only audit log.
Membership and audit writes are sequential on the current standalone MongoDB;
an audit failure after a successful record write is surfaced, but the two
writes are not atomic.

Freeze/unfreeze is not implemented. Although listed in the M5 roadmap, the
project's approved documents leave its start/backdating, partial-day, overlap,
expired-membership and renewal-during-freeze policies unresolved. Payments,
refunds, trainer assignments and commission calculations are also out of scope.

## Frontend setup

In PowerShell, from the repository root:

```powershell
cd client
npm ci
Copy-Item .env.example .env
npm run dev
```

Vite prints the local URL when the development server starts. To run the
frontend checks:

```powershell
npm run lint
npm run build
```

The frontend environment example configures `VITE_API_BASE_URL` for the API
client (for example, `http://localhost:5000/api/v1`). Admin sign-in, session
restoration and logout use the backend authentication API with credentialed
requests. The backend's `CLIENT_URL` and `CORS_ORIGIN` must include the exact
frontend origin. The JWT remains in the configured HTTP-only cookie and is not
stored by the frontend in browser storage.

## Environment and secrets

Copy the relevant `.env.example` to `.env` for local work. Example secrets are
placeholders, not production credentials. Keep real values in local `.env`
files; the root `.gitignore` excludes environment files while allowing
`.env.example`.

## Repository layout

```text
client/
  src/
    components/       Shared UI, layout and member components
    contexts/         Authentication state provider
    hooks/            Shared React hooks
    layouts/          Authenticated admin shell
    pages/            Login, dashboard, member, plan and membership pages
    routes/           Public and protected route guards
    services/         Axios client and API calls
    styles/           Centralized theme tokens
    utils/            Shared error helpers
    App.jsx
    main.jsx
server/
  src/
    configs/
    controllers/
    jobs/
    middlewares/
    models/
    modules/
      audit/
      members/
      memberships/
    routes/
    scripts/
    services/
    utils/
  tests/
  package.json
AGENT_RULES.md          Agent and implementation rules
DATABASE_DESIGN.md      Database design
IMPLEMENTATION ROADMAP.md
PROJECT_MASTER.md       Product requirements
SYSTEM_ARCHITECTURE.md  Technical architecture
NOTES.md                Audit notes and verification history
```

The architecture document's proposed `docs/` directory is not created by this
setup; the existing project documents remain at the repository root.

## Project documents

Read `AGENT_RULES.md`, `PROJECT_MASTER.md`, `DATABASE_DESIGN.md`,
`SYSTEM_ARCHITECTURE.md` and `IMPLEMENTATION ROADMAP.md` before implementing
features. Work only on the approved milestone and wait for approval before
starting the next one.
