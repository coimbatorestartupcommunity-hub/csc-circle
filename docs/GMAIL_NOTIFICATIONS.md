# CSC Gmail notification release evidence

Updated 2026-10-19. Production target: https://csc-circle-lake.vercel.app.

## Implemented in this branch

The existing `notifications` table remains the authoritative outbox. A versioned additive migration adds template/version, related-record reference, recipient identity, lease, retry, and per-recipient acceptance records. Application mutations queue notifications transactionally through PostgreSQL triggers. Successful API writes schedule a bounded Next.js `after()` dispatcher; failures do not delete the business record. A protected daily Vercel cron schedules reminders and drains a small catch-up batch. No Render service is required.

Gmail uses Nodemailer over validated TLS on port 465 (explicit STARTTLS 587 also supported). Credentials are server-only; host, recipients, headers, origins and template fields are validated. User content is escaped. Predefined templates control subjects, recipients and links. No public arbitrary-mail endpoint exists. Administrative recipients come only from trusted environment configuration. Authentication emails remain owned by Supabase Auth.

The dispatcher uses a global lease, job leases, five-attempt bounded exponential backoff, maximum three jobs per invocation, sequential sending and conservative persistent caps of 20 SMTP acceptances/hour and 100/day. These are application caps, not a claim about Google's account quota. Accepted recipients are skipped on replay. Unknown outcomes after SMTP DATA are quarantined for manual mailbox reconciliation; SMTP cannot guarantee exactly-once inbox delivery. Authorized `settings.manage` staff can request an audited retry with a reason and explicit uncertainty acknowledgement.

Daily Hobby cron is a safety net, not a high-throughput worker or precise reminder SLA. A quiet-site backlog can exceed its small batch capacity. Review backlog and sending requirements before a public rollout; no paid scheduling service was provisioned.

## Form / workflow mapping

| Persisted source | Applicant/member templates | Administrative template |
|---|---|---|
| membership_claims insert | MembershipApplicationReceived | MembershipAdminAlert |
| memberships / claims status | MembershipApproved, MembershipRejected, MembershipMoreInformation, MembershipStatusChanged | Existing private review queue |
| rsvp_submissions / event_registrations insert | EventRSVPReceived | EventRSVPAdminAlert |
| event_registrations status | EventConfirmed, EventWaitlisted, PaymentPendingVerification, EventCancelled | Existing registrations queue |
| published event schedule / venue / archive change | EventUpdated, EventCancelled | Existing event audit |
| confirmed upcoming registration | EventReminder | Existing attendance workspace |
| consultation_submissions insert / status | ConsultationReceived, ConsultationApproved, ConsultationMoreInformation, ConsultationScheduled, ConsultationCancelled | ConsultationAdminAlert |
| payments status | PaymentPendingVerification, PaymentVerified, PaymentRejected, PaymentRefunded | Existing finance queue |
| directory_startups insert / status | StartupSubmissionReceived, StartupApproved, StartupStatusChanged | StartupAdminAlert |
| reviews insert / moderation | CommunityReviewReceived, ReviewModerationResult | ReviewAdminAlert |

OperationalAlert is a prepared template; automatic email-failure-to-email alerting is deliberately absent to prevent alert loops. Safe error categories go to server logs and the authorized queue. Scheduling emails require confirmed meeting metadata; the existing consultation scheduling editor remains incomplete. Refund notifications reflect a trusted database status, not independent settlement confirmation.

## Environment and provider status

Saved in the existing Vercel project's Production and Preview environments: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_APP_PASSWORD (sensitive), SMTP_FROM_EMAIL, SMTP_FROM_NAME, CSC_ADMIN_NOTIFICATION_EMAILS, CSC_SUPPORT_EMAIL, APP_BASE_URL, EMAIL_NOTIFICATIONS_ENABLED, CRON_SECRET (sensitive). Legacy SMTP_PASSWORD/SMTP_FROM remain for the preceding release. Environment changes only take effect on a new deployment.

Supabase project `mmsrtfktwcrbyrucjmzo` has custom SMTP configured and read back as enabled with Gmail port 465 and the CSC sender. One controlled self-addressed test authenticated over TLS and was accepted by Gmail. Inbox receipt, spam placement and actual Supabase confirmation/recovery delivery have **not** been verified. A distinct Supabase-only App Password was not supplied; separation remains an owner configuration task. No credential values belong in this document or Git.

## Validation and security scope

Local TypeScript, ESLint and production build pass; 94 automated tests and 11 Chromium smoke tests passed. Automated coverage includes SMTP configuration/header validation, template injection, unauthenticated dispatcher rejection, temporary/permanent/ambiguous SMTP classification, outbox triggers, service-only dispatch, admin retry permissions, exclusive leases, accepted-recipient deduplication, rate deferral and retry exhaustion. Disposable PGlite tests apply all migrations; they do not prove multiconnection concurrency or live Supabase RLS behavior. Chromium smoke tests cover public/auth routes, mobile width and protected APIs.

Production dependency audit: zero advisories. Full audit retains five high-severity development-tool advisories in ESLint's dependency chain; no forced breaking audit fix was used. Source/reachable-history secret scan found no matching credentials. This is not proof that previously shared management tokens have been revoked.

## Deployment and database gates

The canonical production domain still resolves to READY deployment `dpl_GJUJpXaZUVWxgHofM5vir1YB4XuD`, commit `d1ecd8c193211ca4190453df0d2430dee3c73843` (starter application). It is not the new CSC release.

A fresh CLI preview `dpl_5qTJ2L1WBAsebKeCRiCQJBMAmPQp` is **BLOCKED**: “The deployment was blocked because the commit author doesn’t have permission to create deployments for this project.” Team `coimbatore-startup-community` is Hobby; the genuine author `vikashsaravanann` is not deployment-eligible. No author spoofing, forced history change, duplicate project, visibility change or paid upgrade was attempted. The owner must establish a supported author/team/repository relationship; a paid plan change requires explicit approval.

Live database inspection confirms the new queue fields are absent. Both `20261019153828_security_hardening.sql` and `20261019162438_gmail_notification_delivery.sql` remain **unapplied**. Existing schema was created without matching CLI migration-history entries. Do not run an unreviewed `db push` that replays all migrations. Before activation: reconcile that history with the actual schema, establish a production recovery procedure, stage-test both reviewed migrations, then apply only the intended pending changes and run live identity/RLS/concurrency tests. Do not dispatch historical untyped outbox rows as new emails.

The application cannot be called fully activated until an authorized preview is ready, database prerequisites are applied and verified, actual signup/recovery and business-event emails reach the approved mailbox, and production workflows pass smoke tests. No new production deployment succeeded during this work.

CI root cause found and repaired: Linux npm 11.19 rejected the previous lockfile because @emnapi/core and @emnapi/runtime 1.11.3 were missing. Regenerated the lock in an isolated directory using that npm version, preserved application versions, and verified a clean npm 11.19 install locally. Remote CI must still be checked on the new commit.

Vercel documents that Hobby teams cannot deploy private GitHub organization repositories: https://vercel.com/docs/git. Keeping the current private organization repository therefore requires a supported plan/team setup as well as legitimate contributor access.
