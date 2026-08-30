/**
 * Shrinks the photos in static/images/ to the size they are actually shown at,
 * and emits a blur placeholder for each.
 *
 * Why this exists
 * ---------------
 * portrait.jpg shipped at 864x1536 and 403 KB into a frame about 330 CSS px
 * wide with aspect-ratio 4/5. So the browser downloaded roughly nine times the
 * pixels it could use, then object-fit: cover threw away a third of the height
 * as well. On the hero of the page that reads as "something is missing" for as
 * long as it takes to arrive.
 *
 * GitHub Pages sends Cache-Control: max-age=600 on everything and offers no way
 * to change it -- there is no _headers file, that is a Netlify/Cloudflare
 * feature. So the file cannot be cached for longer than ten minutes, and the
 * only lever left is making it small. (After those ten minutes the ETag still
 * turns the re-fetch into a 304 with no body, so this is about the cold fetch.)
 *
 * The blur placeholder is a ~24px wide JPEG inlined as a data URI, small enough
 * to sit in the HTML. It paints instantly, so the frame is never empty.
 *
 * No WebP sibling, deliberately. It was tried: at these dimensions and quality
 * mozjpeg produced 99.8 KB and WebP encoded from the same source produced
 * 103.8 KB, so <picture> would have added markup and a second file to ship 4%
 * more bytes. WebP's advantage shows at lower quality and on flat or graphic
 * images; this is a photograph at q82. Re-measure before assuming otherwise.
 *
 * Not part of `npm run build`: it rewrites committed files in place. Run it by
 * hand after adding or replacing a photo, then commit the result. The original
 * of anything it overwrites stays recoverable in git history.
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const imagesDir = join(root, 'static', 'images');
const lqipPath = join(root, 'tools', 'lqip.json');

/**
 * Per-image intent. `box` is the displayed CSS size; the output is 2x that for
 * retina, and `fit: cover` crops to the box's aspect ratio rather than letting
 * the browser discard the excess at paint time.
 */
const TARGETS = {
  // 206x258 is what the portrait actually renders at, measured in a browser at
  // every viewport from 390 to 2560: the shell is capped by --page: 58rem, so
  // the frame stops growing at 768 and never gets wider. Estimating from the
  // design instead gave 344x430 and shipped 1.7x more pixels than any screen
  // could use. Re-measure if the homepage grid changes.
  'portrait.jpg': { box: [206, 258], quality: 82 },
};

const LQIP_WIDTH = 24;

const files = readdirSync(imagesDir).filter((f) => /\.(jpe?g|png)$/i.test(f));
if (files.length === 0) {
  console.log('no raster images in static/images/');
  process.exit(0);
}

const lqip = existsSync(lqipPath) ? JSON.parse(readFileSync(lqipPath, 'utf8')) : {};
let saved = 0;

for (const file of files) {
  const abs = join(imagesDir, file);
  // Read to a Buffer rather than handing sharp the path: sharp opens the file
  // lazily and still holds the handle when the pipeline resolves, so writing
  // back to that same path fails on Windows with UNKNOWN/-4094.
  const input = readFileSync(abs);
  const before = input.length;
  const target = TARGETS[file];

  // What the placeholder and the WebP sibling should be derived from: the
  // resized pixels when we produced them, the original otherwise.
  let current = input;

  if (target) {
    const [w, h] = target.box;
    const outW = w * 2;
    const outH = h * 2;

    // Skip on DIMENSIONS, not on byte count. Comparing sizes looks like an
    // idempotency guard but is not one: re-encoding an already-processed JPEG
    // shaves a few hundred bytes each time and passes the "smaller" test, so
    // every run would quietly cost another generation of lossy compression.
    // At target size there is nothing left to do.
    const meta = await sharp(input).metadata();
    if (meta.width <= outW && meta.height <= outH) {
      console.log(`  ${file}: already ${meta.width}x${meta.height} at ${kb(before)}, left alone`);
    } else {
      const out = await sharp(input)
        .rotate() // honour EXIF orientation before resizing, or a phone photo lands sideways
        .resize(outW, outH, { fit: 'cover', position: 'attention' })
        .jpeg({ quality: target.quality, mozjpeg: true, progressive: true })
        .toBuffer();

      writeFileSync(abs, out);
      current = out;
      saved += before - out.length;
      console.log(`  ${file}: ${kb(before)} -> ${kb(out.length)} (${outW}x${outH})`);
    }

  }

  // Blur placeholder, for every raster image whether or not it was resized.
  const tiny = await sharp(current)
    .resize(LQIP_WIDTH)
    .blur(1.2)
    .jpeg({ quality: 40 })
    .toBuffer();
  lqip[`images/${file}`] = `data:image/jpeg;base64,${tiny.toString('base64')}`;
}

writeFileSync(lqipPath, `${JSON.stringify(lqip, null, 2)}\n`);
console.log(`\nplaceholders written for ${Object.keys(lqip).length} image(s)`);
if (saved > 0) console.log(`saved ${kb(saved)}`);

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}
