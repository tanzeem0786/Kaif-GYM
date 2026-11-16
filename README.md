# Barbell Arena

Barbell Arena is a single-branch gym management system for an admin/owner. The
approved application architecture is a React + Vite frontend and a Node.js +
Express modular-monolith backend with MongoDB.

The repository has implemented M0 through M7 and M8 Phase 1, including admin
sign-in, member management, membership plans and history, trainer profiles and
assignments, payment ledger management, and versioned trainer commission
agreements. Freeze/unfreeze remains deferred pending approved date policies.
Commission calculations, adjustments, statements and payouts are not
implemented.

The approved backend architecture refactor (Phases 1–6) is complete. See
`REFACTOR_NOTES.md` for the module-by-module changes and final verification.

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

### Backend architecture

`server.js` loads configuration, connects to MongoDB, starts the Express
application and expiry job, and handles shutdown. `app.js` assembles shared
middleware and the versioned API router. Module routes validate and dispatch
requests; controllers handle HTTP flow and straightforward queries; services
are limited to multi-step business rules and consistency-sensitive operations.
Mongoose models live with their modules. Shared infrastructure is kept in
`configs/`, `middlewares/`, and `utils/`.

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
| `PATCH` | `/api/v1/members/:memberId/status` | Set status to `active` or `inactive` |
| `DELETE` | `/api/v1/members/:memberId` | Permanently delete a member when no active membership or trainer assignment exists |

List query parameters: `page` (default 1), `limit` (default 20, maximum 100),
`search`, `status`, `sortBy` (`registrationDate`, `fullName`, `memberCode`,
`createdAt`, `updatedAt`) and `sortOrder` (`asc` or `desc`). Search covers
member code, full name, father's name, email and phone. List responses include
pagination metadata.

Member records include required full name and father's name, phone, optional
email, gender, date of birth, address, profile image, emergency contact,
registration date, status, notes and timestamps. The profile shape uses
`address: { text }` and an optional `emergencyContact: { name, phone }`.
Local ten-digit Indian mobile numbers are normalized to `+91`; international
numbers must include a country code and use E.164 format. Emails are
lowercased; phone and email are not unique because the approved database
design only defines `memberCode` uniqueness. Member codes are six characters:
`BA` followed by a four-digit sequence, starting at `BA0001`. The next code is
selected after the highest code currently used by a member or retained history.
The unique member-code index and retry on duplicate-key conflicts protect
concurrent creation. Creation returns HTTP 409 if all 9,999 sequence values
have been used.

Member indexes: unique `memberCode`, non-unique `phone` and `status`.
Administrative create, update, status and deletion actions write append-only
records to `auditLogs`. Permanent deletion never removes payments, audit logs,
memberships or trainer assignments. Historical membership, payment and
assignment records retain a member-name snapshot. Deletion is rejected while
an active membership or trainer assignment exists. Member status is active or
inactive; there is no archive workflow.

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
so membership validity periods do not overlap. Membership fee and price snapshots are stored as integer paise
(`totalFeePaise`, `amountPaidPaise`, and `outstandingBalancePaise`). Amount
paid starts at zero and is reconciled as payment ledger entries are recorded.

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

## Trainer and trainer assignment API (M6)

