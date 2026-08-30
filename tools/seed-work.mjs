#!/usr/bin/env node
/**
 * Pushes content/selected-work.json into site_content.work.
 *
 *   npm run seed:work
 *
 * Why this exists. site_content lives in Supabase, not in the repo, and its
 * write policy requires an authenticated admin -- so nothing in a build, and no
 * script holding only the publishable key, can change it. That left two ways to
 * edit "Selected work": the dashboard's SQL editor, or /admin. This is a third,
 * for when you would rather edit a file in the repo than a form in a browser:
 * edit the JSON, run this, done.
 *
 * It signs in as you and writes as you. The password is read from the terminal
 * with echo off, used once, and never written anywhere -- not to a file, not to
 * an environment variable, not to shell history.
 *
 * Nothing here is privileged. It is the same publishable key and the same RLS
 * policies the browser is subject to; the only thing that makes the write
 * succeed is that you signed in.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// .env holds only the publishable URL and key -- both are meant to be public.
const env = Object.fromEntries(
  readFileSync(join(root, '.env'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.PUBLIC_SUPABASE_URL;
const key = env.PUBLIC_SUPABASE_KEY;
if (!url || !key) {
  console.error('PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_KEY missing from .env');
  process.exit(1);
}

const work = JSON.parse(readFileSync(join(root, 'content', 'selected-work.json'), 'utf8'));

if (!Array.isArray(work) || work.length === 0) {
  console.error('content/selected-work.json must be a non-empty array');
  process.exit(1);
}
for (const [i, w] of work.entries()) {
  for (const field of ['year', 'title', 'blurb']) {
    if (typeof w[field] !== 'string') {
      console.error(`entry ${i}: "${field}" must be a string`);
      process.exit(1);
    }
  }
  // The homepage renders a plain <div> instead of an <a> when href is null, and
  // an <a> whenever it is truthy -- so an empty string slips past a bare
  // typeof check and produces a link that goes nowhere. Require null or a real
  // URL, nothing in between.
  if (w.href !== null && (typeof w.href !== 'string' || w.href.trim() === '')) {
    console.error(`entry ${i}: "href" must be null or a non-empty URL`);
    process.exit(1);
  }
}

console.log(`\ncontent/selected-work.json -> ${work.length} entr${work.length === 1 ? 'y' : 'ies'}:`);
for (const w of work) console.log(`  ${w.year}  ${w.title}`);
console.log('\nSign in as an admin to write it. Nothing is stored.\n');

const email = await ask('email: ');
const password = await ask('password: ', { silent: true });
console.log();

const supabase = createClient(url, key);

const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
if (authError) {
  console.error(`Sign-in failed: ${authError.message}`);
  process.exit(1);
}

// .select() so a policy rejection is visible. Without it an UPDATE that RLS
// filters out matches zero rows and still reports success -- see
// src/lib/admin/wrote.ts for the same guard in the browser.
const { data, error } = await supabase
  .from('site_content')
  .update({ work })
  .eq('id', 1)
  .select('id');

await supabase.auth.signOut();

if (error) {
  console.error(`Write failed: ${error.message}`);
  process.exit(1);
}
if (!data || data.length === 0) {
  console.error(
    'Signed in, but the write changed nothing: the row-level security policy on\n' +
    'site_content does not accept this account. Add it to public.admins (see\n' +
    'supabase/admins.sql) or sign in as the address the policy names.',
  );
  process.exit(1);
}

console.log('Written. The site rebuilds in about a minute.');

/** Reads one line; with `silent`, keeps the password off the screen. */
function ask(prompt, { silent = false } = {}) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  return new Promise((resolve) => {
    if (!silent) {
      rl.question(prompt, (answer) => { rl.close(); resolve(answer.trim()); });
      return;
    }
    // readline echoes as it reads, so suppress its own output while the
    // password is being typed and print the prompt ourselves.
    process.stdout.write(prompt);
    const mutable = rl.output;
    rl.output = { write: () => {}, ...mutable, end: mutable.end?.bind(mutable) };
    rl.question('', (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}
