// タネノシマ — 32KB縛りの収集RPG。絵・地形・生き物・音はすべてタネ(シード)から生成する。
const W = 160, H = 144, N = 72;
const cv = document.getElementById('c'), cx = cv.getContext('2d');
let S = 3, FONT = '';

// ---------- 乱数 ----------
const hash = (...a) => { let h = 2166136261; for (const x of a) { h = Math.imul(h ^ x, 0x85EBCA6B); h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35); h ^= h >>> 16; } return h >>> 0; };
const rng = s => () => (s = hash(s, 1)) / 4294967296;
const rnd = () => Math.random();
const ri = (n, r = rnd) => r() * n | 0;
const pick = (a, r = rnd) => a[ri(a.length, r)];
const elem = id => hash(id, 1) % 5;
const findId = (seed, e, ...k) => { for (let j = 0; ; j++) { const id = hash(seed, ...k, j) & 65535; if (elem(id) == e) return id; } };

// ---------- 色とタイル ----------
const PAL = '10141f f0ead2 2b5fa8 4f8fd8 e6d38a c9b164 6fbf5a 4a9a45 2f6b3a 8a8f98 5b6170 c98b4a 8a5a2e e0563f f2c14e 9a6fd0'.split(' ').map(c => '#' + c);
const mk = (p, d, n = 8) => {
  const c = document.createElement('canvas'), x = c.getContext('2d');
  c.width = c.height = n;
  [...d].forEach((ch, i) => { if (ch != '.') { x.fillStyle = PAL[parseInt(p[ch], 16)]; x.fillRect(i % n, i / n | 0, 1, 1); } });
  return c;
};
const SEA = '0000000000110000010010000000000000000000000001100000100100000000';
const GATE = '1111111101111110001001000111111000100100001221000012210000122100';
// 0海 1砂 2草 3草むら 4木 5山 6道 7橋 8泉 9ほこら 10結晶 11浅瀬 12荒れ地 13鎮まったほこら
const TL = [
  ['23', SEA],
  ['45', '0000000000100000000000000000001000000000010000000000010000000000'],
  ['67', '0000000000000100000010100000000000000000010000001010000000000000'],
  ['678', '0100010012101210121012100000000000100010012101210121012100000000'],
  ['687c', '0011110001222210122122211222212112122221012222100013310000033000'],
  ['6a91', '0000100000013100001232100122332101222221122222221222222211111111'],
  ['bc', '0000000000010000000000000000000001000000000001000000000000000000'],
  ['cb', '0000000001111110011111100000000000000000011111100111111000000000'],
  ['6931', '0011110001222210122322211232222112222321122232210122221000111100'],
  ['6de0', GATE],
  ['6f10', '0001100000122100012211101221111111111111011111100011110000011000'],
  ['317', '0000000000020000000200200110002000000000020000000200011000000000'],
  ['9ad', '0000000000100000011100200000000000000000000201000000111000000000'],
  ['69a0', GATE],
].map(t => mk(...t));
const SEA2 = mk('23', SEA.replace(/(....)(....)/g, '$2$1'));
const MC = [2, 4, 6, 7, 8, 9, 11, 12, 3, 13, 15, 3, 10, 9];
const BODY = '..1111...133331.13333331.212212..222222..133331.13333331';
const PL = [mk('004d', BODY + '.11..11.'), mk('004d', BODY + '..1111..')];
const walk = t => t != 0 && t != 4 && t != 5;
const ENC = { 3: [0, 2], 11: [4], 12: [1, 3] };

// ---------- 五行 ----------
const EN = '木火土金水', EK = ['き', 'ひ', 'つち', 'かね', 'みず'];
const EC = ['#4a9a45', '#e0563f', '#b9772f', '#7b8394', '#3f7fd0'];
const eff = (a, d) => a < 0 ? 1 : (a + 2) % 5 == d ? 2 : (d + 2) % 5 == a ? .5 : 1;
// わざの型: [なまえ, いりょく, めいちゅう]  5=ぼうぎょ↑ 6=こうげき↓ 7=かいふく 8=どく 9=せんせい
const F = [['たいあたり', 30, 100], ['つぶて', 40, 100], ['きば', 60, 95], ['はどう', 80, 90], ['あらし', 110, 75],
  ['かたくなる', 0, 100], ['おたけび', 0, 100], ['いやし', 0, 100], ['どくばり', 20, 90], ['さきがけ', 30, 100]];

