// 어센틱 심볼 테이블 (나무위키 기준)
// 인덱스 0 = 레벨 1 ... 인덱스 10 = 레벨 11(MAX)

export const MAX_LEVEL = 11;

export const SYMBOLS = [
  { key: "cer", name: "세르니움", color: "#4aa3ff" },
  { key: "arc", name: "아르크스", color: "#c58bff" },
  { key: "odi", name: "오디움", color: "#ff7a8a" },
];

export const CLASS_TYPES = [
  { key: "normal", name: "일반", statLabel: "스탯" },
  { key: "xenon", name: "제논", statLabel: "올스탯" },
  { key: "da", name: "데몬어벤져", statLabel: "HP" },
];

// 레벨 n에서의 AUT = 10n
export const autAt = (level) => 10 * level;

// 레벨 n에서의 스탯 증가량
export const STAT_AT = {
  normal: [500, 700, 900, 1100, 1300, 1500, 1700, 1900, 2100, 2300, 2500],
  xenon: [330, 462, 594, 726, 858, 990, 1122, 1254, 1386, 1518, 1550],
  da: [10500, 14700, 18900, 23100, 27300, 31500, 35700, 39900, 44100, 48300, 52500],
};

// 레벨 n -> n+1 에 필요한 성장치 (레벨 1~10)
export const NEED_GROWTH = [29, 76, 141, 224, 325, 444, 581, 736, 909, 1100];

// 레벨 n -> n+1 에 필요한 메소 (레벨 1~10)
export const NEED_MESO = {
  cer: [
    36500000, 91200000, 160700000, 241900000, 331500000,
    426200000, 522900000, 618200000, 709000000, 792000000,
  ],
  arc: [
    41700000, 104800000, 186100000, 282200000, 390000000,
    506100000, 627400000, 750700000, 872600000, 990000000,
  ],
  odi: [
    46900000, 118500000, 211500000, 322500000, 448500000,
    586000000, 732000000, 883200000, 1036200000, 1188000000,
  ],
};

// 누적 성장치 / 누적 메소: 레벨 L에 도달하기까지 쓴 총량 (인덱스 0 = 레벨 1 = 0)
function cumulative(arr) {
  const out = [0];
  for (const v of arr) out.push(out[out.length - 1] + v);
  return out;
}

export const CUM_GROWTH = cumulative(NEED_GROWTH);
export const CUM_MESO = {
  cer: cumulative(NEED_MESO.cer),
  arc: cumulative(NEED_MESO.arc),
  odi: cumulative(NEED_MESO.odi),
};

export const TOTAL_GROWTH = CUM_GROWTH[MAX_LEVEL - 1]; // 4565
