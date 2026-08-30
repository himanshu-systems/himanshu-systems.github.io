import { describe, test, expect } from './harness.mjs';
import { readFileSafe, transformBlogPost, MockSupabaseClient, matchesQuery, uniqueSlug } from './helpers.mjs';

export async function runTier4() {
  describe('Tier 4: Real-World Application Scenarios', () => {
    // -------------------------------------------------------------------------
    // Scenario 1: Full Publishing Lifecycle Workflow
    // -------------------------------------------------------------------------
    describe('Scenario 1: Full Publishing Lifecycle Workflow', () => {
      test('S1.1: End-to-end author draft creation, secret verification, publication, and live rendering', async () => {
        // Step 1: Initialize Database with empty or existing posts
        const db = new MockSupabaseClient([], 'himanshuchavdacodes@gmail.com');

        // Step 2: Author creates a draft post with rich text and tags
        const newPostDraft = {
          title: 'Kernel BPF Tracing in Production',
          description: 'Low-overhead observability using eBPF probes.',
          content: '<h2>Introduction</h2><p>eBPF allows safe execution of sandboxed programs inside the Linux kernel.</p>',
          date: '2026-08-25',
          tags: ['systems', 'ebpf', 'linux'],
          reading_time: '5 min read',
          image_src: '/images/ebpf-tracing.svg',
          image_alt: 'eBPF architecture diagram',
          published: false,
        };

        const existingSlugs = new Set();
        const slug = uniqueSlug(newPostDraft.title, existingSlugs);
        expect(slug).toBe('kernel-bpf-tracing-in-production');

        const { data: inserted, error: insertErr } = await db.from('blog_posts').insert({
          ...newPostDraft,
          slug,
        });
        expect(insertErr).toBeNull();
        expect(inserted.length).toBe(1);

        // Step 3: Public / Anonymous visitor accesses /blog (build time or live query)
        db.setUserEmail(null); // Anonymous visitor
        const { data: publicPostsBeforePublish } = await db.from('blog_posts').select('*');
        expect(publicPostsBeforePublish.length).toBe(0, 'Draft post must remain hidden from public visitors');

        // Step 4: Author decides to publish the post
        db.setUserEmail('himanshuchavdacodes@gmail.com');
        const postId = inserted[0].id;
        const { error: updateErr } = await db.from('blog_posts').eq('id', postId).update({ published: true });
        expect(updateErr).toBeNull();

        // Step 5: Public / Anonymous visitor now reads /blog
        db.setUserEmail(null);
        const { data: publicPostsAfterPublish } = await db.from('blog_posts').select('*');
        expect(publicPostsAfterPublish.length).toBe(1);

        // Step 6: Post transforms correctly for public Astro reader
        const publishedPost = transformBlogPost(publicPostsAfterPublish[0]);
        expect(publishedPost.title).toBe('Kernel BPF Tracing in Production');
        expect(publishedPost.href).toBe('/blog/kernel-bpf-tracing-in-production/');
        expect(publishedPost.image).toEqual({
          src: '/images/ebpf-tracing.svg',
          alt: 'eBPF architecture diagram',
        });
        expect(publishedPost.content).toContain('<h2>Introduction</h2>');
      });
    });

    // -------------------------------------------------------------------------
    // Scenario 2: Offline & Build-Time Fallback Under Network Outage
    // -------------------------------------------------------------------------
    describe('Scenario 2: Offline & Build-Time Fallback Under Network Outage', () => {
      test('S2.1: Graceful cache fallback when Supabase connection drops during Astro build', async () => {
        // Cached snapshot in .cache/blog_posts.json
        const fallbackCache = [
          {
            id: 'cached-id-1',
            slug: 'distributed-consensus-from-scratch',
            title: 'Rethinking Distributed Systems: From Raft to Gossip Protocols',
            description: 'Exploring consensus trade-offs.',
            content: '<p>Deterministic state machines meet unpredictable networks.</p>',
            date: '2026-05-14',
            tags: ['systems', 'distributed', 'consensus'],
            reading_time: '6 min read',
            image_src: null,
            image_alt: null,
            published: true,
          },
        ];

        // Simulate fetch function with cache fallback
        async function fetchWithFallback(shouldFail) {
          try {
            if (shouldFail) throw new Error('FetchError: connection refused at api.supabase.co:443');
            return [];
          } catch (networkErr) {
            // Fallback strategy: load cache
            return fallbackCache.map((r) => transformBlogPost(r));
          }
        }

        const buildResult = await fetchWithFallback(true);
        expect(buildResult.length).toBe(1);
        expect(buildResult[0].slug).toBe('distributed-consensus-from-scratch');
        expect(buildResult[0].dateFormatted).toBe('May 14, 2026');
        expect(buildResult[0].search).toContain('consensus');
      });
    });

    // -------------------------------------------------------------------------
    // Scenario 3: Filter & Discovery Search Workflow
    // -------------------------------------------------------------------------
    describe('Scenario 3: Filter & Discovery Search Workflow', () => {
      test('S3.1: Live search filtering and count calculation across dataset', () => {
        const posts = [
          transformBlogPost({
            title: 'Building a High-Performance GUI for NATS in Rust',
            description: 'Slint + Rust desktop telemetry UI',
            tags: ['rust', 'nats', 'gui'],
          }),
          transformBlogPost({
            title: 'Rethinking Distributed Systems: From Raft to Gossip Protocols',
            description: 'Consensus trade-offs in distributed systems',
            tags: ['distributed', 'raft', 'systems'],
          }),
          transformBlogPost({
            title: 'Why Minimalist Web Architecture Survives',
            description: 'Hairlines, static site generation, semantic HTML',
            tags: ['web', 'architecture', 'design'],
          }),
        ];

        // Query 1: Filter by "rust"
        const query1 = 'rust';
        const matches1 = posts.filter((p) => matchesQuery(p.search, query1));
        expect(matches1.length).toBe(1);
        expect(matches1[0].title).toContain('NATS in Rust');

        // Query 2: Filter by "systems"
        const query2 = 'systems';
        const matches2 = posts.filter((p) => matchesQuery(p.search, query2));
        expect(matches2.length).toBe(2);

        // Query 3: Multi-word filter across description and tags "consensus raft"
        const query3 = 'consensus raft';
        const matches3 = posts.filter((p) => matchesQuery(p.search, query3));
        expect(matches3.length).toBe(1);

        // Query 4: Unmatched query returns empty
        const query4 = 'nonexistent query 12345';
        const matches4 = posts.filter((p) => matchesQuery(p.search, query4));
        expect(matches4.length).toBe(0);

        // Query 5: Clearing query returns all 3 posts
        const query5 = '';
        const matches5 = posts.filter((p) => matchesQuery(p.search, query5));
        expect(matches5.length).toBe(3);
      });
    });

    // -------------------------------------------------------------------------
    // Scenario 4: Design Token & Typography Audit
    // -------------------------------------------------------------------------
    describe('Scenario 4: Design Token & Typography Audit', () => {
      test('S4.1: Audit CSS and design rules against strict design guidelines in DESIGN.md', () => {
        const tokensCss = readFileSafe('src/styles/tokens.css');
        expect(tokensCss).toBeDefined();

        // 1. Font families: Literata for prose, IBM Plex Mono for metadata
        expect(tokensCss).toMatch(/--serif:\s*["']Literata["']/);
        expect(tokensCss).toMatch(/--mono:\s*["']IBM Plex Mono["']/);

        // 2. Measure & Page constraints
        expect(tokensCss).toMatch(/--measure:\s*34rem/);
        expect(tokensCss).toMatch(/--page:\s*58rem/);

        // 3. One accent rule: Teal accent token spent only on hover/focus/active
        expect(tokensCss).toMatch(/--accent:\s*#0b7a6e/); // Light
        expect(tokensCss).toMatch(/--accent:\s*#4ecbb8/); // Dark

        // 4. Listing styles use hairlines, not cards or elevated containers
        const listingCss = readFileSafe('src/styles/listing.css');
        if (listingCss) {
          expect(listingCss).not.toMatch(/box-shadow:/i, 'Listing must not use elevated card shadows');
        }
      });
    });

    // -------------------------------------------------------------------------
    // Scenario 5: Admin Content Management & Deletion
    // -------------------------------------------------------------------------
    describe('Scenario 5: Admin Content Management & Deletion', () => {
      test('S5.1: Editing post metadata preserves slug; deleting post removes it cleanly', async () => {
        const posts = [
          {
            id: 'post-100',
            slug: 'original-slug',
            title: 'Original Title',
            description: 'Original Desc',
            published: true,
          },
        ];
        const db = new MockSupabaseClient(posts, 'himanshuchavdacodes@gmail.com');

        // Step 1: Edit title and description, keep original slug
        const takenSlugs = new Set(['original-slug']);
        const slugDuringEdit = uniqueSlug('New Updated Title', takenSlugs, 'original-slug');
        expect(slugDuringEdit).toBe('original-slug'); // Preserved!

        const { error: updateError } = await db.from('blog_posts').eq('id', 'post-100').update({
          title: 'New Updated Title',
          description: 'Updated Description',
        });
        expect(updateError).toBeNull();

        // Verify update in DB
        const { data: updatedList } = await db.from('blog_posts').select('*');
        expect(updatedList[0].title).toBe('New Updated Title');

        // Step 2: Delete post with confirmation
        const { error: deleteError } = await db.from('blog_posts').eq('id', 'post-100').delete();
        expect(deleteError).toBeNull();

        // Step 3: Verify list is now empty
        const { data: remainingList } = await db.from('blog_posts').select('*');
        expect(remainingList.length).toBe(0);
      });
    });
  });
}
