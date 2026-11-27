const W = 160, H = 144;
const cv = document.getElementById('c'), cx = cv.getContext('2d');
const sc = cnv(W, H), X = sc.getContext('2d');
// もじは えより こまかい 240x216 の そうに かいて かさねる (えの 2/3 の おおきさ)
const uc = cnv(240, 216), U = uc.getContext('2d');
U.imageSmoothingEnabled = false;
const rnd = () => Math.random();
const ri = n => rnd() * n | 0;

// ---------- もじ (美咲フォントの ぬきだし。ビルド時に つかう字だけ うめこむ) ----------
const [FCH, FDT] = '__FONT__'.split('\t'), fb = atob(FDT || ''), fonts = {};
function T(s, x, y, col = '1', al = 0, k = 1) {
  s = '' + s;
  x -= s.length * 4 * al * k;
  let f = fonts[col];
  if (!f) {
    f = fonts[col] = cnv(FCH.length * 8, 8);
    const g = f.getContext('2d');
    g.fillStyle = C(col);
    for (let i = 0; i < fb.length; i++) for (let b = 0; b < 7; b++) fb.charCodeAt(i) >> (6 - b) & 1 && g.fillRect((i / 7 | 0) * 8 + b, i % 7, 1, 1);
  }
  for (const ch of s) { const i = FCH.indexOf(DIG[ch] || ch); i >= 0 && U.drawImage(f, i * 8, 0, 8, 8, x, y, 8 * k, 8 * k); x += 8 * k; }
}
const R = (x, y, w, h, c) => { X.fillStyle = C(c); X.fillRect(x, y, w, h); };
const spr = (im, x, y, flip) => { x = Math.round(x); y = Math.round(y); if (flip) { X.save(); X.scale(-1, 1); X.drawImage(im, -x - im.width, y); X.restore(); } else X.drawImage(im, x, y); };
const box = (x, y, w, h) => { R(x, y, w, h, '1'); R(x + 1, y + 1, w - 2, h - 2, '0'); };
const rot = (im, n) => { const c = cnv(16, 16), x = c.getContext('2d'); x.translate(8, 8); x.rotate(n * Math.PI / 2); x.drawImage(im, -8, -8); return c; };
const SW = [rot(SWORD, 2), SWORD, rot(SWORD, 3), rot(SWORD, 1)];   // した うえ ひだり みぎ
const DX = [0, 0, -1, 1], DY = [1, -1, 0, 0];

// ---------- おと ----------
let AC, mute = 0, song = -1, step = 0, nextT = 0, hush = 0, NB;
const tracks = SONGS.map(s => s.slice(1).map((t, v) => {
  const o = [];
  for (const m of t.matchAll(/([A-Ga-g])(#?)('?)|([-.])/g)) {
    if (m[4] == '.') { for (let i = o.length; i--;) if (o[i]) { o[i][1]++; break; } o.push(0); }
    else if (m[4]) o.push(0);
    else { const u = m[1].toUpperCase(); o.push([261.6 * 2 ** (('C D EF G A B'.indexOf(u) + (m[2] ? 1 : 0) + (m[1] != u ? 12 : 0) + (m[3] ? 12 : 0)) / 12 - v), 1]); }
  }
  return o;
}));
function tone(f, d, v = .05, ty = 'square', t = 0, f2) {
  if (!AC || mute) return;
  t = t || AC.currentTime;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = ty; o.frequency.setValueAtTime(f, t);
  f2 && o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, t + d * .6); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d);
}
function noise(d, v = .08, rate = 1, t = 0) {
  if (!AC || mute) return;
  t = t || AC.currentTime;
  const s = AC.createBufferSource(), g = AC.createGain();
  s.buffer = NB; s.playbackRate.value = rate;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  s.connect(g); g.connect(AC.destination); s.start(t, rnd() * .5); s.stop(t + d);
}
function seq() {
  if (!AC || song < 0 || AC.currentTime < hush) return;
  if (nextT < AC.currentTime) nextT = AC.currentTime + .05;
  const dt = SONGS[song][0], [a, b] = tracks[song];
  while (nextT < AC.currentTime + .25) {
    const i = step % a.length, n = a[i], m = b[i];
    n && tone(n[0], n[1] * dt * .95, .035, 'square', nextT);
    m && tone(m[0], m[1] * dt * .95, .09, 'triangle', nextT);
    song != 3 && (i % 2 ? noise(.03, .02, 3, nextT) : i % 4 || noise(.06, .05, i % 8 ? 1.5 : .4, nextT));
    nextT += dt; step++;
  }
}
function ainit() {
  if (!AC) try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    NB = AC.createBuffer(1, 22050, 22050);
    const d = NB.getChannelData(0);
    for (let i = 0; i < 22050; i++) d[i] = rnd() * 2 - 1;
    setInterval(seq, 50);
  } catch (e) { }
  AC && AC.state != 'running' && AC.resume();
}
const music = n => { if (n != song) { song = n; step = 0; nextT = 0; } };
// じゅんに ならす みじかい ふし (おんがくは そのあいだ とめる)
const jingle = (ns, dt = .09, v = .06) => { if (!AC) return; hush = AC.currentTime + ns.length * dt + .3; nextT = 0; ns.forEach((s, i) => s == null || tone(523.2 * 2 ** (s / 12), dt * 1.9, v, 'square', AC.currentTime + i * dt)); };
const sfx = {
  blip: () => tone(1000, .03, .02),
  swing: () => noise(.09, .07, 2.5),
  hit: () => { tone(300, .1, .07, 'square', 0, 90); noise(.08, .06, 1); },
  hurt: () => tone(180, .25, .09, 'sawtooth', 0, 50),
  cut: () => noise(.12, .07, 1.6),
  push: () => noise(.2, .08, .25),
  fire: () => { noise(.3, .06, .8); tone(300, .25, .04, 'triangle', 0, 900); },
  die: () => { tone(500, .3, .06, 'square', 0, 60); noise(.3, .06, .6); },
  heart: () => jingle([12, 19], .07, .05),
  open: () => jingle([0, 4, 7, 12], .06),
  solve: () => jingle([7, 12, 16, 19, 24], .08),
  get: () => jingle([0, 4, 7, 12, null, 12, 16, 19, 24], .1),
  shard: () => jingle([7, 7, 7, 12, null, 16, null, 19, 16, 19, 24, 24], .13),
  dead: () => jingle([12, 11, 8, 7, 4, 3, 0], .16),
  boss: () => { tone(90, .7, .12, 'sawtooth', 0, 40); noise(.7, .1, .3); },
  stair: () => [0, 1, 2].forEach(i => noise(.08, .06, .7 - i * .15, AC && AC.currentTime + i * .1)),
  dark: () => { noise(.8, .1, .35); tone(700, .8, .03, 'sine', 0, 150); },
  ting: () => tone(1800, .06, .04, 'triangle'),
};

