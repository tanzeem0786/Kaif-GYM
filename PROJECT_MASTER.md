# PROJECT MASTER — Barbell Arena

**Document Version:** 1.0  
**Project Status:** Planning / Pre-Implementation  
**Document Type:** Product Requirements & Technical Blueprint  
**Architecture:** MERN Modular Monolith  
**Branch Model:** Single Branch  
**Primary User:** Admin / Owner  
**Currency:** INR (₹)

---

# 1. PROJECT OVERVIEW

## 1.1 Introduction

Barbell Arena is a web-based Gym Management System designed to simplify and centralize daily gym operations.

The application provides an admin-only dashboard to manage members, memberships, trainers, payments, trainer commissions, notifications, reports and operational activities.

The objective is to replace manual record-keeping with a structured, reliable and maintainable management system.

## 1.2 Project Objectives

- Centralize gym member information.
- Manage membership plans and subscriptions.
- Track membership activation, expiry and freezing.
- Manage trainers and trainer-member assignments.
- Record full and partial payments.
- Calculate trainer commissions individually.
- Track commission statements and payouts.
- Support future WhatsApp membership reminders.
- Provide useful business analytics.
- Maintain financial integrity and audit history.

## 1.3 Project Characteristics

| Property | Decision |
|---|---|
| Application | Web-based |
| Gym branches | Single branch |
| Primary user | Admin / Owner |
| Member portal | Not included |
| Trainer portal | Not included |
| Architecture | Modular Monolith |
| Database | MongoDB |
| Currency | INR |
| Payment methods | Cash and UPI |
| Payment gateway | Not included |
| Admin registration | Bootstrap only |
| WhatsApp provider | To be decided later |

## 1.4 Target Outcome

A reliable gym administration platform where the owner can manage daily operations from one dashboard without maintaining separate spreadsheets or manual registers.

---

# 2. SCOPE AND USER ROLES

## 2.1 Admin / Owner

The admin is the primary and currently only authorized application user.

Admin permissions include:

- Dashboard access.
- Member management.
- Membership management.
- Trainer management.
- Trainer assignments.
- Payment recording.
- Commission configuration and management.
- Notification management.
- Reports and analytics.
- Audit log access.
- Gym configuration.
- Gym capacity management.

## 2.2 Members

Members are operational records, not application users.

Their information is maintained by the admin.

## 2.3 Trainers

Trainers are operational records, not application users.

Their profiles, assignments and commission agreements are managed by the admin.

## 2.4 Excluded User Portals

- Member login.
- Trainer login.
- Member self-service dashboard.
- Trainer self-service dashboard.

---

# 3. FUNCTIONAL MODULES

## 3.1 Dashboard and Analytics

The dashboard is the main landing page after admin authentication.

### Expected information

- Total registered members.
- Active members.
- Expired memberships.
- Members expiring soon.
- Total trainers.
- Monthly revenue.
- Monthly outstanding payments.
- Monthly commission payable.
- Recent member registrations.
- Recent payment activity.
- Gym capacity and space utilization.

### Dashboard actions

- Add new member.
- View all members.
- Manage membership.
- Record payment.
- Manage trainers.
- View reports.

### Revenue Analytics

Display revenue trends using monthly and other useful time-based filters.

Revenue must be calculated using actual received payments, not merely membership sales or subscription values.

Outstanding amounts must not be mixed with collected revenue.

## 3.2 Member Management

### Member information

- First name.
- Last name.
- Phone number.
- Email (optional).
- Gender (if required).
- Date of birth (optional).
- Address (optional).
- Profile photo (optional).
- Emergency contact (optional).
- Registration date.
- Member status.
- Notes.

### Features

- Create member.
- View member details.
- Edit member information.
- Search members.
- Filter members.
- View membership history.
- View payment history.
- View assigned trainers.
- View outstanding balance.
- Activate or deactivate eligible records.

### Member deletion

Follow the restricted deletion policy.

Prefer deactivation or archival. Never remove members whose records are required by historical financial or operational records.

## 3.3 Membership Management

### Membership Plans

Initial predefined durations:

| Plan | Duration |
|---|---|
| Monthly | 1 Month |
| Quarterly | 3 Months |
| Half Yearly | 6 Months |
| Yearly | 12 Months |

The admin should be able to configure plan details and prices.

### Membership information

