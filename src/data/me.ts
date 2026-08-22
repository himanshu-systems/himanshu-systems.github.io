/**
 * All the content for the about page (/). Edit this file, not
 * src/pages/index.astro -- nothing in that file needs to change for a
 * content edit.
 *
 * The placeholder prose describes what to write rather than inventing a bio.
 * Replace it before you show this page to anyone. Empty any array to drop
 * that section entirely -- its heading disappears with it.
 *
 * Images live in static/, which is copied to the site root at build time. So
 * static/images/portrait.jpg is written here as 'images/portrait.jpg'.
 *
 * The Tried section is not edited here -- the teaser on this page and the
 * full, filterable list at /tried both read from src/data/tried.ts.
 */
export const me = {
  name: 'Himanshu Chavda',

  /* One line, under your name. What you do, in plain words. */
  role: 'I turn simple questions into unnecessarily deep problems.',

  /* Two or three sentences. What you care about, what you are working toward,
     how you got here. Keep it plain — this is the part people actually read. */
  intro:
    'I research things, work out how they actually work, then build around what ' +
    'I learn. Backend systems, networking, operating systems, databases, ' +
    'distributed systems, security, Rust, Go — whatever has my attention that ' +
    'week. I want the big picture and the smallest mechanism, which is how I ' +
    'end up with ten unfinished things and twenty more I want to start.',

  /* Optional. One line about what is on your desk right now. '' hides it. */
  now: 'Working on a nats.studio app which is GUI for Nats messaging , and Participating in Hackathons.',

  /* Optional. Set to null for no portrait. alt is read aloud by screen readers,
     so describe the picture rather than repeating your name. */
  portrait: { src: 'images/portrait.jpg', alt: 'Portrait photo' },

  /* Left column is the area, right column is the detail. */
  doing: [
    { label: 'systems', detail: 'Backend, operating systems, distributed systems, and the networking underneath.' },
    { label: 'Ai', detail: 'Vibe codding and building Ai tools for fun and learning. Planning to go in more into Automation and LLM and other stuff.' },
    { label: 'security', detail: 'How things break, and what that says about how they were built. not stated yet.' },
    { label: 'languages', detail: 'Rust and Go, mostly. Understanding the Features it  provides ' },
    { label: 'method', detail: 'Start with a question. Read until it makes sense. Build something with it.' },
  ],

  /* Set href to null for anything that has no link yet. */
  work: [
    {
      year: '2026',
      title: 'HTML DOCS TO Learn',
      blurb: 'A single GitHub Pages site that serves both hand-written pages and imported HTML, driven by one registry file.',
      href: 'https://github.com/himanshu-systems/himanshu-systems.github.io',
    },
    {
      year: '20XX',
      title: 'Another project',
      blurb: 'One sentence on what it does and why you built it.',
      href: null as string | null,
    },
  ],

  /* Screenshots, photos, anything visual. Drop files into static/images/ and
     point at them here. Captions are optional. */
  gallery: [
    { src: 'images/work-1.svg', alt: 'Placeholder image one', caption: 'A caption, if it needs one.' },
    { src: 'images/work-2.svg', alt: 'Placeholder image two', caption: '' },
    { src: 'images/work-3.svg', alt: 'Placeholder image three', caption: '' },
  ],

  /* Remove the email line if you would rather not have it scraped. */
  elsewhere: [
    { label: 'github', text: '@himanshu-systems', href: 'https://github.com/himanshu-systems' },
    { label: 'email', text: 'himanshuchavdacodes@gmail.com', href: 'mailto:himanshuchavdacodes@gmail.com' },
  ],
};