// ---------- 入力と時間 ----------
const held = {}, timers = [];
let fr = 0, keyRes = 0, tap = {};
function press(k, on) {
  if (!k) return;
  if (on && !held[k]) {
    ainit();
    if (k == 'N') mute = !mute;
    else if (keyRes) { const f = keyRes; keyRes = 0; f(k); }
    else tap[k] = 1;
  }
  held[k] = on;
}
const KM = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R', w: 'U', s: 'D', a: 'L', d: 'R', z: 'A', ' ': 'A', Enter: 'A', x: 'B', c: 'M', Escape: 'M', m: 'N' };
onkeydown = e => { const k = KM[e.key]; if (k) { e.preventDefault(); press(k, 1); } };
onkeyup = e => press(KM[e.key], 0);
document.querySelectorAll('[data-k]').forEach(b => {
  const k = b.dataset.k;
  b.onpointerdown = e => { e.preventDefault(); press(k, 1); };
  b.onpointerup = b.onpointercancel = b.onpointerleave = () => press(k, 0);
});
const key = () => new Promise(r => keyRes = r);
const keyA = async () => { while (await key() != 'A'); };
const isW = c => typeof c == 'string' && c >= '0' && c <= '9';
const wait = n => new Promise(r => timers.push([fr + n, r]));

// ---------- じょうたい ----------
// G: セーブされるもの。P: 主人公。cur: いまの へやの 80マス。E: てき・おとしもの。
let G, cur = [], rid = 0, th = 0, dark = 0, E = [], sw = [], shots = [], parts = [], slide = 0, seal = 0, auto = 0, tr = 0, dlg = 0, busy = 0, fade = 0, scene = 0, mapOn = 0, told = {};
const P = { x: 0, y: 0, d: 0, sw: 0, lt: 0, inv: 0, safe: 0, kb: 0, kx: 0, ky: 0, push: 0, wf: 0, get: 0, sid: 0 };
const old = cnv(W, 128), dk = cnv(W, 128), DK = dk.getContext('2d');
const gi = i => ((rid >> 2) * 8 + (i / 10 | 0)) * 40 + (rid & 3) * 10 + i % 10;
const FLR = '.,_ =j';
// もの・てきの したの じめん (ひだりどなりに あわせる)
const under = i => '.,_ ='.includes(cur[i - 1]) && i % 10 ? cur[i - 1] : th ? ' ' : '.';
// いまは いない ひと・ものの あとを うめる じめん (みずの うえも ある)
const fill = i => '.,_ =j~'.includes(cur[i - 1]) && i % 10 ? cur[i - 1] : th ? ' ' : '.';
const SOLID = 'TM~#^HwBOScCDdiIYy"*utkfplonGNVWFRJKQEPU';
const KEY = 'kb512-toudaimori';
const save = () => { try { localStorage[KEY] = JSON.stringify(G); } catch (e) { } };
const load = () => { try { const g = JSON.parse(localStorage[KEY]); g.f = g.f || {}; return g.c && g; } catch (e) { } };
const checkpoint = () => { G.c = [rid, P.x, P.y]; save(); };

function spawn(t, x, y) {
  const e = { t, x, y, vx: 0, vy: 0, n: ri(50), hp: { a: 1, A: 2, b: 1, e: 2, g: 3 }[t], inv: 0, w: 16, dx: 1, dy: 0 };
  if (t == 'Z') { e.b = BOSSR[rid]; e.hp = [8, 8, 12, 9][e.b]; e.x -= 8; e.y -= 8; e.w = 32; e.n = 0; e.s = 0; }
  E.push(e);
  return e;
}
function enter(r) {
  rid = r; th = HOUSE.includes(r) ? 4 : r < 12 || r > 31 && r < 36 ? 0 : r < 20 ? 1 : r < 28 ? 2 : 3;
  dark = DARK.includes(r);
  E = []; sw = []; shots = []; parts = []; slide = seal = auto = 0; told = {};
  const solved = G.S[r];
  for (let i = 0; i < 80; i++) {
    let ch = G.P[gi(i)] || MAP[gi(i)];
    if (SHOW[r + ch] && !SHOW[r + ch](stage())) ch = 1;      // いまは いない
    if (solved) ch = ch == 'd' ? ' ' : ch == 'i' ? 'I' : ch == '?' ? 'c' : ch;
    if (ch == 'x') sw.push(i);
    if ('aAbegZ'.includes(ch)) { ch == 'Z' && solved || spawn(ch, i % 10 * 16, (i / 10 | 0) * 16); ch = 0; }
    cur[i] = ch;
  }
  for (let i = 0; i < 80; i++) cur[i] = cur[i] === 1 ? fill(i) : cur[i] || under(i);
  G.V[r] = 1;
  music(th == 4 ? 3 : E.some(e => e.t == 'Z') ? 2 : th || r > 31 ? 1 : 0);
}

