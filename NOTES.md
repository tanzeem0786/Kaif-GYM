# M0 — Repository Audit & Project Setup

**Date:** 2026-11-01

## Inspected

- Confirmed Git is initialized on `working-branch`, tracking
  `origin/working-branch`; the initial worktree was clean.
- Reviewed `AGENT_RULES.md`, `PROJECT_MASTER.md`,
  `SYSTEM_ARCHITECTURE.md`, `IMPLEMENTATION ROADMAP.md`, and the existence of
  `DATABASE_DESIGN.md`.
- Reviewed both package manifests and lockfiles, Vite configuration, the client
  README, and the existing Vite starter entry point.
- `client/` contains the Vite + React starter with `dev`, `build`, `lint`, and
  `preview` scripts. Its installed dependencies match its manifest.
- `server/` contains only `package.json` and `package-lock.json`. The manifest
  has no dependencies or scripts, and its declared `server.js` entry point does
  not exist. There is no backend source or runnable server.
- Before this update, no root `README.md`, `NOTES.md`, `.gitignore`, or
  frontend/backend `.env.example` existed. `client/.gitignore` covered
  `node_modules` and build output inside the client only.
- No `.env` files or tracked dependency directories were found in Git's tracked
  file list.
- The architecture proposes a `docs/` directory, but the authoritative project
  documents already exist at the root. They were left in place.

## Changed

- Added a root `.gitignore` for environment files, dependencies, build/test
  output, logs, and common local/editor files. `.env.example` remains trackable.
- Added root `README.md` with frontend setup, current backend readiness,
  environment guidance, project layout and milestone boundaries.
- Added `client/.env.example` and `server/.env.example` using the variables
  specified by `SYSTEM_ARCHITECTURE.md`; values are local examples/placeholders,
  not credentials.
- Added only the high-level backend source and test directories from the
  architecture, using `.gitkeep` files. No module implementations or models
  were generated.
- Replaced the generic Vite template text in `client/README.md` with a short
  pointer to the project setup instructions.
- Added this milestone audit and verification record.

## Verified

- Environment: Node.js `v24.21.0`, npm `11.19.0`.
- `npm ls --depth=0` in `client/`: passed; all declared top-level dependencies
  are installed.
- `npm run lint` in `client/`: passed.
- `npm run build` in `client/`: passed; Vite produced the production build.
- Vite development-server smoke test: passed; returned HTTP 200 and the
  expected React root element.
- `npm run` in `server/`: confirmed no npm scripts are configured.
- `git check-ignore` probes: `.env`, dependency directories and build output are
  ignored; both `.env.example` files remain trackable.
- Git tracked-file check: no `.env`, `node_modules`, `dist` or `coverage`
  paths are tracked. `git diff --check`: passed.
- Backend startup was not attempted: no server code or start script exists.
- No dependencies were installed.

## Pending / not in M0

- Implement the Express server, environment loading, MongoDB connection,
  middleware, health endpoint and backend checks in M1.
- Integrate the frontend API base URL when the API client is implemented.
- Reorganize the client into feature-oriented folders only when work reaches
  the frontend foundation milestone (M3).
- The architecture's proposed move of documents into `docs/` remains deferred;
  existing root documents were preserved.

---

# M1 — Backend Foundation & Database Setup

**Date:** 2026-11-01

## Dependencies installed

Installed in `server/` only:

- `express` — HTTP application and routing.
- `mongoose` — MongoDB connection/ODM foundation.
- `dotenv` — load the server-local `.env`.
- `zod` — validate runtime environment configuration.
- `helmet` — HTTP security headers.
- `cors` — enforce the configured frontend origin allowlist.
- `cookie-parser` — parse cookies for later authentication work.

Development uses Node's built-in `--watch`; tests use the built-in
`node:test` runner. No additional packages were added.

## Implemented

- Separated `src/app.js` (Express app configuration) from `src/server.js`
  (validated startup, database connection, listen and signal handlers).
- Added environment parsing from `server/.env`, with clear missing/invalid
  configuration errors and checks for port, MongoDB URI, auth-related
  placeholders, production-secure cookie settings, and HTTP(S) CORS origins.
- Added Mongoose connect/disconnect and connection-state helpers. Startup fails
  clearly if MongoDB cannot be reached; the URI and credentials are not logged.
