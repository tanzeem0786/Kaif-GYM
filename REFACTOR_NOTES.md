# Backend Refactoring Notes

## Scope and compatibility

- Preserve the existing `success`, `message`, and `data` API envelope, endpoint paths, and request formats.
- Keep authentication, authorization, validation, audit history, and business rules intact.
- Use six-character sequential member codes beginning with `BA0001`.
- Refactor one module at a time and run relevant tests before moving on.

## Phase 1: Shared request wiring and authentication

Completed:

- Created one shared request-validation middleware for body, query, and parameter schemas; removed duplicate wrapper implementations from module validation files.
- Constructed the auth service and authentication middleware once in the API router and reused them for protected routes and `/auth/me`.
- Removed per-module authentication-service construction while retaining the existing login, logout, and protected-route behavior.
- Preserved injected model configuration and the API response envelope.

Validation:

- `node --check` passed for all changed JavaScript files.
- `node --test tests/auth.test.js tests/middleware.test.js tests/health.test.js`: 18 passed, 0 failed.
- Full `npm test`: 60 tests executed; 59 passed and 1 failed due to a member-code validation mismatch. Resolved in Phase 2.

## Phase 2: Members and trainers

Completed:

- Kept member-code generation collision-safe and aligned model validation with the generated codes. At that stage, existing codes were preserved; the later sequential-format migration is recorded below.
- Updated member-code test fixtures and verified member codes remain unchanged during profile edits.
- Moved straightforward member and trainer list, detail, update, and status queries into their controllers. Kept only collision-safe creation and its audit write in each service.
- Preserved existing response shapes, validation, authorization, status transitions, audit fields, and trainer-code collision handling.

Validation:

- `node --test tests/members.test.js`: 9 passed, 0 failed.
- `node --test tests/trainers.test.js`: 4 passed, 0 failed.
- Full `npm test`: 61 passed, 0 failed. This includes membership and payment tests using updated member-code fixtures.
- `node --check` passed for the changed Phase 2 JavaScript files.
- The Phase 1 full-suite failure from the prefix mismatch is resolved.

## Member name fields

Completed:

- Replaced member `firstName` and `lastName` with required `fullName` and `fatherName` in the Mongoose model, request validation, member search/sort, and the member form.
- Updated member directory/details, membership selection and history, payment workflows/receipts, and trainer-assignment displays and searches. Trainer and administrator name fields remain unchanged.
- Updated populated member projections in membership, payment, and assignment responses. The API envelope and existing routes remain unchanged.
- Recreated the six dummy member documents with `fullName` formed from the prior first and last names and `fatherName` set to the approved dummy value, `Father Name`. Their `_id` values were preserved so all 3 memberships, 2 payments, and 2 trainer assignments remained linked. No runtime fallback or migration framework was added.
- Preserved member relationships and all non-name member fields. Member codes were later standardized as documented below.

Validation:

- Focused backend tests for members, memberships, and payments: 31 passed, 0 failed.
- Full backend test suite: 62 passed, 0 failed.
- Frontend `npm run lint` and `npm run build` passed.
- `git diff --check` passed.

## Permanent member deletion and archive removal

Completed:

- Added the authenticated `DELETE /api/v1/members/:memberId` endpoint. It rejects deletion while the member has an active membership or trainer assignment, permanently removes only the member profile, and retains payment transactions, audit logs, membership history, and trainer-assignment history.
- Before deletion, related memberships, payments, and assignments receive a member snapshot containing the member ID, code, full name, and father's name. History search and member-history endpoints continue to work after the member profile is gone.
- Added delete actions to the member directory and details page. Both confirmations show the member's full name and code; API errors are displayed to the admin. The directory's rejection flow was exercised in the browser with a mocked active-dependency response.
- Removed member archive status, filters, actions, and related runtime logic. Active and inactive status transitions remain unchanged.
- Inspected the configured dummy database (`kaifs_gym`): six members, including two with archived status. Changed only those two statuses to inactive. Verified no archived-status members remain and both historical `member.archived` audit events remain intact.
- Updated the member API and database documentation to match the required `fullName`/`fatherName` fields, restricted deletion, and retained history.