// ---------- 生き物の生成 ----------
const KANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワガギグゲゴザジズゼゾダデドバビブベボパピプペポ';
function gen(id, big) {
  const r = rng(hash(id, 9)), k = big ? 1 : .7, n = 16, e = elem(id), g = [];
  const body = [0, 10, (3 + r() * 3.5) * k, (2.5 + r() * 2.5) * k];
  const head = [0, body[1] - body[3] - r() * 1.5 * k, (2.2 + r() * 2.8) * k, (2 + r() * 2) * k];
  const parts = [body, head];
  const a = r(), b = r(), c = r(), d = r(), f = r(), h = r(), l = r(), m = r(), o = r();
  if (a < .75) parts.push([body[2] * (.7 + b * .5), body[1] + (c - .6) * 3 * k, (1 + d * 2) * k, (.8 + f * 2) * k]); // うで・はね
  if (h < .7) parts.push([head[2] * (.45 + l * .5), head[1] - head[3] * .9, (.7 + m) * k, (1 + o * 2.5) * k]);       // みみ・つの
  const p = r(), q = r(), fw = r(), fh = r(), crown = r();
  if (p < .75) parts.push([body[2] * (.35 + q * .4), body[1] + body[3], (1 + fw) * k, (.8 + fh) * k]); // あし
  if (big && crown < .6) parts.push([0, head[1] - head[3], .8, 2.5]);                                   // かんむり
  let lo = 0;
  for (let y = 0; y < n; y++) {
    g[y] = [];
    for (let x = 0; x < 8; x++) {
      g[y][x] = parts.some(p => ((x + .5 - p[0]) / p[2]) ** 2 + ((y + .5 - p[1]) / p[3]) ** 2 < 1) ? 1 : 0;
      if (g[y][x]) lo = y;
    }
  }
  for (let s = 14 - lo; s-- > 0;) { g.pop(); g.unshift([0, 0, 0, 0, 0, 0, 0, 0]); }
  const sh = 14 - lo > 0 ? 14 - lo : 0, at = (x, y) => (g[y] || [])[x < 0 ? -x - 1 : x] || 0;
  const pat = ri(4, r), hue = [115, 12, 38, 255, 205][e] + (r() - .5) * 34, sat = [50, 72, 52, 12, 62][e];
  const col = [0, `hsl(${hue},${sat}%,70%)`, `hsl(${hue},${sat}%,53%)`, `hsl(${hue},${sat}%,36%)`,
    `hsl(${hue + (r() < .5 ? 45 : -45)},${sat + 15}%,84%)`, PAL[0], '#fff', PAL[0]];
  const by = body[1] + sh, hy = Math.min(13, Math.max(1, Math.round(head[1] + sh)));
  const ex = Math.max(0, Math.min(1 + ri(2, r), (head[2] | 0) - 1)), et = ri(3, r);
  const cvs = document.createElement('canvas'), X = cvs.getContext('2d');
  cvs.width = cvs.height = n;
  for (let y = 0; y < n; y++) for (let x = -8; x < 8; x++) {
    const ax = x < 0 ? -x - 1 : x;
    let v = 0;
    if (at(x, y)) {
      v = !at(x, y - 1) ? 1 : !at(x, y + 1) || !at(ax + 1, y) ? 3 : 2;
      if (pat == 1 && ax < body[2] * .55 && Math.abs(y - by) < body[3] * .6) v = 4;
      if (pat == 2 && (y + ax) % 4 == 0 && v == 2) v = 4;
      if (pat == 3 && hash(id, ax, y) % 5 == 0 && v == 2) v = 4;
      if (y == hy && ax == ex) v = 7;
      if (et == 1 && y == hy && ax == ex + 1 && at(ax, y)) v = 6;
      if (et == 2 && y == hy - 1 && ax == ex) v = 6;
    } else if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) v = 5;
    if (v) { X.fillStyle = col[v]; X.fillRect(x + 8, y, 1, 1); }
  }
  return cvs;
}
const SP = {};
function sp(id) {
  if (SP[id]) return SP[id];
  const r = rng(hash(id, 3)), e = elem(id);
  let n = '', b = [0, 0, 0, 0].map(_ => 30 + ri(40, r));
  const t = b[0] + b[1] + b[2] + b[3];
  b = b.map(v => v * 200 / t | 0);
  for (let i = 2 + ri(2, r); i--;) n += pick(KANA, r);
  n += pick(['ン', 'ー', 'ラ', 'ス', 'ル', '', '', ''], r);
  const o = (e + 1 + ri(4, r)) % 5, u = [5, 6, 7, 8, 9].sort(() => r() - .5);
  return SP[id] = {
    n, n2: n + pick(['オウ', 'ドン', 'ヌシ', 'ガ'], r), e, b, ev: 12 + ri(8, r),
    mv: [[0, -1, 1], [1, e, 1], [u[0], -1, 5], [2, e, 9], [1 + ri(2, r), o, 13], [3, e, 18], [u[1], -1, 23], [4, e, 29]],
    im: [gen(id, 0), gen(id, 1)],
  };
}
// 個体: i=種 l=レベル x=けいけんち h=HP g=成長後 k=ヌシ / せんとう中: a,d=能力段階 ps=どく hc=いやし残り v=表示HP
const stat = (c, k) => { const b = sp(c.i).b[k] * (c.g ? 1.25 : 1); return k ? (b * c.l / 50 | 0) + 5 : ((b * c.l / 25 | 0) + c.l + 10) * (c.k ? 1.5 : 1) | 0; };
const mkc = (i, l, k) => { const c = { i, l, x: 0, g: k || l >= sp(i).ev ? 1 : 0, k }; c.h = stat(c, 0); return c; };
const cn = c => sp(c.i)[c.g ? 'n2' : 'n'];
const moves = c => sp(c.i).mv.filter(m => m[2] <= c.l).slice(-4);
const mn = m => (m[1] < 0 ? '' : EK[m[1]] + 'の') + F[m[0]][0];
const need = l => l * l * 1.1 + 8 | 0;
const sm = s => s > 0 ? (2 + s) / 2 : 2 / (2 - s);

