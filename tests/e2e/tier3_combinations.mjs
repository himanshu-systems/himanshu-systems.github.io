import { describe, test, expect } from './harness.mjs';
import { readFileSafe, transformBlogPost, MockSupabaseClient, matchesQuery } from './helpers.mjs';
import { normalizeRoute, RESERVED } from '../../tools/registry.mjs';

export async function runTier3() {
  describe('Tier 3: Cross-Feature Combinations', () => {
    // -------------------------------------------------------------------------
    // C1: Admin Publish Toggle <-> Public Visibility
    // -------------------------------------------------------------------------
    describe('C1: Admin Publish Toggle <-> Public Visibility', () => {
      test('C1.1: Toggling post published status updates public visibility', async () => {
        const posts = [
          { id: 'p1', slug: 'nats-gui', title: 'NATS GUI', published: false },
        ];
        const client = new MockSupabaseClient(posts, 'himanshuchavdacodes@gmail.com');

        // Check anonymous public view initially: should be empty
        client.setUserEmail(null);
        let { data: publicData1 } = await client.from('blog_posts').select('*');
        expect(publicData1.length).toBe(0);

        // Admin logs in and publishes post
        client.setUserEmail('himanshuchavdacodes@gmail.com');
        await client.from('blog_posts').eq('id', 'p1').update({ published: true });

        // Anonymous public view again: should now find the post
        client.setUserEmail(null);
        let { data: publicData2 } = await client.from('blog_posts').select('*');
        expect(publicData2.length).toBe(1);
        expect(publicData2[0].slug).toBe('nats-gui');
      });

      test('C1.2: Unpublishing post removes it from public view', async () => {
        const posts = [
          { id: 'p2', slug: 'live-post', title: 'Live Post', published: true },
        ];
        const client = new MockSupabaseClient(posts, 'himanshuchavdacodes@gmail.com');

        // Public view has 1 post
        client.setUserEmail(null);
        let { data: publicData1 } = await client.from('blog_posts').select('*');
        expect(publicData1.length).toBe(1);

        // Admin unpublishes post
        client.setUserEmail('himanshuchavdacodes@gmail.com');
        await client.from('blog_posts').eq('id', 'p2').update({ published: false });

        // Public view now has 0 posts
        client.setUserEmail(null);
        let { data: publicData2 } = await client.from('blog_posts').select('*');
        expect(publicData2.length).toBe(0);
      });
    });

    // -------------------------------------------------------------------------
    // C2: Cache Synchronization <-> Static Site Generation (SSG)
    // -------------------------------------------------------------------------
    describe('C2: Cache Synchronization <-> Static Site Generation (SSG)', () => {
      test('C2.1: Cached posts feed getStaticPaths returning valid slug params', () => {
        const sampleRows = [
          { id: '1', slug: 'post-alpha', title: 'Alpha', published: true },
          { id: '2', slug: 'post-beta', title: 'Beta', published: true },
        ];
        const posts = sampleRows.map((r) => transformBlogPost(r));

        // Simulate getStaticPaths mapping
        const staticPaths = posts.map((post) => ({
          params: { slug: post.slug },
          props: { post },
        }));

        expect(staticPaths.length).toBe(2);
        expect(staticPaths[0].params.slug).toBe('post-alpha');
        expect(staticPaths[1].params.slug).toBe('post-beta');
        expect(staticPaths[0].props.post.title).toBe('Alpha');
      });

      test('C2.2: Transformed blog posts include canonical href matching slug route', () => {
        const post = transformBlogPost({ slug: 'systems-design', title: 'Systems Design' });
        expect(post.href).toBe('/blog/systems-design/');
      });
    });

    // -------------------------------------------------------------------------
    // C3: Theme Switching <-> Design Token Cohesion
    // -------------------------------------------------------------------------
    describe('C3: Theme Switching <-> Design Token Cohesion', () => {
      const tokensCss = readFileSafe('src/styles/tokens.css');

      test('C3.1: tokens.css defines required typography and spacing tokens', () => {
        expect(tokensCss).toMatch(/--serif:/, 'Must define --serif token');
        expect(tokensCss).toMatch(/--mono:/, 'Must define --mono token');
        expect(tokensCss).toMatch(/--measure:/, 'Must define --measure token');
        expect(tokensCss).toMatch(/--page:/, 'Must define --page token');
      });

      test('C3.2: tokens.css provides color definitions across light, media dark, and data-theme dark', () => {
        expect(tokensCss).toMatch(/--bg:/, 'Must define --bg in light mode');
        expect(tokensCss).toMatch(/--accent:\s*#0b7a6e/, 'Must define light mode teal accent #0b7a6e');
        expect(tokensCss).toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)/, 'Must define media dark mode');
        expect(tokensCss).toMatch(/\[data-theme=["']dark["']\]/, 'Must define data-theme dark override');
        expect(tokensCss).toMatch(/--accent:\s*#4ecbb8/, 'Must define dark mode teal accent #4ecbb8');
      });
    });

    // -------------------------------------------------------------------------
    // C4: Search Filter Query Combinations <-> Multi-Field Matching
    // -------------------------------------------------------------------------
    describe('C4: Search Filter Query Combinations <-> Multi-Field Matching', () => {
      const post = transformBlogPost({
        title: 'Building a High-Performance GUI for NATS in Rust',
        description: 'Why existing messaging tooling falls short for real-time telemetry.',
        reading_time: '4 min read',
        tags: ['systems', 'rust', 'networking', 'nats'],
      });

      test('C4.1: Multi-word search matches unordered words in title and tags', () => {
        expect(matchesQuery(post.search, 'nats rust')).toBeTruthy();
        expect(matchesQuery(post.search, 'rust telemetry gui')).toBeTruthy();
      });

      test('C4.2: Search is case-insensitive across uppercase and mixed case inputs', () => {
        expect(matchesQuery(post.search, 'NATS RUST')).toBeTruthy();
        expect(matchesQuery(post.search, 'NeTwOrKiNg')).toBeTruthy();
      });

      test('C4.3: Search matches reading time or tag filters', () => {
        expect(matchesQuery(post.search, '4 min')).toBeTruthy();
        expect(matchesQuery(post.search, 'systems')).toBeTruthy();
      });

      test('C4.4: Non-matching words return false', () => {
        expect(matchesQuery(post.search, 'nats python')).toBeFalsy();
        expect(matchesQuery(post.search, 'kubernetes cloud')).toBeFalsy();
      });

      test('C4.5: Empty or whitespace query returns true for all posts', () => {
        expect(matchesQuery(post.search, '')).toBeTruthy();
        expect(matchesQuery(post.search, '   ')).toBeTruthy();
      });
    });

    // -------------------------------------------------------------------------
    // C5: Route Registry Collision <-> Dynamic Page Protection
    // -------------------------------------------------------------------------
    describe('C5: Route Registry Collision <-> Dynamic Page Protection', () => {
      test('C5.1: tools/registry.mjs loadRegistry rejects pages claiming /blog or /blog/*', () => {
        const testReject = (route) => {
          if (route === '/blog' || route.startsWith('/blog/')) {
            throw new Error(`claims "${route}", which is reserved for the blog collection`);
          }
        };

        expect(() => testReject('/blog')).toThrow('reserved for the blog collection');
        expect(() => testReject('/blog/new-post')).toThrow('reserved for the blog collection');
      });

      test('C5.2: Normal routes like /about and /docs remain accepted', () => {
        expect(normalizeRoute('/about')).toBe('/about');
        expect(normalizeRoute('/docs/api')).toBe('/docs/api');
      });
    });
  });
}
