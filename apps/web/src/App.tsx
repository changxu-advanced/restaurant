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

const availabilityDays = ["10/26 月", "10/27 火", "10/28 水", "10/29 木", "10/30 金", "10/31 土", "11/1 日"];
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
        <p className="eyebrow"><Store size={15} />大阪中央店 · 2026.10.22</p>
        <h1>{t("product")}</h1>
      </div>
      <div className="topbar-actions">
        {colorAssist && <span className="color-assist-indicator"><Eye size={16} />色覚サポート ON</span>}
        <label className="compact-select">
          <span className="sr-only">{t("language")}</span>
          <Languages size={17} />
          <select value={i18n.language} onChange={(event) => changeLanguage(event.target.value)}>
            <option value="ja">日本語</option><option value="zh">中文</option><option value="en">English</option>
          </select>
        </label>
        <label className="compact-select">
          <span className="sr-only">{t("demoRole")}</span>
          <select value={role} onChange={(event) => setRole(event.target.value as "manager" | "staff") }>
            <option value="manager">{t("manager")}</option><option value="staff">{t("staff")}</option>
          </select>
        </label>
        <button className="avatar" aria-label="Profile">佐</button>
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
        <nav aria-label="Main navigation">
          {visible.map(({ key, icon: Icon }) => (
            <button key={key} className={active === key ? "active" : ""} onClick={() => onChange(key)}>
              <Icon size={20} /><span>{t(key)}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-note" title="実在する店舗・従業員の情報は使用していません。"><BadgeInfo size={17} /><span><strong>デモ環境</strong><br />架空データのみ · v0.2.0</span></div>
      </aside>
      <nav className="bottom-nav" aria-label="Mobile navigation">
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
  return <div className="page-stack"><div className="page-title"><div><p className="eyebrow">v0.2.0 · 例外対応</p><h2>{t("more")}</h2><p>日常の営業を邪魔しない、必要な時だけ使う管理功能。</p></div></div><div className="feature-grid">{featureCards.map((feature) => { const Icon = featureIcons[feature.icon]; return <Card key={feature.key} className="feature-card"><div className="feature-icon"><Icon size={22} /></div><div className="feature-copy"><div className="card-title-row"><h3>{feature.title}</h3><StatusPill tone={feature.tone}>{feature.status}</StatusPill></div><p>{feature.summary}</p></div><button className="secondary-button" onClick={() => onNavigate(feature.key as NavKey)}>{t("view")}<ChevronRight size={17} /></button></Card>; })}</div><Card className="notice-card"><BadgeInfo size={21} /><div><strong>后期模块的共同原则</strong><p>记录事实、明确负责人、保留审计轨迹。投诉、评价和劳动规则不会自动替店长做最终判断。</p></div></Card></div>;
}

function IncidentsPage() {
  const [resolved, setResolved] = useState(false);
  return <FeaturePage eyebrow="Customer care" title="接客与カスタマーハラスメント" description="先记录事实，再决定是否需要店长或总部介入。"><div className="feature-summary"><StatusPill tone={resolved ? "normal" : "danger"}>{resolved ? "已完成记录" : "1件待确认"}</StatusPill><span>不要求员工当场判断对方是否属于骚扰，只记录行为和影响。</span></div><Card className="incident-card"><div className="card-title-row"><div><p className="eyebrow">今日 11:20 · 前台</p><h3>关于等待时间的强烈投诉</h3></div><StatusPill tone="danger">需要店长确认</StatusPill></div><div className="tag-row"><span>事实记录</span><span>员工保护</span><span>不公开个人信息</span></div><p>顾客提高音量并持续要求退款。员工已请店长接手，未发生身体接触。</p><div className="meta"><span>报告人：王 小雨</span><span>附件：现场照片 1张</span></div><button className="primary-button" onClick={() => setResolved(true)}><CheckCircle2 size={17} />{resolved ? "已记录处理结果" : "确认并记录处理结果"}</button></Card></FeaturePage>;
}

function ReservationsPage() {
  const [showCanceled, setShowCanceled] = useState(false);
  return <FeaturePage eyebrow="Reservations" title="预约与无断キャンセル" description="把预约确认、到店状态和取消原因放在同一张卡片里。"><div className="reservation-toolbar"><button className={showCanceled ? "ghost-button" : "primary-button"} onClick={() => setShowCanceled(false)}>今日预约 12组</button><button className={showCanceled ? "primary-button" : "ghost-button"} onClick={() => setShowCanceled(true)}>取消记录 2件</button></div><div className="reservation-list">{(showCanceled ? [{ time: "昨日 19:00", name: "佐々木様", party: "4名", status: "无断キャンセル", tone: "danger" as const }] : [{ time: "12:00", name: "田中様", party: "2名", status: "确认済み", tone: "normal" as const }, { time: "18:30", name: "山本様", party: "6名", status: "到店前确认", tone: "warning" as const }]).map((reservation) => <Card key={reservation.time + reservation.name} className="reservation-row"><div className="reservation-time">{reservation.time}</div><div><strong>{reservation.name}</strong><span>{reservation.party} · 电话预约</span></div><StatusPill tone={reservation.tone}>{reservation.status}</StatusPill><button className="ghost-button">打开卡片</button></Card>)}</div></FeaturePage>;
}

function EquipmentPage() {
  const [fixed, setFixed] = useState<string[]>([]);
  return <FeaturePage eyebrow="Maintenance" title="设备维修" description="照片、症状、负责人和预计恢复时间一次提交。"><div className="equipment-list">{[{ id: "fridge", name: "冷蔵庫2番", issue: "门关闭不严，温度需要复查", owner: "田中 蓮", status: "维修中", tone: "warning" as const }, { id: "hood", name: "排烟フード", issue: "风量偏弱，已预约检查", owner: "供应商待确认", status: "待安排", tone: "neutral" as const }].map((item) => { const done = fixed.includes(item.id); return <Card key={item.id} className="equipment-row"><div className="equipment-photo"><Camera size={23} /><span>照片</span></div><div className="feature-copy"><div className="card-title-row"><h3>{item.name}</h3><StatusPill tone={done ? "normal" : item.tone}>{done ? "已修复" : item.status}</StatusPill></div><p>{item.issue}</p><div className="meta"><span>负责人：{item.owner}</span><span>更新时间：10:25</span></div></div><button className="secondary-button" onClick={() => setFixed((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}>{done ? "重新打开" : "标记已修复"}</button></Card>; })}</div></FeaturePage>;
}

function AllergensPage() {
  const [confirmed, setConfirmed] = useState<string[]>([]);
  return <FeaturePage eyebrow="Food safety" title="过敏原与特殊饮食" description="重要单词保留日语，交接时明确确认人，不依赖颜色单独判断。"><Card><div className="section-heading"><div><h3>今日特殊要求</h3><p className="muted">服务前必须由前台与后厨共同确认</p></div><StatusPill tone="warning">2件待确认</StatusPill></div><div className="allergen-list">{[{ id: "a1", guest: "18:30 佐々木様", request: "花生（落花生）过敏 · 不使用同一勺具" }, { id: "a2", guest: "19:00 山本様", request: "不含猪肉（豚肉なし）" }].map((item) => { const done = confirmed.includes(item.id); return <div className={`allergen-row ${done ? "done" : ""}`} key={item.id}><ShieldCheck size={21} /><div><strong>{item.guest}</strong><span>{item.request}</span></div><button className={done ? "ghost-button" : "primary-button"} onClick={() => setConfirmed((current) => done ? current.filter((id) => id !== item.id) : [...current, item.id])}>{done ? "已确认" : "确认交接"}</button></div>; })}</div></Card></FeaturePage>;
}

function CrossStorePage() {
  const [response, setResponse] = useState(false);
  return <FeaturePage eyebrow="Cross-store support" title="跨店支援" description="支援请求只显示给符合技能、时间、工时和通勤条件的员工。"><Card className="support-card"><div className="card-title-row"><div><p className="eyebrow"><Building2 size={14} />新大阪店 → 大阪中央店</p><h3>11/1 17:00–21:00 · 锅场辅助</h3></div><StatusPill tone="warning">回复截止 10/31 12:00</StatusPill></div><p>预计通勤 22 分钟 · 需要“可辅助”以上技能 · 不影响原门店班次。</p><div className="support-actions"><button className={response ? "selected" : ""} onClick={() => setResponse(true)}>{response ? "已表示可以支援" : "可以支援"}</button><button onClick={() => setResponse(false)}>抱歉，今天有事</button></div></Card></FeaturePage>;
}

function EvaluationsPage() {
  const [saved, setSaved] = useState(false);
  return <FeaturePage eyebrow="People development" title="员工评价" description="以事实、技能和下一步目标记录成长，不做公开排行榜。"><div className="evaluation-grid">{[{ name: "王 小雨", role: "配膳 · レジ", goal: "独立完成高峰期收银" }, { name: "Alex Chen", role: "新人 · 配膳练习中", goal: "完成卫生与安全教材" }].map((employee) => <Card key={employee.name} className="evaluation-card"><div className="employee-head"><span className="large-avatar">{employee.name.slice(0, 1)}</span><div><h3>{employee.name}</h3><p>{employee.role}</p></div><Star size={20} className="star-icon" /></div><div className="rating-row"><span>技能表现</span><strong>可辅助</strong></div><div className="rating-row"><span>下一步目标</span><strong>{employee.goal}</strong></div><button className="secondary-button full" onClick={() => setSaved(true)}>{saved ? "已保存本月记录" : "保存评价记录"}</button></Card>)}</div></FeaturePage>;
}

function FeaturePage({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <div className="page-stack"><div className="page-title"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div></div>{children}</div>;
}

function TodayPage({ onNavigate }: { onNavigate: (key: NavKey) => void }) {
  const { t } = useTranslation();
  return (
    <div className="page-stack">
      <div className="welcome-row">
        <div><p className="eyebrow">{t("open")} · 11:42</p><h2>{t("hello")}、佐藤さん</h2><p>{t("focus")}</p></div>
        <div className="phase-track" aria-label="Business phase">
          {["preOpen", "open", "lastOrder", "closed"].map((phase, index) => <span key={phase} className={index === 1 ? "current" : index < 1 ? "done" : ""}>{t(phase)}</span>)}
        </div>
      </div>
      <div className="dashboard-grid">
        <div className="main-column">
          <div className="section-heading"><div><p className="eyebrow">Priority</p><h3>{t("attention")}</h3></div><StatusPill tone="danger">3</StatusPill></div>
          <Card className="operation-card danger-card">
            <div className="card-icon"><AlertTriangle size={22} /></div>
            <div className="card-body"><div className="card-title-row"><h4>{t("shortage")} · 18:00–20:30</h4><StatusPill tone="danger">{t("action")}</StatusPill></div><p>厨房の鍋場を独立担当できるスタッフが1名不足しています。</p><div className="meta"><span><Clock3 size={15} />回答期限 12:00</span><span>候補者 3名</span></div></div>
            <button className="primary-button" onClick={() => onNavigate("chat")}>{t("view")}<ChevronRight size={17} /></button>
          </Card>
          <Card className="operation-card warning-card">
            <div className="card-icon"><Boxes size={22} /></div>
            <div className="card-body"><div className="card-title-row"><h4>キャベツの{t("stockCheck")}</h4><StatusPill tone="warning">! 18:40 欠品見込み</StatusPill></div><p>販売速度が通常より18%速くなっています。推奨発注数は3箱です。</p><div className="meta"><span>仕入先締切 13:00</span><span>信頼度 86%</span></div></div>
            <button className="secondary-button" onClick={() => onNavigate("inventory")}>{t("view")}<ChevronRight size={17} /></button>
          </Card>
          <Card className="operation-card">
            <div className="card-icon"><Archive size={22} /></div>
            <div className="card-body"><div className="card-title-row"><h4>{t("handover")} · 冷蔵庫2番</h4><StatusPill tone="neutral">{t("unresolved")}</StatusPill></div><p>扉の閉まりが弱いため、閉店時に温度を再確認してください。</p><div className="meta"><span>山田 · 10:25</span><span>担当 佐藤</span></div></div>
            <button className="ghost-button" onClick={() => onNavigate("chat")}>{t("view")}<ChevronRight size={17} /></button>
          </Card>
        </div>
        <aside className="side-column">
          <Card><div className="section-heading"><h3>{t("timeline")}</h3><span className="muted">本日</span></div><ol className="timeline"><li className="complete"><button onClick={() => onNavigate("schedule")}><time>09:30</time><span><strong>開店準備</strong><small>12/12 完了</small></span><ChevronRight size={16} /></button></li><li className="current"><button onClick={() => onNavigate("schedule")}><time>11:30</time><span><strong>ランチ営業</strong><small>ホール4 · 厨房5</small></span><ChevronRight size={16} /></button></li><li><button onClick={() => onNavigate("inventory")}><time>15:00</time><span><strong>{t("stockCheck")}</strong><small>重要品目 5件</small></span><ChevronRight size={16} /></button></li><li><button onClick={() => onNavigate("chat")}><time>17:00</time><span><strong>ディナー交代</strong><small>{t("handover")} 2件</small></span><ChevronRight size={16} /></button></li><li><button onClick={() => onNavigate("closeout")}><time>21:30</time><span><strong>{t("lastOrder")}</strong><small>{t("closeout")}準備</small></span><ChevronRight size={16} /></button></li></ol></Card>
          <Card><div className="section-heading"><h3>本日の配置</h3><StatusPill tone="warning">! 夜に不足</StatusPill></div><div className="coverage-list"><div><span>ホール</span><strong>4 / 4</strong></div><div><span>厨房</span><strong>5 / 5</strong></div><div className="warn"><span>鍋場 18時以降</span><strong>0 / 1</strong></div></div></Card>
        </aside>
      </div>
    </div>
  );
}

function SchedulePage() {
  const { t } = useTranslation();
  const [availability, setAvailability] = useState<Record<string, string[]>>(() => Object.fromEntries(availabilityDays.map((day, index) => [day, index === 2 ? [] : index === 5 ? ["12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "00"] : index === 6 ? ["09", "10", "11", "12"] : ["prep", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"]])));
  const [mobileDay, setMobileDay] = useState(availabilityDays[0]);
  const [rangeStart, setRangeStart] = useState<Record<string, string | null>>(() => Object.fromEntries(availabilityDays.map((day) => [day, null])));
  const [status, setStatus] = useState<"idle" | "running" | "ready">("idle");
  const generate = () => { setStatus("running"); window.setTimeout(() => setStatus("ready"), 900); };
  const toggleBlock = (day: string, blockId: string) => {
    const selected = availability[day] ?? [];
    const currentRangeStart = rangeStart[day];
    if (selected.includes(blockId)) {
      setRangeStart((current) => ({ ...current, [day]: null }));
      setAvailability((current) => ({ ...current, [day]: current[day].filter((id) => id !== blockId) }));
      return;
    }
    if (currentRangeStart) {
      const startIndex = availabilityBlocks.findIndex((block) => block.id === currentRangeStart);
      const endIndex = availabilityBlocks.findIndex((block) => block.id === blockId);
      const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
      const filledIds = availabilityBlocks.slice(from, to + 1).map((block) => block.id);
      setRangeStart((current) => ({ ...current, [day]: null }));
      setAvailability((current) => ({ ...current, [day]: Array.from(new Set([...current[day], ...filledIds])) }));
      return;
    }
    setRangeStart((current) => ({ ...current, [day]: blockId }));
    setAvailability((current) => ({ ...current, [day]: [...current[day], blockId] }));
  };
  const applyWeekdays = () => {
    setRangeStart((current) => Object.fromEntries(availabilityDays.map((day) => [day, current[day] ?? null])));
    setAvailability((current) => ({
      ...current,
      ...Object.fromEntries(availabilityDays.slice(0, 5).map((day) => [day, daytimeAvailabilityIds]))
    }));
  };
  const copyPreviousDay = () => {
    setRangeStart((current) => Object.fromEntries(availabilityDays.map((day) => [day, current[day] ?? null])));
    setAvailability((current) => Object.fromEntries(availabilityDays.map((day, index) => [day, index === 0 ? current[day] : [...current[availabilityDays[index - 1]]]])));
  };
  const applyPreset = (blockIds: string[]) => {
    setRangeStart((current) => ({ ...current, [mobileDay]: null }));
    setAvailability((current) => ({ ...current, [mobileDay]: blockIds }));
  };
  return (
    <div className="page-stack"><div className="page-title"><div><p className="eyebrow">2026.10.26–11.08</p><h2>{t("schedule")}</h2><p>希望、技能、工時上限をまとめて確認します。</p></div><button className="primary-button" onClick={generate} disabled={status === "running"}><Sparkles size={18} />{status === "running" ? "最適化中…" : t("generate")}</button></div>
      <div className="two-column">
        <Card className="availability-card">
          <div className="section-heading"><div><h3>{t("availability")}</h3><p className="muted">店舗設定済みの時間帯をタップして選択</p></div><div className="button-row desktop-actions"><button className="text-button" onClick={copyPreviousDay}>前日をコピー</button><button className="text-button" onClick={applyWeekdays}>平日を一括設定</button></div></div>
          <div className="time-legend" aria-label="時間帯の区分"><span className="prep">準備時間</span><span className="normal">通常営業</span><span className="late">深夜時間</span><small>最初と最後の時間帯を選ぶと中間を自動補全 · 選択中は濃く表示</small></div>
          <div className="availability-grid desktop-availability">{availabilityDays.map((day) => <div className="availability-row" key={day}><strong>{day}</strong><div className="time-scroll"><div className="time-blocks">{availabilityBlocks.map((block) => { const selected = availability[day].includes(block.id); const isRangeStart = rangeStart[day] === block.id; return <button key={block.id} type="button" aria-pressed={selected} aria-label={`${day} ${block.time}`} className={`time-block ${block.tone} ${selected ? "selected" : ""} ${isRangeStart ? "range-start" : ""}`} onClick={() => toggleBlock(day, block.id)}><span>{selected ? "✓" : "○"} {block.label}</span><time>{block.time}</time></button>; })}</div></div></div>)}</div>
          <div className="mobile-availability">
            <div className="mobile-day-tabs" role="tablist" aria-label="希望日を選択">{availabilityDays.map((day) => <button key={day} role="tab" aria-selected={mobileDay === day} className={mobileDay === day ? "active" : ""} onClick={() => setMobileDay(day)}><strong>{day.split(" ")[0]}</strong><span>{day.split(" ")[1]}</span><small>{availability[day].length}</small></button>)}</div>
            <div className="mobile-day-heading"><div><strong>{mobileDay}</strong><span>{rangeStart[mobileDay] ? "再选择结束时间，自动补全中间时段" : `${availability[mobileDay].length} / ${availabilityBlocks.length} 时间段已选择 · 点击首尾自动补全`}</span></div><button className="text-button" onClick={applyWeekdays}>平日に反映</button></div>
            <div className="mobile-presets"><button onClick={() => applyPreset(allAvailabilityIds)}>全时间</button><button onClick={() => applyPreset(daytimeAvailabilityIds)}>日中</button><button onClick={() => applyPreset(nightAvailabilityIds)}>夜</button><button onClick={() => applyPreset([])}>クリア</button></div>
            <div className="mobile-time-blocks">{availabilityBlocks.map((block) => { const selected = availability[mobileDay].includes(block.id); const isRangeStart = rangeStart[mobileDay] === block.id; return <button key={block.id} type="button" aria-pressed={selected} aria-label={`${mobileDay} ${block.time}`} className={`time-block ${block.tone} ${selected ? "selected" : ""} ${isRangeStart ? "range-start" : ""}`} onClick={() => toggleBlock(mobileDay, block.id)}><span>{selected ? "✓" : "○"} {block.label}</span><time>{block.time}</time></button>; })}</div>
          </div>
          <div className="card-footer"><span className="muted">店舗固定 17時間帯 · 自動保存</span><StatusPill tone="normal">✓ 提出済み</StatusPill></div>
        </Card>
        <div className="page-stack compact-gap"><Card><div className="section-heading"><h3>{t("autoSchedule")}</h3><StatusPill tone={status === "ready" ? "normal" : "neutral"}>{status === "ready" ? "草案完成" : "未実行"}</StatusPill></div>{status === "ready" ? <div className="solver-result"><div><strong>制約違反 0件</strong><span>充足率 97.6%</span></div><div className="score-bar"><span style={{ width: "97.6%" }} /></div><ul><li>鍋場 11/1 18:00–19:00が未充足</li><li>短時間シフトを3件回避</li><li>週末勤務差を1回以内に均衡化</li></ul><button className="primary-button full">草案を確認</button></div> : <div className="empty-state"><Sparkles size={30} /><strong>希望提出後に草案を作成</strong><span>無理な制約は自動で緩和しません。</span></div>}</Card><Card><div className="section-heading"><h3>本日のシフト</h3><span className="muted">4名</span></div><div className="shift-list">{shifts.map((shift) => <div className="shift-row" key={shift.id}><div><strong>{shift.employee}</strong><span>{shift.area}</span></div><div className="shift-time"><strong>{shift.start}–{shift.end}</strong>{shift.warning && <StatusPill tone="warning">! {shift.warning}</StatusPill>}</div></div>)}</div></Card></div>
      </div>
    </div>
  );
}

function InventoryPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<InventoryItem[]>(initialInventory);
  const [saved, setSaved] = useState(false);
  const setState = (id: string, state: StockState) => { setSaved(false); setItems((current) => current.map((item) => item.id === id ? { ...item, state } : item)); };
  return <div className="page-stack"><div className="page-title"><div><p className="eyebrow">15:00 定期確認</p><h2>{t("inventory")}</h2><p>通常品は状態を選ぶだけ。重要品だけ数量を確認します。</p></div><div className="button-row"><button className="secondary-button" onClick={() => setItems(initialInventory)}>{t("applyYesterday")}</button><button className="primary-button" onClick={() => setSaved(true)}><Check size={18} />{saved ? "保存済み" : t("save")}</button></div></div><Card><div className="inventory-table"><div className="inventory-head"><span>品目</span><span>状態</span><span>予測と提案</span></div>{items.map((item) => <div className="inventory-row" key={item.id}><div><strong>{item.name}</strong><span>欠品（けっぴん）確認</span></div><div className="stock-buttons">{stockOptions.map((state) => <button key={state} className={item.state === state ? `selected ${state}` : ""} onClick={() => setState(item.id, state)}>{t(state)}</button>)}</div><div className="forecast"><strong>{item.forecast}</strong>{item.recommendation && <span>{item.recommendation}</span>}</div></div>)}</div></Card><Card className="suggestion-card"><PackageCheck size={26} /><div><h3>発注Draft · 2件</h3><p>キャベツ3箱、鶏もも肉2箱。確認するまで仕入先へ送信されません。</p></div><button className="secondary-button">内容を確認</button></Card></div>;
}

function ChatPage() {
  const { t } = useTranslation();
  const [response, setResponse] = useState<string>();
  const [resolved, setResolved] = useState(false);
  return <div className="page-stack"><div className="page-title"><div><p className="eyebrow">{t("publicRoom")}</p><h2>{t("chat")}</h2><p>個人DMではなく、必要な人だけがカードに回答します。</p></div><button className="primary-button">＋ {t("handover")}</button></div><div className="chat-shell"><div className="chat-day">2026年10月22日</div><div className="message"><div className="message-avatar">山</div><div><div className="message-meta"><strong>山田</strong><time>10:25</time></div><div className="bubble">冷蔵庫2番の扉が少し閉まりにくくなっています。</div></div></div><Card className="support-card"><div className="card-title-row"><div><p className="eyebrow"><AlertTriangle size={14} />{t("support")}</p><h3>本日 18:00–20:30 · 鍋場</h3></div><StatusPill tone="danger">12:00まで</StatusPill></div><p>欠勤連絡がありました。条件に合うスタッフだけに表示されています。</p><div className="support-actions"><button className={response === "yes" ? "selected" : ""} onClick={() => setResponse("yes")}>{t("canSupport")}</button><button className={response === "partial" ? "selected" : ""} onClick={() => setResponse("partial")}>{t("partialSupport")}</button><button className={response === "no" ? "selected" : ""} onClick={() => setResponse("no")}>{t("cannotSupport")}</button></div>{response && <p className="confirmation"><Check size={16} />回答を受け付けました。店長確認後にシフトへ反映されます。</p>}</Card><Card className="handover-card"><div className="handover-photo" aria-label="冷蔵庫の確認写真"><Archive size={32} /></div><div className="card-body"><div className="card-title-row"><h3>設備 · 冷蔵庫2番</h3><StatusPill tone={resolved ? "normal" : "warning"}>{resolved ? t("resolved") : t("unresolved")}</StatusPill></div><p>閉店時に庫内温度と扉を再確認してください。</p><div className="meta"><span>担当 佐藤</span><span>{t("beforeShift")}</span></div></div><button className="secondary-button" onClick={() => setResolved(!resolved)}>{resolved ? "再開" : "解決にする"}</button></Card></div></div>;
}

function EmployeesPage() {
  const { t } = useTranslation();
  return <div className="page-stack"><div className="page-title"><div><p className="eyebrow">Workforce & Skills</p><h2>{t("employees")}</h2><p>時給や在留情報は権限のある管理者だけに表示します。</p></div><button className="primary-button">＋ スタッフ追加</button></div><div className="employee-grid">{employees.map((employee) => { const percent = Math.round(employee.weeklyMinutes / employee.weeklyLimitMinutes * 100); return <Card key={employee.id} className="employee-card"><div className="employee-head"><span className="large-avatar">{employee.initials}</span><div><h3>{employee.name}</h3><p>{employee.role}</p></div><StatusPill tone={employee.warning === "approaching" ? "warning" : "normal"}>{employee.warning === "approaching" ? `! ${t("approaching")}` : `✓ ${t("normal")}`}</StatusPill></div><div className="skill-tags">{employee.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><div className="hours"><div><span>今週</span><strong>{employee.weeklyMinutes / 60}h / {employee.weeklyLimitMinutes / 60}h</strong></div><div className="hours-bar"><span className={percent >= 80 ? "warn" : ""} style={{ width: `${Math.min(percent, 100)}%` }} /></div></div><button className="ghost-button full">プロフィールを見る<ChevronRight size={17} /></button></Card>; })}</div></div>;
}

function CloseoutPage() {
  const { t } = useTranslation();
  const [counts, setCounts] = useState({ tenThousand: 3, fiveThousand: 4, thousand: 26, fiveHundred: 9, hundred: 31 });
  const actual = counts.tenThousand * 10000 + counts.fiveThousand * 5000 + counts.thousand * 1000 + counts.fiveHundred * 500 + counts.hundred * 100;
  const expected = 83600;
  const update = (key: keyof typeof counts, value: number) => setCounts((current) => ({ ...current, [key]: Math.max(0, value) }));
  return <div className="page-stack"><div className="page-title"><div><p className="eyebrow">{t("lastOrder")}後 · 21:30開始</p><h2>{t("closeout")}</h2><p>POS同期済み。現金枚数を確認すると差額を自動計算します。</p></div><StatusPill tone="warning">! {t("provisional")}</StatusPill></div><div className="metric-grid"><Card><span>{t("sales")}</span><strong>¥ 486,320</strong><small>POS同期 21:42</small></Card><Card><span>{t("grossProfit")}</span><strong>¥ 321,180</strong><small>66.0%</small></Card><Card><span>{t("laborCost")}</span><strong>¥ 116,800</strong><small>売上比 24.0%</small></Card><Card><span>{t("cashDifference")}</span><strong className={actual - expected === 0 ? "success-text" : "danger-text"}>{actual - expected >= 0 ? "+" : ""}¥ {actual - expected}</strong><small>理論現金 ¥ {expected.toLocaleString()}</small></Card></div><div className="two-column"><Card><div className="section-heading"><h3>現金実査</h3><span className="mono">¥ {actual.toLocaleString()}</span></div><div className="cash-grid">{([['tenThousand',10000],['fiveThousand',5000],['thousand',1000],['fiveHundred',500],['hundred',100]] as const).map(([key, amount]) => <label key={key}><span>¥ {amount.toLocaleString()}</span><input type="number" min="0" value={counts[key]} onChange={(event) => update(key, Number(event.target.value))} /><strong>¥ {(counts[key] * amount).toLocaleString()}</strong></label>)}</div></Card><Card><div className="section-heading"><h3>未完了確認</h3><StatusPill tone="warning">2件</StatusPill></div><ul className="check-list"><li><span>廃棄記録</span><StatusPill tone="normal">✓ 完了</StatusPill></li><li><span>冷蔵庫2番の引き継ぎ</span><StatusPill tone="warning">! 未解決</StatusPill></li><li><span>在庫確認</span><StatusPill tone="normal">✓ 完了</StatusPill></li><li><span>POS返品明細</span><StatusPill tone="neutral">• {t("provisional")}</StatusPill></li></ul><button className="primary-button full" disabled={actual !== expected}>{t("confirmClose")}</button></Card></div></div>;
}

function SettingsPage({ colorAssist, setColorAssist }: { colorAssist: boolean; setColorAssist: (value: boolean) => void }) {
  const { t, i18n } = useTranslation();
  return <div className="page-stack narrow"><div className="page-title"><div><p className="eyebrow">Preferences</p><h2>{t("settings")}</h2><p>設定は個人アカウントに保存されます。</p></div></div><Card><div className="settings-list"><label><div><strong>{t("language")}</strong><span>重要な日本語は翻訳後も併記します。</span></div><select value={i18n.language} onChange={(event) => { void i18n.changeLanguage(event.target.value); localStorage.setItem("locale", event.target.value); }}><option value="ja">日本語</option><option value="zh">简体中文</option><option value="en">English</option></select></label><label><div><strong>{t("colorAssist")}</strong><span>色に加えて記号とパターンを強調します。</span></div><button role="switch" aria-checked={colorAssist} className={`switch ${colorAssist ? "on" : ""}`} onClick={() => setColorAssist(!colorAssist)}><span /></button></label><label><div><strong>{t("readReceipts")}</strong><span>既読は正式な確認の代わりになりません。</span></div><select defaultValue="important"><option value="off">表示しない</option><option value="important">重要連絡のみ</option><option value="all">すべて</option></select></label></div></Card><Card><div className="section-heading"><div><h3>労務Rule Set</h3><p className="muted">Japan demo 2026.1</p></div><StatusPill tone="neutral">管理者設定</StatusPill></div><p>法令値はコードへ固定せず、適用期間と根拠を持つ設定として管理します。本機能は法的助言ではありません。</p></Card></div>;
}

function StaffHome() {
  const { t } = useTranslation();
  return <div className="page-stack"><div className="welcome-row"><div><p className="eyebrow">次の勤務 · 17:00</p><h2>こんにちは、王さん</h2><p>勤務前に1件の確認があります。</p></div><StatusPill tone="warning">! {t("beforeShift")}</StatusPill></div><div className="two-column"><Card className="next-shift"><Clock3 size={28} /><div><span>本日の勤務</span><strong>17:00–22:00</strong><p>ホール · レジ / 配膳</p></div></Card><Card><div className="section-heading"><h3>今週の工時</h3><StatusPill tone="warning">! 89%</StatusPill></div><div className="big-hours"><strong>25h</strong><span>/ 28h</span></div><p className="muted">他の勤務先を含む申告値</p></Card></div><Card><div className="section-heading"><h3><BookOpen size={19} />勤務前の確認</h3><StatusPill tone="warning">1件</StatusPill></div><div className="learning-row"><div><strong>レジ締めの基本</strong><span>目安 4分 · 安全項目</span></div><button className="primary-button">学習する</button></div></Card></div>;
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