- Member reference.
- Selected plan.
- Plan price snapshot.
- Start date.
- Expiry date.
- Total fee.
- Amount paid.
- Outstanding balance.
- Membership status.
- Freeze history.
- Renewal history.

### Membership Status

- Active.
- Expired.
- Frozen.
- Inactive.

### Automatic Expiry

When a membership reaches its expiry date:

- It becomes expired/inactive automatically.
- Expired members remain visible.
- Membership history is preserved.
- Expiry notifications are scheduled.

### Membership Renewal

Early renewal is allowed.

If an existing membership expires on a future date and the member renews before that date, the new membership must start sequentially after the existing membership expiry.

Do not overlap existing and renewed membership validity.

### Membership Freeze — Automatic Expiry Extension

- Only the admin can freeze a membership.
- Only the admin can unfreeze it.
- Freeze duration has no predefined maximum limit.
- Freeze start and end dates must be recorded.
- The system automatically calculates the completed freeze duration.
- The calculated duration is added to the membership expiry date.
- Multiple freeze periods must be tracked separately.
- The same freeze duration must never be applied twice.
- Freeze and unfreeze actions must be recorded in audit logs.
- Commission adjustments remain manual.

The exact handling of partial days, overlapping freezes, open-ended freezes and renewal during an active freeze requires additional approval.

## 3.4 Trainer Management

### Trainer information

- First name.
- Last name.
- Phone number.
- Email (optional).
- Profile photo (optional).
- Joining date.
- Trainer status.
- Specialization.
- Commission configuration.
- Notes.

### Features

- Add trainer.
- View trainer details.
- Edit trainer information.
- Activate/deactivate trainer.
- View assigned members.
- View commission agreements.
- View commission statements.
- View payout history.

### Trainer Status

- Active.
- Inactive.

Deactivating a trainer must not destroy historical assignments or financial records.

## 3.5 Trainer-Member Assignment

A member can have multiple trainers simultaneously.

### Assignment information

- Member ID.
- Trainer ID.
- Assignment start date.
- Assignment end date.
- Assignment status.
- Supporting proof.
- Admin notes.

### Features

- Assign trainer to member.
- Assign multiple trainers.
- Remove or end an assignment.
- View assignment history.
- Track assignment duration.
- Maintain supporting proof.

### Rules

- Multiple trainers are allowed for one member.
- Each trainer has an individual commission arrangement.
- Assignment history must be preserved.
- Commission calculations must respect applicable assignment and agreement periods.
- Supporting proof must be associated with the relevant assignment.

## 3.6 Payment Management

### Supported payment methods

- Cash.
- UPI.

### Payment Types

- Full payment.
- Partial payment.

### Payment information

- Transaction reference.
- Member ID.
- Membership ID.
- Amount.
- Payment method.
- Payment date.
- Recorded by.
- Notes.
- Transaction status.

### Features

- Record payment.
- Record partial payment.
- Record remaining balance.
- View payment history.
- Search transactions.
- Filter by payment method.
- Filter by date.
- Generate payment receipts.

### Payment Calculation

Outstanding Balance:

Total Membership Fee - Total Received Payments

Example:

Membership fee = ₹3,000

Amount received = ₹1,500

Outstanding balance = ₹1,500

### Financial Rules

- Payments are recorded manually by admin.
- No payment gateway.
- No refund functionality.
- Completed transactions must not be silently overwritten or deleted.
- Corrections must use auditable adjustment or reversal records.
- Historical transactions must remain accessible.

## 3.7 Trainer Commission Management

This is a critical financial module.

### Commission Configuration

Each trainer has an individual commission agreement.

Supported commission types:

1. Percentage-based.
2. Fixed/custom.

### Commission Unit

Commission unit: Custom.

The system must support trainer-specific commission configurations.

The exact custom unit, calculation formula and applicable conditions must be defined before implementation.

Do not assume that every fixed commission is per member, per membership or per payment.

### Commission Basis

- Membership Fee.
- Received Payment.

### Commission Rules

- Each trainer has an individual commission configuration.
- Different trainers can have different commission arrangements.
- Multiple trainers assigned to one member must be calculated individually.
- Commission agreements must be versioned.
- Historical calculations must retain their original agreement details.
- Commission schedule is manual.
- Commission processing is monthly/manual.
- Freeze-related commission adjustments are manual.
- Commission payouts are manually recorded.

### Commission Information

