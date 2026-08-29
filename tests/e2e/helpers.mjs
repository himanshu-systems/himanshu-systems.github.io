import fs from 'node:fs';
import path from 'node:path';

export const ROOT_DIR = process.cwd();

export function readFileSafe(relPath) {
  const fullPath = path.resolve(ROOT_DIR, relPath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf8');
}

export function fileExists(relPath) {
  const fullPath = path.resolve(ROOT_DIR, relPath);
  return fs.existsSync(fullPath);
}

/** Pure JS implementations matching src/lib/slug.ts */
export function slugify(title) {
  const base = String(title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'entry';
}

export function uniqueSlug(title, taken, ignoreSlug) {
  const base = slugify(title);
  if (base === ignoreSlug || !taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`) && `${base}-${i}` !== ignoreSlug) i++;
  return `${base}-${i}`;
}

/** Pure JS implementation matching src/lib/filter.ts */
export function matchesQuery(haystack, query) {
  const words = String(query || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return true;
  const target = String(haystack || '').toLowerCase();
  return words.every((word) => target.includes(word));
}

/**
 * SQL Schema Analyzer
 */
export function parseSqlSchema(sqlContent) {
  const normalized = (sqlContent || '').replace(/--.*$/gm, ''); // remove comments

  // Find table creation
  const tableMatch = normalized.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?([a-zA-Z0-9_.]+)\s*\(([\s\S]*?)\);/i);
  const tableName = tableMatch ? tableMatch[1].trim() : null;
  const tableBody = tableMatch ? tableMatch[2] : '';

  // Extract columns
  const columns = {};
  if (tableBody) {
    const lines = tableBody.split(/,\n|\r\n|\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('constraint') || line.startsWith('primary key') || line.startsWith('unique')) continue;
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const colName = parts[0];
        const colType = parts.slice(1).join(' ');
        columns[colName] = colType;
      }
    }
  }

  // Find RLS policies
  const policyMatches = [...normalized.matchAll(/create\s+policy\s+"([^"]+)"\s+on\s+([a-zA-Z0-9_.]+)\s+for\s+(\w+)\s+to\s+([a-zA-Z0-9_,\s]+)\s+using\s*\(([\s\S]*?)\)(?:\s+with\s+check\s*\(([\s\S]*?)\))?;/gi)];
  const policies = policyMatches.map((m) => ({
    name: m[1],
    table: m[2],
    action: m[3].toLowerCase(),
    roles: m[4].split(',').map((r) => r.trim()),
    using: m[5].trim(),
    check: m[6] ? m[6].trim() : null,
  }));

  // Find triggers
  const triggerMatches = [...normalized.matchAll(/create\s+trigger\s+([a-zA-Z0-9_]+)\s+(before|after)\s+(insert|update|delete)\s+on\s+([a-zA-Z0-9_.]+)\s+for\s+each\s+row\s+execute\s+function\s+([a-zA-Z0-9_.]+)\(\);/gi)];
  const triggers = triggerMatches.map((m) => ({
    name: m[1],
    timing: m[2].toLowerCase(),
    event: m[3].toLowerCase(),
    table: m[4],
    function: m[5],
  }));

  // Find indexes
  const indexMatches = [...normalized.matchAll(/create\s+(unique\s+)?index\s+(?:if\s+not\s+exists\s+)?([a-zA-Z0-9_]+)\s+on\s+([a-zA-Z0-9_.]+)(?:\s+using\s+(\w+))?\s*\(([\s\S]*?)\);/gi)];
  const indexes = indexMatches.map((m) => ({
    unique: Boolean(m[1]),
    name: m[2],
    table: m[3],
    method: m[4] ? m[4].toLowerCase() : 'btree',
    columns: m[5].trim(),
  }));

  // Find seed data inserts
  const insertMatches = [...normalized.matchAll(/insert\s+into\s+([a-zA-Z0-9_.]+)\s*\(([^)]+)\)\s*values\s*([\s\S]*?)(?:on\s+conflict|;)/gi)];
  const inserts = insertMatches.map((m) => ({
    table: m[1],
    columns: m[2].split(',').map((c) => c.trim()),
    rawValues: m[3].trim(),
  }));

  return {
    tableName,
    columns,
    policies,
    triggers,
    indexes,
    inserts,
    hasRlsEnabled: /alter\s+table\s+[a-zA-Z0-9_.]+\s+enable\s+row\s+level\s+security;/i.test(normalized),
  };
}

/**
 * Standard BlogPost transformation simulator matching src/lib/blog.ts contract
 */
export function transformBlogPost(row, baseHref = '/blog') {
  const search = [
    row.title || '',
    row.description || '',
    row.reading_time || '',
    ...(row.tags || []),
  ]
    .join(' ')
    .toLowerCase();

  const formattedDate = row.date
    ? new Date(row.date + 'T00:00:00Z').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      })
    : '';

  return {
    id: row.id || '',
    slug: row.slug || '',
    title: row.title || '',
    description: row.description || '',
    content: row.content || '',
    date: row.date || '',
    dateFormatted: formattedDate || row.date || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    readingTime: row.reading_time || '',
    image: row.image_src ? { src: row.image_src, alt: row.image_alt || '' } : undefined,
    published: Boolean(row.published),
    href: `${baseHref.replace(/\/+$/, '')}/${row.slug}/`,
    search,
  };
}

/**
 * Mock Supabase In-Memory Database for RLS and CRUD tests
 */
export class MockSupabaseClient {
  constructor(initialData = [], currentUserEmail = null) {
    this.tableData = [...initialData];
    this.currentUserEmail = currentUserEmail;
    this.lastQuery = null;
  }

  setUserEmail(email) {
    this.currentUserEmail = email;
  }

  from(tableName) {
    const self = this;
    let data = [...self.tableData];
    let isSelect = false;
    let selectFields = '*';

    const queryBuilder = {
      select(fields = '*') {
        isSelect = true;
        selectFields = fields;
        // RLS Select Filter:
        // Anon / normal users can only read published = true.
        // Owner can read all (published = true OR email = 'himanshuchavdacodes@gmail.com').
        if (self.currentUserEmail !== 'himanshuchavdacodes@gmail.com') {
          data = data.filter((row) => row.published === true || row.is_public === true);
        }
        return queryBuilder;
      },
      eq(column, value) {
        data = data.filter((row) => row[column] === value);
        return queryBuilder;
      },
      order(column, { ascending = true } = {}) {
        data.sort((a, b) => {
          if (a[column] < b[column]) return ascending ? -1 : 1;
          if (a[column] > b[column]) return ascending ? 1 : -1;
          return 0;
        });
        return queryBuilder;
      },
      async insert(newRow) {
        if (self.currentUserEmail !== 'himanshuchavdacodes@gmail.com') {
          return { data: null, error: { message: 'new row violates row-level security policy for table "blog_posts"' } };
        }
        const createdRow = {
          id: newRow.id || `mock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          published: false,
          tags: [],
          ...newRow,
        };
        self.tableData.push(createdRow);
        return { data: [createdRow], error: null };
      },
      async update(updates) {
        if (self.currentUserEmail !== 'himanshuchavdacodes@gmail.com') {
          return { data: null, error: { message: 'violates row-level security policy for table "blog_posts"' } };
        }
        let updatedCount = 0;
        const matchingIds = new Set(data.map((r) => r.id));
        self.tableData = self.tableData.map((row) => {
          if (matchingIds.has(row.id)) {
            updatedCount++;
            return {
              ...row,
              ...updates,
              updated_at: new Date().toISOString(),
            };
          }
          return row;
        });
        return { data: null, error: null, count: updatedCount };
      },
      async delete() {
        if (self.currentUserEmail !== 'himanshuchavdacodes@gmail.com') {
          return { data: null, error: { message: 'violates row-level security policy for table "blog_posts"' } };
        }
        const matchingIds = new Set(data.map((r) => r.id));
        self.tableData = self.tableData.filter((row) => !matchingIds.has(row.id));
        return { data: null, error: null };
      },
      then(resolve) {
        resolve({ data, error: null });
      },
    };

    return queryBuilder;
  }
}