// ---------- あたりはんてい ----------
const tileAt = (px, py) => { const tx = px >> 4, ty = py >> 4; return tx < 0 || ty < 0 || tx > 9 || ty > 7 ? -1 : tx + ty * 10; };
// 主人公用: へやの そとは、はしの マスが あるけるなら とおれる (となりの へやへ)
const solid = (px, py) => { const c = cur[Math.min(9, Math.max(0, px >> 4)) + Math.min(7, Math.max(0, py >> 4)) * 10]; return SOLID.includes(c) || P.kb && isW(c); };
const free = (x, y) => !solid(x + 3, y + 8) && !solid(x + 12, y + 8) && !solid(x + 3, y + 15) && !solid(x + 12, y + 15);
// てき用: へやの そとは かべ
const efree = (e, x, y) => [[2, 4], [13, 4], [2, 15], [13, 15]].every(([a, b]) => { const i = tileAt(x + a, y + b); return i >= 0 && !SOLID.includes(cur[i]); });
const emove = (e, dx, dy) => efree(e, e.x + dx, e.y + dy) ? (e.x += dx, e.y += dy, 1) : 0;
function tryMove(dx, dy) {
  if (free(P.x + dx, P.y + dy)) { P.x += dx; P.y += dy; return 1; }
  // かどで ひっかからないよう すこし よける
  for (let k = 1; k < 7; k++) for (const s of [-k, k]) {
    if (dx && free(P.x + dx, P.y + s)) { P.y += Math.sign(s); return 1; }
    if (dy && free(P.x + s, P.y + dy)) { P.x += Math.sign(s); return 1; }
  }
  return 0;
}
const front = () => tileAt(P.x + 8 + DX[P.d] * 10, P.y + 12 + DY[P.d] * 10);
const hitE = (e, x, y, w, h) => x < e.x + e.w - 2 && x + w > e.x + 2 && y < e.y + e.w - 1 && y + h > e.y + 3;
const puff = (x, y, c, n = 6) => { for (let i = 0; i < n; i++) parts.push({ x, y, vx: rnd() * 2 - 1, vy: rnd() * 2 - 1.5, l: 12 + ri(10), c }); };

// ---------- かいわ ----------
function wrap(s, n = 25) {
  const ls = [];
  let l = '';
  for (const w of s.split(' ')) if (l && l.length + w.length >= n) { ls.push(l); l = w; } else l += (l ? ' ' : '') + w;
  ls.push(l);
  return ls;
}
async function say(s) {
  busy++;
  let who = '';
  for (let pg of s.split('|')) {
    // 「なまえ「せりふ」」は なふだつきで だす。「 から はじまれば まえの ひとの つづき
    const m = pg.match(/^([^「]{0,10})「(.*?)」?$/);
    if (m) { who = m[1] || who; pg = m[2]; } else who = '';
    const ls = wrap(pg);
    for (let i = 0; i < ls.length; i += 3) {
      dlg = { l: ls.slice(i, i + 3), n: 0, w: who };
      const tot = dlg.l.join('').length;
      let skip = 0;
      keyRes = () => skip = 1;
      while (dlg.n < tot && !skip) { dlg.n++; dlg.n & 1 || sfx.blip(); await wait(2); }
      dlg.n = 99; keyRes = 0;
      await wait(4); await keyA();
    }
  }
  dlg = 0; busy--;
}
const hint = c => { if (!told[c]) { told[c] = 1; say(HINT[c]); } };
async function fadeTo(v) { for (let i = 0; i < 8; i++) { fade += (v - fade) / (8 - i); await wait(2); } fade = v; }