// ---------- 島の生成 ----------
let map, world, ex, G;
function genWorld(seed) {
  const r = rng(hash(seed, 4));
  const nz = (x, y, s) => {
    const X = Math.floor(x), Y = Math.floor(y), f = t => t * t * (3 - 2 * t), u = f(x - X), v = f(y - Y), h = (a, b) => hash(seed, s, a, b) / 4294967296;
    return (h(X, Y) * (1 - u) + h(X + 1, Y) * u) * (1 - v) + (h(X, Y + 1) * (1 - u) + h(X + 1, Y + 1) * u) * v;
  };
  const fbm = (x, y, s) => nz(x, y, s) * .6 + nz(x * 2, y * 2, s + 1) * .3 + nz(x * 4, y * 4, s + 2) * .1;
  map = new Uint8Array(N * N);
  const land = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x / N - .5, y / N - .5) * 2, h = fbm(x / 12, y / 12, 10) + .28 - d * d * .8, m = fbm(x / 9, y / 9, 20), e = nz(x / 3.3, y / 3.3, 30);
    const t = h < .34 ? 0 : h < .38 ? (e > .45 ? 11 : 0) : h < .42 ? 1 : h > .84 ? 5 : h > .7 ? (e > .42 ? 12 : m > .56 ? 5 : 2) : m > .62 ? 4 : e > .5 ? 3 : 2;
    map[x + y * N] = t;
    if (t > 0 && t < 4 && x > 2 && y > 2 && x < N - 3 && y < N - 3) land.push([x, y]);
  }
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const best = f => land.reduce((a, b) => f(a) < f(b) ? a : b);
  const start = best(p => dist(p, [N / 2, N * .8]));
  const fin = best(p => -dist(p, start)), D = dist(fin, start), poi = [start, fin], sh = [];
  for (let i = 0; i < 4; i++) {
    const p = best(p => Math.abs(dist(p, start) - D * (i + 1) / 5.2) + r() * 5 + (p[0] < start[0] ^ i & 1 ? 0 : 7) + (poi.some(q => dist(p, q) < 12) ? 99 : 0));
    sh.push(p); poi.push(p);
  }
  const set = (p, t) => map[p[0] + p[1] * N] = t;
  set(start, 8); set(fin, 10); sh.forEach(p => set(p, 9));
  const chain = [start, ...sh, fin];
  for (let i = 0; i < 5; i++) {
    let [x, y] = chain[i];
    const b = chain[i + 1], path = [];
    while (x != b[0] || y != b[1]) {
      const dx = b[0] - x, dy = b[1] - y;
      if (dx && (!dy || r() < Math.abs(dx) / (Math.abs(dx) + Math.abs(dy)))) x += Math.sign(dx); else y += Math.sign(dy);
      const j = x + y * N, t = map[j];
      map[j] = t == 0 ? 7 : t == 4 || t == 5 ? 6 : t < 4 && r() < .3 ? 6 : t;
      path.push(j);
    }
    const s = path[path.length - 3];
    if (s && map[s] < 8) map[s] = 8;
  }
  // この島に住む種をかぞえる
  const all = new Set([0, 1, 4].map((e, k) => findId(seed, e, 500, k)));
  for (let i = 0; i < N * N; i++) if (ENC[map[i]]) {
    const rg = (i % N / 24 | 0) + (i / N / 24 | 0) * 3;
    for (let k = 0; k < 3; k++) all.add(wid(seed, rg, map[i], k));
    all.add(hash(seed, rg, 7) & 65535);
  }
  world = { start, fin, sh, tot: all.size, D };
}
const wid = (seed, rg, t, k) => findId(seed, ENC[t][hash(seed, rg, t, k) % ENC[t].length], rg, t, k);
const tile = (x, y) => x < 0 || y < 0 || x >= N || y >= N ? 0 : map[x + y * N];
const lvAt = (x, y) => Math.min(36, 2 + Math.hypot(x - world.start[0], y - world.start[1]) * .6 | 0);
function reveal() { for (let y = -5; y < 6; y++) for (let x = -5; x < 6; x++) { const a = G.x + x, b = G.y + y; if (a >= 0 && b >= 0 && a < N && b < N) ex[a + b * N] = 1; } }

// ---------- 音 ----------
let AC, mute = 0, song = -1, step = 0, nextT = 0;
function tone(f, d, v = .04, ty = 'square', t = 0, f2) {
  if (!AC || mute) return;
  t = t || AC.currentTime;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = ty; o.frequency.setValueAtTime(f, t);
  f2 && o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d);
}
function seq() {
  if (!AC || song < 0) return;
  if (nextT < AC.currentTime) nextT = AC.currentTime + .05;
  const sd = G ? G.s : 7, sc = song ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9], dt = song ? .13 : .21, base = 220 * 2 ** ((hash(sd, song) % 6) / 12);
  while (nextT < AC.currentTime + .2) {
    const bar = [0, 1, 0, 2][step >> 4 & 3], pos = step & 15, h = hash(sd, song, bar, pos);
    if (h % 100 < (pos & 1 ? 45 : 85)) tone(base * 2 * 2 ** ((sc[(h >>> 8) % 5] + (h >> 12 & 1) * 12) / 12), dt * 1.8, .025, 'square', nextT);
    if (pos % 4 == 0) tone(base / 2 * 2 ** ([0, 7, 0, sc[2]][pos >> 2] / 12), dt * 3.5, .05, 'triangle', nextT);
    nextT += dt; step++;
  }
}
function ainit() { if (!AC) try { AC = new AudioContext(); setInterval(seq, 60); } catch (e) { } AC && AC.resume(); }
const music = n => { song = n; step = 0; nextT = 0; };
const blip = () => tone(880, .04), ok = () => tone(1320, .07), bad = () => tone(160, .2, .06, 'sawtooth', 0, 60);
const jingle = () => [0, 4, 7, 12].forEach((s, i) => tone(523 * 2 ** (s / 12), .18, .05, 'square', AC && AC.currentTime + i * .09));