- Added Helmet, exact-origin credentialed CORS, JSON size limit, cookie parsing,
  structured request logging without query strings, and centralized errors.
- Added versioned API root and health endpoint. Health returns HTTP 503 unless
  the Mongoose connection is established.
- Added consistent success/error response utilities, API 404 handling, and
  graceful HTTP/database shutdown.
- Kept controllers, routes, services, configs, middleware, models, utilities
  and tests separated. No business models, authentication, or frontend features
  were added.
- Documented that future money values use integer paise and multi-document
  transactions require a MongoDB replica set or sharded cluster.

## Environment variables

`NODE_ENV`, `PORT`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `COOKIE_NAME`,
`COOKIE_SECURE`, `COOKIE_SAME_SITE`, `CLIENT_URL`, and `CORS_ORIGIN`. See
`server/.env.example` and the root README for validation rules and usage.

## API endpoints

- `GET /api/v1` — versioned API availability.
- `GET /api/v1/health` — application and MongoDB connectivity; HTTP 503 when
  the database is disconnected, connecting, or disconnecting.
- Other unknown paths return a consistent JSON 404.

## Files created or modified

- Modified: `server/package.json`, `server/package-lock.json`,
  `server/.env.example`, root `README.md`, and this `NOTES.md`.
- Added configuration: `server/src/configs/environment.js`,
  `database.js`, `cors.js`.
- Added application layers: `server/src/app.js`, `server/src/server.js`,
  `controllers/health.controller.js`, `routes/api.routes.js`,
  `routes/health.routes.js`, `services/health.service.js`,
  `middlewares/requestLogger.js`, `middlewares/notFound.js`,
  `middlewares/errorHandler.js`, `utils/ApiError.js`,
  `utils/ApiResponse.js`, `utils/asyncHandler.js`,
  `utils/gracefulShutdown.js`.
- Added tests: `server/tests/environment.test.js`,
  `health.test.js`, `middleware.test.js`, `gracefulShutdown.test.js`.
- Added `server/src/models/.gitkeep` for the architecture's models directory.

## Commands and actual results

- `npm install express mongoose dotenv zod helmet cors cookie-parser` in
  `server/`: completed; installed the required runtime dependencies.
- `npm ci` in `server/`: passed from the lockfile; npm reported 0 vulnerabilities.
- `npm ls --depth=0` in `server/`: passed; all seven dependencies resolved.
- `npm run dev`, `npm start`, and `npm test` scripts are configured; development
  uses Node's built-in watch mode.
- `npm test` in `server/`: passed, 12 tests, 0 failures.
- `node --check` over all backend source and test JavaScript files: passed.
- Started `node src/server.js` with required configuration omitted: exited with
  code 1 and listed missing variable names without secret values.
- Started with a syntactically valid but unreachable MongoDB URI: startup
  exited with code 1, reported a connection failure, and did not print URI
  credentials.
- Started the CLI server with valid configuration: passed; the live health
  endpoint returned HTTP 200 with MongoDB connected.
- Connected to local MongoDB at `mongodb://127.0.0.1:27017/kaifs_gym`: passed;
  Mongoose reported `connected`.
- Live API health smoke test against that connection: passed, HTTP 200 and
  `database.status: connected`. HTTP and MongoDB connections then closed.
- API tests verified unavailable database gives HTTP 503, unknown routes give
  consistent 404, malformed JSON gives 400, and configured/unconfigured CORS
  origins receive the expected headers.
- Graceful-shutdown utility test: passed; HTTP server closed and database
  disconnect ran once. A spawned-child SIGINT attempt on Windows did not
  provide a reliable signal-handler verification; the utility itself and
  explicit HTTP/Mongo close path were verified.
- `git check-ignore` and tracked-file checks: `.env`, `node_modules`, and
  coverage output are ignored; `.env.example` remains trackable, and no
  environment secrets or dependency directories are tracked. `git diff
  --check` passed.

## Pending / not in M1

- Admin authentication and the auth-related environment values are only
  configuration placeholders; implement authentication only in M2.
- No business models or domain modules were added.
- Future transaction-based operations need MongoDB configured as a replica set
  or sharded cluster.
