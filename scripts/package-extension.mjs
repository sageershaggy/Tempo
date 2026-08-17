/**
 * Packages dist/ into a versioned zip ready for the Chrome Web Store, after
 * checking that the version numbers agree.
 *
 * Uses the platform's own archiver so the repo needs no extra dependency.
 * Usage: npm run package   (runs `npm run build` first)
 */
import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

const readJson = p => JSON.parse(readFileSync(p, 'utf-8'));

const pkg = readJson(path.join(root, 'package.json'));
const manifestPath = path.join(dist, 'manifest.json');

if (!existsSync(manifestPath)) {
  console.error('✗ dist/manifest.json not found. Run `npm run build` first.');
  process.exit(1);
}

const manifest = readJson(manifestPath);

// The store rejects uploads whose version has not increased, and a mismatch
// between package.json and the manifest is the usual cause of shipping the
// wrong number. Fail loudly rather than producing a mislabelled zip.
if (manifest.version !== pkg.version) {
  console.error(
    `✗ Version mismatch: package.json is ${pkg.version} but ` +
    `public/manifest.json is ${manifest.version}.\n` +
    `  Update public/manifest.json to ${pkg.version} and rebuild.`
  );
  process.exit(1);
}

const outFile = path.join(root, `tempo-focus-${pkg.version}.zip`);
if (existsSync(outFile)) rmSync(outFile);

try {
  if (process.platform === 'win32') {
    execFileSync(
      'powershell',
      ['-NoProfile', '-Command', `Compress-Archive -Path '${dist}\\*' -DestinationPath '${outFile}'`],
      { stdio: 'inherit' }
    );
  } else {
    execFileSync('zip', ['-r', outFile, '.'], { cwd: dist, stdio: 'inherit' });
  }
} catch (e) {
  console.error('✗ Packaging failed:', e.message);
  process.exit(1);
}

console.log(`\n✓ ${path.basename(outFile)} — upload this to the Chrome Web Store.`);
