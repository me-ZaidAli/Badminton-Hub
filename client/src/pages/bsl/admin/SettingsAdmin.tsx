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
    name: league.name, tagline: league.tagline, venueName: league.venueName,
    bankAccountName: league.bankAccountName, bankSortCode: league.bankSortCode, bankAccountNumber: league.bankAccountNumber,
    clubFee: league.clubFee, playerFee: league.playerFee,
    pointsWin: league.pointsWin, pointsDraw: league.pointsDraw, pointsLoss: league.pointsLoss,
    matchFormat: league.matchFormat, courtCount: league.courtCount,
    notificationsEnabled: league.notificationsEnabled,
    brandingPrimary: league.brandingPrimary, brandingAccent: league.brandingAccent,
    nextLeagueDay: league.nextLeagueDay ? new Date(league.nextLeagueDay).toISOString().slice(0, 16) : "",
  }); }, [league]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form };
      if (payload.nextLeagueDay) payload.nextLeagueDay = new Date(payload.nextLeagueDay).toISOString();
      else delete payload.nextLeagueDay;
      return (await apiRequest("PATCH", "/api/bsl/league", payload)).json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/bsl/league"] }); toast({ title: "Settings saved" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
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
            <Field label="Win pts"><Input type="number" value={form.pointsWin ?? 3} onChange={v => F("pointsWin", Number(v))} testid="input-pts-win" /></Field>
            <Field label="Draw pts"><Input type="number" value={form.pointsDraw ?? 1} onChange={v => F("pointsDraw", Number(v))} testid="input-pts-draw" /></Field>
            <Field label="Loss pts"><Input type="number" value={form.pointsLoss ?? 0} onChange={v => F("pointsLoss", Number(v))} testid="input-pts-loss" /></Field>
          </div>
          <Field label="Courts available"><Input type="number" value={form.courtCount ?? 6} onChange={v => F("courtCount", Number(v))} testid="input-courts" /></Field>
        </GlowPanel>

        <GlowPanel title="Bank Transfer Details" tone="gold" icon={<Banknote className="h-4 w-4" />}>
          <Field label="Account name"><Input value={form.bankAccountName || ""} onChange={v => F("bankAccountName", v)} testid="input-bank-name" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sort code"><Input value={form.bankSortCode || ""} onChange={v => F("bankSortCode", v)} testid="input-sort" /></Field>
            <Field label="Account number"><Input value={form.bankAccountNumber || ""} onChange={v => F("bankAccountNumber", v)} testid="input-acct" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Club fee (pence)"><Input type="number" value={form.clubFee ?? 50000} onChange={v => F("clubFee", Number(v))} testid="input-club-fee" /></Field>
            <Field label="Player fee (pence)"><Input type="number" value={form.playerFee ?? 2500} onChange={v => F("playerFee", Number(v))} testid="input-player-fee" /></Field>
          </div>
          <div className="text-xs mt-2" style={{ color: BSL.muted }}>Currently: <span style={{ color: BSL.gold }}>£{((form.clubFee||0)/100).toFixed(2)} per club</span> · <span style={{ color: BSL.gold }}>£{((form.playerFee||0)/100).toFixed(2)} per player</span></div>
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
function Input({ value, onChange, type = "text", testid }: any) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid={testid} />;
}
