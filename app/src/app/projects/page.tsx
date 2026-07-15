"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";

interface ProjectRow {
  id: string;
  name: string;
  status: string;
  created_at: string;
  designs: { count: number }[];
}

export default function ProjectsPage() {
  const supabase = supabaseBrowser();
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async (): Promise<ProjectRow[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status, created_at, designs(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProjectRow[];
    },
  });

  const createProject = useMutation({
    mutationFn: async (projectName: string) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({ name: projectName })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    location.href = "/";
  };

  return (
    <main className="mx-auto w-full max-w-4xl grow px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="bp-dim text-[11px] uppercase tracking-widest text-bp-line-soft hover:text-bp-accent"
          >
            ← HomeReno
          </Link>
          <h1 className="bp-panel-title text-xl">Projects</h1>
        </div>
        <button
          onClick={signOut}
          className="bp-dim text-[11px] uppercase tracking-widest text-bp-line-soft hover:text-bp-danger"
        >
          Sign out
        </button>
      </header>

      <div className="bp-panel mb-6 flex flex-wrap items-end gap-3 p-4">
        <label className="flex grow flex-col gap-1">
          <span className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft">
            New project name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && createProject.mutate(name.trim())}
            placeholder="Garage partition wall"
            className="bp-dim h-11 w-full rounded-sm border border-bp-line-faint bg-bp-paper-deep px-3 text-bp-line outline-none focus:border-bp-accent"
          />
        </label>
        <button
          onClick={() => name.trim() && createProject.mutate(name.trim())}
          disabled={!name.trim() || createProject.isPending}
          className="bp-dim h-11 rounded-sm border border-bp-accent px-4 text-[11px] uppercase tracking-widest text-bp-accent transition-colors enabled:hover:bg-bp-accent enabled:hover:text-bp-paper-deep disabled:opacity-40"
        >
          Create
        </button>
      </div>

      {projects.isLoading && <p className="text-bp-line-soft">Loading projects…</p>}
      {projects.error && (
        <p className="text-bp-danger">Couldn&apos;t load projects: {String(projects.error)}</p>
      )}

      <div className="flex flex-col gap-3">
        {projects.data?.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="bp-panel flex items-center justify-between p-4 transition-colors hover:border-bp-accent"
          >
            <div>
              <h2 className="bp-panel-title text-base">{p.name}</h2>
              <p className="bp-dim mt-1 text-[11px] text-bp-line-soft">
                {p.designs?.[0]?.count ?? 0} design(s) · started{" "}
                {new Date(p.created_at).toLocaleDateString()}
              </p>
            </div>
            <span className="bp-dim rounded-sm border border-bp-line-faint px-2 py-1 text-[10px] uppercase tracking-widest text-bp-line-soft">
              {p.status}
            </span>
          </Link>
        ))}
        {projects.data?.length === 0 && (
          <p className="text-sm text-bp-line-soft">No projects yet — create your first one above.</p>
        )}
      </div>
    </main>
  );
}