// ---------- 入力と時間 ----------
const held = {}, timers = [];
let fr = 0, keyRes = 0, tap = 0;
function press(k, on) {
  if (!k) return;
  if (on && !held[k]) { ainit(); if (keyRes) { const f = keyRes; keyRes = 0; f(k); } else tap = k; }
  held[k] = on;
}
const KM = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R', w: 'U', s: 'D', a: 'L', d: 'R', z: 'A', Enter: 'A', ' ': 'A', x: 'B', Escape: 'B' };
onkeydown = e => { const k = KM[e.key]; if (k) { e.preventDefault(); press(k, 1); } };
onkeyup = e => press(KM[e.key], 0);
document.querySelectorAll('[data-k]').forEach(b => {
  const k = b.dataset.k;
  b.onpointerdown = e => { e.preventDefault(); press(k, 1); };
  b.onpointerup = b.onpointercancel = b.onpointerleave = () => press(k, 0);
});
const key = () => new Promise(r => keyRes = r);
const wait = n => new Promise(r => timers.push([fr + n, r]));
const keyA = async () => { for (; ;) { const k = await key(); if (k == 'A' || k == 'B') return ok(); } };
const pause = n => new Promise(r => { const t = [fr + n, () => { keyRes = 0; r(); }]; timers.push(t); keyRes = () => t[0] = 0; });

// ---------- 描画 ----------
const R = (x, y, w, h, c) => { cx.fillStyle = c; cx.fillRect(Math.round(x * S), Math.round(y * S), Math.round(w * S), Math.round(h * S)); };
const T = (s, x, y, c = PAL[1], al = 'left') => { cx.fillStyle = c; cx.textAlign = al; cx.fillText(s, x * S, y * S); };
const I = (im, x, y, k = 1) => cx.drawImage(im, Math.round(x * S), Math.round(y * S), im.width * k * S, im.height * k * S);
const box = (x, y, w, h) => { R(x, y, w, h, PAL[1]); R(x + 1, y + 1, w - 2, h - 2, PAL[0]); };
const bar = (c, x, y, v = c.h, edge = PAL[1]) => { const q = v / stat(c, 0); R(x, y, 66, 5, edge); R(x + 1, y + 1, 64, 3, PAL[0]); R(x + 1, y + 1, 64 * q, 3, PAL[q > .5 ? 6 : q > .2 ? 14 : 13]); };
const card = (c, x, y, k = 1) => { R(x, y, 16 * k, 16 * k, PAL[1]); I(sp(c.i).im[c.g], x, y, k); };
const mline = (m, x, y) => { T(m[1] < 0 ? '無' : EN[m[1]], x, y, m[1] < 0 ? PAL[9] : EC[m[1]]); T(mn(m), x + 11, y); F[m[0]][1] && T(F[m[0]][1], x + 128, y, PAL[9], 'right'); };
const ui = [];
let mode = 0, scene = 0, fade = 0, MSG = '', more = 0, mv = 0, busy = 0, B = 0, cool = 0;
function drawMsg() { box(0, 95, W, 49); MSG.split('\n').forEach((l, i) => T(l, 6, 101 + i * 11)); more && fr & 16 && R(148, 136, 4, 3, PAL[14]); }
async function say(s, auto) { MSG = s; more = !auto; ui.push(drawMsg); if (auto) await pause(auto); else { await wait(6); await keyA(); } ui.pop(); }
async function choose(items, x, y, w, cancel, i = 0) {
  const n = items.length;
  ui.push(() => {
    box(x, y, w, n * 11 + 5);
    items.forEach((s, k) => s.call ? s(x + 11, y + 4 + k * 11) : T(s, x + 11, y + 4 + k * 11));
    R(x + 4, y + 6 + i * 11, 4, 4, PAL[14]);
  });
  for (; ;) {
    const k = await key();
    if (k == 'U') i = (i + n - 1) % n;
    if (k == 'D') i = (i + 1) % n;
    blip();
    if (k == 'A') break;
    if (k == 'B' && cancel) { i = -1; break; }
  }
  ui.pop();
  return i;
}
const yes = async s => { ui.push(drawMsg); MSG = s; more = 0; const k = await choose(['はい', 'いいえ'], 112, 66, 48, 1); ui.pop(); return !k; };

function drawWorld() {
  const px = mv ? mv.fx + (mv.x - mv.fx) * mv.t : G.x, py = mv ? mv.fy + (mv.y - mv.fy) * mv.t : G.y;
  const ox = px * 16 - 72, oy = py * 16 - 64, x0 = Math.floor(ox / 16), y0 = Math.floor(oy / 16);
  for (let y = y0; y < y0 + 10; y++) for (let x = x0; x < x0 + 11; x++) {
    const t = tile(x, y);
    I(t ? TL[t] : fr & 32 ? SEA2 : TL[0], x * 16 - ox, y * 16 - oy, 2);
  }
  I(PL[mv ? fr >> 3 & 1 : 0], 72, 62, 2);
}
function info(c, x, y, num) {
  const s = sp(c.i);
  T(cn(c), x, y, PAL[0]); T(EN[s.e], x, y + 10, EC[s.e]); T('Lv' + c.l, x + 12, y + 10, PAL[0]);
  c.ps && T('どく', x + 44, y + 10, PAL[15]);
  bar(c, x, y + 21, c.v, PAL[0]);
  num && T(Math.ceil(c.v) + '/' + stat(c, 0), x + 66, y + 27, PAL[0], 'right');
}
function drawBattle() {
  const { foe, me } = B;
  R(0, 0, W, 95, PAL[1]); R(98, 51, 60, 5, PAL[4]); R(4, 87, 60, 5, PAL[4]);
  const dr = (c, x, y) => { if (c.h <= 0 && c.v < 1 || B.hit == c && fr & 2 || B.gone == c) return; I(sp(c.i).im[c.g], x + (B.at == c ? c == me ? 8 : -8 : 0), y, 3); };
  dr(foe, 104, 5); dr(me, 10, 41);
  info(foe, 4, 5); info(me, 86, 58, 1);
  T('どうする?', 6, 101);
}
function draw() {
  R(0, 0, W, H, PAL[0]);
  if (mode == 1) drawWorld(); else if (mode == 2) drawBattle(); else scene && scene();
  for (const f of ui) f();
  fade && R(0, 0, W, H, `rgba(240,234,210,${fade})`);
}

