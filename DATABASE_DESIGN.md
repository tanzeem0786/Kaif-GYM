# DATABASE DESIGN — Barbell Arena

**Version:** 1.0  
**Status:** Technical Draft  
**Database:** MongoDB  
**ODM:** Mongoose  
**Architecture:** Modular Monolith  
**Currency:** INR (₹)

---

# 1. DATABASE OVERVIEW

Barbell Arena uses MongoDB as its primary database.

The database is designed to support:
- Member management.
- Membership subscriptions and renewals.
- Membership freeze history.
- Trainer management and assignments.
- Manual payment recording.
- Individual trainer commissions.
- Commission statements and payouts.
- Gym capacity management.
- Notifications.
- Audit logs.
- Admin authentication.

## 1.1 Database Principles

1. Use separate collections for independent business entities.
2. Use ObjectId references for relationships.
3. Preserve historical financial records.
4. Store snapshots of values that may change over time.
5. Avoid unnecessary document duplication.
6. Use transactions for critical multi-document financial operations.
7. Apply indexes according to actual query patterns.
8. Never permanently delete historical financial records.

# 2. COLLECTION STRUCTURE

Proposed collections:

| Collection | Purpose |
|---|---|
| admins | Admin authentication |
| members | Member profiles |
| trainers | Trainer profiles |
| membershipPlans | Membership plan configuration |
| memberships | Subscription records |
| membershipFreezes | Freeze history |
| trainerAssignments | Member-trainer relationships |
| payments | Payment transactions |
| commissionAgreements | Trainer commission agreements |
| commissionStatements | Monthly commission statements |
| commissionEntries | Individual commission calculations |
| commissionLedger | Commission adjustments and financial history |
| commissionPayouts | Trainer payout records |
| notifications | Notification history |
| gymSettings | Gym configuration |
| auditLogs | System activity history |

# 3. COLLECTION SCHEMAS

The following schemas describe the proposed logical structure. Exact validation, enums and implementation details must follow existing project conventions.

## 3.1 Admin

Collection: `admins`

Purpose: Store the authorized gym administrator.

| Field | Type | Description |
|---|---|---|
| _id | ObjectId | Primary identifier |
| name | String | Admin name |
| email | String | Unique login email |
| password | String | Hashed password |
| isActive | Boolean | Account status |
| lastLoginAt | Date | Last login |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Update timestamp |

Rules:
- No public admin registration.
- Initial account created using secure bootstrap.
- Password must be hashed.
- Never expose password in API responses.
- Unique index on normalized email.

## 3.2 Member

Collection: `members`

Purpose: Store gym member information.

| Field | Type | Description |
|---|---|---|
| _id | ObjectId | Primary identifier |
| memberCode | String | Unique member reference |
| fullName | String | Member's full name |
| fatherName | String | Father's name |
| phone | String | Contact number |
| email | String | Optional email |
| gender | String | Optional gender |
| dateOfBirth | Date | Optional DOB |
| address | Object | Address information |
| profileImage | String | Optional image URL |
| emergencyContact | Object | Emergency information |
| registrationDate | Date | Registration date |
| status | String | Active / Inactive |
| notes | String | Admin notes |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Update timestamp |

Rules:
- Member codes use `BA` followed by four digits, starting at `BA0001`, and must
  be unique.
- Sequential allocation checks member profiles and retained member-history
  snapshots; duplicate-key conflicts are retried.
- Phone number must be validated.
- Deactivation must preserve historical relationships.
- Permanent deletion is blocked while an active membership or trainer assignment exists.
- Deletion preserves payment, audit, membership and assignment history; historical
  memberships, payments and assignments retain a member snapshot.

## 3.3 Trainer

Collection: `trainers`

| Field | Type | Description |
|---|---|---|
| _id | ObjectId | Primary identifier |
| trainerCode | String | Unique trainer reference |
| firstName | String | First name |
| lastName | String | Last name |
| phone | String | Contact number |
| email | String | Optional email |
| profileImage | String | Optional image URL |
| specialization | [String] | Trainer expertise |
| joiningDate | Date | Joining date |
| status | String | Active / Inactive |
| notes | String | Admin notes |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Update timestamp |

