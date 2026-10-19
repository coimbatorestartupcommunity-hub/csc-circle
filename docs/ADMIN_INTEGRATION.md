# CSC Circle — Admin (Phase 4) Integration Contracts

How the Phase 4 admin UI connects to trusted backend services in Phase 1. The
dashboard ships **fail-closed**: in production, with no provisioned admin, every
`/admin/**` route renders the unavailable page and no admin data is exposed. The
dev preview (DEMO) is server-gated and never active in production.

## Shared models (one source of truth)

The public site, member portal and admin dashboard use the SAME models/status
unions: `src/types/member.ts` (membership, registration, consultation, review
statuses) and `src/types/admin.ts` (admin row shapes). No duplicate definitions.

## Access model

- Roles & permissions: `src/lib/admin/permissions.ts` (7 roles, 18 permissions).
- Server gate: `src/lib/admin/gate.ts` (`getAdminContext`) — reads the verified
  Supabase session, then the `admin_roles` rows for that user. Modes:
  `live` (provisioned admin) · `preview` (dev DEMO) · `forbidden` (signed-in
  non-admin) · `closed` (prod, no session).
- The frontend only SHOWS actions the permission contract allows; the backend
  MUST enforce every permission via RLS + privileged operations. A matching
  email or any client value is never authority.

## Tables (migrations applied: `supabase/migrations/`)

Core (0001/0002): `profiles`, `memberships`, `membership_claims`, `events`,
`event_registrations`, `consultations`, `reviews`, `directory_startups`,
`public_testimonials` view. RLS on all; member-number generator; signup trigger.

Admin (0003): `admin_roles`, `audit_logs`, `content_blocks`, `media_assets`,
`notifications`. RLS fails closed (admin-only reads via `is_admin()`); NO client
write policies — privileged writes run through service-role operations in Phase 1.

## Provisioning the first admin (Phase 1, DBA-only)

Insert a row into `admin_roles(user_id, role)` for a verified `auth.users.id`
(e.g. `super_admin`) through a restricted operation. Never derive admin access
from an email string or UI input.

## Workflow contracts

**A — Member application:** member submits claim (`membership_claims`) → admin
reviews (`members.approve`) → approve transitions membership
`claim_submitted → pending_verification → approved → active` and issues a unique
`member_number` (server) → member ID becomes valid. Audit each step.

**B — Event creation:** admin creates/edits (`events.create/update`) → save draft
→ publish (`events.publish`) transactional → `events.status='published'` → public
queries return it → Home/Events update via cache revalidation → audit who changed.

**C — Free registration:** user submits → server validates → capacity checked →
confirmed or pending → event pass issued ONLY when `status ∈ {confirmed, checked_in}`.

**D — Paid registration:** user registers → payment required → manual verification
(`payments.verify`) against securely-stored evidence → confirm → pass available.
A screenshot alone is never settlement; no gateway without approval.

**E — Attendance:** authorized staff scan (`attendance.scan`) → server verifies
staff permission + event match + eligibility + payment + revocation, prevents
duplicate check-ins, records attendance atomically → attendance dashboard updates.

**F — Consultation:** user submits → admin receives → assign → status updates →
member notified. Internal notes never appear in member views.

**G — Ratings:** member submits review (`reviews`, moderation=`submitted`) →
moderation queue (`reviews.moderate`) → approve → public carousel shows the
genuine review; aggregate computed from real records. Admins cannot edit opinions.

## Controls awaiting Phase 1

Server-side authorization/RLS enforcement for writes; privileged role
provisioning; atomic capacity + payment + check-in transactions (Postgres RPCs);
Supabase Storage for media (public/private buckets, type/size/dimension
validation); notification outbox delivery (email/WhatsApp + consent); CSV export
via authorized server access; rate limiting; audit immutability. The UI, typed
contracts, DEMO provider and fail-closed gate are complete now.
