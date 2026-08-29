# E2E Test Infra: Blog Content Collection

## Test Philosophy
- Opaque-box, requirement-driven verification covering database schema, TypeScript data layer, offline caching resilience, public Astro pages, design constraints, and Admin CMS interactions.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial + Real-World Workload Testing.

## Feature Inventory & Test Mapping
| # | Feature | Source | Tier 1 | Tier 2 | Tier 3 |
|---|---------|--------|:------:|:------:|:------:|
| 1 | Database Schema & RLS (`blog_schema.sql`) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 2 | Route Registry Protection (`registry.mjs`) | Survey | 5 | 5 | ✓ |
| 3 | TypeScript Data Layer & Cache Fallback (`blog.ts`) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 4 | Public Blog Listing Page (`blog.astro`) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 5 | Public Blog Detail Page (`blog/[slug].astro`) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 6 | Admin CMS Blog Editor (`blogEditor.ts` & `admin.astro`) | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 7 | Rich Text & Image Upload Integration | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |

## Test Architecture
- **Test Runner Location**: `tests/e2e/run_tests.mjs` (or node-based test suite)
- **Invocation**: `node tests/e2e/run_tests.mjs` or `npm test`
- **Pass/Fail Semantics**: Exit code 0 if all tests pass, non-zero if any test fails. Output structured TAP or test summary table.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | **Full Publishing Lifecycle**: Author creates draft with Quill HTML & image upload in Admin -> verifies draft is hidden on public listing -> publishes post -> verifies live appearance on `/blog` and `/blog/[slug]`. | F1, F3, F4, F5, F6, F7 | High |
| 2 | **Offline & Build-Time Fallback**: Supabase is unreachable -> `getBlogPosts()` and `getBlogPostBySlug()` gracefully read from `.cache/blog_posts.json` -> Astro static build completes cleanly without errors. | F3, F4, F5 | Medium |
| 3 | **Filter & Discovery Search**: User searches by title, description, or tags in `/blog` -> live counter updates -> instant row filtering with keyboard shortcut (`/`) and clear button (`Esc`). | F4 | Medium |
| 4 | **Design Token & Typography Audit**: Pages strictly use Source Serif 4 for prose, IBM Plex Mono for metadata, 1px hairlines for row separation, no elevated card containers, single `--accent` color for hover/active states only. | F4, F5 | Medium |
| 5 | **Admin Content Management & Deletion**: Edit existing post (update title, tags, content) -> inline toggle draft/published status -> delete post with confirmation -> verify data and cache synchronization. | F1, F3, F6 | High |

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: ≥ 35 test cases (≥ 5 per feature across 7 core features)
- **Tier 2 (Boundary & Corner Cases)**: ≥ 35 test cases (empty lists, missing images, duplicate slugs, long rich text, special unicode chars, invalid dates)
- **Tier 3 (Cross-Feature Combinations)**: ≥ 10 pairwise test cases (Admin publish toggle ↔ Public visibility, Cache updates ↔ Static SSG paths, Theme mode ↔ Blog detail prose styles)
- **Tier 4 (Real-World Scenarios)**: 5 comprehensive end-to-end integration scenarios
- **Total Minimum Target**: ≥ 85 test assertions