Rules:
- Trainer deactivation must preserve historical assignments.
- Commission agreements remain independent from trainer profile changes.

## 3.4 MembershipPlan

Collection: `membershipPlans`

| Field | Type | Description |
|---|---|---|
| _id | ObjectId | Primary identifier |
| name | String | Plan name |
| durationMonths | Number | 1, 3, 6 or 12 |
| price | Number | Current plan price |
| description | String | Optional description |
| isActive | Boolean | Availability |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Update timestamp |

Rules:
- Duration must follow approved plan options.
- Price must be non-negative.
- Existing membership prices must not change when a plan price is updated.
- Inactive plans cannot be selected for new memberships.

## 3.5 Membership

Collection: `memberships`

Purpose: Store subscription history.

| Field | Type | Description |
|---|---|---|
| _id | ObjectId | Primary identifier |
| membershipCode | String | Unique subscription reference |
| member | ObjectId | Member reference |
| plan | ObjectId | Membership plan reference |
| planSnapshot | Object | Historical plan details |
| startDate | Date | Membership start |
| expiryDate | Date | Current calculated expiry |
| originalExpiryDate | Date | Initial expiry before freeze extensions |
| totalFee | Number | Membership fee |
| amountPaid | Number | Derived payment total / cached value |
| outstandingBalance | Number | Derived outstanding balance |
| status | String | Active / Frozen / Expired / Inactive |
| renewalOf | ObjectId | Previous membership reference |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Update timestamp |

Suggested planSnapshot:

- name
- durationMonths
- price

Rules:
- Membership belongs to one member.
- Store price snapshot.
- Preserve renewal history.
- Never overwrite old membership records during renewal.
- Expiry calculation must use approved date-handling rules.
- Payment totals must reconcile with payment records.

## 3.6 MembershipFreeze

Collection: `membershipFreezes`

Purpose: Track each freeze period independently.

| Field | Type | Description |
|---|---|---|
| _id | ObjectId | Primary identifier |
| membership | ObjectId | Membership reference |
| member | ObjectId | Member reference |
| freezeStartDate | Date | Freeze start |
| unfreezeDate | Date | Actual unfreeze date |
| calculatedDays | Number | Calculated freeze duration |
| appliedDays | Number | Days actually applied to expiry |
| expiryExtensionApplied | Boolean | Idempotency tracking |
| appliedAt | Date | Extension application timestamp |
| status | String | Frozen / Completed |
| reason | String | Optional reason |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Update timestamp |

Rules:
- Each freeze period has an independent record.
- Unfreeze operation calculates the duration.
- Completed freeze duration is automatically added to expiry.
- The extension must not be applied twice.
- Freeze history must remain preserved.
- Use an atomic database operation or transaction for unfreeze and expiry extension.
- Overlapping and partial-day rules require final business approval.

## 3.7 TrainerAssignment

Collection: `trainerAssignments`

Purpose: Maintain member-trainer relationships.

| Field | Type | Description |
|---|---|---|
| _id | ObjectId | Primary identifier |
| member | ObjectId | Member reference |
| trainer | ObjectId | Trainer reference |
| startDate | Date | Assignment start |
| endDate | Date | Assignment end |
| status | String | Active / Ended |
| proof | Object | Supporting document metadata |
| notes | String | Admin notes |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Update timestamp |

Rules:
- One member can have multiple trainers.
- One trainer can have multiple members.
- Each assignment is independently maintained.
- Historical assignments must not be deleted.
- Commission eligibility depends on applicable assignment periods.

## 3.8 Payment

Collection: `payments`

Purpose: Store individual payment transactions.

