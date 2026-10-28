import type {
  EmployeeDetail,
  EmployeeLaborMonitor,
  EmployeeRequest,
  EmployeeChangeRequest,
  EmployeeStatus,
  EmployeeSummary,
  EmployeeWarning,
  StudentWorkPeriod,
  StoreSettings
} from "./employeeApi";

const STORAGE_KEY = "restaurant-ops.employee-mock.v3";
const BOUNDARY_DATA_VERSION_KEY = `${STORAGE_KEY}.boundary-v3`;
const BOUNDARY_DATA_VERSION = "5";
const CHANGE_REQUESTS_KEY = "restaurant-ops.employee-change-requests.v1";

export const residenceStatusOptions = ["留学", "特定技能", "技術・人文知識・国際業務", "永住者", "日本人の配偶者等", "定住者", "家族滞在", "なし"] as const;

export const demoStoreSettings: StoreSettings = {
  storeId: "demo-store-osaka-chuo",
  prefecture: "大阪府",
  minimumWageYen: 1231
};

type MockSkill = EmployeeDetail["skills"][number];
type MockAvailability = EmployeeDetail["availability"][number];
type MockRecord = EmployeeDetail;

const skill = (id: string, area: string, positionName: string, level: string, independent: boolean, canTrain = false): MockSkill => ({ id, area, positionName, level, independent, canTrain });
const slot = (id: string, weekday: number, slotStart: string, slotEnd: string, preference: string): MockAvailability => ({ id, effectiveFrom: "2026-10-01", effectiveTo: "2026-12-31", weekday, slotStart, slotEnd, preference });

export function studentWeeklyLimitMinutes(period: StudentWorkPeriod = "TERM"): number {
  return period === "LONG_VACATION" ? 40 * 60 : 28 * 60;
}

function laborMonitorFor(employmentType: string, weeklyMinutes: number, outsideWorkMinutes: number, weeklyLimitMinutes: number, monthlyMinutes?: number, studentWorkPeriod: StudentWorkPeriod = "TERM", status: EmployeeStatus = "ACTIVE"): EmployeeLaborMonitor & { warning: EmployeeSummary["warning"] } {
  const inactiveBasis = employmentType === "PART_TIME" ? "PART_TIME_NO_IMMIGRATION_CAP" : "MONTHLY_OVERTIME";
  if (status === "ON_LEAVE") return { basis: inactiveBasis, standardPeriod: "NONE", limitMode: "NONE", periodMinutes: 0, standardMinutes: 0, overtimeMinutes: 0, overtimeLimitMinutes: 0, hardLimitMinutes: 0, remainingMinutes: 0, agreementConfigured: false, scheduleBlocked: false, warning: { level: "NORMAL", percent: 0, reason: "休職中・現在の出勤なし" } };
  if (status === "INACTIVE") return { basis: inactiveBasis, standardPeriod: "NONE", limitMode: "NONE", periodMinutes: weeklyMinutes, standardMinutes: 0, overtimeMinutes: 0, overtimeLimitMinutes: 0, hardLimitMinutes: 0, remainingMinutes: 0, agreementConfigured: false, scheduleBlocked: false, warning: { level: "NORMAL", percent: 0, reason: "退職済み・現在の排班対象外" } };
  const monthlyBasis = employmentType === "FULL_TIME" || employmentType === "SPECIFIED_SKILLED";
  if (monthlyBasis) {
    const periodMinutes = monthlyMinutes ?? Math.round((weeklyMinutes * 52) / 12);
    const standardMinutes = Math.round((weeklyLimitMinutes * 52) / 12);
    const overtimeMinutes = Math.max(0, periodMinutes - standardMinutes);
    const overtimeLimitMinutes = 45 * 60;
    const hardLimitMinutes = 100 * 60;
    const percent = Math.round((overtimeMinutes / overtimeLimitMinutes) * 100);
    const scheduleBlocked = overtimeMinutes >= hardLimitMinutes;
    const level: EmployeeWarning = scheduleBlocked ? "ACTION" : percent >= 80 ? "APPROACHING" : "NORMAL";
    const reason = level === "ACTION" ? "時間外労働が月間上限を超過しています" : level === "APPROACHING" ? "月45時間の時間外労働枠に接近しています" : "36協定の時間外労働枠内です";
    return { basis: "MONTHLY_OVERTIME", standardPeriod: "MONTH", limitMode: "HARD", periodMinutes, standardMinutes, overtimeMinutes, overtimeLimitMinutes, hardLimitMinutes, remainingMinutes: Math.max(0, overtimeLimitMinutes - overtimeMinutes), agreementConfigured: true, scheduleBlocked, scheduleBlockReason: scheduleBlocked ? "月間の法定上限を超えるため追加の排班不可" : undefined, warning: { level, percent, reason } };
  }
  if (employmentType === "PART_TIME") {
    return { basis: "PART_TIME_NO_IMMIGRATION_CAP", standardPeriod: "CONTRACT_REFERENCE", limitMode: "REFERENCE", periodMinutes: weeklyMinutes, standardMinutes: weeklyLimitMinutes, overtimeMinutes: 0, overtimeLimitMinutes: 0, hardLimitMinutes: Number.MAX_SAFE_INTEGER, remainingMinutes: 0, agreementConfigured: false, scheduleBlocked: false, warning: { level: "NORMAL", percent: 0, reason: "一般アルバイトは留学生の工時硬上限の対象外です" } };
  }
  const strictLimitMinutes = employmentType === "STUDENT_PART_TIME" ? studentWeeklyLimitMinutes(studentWorkPeriod) : weeklyLimitMinutes;
  const actualMinutes = weeklyMinutes + outsideWorkMinutes;
  const percent = Math.round((actualMinutes / strictLimitMinutes) * 100);
  const level: EmployeeWarning = percent >= 100 ? "ACTION" : percent >= 80 ? "APPROACHING" : "NORMAL";
  const reason = level === "ACTION" ? employmentType === "STUDENT_PART_TIME" ? "本店と他の勤務先を合わせた週上限に達したため追加の排班不可" : "週上限に達したため追加の排班不可" : level === "APPROACHING" ? "週上限の80%以上です" : "適用上限内です";
  return { basis: "WEEKLY_LIMIT", standardPeriod: "WEEK", limitMode: "HARD", studentWorkPeriod: employmentType === "STUDENT_PART_TIME" ? studentWorkPeriod : undefined, periodMinutes: actualMinutes, standardMinutes: strictLimitMinutes, overtimeMinutes: 0, overtimeLimitMinutes: 0, hardLimitMinutes: strictLimitMinutes, remainingMinutes: Math.max(0, strictLimitMinutes - actualMinutes), agreementConfigured: true, scheduleBlocked: actualMinutes >= strictLimitMinutes, scheduleBlockReason: actualMinutes >= strictLimitMinutes ? "本店と他の勤務先を合わせた週上限に達したため追加の排班不可" : undefined, warning: { level, percent, reason } };
}

