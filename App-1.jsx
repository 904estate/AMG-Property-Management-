import { useState, useEffect, useRef } from "react";

// ── Supabase Config ─────────────────────────────────────────────────────────
const SUPA_URL = "https://fmfajlwlfakfrxxfstxr.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtZmFqbHdsZmFrZnJ4eGZzdHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NjMzOTYsImV4cCI6MjA5NjUzOTM5Nn0.EwYSh2CMreE2o-sbKHuTupmt0X4cvvwNerEczEszzxA";

const db = {
  async get(table, query = "") {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}?${query}&order=created_at.asc`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    });
    return res.json();
  },
  async insert(table, data) {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async update(table, id, data) {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async remove(table, id) {
    await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    });
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmt$ = (n) => "$" + Number(n || 0).toLocaleString();
const TODAY = new Date();
const daysUntil = (d) => Math.ceil((new Date(d) - TODAY) / 86400000);
const leaseStatus = (d) => {
  if (!d) return { label: "No date", color: "#888", bg: "#88888822" };
  const days = daysUntil(d);
  if (days < 0)    return { label: "Expired",       color: "#f87171", bg: "#ef444422" };
  if (days <= 30)  return { label: `${days}d left`,  color: "#f87171", bg: "#ef444422" };
  if (days <= 90)  return { label: `${days}d left`,  color: "#fbbf24", bg: "#f59e0b22" };
  return               { label: `${days}d left`,     color: "#34d399", bg: "#10b98122" };
};

async function askClaude(messages, sys) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system: sys, messages }),
  });
  const d = await r.json();
  return d.content?.map((b) => b.text || "").join("") || "Sorry, could not get a response.";
}

// ── Styles ───────────────────────────────────────────────────────────────────
const C = {
  bg:       "#0f1117",
  surface:  "#1a1d27",
  surface2: "#22263a",
  accent:   "#7c6ff7",
  accent2:  "#5b53d4",
  text:     "#e8e9f0",
  muted:    "#8b8fa8",
  border:   "#2e3248",
  success:  "#34d399",
  warning:  "#fbbf24",
  danger:   "#f87171",
  info:     "#60a5fa",
};

const S = {
  app:      { display: "flex", height: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", fontSize: 13 },
  sidebar:  { width: 210, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 },
  logo:     { padding: "20px 16px 14px", borderBottom: `1px solid ${C.border}` },
  logoT:    { fontSize: 16, fontWeight: 700, color: C.text, letterSpacing: "-0.3px" },
  logoS:    { fontSize: 11, color: C.muted, marginTop: 2 },
  dbBadge:  { margin: "8px 10px", background: "#10b98120", border: "1px solid #34d39944", borderRadius: 6, padding: "4px 8px", fontSize: 11, color: C.success, display: "flex", alignItems: "center", gap: 5 },
  nav:      { flex: 1, padding: "8px 0", overflowY: "auto" },
  navItem:  { display: "flex", alignItems: "center", gap: 9, padding: "9px 16px", cursor: "pointer", fontSize: 12, color: C.muted, borderLeft: "2px solid transparent", transition: "all 0.15s" },
  navActive:{ display: "flex", alignItems: "center", gap: 9, padding: "9px 16px", cursor: "pointer", fontSize: 12, color: C.text, borderLeft: `2px solid ${C.accent}`, background: C.surface2, fontWeight: 600 },
  main:     { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  topbar:   { padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface },
  topT:     { fontSize: 16, fontWeight: 700 },
  content:  { flex: 1, overflowY: "auto", padding: "20px" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 },
  statCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" },
  statLbl:  { fontSize: 11, color: C.muted, marginBottom: 4 },
  statVal:  { fontSize: 22, fontWeight: 700 },
  statSub:  { fontSize: 11, color: C.muted, marginTop: 3 },
  secTitle: { fontSize: 13, fontWeight: 700, marginBottom: 12, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" },
  card:     { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 16 },
  tHead:    { display: "grid", padding: "10px 14px", background: C.surface2, fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" },
  tRow:     { display: "grid", gap: 10, padding: "10px 14px", borderTop: `1px solid ${C.border}`, alignItems: "center" },
  propGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 },
  propCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px" },
  btn:      { background: C.accent, color: "#fff", border: "none", borderRadius: 7, padding: "8px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 },
  btnSm:    { background: C.surface2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer" },
  btnDanger:{ background: "#f8717122", color: C.danger, border: `1px solid ${C.danger}44`, borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer" },
  inp:      { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 12px", color: C.text, fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box" },
  fGrid:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 },
  fLabel:   { fontSize: 11, color: C.muted, marginBottom: 4 },
  formCard: { background: C.surface, border: `1px solid ${C.accent}55`, borderRadius: 10, padding: "16px 18px", marginBottom: 16 },
  alert:    { padding: "10px 14px", borderRadius: 8, fontSize: 12, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 },
  aiBox:    { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, display: "flex", flexDirection: "column", height: 420 },
  aiMsgs:   { flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 },
  msgAI:    { background: C.surface2, borderRadius: 8, padding: "10px 12px", fontSize: 12, maxWidth: "82%", lineHeight: 1.6 },
  msgUser:  { background: C.accent, color: "#fff", borderRadius: 8, padding: "10px 12px", fontSize: 12, maxWidth: "72%", alignSelf: "flex-end", lineHeight: 1.6 },
  aiInp:    { display: "flex", gap: 8, padding: "12px 14px", borderTop: `1px solid ${C.border}` },
};

const badge = (label, color, bg) => (
  <span style={{ background: bg || color + "22", color, border: `1px solid ${color}44`, borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 600 }}>
    {label}
  </span>
);

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]             = useState("dashboard");
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants]     = useState([]);
  const [maintenance, setMaint]   = useState([]);
  const [payments, setPayments]   = useState([]);
  const [documents, setDocs]      = useState([]);
  const [vendors, setVendors]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [dbOk, setDbOk]           = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [p, t, m, pay, d, v] = await Promise.all([
        db.get("properties"),
        db.get("tenants"),
        db.get("maintenance"),
        db.get("payments"),
        db.get("documents"),
        db.get("vendors"),
      ]);
      setProperties(Array.isArray(p) ? p : []);
      setTenants(Array.isArray(t) ? t : []);
      setMaint(Array.isArray(m) ? m : []);
      setPayments(Array.isArray(pay) ? pay : []);
      setDocs(Array.isArray(d) ? d : []);
      setVendors(Array.isArray(v) ? v : []);
      setDbOk(true);
    } catch {
      setDbOk(false);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalRevenue = tenants.reduce((s, t) => s + (t.rent || 0), 0);
  const paidRent     = tenants.filter(t => t.paid).reduce((s, t) => s + (t.rent || 0), 0);
  const openMaint    = maintenance.filter(m => m.status !== "Done").length;
  const expiringSoon = tenants.filter(t => t.lease_end && daysUntil(t.lease_end) <= 60 && daysUntil(t.lease_end) >= 0).length;

  const navItems = [
    { id: "dashboard",   icon: "⬡", label: "Dashboard" },
    { id: "properties",  icon: "🏢", label: "Properties" },
    { id: "tenants",     icon: "👤", label: "Tenants" },
    { id: "maintenance", icon: "🔧", label: "Maintenance" },
    { id: "payments",    icon: "💳", label: "Payments" },
    { id: "documents",   icon: "📄", label: "Documents" },
    { id: "vendors",     icon: "🛠", label: "Vendors" },
    { id: "leases",      icon: "📅", label: "Lease Tracker" },
    { id: "ai",          icon: "✦",  label: "AI Assistant" },
    { id: "reports",     icon: "📊", label: "Reports" },
  ];

  return (
    <div style={S.app}>
      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={S.logo}>
          <div style={S.logoT}>AMG Property</div>
          <div style={S.logoS}>Management Platform</div>
        </div>
        <div style={S.dbBadge}>
          <span style={{ fontSize: 8 }}>●</span>
          {dbOk ? "Database Live" : "Connecting..."}
        </div>
        <nav style={S.nav}>
          {navItems.map(n => (
            <div
              key={n.id}
              style={tab === n.id ? S.navActive : S.navItem}
              onClick={() => setTab(n.id)}
              onMouseEnter={e => { if (tab !== n.id) e.currentTarget.style.color = C.text; }}
              onMouseLeave={e => { if (tab !== n.id) e.currentTarget.style.color = C.muted; }}
            >
              <span style={{ fontSize: 14 }}>{n.icon}</span>
              {n.label}
            </div>
          ))}
        </nav>
      </div>

      {/* Main */}
      <div style={S.main}>
        <div style={S.topbar}>
          <div style={S.topT}>{navItems.find(n => n.id === tab)?.label}</div>
          <button style={S.btn} onClick={load}>↻ Refresh</button>
        </div>
        <div style={S.content}>
          {loading ? (
            <div style={{ textAlign: "center", color: C.muted, padding: 60 }}>Loading from database...</div>
          ) : (
            <>
              {tab === "dashboard"   && <Dashboard properties={properties} tenants={tenants} maintenance={maintenance} payments={payments} totalRevenue={totalRevenue} paidRent={paidRent} openMaint={openMaint} expiringSoon={expiringSoon} />}
              {tab === "properties"  && <Properties properties={properties} reload={load} />}
              {tab === "tenants"     && <Tenants tenants={tenants} properties={properties} reload={load} />}
              {tab === "maintenance" && <Maintenance maintenance={maintenance} properties={properties} vendors={vendors} reload={load} />}
              {tab === "payments"    && <Payments payments={payments} tenants={tenants} reload={load} />}
              {tab === "documents"   && <Documents documents={documents} tenants={tenants} reload={load} />}
              {tab === "vendors"     && <Vendors vendors={vendors} reload={load} />}
              {tab === "leases"      && <Leases tenants={tenants} />}
              {tab === "ai"          && <AIAssistant tenants={tenants} properties={properties} maintenance={maintenance} payments={payments} />}
              {tab === "reports"     && <Reports tenants={tenants} properties={properties} payments={payments} maintenance={maintenance} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ tenants, properties, maintenance, payments, totalRevenue, paidRent, openMaint, expiringSoon }) {
  return (
    <>
      <div style={S.statGrid}>
        <div style={S.statCard}><div style={S.statLbl}>Properties</div><div style={S.statVal}>{properties.length}</div></div>
        <div style={S.statCard}><div style={S.statLbl}>Tenants</div><div style={S.statVal}>{tenants.length}</div></div>
        <div style={S.statCard}><div style={S.statLbl}>Monthly Revenue</div><div style={S.statVal}>{fmt$(totalRevenue)}</div><div style={S.statSub}>{fmt$(paidRent)} collected</div></div>
        <div style={S.statCard}><div style={S.statLbl}>Open Maintenance</div><div style={S.statVal}>{openMaint}</div></div>
      </div>
      {expiringSoon > 0 && (
        <div style={{ ...S.alert, background: "#f59e0b18", border: "1px solid #fbbf2444", color: C.warning }}>
          ⚠ {expiringSoon} lease{expiringSoon > 1 ? "s" : ""} expiring within 60 days
        </div>
      )}
      <div style={S.secTitle}>Recent Payments</div>
      <div style={S.card}>
        <div style={{ ...S.tHead, gridTemplateColumns: "2fr 1.5fr 1fr 1fr" }}>
          <span>Tenant</span><span>Property</span><span>Amount</span><span>Date</span>
        </div>
        {payments.slice(-5).reverse().map(p => (
          <div key={p.id} style={{ ...S.tRow, gridTemplateColumns: "2fr 1.5fr 1fr 1fr" }}>
            <span>{p.tenant_name}</span>
            <span style={{ color: C.muted }}>{p.property_name}</span>
            <span style={{ color: C.success }}>{fmt$(p.amount)}</span>
            <span style={{ color: C.muted }}>{p.date}</span>
          </div>
        ))}
        {payments.length === 0 && <div style={{ padding: "14px 16px", color: C.muted }}>No payments yet. Add tenants and record payments.</div>}
      </div>
      <div style={S.secTitle}>Recent Maintenance</div>
      <div style={S.card}>
        <div style={{ ...S.tHead, gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
          <span>Issue</span><span>Unit</span><span>Priority</span><span>Status</span>
        </div>
        {maintenance.slice(-5).reverse().map(m => (
          <div key={m.id} style={{ ...S.tRow, gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
            <span>{m.issue}</span>
            <span style={{ color: C.muted }}>{m.unit}</span>
            {badge(m.priority, m.priority === "Urgent" ? C.danger : m.priority === "Medium" ? C.warning : C.success)}
            {badge(m.status, m.status === "Done" ? C.success : m.status === "In Progress" ? C.info : C.warning)}
          </div>
        ))}
        {maintenance.length === 0 && <div style={{ padding: "14px 16px", color: C.muted }}>No maintenance requests yet.</div>}
      </div>
    </>
  );
}

// ── Properties ───────────────────────────────────────────────────────────────
function Properties({ properties, reload }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", units: 1, image: "🏠" });
  const icons = ["🏠","🏢","🏡","🏘","🏗","🏬"];

  const add = async () => {
    if (!form.name || !form.address) return;
    await db.insert("properties", form);
    setForm({ name: "", address: "", units: 1, image: "🏠" });
    setShow(false);
    reload();
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ color: C.muted, fontSize: 12 }}>{properties.length} properties</span>
        <button style={S.btn} onClick={() => setShow(!show)}>+ Add Property</button>
      </div>
      {show && (
        <div style={S.formCard}>
          <div style={S.fGrid}>
            <div><div style={S.fLabel}>Property name</div><input style={S.inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Maple Arms" /></div>
            <div><div style={S.fLabel}>Address</div><input style={S.inp} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 Main St, Brooklyn NY" /></div>
            <div><div style={S.fLabel}>Units</div><input style={S.inp} type="number" value={form.units} onChange={e => setForm({ ...form, units: parseInt(e.target.value) || 1 })} /></div>
            <div><div style={S.fLabel}>Icon</div>
              <div style={{ display: "flex", gap: 6 }}>
                {icons.map(ic => (
                  <span key={ic} onClick={() => setForm({ ...form, image: ic })} style={{ fontSize: 20, cursor: "pointer", padding: 4, borderRadius: 6, background: form.image === ic ? C.accent + "44" : "transparent" }}>{ic}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={S.btn} onClick={add}>Save Property</button>
            <button style={S.btnSm} onClick={() => setShow(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={S.propGrid}>
        {properties.map(p => (
          <div key={p.id} style={S.propCard}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>{p.image || "🏠"}</div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 8 }}>{p.address}</div>
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 10 }}>{p.units} unit{p.units !== 1 ? "s" : ""}</div>
            <button style={S.btnDanger} onClick={async () => { await db.remove("properties", p.id); reload(); }}>Remove</button>
          </div>
        ))}
        {properties.length === 0 && <div style={{ color: C.muted, gridColumn: "1/-1" }}>No properties yet. Add your first one above.</div>}
      </div>
    </>
  );
}

// ── Tenants ──────────────────────────────────────────────────────────────────
function Tenants({ tenants, properties, reload }) {
  const [show, setShow]   = useState(false);
  const [form, setForm]   = useState({ name: "", email: "", phone: "", unit: "", rent: "", deposit: "", lease_end: "", property_id: "", paid: false, screening_score: "N/A" });

  const add = async () => {
    if (!form.name || !form.unit || !form.rent) return;
    await db.insert("tenants", { ...form, rent: parseInt(form.rent), deposit: parseInt(form.deposit) || 0 });
    setForm({ name: "", email: "", phone: "", unit: "", rent: "", deposit: "", lease_end: "", property_id: "", paid: false, screening_score: "N/A" });
    setShow(false);
    reload();
  };

  const togglePaid = async (t) => {
    await db.update("tenants", t.id, { paid: !t.paid });
    reload();
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ color: C.muted, fontSize: 12 }}>{tenants.length} tenants</span>
        <button style={S.btn} onClick={() => setShow(!show)}>+ Add Tenant</button>
      </div>
      {show && (
        <div style={S.formCard}>
          <div style={S.fGrid}>
            <div><div style={S.fLabel}>Full name</div><input style={S.inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="James Carter" /></div>
            <div><div style={S.fLabel}>Email</div><input style={S.inp} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="james@email.com" /></div>
            <div><div style={S.fLabel}>Phone</div><input style={S.inp} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="555-1234" /></div>
            <div><div style={S.fLabel}>Unit</div><input style={S.inp} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="2B" /></div>
            <div><div style={S.fLabel}>Monthly Rent ($)</div><input style={S.inp} type="number" value={form.rent} onChange={e => setForm({ ...form, rent: e.target.value })} placeholder="1400" /></div>
            <div><div style={S.fLabel}>Deposit ($)</div><input style={S.inp} type="number" value={form.deposit} onChange={e => setForm({ ...form, deposit: e.target.value })} placeholder="2800" /></div>
            <div><div style={S.fLabel}>Lease End Date</div><input style={S.inp} type="date" value={form.lease_end} onChange={e => setForm({ ...form, lease_end: e.target.value })} /></div>
            <div><div style={S.fLabel}>Property</div>
              <select style={S.inp} value={form.property_id} onChange={e => setForm({ ...form, property_id: e.target.value })}>
                <option value="">Select property</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={S.btn} onClick={add}>Save Tenant</button>
            <button style={S.btnSm} onClick={() => setShow(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={S.card}>
        <div style={{ ...S.tHead, gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px" }}>
          <span>Name</span><span>Unit</span><span>Rent</span><span>Lease End</span><span>Status</span><span></span>
        </div>
        {tenants.map(t => {
          const prop = properties.find(p => p.id === t.property_id);
          const ls = leaseStatus(t.lease_end);
          return (
            <div key={t.id} style={{ ...S.tRow, gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{t.name}</div>
                <div style={{ color: C.muted, fontSize: 11 }}>{prop?.name || "—"}</div>
              </div>
              <span>{t.unit}</span>
              <span style={{ color: C.success }}>{fmt$(t.rent)}</span>
              <span>{t.lease_end ? badge(ls.label, ls.color, ls.bg) : "—"}</span>
              <span onClick={() => togglePaid(t)} style={{ cursor: "pointer" }}>{badge(t.paid ? "Paid" : "Due", t.paid ? C.success : C.warning)}</span>
              <button style={S.btnDanger} onClick={async () => { await db.remove("tenants", t.id); reload(); }}>Remove</button>
            </div>
          );
        })}
        {tenants.length === 0 && <div style={{ padding: "14px 16px", color: C.muted }}>No tenants yet. Add your first tenant above.</div>}
      </div>
    </>
  );
}

// ── Maintenance ──────────────────────────────────────────────────────────────
function Maintenance({ maintenance, properties, vendors, reload }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ issue: "", unit: "", priority: "Medium", status: "Open", tenant_name: "", vendor: "", cost: "", property_id: "" });

  const add = async () => {
    if (!form.issue) return;
    await db.insert("maintenance", { ...form, date: new Date().toISOString().split("T")[0] });
    setForm({ issue: "", unit: "", priority: "Medium", status: "Open", tenant_name: "", vendor: "", cost: "", property_id: "" });
    setShow(false);
    reload();
  };

  const updateStatus = async (m, status) => {
    await db.update("maintenance", m.id, { status });
    reload();
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ color: C.muted, fontSize: 12 }}>{maintenance.filter(m => m.status !== "Done").length} open requests</span>
        <button style={S.btn} onClick={() => setShow(!show)}>+ New Request</button>
      </div>
      {show && (
        <div style={S.formCard}>
          <div style={S.fGrid}>
            <div><div style={S.fLabel}>Issue description</div><input style={S.inp} value={form.issue} onChange={e => setForm({ ...form, issue: e.target.value })} placeholder="AC not cooling in unit 4A" /></div>
            <div><div style={S.fLabel}>Unit</div><input style={S.inp} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="4A" /></div>
            <div><div style={S.fLabel}>Tenant name</div><input style={S.inp} value={form.tenant_name} onChange={e => setForm({ ...form, tenant_name: e.target.value })} placeholder="James Carter" /></div>
            <div><div style={S.fLabel}>Priority</div>
              <select style={S.inp} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                <option>Low</option><option>Medium</option><option>Urgent</option>
              </select>
            </div>
            <div><div style={S.fLabel}>Assign vendor</div>
              <select style={S.inp} value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })}>
                <option value="">Unassigned</option>
                {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
              </select>
            </div>
            <div><div style={S.fLabel}>Est. cost</div><input style={S.inp} value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="$200" /></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={S.btn} onClick={add}>Save Request</button>
            <button style={S.btnSm} onClick={() => setShow(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={S.card}>
        <div style={{ ...S.tHead, gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 100px" }}>
          <span>Issue</span><span>Unit</span><span>Vendor</span><span>Priority</span><span>Status</span><span></span>
        </div>
        {maintenance.map(m => (
          <div key={m.id} style={{ ...S.tRow, gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 100px" }}>
            <span>{m.issue}</span>
            <span style={{ color: C.muted }}>{m.unit}</span>
            <span style={{ color: C.muted, fontSize: 11 }}>{m.vendor || "—"}</span>
            {badge(m.priority, m.priority === "Urgent" ? C.danger : m.priority === "Medium" ? C.warning : C.success)}
            {badge(m.status, m.status === "Done" ? C.success : m.status === "In Progress" ? C.info : C.warning)}
            <div style={{ display: "flex", gap: 4 }}>
              {m.status !== "Done" && <button style={S.btnSm} onClick={() => updateStatus(m, "Done")}>✓ Done</button>}
              <button style={S.btnDanger} onClick={async () => { await db.remove("maintenance", m.id); reload(); }}>✕</button>
            </div>
          </div>
        ))}
        {maintenance.length === 0 && <div style={{ padding: "14px 16px", color: C.muted }}>No maintenance requests yet.</div>}
      </div>
    </>
  );
}

// ── Payments ─────────────────────────────────────────────────────────────────
function Payments({ payments, tenants, reload }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ tenant_name: "", property_name: "", unit: "", amount: "", method: "card" });

  const add = async () => {
    if (!form.amount) return;
    const ref = "PAY-" + Math.random().toString(36).substr(2, 8).toUpperCase();
    await db.insert("payments", { ...form, amount: parseInt(form.amount), ref, date: new Date().toISOString().split("T")[0] });
    setForm({ tenant_name: "", property_name: "", unit: "", amount: "", method: "card" });
    setShow(false);
    reload();
  };

  const fillFromTenant = (tid) => {
    const t = tenants.find(x => x.id === tid);
    if (t) setForm(f => ({ ...f, tenant_name: t.name, unit: t.unit, amount: t.rent }));
  };

  const total = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ color: C.muted, fontSize: 12 }}>Total collected: <strong style={{ color: C.success }}>{fmt$(total)}</strong></span>
        <button style={S.btn} onClick={() => setShow(!show)}>+ Record Payment</button>
      </div>
      {show && (
        <div style={S.formCard}>
          <div style={{ marginBottom: 10 }}>
            <div style={S.fLabel}>Quick fill from tenant</div>
            <select style={S.inp} onChange={e => fillFromTenant(e.target.value)}>
              <option value="">Select tenant to pre-fill...</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name} — {t.unit}</option>)}
            </select>
          </div>
          <div style={S.fGrid}>
            <div><div style={S.fLabel}>Tenant name</div><input style={S.inp} value={form.tenant_name} onChange={e => setForm({ ...form, tenant_name: e.target.value })} /></div>
            <div><div style={S.fLabel}>Property</div><input style={S.inp} value={form.property_name} onChange={e => setForm({ ...form, property_name: e.target.value })} /></div>
            <div><div style={S.fLabel}>Unit</div><input style={S.inp} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></div>
            <div><div style={S.fLabel}>Amount ($)</div><input style={S.inp} type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
            <div><div style={S.fLabel}>Method</div>
              <select style={S.inp} value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                <option value="card">Card</option><option value="bank">Bank Transfer</option><option value="cash">Cash</option><option value="check">Check</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={S.btn} onClick={add}>Record Payment</button>
            <button style={S.btnSm} onClick={() => setShow(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={S.card}>
        <div style={{ ...S.tHead, gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 60px" }}>
          <span>Tenant</span><span>Property / Unit</span><span>Amount</span><span>Method</span><span>Date</span><span></span>
        </div>
        {[...payments].reverse().map(p => (
          <div key={p.id} style={{ ...S.tRow, gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 60px" }}>
            <span>{p.tenant_name}</span>
            <span style={{ color: C.muted }}>{p.property_name} {p.unit}</span>
            <span style={{ color: C.success }}>{fmt$(p.amount)}</span>
            {badge(p.method, C.info)}
            <span style={{ color: C.muted }}>{p.date}</span>
            <button style={S.btnDanger} onClick={async () => { await db.remove("payments", p.id); reload(); }}>✕</button>
          </div>
        ))}
        {payments.length === 0 && <div style={{ padding: "14px 16px", color: C.muted }}>No payments recorded yet.</div>}
      </div>
    </>
  );
}

// ── Documents ────────────────────────────────────────────────────────────────
function Documents({ documents, tenants, reload }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Lease", signed: false, tenant_id: "" });

  const add = async () => {
    if (!form.name) return;
    await db.insert("documents", { ...form, date: new Date().toISOString().split("T")[0] });
    setForm({ name: "", type: "Lease", signed: false, tenant_id: "" });
    setShow(false);
    reload();
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ color: C.muted, fontSize: 12 }}>{documents.length} documents</span>
        <button style={S.btn} onClick={() => setShow(!show)}>+ Add Document</button>
      </div>
      {show && (
        <div style={S.formCard}>
          <div style={S.fGrid}>
            <div><div style={S.fLabel}>Document name</div><input style={S.inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Lease Agreement 2026" /></div>
            <div><div style={S.fLabel}>Type</div>
              <select style={S.inp} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option>Lease</option><option>Addendum</option><option>Inspection</option><option>Notice</option><option>Other</option>
              </select>
            </div>
            <div><div style={S.fLabel}>Tenant</div>
              <select style={S.inp} value={form.tenant_id} onChange={e => setForm({ ...form, tenant_id: e.target.value })}>
                <option value="">None</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 18 }}>
              <input type="checkbox" checked={form.signed} onChange={e => setForm({ ...form, signed: e.target.checked })} id="signed" />
              <label htmlFor="signed" style={{ color: C.muted, fontSize: 12 }}>Already signed</label>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={S.btn} onClick={add}>Save Document</button>
            <button style={S.btnSm} onClick={() => setShow(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={S.card}>
        <div style={{ ...S.tHead, gridTemplateColumns: "2fr 1fr 1.5fr 1fr 60px" }}>
          <span>Document</span><span>Type</span><span>Tenant</span><span>Signed</span><span></span>
        </div>
        {documents.map(d => {
          const t = tenants.find(x => x.id === d.tenant_id);
          return (
            <div key={d.id} style={{ ...S.tRow, gridTemplateColumns: "2fr 1fr 1.5fr 1fr 60px" }}>
              <span>📄 {d.name}</span>
              {badge(d.type, C.info)}
              <span style={{ color: C.muted }}>{t?.name || "—"}</span>
              {badge(d.signed ? "Signed" : "Pending", d.signed ? C.success : C.warning)}
              <button style={S.btnDanger} onClick={async () => { await db.remove("documents", d.id); reload(); }}>✕</button>
            </div>
          );
        })}
        {documents.length === 0 && <div style={{ padding: "14px 16px", color: C.muted }}>No documents yet.</div>}
      </div>
    </>
  );
}

// ── Vendors ──────────────────────────────────────────────────────────────────
function Vendors({ vendors, reload }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", specialty: "", phone: "", rate: "", rating: 5.0 });

  const add = async () => {
    if (!form.name) return;
    await db.insert("vendors", form);
    setForm({ name: "", specialty: "", phone: "", rate: "", rating: 5.0 });
    setShow(false);
    reload();
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ color: C.muted, fontSize: 12 }}>{vendors.length} vendors</span>
        <button style={S.btn} onClick={() => setShow(!show)}>+ Add Vendor</button>
      </div>
      {show && (
        <div style={S.formCard}>
          <div style={S.fGrid}>
            <div><div style={S.fLabel}>Company name</div><input style={S.inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="CoolAir HVAC" /></div>
            <div><div style={S.fLabel}>Specialty</div><input style={S.inp} value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} placeholder="HVAC" /></div>
            <div><div style={S.fLabel}>Phone</div><input style={S.inp} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="555-2001" /></div>
            <div><div style={S.fLabel}>Rate</div><input style={S.inp} value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} placeholder="$95/hr" /></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={S.btn} onClick={add}>Save Vendor</button>
            <button style={S.btnSm} onClick={() => setShow(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
        {vendors.map(v => (
          <div key={v.id} style={{ ...S.propCard, position: "relative" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{v.name}</div>
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>{v.specialty} · {v.phone}</div>
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 8 }}>{v.rate}</div>
            <div style={{ color: C.warning, fontSize: 12 }}>{"★".repeat(Math.round(v.rating))} <span style={{ color: C.muted }}>{v.rating}</span></div>
            <button style={{ ...S.btnDanger, marginTop: 10 }} onClick={async () => { await db.remove("vendors", v.id); reload(); }}>Remove</button>
          </div>
        ))}
        {vendors.length === 0 && <div style={{ color: C.muted }}>No vendors yet. Run the SQL schema to seed default vendors.</div>}
      </div>
    </>
  );
}

// ── Lease Tracker ────────────────────────────────────────────────────────────
function Leases({ tenants }) {
  const sorted = [...tenants].filter(t => t.lease_end).sort((a, b) => new Date(a.lease_end) - new Date(b.lease_end));
  const expiring = sorted.filter(t => daysUntil(t.lease_end) <= 60 && daysUntil(t.lease_end) >= 0);

  return (
    <>
      {expiring.length > 0 && (
        <div style={{ ...S.alert, background: "#f59e0b18", border: "1px solid #fbbf2444", color: C.warning }}>
          ⚠ {expiring.length} lease{expiring.length > 1 ? "s" : ""} expiring within 60 days — send renewal notices now
        </div>
      )}
      <div style={S.card}>
        <div style={{ ...S.tHead, gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
          <span>Tenant</span><span>Unit</span><span>Lease End</span><span>Time Left</span>
        </div>
        {sorted.map(t => {
          const ls = leaseStatus(t.lease_end);
          return (
            <div key={t.id} style={{ ...S.tRow, gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
              <span style={{ fontWeight: 600 }}>{t.name}</span>
              <span style={{ color: C.muted }}>{t.unit}</span>
              <span>{t.lease_end}</span>
              {badge(ls.label, ls.color, ls.bg)}
            </div>
          );
        })}
        {sorted.length === 0 && <div style={{ padding: "14px 16px", color: C.muted }}>No tenants with lease dates. Add lease end dates when creating tenants.</div>}
      </div>
    </>
  );
}

// ── AI Assistant ─────────────────────────────────────────────────────────────
function AIAssistant({ tenants, properties, maintenance, payments }) {
  const [msgs, setMsgs] = useState([{ role: "assistant", text: "Hi! I'm your AMG AI assistant. I have full access to your live property data. Ask me anything — draft a rent notice, summarize overdue payments, analyze your portfolio, or anything else." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const sys = `You are the AI assistant for AMG Property Management. You have access to live data:
Properties (${properties.length}): ${JSON.stringify(properties.map(p => ({ name: p.name, address: p.address, units: p.units })))}
Tenants (${tenants.length}): ${JSON.stringify(tenants.map(t => ({ name: t.name, unit: t.unit, rent: t.rent, paid: t.paid, lease_end: t.lease_end })))}
Open Maintenance (${maintenance.filter(m => m.status !== "Done").length}): ${JSON.stringify(maintenance.filter(m => m.status !== "Done").map(m => ({ issue: m.issue, unit: m.unit, priority: m.priority })))}
Recent Payments: ${JSON.stringify(payments.slice(-5).map(p => ({ tenant: p.tenant_name, amount: p.amount, date: p.date })))}
Today: ${new Date().toDateString()}
Be helpful, concise, and professional. You can draft emails, analyze data, give advice, and answer property management questions.`;

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", text: input };
    setMsgs(m => [...m, userMsg]);
    setInput("");
    setLoading(true);
    const history = [...msgs, userMsg].filter(m => m.role !== "assistant" || msgs.indexOf(m) > 0).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));
    const reply = await askClaude(history, sys);
    setMsgs(m => [...m, { role: "assistant", text: reply }]);
    setLoading(false);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <div style={S.aiBox}>
      <div style={S.aiMsgs}>
        {msgs.map((m, i) => (
          <div key={i} style={m.role === "user" ? S.msgUser : S.msgAI}>{m.text}</div>
        ))}
        {loading && <div style={S.msgAI}>Thinking...</div>}
        <div ref={endRef} />
      </div>
      <div style={S.aiInp}>
        <input
          style={S.inp}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask anything about your properties, tenants, or financials..."
        />
        <button style={S.btn} onClick={send}>Send</button>
      </div>
    </div>
  );
}

// ── Reports ──────────────────────────────────────────────────────────────────
function Reports({ tenants, properties, payments, maintenance }) {
  const totalRent    = tenants.reduce((s, t) => s + (t.rent || 0), 0);
  const collected    = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const maintCost    = maintenance.filter(m => m.cost).reduce((s, m) => s + (parseFloat(m.cost?.replace(/[^0-9.]/g, "")) || 0), 0);
  const occupancy    = properties.length > 0 ? Math.round((tenants.length / (properties.reduce((s, p) => s + (p.units || 1), 0))) * 100) : 0;

  return (
    <>
      <div style={S.statGrid}>
        <div style={S.statCard}><div style={S.statLbl}>Monthly Rent Roll</div><div style={S.statVal}>{fmt$(totalRent)}</div></div>
        <div style={S.statCard}><div style={S.statLbl}>Total Collected</div><div style={S.statVal}>{fmt$(collected)}</div></div>
        <div style={S.statCard}><div style={S.statLbl}>Maintenance Costs</div><div style={S.statVal}>{fmt$(maintCost)}</div></div>
        <div style={S.statCard}><div style={S.statLbl}>Occupancy Rate</div><div style={S.statVal}>{occupancy}%</div></div>
      </div>
      <div style={S.secTitle}>Tenant Rent Summary</div>
      <div style={S.card}>
        <div style={{ ...S.tHead, gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
          <span>Tenant</span><span>Unit</span><span>Rent</span><span>Status</span>
        </div>
        {tenants.map(t => (
          <div key={t.id} style={{ ...S.tRow, gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
            <span>{t.name}</span>
            <span style={{ color: C.muted }}>{t.unit}</span>
            <span style={{ color: C.success }}>{fmt$(t.rent)}</span>
            {badge(t.paid ? "Paid" : "Due", t.paid ? C.success : C.warning)}
          </div>
        ))}
        {tenants.length === 0 && <div style={{ padding: "14px 16px", color: C.muted }}>No tenants yet.</div>}
        {tenants.length > 0 && (
          <div style={{ ...S.tRow, gridTemplateColumns: "2fr 1fr 1fr 1fr", background: C.surface2 }}>
            <strong>Total</strong><span></span>
            <strong style={{ color: C.success }}>{fmt$(totalRent)}</strong>
            <span style={{ color: C.muted, fontSize: 11 }}>{tenants.filter(t => t.paid).length}/{tenants.length} paid</span>
          </div>
        )}
      </div>
    </>
  );
}
