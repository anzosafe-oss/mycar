# MyCar versions

Define the current version in version.js only. Footer and Settings read this value.

Use major.minor.patch:
- Refinements or fixes to the same feature increment patch: v1.4.0 -> v1.4.1 -> v1.4.2.
- A separate feature or unrelated improvement increments minor and resets patch: v1.5.0.
- A major change agreed with the user increments major: v2.0.0.

The legacy displayed v1.4 is the baseline for v1.4.1. Each user-approved release is one version even if it spans several commits. Deployment retries do not increment it.

Update version.js and version query strings for version.js, app.js, style.css and any changed script in index.html together.
