"use client";

import Link from "next/link";
import { use } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { inches } from "@/lib/units";
import type { WallInput } from "@/lib/modules/framing/types";
import type { ElectricalInput } from "@/lib/modules/electrical/types";
import { ENGINE_VERSION } from "@/lib/modules/framing";
import { ENGINE_VERSION as ELECTRICAL_ENGINE_VERSION } from "@/lib/modules/electrical";

const NEW_WALL: WallInput = {
  length: inches(120),
  height: inches(97.125),
  studSize: "2x4",
  spacingOC: inches(16),
  topPlate: "double",
  loadBearing: false,
    bottomPlatePT: true,
  openings: [],
};

const NEW_ELECTRICAL: ElectricalInput = {
  system: "mains",
  panel: { label: "Main panel", mainAmps: 200, slots: 40, existing: [] },
  rooms: [],
  circuits: [
    {
      id: "circuit-1",
      name: "Circuit 1",
      existing: false,
      breakerAmps: 15,
      poles: 1,
      breakerType: "standard",
      cable: "14/2",
      devices: [],
      loads: [],
    },
  ],
};

interface DesignRow {
  id: string;
  name: string;
  module_id: string;
  updated_at: string;
}

export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const supabase = supabaseBrowser();
  const qc = useQueryClient();

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status, notes")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const designs = useQuery({
    queryKey: ["designs", projectId],
    queryFn: async (): Promise<DesignRow[]> => {
      const { data, error } = await supabase
        .from("designs")
        .select("id, name, module_id, updated_at")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as DesignRow[];
    },
  });

  const createDesign = useMutation({
    mutationFn: async (moduleId: "framing" | "electrical") => {
      const { data, error } = await supabase
        .from("designs")
        .insert({
          project_id: projectId,
          module_id: moduleId,
          name:
            moduleId === "framing"
              ? `Wall ${(designs.data?.length ?? 0) + 1}`
              : `Circuits ${(designs.data?.length ?? 0) + 1}`,
          input: moduleId === "framing" ? NEW_WALL : NEW_ELECTRICAL,
          engine_version: moduleId === "framing" ? ENGINE_VERSION : ELECTRICAL_ENGINE_VERSION,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["designs", projectId] });
      location.href = `/projects/${projectId}/designs/${d.id}`;
    },
  });

  return (
    <main className="mx-auto w-full max-w-4xl grow px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/projects"
            className="bp-dim text-[11px] uppercase tracking-widest text-bp-line-soft hover:text-bp-accent"
          >
            ← Projects
          </Link>
          <h1 className="bp-panel-title text-xl">{project.data?.name ?? "…"}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => createDesign.mutate("framing")}
            disabled={createDesign.isPending}
            className="bp-dim rounded-sm border border-bp-accent px-4 py-2 text-[11px] uppercase tracking-widest text-bp-accent transition-colors enabled:hover:bg-bp-accent enabled:hover:text-bp-paper-deep disabled:opacity-40"
          >
            + Wall design
          </button>
          <button
            onClick={() => createDesign.mutate("electrical")}
            disabled={createDesign.isPending}
            className="bp-dim rounded-sm border border-bp-accent px-4 py-2 text-[11px] uppercase tracking-widest text-bp-accent transition-colors enabled:hover:bg-bp-accent enabled:hover:text-bp-paper-deep disabled:opacity-40"
          >
            + Electrical design
          </button>
        </div>
      </header>

      <section className="mb-8">
        <h2 className="bp-panel-title mb-3 text-sm">Designs</h2>
        <div className="flex flex-col gap-3">
          {designs.data?.map((d) => (
            <Link
              key={d.id}
              href={`/projects/${projectId}/designs/${d.id}`}
              className="bp-panel flex items-center justify-between p-4 transition-colors hover:border-bp-accent"
            >
              <div>
                <h3 className="bp-panel-title text-base">{d.name}</h3>
                <p className="bp-dim mt-1 text-[11px] text-bp-line-soft">
                  {d.module_id} · updated {new Date(d.updated_at).toLocaleString()}
                </p>
              </div>
              <span className="bp-dim text-[10px] uppercase tracking-widest text-bp-accent">
                Open →
              </span>
            </Link>
          ))}
          {designs.data?.length === 0 && (
            <p className="text-sm text-bp-line-soft">
              No designs yet — add your first wall with the button above.
            </p>
          )}
        </div>
      </section>

      <Link
        href={`/projects/${projectId}/track`}
        className="bp-panel block p-4 transition-colors hover:border-bp-accent"
      >
        <div className="flex items-center justify-between">
          <h2 className="bp-panel-title text-sm">Build Tracking</h2>
          <span className="bp-dim text-[10px] uppercase tracking-widest text-bp-accent">Open →</span>
        </div>
        <p className="mt-1 text-sm text-bp-line-soft">
          Task checklist, photo journal, budget &amp; receipts, and estimated-vs-actual material
          variance.
        </p>
      </Link>
    </main>
  );
}
