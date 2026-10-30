import {
  createRound, createCourseMemo, roundTotal, isGreenInRegulation, DEFAULT_PARS,
  TEE_CLUBS, FAIRWAY_RESULTS, APPROACH_MISSES, FIRST_PUTT_DISTANCES,
} from "./model.js";
import * as store from "./store.js";
import { computeStats, pct, num } from "./stats.js";

const view = document.getElementById("view");
const title = document.getElementById("view-title");

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatToPar(diff) {
  if (diff === 0) return "±0";
  return diff > 0 ? `+${diff}` : `${diff}`;
}

function courseNames() {
  const names = new Set(store.getCourseMemos().map((m) => m.courseName));
  store.getRounds().forEach((r) => names.add(r.courseName));
  return [...names];
}

// ---- 画面 ----

function renderRounds() {
  title.textContent = "ラウンド";
  const rounds = store.getRounds();
  view.innerHTML = `
    <a class="btn primary block" href="#/round/new">＋ 新しいラウンド</a>
    ${rounds.length === 0
      ? `<p class="empty">まだラウンドがありません。<br>コースに着いたら「新しいラウンド」から始めましょう。</p>`
      : `<ul class="list">${rounds.map((r) => {
          const t = roundTotal(r);
          const scoreText = t.played ? `${t.score}（${formatToPar(t.score - t.par)}）` : "未入力";
          return `<li><a href="#/round/${r.id}">
            <div><strong>${esc(r.courseName)}</strong><small>${esc(r.date)}${r.tee ? ` ・ ${esc(r.tee)}` : ""}</small></div>
            <div class="score">${scoreText}<small>${t.played}/${r.holes.length}H</small></div>
          </a></li>`;
        }).join("")}</ul>`}
  `;
}

function renderNewRound() {
  title.textContent = "新しいラウンド";
  const pars = [...DEFAULT_PARS];
  view.innerHTML = `
    <form id="new-round" class="card form">
      <label>日付<input type="date" name="date" value="${today()}" required></label>
      <label>コース名<input type="text" name="courseName" list="course-list" placeholder="例: 〇〇カントリークラブ" required></label>
      <datalist id="course-list">${courseNames().map((n) => `<option value="${esc(n)}">`).join("")}</datalist>
      <label>ティー<input type="text" name="tee" placeholder="例: レギュラー（白）"></label>
      <fieldset>
        <legend>各ホールのパー（タップで 3→4→5 と切り替え）</legend>
        <div class="par-grid" id="par-grid"></div>
      </fieldset>
      <button class="btn primary block" type="submit">ラウンドを始める</button>
    </form>
  `;
  const grid = document.getElementById("par-grid");
  const drawPars = () => {
    grid.innerHTML = pars.map((p, i) => `<button type="button" data-i="${i}"><small>${i + 1}</small>${p}</button>`).join("");
  };
  drawPars();
  grid.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const i = Number(b.dataset.i);
    pars[i] = pars[i] === 5 ? 3 : pars[i] + 1;
    drawPars();
  });
  document.getElementById("new-round").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const round = createRound({
      date: f.get("date"),
      courseName: f.get("courseName").trim(),
      tee: f.get("tee").trim(),
      pars,
    });
    store.saveRound(round);
    location.hash = `#/round/${round.id}`;
  });
}

function statsHtml(st) {
  if (!st.holeCount) return `<p class="empty">まだ入力されたホールがありません。</p>`;
  const miss = st.fwMiss;
  const missTotal = miss.left + miss.right + miss.unknown;
  return `
    <div class="stat-grid">
      <div class="stat"><small>パーオン率</small><b>${pct(st.girRate)}</b></div>
      <div class="stat"><small>FWキープ率</small><b>${pct(st.fwRate)}</b></div>
      <div class="stat"><small>平均パット/H</small><b>${num(st.avgPuttsPerHole, 2)}</b></div>
      <div class="stat"><small>3パット率</small><b>${pct(st.threePuttRate)}</b></div>
      <div class="stat"><small>寄せワン率</small><b>${pct(st.scramblingRate)}</b></div>
      <div class="stat"><small>ペナルティ</small><b>${st.penalties}</b></div>
    </div>
    ${missTotal ? `<p class="stat-line">ティーショットのミス: 左 ${miss.left} ／ 右 ${miss.right}${miss.short ? ` ／ チョロ・トップ ${miss.short}` : ""}${miss.unknown ? ` ／ 方向不明 ${miss.unknown}` : ""}</p>` : ""}
  `;
}