function warningFor(employmentType: string, weeklyMinutes: number, outsideWorkMinutes: number, weeklyLimitMinutes: number, monthlyMinutes?: number, studentWorkPeriod: StudentWorkPeriod = "TERM"): EmployeeSummary["warning"] {
  return laborMonitorFor(employmentType, weeklyMinutes, outsideWorkMinutes, weeklyLimitMinutes, monthlyMinutes, studentWorkPeriod).warning;
}

function record(
  id: string,
  displayName: string,
  initials: string,
  employmentType: string,
  roleTitle: string,
  weeklyMinutes: number,
  weeklyLimitMinutes: number,
  outsideWorkMinutes: number,
  hourlyWageYen: number,
  experienceMonths: number,
  commuteMinutes: number,
  laborRuleCode: string,
  traits: string,
  notes: string,
  skills: MockSkill[],
  availability: MockAvailability[],
  residenceStatus?: string,
  residenceExpiryDate?: string,
  status: EmployeeStatus = "ACTIVE",
  monthlyMinutes?: number,
  studentWorkPeriod: StudentWorkPeriod = "TERM",
  training?: MockRecord["training"]
): MockRecord {
  const strictWeeklyLimitMinutes = employmentType === "STUDENT_PART_TIME" ? studentWeeklyLimitMinutes(studentWorkPeriod) : weeklyLimitMinutes;
  const laborMonitor = laborMonitorFor(employmentType, weeklyMinutes, outsideWorkMinutes, strictWeeklyLimitMinutes, monthlyMinutes, studentWorkPeriod, status);
  const summary: EmployeeSummary = {
    id,
    displayName,
    initials,
    employmentType,
    roleTitle,
    experienceMonths,
    skills: skills.map((item) => item.positionName),
    weeklyMinutes,
    weeklyLimitMinutes: strictWeeklyLimitMinutes,
    status,
    outsideWorkMinutes,
    warning: laborMonitor.warning,
    monthlyMinutes: laborMonitor.basis === "MONTHLY_OVERTIME" ? laborMonitor.periodMinutes : undefined,
    studentWorkPeriod: employmentType === "STUDENT_PART_TIME" ? studentWorkPeriod : undefined,
    laborMonitor,
    version: 1
  };
  return {
    employee: summary,
    profile: { hourlyWageYen, experienceMonths, commuteMinutes, traits, notes, outsideWorkMinutes, residenceStatus, residenceExpiryDate, laborRuleCode },
    contract: { contractType: employmentType, startsOn: "2026-04-01", targetMinutes: weeklyLimitMinutes, limitMinutes: weeklyLimitMinutes, lateShiftAllowed: employmentType !== "STUDENT_PART_TIME" },
    skills,
    training: training ?? [{ id: `${id}-training-1`, trainingKey: "food-safety-basics", status: skills.some((item) => item.independent) ? "COMPLETED" : "IN_PROGRESS" }],
    availability
  };
}

