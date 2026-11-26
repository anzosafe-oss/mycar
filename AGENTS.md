# AGENTS.md — MyCar

## Priorities and continuity
- Read this file before intervening in the application.
- Prioritize quality, stability and user experience over token savings.
- Preserve visual and functional consistency across the MyApps ecosystem.
- Preserve all existing functionality outside the requested scope and respect established design, interaction and versioning conventions.
- Inspect the relevant files and dependencies thoroughly enough to implement and test safely. Avoid redundant investigation, unrelated refactoring and unnecessary rewrites; efficiency must not compromise quality.

## Repository and dependency scope
- Start in `anzosafe-oss/mycar`, using known paths and targeted searches.
- Consult other repositories or Supabase projects when necessary for the requested implementation or its direct dependencies. Do not impose a blanket restriction or an additional approval requirement merely for necessary read-only investigation.
- When the user references another MyApps application, inspect its actual implementation and reuse the validated solution, adapting it to MyCar without introducing inconsistent behavior.
- Keep investigation relevant; avoid unrelated organization-wide discovery or audits.
- Verify unknown resource identifiers before use. Never expose secrets or weaken authentication, authorization or user-data isolation.

## Data integrity
- Demonstration data is permitted only in previews and test environments.
- The first LIVE publication must be clean, without demonstration records, seed data, mock backends or test accounts introduced by the implementation.
- Subsequent updates must preserve all real user data, ownership, access controls and existing relationships.
- Use isolated test fixtures and reversible validation. Never delete or reset real data as part of cleanup or deployment.

## Maintenance
- Remove obsolete files only after checking their dependencies and references, including dynamic paths, manifests, service workers, caches and deployment configuration.
- Do not delete uncertain resources, rewrite Git history or perform unsolicited repository-wide cleanup.
- Prefer focused, maintainable changes; remove superseded rules instead of layering contradictory instructions over them.

## Validation and publication
- Prepare application changes on a separate branch.
- Verify compatibility with iOS, Android and desktop, including affected responsive layouts and interactions. Use relevant regression and functional tests proportionate to risk.
- Report any behavior that could not be tested on actual devices; do not describe simulated checks as physical-device testing.
- Update the application version when publishing application changes, keeping version labels, asset references and update-detection metadata consistent. Documentation-only changes do not require an application version bump.
- Publish to production only with the user's explicit approval. Preparing a branch, tests or a preview does not authorize production publication.
- Report changed files, validation results, limitations and material decisions concisely.
