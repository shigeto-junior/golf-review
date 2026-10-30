// データはこの端末（iPhone）の localStorage にだけ保存する。サーバーには送らない。
const KEY = "golf-review:v1";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("データの読み込みに失敗しました", e);
  }
  return { rounds: [], courseMemos: {} };
}

let state = load();

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function getRounds() {
  return [...state.rounds].sort((a, b) => b.date.localeCompare(a.date));
}

export function getRound(id) {
  return state.rounds.find((r) => r.id === id) ?? null;
}

export function saveRound(round) {
  const i = state.rounds.findIndex((r) => r.id === round.id);
  if (i >= 0) state.rounds[i] = round;
  else state.rounds.push(round);
  save();
}

export function deleteRound(id) {
  state.rounds = state.rounds.filter((r) => r.id !== id);
  save();
}

export function getCourseMemos() {
  return Object.values(state.courseMemos).sort((a, b) => a.courseName.localeCompare(b.courseName, "ja"));
}

export function getCourseMemo(courseName) {
  return state.courseMemos[courseName] ?? null;
}

export function saveCourseMemo(memo) {
  memo.updatedAt = new Date().toISOString();
  state.courseMemos[memo.courseName] = memo;
  save();
}

// バックアップ用。機種変更やデータ消失に備えて JSON で書き出し／読み込みする。
export function allImageIds() {
  return Object.values(state.courseMemos).flatMap((m) => (m.holeImages ?? []).flat());
}

// images: 画像ID → data URL（images.exportImages の結果）
export function exportJson(images = {}) {
  return JSON.stringify({ app: "golf-review", version: 1, exportedAt: new Date().toISOString(), ...state, images }, null, 2);
}

// merge: true なら今のデータを残したまま、まだ無いラウンドとコースメモだけを追加する。
// 戻り値は追加（または置き換え）したラウンド数。
export function importJson(text, { merge = true } = {}) {
  const data = JSON.parse(text);
  if (!Array.isArray(data.rounds) || typeof data.courseMemos !== "object") {
    throw new Error("Golf Review のバックアップファイルではないようです");
  }
  if (!merge) {
    state = { rounds: data.rounds, courseMemos: data.courseMemos };
    save();
    return data.rounds.length;
  }
  const ids = new Set(state.rounds.map((r) => r.id));
  const added = data.rounds.filter((r) => !ids.has(r.id));
  state.rounds.push(...added);
  for (const [name, memo] of Object.entries(data.courseMemos)) {
    if (!state.courseMemos[name]) state.courseMemos[name] = memo;
  }
  save();
  return added.length;
}