function renderRound(id) {
  const round = store.getRound(id);
  if (!round) return notFound();
  title.textContent = round.courseName;
  const t = roundTotal(round);
  const next = round.holes.find((h) => h.score == null) ?? round.holes[0];
  const half = (list, label) => {
    const sum = (key) => list.reduce((s, h) => s + (h[key] ?? 0), 0);
    return `<table class="scorecard">
      <tr><th>${label}</th>${list.map((h) => `<th><a href="#/round/${id}/hole/${h.number}">${h.number}</a></th>`).join("")}<th>計</th></tr>
      <tr><td>パー</td>${list.map((h) => `<td>${h.par}</td>`).join("")}<td>${sum("par")}</td></tr>
      <tr><td>打数</td>${list.map((h) => `<td class="${scoreClass(h)}"><a href="#/round/${id}/hole/${h.number}">${h.score ?? "·"}</a></td>`).join("")}<td>${sum("score") || "·"}</td></tr>
      <tr><td>パット</td>${list.map((h) => `<td>${h.putts ?? "·"}</td>`).join("")}<td>${sum("putts") || "·"}</td></tr>
    </table>`;
  };
  view.innerHTML = `
    <div class="card summary">
      <div><small>${esc(round.date)}${round.tee ? ` ・ ${esc(round.tee)}` : ""}</small></div>
      <div class="big">${t.played ? `${t.score} <small>(${formatToPar(t.score - t.par)})</small>` : "—"}</div>
      <div><small>${t.played}/${round.holes.length}ホール入力済み</small></div>
    </div>
    <a class="btn primary block" href="#/round/${id}/hole/${next.number}">${t.played ? "入力を続ける" : "1番ホールから入力する"}</a>
    <div class="card scroll-x">
      ${half(round.holes.slice(0, 9), "OUT")}
      ${round.holes.length > 9 ? half(round.holes.slice(9), "IN") : ""}
    </div>
    <div class="card"><h2>このラウンドのスタッツ</h2>${statsHtml(computeStats([round]))}</div>
    <button class="btn danger block" id="delete-round">このラウンドを削除</button>
  `;
  document.getElementById("delete-round").addEventListener("click", () => {
    if (confirm("このラウンドを削除しますか？元に戻せません。")) {
      store.deleteRound(id);
      location.hash = "#/";
    }
  });
}

function scoreClass(h) {
  if (h.score == null) return "";
  const d = h.score - h.par;
  if (d <= -2) return "eagle";
  if (d === -1) return "birdie";
  if (d === 0) return "par";
  if (d === 1) return "bogey";
  return "double";
}

// ---- ホール入力（ラウンド中に片手で使う画面） ----

function chips(field, options, current) {
  return options.map((o) => {
    const value = typeof o === "object" ? o.value : o;
    const label = typeof o === "object" ? o.label : o;
    return `<button type="button" class="chip${current === value ? " on" : ""}" data-field="${field}" data-value="${esc(value)}">${esc(label)}</button>`;
  }).join("");
}

const SCORE_NAMES = { "-2": "イーグル", "-1": "バーディ", 0: "パー", 1: "ボギー", 2: "ダボ", 3: "トリ", 4: "+4" };

