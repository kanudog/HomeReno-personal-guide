"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { prepareImage } from "@/lib/images";
import { computeFraming, parseWallInput } from "@/lib/modules/framing";

const TABS = [
  { id: "tasks", label: "Tasks" },
  { id: "journal", label: "Journal" },
  { id: "budget", label: "Budget" },
  { id: "variance", label: "Variance" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const btn =
  "bp-dim rounded-sm border border-bp-accent px-3 py-1.5 text-[11px] uppercase tracking-widest text-bp-accent transition-colors enabled:hover:bg-bp-accent enabled:hover:text-bp-paper-deep disabled:opacity-40";
const inputCls =
  "bp-dim h-10 rounded-sm border border-bp-line-faint bg-bp-paper-deep px-2 text-bp-line outline-none focus:border-bp-accent";

export default function TrackPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const [tab, setTab] = useState<TabId>("tasks");

  return (
    <main className="mx-auto w-full max-w-4xl grow px-6 py-8">
      <header className="mb-5 flex items-center gap-4">
        <Link
          href={`/projects/${projectId}`}
          className="bp-dim text-[11px] uppercase tracking-widest text-bp-line-soft hover:text-bp-accent"
        >
          ← Project
        </Link>
        <h1 className="bp-panel-title text-xl">Build Tracking</h1>
      </header>

      <div className="mb-5 flex flex-wrap gap-1 border-b border-bp-line-faint pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`bp-dim rounded-sm px-3 py-2 text-[11px] uppercase tracking-widest transition-colors ${
              tab === t.id ? "bg-bp-accent text-bp-paper-deep" : "text-bp-line-soft hover:text-bp-line"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "tasks" && <TasksTab projectId={projectId} />}
      {tab === "journal" && <JournalTab projectId={projectId} />}
      {tab === "budget" && <BudgetTab projectId={projectId} />}
      {tab === "variance" && <VarianceTab projectId={projectId} />}
    </main>
  );
}

// ---------------------------------------------------------------------------