// ---------- できごと ----------
async function getItem(n, im) {
  busy++;
  P.d = 0; P.get = im; sfx.get();
  await wait(50);
  await say(GET[n]);
  P.get = 0; busy--;
}
async function openChest(i) {
  cur[i] = 'C'; G.P[gi(i)] = 'C';
  const n = CHEST[rid];
  if (n < 3) G.it[n] = 1; else G.k++;
  await getItem(n, [SW[1], IC.l, IC.b, IC.k][n]);
  save();
}
async function warp(ch) {
  busy++;
  sfx.stair();
  await fadeTo(1);
  const here = gi(tileAt(P.x + 8, P.y + 12)), to = MAP.indexOf(ch) == here ? MAP.lastIndexOf(ch) : MAP.indexOf(ch);
  const gx = to % 40, gy = to / 40 | 0;
  enter((gx / 10 | 0) + (gy >> 3) * 4);
  const i = gx % 10 + gy % 8 * 10, n = [10, -10, 1, -1].find(d => !SOLID.includes(cur[i + d]) && cur[i + d] != null && !isW(cur[i + d]));
  P.x = (i + n) % 10 * 16; P.y = ((i + n) / 10 | 0) * 16 - 4; P.d = n == 10 ? 0 : n == -10 ? 1 : n == 1 ? 3 : 2;
  P.safe = 50; checkpoint();
  await fadeTo(0);
  busy--;
}
async function die() {
  busy++;
  music(-1); sfx.dead();
  await wait(60); await fadeTo(1);
  G.dth++;
  await say('めのまえが くらくなる… でも、 まだ おわれない');
  G.hp = G.mh;
  enter(G.c[0]); P.x = G.c[1]; P.y = G.c[2]; P.inv = P.kb = 0; P.safe = 50;
  await fadeTo(0);
  busy--;
}
function hurt(n, fx, fy) {
  if (P.inv || P.safe || busy) return;
  G.hp -= n; P.inv = 70; P.kb = 8; sfx.hurt();
  const d = Math.hypot(P.x - fx, P.y - fy) || 1;
  P.kx = (P.x - fx) / d; P.ky = (P.y - fy) / d;
  if (G.hp <= 0) die();
}
async function bossDown(e) {
  busy++;
  music(-1); shots = []; E = E.filter(o => o == e); P.inv = P.kb = P.sw = 0;
  for (let i = 0; i < 6; i++) { puff(e.x + ri(32), e.y + ri(32), 'r', 8); sfx.die(); e.inv = 9; await wait(12); }
  E = []; G.S[rid] = 1;
  seal.forEach(([i, c]) => cur[i] = c); seal = 0;
  // いままで いなかった ひとが あらわれる。しょくだいは ともる
  for (let i = 0; i < 80; i++) { const c = MAP[gi(i)]; if (cur[i] == 'i') cur[i] = 'I'; if (SHOW[rid + c] && SHOW[rid + c](stage())) cur[i] = c; }
  await wait(30);
  await say(BOSSOUT[e.b]);
  G.mh += 2; G.hp = G.mh;
  if (e.b > 2) { sfx.heart(); await say('やみが はれ、 からだが かるく なった。 ハートが ひとつ ふえた'); save(); music(1); busy--; return; }
  G.s++;
  P.d = 0; P.get = SHARD; sfx.shard();
  await wait(110);
  await say(SHARDS[G.s - 1]);
  P.get = 0;
  save();
  if (G.s > 2) await ending(); else music(1);
  busy--;
}
async function ending() {
  G.won = 1; save();
  await fadeTo(1);
  enter(3); P.x = 72; P.y = 84; P.d = 1;
  music(3);
  await fadeTo(0);
  await wait(60);
  await say(OUTRO);
  await fadeTo(1);
  enter(9); P.x = 72; P.y = 60; P.d = 0;
  await fadeTo(0);
  await wait(40);
  await say(HOME);
  await fadeTo(1);
  scene = () => {
    R(0, 0, W, H, '0');
    spr(SHARD, 72, 24);
    T('ちいさな とうだいもり', 120, 72, 'e', 1);
    T('おしまい', 120, 100, '1', 1);
    T('じかん ' + (G.t / 3600 | 0) + 'ふん', 120, 134, '9', 1);
    T('たおれた かず ' + G.dth, 120, 150, '9', 1);
    T('あそんでくれて ありがとう', 120, 186, '1', 1);
  };
  fade = 0;
  await wait(60); await keyA();
  scene = 0; checkpoint();
}

