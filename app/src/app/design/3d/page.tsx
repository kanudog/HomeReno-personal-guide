"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { computeFraming } from "@/lib/modules/framing";
import { useEditor } from "@/stores/editor";

// three must never run on the server
const FramingScene = dynamic(
  () => import("@/components/three/FramingScene").then((m) => m.FramingScene),
  { ssr: false, loading: () => <p className="p-6 text-bp-line-soft">Loading 3D…</p> },
);

export default function ThreeDPage() {
  const wall = useEditor((s) => s.wall);
  const output = useMemo(() => {
    try {
      return computeFraming(wall);
    } catch {
      return null;
    }
  }, [wall]);

  return (
    <main className="mx-auto w-full max-w-6xl grow px-4 py-6 sm:px-6">
      <header className="mb-5 flex items-center gap-4">
        <Link
          href="/design"
          className="bp-dim text-[11px] uppercase tracking-widest text-bp-line-soft hover:text-bp-accent"
        >
          ← Designer
        </Link>
        <h1 className="bp-panel-title text-xl">3D Assembly</h1>
      </header>
      {output ? (
        <FramingScene layout={output.layout} />
      ) : (
        <p className="text-bp-danger">This wall can&apos;t be framed — check the dimensions.</p>
      )}
    </main>
  );
}
