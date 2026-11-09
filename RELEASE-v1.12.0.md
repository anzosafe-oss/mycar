# MyCar v1.12.0

- Move logout into the footer; keep it hidden on login/password setup pages.
- Show uppercase registration and VIN on the home/garage cards and normalize input.
- Keep garage VIN on one line and make registration larger than secondary details.
- Split expiring/expired status labels into a prefix and a day count.
- Remove fuel from the event vehicle summary and remove its saved-data message.
- Recognize tire-related titles in Altele with a matching outline tire icon.
- Edit existing events in the shared, prefilled form; preserve IDs/vehicle links and
  enforce both user and vehicle ownership when updating.
- Add an optional complete-fill/100%-charge flag; compute consumption by vehicle
  and fuel between complete endpoints, summing intervening partial fills. The
  starting fill's quantity is excluded. Missing data interrupts a calculation.
  Historical records remain unmarked until explicitly edited. Electric figures
  estimate energy charged per 100 km and include charging losses.
- Show active accounts and MyCar-specific last visits to administrators only.
  Visits use authenticated server timestamps, recorded on entry/foreground use
  with a five-minute client throttle; no background polling.

## Deployment

Apply `supabase/v1.12.0.sql` before the frontend. The changes are additive and
compatible with older clients. Deploy the updated mycar-invitations function
before publishing the static files. Service-role-only activity storage uses RLS
and has no anon/authenticated table grants. Invites retain their existing auth
checks and delivery provider configuration.

## Validation

22 automated checks cover consumption boundaries, partial fills, electricity,
unknown historical data, multiple vehicles/fuels, changes/deletion, event identity,
ownership filters, authorization, invitation idempotency and activity impersonation.
Live database validation created and updated only temporary data in a rolled-back
transaction; zero QA rows remained. RLS blocked updates to other users' events.
Browser QA used fictitious data at a 390px viewport: card layout, VINs, two-line
expiry states, adjacent event actions, refuel prefill, correction/recalculation,
and cancellation. No live user events were changed by browser QA.

The security advisor's activity-table no-policy informational notice is intentional
for a service-role-only table. Existing project-wide notices about public
rls_auto_enable execution and password screening were not introduced by this release.
