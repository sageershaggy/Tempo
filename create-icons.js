import fs from 'fs';
import path from 'path';

// Simple timer icon in SVG format - a stylized clock/timer
const createSvgIcon = (size) => {
  const strokeWidth = size < 32 ? 2 : size < 64 ? 3 : 4;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) - strokeWidth - 2;
  const handLength = r * 0.6;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#9F45F6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7F13EC;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#grad)" stroke="#5a0db5" stroke-width="${strokeWidth}"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 0.15}" fill="white"/>
  <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - handLength}" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round"/>
  <line x1="${cx}" y1="${cy}" x2="${cx + handLength * 0.6}" y2="${cy}" stroke="white" stroke-width="${strokeWidth * 0.8}" stroke-linecap="round"/>
</svg>`;
};

// Create PNG from SVG using a simple approach
// Since we're in Node.js without canvas, we'll save SVG and note that icons need conversion
const sizes = [16, 48, 128];

const iconsDir = path.join(process.cwd(), 'dist', 'icons');
const srcIconsDir = path.join(process.cwd(), 'icons');

// Ensure directories exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}
if (!fs.existsSync(srcIconsDir)) {
  fs.mkdirSync(srcIconsDir, { recursive: true });
}

sizes.forEach(size => {
  const svg = createSvgIcon(size);
  const filename = `icon${size}.svg`;

  // Save to both locations
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  fs.writeFileSync(path.join(srcIconsDir, filename), svg);

  console.log(`Created ${filename}`);
});

console.log('\nSVG icons created. For Chrome Web Store submission, you will need to convert these to PNG format.');
console.log('You can use online tools like: https://cloudconvert.com/svg-to-png');
console.log('Or use ImageMagick: convert icon16.svg icon16.png');
