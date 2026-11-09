# MyCar v1.9.0 — invitation requests

Visitors open “Solicită o invitație” below the login description and submit an email.
Submitting a request never creates a user or grants access. Only the owner sees
Setări → Cereri de acces, with explicit approval/rejection. Approval sends the
Supabase Auth invitation to the stored address and uses the fixed MyCar redirect.

## Deployment status

The schema and `mycar-invitations` server function are installed. Frontend release
is held on its feature branch until owner email notifications are configured.
Production remains on v1.8.3 while this prerequisite is missing.

## Email configuration required before publishing

Create a Resend account with the same email as the administrator. Add a restricted
sending API key as the Supabase Edge Function secret `MYCAR_RESEND_API_KEY`.
The default sender is `MyCar <onboarding@resend.dev>`, which Resend restricts to
the account owner's verified address. For a verified sending domain, set
`MYCAR_EMAIL_FROM` to the approved sender instead. No API key belongs in GitHub,
browser code, chat, or the database.

The new-request email is sent through Resend only to addresses looked up from
the server-controlled administrator list. Invite emails use the project's
existing Supabase Auth email configuration, independently of Resend.
Confirm that Auth Site URL / allowed redirects include
`https://anzosafe-oss.github.io/mycar/`. Custom SMTP may be necessary for public
invite delivery; the Supabase default mail service has recipient/rate limits.

POST `{"action":"health"}` to the Edge Function checks configuration without
sending any email. It returns only an emailConfigured boolean, never secrets.
Then make one authorized request and approval from the UI to verify real email
delivery. Do not send unsolicited test invitations.

## Security and reliability

- Tables have RLS enabled and no anon/authenticated grants or policies.
- Only service_role can submit through the invoker SQL function.
- Admin endpoints validate the token through Auth getUser and a private allowlist.
- Caller-supplied email, redirect, user_id, or metadata cannot choose an invite target.
- Duplicate emails receive the same public response, without exposing account state.
- Submission limits are serialized in SQL; a honeypot and request-size cap apply.
- Conditional pending → sending claims prevent concurrent duplicate approvals.
- Failed sends return to pending and display a retryable error.
- Rejections do not send mail. No administrative action is performed through GET.
- A crash during sending leaves the request marked sending for manual reconciliation;
  do not automatically repeat an invitation that might already have been sent.
- Missing notification mail configuration never discards a stored request, and the
  administrator sees a warning in the request list.

## Validation

Run `node --test supabase/functions/mycar-invitations/handler.test.cjs`.
Ten isolated tests cover authorization, forged admin fields, fixed recipient and
redirect, duplicate approvals, failures, rejection, validation, origin and health.
Database checks verified permissions, pending creation, and deduplication inside
a rolled-back transaction. Live anonymous list/approve requests return HTTP 401.
No real invitations or notification emails were sent by these checks.
