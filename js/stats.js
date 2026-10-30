// スタッツの集計。ラウンド単体でも、複数ラウンドまとめてでも使う。
import { isGreenInRegulation, FIRST_PUTT_DISTANCES, TEE_CLUBS } from "./model.js";

function rate(hit, total) {
  return total ? hit / total : null;
}

export function computeStats(rounds) {
  const holes = rounds.flatMap((r) => r.holes.filter((h) => h.score != null));
  const withPutts = holes.filter((h) => h.putts != null);
  const teeHoles = holes.filter((h) => h.par >= 4 && h.fairway);
  const girHoles = withPutts.map((h) => ({ h, gir: isGreenInRegulation(h) }));
  const missedGreens = girHoles.filter((x) => x.gir === false).map((x) => x.h);

  // unknown は The Grint から取り込んだ「FWを外した（方向不明）」
  const fwMiss = { left: 0, right: 0, short: 0, unknown: 0 };
  teeHoles.forEach((h) => {
    if (h.fairway === "miss") fwMiss.unknown += 1;
    else if (h.fairway in fwMiss) fwMiss[h.fairway] += 1;
  });

  const byClub = TEE_CLUBS.map((club) => {
    const list = teeHoles.filter((h) => h.teeClub === club);
    return { club, count: list.length, fwRate: rate(list.filter((h) => h.fairway === "hit").length, list.length) };
  }).filter((x) => x.count > 0);

  const puttsByDistance = FIRST_PUTT_DISTANCES.map((d) => {
    const list = withPutts.filter((h) => h.firstPutt === d.value);
    return {
      label: d.label,
      count: list.length,
      avg: list.length ? list.reduce((s, h) => s + h.putts, 0) / list.length : null,
      onePuttRate: rate(list.filter((h) => h.putts <= 1).length, list.length),
    };
  }).filter((x) => x.count > 0);

  const approachMiss = { left: 0, right: 0, short: 0, long: 0 };
  missedGreens.forEach((h) => {
    if (h.approachMiss in approachMiss) approachMiss[h.approachMiss] += 1;
  });

  const scoreToPar = { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, worse: 0 };
  holes.forEach((h) => {
    const d = h.score - h.par;
    if (d <= -2) scoreToPar.eagle += 1;
    else if (d === -1) scoreToPar.birdie += 1;
    else if (d === 0) scoreToPar.par += 1;
    else if (d === 1) scoreToPar.bogey += 1;
    else if (d === 2) scoreToPar.double += 1;
    else scoreToPar.worse += 1;
  });

  const byPar = [3, 4, 5].map((par) => {
    const list = holes.filter((h) => h.par === par);
    return { par, count: list.length, avg: list.length ? list.reduce((s, h) => s + h.score, 0) / list.length : null };
  }).filter((x) => x.count > 0);

  return {
    holeCount: holes.length,
    girRate: rate(girHoles.filter((x) => x.gir).length, girHoles.length),
    fwRate: rate(teeHoles.filter((h) => h.fairway === "hit").length, teeHoles.length),
    fwMiss,
    byClub,
    avgPuttsPerHole: withPutts.length ? withPutts.reduce((s, h) => s + h.putts, 0) / withPutts.length : null,
    threePutts: withPutts.filter((h) => h.putts >= 3).length,
    threePuttRate: rate(withPutts.filter((h) => h.putts >= 3).length, withPutts.length),
    puttsByDistance,
    // 寄せワン率: パーオンしなかったホールでパー以下にできた割合
    scramblingRate: rate(missedGreens.filter((h) => h.score <= h.par).length, missedGreens.length),
    approachMiss,
    penalties: holes.reduce((s, h) => s + (h.penalties || 0), 0),
    penaltiesPerRound: rounds.length ? holes.reduce((s, h) => s + (h.penalties || 0), 0) / rounds.length : null,
    bunkerHoles: holes.filter((h) => h.bunker).length,
    scoreToPar,
    byPar,
  };
}

export function pct(v) {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

export function num(v, digits = 1) {
  return v == null ? "—" : v.toFixed(digits);
}
