// Regenerate the Open Graph / social preview image from scripts/og.svg.
// Run with: npm run og
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(here, 'og.svg'), 'utf8');
const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
writeFileSync(join(here, '..', 'public', 'og.png'), png);
console.log('Wrote public/og.png (1200x630)');
