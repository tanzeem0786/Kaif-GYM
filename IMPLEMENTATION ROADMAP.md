# IMPLEMENTATION ROADMAP — KAIF'S GYM

**Version:** 1.0  
**Status:** Approved Planning Draft  
**Architecture:** MERN Modular Monolith  
**Development Strategy:** Milestone-Based Implementation

---

# 1. DEVELOPMENT OBJECTIVE

Implement Kaif's GYM according to the approved project requirements, database design and system architecture.

Every milestone must have:
- Defined implementation scope.
- Dependencies.
- Expected deliverables.
- Testing requirements.
- Completion criteria.

No milestone should introduce unapproved business functionality.

# 2. MILESTONE OVERVIEW

| ID | Milestone | Priority |
|---|---|---|
| M0 | Repository Audit & Project Setup | Critical |
| M1 | Backend Foundation & Database | Critical |
| M2 | Admin Authentication & Security | Critical |
| M3 | Frontend Foundation & Dashboard Layout | High |
| M4 | Member Management | High |
| M5 | Membership Plans & Subscriptions | High |
| M6 | Trainer Management & Assignments | High |
| M7 | Payment Management | Critical |
| M8 | Commission Management Engine | Critical |
| M9 | Notifications & Background Jobs | High |
| M10 | Dashboard Analytics & Reports | High |
| M11 | Audit Logs & Gym Settings | High |
| M12 | Integration Testing & Security Review | Critical |
| M13 | Production Deployment | Critical |

# 3. DETAILED MILESTONES

## M0 — Repository Audit & Project Setup

**Objective:** Understand the existing repository before making changes.

Tasks:
- Inspect existing frontend and backend.
- Review existing package.json files.
- Identify installed dependencies.
- Check existing Git structure.
- Review existing environment configuration.
- Identify reusable code.
- Create the required documentation structure.
- Prepare implementation plan based on actual repository state.

Deliverables:
- Repository audit.
- Updated project structure.
- `.gitignore`.
- `.env.example` files.
- Initial development setup.

Completion criteria:
- Existing functionality is understood.
- No unnecessary files or dependencies are introduced.
- Frontend and backend development environments are functional.

## M1 — Backend Foundation & Database

**Objective:** Establish a stable backend foundation.

Tasks:
- Initialize or configure Express application.
- Configure MongoDB connection.
- Configure Mongoose.
- Create environment configuration.
- Implement centralized error handling.
- Implement API response utilities.
- Implement request validation middleware.
- Configure security middleware.
- Configure API versioning.
- Create initial database models.
- Configure indexes.

Deliverables:
- Working Express server.
- MongoDB connection.
- Base middleware.
- Initial database structure.
- API health-check endpoint.

Completion criteria:
- Server starts successfully.
- Database connects successfully.
- Invalid requests are handled properly.
- Environment configuration works.
- Health-check endpoint works.

## M2 — Admin Authentication & Security

**Objective:** Implement secure admin access.

Tasks:
- Admin model.
- Secure admin bootstrap script.
- Admin login.
- Admin logout.
- JWT authentication.
- HTTP-only cookies.
- Authentication middleware.
- Protected routes.
- Password hashing.
- Rate limiting.
- CORS configuration.

Deliverables:
- Admin authentication APIs.
- Bootstrap command.
- Protected backend routes.

Completion criteria:
- Admin can log in and log out.
- Unauthorized requests are rejected.
- Public registration does not exist.
- Passwords are securely hashed.
- Authentication cookies have correct production settings.

## M3 — Frontend Foundation & Dashboard Layout

**Objective:** Build the reusable frontend foundation.

Tasks:
- Initialize React + Vite.
- Configure Tailwind CSS.
- Configure routing.
- Configure API client.
- Implement authentication context.
- Implement protected routes.
- Build sidebar.
- Build top navigation.
- Create reusable UI components.
- Establish global design tokens.
- Implement responsive layouts.

Design:
- Premium dark monochrome.
- Charcoal surfaces.
- Off-white typography.
- Subtle borders.
- White primary buttons.