function TasksTab({ projectId }: { projectId: string }) {
  const supabase = supabaseBrowser();
  const qc = useQueryClient();
  const [manualTitle, setManualTitle] = useState("");

  const tasks = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, seq, title, detail, done, source, design_id")
        .eq("project_id", projectId)
        .order("seq");
      if (error) throw error;
      return data;
    },
  });

  const designs = useQuery({
    queryKey: ["designs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("designs")
        .select("id, name, input")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  const generate = useMutation({
    mutationFn: async (designId: string) => {
      const design = designs.data?.find((d) => d.id === designId);
      if (!design) throw new Error("design not found");
      const output = computeFraming(parseWallInput(design.input));
      // replace previously generated tasks for this design, keep done state by title
      const { data: existing } = await supabase
        .from("tasks")
        .select("title, done")
        .eq("project_id", projectId)
        .eq("design_id", designId);
      const doneByTitle = new Map((existing ?? []).map((t) => [t.title, t.done]));
      await supabase.from("tasks").delete().eq("project_id", projectId).eq("design_id", designId);
      const rows = output.tasks.map((t) => ({
        project_id: projectId,
        design_id: designId,
        seq: t.seq,
        title: t.title,
        detail: t.detail,
        member_ids: t.memberIds,
        assembly_step: t.assemblyStep,
        done: doneByTitle.get(t.title) ?? false,
        source: "generated",
      }));
      const { error } = await supabase.from("tasks").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ done, done_at: done ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  const addManual = useMutation({
    mutationFn: async (title: string) => {
      const maxSeq = Math.max(0, ...(tasks.data?.map((t) => t.seq) ?? [0]));
      const { error } = await supabase
        .from("tasks")
        .insert({ project_id: projectId, title, seq: maxSeq + 1, source: "manual" });
      if (error) throw error;
    },
    onSuccess: () => {
      setManualTitle("");
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  const doneCount = tasks.data?.filter((t) => t.done).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="bp-panel flex flex-wrap items-center gap-3 p-4">
        <span className="bp-dim text-[11px] uppercase tracking-widest text-bp-line-soft">
          Generate checklist from design:
        </span>
        {designs.data?.map((d) => (
          <button key={d.id} onClick={() => generate.mutate(d.id)} disabled={generate.isPending} className={btn}>
            {d.name}
          </button>
        ))}
        {designs.data?.length === 0 && (
          <span className="text-sm text-bp-line-soft">no designs yet</span>
        )}
      </div>

      <p className="bp-dim text-[11px] text-bp-line-soft">
        {doneCount}/{tasks.data?.length ?? 0} complete
      </p>

      <ul className="flex flex-col gap-2">
        {tasks.data?.map((t) => (
          <li key={t.id} className="bp-panel flex items-start gap-3 p-3">
            <input
              type="checkbox"
              checked={t.done}
              onChange={(e) => toggle.mutate({ id: t.id, done: e.target.checked })}
              className="mt-1 h-5 w-5 accent-[var(--bp-accent)]"
            />
            <div className={t.done ? "opacity-50" : ""}>
              <p className={`text-sm ${t.done ? "line-through" : ""}`}>{t.title}</p>
              {t.detail && <p className="mt-0.5 text-[12px] text-bp-line-soft">{t.detail}</p>}
            </div>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          value={manualTitle}
          onChange={(e) => setManualTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && manualTitle.trim() && addManual.mutate(manualTitle.trim())}
          placeholder="Add a manual task…"
          className={`${inputCls} grow`}
        />
        <button
          onClick={() => manualTitle.trim() && addManual.mutate(manualTitle.trim())}
          disabled={!manualTitle.trim()}
          className={btn}
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function JournalTab({ projectId }: { projectId: string }) {
  const supabase = supabaseBrowser();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [uploading, setUploading] = useState(false);

  const entries = useQuery({
    queryKey: ["journal", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("id, body, entry_date, created_at, photos(id, storage_path, caption)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const photoUrls = useQuery({
    queryKey: ["journal-photo-urls", projectId, entries.data?.length],
    enabled: !!entries.data,
    queryFn: async () => {
      const paths = (entries.data ?? []).flatMap((e) => e.photos.map((p) => p.storage_path));
      if (paths.length === 0) return {};
      const { data, error } = await supabase.storage.from("photos").createSignedUrls(paths, 3600);
      if (error) throw error;
      return Object.fromEntries(data.map((d, i) => [paths[i]!, d.signedUrl]));
    },
  });

  const addEntry = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase
        .from("journal_entries")
        .insert({ project_id: projectId, body: text });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["journal", projectId] });
    },
  });

  const uploadPhoto = async (entryId: string, file: File) => {
    setUploading(true);
    try {
      const blob = await prepareImage(file);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("not signed in");
      const path = `${uid}/${projectId}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("photos")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { error } = await supabase
        .from("photos")
        .insert({ project_id: projectId, journal_entry_id: entryId, storage_path: path });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["journal", projectId] });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bp-panel p-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What happened in the shop today — deviations from plan, lessons, measurements…"
          rows={3}
          className="bp-dim w-full rounded-sm border border-bp-line-faint bg-bp-paper-deep p-3 text-sm text-bp-line outline-none focus:border-bp-accent"
        />
        <div className="mt-2 flex justify-end">
          <button onClick={() => body.trim() && addEntry.mutate(body.trim())} disabled={!body.trim()} className={btn}>
            Log entry
          </button>
        </div>
      </div>

      {entries.data?.map((e) => (
        <div key={e.id} className="bp-panel p-4">
          <p className="bp-dim mb-1 text-[10px] uppercase tracking-widest text-bp-line-soft">
            {new Date(e.created_at).toLocaleString()}
          </p>
          <p className="whitespace-pre-wrap text-sm">{e.body}</p>
          {e.photos.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {e.photos.map((p) =>
                photoUrls.data?.[p.storage_path] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed URLs expire; bypass next/image cache
                  <img
                    key={p.id}
                    src={photoUrls.data[p.storage_path]}
                    alt={p.caption ?? "progress photo"}
                    className="h-28 w-28 rounded-sm border border-bp-line-faint object-cover"
                  />
                ) : null,
              )}
            </div>
          )}
          <label className="bp-dim mt-3 inline-block cursor-pointer text-[11px] uppercase tracking-widest text-bp-line-soft hover:text-bp-accent">
            {uploading ? "uploading…" : "+ add photo"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(ev) => {
                const f = ev.target.files?.[0];
                if (f) uploadPhoto(e.id, f);
                ev.target.value = "";
              }}
            />
          </label>
        </div>
      ))}
      {entries.data?.length === 0 && (
        <p className="text-sm text-bp-line-soft">No entries yet — log your first shop session above.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function BudgetTab({ projectId }: { projectId: string }) {
  const supabase = supabaseBrowser();
  const qc = useQueryClient();
  const [vendor, setVendor] = useState("");
  const [total, setTotal] = useState("");

  const receipts = useQuery({
    queryKey: ["receipts", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipts")
        .select("id, vendor, total_cents, purchased_at")
        .eq("project_id", projectId)
        .order("purchased_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addReceipt = useMutation({
    mutationFn: async () => {
      const cents = Math.round(Number(total.replace(/[^0-9.]/g, "")) * 100);
      if (!Number.isFinite(cents) || cents <= 0) throw new Error("bad amount");
      const { error } = await supabase
        .from("receipts")
        .insert({ project_id: projectId, vendor: vendor || "Store", total_cents: cents });
      if (error) throw error;
    },
    onSuccess: () => {
      setVendor("");
      setTotal("");
      qc.invalidateQueries({ queryKey: ["receipts", projectId] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("receipts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["receipts", projectId] }),
  });

  const spent = receipts.data?.reduce((s, r) => s + r.total_cents, 0) ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="bp-panel flex flex-wrap items-end gap-3 p-4">
        <label className="flex flex-col gap-1">
          <span className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft">Vendor</span>
          <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Home Depot" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft">Total ($)</span>
          <input value={total} onChange={(e) => setTotal(e.target.value)} inputMode="decimal" placeholder="98.47" className={inputCls} />
        </label>
        <button onClick={() => addReceipt.mutate()} disabled={!total} className={btn}>
          Add receipt
        </button>
        <span className="bp-dim ml-auto text-sm text-bp-accent">
          Spent: ${(spent / 100).toFixed(2)}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {receipts.data?.map((r) => (
          <li key={r.id} className="bp-panel flex items-center justify-between p-3">
            <div>
              <p className="text-sm">{r.vendor}</p>
              <p className="bp-dim text-[11px] text-bp-line-soft">{r.purchased_at}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="bp-dim text-bp-accent">${(r.total_cents / 100).toFixed(2)}</span>
              <button
                onClick={() => remove.mutate(r.id)}
                className="bp-dim text-[10px] uppercase tracking-widest text-bp-danger hover:underline"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------

function VarianceTab({ projectId }: { projectId: string }) {
  const supabase = supabaseBrowser();
  const qc = useQueryClient();

  const designs = useQuery({
    queryKey: ["designs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("designs")
        .select("id, name, input")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  const estimates = useQuery({
    queryKey: ["estimates", projectId],
    queryFn: async () => {
      const designIds = designs.data?.map((d) => d.id) ?? [];
      if (designIds.length === 0) return [];
      const { data, error } = await supabase
        .from("material_estimates")
        .select("id, design_id, line_id, description, qty_estimated, unit, material_actuals(id, qty_purchased, qty_used, qty_leftover)")
        .in("design_id", designIds);
      if (error) throw error;
      return data;
    },
    enabled: !!designs.data,
  });

  const snapshot = useMutation({
    mutationFn: async (designId: string) => {
      const design = designs.data?.find((d) => d.id === designId);
      if (!design) throw new Error("design missing");
      const output = computeFraming(parseWallInput(design.input));
      const rows = output.shopping.map((l) => ({
        design_id: designId,
        line_id: l.id,
        description: l.description,
        qty_estimated: l.qty,
        unit: l.unit,
        unit_cost_cents: l.unitCostCents,
      }));
      // upsert on (design_id, line_id)
      const { error } = await supabase
        .from("material_estimates")
        .upsert(rows, { onConflict: "design_id,line_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimates", projectId] }),
  });

  const logActual = useMutation({
    mutationFn: async (payload: {
      estimateId: string;
      existingActualId?: string;
      purchased: number;
      used: number;
      leftover: number;
    }) => {
      if (payload.existingActualId) {
        const { error } = await supabase
          .from("material_actuals")
          .update({
            qty_purchased: payload.purchased,
            qty_used: payload.used,
            qty_leftover: payload.leftover,
          })
          .eq("id", payload.existingActualId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("material_actuals").insert({
          estimate_id: payload.estimateId,
          qty_purchased: payload.purchased,
          qty_used: payload.used,
          qty_leftover: payload.leftover,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimates", projectId] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="bp-panel flex flex-wrap items-center gap-3 p-4">
        <span className="bp-dim text-[11px] uppercase tracking-widest text-bp-line-soft">
          Snapshot estimates from design:
        </span>
        {designs.data?.map((d) => (
          <button key={d.id} onClick={() => snapshot.mutate(d.id)} disabled={snapshot.isPending} className={btn}>
            {d.name}
          </button>
        ))}
      </div>

      <p className="text-[12px] text-bp-line-soft">
        After the build, log what you actually bought/used/had left. Variance % teaches you how much
        overage your estimates really need.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-bp-line-faint text-left">
              {["Material", "Est.", "Bought", "Used", "Left", "Variance"].map((h) => (
                <th key={h} className="bp-dim py-2 pr-3 text-[10px] uppercase tracking-widest text-bp-line-soft">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {estimates.data?.map((e) => (
              <VarianceRow
                key={e.id}
                estimate={e}
                onLog={(purchased, used, leftover) =>
                  logActual.mutate({
                    estimateId: e.id,
                    existingActualId: e.material_actuals?.[0]?.id,
                    purchased,
                    used,
                    leftover,
                  })
                }
              />
            ))}
          </tbody>
        </table>
      </div>
      {estimates.data?.length === 0 && (
        <p className="text-sm text-bp-line-soft">
          No estimates yet — snapshot a design&apos;s shopping list above, go build, then log actuals.
        </p>
      )}
    </div>
  );
}

function VarianceRow({
  estimate,
  onLog,
}: {
  estimate: {
    id: string;
    description: string;
    qty_estimated: number;
    unit: string;
    material_actuals: { id: string; qty_purchased: number; qty_used: number; qty_leftover: number }[];
  };
  onLog: (purchased: number, used: number, leftover: number) => void;
}) {
  const actual = estimate.material_actuals?.[0];
  const [purchased, setPurchased] = useState(actual ? String(actual.qty_purchased) : "");
  const [used, setUsed] = useState(actual ? String(actual.qty_used) : "");
  const [leftover, setLeftover] = useState(actual ? String(actual.qty_leftover) : "");

  const variance =
    actual && estimate.qty_estimated > 0
      ? (((actual.qty_used - estimate.qty_estimated) / estimate.qty_estimated) * 100).toFixed(1)
      : null;

  const numCls = `${inputCls} h-9 w-16 text-center`;

  return (
    <tr className="border-b border-bp-line-faint/40">
      <td className="py-2 pr-3">{estimate.description}</td>
      <td className="bp-dim py-2 pr-3">
        {estimate.qty_estimated} {estimate.unit}
      </td>
      {[
        [purchased, setPurchased],
        [used, setUsed],
        [leftover, setLeftover],
      ].map(([val, set], i) => (
        <td key={i} className="py-2 pr-3">
          <input
            value={val as string}
            onChange={(e) => (set as (v: string) => void)(e.target.value)}
            onBlur={() => {
              const p = Number(purchased),
                u = Number(used),
                l = Number(leftover);
              if ([p, u, l].every((n) => Number.isFinite(n)) && (purchased || used || leftover)) {
                onLog(p || 0, u || 0, l || 0);
              }
            }}
            inputMode="decimal"
            className={numCls}
          />
        </td>
      ))}
      <td
        className={`bp-dim py-2 ${
          variance === null
            ? "text-bp-line-soft"
            : Number(variance) > 0
              ? "text-bp-danger"
              : "text-bp-ok"
        }`}
      >
        {variance === null ? "—" : `${Number(variance) > 0 ? "+" : ""}${variance}%`}
      </td>
    </tr>
  );
}
