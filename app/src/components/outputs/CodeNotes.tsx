import { codeNotesFor, type CalloutKind } from "@/lib/modules/framing/data/codeNotes";

const KIND_COLOR: Record<CalloutKind, string> = {
  info: "var(--member-plate)",
  warn: "var(--bp-warn)",
  danger: "var(--bp-danger)",
  tip: "var(--bp-ok)",
  code: "var(--member-sill)",
};

export function CodeNotes({ jurisdiction = "us-nc-wake" }: { jurisdiction?: string }) {
  const notes = codeNotesFor("framing", jurisdiction);
  return (
    <div className="flex flex-col gap-3">
      {notes.map((n) => (
        <div
          key={n.id}
          className="rounded-sm border-l-4 bg-bp-paper-deep p-3"
          style={{ borderLeftColor: KIND_COLOR[n.kind] }}
        >
          <p className="bp-dim mb-1 text-[11px] uppercase tracking-widest" style={{ color: KIND_COLOR[n.kind] }}>
            {n.title}
          </p>
          <p className="text-sm text-bp-line-soft">{n.body}</p>
          {n.ref && <p className="bp-dim mt-1 text-[10px] text-bp-line-soft">Ref: {n.ref}</p>}
        </div>
      ))}
      <p className="bp-dim text-[10px] text-bp-line-soft">
        Jurisdiction: Wake County / Raleigh, NC — verify the currently adopted NC State Building Code
        edition before permitting.
      </p>
    </div>
  );
}
