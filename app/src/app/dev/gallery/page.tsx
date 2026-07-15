import { computeFraming } from "@/lib/modules/framing";
import { FIXTURES } from "@/lib/modules/framing/fixtures";
import { WallElevation } from "@/components/svg/WallElevation";
import { formatLength } from "@/lib/units";

/**
 * Visual QA surface: every golden fixture rendered at once.
 * Server component — the engine and elevation are pure.
 */
export default function GalleryPage() {
  return (
    <main className="mx-auto w-full max-w-6xl grow px-6 py-8">
      <h1 className="bp-panel-title mb-6 text-2xl">Fixture Gallery</h1>
      <div className="flex flex-col gap-10">
        {Object.entries(FIXTURES).map(([name, wall]) => {
          const out = computeFraming(wall);
          return (
            <section key={name} className="bp-panel p-4">
              <h2 className="bp-panel-title mb-1 text-base">{name}</h2>
              <p className="bp-dim mb-3 text-[11px] text-bp-line-soft">
                {formatLength(wall.length, { feetInches: true })} ×{" "}
                {formatLength(wall.height, { feetInches: true })} · {wall.studSize} @{" "}
                {formatLength(wall.spacingOC)} OC · {out.layout.members.length} members ·{" "}
                {out.packing.precuts.reduce((s, p) => s + p.qty, 0)} precuts +{" "}
                {out.packing.boards.length} boards
                {out.layout.warnings.length > 0 &&
                  ` · ⚠ ${out.layout.warnings.length} warning(s)`}
              </p>
              <WallElevation layout={out.layout} className="h-auto w-full" />
              <details className="mt-2">
                <summary className="bp-dim cursor-pointer text-[11px] uppercase tracking-widest text-bp-line-soft">
                  Cut list JSON
                </summary>
                <pre className="mt-2 overflow-x-auto rounded-sm bg-bp-paper-deep p-3 text-[11px] text-bp-line-soft">
                  {JSON.stringify(
                    out.cutList.map((c) => ({
                      label: c.label,
                      size: c.size,
                      length: formatLength(c.length),
                      qty: c.qty,
                    })),
                    null,
                    2,
                  )}
                </pre>
              </details>
            </section>
          );
        })}
      </div>
    </main>
  );
}