// ---------- 主人公 ----------
async function talk(k) {
  busy++;
  let t = TX[k];
  if (Array.isArray(t)) { let s = stage(); while (s && !t[s]) s--; t = t[s]; }
  if (t && t.call) t = await t(G);
  if (t) await say(t);
  busy--;
}
function act() {
  const i = front(), ch = cur[i];
  if (NPC[ch] || ch == 'S' || ch == 'n') return talk(rid + ch);
  if (ch == 'c') return openChest(i);
  if (HINT[ch] && !('*i'.includes(ch) && G.it[1]) && !(ch == 'O' && G.it[2])) return hint(ch);
  if (G.it[0]) { P.sw = 14; P.sid++; sfx.swing(); }
}
function lantern() {
  if (!G.it[1]) return;
  const i = front(), ch = cur[i];
  P.lt = 14; sfx.fire();
  puff(i % 10 * 16 + 8, (i / 10 | 0) * 16 + 8, 'e', 5);
  if (ch == 'i') cur[i] = 'I';
  if (ch == '*') { cur[i] = '.'; G.P[gi(i)] = '.'; puff(i % 10 * 16 + 8, (i / 10 | 0) * 16 + 8, 'd', 10); save(); }
}
function pushing() {
  const i = front(), ch = cur[i];
  if (ch == 'D') return G.k ? (G.k--, cur.forEach((c, j) => c == 'D' && (cur[j] = ' ', G.P[gi(j)] = ' ')), sfx.open(), save()) : hint('D');
  if (ch != 'B' && ch != 'O' || slide) return;
  if (++P.push < 14) return;
  P.push = 0;
  if (ch == 'O' && !G.it[2]) return hint('O');
  const tx = i % 10 + DX[P.d], ty = (i / 10 | 0) + DY[P.d], j = tx + ty * 10;
  if (tx < 0 || ty < 0 || tx > 9 || ty > 7 || !' .,_x'.includes(cur[j]) || E.some(e => e.hp && hitE(e, tx * 16, ty * 16, 16, 16))) return;
  const u = sw.includes(i) ? 'x' : under(i);
  cur[j] = ch; cur[i] = u;
  if (ch == 'O') { G.P[gi(i)] = u; G.P[gi(j)] = ch; }
  slide = { ch, to: j, x: i % 10 * 16, y: (i / 10 | 0) * 16, t: 0 };
  sfx.push();
}
function update() {
  G.t++;
  let dx = (held.R ? 1 : 0) - (held.L ? 1 : 0), dy = (held.D ? 1 : 0) - (held.U ? 1 : 0);
  if (P.inv) P.inv--;
  if (P.safe) P.safe--;
  // ヌシの へやでは かってに なかまで すすむ (そのあと でぐちが しまる)
  if (auto) { P.wf++; P.x += DX[P.d]; P.y += DY[P.d]; if (P.x > 20 && P.x < 124 && P.y > 14 && P.y < 90) auto = 0; return; }
  if (P.kb) {
    tryMove(P.kx * 2.5, 0); tryMove(0, P.ky * 2.5); P.kb--; dx = dy = 0;
    P.x = Math.max(-6, Math.min(150, P.x)); P.y = Math.max(-10, Math.min(114, P.y));
  }
  if (P.sw) {
    P.sw--; dx = dy = 0;
    if (P.sw > 2 && P.sw < 13) {
      const bx = P.x + [0, 0, -13, 13][P.d], by = P.y + [14, -10, 2, 2][P.d];
      const i = tileAt(bx + 8, by + 8);
      if (cur[i] == '"') { cur[i] = '.'; sfx.cut(); puff(bx + 8, by + 8, '6', 8); rnd() < .25 && E.push({ t: 'h', x: bx, y: by, w: 16, n: 0 }); }
      for (const e of E) if (e.hp && e.sid != P.sid && hitE(e, bx, by, 16, 16)) {
        e.sid = P.sid;
        if (e.b == 2 && !cur.includes('I')) { sfx.ting(); hint('f'); continue; }
        e.hp--; e.inv = 14; sfx.hit();
        if (e.w < 32) { e.kx = DX[P.d] * 3; e.ky = DY[P.d] * 3; e.kb = 6; }
        else if (e.hp && rnd() < .25) E.push({ t: 'h', x: 16 + ri(112), y: 16 + ri(80), w: 16, n: 0 });
        if (!e.hp) {
          if (e.t == 'Z') { e.hp = 0; bossDown(e); return; }
          sfx.die(); puff(e.x + 8, e.y + 8, 'r', 10);
          e.dead = 1;
          rnd() < .3 && G.hp < G.mh && E.push({ t: 'h', x: e.x, y: e.y, w: 16, n: 0 });
        }
      }
      shots = shots.filter(s => !(s.x > bx && s.x < bx + 16 && s.y > by && s.y < by + 16 && (puff(s.x, s.y, '3', 4), 1)));
    }
  }
  if (P.lt) { P.lt--; dx = dy = 0; }
  if (dx || dy) {
    if (!(dx && dy) || ![dy > 0, dy < 0, dx < 0, dx > 0][P.d]) P.d = dy > 0 ? 0 : dy < 0 ? 1 : dx < 0 ? 2 : 3;
    P.wf++;
    const s = dx && dy ? .75 : 1, a = dx && tryMove(dx * s, 0), b = dy && tryMove(0, dy * s);
    if (!a && !b && !(dx && dy)) pushing(); else P.push = 0;
  } else P.wf = P.push = 0;
  if (!P.sw && !P.lt) { if (tap.A) act(); else if (tap.B) lantern(); }
  if (tap.M) mapOn = 1;
  // へやの はしを こえたら となりの へやへ
  const mx = P.x + 8, my = P.y + 12, ex = mx < 0 ? -1 : mx >= 160 ? 1 : 0, ey = my < 0 ? -1 : my >= 128 ? 1 : 0;
  if (ex || ey) {
    drawRoom(old.getContext('2d'));
    enter(rid + ex + ey * 4);
    P.x = ex ? ex > 0 ? -4 : 148 : P.x; P.y = ey ? ey > 0 ? -8 : 112 : P.y;
    // でぐちに いわが あれば となりへ よける
    for (let k = 0; k < 17 && !free(P.x, P.y); k++) for (const s of [-k, k]) if (free(P.x + (ey ? s : 0), P.y + (ex ? s : 0))) { P.x += ey ? s : 0; P.y += ex ? s : 0; break; }
    tr = { x: ex, y: ey, t: 0 };
    P.safe = 50;
    if (BOSSR[rid] != null && !G.S[rid]) { auto = 1; P.d = ey > 0 ? 0 : ey < 0 ? 1 : ex < 0 ? 2 : 3; }
    if (!th) checkpoint();
    return;
  }
  const i = tileAt(mx, my), ch = cur[i];
  if (isW(ch)) return warp(ch);
  if (ch == 'h') { cur[i] = under(i); G.P[gi(i)] = cur[i]; G.mh += 2; G.hp = G.mh; save(); getItem(4, tl.h); }
  if (slide && (slide.t += 2) >= 16) slide = 0;
  if (BOSSR[rid] != null && !G.S[rid] && !seal && P.x > 13 && P.x < 131 && P.y > 8 && P.y < 96) {
    seal = [];
    cur.forEach((c, i) => { const tx = i % 10, ty = i / 10 | 0; if (isW(c) || (!tx || !ty || tx > 8 || ty > 6) && !SOLID.includes(c)) { seal.push([i, c]); cur[i] = 'd'; } });
    sfx.boss(); sfx.push();
    say(BOSSIN[BOSSR[rid]]);
  }
  enemies();
  // しかけが とけたか
  if (!G.S[rid] && (cur.includes('d') || cur.includes('?')) && !E.some(e => e.hp) && !cur.includes('i') && sw.every(i => cur[i] == 'B')) {
    G.S[rid] = 1;
    cur.forEach((c, i) => { if (c == 'd') cur[i] = ' '; if (c == '?') cur[i] = 'c'; });
    sfx.solve(); save();
  }
}