// ---------- せんとう ----------
const reset = c => { c.a = c.d = c.ps = 0; c.hc = 2; c.v = c.h; };
const heal = () => G.p.forEach(c => c.h = stat(c, 0));
function ai(a, d) {
  const ms = moves(a), w = ms.map(m => {
    const f = m[0];
    return f == 5 ? (a.d < 2 ? 25 : 0) : f == 6 ? (d.a > -2 ? 25 : 0) : f == 7 ? (a.hc && a.h < stat(a, 0) / 2 ? 80 : 0) : F[f][1] * eff(m[1], sp(d.i).e) * (m[1] == sp(a.i).e ? 1.3 : 1);
  });
  let t = rnd() * w.reduce((x, y) => x + y);
  return ms.find((m, i) => (t -= w[i]) < 0) || ms[0];
}
async function useMove(a, d, m) {
  const f = m[0], e = m[1], [, pw, acc] = F[f];
  await say(`${cn(a)}の\n${mn(m)}!`, 34);
  if (f == 5) return a.d < 3 ? (a.d++, say(`${cn(a)}の ぼうぎょが\nあがった`, 45)) : say('これいじょう あがらない', 45);
  if (f == 6) return d.a > -3 ? (d.a--, say(`${cn(d)}の こうげきが\nさがった`, 45)) : say('これいじょう さがらない', 45);
  if (f == 7) return a.hc > 0 ? (a.hc--, a.h = Math.min(stat(a, 0), a.h + stat(a, 0) * .4 | 0), ok(), say(`${cn(a)}は\nげんきを とりもどした`, 45)) : say('しかし ちからが たりない', 45);
  if (rnd() * 100 >= acc) return say('はずれた!', 40);
  const ef = eff(e, sp(d.i).e), cr = rnd() < .06;
  const dm = Math.max(1, (pw * (a.l * .4 + 2) * stat(a, 1) * sm(a.a) / (stat(d, 2) * sm(d.d)) / 25 + 1) * ef * (e == sp(a.i).e ? 1.3 : 1) * (cr ? 1.5 : 1) * (.85 + rnd() * .15) | 0);
  B.at = a; await wait(6); B.at = 0; B.hit = d; bad(); await wait(16); B.hit = 0;
  d.h = Math.max(0, d.h - dm);
  await wait(14);
  if (cr) await say('するどい いちげき!', 40);
  if (ef > 1) await say('よく きいた!', 40);
  if (ef < 1) await say('あまり きかない…', 40);
  if (f == 8 && d.h > 0 && !d.ps) { d.ps = 1; await say(`${cn(d)}は\nどくを うけた`, 45); }
}
async function gainXp(c, g) {
  const s = sp(c.i);
  c.x += g;
  while (c.x >= need(c.l) && c.l < 50) {
    c.x -= need(c.l);
    let mh = stat(c, 0);
    c.l++; c.h += stat(c, 0) - mh; c.v = c.h;
    jingle();
    await say(`${cn(c)}は\nレベル${c.l}に なった!`, 60);
    const m = s.mv.find(m => m[2] == c.l);
    if (m) await say(`${mn(m)}を おぼえた!`, 60);
    if (!c.g && c.l >= s.ev) {
      await say(`おや…? ${cn(c)}の\nすがたが かわっていく…!`, 90);
      mh = stat(c, 0); c.g = 1; c.h += stat(c, 0) - mh; c.v = c.h;
      fade = 1; jingle(); await wait(10); fade = 0;
      await say(`${cn(c)}に そだった!`);
    }
  }
}
async function pickParty(i = 0, canCancel = 1) {
  const n = G.p.length;
  ui.push(() => {
    box(0, 0, W, 95);
    G.p.forEach((c, k) => {
      const y = 5 + k * 22, e = sp(c.i).e;
      card(c, 12, y);
      T(cn(c), 32, y, PAL[c.h > 0 ? 1 : 9]); T(EN[e], 32, y + 10, EC[e]); T('Lv' + c.l, 44, y + 10);
      T(c.h + '/' + stat(c, 0), 152, y, PAL[1], 'right'); bar(c, 86, y + 12);
    });
    R(4, 11 + i * 22, 4, 4, PAL[14]);
  });
  for (; ;) {
    const k = await key();
    if (k == 'U') i = (i + n - 1) % n;
    if (k == 'D') i = (i + 1) % n;
    blip();
    if (k == 'A') break;
    if (k == 'B' && canCancel) { i = -1; break; }
  }
  ui.pop();
  return i;
}
async function flash() { for (let i = 0; i < 6; i++) { fade = i & 1 ? 0 : .9; await wait(4); } fade = 1; await wait(8); fade = 0; }
// もどり値: 1かち 2にげた 3ふうじた 4まけ
async function battle(foe, boss) {
  const alive = () => G.p.find(c => c.h > 0);
  let me = alive(), res = 0;
  music(-1); bad(); await flash();
  reset(foe); G.p.forEach(reset);
  B = { foe, me }; mode = 2; music(1);
  G.dx[foe.i] |= 1;
  await say(boss ? `ヌシの ${cn(foe)}が\nたちはだかる!` : `やせいの ${cn(foe)}が\nあらわれた!`, 80);
  while (!res) {
    const c = await choose(['たたかう', 'いれかえ', 'ふだ ×' + G.f, 'にげる'], 88, 95, 72);
    let act = 0;
    if (c == 0) {
      const ms = moves(me), k = await choose(ms.map(m => (x, y) => mline(m, x, y)), 0, 95, W, 1);
      if (k < 0) continue;
      act = ms[k];
    } else if (c == 1) {
      const k = await pickParty(G.p.indexOf(me));
      if (k < 0 || G.p[k] == me) continue;
      if (G.p[k].h <= 0) { await say('たおれていて うごけない', 45); continue; }
      me = B.me = G.p[k];
      await say(`${cn(me)}に こうたい!`, 45);
    } else if (c == 2) {
      if (boss) { await say('ヌシには ふだが きかない!', 50); continue; }
      if (!G.f) { await say('ふだが ない!', 45); continue; }
      G.f--;
      await say('ふだを なげた!', 40);
      B.gone = foe; blip(); await wait(30);
      if (rnd() < Math.max(.08, (1 - .75 * foe.h / stat(foe, 0)) * (.95 - foe.l * .01) + (foe.ps ? .1 : 0))) { res = 3; break; }
      B.gone = 0;
      await say('ふだが やぶれた!', 45);
    } else {
      if (boss) { await say('ヌシからは にげられない!', 50); continue; }
      if (rnd() < (stat(me, 3) >= stat(foe, 3) ? 1 : .6)) { await say('うまく にげきった!', 45); res = 2; break; }
      await say('にげられなかった!', 45);
    }
    const fm = ai(foe, me), pr = m => m[0] == 9 ? 1 : 0, sa = stat(me, 3), sb = stat(foe, 3);
    const first = act && (pr(act) > pr(fm) || pr(act) == pr(fm) && (sa > sb || sa == sb && rnd() < .5));
    for (const [a, d, m] of first ? [[me, foe, act], [foe, me, fm]] : [[foe, me, fm], [me, foe, act]]) if (m && a.h > 0 && d.h > 0) await useMove(a, d, m);
    for (const c of [me, foe]) if (c.h > 0 && c.ps) { c.h = Math.max(0, c.h - Math.max(1, stat(c, 0) / 10 | 0)); await say(`${cn(c)}は\nどくで くるしんでいる`, 45); }
    if (foe.h <= 0) { await say(`${cn(foe)}は たおれた!`, 55); res = 1; }
    else if (me.h <= 0) {
      await say(`${cn(me)}は たおれた…`, 60);
      if (!alive()) res = 4;
      else { let k; do k = await pickParty(0, 0); while (G.p[k].h <= 0); me = B.me = G.p[k]; }
    }
  }
  music(-1);
  if (res == 1) {
    const g = foe.l * 6 * (boss ? 3 : 1) + 4;
    await say(`${cn(me)}は\nけいけんち ${g}を えた`, 50);
    for (const c of G.p) if (c.h > 0) await gainXp(c, c == me ? g : g >> 1);
    if (!boss && rnd() < .3) { G.f++; await say('ふだを 1まい ひろった', 45); }
  }
  if (res == 3) {
    jingle();
    await say(`${cn(foe)}を ふうじた!\nなかまに なった!`);
    G.dx[foe.i] |= 2;
    if (G.p.length < 4) G.p.push(foe);
    else {
      await say('なかまが いっぱいだ。\nだれと わかれる?');
      const k = await choose([...G.p.map(cn), cn(foe) + ' (しんいり)'], 30, 20, 124);
      if (k < 4) G.p[k] = foe;
    }
  }
  if (res == 4) {
    await say('なかまは みな たおれた…\nいずみへ もどされた');
    G.x = G.rx; G.y = G.ry; heal();
  }
  G.p.forEach(reset);
  fade = 1; mode = 1; B = 0; cool = 4; reveal(); save();
  await wait(6); fade = 0; music(0);
  return res;
}