- Trainer ID.
- Member ID.
- Membership ID.
- Applicable agreement.
- Calculation basis.
- Commission type.
- Custom commission unit.
- Commission rate or amount.
- Calculation period.
- Calculated amount.
- Adjustment amount.
- Final payable amount.
- Payment status.
- Payout reference.

### Commission Lifecycle

1. Admin configures a trainer commission agreement.
2. Eligible membership/payment activity is recorded.
3. Commission is calculated using the applicable agreement.
4. Monthly commission statement is generated.
5. Admin reviews the statement.
6. Admin applies manual adjustments.
7. Admin records payouts.
8. System updates payout status and audit history.

### Commission Status

- Pending.
- Calculated.
- Approved (if approval is implemented).
- Partially Paid.
- Paid.
- Adjusted.

Exact status transitions require further specification.

## 3.8 Notifications

### Membership Expiry Reminder

The system must support reminders three days before membership expiry.

### Current Decision

WhatsApp provider selection and integration are postponed.

The notification module should initially remain provider-independent.

### Notification Features

- Identify members approaching expiry.
- Generate reminder messages.
- Maintain notification records.
- Track notification status.
- Support future WhatsApp delivery.
- Record delivery or failure information when available.
- Retry failed notifications.
- Maintain notification history.

### Notification Status

- Pending.
- Sent.
- Failed.
- Retry Pending.

### Constraints

- Prevent duplicate notifications.
- Ensure retry handling does not unintentionally repeat successful deliveries.
- Do not install provider-specific dependencies until approved.
- Do not store unapproved provider credentials.

## 3.9 Reports and Analytics

### Member Reports

- Total registered members.
- Active members.
- Expired members.
- New registrations.
- Membership renewals.
- Membership expiry trends.

### Revenue Reports

- Total collected revenue.
- Cash collections.
- UPI collections.
- Outstanding membership balances.
- Monthly revenue trends.

### Trainer Reports

- Trainer-wise assigned members.
- Trainer commission summary.
- Pending commission.
- Paid commission.
- Commission adjustment history.

### Payment Reports

- Payment history.
- Date-wise collections.
- Payment-method breakdown.
- Outstanding balances.

Reports should support relevant date filters.

Financial reports must use actual recorded transactions.

## 3.10 Gym Capacity Management

Gym capacity is manually managed by the admin.

### Information

- Maximum gym capacity.
- Current occupancy.
- Last updated timestamp.
- Updated by admin.

### Features

- Set maximum capacity.
- Update current occupancy.
- Display utilization percentage.
- Display remaining available capacity.
- Show capacity status on dashboard.

### Calculation

Utilization Percentage:

(Current Occupancy / Maximum Capacity) × 100

Remaining Capacity:

Maximum Capacity - Current Occupancy

### Important Rules

- Admin is responsible for updating occupancy.
- The system must not infer actual occupancy from active memberships.
- No attendance module is included.
- Prevent negative occupancy and invalid capacity values.
- Occupancy must not exceed maximum capacity unless an explicitly approved override mechanism is introduced.

## 3.11 Audit Logs

Maintain accountability across important system activities.

### Events

- Member creation and modification.
- Membership creation and renewal.
- Membership freeze and unfreeze.
- Trainer creation and modification.
- Trainer assignment changes.
- Commission agreement changes.
- Commission adjustments.
- Payment recording.
- Financial corrections.
- Commission payout recording.
- Notification operations.
- Gym capacity changes.
- Important configuration changes.

### Audit Information

- Actor/admin ID.
- Action.
- Module.
- Record reference.
- Previous values where appropriate.
- New values where appropriate.
- Timestamp.
- Additional metadata.

Audit logs must not be permanently deleted or silently modified.

---

# 4. COMPLETE BUSINESS RULES

| Area | Finalized Rule |
|---|---|
| Gym | Single branch |
| User | Admin / Owner only |
| Membership plans | 1, 3, 6, 12 months |
| Membership expiry | Automatic |
| Early renewal | Allowed |
| Renewal validity | Sequential |
| Membership freeze | Admin-controlled |
| Freeze expiry extension | Automatic |
| Freeze duration | No predefined maximum |
| Multiple trainers | Allowed |
| Commission | Individual per trainer |
| Commission type | Percentage / Fixed-custom |
| Commission unit | Custom |
| Commission basis | Membership fee / Received payment |
| Commission schedule | Manual |
| Commission processing | Monthly / Manual |
| Freeze commission | Manual adjustment |
| Payments | Cash / UPI |
| Payment entry | Manual |
| Partial payments | Allowed |
| Payment gateway | Not included |
| Refunds | Not included |
| Expiry reminder | 3 days before expiry |
| WhatsApp integration | Deferred |
| Gym capacity | Admin-managed |
| Occupancy | Manual |
| Admin registration | No public registration |
| Admin creation | Secure bootstrap |
| Deletion | Restricted |
| Financial history | Preserved |
| Audit logs | Never permanently deleted |