// ---------- てき ----------
function shoot(x, y, a, sp = 1.2) { shots.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp }); }
function enemies() {
  const px = P.x, py = P.y + 2;
  E = E.filter(e => !e.dead);
  for (const e of E) {
    if (e.t == 'Z' && !seal) continue;
    e.n++;
    if (e.inv) e.inv--;
    const ang = Math.atan2(py - e.y, px - e.x), ca = Math.cos(ang), sa = Math.sin(ang);
    if (e.t == 'h') { if (e.n > 500) e.dead = 1; if (hitE(e, P.x + 3, P.y + 4, 10, 11)) { e.dead = 1; G.hp = Math.min(G.mh, G.hp + 2); sfx.heart(); } continue; }
    if (e.kb) { e.kb--; emove(e, e.kx, 0); emove(e, 0, e.ky); }
    else if (e.t == 'a' || e.t == 'A') {
      const c = e.n % (e.t == 'a' ? 70 : 46);
      if (c < 20) { const s = e.t == 'a' ? .6 : .9; emove(e, ca * s, 0); emove(e, 0, sa * s); }
    } else if (e.t == 'b') {
      if (e.aw || Math.hypot(px - e.x, py - e.y) < 64) {
        e.aw = 1;
        const w = Math.sin(e.n / 9) * 1.2;
        e.x = Math.max(8, Math.min(136, e.x + ca * .55 - sa * w));
        e.y = Math.max(8, Math.min(104, e.y + sa * .55 + ca * w));
      }
    } else if (e.t == 'e') {
      if (!emove(e, e.dx * .9, e.dy * .9) || e.n % 80 == 0) {
        const h = rnd() < .6 ? Math.abs(px - e.x) > Math.abs(py - e.y) : rnd() < .5;
        e.dx = h ? Math.sign(px - e.x) || 1 : 0; e.dy = h ? 0 : Math.sign(py - e.y) || 1;
        if (rnd() < .3) { e.dx = -e.dx; e.dy = -e.dy; }
      }
    } else if (e.t == 'g') { e.x += ca * .32; e.y += sa * .32; }
    else if (e.b == 0) {          // おおなめ: とびかかる。よわると こぶんを よぶ
      const c = e.n % (e.hp > 4 ? 84 : 60);
      if (c < 26) { e.x = Math.max(16, Math.min(112, e.x + ca * 1.2)); e.y = Math.max(16, Math.min(80, e.y + sa * 1.2)); }
      if (c == 26) { sfx.push(); if (e.hp < 5 && E.length < 3) spawn('a', e.x + 8, e.y + 8).n = 30; }
    } else if (e.b == 1) {        // おおばさみ: よこあるき、あわ、つっこみ
      if (e.s == 0) {
        e.x += e.dx; if (e.x < 18 || e.x > 110) e.dx = -e.dx;
        if (e.n % 130 == 65) { sfx.boss(); for (const d of [-.3, .3]) shoot(e.x + 16, e.y + 20, Math.atan2(py - e.y - 12, px - e.x - 8) + d, 1); }
        if (e.n % 300 == 0) { e.s = 3; e.c = 45; }
      } else if (e.s == 3) { if (!--e.c) e.s = 1; }
      else if (e.s == 1) { e.y += 2; if (e.y > 80) { e.s = 2; sfx.push(); } }
      else { e.y -= .6; if (e.y <= 20) { e.y = 20; e.s = 0; } }
    } else if (e.b == 3) {        // おおこうもり: 8のじに とび、ときどき つっこむ。よわると こぶんを よぶ
      if (e.s) { e.x += e.vx; e.y += e.vy; if (!--e.s) e.n = 0; }
      else {
        e.x += (64 + Math.cos(e.n / 34) * 50 - e.x) * .06; e.y += (26 + Math.sin(e.n / 17) * 14 - e.y) * .06;
        if (e.n % 170 == 169) { sfx.boss(); e.s = 46; e.vx = ca * 1.9; e.vy = sa * 1.9; }
        if (e.hp < 5 && e.n % 120 == 60 && E.length < 3) spawn('b', e.x + 8, e.y + 8).aw = 1;
      }
      e.x = Math.max(12, Math.min(116, e.x)); e.y = Math.max(12, Math.min(84, e.y));
    } else if (e.b == 2) {        // きりのヌシ: ひを ふきけし、やみから うつ
      e.x += ca * .3; e.y += sa * .3;
      if (e.n % 150 == 0) { puff(e.x + 16, e.y + 16, 'g', 10); e.x = 16 + ri(96); e.y = 16 + ri(60); for (let k = 0; k < 4; k++) shoot(e.x + 16, e.y + 16, Math.atan2(py - e.y - 8, px - e.x - 8) + k * 1.57, 1); }
      if (e.n % 400 == 399 && cur.includes('I')) { sfx.dark(); cur.forEach((c, i) => { if (c == 'I') { cur[i] = 'i'; puff(i % 10 * 16 + 8, (i / 10 | 0) * 16 + 4, 'g', 6); } }); }
    }
    if (e.hp && !e.kb && hitE(e, P.x + 3, P.y + 4, 10, 11)) hurt(e.b > 1 ? 2 : 1, e.x + e.w / 2 - 8, e.y + e.w / 2 - 8);
  }
  shots = shots.filter(s => {
    s.x += s.vx; s.y += s.vy;
    if (Math.abs(s.x - P.x - 8) < 6 && Math.abs(s.y - P.y - 9) < 7) { hurt(1, s.x - 8, s.y - 8); return 0; }
    const i = tileAt(s.x, s.y);
    return i >= 0 && !'#MT'.includes(cur[i]);
  });
}

