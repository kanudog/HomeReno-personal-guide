"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  TREE_START,
  treeNode,
  type ConclusionNode,
  type QuestionNode,
  type TreeTool,
} from "@/lib/modules/electrical/data/troubleshootTree";
import { useElectrical } from "@/stores/electrical";

const TOOL_LABELS: Record<TreeTool, string> = {
  multimeter: "Multimeter",
  ncv: "Non-contact tester",
  "plug-tester": "Plug-in tester",
  look: "Look / do",
};

const RESULT_COLORS: Record<ConclusionNode["result"], string> = {
  identified: "var(--bp-ok)",
  fixed: "var(--bp-ok)",
  fault: "var(--bp-warn)",
  escalate: "var(--bp-danger)",
};

interface Crumb {
  nodeId: string;
  answer: string;
}

export function TroubleshootWizard({
  deviceId,
  circuitId,
}: {
  deviceId?: string;
  circuitId?: string;
}) {
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const [currentId, setCurrentId] = useState(TREE_START);
  const [savedNote, setSavedNote] = useState(false);
  const input = useElectrical((s) => s.input);
  const updateDevice = useElectrical((s) => s.updateDevice);

  const node = treeNode(currentId);
  const targetDevice = useMemo(() => {
    if (!deviceId || !circuitId) return null;
    const circuit = input.circuits.find((c) => c.id === circuitId);
    const device = circuit?.devices.find((d) => d.id === deviceId);
    return device ? { circuit: circuit!, device } : null;
  }, [input, deviceId, circuitId]);

  const answer = (question: QuestionNode, label: string, next: string) => {
    setCrumbs((c) => [...c, { nodeId: question.id, answer: label }]);
    setCurrentId(next);
    setSavedNote(false);
  };

  const rewindTo = (index: number) => {
    const crumb = crumbs[index];
    if (!crumb) return;
    setCrumbs((c) => c.slice(0, index));
    setCurrentId(crumb.nodeId);
    setSavedNote(false);
  };

  const restart = () => {
    setCrumbs([]);
    setCurrentId(TREE_START);
    setSavedNote(false);
  };

  if (!node) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="bp-panel border-l-4 p-3" style={{ borderLeftColor: "var(--bp-danger)" }}>
        <p className="bp-dim text-[10px] uppercase tracking-widest text-bp-danger">
          Before anything else
        </p>
        <p className="mt-1 text-[13px] text-bp-line-soft">
          Unless a step explicitly says it's a live test, work with the breaker OFF and verified
          dead (the first flow proves it). Hold meter probes by the finger guards. When in doubt,
          stop — outlets are cheap, you aren't.
        </p>
      </div>

      {targetDevice && (
        <p className="bp-dim text-[11px] text-bp-line-soft">
          Troubleshooting for <span className="text-bp-accent">{targetDevice.circuit.name}</span> —
          findings can be saved to that device's field notes.
        </p>
      )}

      {crumbs.length > 0 && (
        <ol className="flex flex-col gap-1">
          {crumbs.map((c, i) => {
            const q = treeNode(c.nodeId);
            return (
              <li key={i}>
                <button
                  onClick={() => rewindTo(i)}
                  className="bp-dim text-left text-[11px] text-bp-line-soft hover:text-bp-accent"
                  title="Go back to this step"
                >
                  {i + 1}. {q?.kind === "question" ? q.title : c.nodeId} →{" "}
                  <span className="text-bp-line">{c.answer}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {node.kind === "question" ? (
        <section className="bp-panel p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="bp-dim rounded-sm border border-bp-accent px-2 py-0.5 text-[10px] uppercase tracking-widest text-bp-accent">
              {TOOL_LABELS[node.tool]}
            </span>
            <h2 className="bp-panel-title text-base">{node.title}</h2>
          </div>
          {node.setup && (
            <p className="bp-dim mb-2 rounded-sm bg-bp-paper-raised/50 p-2 text-[12px] text-bp-line">
              ⚙ {node.setup}
            </p>
          )}
          <p className="text-sm text-bp-line-soft">{node.instruction}</p>
          {node.illustration && (
            // eslint-disable-next-line @next/next/no-img-element -- static illustration
            <img
              src={node.illustration}
              alt={`Illustration: ${node.title}`}
              className="mt-3 w-full max-w-md rounded-sm border border-bp-line-faint"
              loading="lazy"
            />
          )}
          {node.safety && (
            <p className="bp-dim mt-2 rounded-sm border-l-4 p-2 text-[12px]" style={{ borderLeftColor: "var(--bp-danger)", color: "var(--bp-danger)" }}>
              ⚡ {node.safety}
            </p>
          )}
          <div className="mt-4 flex flex-col gap-2">
            {node.options.map((o) => (
              <button
                key={o.label}
                onClick={() => answer(node, o.label, o.next)}
                className="bp-dim rounded-sm border border-bp-line-faint px-3 py-2.5 text-left text-[13px] text-bp-line transition-colors hover:border-bp-accent hover:text-bp-accent"
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="bp-panel border-l-4 p-4" style={{ borderLeftColor: RESULT_COLORS[node.result] }}>
          <p className="bp-dim text-[10px] uppercase tracking-widest" style={{ color: RESULT_COLORS[node.result] }}>
            {node.result === "identified"
              ? "Identified"
              : node.result === "fixed"
                ? "Resolved"
                : node.result === "fault"
                  ? "Fault found"
                  : "Stop — get help"}
          </p>
          <h2 className="bp-panel-title mt-1 text-lg">{node.title}</h2>
          <p className="mt-2 text-sm text-bp-line-soft">{node.explanation}</p>
          {node.action && (
            <p className="mt-2 rounded-sm bg-bp-paper-raised/50 p-2.5 text-sm text-bp-line">
              → {node.action}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={restart}
              className="bp-dim rounded-sm border border-bp-line-faint px-3 py-1.5 text-[11px] uppercase tracking-widest text-bp-line-soft hover:border-bp-accent hover:text-bp-accent"
            >
              Start over
            </button>
            {targetDevice && node.fieldNote && (
              <button
                onClick={() => {
                  const date = new Date().toLocaleDateString();
                  const existing = targetDevice.device.fieldNotes;
                  updateDevice(targetDevice.circuit.id, targetDevice.device.id, {
                    fieldNotes: `${existing ? `${existing}; ` : ""}${node.fieldNote} (${date})`,
                  });
                  setSavedNote(true);
                }}
                disabled={savedNote}
                className="bp-dim rounded-sm border border-bp-accent px-3 py-1.5 text-[11px] uppercase tracking-widest text-bp-accent transition-colors enabled:hover:bg-bp-accent enabled:hover:text-bp-paper-deep disabled:opacity-50"
              >
                {savedNote ? "Saved to device ✓" : "Save to device notes"}
              </button>
            )}
            <Link
              href="/electrical"
              className="bp-dim rounded-sm border border-bp-line-faint px-3 py-1.5 text-[11px] uppercase tracking-widest text-bp-line-soft hover:border-bp-accent hover:text-bp-accent"
            >
              Back to designer
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
