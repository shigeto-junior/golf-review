import {
  createRound, createCourseMemo, roundTotal, isGreenInRegulation, DEFAULT_PARS,
  TEE_CLUBS, FAIRWAY_RESULTS, APPROACH_MISSES, FIRST_PUTT_DISTANCES,
} from "./model.js";
import * as store from "./store.js";
import { computeStats, pct, num } from "./stats.js";

const app = document.getElementById("app");

// ---- 共通 ----

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}/${d.getDate()}（${"日月火水木金土"[d.getDay()]}）`;
}

function formatToPar(diff) {
  if (diff === 0) return "±0";
  return diff > 0 ? `+${diff}` : `${diff}`;
}

function sum(list, key) {
  return list.reduce((s, h) => s + (h[key] ?? 0), 0);
}

const ICON = {
  back: "M15 5l-7 7 7 7",
  next: "M9 5l7 7-7 7",
  arrow: "M5 12h14M13 6l6 6-6 6",
  plus: "M12 5v14M5 12h14",
  pin: "M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z",
  down: "M12 4v11M7 10l5 5 5-5M5 20h14",
  up: "M12 16V5M7 10l5-5 5 5M5 20h14",
};

function icon(d, size = 24, width = 2.6) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
}

const TABS = [
  ["#/", "ラウンド", "M6 21V4M6 4h11l-2.5 4L17 12H6"],
  ["#/memos", "コースメモ", "M6 3h11a1 1 0 011 1v16a1 1 0 01-1 1H6zM6 3v18M10 8h5M10 12h5"],
  ["#/stats", "スタッツ", "M4 20V11M10 20V4M16 20v-7M22 20H2"],
  ["#/settings", "設定", "M4 8h16M4 16h16M9 5v6M15 13v6"],
];

function tabbar(active) {
  return `<nav class="tabbar" aria-label="メインメニュー">${TABS.map(([href, label, d], i) => `
    <a href="${href}" class="tb${i === active ? " on" : ""}"${i === active ? ' aria-current="page"' : ""}>
      <span class="ti">${icon(d, 24, 2.2)}</span>${label}</a>`).join("")}</nav>`;
}

function backButton(href, label) {
  return `<a href="${href}" class="ib" aria-label="${label}">${icon(ICON.back)}</a>`;
}

function courseNames() {
  // 最近回ったコース順
  const names = [];
  store.getRounds().forEach((r) => { if (!names.includes(r.courseName)) names.push(r.courseName); });
  store.getCourseMemos().forEach((m) => { if (!names.includes(m.courseName)) names.push(m.courseName); });
  return names;
}

function fullRounds(rounds) {
  return rounds.filter((r) => r.holes.length === 18 && roundTotal(r).played === 18);
}

// ---- ラウンド一覧 ----

function renderRounds() {
  const rounds = store.getRounds();
  const full = fullRounds(rounds);
  const recent = full.slice(0, 5);
  const avg = recent.length ? recent.reduce((s, r) => s + roundTotal(r).score, 0) / recent.length : null;
  const best = full.length ? Math.min(...full.map((r) => roundTotal(r).score)) : null;
  app.innerHTML = `<div class="screen">
    <header class="top"><h1>ラウンド</h1><span class="meta">Golf Review</span></header>
    <div class="body">
      ${rounds.length ? `
      <div class="card hero grid3" style="padding:14px 12px">
        ${[["直近5R平均", num(avg)], ["ベスト", best ?? "—"], ["ラウンド数", rounds.length]].map(([l, v]) => `
          <div style="text-align:center"><div style="font-size:12px;font-weight:700">${l}</div><div style="font-size:30px;font-weight:800;line-height:1.2">${v}</div></div>`).join("")}
      </div>` : `<p class="empty">まだラウンドがありません。<br>コースに着いたら「新しいラウンド」から始めましょう。</p>`}
      ${rounds.map((r) => {
        const t = roundTotal(r);
        const st = computeStats([r]);
        return `<a href="#/round/${r.id}" class="card round-card">
          <div style="flex:1;min-width:0">
            <div class="date">${formatDate(r.date)}${r.holes.length < 18 ? ` ・ ${r.holes.length}H` : ""}</div>
            <div class="course">${esc(r.courseName)}</div>
            <div class="sub">パット ${st.totalPutts || "—"} ・ パーオン ${st.girTotal ? `${st.girHit}/${st.girTotal}` : "—"}</div>
          </div>
          <div style="text-align:right">
            <div class="score">${t.played ? t.score : "—"}</div>
            ${t.played ? `<div class="pill" style="margin-top:6px">${formatToPar(t.score - t.par)}</div>` : ""}
          </div>
        </a>`;
      }).join("")}
    </div>
    <div class="foot"><a href="#/round/new" class="cta">${icon(ICON.plus, 24, 2.8)}新しいラウンド</a></div>
    ${tabbar(0)}
  </div>`;
}

// ---- 新しいラウンド ----

const TEES = [["ブラック", "#1A1A1A"], ["ブルー", "#2F6FD6"], ["ホワイト", "#FFFFFF"], ["レッド", "#D0432E"]];

function renderNewRound() {
  const names = courseNames().slice(0, 5);
  const form = { date: today(), course: names[0] ?? null, newCourse: "", tee: "ホワイト", pars: null };
  const parsFor = (course) => {
    const last = store.getRounds().find((r) => r.courseName === course && r.holes.length === 18);
    return last ? last.holes.map((h) => h.par) : [...DEFAULT_PARS];
  };
  form.pars = form.course ? parsFor(form.course) : [...DEFAULT_PARS];

  const draw = () => {
    const isNew = form.course === null;
    app.innerHTML = `<div class="screen">
      <header class="top back">${backButton("#/", "キャンセルして一覧へ戻る")}<h1 style="font-size:24px">新しいラウンド</h1></header>
      <div class="body" style="gap:18px;padding-top:8px">
        <section><label class="lb" for="date">日付</label>
          <input id="date" type="date" class="field-input" value="${form.date}"></section>
        <section><p class="lb">コース${names.length ? "（過去のコースから選択）" : ""}</p>
          <div class="grid2">
            ${names.map((n) => `<button type="button" class="o clamp${form.course === n ? " on" : ""}" data-course="${esc(n)}">${esc(n)}</button>`).join("")}
            <button type="button" class="o${isNew ? " on" : ""}" data-course="">＋ 新しいコース</button>
          </div>
          ${isNew ? `<input id="new-course" class="field-input" style="margin-top:8px" placeholder="コース名" value="${esc(form.newCourse)}">` : ""}
        </section>
        <section><p class="lb">ティー</p>
          <div class="grid4">${TEES.map(([label, dot]) => `
            <button type="button" class="o${form.tee === label ? " on" : ""}" style="gap:4px;font-size:13px" data-tee="${label}">
              <span style="width:14px;height:14px;border-radius:7px;border:2px solid var(--ink);background:${dot}"></span>${label}</button>`).join("")}
          </div></section>
        <section><p class="lb">18ホールのパー（タップで 3 → 4 → 5）</p>
          <div class="grid6">${form.pars.map((p, i) => `
            <button type="button" class="o${p === 3 ? " p3" : p === 5 ? " on" : ""}" style="min-height:62px;padding:0" data-i="${i}" aria-label="${i + 1}番 パー${p}（タップで変更）">
              <span style="font-size:11px;font-weight:700">${i + 1}</span><span style="font-size:26px;font-weight:800;line-height:1.1">${p}</span></button>`).join("")}
          </div>
          <p style="margin:10px 0 0;font-size:14px;font-weight:700;text-align:center">OUT ${form.pars.slice(0, 9).reduce((a, b) => a + b, 0)} ・ IN ${form.pars.slice(9).reduce((a, b) => a + b, 0)} ・ 合計 ${form.pars.reduce((a, b) => a + b, 0)}</p>
        </section>
      </div>
      <div class="foot sheet"><button type="button" class="cta" id="start">ラウンドを開始${icon(ICON.arrow)}</button></div>
    </div>`;

    app.querySelector("#date").addEventListener("change", (e) => { form.date = e.target.value; });
    app.querySelector("#new-course")?.addEventListener("input", (e) => { form.newCourse = e.target.value; });
    app.querySelectorAll("[data-course]").forEach((b) => b.addEventListener("click", () => {
      form.course = b.dataset.course || null;
      form.pars = form.course ? parsFor(form.course) : [...DEFAULT_PARS];
      draw();
      if (!form.course) app.querySelector("#new-course").focus();
    }));
    app.querySelectorAll("[data-tee]").forEach((b) => b.addEventListener("click", () => {
      form.tee = form.tee === b.dataset.tee ? "" : b.dataset.tee;
      draw();
    }));
    app.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () => {
      const i = Number(b.dataset.i);
      form.pars[i] = form.pars[i] === 5 ? 3 : form.pars[i] + 1;
      const y = app.querySelector(".body").scrollTop;
      draw();
      app.querySelector(".body").scrollTop = y;
    }));
    app.querySelector("#start").addEventListener("click", () => {
      const courseName = (form.course ?? form.newCourse).trim();
      if (!courseName) {
        alert("コース名を入力してください");
        return;
      }
      const round = createRound({ date: form.date || today(), courseName, tee: form.tee, pars: form.pars });
      store.saveRound(round);
      location.hash = `#/round/${round.id}/hole/1`;
    });
  };
  draw();
}

