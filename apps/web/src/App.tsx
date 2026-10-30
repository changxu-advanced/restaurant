import { Fragment, lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle, Archive, BadgeInfo, Bell, BookOpen, Boxes, CalendarDays, Check, ChevronDown, ChevronRight,
  CircleDollarSign, CircleHelp, Clock3, Languages, LayoutDashboard, MessageCircle, PackageCheck,
  Settings, Sparkles, Store, Users, UtensilsCrossed, Eye, MoreHorizontal, MessageSquareWarning, Megaphone, Wrench, ShieldCheck, Building2, Star, CalendarCheck, Camera, CheckCircle2, FileText,
  Paperclip, Search, Download, RefreshCw
} from "lucide-react";
import { featureCards, initialInventory, shifts } from "./demoData";
import { useCreateEmployee, useDeactivateEmployee, useEmployee, useEmployees, usePlaceEmployeeOnLeave, useReactivateEmployee, useStoreSettings, useUpdateEmployee } from "./employeeApi";
import { useChatItems, useCreateChatIssue, useCreateChatMessage, useCreateSupportRequest, useCreateSupportResponse, useReopenChatIssue, useResolveChatIssue } from "./chatApi";
import type { ChatAttachment, ChatIssue, ChatItem, ChatMessage, ChatSupportRequest, CreateIssueInput } from "./chatApi";
import type { InventoryItem, NavKey, StockState } from "./types";
import { formatBackToTopParts } from "./employeeFormatting";
import { employeeStatusLabel, laborRuleLabel, localizedLaborReason, preferenceLabel, residenceStatusLabel, roleTitleLabel, skillLevelLabel, skillPositionLabel, trainingKeyLabel, trainingStatusLabel } from "./employeePresentation";

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

function AnimatedNumber({ value, format, className = "" }: { value: number; format: (value: number) => string; className?: string }) {
  const elementRef = useRef<HTMLElement | null>(null);
  const animationStarted = useRef(false);
  const displayValueRef = useRef(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    let frameId: number | undefined;
    let observer: IntersectionObserver | undefined;
    const animate = (from: number, to: number) => {
      const startedAt = performance.now();
      const duration = 900;
      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const nextValue = Math.round(from + (to - from) * eased);
        displayValueRef.current = nextValue;
        setDisplayValue(nextValue);
        if (progress < 1) frameId = window.requestAnimationFrame(tick);
      };
      frameId = window.requestAnimationFrame(tick);
    };
    const startAnimation = () => {
      if (!animationStarted.current) animationStarted.current = true;
      if (displayValueRef.current !== value) animate(displayValueRef.current, value);
    };

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) startAnimation();
      }, { threshold: 0.25 });
      observer.observe(element);
    } else {
      startAnimation();
    }

    return () => {
      if (frameId !== undefined) window.cancelAnimationFrame(frameId);
      observer?.disconnect();
    };
  }, [value]);

  return <strong ref={elementRef} className={`animated-number ${className}`.trim()}>{format(displayValue)}</strong>;
}

function useAnimatedProgress<T extends Element>() {
  const elementRef = useRef<T | null>(null);
  const started = useRef(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    let frameId: number | undefined;
    let observer: IntersectionObserver | undefined;
    const start = () => {
      if (started.current) return;
      started.current = true;
      const startedAt = performance.now();
      const duration = 950;
      const tick = (now: number) => {
        const rawProgress = Math.min(1, (now - startedAt) / duration);
        setProgress(1 - Math.pow(1 - rawProgress, 3));
        if (rawProgress < 1) frameId = window.requestAnimationFrame(tick);
      };
      frameId = window.requestAnimationFrame(tick);
    };

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) start();
      }, { threshold: 0.2 });
      observer.observe(element);
    } else {
      start();
    }

    return () => {
      if (frameId !== undefined) window.cancelAnimationFrame(frameId);
      observer?.disconnect();
    };
  }, []);

  return { ref: elementRef, progress };
}

