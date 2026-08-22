/**
 * Shared by the about page (which shows the 3 most recent as a teaser) and
 * /tried (which shows all of them, filterable). Edit this file, not either
 * page — newest entry first.
 *
 * outcome and liked are free text on purpose: write what actually happened
 * rather than picking from a fixed list. tags are for the filter on /tried —
 * reuse the labels from "What I do" on the about page (systems, data,
 * security, languages, method) where they fit, or add new ones as needed.
 */
export interface TriedEntry {
  date: string;
  title: string;
  note: string;
  outcome: string;
  liked: string;
  tags: string[];
}

export const tried: TriedEntry[] = [
  {
    date: '2026-08',
    title: 'Something you tried',
    note: 'What it was and what happened, in a sentence or two.',
    outcome: 'worked',
    liked: 'liked it',
    tags: ['systems'],
  },
  {
    date: '2026-07',
    title: 'Something that did not pan out',
    note: 'What you expected, and where it fell apart.',
    outcome: 'failed',
    liked: 'not for me',
    tags: ['security'],
  },
  {
    date: '2026-06',
    title: 'Something with a mixed result',
    note: 'What worked, what did not, and why you kept part of it.',
    outcome: 'mixed',
    liked: 'mixed feelings',
    tags: ['data'],
  },
  {
    date: '2026-05',
    title: 'Something still in progress',
    note: 'Where it stands right now.',
    outcome: 'ongoing',
    liked: 'liked it',
    tags: ['languages', 'systems'],
  },
];