function renderHole(id, numberStr) {
  const round = store.getRound(id);
  if (!round) return notFound();
  const n = Number(numberStr);
  const hole = round.holes[n - 1];
  if (!hole) return notFound();
  document.body.classList.add("focus");
  title.textContent = `${round.courseName}`;

  const memo = store.getCourseMemo(round.courseName);
  const holeMemo = memo?.holes?.[n - 1];
  const t = roundTotal(round);
  const gir = isGreenInRegulation(hole);
  const scoreOptions = [];
  for (let s = Math.max(1, hole.par - 2); s <= hole.par + 4; s++) scoreOptions.push(s);
  const extraScore = hole.score != null && !scoreOptions.includes(hole.score);

  view.innerHTML = `
    <div class="hole-head">
      <div class="hole-no"><b>${n}</b><small>番</small><span>パー${hole.par}</span></div>
      <div class="hole-total"><small>合計</small><b>${t.played ? `${t.score} (${formatToPar(t.score - t.par)})` : "—"}</b></div>
    </div>
    ${holeMemo ? `<p class="hole-memo">📝 ${esc(holeMemo)}</p>` : ""}

    <section class="field">
      <h3>打数</h3>
      <div class="num-row score-row">
        ${scoreOptions.map((s) => `<button type="button" class="num${hole.score === s ? " on" : ""}" data-field="score" data-value="${s}">
          ${s}<small>${SCORE_NAMES[s - hole.par] ?? ""}</small></button>`).join("")}
        <button type="button" class="num${extraScore ? " on" : ""}" data-action="score-other">${extraScore ? hole.score : "他"}<small>${extraScore ? "" : "入力"}</small></button>
      </div>
    </section>

    <section class="field">
      <h3>パット</h3>
      <div class="num-row">
        ${[0, 1, 2, 3, 4].map((p) => `<button type="button" class="num${hole.putts === p ? " on" : ""}" data-field="putts" data-value="${p}">${p}</button>`).join("")}
      </div>
    </section>

    ${hole.par >= 4 ? `
    <section class="field">
      <h3>ティーショット</h3>
      <div class="chip-row">${chips("teeClub", TEE_CLUBS, hole.teeClub)}</div>
      <div class="chip-row">${chips("fairway", FAIRWAY_RESULTS, hole.fairway)}</div>
    </section>` : `
    <section class="field">
      <h3>ティーショットのクラブ</h3>
      <div class="chip-row">${chips("teeClub", TEE_CLUBS, hole.teeClub)}</div>
    </section>`}

    ${gir === false ? `
    <section class="field">
      <h3>グリーンを外した方向</h3>
      <div class="chip-row">${chips("approachMiss", APPROACH_MISSES, hole.approachMiss)}</div>
    </section>` : ""}

    ${hole.putts ? `
    <section class="field">
      <h3>1パット目の距離</h3>
      <div class="chip-row">${chips("firstPutt", FIRST_PUTT_DISTANCES, hole.firstPutt)}</div>
    </section>` : ""}

    <section class="field inline-fields">
      <div>
        <h3>ペナルティ</h3>
        <div class="stepper">
          <button type="button" data-action="pen-minus">−</button>
          <b>${hole.penalties || 0}</b>
          <button type="button" data-action="pen-plus">＋</button>
        </div>
      </div>
      <div>
        <h3>バンカー</h3>
        <button type="button" class="chip toggle${hole.bunker ? " on" : ""}" data-action="bunker">${hole.bunker ? "入った" : "入ってない"}</button>
      </div>
    </section>

    <details class="field" ${hole.note ? "open" : ""}>
      <summary>ひとことメモ</summary>
      <textarea id="hole-note" rows="2" placeholder="例: 2打目を右に押し出した">${esc(hole.note)}</textarea>
    </details>

    <nav class="hole-nav">
      <a class="btn" href="#/round/${id}/hole/${n - 1}" ${n === 1 ? 'aria-disabled="true"' : ""}>‹ ${n > 1 ? n - 1 : ""}</a>
      <a class="btn" href="#/round/${id}">スコアカード</a>
      ${n < round.holes.length
        ? `<a class="btn primary" href="#/round/${id}/hole/${n + 1}">${n + 1} ›</a>`
        : `<a class="btn primary" href="#/round/${id}">終了</a>`}
    </nav>
  `;

  const update = (fn) => {
    fn(hole);
    store.saveRound(round);
    const y = window.scrollY;
    renderHole(id, numberStr);
    window.scrollTo(0, y);
  };

  view.querySelectorAll("[data-field]").forEach((b) => {
    b.addEventListener("click", () => {
      const field = b.dataset.field;
      const raw = b.dataset.value;
      const value = field === "score" || field === "putts" ? Number(raw) : raw;
      update((h) => {
        h[field] = h[field] === value ? null : value; // もう一度タップで取り消し
        if (isGreenInRegulation(h) !== false) h.approachMiss = null; // パーオンなら外した方向は不要
        if (!h.putts) h.firstPutt = null;
      });
    });
  });
  view.querySelector('[data-action="score-other"]').addEventListener("click", () => {
    const v = prompt("打数を入力", hole.score ?? hole.par + 5);
    const s = Number(v);
    if (v && Number.isInteger(s) && s > 0) update((h) => { h.score = s; });
  });
  view.querySelector('[data-action="pen-minus"]').addEventListener("click", () => update((h) => { h.penalties = Math.max(0, (h.penalties || 0) - 1); }));
  view.querySelector('[data-action="pen-plus"]').addEventListener("click", () => update((h) => { h.penalties = (h.penalties || 0) + 1; }));
  view.querySelector('[data-action="bunker"]').addEventListener("click", () => update((h) => { h.bunker = !h.bunker; }));
  document.getElementById("hole-note").addEventListener("input", (e) => {
    hole.note = e.target.value;
    store.saveRound(round);
  });

  // 左右スワイプでホール移動
  let startX = null, startY = null;
  view.ontouchstart = (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; };
  view.ontouchend = (e) => {
    if (startX == null) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    startX = null;
    if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 2) return;
    const target = dx < 0 ? n + 1 : n - 1;
    if (target >= 1 && target <= round.holes.length) location.hash = `#/round/${id}/hole/${target}`;
  };
}