Validation:

- Focused member deletion/status tests: 13 tests passed, 0 failed.
- Full backend `npm test`: 65 tests passed, 0 failed.
- Frontend `npm run lint`: passed.
- Frontend `npm run build`: passed.
- Browser smoke check verified the directory confirmation displays the member name/code and that a 409 deletion response is shown to the admin.
- `git diff --check` passed. No archive references remain in backend or frontend runtime source.

## Sequential member-code standardization

Completed:

- Confirmed the six-character format `BA0001`: the `BA` prefix followed by a four-digit sequence. Codes are immutable on profile updates, and malformed, short, long, and former hyphenated values fail model validation.
- Replaced random generation with the next sequential code after the highest assigned code. Allocation considers current member profiles and member snapshots in memberships, payments, and trainer assignments so codes retained in deleted-member history are not reused. The unique index remains authoritative; duplicate-key conflicts trigger a fresh allocation attempt. Sequence exhaustion returns HTTP 409.
- Updated list search and sorting remain based on the stored `memberCode`; frontend displays continue to render the code directly.
- Inspected the configured dummy database before migration: 5 member profiles and no duplicate codes. Updated those profiles in place to sequential codes, preserving their IDs and all foreign-key relationships. Updated 5 member-code snapshots across membership, payment, and assignment history, including the snapshot for a previously deleted member.
- Left all 41 append-only audit log documents unchanged. Nineteen retain their originally recorded code metadata, as requested; no audit relationships or events were removed or rewritten.

Validation:

- Focused member tests cover sequential allocation, concurrent collision retry, historical snapshot reservation, six-character validation, and sequence exhaustion.
- Focused backend member tests: 17 passed, 0 failed.
- Full backend test suite: 69 passed, 0 failed.
- Frontend `npm run lint` and `npm run build`: passed.
- `git diff --check` passed.
- Verified migrated member profiles have unique sequential codes and linked history retains the corresponding member IDs and snapshots.

## Phase 3: Assignments and commission agreements

Completed:

- Moved assignment listing, filtering/search, detail queries, and member/trainer existence checks into the controller. Removed the assignment service factory and model dependency plumbing from routes and app composition.
- Kept assignment creation and ending in the service because they enforce trainer/status and date rules, capture member snapshots, perform conditional state updates, and write audit events.
- Moved commission-agreement list/detail queries and trainer existence checks into the controller. Removed the commission service factory and dependency plumbing from app/router wiring.
- Kept version creation in a small service operation: validate trainer existence, allocate the next trainer-specific version, rely on the unique index for concurrent conflicts, and write the append-only audit event. Agreement versions remain immutable.
- Preserved endpoints, admin authentication, Zod request validation, response envelopes, member/trainer references, assignment history, commission basis values, effective dates, and audit event contents.

Validation:

- Focused assignment/trainer tests: 4 passed, 0 failed.
- Focused assignment and commission agreement tests: 8 passed, 0 failed.
- Complete backend test suite: 69 passed, 0 failed.
- Frontend `npm run lint` and `npm run build`: passed.
- `git diff --check` passed.

## Phase 4: Memberships

- Moved membership-plan create/list/detail/update/status operations into the controller, retaining each existing plan audit event and no-op status behavior.
- Moved membership list/detail/member-history and summary queries into the controller. Automatic expiry synchronization still runs before these reads, and member history still supports deleted profiles through stored snapshots.
- Removed the membership controller/service factories and route model injection. The service now contains only membership assignment, renewal, expiry synchronization, UTC calendar-month calculations, code collision handling, plan/member snapshot creation, and audit writes.
- Kept the expiry job calling the same synchronization operation directly; removed server-startup construction and injection of membership models into a service factory.
- Preserved membership endpoints, request/response shapes, authorization, validation, renewal sequencing, frozen/inactive renewal restrictions, plan snapshots, payment relationships, status values, and audit events. No freeze/unfreeze behavior or frontend API changes were added.

Validation:

- Focused membership tests: 15 passed, 0 failed. Covered assignment, renewal, date calculations, expiry synchronization, frozen restrictions, history, snapshots, plan audits, and validation.
- Full backend test suite: 69 passed, 0 failed.
- Frontend `npm run lint` and `npm run build`: passed.
- `git diff --check` passed.
- No Phase 5 payment refactoring was started.

