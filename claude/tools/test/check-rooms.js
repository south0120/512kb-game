// へやの つくりを ぜんぶ しらべる (あそぶ ひとが つまない ことの たしかめ)。
// 使い方: node tools/build.mjs toudaimori のあと  node tools/test/check-rooms.js
// playwright が いる (この リポジトリの package.json には いれていない)。
// しらべること:
//  1. となりの へやへ でた さきが かべや ものの なかで ないか
//  2. はこや おおいわを どう おしても、へやから でられなく なる ことが ないか
//  3. スイッチの しかけが とけるか
//  4. しかけを といた あと、どの いりぐちからも どの でぐちへも いけるか
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../../dist/toudaimori/dev.html'));
  await p.waitForTimeout(300);
  const res = await p.evaluate(() => {
    G = { hp: 6, mh: 6, k: 0, s: 0, it: [1, 1, 1], P: {}, S: {}, V: {}, f: {}, t: 0, dth: 0, won: 0 };
    const NR = MAP.length / 80, out = [], name = r => `へや${r}(${r & 3},${r >> 2})`, xy = i => `(${i % 10},${i / 10 | 0})`;
    const tiles = (r, solved, st) => { G.S = {}; if (solved) G.S[r] = 1; G.s = st.s; G.f = st.k ? { k: 1 } : {}; G.won = st.won || 0; MEM = {}; enter(r); E = []; return cur.slice(); };
    const isBorder = i => i < 10 || i > 69 || i % 10 == 0 || i % 10 == 9;
    // scenario: bracelet, lantern, key
    function analyze(r, solved, sc, st) {
      const base = tiles(r, solved, st);
      const push = c => c == 'B' || c == 'O' && sc.b;
      const wall = c => SOLID.includes(c) && !push(c) && c != '"' && !(c == '*' && sc.l) && !(c == 'D' && sc.k);
      const push0 = []; base.forEach((c, i) => push(c) && push0.push([i, c]));
      const sws = []; MAP.slice(0).length; for (let i = 0; i < 80; i++) if (MAP[gi(i)] == 'x') sws.push(i);
      const floor = base.map((c, i) => push(c) ? ' ' : c);
      const exits = []; floor.forEach((c, i) => { if (isW(c)) exits.push(i); else if (isBorder(i) && !wall(c)) { const x = i % 10, y = i / 10 | 0, n = r + (x == 0 ? -1 : x == 9 ? 1 : 0) + (y == 0 ? -4 : y == 7 ? 4 : 0); if (n >= 0 && n < NR && !(x == 0 && (r & 3) == 0) && !(x == 9 && (r & 3) == 3)) exits.push(i); } });
      const starts = exits.map(i => isW(floor[i]) ? i + [10, -10, 1, -1].find(d => floor[i + d] != null && !wall(floor[i + d]) && !isW(floor[i + d]) && !push0.some(q => q[0] == i + d)) : i);
      // でぐちの まとまり: おなじ へりの つづきの マス、または おなじ でいりぐち
      const group = i => isW(floor[i]) ? 'w' + floor[i] : i < 10 ? 'N' : i > 69 ? 'S' : i % 10 ? 'E' : 'W';

      const key = (pl, ps) => pl + '|' + ps.map(q => q[0] + q[1]).sort().join(',');
      const rep = { r, solved, exits, traps: 0, trapEx: '', solvable: !sws.length || solved, reach: {}, states: 0, group, groups: [...new Set(exits.map(group))] };
      starts.forEach((s0, si) => {
        if (s0 != s0 || push0.some(q => q[0] == s0)) return;     // いりぐちが ふさがっている: はいれない か、よこへ よける
        const seen = new Map(), q = [[s0, push0]], rev = new Map(), good = [];
        seen.set(key(s0, push0), 0);
        const st8 = [[s0, push0]];
        for (let h = 0; h < q.length && q.length < 400000; h++) {
          const [pl, ps] = q[h], k0 = key(pl, ps);
          if (exits.includes(pl)) { good.push(k0); (rep.reach[group(exits[si])] = rep.reach[group(exits[si])] || new Set()).add(group(pl)); }
          if (sws.length && sws.every(s => ps.some(q => q[0] == s && q[1] == 'B'))) rep.solvable = true;
          if (isW(floor[pl]) && pl != s0) continue;       // でいりぐちに のったら そこで おわり
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const x = pl % 10 + dx, y = (pl / 10 | 0) + dy;
            if (x < 0 || y < 0 || x > 9 || y > 7) continue;
            const n = x + y * 10;
            if (wall(floor[n])) continue;
            let ps2 = ps;
            const bi = ps.findIndex(q => q[0] == n);
            if (bi >= 0) {
              const x2 = x + dx, y2 = y + dy, n2 = x2 + y2 * 10;
              if (x2 < 0 || y2 < 0 || x2 > 9 || y2 > 7 || !' .,_x'.includes(floor[n2]) || ps.some(q => q[0] == n2)) continue;
              // ゲームと おなじ きまり: でいりぐちの まえには おけない。はしへは となりが あいている ときだけ
              const at = d => { const m = n2 + d; return m < 0 || m > 79 || Math.abs(d) == 1 && (m / 10 | 0) != y2 ? '#' : ps.some((q, j) => j != bi && q[0] == m) ? 'B' : floor[m]; };
              if ([1, -1, 10, -10].some(d => isW(at(d)))) continue;
              const bx = !x2 || x2 > 8;
              if ((bx || !y2 || y2 > 6) && SOLID.includes(at(bx ? 10 : 1)) && SOLID.includes(at(bx ? -10 : -1))) continue;
              ps2 = ps.map((q, j) => j == bi ? [n2, q[1]] : q);
            }
            const k1 = key(n, ps2);
            (rev.get(k1) || rev.set(k1, []).get(k1)).push(k0);
            if (!seen.has(k1)) { seen.set(k1, 1); q.push([n, ps2]); }
          }
        }
        rep.states = Math.max(rep.states, q.length);
        // でぐちに たどりつける じょうたいを ぎゃくに たどる
        const ok = new Set(good), st2 = [...good];
        while (st2.length) { const k = st2.pop(); for (const pk of rev.get(k) || []) if (!ok.has(pk)) { ok.add(pk); st2.push(pk); } }
        let bad = 0, ex = '';
        for (const k of seen.keys()) if (!ok.has(k)) { bad++; ex = ex || k; }
        if (bad) { rep.traps += bad; rep.trapEx = rep.trapEx || `いりぐち${xy(exits[si])}から: ${ex}`; }
      });
      return rep;
    }
    const scen = [['うでわ・ランタン あり', { b: 1, l: 1, k: 1 }], ['うでわ なし', { b: 0, l: 1, k: 1 }]];
    const ST = { s: 2, k: 1 };
    for (let r = 0; r < NR; r++) {
      if (![...MAP.slice(0)].length) break;
      const raw = [...Array(80)].map((_, i) => MAP[gi((rid = r, i))]);
      if (raw.every(c => c == '#')) continue;
      for (const [sn, sc] of scen) for (const solved of [0, 1]) {
        const a = analyze(r, solved, sc, ST);
        if (a.traps) out.push(`TRAP ${name(r)} [${sn}, ${solved ? 'といた あと' : 'とく まえ'}]: でられない じょうたい ${a.traps}こ。れい ${a.trapEx}`);
        if (!a.solvable && sc.b) out.push(`UNSOLVABLE ${name(r)} [${sn}]: スイッチを ぜんぶ ふめない`);
        if (solved && sc.b) for (const g of a.groups) { const got = a.reach[g]; if (!got) continue; const miss = a.groups.filter(x => !got.has(x)); if (miss.length) out.push(`ONEWAY ${name(r)} [といた あと]: ${g} から ${miss.join(' ')} へ いけない`); }
        if (a.states > 390000) out.push(`BIG ${name(r)}: じょうたいが おおすぎて とちゅうで うちきり`);
      }
    }
    // となりの へやへ でた さき
    for (let r = 0; r < NR; r++) for (const [d, side] of [[1, 'E'], [4, 'S']]) {
      const n = r + d; if (n >= NR || (d == 1 && (r & 3) == 3)) continue;
      const A = tiles(r, 1, { s: 2, k: 1 }), B = tiles(n, 1, { s: 2, k: 1 });
      for (let k = 0; k < (d == 1 ? 8 : 10); k++) {
        const a = d == 1 ? 9 + k * 10 : 70 + k, c = d == 1 ? k * 10 : k;
        const oa = !SOLID.includes(A[a]) && !isW(A[a]), ob = !SOLID.includes(B[c]) && !isW(B[c]);
        if (oa != ob && !'"O*Dd'.includes(A[a]) && !'"O*Dd'.includes(B[c])) out.push(`EDGE ${name(r)}${xy(a)}=${JSON.stringify(A[a])} と ${name(n)}${xy(c)}=${JSON.stringify(B[c])} が くいちがう`);
      }
    }
    return out;
  });
  console.log(res.length ? res.join('\n') : 'もんだい なし');
  await b.close();
  process.exit(res.some(l => /^(TRAP|UNSOLVABLE|EDGE)/.test(l)) ? 1 : 0);
})();
