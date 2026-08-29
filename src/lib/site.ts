import { supabase } from './supabaseClient';
import { readCache, writeCache } from './buildCache';

export interface DoingItem {
  label: string;
  detail: string;
}

export interface WorkItem {
  year: string;
  title: string;
  blurb: string;
  href: string | null;
}

export interface GalleryItem {
  src: string;
  alt: string;
  caption: string;
}

export interface ElsewhereItem {
  label: string;
  text: string;
  href: string;
}

export interface SiteContent {
  name: string;
  role: string;
  intro: string;
  now: string;
  portrait?: { src: string; alt: string };
  doing: DoingItem[];
  work: WorkItem[];
  gallery: GalleryItem[];
  elsewhere: ElsewhereItem[];
}

/** The about page's content -- a single row, always public (see supabase/site_content.sql). */
export async function getSiteContent(): Promise<SiteContent> {
  try {
    const { data, error } = await supabase.from('site_content').select('*').eq('id', 1).single();

    if (error) {
      throw new Error(`Could not load site_content from Supabase: ${error.message}`);
    }

    const content: SiteContent = {
      name: data.name,
      role: data.role,
      intro: data.intro,
      now: data.now,
      portrait: data.portrait_src ? { src: data.portrait_src, alt: data.portrait_alt ?? '' } : undefined,
      doing: data.doing ?? [],
      work: data.work ?? [],
      gallery: data.gallery ?? [],
      elsewhere: data.elsewhere ?? [],
    };

    writeCache('site_content', content);
    return content;
  } catch (err: any) {
    const cached = readCache<SiteContent>('site_content');
    if (cached) {
      return cached;
    }
    throw new Error(`Could not load site_content from Supabase: ${err?.message || err}`);
  }
}