| Field | Type | Description |
|---|---|---|
| _id | ObjectId | Primary identifier |
| transactionCode | String | Unique transaction reference |
| member | ObjectId | Member reference |
| membership | ObjectId | Membership reference |
| amount | Number | Received amount |
| paymentMethod | String | Cash / UPI |
| paymentDate | Date | Payment date |
| referenceNumber | String | Optional UPI reference |
| status | String | Completed / Reversed |
| notes | String | Optional notes |
| recordedBy | ObjectId | Admin reference |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Update timestamp |

Rules:
- Payments are manually recorded.
- Partial payments are allowed.
- Amount must be positive.
- Payment cannot silently be overwritten or deleted.
- Financial corrections must use approved reversal or adjustment workflows.
- Completed payment records must remain auditable.

## 3.9 CommissionAgreement

Collection: `commissionAgreements`

Purpose: Store individual trainer commission arrangements.

| Field | Type | Description |
|---|---|---|
| _id | ObjectId | Primary identifier |
| trainer | ObjectId | Trainer reference |
| agreementVersion | Number | Agreement version |
| commissionType | String | Percentage / Fixed |
| commissionBasis | String | Membership Fee / Received Payment |
| commissionUnit | String | Custom unit |
| commissionValue | Number | Rate or amount |
| customFormulaConfig | Object | Optional structured configuration |
| effectiveFrom | Date | Agreement start |
| effectiveTo | Date | Optional agreement end |
| status | String | Active / Historical |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Update timestamp |

Rules:
- Every trainer has independent commission agreements.
- Agreement changes must create a new historical version.
- Previous agreements must remain accessible.
- Custom unit definitions must be validated before implementation.
- Never reinterpret historical calculations using a newer agreement.

## 3.10 CommissionStatement

Collection: `commissionStatements`

Purpose: Maintain trainer-wise monthly statements.

| Field | Type | Description |
|---|---|---|
| _id | ObjectId | Primary identifier |
| statementCode | String | Unique statement reference |
| trainer | ObjectId | Trainer reference |
| periodStart | Date | Period start |
| periodEnd | Date | Period end |
| grossCommission | Number | Calculated commission |
| totalAdjustments | Number | Manual adjustments |
| finalPayable | Number | Net payable |
| totalPaid | Number | Amount paid |
| remainingPayable | Number | Remaining balance |
| status | String | Draft / Finalized / Partially Paid / Paid |
| finalizedAt | Date | Finalization timestamp |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Update timestamp |

Rules:
- Statements are trainer-specific.
- Different trainers must have independent statements.
- A trainer payout must not modify another trainer's statement.
- Finalized statements must preserve their original calculations.

## 3.11 CommissionEntry

Collection: `commissionEntries`

Purpose: Store individual commission calculations.

| Field | Type | Description |
|---|---|---|
| _id | ObjectId | Primary identifier |
| statement | ObjectId | Statement reference |
| trainer | ObjectId | Trainer reference |
| member | ObjectId | Member reference |
| membership | ObjectId | Membership reference |
| assignment | ObjectId | Applicable assignment |
| agreement | ObjectId | Applicable agreement |
| commissionBasis | String | Membership Fee / Received Payment |
| basisAmount | Number | Amount used for calculation |
| calculationSnapshot | Object | Historical formula inputs |
| calculatedAmount | Number | Commission result |
| adjustmentAmount | Number | Adjustment |
| finalAmount | Number | Final commission amount |
| status | String | Pending / Calculated / Finalized |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Update timestamp |

Rules:
- Generate independent entries for each eligible trainer.
- Never combine multiple trainers into one commission entry.
- Preserve calculation snapshots.
- Prevent duplicate entries for the same source event.
- Partial payment eligibility and calculation timing remain configurable pending final approval.

## 3.12 CommissionLedger

Collection: `commissionLedger`

Purpose: Maintain commission financial history.

