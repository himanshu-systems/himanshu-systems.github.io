import { describe, test, expect } from './harness.mjs';
import { transformBlogPost, MockSupabaseClient, slugify, uniqueSlug, matchesQuery } from './helpers.mjs';

export async function runTier2() {
  describe('Tier 2: Boundary & Corner Cases', () => {
    // -------------------------------------------------------------------------
    // B1: Empty Data & Null Value Handling
    // -------------------------------------------------------------------------
    describe('B1: Empty Data & Null Value Handling', () => {
      test('B1.1: Empty post array returns 0 items without throwing', () => {
        const posts = [];
        const transformed = posts.map((p) => transformBlogPost(p));
        expect(transformed.length).toBe(0);
      });

      test('B1.2: Completely empty row object populates default safe values', () => {
        const rawRow = {};
        const post = transformBlogPost(rawRow);
        expect(post.id).toBe('');
        expect(post.slug).toBe('');
        expect(post.title).toBe('');
        expect(post.description).toBe('');
        expect(post.content).toBe('');
        expect(post.tags).toEqual([]);
        expect(post.published).toBe(false);
        expect(post.image).toBeUndefined();
      });

      test('B1.3: Null image_src leaves post.image undefined', () => {
        const post = transformBlogPost({ slug: 'test', image_src: null, image_alt: 'alt' });
        expect(post.image).toBeUndefined();
      });

      test('B1.4: Null image_alt defaults alt to empty string', () => {
        const post = transformBlogPost({ slug: 'test', image_src: '/img.png', image_alt: null });
        expect(post.image).toEqual({ src: '/img.png', alt: '' });
      });

      test('B1.5: Null description defaults to empty string in transformed post', () => {
        const post = transformBlogPost({ slug: 'test', description: null });
        expect(post.description).toBe('');
      });
    });

    // -------------------------------------------------------------------------
    // B2: Unicode, Special Characters & Slugification Boundaries
    // -------------------------------------------------------------------------
    describe('B2: Unicode, Special Characters & Slugification Boundaries', () => {
      test('B2.1: Slugify strips emojis and unicode symbols', () => {
        const slug = slugify('🦀 Rust 2026: Fast & Safe 🚀');
        expect(slug).toBe('rust-2026-fast-safe');
      });

      test('B2.2: Slugify handles leading/trailing punctuation and multiple hyphens', () => {
        const slug = slugify('---...Hello, World! (Part 1)---');
        expect(slug).toBe('hello-world-part-1');
      });

      test('B2.3: Slugify defaults to "entry" when title contains only symbols', () => {
        const slug = slugify('!@#$%^&*()_+');
        expect(slug).toBe('entry');
      });

      test('B2.4: uniqueSlug resolves sequential collisions up to N duplicates', () => {
        const taken = new Set(['systems-lab', 'systems-lab-2', 'systems-lab-3', 'systems-lab-4']);
        const nextSlug = uniqueSlug('Systems Lab', taken);
        expect(nextSlug).toBe('systems-lab-5');
      });

      test('B2.5: uniqueSlug preserves current slug during edit when ignoreSlug is provided', () => {
        const taken = new Set(['my-article', 'other-article']);
        const slug = uniqueSlug('My Article', taken, 'my-article');
        expect(slug).toBe('my-article');
      });
    });

    // -------------------------------------------------------------------------
    // B3: Rich Text Content & Formatting Stress
    // -------------------------------------------------------------------------
    describe('B3: Rich Text Content & Formatting Stress', () => {
      test('B3.1: Empty Quill container variations are normalized', () => {
        const normalize = (html) => (!html || html.trim() === '<p><br></p>' || html.trim() === '' ? '' : html.trim());
        expect(normalize('')).toBe('');
        expect(normalize('<p><br></p>')).toBe('');
        expect(normalize('   <p><br></p>   ')).toBe('');
        expect(normalize('  \n\t  ')).toBe('');
      });

      test('B3.2: Handles multi-paragraph complex HTML with nested lists and code blocks', () => {
        const complexHTML = `
          <h2>Architecture</h2>
          <p>Here is an explanation with <strong>bold</strong>, <em>italic</em>, and <a href="https://example.com">links</a>.</p>
          <pre><code>function main() { console.log("hello"); }</code></pre>
          <blockquote>Distributed systems require fault tolerance.</blockquote>
          <ul><li>Node 1</li><li>Node 2</li></ul>
        `.trim();

        const post = transformBlogPost({ slug: 'arch', content: complexHTML });
        expect(post.content).toContain('<h2>Architecture</h2>');
        expect(post.content).toContain('<code>function main()');
        expect(post.content).toContain('<blockquote>Distributed systems');
      });

      test('B3.3: Preserves large content payloads without truncation', () => {
        const longParagraph = '<p>' + 'A'.repeat(50000) + '</p>';
        const post = transformBlogPost({ slug: 'large', content: longParagraph });
        expect(post.content.length).toBeGreaterThan(50000);
      });
    });

    // -------------------------------------------------------------------------
    // B4: Tag Parsing & Formatting Boundaries
    // -------------------------------------------------------------------------
    describe('B4: Tag Parsing & Formatting Boundaries', () => {
      test('B4.1: Splits comma-separated tags and trims whitespace', () => {
        const inputString = '  systems ,  rust,   networking  ,  web3  ';
        const parsedTags = inputString.split(',').map((t) => t.trim()).filter(Boolean);
        expect(parsedTags).toEqual(['systems', 'rust', 'networking', 'web3']);
      });

      test('B4.2: Handles empty tag input string', () => {
        const inputString = '   , , ,   ';
        const parsedTags = inputString.split(',').map((t) => t.trim()).filter(Boolean);
        expect(parsedTags).toEqual([]);
      });

      test('B4.3: Search string includes all tags combined', () => {
        const post = transformBlogPost({
          title: 'Title',
          tags: ['alpha', 'beta', 'gamma'],
        });
        expect(post.search).toContain('alpha');
        expect(post.search).toContain('beta');
        expect(post.search).toContain('gamma');
      });
    });

    // -------------------------------------------------------------------------
    // B5: Authentication & Row Level Security Boundaries
    // -------------------------------------------------------------------------
    describe('B5: Authentication & Row Level Security Boundaries', () => {
      const seedData = [
        { id: '1', slug: 'public-post-1', title: 'Public Post 1', published: true },
        { id: '2', slug: 'draft-post-1', title: 'Draft Post 1', published: false },
        { id: '3', slug: 'public-post-2', title: 'Public Post 2', published: true },
      ];

      test('B5.1: Unauthenticated read receives only published posts', async () => {
        const client = new MockSupabaseClient(seedData, null); // anonymous / build time
        const { data, error } = await client.from('blog_posts').select('*');
        expect(error).toBeNull();
        expect(data.length).toBe(2);
        expect(data.every((p) => p.published === true)).toBeTruthy();
      });

      test('B5.2: Unauthenticated insert is rejected by RLS policy', async () => {
        const client = new MockSupabaseClient(seedData, null);
        const { data, error } = await client.from('blog_posts').insert({
          slug: 'hack-post',
          title: 'Unauthorized Post',
        });
        expect(error).toBeDefined();
        expect(error.message).toMatch(/row-level security policy/i);
      });

      test('B5.3: Non-owner authenticated user insert is rejected by RLS policy', async () => {
        const client = new MockSupabaseClient(seedData, 'intruder@example.com');
        const { data, error } = await client.from('blog_posts').insert({
          slug: 'intruder-post',
          title: 'Intruder Post',
        });
        expect(error).toBeDefined();
        expect(error.message).toMatch(/row-level security policy/i);
      });

      test('B5.4: Owner authenticated user can view draft posts and execute inserts', async () => {
        const client = new MockSupabaseClient(seedData, 'himanshuchavdacodes@gmail.com');
        const { data: readData } = await client.from('blog_posts').select('*');
        expect(readData.length).toBe(3); // Sees both published and draft posts

        const { data: insertData, error: insertError } = await client.from('blog_posts').insert({
          slug: 'new-draft',
          title: 'New Draft By Owner',
          published: false,
        });
        expect(insertError).toBeNull();
        expect(insertData).toBeDefined();
      });

      test('B5.5: Owner can update and delete existing posts', async () => {
        const client = new MockSupabaseClient(seedData, 'himanshuchavdacodes@gmail.com');
        const { error: updateError } = await client.from('blog_posts').eq('id', '2').update({ published: true });
        expect(updateError).toBeNull();

        const { error: deleteError } = await client.from('blog_posts').eq('id', '1').delete();
        expect(deleteError).toBeNull();
      });
    });

    // -------------------------------------------------------------------------
    // B6: Date Format & Sorting Boundaries
    // -------------------------------------------------------------------------
    describe('B6: Date Format & Sorting Boundaries', () => {
      test('B6.1: Valid ISO date string parses to formatted human date', () => {
        const post = transformBlogPost({ date: '2026-12-31' });
        expect(post.dateFormatted).toBe('Dec 31, 2026');
      });

      test('B6.2: Leap year date parses properly', () => {
        const post = transformBlogPost({ date: '2028-02-29' });
        expect(post.dateFormatted).toBe('Feb 29, 2028');
      });

      test('B6.3: Empty date string leaves dateFormatted empty', () => {
        const post = transformBlogPost({ date: '' });
        expect(post.dateFormatted).toBe('');
      });
    });
  });
}
