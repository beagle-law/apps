export const FONT_MINCHO =
  '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';
export const FONT_GOTHIC =
  '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif';

export const COLORS = {
  navy: "#1B2A4A",
  navyLight: "#28395F",
  paper: "#F1EDE4",
  card: "#FFFFFF",
  ink: "#2A2A28",
  slate: "#6E6A60",
  brass: "#A9865A",
  brassLight: "#D9C6A5",
  vermillion: "#B23A2F",
  amber: "#B98A2E",
  moss: "#5B7A5B",
} as const;

export const STAGES = [
  "新規問合せ・紹介",
  "初回面談調整中",
  "面談済み・受任検討中",
  "受任せず（終了）",
  "受任・対応中",
  "終結",
] as const;

export const STAGE_GROUP: Record<string, "対応前" | "対応中" | "終了"> = {
  "新規問合せ・紹介": "対応前",
  "初回面談調整中": "対応前",
  "面談済み・受任検討中": "対応前",
  "受任せず（終了）": "終了",
  "受任・対応中": "対応中",
  "終結": "終了",
};

export const STAGE_COLOR: Record<string, string> = {
  "新規問合せ・紹介": COLORS.slate,
  "初回面談調整中": COLORS.amber,
  "面談済み・受任検討中": COLORS.amber,
  "受任せず（終了）": COLORS.slate,
  "受任・対応中": COLORS.vermillion,
  "終結": COLORS.moss,
};

export const STAGE_SEAL_TEXT: Record<string, string> = {
  "新規問合せ・紹介": "新規",
  "初回面談調整中": "面談",
  "面談済み・受任検討中": "検討",
  "受任せず（終了）": "終了",
  "受任・対応中": "対応",
  "終結": "終結",
};

export const BALL_OWNERS = ["事務所", "相手方", "顧客", "裁判所", "その他"];
export const BALL_COLOR: Record<string, string> = {
  事務所: COLORS.vermillion,
  相手方: COLORS.slate,
  顧客: COLORS.amber,
  裁判所: COLORS.navy,
  その他: COLORS.slate,
};

export const POA_STATUSES = ["対応不要", "未対応", "発送済", "受領済"];
export const CONTRACT_STATUSES = ["対応不要", "未対応", "発送済", "締結済"];
export const RETAINER_STATUSES = ["対応不要", "未対応", "請求済", "受領済"];
export const TASK_STATUSES = ["未着手", "完了"]; // v7：ステータス変更は「終了報告」ボタンに一本化（3.2）
export const PRIORITIES = ["通常", "至急"];
export const STAFF_MEMBERS = ["宮村", "尾崎", "岩下", "石谷", "上田"];
export const PERSONAL_TASK_TABS = ["宮村", "尾崎", "岩下"];
export const DAILY_REPORT_STAFF = ["宮村", "岩下", "尾崎"];
export const CASE_CLASSIFICATIONS = [
  "売買代金請求",
  "損害賠償",
  "貸金請求",
  "労働",
  "相続",
  "企業法務",
  "不動産",
  "離婚・家事",
  "その他",
];
export const EXPENSE_CATEGORIES = ["交通費", "印紙代", "郵送費", "謄写費用", "通信費", "その他"];
export const PASSWORD_CATEGORIES = ["事務所", "コレカ", "Sherpa", "Beagle", "Samurai"];
export const GOAL_KEYS = [
  { key: "company", label: "全社目標" },
  { key: "ozaki", label: "尾崎目標" },
  { key: "iwashita", label: "岩下目標" },
] as const;

// v4：レベル表記(Lv.)は使わず、点数・難易度・具体例の3列のみ表示
export const TASK_LEVEL_TABLE = [
  { points: "1〜2点", difficulty: "定型・単純事務", examples: "書類の形式確認、資料整理、データ入力、ファイリング、定型書類の作成" },
  { points: "3〜4点", difficulty: "定型的な法務事務", examples: "契約書の形式チェック、定型契約書の修正、登記・届出書類の準備、基本的な資料収集" },
  { points: "5〜6点", difficulty: "一定の法務知識を要する業務", examples: "契約書の内容確認、法令・ガイドラインの調査、簡単な判例調査、案件に応じた資料作成" },
  { points: "7〜8点", difficulty: "専門的な検討を要する業務", examples: "複雑な契約書のレビュー、複数法令にまたがる調査、判例・文献を踏まえた法的調査、紛争案件の準備" },
  { points: "9〜10点", difficulty: "高度・複雑な法務業務", examples: "複雑な契約・紛争案件の担当弁護士補助、難易度の高い法的調査、複数の論点を整理した調査・資料作成、案件全体を見通した対応" },
];

// v4：選択肢の表記は「1点」〜「10点」のみ（Lv.表記なし）
export const TASK_POINT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// v4：「1点」〜「5点」のみで表示（Lv.表記なし）
export const EXECUTION_LEVELS = [
  { score: 1, label: "指示された内容を正確に処理" },
  { score: 2, label: "定型的な法務知識を使って処理" },
  { score: 3, label: "自分で調査・判断して処理" },
  { score: 4, label: "複雑な論点について専門的に検討" },
  { score: 5, label: "高度・複雑な案件について主体的に対応" },
];

export const ENGAGEMENT_TASK_META: Record<string, { label: string; taskDesc: string; waitDesc: string }> = {
  poaStatus: { label: "委任状", taskDesc: "委任状の対応", waitDesc: "委任状：顧客からの返送待ち" },
  contractStatus: { label: "委任契約書", taskDesc: "委任契約書の対応", waitDesc: "委任契約書：顧客からの返送待ち" },
  retainerStatus: { label: "預り金", taskDesc: "預り金の対応", waitDesc: "預り金：顧客からの入金待ち" },
};

export function cycleValue<T>(list: readonly T[], current: T): T {
  const idx = list.indexOf(current);
  return list[(idx + 1) % list.length];
}

export function cycleColor(list: readonly string[], current: string): string {
  const idx = list.indexOf(current);
  if (idx === list.length - 1) return COLORS.moss;
  if (idx <= 0) return COLORS.slate;
  return COLORS.amber;
}

export function engagementStatusColor(status: string): string {
  if (status === "対応不要") return COLORS.slate;
  if (status === "未対応") return COLORS.vermillion;
  if (status === "発送済" || status === "請求済") return COLORS.amber;
  if (status === "受領済" || status === "締結済") return COLORS.moss;
  return COLORS.slate;
}
