import Link from "next/link";

const modules = [
  {
    id: "framing",
    title: "Framing",
    description:
      "Walls, door & window openings — stud layouts, rough openings, headers, cut lists, 3D assembly.",
    href: "/design",
    ready: true,
  },
  {
    id: "rooms",
    title: "Room Planner",
    description:
      "Draw connected walls top-down — corner framing details, per-wall elevations, whole-room cut list, combined 3D with view cube.",
    href: "/rooms",
    ready: true,
  },
  {
    id: "electrical",
    title: "Electrical",
    description:
      "Whole circuits, terminal-by-terminal wiring diagrams, box fill & breaker checks, and a one-breaker-or-two load advisor.",
    href: "/electrical",
    ready: true,
  },
  {
    id: "plumbing",
    title: "Plumbing",
    description:
      "DWV routing with real slope math, vent rules, supply layouts, rough-in heights.",
    href: "#",
    ready: false,
  },
  {
    id: "drop-ceiling",
    title: "Drop Ceiling",
    description:
      "Balanced-border grid layout, tee placement, hanger wires, tile & LED panel counts.",
    href: "#",
    ready: false,
  },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl grow px-6 py-10 flex flex-col gap-10">
      <header className="border-2 border-bp-line-faint bg-bp-paper-deep/60 px-6 py-8">
        <p className="bp-dim text-xs tracking-[0.3em] text-bp-line-soft uppercase">
          Sheet A-001 · Rev 0
        </p>
        <h1 className="bp-panel-title mt-2 text-4xl sm:text-5xl">HomeReno</h1>
        <p className="mt-3 max-w-2xl text-bp-line-soft">
          Parametric DIY renovation assistant. Enter your exact dimensions —
          down to 1/16&Prime; — and generate stud layouts, cut lists, diagrams,
          and shopping lists for your project.
        </p>
      </header>

      <section>
        <Link
          href="/projects"
          className="bp-panel block border-bp-accent/60 p-5 transition-colors hover:border-bp-accent"
        >
          <div className="flex items-center justify-between">
            <h3 className="bp-panel-title text-base">My Projects</h3>
            <span className="bp-dim rounded-sm border border-bp-accent px-2 py-0.5 text-[10px] uppercase tracking-widest text-bp-accent">
              Sign in
            </span>
          </div>
          <p className="mt-2 text-sm text-bp-line-soft">
            Saved wall designs, task checklists, photo journal, budget, and material variance —
            synced to your account.
          </p>
        </Link>
      </section>

      <section>
        <h2 className="bp-panel-title text-lg mb-4">Trade Modules</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {modules.map((m) =>
            m.ready ? (
              <Link
                key={m.id}
                href={m.href}
                className="bp-panel block p-5 transition-colors hover:border-bp-accent"
              >
                <div className="flex items-center justify-between">
                  <h3 className="bp-panel-title text-base">{m.title}</h3>
                  <span className="bp-dim rounded-sm border border-bp-accent px-2 py-0.5 text-[10px] uppercase tracking-widest text-bp-accent">
                    Open
                  </span>
                </div>
                <p className="mt-2 text-sm text-bp-line-soft">{m.description}</p>
              </Link>
            ) : (
              <div key={m.id} className="bp-panel block p-5 opacity-55">
                <div className="flex items-center justify-between">
                  <h3 className="bp-panel-title text-base">{m.title}</h3>
                  <span className="bp-dim rounded-sm border border-bp-line-faint px-2 py-0.5 text-[10px] uppercase tracking-widest text-bp-line-soft">
                    Planned
                  </span>
                </div>
                <p className="mt-2 text-sm text-bp-line-soft">{m.description}</p>
              </div>
            ),
          )}
        </div>
      </section>

      <section>
        <h2 className="bp-panel-title text-lg mb-4">Reference</h2>
        <a
          href="/guides/index.html"
          className="bp-panel block p-5 transition-colors hover:border-bp-accent"
        >
          <div className="flex items-center justify-between">
            <h3 className="bp-panel-title text-base">Guide Library</h3>
            <span className="bp-dim rounded-sm border border-bp-accent px-2 py-0.5 text-[10px] uppercase tracking-widest text-bp-accent">
              Open
            </span>
          </div>
          <p className="mt-2 text-sm text-bp-line-soft">
            The original HomeReno reference guides — bathroom plumbing rough-in
            and everything added from video walkthroughs.
          </p>
        </a>
      </section>

      <footer className="mt-auto">
        <div className="ml-auto w-full max-w-sm border-2 border-bp-line-faint">
          <div className="grid grid-cols-2 text-[11px]">
            <div className="border-b border-r border-bp-line-faint px-3 py-1.5">
              <span className="text-bp-line-soft">PROJECT</span>
              <div className="bp-dim">HomeReno</div>
            </div>
            <div className="border-b border-bp-line-faint px-3 py-1.5">
              <span className="text-bp-line-soft">JURISDICTION</span>
              <div className="bp-dim">Wake County, NC</div>
            </div>
            <div className="border-r border-bp-line-faint px-3 py-1.5">
              <span className="text-bp-line-soft">SCALE</span>
              <div className="bp-dim">AS NOTED</div>
            </div>
            <div className="px-3 py-1.5">
              <span className="text-bp-line-soft">UNITS</span>
              <div className="bp-dim">1/16&Prime; PRECISION</div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