// ---- ホール入力（ラウンド中に片手で使う画面） ----

const SCORE_NAMES = { "-2": "イーグル", "-1": "バーディ", 0: "パー", 1: "ボギー", 2: "ダボ", 3: "トリ" };
let memoOpen = false;

function optionButtons(field, options, current) {
  return options.map((o) => {
    const value = typeof o === "object" ? o.value : o;
    const label = typeof o === "object" ? o.label : o;
    const on = current === value;
    return `<button type="button" class="o${on ? " on" : ""}" aria-pressed="${on}" data-field="${field}" data-value="${esc(value)}">${esc(label)}</button>`;
  }).join("");
}

function renderHole(id, numberStr) {
  const round = store.getRound(id);
  if (!round) return notFound();
  const n = Number(numberStr);
  const hole = round.holes[n - 1];
  if (!hole) return notFound();
  const last = n === round.holes.length;

  const memo = store.getCourseMemo(round.courseName);
  const holeMemo = memo?.holes?.[n - 1];
  const t = roundTotal(round);
  const gir = isGreenInRegulation(hole);
  const scoreOptions = [-1, 0, 1, 2, 3].map((d) => hole.par + d);
  const extraScore = hole.score != null && !scoreOptions.includes(hole.score);

  app.innerHTML = `<div class="screen">
    <header class="hole-top">
      <div class="row">
        ${backButton(`#/round/${id}`, "スコアカードへ")}
        <div style="flex:1;min-width:0">
          <div style="font-size:16px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(round.courseName)}</div>
          <div style="font-size:12px;font-weight:600;color:var(--sub)">ラウンド中${round.tee ? ` ・ ${esc(round.tee)}ティー` : ""}</div>
        </div>
        <div style="text-align:right;padding-right:4px">
          <div style="font-size:11px;font-weight:700;color:var(--sub)">ここまで</div>
          <div style="font-size:22px;font-weight:800;line-height:1.1">${t.played ? `${t.score}（${formatToPar(t.score - t.par)}）` : "—"}</div>
        </div>
      </div>
      <div class="row">
        <a class="ib" href="#/round/${id}/hole/${n - 1}" aria-label="前のホール"${n === 1 ? ' aria-disabled="true"' : ""}>${icon(ICON.back)}</a>
        <div class="hole-no">
          <div style="display:flex;align-items:baseline;gap:6px"><span class="k">HOLE</span><span class="n">${n}</span></div>
          <span class="pill acc" style="font-size:16px;padding:6px 14px">PAR ${hole.par}</span>
        </div>
        <a class="ib" href="#/round/${id}/hole/${n + 1}" aria-label="次のホール"${last ? ' aria-disabled="true"' : ""}>${icon(ICON.next)}</a>
      </div>
      ${holeMemo ? `<div class="hole-memo">${icon(ICON.pin, 18, 2.2)}<span>${esc(holeMemo)}</span></div>` : ""}
    </header>

    <div class="body" style="padding-top:8px;gap:18px" id="hole-body">
      <section><p class="lb">ティーショットのクラブ</p>
        <div class="grid3">${optionButtons("teeClub", TEE_CLUBS, hole.teeClub)}</div></section>
      ${hole.par >= 4 ? `<section><p class="lb">ティーショットの結果</p>
        <div class="grid2">${optionButtons("fairway", FAIRWAY_RESULTS, hole.fairway)}</div></section>` : ""}
      ${gir === false ? `<section><p class="lb">グリーンを外した方向 <span style="font-weight:600">（パーオン失敗時のみ）</span></p>
        <div class="grid4">${optionButtons("approachMiss", APPROACH_MISSES, hole.approachMiss)}</div></section>` : ""}
      ${hole.putts !== 0 ? `<section><p class="lb">1パット目の距離</p>
        <div class="grid4">${optionButtons("firstPutt", FIRST_PUTT_DISTANCES, hole.firstPutt)}</div></section>` : ""}
      <section class="grid2" style="gap:16px">
        <div><p class="lb">ペナルティ</p>
          <div class="stepper">
            <button type="button" class="o" aria-label="ペナルティを減らす" data-action="pen-minus">−</button>
            <b>${hole.penalties || 0}</b>
            <button type="button" class="o" aria-label="ペナルティを増やす" data-action="pen-plus">＋</button>
          </div></div>
        <div><p class="lb">バンカー</p>
          <button type="button" class="o${hole.bunker ? " on" : ""}" style="width:100%" role="switch" aria-checked="${hole.bunker}" data-action="bunker">${hole.bunker ? "オン（入った）" : "オフ"}</button></div>
      </section>
      <section>
        <button type="button" class="o" style="width:100%;flex-direction:row;justify-content:space-between;padding:0 16px;font-weight:600" aria-expanded="${memoOpen}" data-action="memo">
          <span>ひとことメモ（任意）</span><span style="font-size:13px;color:var(--sub)">${memoOpen ? "閉じる" : hole.note ? "入力あり" : "タップして入力"}</span></button>
        ${memoOpen ? `<div style="margin-top:8px"><label for="memo" class="lb">このホールのメモ</label>
          <textarea id="memo" rows="3" class="field-input" placeholder="例: 2打目を右に押し出した">${esc(hole.note)}</textarea></div>` : ""}
      </section>
    </div>

    <div class="hole-sheet">
      <div><p class="lb">打数</p>
        <div class="grid6">
          ${scoreOptions.map((s) => `<button type="button" class="o score-btn${hole.score === s ? " on" : ""}" aria-pressed="${hole.score === s}" data-field="score" data-value="${s}">
            <span class="n">${s}</span><small>${SCORE_NAMES[s - hole.par] ?? ""}</small></button>`).join("")}
          <button type="button" class="o score-btn${extraScore ? " on" : ""}" data-action="score-other">
            <span class="n">${extraScore ? hole.score : "…"}</span><small>${extraScore ? formatToPar(hole.score - hole.par) : "その他"}</small></button>
        </div></div>
      <div><p class="lb">パット数</p>
        <div class="grid6" style="grid-template-columns:repeat(5,minmax(0,1fr))">
          ${[0, 1, 2, 3, 4].map((p) => `<button type="button" class="o putt-btn${hole.putts === p ? " on" : ""}" aria-pressed="${hole.putts === p}" data-field="putts" data-value="${p}">${p === 4 ? "4+" : p}</button>`).join("")}
        </div></div>
      ${last
        ? `<a href="#/round/${id}" class="cta">ラウンドを終える</a>`
        : `<a href="#/round/${id}/hole/${n + 1}" class="cta">次のホールへ${icon(ICON.arrow)}</a>`}
    </div>
  </div>`;

  const body = app.querySelector("#hole-body");
  const update = (fn) => {
    fn(hole);
    store.saveRound(round);
    const y = body.scrollTop;
    renderHole(id, numberStr);
    app.querySelector("#hole-body").scrollTop = y;
  };

  app.querySelectorAll("[data-field]").forEach((b) => b.addEventListener("click", () => {
    const field = b.dataset.field;
    const value = field === "score" || field === "putts" ? Number(b.dataset.value) : b.dataset.value;
    update((h) => {
      h[field] = h[field] === value ? null : value; // もう一度タップで取り消し
      if (isGreenInRegulation(h) !== false) h.approachMiss = null; // パーオンなら外した方向は不要
      if (h.putts === 0) h.firstPutt = null;
    });
  }));
  app.querySelector('[data-action="score-other"]').addEventListener("click", () => {
    const v = prompt("打数を入力", hole.score ?? hole.par + 4);
    const s = Number(v);
    if (v && Number.isInteger(s) && s > 0) update((h) => { h.score = s; });
  });
  app.querySelector('[data-action="pen-minus"]').addEventListener("click", () => update((h) => { h.penalties = Math.max(0, (h.penalties || 0) - 1); }));
  app.querySelector('[data-action="pen-plus"]').addEventListener("click", () => update((h) => { h.penalties = (h.penalties || 0) + 1; }));
  app.querySelector('[data-action="bunker"]').addEventListener("click", () => update((h) => { h.bunker = !h.bunker; }));
  app.querySelector('[data-action="memo"]').addEventListener("click", () => {
    memoOpen = !memoOpen;
    update(() => {});
    if (memoOpen) app.querySelector("#memo").focus();
  });
  app.querySelector("#memo")?.addEventListener("input", (e) => {
    hole.note = e.target.value;
    store.saveRound(round);
  });

  // 左右スワイプでホール移動
  let startX = null;
  let startY = null;
  body.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }, { passive: true });
  body.addEventListener("touchend", (e) => {
    if (startX == null) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    startX = null;
    if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 2) return;
    const target = dx < 0 ? n + 1 : n - 1;
    if (target >= 1 && target <= round.holes.length) location.hash = `#/round/${id}/hole/${target}`;
  });
}

