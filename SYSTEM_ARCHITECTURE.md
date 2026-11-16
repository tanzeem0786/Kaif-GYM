# SYSTEM ARCHITECTURE — Barbell Arena

**Version:** 1.0  
**Status:** Technical Draft  
**Architecture Pattern:** Modular Monolith  
**Frontend:** React + Vite  
**Backend:** Node.js + Express.js  
**Database:** MongoDB + Mongoose  
**API:** REST API v1

---

# 1. ARCHITECTURE OVERVIEW

Barbell Arena will follow a Modular Monolith architecture.

The application will contain logically separated modules inside a single backend application.

This architecture provides:

- Clear separation of responsibilities.
- Easier maintenance.
- Reusable business logic.
- Centralized authentication.
- Consistent API handling.
- Simpler deployment.
- Easier testing.
- Future scalability without premature microservices.

## 1.1 High-Level Architecture

                 ADMIN
                   |
                   v
          React Admin Dashboard
                   |
                   v
             REST API v1
                   |
                   v
            Express Server
                   |
          Authentication Layer
                   |
          Authorization Layer
                   |
             Route Layer
                   |
            Controller Layer
                   |
             Service Layer
                   |
              Model Layer
                   |
                   v
               MongoDB

Additional infrastructure:

- Scheduled background jobs.
- Notification processing.
- Audit logging.
- Future WhatsApp provider integration.

# 2. TECHNOLOGY STACK

## 2.1 Frontend

| Technology | Responsibility |
|---|---|
| React | UI development |
| Vite | Development server and build |
| Tailwind CSS | Styling |
| React Router | Client-side routing |
| Axios or Fetch | API communication |
| React Hook Form | Form management |
| Zod | Form validation |
| Recharts | Dashboard charts |
| Lucide React | Icons |

Additional frontend libraries must be justified before installation.

## 2.2 Backend

| Technology | Responsibility |
|---|---|
| Node.js | Runtime |
| Express.js | HTTP server |
| MongoDB | Database |
| Mongoose | ODM |
| Zod | Request validation |
| JWT | Authentication |
| bcrypt | Password hashing |
| Cookie Parser | Cookie handling |
| Helmet | HTTP security headers |
| CORS | Cross-origin policy |
| Morgan or equivalent | Request logging |

## 2.3 Development Tools

- Git and GitHub.
- VS Code.
- Postman.
- MongoDB Compass.
- npm.
- ESLint.

# 3. PROJECT DIRECTORY STRUCTURE

The following is the proposed target structure.

Actual folder names may be adapted to the existing repository, but module separation must remain.

## 3.1 Root Structure

kaifs-gym/
│
├── client/
│
├── server/
│
├── docs/
│   ├── AGENT_RULES.md
│   ├── PROJECT_MASTER.md
│   ├── DATABASE_DESIGN.md
│   ├── SYSTEM_ARCHITECTURE.md
│   └── NOTES.md
│
├── README.md
├── .gitignore
└── package.json

## 3.2 Backend Structure

