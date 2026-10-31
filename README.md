# Kaif's GYM

Kaif's GYM is a single-branch gym management system for an admin/owner. The
approved application architecture is a React + Vite frontend and a Node.js +
Express modular-monolith backend with MongoDB.

The repository has completed M0 through M3. The frontend provides a responsive
admin sign-in and dashboard foundation integrated with the backend's cookie-based
authentication. Business management modules are not implemented yet.

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

Backend tests use a unique temporary database name derived from
`MONGODB_TEST_URI` (or a local MongoDB test URI) and drop only that temporary
database after the auth tests complete. Ensure the test MongoDB account can
create and drop databases; the normal `MONGODB_URI` development database is not
used for auth test data.

Multi-document MongoDB transactions require a replica set (including a
single-node replica set) or a sharded cluster; a standalone MongoDB server does
not support them. Future financial amounts should be represented as integer
paise, not floating-point rupees.

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
    components/       Shared UI and layout components
    contexts/         Authentication state provider
    hooks/            Shared React hooks
    layouts/          Authenticated admin shell
    pages/            Login and dashboard pages
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
