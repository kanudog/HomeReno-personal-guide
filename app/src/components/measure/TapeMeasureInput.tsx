"use client";

import { useEffect, useState } from "react";
import {
  formatLength,
  parseLength,
  type Sixteenths,
  type UnitSystem,
} from "@/lib/units";

export interface TapeMeasureInputProps {
  label: string;
  value: Sixteenths;
  onChange: (v: Sixteenths) => void;
  system: UnitSystem;
  /** Compact rendering for table rows. */
  compact?: boolean;
  id?: string;
}

/**
 * Tape-measure-friendly length input. Accepts `92 5/8`, `7' 4 1/2"`,
 * `2350mm`… and canonicalizes on blur. Invalid text shows inline and
 * never propagates.
 */
export function TapeMeasureInput({
  label,
  value,
  onChange,
  system,
  compact = false,
  id,
}: TapeMeasureInputProps) {
  const canonical = formatLength(value, { system, feetInches: false });
  const [text, setText] = useState(canonical);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  // reflect external changes (canvas drags, unit toggle) while not editing
  useEffect(() => {
    if (!focused) {
      setText(formatLength(value, { system, feetInches: false }));
      setError(null);
    }
  }, [value, system, focused]);

  const commit = (raw: string) => {
    const r = parseLength(raw, system);
    if (r.ok) {
      setError(null);
      onChange(r.value);
      setText(formatLength(r.value, { system, feetInches: false }));
    } else {
      setError(r.error);
    }
  };

  return (
    <label className={compact ? "flex flex-col gap-0.5" : "flex flex-col gap-1"}>
      <span
        className={`bp-dim uppercase tracking-widest text-bp-line-soft ${compact ? "text-[9px]" : "text-[10px]"}`}
      >
        {label}
      </span>
      <input
        id={id}
        type="text"
        inputMode="text"
        autoComplete="off"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const r = parseLength(e.target.value, system);
          if (r.ok) {
            setError(null);
            onChange(r.value);
          }
        }}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false);
          commit(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className={`bp-dim rounded-sm border bg-bp-paper-deep px-2 text-bp-line outline-none transition-colors focus:border-bp-accent ${
          error ? "border-bp-danger" : "border-bp-line-faint"
        } ${compact ? "h-9 w-28 text-sm" : "h-11 w-36"}`}
      />
      {error && !compact && (
        <span className="text-[10px] text-bp-danger">{error}</span>
      )}
    </label>
  );
}
