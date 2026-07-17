import { describe, expect, it } from "vitest";
import { inches, type Sixteenths } from "@/lib/units";
import { computeFraming } from "../../framing";
import { FIXTURES as FRAMING_FIXTURES } from "../../framing/fixtures";
import { routeOnWall } from "./wallRouting";

const layoutOf = (name: keyof typeof FRAMING_FIXTURES) =>
  computeFraming(FRAMING_FIXTURES[name]!).layout;

const req = (x: number, heightAFF = 12) => ({
  deviceId: "d-test",
  displayName: "Receptacle 1",
  x: inches(x),
  heightAFF: inches(heightAFF),
});

describe("wall routing: plain-8ft", () => {
  const layout = layoutOf("plain-8ft");

  it("snaps the box against the nearest stud face", () => {
    const result = routeOnWall(layout, [req(60)]);
    expect(result.warnings).toEqual([]);
    const route = result.routes[0]!;
    // stud S5 is centered at 64": its left face puts the box's left edge at 61"
    expect(route.studId).toBe("S5");
    expect(route.side).toBe("left");
    expect(route.snappedX).toBe(inches(61));
  });

  it("bores every stud between the left entry and the box's bay", () => {
    const result = routeOnWall(layout, [req(60)]);
    expect(result.routes[0]!.boreHoles.map((h) => h.memberId)).toEqual(["S1", "S2", "S3", "S4"]);
    for (const h of result.routes[0]!.boreHoles) {
      expect(h.y).toBe(result.drillHeight);
    }
  });

  it("bores the mounting stud too when fed from the far side", () => {
    const result = routeOnWall(layout, [req(60)], { entry: "right" });
    // box on the LEFT face of S5 → a right-side feed must pass through S5
    expect(result.routes[0]!.boreHoles.map((h) => h.memberId)).toEqual(["S5", "S6", "S7"]);
  });

  it("dedupes shared holes across devices on the same run", () => {
    const result = routeOnWall(layout, [
      { ...req(30), deviceId: "d1" },
      { ...req(60), deviceId: "d2", displayName: "Receptacle 2" },
    ]);
    expect(result.routes).toHaveLength(2);
    const all = result.routes.flatMap((r) => r.boreHoles.map((h) => h.memberId));
    expect(all.length).toBeGreaterThan(result.combinedBoreHoles.length);
    expect(result.combinedBoreHoles.map((h) => h.memberId)).toEqual(["S1", "S2", "S3", "S4"]);
  });

  it("warns when the requested position is off the wall", () => {
    const result = routeOnWall(layout, [req(200)]);
    expect(result.routes).toHaveLength(0);
    expect(result.warnings[0]).toContain("outside the wall");
  });

  it("carries the nail-plate and stapling notes", () => {
    const result = routeOnWall(layout, [req(60)]);
    expect(result.notes.some((n) => n.includes("1 1/4"))).toBe(true);
    expect(result.notes.some((n) => n.includes("staple"))).toBe(true);
  });
});

describe("wall routing: window-12ft", () => {
  const layout = layoutOf("window-12ft");
  const ro = layout.roughOpenings[0]!;

  it("routes under the window sill without complaint (default drill height)", () => {
    const beyond = ((ro.x as number) + (ro.width as number)) / 16 + 8;
    const result = routeOnWall(layout, [req(beyond)]);
    expect(result.warnings).toEqual([]);
    // every bored member really exists at drill height
    for (const h of result.routes[0]!.boreHoles) {
      const member = layout.members.find((m) => m.id === h.memberId)!;
      expect(member.orientation).toBe("vertical");
      expect((member.y as number) <= (result.drillHeight as number)).toBe(true);
      expect((member.y as number) + (member.h as number)).toBeGreaterThanOrEqual(
        result.drillHeight as number,
      );
    }
  });

  it("bores the cripples under the sill on the way past the window", () => {
    const beyond = ((ro.x as number) + (ro.width as number)) / 16 + 8;
    const result = routeOnWall(layout, [req(beyond)]);
    const boredRoles = result.routes[0]!.boreHoles.map(
      (h) => layout.members.find((m) => m.id === h.memberId)!.role,
    );
    expect(boredRoles).toContain("cripple-below");
  });

  it("warns when the run would cross the opening itself", () => {
    const beyond = ((ro.x as number) + (ro.width as number)) / 16 + 8;
    const mid = ((ro.y as number) + 16) as Sixteenths;
    const result = routeOnWall(layout, [req(beyond)], { drillHeight: mid });
    expect(result.warnings.some((w) => w.includes("crosses"))).toBe(true);
  });
});
