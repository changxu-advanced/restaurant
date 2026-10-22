import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle, Archive, BadgeInfo, BookOpen, Boxes, CalendarDays, Check, ChevronRight,
  CircleDollarSign, Clock3, Languages, LayoutDashboard, MessageCircle, PackageCheck,
  Settings, Sparkles, Store, Users, UtensilsCrossed, Eye
} from "lucide-react";
import { employees, initialInventory, shifts } from "./demoData";
import type { InventoryItem, NavKey, StockState } from "./types";

const navItems: Array<{ key: NavKey; icon: typeof LayoutDashboard; managerOnly?: boolean }> = [
  { key: "today", icon: LayoutDashboard },
  { key: "schedule", icon: CalendarDays },
  { key: "inventory", icon: Boxes },
  { key: "chat", icon: MessageCircle },
  { key: "employees", icon: Users, managerOnly: true },
  { key: "closeout", icon: CircleDollarSign, managerOnly: true },
  { key: "settings", icon: Settings }
];

const availabilityDays = ["10/26 月", "10/27 火", "10/28 水", "10/29 木", "10/30 金", "10/31 土", "11/1 日"];
const stockOptions: StockState[] = ["enough", "low", "urgent", "out"];
const availabilityBlocks = [
  { id: "prep", time: "08:00–09:00", label: "準備", tone: "prep" },
  { id: "morning", time: "09:00–12:00", label: "午前", tone: "normal" },
  { id: "lunch", time: "12:00–15:00", label: "ランチ", tone: "normal" },
  { id: "afternoon", time: "15:00–18:00", label: "午後", tone: "normal" },
  { id: "dinner", time: "18:00–21:00", label: "ディナー", tone: "normal" },
  { id: "close", time: "21:00–23:00", label: "閉店", tone: "normal" },
  { id: "late", time: "23:00–01:00", label: "深夜", tone: "late" }
] as const;

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
        <div className="sidebar-note" title="実在する店舗・従業員の情報は使用していません。"><BadgeInfo size={17} /><span><strong>デモ環境</strong><br />架空データのみ · v0.1.0</span></div>
      </aside>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {visible.slice(0, 5).map(({ key, icon: Icon }) => (
          <button key={key} className={active === key ? "active" : ""} onClick={() => onChange(key)}>
            <Icon size={21} /><span>{t(key)}</span>
          </button>
        ))}
      </nav>
    </>
  );
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
  const [availability, setAvailability] = useState<Record<string, string[]>>(() => Object.fromEntries(availabilityDays.map((day, index) => [day, index === 2 ? [] : index === 5 ? ["lunch", "afternoon", "dinner", "close", "late"] : index === 6 ? ["morning", "lunch"] : ["prep", "morning", "lunch", "afternoon", "dinner"]])));
  const [mobileDay, setMobileDay] = useState(availabilityDays[0]);
  const [status, setStatus] = useState<"idle" | "running" | "ready">("idle");
  const generate = () => { setStatus("running"); window.setTimeout(() => setStatus("ready"), 900); };
  const toggleBlock = (day: string, blockId: string) => setAvailability((current) => ({
    ...current,
    [day]: current[day].includes(blockId) ? current[day].filter((id) => id !== blockId) : [...current[day], blockId]
  }));
  const applyWeekdays = () => setAvailability((current) => ({
    ...current,
    ...Object.fromEntries(availabilityDays.slice(0, 5).map((day) => [day, ["prep", "morning", "lunch", "afternoon", "dinner"]]))
  }));
  const copyPreviousDay = () => setAvailability((current) => Object.fromEntries(availabilityDays.map((day, index) => [day, index === 0 ? current[day] : [...current[availabilityDays[index - 1]]]])));
  const applyPreset = (blockIds: string[]) => setAvailability((current) => ({ ...current, [mobileDay]: blockIds }));
  return (
    <div className="page-stack"><div className="page-title"><div><p className="eyebrow">2026.10.26–11.08</p><h2>{t("schedule")}</h2><p>希望、技能、工時上限をまとめて確認します。</p></div><button className="primary-button" onClick={generate} disabled={status === "running"}><Sparkles size={18} />{status === "running" ? "最適化中…" : t("generate")}</button></div>
      <div className="two-column">
        <Card className="availability-card">
          <div className="section-heading"><div><h3>{t("availability")}</h3><p className="muted">店舗設定済みの時間帯をタップして選択</p></div><div className="button-row desktop-actions"><button className="text-button" onClick={copyPreviousDay}>前日をコピー</button><button className="text-button" onClick={applyWeekdays}>平日を一括設定</button></div></div>
          <div className="time-legend" aria-label="時間帯の区分"><span className="prep">準備時間</span><span className="normal">通常営業</span><span className="late">深夜時間</span><small>選択中は濃く表示</small></div>
          <div className="availability-grid desktop-availability">{availabilityDays.map((day) => <div className="availability-row" key={day}><strong>{day}</strong><div className="time-scroll"><div className="time-blocks">{availabilityBlocks.map((block) => { const selected = availability[day].includes(block.id); return <button key={block.id} type="button" aria-pressed={selected} className={`time-block ${block.tone} ${selected ? "selected" : ""}`} onClick={() => toggleBlock(day, block.id)}><span>{selected ? "✓" : "○"} {block.label}</span><time>{block.time}</time></button>; })}</div></div></div>)}</div>
          <div className="mobile-availability">
            <div className="mobile-day-tabs" role="tablist" aria-label="希望日を選択">{availabilityDays.map((day) => <button key={day} role="tab" aria-selected={mobileDay === day} className={mobileDay === day ? "active" : ""} onClick={() => setMobileDay(day)}><strong>{day.split(" ")[0]}</strong><span>{day.split(" ")[1]}</span><small>{availability[day].length}</small></button>)}</div>
            <div className="mobile-day-heading"><div><strong>{mobileDay}</strong><span>{availability[mobileDay].length} / {availabilityBlocks.length} 時間帯を選択</span></div><button className="text-button" onClick={applyWeekdays}>平日に反映</button></div>
            <div className="mobile-presets"><button onClick={() => applyPreset(["prep", "morning", "lunch", "afternoon", "dinner", "close", "late"])}>全時間</button><button onClick={() => applyPreset(["prep", "morning", "lunch", "afternoon", "dinner"])}>日中</button><button onClick={() => applyPreset(["dinner", "close", "late"])}>夜</button><button onClick={() => applyPreset([])}>クリア</button></div>
            <div className="mobile-time-blocks">{availabilityBlocks.map((block) => { const selected = availability[mobileDay].includes(block.id); return <button key={block.id} type="button" aria-pressed={selected} className={`time-block ${block.tone} ${selected ? "selected" : ""}`} onClick={() => toggleBlock(mobileDay, block.id)}><span>{selected ? "✓" : "○"} {block.label}</span><time>{block.time}</time></button>; })}</div>
          </div>
          <div className="card-footer"><span className="muted">店舗固定 7時間帯 · 自動保存</span><StatusPill tone="normal">✓ 提出済み</StatusPill></div>
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
  const validRoutes = useMemo(() => new Set<NavKey>(navItems.map((item) => item.key)), []);
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
    return <SettingsPage colorAssist={colorAssist} setColorAssist={(value) => { setColorAssist(value); localStorage.setItem("colorAssist", String(value)); }} />;
  }, [active, colorAssist, role]);
  return <div className={`app-shell ${colorAssist ? "color-assist" : ""}`} onCopy={(event) => event.preventDefault()} onCut={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()}><Navigation active={active} onChange={navigate} role={role} /><main><Header role={role} colorAssist={colorAssist} setRole={(next) => { setRole(next); if (next === "staff" && ["employees", "closeout"].includes(active)) navigate("today"); }} /><div className="content">{page}</div></main></div>;
}