// ---------- 島でのできごと ----------
async function shrine(i) {
  if (G.sl[i]) return say('ほこらは しずまっている');
  if (!await yes('ほこらの おくから\nつよい けはいが する。\nいどむ?')) return;
  const p = world.sh[i];
  if (await battle(mkc(findId(G.s, (i + G.s) % 5, 900, i), lvAt(p[0], p[1]) + 3, 1), 1) == 1) {
    G.sl[i] = 1; map[p[0] + p[1] * N] = 13; G.f += 5; heal(); save(); jingle();
    await say('ほこらが しずまった!\nふだを 5まい てにいれた');
    if (G.sl.every(v => v)) await say('いただきの けっしょうが\nひかりはじめた…');
  }
}
async function summit() {
  const n = G.sl.filter(v => !v).length;
  if (n) return say(`けっしょうは ねむっている。\nほこらを あと${n}つ\nしずめよう`);
  if (!await yes('けっしょうが つよく\nひかっている。\nふれる?')) return;
  if (await battle(mkc(findId(G.s, (G.s + 4) % 5, 999), lvAt(G.x, G.y) + 6, 1), 1) == 1) { G.won = 1; save(); await ending(); }
}
async function ending() {
  const d = Object.values(G.dx);
  mode = 0; music(0);
  scene = () => {
    R(0, 0, W, H, PAL[1]);
    T('しまは しずまった', 80, 10, PAL[0], 'center');
    G.p.forEach((c, k) => I(sp(c.i).im[c.g], 80 - G.p.length * 18 + k * 36, 26, 2));
    [`タネ ${G.s}`, `あるいた ${G.st}ほ`, `じかん ${G.t / 3600 | 0}ふん`, `みつけた ${d.length}しゅ`, `なかまにした ${d.filter(v => v & 2).length}/${world.tot}しゅ`]
      .forEach((s, k) => T(s, 80, 66 + k * 11, PAL[0], 'center'));
    T('べつの タネの しまも あそんでね', 80, 128, PAL[12], 'center');
  };
  jingle(); await wait(40); await keyA();
  mode = 1;
}
async function arrive() {
  G.st++; reveal();
  const t = tile(G.x, G.y);
  if (cool) cool--;
  if (t == 8) {
    G.rx = G.x; G.ry = G.y;
    if (G.p.some(c => c.h < stat(c, 0))) { heal(); jingle(); await say('いずみの みずで\nみんな げんきに なった!'); }
    save();
  } else if (t == 9) await shrine(world.sh.findIndex(p => p[0] == G.x && p[1] == G.y));
  else if (t == 13) await say('ほこらは しずまっている');
  else if (t == 10) await summit();
  else if (ENC[t] && !cool && rnd() < .14) {
    const rg = (G.x / 24 | 0) + (G.y / 24 | 0) * 3, rare = rnd() < .04;
    await battle(mkc(rare ? hash(G.s, rg, 7) & 65535 : wid(G.s, rg, t, ri(3)), Math.max(2, lvAt(G.x, G.y) + ri(3) - 1 + rare * 2)));
  } else if (G.st % 16 == 0) save();
}

