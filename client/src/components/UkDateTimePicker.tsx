import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Minus, Plus } from "lucide-react";
import {
  utcToLondonInputs,
  londonInputsToUtcISO,
  ukTimeZoneLabel,
} from "@/lib/uk-time";
import { cn } from "@/lib/utils";

interface UkDateTimePickerProps {
  value: Date | string | null | undefined;
  onChange: (utcISO: string | null) => void;
  label?: string;
  required?: boolean;
  className?: string;
  testIdPrefix?: string;
  presets?: string[];
  hideLabel?: boolean;
}

const DEFAULT_PRESETS = ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"];

export function UkDateTimePicker({
  value,
  onChange,
  label = "Date & Time",
  required = false,
  className,
  testIdPrefix = "ukdt",
  presets = DEFAULT_PRESETS,
  hideLabel = false,
}: UkDateTimePickerProps) {
  const initial = useMemo(() => utcToLondonInputs(value), [value]);
  const [date, setDate] = useState<string>(initial.date);
  const [time, setTime] = useState<string>(initial.time);

  useEffect(() => {
    const next = utcToLondonInputs(value);
    setDate(next.date);
    setTime(next.time);
  }, [value]);

  const emit = (d: string, t: string) => {
    if (!d || !t) {
      onChange(null);
      return;
    }
    const iso = londonInputsToUtcISO(d, t);
    if (iso) onChange(iso);
  };

  const setBoth = (d: string, t: string) => {
    setDate(d);
    setTime(t);
    emit(d, t);
  };

  const adjustMinutes = (delta: number) => {
    const [h, m] = (time || "00:00").split(":").map(Number);
    const total = (h || 0) * 60 + (m || 0) + delta;
    const wrapped = ((total % 1440) + 1440) % 1440;
    const nh = Math.floor(wrapped / 60);
    const nm = wrapped % 60;
    const newTime = `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
    if (!date) {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      setBoth(todayStr, newTime);
    } else {
      setBoth(date, newTime);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {!hideLabel && (
        <div className="flex items-center justify-between">
          <Label className="text-sm">
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            UK · {ukTimeZoneLabel(value || new Date())}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="date"
            value={date}
            onChange={(e) => setBoth(e.target.value, time)}
            className="pl-9 font-medium"
            data-testid={`${testIdPrefix}-input-date`}
          />
        </div>

        <div className="flex items-stretch gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => adjustMinutes(-15)}
            data-testid={`${testIdPrefix}-button-minus`}
            aria-label="Decrease 15 minutes"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="time"
              value={time}
              step={300}
              onChange={(e) => setBoth(date, e.target.value)}
              className="pl-9 font-semibold tabular-nums w-[140px]"
              data-testid={`${testIdPrefix}-input-time`}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => adjustMinutes(15)}
            data-testid={`${testIdPrefix}-button-plus`}
            aria-label="Increase 15 minutes"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mr-0.5">Quick</span>
          {presets.map((p) => {
            const active = time === p;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={active}
                onClick={() => setBoth(date || (() => {
                  const t = new Date();
                  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
                })(), p)}
                className={cn(
                  "px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/50 hover:bg-muted text-foreground border-border",
                )}
                data-testid={`${testIdPrefix}-preset-${p.replace(":", "")}`}
              >
                {p}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default UkDateTimePicker;
