// 어센틱 심볼 테이블 (나무위키 기준)
// 인덱스 0 = 레벨 1 ... 인덱스 10 = 레벨 11(MAX)

export const MAX_LEVEL = 11;

export const SYMBOLS = [
  { key: "cer", name: "세르니움", color: "#4aa3ff" },
  { key: "arc", name: "아르크스", color: "#c58bff" },
  { key: "odi", name: "오디움", color: "#ff7a8a" },
  { key: "dow", name: "도원경", color: "#ffb454" },
  { key: "art", name: "아르테리아", color: "#4fd1c5" },
  { key: "car", name: "카르시온", color: "#a3e635" },
  { key: "tal", name: "탈라하트", color: "#f472b6", grand: true },
  { key: "gea", name: "기어드락", color: "#94a3b8", grand: true },
];

// 그랜드 어센틱 심볼은 스탯 대신 경험치, 메소, 아이템 드롭률 보너스를 준다
export const GRAND_BONUS_AT = (level) => ({
  exp: 4 * level + 6,
  meso: level + 4,
  drop: level + 4,
});

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
  dow: [
    52200000, 132200000, 236800000, 362800000, 507000000,
    666000000, 836600000, 1015600000, 1199800000, 1386000000,
  ],
  art: [
    57400000, 145900000, 262200000, 403200000, 565500000,
    745900000, 941200000, 1148100000, 1363500000, 1584000000,
  ],
  car: [
    62600000, 159600000, 287600000, 443500000, 624000000,
    825800000, 1045800000, 1280600000, 1527100000, 1782000000,
  ],
  tal: [
    113600000, 293300000, 535800000, 837700000, 1196000000,
    1607200000, 2068300000, 2576000000, 3126900000, 3718000000,
  ],
  gea: [
    139700000, 361700000, 662700000, 1039300000, 1488500000,
    2006800000, 2591200000, 3238400000, 3945000000, 4708000000,
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
  dow: cumulative(NEED_MESO.dow),
  art: cumulative(NEED_MESO.art),
  car: cumulative(NEED_MESO.car),
  tal: cumulative(NEED_MESO.tal),
  gea: cumulative(NEED_MESO.gea),
};

export const TOTAL_GROWTH = CUM_GROWTH[MAX_LEVEL - 1]; // 4565
