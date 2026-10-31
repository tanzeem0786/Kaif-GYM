# Kaif's GYM

Kaif's GYM is a single-branch gym management system for an admin/owner. The
approved application architecture is a React + Vite frontend and a Node.js +
Express modular-monolith backend with MongoDB.

The repository has completed M0 and M1. The frontend remains the Vite starter
application; the backend now provides an Express API foundation and MongoDB
connection. Admin authentication and business modules are not implemented yet.

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
npm run dev
```

Edit `server/.env` before starting: set `MONGODB_URI` to a reachable database
and replace the example `JWT_SECRET` with a random value of at least 32
characters. The server validates configuration before connecting and starts
listening only after MongoDB connects.

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
| `JWT_SECRET` | Required secret with at least 32 characters; reserved for authentication work |
| `JWT_EXPIRES_IN` | Required JWT lifetime setting; reserved for authentication work |
| `COOKIE_NAME` | Required cookie name; reserved for authentication work |
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

Successful API responses use `{ "success": true, "message": "...", "data": ... }`.
Errors use `{ "success": false, "message": "...", "errors": [] }`; internal
errors are not returned to clients.

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

The frontend environment example reserves `VITE_API_BASE_URL` for the API
client; the current starter UI does not yet make API requests.

## Environment and secrets

Copy the relevant `.env.example` to `.env` for local work. Example secrets are
placeholders, not production credentials. Keep real values in local `.env`
files; the root `.gitignore` excludes environment files while allowing
`.env.example`.

## Repository layout

```text
client/
  public/
  src/
    assets/
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

The client currently retains the Vite starter layout. Feature-oriented frontend
folders in the architecture are deferred until the frontend foundation
milestone (M3).

The architecture document's proposed `docs/` directory is not created by this
setup; the existing project documents remain at the repository root.

## Project documents

Read `AGENT_RULES.md`, `PROJECT_MASTER.md`, `DATABASE_DESIGN.md`,
`SYSTEM_ARCHITECTURE.md` and `IMPLEMENTATION ROADMAP.md` before implementing
features. Work only on the approved milestone and wait for approval before
starting the next one.
