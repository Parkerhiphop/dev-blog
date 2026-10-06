import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const postsRoot = path.join(root, 'src/content/posts');
const coversRoot = path.join(root, 'public/covers');
const palettes = {
  zh: { accent: '#06b6d4', label: '軟體開發筆記', lang: 'ZH' },
  en: { accent: '#06b6d4', label: 'SOFTWARE DEVELOPMENT', lang: 'EN' },
  ja: { accent: '#06b6d4', label: 'ソフトウェア開発ノート', lang: 'JA' },
};
const pixelGlyphs = {
  ' ': ['00000','00000','00000','00000','00000','00000','00000'],
  A: ['01110','10001','10001','11111','10001','10001','10001'], B: ['11110','10001','10001','11110','10001','10001','11110'],
  C: ['01111','10000','10000','10000','10000','10000','01111'], D: ['11110','10001','10001','10001','10001','10001','11110'],
  E: ['11111','10000','10000','11110','10000','10000','11111'], F: ['11111','10000','10000','11110','10000','10000','10000'],
  G: ['01111','10000','10000','10111','10001','10001','01111'], H: ['10001','10001','10001','11111','10001','10001','10001'],
  I: ['11111','00100','00100','00100','00100','00100','11111'], J: ['00111','00010','00010','00010','10010','10010','01100'],
  K: ['10001','10010','10100','11000','10100','10010','10001'], L: ['10000','10000','10000','10000','10000','10000','11111'],
  M: ['10001','11011','10101','10101','10001','10001','10001'], N: ['10001','11001','10101','10011','10001','10001','10001'],
  O: ['01110','10001','10001','10001','10001','10001','01110'], P: ['11110','10001','10001','11110','10000','10000','10000'],
  Q: ['01110','10001','10001','10001','10101','10010','01101'], R: ['11110','10001','10001','11110','10100','10010','10001'],
  S: ['01111','10000','10000','01110','00001','00001','11110'], T: ['11111','00100','00100','00100','00100','00100','00100'],
  U: ['10001','10001','10001','10001','10001','10001','01110'], V: ['10001','10001','10001','10001','10001','01010','00100'],
  W: ['10001','10001','10001','10101','10101','10101','01010'], X: ['10001','10001','01010','00100','01010','10001','10001'],
  Y: ['10001','10001','01010','00100','00100','00100','00100'], Z: ['11111','00001','00010','00100','01000','10000','11111'],
  0: ['01110','10001','10011','10101','11001','10001','01110'], 1: ['00100','01100','00100','00100','00100','00100','01110'],
  2: ['01110','10001','00001','00010','00100','01000','11111'], 3: ['11110','00001','00001','01110','00001','00001','11110'],
  4: ['00010','00110','01010','10010','11111','00010','00010'], 5: ['11111','10000','10000','11110','00001','00001','11110'],
  6: ['01110','10000','10000','11110','10001','10001','01110'], 7: ['11111','00001','00010','00100','01000','01000','01000'],
  8: ['01110','10001','10001','01110','10001','10001','01110'], 9: ['01110','10001','10001','01111','00001','00001','01110'],
  '-': ['00000','00000','00000','11111','00000','00000','00000'], '/': ['00001','00010','00010','00100','01000','01000','10000'],
  ':': ['00000','00100','00100','00000','00100','00100','00000'], '.': ['00000','00000','00000','00000','00000','00110','00110'],
  ',': ['00000','00000','00000','00000','00110','00110','00100'], "'": ['00110','00110','00100','00000','00000','00000','00000'],
  '&': ['01100','10010','10100','01000','10101','10010','01101'], '?': ['01110','10001','00001','00010','00100','00000','00100'],
};