// ---------- メニュー ----------
async function statScreen(c) {
  const s = sp(c.i);
  ui.push(() => {
    box(0, 0, W, H); card(c, 6, 6, 3);
    T(cn(c), 60, 6); T(EN[s.e], 60, 17, EC[s.e]); T('Lv' + c.l, 72, 17);
    T(`HP ${c.h}/${stat(c, 0)}`, 60, 28); T(`つぎまで ${need(c.l) - c.x}`, 60, 39, PAL[9]);
    ['こうげき', 'ぼうぎょ', 'すばやさ'].forEach((n, k) => { T(n, 6, 60 + k * 11); T(stat(c, k + 1), 70, 60 + k * 11, PAL[14], 'right'); });
    moves(c).forEach((m, k) => mline(m, 6, 97 + k * 11));
  });
  await keyA(); ui.pop();
}
async function mapScreen() {
  ui.push(() => {
    R(0, 0, W, H, PAL[0]);
    for (let i = 0; i < N * N; i++) if (ex[i]) R(8 + i % N * 2, (i / N | 0) * 2, 2, 2, PAL[MC[map[i]]]);
    const mark = (p, c) => { R(6 + p[0] * 2, p[1] * 2 - 2, 6, 6, PAL[0]); R(7 + p[0] * 2, p[1] * 2 - 1, 4, 4, c); };
    world.sh.forEach((p, k) => mark(p, G.sl[k] ? PAL[9] : PAL[13]));
    mark(world.fin, PAL[15]);
    fr & 16 && mark([G.x, G.y], PAL[1]);
  });
  await keyA(); ui.pop();
}
async function dex() {
  const ids = Object.keys(G.dx);
  let i = 0;
  ui.push(() => {
    box(0, 0, W, H);
    T(`ずかん ${ids.filter(k => G.dx[k] & 2).length}/${world.tot}`, 6, 5);
    const top = Math.max(0, (i >> 3) - 4) * 8;
    ids.slice(top, top + 40).forEach((id, k) => {
      const x = 9 + k % 8 * 18, y = 18 + (k >> 3) * 18;
      G.dx[id] & 2 ? card({ i: +id, g: 0 }, x, y) : T('?', x + 5, y + 4, PAL[9]);
      k + top == i && R(x, y + 17, 16, 1, PAL[14]);
    });
    const s = sp(+ids[i]);
    T(s.n, 6, 114); T(EN[s.e], 6, 125, EC[s.e]); T(G.dx[ids[i]] & 2 ? 'なかまにした' : 'みかけた', 20, 125, PAL[9]);
  });
  for (; ;) {
    const k = await key(), n = ids.length;
    i = (i + (k == 'L' ? n - 1 : k == 'R' ? 1 : k == 'U' ? n - 8 % n : k == 'D' ? 8 : 0)) % n;
    if (k == 'A' || k == 'B') break;
  }
  ui.pop();
}
async function menu() {
  const st = () => { box(0, 2, 92, 38); [`タネ ${G.s}`, `ほこら ${G.sl.filter(v => v).length}/4`, 'ふだ ×' + G.f].forEach((s, k) => T(s, 6, 6 + k * 11)); };
  ui.push(st);
  for (let k = 0; ;) {
    k = await choose(['なかま', 'ちず', 'ずかん', 'おと ' + (mute ? 'OFF' : 'ON'), 'あそびかた'], 96, 2, 64, 1, k);
    if (k < 0) break;
    if (k == 0) for (let j = 0; (j = await pickParty(j)) >= 0;) {
      const a = await choose(['せんとうに', 'つよさ', 'わかれる'], 96, 96, 64, 1);
      if (a == 0) G.p.unshift(G.p.splice(j, 1)[0]), j = 0;
      if (a == 1) await statScreen(G.p[j]);
      if (a == 2 && G.p.length > 1 && await yes(`${cn(G.p[j])}と\nほんとうに わかれる?`)) G.p.splice(j, 1), j = 0;
    }
    if (k == 1) await mapScreen();
    if (k == 2) await dex();
    if (k == 3) mute = !mute;
    if (k == 4) { await say('いきものには 5つの\nしるしが ある。\n木→土→水→火→金→木\nやじるしの さきに つよい'); await say('よわらせてから ふだを\nなげると ふうじやすい。\nいずみに ふれると\nみんな げんきに なる'); }
  }
  ui.pop(); save();
}

