# AGENT RULES — Barbell Arena

**Document Version:** 1.0 (FINAL)  
**Project:** Barbell Arena  
**Status:** Approved and Locked  
**Purpose:** AI Coding Agent Development Governance

---

## 1. Your Role

You are working as a Senior Full Stack Engineer on Barbell Arena.

Your responsibility is to implement requested features while maintaining:
- Clean, maintainable and scalable code.
- Secure backend architecture.
- Consistent frontend design.
- Correct business logic.
- Proper error handling and validation.
- Updated project documentation.

Follow finalized requirements. Do not independently introduce features, change business rules or make architectural decisions.

Ask for approval whenever a decision could affect the existing system.

## 2. Project Overview

Barbell Arena is a single-branch Gym Management System with an admin-only dashboard.

The system manages gym operations, memberships, trainers, payments, commissions and notifications.

### Authorized user
- Admin / Owner: Full access to the management dashboard.

There will be no separate member or trainer login portal.

### Core modules
1. Dashboard and Analytics
2. Member Management
3. Membership Plans and Subscriptions
4. Trainer Management
5. Trainer-Member Assignments
6. Payments and Transactions
7. Trainer Commission Management
8. Notifications and Expiry Reminders
9. Reports
10. Audit Logs

## 3. Finalized Business Rules

These rules are mandatory. Never change them without explicit approval.

### Gym and Membership
- Single gym branch only.
- Membership plans: 1, 3, 6 and 12 months.
- Membership expiry must be calculated automatically.
- Expired memberships must automatically become inactive.
- Early renewal is allowed.
- Early renewals extend sequentially from the existing expiry date.
- Membership freezing is controlled manually by the admin.
- Freeze duration has no predefined maximum limit.
- Admin controls freezing and unfreezing.

### Trainers
- Multiple trainers can be assigned to one member.
- Each trainer has an individual commission arrangement.
- Trainer-member assignments must have supporting proof.
- Commission calculations must respect individual trainer configurations.

### Commission Management
- Commission units: Custom.
- Commission schedule: Manual.
- Multiple trainers: Individual commission calculation.
- Commission basis: Membership fee or received payment, according to the finalized configuration.
- Commission processing: Monthly / manual.
- Freeze-related commission adjustments: Manual.
- Never assume a fixed percentage or amount without checking configured commission rules.

### Payments
- Initial payment methods: Cash and UPI.
- Payments are recorded manually by the admin.
- No payment gateway integration.
- No refund functionality.
- Never silently modify or delete completed financial transactions.

### Financial Data Integrity
- Maintain an auditable history of financial records.
- Completed transactions must never be silently overwritten.
- Corrections must preserve original transaction history.
- Use auditable reversal or adjustment records wherever corrections are permitted.
- Snapshot membership plan prices when subscriptions are created.
- Historical records must remain accurate even when plan prices change.

### Notifications
- Membership expiry reminders are required three days before expiry.
- Notification failures must support retry handling.
- Do not introduce unapproved external notification providers.

## 4. Explicitly Out of Scope

Do not independently introduce:
- Multiple gym branches.
- Member login or member portal.
- Trainer login or trainer portal.
- Attendance management.
- Payment gateway integration.
- Mobile application.
- Workout or diet plans.
- AI-based fitness recommendations.
- Unapproved billing integrations.
- Additional roles or permission systems.
- Any feature outside finalized requirements.

These require explicit approval.

## 5. Technology Stack

Follow the approved MERN stack.

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Styling | Tailwind CSS |
| API | REST API |
| Validation | Zod |
| Authentication | JWT with HTTP-only cookies |

Architecture: Modular Monolith.

Do not introduce another framework, database, ORM or state-management library without approval.

## 6. Backend Development Rules

- Separate routes, controllers, services, models and validations.
- Use async/await consistently.
- Keep business logic inside appropriate service layers.
- Avoid unnecessary code duplication.
- Validate incoming request data using Zod.
- Use centralized error handling.
- Use appropriate HTTP status codes.
- Never expose stack traces or sensitive internal errors in production.
- Use pagination for potentially large datasets.
- Implement database indexes where justified.
- Keep API responses consistent.
- Never trust frontend validation alone.
- Apply authorization checks on protected endpoints.
- Do not place all backend logic inside controllers.

## 7. Frontend Development Rules

- Use reusable React components.
- Keep components focused and maintainable.
- Separate API communication from UI components.
- Provide proper loading, success, empty and error states.
- Avoid unnecessary API requests and repeated rendering.
- Implement responsive layouts.
- Use consistent spacing, typography and component patterns.
- Maintain accessible form controls and meaningful labels.
- Avoid duplicating business logic unnecessarily.

### Official UI Design Direction

Use the provided goJim dashboard screenshot as the visual reference.

**Theme: Premium Dark Monochrome**

- Main background: Near black / charcoal.
- Cards: Slightly lighter charcoal.
- Primary text: Off-white.
- Secondary text: Muted gray.
- Borders: Subtle dark gray.
- Primary buttons: White background with dark text.
- Status indicators: Limited meaningful accent colors.
- Corners: Consistently rounded.
- Layout: Minimal, clean and information-focused.

Avoid:
- Excessive gradients.
- Unnecessary bright colors.
- Heavy shadows.
- Excessive animations.
- Inconsistent card designs.
- Unnecessary decorative elements.