function escapeXml(value) {
  return value.replace(/[<>&"']/g, (char) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  })[char]);
}

function frontmatterValue(source, key) {
  const match = source.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  if (!match) return '';
  return match[1].trim().replace(/^(['"])(.*)\1$/, '$2');
}

function wrapTitle(title) {
  const hasWideCharacters = [...title].some((character) => /[\u2e80-\u9fff\u3040-\u30ff\uac00-\ud7af]/u.test(character));
  const max = hasWideCharacters ? 17 : 30;
  if (title.length <= max) return [title];
  const words = title.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && `${line} ${word}`.length <= max) {
      line = `${line} ${word}`;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    const characters = [...word];
    while (characters.length > max) {
      lines.push(characters.splice(0, max).join(''));
    }
    line = characters.join('');
  }
  if (line) lines.push(line);
  return lines;
}

function renderPixelText(value, startX, startY, pixelSize) {
  let x = startX;
  const glyphs = [...value].map((character) => {
    const glyph = pixelGlyphs[character.toUpperCase()];
    if (!glyph) { x += pixelSize * 6; return ''; }
    const pieces = [];
    glyph.forEach((row, rowIndex) => [...row].forEach((bit, colIndex) => {
      if (bit === '1') pieces.push(`<rect x="${x + colIndex * pixelSize}" y="${startY + rowIndex * pixelSize}" width="${pixelSize}" height="${pixelSize}"/>`);
    }));
    x += pixelSize * 6;
    return pieces.join('');
  });
  return glyphs.join('');
}

function renderCover(title, palette) {
  const lines = wrapTitle(title);
  const fontSize = lines.length > 3 ? 43 : lines.length > 2 ? 48 : lines.length > 1 ? 54 : 62;
  const titleSvg = lines.map((line, index) =>
    `<text x="100" y="${300 + index * (fontSize + 14)}" font-size="${fontSize}" font-weight="700">${escapeXml(line)}</text>`,
  ).join('\n');
  const pixelBrand = renderPixelText("Parker's Dev Blog", 136, 96, 3.8);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeXml(title)}">
  <defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 L 0 0 0 32" fill="none" stroke="#1f3a3f" stroke-width="1" opacity=".42"/></pattern><linearGradient id="glow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${palette.accent}" stop-opacity=".16"/><stop offset="1" stop-color="${palette.accent}" stop-opacity="0"/></linearGradient></defs>
  <rect width="1200" height="630" fill="#0a0f14"/><rect width="1200" height="630" fill="url(#grid)"/><rect width="1200" height="630" fill="url(#glow)"/>
  <circle cx="1080" cy="105" r="220" fill="none" stroke="${palette.accent}" stroke-opacity=".16" stroke-width="2"/><circle cx="1080" cy="105" r="160" fill="none" stroke="${palette.accent}" stroke-opacity=".12" stroke-width="2"/>
  <rect x="100" y="88" width="12" height="44" rx="6" fill="${palette.accent}"/><g fill="#22d3ee">${pixelBrand}</g>
  <text x="100" y="215" fill="${palette.accent}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="18" letter-spacing="5">${escapeXml(palette.label)}</text>
  <g fill="#e2f6f6" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Noto Sans CJK TC', 'Noto Sans JP', Arial, sans-serif">${titleSvg}</g>
  <path d="M100 540h1000" stroke="#1f3a3f" stroke-width="2"/><text x="100" y="580" fill="#93a4ad" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="18">dev.parkerchang.life</text><text x="1100" y="580" text-anchor="end" fill="${palette.accent}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="18">${palette.lang} · NOTES</text>
</svg>`;
}

for (const lang of Object.keys(palettes)) {
  const langPath = path.join(postsRoot, lang);
  let entries;
  try { entries = await readdir(langPath, { withFileTypes: true }); } catch { continue; }
  await mkdir(path.join(coversRoot, lang), { recursive: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const slug = entry.name.slice(0, -3);
    const source = await readFile(path.join(langPath, entry.name), 'utf8');
    const title = frontmatterValue(source, 'title');
    if (!title) continue;
    await writeFile(path.join(coversRoot, lang, `${slug}.svg`), renderCover(title, palettes[lang]));
  }
}