export const initialEmployeeRecords: MockRecord[] = [
  record("e1", "佐藤 美咲", "SM", "FULL_TIME", "店長", 2040, 2400, 0, 2040, 84, 30, "FULL_TIME", "判断が早く、教えるのが得意", "発注と閉店確認を担当", [skill("e1-s1", "FRONT", "ホール指導", "CAN_TRAIN", true, true), skill("e1-s2", "FRONT", "レジ", "INDEPENDENT", true)], [slot("e1-a1", 1, "09:00", "18:00", "DESIRED"), slot("e1-a2", 5, "10:00", "19:00", "AVAILABLE")]),
  record("e2", "田中 蓮", "TR", "SPECIFIED_SKILLED", "調理リーダー", 1920, 2400, 0, 1920, 60, 30, "SPECIFIED_SKILLED", "ピーク時も落ち着いている", "鍋場と新人の指導を担当", [skill("e2-s1", "KITCHEN", "鍋場", "INDEPENDENT", true, true), skill("e2-s2", "KITCHEN", "油場", "INDEPENDENT", true), skill("e2-s3", "KITCHEN", "新人指導", "CAN_TRAIN", true, true)], [slot("e2-a1", 2, "10:00", "21:00", "DESIRED"), slot("e2-a2", 6, "10:00", "21:00", "AVAILABLE")]),
  record("e3", "王 小雨", "WX", "STUDENT_PART_TIME", "留学生アルバイト", 1500, 1680, 120, 1150, 18, 30, "STUDENT_PART_TIME", "接客が丁寧で多言語対応", "他の勤務先の申告あり", [skill("e3-s1", "FRONT", "配膳", "INDEPENDENT", true), skill("e3-s2", "FRONT", "レジ", "CAN_ASSIST", false), skill("e3-s3", "KITCHEN", "麺場補助", "CAN_ASSIST", false)], [slot("e3-a1", 1, "17:00", "22:00", "DESIRED"), slot("e3-a2", 4, "17:00", "22:00", "AVAILABLE")], "留学", "2027-03-31"),
  record("e4", "鈴木 海", "SK", "PART_TIME", "洗い場・仕込み", 960, 960, 0, 1080, 30, 15, "PART_TIME", "手順を守り、作業が安定", "仕込み開始時刻に注意", [skill("e4-s1", "KITCHEN", "洗い場", "INDEPENDENT", true), skill("e4-s2", "KITCHEN", "仕込み補助", "CAN_ASSIST", false)], [slot("e4-a1", 3, "17:00", "22:00", "DESIRED"), slot("e4-a2", 5, "18:00", "22:00", "AVAILABLE")]),
  record("e5", "Alex Chen", "AC", "PART_TIME", "ホール新人", 600, 600, 0, 1120, 2, 45, "PART_TIME", "日本語を勉強中、笑顔が多い", "安全教材を学習中", [skill("e5-s1", "FRONT", "配膳", "LEARNING", false)], [slot("e5-a1", 6, "17:00", "22:00", "DESIRED")]),
  record("e6", "山本 明日香", "YA", "FULL_TIME", "副店長", 2250, 2400, 0, 1820, 48, 15, "FULL_TIME", "全体を見るのが得意", "ランチ帯の責任者", [skill("e6-s1", "FRONT", "ホール", "INDEPENDENT", true), skill("e6-s2", "FRONT", "レジ", "INDEPENDENT", true), skill("e6-s3", "FRONT", "新人指導", "CAN_TRAIN", true, true)], [slot("e6-a1", 1, "08:00", "17:00", "DESIRED"), slot("e6-a2", 4, "08:00", "17:00", "AVAILABLE")]),
  record("e7", "高橋 健", "TK", "SPECIFIED_SKILLED", "麺場リーダー", 2100, 2400, 0, 1760, 42, 30, "SPECIFIED_SKILLED", "スピードと正確さを両立", "在留期限を確認予定", [skill("e7-s1", "KITCHEN", "麺場", "INDEPENDENT", true, true), skill("e7-s2", "KITCHEN", "配膳", "INDEPENDENT", true)], [slot("e7-a1", 2, "11:00", "23:00", "DESIRED"), slot("e7-a2", 5, "11:00", "23:00", "AVAILABLE")], "特定技能", "2027-08-31"),
  record("e8", "李 明", "LM", "STUDENT_PART_TIME", "ホール兼務", 1320, 1680, 180, 1180, 12, 30, "STUDENT_PART_TIME", "中国語と英語で接客できます", "兼業合計接近上限", [skill("e8-s1", "FRONT", "迎賓", "CAN_ASSIST", false), skill("e8-s2", "FRONT", "外販", "INDEPENDENT", true)], [slot("e8-a1", 3, "17:00", "22:00", "DESIRED"), slot("e8-a2", 6, "12:00", "18:00", "AVAILABLE")], "留学", "2027-02-28"),
  record("e9", "中村 翔", "NS", "PART_TIME", "後厨房アルバイト", 1080, 1080, 0, 1050, 24, 15, "PART_TIME", "体力好、動きが安定", "夕食の仕込みを単独で担当できます", [skill("e9-s1", "KITCHEN", "仕込み", "INDEPENDENT", true), skill("e9-s2", "KITCHEN", "清掃", "INDEPENDENT", true)], [slot("e9-a1", 4, "16:00", "22:00", "DESIRED"), slot("e9-a2", 6, "16:00", "22:00", "AVAILABLE")]),
  record("e10", "Maria Santos", "MS", "PART_TIME", "洗い場サポート", 720, 720, 0, 1100, 9, 30, "PART_TIME", "細かい作業が得意で、閉店作業に向いています", "閉店シフトに対応できます", [skill("e10-s1", "KITCHEN", "洗い場", "CAN_ASSIST", false), skill("e10-s2", "KITCHEN", "閉店清掃", "LEARNING", false)], [slot("e10-a1", 5, "18:00", "23:00", "DESIRED")]),
  record("e11", "佐々木 恒一", "KS", "FULL_TIME", "深夜責任者", 2520, 2400, 0, 2100, 96, 45, "FULL_TIME", "深夜帯の判断が早い", "月210時間前後。36協定の範囲を確認", [skill("e11-s1", "KITCHEN", "鍋場", "INDEPENDENT", true, true), skill("e11-s2", "FRONT", "閉店", "INDEPENDENT", true)], [slot("e11-a1", 2, "14:00", "23:00", "DESIRED"), slot("e11-a2", 5, "14:00", "23:00", "AVAILABLE")], undefined, undefined, "ACTIVE", 12600),
  record("e12", "山口 里奈", "YR", "STUDENT_PART_TIME", "留学生ホール", 1620, 1680, 180, 1231, 10, 30, "STUDENT_PART_TIME", "他店との兼業あり", "兼業合計で週上限超過", [skill("e12-s1", "FRONT", "配膳", "INDEPENDENT", true), skill("e12-s2", "FRONT", "レジ", "CAN_ASSIST", false)], [slot("e12-a1", 1, "17:00", "23:00", "DESIRED"), slot("e12-a2", 6, "17:00", "23:00", "AVAILABLE")], "留学", "2027-01-31"),
  record("e13", "井上 恒一", "IK", "FULL_TIME", "調理担当", 0, 2400, 0, 1850, 72, 30, "FULL_TIME", "復職予定を確認中", "休職中・シフト割当なし", [skill("e13-s1", "KITCHEN", "仕込み", "INDEPENDENT", true)], [], undefined, undefined, "ON_LEAVE"),
  record("e14", "小林 麻衣", "KM", "PART_TIME", "ホールサポート", 1560, 1560, 0, 1100, 20, 15, "PART_TIME", "退職済み", "過去のシフト履歴を保持", [skill("e14-s1", "FRONT", "配膳", "INDEPENDENT", true)], [slot("e14-a1", 4, "17:00", "22:00", "AVAILABLE")], undefined, undefined, "INACTIVE"),
  record("e15", "伊藤 直子", "IN", "FULL_TIME", "ランチ責任者", 1920, 2400, 0, 1780, 36, 20, "FULL_TIME", "ランチ帯に強い", "月間標準の80%程度", [skill("e15-s1", "FRONT", "ホール", "INDEPENDENT", true), skill("e15-s2", "FRONT", "新人指導", "CAN_TRAIN", true, true)], [slot("e15-a1", 1, "08:00", "17:00", "DESIRED")]),
  record("e16", "森田 恒一", "MK", "PART_TIME", "閉店清掃", 2040, 2160, 0, 1150, 15, 60, "PART_TIME", "閉店作業を担当", "店内契約参考36時間・今週34時間", [skill("e16-s1", "KITCHEN", "閉店清掃", "INDEPENDENT", true)], [slot("e16-a1", 5, "17:00", "23:00", "DESIRED")]),
  record("e17", "藤田 恒一", "FH", "FULL_TIME", "店長補佐", 2280, 2400, 0, 1980, 66, 0, "FULL_TIME", "新人の配置を調整", "月間標準内で安定", [skill("e17-s1", "FRONT", "ホール管理", "CAN_TRAIN", true, true)], [slot("e17-a1", 1, "09:00", "18:00", "DESIRED")], undefined, undefined, "ACTIVE", 10200),
  record("e18", "吉田 亮", "YR2", "FULL_TIME", "調理主任", 2400, 2400, 0, 2050, 78, 15, "FULL_TIME", "ピーク対応が得意", "月間時間外労働が警戒線に接近", [skill("e18-s1", "KITCHEN", "調理全般", "INDEPENDENT", true), skill("e18-s2", "KITCHEN", "新人指導", "CAN_TRAIN", true, true)], [slot("e18-a1", 2, "10:00", "19:00", "DESIRED")], undefined, undefined, "ACTIVE", 12600),
  record("e19", "中島 拓真", "NT", "FULL_TIME", "深夜統括", 2400, 2400, 0, 2180, 108, 45, "FULL_TIME", "深夜帯を統括", "法定上限超過のため追加排班不可", [skill("e19-s1", "KITCHEN", "深夜責任者", "CAN_TRAIN", true, true)], [slot("e19-a1", 5, "14:00", "23:00", "DESIRED")], undefined, undefined, "ACTIVE", 16500),
  record("e20", "小川 健太", "OK", "SPECIFIED_SKILLED", "特定技能調理", 2400, 2400, 0, 1900, 30, 30, "SPECIFIED_SKILLED", "衛生管理を徹底", "月210時間前後の勤務例", [skill("e20-s1", "KITCHEN", "調理", "INDEPENDENT", true, true)], [slot("e20-a1", 3, "11:00", "22:00", "DESIRED")], "特定技能", "2027-10-31", "ACTIVE", 12600),
  record("e21", "山田 直人", "YN", "SPECIFIED_SKILLED", "ホールリーダー", 2400, 2400, 0, 1880, 54, 15, "SPECIFIED_SKILLED", "接客品質が安定", "時間外労働は通常範囲", [skill("e21-s1", "FRONT", "接客", "INDEPENDENT", true), skill("e21-s2", "FRONT", "レジ教育", "CAN_TRAIN", true, true)], [slot("e21-a1", 4, "08:00", "17:00", "AVAILABLE")], "特定技能", "2028-01-31", "ACTIVE", 11200),
  record("e22", "林 玲", "HR", "STUDENT_PART_TIME", "留学生ホール", 0, 1680, 0, 1231, 1, 0, "STUDENT_PART_TIME", "勤務開始前", "今週の出勤予定なし", [skill("e22-s1", "FRONT", "配膳", "NOT_STARTED", false)], [], "留学", "2027-03-31"),
  record("e23", "周 健", "ZJ", "STUDENT_PART_TIME", "留学生キッチン", 1260, 1680, 0, 1250, 8, 15, "STUDENT_PART_TIME", "繁忙帯を学習中", "週上限に接近", [skill("e23-s1", "KITCHEN", "仕込み", "LEARNING", false)], [slot("e23-a1", 2, "17:00", "23:00", "DESIRED")], "留学", "2027-03-31"),
  record("e24", "趙 蓮", "ZL", "STUDENT_PART_TIME", "留学生レジ", 1440, 1680, 240, 1270, 14, 30, "STUDENT_PART_TIME", "会計を担当", "本店24時間・兼業4時間で週28時間", [skill("e24-s1", "FRONT", "レジ", "INDEPENDENT", true)], [slot("e24-a1", 1, "17:00", "23:00", "DESIRED")], "留学", "2027-02-28"),
  record("e25", "高橋 莉奈", "TL", "STUDENT_PART_TIME", "留学生ホール", 2400, 1680, 0, 1300, 20, 60, "STUDENT_PART_TIME", "長期休暇は勤務時間を増やせます", "長期休暇中は週40時間まで", [skill("e25-s1", "FRONT", "接客", "INDEPENDENT", true)], [slot("e25-a1", 6, "09:00", "18:00", "DESIRED")], "留学", "2027-03-31", "ACTIVE", undefined, "LONG_VACATION"),
  record("e26", "吴 洋", "WY", "STUDENT_PART_TIME", "留学生調理補助", 1380, 1680, 0, 1210, 6, 30, "STUDENT_PART_TIME", "調理補助を習得中", "週上限の80%以上", [skill("e26-s1", "KITCHEN", "調理補助", "CAN_ASSIST", false)], [slot("e26-a1", 4, "17:00", "23:00", "AVAILABLE")], "留学", "2027-03-31"),
  record("e27", "松本 葵", "MA", "PART_TIME", "洗い場", 0, 1200, 0, 1080, 4, 15, "PART_TIME", "登録のみ", "今週の勤務実績なし", [skill("e27-s1", "KITCHEN", "洗い場", "NOT_STARTED", false)], [slot("e27-a1", 5, "18:00", "22:00", "AVAILABLE")]),
  record("e28", "加藤 翼", "KT", "PART_TIME", "仕込み補助", 600, 1200, 0, 1100, 11, 30, "PART_TIME", "仕込みを練習中", "契約参考20時間未満", [skill("e28-s1", "KITCHEN", "仕込み", "LEARNING", false)], [slot("e28-a1", 3, "16:00", "21:00", "DESIRED")]),
  record("e29", "佐々木 葵", "SA", "PART_TIME", "ホール担当", 1800, 1800, 0, 1160, 28, 30, "PART_TIME", "接客が安定", "店内契約参考30時間ちょうど", [skill("e29-s1", "FRONT", "ホール", "INDEPENDENT", true)], [slot("e29-a1", 2, "17:00", "23:00", "DESIRED"), slot("e29-a2", 6, "12:00", "18:00", "AVAILABLE")]),
  record("e30", "石井 陽介", "IY", "PART_TIME", "調理補助", 2400, 1800, 0, 1190, 33, 45, "PART_TIME", "忙しい時間帯に対応", "契約参考を超過・留学生上限対象外", [skill("e30-s1", "KITCHEN", "調理補助", "INDEPENDENT", true)], [slot("e30-a1", 1, "17:00", "23:00", "DESIRED")]),
  record("e31", "森 彩", "MA2", "PART_TIME", "ホールサポート", 900, 2160, 0, 1070, 7, 60, "PART_TIME", "時間帯未登録", "希望時間帯の登録なし", [skill("e31-s1", "FRONT", "ホール", "CAN_ASSIST", false)], []),
  record("e32", "井口 優", "IU", "FULL_TIME", "調理担当", 0, 2400, 0, 1860, 40, 30, "FULL_TIME", "療養のため休職", "休職理由：療養・予定復職2027-01-15", [skill("e32-s1", "KITCHEN", "仕込み", "INDEPENDENT", true)], [], undefined, undefined, "ON_LEAVE"),
  record("e33", "小林 真", "KM2", "PART_TIME", "ホールサポート", 1560, 1560, 0, 1120, 18, 15, "PART_TIME", "退職済み", "過去の工時履歴を保持", [skill("e33-s1", "FRONT", "配膳", "INDEPENDENT", true)], [slot("e33-a1", 4, "17:00", "22:00", "AVAILABLE")], undefined, undefined, "INACTIVE"),
  record("e34", "岡本 彩", "OA", "PART_TIME", "新人スタッフ", 300, 1200, 0, 1050, 0, 0, "PART_TIME", "入社直後", "研修記録なし・技能未開始", [skill("e34-s1", "FRONT", "配膳", "NOT_STARTED", false)], [slot("e34-a1", 6, "17:00", "21:00", "DESIRED")], undefined, undefined, "ACTIVE", undefined, "TERM", []),
  record("e35", "山下 由美", "YY", "FULL_TIME", "教育担当", 2160, 2400, 0, 2000, 120, 30, "FULL_TIME", "複数ポジションを指導", "複数技能・新人を担当", [skill("e35-s1", "FRONT", "ホール", "CAN_TRAIN", true, true), skill("e35-s2", "FRONT", "レジ", "CAN_TRAIN", true, true), skill("e35-s3", "KITCHEN", "仕込み", "INDEPENDENT", true)], [slot("e35-a1", 1, "08:00", "17:00", "DESIRED"), slot("e35-a2", 3, "10:00", "19:00", "AVAILABLE"), slot("e35-a3", 6, "09:00", "18:00", "PREFERRED")]),
  record("e36", "高田 健", "TK2", "PART_TIME", "地元ホール担当", 1200, 1440, 0, 1231, 22, 30, "PART_TIME", "地域採用・契約完備", "在留資格の制限なし", [skill("e36-s1", "FRONT", "ホール", "INDEPENDENT", true)], [slot("e36-a1", 2, "17:00", "22:00", "DESIRED")], "なし")
];