server/
│
├── src/
│   │
│   ├── configs/
│   │   ├── database.js
│   │   ├── environment.js
│   │   └── cors.js
│   │
│   ├── modules/
│   │   │
│   │   ├── auth/
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   └── auth.validation.js
│   │   │
│   │   ├── members/
│   │   │   ├── member.model.js
│   │   │   ├── member.routes.js
│   │   │   ├── member.controller.js
│   │   │   ├── member.service.js
│   │   │   └── member.validation.js
│   │   │
│   │   ├── trainers/
│   │   │   ├── trainer.model.js
│   │   │   ├── trainer.routes.js
│   │   │   ├── trainer.controller.js
│   │   │   ├── trainer.service.js
│   │   │   └── trainer.validation.js
│   │   │
│   │   ├── memberships/
│   │   │   ├── models/
│   │   │   │   ├── membership.model.js
│   │   │   │   ├── membershipPlan.model.js
│   │   │   │   └── membershipFreeze.model.js
│   │   │   ├── membership.routes.js
│   │   │   ├── membership.controller.js
│   │   │   ├── membership.service.js
│   │   │   └── membership.validation.js
│   │   │
│   │   ├── assignments/
│   │   │   ├── assignment.model.js
│   │   │   ├── assignment.routes.js
│   │   │   ├── assignment.controller.js
│   │   │   ├── assignment.service.js
│   │   │   └── assignment.validation.js
│   │   │
│   │   ├── payments/
│   │   │   ├── payment.model.js
│   │   │   ├── payment.routes.js
│   │   │   ├── payment.controller.js
│   │   │   ├── payment.service.js
│   │   │   └── payment.validation.js
│   │   │
│   │   ├── commissions/
│   │   │   ├── models/
│   │   │   │   ├── commissionAgreement.model.js
│   │   │   │   ├── commissionStatement.model.js
│   │   │   │   ├── commissionEntry.model.js
│   │   │   │   ├── commissionLedger.model.js
│   │   │   │   └── commissionPayout.model.js
│   │   │   ├── commission.routes.js
│   │   │   ├── commission.controller.js
│   │   │   ├── commission.service.js
│   │   │   ├── commissionCalculator.service.js
│   │   │   └── commission.validation.js
│   │   │
│   │   ├── notifications/
│   │   │   ├── notification.model.js
│   │   │   ├── notification.routes.js
│   │   │   ├── notification.controller.js
│   │   │   ├── notification.service.js
│   │   │   └── providers/
│   │   │
│   │   ├── capacity/
│   │   │   ├── capacity.routes.js
│   │   │   ├── capacity.controller.js
│   │   │   ├── capacity.service.js
│   │   │   └── capacity.validation.js
│   │   │
│   │   ├── dashboard/
│   │   │   ├── dashboard.routes.js
│   │   │   ├── dashboard.controller.js
│   │   │   └── dashboard.service.js
│   │   │
│   │   ├── reports/
│   │   │   ├── report.routes.js
│   │   │   ├── report.controller.js
│   │   │   └── report.service.js
│   │   │
│   │   ├── audit/
│   │   │   ├── audit.model.js
│   │   │   ├── audit.service.js
│   │   │   └── audit.middleware.js
│   │   │
│   │   └── settings/
│   │       ├── settings.model.js
│   │       ├── settings.routes.js
│   │       ├── settings.controller.js
│   │       └── settings.service.js
│   │
│   ├── middlewares/
│   │   ├── authenticate.js
│   │   ├── authorize.js
│   │   ├── validateRequest.js
│   │   ├── errorHandler.js
│   │   └── notFound.js
│   │
│   ├── jobs/
│   │   ├── membershipExpiry.job.js
│   │   ├── membershipReminder.job.js
│   │   └── notificationRetry.job.js
│   │
│   ├── utils/
│   │   ├── ApiError.js
│   │   ├── ApiResponse.js
│   │   ├── asyncHandler.js
│   │   ├── date.utils.js
│   │   └── money.utils.js
│   │
│   ├── scripts/
│   │   └── bootstrapAdmin.js
│   │
│   ├── app.js
│   └── server.js
│
├── tests/
├── .env.example
├── package.json
└── README.md

## 3.3 Frontend Structure

client/
│
├── src/
│   │
│   ├── assets/
│   │
│   ├── components/
│   │   ├── common/
│   │   ├── layout/
│   │   ├── forms/
│   │   ├── tables/
│   │   └── charts/
│   │
│   ├── layouts/
│   │   └── AdminLayout.jsx
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   └── Login.jsx
│   │   │
│   │   ├── dashboard/
│   │   │   └── Dashboard.jsx
│   │   │
│   │   ├── members/
│   │   │   ├── Members.jsx
│   │   │   ├── MemberDetails.jsx
│   │   │   └── MemberForm.jsx
│   │   │
│   │   ├── memberships/
│   │   │   ├── Memberships.jsx
│   │   │   ├── MembershipPlans.jsx
│   │   │   └── MembershipDetails.jsx
│   │   │
│   │   ├── trainers/
│   │   │   ├── Trainers.jsx
│   │   │   └── TrainerDetails.jsx
│   │   │
│   │   ├── assignments/
│   │   │   └── Assignments.jsx
│   │   │
│   │   ├── payments/
│   │   │   └── Payments.jsx
│   │   │
│   │   ├── commissions/
│   │   │   ├── Commissions.jsx
│   │   │   ├── Statements.jsx
│   │   │   └── Payouts.jsx
│   │   │
│   │   ├── notifications/
│   │   │   └── Notifications.jsx
│   │   │
│   │   ├── reports/
│   │   │   └── Reports.jsx
│   │   │
│   │   ├── settings/
│   │   │   └── Settings.jsx
│   │   │
│   │   └── audit/
│   │       └── AuditLogs.jsx
│   │
│   ├── hooks/
│   ├── services/
│   │   ├── api.js
│   │   ├── auth.api.js
│   │   ├── member.api.js
│   │   ├── membership.api.js
│   │   ├── trainer.api.js
│   │   ├── payment.api.js
│   │   └── commission.api.js
│   │
│   ├── contexts/
│   │   └── AuthContext.jsx
│   │
│   ├── utils/
│   ├── constants/
│   ├── routes/
│   ├── styles/
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── public/
├── .env.example
└── package.json

