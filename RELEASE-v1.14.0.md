# MyCar v1.14.0

Fix only the logo/menu row to the viewport. Keep vehicle selection and navigation
in normal page flow, matching the approved preview. Increase header bottom
padding from 8px to 13px and continue measuring its height automatically.

Add per-vehicle dashboard widget management in Settings. Drag the grip with mouse
or touch to reorder RCA, CASCO, ITP and Rovinietă; arrow buttons and keyboard arrows
provide alternatives. Toggle each widget independently. Hidden widgets keep their
document dates and existing reminder behavior. Dates remain editable in Settings.
Users can re-enable the widget there when ready.

Persist only dashboard_widgets on the selected owned vehicle. The additive nullable
column uses the existing owner RLS policy. Existing rows retain all four visible
widgets in the original order. Apply supabase/v1.14.0.sql before publishing assets.
No existing document, event or preference data is rewritten by the migration.

Validation: normalization, order boundaries, hidden-state retention, ownership
filters, per-vehicle isolation and failure rollback tests. Mobile browser QA used
fictitious data: grip drag, hidden CASCO, home order, switching cars, reactivation
and date retention. Database roundtrip and foreign-user update rejection passed in
a rolled-back transaction; zero fixture rows remained. Security advisor output
contains only the previously known service-only table and project-wide notices.