// ---- ラウンドのまとめ ----

function scoreMark(h) {
  if (h.score == null) return "";
  const d = h.score - h.par;
  if (d <= -1) return "kb";
  if (d === 0) return "";
  if (d === 1) return "kg";
  return "kd";
}

function scorecardBlock(round, from, label) {
  const holes = round.holes.slice(from, from + 9);
  const cells = (fn) => holes.map((h) => fn(h)).join("") + Array.from({ length: 9 - holes.length }, () => "<span></span>").join("");
  const link = (h, inner) => `<a href="#/round/${round.id}/hole/${h.number}" class="cell ${inner.cls}">${inner.v}</a>`;
  return `<div class="card" style="padding:8px 12px">
    <div class="sc-row rh"><span class="h">HOLE</span>${cells((h) => link(h, { v: h.number, cls: "" }))}<span class="t">${label}</span></div>
    <div class="sc-row"><span class="h">PAR</span>${cells((h) => `<span class="cell">${h.par}</span>`)}<span class="t">${sum(holes, "par")}</span></div>
    <div class="sc-row rs"><span class="h">SCORE</span>${cells((h) => link(h, { v: h.score ?? "·", cls: scoreMark(h) }))}<span class="t">${sum(holes, "score") || "·"}</span></div>
    <div class="sc-row"><span class="h">PUTT</span>${cells((h) => `<span class="cell${h.putts >= 3 ? " kw" : ""}">${h.putts ?? "·"}</span>`)}<span class="t">${sum(holes, "putts") || "·"}</span></div>
  </div>`;
}