The folder structure is a proposed target. Do not generate every file as empty scaffolding before its milestone.

# 4. BACKEND ARCHITECTURE

## 4.1 Request Lifecycle

Client Request
      |
      v
Express Application
      |
      v
Security Middleware
      |
      v
Authentication Middleware
      |
      v
Authorization Middleware
      |
      v
Request Validation
      |
      v
Route
      |
      v
Controller
      |
      v
Service
      |
      v
Mongoose Model
      |
      v
MongoDB
      |
      v
Standardized API Response

## 4.2 Layer Responsibilities

### Routes

- Define API endpoints.
- Attach middleware.
- Connect endpoints to controllers.

### Controllers

- Receive validated requests.
- Call appropriate service functions.
- Return HTTP responses.
- Avoid implementing complex business logic.

### Services

- Implement business rules.
- Coordinate database operations.
- Handle transactions.
- Maintain data integrity.
- Communicate with other modules through defined service interfaces.

### Models

- Define schemas.
- Maintain schema-level validation.
- Define indexes.
- Represent database entities.

### Middlewares

- Authentication.
- Authorization.
- Request validation.
- Centralized error handling.
- Audit interception where appropriate.

# 5. FRONTEND ARCHITECTURE

## 5.1 Application Layout

The application uses a protected admin layout.

Main structure:

Admin Dashboard
├── Sidebar Navigation
├── Top Header
├── Main Content
└── Notifications / User Menu

## 5.2 Routing

Proposed routes:

- `/login`
- `/dashboard`
- `/members`
- `/members/:id`
- `/memberships`
- `/membership-plans`
- `/trainers`
- `/trainers/:id`
- `/assignments`
- `/payments`
- `/commissions`
- `/commissions/statements`
- `/commissions/payouts`
- `/notifications`
- `/reports`
- `/settings`
- `/audit-logs`

All application routes except login must be protected.

## 5.3 Authentication Flow

1. Admin submits login credentials.
2. Frontend sends login request.
3. Backend verifies credentials.
4. Backend creates JWT.
5. JWT is delivered through HTTP-only cookie.
6. Frontend requests authenticated admin information.
7. Protected routes become accessible.
8. Logout invalidates the session according to the implemented token strategy.

Never expose the JWT to frontend JavaScript.

## 5.4 API Communication

- Centralized Axios or Fetch client.
- Credentials included where required.
- Standardized error handling.
- Consistent loading states.
- Authentication error handling.
- No hardcoded production API URLs.

## 5.5 UI Design System

Official theme: Premium Dark Monochrome.

- Near-black application background.
- Charcoal sidebar.
- Dark gray cards.
- Off-white primary text.
- Muted secondary text.
- Subtle borders.
- White primary action buttons.
- Limited semantic status colors.

Create reusable components for:

- Buttons.
- Inputs.
- Selects.
- Modals.
- Tables.
- Cards.
- Badges.
- Pagination.
- Loading states.
- Empty states.
- Confirmation dialogs.

Maintain consistent responsive behaviour.

# 6. API ARCHITECTURE

Base path:

`/api/v1`

Proposed module routes:

| Module | Base Route |
|---|---|
| Authentication | `/auth` |
| Dashboard | `/dashboard` |
| Members | `/members` |
| Membership Plans | `/membership-plans` |
| Memberships | `/memberships` |
| Trainers | `/trainers` |
| Assignments | `/trainer-assignments` |
| Payments | `/payments` |
| Commissions | `/commissions` |
| Commission Payouts | `/commission-payouts` |
| Notifications | `/notifications` |
| Capacity | `/capacity` |
| Reports | `/reports` |
| Settings | `/settings` |
| Audit Logs | `/audit-logs` |