---

# 5. USER WORKFLOWS

## 5.1 New Member Registration

1. Admin opens member management.
2. Admin selects Add Member.
3. Admin enters member details.
4. System validates information.
5. Member record is created.
6. Admin selects a membership plan.
7. Membership is created.
8. Admin records initial payment, if received.
9. Dashboard updates relevant metrics.

## 5.2 Membership Renewal

1. Admin opens member profile.
2. Admin selects Renew Membership.
3. System retrieves existing membership information.
4. Admin selects a new plan.
5. System determines the sequential start date.
6. New membership is created.
7. Payment is recorded.
8. Renewal history is updated.

## 5.3 Membership Freeze

1. Admin opens member details.
2. Admin selects Freeze Membership.
3. Admin enters freeze information.
4. System records the freeze start date.
5. Membership status changes to Frozen.
6. Admin unfreezes the membership when appropriate.
7. System calculates completed freeze duration.
8. System automatically extends expiry.
9. Commission adjustments remain manual.
10. Audit history is maintained.

## 5.4 Trainer Assignment

1. Admin opens a member profile.
2. Admin selects Assign Trainer.
3. Admin chooses a trainer.
4. Admin attaches supporting proof.
5. Assignment is recorded.
6. Assignment history is updated.
7. Commission eligibility follows the applicable trainer agreement.

## 5.5 Payment Recording

1. Admin opens payment management.
2. Admin selects a member and membership.
3. Admin enters received amount.
4. Admin selects Cash or UPI.
5. System validates the amount.
6. Payment transaction is recorded.
7. Outstanding balance is recalculated.
8. Eligible commission calculations are updated according to the configured basis.

## 5.6 Commission Processing

1. Admin opens commission management.
2. Admin selects the relevant monthly period.
3. System prepares commission calculations.
4. Admin reviews statements.
5. Admin applies manual adjustments.
6. Admin confirms payable amounts.
7. Admin records actual payouts.
8. System updates payout status and audit history.

## 5.7 Gym Capacity Update

1. Admin opens gym settings or dashboard capacity section.
2. Admin updates maximum capacity if required.
3. Admin enters current occupancy.
4. System validates both values.
5. Dashboard updates utilization and remaining capacity.
6. System records the update in audit logs.

## 5.8 Future WhatsApp Reminder Workflow

1. System identifies memberships expiring in three days.
2. Eligible notification records are generated.
3. An approved WhatsApp provider processes delivery.
4. Notification results are recorded.
5. Failed notifications enter the retry process.
6. Notification history remains available.

This integration is deferred until provider selection is approved.

---

# 6. SYSTEM ARCHITECTURE

## 6.1 Architecture Style

Modular Monolith.

Separate logical modules within one backend application and one primary database.

Avoid premature microservice architecture.

## 6.2 Technology Stack

### Frontend
- React.
- Vite.
- Tailwind CSS.

### Backend
- Node.js.
- Express.js.

### Database
- MongoDB.
- Mongoose.

### Validation
- Zod.

### Communication
- REST API.
- JSON request and response format.

### Authentication
- JWT.
- HTTP-only cookies.
- Secure admin bootstrap.

## 6.3 High-Level Architecture

Browser / Admin Dashboard
        |
        v
React + Vite + Tailwind
        |
        v
REST API (/api/v1)
        |
        v
Express Application
        |
        +-- Authentication Module
        +-- Member Module
        +-- Membership Module
        +-- Trainer Module
        +-- Assignment Module
        +-- Payment Module
        +-- Commission Module
        +-- Notification Module
        +-- Capacity Module
        +-- Reports Module
        +-- Audit Module
        +-- Settings Module
        |
        v
Service Layer
        |
        v
MongoDB + Mongoose

Future WhatsApp integration will connect through the notification module using an approved provider adapter.

