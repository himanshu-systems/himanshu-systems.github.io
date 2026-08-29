## 2026-08-29T10:24:00Z

You are Test Writer for the E2E Testing Track.
Read ORIGINAL_REQUEST.md at `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\.agents\ORIGINAL_REQUEST.md`.
Read `TEST_INFRA.md` at `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\TEST_INFRA.md`.
Read `PROJECT.md` at `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\PROJECT.md`.

Your working directory is: `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\.agents\teamwork_preview_test_writer_e2e`
Project workspace: `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn`

Write ownership:
You exclusively own `tests/e2e/` and `TEST_READY.md`. Do NOT touch implementation files in `src/` or `supabase/`.

Objective:
Implement a comprehensive, executable, opaque-box E2E test runner at `tests/e2e/run_tests.mjs` (node.js script) covering all 4 tiers outlined in `TEST_INFRA.md`:
- Tier 1: Feature Coverage (Schema validation, data layer functions & types, cache fallback mechanism, public listing rendering/elements, detail page rendering/prose, admin editor wiring & structure)
- Tier 2: Boundary & Corner Cases (empty posts cache, missing image_src, special characters in title/slug, empty rich text content, unauthenticated read vs authenticated write, long rich text)
- Tier 3: Cross-Feature Combinations (publish toggle reflecting on public page vs admin list, cache refresh after write, theme switching in blog layout, search filter query logic)
- Tier 4: Real-World Scenarios (full authoring workflow verification, offline/build-time fallback test, search/filter discovery verification, design token / typography audit)

Run the test suite to verify tests execute properly. Note that until implementation milestones complete, implementation assertions will test against the expected interface/behavior contracts and schema structure.
When the test suite is ready, create `TEST_READY.md` at project root (`C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\TEST_READY.md`) following the exact template in `PROJECT.md`.

Write your completion report to `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\.agents\teamwork_preview_test_writer_e2e\handoff.md` and send a completion message back to parent.
