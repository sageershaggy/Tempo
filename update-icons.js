import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const sourceLogo = path.join(rootDir, 'logo.png');
const iconsDir = path.join(rootDir, 'public', 'icons');

const sizes = [16, 48, 128];

async function generateIcons() {
    if (!fs.existsSync(sourceLogo)) {
        console.error('Error: logo.png not found in root directory.');
        process.exit(1);
    }

    if (!fs.existsSync(iconsDir)) {
        fs.mkdirSync(iconsDir, { recursive: true });
    }

    for (const size of sizes) {
        await sharp(sourceLogo)
            .resize(size, size)
            .toFile(path.join(iconsDir, `icon${size}_v3.png`));
        console.log(`Generated icon${size}_v3.png`);
    }

    console.log('Icons updated successfully!');
}

generateIcons().catch(err => console.error(err));