---

# 7. DATABASE DESIGN

The following are proposed logical entities. Exact schemas and relationships must be validated during database design.

## 7.1 Core Entities

| Entity | Responsibility |
|---|---|
| Admin | Admin authentication |
| Member | Gym member information |
| Trainer | Trainer information |
| MembershipPlan | Available membership plans |
| Membership | Member subscription records |
| MembershipFreeze | Freeze history and duration |
| TrainerAssignment | Trainer-member relationships |
| Payment | Payment transactions |
| CommissionAgreement | Trainer commission configuration and versions |
| CommissionStatement | Monthly commission calculations |
| CommissionLedger | Commission adjustments and financial entries |
| CommissionPayout | Actual trainer payouts |
| Notification | Notification records and delivery status |
| AuditLog | Historical system activities |
| GymSettings | Gym configuration and capacity |

## 7.2 Relationship Overview

- One admin manages the gym.
- One member can have multiple memberships over time.
- One membership belongs to one member.
- One membership references one selected plan.
- One membership can have multiple freeze records.
- One member can have multiple trainer assignments.
- One trainer can be assigned to multiple members.
- One membership can have multiple payment transactions.
- One trainer can have multiple commission agreements over time.
- One commission statement can contain multiple commission entries.
- Commission payouts belong to a trainer.
- Audit logs reference relevant system records.

## 7.3 Data Integrity

- Preserve historical membership prices.
- Preserve historical commission agreements.
- Preserve completed payment transactions.
- Preserve assignment history.
- Preserve freeze history.
- Preserve commission calculation details.
- Preserve financial adjustments.
- Prevent duplicate notification processing.
- Use appropriate MongoDB indexes.
- Use database transactions for operations that require atomicity.

## 7.4 Financial Record Design

Financial records are historical records.

Do not overwrite existing values to correct financial mistakes.

Use auditable reversal and adjustment entries so original transactions remain traceable.

---

# 8. REST API STRUCTURE

## 8.1 API Versioning

Base URL:

`/api/v1`

Use RESTful endpoints with JSON communication.

## 8.2 Proposed API Groups

- `/api/v1/auth`
- `/api/v1/dashboard`
- `/api/v1/members`
- `/api/v1/membership-plans`
- `/api/v1/memberships`
- `/api/v1/trainers`
- `/api/v1/trainer-assignments`
- `/api/v1/payments`
- `/api/v1/commissions`
- `/api/v1/commission-payouts`
- `/api/v1/notifications`
- `/api/v1/capacity`
- `/api/v1/reports`
- `/api/v1/audit-logs`
- `/api/v1/settings`

These are proposed route groups, not finalized endpoint-by-endpoint API contracts.

## 8.3 API Standards

- Consistent response structure.
- Correct HTTP methods.
- Appropriate HTTP status codes.
- Centralized error handling.
- Server-side validation.
- Authentication and authorization middleware.
- Pagination and filtering.
- Consistent error messages.
- API documentation maintained with implementation.

---

# 9. AUTHENTICATION AND SECURITY

## 9.1 Admin Bootstrap

- No public registration endpoint.
- Initial admin account created through a secure bootstrap/seed process.
- Bootstrap must prevent accidental duplicate admin creation.
- Passwords must be securely hashed.
- Credentials must never be hardcoded or committed.
- Bootstrap execution must be restricted to authorized environments.
- Normal login and logout functionality is required.

## 9.2 Authentication

- JWT-based authentication.
- HTTP-only cookie storage.
- Secure production cookie configuration.
- Protected API routes.
- Server-side authorization.
- Zod validation.
- Environment variable management.
- Restricted CORS configuration.
- Sensitive data protection.

No member or trainer authentication system is required.

---

# 10. DASHBOARD UI/UX DESIGN

## 10.1 Official Design Reference

The provided goJim Gym Management dashboard screenshot is the official visual reference.

Follow its dark, minimal and premium appearance without copying its branding or exact layout.

## 10.2 Theme

Premium Dark Monochrome.

| UI Element | Direction |
|---|---|
| Main background | Near black |
| Sidebar | Charcoal |
| Cards | Dark gray |
| Primary text | Off-white |
| Secondary text | Muted gray |
| Borders | Subtle gray |
| Primary buttons | White with dark text |
| Status indicators | Limited accent colors |

## 10.3 Layout Direction