function cloneRecords(records: MockRecord[]): MockRecord[] {
  return JSON.parse(JSON.stringify(records)) as MockRecord[];
}

function readRecords(): MockRecord[] {
  if (typeof window === "undefined") return cloneRecords(initialEmployeeRecords);
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const initial = cloneRecords(initialEmployeeRecords);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    window.localStorage.setItem(BOUNDARY_DATA_VERSION_KEY, BOUNDARY_DATA_VERSION);
    return initial;
  }
  try {
    const parsed = JSON.parse(stored) as MockRecord[];
    const initialById = new Map(initialEmployeeRecords.map((item) => [item.employee.id, item]));
    const needsMigration = window.localStorage.getItem(BOUNDARY_DATA_VERSION_KEY) !== BOUNDARY_DATA_VERSION;
    const migrated = needsMigration ? parsed.map((item) => {
      const initial = initialById.get(item.employee.id);
      if (!initial || item.employee.employmentType !== "PART_TIME" || item.employee.weeklyLimitMinutes !== 1680) return item;
      item.employee.weeklyLimitMinutes = initial.employee.weeklyLimitMinutes;
      if (item.contract) {
        item.contract.targetMinutes = initial.contract?.targetMinutes ?? initial.employee.weeklyLimitMinutes;
        item.contract.limitMinutes = item.contract.targetMinutes;
      }
      if (item.employee.id === "e16" && item.employee.weeklyMinutes === 1680) {
        item.employee.weeklyMinutes = initial.employee.weeklyMinutes;
        item.profile.notes = initial.profile.notes;
      }
      return item;
    }) : parsed;
    const existingIds = new Set(parsed.map((item) => item.employee.id));
    const additions = initialEmployeeRecords.filter((item) => !existingIds.has(item.employee.id));
    const merged = [...migrated, ...cloneRecords(additions)];
    const missingLaborMonitor = merged.some((item) => !item.employee.laborMonitor);
    if (additions.length > 0 || migrated !== parsed || missingLaborMonitor || needsMigration) {
      merged.forEach((item) => {
        const initial = initialById.get(item.employee.id);
        if (initial?.employee.monthlyMinutes !== undefined && item.employee.monthlyMinutes === undefined) item.employee.monthlyMinutes = initial.employee.monthlyMinutes;
        if (initial?.employee.studentWorkPeriod && !item.employee.studentWorkPeriod) item.employee.studentWorkPeriod = initial.employee.studentWorkPeriod;
        refreshSummary(item);
      });
      writeRecords(merged);
      window.localStorage.setItem(BOUNDARY_DATA_VERSION_KEY, BOUNDARY_DATA_VERSION);
      return merged;
    }
    return parsed;
  } catch {
    const initial = cloneRecords(initialEmployeeRecords);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

function writeRecords(records: MockRecord[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function validateEmployeeRequest(payload: EmployeeRequest, requireWage: boolean): void {
  if (!payload.displayName.trim()) throw new Error("スタッフ名を入力してください。");
  if (!payload.roleTitle.trim()) throw new Error("担当ポジションを入力してください。");
  if (requireWage && (payload.hourlyWageYen === undefined || payload.hourlyWageYen <= 0)) throw new Error("最低時給が未設定のため保存できません。");
  if (payload.hourlyWageYen !== undefined && (!Number.isFinite(payload.hourlyWageYen) || payload.hourlyWageYen <= 0)) throw new Error("時給は0より大きい数値で入力してください。");
  if (!Number.isInteger(payload.experienceMonths) || payload.experienceMonths < 0) throw new Error("経験月数を正しく入力してください。");
  if (!Number.isInteger(payload.commuteMinutes) || payload.commuteMinutes < 0) throw new Error("通勤時間を正しく入力してください。");
  if (!Number.isInteger(payload.outsideWorkMinutes) || payload.outsideWorkMinutes < 0 || payload.outsideWorkMinutes > 28 * 60) throw new Error("兼業申告は0〜28時間の範囲で入力してください。");
  const target = payload.contractTargetMinutes ?? payload.weeklyLimitMinutes;
  const limit = payload.contractLimitMinutes ?? payload.weeklyLimitMinutes;
  if (!Number.isInteger(target) || target <= 0 || !Number.isInteger(limit) || limit < target) throw new Error("契約上限は契約目標以上で入力してください。");
}

function readChangeRequests(): EmployeeChangeRequest[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(CHANGE_REQUESTS_KEY) ?? "[]") as EmployeeChangeRequest[]; } catch { return []; }
}
function writeChangeRequests(requests: EmployeeChangeRequest[]): void { window.localStorage.setItem(CHANGE_REQUESTS_KEY, JSON.stringify(requests)); }

function refreshSummary(recordToRefresh: MockRecord): void {
  const summary = recordToRefresh.employee;
  const studentWorkPeriod = summary.studentWorkPeriod ?? "TERM";
  if (summary.employmentType === "STUDENT_PART_TIME") summary.weeklyLimitMinutes = studentWeeklyLimitMinutes(studentWorkPeriod);
  const laborMonitor = laborMonitorFor(summary.employmentType, summary.weeklyMinutes, summary.outsideWorkMinutes, summary.weeklyLimitMinutes, summary.monthlyMinutes, studentWorkPeriod, summary.status);
  summary.laborMonitor = laborMonitor;
  summary.warning = laborMonitor.warning;
  summary.skills = recordToRefresh.skills.map((item) => item.positionName);
  summary.experienceMonths = recordToRefresh.profile.experienceMonths;
  summary.version += 1;
}

export async function listEmployees(filters: { query?: string; status?: string; employmentType?: string; roleTitle?: string; warning?: string } = {}): Promise<EmployeeSummary[]> {
  const query = filters.query?.trim().toLocaleLowerCase();
  return readRecords().map((item) => item.employee).filter((employee) => {
    const matchesQuery = !query || [employee.displayName, employee.roleTitle, ...employee.skills].join(" ").toLocaleLowerCase().includes(query);
    return matchesQuery && (!filters.status || employee.status === filters.status) && (!filters.employmentType || employee.employmentType === filters.employmentType) && (!filters.roleTitle || employee.roleTitle === filters.roleTitle) && (!filters.warning || employee.warning.level === filters.warning);
  });
}

export async function getStoreSettings(): Promise<StoreSettings> {
  return { ...demoStoreSettings };
}

export async function getEmployee(id: string): Promise<EmployeeDetail> {
  const found = readRecords().find((item) => item.employee.id === id);
  if (!found) throw new Error("スタッフが見つかりません。");
  return found;
}

export async function createEmployee(payload: EmployeeRequest): Promise<EmployeeSummary> {
  validateEmployeeRequest(payload, true);
  const hourlyWageYen = payload.hourlyWageYen!;
  const records = readRecords();
  const id = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const skills = payload.skills.map((positionName, index) => skill(`${id}-s${index}`, "FRONT", positionName, "LEARNING", false));
  const residenceStatus = residenceStatusOptions.includes(payload.residenceStatus as typeof residenceStatusOptions[number]) ? payload.residenceStatus : "なし";
  const effectiveLimit = payload.employmentType === "FULL_TIME" || payload.employmentType === "SPECIFIED_SKILLED" ? payload.contractTargetMinutes ?? payload.weeklyLimitMinutes : payload.contractLimitMinutes ?? payload.weeklyLimitMinutes;
  const created = record(id, payload.displayName, payload.displayName.slice(0, 2).toUpperCase(), payload.employmentType, payload.roleTitle || "新規スタッフ", 0, effectiveLimit, payload.outsideWorkMinutes, hourlyWageYen, payload.experienceMonths, payload.commuteMinutes, payload.laborRuleCode, payload.traits, payload.notes, skills, [] , residenceStatus, payload.residenceExpiryDate);
  created.contract = { ...created.contract!, targetMinutes: payload.contractTargetMinutes ?? payload.weeklyLimitMinutes, limitMinutes: payload.contractLimitMinutes ?? payload.weeklyLimitMinutes };
  created.profile.phone = payload.phone;
  records.push(created);
  writeRecords(records);
  return created.employee;
}

export async function updateEmployee(id: string, payload: EmployeeRequest): Promise<EmployeeSummary> {
  const records = readRecords();
  const found = records.find((item) => item.employee.id === id);
  if (!found) throw new Error("スタッフが見つかりません。");
  validateEmployeeRequest(payload, false);
  found.employee.displayName = payload.displayName;
  found.employee.employmentType = payload.employmentType;
  found.employee.roleTitle = payload.roleTitle;
  found.employee.weeklyLimitMinutes = found.employee.employmentType === "FULL_TIME" || found.employee.employmentType === "SPECIFIED_SKILLED" ? payload.contractTargetMinutes ?? payload.weeklyLimitMinutes : payload.contractLimitMinutes ?? payload.weeklyLimitMinutes;
  found.employee.outsideWorkMinutes = payload.outsideWorkMinutes;
  const residenceStatus = residenceStatusOptions.includes(payload.residenceStatus as typeof residenceStatusOptions[number]) ? payload.residenceStatus : found.profile.residenceStatus ?? "なし";
  found.profile = { ...found.profile, phone: payload.phone, hourlyWageYen: payload.hourlyWageYen ?? found.profile.hourlyWageYen, experienceMonths: payload.experienceMonths, commuteMinutes: payload.commuteMinutes, outsideWorkMinutes: payload.outsideWorkMinutes, residenceStatus, residenceExpiryDate: payload.residenceExpiryDate, laborRuleCode: payload.laborRuleCode, traits: payload.traits, notes: payload.notes };
  found.contract = { ...found.contract!, targetMinutes: payload.contractTargetMinutes ?? payload.weeklyLimitMinutes, limitMinutes: payload.contractLimitMinutes ?? payload.weeklyLimitMinutes };
  refreshSummary(found);
  writeRecords(records);
  return found.employee;
}

export async function deactivateEmployee(id: string): Promise<EmployeeSummary> {
  const records = readRecords();
  const found = records.find((item) => item.employee.id === id);
  if (!found) throw new Error("スタッフが見つかりません。");
  found.employee.status = "INACTIVE";
  refreshSummary(found);
  writeRecords(records);
  return found.employee;
}

export async function reactivateEmployee(id: string): Promise<EmployeeSummary> {
  const records = readRecords();
  const found = records.find((item) => item.employee.id === id);
  if (!found) throw new Error("スタッフが見つかりません。");
  if (found.employee.status !== "ON_LEAVE") throw new Error("休職中のスタッフのみ復職できます。");
  found.employee.status = "ACTIVE";
  refreshSummary(found);
  writeRecords(records);
  return found.employee;
}

export async function placeEmployeeOnLeave(id: string): Promise<EmployeeSummary> {
  const records = readRecords();
  const found = records.find((item) => item.employee.id === id);
  if (!found) throw new Error("スタッフが見つかりません。");
  if (found.employee.status !== "ACTIVE") throw new Error("在職中のスタッフのみ休職にできます。");
  found.employee.status = "ON_LEAVE";
  refreshSummary(found);
  writeRecords(records);
  return found.employee;
}

export async function submitEmployeeChangeRequest(id: string, payload: Partial<EmployeeRequest>): Promise<EmployeeChangeRequest> {
  const request: EmployeeChangeRequest = { id: `change-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, employeeId: id, submittedBy: "EMPLOYEE", status: "PENDING", submittedAt: new Date().toISOString(), payload };
  const requests = readChangeRequests(); requests.push(request); writeChangeRequests(requests); return request;
}
export async function listEmployeeChangeRequests(id: string): Promise<EmployeeChangeRequest[]> { return readChangeRequests().filter((request) => request.employeeId === id); }
export async function approveEmployeeChangeRequest(id: string, requestId: string): Promise<EmployeeSummary> {
  const requests = readChangeRequests(); const request = requests.find((item) => item.id === requestId && item.employeeId === id);
  if (!request || request.status !== "PENDING") throw new Error("变更申请不可处理。");
  const current = await getEmployee(id); const payload = { ...current.profile, displayName: current.employee.displayName, employmentType: current.employee.employmentType, roleTitle: current.employee.roleTitle, weeklyLimitMinutes: current.employee.weeklyLimitMinutes, skills: current.skills.map((item) => item.positionName), ...request.payload } as EmployeeRequest;
  const employee = await updateEmployee(id, payload); request.status = "APPROVED"; request.reviewedAt = new Date().toISOString(); writeChangeRequests(requests); return employee;
}
export async function rejectEmployeeChangeRequest(id: string, requestId: string, reason?: string): Promise<EmployeeChangeRequest> {
  const requests = readChangeRequests(); const request = requests.find((item) => item.id === requestId && item.employeeId === id);
  if (!request || request.status !== "PENDING") throw new Error("变更申请不可处理。");
  request.status = "REJECTED"; request.reason = reason; request.reviewedAt = new Date().toISOString(); writeChangeRequests(requests); return request;
}

export async function updateEmployeeSkills(id: string, skills: Array<Omit<MockSkill, "id">>): Promise<EmployeeDetail> {
  const records = readRecords();
  const found = records.find((item) => item.employee.id === id);
  if (!found) throw new Error("スタッフが見つかりません。");
  found.skills = skills.map((item, index) => ({ ...item, id: `${id}-s${index}` }));
  refreshSummary(found);
  writeRecords(records);
  return found;
}

export async function updateAvailability(id: string, availability: Array<Omit<MockAvailability, "id">>): Promise<EmployeeDetail> {
  const records = readRecords();
  const found = records.find((item) => item.employee.id === id);
  if (!found) throw new Error("スタッフが見つかりません。");
  found.availability = availability.map((item, index) => ({ ...item, id: `${id}-a${index}` }));
  found.employee.version += 1;
  writeRecords(records);
  return found;
}