function missSplit(miss) {
  const lr = miss.left + miss.right;
  if (!lr) return "";
  const l = Math.round((miss.left / lr) * 100);
  return `<div class="split">
    <div class="l" style="width:${Math.max(l, 0)}%">${l >= 25 ? `左 ${miss.left}回 ${l}%` : ""}</div>
    <div class="r" style="width:${100 - l}%">${100 - l >= 25 ? `右 ${miss.right}回 ${100 - l}%` : ""}</div>
  </div>`;
}

function kpiCard(label, val, sub) {
  return `<div class="card kpi" style="padding:14px"><div class="k">${label}</div><div class="v">${val}</div><div class="s">${sub}</div></div>`;
}

function renderRound(id) {
  const round = store.getRound(id);
  if (!round) return notFound();
  const t = roundTotal(round);
  const st = computeStats([round]);
  const next = round.holes.find((h) => h.score == null);
  const out = round.holes.slice(0, 9);
  const inn = round.holes.slice(9);
  const threePuttHoles = round.holes.filter((h) => h.putts >= 3).map((h) => `${h.number}番`);
  const penHoles = round.holes.filter((h) => h.penalties > 0).length;
  const memos = round.holes.filter((h) => h.note);
  memoOpen = false;

  app.innerHTML = `<div class="screen">
    <header class="top back">${backButton("#/", "ラウンド一覧へ戻る")}
      <div style="flex:1;min-width:0"><h1>${esc(round.courseName)}</h1>
        <span class="meta">${formatDate(round.date)}${round.tee ? ` ・ ${esc(round.tee)}ティー` : ""}</span></div>
    </header>
    <div class="body" style="gap:16px">
      <div class="card hero" style="display:flex;align-items:center;justify-content:space-between;padding:20px">
        <div><div style="font-size:13px;font-weight:700">トータルスコア${t.played < round.holes.length ? `（${t.played}H）` : ""}</div>
          <div style="font-size:72px;font-weight:800;line-height:1">${t.played ? t.score : "—"}</div></div>
        <div style="text-align:right">
          ${t.played ? `<span class="pill acc" style="font-size:22px;padding:4px 16px">${formatToPar(t.score - t.par)}</span>` : ""}
          <div style="margin-top:10px;font-size:15px;font-weight:700">OUT ${sum(out, "score") || "—"}${inn.length ? ` ／ IN ${sum(inn, "score") || "—"}` : ""}</div>
          <div style="font-size:13px;font-weight:600">パー${sum(round.holes, "par")}</div>
        </div>
      </div>
      ${next ? `<a href="#/round/${id}/hole/${next.number}" class="cta">${t.played ? `${next.number}番から入力を続ける` : "1番ホールから入力する"}${icon(ICON.arrow)}</a>` : ""}

      <section><p class="lb">スコアカード</p>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${scorecardBlock(round, 0, "OUT")}
          ${round.holes.length > 9 ? scorecardBlock(round, 9, "IN") : ""}
        </div>
        <p class="note">○ バーディ以上 ／ □ ボギー ／ ■ ダボ以上 ／ 赤い太字は3パット。数字をタップするとそのホールを修正できます。</p>
      </section>

      ${st.holeCount ? `<section><p class="lb">このラウンドのスタッツ</p>
        <div class="grid2" style="gap:10px">
          ${kpiCard("パーオン率", pct(st.girRate), `${st.girHit} / ${st.girTotal}ホール`)}
          ${kpiCard("FWキープ率", pct(st.fwRate), st.fwTotal ? `${st.fwHit} / ${st.fwTotal}ホール（パー3除く）` : "記録なし")}
          ${kpiCard("平均パット", num(st.avgPuttsPerHole, 2), `合計 ${st.totalPutts}パット`)}
          ${kpiCard("3パット", `${st.threePutts}回`, threePuttHoles.join("・") || "なし")}
          ${kpiCard("ペナルティ", st.penalties, penHoles ? `${penHoles}ホールで発生` : "なし")}
          ${kpiCard("バンカー", `${st.bunkerHoles}回`, `寄せワン率 ${pct(st.scramblingRate)}`)}
        </div></section>` : ""}

      ${st.fwMiss.left + st.fwMiss.right ? `<section class="card"><p class="lb">ティーショットのミス（左右）</p>${missSplit(st.fwMiss)}</section>` : ""}

      ${memos.length ? `<section class="card"><p class="lb">ひとことメモ</p>
        <div style="display:flex;flex-direction:column;gap:10px">${memos.map((h) => `
          <div style="display:flex;align-items:center;gap:12px;min-height:44px">
            <span class="pill acc" style="flex:none;width:36px;height:36px;border-radius:18px;padding:0;display:flex;align-items:center;justify-content:center">${h.number}</span>
            <span style="font-size:15px;font-weight:600">${esc(h.note)}</span></div>`).join("")}
        </div></section>` : ""}

      <button type="button" class="big danger" id="delete-round" style="margin-top:8px">このラウンドを削除</button>
    </div>
    ${tabbar(0)}
  </div>`;

  app.querySelector("#delete-round").addEventListener("click", () => {
    if (confirm("このラウンドを削除しますか？元に戻せません。")) {
      store.deleteRound(id);
      location.hash = "#/";
    }
  });
}