## Phase 5: Payments

Completed:

- Moved payment listing, filtering, member history, details, and receipt queries into the controller. Preserved pagination, sorting, filters, populated fields, response envelopes, and receipt behavior for both original payments and reversal records.
- Kept deleted-member payment history accessible through stored member snapshots; payment search now matches snapshot names and codes as well as current member records and transaction codes.
- Removed the payment controller/service/router factories and model dependency plumbing from API/app setup. The service now exports only payment creation and reversal operations; their idempotency, conditional balance updates, transaction handling, standalone compensation, linked reversal records, and audit writes remain in the service.
- Left the payment model, validation rules, transaction code format, and financial record structure unchanged.
- Added failure-recovery tests for payment and reversal persistence failures, plus a reversal-receipt compatibility assertion.

Validation:

- Focused payment tests: 8 passed, 0 failed.
- Member tests, including deletion with payment-history access: 17 passed, 0 failed.
- Full backend test suite: 71 passed, 0 failed. The first full run exposed a regression in deleted-member payment history; controller queries were updated to use retained snapshots and the full suite then passed.
- The configured MongoDB topology is standalone (`Single`), so failure tests exercised standalone compensation. Replica-set/sharded transaction execution was not available in this environment.
- Frontend `npm run lint`: passed.
- Frontend `npm run build`: passed.
- `git diff --check`: passed.

## Phase 6: Final backend cleanup and architecture review

Completed:

- Removed the trivial health controller/service layers; the health route now reads the database status and sends the existing response directly.
- Replaced the auth-service factory with direct login and token-verification functions using the shared `Admin` model. Authentication middleware now imports that model directly. Removed `AdminModel` and auth-service plumbing from `app.js`, API routes, and tests.
- Removed the `AdminModel` argument from admin bootstrap; the bootstrap service now uses the shared `Admin` model directly.
- Bound the membership expiry job directly to the membership service, removing the service-function parameter passed through server startup. Retained the job's overlap guard, timer lifecycle, and error logging.
- Removed the empty generic `server/src/models/.gitkeep`; Mongoose models are kept with their modules. No obsolete runtime references remained.
- Re-reviewed the member, membership, trainer, assignment, commission, and payment modules. Their remaining services perform collision-safe creation, multi-step business rules, immutable versioning, audit/snapshot work, or financial consistency operations; straightforward reads and CRUD remain in controllers.
- Kept the shared validation middleware, response helpers, error handling, app/router composition, and lifecycle helpers because they serve repeated request or resource-lifecycle behavior.
- Updated the README with the final architecture and actual backend folder layout. `DATABASE_DESIGN.md` was left unchanged because this phase made no data-model changes.

Final architecture summary:

- Original complexity removed: repeated validation wrappers, CRUD service factories and model injection across earlier phases, payment read-service wrappers, auth-service construction/injection, and the health controller/service pair.
- Remaining services are limited to authentication/bootstrap, member/trainer code allocation and auditing, membership assignment/renewal/expiry, assignment state changes, immutable commission version creation, and payment recording/reversals.
- Removed files: `server/src/controllers/health.controller.js`,
  `server/src/services/health.service.js`, and
  `server/src/models/.gitkeep`.
- No new dependencies, endpoints, or business features were added.

Final backend structure:

```text
server/src/
  app.js
  server.js
  configs/
  jobs/
  middlewares/
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
  routes/
  scripts/
  utils/
server/tests/
```

Final validation:

- Focused auth, health, and middleware tests: 17 passed, 0 failed.
- Complete backend test suite: 70 passed, 0 failed.
- Frontend `npm run lint`: passed.
- Frontend `npm run build`: passed.
- JavaScript syntax checked for all 66 backend source and test files.
- `git diff --check`: passed.
- MongoDB test topology is standalone (`Single`). Standalone compensation paths were tested in Phase 5; replica-set/sharded transaction execution was not available or claimed as verified. Standalone operations do not provide the same atomicity as MongoDB transactions.

No phases remain.