| Field | Type | Description |
|---|---|---|
| _id | ObjectId | Primary identifier |
| trainer | ObjectId | Trainer reference |
| commissionEntry | ObjectId | Optional entry reference |
| statement | ObjectId | Optional statement reference |
| transactionType | String | Credit / Adjustment / Reversal / Payout |
| amount | Number | Ledger amount |
| reference | Object | Source reference |
| description | String | Explanation |
| recordedBy | ObjectId | Admin reference |
| createdAt | Date | Timestamp |

Rules:
- Preserve historical ledger entries.
- Do not silently edit financial entries.
- Corrections must create traceable entries.
- Payouts and adjustments must be individually traceable.

## 3.13 CommissionPayout

Collection: `commissionPayouts`

| Field | Type | Description |
|---|---|---|
| _id | ObjectId | Primary identifier |
| payoutCode | String | Unique payout reference |
| trainer | ObjectId | Trainer reference |
| statement | ObjectId | Statement reference |
| amount | Number | Paid amount |
| paymentMethod | String | Cash / UPI |
| payoutDate | Date | Payout date |
| referenceNumber | String | Optional reference |
| status | String | Completed / Reversed |
| recordedBy | ObjectId | Admin reference |
| createdAt | Date | Timestamp |
| updatedAt | Date | Update timestamp |

Rules:
- Payouts are manually recorded.
- Partial payouts may be supported.
- Payout cannot exceed remaining payable amount.
- Each payout must be independently traceable.
- Payout history must be preserved.

## 3.14 Notification

Collection: `notifications`

| Field | Type | Description |
|---|---|---|
| _id | ObjectId | Primary identifier |
| member | ObjectId | Member reference |
| membership | ObjectId | Membership reference |
| notificationType | String | Expiry Reminder |
| scheduledAt | Date | Scheduled time |
| channel | String | Future WhatsApp |
| provider | String | Optional provider |
| status | String | Pending / Sent / Failed / Retry Pending |
| attempts | Number | Attempt count |
| nextRetryAt | Date | Retry schedule |
| providerReference | String | Optional external reference |
| lastError | String | Last failure reason |
| sentAt | Date | Successful send time |
| createdAt | Date | Timestamp |
| updatedAt | Date | Update timestamp |

Rules:
- Generate reminders three days before expiry.
- Prevent duplicate reminders for the same membership and reminder event.
- Support future provider integration.
- Never store sensitive provider credentials in notification documents.

## 3.15 GymSettings

Collection: `gymSettings`

Purpose: Maintain single-branch gym configuration.

Proposed fields:

- gymName
- contactNumber
- email
- address
- maximumCapacity
- currentOccupancy
- timezone
- notificationSettings
- createdAt
- updatedAt

Rules:
- One settings document for the gym.
- Maximum capacity and current occupancy are admin-managed.
- Utilization is calculated, not independently stored as authoritative data.
- Capacity changes must be audited.

## 3.16 AuditLog

Collection: `auditLogs`

Purpose: Maintain system activity history.

| Field | Type | Description |
|---|---|---|
| _id | ObjectId | Primary identifier |
| actor | ObjectId | Admin reference |
| action | String | Performed action |
| module | String | Module name |
| entityId | ObjectId | Affected record |
| previousData | Mixed | Relevant previous values |
| newData | Mixed | Relevant new values |
| metadata | Object | Additional context |
| ipAddress | String | Optional request IP |
| createdAt | Date | Event timestamp |

Rules:
- Audit logs are append-only.
- Never permanently delete audit records.
- Never store passwords, tokens or credentials.
- Avoid storing unnecessary sensitive personal information.

# 4. COLLECTION RELATIONSHIPS

## 4.1 Member Relationships

- Member → Memberships: One-to-Many.
- Member → TrainerAssignments: One-to-Many.
- Member → Payments: One-to-Many.
- Member → Notifications: One-to-Many.

## 4.2 Trainer Relationships

- Trainer → TrainerAssignments: One-to-Many.
- Trainer → CommissionAgreements: One-to-Many.
- Trainer → CommissionStatements: One-to-Many.
- Trainer → CommissionEntries: One-to-Many.
- Trainer → CommissionPayouts: One-to-Many.
- Trainer → CommissionLedger: One-to-Many.

