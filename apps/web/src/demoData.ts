import type { Employee, InventoryItem, Shift } from "./types";

export const employees: Employee[] = [
  { id: "e1", name: "佐藤 美咲", initials: "SM", role: "店長", skills: ["ホール指導", "レジ", "発注"], weeklyMinutes: 2040, weeklyLimitMinutes: 2400, warning: "approaching" },
  { id: "e2", name: "田中 蓮", initials: "TR", role: "調理リーダー", skills: ["鍋場", "油場", "指導可"], weeklyMinutes: 1920, weeklyLimitMinutes: 2400, warning: "normal" },
  { id: "e3", name: "王 小雨", initials: "WX", role: "留学生アルバイト", skills: ["配膳", "レジ", "麺場補助"], weeklyMinutes: 1500, weeklyLimitMinutes: 1680, warning: "approaching" },
  { id: "e4", name: "鈴木 海", initials: "SK", role: "アルバイト", skills: ["洗い場", "仕込み補助"], weeklyMinutes: 960, weeklyLimitMinutes: 1680, warning: "normal" },
  { id: "e5", name: "Alex Chen", initials: "AC", role: "新人", skills: ["配膳・練習中"], weeklyMinutes: 600, weeklyLimitMinutes: 1680, warning: "normal" }
];

export const initialInventory: InventoryItem[] = [
  { id: "i1", name: "鶏もも肉", japaneseTerm: "鶏もも肉", state: "low", forecast: "本日 20:30 頃に不足見込み", recommendation: "2箱を16:00までに発注" },
  { id: "i2", name: "餃子の皮", japaneseTerm: "餃子の皮", state: "enough", forecast: "明日の営業終了まで十分" },
  { id: "i3", name: "キャベツ", japaneseTerm: "キャベツ", state: "urgent", forecast: "本日 18:40 頃に欠品見込み", recommendation: "3箱を至急発注" },
  { id: "i4", name: "食用油", japaneseTerm: "食用油", state: "enough", forecast: "残り約2.4日" },
  { id: "i5", name: "麺", japaneseTerm: "麺", state: "enough", forecast: "残り約1.8日" }
];

export const shifts: Shift[] = [
  { id: "s1", employee: "佐藤 美咲", area: "ホール・責任者", start: "10:00", end: "18:00" },
  { id: "s2", employee: "田中 蓮", area: "厨房・鍋場", start: "10:30", end: "21:30" },
  { id: "s3", employee: "王 小雨", area: "ホール・レジ", start: "17:00", end: "22:00", warning: "週28時間の89%" },
  { id: "s4", employee: "鈴木 海", area: "厨房・洗い場", start: "18:00", end: "22:30" }
];

export const featureCards = [
  { key: "incidents", icon: "message", title: "客诉与カスタマーハラスメント", summary: "记录事实、保护员工，并保留后续处理状态。", status: "1件待确认", tone: "danger" },
  { key: "reservations", icon: "calendar", title: "预约与无断キャンセル", summary: "确认预约、记录取消原因，避免口头信息遗漏。", status: "今日 12组", tone: "warning" },
  { key: "equipment", icon: "wrench", title: "设备维修", summary: "拍照报修、安排负责人，追踪到修复完成。", status: "2件进行中", tone: "warning" },
  { key: "allergens", icon: "shield", title: "过敏原与特殊饮食", summary: "按菜单和客人要求显示确认事项，不以颜色单独判断。", status: "3项已确认", tone: "normal" },
  { key: "crossStore", icon: "stores", title: "跨店支援", summary: "只向符合技能、时间和工时条件的员工发布支援请求。", status: "明日 1件", tone: "normal" },
  { key: "evaluations", icon: "star", title: "员工评价", summary: "记录事实和成长目标，避免只用主观印象打分。", status: "本月待完成 4人", tone: "neutral" }
] as const;

