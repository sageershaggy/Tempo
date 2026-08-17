/**
 * Regenerates the extension icons that public/manifest.json actually ships:
 * public/icons/icon{16,48,128}_v4.png, rasterised from the matching _v4.svg.
 *
 * This replaces four overlapping root-level scripts that had drifted apart:
 *   create-icons.js        — drew SVGs procedurally (superseded by the _v4 art)
 *   create-png-icons.js    — wrote hard-coded base64 placeholders to dist/ and
 *                            a root icons/ folder the manifest never referenced
 *   create-png-icons-v4.js — the authoritative one; its behaviour is kept here
 *   update-icons.js        — produced _v3 icons from logo.png; unshipped
 *
 * Usage: npm run icons
 */
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

const SIZES = [16, 48, 128];

async function main() {
  let generated = 0;

  for (const size of SIZES) {
    const svgPath = path.join(iconsDir, `icon${size}_v4.svg`);
    const pngPath = path.join(iconsDir, `icon${size}_v4.png`);

    if (!existsSync(svgPath)) {
      console.error(`✗ missing source: ${path.relative(process.cwd(), svgPath)}`);
      continue;
    }

    await sharp(svgPath).resize(size, size).png().toFile(pngPath);
    console.log(`✓ icon${size}_v4.png`);
    generated++;
  }

  if (generated !== SIZES.length) {
    console.error(`\nGenerated ${generated}/${SIZES.length} icons. The manifest references all three.`);
    process.exit(1);
  }
  console.log('\nIcons regenerated.');
}

main().catch(err => {
  console.error('Icon generation failed:', err.message);
  process.exit(1);
});
