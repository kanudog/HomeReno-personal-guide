"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  computeElectrical,
  ENGINE_VERSION,
  parseElectricalInput,
} from "@/lib/modules/electrical";
import { ElectricalWorkspace } from "./ElectricalWorkspace";
import { useElectrical } from "@/stores/electrical";

/**
 * Electrical designer bound to a Supabase design row — hydrates the store
 * on load, then autosaves input + output cache (debounced). Mirrors the
 * framing BoundDesignPage.
 */
export function ElectricalBoundDesign({
  projectId,
  designId,
  designName,
  initialInput,
}: {
  projectId: string;
  designId: string;
  designName: string;
  initialInput: unknown;
}) {
  const supabase = supabaseBrowser();
  const bindDesign = useElectrical((s) => s.bindDesign);
  const boundDesignId = useElectrical((s) => s.boundDesignId);
  const input = useElectrical((s) => s.input);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const lastSavedRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const parsed = parseElectricalInput(initialInput);
      lastSavedRef.current = JSON.stringify(parsed);
      bindDesign(designId, parsed);
    } catch {
      setSaveState("error");
    }
  }, [initialInput, designId, bindDesign]);

  useEffect(() => {
    if (boundDesignId !== designId) return;
    const serialized = JSON.stringify(input);
    if (lastSavedRef.current === null || serialized === lastSavedRef.current) return;

    const t = setTimeout(async () => {
      setSaveState("saving");
      let outputCache: unknown = null;
      try {
        outputCache = computeElectrical(input);
      } catch {
        outputCache = null;
      }
      const { error } = await supabase
        .from("designs")
        .update({
          input,
          output_cache: outputCache,
          engine_version: ENGINE_VERSION,
        })
        .eq("id", designId);
      if (error) {
        setSaveState("error");
      } else {
        lastSavedRef.current = serialized;
        setSaveState("saved");
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [input, boundDesignId, designId, supabase]);

  return (
    <ElectricalWorkspace
      title={designName}
      backHref={`/projects/${projectId}`}
      backLabel="Project"
      headerExtra={
        <span
          className={`bp-dim text-[10px] uppercase tracking-widest ${
            saveState === "error"
              ? "text-bp-danger"
              : saveState === "saving"
                ? "text-bp-warn"
                : "text-bp-line-soft"
          }`}
        >
          {saveState === "saving"
            ? "saving…"
            : saveState === "saved"
              ? "saved ✓"
              : saveState === "error"
                ? "save failed"
                : "synced"}
        </span>
      }
    />
  );
}