// ---------- がめん ----------
function drawGame() {
  X.save(); X.translate(0, 16);
  let ox = 0, oy = 0;
  if (tr) { ox = tr.x * 160 * (1 - tr.t); oy = tr.y * 128 * (1 - tr.t); X.drawImage(old, ox - tr.x * 160, oy - tr.y * 128); X.translate(ox, oy); }
  drawRoom(X);
  if (slide) spr(tl[slide.ch], slide.x + (slide.to % 10 * 16 - slide.x) * slide.t / 16, slide.y + ((slide.to / 10 | 0) * 16 - slide.y) * slide.t / 16);
  for (const e of E) {
    if (e.inv & 2) continue;
    e.t == 'h' || shade(X, e.x + e.w / 2 - 5, e.y + e.w - 2, 10, 2, .25);
    if (e.t == 'h') { e.n > 380 && fr & 4 || spr(IC.h, e.x + 4, e.y + 4 - (e.n < 8 ? 8 - e.n : 0)); continue; }
    if (e.t == 'Z') { X.globalAlpha = e.b == 2 && !cur.includes('I') ? .45 : 1; spr(BOSS[e.b], e.x + (e.s == 3 ? (fr & 2) - 1 : 0), e.y + (e.b ? Math.sin(e.n / 12) * 2 : e.n % (e.hp > 4 ? 84 : 60) < 26 ? -5 : 0)); X.globalAlpha = 1; continue; }
    const im = EN[e.t], sl = e.t == 'a' || e.t == 'A';
    spr(im[im.length > 1 ? e.n >> 3 & 1 : 0], e.x, e.y - (sl && e.n % (e.t == 'a' ? 70 : 46) < 20 ? 3 : e.t == 'g' ? Math.sin(e.n / 10) * 2 : 0));
  }
  // 主人公
  if (!(P.inv & 4)) {
    const w = P.wf >> 3 & 1;
    shade(X, P.x + 3, P.y + 14, 10, 2, .25);
    if (P.get) { spr(PF, P.x, P.y); spr(P.get, P.x + 8 - P.get.width / 2, P.y - P.get.height + 2); }
    else {
      if (P.sw && P.d == 1) spr(SW[1], P.x + 2, P.y - 11);
      spr(P.d == 0 ? PF : P.d == 1 ? PB : PS[w], P.x, P.y - (P.d > 1 && w ? 1 : 0), P.d == 2 || P.d < 2 && w);
      if (P.sw && P.d != 1) spr(SW[P.d], P.x + [-2, 0, -12, 12][P.d], P.y + [12, 0, 3, 3][P.d]);
      if (P.lt) spr(IC.l, P.x + 4 + DX[P.d] * 9, P.y + 6 + DY[P.d] * 8);
    }
  }
  for (const s of shots) { R(s.x - 2, s.y - 3, 4, 6, '3'); R(s.x - 3, s.y - 2, 6, 4, '3'); R(s.x - 1, s.y - 1, 2, 2, 'r'); }
  for (const p of parts) R(p.x, p.y, 2, 2, p.c);
  if (!th && !G.won) {
    X.globalAlpha = rid > 31 ? .4 : [.3, .3, .22, .16, .12][stage()];
    for (const k of [0, 1]) { const o = (fr / (3 + k * 2) + k * 130) % 320 | 0; X.drawImage(fog, o - 320, k * 9); X.drawImage(fog, o, k * 9); }
    X.globalAlpha = 1;
  }
  if (dark) {
    DK.globalCompositeOperation = 'source-over'; DK.fillStyle = C('0'); DK.fillRect(0, 0, W, 128);
    DK.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r) => { r += fr >> 3 & 1; for (let j = -r; j <= r; j++) { const w = Math.sqrt(r * r - j * j) | 0; DK.fillRect(x - w | 0, y + j | 0, w * 2, 1); } };
    hole(P.x + 8, P.y + 8, G.it[1] ? 30 : 12);
    cur.forEach((c, i) => c == 'I' && hole(i % 10 * 16 + 8, (i / 10 | 0) * 16 + 6, 34));
    for (const s of shots) hole(s.x, s.y, 5);
    for (const e of E) e.b == 2 && hole(e.x + 16, e.y + 16, 5);
    X.drawImage(dk, 0, 0);
  }
  X.restore();
  // うえの じょうほう
  R(0, 0, W, 16, '0');
  for (let i = 0; i < G.mh / 2; i++) spr(G.hp >= i * 2 + 2 ? IC.h : IC.e, 4 + i * 8, 4), G.hp == i * 2 + 1 && X.drawImage(IC.h, 0, 0, 4, 8, 4 + i * 8, 4, 4, 8);
  G.it[1] && spr(IC.l, 84, 4); G.it[2] && spr(IC.b, 94, 4);
  if (G.k) { spr(IC.k, 106, 4); T(G.k, 171, 7); }
  for (let i = 0; i < 3; i++) spr(i < G.s ? IC.s : IC.o, 130 + i * 9, 4);
  if (mapOn) drawMap();
}
function drawMap() {
  const here = rid > 31 ? 2 : th == 0 ? rid : th == 1 ? 1 : th == 2 ? 11 : th == 3 ? 3 : rid == 31 ? 9 : 5;
  const goal = GOALR[stage()];
  box(8, 20, 144, 116);
  T('しまの ちず', 120, 37, 'e', 1);
  for (let i = 0; i < 12; i++) {
    const x = 28 + i % 4 * 26, y = 38 + (i >> 2) * 20;
    R(x, y, 25, 19, 'k');
    if (G.V[i]) for (let j = 0; j < 80; j++) { const c = MAP[((i >> 2) * 8 + (j / 10 | 0)) * 40 + (i & 3) * 10 + j % 10]; R(x + j % 10 * 2.5 | 0, y + (j / 10 | 0) * 2.4 | 0, 3, 3, c == '~' ? '2' : c == 'T' ? '8' : c == 'M' ? 'a' : c == ',' ? '4' : c == '#' || c == 'Y' ? '1' : c == '^' || c == 'H' ? 'd' : '6'); }
    i == goal && fr & 16 && spr(IC.s, x + 9, y + 6);
    i == here && fr & 8 && (R(x + 9, y + 6, 7, 7, '0'), R(x + 10, y + 7, 5, 5, 'r'));
  }
  T('もくてき', 24, 154, 'e');
  wrap(GOAL[stage()], 24).forEach((l, i) => T(l, 24, 170 + i * 14));
}
function draw() {
  R(0, 0, W, H, '0'); U.clearRect(0, 0, 240, 216);
  if (scene) scene(); else if (G) drawGame();
  if (fade) { X.globalAlpha = fade; R(0, 0, W, H, '0'); X.globalAlpha = 1; }
  if (dlg) {
    const y = !scene && G && P.y > 56 ? 18 : 98;
    box(4, y, 152, 42);
    if (dlg.w) { const py = y < 50 ? y + 39 : y - 9; box(8, py, dlg.w.length * 5.34 + 10 | 0, 13); T(dlg.w, 20, py * 1.5 + 6, 'e'); }
    let n = dlg.n;
    dlg.l.forEach((l, i) => { T(l.slice(0, Math.max(0, n)), 18, y * 1.5 + 10 + i * 17); n -= l.length; });
    dlg.n > 98 && fr & 16 && R(142, y + 34, 5, 3, 'e');
  }
  cx.drawImage(sc, 0, 0, cv.width, cv.height);
  cx.drawImage(uc, 0, 0, cv.width, cv.height);
}

