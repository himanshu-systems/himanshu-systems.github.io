import { supabase } from './supabaseClient';
import { routeHref } from './paths';
import { readCache, writeCache } from './buildCache';

export interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string;
  date: string;
  tags: string[] | null;
  reading_time: string | null;
  image_src: string | null;
  image_alt: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  date: string;
  dateFormatted: string;
  tags: string[];
  readingTime: string;
  image?: { src: string; alt: string };
  published: boolean;
  href: string;
  search: string;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00Z`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return dateStr;
  }
}

export function toPost(row: BlogPostRow): BlogPost {
  const search = [
    row.title,
    row.description ?? '',
    row.content ?? '',
    ...(row.tags ?? []),
    row.reading_time ?? '',
  ]
    .join(' ')
    .toLowerCase();

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? '',
    content: row.content ?? '',
    date: row.date,
    dateFormatted: formatDate(row.date),
    tags: row.tags ?? [],
    readingTime: row.reading_time ?? '',
    image: row.image_src
      ? { src: row.image_src, alt: row.image_alt || row.title }
      : undefined,
    published: row.published,
    href: routeHref(`/blog/${row.slug}`),
    search,
  };
}

/**
 * Fetch published blog posts ordered newest first.
 * If Supabase is unreachable (e.g. offline build), falls back to the build cache.
 */
export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('published', true)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Could not load blog_posts from Supabase: ${error.message}`);
    }

    const rows = (data ?? []) as BlogPostRow[];
    writeCache('blog_posts', rows);
    return rows.map(toPost);
  } catch (err: any) {
    const cached = readCache<BlogPostRow[]>('blog_posts');
    if (cached) {
      return cached.filter((r) => r.published !== false).map(toPost);
    }
    throw new Error(`Could not load blog_posts from Supabase: ${err?.message || err}`);
  }
}

/**
 * Fetch a single blog post by slug.
 */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const posts = await getBlogPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}