Deliverables:
- Login page.
- Admin dashboard shell.
- Sidebar and header.
- Reusable component library.
- Responsive base layout.

Completion criteria:
- Frontend runs successfully.
- Navigation works.
- Protected routing works.
- Design is consistent with the approved reference.

## M4 — Member Management

**Objective:** Implement complete member management.

Tasks:
- Member database model.
- Create member API.
- Get member list API.
- Get member details API.
- Update member API.
- Search and filtering.
- Pagination.
- Member status management.
- Member history integration.

Frontend:
- Members listing.
- Add member form.
- Edit member form.
- Member details page.
- Search and filters.

Completion criteria:
- Member CRUD works.
- Validation works.
- Search and pagination work.
- Historical records are preserved.

## M5 — Membership Plans & Subscriptions

**Objective:** Implement membership management.

Tasks:
- Membership plan management.
- Membership creation.
- Plan price snapshot.
- Automatic expiry.
- Membership renewal.
- Sequential renewal calculation.
- Freeze and unfreeze workflow.
- Automatic expiry extension.
- Membership history.
- Membership status synchronization.

Frontend:
- Membership plans page.
- Membership listing.
- Membership details.
- Renewal form.
- Freeze/unfreeze actions.

Completion criteria:
- All approved plan durations work.
- Early renewal does not overlap existing validity.
- Freeze duration is automatically applied to expiry.
- Duplicate expiry extensions are prevented.
- Membership history remains intact.

## M6 — Trainer Management & Assignments

**Objective:** Implement trainer records and member assignments.

Tasks:
- Trainer CRUD.
- Trainer status management.
- Trainer-member assignment.
- Multiple trainer support.
- Assignment history.
- Supporting proof management.
- Assignment date validation.

Frontend:
- Trainer listing.
- Add/edit trainer forms.
- Trainer details.
- Member assignment interface.
- Assignment history.

Completion criteria:
- Multiple trainers can be assigned to one member.
- Each assignment is independently recorded.
- Historical assignments are preserved.

## M7 — Payment Management

**Objective:** Implement reliable manual payment processing.

Tasks:
- Payment model.
- Payment recording API.
- Cash and UPI support.
- Partial payment support.
- Outstanding balance calculation.
- Payment history.
- Payment filtering.
- Payment receipt.
- Financial correction strategy.

Frontend:
- Payment listing.
- Record payment form.
- Payment details.
- Member payment history.
- Outstanding balance display.

Completion criteria:
- Full and partial payments work.
- Outstanding balances reconcile with actual transactions.
- Duplicate payment processing is prevented.
- Completed transactions cannot be silently overwritten or deleted.
- Financial corrections preserve original history.

## M8 — Commission Management Engine

**Objective:** Implement individual trainer commission calculations.

Tasks:
- Commission agreement management.
- Agreement versioning.
- Custom commission configuration.
- Commission calculation service.
- Trainer-specific commission entries.
- Monthly statements.
- Manual adjustments.
- Commission ledger.
- Partial payouts.
- Payout history.

Frontend:
- Commission configuration.
- Trainer-wise commission details.
- Monthly statements.
- Adjustment interface.
- Payout management.

Completion criteria:
- Each trainer receives independent commission calculations.
- Multiple trainers never share one combined commission pool.
- Historical agreements are preserved.
- Financial calculations are traceable.
- Payouts are independently recorded.

Note: Exact custom commission formulas and partial-payment timing must be approved before the calculation engine is finalized.

## M9 — Notifications & Background Jobs

**Objective:** Implement automated system operations.

Tasks:
- Membership expiry detection.
- Three-day expiry reminder generation.
- Scheduled job processing.
- Notification history.
- Retry mechanism.
- Duplicate notification prevention.
- Provider-independent notification service.

WhatsApp integration:
- Provider selection remains deferred.
- No provider-specific credentials or dependencies until approval.

Completion criteria:
- Expiry detection works.
- Reminders are generated correctly.
- Duplicate processing is prevented.
- Failed jobs are handled safely.
- Notification history is preserved.

## M10 — Dashboard Analytics & Reports