// ---------- はじまり ----------
async function title() {
  busy++;
  const sv = load();
  let sel = 0;
  G = { hp: 6, mh: 6, k: 0, s: 0, it: [0, 0, 0], P: {}, S: {}, V: {}, f: {}, t: 0, dth: 0, won: 0 };
  enter(3); music(3);
  scene = () => {
    X.save(); X.translate(0, 16); drawRoom(X); X.restore();
    X.globalAlpha = .55; R(0, 0, W, H, '0'); X.globalAlpha = 1;
    R(0, 0, W, 74, '0');
    spr(SHARD, 72, 2 + Math.sin(fr / 20) * 2);
    // だいめいは 2ばいの おおきさで、かげつき
    ['ちいさな', 'とうだいもり'].forEach((s, i) => { T(s, 123, 33 + i * 28, 'c', 1, 3); T(s, 120, 30 + i * 28, 'e', 1, 3); });
    T('きえた あかりと ３つの かけら', 120, 93, '1', 1);
    const it = sv ? ['つづきから', 'はじめから'] : ['はじめる'];
    it.forEach((s, i) => { T(s, 120, 150 + i * 18, i == sel ? '1' : '9', 1); i == sel && R(72 - s.length * 2.7 | 0, 101 + i * 12, 4, 4, 'e'); });
    T('［Ｚ］ けってい', 120, 198, '9', 1);
  };
  for (let k; (k = await key()) != 'A';) if (sv && (k == 'U' || k == 'D')) { sel ^= 1; sfx.blip(); }
  sfx.open();
  await fadeTo(1);
  if (sv && !sel) { G = sv; enter(G.c[0]); P.x = G.c[1]; P.y = G.c[2]; scene = 0; }
  else {
    G.V = {};
    scene = () => R(0, 0, W, H, '0');
    fade = 0; music(3);
    await say(INTRO);
    fade = 1; scene = 0;
    enter(31); P.x = 64; P.y = 60; P.d = 1; checkpoint();
    await fadeTo(0);
    await say(HELLO);
  }
  await fadeTo(0);
  busy--;
}
function tick() {
  fr++;
  for (let i = timers.length; i--;) if (timers[i][0] <= fr) timers.splice(i, 1)[0][1]();
  if (tr) { if ((tr.t += .06) >= 1) tr = 0; }
  else if (mapOn) { if (tap.M || tap.A || tap.B) mapOn = 0; }
  else if (G && !busy && !scene) update();
  parts = parts.filter(p => { p.x += p.vx; p.y += p.vy; p.vy += .1; return --p.l > 0; });
  tap = {};
}
const touch = matchMedia('(pointer:coarse)').matches;
document.getElementById('t').hidden = !touch;
document.getElementById('h').hidden = touch;
function fit() {
  // 1マスを 3の ばいすうに して、もじの そう(1.5ばい)も ぴったり のせる
  const dpr = devicePixelRatio || 1, s = Math.max(3, (Math.min((innerWidth - 32) / W, (innerHeight - (touch ? 230 : 56)) / H) * dpr / 3 | 0) * 3);
  cv.width = W * s; cv.height = H * s; cv.style.width = W * s / dpr + 'px';
  cx.imageSmoothingEnabled = false;
}
onresize = fit; fit();
let last = 0, acc = 0;
function loop(t) {
  acc += Math.min(100, t - last); last = t;
  try { while (acc >= 16.6) { tick(); acc -= 16.6; } draw(); } catch (e) { console.error(e); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
title();
