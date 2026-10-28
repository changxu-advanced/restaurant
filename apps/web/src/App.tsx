import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle, Archive, BadgeInfo, BookOpen, Boxes, CalendarDays, Check, ChevronDown, ChevronRight,
  CircleDollarSign, Clock3, Languages, LayoutDashboard, MessageCircle, PackageCheck,
  Settings, Sparkles, Store, Users, UtensilsCrossed, Eye, MoreHorizontal, MessageSquareWarning, Wrench, ShieldCheck, Building2, Star, CalendarCheck, Camera, CheckCircle2
} from "lucide-react";
import { featureCards, initialInventory, shifts } from "./demoData";
import { useCreateEmployee, useDeactivateEmployee, useEmployee, useEmployees, usePlaceEmployeeOnLeave, useReactivateEmployee, useStoreSettings, useUpdateEmployee } from "./employeeApi";
import type { InventoryItem, NavKey, StockState } from "./types";
import { formatBackToTopParts } from "./employeeFormatting";

const navItems: Array<{ key: NavKey; icon: typeof LayoutDashboard; managerOnly?: boolean }> = [
  { key: "today", icon: LayoutDashboard },
  { key: "schedule", icon: CalendarDays },
  { key: "inventory", icon: Boxes },
  { key: "chat", icon: MessageCircle },
  { key: "employees", icon: Users, managerOnly: true },
  { key: "closeout", icon: CircleDollarSign, managerOnly: true },
  { key: "settings", icon: Settings },
  { key: "more", icon: MoreHorizontal, managerOnly: true }
];

const featureIcons = { message: MessageSquareWarning, calendar: CalendarCheck, wrench: Wrench, shield: ShieldCheck, stores: Building2, star: Star } as const;
const featureCopyKeys = {
  incidents: { title: "incidentTitle", summary: "incidentDescription", status: "incidentPending" },
  reservations: { title: "reservationsTitle", summary: "reservationsDescription", status: "todaysReservations" },
  equipment: { title: "maintenanceTitle", summary: "maintenanceDescription", status: "inRepair" },
  allergens: { title: "foodSafetyTitle", summary: "foodSafetyDescription", status: "pendingConfirmations" },
  crossStore: { title: "crossStoreTitle", summary: "crossStoreDescription", status: "supportRole" },
  evaluations: { title: "evaluationTitle", summary: "evaluationDescription", status: "saveEvaluation" }
} as const;