## 6.1 API Standards

- RESTful endpoint design.
- Correct HTTP methods.
- Standard response format.
- Consistent error structure.
- Zod request validation.
- Authentication on protected routes.
- Pagination for large datasets.
- Filters and sorting where required.
- Appropriate HTTP status codes.

Example response:

{
  "success": true,
  "message": "Member created successfully",
  "data": {}
}

Error response:

{
  "success": false,
  "message": "Validation failed",
  "errors": []
}

# 7. AUTHENTICATION AND SECURITY ARCHITECTURE

## 7.1 Admin Bootstrap

Initial admin creation must use a secure backend bootstrap script.

Expected command:

`npm run seed:admin`

Requirements:

- No public registration.
- Read credentials from secure environment input or an interactive prompt.
- Hash the password before saving.
- Prevent accidental duplicate admin creation.
- Never print passwords in logs.
- Do not store default production credentials in source code.

## 7.2 Authentication

- JWT-based authentication.
- HTTP-only cookie.
- Secure cookie in production.
- SameSite protection.
- Server-side token validation.
- Protected admin routes.
- Logout and session invalidation strategy.

## 7.3 Security

- Helmet.
- Restricted CORS.
- Request validation.
- Rate limiting on authentication endpoints.
- Password hashing.
- Secure environment variables.
- Sensitive error masking.
- No credentials committed to Git.
- No sensitive information in audit logs.

# 8. BACKGROUND JOB ARCHITECTURE

Some operations must run without direct admin interaction.

## 8.1 Membership Expiry Job

Responsibilities:

- Identify memberships reaching expiry.
- Synchronize membership status.
- Prevent duplicate processing.
- Preserve historical records.

## 8.2 Membership Reminder Job

Responsibilities:

- Identify memberships expiring in three days.
- Generate notification records.
- Prevent duplicate reminder generation.
- Keep provider integration separate.

## 8.3 Notification Retry Job

Responsibilities:

- Identify failed eligible notifications.
- Check retry eligibility.
- Process retry attempts.
- Update notification status.
- Record failure details.

WhatsApp delivery remains deferred until provider selection.

## 8.4 Job Reliability

- Jobs must be idempotent.
- Use database-level safeguards against duplicate processing.
- Handle errors without crashing the main server.
- Use structured logging.
- Make retry attempts configurable.
- Consider concurrency and multiple server instances before deployment.

A job must never repeatedly apply the same membership expiry extension.

# 9. FINANCIAL PROCESSING ARCHITECTURE

Financial operations must be handled inside dedicated service layers.

## 9.1 Payment Processing

Payment Request
      |
      v
Request Validation
      |
      v
Membership Verification
      |
      v
Payment Amount Validation
      |
      v
Database Transaction
      |
      +--> Payment Record
      |
      +--> Membership Balance Update
      |
      +--> Commission Eligibility Processing
      |
      +--> Audit Log
      |
      v
Commit Transaction

If any critical operation fails, the transaction must be rolled back.

## 9.2 Commission Processing

Commission processing must be separate from payment recording.

Responsibilities:

- Resolve applicable trainer assignments.
- Resolve applicable commission agreements.
- Calculate trainer-specific commission.
- Create separate commission entries.
- Maintain calculation snapshots.
- Prevent duplicate calculations.
- Generate monthly statements.
- Support manual adjustments.
- Record payouts independently.

Multiple trainers assigned to one member must always have independent commission calculations.

The exact custom commission formula and partial-payment timing remain pending business decisions.

## 9.3 Financial Data Integrity

- No silent financial overwrites.
- No permanent deletion of completed financial records.
- Preserve historical commission agreements.
- Maintain reversal and adjustment records.
- Use MongoDB transactions for critical operations.
- Reconcile statement totals with ledger entries.

# 10. AUDIT LOGGING ARCHITECTURE

Important administrative operations must generate audit records.

Audit logging should be integrated through dedicated services or carefully designed middleware.

Events include:

