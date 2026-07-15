"use client";

import { use, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { computeFraming, ENGINE_VERSION, parseWallInput } from "@/lib/modules/framing";
import { DesignerWorkspace } from "@/components/DesignerWorkspace";
import { useEditor } from "@/stores/editor";

/**
 * Designer bound to a Supabase design row: hydrates the editor store on
 * load, then autosaves input + output cache (debounced) as you work.
 */
export default function BoundDesignPage({
  params,
}: {
  params: Promise<{ projectId: string; designId: string }>;
}) {
  const { projectId, designId } = use(params);
  const supabase = supabaseBrowser();
  const bindDesign = useEditor((s) => s.bindDesign);
  const boundDesignId = useEditor((s) => s.boundDesignId);
  const wall = useEditor((s) => s.wall);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const lastSavedRef = useRef<string | null>(null);

  const design = useQuery({
    queryKey: ["design", designId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("designs")
        .select("id, name, input, engine_version")
        .eq("id", designId)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: Infinity,
  });

  // hydrate the editor store once the row arrives
  useEffect(() => {
    if (!design.data) return;
    try {
      const parsed = parseWallInput(design.data.input);
      lastSavedRef.current = JSON.stringify(parsed);
      bindDesign(designId, parsed);
    } catch {
      setSaveState("error");
    }
  }, [design.data, designId, bindDesign]);

  // debounced autosave on wall changes while bound to this design
  useEffect(() => {
    if (boundDesignId !== designId) return;
    const serialized = JSON.stringify(wall);
    if (lastSavedRef.current === null || serialized === lastSavedRef.current) return;

    const t = setTimeout(async () => {
      setSaveState("saving");
      let outputCache: unknown = null;
      try {
        outputCache = computeFraming(wall);
      } catch {
        outputCache = null;
      }
      const { error } = await supabase
        .from("designs")
        .update({
          input: wall,
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
  }, [wall, boundDesignId, designId, supabase]);

  if (design.isLoading) {
    return <p className="p-8 text-bp-line-soft">Loading design…</p>;
  }
  if (design.error) {
    return <p className="p-8 text-bp-danger">Couldn&apos;t load design: {String(design.error)}</p>;
  }

  return (
    <DesignerWorkspace
      title={design.data?.name ?? "Wall design"}
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