function donutArcPath(startAngle: number, endAngle: number, radius = 55) {
  const toPoint = (angle: number) => {
    const radians = angle * Math.PI / 180;
    return { x: 80 + radius * Math.cos(radians), y: 80 + radius * Math.sin(radians) };
  };
  const start = toPoint(startAngle);
  const end = toPoint(endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function donutOffset(startAngle: number, endAngle: number, active: boolean) {
  if (!active) return undefined;
  const radians = ((startAngle + endAngle) / 2) * Math.PI / 180;
  return `translate(${Math.cos(radians) * 10} ${Math.sin(radians) * 10})`;
}

function Card({ children, className = "", id, tabIndex, onClick }: { children: React.ReactNode; className?: string; id?: string; tabIndex?: number; onClick?: React.MouseEventHandler<HTMLElement> }) {
  return <section id={id} tabIndex={tabIndex} onClick={onClick} className={`card ${className}`}>{children}</section>;
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
        <div className="sidebar-note" title={t("fictionalData")}><BadgeInfo size={17} /><span><strong>{t("demoEnvironment")}</strong><br />{t("fictionalData")} · v0.5.0</span></div>
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
  return <div className="page-stack"><div className="page-title"><div><p className="eyebrow">v0.5.0 · {t("exceptionHandling")}</p><h2>{t("more")}</h2><p>{t("moreDescription")}</p></div></div><div className="feature-grid">{featureCards.map((feature) => { const Icon = featureIcons[feature.icon]; const copy = featureCopyKeys[feature.key as keyof typeof featureCopyKeys]; return <Card key={feature.key} className="feature-card"><div className="feature-icon"><Icon size={22} /></div><div className="feature-copy"><div className="card-title-row"><h3>{t(copy.title)}</h3><StatusPill tone={feature.tone}>{t(copy.status)}</StatusPill></div><p>{t(copy.summary)}</p></div><button className="secondary-button" onClick={() => onNavigate(feature.key as NavKey)}>{t("view")}<ChevronRight size={17} /></button></Card>; })}</div><Card className="notice-card"><BadgeInfo size={21} /><div><strong>{t("laterPrinciples")}</strong><p>{t("laterPrinciplesDescription")}</p></div></Card></div>;
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

type SchedulePrintRow = { employee: string; area: string; start: string; end: string; warning?: string };
const escapePrintHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
const scheduleShiftArea = (shift: (typeof shifts)[number], t: (key: string) => string) => {
  const areaByKey: Record<NonNullable<(typeof shift)["areaKey"]>, string> = {
    hallManager: `${t("hall")} · ${t("storeManager")}`,
    kitchenWok: `${t("kitchen")} · ${t("wok")}`,
    hallRegister: `${t("hall")} · ${t("register")}`,
    kitchenDishwashing: `${t("kitchen")} · ${t("dishwashing")}`
  };
  return shift.areaKey ? areaByKey[shift.areaKey] : shift.area;
};
const buildSchedulePrintRows = (t: (key: string) => string): SchedulePrintRow[] => shifts.map((shift) => ({ employee: shift.employee, area: scheduleShiftArea(shift, t), start: shift.start, end: shift.end, warning: shift.warning ? `${t("approaching")} · 89%` : undefined }));
const ganttTimeToMinutes = (value: string) => { const [hour, minute] = value.split(":").map(Number); return hour * 60 + minute; };

function openSchedulePrintView({ language, storeName, businessHours, role, t, rows }: { language: string; storeName: string; businessHours: string; role: "manager" | "staff"; t: (key: string) => string; rows: SchedulePrintRow[] }) {
  const printWindow = window.open("", "_blank", "width=1000,height=800");
  if (!printWindow) return;
  const generatedAt = new Intl.DateTimeFormat(language === "ja" ? "ja-JP" : language, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date());
  const traceSuffix = globalThis.crypto?.randomUUID?.().slice(0, 8).toUpperCase() ?? String(Date.now()).slice(-8);
  const traceId = `SCH-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}-${traceSuffix}`;
  const currentUser = role === "staff" ? "鈴木 海（スタッフ）" : "佐藤 美咲（店長）";
  const ganttStart = 8 * 60;
  const ganttEnd = 24 * 60;
  const axisTimes = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00", "24:00"];
  const axis = axisTimes.map((time) => `<span>${escapePrintHtml(time)}</span>`).join("");
  const ganttRows = rows.map((row, index) => {
    const start = Math.max(ganttStart, ganttTimeToMinutes(row.start));
    const end = Math.min(ganttEnd, Math.max(start, ganttTimeToMinutes(row.end)));
    const left = ((start - ganttStart) / (ganttEnd - ganttStart)) * 100;
    const width = ((end - start) / (ganttEnd - ganttStart)) * 100;
    const barClass = `employee-${(index % 6) + 1}${row.warning ? " has-warning" : ""}`;
    return `<div class="gantt-row"><div class="gantt-person"><strong>${escapePrintHtml(row.employee)}</strong><span>${escapePrintHtml(row.area)}</span></div><div class="gantt-track"><div class="gantt-bar ${barClass}" style="left:${left}%;width:${Math.max(width, 2)}%"><b>${escapePrintHtml(`${row.start}–${row.end}`)}</b>${row.warning ? `<small>${escapePrintHtml(row.warning)}</small>` : ""}</div></div></div>`;
  }).join("");
  const legend = rows.map((row, index) => `<span><i class="employee-${(index % 6) + 1}"></i>${escapePrintHtml(row.employee)}</span>`).join("");
  printWindow.document.write(`<!doctype html><html lang="${escapePrintHtml(language)}"><head><meta charset="utf-8"><title>${escapePrintHtml(t("schedulePdfTitle"))}</title><style>
    @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:"Noto Sans SC","Noto Sans JP","Yu Gothic",Arial,sans-serif;color:#2d2723;margin:0;position:relative}body:before{content:"${escapePrintHtml(t("scheduleWatermark"))} · ${escapePrintHtml(traceId)}";position:fixed;inset:35% -10%;display:flex;align-items:center;justify-content:center;transform:rotate(-24deg);font-size:28px;letter-spacing:2px;color:rgba(112,88,67,.09);font-weight:700;pointer-events:none;white-space:nowrap}.header{border-bottom:2px solid #c86b3a;padding-bottom:12px;margin-bottom:14px}.eyebrow{color:#c86b3a;font-size:12px;font-weight:700;letter-spacing:.08em}.title{font-size:26px;font-weight:700;margin:6px 0 0}.meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 28px;margin:14px 0 18px}.meta div{border-bottom:1px solid #e7d9cb;padding:7px 0}.meta strong{display:block;font-size:11px;color:#7a6d64;margin-bottom:3px}.meta span{font-size:14px}.summary{background:#faf3eb;border:1px solid #ead5c4;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12px}.gantt{border:1px solid #ead5c4;border-radius:10px;padding:14px;background:#fffaf5}.gantt-axis,.gantt-row{display:grid;grid-template-columns:170px 1fr;gap:12px;align-items:center}.gantt-axis{padding-bottom:8px;border-bottom:1px solid #eadfd5;color:#7a6d64;font-size:11px}.gantt-hours{display:grid;grid-template-columns:repeat(9,1fr);font-size:10px}.gantt-hours span{text-align:left}.gantt-hours span:last-child{text-align:right}.gantt-row{min-height:42px;border-bottom:1px solid #f0e4da}.gantt-person{display:grid;gap:2px;font-size:12px}.gantt-person span{color:#7a6d64;font-size:10px}.gantt-track{height:24px;position:relative;border-radius:6px;background:repeating-linear-gradient(to right,#f4ebe3 0,#f4ebe3 calc(12.5% - 1px),#e3d4c7 calc(12.5% - 1px),#e3d4c7 12.5%)}.gantt-bar{position:absolute;top:2px;height:20px;border-radius:5px;padding:2px 7px;color:white;font-size:10px;display:flex;align-items:center;gap:5px;white-space:nowrap;overflow:hidden;min-width:26px}.gantt-bar small{font-size:9px;opacity:.9}.employee-1{background:#c86b3a}.employee-2{background:#3f7c78}.employee-3{background:#8b6fae}.employee-4{background:#4f7e55}.employee-5{background:#b7772d}.employee-6{background:#6b778d}.gantt-bar.has-warning{background-color:#b64f40;background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.35) 0,rgba(255,255,255,.35) 4px,transparent 4px,transparent 8px)}.legend{display:flex;flex-wrap:wrap;gap:8px 16px;margin-top:12px;font-size:10px}.legend span{display:inline-flex;align-items:center;gap:5px}.legend i{width:9px;height:9px;border-radius:50%;display:inline-block}.footer{border-top:1px solid #e7d9cb;margin-top:18px;padding-top:10px;display:grid;gap:4px;color:#6f625a;font-size:10px}.hint{margin-top:14px;font-size:10px;color:#8c7f76}@media print{.hint{display:none}}
  </style></head><body><header class="header"><div class="eyebrow">${escapePrintHtml(t("scheduleWatermark"))}</div><div class="title">${escapePrintHtml(storeName)} · ${escapePrintHtml(t("schedulePdfTitle"))} · ${escapePrintHtml(t("ganttTitle"))}</div></header><section class="meta"><div><strong>${escapePrintHtml(t("schedulePeriod"))}</strong><span>2026.10.26–11.08</span></div><div><strong>${escapePrintHtml(t("storeHoursLabel"))}</strong><span>${escapePrintHtml(businessHours)}</span></div><div><strong>${escapePrintHtml(t("publishedAt"))}</strong><span>${escapePrintHtml(generatedAt)}</span></div><div><strong>${escapePrintHtml(t("scheduleWarning"))}</strong><span>${escapePrintHtml(t("noViolations"))} · ${escapePrintHtml(t("coverageRate"))}</span></div></section><div class="summary">${escapePrintHtml(t("exportScheduleHint"))}</div><section class="gantt" aria-label="${escapePrintHtml(t("ganttTitle"))}"><div class="gantt-axis"><span>${escapePrintHtml(t("ganttEmployee"))}</span><div class="gantt-hours">${axis}</div></div>${ganttRows}<div class="legend">${legend}</div></section><footer class="footer"><div><strong>${escapePrintHtml(t("downloadedBy"))}：</strong>${escapePrintHtml(currentUser)}</div><div><strong>${escapePrintHtml(t("publishedAt"))}：</strong>${escapePrintHtml(generatedAt)}</div><div><strong>${escapePrintHtml(t("traceIdLabel"))}：</strong>${escapePrintHtml(traceId)}</div><div class="hint">${escapePrintHtml(t("pdfPrintHint"))}</div></footer></body></html>`);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 250);
}

function SchedulePage({ role }: { role: "manager" | "staff" }) {
  const { t, i18n } = useTranslation();
  const [availability, setAvailability] = useState<Record<string, string[]>>(() => Object.fromEntries(availabilityDays.map((day, index) => [day, index === 2 ? [] : index === 5 ? ["12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "00"] : index === 6 ? ["09", "10", "11", "12"] : ["prep", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"]])));
  const [mobileDay, setMobileDay] = useState(availabilityDays[0]);
  const [rangeStart, setRangeStart] = useState<Record<string, RangeStart | null>>(() => Object.fromEntries(availabilityDays.map((day) => [day, null])));
  const [status, setStatus] = useState<"idle" | "running" | "ready">("idle");
  const generate = () => { setStatus("running"); window.setTimeout(() => setStatus("ready"), 900); };
  const exportSchedule = () => {
    const storeName = localStorage.getItem("settings.storeName") ?? "大阪中央店";
    const businessHours = localStorage.getItem("settings.businessHours") ?? "11:00–23:00";
    const rows = buildSchedulePrintRows(t);
    openSchedulePrintView({ language: i18n.language, storeName, businessHours, role, t, rows });
  };
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
      <div className="page-stack"><div className="page-title"><div><p className="eyebrow">2026.10.26–11.08</p><h2>{t("schedule")}</h2><p>{t("scheduleDescription")}</p></div><div className="button-row"><button className="secondary-button" onClick={exportSchedule} disabled={status !== "ready" || role !== "manager"}><Download size={18} />{t("exportSchedule")}</button><button className="primary-button" onClick={generate} disabled={status === "running"}><Sparkles size={18} />{status === "running" ? t("optimizing") : t("generate")}</button></div></div>
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
        <div className="page-stack compact-gap"><Card><div className="section-heading"><h3>{t("autoSchedule")}</h3><StatusPill tone={status === "ready" ? "normal" : "neutral"}>{status === "ready" ? t("draftReady") : t("notRun")}</StatusPill></div>{status === "ready" ? <div className="solver-result"><div><strong>{t("noViolations")}</strong><span>{t("coverageRate")}</span></div><div className="score-bar"><span style={{ width: "97.6%" }} /></div><ul><li>{t("missingPosition")}</li><li>{t("avoidedShortShifts")}</li><li>{t("balancedWeekends")}</li></ul><button className="primary-button full">{t("reviewDraft")}</button></div> : <div className="empty-state"><Sparkles size={30} /><strong>{t("availability")} → {t("autoSchedule")}</strong><span>{t("noRelax")}</span></div>}</Card><Card><div className="section-heading"><h3>{t("shiftList")}</h3><span className="muted">{t("peopleCount")}</span></div><div className="shift-list">{shifts.map((shift) => { const area = scheduleShiftArea(shift, t); return <div className="shift-row" key={shift.id}><div><strong>{shift.employee}</strong><span>{area}</span></div><div className="shift-time"><strong>{shift.start}–{shift.end}</strong>{shift.warning && <StatusPill tone="warning">! {t("approaching")} · 89%</StatusPill>}</div></div>; })}</div></Card></div>
      </div>
      <Card className="schedule-gantt-card">
        <div className="section-heading">
          <div><h3>{t("ganttTitle")}</h3><p className="muted">{t("ganttDescription")}</p></div>
          <StatusPill tone="neutral">{t("ganttToday")}</StatusPill>
        </div>
        <div className="schedule-gantt" role="img" aria-label={t("ganttTitle")}>
          <div className="schedule-gantt-axis">
            <span>{t("ganttEmployee")}</span>
            <div className="schedule-gantt-hours" aria-label={t("ganttTime")}>
              {["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00", "24:00"].map((time) => <span key={time}>{time}</span>)}
            </div>
          </div>
          <div className="schedule-gantt-rows">
            {shifts.map((shift, index) => {
              const start = Math.max(8 * 60, ganttTimeToMinutes(shift.start));
              const end = Math.min(24 * 60, Math.max(start, ganttTimeToMinutes(shift.end)));
              const left = ((start - 8 * 60) / (16 * 60)) * 100;
              const width = ((end - start) / (16 * 60)) * 100;
              return <div className="schedule-gantt-row" key={shift.id}><div className="schedule-gantt-name"><strong>{shift.employee}</strong><span>{scheduleShiftArea(shift, t)}</span></div><div className="schedule-gantt-track"><div className={`schedule-gantt-bar employee-${(index % 6) + 1}${shift.warning ? " has-warning" : ""}`} style={{ left: `${left}%`, width: `${width}%` }} title={`${shift.employee} ${shift.start}–${shift.end}`}><span>{shift.start}–{shift.end}</span></div></div></div>;
            })}
          </div>
        </div>
        <div className="schedule-gantt-legend" aria-label={t("ganttEmployee")}>
          {shifts.map((shift, index) => <span key={shift.id}><i className={`employee-${(index % 6) + 1}`} />{shift.employee}</span>)}
        </div>
      </Card>
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

type ChatDialog = "support" | "issue" | "notice" | "search" | null;
type ChatFileFilter = "all" | "image" | "pdf";
const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
  reader.onerror = () => reject(reader.error ?? new Error("附件读取失败"));
  reader.readAsDataURL(file);
});
function ChatPage({ role }: { role: "manager" | "staff" }) {
  const { t, i18n } = useTranslation();
  const itemsQuery = useChatItems();
  const createMessage = useCreateChatMessage();
  const createSupport = useCreateSupportRequest();
  const createSupportResponse = useCreateSupportResponse();
  const createIssue = useCreateChatIssue();
  const resolveIssue = useResolveChatIssue();
  const reopenIssue = useReopenChatIssue();
  const [dialog, setDialog] = useState<ChatDialog>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFileFilter, setSearchFileFilter] = useState<ChatFileFilter>("all");
  const [message, setMessage] = useState("");
  const [supportResponses, setSupportResponses] = useState<Record<string, "yes" | "partial" | "no">>({});
  const [selectedSupportId, setSelectedSupportId] = useState<string | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isCopyFeedbackFading, setIsCopyFeedbackFading] = useState(false);
  const [supportValidationError, setSupportValidationError] = useState<string | null>(null);
  const [selectedAttachments, setSelectedAttachments] = useState<ChatAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isAttachmentErrorFading, setIsAttachmentErrorFading] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<ChatAttachment | null>(null);
  const [supportDraft, setSupportDraft] = useState({ shiftDate: "", shiftStart: "", shiftEnd: "", position: "", note: "", replyDeadline: "" });
  const [issueDraft, setIssueDraft] = useState({ title: "", body: "", area: "" });
  const [noticeDraft, setNoticeDraft] = useState("");
  const chatStreamRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const attachmentIdRef = useRef(0);
  const attachmentUrlsRef = useRef(new Set<string>());
  const attachmentDataUrlsRef = useRef(new Map<string, Promise<string>>());
  const revokeAttachmentUrl = (url: string) => {
    if (url && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url);
  };
  const scrollToLatest = useRef(false);
  useEffect(() => {
    if (!activeMessageId) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".bubble, .message-actions")) return;
      setActiveMessageId(null);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [activeMessageId]);
  useEffect(() => {
    if (!copiedMessageId) return;
    setIsCopyFeedbackFading(false);
    const fadeTimer = window.setTimeout(() => setIsCopyFeedbackFading(true), 1500);
    const clearTimer = window.setTimeout(() => {
      setCopiedMessageId(null);
      setIsCopyFeedbackFading(false);
      setActiveMessageId(null);
    }, 2000);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(clearTimer);
    };
  }, [copiedMessageId]);
  useEffect(() => {
    if (dialog !== "search") return;
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [dialog]);
  const managerName = t("storeManager");
  const staffDemoName = "佐藤 美咲";
  const currentAuthor = role === "manager" ? managerName : staffDemoName;
  const isOwnMessage = (item: ChatMessage) => role === "manager"
    ? new Set(["店長", "店长", "Manager", managerName]).has(item.author)
    : item.author === staffDemoName;
  const issueActorName = role === "manager" ? managerName : staffDemoName;
  const items = [...(itemsQuery.data ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  useEffect(() => {
    if (!scrollToLatest.current || !chatStreamRef.current) return;
    chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
    scrollToLatest.current = false;
  }, [items.length, selectedAttachments.length, attachmentError]);
  useEffect(() => () => {
    attachmentUrlsRef.current.forEach(revokeAttachmentUrl);
  }, []);
  useEffect(() => {
    if (!attachmentError) {
      setIsAttachmentErrorFading(false);
      return;
    }
    setIsAttachmentErrorFading(false);
    const fadeTimer = window.setTimeout(() => setIsAttachmentErrorFading(true), 2500);
    const removeTimer = window.setTimeout(() => setAttachmentError(null), 3000);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, [attachmentError]);
  const timeLabel = (value: string) => new Intl.DateTimeFormat(i18n.language, { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  const dateKey = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
  const dateLabelForChat = (value: string) => new Intl.DateTimeFormat(i18n.language, { timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
  const positionCopyKeys: Record<string, string> = { "ホール": "positionHall", "鍋場": "positionWok", "レジ": "positionRegister", "仕込み": "positionPrep", "洗い場": "positionDishwashing", "清掃": "positionCleaning", "配膳": "positionServing" };
  const positionLabel = (value: string) => positionCopyKeys[value] ? t(positionCopyKeys[value]) : value;
  const deadlineCopyKeys: Record<string, string> = { "1w": "deadline1Week", "1d": "deadline1Day", "12h": "deadline12Hours", "6h": "deadline6Hours", "3h": "deadline3Hours", "1h": "deadline1Hour" };
  const deadlineLabel = (value: string) => deadlineCopyKeys[value] ? t(deadlineCopyKeys[value]) : value;
  const dateLabel = (value: string) => {
    if (value === "本日") return t("todayLabel");
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Intl.DateTimeFormat(i18n.language, { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" }).format(new Date(`${value}T00:00:00+09:00`));
    return value;
  };
  const datePresetValue = (offset: number) => {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const year = Number(parts.find((part) => part.type === "year")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    const day = Number(parts.find((part) => part.type === "day")?.value);
    const date = new Date(Date.UTC(year, month - 1, day + offset));
    return date.toISOString().slice(0, 10);
  };
  const datePresetLabel = (value: string) => new Intl.DateTimeFormat(i18n.language, { timeZone: "Asia/Tokyo", month: "short", day: "numeric", weekday: "short" }).format(new Date(`${value}T00:00:00+09:00`));
  const messageBody = (value: string) => value === "冷蔵庫2番の扉が少し閉まりにくくなっています。" ? t("fridgeMessage") : value;
  const supportNote = (value: string) => value === "欠勤連絡がありました。条件に合うスタッフに確認してください。" ? t("absenceNotice") : value;
  const issueTitle = (value: string) => value === "冷蔵庫2番の扉が閉まりにくい" ? t("fridgeIssueTitle") : value;
  const issueBody = (value: string) => value === "閉店時に庫内温度と扉を再確認してください。" ? t("closeCheck") : value;
  const issueArea = (value: string | undefined) => value === "設備 · 冷蔵庫2番" ? t("fridgeIssueArea") : value ?? t("issueArea");
  const searchableText = (item: ChatItem) => {
    if (item.kind === "message") return [item.author, item.body, messageBody(item.body), ...(item.attachments?.map((attachment) => attachment.name) ?? [])].join(" ");
    if (item.kind === "support") return [item.author, item.position, positionLabel(item.position), item.shiftTime, item.note, supportNote(item.note)].join(" ");
    return [item.author, item.title, issueTitle(item.title), item.body, issueBody(item.body), item.area, item.area ? issueArea(item.area) : ""].filter(Boolean).join(" ");
  };
  const attachmentMatchesFilter = (item: ChatItem, filter: ChatFileFilter) => {
    if (filter === "all") return true;
    if (item.kind !== "message" || !item.attachments?.length) return false;
    return item.attachments.some((attachment) => {
      const isPdf = attachment.type === "application/pdf" || attachment.name.toLocaleLowerCase().endsWith(".pdf");
      return filter === "pdf" ? isPdf : !isPdf && attachment.type.startsWith("image/");
    });
  };
  const searchResults = useMemo(() => {
    const term = searchQuery.trim().toLocaleLowerCase();
    if (!term && searchFileFilter === "all") return [];
    return [...items].reverse().filter((item) => attachmentMatchesFilter(item, searchFileFilter) && (!term || searchableText(item).toLocaleLowerCase().includes(term)));
  }, [items, searchFileFilter, searchQuery, i18n.language]);
  const resultExcerpt = (item: ChatItem) => {
    if (item.kind === "message" && item.attachments?.length) return `${item.body ? `${messageBody(item.body)} · ` : ""}${item.attachments.map((attachment) => attachment.name).join(", ")}`;
    if (item.kind === "message") return messageBody(item.body);
    if (item.kind === "support") return `${dateLabel(item.shiftDate)} ${item.shiftTime} · ${positionLabel(item.position)}`;
    return issueTitle(item.title);
  };
  const resultTypeLabel = (item: ChatItem) => item.kind === "support" ? t("support") : item.kind === "issue" ? t("issue") : t("searchMessageLabel");
  const focusSearchResult = (item: ChatItem) => {
    setDialog(null);
    requestAnimationFrame(() => {
      const target = document.getElementById(`chat-item-${item.id}`);
      target?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      if (!target) return;
      target.classList.add("chat-search-target");
      window.setTimeout(() => target.classList.remove("chat-search-target"), 1400);
    });
  };
  const submitMessage = async () => {
    const body = message.trim();
    if ((!body && selectedAttachments.length === 0) || createMessage.isPending) return;
    scrollToLatest.current = true;
    const attachments = selectedAttachments.length ? await Promise.all(selectedAttachments.map(async (attachment) => ({
      ...attachment,
      url: (await attachmentDataUrlsRef.current.get(attachment.id)?.catch(() => "")) || attachment.url
    }))) : [];
    createMessage.mutate({ author: currentAuthor, initials: currentAuthor.slice(0, 1), body, ...(attachments.length ? { attachments } : {}) });
    setMessage("");
    selectedAttachments.forEach((attachment) => revokeAttachmentUrl(attachment.url));
    selectedAttachments.forEach((attachment) => attachmentUrlsRef.current.delete(attachment.url));
    selectedAttachments.forEach((attachment) => attachmentDataUrlsRef.current.delete(attachment.id));
    setSelectedAttachments([]);
    setAttachmentError(null);
    setIsAttachmentErrorFading(false);
  };
  const isAcceptedAttachment = (file: File) => {
    const extension = file.name.toLocaleLowerCase().split(".").pop();
    return file.type.startsWith("image/") || file.type === "application/pdf" || extension === "pdf";
  };
  const selectAttachments = (files: File[]) => {
    if (!files.length) return;
    const acceptedFiles = files.filter(isAcceptedAttachment);
    const invalidCount = files.length - acceptedFiles.length;
    const availableSlots = Math.max(0, 5 - selectedAttachments.length);
    const filesToAdd = acceptedFiles.slice(0, availableSlots);
    const nextAttachments = filesToAdd.map((file) => {
      const url = typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : "";
      attachmentUrlsRef.current.add(url);
      const id = `${Date.now()}-${attachmentIdRef.current++}`;
      attachmentDataUrlsRef.current.set(id, readFileAsDataUrl(file));
      return { id, name: file.name, type: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream"), url };
    });
    if (nextAttachments.length > 0) scrollToLatest.current = true;
    setSelectedAttachments((current) => [...current, ...nextAttachments]);
    if (invalidCount > 0) setAttachmentError(t("attachmentTypeError"));
    else if (acceptedFiles.length > availableSlots) setAttachmentError(t("attachmentLimitError"));
    else setAttachmentError(null);
  };
  const removeAttachment = (attachment: ChatAttachment) => {
    revokeAttachmentUrl(attachment.url);
    attachmentUrlsRef.current.delete(attachment.url);
    attachmentDataUrlsRef.current.delete(attachment.id);
    setSelectedAttachments((current) => current.filter((item) => item.id !== attachment.id));
    if (previewAttachment?.id === attachment.id) setPreviewAttachment(null);
  };
  const hasFiles = (event: React.DragEvent<HTMLDivElement>) => Array.from(event.dataTransfer.types).includes("Files");
  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDraggingFile(true);
  };
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDraggingFile(true);
  };
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDraggingFile(false);
  };
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDraggingFile(false);
    selectAttachments(Array.from(event.dataTransfer.files));
  };
  const submitSupport = (event: React.FormEvent) => {
    event.preventDefault();
    if (Object.values(supportDraft).some((value) => !value.trim())) {
      setSupportValidationError(t("requiredField"));
      return;
    }
    if (supportDraft.shiftDate < datePresetValue(0)) {
      setSupportValidationError(t("supportDatePastError"));
      return;
    }
    const toMinutes = (value: string) => {
      const [hours, minutes] = value.split(":").map(Number);
      return hours * 60 + minutes;
    };
    if (toMinutes(supportDraft.shiftEnd) < toMinutes(supportDraft.shiftStart)) {
      setSupportValidationError(t("supportTimeOrderError"));
      return;
    }
    setSupportValidationError(null);
    scrollToLatest.current = true;
    const { shiftStart, shiftEnd, ...supportFields } = supportDraft;
    createSupport.mutate({ ...supportFields, shiftTime: `${shiftStart}–${shiftEnd}`, author: managerName }, { onSuccess: () => { setDialog(null); setSupportValidationError(null); setSupportDraft({ shiftDate: "", shiftStart: "", shiftEnd: "", position: "", note: "", replyDeadline: "" }); } });
  };
  const submitIssue = (event: React.FormEvent) => {
    event.preventDefault();
    if (!issueDraft.title.trim() || !issueDraft.body.trim()) return;
    scrollToLatest.current = true;
    const payload: CreateIssueInput = { ...issueDraft, area: issueDraft.area.trim() || undefined, author: managerName };
    createIssue.mutate(payload, { onSuccess: () => { setDialog(null); setIssueDraft({ title: "", body: "", area: "" }); } });
  };
  const submitNotice = (event: React.FormEvent) => {
    event.preventDefault();
    const body = noticeDraft.trim();
    if (!body || createMessage.isPending) return;
    scrollToLatest.current = true;
    createMessage.mutate({ author: managerName, initials: managerName.slice(0, 1), body, messageType: "NOTICE" }, { onSuccess: () => { setDialog(null); setNoticeDraft(""); } });
  };
  const copyMessage = async (id: string, body: string) => {
    await navigator.clipboard?.writeText(body);
    setActiveMessageId(id);
    setCopiedMessageId(id);
  };
  const replyToMessage = (item: ChatMessage) => {
    setMessage(`@${item.author} `);
    setActiveMessageId(null);
    requestAnimationFrame(() => messageInputRef.current?.focus());
  };
  const renderMessageActions = (item: ChatMessage) => activeMessageId === item.id && <div className={`message-actions${copiedMessageId === item.id ? " copy-feedback" : ""}${copiedMessageId === item.id && isCopyFeedbackFading ? " is-fading" : ""}`} onClick={(event) => event.stopPropagation()}>{copiedMessageId === item.id ? <span className="message-copy-feedback">{t("copied")}</span> : <>{!item.attachments?.length && <button type="button" onClick={() => copyMessage(item.id, messageBody(item.body))}>{t("copyMessage")}</button>}<button type="button" onClick={() => replyToMessage(item)}>{t("replyMessage")}</button></>}</div>;
  const renderMessageAttachments = (attachments: ChatAttachment[] | undefined) => attachments?.length ? <div className="message-attachments">{attachments.map((attachment) => <button type="button" className={`message-attachment ${attachment.type === "application/pdf" ? "is-pdf" : ""}`} key={attachment.id} title={attachment.name} onClick={(event) => { event.stopPropagation(); setPreviewAttachment(attachment); }}><span className="message-attachment-preview">{attachment.type.startsWith("image/") && attachment.url ? <img src={attachment.url} alt={attachment.name} /> : <FileText size={24} />}</span><span className="message-attachment-name">{attachment.name}</span></button>)}</div> : null;
  const renderMessage = (item: ChatMessage) => <div className={`message ${isOwnMessage(item) ? "own" : ""}`} key={item.id} id={`chat-item-${item.id}`}><div className="message-avatar">{item.initials}</div><div className="message-content"><div className="message-meta"><strong>{item.author}</strong><time>{timeLabel(item.createdAt)}</time></div><div className="message-line"><div className="bubble" onClick={() => setActiveMessageId((current) => current === item.id ? null : item.id)}>{item.body && messageBody(item.body)}{renderMessageAttachments(item.attachments)}</div>{renderMessageActions(item)}</div></div></div>;
  const renderNotice = (item: ChatMessage) => <Card className="notice-card" key={item.id} id={`chat-item-${item.id}`}><div className="notice-card-header"><div className="notice-card-heading"><p className="eyebrow"><Megaphone size={14} />{t("noticeLabel")}</p><strong>{item.author}</strong><time>{timeLabel(item.createdAt)}</time></div></div><p className="notice-card-body">{messageBody(item.body)}</p>{renderMessageAttachments(item.attachments)}<div className="notice-card-footer">{t("noticeAudience")}</div></Card>;
  const renderSupport = (item: ChatSupportRequest) => {
    const savedResponse = item.responses.find((entry) => entry.author === staffDemoName)?.kind;
    const response = supportResponses[item.id] ?? savedResponse;
    const setResponse = (value: "yes" | "partial" | "no") => {
      setSupportResponses((current) => ({ ...current, [item.id]: value }));
      createSupportResponse.mutate({ requestId: item.id, response: { kind: value, author: staffDemoName } });
    };
    return <Card className={`support-card${role === "staff" ? " support-card-staff" : ""}`} key={item.id} id={`chat-item-${item.id}`} onClick={() => role === "manager" && setSelectedSupportId(item.id)} tabIndex={role === "manager" ? 0 : undefined}><div className="card-title-row"><div><p className="eyebrow"><AlertTriangle size={18} />{t("support")}</p><h3>{dateLabel(item.shiftDate)} {item.shiftTime} · <span className="support-position">{positionLabel(item.position)}</span></h3></div><StatusPill tone="danger">{t("replyDeadlineLabel", { time: deadlineLabel(item.replyDeadline) })}</StatusPill></div><p className="support-card-note">{supportNote(item.note)}</p><div className="support-card-footer"><div className="support-response-summary">{t("responsesCount", { count: item.responses.length })} · {item.responses.length ? t("responsesReceived") : t("waitingResponses")}</div><span className="support-card-hint">{role === "staff" ? t("staffSupportHint") : t("managerSupportHint")}</span></div>{role === "staff" && <div className="support-actions"><button className={response === "yes" ? "selected" : ""} onClick={() => setResponse("yes")}>{t("canSupport")}</button><button className={response === "partial" ? "selected" : ""} onClick={() => setResponse("partial")}>{t("partialSupport")}</button><button className={response === "no" ? "selected" : ""} onClick={() => setResponse("no")}>{t("cannotSupport")}</button></div>}{role === "staff" && response && <p className="confirmation"><Check size={16} />{t("responseAccepted")}</p>}</Card>;
  };
  const renderIssue = (item: ChatIssue) => <Card className="handover-card issue-card" key={item.id} id={`chat-item-${item.id}`}><div className="card-body"><div className="card-title-row"><div><p className="eyebrow"><CircleHelp size={18} />{t("issue")}</p><h3>{issueTitle(item.title)}</h3></div><div className="issue-title-actions"><StatusPill tone={item.status === "RESOLVED" ? "normal" : "warning"}>{item.status === "RESOLVED" ? t("resolved") : t("unresolved")}</StatusPill><button className="secondary-button issue-action" onClick={() => item.status === "RESOLVED" ? reopenIssue.mutate(item.id) : resolveIssue.mutate({ issueId: item.id, resolvedBy: issueActorName })}>{item.status === "RESOLVED" ? t("reopen") : t("resolve")}</button></div></div><p>{issueBody(item.body)}</p><div className="meta"><span>{issueArea(item.area)}</span>{item.resolvedBy && <span>{t("resolvedBy", { name: item.resolvedBy })}</span>}{item.resolvedAt && <span>{t("resolvedAt", { time: timeLabel(item.resolvedAt) })}</span>}</div><p className="issue-card-hint">{item.status === "RESOLVED" ? t("issueResolvedHint") : t("issueOpenHint")}</p></div></Card>;
  const selectedSupport = selectedSupportId ? items.find((item): item is ChatSupportRequest => item.kind === "support" && item.id === selectedSupportId) : null;
  let previousDate = "";
  const timelineItems = items.map((item: ChatItem) => {
    const currentDate = dateKey(item.createdAt);
    const separator = currentDate !== previousDate ? <div className="chat-day" key={`${item.id}-date`}>{dateLabelForChat(item.createdAt)}</div> : null;
    previousDate = currentDate;
    const content = item.kind === "message" ? (item.messageType === "NOTICE" ? renderNotice(item) : renderMessage(item)) : item.kind === "support" ? renderSupport(item) : renderIssue(item);
    return <Fragment key={item.id}>{separator}{content}</Fragment>;
  });
  return <div className="page-stack">
    <div className="page-title">
      <div><p className="eyebrow">{t("publicRoom")}</p><h2>{t("chat")}</h2><p>{t("chatDescription")}</p></div>
      <div className="chat-toolbar">
        {role === "manager" && <>
          <button className="secondary-button" onClick={() => { setSupportValidationError(null); setDialog("support"); }}>＋ {t("startSupport")}</button>
          <button className="secondary-button" onClick={() => setDialog("issue")}>＋ {t("publishIssue")}</button>
          <button className="primary-button" onClick={() => setDialog("notice")}>＋ {t("publishNotice")}</button>
        </>}
          <button className="secondary-button chat-search-trigger" onClick={() => { setSearchQuery(""); setSearchFileFilter("all"); setDialog("search"); }}><Search size={17} />{t("searchMessages")}</button>
      </div>
    </div>
    <div className="chat-shell" onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <div className="chat-stream" ref={chatStreamRef}>
        {itemsQuery.isLoading && <Card><span>{t("loading")}</span></Card>}
        {timelineItems}
      </div>
      <div className="chat-composer">
        {selectedAttachments.length > 0 && <div className="chat-attachment-list" aria-label={t("attachmentLabel")}>{selectedAttachments.map((attachment) => <div className="chat-attachment-chip" key={attachment.id}><button type="button" className="chat-attachment-name" title={attachment.name} onClick={() => setPreviewAttachment(attachment)}><Paperclip size={14} /><span>{attachment.name}</span></button><button type="button" aria-label={t("removeAttachment")} onClick={() => removeAttachment(attachment)}>×</button></div>)}</div>}
        {attachmentError && <p className={`chat-attachment-error${isAttachmentErrorFading ? " is-fading" : ""}`} role="alert">{attachmentError}</p>}
        <input ref={attachmentInputRef} className="visually-hidden" type="file" accept="image/*,.pdf" multiple onChange={(event) => { selectAttachments(Array.from(event.target.files ?? [])); event.currentTarget.value = ""; }} />
        <div className="chat-composer-input"><textarea ref={messageInputRef} autoFocus aria-label={t("chatComposerPlaceholder")} placeholder={t("chatComposerPlaceholder")} value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submitMessage(); } }} /><button type="button" className="chat-attach-inline" aria-label={t("attachFile")} onClick={() => attachmentInputRef.current?.click()}><Paperclip size={17} /><span>{t("attachFile")}</span></button><button className="primary-button" onClick={submitMessage} disabled={(!message.trim() && selectedAttachments.length === 0) || createMessage.isPending}>{t("sendMessage")}</button></div>
      </div>
      {isDraggingFile && <div className="chat-drop-overlay" role="status" aria-live="polite"><Paperclip size={28} /><strong>{t("dropToUpload")}</strong><span>{t("dropUploadHint")}</span></div>}
    </div>
    {previewAttachment && <div className="chat-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewAttachment(null); }}><div className={`chat-preview-dialog${previewAttachment.type === "application/pdf" ? " is-pdf" : previewAttachment.type.startsWith("image/") ? " is-image" : ""}`} role="dialog" aria-modal="true" aria-labelledby="attachment-preview-title"><div className="chat-preview-header"><strong id="attachment-preview-title">{previewAttachment.name}</strong><button type="button" className="icon-button" aria-label={t("closePreview")} onClick={() => setPreviewAttachment(null)}>×</button></div>{previewAttachment.type.startsWith("image/") && previewAttachment.url ? <img src={previewAttachment.url} alt={previewAttachment.name} /> : previewAttachment.url ? <iframe src={`${previewAttachment.url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} title={previewAttachment.name} /> : <p>{t("attachmentPreview")}</p>}</div></div>}
    {selectedSupport && role === "manager" && <div className="chat-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedSupportId(null); }}>
      <div className="chat-dialog support-response-dialog" role="dialog" aria-modal="true" aria-labelledby="support-summary-title">
        <div className="card-title-row"><div><p className="eyebrow"><AlertTriangle size={16} />{t("supportResponsesTitle")}</p><h3 id="support-summary-title">{dateLabel(selectedSupport.shiftDate)} {selectedSupport.shiftTime} · {positionLabel(selectedSupport.position)}</h3></div><button className="icon-button" aria-label={t("closeDialog")} onClick={() => setSelectedSupportId(null)}>×</button></div>
        <div className="support-response-groups">
          {(["yes", "partial", "no"] as const).map((kind) => {
            const entries = selectedSupport.responses.filter((entry) => entry.kind === kind);
            const label = kind === "yes" ? t("supportResponseYes") : kind === "partial" ? t("supportResponsePartial") : t("supportResponseNo");
            return <section className={`support-response-group support-response-${kind}`} key={kind}><div className="support-response-group-heading"><h4>{label}</h4><strong>{entries.length}</strong></div>{entries.length ? <ul className="support-response-list">{entries.map((entry, index) => <li key={`${entry.author}-${index}`}><span>{entry.author}</span></li>)}</ul> : <p className="support-response-empty">{t("supportResponseEmpty")}</p>}</section>;
          })}
        </div>
        <div className="chat-dialog-actions"><button type="button" className="primary-button" onClick={() => setSelectedSupportId(null)}>{t("closeSupportSummary")}</button></div>
      </div>
    </div>}
    {dialog && <div className="chat-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
      <div className="chat-dialog" role="dialog" aria-modal="true" aria-labelledby="chat-dialog-title">
        <div className="card-title-row"><h3 id="chat-dialog-title">{dialog === "support" ? t("supportDialogTitle") : dialog === "issue" ? t("issueDialogTitle") : dialog === "notice" ? t("noticeDialogTitle") : t("searchMessages")}</h3><button className="icon-button" aria-label={t("closeDialog")} onClick={() => setDialog(null)}>×</button></div>
        {dialog === "search" ? <div className="chat-search-panel">
          <label className="full-field">{t("searchMessages")}<div className="chat-search-input"><Search size={18} /><input ref={searchInputRef} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t("searchMessagesPlaceholder")} /></div></label>
          <div className="chat-search-filters" aria-label={t("fileTypeFilter")}>
            {(["all", "image", "pdf"] as ChatFileFilter[]).map((filter) => <button type="button" key={filter} className={`chat-search-filter${searchFileFilter === filter ? " selected" : ""}`} aria-pressed={searchFileFilter === filter} onClick={() => setSearchFileFilter(filter)}>{filter === "all" ? t("fileTypeAll") : filter === "image" ? t("fileTypePhotos") : t("fileTypePdf")}</button>)}
          </div>
          <div className="chat-search-results" aria-live="polite">
            {searchQuery.trim() && searchResults.length === 0 && <p className="empty-state">{t("noSearchResults")}</p>}
            {searchResults.map((item) => <button type="button" className="chat-search-result" key={item.id} data-target-id={`chat-item-${item.id}`} onClick={() => focusSearchResult(item)}><span className="chat-search-result-main"><strong>{resultTypeLabel(item)}</strong><span>{resultExcerpt(item)}</span></span><span className="chat-search-result-meta"><span>{item.author}</span><time>{dateLabelForChat(item.createdAt)} · {timeLabel(item.createdAt)}</time></span></button>)}
          </div>
        </div> : dialog === "support" ? <form className="chat-form-grid" onSubmit={submitSupport}>
          <label className="date-picker-field">{t("shiftDate")}<div className="date-picker-row"><input type="date" required min={datePresetValue(0)} value={supportDraft.shiftDate} onChange={(event) => setSupportDraft({ ...supportDraft, shiftDate: event.target.value })} /><button type="button" className="date-today-button" onClick={() => setSupportDraft({ ...supportDraft, shiftDate: datePresetValue(0) })}>{t("todayLabel")}</button></div><div className="date-quick-actions">{[1, 2, 3].map((offset) => { const value = datePresetValue(offset); return <button type="button" key={value} className={supportDraft.shiftDate === value ? "selected" : ""} onClick={() => setSupportDraft({ ...supportDraft, shiftDate: value })}>{datePresetLabel(value)}</button>; })}</div></label>
          <div className="time-range-fields"><label>{t("shiftStartTime")}<select required value={supportDraft.shiftStart} onChange={(event) => setSupportDraft({ ...supportDraft, shiftStart: event.target.value })}><option value="">{t("selectTime")}</option>{["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"].map((time) => <option key={time} value={time}>{time}</option>)}</select></label><label>{t("shiftEndTime")}<select required value={supportDraft.shiftEnd} onChange={(event) => setSupportDraft({ ...supportDraft, shiftEnd: event.target.value })}><option value="">{t("selectTime")}</option>{["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "24:00"].map((time) => <option key={time} value={time}>{time}</option>)}</select></label></div>
          <label>{t("supportPosition")}<select required value={supportDraft.position} onChange={(event) => setSupportDraft({ ...supportDraft, position: event.target.value })}><option value="">{t("selectPosition")}</option>{[{ value: "ホール", key: "positionHall" }, { value: "鍋場", key: "positionWok" }, { value: "レジ", key: "positionRegister" }, { value: "仕込み", key: "positionPrep" }, { value: "洗い場", key: "positionDishwashing" }, { value: "清掃", key: "positionCleaning" }, { value: "配膳", key: "positionServing" }].map((option) => <option key={option.value} value={option.value}>{t(option.key)}</option>)}</select></label>
          <label>{t("replyDeadline")}<select required value={supportDraft.replyDeadline} onChange={(event) => setSupportDraft({ ...supportDraft, replyDeadline: event.target.value })}><option value="">{t("selectDeadline")}</option>{[{ value: "1w", key: "deadline1Week" }, { value: "1d", key: "deadline1Day" }, { value: "12h", key: "deadline12Hours" }, { value: "6h", key: "deadline6Hours" }, { value: "3h", key: "deadline3Hours" }, { value: "1h", key: "deadline1Hour" }].map((option) => <option key={option.value} value={option.value}>{t(option.key)}</option>)}</select></label>
          <label className="full-field">{t("supportNote")}<textarea required value={supportDraft.note} onChange={(event) => setSupportDraft({ ...supportDraft, note: event.target.value })} /></label>
          {supportValidationError && <p className="chat-form-error full-field" role="alert">{supportValidationError}</p>}
          <div className="chat-dialog-actions full-field"><button type="button" className="secondary-button" onClick={() => setDialog(null)}>{t("cancel")}</button><button type="submit" className="primary-button">{t("startSupport")}</button></div>
        </form> : dialog === "issue" ? <form className="chat-form-grid" onSubmit={submitIssue}>
          <label className="full-field">{t("issueTitle")}<input required value={issueDraft.title} placeholder={t("issueTitlePlaceholder")} onChange={(event) => setIssueDraft({ ...issueDraft, title: event.target.value })} /></label>
          <label className="full-field">{t("issueDescription")}<textarea required value={issueDraft.body} placeholder={t("issueDescriptionPlaceholder")} onChange={(event) => setIssueDraft({ ...issueDraft, body: event.target.value })} /></label>
          <label className="full-field">{t("issueArea")}<input value={issueDraft.area} placeholder={t("issueAreaPlaceholder")} onChange={(event) => setIssueDraft({ ...issueDraft, area: event.target.value })} /></label>
          <div className="chat-dialog-actions full-field"><button type="button" className="secondary-button" onClick={() => setDialog(null)}>{t("cancel")}</button><button type="submit" className="primary-button">{t("publishIssue")}</button></div>
        </form> : <form className="chat-form-grid" onSubmit={submitNotice}>
          <label className="full-field">{t("noticeLabel")}<textarea required value={noticeDraft} placeholder={t("noticePlaceholder")} onChange={(event) => setNoticeDraft(event.target.value)} /></label>
          <div className="chat-dialog-actions full-field"><button type="button" className="secondary-button" onClick={() => setDialog(null)}>{t("cancel")}</button><button type="submit" className="primary-button">{t("publishNotice")}</button></div>
        </form>}
      </div>
    </div>}
  </div>;
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

function LegacyCloseoutPage() {
  const { t, i18n } = useTranslation();
  const [counts, setCounts] = useState({ tenThousand: 3, fiveThousand: 4, thousand: 26, fiveHundred: 9, hundred: 31 });
  const actual = counts.tenThousand * 10000 + counts.fiveThousand * 5000 + counts.thousand * 1000 + counts.fiveHundred * 500 + counts.hundred * 100;
  const expected = 83600;
  const update = (key: keyof typeof counts, value: number) => setCounts((current) => ({ ...current, [key]: Math.max(0, value) }));
  const revenueSeries = [382400, 418600, 401200, 455900, 439800, 472100, 486320];
  const revenueLabels = ["10/23", "10/24", "10/25", "10/26", "10/27", "10/28", "10/29"];
  const maxRevenue = Math.max(...revenueSeries);
  const minRevenue = Math.min(...revenueSeries);
  const chartPoints = revenueSeries.map((value, index) => ({ x: 28 + index * 116, y: 164 - ((value - minRevenue) / (maxRevenue - minRevenue)) * 112 }));
  const linePath = chartPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${chartPoints[chartPoints.length - 1].x} 180 L 28 180 Z`;
  const cashAmount = 194528;
  const mobileAmount = 291792;
  const cashPercent = Math.round((cashAmount / (cashAmount + mobileAmount)) * 100);
  const money = (value: number) => `¥ ${value.toLocaleString(i18n.language === "ja" ? "ja-JP" : i18n.language)}`;
  return <div className="page-stack"><div className="page-title"><div><p className="eyebrow">{t("lastOrder")}{t("closeoutAfter")}</p><h2>{t("closeout")}</h2><p>{t("closeoutDescription")}</p></div><StatusPill tone="warning">! {t("provisional")}</StatusPill></div><div className="metric-grid"><Card><span>{t("sales")}</span><strong>¥ 486,320</strong><small>{t("posSyncTime")}</small></Card><Card><span>{t("grossProfit")}</span><strong>¥ 321,180</strong><small>{t("grossMarginRate")}</small></Card><Card><span>{t("laborCost")}</span><strong>¥ 116,800</strong><small>{t("salesRatio")}</small></Card><Card><span>{t("cashDifference")}</span><strong className={actual - expected === 0 ? "success-text" : "danger-text"}>{actual - expected >= 0 ? "+" : ""}¥ {actual - expected}</strong><small>{t("theoryCash")} ¥ {expected.toLocaleString()}</small></Card></div><div className="two-column"><Card><div className="section-heading"><h3>{t("cashCount")}</h3><span className="mono">¥ {actual.toLocaleString()}</span></div><p className="cash-count-hint">{t("cashCountHint")}</p><div className="cash-grid-guide"><span>{t("denomination")}</span><span>{t("cashQuantity")}</span><span>{t("subtotal")}</span></div><div className="cash-grid">{([['tenThousand',10000],['fiveThousand',5000],['thousand',1000],['fiveHundred',500],['hundred',100]] as const).map(([key, amount]) => <label key={key}><span>¥ {amount.toLocaleString()}</span><input type="number" min="0" inputMode="numeric" aria-label={`¥ ${amount.toLocaleString()} · ${t("cashQuantity")}`} value={counts[key]} onFocus={(event) => event.currentTarget.select()} onChange={(event) => update(key, Number(event.target.value))} /><strong>¥ {(counts[key] * amount).toLocaleString()}</strong></label>)}</div></Card><Card><div className="section-heading"><h3>{t("incompleteChecks")}</h3><StatusPill tone="warning">2</StatusPill></div><ul className="check-list"><li><span>{t("wasteRecord")}</span><StatusPill tone="normal">✓ {t("complete")}</StatusPill></li><li><span>{t("fridgeHandover")}</span><StatusPill tone="warning">! {t("unfinished")}</StatusPill></li><li><span>{t("stockCheck")}</span><StatusPill tone="normal">✓ {t("complete")}</StatusPill></li><li><span>{t("posReturn")}</span><StatusPill tone="neutral">• {t("provisionalRecord")}</StatusPill></li></ul><button className="primary-button full" disabled={actual !== expected}>{t("confirmCloseout")}</button></Card></div></div>;
}

function CloseoutPage() {
  const { t, i18n } = useTranslation();
  const [counts, setCounts] = useState({ tenThousand: 3, fiveThousand: 4, thousand: 26, fiveHundred: 9, hundred: 31 });
  const actual = counts.tenThousand * 10000 + counts.fiveThousand * 5000 + counts.thousand * 1000 + counts.fiveHundred * 500 + counts.hundred * 100;
  const expected = 83600;
  const update = (key: keyof typeof counts, value: number) => setCounts((current) => ({ ...current, [key]: Math.max(0, value) }));
  const revenueSeries = [382400, 418600, 401200, 455900, 439800, 472100, 486320];
  const revenueLabels = ["10/23", "10/24", "10/25", "10/26", "10/27", "10/28", "10/29"];
  const minRevenue = Math.min(...revenueSeries);
  const maxRevenue = Math.max(...revenueSeries);
  const chartPoints = revenueSeries.map((value, index) => ({ x: 28 + index * 116, y: 164 - ((value - minRevenue) / (maxRevenue - minRevenue)) * 112 }));
  const cashAmount = 194528;
  const mobileAmount = 291792;
  const cashPercent = Math.round((cashAmount / (cashAmount + mobileAmount)) * 100);
  const money = (value: number) => `¥ ${value.toLocaleString(i18n.language === "ja" ? "ja-JP" : i18n.language)}`;
  const compactMoney = (value: number) => i18n.language === "zh" || i18n.language === "zh-TW" || i18n.language === "ja" ? `¥${Math.round(value / 10000)}万` : `¥${Math.round(value / 1000)}k`;
  const chartMotion = useAnimatedProgress<SVGSVGElement>();
  const paymentMotion = useAnimatedProgress<HTMLDivElement>();
  const revenueTicks = [400000, 425000, 450000, 475000];
  const [hoveredRevenueIndex, setHoveredRevenueIndex] = useState<number | null>(null);
  const [hoveredPayment, setHoveredPayment] = useState<"cash" | "mobile" | null>(null);
  const animatedChartPoints = chartPoints.map((point) => ({ ...point, y: 164 + (point.y - 164) * chartMotion.progress }));
  const animatedLinePath = animatedChartPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const animatedAreaPath = `${animatedLinePath} L ${animatedChartPoints[animatedChartPoints.length - 1].x} 180 L 28 180 Z`;
  const cashStartAngle = -90;
  const cashEndAngle = cashStartAngle + cashPercent * 3.6;
  const mobileStartAngle = cashEndAngle;
  const mobileEndAngle = 270;
  return <div className="page-stack">
     <div className="page-title"><div><p className="eyebrow">{t("lastOrder")}{t("closeoutAfter")}</p><h2>{t("closeout")}</h2><p>{t("closeoutDescription")}</p></div><StatusPill tone="warning">! {t("provisional")}</StatusPill></div>
     <Card className="revenue-hero"><div className="revenue-hero-main"><span className="eyebrow">{t("todayRevenue")}</span><AnimatedNumber value={486320} format={money} /><small>{t("posSyncTime")}</small></div><div className="revenue-hero-summary"><div className="revenue-hero-change"><StatusPill tone="normal">+8.4% {t("vsPreviousDay")}</StatusPill><span>{t("revenueChangePositive")}</span></div><div className="revenue-hero-metric"><span>{t("grossProfit")}</span><AnimatedNumber value={321180} format={money} /><small>{t("grossMarginRate")}</small></div><div className="revenue-hero-metric"><span>{t("transactionCount")}</span><AnimatedNumber value={286} format={(value) => value.toLocaleString()} /><small>{t("transactionsToday")}</small></div><div className="revenue-hero-metric"><span>{t("averageTicket")}</span><AnimatedNumber value={1697} format={money} /><small>{t("averageTicketHint")}</small></div><div className="revenue-hero-metric revenue-hero-payment"><span>{t("paymentMix")}</span><div><strong>{cashPercent}%</strong><span>{t("cashPayment")}</span><strong>{100 - cashPercent}%</strong><span>{t("mobilePayment")}</span></div></div></div></Card>
     <div className="revenue-visual-grid"><Card className="revenue-trend-card"><div className="section-heading"><div><h3>{t("weeklyRevenue")}</h3><p className="muted">{t("weeklyRevenueHint")}</p></div><AnimatedNumber className="mono" value={revenueSeries.reduce((sum, value) => sum + value, 0)} format={money} /></div><svg ref={chartMotion.ref} className="revenue-chart" viewBox="0 0 724 220" role="img" aria-label={t("weeklyRevenue")}><g className="revenue-chart-grid">{revenueTicks.map((tick) => { const y = 164 - ((tick - minRevenue) / (maxRevenue - minRevenue)) * 112; return <g key={tick}><line x1="28" x2="724" y1={y} y2={y} /><text className="revenue-chart-y-label" x="22" y={y + 4} textAnchor="end">{compactMoney(tick)}</text></g>; })}</g><path className="revenue-chart-area" d={animatedAreaPath} fill="rgba(199,104,58,.14)" style={{ opacity: chartMotion.progress }} /><path className="revenue-chart-line" d={animatedLinePath} fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />{animatedChartPoints.map((point, index) => <g key={revenueLabels[index]} className="revenue-chart-point" tabIndex={0} role="button" aria-label={`${revenueLabels[index]} ${money(revenueSeries[index])}`} onMouseEnter={() => setHoveredRevenueIndex(index)} onMouseLeave={() => setHoveredRevenueIndex(null)} onFocus={() => setHoveredRevenueIndex(index)} onBlur={() => setHoveredRevenueIndex(null)}><circle className="revenue-chart-point-dot" cx={point.x} cy={point.y} r="5" fill="var(--primary)" opacity={chartMotion.progress} /><circle className="revenue-chart-hit-area" cx={point.x} cy={point.y} r="14" fill="transparent" /><text x={point.x} y="208" textAnchor="middle">{revenueLabels[index]}</text>{hoveredRevenueIndex === index && <g className="revenue-chart-tooltip" transform={`translate(${Math.min(Math.max(point.x - 62, 30), 602)} ${Math.max(point.y - 42, 8)})`}><rect width="124" height="28" rx="8" /><text x="62" y="18" textAnchor="middle">{money(revenueSeries[index])}</text></g>}</g>)}</svg></Card><Card className="payment-card"><div className="section-heading"><div><h3>{t("paymentMix")}</h3><p className="muted">{t("paymentMixHint")}</p></div></div><div className="payment-content"><div ref={paymentMotion.ref} className="payment-donut"><svg className="payment-donut-svg" viewBox="0 0 160 160" aria-label={t("paymentMix")}><path className="payment-donut-segment mobile" d={donutArcPath(mobileStartAngle, mobileEndAngle)} style={{ opacity: paymentMotion.progress, transform: donutOffset(mobileStartAngle, mobileEndAngle, hoveredPayment === "mobile") }} strokeWidth="28" onMouseEnter={() => setHoveredPayment("mobile")} onMouseLeave={() => setHoveredPayment(null)} onFocus={() => setHoveredPayment("mobile")} onBlur={() => setHoveredPayment(null)} tabIndex={0} role="button" aria-label={`${t("mobilePayment")} ${money(mobileAmount)}`} /><path className="payment-donut-segment cash" d={donutArcPath(cashStartAngle, cashEndAngle)} style={{ opacity: paymentMotion.progress, transform: donutOffset(cashStartAngle, cashEndAngle, hoveredPayment === "cash") }} strokeWidth="28" onMouseEnter={() => setHoveredPayment("cash")} onMouseLeave={() => setHoveredPayment(null)} onFocus={() => setHoveredPayment("cash")} onBlur={() => setHoveredPayment(null)} tabIndex={0} role="button" aria-label={`${t("cashPayment")} ${money(cashAmount)}`} /></svg><div className="payment-donut-center"><AnimatedNumber value={cashPercent} format={(value) => `${value}%`} /><span>{t("cashPayment")}</span></div>{hoveredPayment && <div className="payment-donut-tooltip" role="status">{hoveredPayment === "cash" ? t("cashPayment") : t("mobilePayment")} · {money(hoveredPayment === "cash" ? cashAmount : mobileAmount)}</div>}</div><div className="payment-legend"><span><i className="cash-dot" />{t("cashPayment")} <AnimatedNumber value={cashAmount} format={money} /></span><span><i className="mobile-dot" />{t("mobilePayment")} <AnimatedNumber value={mobileAmount} format={money} /></span></div></div></Card></div>
     <div className="operating-insights"><Card><span>{t("peakHour")}</span><strong>18:00–19:00</strong><small>{t("peakHourHint")}</small></Card><Card><span>{t("bestDay")}</span><strong>10/29</strong><small><AnimatedNumber value={486320} format={money} /></small></Card><Card><span>{t("laborCost")}</span><AnimatedNumber value={116800} format={money} /><small>{t("salesRatio")}</small></Card><Card><span>{t("cashDifference")}</span><AnimatedNumber className={actual - expected === 0 ? "success-text" : "danger-text"} value={Math.abs(actual - expected)} format={(value) => `${actual - expected >= 0 ? "+" : "-"}${money(value)}`} /><small>{t("theoryCash")} <AnimatedNumber value={expected} format={money} /></small></Card></div>
     <div className="two-column"><Card><div className="section-heading"><h3>{t("cashCount")}</h3><AnimatedNumber className="mono" value={actual} format={money} /></div><p className="cash-count-hint">{t("cashCountHint")}</p><div className="cash-grid-guide"><span>{t("denomination")}</span><span>{t("cashQuantity")}</span><span>{t("subtotal")}</span></div><div className="cash-grid">{([['tenThousand',10000],['fiveThousand',5000],['thousand',1000],['fiveHundred',500],['hundred',100]] as const).map(([key, amount]) => <label key={key}><span>{money(amount)}</span><input type="number" min="0" inputMode="numeric" aria-label={`${money(amount)} · ${t("cashQuantity")}`} value={counts[key]} onFocus={(event) => event.currentTarget.select()} onChange={(event) => update(key, Number(event.target.value))} /><strong>{money(counts[key] * amount)}</strong></label>)}</div></Card><Card><div className="section-heading"><h3>{t("incompleteChecks")}</h3><StatusPill tone="warning">2</StatusPill></div><ul className="check-list"><li><span>{t("wasteRecord")}</span><StatusPill tone="normal">✓ {t("complete")}</StatusPill></li><li><span>{t("fridgeHandover")}</span><StatusPill tone="warning">! {t("unfinished")}</StatusPill></li><li><span>{t("stockCheck")}</span><StatusPill tone="normal">✓ {t("complete")}</StatusPill></li><li><span>{t("posReturn")}</span><StatusPill tone="neutral">• {t("provisionalRecord")}</StatusPill></li></ul><button className="primary-button full" disabled={actual !== expected}>{t("confirmCloseout")}</button></Card></div>
  </div>;
}

function SettingsPage({ colorAssist, setColorAssist, role }: { colorAssist: boolean; setColorAssist: (value: boolean) => void; role: "manager" | "staff" }) {
  const { t, i18n } = useTranslation();
  const [storeName, setStoreName] = useState(() => localStorage.getItem("settings.storeName") ?? "大阪中央店");
  const [businessHours, setBusinessHours] = useState(() => localStorage.getItem("settings.businessHours") ?? "11:00–23:00");
  const [timezone, setTimezone] = useState(() => localStorage.getItem("settings.timezone") ?? "Asia/Tokyo");
  const [saved, setSaved] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => {
    const stored = localStorage.getItem("settings.notifications");
    if (!stored) return { support: true, issues: true, schedule: true };
    try { return { support: true, issues: true, schedule: true, ...JSON.parse(stored) } as { support: boolean; issues: boolean; schedule: boolean }; } catch { return { support: true, issues: true, schedule: true }; }
  });
  const [lastSync, setLastSync] = useState(() => localStorage.getItem("settings.lastSync") ?? "—");

  const saveStoreSettings = () => {
    localStorage.setItem("settings.storeName", storeName.trim() || "大阪中央店");
    localStorage.setItem("settings.businessHours", businessHours);
    localStorage.setItem("settings.timezone", timezone);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };
  const updateNotification = (key: keyof typeof notifications) => {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    localStorage.setItem("settings.notifications", JSON.stringify(next));
  };
  const syncData = () => {
    const value = new Intl.DateTimeFormat(i18n.language === "ja" ? "ja-JP" : i18n.language, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date());
    setLastSync(value);
    localStorage.setItem("settings.lastSync", value);
  };
  const exportCompletedSchedule = () => openSchedulePrintView({ language: i18n.language, storeName: localStorage.getItem("settings.storeName") ?? "大阪中央店", businessHours: localStorage.getItem("settings.businessHours") ?? "11:00–23:00", role, t, rows: buildSchedulePrintRows(t) });

  return <div className="page-stack narrow">
    <div className="page-title"><div><p className="eyebrow">{t("preferences")}</p><h2>{t("settings")}</h2><p>{t("settingsDescription")}</p></div></div>
    <Card><div className="settings-list">
      <label><div><strong>{t("language")}</strong><span>{t("languageHelp")}</span></div><select className="settings-select" value={i18n.language} onChange={(event) => { void i18n.changeLanguage(event.target.value); localStorage.setItem("locale", event.target.value); }}><option value="ja">日本語</option><option value="zh">简体中文</option><option value="zh-TW">繁體中文</option><option value="en">English</option><option value="ko">한국어</option><option value="vi">Tiếng Việt</option></select></label>
      <label><div><strong>{t("colorAssist")}</strong><span>{t("colorHelp")}</span></div><button type="button" role="switch" aria-checked={colorAssist} className={`switch ${colorAssist ? "on" : ""}`} onClick={() => setColorAssist(!colorAssist)}><span /></button></label>
    </div></Card>
    <div className="settings-grid">
      <Card className="settings-card"><div className="section-heading"><div><h3><Store size={19} />{t("storeInfo")}</h3><p className="muted">{t("storeInfoDescription")}</p></div></div><div className="settings-fields"><label className="settings-field"><span>{t("storeName")}</span><input className="settings-input" value={storeName} onChange={(event) => setStoreName(event.target.value)} /></label><label className="settings-field"><span>{t("businessHours")}</span><input className="settings-input" value={businessHours} onChange={(event) => setBusinessHours(event.target.value)} /></label><label className="settings-field"><span>{t("timezone")}</span><select className="settings-input" value={timezone} onChange={(event) => setTimezone(event.target.value)}><option value="Asia/Tokyo">Asia/Tokyo (JST)</option><option value="Asia/Shanghai">Asia/Shanghai (CST)</option><option value="America/Los_Angeles">America/Los_Angeles (PST)</option></select></label></div><div className="settings-actions"><button type="button" className="primary-button" onClick={saveStoreSettings}>{saved ? <><Check size={16} />{t("settingsSaved")}</> : t("saveSettings")}</button></div></Card>
      <Card className="settings-card"><div className="section-heading"><div><h3><Bell size={19} />{t("notificationSettings")}</h3><p className="muted">{t("notificationSettingsDescription")}</p></div></div><div className="settings-option-list"><div className="settings-option"><div><strong>{t("supportAlerts")}</strong><span>{t("supportAlertsHelp")}</span></div><button type="button" aria-pressed={notifications.support} aria-label={t("supportAlerts")} className={`switch ${notifications.support ? "on" : ""}`} onClick={() => updateNotification("support")}><span /></button></div><div className="settings-option"><div><strong>{t("issueAlerts")}</strong><span>{t("issueAlertsHelp")}</span></div><button type="button" aria-pressed={notifications.issues} aria-label={t("issueAlerts")} className={`switch ${notifications.issues ? "on" : ""}`} onClick={() => updateNotification("issues")}><span /></button></div><div className="settings-option"><div><strong>{t("scheduleAlerts")}</strong><span>{t("scheduleAlertsHelp")}</span></div><button type="button" aria-pressed={notifications.schedule} aria-label={t("scheduleAlerts")} className={`switch ${notifications.schedule ? "on" : ""}`} onClick={() => updateNotification("schedule")}><span /></button></div></div></Card>
      <Card className="settings-card"><div className="section-heading"><div><h3><ShieldCheck size={19} />{t("permissions")}</h3><p className="muted">{t("permissionsDescription")}</p></div><StatusPill tone="neutral">{t("adminSettings")}</StatusPill></div><div className="settings-permission-summary"><div><strong>{t("manager")}</strong><span>{t("managerPermissionSummary")}</span></div><div><strong>{t("staff")}</strong><span>{t("staffPermissionSummary")}</span></div></div><button type="button" className="secondary-button" onClick={() => setPermissionsOpen(!permissionsOpen)}>{permissionsOpen ? t("hideDetails") : t("viewDetails")}</button>{permissionsOpen && <div className="settings-detail"><p>{t("permissionDetailOne")}</p><p>{t("permissionDetailTwo")}</p></div>}</Card>
       <Card className="settings-card"><div className="section-heading"><div><h3><RefreshCw size={19} />{t("dataAndSync")}</h3><p className="muted">{t("dataAndSyncDescription")}</p></div><StatusPill tone="normal">{t("syncReady")}</StatusPill></div><div className="sync-status"><span>{t("lastSync")}</span><strong>{lastSync}</strong></div><div className="settings-actions"><button type="button" className="secondary-button" onClick={syncData}><RefreshCw size={16} />{t("syncNow")}</button><button type="button" className="secondary-button" onClick={exportCompletedSchedule}><Download size={16} />{t("exportSchedule")}</button></div><p className="muted settings-export-hint">{t("exportScheduleHint")}</p></Card>
    </div>
    <Card><div className="section-heading"><div><h3>{t("laborRuleSet")}</h3><p className="muted">{t("demoRule")}</p></div><StatusPill tone="neutral">{t("adminSettings")}</StatusPill></div><p>{t("laborRuleDescription")} {t("legalDisclaimer")}</p></Card>
  </div>;
}

function StaffHome() {
  const { t } = useTranslation();
  return <div className="page-stack"><div className="welcome-row"><div><p className="eyebrow">{t("nextShift")}</p><h2>{t("staffGreeting")}</h2><p>{t("staffCheck")}</p></div><StatusPill tone="warning">! {t("beforeShift")}</StatusPill></div><div className="two-column"><Card className="next-shift"><Clock3 size={28} /><div><span>{t("todaysShift")}</span><strong>17:00–22:00</strong><p>{t("hall")} · {t("register")} / {t("serving")}</p></div></Card><Card><div className="section-heading"><h3>{t("weeklyHours")}</h3><StatusPill tone="warning">! 89%</StatusPill></div><div className="big-hours"><strong>25h</strong><span>/ 28h</span></div><p className="muted">{t("otherWorkHours")}</p></Card></div><Card><div className="section-heading"><h3><BookOpen size={19} />{t("preShiftLearning")}</h3><StatusPill tone="warning">1</StatusPill></div><div className="learning-row"><div><strong>{t("registerCloseBasics")}</strong><span>{t("estimate")} · {t("safetyItem")}</span></div><button className="primary-button">{t("learn")}</button></div></Card></div>;
}

export default function App() {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);
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
    if (active === "schedule") return <SchedulePage role={role} />;
    if (active === "inventory") return <InventoryPage />;
    if (active === "chat") return <ChatPage role={role} />;
    if (active === "employees") return <Suspense fallback={<div className="page-stack"><Card><span>{t("loading")}</span></Card></div>}><LazyEmployeesPage role={role} /></Suspense>;
    if (active === "closeout") return <CloseoutPage />;
    if (active === "more") return <MorePage onNavigate={navigate} />;
    if (active === "incidents") return <IncidentsPage />;
    if (active === "reservations") return <ReservationsPage />;
    if (active === "equipment") return <EquipmentPage />;
    if (active === "allergens") return <AllergensPage />;
    if (active === "crossStore") return <CrossStorePage />;
    if (active === "evaluations") return <EvaluationsPage />;
    return <SettingsPage colorAssist={colorAssist} setColorAssist={(value) => { setColorAssist(value); localStorage.setItem("colorAssist", String(value)); }} role={role} />;
  }, [active, colorAssist, role, i18n.language]);
  return <div className={`app-shell ${colorAssist ? "color-assist" : ""}`} onCopy={(event) => event.preventDefault()} onCut={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()}><Navigation active={active} onChange={navigate} role={role} /><main><Header role={role} colorAssist={colorAssist} setRole={(next) => { setRole(next); if (next === "staff" && ["employees", "closeout"].includes(active)) navigate("today"); }} /><div className="content">{page}</div></main>{showBackToTop && <button className="back-to-top" type="button" aria-label={t("backToTop")} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>{formatBackToTopParts(i18n.language).map((part) => <span className="back-to-top-word" key={part}>{part}</span>)}</button>}</div>;
}