const availabilityDays = ["10/26 月", "10/27 火", "10/28 水", "10/29 木", "10/30 金", "10/31 土", "11/1 日"];
const weekdayNames = { 月: { ja: "月", zh: "周一", en: "Mon" }, 火: { ja: "火", zh: "周二", en: "Tue" }, 水: { ja: "水", zh: "周三", en: "Wed" }, 木: { ja: "木", zh: "周四", en: "Thu" }, 金: { ja: "金", zh: "周五", en: "Fri" }, 土: { ja: "土", zh: "周六", en: "Sat" }, 日: { ja: "日", zh: "周日", en: "Sun" } } as const;
const localizedDay = (day: string, language: string) => { const [date, weekday] = day.split(" "); const name = weekdayNames[weekday as keyof typeof weekdayNames]?.[language as "ja" | "zh" | "en"] ?? weekday; return language === "en" ? `${name} ${date}` : `${date} ${name}`; };
function formatStoreDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}.${values.month}.${values.day}`;
}
const stockOptions: StockState[] = ["enough", "low", "urgent", "out"];
const residenceStatusOptions = ["留学", "特定技能", "技術・人文知識・国際業務", "永住者", "日本人の配偶者等", "定住者", "家族滞在", "なし"];
const commuteOptions = [0, 15, 30, 45, 60];
const roleOptions = ["店長", "副店長", "調理リーダー", "麺場リーダー", "ホール", "ホール新人", "ホールサポート", "留学生アルバイト", "アルバイト", "洗い場・仕込み", "後厨房アルバイト", "后厨兼职", "前台兼职", "洗場サポート"];
const wageOptions = [960, 1000, 1050, 1080, 1100, 1120, 1150, 1180, 1200, 1300, 1500, 1760, 1820, 1920, 2040];
const experienceOptions = [0, 2, 3, 6, 9, 12, 18, 24, 30, 42, 48, 60, 84];
const outsideWorkOptions = Array.from({ length: 29 }, (_, index) => index * 60);
const contractHourOptions = [20, 28, 30, 36, 40];
const CUSTOM_OPTION = "__custom__";
type EditableSelectKey = "roleTitle" | "hourlyWageYen" | "experienceMonths" | "commuteMinutes" | "outsideWorkMinutes" | "laborRuleCode" | "contractTargetMinutes" | "contractLimitMinutes";
type EmployeeDraft = {
  displayName: string;
  employmentType: string;
  roleTitle: string;
  hourlyWageYen: string;
  experienceMonths: string;
  commuteMinutes: string;
  outsideWorkMinutes: string;
  phone: string;
  residenceStatus: string;
  residenceExpiryDate: string;
  laborRuleCode: string;
  weeklyLimitMinutes: string;
  contractTargetMinutes: string;
  contractLimitMinutes: string;
  traits: string;
  notes: string;
};
type CustomFields = Record<EditableSelectKey, boolean>;
const emptyCustomFields = (): CustomFields => ({ roleTitle: false, hourlyWageYen: false, experienceMonths: false, commuteMinutes: false, outsideWorkMinutes: false, laborRuleCode: false, contractTargetMinutes: false, contractLimitMinutes: false });
const defaultEmployeeDraft = (minimumWageYen?: number): EmployeeDraft => ({ displayName: "", employmentType: "PART_TIME", roleTitle: "アルバイト", hourlyWageYen: minimumWageYen ? String(minimumWageYen) : "", experienceMonths: "0", commuteMinutes: "30", outsideWorkMinutes: "0", phone: "", residenceStatus: "なし", residenceExpiryDate: "", laborRuleCode: "PART_TIME", weeklyLimitMinutes: "2400", contractTargetMinutes: "2400", contractLimitMinutes: "2400", traits: "", notes: "" });
const availabilityBlocks = [
  { id: "prep", time: "08:00–09:00", label: "準備", tone: "prep" },
  { id: "09", time: "09:00–10:00", label: "09時", tone: "normal" },
  { id: "10", time: "10:00–11:00", label: "10時", tone: "normal" },
  { id: "11", time: "11:00–12:00", label: "11時", tone: "normal" },
  { id: "12", time: "12:00–13:00", label: "12時", tone: "normal" },
  { id: "13", time: "13:00–14:00", label: "13時", tone: "normal" },
  { id: "14", time: "14:00–15:00", label: "14時", tone: "normal" },
  { id: "15", time: "15:00–16:00", label: "15時", tone: "normal" },
  { id: "16", time: "16:00–17:00", label: "16時", tone: "normal" },
  { id: "17", time: "17:00–18:00", label: "17時", tone: "normal" },
  { id: "18", time: "18:00–19:00", label: "18時", tone: "normal" },
  { id: "19", time: "19:00–20:00", label: "19時", tone: "normal" },
  { id: "20", time: "20:00–21:00", label: "20時", tone: "normal" },
  { id: "21", time: "21:00–22:00", label: "21時", tone: "normal" },
  { id: "22", time: "22:00–23:00", label: "22時", tone: "normal" },
  { id: "23", time: "23:00–00:00", label: "23時", tone: "late" },
  { id: "00", time: "00:00–01:00", label: "0時", tone: "late" }
] as const;
const allAvailabilityIds = availabilityBlocks.map((block) => block.id);
const daytimeAvailabilityIds = availabilityBlocks.filter((block) => block.tone !== "late").map((block) => block.id);
const nightAvailabilityIds = availabilityBlocks.filter((block) => block.id === "18" || block.id === "19" || block.id === "20" || block.id === "21" || block.id === "22" || block.tone === "late").map((block) => block.id);
type RangeAction = "add" | "remove";
type RangeStart = { blockId: string; action: RangeAction };

function Brand() {
  return (
    <div className="brand" aria-label="advn">
      <span className="brand-mark"><UtensilsCrossed size={19} /></span>
      <span className="brand-word">advn</span>
    </div>
  );
}

function StatusPill({ tone, children }: { tone: "normal" | "warning" | "danger" | "neutral"; children: React.ReactNode }) {
  const icon = tone === "normal" ? "✓" : tone === "warning" ? "!" : tone === "danger" ? "⛔" : "•";
  return <span className={`status-pill ${tone}`}><span aria-hidden="true">{icon}</span>{children}</span>;
}

function Card({ children, className = "", id, tabIndex }: { children: React.ReactNode; className?: string; id?: string; tabIndex?: number }) {
  return <section id={id} tabIndex={tabIndex} className={`card ${className}`}>{children}</section>;
}

function Header({ role, setRole, colorAssist }: { role: "manager" | "staff"; setRole: (role: "manager" | "staff") => void; colorAssist: boolean }) {
  const { t, i18n } = useTranslation();
  const [storeDate, setStoreDate] = useState(() => formatStoreDate());
  useEffect(() => {
    const updateDate = () => setStoreDate(formatStoreDate());
    const timer = window.setInterval(updateDate, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const changeLanguage = (language: string) => {
    void i18n.changeLanguage(language);
    localStorage.setItem("locale", language);
  };
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow"><Store size={15} />{t("storeDate", { date: storeDate })}</p>
        <h1>{t("product")}</h1>
      </div>
      <div className="topbar-actions">
        {colorAssist && <span className="color-assist-indicator"><Eye size={16} />{t("colorAssistOn")}</span>}
        <label className="compact-select language-select">
          <span className="sr-only">{t("language")}</span>
          <Languages size={17} />
          <select value={i18n.language} onChange={(event) => changeLanguage(event.target.value)}>
            <option value="ja">日本語</option><option value="zh">简体中文</option><option value="zh-TW">繁體中文</option><option value="en">English</option><option value="ko">한국어</option><option value="vi">Tiếng Việt</option>
          </select>
        </label>
        <label className="compact-select language-select">
          <span className="sr-only">{t("demoRole")}</span>
          <select value={role} onChange={(event) => setRole(event.target.value as "manager" | "staff") }>
            <option value="manager">{t("manager")}</option><option value="staff">{t("staff")}</option>
          </select>
        </label>
        <button className="avatar" aria-label={t("profile")}>佐</button>
      </div>
    </header>
  );
}

function Navigation({ active, onChange, role }: { active: NavKey; onChange: (key: NavKey) => void; role: "manager" | "staff" }) {
  const { t } = useTranslation();
  const visible = navItems.filter((item) => !item.managerOnly || role === "manager");
  return (
    <>
      <aside className="sidebar">
        <Brand />
        <nav aria-label={t("mainNavigation")}>
          {visible.map(({ key, icon: Icon }) => (
            <button key={key} className={active === key ? "active" : ""} onClick={() => onChange(key)}>
              <Icon size={20} /><span>{t(key)}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-note" title={t("fictionalData")}><BadgeInfo size={17} /><span><strong>{t("demoEnvironment")}</strong><br />{t("fictionalData")} · v0.2.0</span></div>
      </aside>
      <nav className="bottom-nav" aria-label={t("mobileNavigation")}>
        {["today", "schedule", "inventory", "chat", "more"].map((key) => visible.find((item) => item.key === key)).filter((item): item is typeof navItems[number] => Boolean(item)).map(({ key, icon: Icon }) => (
          <button key={key} className={active === key ? "active" : ""} onClick={() => onChange(key)}>
            <Icon size={21} /><span>{t(key)}</span>
          </button>
        ))}
      </nav>
    </>
  );
}

function MorePage({ onNavigate }: { onNavigate: (key: NavKey) => void }) {
  const { t } = useTranslation();
  return <div className="page-stack"><div className="page-title"><div><p className="eyebrow">v0.2.0 · {t("exceptionHandling")}</p><h2>{t("more")}</h2><p>{t("moreDescription")}</p></div></div><div className="feature-grid">{featureCards.map((feature) => { const Icon = featureIcons[feature.icon]; const copy = featureCopyKeys[feature.key as keyof typeof featureCopyKeys]; return <Card key={feature.key} className="feature-card"><div className="feature-icon"><Icon size={22} /></div><div className="feature-copy"><div className="card-title-row"><h3>{t(copy.title)}</h3><StatusPill tone={feature.tone}>{t(copy.status)}</StatusPill></div><p>{t(copy.summary)}</p></div><button className="secondary-button" onClick={() => onNavigate(feature.key as NavKey)}>{t("view")}<ChevronRight size={17} /></button></Card>; })}</div><Card className="notice-card"><BadgeInfo size={21} /><div><strong>{t("laterPrinciples")}</strong><p>{t("laterPrinciplesDescription")}</p></div></Card></div>;
}

function IncidentsPage() {
  const [resolved, setResolved] = useState(false);
  const { t } = useTranslation();
  return <FeaturePage eyebrow="Customer care" title={t("incidentTitle")} description={t("incidentDescription")}><div className="feature-summary"><StatusPill tone={resolved ? "normal" : "danger"}>{resolved ? t("incidentResolved") : t("incidentPending")}</StatusPill><span>{t("incidentNote")}</span></div><Card className="incident-card"><div className="card-title-row"><div><p className="eyebrow">{t("todayLabel")} 11:20 · {t("hall")}</p><h3>{t("waitingComplaint")}</h3></div><StatusPill tone="danger">{t("managerConfirm")}</StatusPill></div><div className="tag-row"><span>{t("factRecord")}</span><span>{t("employeeProtection")}</span><span>{t("privateInfo")}</span></div><p>{t("complaintBody")}</p><div className="meta"><span>{t("reporter")}</span><span>{t("attachment")}</span></div><button className="primary-button" onClick={() => setResolved(true)}><CheckCircle2 size={17} />{resolved ? t("resolutionSaved") : t("recordResolution")}</button></Card></FeaturePage>;
}

function ReservationsPage() {
  const [showCanceled, setShowCanceled] = useState(false);
  const { t } = useTranslation();
  return <FeaturePage eyebrow="Reservations" title={t("reservationsTitle")} description={t("reservationsDescription")}><div className="reservation-toolbar"><button className={showCanceled ? "ghost-button" : "primary-button"} onClick={() => setShowCanceled(false)}>{t("todaysReservations")}</button><button className={showCanceled ? "primary-button" : "ghost-button"} onClick={() => setShowCanceled(true)}>{t("cancellationRecords")}</button></div><div className="reservation-list">{(showCanceled ? [{ time: `${t("yesterday")} 19:00`, name: t("guestSasaki"), party: `4 ${t("partyUnit")}`, status: t("noShow"), tone: "danger" as const }] : [{ time: "12:00", name: t("guestTanaka"), party: `2 ${t("partyUnit")}`, status: t("confirmedReservation"), tone: "normal" as const }, { time: "18:30", name: t("guestYamamoto"), party: `6 ${t("partyUnit")}`, status: t("beforeVisit"), tone: "warning" as const }]).map((reservation) => <Card key={reservation.time + reservation.name} className="reservation-row"><div className="reservation-time">{reservation.time}</div><div><strong>{reservation.name}</strong><span>{reservation.party} · {t("phoneReservation")}</span></div><StatusPill tone={reservation.tone}>{reservation.status}</StatusPill><button className="ghost-button">{t("openCard")}</button></Card>)}</div></FeaturePage>;
}

function EquipmentPage() {
  const [fixed, setFixed] = useState<string[]>([]);
  const { t } = useTranslation();
  return <FeaturePage eyebrow="Maintenance" title={t("maintenanceTitle")} description={t("maintenanceDescription")}><div className="equipment-list">{[{ id: "fridge", name: t("refrigerator"), issue: t("doorIssue"), owner: "田中 蓮", status: t("inRepair"), tone: "warning" as const }, { id: "hood", name: t("hood"), issue: t("hoodIssue"), owner: t("supplierPending"), status: t("pendingArrangement"), tone: "neutral" as const }].map((item) => { const done = fixed.includes(item.id); return <Card key={item.id} className="equipment-row"><div className="equipment-photo"><Camera size={23} /><span>{t("photoLabel")}</span></div><div className="feature-copy"><div className="card-title-row"><h3>{item.name}</h3><StatusPill tone={done ? "normal" : item.tone}>{done ? t("fixed") : item.status}</StatusPill></div><p>{item.issue}</p><div className="meta"><span>{t("assignedTo")}：{item.owner}</span><span>{t("updatedAt")}</span></div></div><button className="secondary-button" onClick={() => setFixed((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}>{done ? t("reopenIssue") : t("markFixed")}</button></Card>; })}</div></FeaturePage>;
}

function AllergensPage() {
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const { t } = useTranslation();
  return <FeaturePage eyebrow="Food safety" title={t("foodSafetyTitle")} description={t("foodSafetyDescription")}><Card><div className="section-heading"><div><h3>{t("todaysRequests")}</h3><p className="muted">{t("beforeService")}</p></div><StatusPill tone="warning">{t("pendingConfirmations")}</StatusPill></div><div className="allergen-list">{[{ id: "a1", guest: "18:30 佐々木様", request: t("peanutRequest") }, { id: "a2", guest: "19:00 山本様", request: t("porkFree") }].map((item) => { const done = confirmed.includes(item.id); return <div className={`allergen-row ${done ? "done" : ""}`} key={item.id}><ShieldCheck size={21} /><div><strong>{item.guest}</strong><span>{item.request}</span></div><button className={done ? "ghost-button" : "primary-button"} onClick={() => setConfirmed((current) => done ? current.filter((id) => id !== item.id) : [...current, item.id])}>{done ? t("confirmed") : t("confirmHandover")}</button></div>; })}</div></Card></FeaturePage>;
}

function CrossStorePage() {
  const [response, setResponse] = useState(false);
  const { t } = useTranslation();
  return <FeaturePage eyebrow="Cross-store support" title={t("crossStoreTitle")} description={t("crossStoreDescription")}><Card className="support-card"><div className="card-title-row"><div><p className="eyebrow"><Building2 size={14} />{t("supportRoute")}</p><h3>11/1 17:00–21:00 · {t("supportRole")}</h3></div><StatusPill tone="warning">{t("replyBy")}</StatusPill></div><p>{t("commute")} · {t("skillRequirement")} · {t("noConflict")}</p><div className="support-actions"><button className={response ? "selected" : ""} onClick={() => setResponse(true)}>{response ? t("supportYesSelected") : t("supportYes")}</button><button onClick={() => setResponse(false)}>{t("supportNo")}</button></div></Card></FeaturePage>;
}

function EvaluationsPage() {
  const [saved, setSaved] = useState(false);
  const { t } = useTranslation();
  return <FeaturePage eyebrow="People development" title={t("evaluationTitle")} description={t("evaluationDescription")}><div className="evaluation-grid">{[{ name: "王 小雨", role: `${t("serving")} · ${t("register")}`, goal: t("peakRegister") }, { name: "Alex Chen", role: `${t("newcomer")} · ${t("servingPractice")}`, goal: t("hygieneTraining") }].map((employee) => <Card key={employee.name} className="evaluation-card"><div className="employee-head"><span className="large-avatar">{employee.name.slice(0, 1)}</span><div><h3>{employee.name}</h3><p>{employee.role}</p></div><Star size={20} className="star-icon" /></div><div className="rating-row"><span>{t("skillPerformance")}</span><strong>{t("canAssist")}</strong></div><div className="rating-row"><span>{t("nextGoal")}</span><strong>{employee.goal}</strong></div><button className="secondary-button full" onClick={() => setSaved(true)}>{saved ? t("evaluationSaved") : t("saveEvaluation")}</button></Card>)}</div></FeaturePage>;
}

function FeaturePage({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  const { t } = useTranslation();
  const eyebrowKey: Record<string, string> = { "Customer care": "incidentTitle", Reservations: "reservationsTitle", Maintenance: "maintenanceTitle", "Food safety": "foodSafetyTitle", "Cross-store support": "crossStoreTitle", "People development": "evaluationTitle" };
  return <div className="page-stack"><div className="page-title"><div><p className="eyebrow">{eyebrowKey[eyebrow] ? t(eyebrowKey[eyebrow]) : eyebrow}</p><h2>{title}</h2><p>{description}</p></div></div>{children}</div>;
}

function TodayPage({ onNavigate }: { onNavigate: (key: NavKey) => void }) {
  const { t } = useTranslation();
  return (
    <div className="page-stack">
      <div className="welcome-row">
        <div><p className="eyebrow">{t("open")} · 11:42</p><h2>{t("hello")}, Sato</h2><p>{t("focus")}</p></div>
        <div className="phase-track" aria-label={t("businessPhase")}>
          {["preOpen", "open", "lastOrder", "closed"].map((phase, index) => <span key={phase} className={index === 1 ? "current" : index < 1 ? "done" : ""}>{t(phase)}</span>)}
        </div>
      </div>
      <div className="dashboard-grid">
        <div className="main-column">
          <div className="section-heading"><div><p className="eyebrow">{t("priority")}</p><h3>{t("attention")}</h3></div><StatusPill tone="danger">3</StatusPill></div>
          <Card className="operation-card danger-card">
            <div className="card-icon"><AlertTriangle size={22} /></div>
            <div className="card-body"><div className="card-title-row"><h4>{t("shortage")} · 18:00–20:30</h4><StatusPill tone="danger">{t("action")}</StatusPill></div><p>{t("shortageDescription")}</p><div className="meta"><span><Clock3 size={15} />{t("responseDeadline")}</span><span>{t("candidates")}</span></div></div>
            <button className="primary-button" onClick={() => onNavigate("chat")}>{t("view")}<ChevronRight size={17} /></button>
          </Card>
          <Card className="operation-card warning-card">
            <div className="card-icon"><Boxes size={22} /></div>
            <div className="card-body"><div className="card-title-row"><h4>{t("cabbageStock")}</h4><StatusPill tone="warning">! {t("shortageForecast")}</StatusPill></div><p>{t("salesSpeed")} {t("orderSuggestion")}</p><div className="meta"><span>{t("supplierDeadline")}</span><span>{t("confidence")}</span></div></div>
            <button className="secondary-button" onClick={() => onNavigate("inventory")}>{t("view")}<ChevronRight size={17} /></button>
          </Card>
          <Card className="operation-card">
            <div className="card-icon"><Archive size={22} /></div>
            <div className="card-body"><div className="card-title-row"><h4>{t("handover")} · {t("refrigerator")}</h4><StatusPill tone="neutral">{t("unresolved")}</StatusPill></div><p>{t("refrigeratorProblem")}</p><div className="meta"><span>Yamada · 10:25</span><span>{t("assignedTo")}</span></div></div>
            <button className="ghost-button" onClick={() => onNavigate("chat")}>{t("view")}<ChevronRight size={17} /></button>
          </Card>
        </div>
        <aside className="side-column">
          <Card><div className="section-heading"><h3>{t("timeline")}</h3><span className="muted">{t("todayLabel")}</span></div><ol className="timeline"><li className="complete"><button onClick={() => onNavigate("schedule")}><time>09:30</time><span><strong>{t("openingPrep")}</strong><small>{t("completeCount")}</small></span><ChevronRight size={16} /></button></li><li className="current"><button onClick={() => onNavigate("schedule")}><time>11:30</time><span><strong>{t("lunchService")}</strong><small>{t("hall")} 4 · {t("kitchen")} 5</small></span><ChevronRight size={16} /></button></li><li><button onClick={() => onNavigate("inventory")}><time>15:00</time><span><strong>{t("stockCheck")}</strong><small>{t("importantItems")}</small></span><ChevronRight size={16} /></button></li><li><button onClick={() => onNavigate("chat")}><time>17:00</time><span><strong>{t("dinnerChange")}</strong><small>{t("handoverCount")}</small></span><ChevronRight size={16} /></button></li><li><button onClick={() => onNavigate("closeout")}><time>21:30</time><span><strong>{t("lastOrder")}</strong><small>{t("closePreparation")}</small></span><ChevronRight size={16} /></button></li></ol></Card>
          <Card><div className="section-heading"><h3>{t("currentCoverage")}</h3><StatusPill tone="warning">! {t("nightShortage")}</StatusPill></div><div className="coverage-list"><div><span>{t("hall")}</span><strong>4 / 4</strong></div><div><span>{t("kitchen")}</span><strong>5 / 5</strong></div><div className="warn"><span>{t("wok")} · {t("after18")}</span><strong>0 / 1</strong></div></div></Card>
        </aside>
      </div>
    </div>
  );
}

function SchedulePage() {
  const { t, i18n } = useTranslation();
  const [availability, setAvailability] = useState<Record<string, string[]>>(() => Object.fromEntries(availabilityDays.map((day, index) => [day, index === 2 ? [] : index === 5 ? ["12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "00"] : index === 6 ? ["09", "10", "11", "12"] : ["prep", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"]])));
  const [mobileDay, setMobileDay] = useState(availabilityDays[0]);
  const [rangeStart, setRangeStart] = useState<Record<string, RangeStart | null>>(() => Object.fromEntries(availabilityDays.map((day) => [day, null])));
  const [status, setStatus] = useState<"idle" | "running" | "ready">("idle");
  const generate = () => { setStatus("running"); window.setTimeout(() => setStatus("ready"), 900); };
  const toggleBlock = (day: string, blockId: string) => {
    const selected = availability[day] ?? [];
    const currentRangeStart = rangeStart[day];
    if (currentRangeStart) {
      const startIndex = availabilityBlocks.findIndex((block) => block.id === currentRangeStart.blockId);
      const endIndex = availabilityBlocks.findIndex((block) => block.id === blockId);
      const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
      const rangeIds: string[] = availabilityBlocks.slice(from, to + 1).map((block) => block.id);
      setRangeStart((current) => ({ ...current, [day]: null }));
      setAvailability((current) => ({
        ...current,
        [day]: currentRangeStart.action === "remove"
          ? current[day].filter((id) => !rangeIds.includes(id))
          : Array.from(new Set([...current[day], ...rangeIds]))
      }));
      return;
    }
    if (selected.includes(blockId)) {
      setRangeStart((current) => ({ ...current, [day]: { blockId, action: "remove" } }));
      setAvailability((current) => ({ ...current, [day]: current[day].filter((id) => id !== blockId) }));
      return;
    }
    setRangeStart((current) => ({ ...current, [day]: { blockId, action: "add" } }));
    setAvailability((current) => ({ ...current, [day]: [...current[day], blockId] }));
  };
  const applyWeekdays = () => {
    setRangeStart(() => Object.fromEntries(availabilityDays.map((day) => [day, null])));
    setAvailability((current) => ({
      ...current,
      ...Object.fromEntries(availabilityDays.slice(0, 5).map((day) => [day, daytimeAvailabilityIds]))
    }));
  };
  const copyPreviousDay = () => {
    setRangeStart(() => Object.fromEntries(availabilityDays.map((day) => [day, null])));
    setAvailability((current) => Object.fromEntries(availabilityDays.map((day, index) => [day, index === 0 ? current[day] : [...current[availabilityDays[index - 1]]]])));
  };
  const applyPreset = (blockIds: string[]) => {
    setRangeStart((current) => ({ ...current, [mobileDay]: null }));
    setAvailability((current) => ({ ...current, [mobileDay]: blockIds }));
  };
  const blockLabel = (block: typeof availabilityBlocks[number]) => block.id === "prep" ? t("prepHours") : `${block.id}${t("hourSuffix")}`;
  const renderBlock = (day: string, block: typeof availabilityBlocks[number]) => { const selected = availability[day].includes(block.id); const isRangeStart = rangeStart[day]?.blockId === block.id; const displayDay = localizedDay(day, i18n.language); return <button key={block.id} type="button" aria-pressed={selected} aria-label={`${displayDay} ${block.time}`} className={`time-block ${block.tone} ${selected ? "selected" : ""} ${isRangeStart ? "range-start" : ""}`} onClick={() => toggleBlock(day, block.id)}><span>{selected ? "✓" : "○"} {blockLabel(block)}</span><time>{block.time}</time></button>; };
  return (
      <div className="page-stack"><div className="page-title"><div><p className="eyebrow">2026.10.26–11.08</p><h2>{t("schedule")}</h2><p>{t("scheduleDescription")}</p></div><button className="primary-button" onClick={generate} disabled={status === "running"}><Sparkles size={18} />{status === "running" ? t("optimizing") : t("generate")}</button></div>
      <div className="two-column">
        <Card className="availability-card">
          <div className="section-heading"><div><h3>{t("availability")}</h3><p className="muted">{t("tapTimeSlot")}</p></div><div className="button-row desktop-actions"><button className="text-button" onClick={copyPreviousDay}>{t("copyPrevious")}</button><button className="text-button" onClick={applyWeekdays}>{t("weekdays")}</button></div></div>
          <div className="time-legend" aria-label={t("availability")}><span className="prep">{t("prepHours")}</span><span className="normal">{t("serviceHours")}</span><span className="late">{t("lateHours")}</span><small>{t("rangeHint")}</small></div>
          <div className="availability-grid desktop-availability">{availabilityDays.map((day) => <div className="availability-row" key={day}><strong>{localizedDay(day, i18n.language)}</strong><div className="time-scroll"><div className="time-blocks">{availabilityBlocks.map((block) => renderBlock(day, block))}</div></div></div>)}</div>
          <div className="mobile-availability">
            <div className="mobile-day-tabs" role="tablist" aria-label={t("availability")}>{availabilityDays.map((day) => <button key={day} role="tab" aria-selected={mobileDay === day} className={mobileDay === day ? "active" : ""} onClick={() => setMobileDay(day)}><strong>{localizedDay(day, i18n.language).split(" ")[0]}</strong><span>{localizedDay(day, i18n.language).split(" ")[1]}</span><small>{availability[day].length}</small></button>)}</div>
            <div className="mobile-day-heading"><div><strong>{localizedDay(mobileDay, i18n.language)}</strong><span>{rangeStart[mobileDay]?.action === "remove" ? t("rangeHintRemove") : rangeStart[mobileDay] ? t("rangeHintAdd") : `${availability[mobileDay].length} / ${availabilityBlocks.length} ${t("selectedSlots")}`}</span></div><button className="text-button" onClick={applyWeekdays}>{t("weekdaysApply")}</button></div>
            <div className="mobile-presets"><button onClick={() => applyPreset(allAvailabilityIds)}>{t("allHours")}</button><button onClick={() => applyPreset(daytimeAvailabilityIds)}>{t("daytime")}</button><button onClick={() => applyPreset(nightAvailabilityIds)}>{t("night")}</button><button onClick={() => applyPreset([])}>{t("clear")}</button></div>
            <div className="mobile-time-blocks">{availabilityBlocks.map((block) => renderBlock(mobileDay, block))}</div>
          </div>
          <div className="card-footer"><span className="muted">{t("fixedTimeSlots")}</span><StatusPill tone="normal">{t("submitted")}</StatusPill></div>
        </Card>
        <div className="page-stack compact-gap"><Card><div className="section-heading"><h3>{t("autoSchedule")}</h3><StatusPill tone={status === "ready" ? "normal" : "neutral"}>{status === "ready" ? t("draftReady") : t("notRun")}</StatusPill></div>{status === "ready" ? <div className="solver-result"><div><strong>{t("noViolations")}</strong><span>{t("coverageRate")}</span></div><div className="score-bar"><span style={{ width: "97.6%" }} /></div><ul><li>{t("missingPosition")}</li><li>{t("avoidedShortShifts")}</li><li>{t("balancedWeekends")}</li></ul><button className="primary-button full">{t("reviewDraft")}</button></div> : <div className="empty-state"><Sparkles size={30} /><strong>{t("availability")} → {t("autoSchedule")}</strong><span>{t("noRelax")}</span></div>}</Card><Card><div className="section-heading"><h3>{t("shiftList")}</h3><span className="muted">{t("peopleCount")}</span></div><div className="shift-list">{shifts.map((shift) => { const area = shift.id === "s1" ? `${t("hall")} · ${t("storeManager")}` : shift.id === "s2" ? `${t("kitchen")} · ${t("wok")}` : shift.id === "s3" ? `${t("hall")} · ${t("register")}` : `${t("kitchen")} · ${t("dishwashing")}`; return <div className="shift-row" key={shift.id}><div><strong>{shift.employee}</strong><span>{area}</span></div><div className="shift-time"><strong>{shift.start}–{shift.end}</strong>{shift.warning && <StatusPill tone="warning">! {t("approaching")} · 89%</StatusPill>}</div></div>; })}</div></Card></div>
      </div>
    </div>
  );
}

function InventoryPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<InventoryItem[]>(initialInventory);
  const [saved, setSaved] = useState(false);
  const setState = (id: string, state: StockState) => { setSaved(false); setItems((current) => current.map((item) => item.id === id ? { ...item, state } : item)); };
  const itemCopy: Record<string, { name: string; forecast: string; recommendation?: string }> = { i1: { name: t("chicken"), forecast: t("chickenForecast"), recommendation: t("chickenRecommendation") }, i2: { name: t("dumplingWrappers"), forecast: t("wrappersForecast") }, i3: { name: t("cabbage"), forecast: t("cabbageForecast"), recommendation: t("cabbageRecommendation") }, i4: { name: t("cookingOil"), forecast: t("oilForecast") }, i5: { name: t("noodles"), forecast: t("noodlesForecast") } };
  return <div className="page-stack"><div className="page-title"><div><p className="eyebrow">{t("scheduledCheck")}</p><h2>{t("inventory")}</h2><p>{t("inventoryDescription")}</p></div><div className="button-row"><button className="secondary-button" onClick={() => setItems(initialInventory)}>{t("applyYesterday")}</button><button className="primary-button" onClick={() => setSaved(true)}><Check size={18} />{saved ? t("saved") : t("save")}</button></div></div><Card><div className="inventory-table"><div className="inventory-head"><span>{t("itemLabel")}</span><span>{t("stateLabel")}</span><span>{t("forecastLabel")}</span></div>{items.map((item) => { const copy = itemCopy[item.id] ?? { name: item.name, forecast: item.forecast, recommendation: item.recommendation }; return <div className="inventory-row" key={item.id}><div><strong>{copy.name}</strong><span>{t("stockKeyword")}</span></div><div className="stock-buttons">{stockOptions.map((state) => <button key={state} className={item.state === state ? `selected ${state}` : ""} onClick={() => setState(item.id, state)}>{t(state)}</button>)}</div><div className="forecast"><strong>{copy.forecast}</strong>{copy.recommendation && <span>{copy.recommendation}</span>}</div></div>; })}</div></Card><Card className="suggestion-card"><PackageCheck size={26} /><div><h3>{t("orderDraft")}</h3><p>{t("orderDraftDescription")}</p></div><button className="secondary-button">{t("reviewContent")}</button></Card></div>;
}

function ChatPage() {
  const { t } = useTranslation();
  const [response, setResponse] = useState<string>();
  const [resolved, setResolved] = useState(false);
  return <div className="page-stack"><div className="page-title"><div><p className="eyebrow">{t("publicRoom")}</p><h2>{t("chat")}</h2><p>{t("chatDescription")}</p></div><button className="primary-button">＋ {t("addHandover")}</button></div><div className="chat-shell"><div className="chat-day">{t("chatDate")}</div><div className="message"><div className="message-avatar">山</div><div><div className="message-meta"><strong>山田</strong><time>10:25</time></div><div className="bubble">{t("fridgeMessage")}</div></div></div><Card className="support-card"><div className="card-title-row"><div><p className="eyebrow"><AlertTriangle size={14} />{t("support")}</p><h3>{t("todayLabel")} 18:00–20:30 · {t("wok")}</h3></div><StatusPill tone="danger">{t("responseDeadline")}</StatusPill></div><p>{t("absenceNotice")}</p><div className="support-actions"><button className={response === "yes" ? "selected" : ""} onClick={() => setResponse("yes")}>{t("canSupport")}</button><button className={response === "partial" ? "selected" : ""} onClick={() => setResponse("partial")}>{t("partialSupport")}</button><button className={response === "no" ? "selected" : ""} onClick={() => setResponse("no")}>{t("cannotSupport")}</button></div>{response && <p className="confirmation"><Check size={16} />{t("responseAccepted")}</p>}</Card><Card className="handover-card"><div className="handover-photo" aria-label={`${t("equipmentLabel")} · ${t("refrigerator")}`}><Archive size={32} /><span>{t("photoLabel")}</span></div><div className="card-body"><div className="card-title-row"><h3>{t("equipmentLabel")} · {t("refrigerator")}</h3><StatusPill tone={resolved ? "normal" : "warning"}>{resolved ? t("resolved") : t("unresolved")}</StatusPill></div><p>{t("closeCheck")}</p><div className="meta"><span>{t("assignedTo")}</span><span>{t("beforeShift")}</span></div></div><button className="secondary-button" onClick={() => setResolved(!resolved)}>{resolved ? t("reopen") : t("resolve")}</button></Card></div></div>;
}

type AttendanceDay = { label: string; minutes: number; status: "WORKED" | "OFF" | "LEAVE"; slotStart?: string; slotEnd?: string };

const attendanceWeekdays: Record<string, string[]> = {
  ja: ["月", "火", "水", "木", "金", "土", "日"],
  zh: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
  "zh-TW": ["週一", "週二", "週三", "週四", "週五", "週六", "週日"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  ko: ["월", "화", "수", "목", "금", "토", "일"],
  vi: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
};

function localizedLaborReason(employee: { warning: { level: string }; laborMonitor?: { basis: string } }, t: (key: string) => string): string {
  if (employee.laborMonitor?.basis === "MONTHLY_OVERTIME") {
    return employee.warning.level === "ACTION" ? t("monthlyOvertimeOver") : employee.warning.level === "APPROACHING" ? t("monthlyOvertimeNear") : t("monthlyOvertimeWithin");
  }
  if (employee.laborMonitor?.basis === "PART_TIME_NO_IMMIGRATION_CAP") return t("regularPartTimeNoCap");
  return employee.warning.level === "ACTION" ? t("weeklyLimitOver") : employee.warning.level === "APPROACHING" ? t("weeklyLimitNear") : t("weeklyLimitWithin");
}

function employeeStatusLabel(value: string, t: (key: string) => string): string {
  const labels: Record<string, string> = { ACTIVE: t("statusActive"), ON_LEAVE: t("statusOnLeave"), INACTIVE: t("statusInactive") };
  return labels[value] ?? t("unknownStatus");
}

function laborRuleLabel(value: string, t: (key: string) => string): string {
  const labels: Record<string, string> = { FULL_TIME: t("laborRuleFullTime"), SPECIFIED_SKILLED: t("laborRuleSpecified"), PART_TIME: t("laborRulePartTime"), STUDENT_PART_TIME: t("laborRuleStudent") };
  return labels[value] ?? t("unknownStatus");
}

function residenceStatusLabel(value: string, t: (key: string) => string): string {
  const labels: Record<string, string> = {
    "留学": t("residenceStudent"),
    "特定技能": t("residenceSpecified"),
    "技術・人文知識・国際業務": t("residenceEngineer"),
    "永住者": t("residencePermanent"),
    "日本人の配偶者等": t("residenceSpouse"),
    "定住者": t("residenceLongTerm"),
    "家族滞在": t("residenceFamily"),
    "なし": t("residenceNone")
  };
  return labels[value] ?? t("unknownStatus");
}

function roleTitleLabel(value: string, t: (key: string) => string): string {
  const labels: Record<string, string> = {
    "店長": t("roleManager"),
    "副店長": t("roleDeputyManager"),
    "ホールリーダー": t("roleHallLeader"),
    "ホール担当": t("roleHall"),
    "ホール兼務": t("roleFrontPartTime"),
    "地元ホール担当": t("roleHall"),
    "店長補佐": t("roleDeputyManager"),
    "調理リーダー": t("roleKitchenLeader"),
    "調理担当": t("roleKitchenLeader"),
    "調理主任": t("roleKitchenLeader"),
    "調理補助": t("skillCookingSupport"),
    "麺場リーダー": t("roleNoodleLeader"),
    "深夜統括": t("roleNoodleLeader"),
    "深夜責任者": t("roleNoodleLeader"),
    "ホール": t("roleHall"),
    "ホール新人": t("roleHallNewcomer"),
    "ホールサポート": t("roleHallSupport"),
    "留学生アルバイト": t("roleStudentPartTime"),
    "アルバイト": t("rolePartTime"),
    "洗い場・仕込み": t("roleDishwashingPrep"),
    "後厨房アルバイト": t("roleKitchenPartTime"),
    "前台兼职": t("roleFrontPartTime"),
    "后厨兼职": t("roleKitchenPartTime"),
    "洗場サポート": t("roleDishwashingSupport"),
    "洗い場サポート": t("roleDishwashingSupport"),
    "洗い場": t("skillDishwashing"),
    "仕込み補助": t("skillPrepSupport"),
    "閉店清掃": t("skillClosingCleaning"),
    "新人スタッフ": t("roleHallNewcomer"),
    "教育担当": t("skillNewcomerTraining"),
    "留学生ホール": t("roleStudentPartTime"),
    "留学生レジ": t("roleStudentPartTime"),
    "留学生キッチン": t("roleStudentPartTime"),
    "留学生調理補助": t("roleStudentPartTime"),
    "特定技能調理": t("roleKitchenLeader"),
    "ランチ責任者": t("roleKitchenLeader")
  };
  return labels[value] ?? (/^[A-Z_]+$/.test(value) || /[\u3040-\u30ff\u3400-\u9fff]/.test(value) ? t("unknownStatus") : value);
}

function skillPositionLabel(value: string, t: (key: string) => string): string {
  const labels: Record<string, string> = {
    "ホール": t("roleHall"), "レジ": t("skillRegister"), "発注": t("ordering"), "鍋場": t("skillWok"), "油場": t("skillFryer"),
    "新人指導": t("skillNewcomerTraining"), "新人帯教": t("skillNewcomerTraining"), "新人带教": t("skillNewcomerTraining"), "配膳": t("skillServing"), "麺場": t("skillWok"), "麺場補助": t("skillNoodleSupport"),
    "洗い場": t("skillDishwashing"), "洗い場サポート": t("roleDishwashingSupport"), "洗場サポート": t("roleDishwashingSupport"), "仕込み": t("skillPrep"), "仕込み補助": t("skillPrepSupport"), "迎賓": t("skillWelcome"), "外卖": t("skillTakeout"), "外販": t("skillTakeout"),
    "深夜責任者": t("roleNoodleLeader"), "ホール指導": t("skillHallCoaching"), "清掃": t("skillCleaning"), "閉店清掃": t("skillClosingCleaning"), "閉店": t("skillClosing"), "開店": t("skillOpening"), "ホール管理": t("skillHallManagement"), "調理": t("skillCooking"), "調理補助": t("skillCookingSupport"), "調理全般": t("skillCookingAll"), "接客": t("skillCustomerService"), "レジ教育": t("skillRegisterTraining")
  };
  return labels[value] ?? (/^[A-Z_]+$/.test(value) || /[\u3040-\u30ff\u3400-\u9fff]/.test(value) ? t("unknownStatus") : value);
}

function trainingStatusLabel(value: string, t: (key: string) => string): string {
  const labels: Record<string, string> = { NOT_STARTED: t("notStarted"), LEARNING: t("learning"), CAN_ASSIST: t("canAssist"), INDEPENDENT: t("independent"), CAN_TRAIN: t("canTrain"), COMPLETED: t("trainingCompleted"), IN_PROGRESS: t("trainingInProgress") };
  return labels[value] ?? t("unknownStatus");
}

function skillLevelLabel(value: string, t: (key: string) => string): string {
  const labels: Record<string, string> = { NOT_STARTED: t("notStarted"), LEARNING: t("learning"), CAN_ASSIST: t("canAssist"), INDEPENDENT: t("independent"), CAN_TRAIN: t("canTrain") };
  return labels[value] ?? t("unknownStatus");
}

function trainingKeyLabel(value: string, t: (key: string) => string): string {
  const labels: Record<string, string> = { "food-safety-basics": t("foodSafetyBasics") };
  return labels[value] ?? t("unknownStatus");
}

function preferenceLabel(value: string, t: (key: string) => string): string {
  const labels: Record<string, string> = { AVAILABLE: t("available"), DESIRED: t("desired"), PREFERRED: t("preferred"), UNAVAILABLE: t("unavailable") };
  return labels[value] ?? t("unknownStatus");
}

function formatDateValue(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return value;
}

function localizedWeekdayLabel(weekday: number, language: string): string {
  const names: Record<string, string[]> = {
    ja: ["月", "火", "水", "木", "金", "土", "日"],
    zh: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
    "zh-TW": ["週一", "週二", "週三", "週四", "週五", "週六", "週日"],
    en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    ko: ["월", "화", "수", "목", "금", "토", "일"],
    vi: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
  };
  return (names[language] ?? names.ja)[Math.max(0, weekday - 1)] ?? "—";
}

function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor((total / 60) % 24)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function buildAttendanceWeek(employee: { id: string; weeklyMinutes: number; status: string }, language: string, availability: Array<{ weekday: number; slotStart: string; slotEnd: string }> = []): AttendanceDay[] {
  const labels = attendanceWeekdays[language] ?? attendanceWeekdays.ja;
  if (employee.status === "ON_LEAVE") return labels.map((label) => ({ label, minutes: 0, status: "LEAVE" }));
  if (employee.status === "INACTIVE") return labels.map((label) => ({ label, minutes: 0, status: "OFF" }));
  const total = Math.max(0, employee.weeklyMinutes);
  if (total === 0) return labels.map((label) => ({ label, minutes: 0, status: "OFF" }));
  // Demo distribution: keep a stable five-day pattern per employee while preserving the exact weekly total.
  const seed = Array.from(employee.id).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const workdayCount = total >= 40 * 60 ? 5 : Math.min(6, Math.max(1, Math.ceil(total / 360)));
  const start = seed % 7;
  const workdays = Array.from({ length: workdayCount }, (_, index) => (start + index) % 7);
  const dailyBase = Math.floor(total / workdayCount / 60) * 60;
  let remainder = total - dailyBase * workdayCount;
  return labels.map((label, index) => {
    const position = workdays.indexOf(index);
    if (position < 0) return { label, minutes: 0, status: "OFF" };
    const extra = remainder >= 60 ? 60 : remainder;
    remainder -= extra;
    const minutes = dailyBase + extra;
    const preferredSlot = availability.find((slot) => slot.weekday === index + 1);
    const slotStart = preferredSlot?.slotStart ?? "17:00";
    const slotEnd = preferredSlot?.slotEnd ?? addMinutesToTime(slotStart, minutes);
    return { label, minutes, status: "WORKED", slotStart, slotEnd };
  });
}

function WeeklyAttendance({ employee, language, availability, t }: { employee: { id: string; displayName: string; weeklyMinutes: number; weeklyLimitMinutes: number; outsideWorkMinutes: number; status: string; warning: { level: string; reason: string }; laborMonitor?: { basis: string; standardPeriod?: string; standardMinutes?: number; overtimeMinutes?: number; overtimeLimitMinutes?: number; studentWorkPeriod?: string; scheduleBlocked?: boolean } }; language: string; availability?: Array<{ weekday: number; slotStart: string; slotEnd: string }>; t: (key: string) => string }) {
  const days = buildAttendanceWeek(employee, language, availability);
  const maxMinutes = Math.max(600, ...days.map((day) => day.minutes));
  const workedMinutes = days.reduce((sum, day) => sum + day.minutes, 0);
  const studentBasis = employee.laborMonitor?.basis === "WEEKLY_LIMIT" && Boolean(employee.laborMonitor.studentWorkPeriod);
  const regularPartTime = employee.laborMonitor?.basis === "PART_TIME_NO_IMMIGRATION_CAP";
  const monthlyBasis = employee.laborMonitor?.basis === "MONTHLY_OVERTIME";
  const onLeave = employee.status === "ON_LEAVE";
  const inactive = employee.status === "INACTIVE";
  const statusOnly = onLeave || inactive;
  const remainingMinutes = studentBasis ? Math.max(0, employee.weeklyLimitMinutes - employee.weeklyMinutes - employee.outsideWorkMinutes) : Math.max(0, employee.weeklyLimitMinutes - employee.weeklyMinutes);
  const statusText = employee.status === "ON_LEAVE" ? t("onLeave") : employee.status === "INACTIVE" ? t("inactive") : t("active");
  const warningTone: "normal" | "warning" | "danger" | "neutral" = employee.status === "ON_LEAVE" || employee.status === "INACTIVE" ? "neutral" : employee.warning.level === "ACTION" ? "danger" : employee.warning.level === "APPROACHING" ? "warning" : "normal";
  return <div className="weekly-attendance">
    <div className="section-heading"><div><p className="eyebrow"><CalendarCheck size={14} />{t("attendanceDemo")}</p><h4>{t("weeklyAttendance")}</h4></div><StatusPill tone={warningTone}>{statusText}</StatusPill></div>
    <div className={`attendance-summary ${statusOnly ? "attendance-summary-status" : studentBasis ? "attendance-summary-student" : ""}`} aria-label={t("attendanceSummary")}>
      {onLeave ? <div><span>{t("warningStatus")}</span><strong>{t("leaveCurrentNoAttendance")}</strong></div> : inactive ? <div><span>{t("warningStatus")}</span><strong>{t("inactiveHistoricalNoMonitoring")}</strong></div> : studentBasis ? <>
        <div><span>{t("storeHours")}</span><strong>{(workedMinutes / 60).toFixed(1)}h</strong></div>
        <div><span>{t("outsideWorkHours")}</span><strong>{(employee.outsideWorkMinutes / 60).toFixed(1)}h</strong></div>
        <div><span>{t("combinedHours")}</span><strong>{((workedMinutes + employee.outsideWorkMinutes) / 60).toFixed(1)}h</strong></div>
        <div><span>{employee.laborMonitor?.studentWorkPeriod === "LONG_VACATION" ? t("studentHolidayLimit") : t("studentTermLimit")}</span><strong>{(employee.weeklyLimitMinutes / 60).toFixed(1)}h</strong></div>
        <div><span>{t("remainingHours")}</span><strong>{(remainingMinutes / 60).toFixed(1)}h</strong></div>
      </> : monthlyBasis ? <>
        <div><span>{t("workedHours")}</span><strong>{(workedMinutes / 60).toFixed(1)}h</strong></div>
        <div><span>{t("monthlyStandard")}</span><strong>{((employee.laborMonitor?.standardMinutes ?? 0) / 60).toFixed(1)}h</strong></div>
        <div><span>{t("overtimeHours")}</span><strong>{((employee.laborMonitor?.overtimeMinutes ?? 0) / 60).toFixed(1)}h / {((employee.laborMonitor?.overtimeLimitMinutes ?? 0) / 60).toFixed(1)}h</strong></div>
        {!inactive && <div><span>{t("remainingHours")}</span><strong>{Math.max(0, ((employee.laborMonitor?.overtimeLimitMinutes ?? 0) - (employee.laborMonitor?.overtimeMinutes ?? 0)) / 60).toFixed(1)}h</strong></div>}
      </> : <>
        <div><span>{t("workedHours")}</span><strong>{(workedMinutes / 60).toFixed(1)}h</strong></div>
        <div><span>{regularPartTime ? t("noImmigrationCap") : t("weeklyLimit")}</span><strong>{regularPartTime ? "—" : `${(employee.weeklyLimitMinutes / 60).toFixed(1)}h`}</strong></div>
        <div><span>{t("outsideWorkHours")}</span><strong>{(employee.outsideWorkMinutes / 60).toFixed(1)}h</strong></div>
        <div><span>{t("remainingHours")}</span><strong>{regularPartTime || inactive ? "—" : `${(remainingMinutes / 60).toFixed(1)}h`}</strong></div>
      </>}
    </div>
    <div className="attendance-chart-shell">
      <div className="attendance-legend" aria-label={t("attendanceSummary")}>{onLeave ? <span><i className="attendance-swatch leave" aria-hidden="true" />{t("leaveDay")}</span> : inactive ? <span>{t("inactiveHistoricalNoMonitoring")}</span> : <><span><i className="attendance-swatch regular" aria-hidden="true" />{t("regularDay")}</span><span><i className="attendance-swatch overtime" aria-hidden="true" />{t("overtimeDay")}</span><span><i className="attendance-swatch leave" aria-hidden="true" />{t("leaveDay")}</span></>}</div>
      <div className="attendance-chart" role="img" aria-label={`${t("weeklyAttendance")} · ${employee.displayName ?? ""}`}>
        {days.map((day) => {
          const height = day.minutes === 0 ? 0 : Math.max(5, Math.round(day.minutes / maxMinutes * 100));
          const overtime = day.minutes > 480;
          return <div className="attendance-day" key={day.label}>
            <div className="attendance-bar-track"><span className={`attendance-bar ${overtime ? "overtime" : ""} ${day.status === "LEAVE" ? "leave" : ""} ${day.status === "OFF" ? "off" : ""}`} style={{ height: `${height}%` }} /></div>
            <strong className="attendance-hours">{day.minutes ? `${(day.minutes / 60).toFixed(1)}h` : day.status === "LEAVE" ? t("leaveShort") : "—"}</strong>
            <span className="attendance-time">{day.slotStart && day.slotEnd ? `${day.slotStart}–${day.slotEnd}` : "—"}</span>
            <span className="attendance-label">{day.label}</span>
          </div>;
        })}
      </div>
    </div>
    {!statusOnly && <div className="attendance-note"><span>{t("warningReason")}</span><strong>{employee.laborMonitor?.scheduleBlocked ? t("scheduleBlocked") : localizedLaborReason(employee, t)}</strong></div>}
  </div>;
}

export function EmployeesPageContent({ role }: { role: "manager" | "staff" }) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [customFields, setCustomFields] = useState<CustomFields>(() => emptyCustomFields());
  const [customCommittedValues, setCustomCommittedValues] = useState<Partial<Record<EditableSelectKey, string>>>({});
  const [presetMenuKey, setPresetMenuKey] = useState<EditableSelectKey | null>(null);
  const [draft, setDraft] = useState<EmployeeDraft>(() => defaultEmployeeDraft());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const savedDraftRef = useRef<EmployeeDraft | null>(null);
  const employeesQuery = useEmployees({ query, status: status || undefined });
  const detailQuery = useEmployee(selectedId);
  const storeSettingsQuery = useStoreSettings();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee(selectedId ?? "");
  const deactivateEmployee = useDeactivateEmployee(selectedId ?? "");
  const reactivateEmployee = useReactivateEmployee(selectedId ?? "");
  const placeEmployeeOnLeave = usePlaceEmployeeOnLeave(selectedId ?? "");
  const handleStatusFilterChange = (nextStatus: string) => {
    setStatus(nextStatus);
    setSelectedId(null);
    setEditing(false);
    setPresetMenuKey(null);
  };
  const items = [...(employeesQuery.data ?? [])].sort((a, b) => {
    const statusRank = (status: string) => status === "ACTIVE" ? 0 : status === "ON_LEAVE" ? 2 : 3;
    const employmentRank = (type: string) => type === "FULL_TIME" ? 0 : type === "SPECIFIED_SKILLED" ? 1 : 2;
    const titleRank = (title: string) => title === "店長" ? 0 : title === "副店長" ? 1 : /リーダー|責任者/.test(title) ? 2 : 3;
    return statusRank(a.status) - statusRank(b.status) || (a.status === "ACTIVE" && b.status === "ACTIVE" ? employmentRank(a.employmentType) - employmentRank(b.employmentType) || titleRank(a.roleTitle) - titleRank(b.roleTitle) || (b.experienceMonths ?? 0) - (a.experienceMonths ?? 0) : 0) || a.displayName.localeCompare(b.displayName, "ja");
  });
  const selected = detailQuery.data?.employee;
  const minimumWageYen = storeSettingsQuery.data?.minimumWageYen;
  const wagePresets = useMemo(() => minimumWageYen ? Array.from(new Set([...wageOptions, minimumWageYen])).sort((a, b) => a - b) : wageOptions, [minimumWageYen]);

  const setDraftValue = (key: keyof EmployeeDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  };

  const buildPayload = (source: EmployeeDraft) => ({
    ...source,
    hourlyWageYen: source.hourlyWageYen ? Number(source.hourlyWageYen) : undefined,
    experienceMonths: Number(source.experienceMonths),
    commuteMinutes: Number(source.commuteMinutes),
    outsideWorkMinutes: Number(source.outsideWorkMinutes),
    weeklyLimitMinutes: Number(source.weeklyLimitMinutes),
    contractTargetMinutes: Number(source.contractTargetMinutes),
    contractLimitMinutes: Number(source.contractLimitMinutes),
    skills: selected?.skills ?? []
  });

  const validateDraft = (source: EmployeeDraft) => {
    const errors: Record<string, string> = {};
    if (!source.displayName.trim()) errors.displayName = t("requiredValue");
    if (!source.roleTitle.trim()) errors.roleTitle = t("requiredValue");
    if (!minimumWageYen) errors.hourlyWageYen = t("minimumWageMissing");
    else if (!source.hourlyWageYen || !Number.isInteger(Number(source.hourlyWageYen)) || Number(source.hourlyWageYen) <= 0) errors.hourlyWageYen = t("requiredValue");
    if (source.experienceMonths.trim() === "" || !Number.isInteger(Number(source.experienceMonths)) || Number(source.experienceMonths) < 0) errors.experienceMonths = t("requiredValue");
    if (source.commuteMinutes.trim() === "" || !Number.isInteger(Number(source.commuteMinutes)) || Number(source.commuteMinutes) < 0) errors.commuteMinutes = t("requiredValue");
    const outsideWork = Number(source.outsideWorkMinutes);
    if (!Number.isFinite(outsideWork) || outsideWork < 0 || outsideWork > 1680) errors.outsideWorkMinutes = t("requiredValue");
    if (!source.laborRuleCode.trim()) errors.laborRuleCode = t("requiredValue");
    if (!residenceStatusOptions.includes(source.residenceStatus)) errors.residenceStatus = t("requiredValue");
    for (const key of ["contractTargetMinutes", "contractLimitMinutes"] as const) {
      const value = Number(source[key]);
      if (!Number.isInteger(value) || value <= 0) errors[key] = t("requiredValue");
    }
    if (Number(source.contractLimitMinutes) < Number(source.contractTargetMinutes)) errors.contractLimitMinutes = t("contractLimitError");
    return errors;
  };

  const autosave = (nextDraft: EmployeeDraft) => {
    if (!selectedId) return;
    const errors = validateDraft(nextDraft);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setAutoSaveState("error");
      return;
    }
    setAutoSaveState("saving");
    updateEmployee.mutate(buildPayload(nextDraft), {
      onSuccess: () => {
        savedDraftRef.current = nextDraft;
        setAutoSaveState("saved");
      },
      onError: () => setAutoSaveState("error")
    });
  };

  const beginEdit = (employee?: typeof items[number]) => {
    const source = employee ?? selected;
    if (!source) {
      const nextDraft = defaultEmployeeDraft(minimumWageYen);
      setDraft(nextDraft);
      savedDraftRef.current = null;
      setCustomFields(emptyCustomFields());
      setCustomCommittedValues({});
      setPresetMenuKey(null);
      setFieldErrors({});
      setAutoSaveState("idle");
      setEditing(true);
      return;
    }
    const profile = detailQuery.data?.profile;
    const nextDraft: EmployeeDraft = {
      displayName: source.displayName,
      employmentType: source.employmentType,
      roleTitle: source.roleTitle,
      hourlyWageYen: profile?.hourlyWageYen?.toString() ?? "",
      experienceMonths: String(profile?.experienceMonths ?? 0),
      commuteMinutes: String(profile?.commuteMinutes ?? 30),
      outsideWorkMinutes: String(profile?.outsideWorkMinutes ?? source.outsideWorkMinutes),
      phone: profile?.phone ?? "",
      residenceStatus: residenceStatusOptions.includes(profile?.residenceStatus ?? "") ? profile?.residenceStatus ?? "なし" : "なし",
      residenceExpiryDate: profile?.residenceExpiryDate ?? "",
      laborRuleCode: profile?.laborRuleCode ?? "PART_TIME",
      weeklyLimitMinutes: String(source.weeklyLimitMinutes),
      contractTargetMinutes: String(detailQuery.data?.contract?.targetMinutes ?? source.weeklyLimitMinutes),
      contractLimitMinutes: String(detailQuery.data?.contract?.limitMinutes ?? source.weeklyLimitMinutes),
      traits: profile?.traits ?? "",
      notes: profile?.notes ?? ""
    };
    setDraft(nextDraft);
    savedDraftRef.current = nextDraft;
    const nextCustomFields = emptyCustomFields();
    const nextCommittedValues: Partial<Record<EditableSelectKey, string>> = {};
    if (!roleOptions.includes(nextDraft.roleTitle)) nextCommittedValues.roleTitle = nextDraft.roleTitle;
    if (!wagePresets.includes(Number(nextDraft.hourlyWageYen))) nextCommittedValues.hourlyWageYen = nextDraft.hourlyWageYen;
    if (!experienceOptions.includes(Number(nextDraft.experienceMonths))) nextCommittedValues.experienceMonths = nextDraft.experienceMonths;
    if (!commuteOptions.includes(Number(nextDraft.commuteMinutes))) nextCommittedValues.commuteMinutes = nextDraft.commuteMinutes;
    if (!outsideWorkOptions.includes(Number(nextDraft.outsideWorkMinutes))) nextCommittedValues.outsideWorkMinutes = nextDraft.outsideWorkMinutes;
    if (!contractHourOptions.includes(Number(nextDraft.contractTargetMinutes) / 60)) nextCommittedValues.contractTargetMinutes = nextDraft.contractTargetMinutes;
    if (!contractHourOptions.includes(Number(nextDraft.contractLimitMinutes) / 60)) nextCommittedValues.contractLimitMinutes = nextDraft.contractLimitMinutes;
    if (!["FULL_TIME", "SPECIFIED_SKILLED", "PART_TIME", "STUDENT_PART_TIME"].includes(nextDraft.laborRuleCode)) nextCommittedValues.laborRuleCode = nextDraft.laborRuleCode;
    setCustomFields(nextCustomFields);
    setCustomCommittedValues(nextCommittedValues);
    setPresetMenuKey(null);
    setFieldErrors({});
    setAutoSaveState("idle");
    setEditing(true);
  };

  const beginNewEmployee = () => {
    const nextDraft = defaultEmployeeDraft(minimumWageYen);
    setSelectedId(null);
    setDraft(nextDraft);
    savedDraftRef.current = null;
    setCustomFields(emptyCustomFields());
    setCustomCommittedValues({});
    setPresetMenuKey(null);
    setFieldErrors({});
    setAutoSaveState("idle");
    setEditing(true);
  };

  const save = () => {
    const errors = validateDraft(draft);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setAutoSaveState("error");
      return;
    }
    const mutation = selectedId ? updateEmployee : createEmployee;
    mutation.mutate(buildPayload(draft), {
      onSuccess: (employee) => {
        savedDraftRef.current = draft;
        setAutoSaveState("saved");
        setEditing(false);
        setSelectedId(employee.id);
      },
      onError: () => setAutoSaveState("error")
    });
  };

  const handleSelectChange = (key: EditableSelectKey, value: string) => {
    if (value === CUSTOM_OPTION) {
      setCustomFields((current) => ({ ...current, [key]: true }));
      setCustomCommittedValues((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      setDraftValue(key, "");
      return;
    }
    setCustomFields((current) => ({ ...current, [key]: false }));
    setCustomCommittedValues((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setPresetMenuKey(null);
    const nextDraft = { ...draft, [key]: value } as EmployeeDraft;
    setDraft(nextDraft);
    setFieldErrors((current) => ({ ...current, [key]: "" }));
    autosave(nextDraft);
  };

  const customValue = (key: EditableSelectKey) => (key === "outsideWorkMinutes" || key === "contractTargetMinutes" || key === "contractLimitMinutes") && draft[key] ? String(Number(draft[key]) / 60) : draft[key];

  const handleCustomChange = (key: EditableSelectKey, rawValue: string) => {
    if (key === "roleTitle" || key === "laborRuleCode") {
      setDraftValue(key, rawValue);
      return;
    }
    const sanitized = rawValue.replace(/[^\d.]/g, "");
    const nextValue = (key === "outsideWorkMinutes" || key === "contractTargetMinutes" || key === "contractLimitMinutes") ? (sanitized ? String(Math.round(Number(sanitized) * 60)) : "") : sanitized.replace(/\./g, "");
    setDraftValue(key, nextValue);
  };

  const handleCustomBlur = (key: EditableSelectKey) => {
    const value = customValue(key).trim();
    const isNumeric = key !== "roleTitle" && key !== "laborRuleCode";
    const validOutsideWork = key !== "outsideWorkMinutes" || (Number(value) <= 28 && Number.isInteger(Number(value) * 2));
    const validNumber = !isNumeric || (value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0 && validOutsideWork);
    if (!value || !validNumber) {
      const fallback = selectedId ? savedDraftRef.current?.[key] ?? "" : "";
      setDraftValue(key, fallback);
      setFieldErrors((current) => ({ ...current, [key]: t("requiredValue") }));
      setAutoSaveState("error");
      return;
    }
    setCustomFields((current) => ({ ...current, [key]: false }));
    setCustomCommittedValues((current) => ({ ...current, [key]: draft[key] }));
    setPresetMenuKey(null);
    autosave({ ...draft });
  };

  const renderCustomSelect = (key: EditableSelectKey, label: string, options: Array<string | number>, format: (value: string | number) => string) => {
    const isCustom = customFields[key];
    const committedValue = customCommittedValues[key];
    const fieldHelp = key === "hourlyWageYen"
      ? <small className="field-help">{minimumWageYen ? t("minimumWage") + ": ¥" + minimumWageYen.toLocaleString() + " · " + (storeSettingsQuery.data?.prefecture ?? "") : t("minimumWageMissing")}</small>
      : <small className="field-help field-help-placeholder" aria-hidden="true">&nbsp;</small>;
    if (!isCustom && committedValue !== undefined) return <div className="employee-field">
      <span className="employee-field-label">{label}</span>
      <div className="employee-select-menu" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPresetMenuKey(null); }}>
        <button type="button" className="employee-select-display" aria-haspopup="listbox" aria-expanded={presetMenuKey === key} onClick={() => setPresetMenuKey((current) => current === key ? null : key)}>{format(committedValue)} <ChevronDown size={16} /></button>
        {presetMenuKey === key && <div className="employee-option-menu" role="listbox" aria-label={label}>
          {options.map((option) => <button type="button" role="option" className="employee-option" key={String(option)} onClick={() => { setPresetMenuKey(null); handleSelectChange(key, String(option)); }}>{format(option)}</button>)}
          <button type="button" role="option" className="employee-option" onClick={() => { setPresetMenuKey(null); handleSelectChange(key, CUSTOM_OPTION); }}>{t("customInput")}</button>
        </div>}
      </div>
      {fieldHelp}
      {fieldErrors[key] && <small className="field-error" role="alert">{fieldErrors[key]}</small>}
    </div>;
    return <div className="employee-field">
      <span className="employee-field-label">{label}</span>
      <select aria-label={label} value={isCustom ? CUSTOM_OPTION : committedValue ?? draft[key]} onChange={(event) => handleSelectChange(key, event.target.value)}>
        {!isCustom && committedValue !== undefined && <option hidden value={committedValue}>{format(committedValue)}</option>}
        {options.map((option) => <option key={String(option)} value={String(option)}>{format(option)}</option>)}
        <option value={CUSTOM_OPTION}>{t("customInput")}</option>
      </select>
      {fieldHelp}
      {isCustom && <input aria-label={label + " " + t("customInput")} type="text" inputMode={key === "outsideWorkMinutes" || key === "contractTargetMinutes" || key === "contractLimitMinutes" ? "decimal" : key === "roleTitle" || key === "laborRuleCode" ? "text" : "numeric"} value={customValue(key)} placeholder={t("customInput")} onChange={(event) => handleCustomChange(key, event.target.value)} onBlur={() => handleCustomBlur(key)} />}
      {fieldErrors[key] && <small className="field-error" role="alert">{fieldErrors[key]}</small>}
    </div>;
  };

  const renderFixedSelect = (key: "residenceStatus", label: string, options: string[], format: (value: string) => string) => <div className="employee-field">
    <span className="employee-field-label">{label}</span>
    <select aria-label={label} value={draft[key]} onChange={(event) => { const nextDraft = { ...draft, [key]: event.target.value }; setDraft(nextDraft); setFieldErrors((current) => ({ ...current, [key]: "" })); autosave(nextDraft); }}>
      {options.map((option) => <option key={option} value={option}>{format(option)}</option>)}
    </select>
    {fieldErrors[key] && <small className="field-error" role="alert">{fieldErrors[key]}</small>}
  </div>;

  useEffect(() => {
    if (!editing || selectedId || draft.hourlyWageYen || !minimumWageYen) return;
    setDraft((current) => ({ ...current, hourlyWageYen: String(minimumWageYen) }));
  }, [editing, selectedId, draft.hourlyWageYen, minimumWageYen]);

  const warningTone = (level: string): "normal" | "warning" | "danger" => level === "ACTION" ? "danger" : level === "APPROACHING" ? "warning" : "normal";
  const editorOpen = editing && (!selectedId || Boolean(selected));

  useEffect(() => {
    if (!editorOpen && !selected) return;
    const frame = window.requestAnimationFrame(() => {
      const detail = document.querySelector<HTMLElement>(".employee-detail");
      detail?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editorOpen, selected]);

  useEffect(() => {
    if (!editing || !selected || !detailQuery.data) return;
    const profile = detailQuery.data.profile;
    const nextDraft: EmployeeDraft = {
      displayName: selected.displayName,
      employmentType: selected.employmentType,
      roleTitle: selected.roleTitle,
      hourlyWageYen: profile?.hourlyWageYen?.toString() ?? "",
      experienceMonths: String(profile?.experienceMonths ?? 0),
      commuteMinutes: String(profile?.commuteMinutes ?? 30),
      outsideWorkMinutes: String(profile?.outsideWorkMinutes ?? selected.outsideWorkMinutes),
      phone: profile?.phone ?? "",
      residenceStatus: residenceStatusOptions.includes(profile?.residenceStatus ?? "") ? profile?.residenceStatus ?? "なし" : "なし",
      residenceExpiryDate: profile?.residenceExpiryDate ?? "",
      laborRuleCode: profile?.laborRuleCode ?? "PART_TIME",
      weeklyLimitMinutes: String(selected.weeklyLimitMinutes),
      contractTargetMinutes: String(detailQuery.data?.contract?.targetMinutes ?? selected.weeklyLimitMinutes),
      contractLimitMinutes: String(detailQuery.data?.contract?.limitMinutes ?? selected.weeklyLimitMinutes),
      traits: profile?.traits ?? "",
      notes: profile?.notes ?? ""
    };
    setDraft(nextDraft);
    savedDraftRef.current = nextDraft;
    const nextCommittedValues: Partial<Record<EditableSelectKey, string>> = {};
    if (!roleOptions.includes(nextDraft.roleTitle)) nextCommittedValues.roleTitle = nextDraft.roleTitle;
    if (!wagePresets.includes(Number(nextDraft.hourlyWageYen))) nextCommittedValues.hourlyWageYen = nextDraft.hourlyWageYen;
    if (!experienceOptions.includes(Number(nextDraft.experienceMonths))) nextCommittedValues.experienceMonths = nextDraft.experienceMonths;
    if (!commuteOptions.includes(Number(nextDraft.commuteMinutes))) nextCommittedValues.commuteMinutes = nextDraft.commuteMinutes;
    if (!outsideWorkOptions.includes(Number(nextDraft.outsideWorkMinutes))) nextCommittedValues.outsideWorkMinutes = nextDraft.outsideWorkMinutes;
    if (!contractHourOptions.includes(Number(nextDraft.contractTargetMinutes) / 60)) nextCommittedValues.contractTargetMinutes = nextDraft.contractTargetMinutes;
    if (!contractHourOptions.includes(Number(nextDraft.contractLimitMinutes) / 60)) nextCommittedValues.contractLimitMinutes = nextDraft.contractLimitMinutes;
    if (!["FULL_TIME", "SPECIFIED_SKILLED", "PART_TIME", "STUDENT_PART_TIME"].includes(nextDraft.laborRuleCode)) nextCommittedValues.laborRuleCode = nextDraft.laborRuleCode;
    setCustomFields(emptyCustomFields());
    setCustomCommittedValues(nextCommittedValues);
  }, [editing, selected, detailQuery.data, wagePresets]);

  const detail = detailQuery.data;
  const profile = detail?.profile;
  const contract = detail?.contract;

  const fieldInput = (key: "displayName" | "phone" | "residenceExpiryDate" | "traits" | "notes", label: string, type = "text") => <label className="employee-field">
    <span className="employee-field-label">{label}</span>
    <input aria-label={label} type={type} value={draft[key]} onChange={(event) => setDraftValue(key, event.target.value)} onBlur={() => autosave({ ...draft })} />
    {fieldErrors[key] && <small className="field-error" role="alert">{fieldErrors[key]}</small>}
  </label>;

  return <div className="page-stack">
    <div className="page-title"><div><p className="eyebrow">{t("workforceSkills")}</p><h2>{t("employeePageTitle")}</h2><p>{t("employeeDescription")}</p></div>{role === "manager" && <button className="primary-button" onClick={beginNewEmployee}>＋ {t("addStaff")}</button>}</div>
    <Card className="employee-toolbar"><input aria-label={t("employeeSearch")} placeholder={t("employeeSearch")} value={query} onChange={(event) => { setQuery(event.target.value); setSelectedId(null); setEditing(false); setPresetMenuKey(null); }} /><select aria-label={t("employeeStatus")} value={status} onChange={(event) => handleStatusFilterChange(event.target.value)}><option value="">{t("employeeStatus")}</option><option value="ACTIVE">{t("active")}</option><option value="ON_LEAVE">{t("onLeave")}</option><option value="INACTIVE">{t("inactive")}</option></select></Card>
    {employeesQuery.isLoading && <Card><span>{t("loading")}</span></Card>}
    {employeesQuery.isError && <Card><p>{employeesQuery.error instanceof Error ? employeesQuery.error.message : t("loading")}</p><button className="secondary-button" onClick={() => void employeesQuery.refetch()}>{t("retry")}</button></Card>}
    {!employeesQuery.isLoading && !employeesQuery.isError && items.length === 0 && <Card><span>{t("noEmployees")}</span></Card>}
    <div className="employee-grid">{items.map((employee) => {
      const monitor = employee.laborMonitor;
      const monthlyBasis = monitor?.basis === "MONTHLY_OVERTIME";
      const studentBasis = monitor?.basis === "WEEKLY_LIMIT" && Boolean(monitor.studentWorkPeriod);
      const regularPartTime = monitor?.basis === "PART_TIME_NO_IMMIGRATION_CAP";
      const onLeave = employee.status === "ON_LEAVE";
      const inactive = employee.status === "INACTIVE";
      const severeWarning = !onLeave && !inactive && employee.warning.level === "ACTION";
      const percent = monitor?.warning?.percent ?? Math.round((employee.weeklyMinutes + employee.outsideWorkMinutes) / employee.weeklyLimitMinutes * 100);
      const capacityMinutes = monthlyBasis ? monitor.standardMinutes + monitor.overtimeLimitMinutes : monitor.standardMinutes;
      const normalMinutes = monthlyBasis ? Math.min(monitor.periodMinutes, monitor.standardMinutes) : Math.min(employee.weeklyMinutes, capacityMinutes);
      const extraMinutes = monthlyBasis ? monitor.overtimeMinutes : employee.outsideWorkMinutes;
      const normalPercent = capacityMinutes > 0 ? Math.min(100, normalMinutes / capacityMinutes * 100) : 0;
      const extraPercent = capacityMinutes > 0 ? Math.min(Math.max(0, 100 - normalPercent), extraMinutes / capacityMinutes * 100) : 0;
      const hoursText = onLeave
        ? `0.0h · ${t("onLeave")}`
        : inactive
          ? `${t("historicalHoursLabel")}: ${((monitor?.periodMinutes ?? employee.weeklyMinutes) / 60).toFixed(1)}h`
        : monthlyBasis
          ? `${(monitor.periodMinutes / 60).toFixed(1)}h · ${t("overtimeHours")} ${(monitor.overtimeMinutes / 60).toFixed(1)}h / ${(monitor.overtimeLimitMinutes / 60).toFixed(1)}h · ${t("maxCapacity")} ${(capacityMinutes / 60).toFixed(1)}h`
          : studentBasis
            ? `${(employee.weeklyMinutes / 60).toFixed(1)}h + ${(employee.outsideWorkMinutes / 60).toFixed(1)}h = ${(monitor.periodMinutes / 60).toFixed(1)}h / ${(monitor.standardMinutes / 60).toFixed(1)}h${monitor.scheduleBlocked ? ` · ${t("scheduleBlocked")}` : ""}`
            : regularPartTime
              ? `${(employee.weeklyMinutes / 60).toFixed(1)}h + ${(employee.outsideWorkMinutes / 60).toFixed(1)}h / ${t("contractReference")} ${(monitor.standardMinutes / 60).toFixed(1)}h`
              : `${(employee.weeklyMinutes / 60).toFixed(1)}h + ${(employee.outsideWorkMinutes / 60).toFixed(1)}h / ${(employee.weeklyLimitMinutes / 60).toFixed(1)}h`;
      const statusLabel = onLeave ? t("onLeave") : inactive ? t("inactive") : "";
      const employmentLabel = employee.employmentType === "STUDENT_PART_TIME" ? ` · ${t("internationalStudent")}` : "";
      const cardStatusClass = onLeave ? "employee-on-leave" : inactive ? "employee-inactive" : "";
      const statusTone = onLeave || inactive ? "neutral" : warningTone(employee.warning.level);
      const statusText = onLeave ? t("onLeave") : inactive ? t("inactive") : employee.warning.level === "ACTION" ? "⛔ " + t("action") : employee.warning.level === "APPROACHING" ? "! " + t("approaching") : "✓ " + t("normal");
      return <Card key={employee.id} className={`employee-card ${cardStatusClass}`}><button className="employee-card-button" onClick={() => { setSelectedId(employee.id); setEditing(false); }}><div className="employee-head"><span className="large-avatar">{employee.initials ?? employee.displayName.slice(0, 1)}</span><div><h3>{employee.displayName}</h3><p>{roleTitleLabel(employee.roleTitle, t)}{employmentLabel}{statusLabel ? ` · ${statusLabel}` : ""}</p></div><StatusPill tone={statusTone}>{statusText}</StatusPill></div><div className="skill-tags">{employee.skills.map((skill) => <span key={skill}>{skillPositionLabel(skill, t)}</span>)}{studentBasis && <span className="employment-type-tag">{t("internationalStudent")}</span>}</div><div className="hours"><div><span>{inactive ? t("historicalHoursLabel") : monthlyBasis ? t("monthlyHours") : studentBasis ? t("combinedHours") : t("thisWeek")}</span><strong>{hoursText}</strong></div><div className={`hours-bar ${onLeave ? "hours-bar-leave" : inactive ? "hours-bar-inactive" : severeWarning ? "hours-bar-severe" : ""}`} aria-label={hoursText}>{onLeave || inactive ? null : severeWarning ? <span className="hours-bar-severe-fill" style={{ width: "100%" }} /> : <><span className="hours-bar-normal" style={{ width: `${normalPercent}%` }} />{extraPercent > 0 && <span className="hours-bar-extra" style={{ width: `${extraPercent}%` }} />}</>}</div></div></button><button className="ghost-button full" onClick={() => { setSelectedId(employee.id); setEditing(true); void detailQuery.refetch(); }}>{t("edit")}<ChevronRight size={17} /></button></Card>;
    })}</div>
    {(editorOpen || Boolean(selectedId && selected)) ? <Card className="employee-detail"><div className="section-heading"><div><p className="eyebrow">{t("employeeProfile")}</p><h3>{selected?.displayName ?? t("addStaff")}</h3></div><button className="ghost-button" onClick={() => { setSelectedId(null); setEditing(false); }}>×</button></div>
      {editorOpen ? <div className="employee-form">
        {fieldInput("displayName", t("employees"))}
        {renderCustomSelect("roleTitle", t("workforceSkills"), roleOptions, (value) => roleTitleLabel(String(value), t))}
        {fieldInput("phone", t("phone"))}
        {renderCustomSelect("hourlyWageYen", t("hourlyWage"), wagePresets, (value) => Number(value).toLocaleString() + t("currencySuffix"))}
        {renderCustomSelect("experienceMonths", t("experience"), experienceOptions, (value) => String(value) + t("monthSuffix"))}
        {renderCustomSelect("commuteMinutes", t("commuteMinutesLabel"), commuteOptions, (value) => String(value) + t("minutesSuffix"))}
        {renderCustomSelect("outsideWorkMinutes", t("outsideWork"), outsideWorkOptions, (value) => String(Number(value) / 60) + t("hoursSuffix"))}
        {renderFixedSelect("residenceStatus", t("residenceStatus"), residenceStatusOptions, (value) => residenceStatusLabel(value, t))}
        {fieldInput("residenceExpiryDate", t("residenceExpiry"), "date")}
        {fieldInput("traits", t("traits"))}
        {fieldInput("notes", t("notes"))}
        {renderCustomSelect("laborRuleCode", t("laborRule"), ["FULL_TIME", "SPECIFIED_SKILLED", "PART_TIME", "STUDENT_PART_TIME"], (value) => laborRuleLabel(String(value), t))}
        {customFields.laborRuleCode && <small className="field-help">{t("customRuleUnconfigured")}</small>}
        {renderCustomSelect("contractTargetMinutes", t("contractTargetHours"), contractHourOptions.map((value) => value * 60), (value) => `${Number(value) / 60}h`)}
        {renderCustomSelect("contractLimitMinutes", t("contractLimitHours"), contractHourOptions.map((value) => value * 60), (value) => `${Number(value) / 60}h`)}
        <div className="employee-form-actions"><span className="employee-save-status" role="status" aria-live="polite">{autoSaveState === "saving" ? t("autoSaving") : autoSaveState === "saved" ? t("autoSaved") : autoSaveState === "error" ? t("autoSaveError") : ""}</span><button className="primary-button" onClick={save} disabled={createEmployee.isPending || updateEmployee.isPending}>{t("saveChanges")}</button><button className="ghost-button" onClick={() => setEditing(false)}>{t("cancel")}</button></div>
       </div> : <>
         <div className="employee-detail-grid">
           <section className="employee-info-section"><h4>{t("employeeProfile")}</h4><div className="employee-info-list"><p className="employee-info-row"><span>{t("employmentType")}</span><strong>{selected ? laborRuleLabel(selected.employmentType, t) : "—"}</strong></p><p className="employee-info-row"><span>{t("roleTitle")}</span><strong>{selected ? roleTitleLabel(selected.roleTitle, t) : "—"}</strong></p><p className="employee-info-row"><span>{t("employeeStatus")}</span><strong>{selected ? employeeStatusLabel(selected.status, t) : "—"}</strong></p>{role === "manager" && <p className="employee-info-row"><span>{t("contact")}</span><strong>{profile?.phone || t("noData")}</strong></p>}<p className="employee-info-row"><span>{t("experience")}</span><strong>{profile?.experienceMonths ?? 0}{t("monthSuffix")}</strong></p><p className="employee-info-row"><span>{t("commuteMinutesLabel")}</span><strong>{profile?.commuteMinutes ?? 30}{t("minutesSuffix")}</strong></p></div></section>
           <section className="employee-info-section"><h4>{t("contractAndRules")}</h4><div className="employee-info-list">{role === "manager" && <p className="employee-info-row"><span>{t("hourlyWage")}</span><strong>¥{profile?.hourlyWageYen?.toLocaleString() ?? "—"}</strong></p>}<p className="employee-info-row"><span>{t("laborRule")}</span><strong>{profile ? laborRuleLabel(profile.laborRuleCode, t) : "—"}</strong></p><p className="employee-info-row"><span>{t("outsideWork")}</span><strong>{((profile?.outsideWorkMinutes ?? 0) / 60).toFixed(1)}h</strong></p>{contract && <><p className="employee-info-row"><span>{t("contractPeriod")}</span><strong>{formatDateValue(contract.startsOn, t("noData"))}–{formatDateValue(contract.endsOn, t("noData"))}</strong></p><p className="employee-info-row"><span>{selected?.laborMonitor.basis === "PART_TIME_NO_IMMIGRATION_CAP" ? t("contractReferenceHours") : t("targetHours")}</span><strong>{(contract.targetMinutes / 60).toFixed(1)}h</strong></p>{selected?.laborMonitor.basis !== "PART_TIME_NO_IMMIGRATION_CAP" && <p className="employee-info-row"><span>{t("contractLimit")}</span><strong>{(contract.limitMinutes / 60).toFixed(1)}h</strong></p>}<p className="employee-info-row"><span>{t("lateShift")}</span><strong>{contract.lateShiftAllowed ? t("allowed") : t("notAllowed")}</strong></p></>}</div></section>
           <section className="employee-info-section"><h4>{t("residenceStatus")}</h4><div className="employee-info-list">{role === "manager" && <><p className="employee-info-row"><span>{t("residenceStatus")}</span><strong>{profile?.residenceStatus ? residenceStatusLabel(profile.residenceStatus, t) : t("noData")}</strong></p><p className="employee-info-row"><span>{t("residenceExpiry")}</span><strong>{formatDateValue(profile?.residenceExpiryDate, t("noData"))}</strong></p></>}<p className="employee-info-row"><span>{t("traits")}</span><strong>{profile?.traits || t("noData")}</strong></p></div></section>
           <section className="employee-info-section"><h4>{t("skillsAndTraining")}</h4><div className="employee-info-list">{(detail?.skills ?? []).length > 0 ? detail?.skills.map((skill) => <div className="employee-skill-row" key={skill.id}><strong>{skillPositionLabel(skill.positionName, t)}</strong><span>{skillLevelLabel(skill.level, t)} · {skill.independent ? t("independent") : t("notAllowed")} · {skill.canTrain ? t("canTrain") : t("notAllowed")}</span></div>) : <span className="muted">{t("noData")}</span>}</div><h4 className="subsection-heading">{t("trainingStatus")}</h4><div className="employee-info-list">{(detail?.training ?? []).length > 0 ? detail?.training?.map((training) => <div className="employee-skill-row" key={training.id}><strong>{trainingKeyLabel(training.trainingKey, t)}</strong><span>{trainingStatusLabel(training.status, t)}</span></div>) : <span className="muted">{t("noTraining")}</span>}</div></section>
           <section className="employee-info-section"><h4>{t("availabilityPreference")}</h4><p className="detail-count">{detail?.availability.length ?? 0} {t("selectedSlots")}</p><div className="employee-availability-list">{(detail?.availability ?? []).length > 0 ? detail?.availability.map((slot) => <div className="employee-availability-item" key={slot.id}><strong>{localizedWeekdayLabel(slot.weekday, i18n.language)} {slot.slotStart}–{slot.slotEnd}</strong><span>{preferenceLabel(slot.preference, t)}</span></div>) : <span className="muted">{t("noSlots")}</span>}</div></section>
           <section className="employee-info-section"><h4>{t("warningStatus")}</h4><div className="employee-info-list">{selected && <>{selected.status === "ON_LEAVE" ? <p className="employee-info-row"><span>{t("warningStatus")}</span><StatusPill tone="neutral">{t("statusOnLeave")}</StatusPill></p> : selected.status === "INACTIVE" ? <p className="employee-info-row"><span>{t("warningStatus")}</span><StatusPill tone="neutral">{t("inactiveHistoricalNoMonitoring")}</StatusPill></p> : <><p className="employee-info-row"><span>{t("currentHours")}</span><strong>{(selected.laborMonitor.periodMinutes / 60).toFixed(1)}h</strong></p><p className="employee-info-row"><span>{selected.laborMonitor.standardPeriod === "MONTH" ? t("monthlyStandard") : selected.laborMonitor.basis === "PART_TIME_NO_IMMIGRATION_CAP" ? t("contractReference") : t("weeklyLimit")}</span><strong>{(selected.laborMonitor.standardMinutes / 60).toFixed(1)}h</strong></p>{selected.laborMonitor.limitMode === "HARD" && <p className="employee-info-row"><span>{t("remainingHours")}</span><strong>{Math.max(0, selected.laborMonitor.remainingMinutes / 60).toFixed(1)}h</strong></p>}<p className="employee-info-row"><span>{t("warningStatus")}</span><StatusPill tone={warningTone(selected.warning.level)}>{localizedLaborReason(selected, t)}</StatusPill></p>{selected.laborMonitor.scheduleBlocked && <p className="employee-info-row"><span>{t("scheduleBlockedLabel")}</span><strong className="danger-text">{t("scheduleBlocked")}</strong></p>}</>}</>}</div></section>
           <section className="employee-info-section"><h4>{t("notes")}</h4><p className="employee-note-value">{profile?.notes || t("noData")}</p></section>
           <div className="employee-detail-actions">{role === "manager" && <><button className="secondary-button" onClick={() => beginEdit()}>{t("edit")}</button>{selected?.status === "ON_LEAVE" ? <button className="secondary-button" onClick={() => { if (window.confirm(t("reactivateConfirm"))) reactivateEmployee.mutate(); }}>{t("reactivate")}</button> : selected?.status === "ACTIVE" ? <><button className="secondary-button" onClick={() => { if (window.confirm(t("placeOnLeaveConfirm"))) placeEmployeeOnLeave.mutate(); }}>{t("placeOnLeave")}</button><button className="ghost-button danger-action" onClick={() => { if (window.confirm(t("deactivateConfirm"))) deactivateEmployee.mutate(); }}>{t("deactivate")}</button></> : null}</>}</div>
         </div>
          {selected?.status === "ACTIVE" && selected.laborMonitor.basis === "MONTHLY_OVERTIME" && <div className="monthly-labor-summary"><span>{t("monthlyTotal")}: {(selected.laborMonitor.periodMinutes / 60).toFixed(1)}h</span><span>{t("overtimeHours")}: {(selected.laborMonitor.overtimeMinutes / 60).toFixed(1)}h / {(selected.laborMonitor.overtimeLimitMinutes / 60).toFixed(1)}h</span><span>{localizedLaborReason(selected, t)}</span></div>}
          {selected && <WeeklyAttendance employee={selected} availability={detailQuery.data?.availability} language={i18n.language} t={t} />}
       </>}
    </Card> : null}
  </div>;
}

const LazyEmployeesPage = lazy(() => import("./pages/EmployeesPage"));

function CloseoutPage() {
  const { t } = useTranslation();
  const [counts, setCounts] = useState({ tenThousand: 3, fiveThousand: 4, thousand: 26, fiveHundred: 9, hundred: 31 });
  const actual = counts.tenThousand * 10000 + counts.fiveThousand * 5000 + counts.thousand * 1000 + counts.fiveHundred * 500 + counts.hundred * 100;
  const expected = 83600;
  const update = (key: keyof typeof counts, value: number) => setCounts((current) => ({ ...current, [key]: Math.max(0, value) }));
  return <div className="page-stack"><div className="page-title"><div><p className="eyebrow">{t("lastOrder")}{t("closeoutAfter")}</p><h2>{t("closeout")}</h2><p>{t("closeoutDescription")}</p></div><StatusPill tone="warning">! {t("provisional")}</StatusPill></div><div className="metric-grid"><Card><span>{t("sales")}</span><strong>¥ 486,320</strong><small>{t("posSyncTime")}</small></Card><Card><span>{t("grossProfit")}</span><strong>¥ 321,180</strong><small>{t("grossMarginRate")}</small></Card><Card><span>{t("laborCost")}</span><strong>¥ 116,800</strong><small>{t("salesRatio")}</small></Card><Card><span>{t("cashDifference")}</span><strong className={actual - expected === 0 ? "success-text" : "danger-text"}>{actual - expected >= 0 ? "+" : ""}¥ {actual - expected}</strong><small>{t("theoryCash")} ¥ {expected.toLocaleString()}</small></Card></div><div className="two-column"><Card><div className="section-heading"><h3>{t("cashCount")}</h3><span className="mono">¥ {actual.toLocaleString()}</span></div><div className="cash-grid">{([['tenThousand',10000],['fiveThousand',5000],['thousand',1000],['fiveHundred',500],['hundred',100]] as const).map(([key, amount]) => <label key={key}><span>¥ {amount.toLocaleString()}</span><input type="number" min="0" value={counts[key]} onChange={(event) => update(key, Number(event.target.value))} /><strong>¥ {(counts[key] * amount).toLocaleString()}</strong></label>)}</div></Card><Card><div className="section-heading"><h3>{t("incompleteChecks")}</h3><StatusPill tone="warning">2</StatusPill></div><ul className="check-list"><li><span>{t("wasteRecord")}</span><StatusPill tone="normal">✓ {t("complete")}</StatusPill></li><li><span>{t("fridgeHandover")}</span><StatusPill tone="warning">! {t("unfinished")}</StatusPill></li><li><span>{t("stockCheck")}</span><StatusPill tone="normal">✓ {t("complete")}</StatusPill></li><li><span>{t("posReturn")}</span><StatusPill tone="neutral">• {t("provisionalRecord")}</StatusPill></li></ul><button className="primary-button full" disabled={actual !== expected}>{t("confirmCloseout")}</button></Card></div></div>;
}

function SettingsPage({ colorAssist, setColorAssist }: { colorAssist: boolean; setColorAssist: (value: boolean) => void }) {
  const { t, i18n } = useTranslation();
  return <div className="page-stack narrow"><div className="page-title"><div><p className="eyebrow">{t("preferences")}</p><h2>{t("settings")}</h2><p>{t("settingsDescription")}</p></div></div><Card><div className="settings-list"><label><div><strong>{t("language")}</strong><span>{t("languageHelp")}</span></div><select value={i18n.language} onChange={(event) => { void i18n.changeLanguage(event.target.value); localStorage.setItem("locale", event.target.value); }}><option value="ja">日本語</option><option value="zh">简体中文</option><option value="zh-TW">繁體中文</option><option value="en">English</option><option value="ko">한국어</option><option value="vi">Tiếng Việt</option></select></label><label><div><strong>{t("colorAssist")}</strong><span>{t("colorHelp")}</span></div><button role="switch" aria-checked={colorAssist} className={`switch ${colorAssist ? "on" : ""}`} onClick={() => setColorAssist(!colorAssist)}><span /></button></label><label><div><strong>{t("readReceipts")}</strong><span>{t("readHelp")}</span></div><select defaultValue="important"><option value="off">{t("hideReceipts")}</option><option value="important">{t("importantOnly")}</option><option value="all">{t("allMessages")}</option></select></label></div></Card><Card><div className="section-heading"><div><h3>{t("laborRuleSet")}</h3><p className="muted">{t("demoRule")}</p></div><StatusPill tone="neutral">{t("adminSettings")}</StatusPill></div><p>{t("laborRuleDescription")} {t("legalDisclaimer")}</p></Card></div>;
}

function StaffHome() {
  const { t } = useTranslation();
  return <div className="page-stack"><div className="welcome-row"><div><p className="eyebrow">{t("nextShift")}</p><h2>{t("staffGreeting")}</h2><p>{t("staffCheck")}</p></div><StatusPill tone="warning">! {t("beforeShift")}</StatusPill></div><div className="two-column"><Card className="next-shift"><Clock3 size={28} /><div><span>{t("todaysShift")}</span><strong>17:00–22:00</strong><p>{t("hall")} · {t("register")} / {t("serving")}</p></div></Card><Card><div className="section-heading"><h3>{t("weeklyHours")}</h3><StatusPill tone="warning">! 89%</StatusPill></div><div className="big-hours"><strong>25h</strong><span>/ 28h</span></div><p className="muted">{t("otherWorkHours")}</p></Card></div><Card><div className="section-heading"><h3><BookOpen size={19} />{t("preShiftLearning")}</h3><StatusPill tone="warning">1</StatusPill></div><div className="learning-row"><div><strong>{t("registerCloseBasics")}</strong><span>{t("estimate")} · {t("safetyItem")}</span></div><button className="primary-button">{t("learn")}</button></div></Card></div>;
}

export default function App() {
  const { t, i18n } = useTranslation();
  const validRoutes = useMemo(() => new Set<NavKey>([...navItems.map((item) => item.key), "incidents", "reservations", "equipment", "allergens", "crossStore", "evaluations"]), []);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [active, setActive] = useState<NavKey>(() => {
    const route = window.location.hash.replace("#/", "") as NavKey;
    return validRoutes.has(route) ? route : "today";
  });
  const [role, setRole] = useState<"manager" | "staff">("manager");
  const [colorAssist, setColorAssist] = useState(localStorage.getItem("colorAssist") === "true");
  const navigate = (route: NavKey) => {
    setActive(route);
    window.history.pushState(null, "", `#/${route}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  useEffect(() => {
    const syncRoute = () => {
      const route = window.location.hash.replace("#/", "") as NavKey;
      if (validRoutes.has(route)) setActive(route);
    };
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, [validRoutes]);
  useEffect(() => {
    const updateBackToTopVisibility = () => setShowBackToTop(window.scrollY >= window.innerHeight);
    updateBackToTopVisibility();
    window.addEventListener("scroll", updateBackToTopVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateBackToTopVisibility);
  }, []);
  const page = useMemo(() => {
    if (active === "today") return role === "manager" ? <TodayPage onNavigate={navigate} /> : <StaffHome />;
    if (active === "schedule") return <SchedulePage />;
    if (active === "inventory") return <InventoryPage />;
    if (active === "chat") return <ChatPage />;
    if (active === "employees") return <Suspense fallback={<div className="page-stack"><Card><span>{t("loading")}</span></Card></div>}><LazyEmployeesPage role={role} /></Suspense>;
    if (active === "closeout") return <CloseoutPage />;
    if (active === "more") return <MorePage onNavigate={navigate} />;
    if (active === "incidents") return <IncidentsPage />;
    if (active === "reservations") return <ReservationsPage />;
    if (active === "equipment") return <EquipmentPage />;
    if (active === "allergens") return <AllergensPage />;
    if (active === "crossStore") return <CrossStorePage />;
    if (active === "evaluations") return <EvaluationsPage />;
    return <SettingsPage colorAssist={colorAssist} setColorAssist={(value) => { setColorAssist(value); localStorage.setItem("colorAssist", String(value)); }} />;
  }, [active, colorAssist, role, i18n.language]);
  return <div className={`app-shell ${colorAssist ? "color-assist" : ""}`} onCopy={(event) => event.preventDefault()} onCut={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()}><Navigation active={active} onChange={navigate} role={role} /><main><Header role={role} colorAssist={colorAssist} setRole={(next) => { setRole(next); if (next === "staff" && ["employees", "closeout"].includes(active)) navigate("today"); }} /><div className="content">{page}</div></main>{showBackToTop && <button className="back-to-top" type="button" aria-label={t("backToTop")} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>{formatBackToTopParts(i18n.language).map((part) => <span className="back-to-top-word" key={part}>{part}</span>)}</button>}</div>;
}