// ---- スタッツ ----

let statsRange = 10;

function bars(rows, hiIndex) {
  return rows.map((r, i) => `<div class="br"><span>${r.label}</span>
    <div class="tr"><div class="fl${i === hiIndex ? " hi" : ""}" style="width:${Math.round((r.value ?? 0) * 100)}%"></div></div>
    <span class="val">${pct(r.value)}</span></div>`).join("");
}

function lowestIndex(rows) {
  let idx = -1;
  rows.forEach((r, i) => { if (r.value != null && (idx < 0 || r.value < rows[idx].value)) idx = i; });
  return idx;
}

function highestIndex(rows) {
  let idx = -1;
  rows.forEach((r, i) => { if (r.value != null && (idx < 0 || r.value > rows[idx].value)) idx = i; });
  return idx;
}

function trendChart(rounds) {
  // 古い順。上ほど良いスコア
  const pts = [...rounds].reverse().map((r) => roundTotal(r).score);
  if (pts.length < 2) return "";
  const W = 358, H = 170, L = 30, R = 352, T = 30, B = 140;
  const min = Math.min(...pts), max = Math.max(...pts);
  const lo = Math.floor((min - 2) / 5) * 5, hi = Math.ceil((max + 2) / 5) * 5;
  const x = (i) => L + ((R - L) * i) / (pts.length - 1);
  const y = (v) => T + ((B - T) * (v - lo)) / (hi - lo || 1);
  const bestI = pts.indexOf(min);
  const ticks = [];
  for (let v = lo; v <= hi; v += (hi - lo) > 20 ? 10 : 5) ticks.push(v);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="スコア推移 ${pts.join("、")}">
    <g style="stroke:var(--line);stroke-width:1.5">${ticks.map((v) => `<line x1="${L}" y1="${y(v)}" x2="${R}" y2="${y(v)}"/>`).join("")}</g>
    ${ticks.map((v) => `<text x="0" y="${y(v) + 4}">${v}</text>`).join("")}
    <text x="${L - 6}" y="162">${pts.length}R前</text><text x="${R - 26}" y="162">直近</text>
    <polyline points="${pts.map((v, i) => `${x(i)},${y(v)}`).join(" ")}" style="fill:none;stroke:var(--sel);stroke-width:3.5;stroke-linejoin:round;stroke-linecap:round"/>
    <g style="fill:var(--surf);stroke:var(--sel);stroke-width:3">${pts.map((v, i) => i === bestI ? "" : `<circle cx="${x(i)}" cy="${y(v)}" r="4.5"/>`).join("")}</g>
    <circle cx="${x(bestI)}" cy="${y(min)}" r="7" style="fill:var(--acc);stroke:var(--ink);stroke-width:2.5"/>
    <text x="${Math.min(Math.max(x(bestI), 40), R - 30)}" y="${y(min) - 12}" text-anchor="middle" style="fill:var(--ink);font-size:12px;font-weight:800">ベスト ${min}</text>
  </svg>`;
}

function renderStats() {
  const all = store.getRounds().filter((r) => roundTotal(r).played > 0);
  const rounds = statsRange ? all.slice(0, statsRange) : all;
  const st = computeStats(rounds);
  const full = fullRounds(rounds);
  const avg18 = full.length ? full.reduce((s, r) => s + roundTotal(r).score, 0) / full.length : null;
  const clubRows = st.byClub.map((c) => ({ label: `${c.club}（${c.count}）`, value: c.fwRate }));
  const puttRows = st.puttsByDistance.map((d) => ({ label: d.label, value: d.onePuttRate }));
  const am = st.approachMiss;
  const amTotal = am.left + am.right + am.short + am.long;
  const amRows = [["ショート", am.short], ["右", am.right], ["左", am.left], ["オーバー", am.long]]
    .map(([label, c]) => ({ label, value: amTotal ? c / amTotal : null }))
    .sort((a, b) => b.value - a.value);
  const fm = st.fwMiss;
  const lr = fm.left + fm.right;
  const rangeLabel = statsRange ? `直近${statsRange}ラウンド` : "全ラウンド";

  app.innerHTML = `<div class="screen">
    <header class="top"><h1>スタッツ</h1><span class="meta">${rounds.length}R ・ ${st.holeCount}H</span></header>
    <div class="body" style="gap:16px">
      <div class="grid3" role="group" aria-label="集計期間">
        ${[[5, "直近5"], [10, "直近10"], [0, "全ラウンド"]].map(([v, l]) => `<button type="button" class="o${statsRange === v ? " on" : ""}" aria-pressed="${statsRange === v}" data-range="${v}">${l}</button>`).join("")}
      </div>
      ${!st.holeCount ? `<p class="empty">まだデータがありません。</p>` : `
      <div class="grid2" style="gap:10px">
        ${kpiCard("平均スコア", num(avg18), `18ホール ${full.length}ラウンド`)}
        ${kpiCard("パーオン率", pct(st.girRate), `${st.girHit} / ${st.girTotal}ホール`)}
        ${kpiCard("FWキープ率", pct(st.fwRate), "パー3を除く")}
        ${kpiCard("平均パット", num(st.avgPuttsPerHole, 2), full.length ? `1ラウンド ${num(st.avgPuttsPerHole * 18)}` : "1ホールあたり")}
        ${kpiCard("3パット率", pct(st.threePuttRate), `${st.threePutts}回`)}
        ${kpiCard("寄せワン率", pct(st.scramblingRate), "パーオンしなかったホール")}
      </div>
      ${full.length > 1 ? `<section class="card"><p class="lb">スコア推移（上ほど良いスコア）</p>${trendChart(full)}</section>` : ""}
      ${st.byPar.length ? `<section class="card"><p class="lb">パー別の平均打数</p>
        <div class="grid3" style="text-align:center">${st.byPar.map((p) => `<div><div style="font-size:12px;font-weight:700;color:var(--sub)">パー${p.par}</div>
          <div style="font-size:26px;font-weight:800">${num(p.avg, 2)}</div><div style="font-size:12px;font-weight:700;color:var(--sub)">${formatToPar(Math.round((p.avg - p.par) * 100) / 100)}</div></div>`).join("")}</div></section>` : ""}
      ${clubRows.length ? `<section class="card"><p class="lb">FWキープ率（ティーショットのクラブ別）</p>${bars(clubRows, lowestIndex(clubRows))}</section>` : ""}
      ${puttRows.length ? `<section class="card"><p class="lb">1パット目の距離別 ワンパット率</p>${bars(puttRows, -1)}</section>` : ""}
      ${lr ? `<section class="card"><p class="lb">ティーショットのミス方向</p>${missSplit(fm)}
        <p class="note">左右がわかるミス${lr}回のうち 左${fm.left}回 ／ 右${fm.right}回${fm.unknown ? `（The Grint から取り込んだ方向不明のミス ${fm.unknown}回は除く）` : ""}</p></section>` : ""}
      ${amTotal ? `<section class="card"><p class="lb">グリーンを外した方向</p>${bars(amRows, highestIndex(amRows))}
        <p class="note">方向を記録した${amTotal}ホールの内訳</p></section>` : ""}
      <p class="note" style="text-align:center">${rangeLabel}の集計です。練習メニューの提案はこのあと追加します。</p>`}
    </div>
    ${tabbar(2)}
  </div>`;

  app.querySelectorAll("[data-range]").forEach((b) => b.addEventListener("click", () => {
    statsRange = Number(b.dataset.range);
    renderStats();
  }));
}

// ---- コースメモ ----

function renderMemos() {
  const names = courseNames();
  const rounds = store.getRounds();
  app.innerHTML = `<div class="screen">
    <header class="top"><h1>コースメモ</h1><span class="meta">${names.length}コース</span></header>
    <div class="body" style="gap:12px">
      ${names.length === 0 ? `<p class="empty">コースごとの攻め方や注意点をメモできます。</p>` : names.map((name) => {
        const rs = rounds.filter((r) => r.courseName === name);
        const memo = store.getCourseMemo(name);
        const filled = memo ? memo.holes.filter((t) => t && t.trim()).length : 0;
        const total = memo?.holes.length ?? 18;
        return `<a href="#/memo/${encodeURIComponent(name)}" class="card" style="display:flex;align-items:center;gap:12px;min-height:110px">
          <div style="flex:1;min-width:0">
            <div style="font-size:19px;font-weight:800">${esc(name)}</div>
            <div style="font-size:13px;font-weight:600;color:var(--sub);margin:4px 0 10px">${rs.length}ラウンド${rs[0] ? ` ・ 最終 ${formatDate(rs[0].date)}` : ""}</div>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="progress"><div style="width:${Math.round((filled / total) * 100)}%"></div></div>
              <span style="font-size:13px;font-weight:800">メモ ${filled}/${total}</span>
            </div>
          </div>${icon(ICON.next)}</a>`;
      }).join("")}
    </div>
    <div class="foot"><button type="button" class="cta" id="add-course">${icon(ICON.plus, 24, 2.8)}コースを追加</button></div>
    ${tabbar(1)}
  </div>`;
  app.querySelector("#add-course").addEventListener("click", () => {
    const name = prompt("コース名");
    if (name && name.trim()) location.hash = `#/memo/${encodeURIComponent(name.trim())}`;
  });
}

