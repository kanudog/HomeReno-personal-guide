"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TroubleshootWizard } from "@/components/electrical/TroubleshootWizard";

function WizardWithParams() {
  const params = useSearchParams();
  return (
    <TroubleshootWizard
      deviceId={params.get("device") ?? undefined}
      circuitId={params.get("circuit") ?? undefined}
    />
  );
}

export default function TroubleshootPage() {
  return (
    <main className="mx-auto w-full max-w-5xl grow px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <Link
          href="/electrical"
          className="bp-dim text-[11px] uppercase tracking-widest text-bp-line-soft hover:text-bp-accent"
        >
          ← Designer
        </Link>
        <h1 className="bp-panel-title text-xl">Multimeter Troubleshooter</h1>
      </header>
      <Suspense fallback={null}>
        <WizardWithParams />
      </Suspense>
    </main>
  );
}
