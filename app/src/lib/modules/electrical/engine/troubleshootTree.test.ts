import { describe, expect, it } from "vitest";
import {
  TREE_START,
  TROUBLESHOOT_TREE,
  treeNode,
} from "../data/troubleshootTree";

describe("troubleshoot tree structure", () => {
  it("has unique node ids", () => {
    const ids = TROUBLESHOOT_TREE.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("starts at a question node", () => {
    const start = treeNode(TREE_START);
    expect(start?.kind).toBe("question");
  });

  it("every option points at a real node", () => {
    for (const node of TROUBLESHOOT_TREE) {
      if (node.kind !== "question") continue;
      expect(node.options.length).toBeGreaterThan(0);
      for (const opt of node.options) {
        expect(treeNode(opt.next), `${node.id} → ${opt.next}`).toBeDefined();
      }
    }
  });

  it("every node is reachable from start", () => {
    const seen = new Set<string>();
    const queue = [TREE_START];
    while (queue.length > 0) {
      const id = queue.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const node = treeNode(id)!;
      if (node.kind === "question") queue.push(...node.options.map((o) => o.next));
    }
    for (const node of TROUBLESHOOT_TREE) {
      expect(seen.has(node.id), `${node.id} reachable`).toBe(true);
    }
  });

  it("is acyclic — every path terminates at a conclusion", () => {
    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;
    const color = new Map<string, number>();
    const visit = (id: string, path: string[]) => {
      const state = color.get(id) ?? WHITE;
      if (state === GRAY) {
        throw new Error(`cycle: ${[...path, id].join(" → ")}`);
      }
      if (state === BLACK) return;
      color.set(id, GRAY);
      const node = treeNode(id)!;
      if (node.kind === "question") {
        for (const opt of node.options) visit(opt.next, [...path, id]);
      }
      color.set(id, BLACK);
    };
    expect(() => visit(TREE_START, [])).not.toThrow();
  });

  it("uses only the tools Sebastian owns", () => {
    const owned = new Set(["multimeter", "ncv", "plug-tester", "look"]);
    for (const node of TROUBLESHOOT_TREE) {
      if (node.kind === "question") expect(owned.has(node.tool)).toBe(true);
    }
  });

  it("live tests carry a safety strip", () => {
    // Every question that instructs restoring power must flag safety on
    // that node or its immediate children.
    for (const node of TROUBLESHOOT_TREE) {
      if (node.kind !== "question") continue;
      if (!/restore (the breaker|power)|power (is back|restored)/i.test(node.instruction)) continue;
      const selfOrChildren = [
        node,
        ...node.options.map((o) => treeNode(o.next)!),
      ];
      const flagged = selfOrChildren.some(
        (n) => n.kind === "question" && n.safety !== undefined,
      );
      expect(flagged, `${node.id} needs a safety strip`).toBe(true);
    }
  });

  it("golden path: dead outlet → open neutral", () => {
    // start → do-1 (still dead) → do-2 (no lights) → do-3 (0V) → do-4 (120V) → open neutral
    const path = ["start", "do-1", "do-2", "do-3", "do-4", "c-open-neutral"];
    for (let i = 0; i < path.length - 1; i++) {
      const node = treeNode(path[i]!)!;
      expect(node.kind).toBe("question");
      const nexts = (node as { options: { next: string }[] }).options.map((o) => o.next);
      expect(nexts, `${path[i]} can reach ${path[i + 1]}`).toContain(path[i + 1]);
    }
    expect(treeNode("c-open-neutral")?.kind).toBe("conclusion");
  });
});
