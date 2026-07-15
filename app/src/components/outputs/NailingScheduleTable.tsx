import type { NailingEntry } from "@/lib/modules/framing/types";

export function NailingScheduleTable({ nailing }: { nailing: NailingEntry[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-bp-line-faint text-left">
          <th className="bp-dim py-2 pr-3 text-[10px] uppercase tracking-widest text-bp-line-soft">Joint</th>
          <th className="bp-dim py-2 pr-3 text-[10px] uppercase tracking-widest text-bp-line-soft">Fastener</th>
          <th className="bp-dim py-2 pr-3 text-[10px] uppercase tracking-widest text-bp-line-soft">Pattern</th>
          <th className="bp-dim py-2 pr-3 text-[10px] uppercase tracking-widest text-bp-line-soft">≈ Count</th>
          <th className="bp-dim py-2 text-[10px] uppercase tracking-widest text-bp-line-soft">Code</th>
        </tr>
      </thead>
      <tbody>
        {nailing.map((n, i) => (
          <tr key={i} className="border-b border-bp-line-faint/40">
            <td className="py-1.5 pr-3">{n.joint}</td>
            <td className="bp-dim py-1.5 pr-3">{n.fastener}</td>
            <td className="py-1.5 pr-3 text-bp-line-soft">{n.pattern}</td>
            <td className="bp-dim py-1.5 pr-3 text-bp-accent">{n.count}</td>
            <td className="bp-dim py-1.5 text-[11px] text-bp-line-soft">{n.codeRef ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