- Persistent sidebar navigation.
- Compact top navigation/header.
- Information-focused dashboard cards.
- Clean tables.
- Consistent forms and dialogs.
- Search and filter controls.
- Responsive dashboard.
- Clear visual hierarchy.

Maintain the same visual language across every module.

---

# 11. NOTIFICATIONS, REPORTS AND SYSTEM OPERATIONS

## 11.1 Background Operations

The system will require scheduled operations for:

- Membership expiry detection.
- Automatic freeze-duration processing.
- Three-day expiry reminder generation.
- Future notification retries.
- Membership status synchronization where required.

Background operations must be reliable, idempotent and auditable.

## 11.2 Notification Provider

WhatsApp provider selection is deferred.

Keep the notification business logic separate from provider-specific integration.

Do not add provider dependencies until approved.

## 11.3 Reporting

Reports must use actual database records and preserve historical accuracy.

Revenue represents received payments.

Commission reports reflect the applicable agreement and recorded adjustments.

Capacity reports use admin-maintained values.

---

# 12. DEVELOPMENT CONSTRAINTS AND PENDING DECISIONS

## 12.1 Mandatory Constraints

- Follow AGENT_RULES.md.
- Implement milestone by milestone.
- Do not invent business rules.
- Do not introduce unapproved features.
- Do not change architecture independently.
- Preserve historical financial records.
- Use strict approval for destructive changes.
- Update NOTES.md after each milestone.
- Test actual functionality before reporting completion.

## 12.2 Pending Business Decisions

### Membership

- How should partial freeze days be calculated?
- Can multiple freeze periods overlap?
- What happens if a member renews during an active freeze?
- Can an expired membership be frozen?
- Is freeze start date always the current date or can the admin select a past date?

### Commission

- Exact custom commission unit definition.
- Custom calculation formula.
- How partial payments affect commission.
- How multiple trainers share or independently earn commission.
- How commission agreements apply when changed mid-month.
- How overpayments and commission corrections are handled.
- Exact payout approval and status transitions.

### Gym Capacity

- Should maximum capacity and current occupancy both be editable?
- Should occupancy allow a controlled override above maximum capacity?
- Should occupancy have a daily history?

### Notifications

- WhatsApp provider selection.
- Retry intervals.
- Maximum retry attempts.
- Message templates.
- Provider delivery-status support.

### Authentication

- Password recovery workflow.
- Admin bootstrap command and execution safeguards.
- Session expiry and token refresh policy.

### General System

- Gym timezone and date-boundary conventions.
- Receipt format.
- Report export formats.
- Audit log retention and access policy.
- Complete GymSettings fields.

These decisions must be finalized before implementing their respective functionality.

## 12.3 Out of Scope

- Multiple branches.
- Member portal.
- Trainer portal.
- Payment gateway.
- Mobile app.
- Attendance management.
- Workout management.
- Diet management.
- AI fitness recommendations.

Future expansion requires explicit approval.

---

# PROJECT GOVERNANCE

The following documents work together:

| Document | Responsibility |
|---|---|
| AGENT_RULES.md | How AI agents must work |
| PROJECT_MASTER.md | What the product is and how it works |
| README.md | Project setup and usage |
| NOTES.md | Milestone implementation and testing history |

## FINAL PROJECT PRINCIPLE

Build Barbell Arena as a secure, reliable and maintainable gym management platform.

Business correctness, financial accuracy, data integrity and usability take priority over unnecessary complexity.

Do not implement assumptions as finalized requirements.

Every major implementation must follow approved project milestones.

---
### Multiple Trainer Commission Rule — FINALIZED

A single member can have multiple trainers assigned simultaneously.

Each trainer earns commission independently according to their own applicable commission agreement.

Example:

Membership fee: ₹3,000

- Trainer A: 20% commission = ₹600
- Trainer B: 15% commission = ₹450

Total trainer commission liability = ₹1,050.

Mandatory rules:

- No combined commission pool.
- No automatic commission sharing.
- Separate commission calculations for each trainer.
- Separate commission ledger entries.
- Independent trainer-wise statements.
- Independent payout tracking.
- One trainer's payout status must not affect another trainer.
- Commission calculations must respect the applicable agreement and assignment period.



**Project:** Barbell Arena  
**Document:** PROJECT_MASTER.md  
**Version:** 1.0  
**Status: Confirmed Business Rule.**