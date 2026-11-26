// 使い方: node tools/build.mjs <ゲーム名> [上限バイト]
// games/<名前>/body.html と *.js (名前順に連結) を 1 枚の index.html にまとめ、zip 後のサイズを上限と比べる。
// ソースに '__FONT__' があれば、実際に使っている字だけ美咲フォントから抜き出して埋め込む。
import { minify } from 'terser';
import { readFileSync, writeFileSync, mkdirSync, statSync, rmSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

process.chdir(new URL('..', import.meta.url).pathname);   // どこから呼んでも このフォルダを基準にする
const name = process.argv[2], LIMIT = +(process.argv[3] || 32768);
const src = `games/${name}`, out = `dist/${name}`;
const body = readFileSync(`${src}/body.html`, 'utf8').replace(/\n/g, '');
let js = readdirSync(src).filter(f => f.endsWith('.js')).sort().map(f => readFileSync(`${src}/${f}`, 'utf8')).join('\n');
const title = (js.match(/^\/\/ (\S+)/) || [, name])[1];
const opt = { module: true, toplevel: true, ecma: 2020, compress: { passes: 3, unsafe: true, unsafe_arrows: true, booleans_as_integers: true }, mangle: { toplevel: true } };
let min = (await minify(js, opt)).code;

if (min.includes('__FONT__')) {
  const glyphs = JSON.parse(readFileSync('tools/font/misaki.json', 'utf8'));
  const chars = [...new Set([...min].filter(c => c > '\x7f'))].sort();
  const missing = chars.filter(c => !glyphs[c]);
  if (missing.length) { console.error('フォントにない字:', missing.join(' ')); process.exit(1); }
  const font = chars.join('') + '\\t' + Buffer.from(chars.map(c => glyphs[c]).join(''), 'hex').toString('base64');
  min = min.replace('__FONT__', font); js = js.replace('__FONT__', font);
  console.log(`font: ${chars.length} glyphs, ${chars.length * 7} B`);
}
const page = `<title>${title}</title>${body}<script>${min}</script>`;

mkdirSync(out, { recursive: true });
writeFileSync(`${out}/index.html`, `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">${page}`);
// Artifact 公開用 (公開側がひな形で包むので doctype なし)
writeFileSync(`dist/${name}.artifact.html`, `<meta name="claude:viewport-fit-sides" content="cover">${page}`);
// 開発用 (未圧縮、デバッグしやすい)
writeFileSync(`${out}/dev.html`, `<!doctype html><meta charset=utf-8><title>${title}</title>${body}<script>${js}</script>`);

rmSync(`dist/${name}.zip`, { force: true });
execFileSync('zip', ['-9', '-X', '-j', '-q', `dist/${name}.zip`, `${out}/index.html`]);
const raw = statSync(`${out}/index.html`).size, zip = statSync(`dist/${name}.zip`).size;
console.log(`${name}: source ${js.length} chars / html ${raw} B / zip ${zip} B = ${(zip / LIMIT * 100).toFixed(1)}% of ${LIMIT} B`);
if (zip > LIMIT) { console.error('OVER BUDGET'); process.exit(1); }