**Objective:** Implement useful gym business analytics.

Tasks:
- Dashboard statistics APIs.
- Revenue analytics.
- Active/expired member statistics.
- Membership expiry statistics.
- Outstanding balance reports.
- Trainer commission reports.
- Payment reports.
- Date-based filters.
- Manual gym capacity metrics.

Frontend:
- Analytics cards.
- Revenue charts.
- Member statistics.
- Recent activity.
- Report tables.
- Date filters.

Completion criteria:
- Dashboard values match actual database records.
- Revenue represents received payments.
- Outstanding balances are not counted as collected revenue.
- Reports use accurate historical data.

## M11 — Audit Logs & Gym Settings

**Objective:** Complete system accountability and configuration.

Tasks:
- Audit log model.
- Audit service.
- Important activity tracking.
- Audit log listing.
- Gym settings management.
- Maximum capacity management.
- Manual occupancy management.
- Configuration validation.

Completion criteria:
- Important administrative actions are recorded.
- Financial activities are traceable.
- Audit history cannot be silently deleted.
- Capacity calculations are accurate.
- Settings persist correctly.

## M12 — Integration Testing & Security Review

**Objective:** Verify the complete application.

Tasks:
- Backend integration testing.
- Frontend integration testing.
- Authentication security review.
- Authorization review.
- Financial calculation testing.
- Membership lifecycle testing.
- Commission testing.
- Background job testing.
- Responsive testing.
- Performance review.
- Error handling review.

Completion criteria:
- Critical business workflows pass.
- No known critical security vulnerabilities remain.
- Financial records reconcile.
- No major regression remains.
- Documentation is updated.

## M13 — Production Deployment

**Objective:** Deploy the application safely.

Tasks:
- Production environment configuration.
- Frontend deployment.
- Backend deployment.
- MongoDB production configuration.
- HTTPS.
- Secure CORS.
- Production cookies.
- Admin bootstrap.
- Database backup strategy.
- Background job deployment.
- Health monitoring.
- Production smoke testing.

Completion criteria:
- Application is accessible in production.
- Admin authentication works.
- Database connection works.
- Background jobs operate safely.
- Backup and recovery procedures are documented.
- Production smoke tests pass.

# 4. MILESTONE DEPENDENCIES

The implementation order must respect the following dependencies:

M0 → M1 → M2 → M3

M3 → M4 → M5

M4 + M5 → M6

M5 + M7 → M8

M5 → M9

M4 + M5 + M7 + M8 + M11 → M10

All functional milestones → M12 → M13

Frontend foundation may proceed after backend contracts and authentication requirements are sufficiently defined. Module frontend integration must follow the corresponding backend API contracts.

# 5. DEVELOPMENT EXECUTION RULES

For every milestone:

1. Read all relevant project documents.
2. Inspect existing code.
3. Understand dependencies.
4. Identify exact files to modify.
5. Implement only approved scope.
6. Run relevant tests.
7. Review changes for regressions.
8. Update NOTES.md.
9. Report actual results.
10. Wait for approval.

Never automatically start the next milestone.

# 6. NOTES.md REQUIREMENTS

After every milestone, record:

- Milestone ID.
- Implementation summary.
- Files created.
- Files modified.
- Dependencies installed.
- APIs created or changed.
- Database changes.
- Tests performed.
- Actual test results.
- Known issues.
- Pending work.
- Next milestone recommendation.

Do not report tests that were not executed.

# 7. PROJECT DOCUMENT PRIORITY

1. AGENT_RULES.md — Development behaviour.
2. PROJECT_MASTER.md — Product requirements.
3. DATABASE_DESIGN.md — Database design.
4. SYSTEM_ARCHITECTURE.md — Application architecture.
5. IMPLEMENTATION_ROADMAP.md — Development sequence.
6. NOTES.md — Actual implementation history.

If a conflict is discovered, stop and request clarification rather than silently changing finalized requirements.

---

**Project:** Kaif's GYM  
**Document:** IMPLEMENTATION_ROADMAP.md  
**Version:** 1.0  
**Status:** Planning Draft