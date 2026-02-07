import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const sizes = [16, 48, 128];
const iconsDir = path.join(process.cwd(), 'public', 'icons');

async function convert() {
  for (const size of sizes) {
    const svgPath = path.join(iconsDir, `icon${size}_v4.svg`);
    const pngPath = path.join(iconsDir, `icon${size}_v4.png`);

    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(pngPath);

    console.log(`Created icon${size}_v4.png`);
  }
}

convert().catch(err => {
  console.error('Conversion failed:', err.message);
});