function renderMemos() {
  title.textContent = "コースメモ";
  const memos = store.getCourseMemos();
  view.innerHTML = `
    <form id="new-memo" class="card form inline">
      <input type="text" name="courseName" list="course-list" placeholder="コース名" required>
      <datalist id="course-list">${courseNames().map((n) => `<option value="${esc(n)}">`).join("")}</datalist>
      <button class="btn primary" type="submit">開く</button>
    </form>
    ${memos.length === 0
      ? `<p class="empty">コースごとの攻め方や注意点をメモできます。</p>`
      : `<ul class="list">${memos.map((m) => `<li><a href="#/memo/${encodeURIComponent(m.courseName)}">
          <div><strong>${esc(m.courseName)}</strong><small>更新 ${esc(m.updatedAt.slice(0, 10))}</small></div><div>›</div></a></li>`).join("")}</ul>`}
  `;
  document.getElementById("new-memo").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = new FormData(e.target).get("courseName").trim();
    if (name) location.hash = `#/memo/${encodeURIComponent(name)}`;
  });
}

function renderMemo(courseName) {
  title.textContent = courseName;
  const memo = store.getCourseMemo(courseName) ?? createCourseMemo(courseName);
  view.innerHTML = `
    <form id="memo" class="form">
      <label class="card">コース全体<textarea name="general" rows="3" placeholder="例: グリーンが速い。奥に外すと難しい">${esc(memo.general)}</textarea></label>
      ${memo.holes.map((text, i) => `
        <label class="card">${i + 1}番<textarea name="hole-${i}" rows="2" placeholder="例: 右OB。ティーショットはUTで左サイドへ">${esc(text)}</textarea></label>`).join("")}
    </form>
    <p class="notice" id="saved-note">入力すると自動で保存されます。</p>
  `;
  const form = document.getElementById("memo");
  form.addEventListener("input", () => {
    const f = new FormData(form);
    memo.general = f.get("general");
    memo.holes = memo.holes.map((_, i) => f.get(`hole-${i}`));
    store.saveCourseMemo(memo);
    document.getElementById("saved-note").textContent = "保存しました";
  });
}

let statsRange = 5;

function renderStats() {
  title.textContent = "スタッツ";
  const all = store.getRounds().filter((r) => roundTotal(r).played > 0);
  const rounds = statsRange ? all.slice(0, statsRange) : all;
  const st = computeStats(rounds);
  const full = rounds.filter((r) => roundTotal(r).played === 18);
  const avg18 = full.length ? full.reduce((s, r) => s + roundTotal(r).score, 0) / full.length : null;
  // 推移は18ホール回ったラウンドだけ（ハーフなどが混ざると比べにくいため）
  const trend = [...full].reverse();
  const scores = trend.map((r) => roundTotal(r).score);
  const maxScore = Math.max(...scores, 1);
  const floor = Math.max(0, Math.min(...scores) - 10); // 差が見えるように下を切る
  view.innerHTML = `
    <div class="segmented">
      ${[[5, "直近5"], [10, "直近10"], [0, "すべて"]].map(([v, l]) => `<button type="button" data-range="${v}" class="${statsRange === v ? "on" : ""}">${l}</button>`).join("")}
    </div>
    <div class="card">
      <h2>${rounds.length}ラウンド ・ ${st.holeCount}ホール</h2>
      <p class="stat-line">18ホールの平均スコア: <b>${num(avg18)}</b></p>
      ${statsHtml(st)}
    </div>
    ${st.byPar.length ? `<div class="card"><h2>パー別の平均打数</h2>
      ${st.byPar.map((x) => `<p class="stat-line">パー${x.par}: <b>${num(x.avg, 2)}</b>（${formatToPar(Math.round((x.avg - x.par) * 100) / 100)}）</p>`).join("")}</div>` : ""}
    ${st.byClub.length ? `<div class="card"><h2>クラブ別のFWキープ率</h2>
      ${st.byClub.map((x) => `<p class="stat-line">${esc(x.club)}: <b>${pct(x.fwRate)}</b>（${x.count}回）</p>`).join("")}</div>` : ""}
    ${st.puttsByDistance.length ? `<div class="card"><h2>1パット目の距離別</h2>
      ${st.puttsByDistance.map((x) => `<p class="stat-line">${x.label}: 平均 <b>${num(x.avg, 2)}</b> パット、1パット率 ${pct(x.onePuttRate)}</p>`).join("")}</div>` : ""}
    ${trend.length > 1 ? `<div class="card"><h2>スコアの推移（18ホール）</h2><div class="trend">
      ${trend.map((r) => { const t = roundTotal(r); return `<a href="#/round/${r.id}" title="${esc(r.courseName)}"><span style="height:${Math.round(((t.score - floor) / (maxScore - floor)) * 100)}%"></span><small>${t.score}</small></a>`; }).join("")}
    </div></div>` : ""}
    <p class="notice">練習メニューの提案はステップ4で作ります。</p>
  `;
  view.querySelectorAll("[data-range]").forEach((b) => b.addEventListener("click", () => {
    statsRange = Number(b.dataset.range);
    renderStats();
  }));
}

