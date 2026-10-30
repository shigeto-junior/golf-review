// データの形と、記録する項目の選択肢。
// 項目の意味と狙いは docs/data-items.md を参照。

export const TEE_CLUBS = ["1W", "3W", "5W", "UT", "アイアン", "その他"];

// ティーショットの結果（パー3は記録しない）
export const FAIRWAY_RESULTS = [
  { value: "hit", label: "FWキープ" },
  { value: "left", label: "左ミス" },
  { value: "right", label: "右ミス" },
  { value: "short", label: "チョロ・トップ" },
];

// グリーンを外したときの方向
export const APPROACH_MISSES = [
  { value: "left", label: "左" },
  { value: "right", label: "右" },
  { value: "short", label: "ショート" },
  { value: "long", label: "オーバー" },
];

// 1パット目の距離（ざっくり）
export const FIRST_PUTT_DISTANCES = [
  { value: "0-1", label: "1m以内" },
  { value: "1-3", label: "1〜3m" },
  { value: "3-6", label: "3〜6m" },
  { value: "6+", label: "6m以上" },
];

export const DEFAULT_PARS = [4, 4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5];

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function createHole(number, par) {
  return {
    number,
    par,
    score: null,
    putts: null,
    teeClub: null,
    fairway: null, // FAIRWAY_RESULTS の value。パー3は null のまま。The Grint から取り込んだ分は "miss"（方向不明）もある
    approachMiss: null, // パーオンしなかったときだけ。APPROACH_MISSES の value
    firstPutt: null, // FIRST_PUTT_DISTANCES の value
    penalties: 0,
    bunker: false,
    note: "",
  };
}

export function createRound({ date, courseName, tee = "", pars = DEFAULT_PARS }) {
  return {
    id: newId(),
    date,
    courseName,
    tee,
    holes: pars.map((par, i) => createHole(i + 1, par)),
    note: "",
    createdAt: new Date().toISOString(),
  };
}

// パーオン: (打数 - パット数) が (パー - 2) 以下
export function isGreenInRegulation(hole) {
  if (hole.score == null || hole.putts == null) return null;
  return hole.score - hole.putts <= hole.par - 2;
}

export function roundTotal(round) {
  const played = round.holes.filter((h) => h.score != null);
  return {
    played: played.length,
    score: played.reduce((sum, h) => sum + h.score, 0),
    par: played.reduce((sum, h) => sum + h.par, 0),
  };
}

export function createCourseMemo(courseName, holeCount = 18) {
  return {
    courseName,
    general: "",
    holes: Array.from({ length: holeCount }, () => ""),
    holeImages: Array.from({ length: holeCount }, () => []), // 画像ID（images.js）の配列
    holeGreens: Array.from({ length: holeCount }, () => null), // グリーン中央の位置 { lat, lng }
    updatedAt: new Date().toISOString(),
  };
}

export function holeImageIds(memo, index) {
  return memo?.holeImages?.[index] ?? [];
}

export function holeGreen(memo, index) {
  return memo?.holeGreens?.[index] ?? null;
}
