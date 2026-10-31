// よく行くコースの登録。コース名を選ぶと、パー・ティー・ヤードが自動で入る。
// pars: 各ホールのパー（1番から順に）
// tees: ティー名 → 各ホールのヤード（わからないうちは null）
// hdcp: 各ホールのハンディキャップ（任意）
// 最初の登録は The Grint の記録（2026-10 取り込み）から作った。ヤードはスコアカードを見て追記する。
export const COURSES = [
  { name: "Summit Point Golf & Country Club", pars: [4, 3, 5, 4, 5, 3, 4, 3, 5, 4, 4, 4, 3, 5, 4, 5, 3, 4], tees: { "Blue": null, "White": null } },
  { name: "Royal Northwoods Golf Club", pars: [5, 4, 3, 4, 5, 4, 3, 4, 4, 4, 4, 3, 5, 4, 5, 3, 4, 4], tees: { "Blue": null } },
  { name: "South Forbes Golf Club", pars: [5, 4, 4, 4, 3, 3, 3, 3, 4, 3, 3, 3, 4, 5, 4, 4, 4, 4], tees: { "Blue": null, "White": null } },
  { name: "Villamor Air Base Golf Course", pars: [4, 5, 4, 3, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 4, 3, 5], tees: { "Silver": null, "White": null } },
  { name: "Andy Dye | Eagle Ridge Golf And Country Club", pars: [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 5, 3, 4, 4, 4, 5, 3, 4], tees: { "White": null } },
  { name: "Greg Norman | Eagle Ridge Golf And Country Club", pars: [4, 4, 5, 3, 5, 4, 4, 3, 4, 4, 5, 4, 4, 3, 5, 4, 3, 4], tees: { "Blue": null } },
  { name: "Hallow Ridge Filipinas Golf", pars: [4, 4, 3, 4, 3, 5, 4, 4, 5, 4, 4, 3, 5, 4, 3, 4, 4, 5], tees: { "Blue": null, "White": null } },
  { name: "Isao Aoki | Eagle Ridge Golf And Country Club", pars: [4, 4, 5, 3, 4, 5, 3, 4, 4, 4, 5, 4, 4, 4, 3, 5, 3, 4], tees: { "Blue": null } },
  { name: "Mount Lobo/Mount Malipunyo | Mount Malarayat Golf & Country Club", pars: [4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 3, 4, 4, 5, 3, 4, 5, 4], tees: { "White": null } },
  { name: "Sun Valley Golf Club", pars: [4, 4, 3, 4, 4, 3, 4, 5, 5, 4, 4, 3, 4, 4, 3, 5, 4, 4], tees: { "Blue": null, "White": null } },
  { name: "Alabang Country Club", pars: [4, 4, 5, 4, 4, 3, 5, 3, 4, 4, 4, 3, 5, 4, 3, 4, 4, 5], tees: { "Blue": null } },
  { name: "Arayat Course | Pradera Verde Golf Club", pars: [4, 3, 5, 4, 4, 4, 4, 3, 5], tees: { "Blue": null } },
  { name: "Bristol Hill Golf Club", pars: [4, 5, 5, 3, 4, 4, 3, 4, 3, 4, 5, 4, 5, 5, 3, 4, 3, 4], tees: { "White": null } },
  { name: "Green Left | Nagatoro Country Club", pars: [5, 3, 4, 4, 4, 5, 4, 4, 3, 4, 3, 4, 5, 3, 4, 4, 4, 5], tees: { "Regular": null } },
  { name: "KC Filipinas Golf Resort Club", pars: [4, 4, 3, 4, 3, 5, 4, 4, 5, 4, 4, 3, 5, 4, 3, 4, 4, 5], tees: { "Blue": null } },
  { name: "Kubota/Kuranami | Tokyo Bay Country Club", pars: [4, 3, 5, 4, 4, 4, 3, 4, 5, 3, 4, 3, 4, 5, 4, 5, 4, 4], tees: { "Regular": null } },
  { name: "Nick Faldo | Eagle Ridge Golf And Country Club", pars: [4, 5, 3, 5, 4, 3, 4, 4, 4, 4, 3, 5, 4, 5, 4, 4, 3, 4], tees: { "Blue": null } },
  { name: "Subic International Golf Club", pars: [4, 4, 4, 4, 5, 3, 5, 3, 4, 4, 4, 4, 5, 5, 3, 4, 3, 4], tees: { "Blue": null } },
];

export function findCourse(name) {
  return COURSES.find((c) => c.name === name) ?? null;
}