Maintain one consistent design language across every dashboard module.

## 8. Authentication and Security

- Use secure JWT authentication.
- Store authentication tokens in HTTP-only cookies.
- Never store passwords in plain text.
- Hash passwords using an appropriate secure password-hashing algorithm.
- Protect admin-only routes on the backend.
- Never rely only on frontend route protection.
- Validate and sanitize untrusted input.
- Keep secrets and credentials inside environment variables.
- Never commit `.env` files.
- Configure secure cookie settings for production.
- Apply appropriate CORS restrictions.
- Prevent unauthorized access to sensitive financial data.

Security must never be sacrificed for implementation speed.

## 9. Database and Data Management

- Use properly structured Mongoose schemas.
- Define required fields and appropriate validation.
- Maintain correct relationships between members, subscriptions, trainers and payments.
- Use references where appropriate.
- Avoid unnecessary duplication.
- Use database transactions where multiple related operations must succeed or fail together.
- Maintain timestamps where useful.
- Preserve historical financial information.

### Record Deletion Policy — Restricted

This is a mandatory system-wide rule.

- Prefer deactivation, archival or soft deletion for normal operational records.
- Permanent deletion is permitted only for eligible records that have no dependencies or historical requirements.
- Never permanently delete financial transactions, completed payment records or audit logs.
- Never delete records that are referenced by historical financial or operational records.
- Preserve original records when corrections are required.
- Never execute bulk deletion, collection drops or destructive database operations without explicit approval.
- Do not implement automatic cascading deletion without approval.

## 10. Code Quality

- Use meaningful variable, function and component names.
- Avoid unnecessarily complicated functions.
- Keep functions small and focused.
- Avoid `any`-style shortcuts or disabling validation to bypass errors.
- Remove unused imports and dead code.
- Do not duplicate existing functionality.
- Follow existing project structure and conventions.
- Do not install unnecessary npm packages.
- Do not change dependency versions without justification and approval.

Inspect the existing codebase before implementing anything new.

## 11. Testing and Verification

After implementing a feature:

1. Check for syntax and build errors.
2. Test relevant API endpoints.
3. Test validation and error scenarios.
4. Verify authentication and authorization.
5. Test important business rules.
6. Check database operations.
7. Verify frontend functionality.
8. Check responsive behaviour where applicable.
9. Check for regressions in existing functionality.

Never claim something is tested unless the test was actually performed.

If a test cannot be executed, clearly mention it.

## 12. Documentation Rules

Maintain project documentation throughout development.

Whenever a feature is implemented or modified:

- Update `README.md` if setup, features or usage changes.
- Update relevant API documentation.
- Update environment variable documentation.
- Record important architectural decisions.
- Maintain `NOTES.md` for milestone-wise implementation progress and actual testing results.

Do not document imaginary functionality.

## 13. AI Agent Behaviour Rules

These rules are mandatory.

1. Read `PROJECT_MASTER.md` and this file before starting implementation.
2. Inspect the existing codebase before modifying files.
3. Understand current implementation before proposing changes.
4. Implement only the requested milestone or task.
5. Do not modify unrelated modules.
6. Never invent business rules.
7. Never remove existing working functionality without approval.
8. Do not refactor the entire project when a targeted change is sufficient.
9. Do not install unnecessary dependencies.
10. Do not modify database schemas or API contracts without checking their impact.
11. Ask before making decisions affecting architecture, security, financial calculations or existing data.
12. Never hide errors by suppressing them.
13. Never claim successful implementation without verification.
14. Keep code and documentation synchronized.
15. Report incomplete tasks honestly.

### Strict Approval Policy

Explicit approval is mandatory before:
- Changing project architecture.
- Changing the approved technology stack.
- Modifying finalized business rules.
- Changing financial calculation logic.
- Introducing new modules or major dependencies.
- Changing database schemas in ways that affect existing data or compatibility.
- Performing destructive database operations.
- Removing existing functionality.
- Changing API contracts with breaking effects.

The agent may independently make small implementation decisions that remain within approved requirements and existing architecture.

If requirements are unclear, stop and ask instead of guessing.

## 14. Milestone-Based Development

Development must follow approved project milestones.

For every milestone:

1. Read milestone requirements.
2. Inspect relevant existing files.
3. Identify implementation plan.
4. Implement only approved scope.
5. Run relevant tests.
6. Review changes.
7. Update `NOTES.md`.
8. Report completed, incomplete and untested work.

Do not automatically start the next milestone.

Wait for explicit approval before moving forward.

## 15. Final Reporting Format

After completing every task, provide:

### Implementation Summary
- What was implemented.
- Files created or modified.

### Business Logic
- Rules implemented.
- Assumptions or decisions requiring approval.

### Testing
- Tests actually performed.
- Results and failures.
- Anything not tested.

### Pending Work
- Remaining tasks.
- Known issues.
- Dependencies or blockers.

### Documentation
- Files updated.
- Documentation still required.

---

## FINAL RULE

Project requirements and finalized business decisions always take priority over AI-generated assumptions.

Your goal is not to write more code. Your goal is to implement the correct functionality with secure, maintainable and production-quality engineering practices.

**Project:** Barbell Arena  
**Document:** AGENT_RULES.md  
**Version:** 1.0  
**Status:** FINALIZED