function renderSettings() {
  title.textContent = "設定";
  view.innerHTML = `
    <div class="card">
      <h2>データのバックアップ</h2>
      <p>データはこのiPhoneの中だけに保存されています。ときどき書き出しておくと安心です。</p>
      <button class="btn primary block" id="export">バックアップを書き出す</button>
      <label class="btn block">ラウンドを追加で取り込む<input type="file" accept="application/json,.json" id="import" hidden></label>
      <label class="btn block">バックアップで置き換える<input type="file" accept="application/json,.json" id="restore" hidden></label>
      <p><small>「追加で取り込む」は今のデータを残したまま、まだ無いラウンドだけを足します。The Grint から変換したファイルもこちらで取り込めます。</small></p>
    </div>
    <div class="card">
      <h2>使い方のメモ</h2>
      <p>Safariの共有ボタンから「ホーム画面に追加」し、ホーム画面のアイコンから開いてください。Safariのタブで開くと、しばらく使わないうちにデータが消えることがあります。</p>
    </div>
  `;
  document.getElementById("export").addEventListener("click", async () => {
    const json = store.exportJson();
    const file = new File([json], `golf-review-${today()}.json`, { type: "application/json" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Golf Review バックアップ" });
        return;
      } catch (e) {
        if (e.name === "AbortError") return;
      }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  const handleImport = (merge) => async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!merge && !confirm("今のデータをすべてバックアップの内容で置き換えます。よろしいですか？")) return;
    try {
      const count = store.importJson(await file.text(), { merge });
      alert(merge ? `${count}ラウンドを追加しました` : "読み込みました");
      location.hash = "#/";
    } catch (err) {
      alert(`読み込めませんでした: ${err.message}`);
    }
  };
  document.getElementById("import").addEventListener("change", handleImport(true));
  document.getElementById("restore").addEventListener("change", handleImport(false));
}

function notFound() {
  title.textContent = "見つかりません";
  view.innerHTML = `<p class="empty">ページが見つかりませんでした。<br><a href="#/">ラウンド一覧へ</a></p>`;
}

// ---- ルーティング ----

const routes = [
  [/^#?\/?$/, renderRounds, "rounds"],
  [/^#\/round\/new$/, renderNewRound, "rounds"],
  [/^#\/round\/([\w-]+)\/hole\/(\d+)$/, renderHole, null],
  [/^#\/round\/([\w-]+)$/, renderRound, "rounds"],
  [/^#\/memos$/, renderMemos, "memos"],
  [/^#\/memo\/(.+)$/, (name) => renderMemo(decodeURIComponent(name)), "memos"],
  [/^#\/stats$/, renderStats, "stats"],
  [/^#\/settings$/, renderSettings, "settings"],
];

function route() {
  const hash = location.hash || "#/";
  for (const [pattern, render, tab] of routes) {
    const m = hash.match(pattern);
    if (m) {
      document.body.classList.remove("focus");
      view.ontouchstart = view.ontouchend = null;
      document.querySelectorAll(".tabbar a").forEach((a) => a.classList.toggle("active", a.dataset.tab === tab));
      render(...m.slice(1));
      window.scrollTo(0, 0);
      return;
    }
  }
  notFound();
}

window.addEventListener("hashchange", route);
route();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}