## 4.3 Membership Relationships

- Membership → Member: Many-to-One.
- Membership → MembershipPlan: Many-to-One.
- Membership → MembershipFreezes: One-to-Many.
- Membership → Payments: One-to-Many.
- Membership → TrainerAssignments: One-to-Many over its lifecycle.
- Membership → CommissionEntries: One-to-Many.

## 4.4 Commission Relationships

- CommissionAgreement → Trainer: Many-to-One.
- CommissionStatement → Trainer: Many-to-One.
- CommissionEntry → Statement: Many-to-One.
- CommissionEntry → Agreement: Many-to-One.
- CommissionPayout → Trainer: Many-to-One.
- CommissionPayout → Statement: Many-to-One.

# 5. INDEXING STRATEGY

Initial proposed indexes:

| Collection | Index |
|---|---|
| admins | email unique |
| members | memberCode unique |
| members | phone |
| members | status |
| trainers | trainerCode unique |
| trainers | status |
| memberships | member + startDate |
| memberships | status + expiryDate |
| memberships | expiryDate |
| membershipFreezes | membership + status |
| trainerAssignments | member + status |
| trainerAssignments | trainer + status |
| payments | membership + paymentDate |
| payments | member + paymentDate |
| payments | transactionCode unique |
| commissionAgreements | trainer + effectiveFrom |
| commissionStatements | trainer + periodStart + periodEnd |
| commissionEntries | statement + trainer |
| commissionLedger | trainer + createdAt |
| commissionPayouts | trainer + payoutDate |
| notifications | status + scheduledAt |
| notifications | membership + notificationType |
| auditLogs | module + createdAt |
| auditLogs | entityId + createdAt |

Unique constraints must be selected according to actual business rules. For example, notification deduplication should use an appropriate event identifier rather than an overly broad unique index.

# 6. FINANCIAL INTEGRITY

Financial operations must follow strict consistency rules.

## 6.1 Payment Integrity

- Never silently overwrite completed payments.
- Preserve original transaction references.
- Use approved reversal and correction records.
- Reconcile membership payment totals with payment records.
- Use transactions for payment creation and dependent updates.

## 6.2 Commission Integrity

- Each trainer earns commission independently.
- Preserve applicable agreement versions.
- Preserve calculation snapshots.
- Separate commission entries by trainer.
- Maintain individual statements and payouts.
- Do not recalculate historical finalized statements using changed agreements.

## 6.3 Atomic Operations

Use MongoDB transactions where related operations must succeed or fail together.

Examples:

- Payment creation and corresponding balance updates.
- Freeze completion and expiry extension.
- Commission statement finalization.
- Commission payout and statement balance update.

## 6.4 Restricted Deletion

- Prefer archival or deactivation.
- Preserve financial history.
- Preserve audit logs.
- Prevent cascading deletion of historical records.
- Require explicit approval for destructive database operations.

# 7. DATA VALIDATION AND GENERAL RULES

- Validate all API inputs before database writes.
- Use Zod for request validation.
- Use Mongoose schema validation as a second layer.
- Validate ObjectId references.
- Reject invalid negative monetary values.
- Use consistent date storage and timezone handling.
- Use appropriate decimal precision for money.
- Do not use floating-point calculations carelessly for financial amounts.
- Store currency as INR for the initial release.
- Use timestamps consistently.

# 8. PENDING IMPLEMENTATION DETAILS

The following are intentionally not hardcoded:

- Custom commission unit formula.
- Partial-payment commission timing.
- Freeze partial-day rounding.
- Overlapping freeze behaviour.
- Renewal during an active freeze.
- Exact commission statement finalization rules.
- Notification provider and retry policy.
- Gym timezone configuration.

These must follow approved business decisions before implementation.

---

**Project:** Barbell Arena  
**Document:** DATABASE_DESIGN.md  
**Version:** 1.0  
**Status:** Technical Draft