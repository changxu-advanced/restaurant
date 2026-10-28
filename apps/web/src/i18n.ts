import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  ja: { translation: {
    product: "飲食業オンライン管理システム", today: "今日", schedule: "シフト", inventory: "在庫", chat: "チャット", me: "マイページ",
    employees: "スタッフ", closeout: "締め", settings: "設定", preOpen: "開店前", open: "営業中", lastOrder: "ラストオーダー", closed: "閉店済み",
    hello: "おはようございます", focus: "今日は3件の確認が必要です", attention: "対応が必要", normal: "正常", approaching: "上限接近", action: "要対応",
    support: "欠員支援", shortage: "ポジション不足", stockCheck: "在庫確認", handover: "引き継ぎ", timeline: "営業タイムライン", view: "確認する",
    enough: "十分", low: "少なめ", urgent: "至急", out: "欠品", save: "保存", allUnchanged: "すべて変更なし", applyYesterday: "昨日を適用",
    availability: "希望シフト", autoSchedule: "自動作成", publish: "公開", generate: "シフト案を作成", desired: "希望", available: "勤務可", unavailable: "不可",
    publicRoom: "店舗全体", noReply: "返信不要", beforeShift: "出勤前確認", send: "送信", unresolved: "未解決", resolved: "解決済み",
    sales: "売上", grossProfit: "粗利", laborCost: "人件費", cashDifference: "現金差額", provisional: "暫定", confirmClose: "締めを確認",
    colorAssist: "色覚サポート", language: "表示言語", readReceipts: "既読表示", demoRole: "デモ役割", manager: "店長", staff: "スタッフ",
    canSupport: "支援できます", partialSupport: "一部時間なら可能", cannotSupport: "すみません、今日は予定があります"
  }},
  zh: { translation: {
    product: "饮食业在线管理系统", today: "今日", schedule: "排班", inventory: "库存", chat: "聊天", me: "我的",
    employees: "员工", closeout: "日结", settings: "设置", preOpen: "营业前", open: "营业中", lastOrder: "Last Order", closed: "已闭店",
    hello: "早上好", focus: "今天有3项需要确认", attention: "需要处理", normal: "正常", approaching: "接近上限", action: "需要处理",
    support: "缺员支援", shortage: "岗位缺员", stockCheck: "库存确认", handover: "交接", timeline: "营业时间线", view: "查看",
    enough: "充足", low: "偏少", urgent: "紧急", out: "缺货", save: "保存", allUnchanged: "全部无变化", applyYesterday: "套用昨日",
    availability: "希望班次", autoSchedule: "自动排班", publish: "发布", generate: "生成班表草案", desired: "希望上班", available: "可以上班", unavailable: "不可上班",
    publicRoom: "门店全体", noReply: "无需回复", beforeShift: "上班前确认", send: "发送", unresolved: "未解决", resolved: "已解决",
    sales: "营业额", grossProfit: "毛利", laborCost: "人工成本", cashDifference: "现金差额", provisional: "暂定", confirmClose: "确认日结",
    colorAssist: "色弱模式", language: "显示语言", readReceipts: "已读显示", demoRole: "演示角色", manager: "店长", staff: "员工",
    canSupport: "可以支援", partialSupport: "可以支援部分时间", cannotSupport: "抱歉，今天有事"
  }},
  en: { translation: {
    product: "Restaurant Operations System", today: "Today", schedule: "Schedule", inventory: "Inventory", chat: "Chat", me: "My page",
    employees: "Team", closeout: "Closeout", settings: "Settings", preOpen: "Pre-open", open: "Open", lastOrder: "Last order", closed: "Closed",
    hello: "Good morning", focus: "Three items need your attention today", attention: "Needs attention", normal: "Normal", approaching: "Near limit", action: "Action needed",
    support: "Shift support", shortage: "Position shortage", stockCheck: "Stock check", handover: "Handover", timeline: "Service timeline", view: "Review",
    enough: "Enough", low: "Low", urgent: "Urgent", out: "Out of stock", save: "Save", allUnchanged: "No changes", applyYesterday: "Use yesterday",
    availability: "Availability", autoSchedule: "Auto schedule", publish: "Publish", generate: "Generate draft", desired: "Prefer", available: "Available", unavailable: "Unavailable",
    publicRoom: "Store room", noReply: "No reply needed", beforeShift: "Confirm before shift", send: "Send", unresolved: "Open", resolved: "Resolved",
    sales: "Sales", grossProfit: "Gross profit", laborCost: "Labor cost", cashDifference: "Cash difference", provisional: "Provisional", confirmClose: "Confirm closeout",
    colorAssist: "Color assistance", language: "Language", readReceipts: "Read receipts", demoRole: "Demo role", manager: "Manager", staff: "Staff",
    canSupport: "I can help", partialSupport: "I can help for part of the shift", cannotSupport: "Sorry, I have plans today"
  }}
};

void i18n.use(initReactI18next).init({
  resources,
  lng: typeof localStorage === "undefined" ? "ja" : localStorage.getItem("locale") ?? "ja",
  fallbackLng: "ja",
  interpolation: { escapeValue: false }
});

export default i18n;