- Member changes.
- Membership changes.
- Freeze and unfreeze.
- Trainer changes.
- Trainer assignments.
- Payments.
- Commission agreements.
- Commission adjustments.
- Commission payouts.
- Gym capacity updates.
- System configuration changes.

Audit records must not contain credentials or unnecessary sensitive information.

# 11. ERROR HANDLING AND LOGGING

## 11.1 Centralized Error Handling

All application errors should pass through a centralized error handler.

Handle:

- Validation errors.
- Authentication errors.
- Authorization errors.
- Database errors.
- Duplicate key errors.
- Not found errors.
- Unexpected server errors.

Never expose internal stack traces in production.

## 11.2 Logging

Use structured logging where appropriate.

Record:

- Request method.
- Endpoint.
- Response status.
- Execution time.
- Error details.
- Background job execution.
- Important financial operations.

Never log passwords, JWTs, secret keys or sensitive credentials.

# 12. ENVIRONMENT CONFIGURATION

Expected environment variables:

## Backend

- NODE_ENV
- PORT
- MONGODB_URI
- JWT_SECRET
- JWT_EXPIRES_IN
- COOKIE_NAME
- COOKIE_SECURE
- COOKIE_SAME_SITE
- CLIENT_URL
- CORS_ORIGIN

## Frontend

- VITE_API_BASE_URL

## Future Integrations

WhatsApp credentials and provider-specific configuration must be introduced only after provider approval.

Maintain `.env.example` without actual secrets.

# 13. TESTING ARCHITECTURE

Testing should cover:

## Backend

- Service unit tests.
- API integration tests.
- Request validation.
- Authentication and authorization.
- Database operations.
- Financial calculation tests.
- Background job tests.

## Frontend

- Component behaviour.
- Form validation.
- Protected routes.
- API error handling.
- Loading and empty states.
- Responsive layout.

## Critical Business Scenarios

- Membership renewal without overlapping validity.
- Automatic freeze expiry extension.
- Multiple trainers with independent commissions.
- Partial payments.
- Outstanding balance calculations.
- Commission agreement version changes.
- Partial commission payouts.
- Duplicate notification prevention.
- Restricted deletion.
- Audit history preservation.

# 14. DEPLOYMENT ARCHITECTURE

Initial deployment should use:

- One frontend application.
- One backend application.
- One MongoDB database.
- Secure production environment variables.
- HTTPS.
- Appropriate CORS configuration.
- Persistent database backups.

Background jobs may initially run within the backend process, provided they are safely scheduled and protected against duplicate execution.

If deployment later requires multiple backend instances, move scheduled job execution to a dedicated worker or distributed scheduler.

# 15. SCALABILITY AND FUTURE EXTENSIBILITY

The architecture should allow future enhancements without requiring major restructuring.

Possible future additions:

- WhatsApp provider integration.
- More detailed financial reporting.
- Exportable reports.
- Advanced dashboard analytics.
- Additional admin permissions.
- Attendance management.
- Member portal.

These are not part of the current implementation scope.

Do not build future modules prematurely.

# 16. DEVELOPMENT RULES

1. Follow AGENT_RULES.md.
2. Follow PROJECT_MASTER.md.
3. Follow DATABASE_DESIGN.md.
4. Follow this architecture document.
5. Inspect existing code before modifying it.
6. Implement approved milestones only.
7. Keep modules independent and maintainable.
8. Use services for business logic.
9. Maintain database integrity.
10. Test critical operations.
11. Update NOTES.md after each milestone.
12. Ask for approval before major architectural changes.

---

# PROJECT GOVERNANCE

| Document | Responsibility |
|---|---|
| AGENT_RULES.md | AI development behaviour |
| PROJECT_MASTER.md | Product requirements |
| DATABASE_DESIGN.md | Database entities and relationships |
| SYSTEM_ARCHITECTURE.md | Application architecture |
| README.md | Setup and project usage |
| NOTES.md | Implementation and testing history |

## FINAL ARCHITECTURAL PRINCIPLE

Build Barbell Arena using a clean, modular and secure architecture.

Prefer simplicity over unnecessary abstraction.

Keep business logic separate from controllers.

Maintain financial integrity and historical records.

Every module must follow the approved project requirements.

---

**Project:** Barbell Arena  
**Document:** SYSTEM_ARCHITECTURE.md  
**Version:** 1.0  
**Status:** Technical Draft