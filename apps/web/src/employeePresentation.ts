type Translate = (key: string) => string;

export function localizedLaborReason(
  employee: { warning: { level: string }; laborMonitor?: { basis: string } },
  t: Translate,
): string {
  if (employee.laborMonitor?.basis === "MONTHLY_OVERTIME") {
    return employee.warning.level === "ACTION"
      ? t("monthlyOvertimeOver")
      : employee.warning.level === "APPROACHING"
        ? t("monthlyOvertimeNear")
        : t("monthlyOvertimeWithin");
  }
  if (employee.laborMonitor?.basis === "PART_TIME_NO_IMMIGRATION_CAP") return t("regularPartTimeNoCap");
  return employee.warning.level === "ACTION"
    ? t("weeklyLimitOver")
    : employee.warning.level === "APPROACHING"
      ? t("weeklyLimitNear")
      : t("weeklyLimitWithin");
}

export function employeeStatusLabel(value: string, t: Translate): string {
  return ({ ACTIVE: t("statusActive"), ON_LEAVE: t("statusOnLeave"), INACTIVE: t("statusInactive") }[value] ?? t("unknownStatus"));
}

export function laborRuleLabel(value: string, t: Translate): string {
  return ({ FULL_TIME: t("laborRuleFullTime"), SPECIFIED_SKILLED: t("laborRuleSpecified"), PART_TIME: t("laborRulePartTime"), STUDENT_PART_TIME: t("laborRuleStudent") }[value] ?? t("unknownStatus"));
}

export function residenceStatusLabel(value: string, t: Translate): string {
  const labels: Record<string, string> = {
    留学: t("residenceStudent"), 特定技能: t("residenceSpecified"), "技術・人文知識・国際業務": t("residenceEngineer"),
    永住者: t("residencePermanent"), "日本人の配偶者等": t("residenceSpouse"), 定住者: t("residenceLongTerm"), 家族滞在: t("residenceFamily"), なし: t("residenceNone"),
  };
  return labels[value] ?? t("unknownStatus");
}

export function roleTitleLabel(value: string, t: Translate): string {
  const labels: Record<string, string> = {
    店長: t("roleManager"), 副店長: t("roleDeputyManager"), ホールリーダー: t("roleHallLeader"), ホール担当: t("roleHall"), ホール兼務: t("roleFrontPartTime"), 地元ホール担当: t("roleHall"), 店長補佐: t("roleDeputyManager"),
    調理リーダー: t("roleKitchenLeader"), 調理担当: t("roleKitchenLeader"), 調理主任: t("roleKitchenLeader"), 調理補助: t("skillCookingSupport"), 麺場リーダー: t("roleNoodleLeader"), 深夜統括: t("roleNoodleLeader"), 深夜責任者: t("roleNoodleLeader"),
    ホール: t("roleHall"), ホール新人: t("roleHallNewcomer"), ホールサポート: t("roleHallSupport"), 留学生アルバイト: t("roleStudentPartTime"), アルバイト: t("rolePartTime"), 洗い場・仕込み: t("roleDishwashingPrep"), 後厨房アルバイト: t("roleKitchenPartTime"),
    前台兼职: t("roleFrontPartTime"), 后厨兼职: t("roleKitchenPartTime"), 洗場サポート: t("roleDishwashingSupport"), 洗い場サポート: t("roleDishwashingSupport"), 洗い場: t("skillDishwashing"), 仕込み補助: t("skillPrepSupport"), 閉店清掃: t("skillClosingCleaning"), 新人スタッフ: t("roleHallNewcomer"), 教育担当: t("skillNewcomerTraining"),
    留学生ホール: t("roleStudentPartTime"), 留学生レジ: t("roleStudentPartTime"), 留学生キッチン: t("roleStudentPartTime"), 留学生調理補助: t("roleStudentPartTime"), 特定技能調理: t("roleKitchenLeader"), ランチ責任者: t("roleKitchenLeader"),
  };
  return labels[value] ?? (/^[A-Z_]+$/.test(value) || /[\u3040-\u30ff\u3400-\u9fff]/.test(value) ? t("unknownStatus") : value);
}

export function skillPositionLabel(value: string, t: Translate): string {
  const labels: Record<string, string> = {
    ホール: t("roleHall"), レジ: t("skillRegister"), 発注: t("ordering"), 鍋場: t("skillWok"), 油場: t("skillFryer"), 新人指導: t("skillNewcomerTraining"), 新人帯教: t("skillNewcomerTraining"), 新人带教: t("skillNewcomerTraining"), 配膳: t("skillServing"), 麺場: t("skillWok"), 麺場補助: t("skillNoodleSupport"),
    洗い場: t("skillDishwashing"), 洗い場サポート: t("roleDishwashingSupport"), 洗場サポート: t("roleDishwashingSupport"), 仕込み: t("skillPrep"), 仕込み補助: t("skillPrepSupport"), 迎賓: t("skillWelcome"), 外卖: t("skillTakeout"), 外販: t("skillTakeout"), 深夜責任者: t("roleNoodleLeader"), ホール指導: t("skillHallCoaching"), 清掃: t("skillCleaning"), 閉店清掃: t("skillClosingCleaning"), 閉店: t("skillClosing"), 開店: t("skillOpening"), ホール管理: t("skillHallManagement"), 調理: t("skillCooking"), 調理補助: t("skillCookingSupport"), 調理全般: t("skillCookingAll"), 接客: t("skillCustomerService"), レジ教育: t("skillRegisterTraining"),
  };
  return labels[value] ?? (/^[A-Z_]+$/.test(value) || /[\u3040-\u30ff\u3400-\u9fff]/.test(value) ? t("unknownStatus") : value);
}

export function trainingStatusLabel(value: string, t: Translate): string {
  return ({ NOT_STARTED: t("notStarted"), LEARNING: t("learning"), CAN_ASSIST: t("canAssist"), INDEPENDENT: t("independent"), CAN_TRAIN: t("canTrain"), COMPLETED: t("trainingCompleted"), IN_PROGRESS: t("trainingInProgress") }[value] ?? t("unknownStatus"));
}

export function skillLevelLabel(value: string, t: Translate): string {
  return ({ NOT_STARTED: t("notStarted"), LEARNING: t("learning"), CAN_ASSIST: t("canAssist"), INDEPENDENT: t("independent"), CAN_TRAIN: t("canTrain") }[value] ?? t("unknownStatus"));
}

export function trainingKeyLabel(value: string, t: Translate): string {
  return ({ "food-safety-basics": t("foodSafetyBasics") }[value] ?? t("unknownStatus"));
}

export function preferenceLabel(value: string, t: Translate): string {
  return ({ AVAILABLE: t("available"), DESIRED: t("desired"), PREFERRED: t("preferred"), UNAVAILABLE: t("unavailable") }[value] ?? t("unknownStatus"));
}
