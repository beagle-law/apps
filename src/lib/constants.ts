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
export const INVOICE_SECTION_TYPES = ["弁護士報酬", "実費お預かり金", "実費ご返金", "その他"];
export const GOAL_KEYS = [
  { key: "company", label: "全社目標" },
  { key: "ozaki", label: "尾崎目標" },
  { key: "iwashita", label: "岩下目標" },
] as const;

export const ENGAGEMENT_FIELD_LABEL: Record<string, string> = {
  poaStatus: "委任状",
  contractStatus: "委任契約書",
  retainerStatus: "預り金",
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
