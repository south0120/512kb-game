// じっさいの そうさと おなじ みちすじ (おしっぱなしの キー) で 主人公を あるかせ、とちゅうで うごけなく ならないか たしかめる。
// てきは いきたまま。くさむらは きり、はこは おす。
// 使い方: node tools/build.mjs toudaimori のあと  node tools/test/walk.js
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../../dist/toudaimori/dev.html'));
  await p.waitForTimeout(300);
  await p.keyboard.press('z'); await p.waitForTimeout(900);
  for (let i = 0; i < 40 && (await p.evaluate(() => busy)); i++) { await p.keyboard.press('z', { delay: 40 }); await p.waitForTimeout(150); }
  // へやの なかで もくてきの マスまで あるく ロボット。まいフレーム held を かきかえる
  await p.evaluate(() => {
    window.bot = { goal: null, log: [], stuck: 0, last: '' };
    const passable = (i, from) => {
      const c = cur[i];
      if (c == '"' ) return true;                                   // きれる
      if (c == 'B' || c == 'O' && G.it[2]) { const d = i - from, j = i + d, x = i % 10 + (d == 1 ? 1 : d == -1 ? -1 : 0); return j >= 0 && j < 80 && x >= 0 && x < 10 && ' .,_x'.includes(cur[j]); }
      return !SOLID.includes(c);
    };
    setInterval(() => {
      const B = window.bot;
      if (B.goal == null) return;                                    // もくてきが ない あいだは キーに さわらない
      for (const k of 'UDLR') held[k] = 0;
      if (busy || tr || auto) return;
      G.hp = G.mh;                                                   // たおれないように (つまりを しらべるため)
      const px = P.x + 8, py = P.y + 12, here = (px >> 4) + (py >> 4) * 10;
      if (px < 0 || py < 0 || px >= 160 || py >= 128) return;
      if (here == B.goal && Math.abs(px - (here % 10 * 16 + 8)) < 4 && Math.abs(py - ((here / 10 | 0) * 16 + 10)) < 4) { B.goal = null; return; }
      if (here == B.goal) { held[px < here % 10 * 16 + 8 ? 'R' : 'L'] = Math.abs(px - (here % 10 * 16 + 8)) > 2; held[py < (here / 10 | 0) * 16 + 10 ? 'D' : 'U'] = Math.abs(py - ((here / 10 | 0) * 16 + 10)) > 2; return; }
      // はばゆうせん たんさく
      const prev = new Int16Array(80).fill(-1), q = [here]; prev[here] = here;
      for (let h = 0; h < q.length; h++) { const i = q[h]; for (const d of [1, -1, 10, -10]) { const n = i + d; if (n < 0 || n > 79 || (Math.abs(d) == 1 && (n / 10 | 0) != (i / 10 | 0)) || prev[n] >= 0) continue; if (!passable(n, i) && n != B.goal) continue; prev[n] = i; q.push(n); } }
      if (prev[B.goal] < 0) { B.stuck++; return; }
      let n = B.goal; while (prev[n] != here) n = prev[n];
      const d = n - here, dir = d == 10 ? 0 : d == -10 ? 1 : d == -1 ? 2 : 3;
      // マスの まんなかに よせてから すすむ
      const cx = (here % 10) * 16 + 8, cy = (here / 10 | 0) * 16 + 10, off = dir < 2 ? px - cx : py - cy;
      if (Math.abs(off) > 2) held[dir < 2 ? (off > 0 ? 'L' : 'R') : (off > 0 ? 'U' : 'D')] = 1;
      held['DULR'[dir]] = 1;
      if (cur[n] == '"' && P.d == dir && !P.sw) tap.A = 1;
      else if (E.some(e => e.hp && Math.hypot(e.x - P.x, e.y - P.y) < 22) && !P.sw && fr % 20 == 0) tap.A = 1;
      const key = rid + ':' + here + ':' + cur.join('');
      if (key == B.last) B.stuck++; else { B.stuck = 0; B.last = key; }
    }, 16);
  });
  const state = () => p.evaluate(() => ({ rid, x: P.x | 0, y: P.y | 0, stuck: bot.stuck, goal: bot.goal, busy }));
  // goal: [へや, マスx, マスy]。へやの はしの マスなら そのまま となりへ でる
  const walk = async (label, steps) => {
    for (const [room, tx, ty, exitKey] of steps) {
      const s0 = await state();
      if (s0.rid != room) { console.log(`NG ${label}: へや${room} に いるはずが へや${s0.rid}`); return false; }
      await p.evaluate(([tx, ty]) => { bot.goal = tx + ty * 10; bot.stuck = 0; }, [tx, ty]);
      let ok = false;
      for (let i = 0; i < 400; i++) { await p.waitForTimeout(50); const s = await state(); if (s.busy) { await p.keyboard.press('z', { delay: 30 }); continue; } if (s.goal == null || s.rid != room) { ok = true; break; } if (s.stuck > 360) break; }
      if (!ok) { const s = await state(); console.log(`NG ${label}: へや${room} で (${tx},${ty}) へ いけない`, JSON.stringify(s)); await p.screenshot({ path: 'walk-fail.png' }); return false; }
      if (exitKey) { await p.keyboard.down(exitKey); for (let i = 0; i < 60 && (await state()).rid == room; i++) await p.waitForTimeout(50); await p.keyboard.up(exitKey); await p.waitForTimeout(700); }
    }
    console.log(`OK ${label}`);
    return true;
  };
  await p.evaluate(() => { G.it = [1, 1, 1]; });
  let all = true;
  // いえ → むら → もり (はこを おす) → もりの おく → ほこらの まえ
  all &= await walk('いえの なか → そと', [[31, 4, 5, 'ArrowDown']]);
  all &= await walk('いえの まえ → むら (くさむらを きる)', [[9, 4, 0, 'ArrowUp']]);
  all &= await walk('むら → もり', [[5, 0, 3, 'ArrowLeft']]);
  all &= await walk('もり → もりの おく (はこを きたへ おす)', [[4, 5, 0, 'ArrowUp']]);
  all &= await walk('もりの おく → ほこらの まえ', [[0, 9, 3, 'ArrowRight']]);
  // もどり: てきが いても はこを みなみへ おして とおれるか (ごしてきの ばめん)
  all &= await walk('ほこらの まえ → もりの おく', [[1, 0, 4, 'ArrowLeft']]);
  all &= await walk('もりの おく → もり', [[0, 4, 7, 'ArrowDown']]);
  all &= await walk('もり: きたから はいって はこを おし みなみへ', [[4, 4, 4], [4, 9, 4, 'ArrowRight']]);
  all &= await walk('むら → いえの まえ → にしの はま (はしの くさむら)', [[5, 4, 7, 'ArrowDown'], [9, 0, 5, 'ArrowLeft']]);
  all &= await walk('にしの はま → いえの まえ へ もどる', [[8, 9, 5, 'ArrowRight'], [9, 5, 3]]);
  // ひがしへ: いばら → はし → おおいわ → みさき → とうだいの まえ
  all &= await walk('いえの まえ → むら', [[9, 5, 0, 'ArrowUp']]);
  await p.evaluate(() => { cur[39] = cur[49] = '.'; });               // いばらは やいた ことに する
  all &= await walk('むら → はし → みさきの みち (おおいわを おす)', [[5, 9, 3, 'ArrowRight'], [6, 9, 4, 'ArrowRight']]);
  all &= await walk('みさきの みち → とうだいの まえ → もどる', [[7, 4, 0, 'ArrowUp'], [3, 4, 7, 'ArrowDown'], [7, 0, 4, 'ArrowLeft']]);
  all &= await walk('はし (ひがしから) → はま → どうくつの まえ', [[6, 4, 7, 'ArrowDown'], [10, 9, 4, 'ArrowRight'], [11, 4, 2]]);
  console.log(all ? 'ぜんぶ とおれた' : 'とおれない ところが ある', errs.length ? errs : '');
  await b.close();
  process.exit(all ? 0 : 1);
})();
