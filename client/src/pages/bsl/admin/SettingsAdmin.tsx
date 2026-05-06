import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, Save, Banknote, Trophy, Bell, Palette } from "lucide-react";
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
    matchFormat: league.matchFormat ?? "6-RUBBER", courtCount: league.courtCount ?? 6,
    notificationsEnabled: !!league.notificationsEnabled,
    brandingPrimary: league.brandingPrimary ?? "", brandingAccent: league.brandingAccent ?? "",
    nextLeagueDay: league.nextLeagueDay ? toLocalInput(league.nextLeagueDay) : "",
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
function toLocalInput(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
