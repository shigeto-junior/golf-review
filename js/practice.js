// スタッツから弱点を見つけ、練習メニューを提案する。
// 目安は「100切り〜110前後」のゴルファー向け。目安からどれだけ離れているか（severity）で並べ、上位3つを出す。
import { pct, num } from "./stats.js";

const RULES = [
  {
    id: "tee-direction",
    check(st) {
      const m = st.fwMiss;
      const lr = m.left + m.right;
      if (lr < 8) return null;
      const right = m.right >= m.left;
      const share = (right ? m.right : m.left) / lr;
      if (share < 0.6) return null;
      const side = right ? "右" : "左";
      return {
        severity: (share - 0.5) * 4,
        title: `ティーショットが${side}に出る`,
        stat: `${side}ミス ${pct(share)}`,
        evidence: `左右がわかるティーショットのミス${lr}回のうち${right ? m.right : m.left}回が${side}方向`,
        goal: `${side}ミスを50%前後に`,
        drills: right
          ? [
            { t: "アライメントスティックで構えを確認", d: "足元と目標線に2本置き、毎球同じルーティンで構える。右を向いていないかを確かめる。", m: "30球 ・ 約20分" },
            { t: "フェースを返す素振りとハーフショット", d: "腰から腰の振り幅で、フェースが閉じながら当たる感覚をつかむ。", m: "30球 ・ 約15分" },
          ]
          : [
            { t: "アライメントスティックで構えを確認", d: "足元と目標線に2本置き、左を向いていないか、ボール位置が左すぎないかを確かめる。", m: "30球 ・ 約20分" },
            { t: "右に打ち出すイメージのハーフショット", d: "体の回転を止めずに、少し右に打ち出す感覚で振る。手で返しすぎない。", m: "30球 ・ 約15分" },
          ],
      };
    },
  },
  {
    id: "fairway",
    check(st) {
      if (st.fwTotal < 15 || st.fwRate >= 0.45) return null;
      return {
        severity: (0.45 - st.fwRate) * 5,
        title: "ティーショットがフェアウェイに残らない",
        stat: `FWキープ率 ${pct(st.fwRate)}`,
        evidence: `パー3以外の${st.fwTotal}ホールでFWキープは${st.fwHit}回`,
        goal: "FWキープ率45%以上",
        drills: [
          { t: "7割の力で振るドライバー", d: "飛距離より方向。打席の中で幅20ヤードの「フェアウェイ」を決め、そこに何球入るか数える。", m: "20球 ・ 約15分" },
          { t: "UT・3Wのティーショット", d: "狭いホール用に、1W以外で確実に前に進める番手を決めておく。", m: "20球 ・ 約15分" },
        ],
      };
    },
  },
  {
    id: "three-putt",
    check(st) {
      if (st.holeCount < 18 || st.threePuttRate <= 0.1) return null;
      const perRound = st.threePuttRate * 18;
      return {
        severity: (st.threePuttRate - 0.1) * 8,
        title: "3パットが多い",
        stat: `3パット率 ${pct(st.threePuttRate)}`,
        evidence: `18ホールに直すと1ラウンド約${num(perRound)}回。平均パットは1ホール${num(st.avgPuttsPerHole, 2)}`,
        goal: "3パットを1ラウンド2回以下に",
        drills: [
          { t: "ラグパット（距離感）ドリル", d: "5m・8m・12mを各5球。入れるのではなく、1m以内に止めることだけを狙う。", m: "15球 ・ 約15分" },
          { t: "1.5mのゲートドリル", d: "ティー2本でゲートを作り、10球連続で入れる。外したら最初から。", m: "10球連続 ・ 約10分" },
        ],
      };
    },
  },
  {
    id: "gir",
    check(st) {
      if (st.girTotal < 18 || st.girRate >= 0.15) return null;
      return {
        severity: (0.15 - st.girRate) * 6,
        title: "パーオンできない",
        stat: `パーオン率 ${pct(st.girRate)}`,
        evidence: `${st.girTotal}ホール中パーオンは${st.girHit}回`,
        goal: "パーオン率15%以上（1ラウンド3回）",
        drills: [
          { t: "7番・9番アイアンでターゲットを狙う", d: "グリーンの大きさ（直径25m）の範囲を決め、何球入るかを数える。", m: "30球 ・ 約20分" },
          { t: "ハーフスイングでのミート練習", d: "振り幅を小さくして、芯に当てることを優先する。ダフリ・トップを減らす。", m: "30球 ・ 約15分" },
        ],
      };
    },
  },
  {
    id: "approach-short",
    check(st) {
      const a = st.approachMiss;
      const total = a.left + a.right + a.short + a.long;
      if (total < 8) return null;
      const share = a.short / total;
      if (share < 0.35) return null;
      return {
        severity: (share - 0.25) * 4,
        title: "グリーンを外すとショートが多い",
        stat: `ショート ${pct(share)}`,
        evidence: `方向を記録した${total}ホールのうち${a.short}ホールがショート`,
        goal: "ショートを25%以下に",
        drills: [
          { t: "番手ごとのキャリーを測る", d: "7番・9番・PWを各10球。キャリー（落ちた地点）の距離だけを記録する。", m: "30球 ・ 約25分" },
          { t: "1番手上げてコンパクトに打つ", d: "迷ったら大きめの番手で、8割の振り幅で打つ感覚をつかむ。", m: "15球 ・ 約15分" },
        ],
      };
    },
  },
  {
    id: "scrambling",
    check(st) {
      if (st.missedGreenCount < 18 || st.scramblingRate >= 0.15) return null;
      return {
        severity: (0.15 - st.scramblingRate) * 6,
        title: "グリーン周りから寄らない",
        stat: `寄せワン率 ${pct(st.scramblingRate)}`,
        evidence: `パーオンしなかった${st.missedGreenCount}ホールでパー以下は${Math.round(st.scramblingRate * st.missedGreenCount)}回`,
        goal: "寄せワン率15%以上",
        drills: [
          { t: "ランニングアプローチ", d: "8番やPWで転がす。キャリー1：ラン3の感覚を、10・20・30ヤードで確認する。", m: "30球 ・ 約20分" },
          { t: "1つのクラブで距離を打ち分ける", d: "52度など1本に決め、振り幅（腰・胸・肩）ごとの距離を覚える。", m: "30球 ・ 約20分" },
        ],
      };
    },
  },
  {
    id: "penalty",
    check(st) {
      if (st.penaltiesPerRound == null || st.penaltiesPerRound <= 2) return null;
      return {
        severity: (st.penaltiesPerRound - 2) * 0.6,
        title: "OB・池でスコアを落としている",
        stat: `ペナルティ 1ラウンド${num(st.penaltiesPerRound)}打`,
        evidence: `集計したラウンドで合計${st.penalties}打のペナルティ`,
        goal: "ペナルティを1ラウンド2打以下に",
        drills: [
          { t: "コースメモに危ないホールを書く", d: "OBや池があるホールと、安全な狙い所・番手を書いておく。ラウンド中にホール画面に出る。", m: "練習場の前に10分" },
          { t: "「安全な番手」のティーショット練習", d: "UTやアイアンで、確実に前に進める番手を決めて打ち込む。", m: "20球 ・ 約15分" },
        ],
      };
    },
  },
  {
    id: "par3",
    check(st) {
      const p3 = st.byPar.find((p) => p.par === 3);
      if (!p3 || p3.count < 8) return null;
      const over = p3.avg - 3;
      if (over <= 1.2) return null;
      return {
        severity: (over - 1) * 1.2,
        title: "パー3で大きく崩れる",
        stat: `パー3平均 ${num(p3.avg, 2)}`,
        evidence: `パー3の${p3.count}ホールで平均${num(over, 2)}オーバー`,
        goal: "パー3をボギーで上がる（平均4.0）",
        drills: [
          { t: "ティーアップしたアイアンショット", d: "ティーを低くして、パー3でよく使う番手を打つ。手前のバンカーを越えるキャリーを確認。", m: "20球 ・ 約15分" },
          { t: "グリーン中央を狙う練習", d: "ピンではなく、グリーンの真ん中だけを狙う。外しても寄せやすい側を決める。", m: "20球 ・ 約15分" },
        ],
      };
    },
  },
];

export function suggestPractice(st, limit = 3) {
  return RULES.map((r) => r.check(st))
    .filter(Boolean)
    .sort((a, b) => b.severity - a.severity)
    .slice(0, limit);
}
