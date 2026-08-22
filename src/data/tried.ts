/**
 * Shared by the about page (which shows the 3 most recent as a teaser),
 * /tried (which shows all of them, filterable), and /tried/<slug> (each
 * entry's own page). Edit this file, not any of the three -- src/lib/tried.ts
 * sorts by date and builds the slug/href/search text, so entries can go in
 * any order here.
 *
 * outcome and liked are free text on purpose: write what actually happened
 * rather than picking from a fixed list. tags are for the filter -- reuse the
 * labels from "What I do" on the about page (systems, data, security,
 * languages, method) where they fit, or add whatever new ones you need;
 * "people", "creative", "ideas" and so on are just as valid.
 *
 * description and image are optional and only appear on the entry's own
 * page -- the list and teaser only ever show the short `note`. A
 * description with a blank line between two paragraphs renders as two
 * paragraphs; without one, note is what shows there too. Drop image files
 * into static/images/ and point at them the same way the portrait does:
 * image: { src: 'images/whatever.jpg', alt: 'Describe the picture.' }
 */
export interface TriedEntry {
  date: string;
  title: string;
  note: string;
  description?: string;
  image?: { src: string; alt: string };
  outcome: string;
  liked: string;
  tags: string[];
}
export const tried: TriedEntry[] = [
  {
    date: "2026-06-18",
    title: "Seva Cafe - Volunteering",
    note:
      "I want to volunteer at Seva Cafe, a place where people can come together and share a meal. I want to give back to the community and help those in need.",
    outcome: "processing",
    liked: "let see",
    tags: ["people", "creative"],
  },

  {
    date: "2026-06-18",
    title: "Singing Reel Challenge",
    note:
      "Planning to do anonymous singing reels for a month. I want to see if I can get over my fear of singing in public.",
    outcome: "processing ",
    liked: "let see",
    tags: ["creative"],
  },
  {
    date: "2026-06-18",
    title: "Hackathons",
    note:
      "Tried building under ridiculous time pressure with my IIT friend(TIRTH NANDHA). I liked the chaos, the ideas, and the feeling of making something from nothing.",
    outcome: "worked",
    liked: "liked it",
    tags: ["people", "creative"],
  },
  {
    date: "2026-08-14",
    title: "Singing in Public",
    note:
      "I have never sung in public before, so I decided to try it. It was terrifying, but also exhilarating. I forgot about fear and just sang my heart out. I want to do it again.",
    outcome: "worked",
    liked: "loved it",
    tags: ["creative"],
  },
  {
    date: "2026-04-10",
    title: "Dancing",
    note:
      "I have made a reel of me dancing for the first time. And completed the dare my friend asked me to do. I was in fear of getting laughed at, but I did it anyway.",
    outcome: "worked",
    liked: "liked it",
    tags: ["creative"],
  },
  {
    date: "2024-05-15",
    title: "Reading philosophy",
    note:
      "Went down a few philosophical rabbit holes. Some ideas genuinely changed how I think; others made my brain hurt.",
    outcome: "mixed",
    liked: "mixed feelings",
    tags: ["ideas"],
  },
];