let editingHole = null;

function renderMemo(courseName) {
  const memo = store.getCourseMemo(courseName) ?? createCourseMemo(courseName);
  const rounds = store.getRounds().filter((r) => r.courseName === courseName);
  const pars = rounds.find((r) => r.holes.length === memo.holes.length)?.holes.map((h) => h.par);
  const filled = memo.holes.filter((t) => t && t.trim()).length;
  const save = () => store.saveCourseMemo(memo);

  app.innerHTML = `<div class="screen">
    <header class="top back">${backButton("#/memos", "コース一覧へ戻る")}
      <div style="flex:1;min-width:0"><h1 style="font-size:22px">${esc(courseName)}</h1>
        <span class="meta">${rounds.length}ラウンド${pars ? ` ・ パー${pars.reduce((a, b) => a + b, 0)}` : ""}</span></div>
    </header>
    <div class="body" style="gap:18px;padding-top:4px">
      <section class="card">
        <label class="lb" for="general">コース全体メモ</label>
        <textarea id="general" rows="3" class="field-input" placeholder="例: 打ち下ろしが多く、表示より1番手短め。グリーンは速い">${esc(memo.general)}</textarea>
      </section>
      <section><p class="lb">ホール別メモ（メモあり ${filled} / ${memo.holes.length}）</p>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${memo.holes.map((text, i) => editingHole === i ? `
            <div class="card" style="padding:10px">
              <label class="lb" for="hole-memo">${i + 1}番${pars ? ` ・ PAR ${pars[i]}` : ""}</label>
              <textarea id="hole-memo" rows="3" class="field-input" placeholder="例: 右OB。ティーショットはUTで左サイドへ">${esc(text)}</textarea>
              <button type="button" class="o on" style="width:100%;margin-top:8px" data-close>完了</button>
            </div>` : `
            <button type="button" class="hr" data-hole="${i}">
              <span class="no">${i + 1}</span>
              ${pars ? `<span class="par">PAR ${pars[i]}</span>` : ""}
              <span class="txt${text ? "" : " none"}">${text ? esc(text) : "メモを追加"}</span>
            </button>`).join("")}
        </div>
      </section>
    </div>
    ${tabbar(1)}
  </div>`;

  app.querySelector("#general").addEventListener("input", (e) => { memo.general = e.target.value; save(); });
  const ta = app.querySelector("#hole-memo");
  if (ta) {
    ta.focus();
    ta.addEventListener("input", (e) => { memo.holes[editingHole] = e.target.value; save(); });
  }
  const reopen = () => {
    const y = app.querySelector(".body").scrollTop;
    renderMemo(courseName);
    app.querySelector(".body").scrollTop = y;
  };
  app.querySelectorAll("[data-hole]").forEach((b) => b.addEventListener("click", () => { editingHole = Number(b.dataset.hole); reopen(); }));
  app.querySelector("[data-close]")?.addEventListener("click", () => { editingHole = null; reopen(); });
}

