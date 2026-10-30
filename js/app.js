import { createRound, createCourseMemo, roundTotal, DEFAULT_PARS } from "./model.js";
import * as store from "./store.js";

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

function renderRound(id) {
  const round = store.getRound(id);
  if (!round) return notFound();
  title.textContent = round.courseName;
  const t = roundTotal(round);
  view.innerHTML = `
    <div class="card summary">
      <div><small>${esc(round.date)}${round.tee ? ` ・ ${esc(round.tee)}` : ""}</small></div>
      <div class="big">${t.played ? `${t.score} <small>(${formatToPar(t.score - t.par)})</small>` : "—"}</div>
    </div>
    <p class="notice">ホールごとの入力画面はステップ2で作ります。</p>
    <ul class="list holes">${round.holes.map((h) => `
      <li><div><strong>${h.number}番</strong><small>パー${h.par}</small></div>
      <div class="score">${h.score ?? "—"}</div></li>`).join("")}
    </ul>
    <button class="btn danger block" id="delete-round">このラウンドを削除</button>
  `;
  document.getElementById("delete-round").addEventListener("click", () => {
    if (confirm("このラウンドを削除しますか？元に戻せません。")) {
      store.deleteRound(id);
      location.hash = "#/";
    }
  });
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

function renderStats() {
  title.textContent = "スタッツ";
  const n = store.getRounds().length;
  view.innerHTML = `
    <div class="card"><p>記録済みラウンド: <strong>${n}</strong></p></div>
    <p class="notice">スタッツの集計はステップ2、練習メニューの提案はステップ4で作ります。</p>
  `;
}

function renderSettings() {
  title.textContent = "設定";
  view.innerHTML = `
    <div class="card">
      <h2>データのバックアップ</h2>
      <p>データはこのiPhoneの中だけに保存されています。ときどき書き出しておくと安心です。</p>
      <button class="btn primary block" id="export">バックアップを書き出す</button>
      <label class="btn block">バックアップから読み込む<input type="file" accept="application/json,.json" id="import" hidden></label>
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
  document.getElementById("import").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm("今のデータをバックアップの内容で置き換えます。よろしいですか？")) return;
    try {
      store.importJson(await file.text());
      alert("読み込みました");
      location.hash = "#/";
    } catch (err) {
      alert(`読み込めませんでした: ${err.message}`);
    }
  });
}

function notFound() {
  title.textContent = "見つかりません";
  view.innerHTML = `<p class="empty">ページが見つかりませんでした。<br><a href="#/">ラウンド一覧へ</a></p>`;
}

// ---- ルーティング ----

const routes = [
  [/^#?\/?$/, renderRounds, "rounds"],
  [/^#\/round\/new$/, renderNewRound, "rounds"],
  [/^#\/round\/([\w]+)$/, renderRound, "rounds"],
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