All trainer endpoints require the authenticated admin session cookie. Trainer
profiles can be deactivated but are not permanently deleted. Deactivating a
trainer does not end existing assignments; an inactive trainer cannot receive
new assignments.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/trainers` | Create a trainer profile |
| `GET` | `/api/v1/trainers` | Search, filter and paginate trainers |
| `GET` | `/api/v1/trainers/:trainerId` | Get trainer details |
| `PATCH` | `/api/v1/trainers/:trainerId` | Update trainer profile fields |
| `PATCH` | `/api/v1/trainers/:trainerId/status` | Activate or deactivate a trainer |
| `POST` | `/api/v1/trainer-assignments` | Assign a trainer to a member |
| `GET` | `/api/v1/trainer-assignments` | Search, filter and paginate assignments |
| `GET` | `/api/v1/trainer-assignments/member/:memberId` | Get a member's assignment history |
| `GET` | `/api/v1/trainer-assignments/trainer/:trainerId` | Get a trainer's assignment history |
| `GET` | `/api/v1/trainer-assignments/:assignmentId` | Get assignment details |
| `PATCH` | `/api/v1/trainer-assignments/:assignmentId/end` | End an active assignment |

Trainer profiles include a generated `BAT-` code, names, normalized phone,
optional email and image URL, specializations, joining date, status and
administrative notes. Assignment bodies require `memberId`, `trainerId` and
supporting `proof: { url, fileName }`; proof is an HTTPS reference and display
filename, not an uploaded file. The assignment start date is an admin-selected
UTC date, may be past or future, and defaults to today. The end date is
admin-selected, must be on or after the start date, and is the last active day.
Multiple independent records for the same member/trainer pair are allowed,
including concurrent records. Ending an assignment preserves its proof and
history; no assignment or trainer hard-delete API exists.

Trainer indexes include unique `trainerCode` and `status`. Assignment indexes
cover member/status, trainer/status and start-date history for each party.
Trainer and assignment operations write append-only audit events. Record and
audit writes are sequential for compatibility with standalone MongoDB; they
are not an atomic multi-document transaction.

## Payment management API (M7)

All payment endpoints require an authenticated admin session. Payments apply
to a membership and are recorded as positive integer paise. Cash and UPI are
supported; payment amounts cannot exceed the current outstanding membership
balance. A required idempotency key prevents duplicate request processing.
An exact retry returns the saved transaction; reusing the key with a different
request is rejected.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/payments` | Record a full or partial payment |
| `GET` | `/api/v1/payments` | Search, filter and paginate payment/correction records |
| `GET` | `/api/v1/payments/member/:memberId` | View member payment history |
| `GET` | `/api/v1/payments/:paymentId` | View transaction details and linked reversals |
| `GET` | `/api/v1/payments/:paymentId/receipt` | Get printable receipt data |
| `POST` | `/api/v1/payments/:paymentId/reversals` | Record a partial or full ledger reversal |

Payment requests use `membershipId`, `amountPaise`, `paymentMethod` (`cash` or
`upi`), `idempotencyKey`, and optional UTC `paymentDate`, UPI `referenceNumber`
and notes. Reversal requests require `amountPaise` and a distinct
`idempotencyKey`. Each reversal is a separate linked record. Reversals can be
split into multiple corrections, but their cumulative value cannot exceed the
original payment. A fully reversed payment cannot be reversed again. These
records correct the gym's ledger and membership balance; they do not initiate
or represent external cash/UPI payouts.

Payment list filters include `memberId`, `membershipId`, `paymentMethod`,
`status`, `type`, `fromDate`, `toDate` and `search`, plus standard pagination
and sorting. Receipt data is rendered in a print-friendly frontend receipt
screen; no PDF generation dependency is used.

Payment and membership balance/audit operations use a MongoDB transaction when
connected to a replica set or sharded cluster. Standalone MongoDB does not
support multi-document transactions; on standalone, conditional balance
updates and compensating operations are used, so a process or database failure
mid-operation cannot provide the same atomicity. Use a replica set for
production financial writes requiring atomic transaction guarantees.

## Commission agreement management API (M8 Phase 1)

All commission agreement endpoints require an authenticated admin session.
Agreements are individual to each trainer. Creating a version appends a new
immutable record; prior versions are not edited or deleted. This phase records
only the approved commission basis (`membership_fee` or `received_payment`)
and effective dates (`YYYY-MM-DD`). An omitted `effectiveTo` means no end date
is recorded.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/commission-agreements/trainers/:trainerId` | Create the next agreement version for a trainer |
| `GET` | `/api/v1/commission-agreements/trainers/:trainerId` | List a trainer's agreement history with pagination |
| `GET` | `/api/v1/commission-agreements/:agreementId` | View agreement details |

Rates, commission types/units, custom formulas, calculation timing, statements,
adjustments and payouts are intentionally not captured or calculated until
their pending business rules are approved. Effective-date overlap precedence
is also not resolved in this phase.

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
    components/       Shared UI, layout, member, membership, trainer, payment and agreement components
    contexts/         Authentication state provider
    hooks/            Shared React hooks
    layouts/          Authenticated admin shell
    pages/            Login, dashboard, member, membership, trainer, payment and agreement pages
    routes/           Public and protected route guards
    services/         Axios client and API calls
    styles/           Centralized theme tokens
    utils/            Shared error helpers
    App.jsx
    main.jsx
server/
  src/
    app.js
    server.js
    modules/
      audit/
      assignments/
      auth/
      commissions/
      members/
      memberships/
        models/
      payments/
      trainers/
    configs/
    jobs/
    middlewares/
    routes/
    scripts/
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