// ---------- セーブ ----------
const KEY = 'kb32-tanenoshima';
function save() {
  try { localStorage[KEY] = JSON.stringify({ ...G, p: G.p.map(({ i, l, x, h, g }) => ({ i, l, x, h, g })), ex: btoa(String.fromCharCode(...ex)) }); } catch (e) { }
}
function load() {
  try { const g = JSON.parse(localStorage[KEY]); return g.p.length && g; } catch (e) { }
}
function enter(g) {
  G = g; genWorld(G.s);
  ex = g.ex ? Uint8Array.from(atob(g.ex), c => c.charCodeAt(0)) : new Uint8Array(N * N);
  delete G.ex;
  world.sh.forEach((p, k) => G.sl[k] && (map[p[0] + p[1] * N] = 13));
}

// ---------- タイトルとはじまり ----------
async function title() {
  mode = 0;
  scene = () => {
    R(0, 58, W, 40, PAL[1]);
    cx.font = 20 * S + 'px monospace'; T('タネノシマ', 80, 20, PAL[14], 'center'); cx.font = FONT;
    T('タネから うまれる しま', 80, 44, PAL[1], 'center');
    for (let i = 0; i < 4; i++) I(sp(hash(fr / 100 | 0, i) & 65535).im[0], 6 + i * 39, 62, 2);
  };
  const sv = load(), k = await choose(sv ? ['つづきから', 'はじめから'] : ['はじめから'], 44, 104, 72);
  if (sv && !k) { enter(sv); mode = 1; music(0); return; }
  let seed = ri(1e5);
  if (await choose(['おまかせの しま', 'タネを きめる'], 28, 104, 104)) {
    const d = [0, 0, 0, 0, 0].map(_ => ri(10));
    let i = 0;
    ui.push(() => { box(20, 100, 120, 40); T('しまの タネ', 80, 105, PAL[1], 'center'); d.forEach((v, k) => T(v, 48 + k * 16, 121, PAL[k == i ? 14 : 1], 'center')); });
    for (; ;) {
      const k = await key();
      if (k == 'L') i = (i + 4) % 5;
      if (k == 'R') i = (i + 1) % 5;
      if (k == 'U') d[i] = (d[i] + 1) % 10;
      if (k == 'D') d[i] = (d[i] + 9) % 10;
      if (k == 'A') break;
    }
    ui.pop();
    seed = +d.join('');
  }
  enter({ s: seed, f: 5, sl: [0, 0, 0, 0], dx: {}, st: 0, t: 0, p: [], won: 0 });
  [G.x, G.y] = world.start; G.rx = G.x; G.ry = G.y;
  const ids = [0, 1, 4].map((e, k) => findId(seed, e, 500, k));
  for (let i = 1; ;) {
    scene = () => {
      R(0, 0, W, H, PAL[1]);
      T('さいしょの なかまを えらぼう', 80, 8, PAL[0], 'center');
      ids.forEach((id, k) => {
        const s = sp(id), x = 4 + k * 52;
        k == i && R(x, 28, 48, 82, PAL[4]);
        I(s.im[0], x, 32, 3); T(s.n, x + 24, 84, PAL[0], 'center'); T(EN[s.e], x + 24, 96, EC[s.e], 'center');
      });
    };
    const k = await key();
    if (k == 'L') i = (i + 2) % 3;
    if (k == 'R') i = (i + 1) % 3;
    blip();
    if (k == 'A' && await yes(`${sp(ids[i]).n}と\nたびに でる?`)) { G.p = [mkc(ids[i], 5)]; G.dx[ids[i]] = 3; break; }
  }
  mode = 1; music(0); reveal();
  await say(`ここは タネ${seed}の しま。\n4つの ほこらの ヌシを\nしずめ、いただきの\nけっしょうを めざそう`);
  await say('くさむらに ひそむ\nいきものは ふだで ふうじて\nなかまに できる。\nXで メニュー、ちずを みよう');
  save();
}

// ---------- メインループ ----------
const run = async f => { busy = 1; try { await f(); } catch (e) { console.error(e); } busy = 0; };
function tick() {
  fr++;
  for (let i = timers.length; i--;) if (timers[i][0] <= fr) timers.splice(i, 1)[0][1]();
  if (mode == 1 && !busy) {
    G.t++;
    if (mv) { if ((mv.t += .11) >= 1) { G.x = mv.x; G.y = mv.y; mv = 0; run(arrive); } }
    else if (tap == 'B') run(menu);
    else {
      const d = held.U ? [0, -1] : held.D ? [0, 1] : held.L ? [-1, 0] : held.R ? [1, 0] : 0;
      if (d && walk(tile(G.x + d[0], G.y + d[1]))) mv = { x: G.x + d[0], y: G.y + d[1], fx: G.x, fy: G.y, t: 0 };
    }
  }
  if (mode == 2) for (const c of [B.foe, B.me]) c.v += (c.h - c.v) * .15;
  tap = 0;
}
const touch = matchMedia('(pointer:coarse)').matches;
document.getElementById('t').hidden = !touch;
function fit() {
  const dpr = devicePixelRatio || 1;
  S = Math.max(1, Math.min((innerWidth - 32) / W, (innerHeight - (touch ? 200 : 56)) / H) * dpr | 0);
  cv.width = W * S; cv.height = H * S; cv.style.width = W * S / dpr + 'px';
  cx.font = FONT = 8 * S + 'px monospace'; cx.textBaseline = 'top'; cx.imageSmoothingEnabled = false;
}
onresize = fit; fit();
let last = 0, acc = 0;
function loop(t) {
  acc += Math.min(100, t - last); last = t;
  try { while (acc >= 16.6) { tick(); acc -= 16.6; } draw(); } catch (e) { console.error(e); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
run(title);
