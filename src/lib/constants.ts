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

export const CASE_CATEGORIES = ["非訟事件", "訴訟事件"] as const;

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

export const RESPONSE_TYPES = ["通知書", "任意交渉", "訴状", "その他法律業務"];
export const BALL_OWNERS = ["事務所", "相手方", "クライアント", "裁判所", "その他"];
export const BALL_COLOR: Record<string, string> = {
  事務所: COLORS.vermillion,
  相手方: COLORS.slate,
  クライアント: COLORS.amber,
  裁判所: COLORS.navy,
  その他: COLORS.slate,
};

export const POA_STATUSES = ["未発送", "発送済み", "回収済み"];
export const CONTRACT_STATUSES = ["未発送", "発送済み", "締結済み"];
export const RETAINER_STATUSES = ["不要", "要（未入金）", "要（入金済み）"];
export const QUESTION_STATUSES = ["質問中", "回答済み・未反映", "反映済み"];
export const DOC_STATUSES = ["未着手", "作成中", "提出済み"];
export const TASK_STATUSES = ["未着手", "対応中", "完了"];
export const PRIORITIES = ["通常", "至急"];

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
