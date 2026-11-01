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

---

# M2 — Admin Authentication & Security

**Date:** 2026-11-01

## Implemented

- Added the Mongoose Admin model with normalized/validated email, unique email
  index, hidden bcrypt password hash, active status, timestamps, and a hidden
  unique owner bootstrap key. The owner key enforces the one-admin bootstrap
  rule even if two CLI attempts race.
- Passwords use bcrypt with 12 salt rounds. Login uses a dummy bcrypt hash for
  unknown accounts so that path still performs a password comparison.
  Plaintext passwords and hashes are never returned or logged.
- Added an interactive `npm run seed:admin` CLI. It refuses to run without a
  TTY, masks password input, confirms the password, validates the account,
  checks for an existing admin and handles duplicate-key races.
- Added `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, and
  `GET /api/v1/auth/me`. There is no registration endpoint.
- JWTs use HS256, the admin ID subject, issuer/audience checks, and configured
  expiry. The token exists only in the configured HTTP-only cookie. Cookie
  `Secure`, `SameSite`, `Path`, and expiry are applied consistently on login
  and logout.
- Added reusable cookie-based admin authentication middleware. It rejects
  missing, invalid, expired, deleted, and inactive-admin sessions.
- Login is limited to five attempts per IP per 15 minutes per process and uses
  standard rate-limit headers. Input is validated with Zod; passwords are
  limited to bcrypt's 72-byte input limit and bootstrap passwords require at
  least 12 characters.
- Authentication is mounted on the existing versioned API with production
  configuration. M1 health handling, database connection, CORS and error
  conventions remain in place.

## Security decisions

- A unique hidden `bootstrapKey` index enforces the single owner account
  requirement independently of email uniqueness and protects concurrent seed
  attempts.
- Admin profiles are allowlisted (`id`, `name`, `email`); password hashes,
  cookie JWTs, and secrets are excluded from API responses and request logs.
- Tokens are accepted only from the configured cookie and verified for
  HS256, issuer, audience, and expiration.
- Login failures return the same unauthorized response for unknown, inactive,
  or incorrect credentials. Missing/malformed request fields return the
  existing consistent validation response.
- Production environment validation requires secure cookies; SameSite behavior
  follows `COOKIE_SAME_SITE`, and `SameSite=None` requires `Secure`.
- No public registration, reset flow, OTP, member authentication or trainer
  authentication was added.

## Environment and API

- Existing backend environment variables are retained. `JWT_EXPIRES_IN` now
  validates a positive duration such as `15m`, `12h`, or `1d`; it is converted
  to seconds and shared by JWT expiry and cookie max-age.
- `npm run seed:admin` creates the first admin from interactive input. The
  password is masked and confirmed; the command requires a reachable MongoDB
  and a TTY.
- `POST /api/v1/auth/login` — validate credentials and set the auth cookie.
- `POST /api/v1/auth/logout` — clear the configured cookie.
- `GET /api/v1/auth/me` — protected current-admin profile.
- No registration route exists.

## Files created or modified

- Modified: `server/package.json`, `server/package-lock.json`,
  `server/.env.example`, `server/src/configs/environment.js`,
  `server/src/app.js`, `server/src/server.js`,
  `server/src/routes/api.routes.js`, root `README.md`, and this `NOTES.md`.
- Added `server/src/modules/auth/admin.model.js`,
  `auth.validation.js`, `auth.service.js`, `admin.service.js`,
  `auth.middleware.js`, `auth.controller.js`, and `auth.routes.js`.
- Added `server/src/scripts/bootstrapAdmin.js` and
  `server/tests/auth.test.js`.

## Dependencies installed

- `bcrypt` — password hashing and comparison.
- `jsonwebtoken` — signed, expiring admin sessions.
- `express-rate-limit` — per-IP login throttling.

Existing Express, Mongoose, Zod, cookie-parser and middleware dependencies were
reused. No frontend or unrelated dependencies were added.

## Commands and actual test results

- `npm install bcrypt jsonwebtoken express-rate-limit` in `server/`: passed;
  npm reported 0 vulnerabilities.
- `npm ci` in `server/` after the dependency change: passed; npm reported 0
  vulnerabilities and warned that the bcrypt install script was not approved.
- bcrypt native module/hash/compare smoke check: passed.
- `npm test -- --test-reporter=tap` in `server/`: passed, 23 tests, 0 failures.
  Auth tests use a process-unique temporary MongoDB database derived from
  `MONGODB_TEST_URI` (default: local MongoDB) and drop only that test database.
- Live CLI server smoke test: passed; MongoDB health returned HTTP 200 and
  unauthenticated `GET /api/v1/auth/me` returned HTTP 401.
- Auth integration coverage includes concurrent duplicate bootstrap, normalized
  email login, cookie flags/expiry, missing and invalid credentials, inactive
  admin, missing/invalid/expired JWT, protected `/me`, logout cookie clearing,
  and login rate limiting.

## Pending / not in M2

- The bootstrap CLI's real interactive password prompt was not manually
  exercised; the bootstrap service and duplicate-prevention path were tested
  against the isolated test database.
- Future admin-only modules still need to attach the reusable authentication
  middleware to their protected routes.
- The default in-memory rate-limit store is process-local; use a shared store if
  the API is later deployed across multiple instances.
- Frontend login/UI remained outside M2 scope; it is implemented in the M3
  section below.

## M3 — Frontend Foundation & Dashboard Layout

### Frontend architecture

- Replaced the Vite starter screen with a React Router application and a
  responsive admin login/dashboard foundation.
- Added `components/common` for buttons, cards, badges, text fields and loading
  UI; `components/layout` for branding and sidebar navigation; `layouts` for the
  authenticated shell; `pages/auth` and `pages/dashboard`; `routes` for public
  and protected guards; `contexts` and `hooks` for auth state; `services` for
  Axios and auth API calls; `utils` for API error messages; and `styles` for
  the centralized theme.
- Future navigation items are visibly marked as coming soon. The dashboard
  displays placeholders, not invented member, revenue or other business
  metrics.
- The legacy `src/style/theme.css` path remains as an import of the canonical
  `src/styles/theme.css`.

### Theme and dependencies

- Confirmed Tailwind CSS v4.3.3 and integrated it through `@tailwindcss/vite`
  and CSS-first `@theme inline` mappings; no competing Tailwind config was
  added.
- Central `:root` properties in `client/src/styles/theme.css` define the
  background, sidebar, surfaces, primary/secondary/muted text, border, primary
  action, focus/hover, success/warning/danger/info and overlay colors. Tailwind
  semantic utilities map to these values.
- Added `react-router-dom` for routing, `axios` for API calls, `lucide-react`
  for icons, and `tailwindcss` plus its Vite plugin for styling. React, Vite
  and existing lint dependencies were reused.
- The production dependency audit reported zero vulnerabilities. The full npm
  audit reported six moderate findings in existing development tooling through
  ESLint/minimatch; npm reported no available fix. No forced or unrelated
  dependency upgrades were made.

### Authentication integration

- Axios reads `VITE_API_BASE_URL` and sends requests with `withCredentials:
  true`; it does not persist the JWT or credentials in browser storage.
- The auth provider restores the session with `GET /auth/me`, keeps admin
  profile state in memory, handles loading/unauthorized/server-error states,
  and exposes login/logout actions.
- Login, logout and session restoration use the existing `/api/v1/auth/*`
  endpoints. Protected routes redirect to login; session-restoration server
  errors offer a retry. Logout only clears local auth state after the backend
  confirms logout.
- Login includes browser email/password validation, visibility toggle,
  loading feedback and API error feedback. No registration, reset, OTP, member
  or trainer auth was added.
- Live CORS smoke checks from `http://localhost:5173` received the configured
  exact `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials`
  headers. Backend health returned HTTP 200 with MongoDB connected. A real
  invalid-credentials login returned the expected error through the frontend.
  Successful real-admin login was not attempted; interactive development
  credentials were not used or inspected. Existing M2 tests cover cookie
  security flags and logout clearing.

### Environment, files and verification

- `client/.env.example` already configures `VITE_API_BASE_URL`; it was retained.
  Real `.env` files were not inspected or modified. `git check-ignore -v` confirmed
  `client/.env` and `server/.env` are ignored, and both `.env.example` files
  remain trackable.
- Root README now documents the M3 frontend setup, authentication integration
  and updated client structure.
- Created or updated frontend files: `client/index.html`,
  `client/vite.config.js`, `client/src/App.jsx`, `client/src/App.css`,
  `client/src/index.css`, `client/src/styles/theme.css`,
  `client/src/style/theme.css`, `client/src/contexts/AuthContext.jsx`,
  `client/src/contexts/authContext.js`, `client/src/hooks/useAuth.js`,
  `client/src/layouts/AdminLayout.jsx`, `client/src/routes/ProtectedRoute.jsx`,
  `client/src/routes/PublicOnlyRoute.jsx`,
  `client/src/services/apiClient.js`, `client/src/services/authApi.js`,
  `client/src/utils/apiError.js`,
  `client/src/components/common/{Badge,Button,Card,LoadingScreen,TextField}.jsx`,
  `client/src/components/layout/{Brand,Sidebar}.jsx`,
  `client/src/pages/auth/LoginPage.jsx`, and
  `client/src/pages/dashboard/DashboardPage.jsx`.
- `npm --prefix client run lint`: passed.
- `npm --prefix client run build`: passed; Vite transformed 2,128 modules and
  produced the production bundle.
- Browser verification with isolated mocked auth responses covered invalid
  login feedback, successful login, `/auth/me` session restoration after
  refresh, logout, protected-route redirect, password visibility and mobile
  navigation at 390px.
- Live API checks confirmed credentialed CORS behavior, MongoDB health and
  invalid-credential error handling. Authenticated browser login with real
  credentials was intentionally not attempted.
- Theme scan of React components found no hardcoded hex colors or direct
  Tailwind white/black/gray/zinc color utilities.

### Pending / not in M3

- Membership, trainer, payment, commission and other business modules remain
  future milestones.
- A production deployment still needs its exact frontend origin configured in
  the backend CORS allowlist and an appropriate cookie SameSite/Secure policy.
- No frontend test-runner dependency was added; M3 UI behavior was exercised
  in the browser, while backend auth behavior remains covered by the M2 suite.

## M4 — Member Management

### Backend implementation

- Added `members` and `auditLogs` Mongoose models. Member profile fields follow
  `DATABASE_DESIGN.md`; the approved M4 nested shapes are `address: { text }`
  and optional `emergencyContact: { name, phone }`. Member status supports
  `active`, `inactive` and `archived`.
- Added indexes: unique `memberCode`, non-unique `phone` and `status`;
  audit-log indexes on `module + createdAt` and `entityId + createdAt`.
- Generated unique member codes as `KG-` followed by 12 random uppercase hex
  characters. The database unique index is authoritative and collisions are
  retried. Phone/email are not unique because the finalized database design
  defines only member-code uniqueness.
- Local 10-digit Indian mobile numbers (including optional trunk `0`) normalize
  to `+91`; international numbers must include a country prefix and validate
  as E.164. Email is optional and normalized to lowercase.
- Added admin-protected routes:
  - `POST /api/v1/members` — create.
  - `GET /api/v1/members` — search, status filter, sort and pagination.
  - `GET /api/v1/members/:memberId` — details.
  - `PATCH /api/v1/members/:memberId` — profile update.
  - `PATCH /api/v1/members/:memberId/status` — activate, deactivate or archive.
- Zod validates request bodies, IDs and query values. Member operations write
  append-only audit events with actor, action, module, entity, status and
  changed-field metadata; audit records do not duplicate contact values.
- No public/member authentication, membership logic, trainer assignment,
  payment logic or permanent member deletion was added.
- Member writes and audit writes are awaited sequentially instead of using a
  transaction, because the configured/test MongoDB is standalone and rejects
  transactions. Audit failures are surfaced, not swallowed, but a database
  failure between the two writes can leave a completed member change without
  its event. Atomicity would require a replica set and a future transaction
  decision.

### Frontend implementation

- Added the member directory with search, status filtering, registration-date
  sort, pagination, loading, empty, retry and API-error states.
- Added create/edit forms with server validation feedback; member details with
  profile, status and clearly marked later-milestone history placeholders.
- Added confirmation dialogs for deactivation, archival and reactivation.
- Wired the Members sidebar entry and authenticated routes. M4 pages use only
  existing semantic theme tokens; the dashboard now links to the implemented
  member directory.
- No dependency changes were needed.

### Files created or modified

- Backend: `server/src/app.js`, `server/src/routes/api.routes.js`,
  `server/src/modules/members/member.model.js`,
  `member.validation.js`, `member.service.js`, `member.controller.js`,
  `member.routes.js`, `server/src/modules/audit/auditLog.model.js`, and
  `server/tests/members.test.js`.
- Frontend: `client/src/App.jsx`, `client/src/components/common/Button.jsx`,
  `client/src/components/layout/Sidebar.jsx`,
  `client/src/components/members/MemberStatusBadge.jsx`,
  `MemberForm.jsx`, `ConfirmDialog.jsx`,
  `client/src/layouts/AdminLayout.jsx`,
  `client/src/pages/dashboard/DashboardPage.jsx`,
  `client/src/pages/members/MembersPage.jsx`,
  `MemberFormPage.jsx`, `MemberDetailsPage.jsx`,
  `client/src/services/memberApi.js`, and `client/src/utils/memberForm.js`.
- Documentation: root `README.md` and `NOTES.md`.

### Verification

- Isolated `node --test tests/members.test.js` in `server/`: passed, 8 tests,
  0 failures. Covered create and normalized fields, invalid phone/email/date,
  invalid query validation, member-code uniqueness, search/filter/pagination,
  details/update, audit records/append-only enforcement, status transitions,
  and unauthorized requests.
- Complete backend `node --test` in `server/`: passed, 31 tests, 0 failures.
- Frontend `npm --prefix client run lint`: passed after final changes.
- Frontend `npm --prefix client run build`: passed after final changes; Vite
  transformed 2,136 modules and produced the production bundle.
- React component scan found no hardcoded hex colors or direct white/black/
  gray/zinc Tailwind color utilities.
- Browser verification of the M4 list/create/edit/detail/status workflows was
  attempted with mocked API responses but did not complete reliably; do not
  treat those UI workflows as browser-verified. Earlier live browser checks
  displayed a member record that may be test data in the configured development
  database. It was not changed or removed.

### Pending

- Member-plus-audit persistence is not atomic on the current standalone MongoDB
  topology; use a replica set and transactions if atomic audit consistency is
  required.
- Membership/payment history, plans, subscriptions, trainer assignments and
  all other non-M4 business modules remain unimplemented.
