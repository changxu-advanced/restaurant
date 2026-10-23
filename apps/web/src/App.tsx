import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle, Archive, BadgeInfo, BookOpen, Boxes, CalendarDays, Check, ChevronRight,
  CircleDollarSign, Clock3, Languages, LayoutDashboard, MessageCircle, PackageCheck,
  Settings, Sparkles, Store, Users, UtensilsCrossed, Eye, MoreHorizontal, MessageSquareWarning, Wrench, ShieldCheck, Building2, Star, CalendarCheck, Camera, CheckCircle2
} from "lucide-react";
import { employees, featureCards, initialInventory, shifts } from "./demoData";
import type { InventoryItem, NavKey, StockState } from "./types";

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
const stockOptions: StockState[] = ["enough", "low", "urgent", "out"];
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

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

function Header({ role, setRole, colorAssist }: { role: "manager" | "staff"; setRole: (role: "manager" | "staff") => void; colorAssist: boolean }) {
  const { t, i18n } = useTranslation();
  const changeLanguage = (language: string) => {
    void i18n.changeLanguage(language);
    localStorage.setItem("locale", language);
  };
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow"><Store size={15} />{t("storeDate")}</p>
        <h1>{t("product")}</h1>
      </div>
      <div className="topbar-actions">
        {colorAssist && <span className="color-assist-indicator"><Eye size={16} />{t("colorAssistOn")}</span>}
        <label className="compact-select">
          <span className="sr-only">{t("language")}</span>
          <Languages size={17} />
          <select value={i18n.language} onChange={(event) => changeLanguage(event.target.value)}>
            <option value="ja">日本語</option><option value="zh">简体中文</option><option value="zh-TW">繁體中文</option><option value="en">English</option><option value="ko">한국어</option><option value="vi">Tiếng Việt</option>
          </select>
        </label>
        <label className="compact-select">
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

function EmployeesPage() {
  const { t } = useTranslation();
  const employeeCopy: Record<string, { role: string; skills: string[] }> = { e1: { role: t("storeManager"), skills: [t("hallTraining"), t("register"), t("ordering")] }, e2: { role: t("cookingLeader"), skills: [t("wokStation"), t("fryerStation"), t("trainer")] }, e3: { role: t("studentPartTime"), skills: [t("serving"), t("register"), t("noodleSupport")] }, e4: { role: t("partTime"), skills: [t("dishwashing"), t("prepSupport")] }, e5: { role: t("newcomer"), skills: [t("servingPractice")] } };
  return <div className="page-stack"><div className="page-title"><div><p className="eyebrow">{t("workforceSkills")}</p><h2>{t("employees")}</h2><p>{t("employeeDescription")}</p></div><button className="primary-button">＋ {t("addStaff")}</button></div><div className="employee-grid">{employees.map((employee) => { const percent = Math.round(employee.weeklyMinutes / employee.weeklyLimitMinutes * 100); const copy = employeeCopy[employee.id] ?? { role: employee.role, skills: employee.skills }; return <Card key={employee.id} className="employee-card"><div className="employee-head"><span className="large-avatar">{employee.initials}</span><div><h3>{employee.name}</h3><p>{copy.role}</p></div><StatusPill tone={employee.warning === "approaching" ? "warning" : "normal"}>{employee.warning === "approaching" ? `! ${t("approaching")}` : `✓ ${t("normal")}`}</StatusPill></div><div className="skill-tags">{copy.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><div className="hours"><div><span>{t("thisWeek")}</span><strong>{employee.weeklyMinutes / 60}h / {employee.weeklyLimitMinutes / 60}h</strong></div><div className="hours-bar"><span className={percent >= 80 ? "warn" : ""} style={{ width: `${Math.min(percent, 100)}%` }} /></div></div><button className="ghost-button full">{t("viewProfile")}<ChevronRight size={17} /></button></Card>; })}</div></div>;
}

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
  const validRoutes = useMemo(() => new Set<NavKey>([...navItems.map((item) => item.key), "incidents", "reservations", "equipment", "allergens", "crossStore", "evaluations"]), []);
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
  const page = useMemo(() => {
    if (active === "today") return role === "manager" ? <TodayPage onNavigate={navigate} /> : <StaffHome />;
    if (active === "schedule") return <SchedulePage />;
    if (active === "inventory") return <InventoryPage />;
    if (active === "chat") return <ChatPage />;
    if (active === "employees") return <EmployeesPage />;
    if (active === "closeout") return <CloseoutPage />;
    if (active === "more") return <MorePage onNavigate={navigate} />;
    if (active === "incidents") return <IncidentsPage />;
    if (active === "reservations") return <ReservationsPage />;
    if (active === "equipment") return <EquipmentPage />;
    if (active === "allergens") return <AllergensPage />;
    if (active === "crossStore") return <CrossStorePage />;
    if (active === "evaluations") return <EvaluationsPage />;
    return <SettingsPage colorAssist={colorAssist} setColorAssist={(value) => { setColorAssist(value); localStorage.setItem("colorAssist", String(value)); }} />;
  }, [active, colorAssist, role]);
  return <div className={`app-shell ${colorAssist ? "color-assist" : ""}`} onCopy={(event) => event.preventDefault()} onCut={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()}><Navigation active={active} onChange={navigate} role={role} /><main><Header role={role} colorAssist={colorAssist} setRole={(next) => { setRole(next); if (next === "staff" && ["employees", "closeout"].includes(active)) navigate("today"); }} /><div className="content">{page}</div></main></div>;
}

