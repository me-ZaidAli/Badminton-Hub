import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, Save, Banknote, Trophy, Bell, Palette, Wallet as WalletIcon, Plus, Trash2 } from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { GlowPanel } from "../components/GlowPanel";
import { ActionButton } from "../components/ActionButton";
import { BSL } from "../components/BSLPalette";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function SettingsAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: league } = useQuery<any>({ queryKey: ["/api/bsl/league"] });
  const [form, setForm] = useState<any>({});

  useEffect(() => { if (league) setForm({
    name: league.name ?? "", tagline: league.tagline ?? "", venueName: league.venueName ?? "",
    bankAccountName: league.bankAccountName ?? "", bankSortCode: league.bankSortCode ?? "", bankAccountNumber: league.bankAccountNumber ?? "",
    // Fees stored in pence on the server, edited in pounds here (no leading zeros)
    clubFeePounds: league.clubFee != null ? String(league.clubFee / 100) : "",
    playerFeePounds: league.playerFee != null ? String(league.playerFee / 100) : "",
    pointsWin: league.pointsWin ?? 3, pointsDraw: league.pointsDraw ?? 1, pointsLoss: league.pointsLoss ?? 0,
    feeMD: league.categoryFees?.MD != null ? String(league.categoryFees.MD / 100) : "",
    feeWD: league.categoryFees?.WD != null ? String(league.categoryFees.WD / 100) : "",
    feeXD: league.categoryFees?.XD != null ? String(league.categoryFees.XD / 100) : "",
    matchFormat: league.matchFormat ?? "6-RUBBER", courtCount: league.courtCount ?? 6,
    notificationsEnabled: !!league.notificationsEnabled,
    brandingPrimary: league.brandingPrimary ?? "", brandingAccent: league.brandingAccent ?? "",
    nextLeagueDay: league.nextLeagueDay ? toLocalInput(league.nextLeagueDay) : "",
    // Top-up config — packages stored in pence on the server, edited as £ here.
    topupPackages: Array.isArray(league.topupPackages)
      ? league.topupPackages.map((p: any, i: number) => ({
          id: String(p.id || `pkg_${i + 1}`),
          label: String(p.label || ""),
          amountPounds: p.amountPence != null ? String((p.amountPence / 100).toFixed(2)).replace(/\.00$/, "") : "",
        }))
      : [],
    topupDiscountPcts: Array.isArray(league.topupDiscountPcts) && league.topupDiscountPcts.length
      ? league.topupDiscountPcts.map((n: any) => String(n))
      : ["0", "50", "70"],
  }); }, [league]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        name: form.name, tagline: form.tagline, venueName: form.venueName,
        bankAccountName: form.bankAccountName, bankSortCode: form.bankSortCode, bankAccountNumber: form.bankAccountNumber,
        pointsWin: numOrUndef(form.pointsWin), pointsDraw: numOrUndef(form.pointsDraw), pointsLoss: numOrUndef(form.pointsLoss),
        matchFormat: form.matchFormat, courtCount: numOrUndef(form.courtCount),
        notificationsEnabled: !!form.notificationsEnabled,
        brandingPrimary: form.brandingPrimary, brandingAccent: form.brandingAccent,
      };
      // Convert pounds → pence, drop blanks
      const cf = parseFloat(form.clubFeePounds);
      const pf = parseFloat(form.playerFeePounds);
      if (Number.isFinite(cf)) payload.clubFee = Math.round(cf * 100);
      if (Number.isFinite(pf)) payload.playerFee = Math.round(pf * 100);
      // Per-category fees (only send when at least one is set)
      const md = parseFloat(form.feeMD), wd = parseFloat(form.feeWD), xd = parseFloat(form.feeXD);
      if ([md, wd, xd].some(Number.isFinite)) {
        payload.categoryFees = {
          MD: Number.isFinite(md) ? Math.round(md * 100) : (league?.categoryFees?.MD ?? 2500),
          WD: Number.isFinite(wd) ? Math.round(wd * 100) : (league?.categoryFees?.WD ?? 2500),
          XD: Number.isFinite(xd) ? Math.round(xd * 100) : (league?.categoryFees?.XD ?? 3000),
        };
      }
      // Top-up packages — convert pounds → pence, drop blanks/zero rows.
      if (Array.isArray(form.topupPackages)) {
        payload.topupPackages = form.topupPackages
          .map((p: any, i: number) => {
            const pounds = parseFloat(p.amountPounds);
            const label = String(p.label || "").trim();
            if (!label || !Number.isFinite(pounds) || pounds < 0) return null;
            return {
              id: p.id || `pkg_${i + 1}`,
              label,
              amountPence: Math.round(pounds * 100),
              sortOrder: i,
            };
          })
          .filter(Boolean);
      }
      // Discount tiers — strings to numbers, clamp 0..100, drop NaNs.
      if (Array.isArray(form.topupDiscountPcts)) {
        payload.topupDiscountPcts = form.topupDiscountPcts
          .map((s: any) => {
            const n = Number(s);
            return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : null;
          })
          .filter((n: any) => n !== null);
      }
      // Convert datetime-local string → ISO; only send when non-empty
      if (form.nextLeagueDay) payload.nextLeagueDay = new Date(form.nextLeagueDay).toISOString();
      // Strip undefined keys so the server doesn't try to write them
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
      const r = await apiRequest("PATCH", "/api/bsl/league", payload);
      const txt = await r.text();
      return txt ? JSON.parse(txt) : null;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/bsl/league"] }); toast({ title: "Settings saved" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message || "Could not save", variant: "destructive" }),
  });

  const F = (k: string, v: any) => setForm({ ...form, [k]: v });

  return (
    <AdminLayout active="settings">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">League <span style={{ color: BSL.gold }}>Settings</span></h1>
          <p className="text-sm mt-1" style={{ color: BSL.muted }}>Rules · branding · bank details · notifications</p>
        </div>
        <ActionButton variant="gold" onClick={() => save.mutate()} disabled={save.isPending} icon={<Save className="h-3 w-3" />}>{save.isPending ? "Saving…" : "Save changes"}</ActionButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GlowPanel title="Identity" tone="gold" icon={<SettingsIcon className="h-4 w-4" />}>
          <Field label="League name"><Input value={form.name || ""} onChange={v => F("name", v)} testid="input-league-name" /></Field>
          <Field label="Tagline"><Input value={form.tagline || ""} onChange={v => F("tagline", v)} testid="input-tagline" /></Field>
          <Field label="Venue"><Input value={form.venueName || ""} onChange={v => F("venueName", v)} testid="input-venue" /></Field>
          <Field label="Next league day"><Input type="datetime-local" value={form.nextLeagueDay || ""} onChange={v => F("nextLeagueDay", v)} testid="input-next-day" /></Field>
        </GlowPanel>

        <GlowPanel title="Match Rules" tone="cyan" icon={<Trophy className="h-4 w-4" />}>
          <Field label="Match format">
            <select value={form.matchFormat || "6-RUBBER"} onChange={e => F("matchFormat", e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid="select-format">
              <option value="6-RUBBER">6-Rubber (MS×2 / WS / MD / WD / XD)</option>
              <option value="9-RUBBER">9-Rubber extended</option>
              <option value="3-SET">3-Set best-of</option>
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Win pts"><NumberInput value={form.pointsWin} onChange={v => F("pointsWin", v)} placeholder="3" testid="input-pts-win" /></Field>
            <Field label="Draw pts"><NumberInput value={form.pointsDraw} onChange={v => F("pointsDraw", v)} placeholder="1" testid="input-pts-draw" /></Field>
            <Field label="Loss pts"><NumberInput value={form.pointsLoss} onChange={v => F("pointsLoss", v)} placeholder="0" testid="input-pts-loss" /></Field>
          </div>
          <Field label="Courts available"><NumberInput value={form.courtCount} onChange={v => F("courtCount", v)} placeholder="6" testid="input-courts" /></Field>
        </GlowPanel>

        <GlowPanel title="Bank Transfer Details" tone="gold" icon={<Banknote className="h-4 w-4" />}>
          <Field label="Account name"><Input value={form.bankAccountName || ""} onChange={v => F("bankAccountName", v)} testid="input-bank-name" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sort code"><Input value={form.bankSortCode || ""} onChange={v => F("bankSortCode", v)} testid="input-sort" /></Field>
            <Field label="Account number"><Input value={form.bankAccountNumber || ""} onChange={v => F("bankAccountNumber", v)} testid="input-acct" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Club fee (£)"><MoneyInput value={form.clubFeePounds} onChange={v => F("clubFeePounds", v)} placeholder="500" testid="input-club-fee" /></Field>
            <Field label="Player fee (£)"><MoneyInput value={form.playerFeePounds} onChange={v => F("playerFeePounds", v)} placeholder="25" testid="input-player-fee" /></Field>
          </div>
          <div className="text-xs mt-2" style={{ color: BSL.muted }}>Currently: <span style={{ color: BSL.gold }}>£{fmtPounds(form.clubFeePounds)} per club</span> · <span style={{ color: BSL.gold }}>£{fmtPounds(form.playerFeePounds)} per player</span></div>
          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${BSL.border}` }}>
            <div className="text-[10px] uppercase tracking-widest font-black mb-2" style={{ color: BSL.gold }}>Per-category fees (£)</div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Men's Doubles"><MoneyInput value={form.feeMD} onChange={(v: any) => F("feeMD", v)} placeholder="25" testid="input-fee-md" /></Field>
              <Field label="Women's Doubles"><MoneyInput value={form.feeWD} onChange={(v: any) => F("feeWD", v)} placeholder="25" testid="input-fee-wd" /></Field>
              <Field label="Mixed Doubles"><MoneyInput value={form.feeXD} onChange={(v: any) => F("feeXD", v)} placeholder="30" testid="input-fee-xd" /></Field>
            </div>
            <div className="text-xs mt-1" style={{ color: BSL.muted }}>Players pay this from their BSL wallet on category registration. Falls back to player fee if blank.</div>
          </div>
        </GlowPanel>

        <GlowPanel title="Wallet Top-Up Packages" tone="gold" icon={<WalletIcon className="h-4 w-4" />}>
          <div className="text-xs mb-3" style={{ color: BSL.muted }}>
            Buttons shown to players in the wallet top-up modal. Each click adds the amount to the running total. Players can press the same package multiple times — discounts apply by click order.
          </div>
          <div className="space-y-2 mb-3">
            {(form.topupPackages || []).map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-2" data-testid={`row-topup-pkg-${i}`}>
                <input
                  type="text"
                  value={p.label}
                  placeholder="e.g. Adult"
                  onChange={(e) => {
                    const next = [...form.topupPackages];
                    next[i] = { ...next[i], label: e.target.value };
                    F("topupPackages", next);
                  }}
                  className="flex-1 px-3 py-2 rounded-lg text-sm"
                  style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }}
                  data-testid={`input-topup-label-${i}`}
                />
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: BSL.muted }}>£</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={p.amountPounds}
                    placeholder="20"
                    onChange={(e) => {
                      const next = [...form.topupPackages];
                      next[i] = { ...next[i], amountPounds: e.target.value.replace(/^0+(?=\d)/, "") };
                      F("topupPackages", next);
                    }}
                    className="w-full pl-7 pr-2 py-2 rounded-lg text-sm"
                    style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }}
                    data-testid={`input-topup-amount-${i}`}
                  />
                </div>
                <button
                  onClick={() => F("topupPackages", form.topupPackages.filter((_: any, j: number) => j !== i))}
                  className="p-2 rounded-lg hover:bg-white/10"
                  style={{ color: BSL.danger }}
                  data-testid={`button-topup-remove-${i}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => F("topupPackages", [...(form.topupPackages || []), { id: `pkg_${Date.now()}`, label: "", amountPounds: "" }])}
            className="w-full px-3 py-2 rounded-lg text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-1.5"
            style={{ background: `${BSL.gold}11`, border: `1px dashed ${BSL.gold}66`, color: BSL.gold }}
            data-testid="button-topup-add-package"
          >
            <Plus className="h-3 w-3" /> Add package
          </button>
          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${BSL.border}` }}>
            <div className="text-[10px] uppercase tracking-widest font-black mb-2" style={{ color: BSL.gold }}>Discount ladder (% off Nth selection)</div>
            <div className="grid grid-cols-3 gap-2">
              {(form.topupDiscountPcts || []).map((v: string, i: number) => (
                <div key={i}>
                  <div className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: BSL.muted }}>{ordinal(i + 1)} pick</div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0" max="100"
                      value={v}
                      onChange={(e) => {
                        const next = [...form.topupDiscountPcts];
                        next[i] = e.target.value.replace(/^0+(?=\d)/, "");
                        F("topupDiscountPcts", next);
                      }}
                      className="w-full pr-6 pl-2 py-2 rounded-lg text-sm"
                      style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }}
                      data-testid={`input-discount-${i}`}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm" style={{ color: BSL.muted }}>%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs mt-2" style={{ color: BSL.muted }}>
              Default: 1st full · 2nd 50% off · 3rd 70% off · 4th+ full again. Empty list = no discounts.
            </div>
          </div>
        </GlowPanel>

        <GlowPanel title="Notifications & Branding" tone="cyan" icon={<Bell className="h-4 w-4" />}>
          <button onClick={() => F("notificationsEnabled", !form.notificationsEnabled)} className="flex items-center justify-between p-3 rounded-lg text-sm font-bold w-full mb-3" style={{ background: form.notificationsEnabled ? `${BSL.cyan}22` : BSL.cardSoft, border: `1px solid ${form.notificationsEnabled ? BSL.cyan : BSL.border}`, color: form.notificationsEnabled ? BSL.cyan : BSL.muted }} data-testid="toggle-notif">
            <span className="inline-flex items-center gap-2"><Bell className="h-3.5 w-3.5" /> Push notifications</span>
            {form.notificationsEnabled ? "ON" : "OFF"}
          </button>
          <div className="text-[10px] uppercase tracking-widest font-black mb-2 flex items-center gap-1.5" style={{ color: BSL.gold }}><Palette className="h-3 w-3" /> Branding overrides</div>
          <Field label="Primary color (hsl)"><Input value={form.brandingPrimary || ""} onChange={v => F("brandingPrimary", v)} testid="input-brand-primary" /></Field>
          <Field label="Accent color (hsl)"><Input value={form.brandingAccent || ""} onChange={v => F("brandingAccent", v)} testid="input-brand-accent" /></Field>
          <div className="flex gap-2 mt-2">
            <div className="flex-1 h-10 rounded-lg" style={{ background: form.brandingPrimary || BSL.gold }} />
            <div className="flex-1 h-10 rounded-lg" style={{ background: form.brandingAccent || BSL.cyan }} />
          </div>
        </GlowPanel>
      </div>
    </AdminLayout>
  );
}

function Field({ label, children }: any) {
  return <div className="mb-3"><label className="text-[10px] uppercase tracking-widest font-bold block mb-1" style={{ color: BSL.muted }}>{label}</label>{children}</div>;
}
function Input({ value, onChange, type = "text", placeholder, testid }: any) {
  return <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid={testid} />;
}
// Integer input that allows empty values and never shows leading zeros.
function NumberInput({ value, onChange, placeholder, testid }: any) {
  const display = value === null || value === undefined || value === "" ? "" : String(value);
  return (
    <input
      type="number"
      inputMode="numeric"
      value={display}
      placeholder={placeholder}
      onChange={e => {
        const v = e.target.value;
        if (v === "") return onChange(undefined);
        // Strip leading zeros (but keep a single 0)
        const cleaned = v.replace(/^0+(?=\d)/, "");
        const n = parseInt(cleaned, 10);
        onChange(Number.isFinite(n) ? n : undefined);
      }}
      className="w-full px-3 py-2 rounded-lg text-sm"
      style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }}
      data-testid={testid}
    />
  );
}
// Money input in pounds — stores a clean string, no forced leading zeros.
function MoneyInput({ value, onChange, placeholder, testid }: any) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step="0.01"
      min="0"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={e => {
        const raw = e.target.value;
        if (raw === "") return onChange("");
        // Strip leading zeros except for "0." style decimals
        const cleaned = raw.replace(/^0+(?=\d)/, "");
        onChange(cleaned);
      }}
      className="w-full px-3 py-2 rounded-lg text-sm"
      style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }}
      data-testid={testid}
    />
  );
}
function numOrUndef(v: any): number | undefined {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function fmtPounds(v: any): string {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}
function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function toLocalInput(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