// ---- 設定 ----

function renderSettings() {
  const rounds = store.getRounds();
  const memos = store.getCourseMemos();
  const holeMemoCount = memos.reduce((s, m) => s + m.holes.filter((t) => t && t.trim()).length, 0);
  const lastExport = (() => { try { return localStorage.getItem("golf-review:last-export"); } catch { return null; } })();

  app.innerHTML = `<div class="screen">
    <header class="top"><h1>設定</h1></header>
    <div class="body" style="gap:18px;padding-top:4px">
      <section class="card"><p class="lb">いまの保存データ</p>
        <div class="grid3" style="text-align:center">
          ${[[rounds.length, "ラウンド"], [courseNames().length, "コース"], [holeMemoCount, "ホールメモ"]].map(([v, l]) => `
            <div><div style="font-size:34px;font-weight:800;line-height:1.2">${v}</div><div style="font-size:12px;font-weight:700;color:var(--sub)">${l}</div></div>`).join("")}
        </div></section>
      <section><p class="lb">バックアップ</p>
        <div style="display:flex;flex-direction:column;gap:12px">
          <button type="button" class="cta" id="export">${icon(ICON.down, 24, 2.4)}データを書き出す</button>
          <label class="big">${icon(ICON.up, 24, 2.4)}データを追加で取り込む<input type="file" accept="application/json,.json" id="import" hidden></label>
          <label class="big" style="min-height:48px;font-size:14px;font-weight:700">バックアップで全部置き換える<input type="file" accept="application/json,.json" id="restore" hidden></label>
        </div>
        <p class="note">${lastExport ? `最終書き出し：${esc(lastExport)}<br>` : ""}「追加で取り込む」は今のデータを残したまま、まだ無いラウンドだけを足します。The Grint から変換したファイルもこちらで取り込めます。</p>
      </section>
      <section class="card" style="background:var(--chip)">
        <p style="margin:0;font-size:14px;font-weight:600;line-height:1.7">データはこのiPhoneの中だけに保存されています。Safariの共有ボタンから「ホーム画面に追加」し、ホーム画面のアイコンから開いてください。機種変更やアプリの削除の前に、書き出しておくと安心です。</p>
      </section>
    </div>
    ${tabbar(3)}
  </div>`;

  app.querySelector("#export").addEventListener("click", async () => {
    const json = store.exportJson();
    const file = new File([json], `golf-review-${today()}.json`, { type: "application/json" });
    const markExported = () => {
      const d = new Date();
      try { localStorage.setItem("golf-review:last-export", `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`); } catch { /* 保存できなくても書き出しは成功している */ }
    };
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Golf Review バックアップ" });
        markExported();
        renderSettings();
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
    markExported();
    renderSettings();
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
  app.querySelector("#import").addEventListener("change", handleImport(true));
  app.querySelector("#restore").addEventListener("change", handleImport(false));
}

function notFound() {
  app.innerHTML = `<div class="screen"><header class="top"><h1>見つかりません</h1></header>
    <div class="body"><p class="empty">ページが見つかりませんでした。<br><a href="#/" style="text-decoration:underline">ラウンド一覧へ</a></p></div>${tabbar(0)}</div>`;
}

// ---- ルーティング ----

const routes = [
  [/^#?\/?$/, renderRounds],
  [/^#\/round\/new$/, renderNewRound],
  [/^#\/round\/([\w-]+)\/hole\/(\d+)$/, renderHole],
  [/^#\/round\/([\w-]+)$/, renderRound],
  [/^#\/memos$/, renderMemos],
  [/^#\/memo\/(.+)$/, (name) => renderMemo(decodeURIComponent(name))],
  [/^#\/stats$/, renderStats],
  [/^#\/settings$/, renderSettings],
];

let lastHash = null;

function route() {
  const hash = location.hash || "#/";
  if (hash !== lastHash) {
    editingHole = null;
    memoOpen = false;
  }
  lastHash = hash;
  for (const [pattern, render] of routes) {
    const m = hash.match(pattern);
    if (m) {
      render(...m.slice(1));
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
