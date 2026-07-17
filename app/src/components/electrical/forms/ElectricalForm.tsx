"use client";

import type {
  CableType,
  CircuitInput,
  DeviceInput,
  DeviceKind,
  RoomFacts,
  RoomType,
} from "@/lib/modules/electrical/types";
import type { Sixteenths, UnitSystem } from "@/lib/units";
import { DEVICES, deviceSpec } from "@/lib/modules/electrical/data/devices";
import { LOAD_PRESETS } from "@/lib/modules/electrical/data/loads";
import { MARKER_DEFAULTS, useElectrical } from "@/stores/electrical";
import { useRoom } from "@/stores/room";
import { TapeMeasureInput } from "@/components/measure/TapeMeasureInput";

const selectCls =
  "bp-dim h-9 rounded-sm border border-bp-line-faint bg-bp-paper-deep px-2 text-sm text-bp-line outline-none focus:border-bp-accent";
const numCls =
  "bp-dim h-9 w-20 rounded-sm border border-bp-line-faint bg-bp-paper-deep px-2 text-sm text-bp-line outline-none focus:border-bp-accent";
const tinyLabel = "bp-dim text-[9px] uppercase tracking-widest text-bp-line-soft";
const chipBase = "bp-dim rounded-sm border px-2 py-1 text-[10px] uppercase tracking-widest transition-colors";

const CABLE_OPTIONS: CableType[] = ["14/2", "12/2", "10/3", "8/3", "6/3", "6/2", "10/2", "12/3", "14/3", "8/2"];
const ROOM_TYPES: RoomType[] = [
  "laundry",
  "kitchen",
  "bathroom",
  "garage",
  "bedroom",
  "living",
  "basement-finished",
  "basement-unfinished",
  "outdoor",
  "other",
];
const WORK_LABELS: Record<DeviceInput["workType"], string> = {
  "new-work": "New run",
  "old-work": "Cut-in box",
  "existing-box": "Existing box",
};

function NumField({
  label,
  value,
  onChange,
  min = 1,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className={tinyLabel}>{label}</span>
      <input
        type="number"
        min={min}
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value === "" ? undefined : Number(e.target.value);
          onChange(v !== undefined && Number.isFinite(v) ? v : undefined);
        }}
        className={numCls}
      />
    </label>
  );
}

export function LoadRows({
  loads,
  onUpdate,
  onRemove,
  onAdd,
}: {
  loads: { id: string; name: string; va: number; qty: number; continuous: boolean }[];
  onUpdate: (id: string, patch: Partial<{ name: string; va: number; qty: number; continuous: boolean }>) => void;
  onRemove: (id: string) => void;
  onAdd: (preset?: { name: string; va: number; qty: number; continuous: boolean }) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {loads.map((l) => (
        <div key={l.id} className="flex flex-wrap items-end gap-2">
          <label className="flex grow flex-col gap-0.5">
            <span className={tinyLabel}>Load</span>
            <input
              type="text"
              value={l.name}
              onChange={(e) => onUpdate(l.id, { name: e.target.value })}
              className="bp-dim h-9 w-full min-w-28 rounded-sm border border-bp-line-faint bg-bp-paper-deep px-2 text-sm text-bp-line outline-none focus:border-bp-accent"
            />
          </label>
          <NumField label="VA" value={l.va} onChange={(v) => onUpdate(l.id, { va: v ?? 0 })} />
          <NumField label="Qty" value={l.qty} onChange={(v) => onUpdate(l.id, { qty: v ?? 1 })} />
          <label className="flex h-9 items-center gap-1.5">
            <input
              type="checkbox"
              checked={l.continuous}
              onChange={(e) => onUpdate(l.id, { continuous: e.target.checked })}
              className="h-4 w-4 accent-[var(--bp-accent)]"
            />
            <span className={tinyLabel}>3h+ (continuous)</span>
          </label>
          <button
            onClick={() => onRemove(l.id)}
            className="bp-dim h-9 rounded-sm border border-bp-line-faint px-2 text-[11px] text-bp-line-soft hover:border-bp-danger hover:text-bp-danger"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onAdd()}
          className={`${chipBase} border-bp-line-faint text-bp-line-soft hover:border-bp-accent hover:text-bp-accent`}
        >
          + Load
        </button>
        <select
          className={selectCls}
          value=""
          onChange={(e) => {
            const p = LOAD_PRESETS.find((x) => x.id === e.target.value);
            if (p) onAdd({ name: p.name, va: p.va, qty: 1, continuous: p.continuous });
          }}
        >
          <option value="">preset…</option>
          {LOAD_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.va} VA)
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function DeviceCard({
  circuit,
  device,
  rooms,
  system,
}: {
  circuit: CircuitInput;
  device: DeviceInput;
  rooms: RoomFacts[];
  system: UnitSystem;
}) {
  const updateDevice = useElectrical((s) => s.updateDevice);
  const removeDevice = useElectrical((s) => s.removeDevice);
  const selectDevice = useElectrical((s) => s.selectDevice);
  const selectedDeviceId = useElectrical((s) => s.selectedDeviceId);
  const planWalls = useRoom((s) => s.plan.walls);
  const spec = deviceSpec(device.kind);
  const config = spec?.configs.find((c) => c.id === device.config);
  const selected = selectedDeviceId === device.id;
  const marked = device.wallDesignId !== undefined;
  const room = rooms.find((r) => r.id === (device.roomId ?? circuit.roomId));

  const patch = (p: Partial<DeviceInput>) => updateDevice(circuit.id, device.id, p);

  return (
    <div
      onClick={() => selectDevice(device.id)}
      className={`rounded-sm border p-2.5 transition-colors ${
        selected ? "border-bp-accent bg-bp-paper-raised/40" : "border-bp-line-faint"
      }`}
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-0.5">
          <span className={tinyLabel}>Device</span>
          <select
            className={selectCls}
            value={device.kind}
            onChange={(e) => patch({ kind: e.target.value as DeviceKind })}
          >
            {DEVICES.map((d) => (
              <option key={d.kind} value={d.kind}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className={tinyLabel}>Situation</span>
          <select
            className={selectCls}
            value={device.config}
            onChange={(e) => {
              const next = spec?.configs.find((c) => c.id === e.target.value);
              patch({
                config: e.target.value,
                position: next?.validPositions[0] ?? device.position,
              });
            }}
          >
            {(spec?.configs ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className={tinyLabel}>Room</span>
          <select
            className={selectCls}
            value={device.roomId ?? circuit.roomId ?? ""}
            onChange={(e) => patch({ roomId: e.target.value || undefined })}
          >
            <option value="">—</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        {room?.type === "kitchen" && (
          <label className="flex flex-col gap-0.5">
            <span className={tinyLabel}>Location</span>
            <select
              className={selectCls}
              value={device.location ?? "wall"}
              onChange={(e) => patch({ location: e.target.value as "wall" | "counter" })}
            >
              <option value="wall">Wall</option>
              <option value="counter">Counter</option>
            </select>
          </label>
        )}
        <NumField
          label="Feed run (ft)"
          value={device.feedLengthFt}
          onChange={(v) => patch({ feedLengthFt: v })}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeDevice(circuit.id, device.id);
          }}
          className="bp-dim ml-auto h-9 rounded-sm border border-bp-line-faint px-2 text-[11px] text-bp-line-soft hover:border-bp-danger hover:text-bp-danger"
        >
          ✕
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {(Object.keys(WORK_LABELS) as DeviceInput["workType"][]).map((w) => (
          <button
            key={w}
            onClick={(e) => {
              e.stopPropagation();
              patch({ workType: w });
            }}
            className={`${chipBase} ${
              device.workType === w
                ? "border-bp-accent text-bp-accent"
                : "border-bp-line-faint text-bp-line-soft hover:text-bp-line"
            }`}
          >
            {WORK_LABELS[w]}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-bp-line-faint" />
        <label className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={marked}
            onChange={(e) =>
              patch(
                e.target.checked
                  ? {
                      wallDesignId: "scratch-wall",
                      xOnWall: device.xOnWall ?? MARKER_DEFAULTS.xOnWall,
                      heightAFF:
                        device.heightAFF ??
                        (device.kind.includes("switch") || device.kind.startsWith("dimmer")
                          ? MARKER_DEFAULTS.switchAFF
                          : MARKER_DEFAULTS.receptacleAFF),
                    }
                  : { wallDesignId: undefined, xOnWall: undefined, heightAFF: undefined },
              )
            }
            className="h-4 w-4 accent-[var(--bp-accent)]"
          />
          <span className={tinyLabel}>Mark on framed wall</span>
        </label>
        {marked && (
          <span className="flex items-end gap-2" onClick={(e) => e.stopPropagation()}>
            <label className="flex flex-col gap-0.5">
              <span className={tinyLabel}>Wall</span>
              <select
                className={selectCls}
                value={device.wallDesignId}
                onChange={(e) => patch({ wallDesignId: e.target.value })}
              >
                <option value="scratch-wall">Framing designer wall</option>
                {planWalls.map((w) => (
                  <option key={w.id} value={`room:${w.id}`}>
                    Planner: {w.name}
                  </option>
                ))}
              </select>
            </label>
            <TapeMeasureInput
              compact
              label="From wall left"
              value={(device.xOnWall ?? MARKER_DEFAULTS.xOnWall) as Sixteenths}
              onChange={(v) => patch({ xOnWall: v })}
              system={system}
            />
            <TapeMeasureInput
              compact
              label="Height AFF"
              value={(device.heightAFF ?? MARKER_DEFAULTS.receptacleAFF) as Sixteenths}
              onChange={(v) => patch({ heightAFF: v })}
              system={system}
            />
          </span>
        )}
      </div>

      {config && <p className="bp-dim mt-1.5 text-[10px] text-bp-line-soft">{config.description}</p>}

      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <a
          href={`/electrical/troubleshoot?device=${device.id}&circuit=${circuit.id}`}
          onClick={(e) => e.stopPropagation()}
          className="bp-dim text-[10px] uppercase tracking-widest text-bp-line-soft underline hover:text-bp-accent"
        >
          Not sure which wire is hot? →
        </a>
        {device.fieldNotes && (
          <span className="bp-dim flex items-center gap-1 rounded-sm bg-bp-paper-raised/60 px-2 py-0.5 text-[10px] text-bp-ok">
            📋 {device.fieldNotes}
            <button
              onClick={(e) => {
                e.stopPropagation();
                patch({ fieldNotes: undefined });
              }}
              className="ml-1 text-bp-line-soft hover:text-bp-danger"
              title="Clear field notes"
            >
              ✕
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

function CircuitPanel({
  circuit,
  rooms,
  system,
}: {
  circuit: CircuitInput;
  rooms: RoomFacts[];
  system: UnitSystem;
}) {
  const updateCircuit = useElectrical((s) => s.updateCircuit);
  const removeCircuit = useElectrical((s) => s.removeCircuit);
  const addDevice = useElectrical((s) => s.addDevice);
  const addLoad = useElectrical((s) => s.addLoad);
  const updateLoad = useElectrical((s) => s.updateLoad);
  const removeLoad = useElectrical((s) => s.removeLoad);

  return (
    <section className="bp-panel p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex grow flex-col gap-0.5">
          <span className={tinyLabel}>Circuit name</span>
          <input
            type="text"
            value={circuit.name}
            onChange={(e) => updateCircuit(circuit.id, { name: e.target.value })}
            className="bp-dim h-9 w-full min-w-36 rounded-sm border border-bp-line-faint bg-bp-paper-deep px-2 text-sm text-bp-line outline-none focus:border-bp-accent"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className={tinyLabel}>Breaker</span>
          <select
            className={selectCls}
            value={circuit.breakerAmps}
            onChange={(e) => updateCircuit(circuit.id, { breakerAmps: Number(e.target.value) })}
          >
            {[15, 20, 30, 40, 50].map((a) => (
              <option key={a} value={a}>
                {a}A
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className={tinyLabel}>Poles</span>
          <select
            className={selectCls}
            value={circuit.poles}
            onChange={(e) => updateCircuit(circuit.id, { poles: Number(e.target.value) as 1 | 2 })}
          >
            <option value={1}>1 (120V)</option>
            <option value={2}>2 (240V)</option>
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className={tinyLabel}>Type</span>
          <select
            className={selectCls}
            value={circuit.breakerType}
            onChange={(e) =>
              updateCircuit(circuit.id, { breakerType: e.target.value as CircuitInput["breakerType"] })
            }
          >
            <option value="standard">Standard</option>
            <option value="gfci">GFCI</option>
            <option value="afci">AFCI</option>
            <option value="dual-function">Dual-function</option>
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className={tinyLabel}>Cable</span>
          <select
            className={selectCls}
            value={circuit.cable}
            onChange={(e) => updateCircuit(circuit.id, { cable: e.target.value as CableType })}
          >
            {CABLE_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c} NM-B
              </option>
            ))}
          </select>
        </label>
        <NumField
          label="Slot"
          value={circuit.slot}
          onChange={(v) => updateCircuit(circuit.id, { slot: v })}
        />
        <label className="flex flex-col gap-0.5">
          <span className={tinyLabel}>Room</span>
          <select
            className={selectCls}
            value={circuit.roomId ?? ""}
            onChange={(e) => updateCircuit(circuit.id, { roomId: e.target.value || undefined })}
          >
            <option value="">—</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex h-9 items-center gap-1.5 self-end">
          <input
            type="checkbox"
            checked={circuit.existing}
            onChange={(e) => updateCircuit(circuit.id, { existing: e.target.checked })}
            className="h-4 w-4 accent-[var(--bp-accent)]"
          />
          <span className={tinyLabel}>Existing circuit</span>
        </label>
        <button
          onClick={() => removeCircuit(circuit.id)}
          className="bp-dim h-9 rounded-sm border border-bp-line-faint px-2 text-[11px] text-bp-line-soft hover:border-bp-danger hover:text-bp-danger"
        >
          Remove
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <p className={tinyLabel}>Devices (in circuit order, panel → end of run)</p>
        {circuit.devices.map((d) => (
          <DeviceCard key={d.id} circuit={circuit} device={d} rooms={rooms} system={system} />
        ))}
        <button
          onClick={() => addDevice(circuit.id)}
          className={`${chipBase} self-start border-bp-line-faint text-bp-line-soft hover:border-bp-accent hover:text-bp-accent`}
        >
          + Device
        </button>
      </div>

      <div className="mt-3">
        <p className={`${tinyLabel} mb-1.5`}>Plug-in / fixed loads on this circuit</p>
        <LoadRows
          loads={circuit.loads}
          onAdd={(preset) => addLoad(circuit.id, preset)}
          onUpdate={(id, patch) => updateLoad(circuit.id, id, patch)}
          onRemove={(id) => removeLoad(circuit.id, id)}
        />
      </div>
    </section>
  );
}

function RoomRow({ room, system }: { room: RoomFacts; system: UnitSystem }) {
  const updateRoom = useElectrical((s) => s.updateRoom);
  const removeRoom = useElectrical((s) => s.removeRoom);
  const setWall = (i: number, v: Sixteenths | null) => {
    const walls = [...room.wallLengths];
    if (v === null) walls.splice(i, 1);
    else walls[i] = v;
    updateRoom(room.id, { wallLengths: walls });
  };

  return (
    <div className="rounded-sm border border-bp-line-faint p-2.5">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex grow flex-col gap-0.5">
          <span className={tinyLabel}>Room</span>
          <input
            type="text"
            value={room.name}
            onChange={(e) => updateRoom(room.id, { name: e.target.value })}
            className="bp-dim h-9 w-full min-w-28 rounded-sm border border-bp-line-faint bg-bp-paper-deep px-2 text-sm text-bp-line outline-none focus:border-bp-accent"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className={tinyLabel}>Type</span>
          <select
            className={selectCls}
            value={room.type}
            onChange={(e) => updateRoom(room.id, { type: e.target.value as RoomType })}
          >
            {ROOM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => removeRoom(room.id)}
          className="bp-dim h-9 rounded-sm border border-bp-line-faint px-2 text-[11px] text-bp-line-soft hover:border-bp-danger hover:text-bp-danger"
        >
          ✕
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        {room.wallLengths.map((w, i) => (
          <span key={i} className="flex items-end gap-1">
            <TapeMeasureInput
              compact
              label={`Wall ${i + 1}`}
              value={w}
              onChange={(v) => setWall(i, v)}
              system={system}
            />
            <button
              onClick={() => setWall(i, null)}
              className="bp-dim h-9 text-[11px] text-bp-line-soft hover:text-bp-danger"
            >
              ✕
            </button>
          </span>
        ))}
        <button
          onClick={() =>
            updateRoom(room.id, { wallLengths: [...room.wallLengths, 1920 as Sixteenths] })
          }
          className={`${chipBase} border-bp-line-faint text-bp-line-soft hover:border-bp-accent hover:text-bp-accent`}
        >
          + Wall
        </button>
        {room.type === "kitchen" && (
          <>
            {(room.counterRunLengths ?? []).map((w, i) => (
              <TapeMeasureInput
                key={`c${i}`}
                compact
                label={`Counter ${i + 1}`}
                value={w}
                onChange={(v) => {
                  const runs = [...(room.counterRunLengths ?? [])];
                  runs[i] = v;
                  updateRoom(room.id, { counterRunLengths: runs });
                }}
                system={system}
              />
            ))}
            <button
              onClick={() =>
                updateRoom(room.id, {
                  counterRunLengths: [...(room.counterRunLengths ?? []), 768 as Sixteenths],
                })
              }
              className={`${chipBase} border-bp-line-faint text-bp-line-soft hover:border-bp-accent hover:text-bp-accent`}
            >
              + Counter
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function ElectricalForm({ system }: { system: UnitSystem }) {
  const input = useElectrical((s) => s.input);
  const setPanel = useElectrical((s) => s.setPanel);
  const addRoom = useElectrical((s) => s.addRoom);
  const addRoomWithWalls = useElectrical((s) => s.addRoomWithWalls);
  const addCircuit = useElectrical((s) => s.addCircuit);
  const planWalls = useRoom((s) => s.plan.walls);

  // Optional planner import: usable floor line per wall = drawn length minus
  // door openings (doors break the 210.52 wall line; windows don't).
  const importPlannedRoom = () => {
    const wallLengths = planWalls
      .map((w) => {
        const doors = w.openings
          .filter((o) => o.kind === "door")
          .reduce((n, o) => n + (o.unitWidth as number), 0);
        return ((w.length as number) - doors) as Sixteenths;
      })
      .filter((len) => (len as number) > 0);
    addRoomWithWalls("Planned room", wallLengths);
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="bp-panel p-3">
        <h3 className="bp-panel-title mb-2 text-sm">Panel</h3>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex grow flex-col gap-0.5">
            <span className={tinyLabel}>Label</span>
            <input
              type="text"
              value={input.panel.label}
              onChange={(e) => setPanel({ label: e.target.value })}
              className="bp-dim h-9 w-full min-w-32 rounded-sm border border-bp-line-faint bg-bp-paper-deep px-2 text-sm text-bp-line outline-none focus:border-bp-accent"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className={tinyLabel}>Main</span>
            <select
              className={selectCls}
              value={input.panel.mainAmps}
              onChange={(e) => setPanel({ mainAmps: Number(e.target.value) })}
            >
              {[100, 125, 150, 200].map((a) => (
                <option key={a} value={a}>
                  {a}A
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className={tinyLabel}>Spaces</span>
            <select
              className={selectCls}
              value={input.panel.slots}
              onChange={(e) => setPanel({ slots: Number(e.target.value) })}
            >
              {[20, 30, 40, 60].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="bp-panel p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="bp-panel-title text-sm">Rooms</h3>
          <div className="flex gap-1.5">
            {planWalls.length > 0 && (
              <button
                onClick={importPlannedRoom}
                title="Create a room from the Room Planner's walls (doors subtracted from the floor line)"
                className={`${chipBase} border-bp-line-faint text-bp-line-soft hover:border-bp-accent hover:text-bp-accent`}
              >
                ⤓ From planner
              </button>
            )}
            <button
              onClick={addRoom}
              className={`${chipBase} border-bp-line-faint text-bp-line-soft hover:border-bp-accent hover:text-bp-accent`}
            >
              + Room
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {input.rooms.map((r) => (
            <RoomRow key={r.id} room={r} system={system} />
          ))}
          {input.rooms.length === 0 && (
            <p className="bp-dim text-[11px] text-bp-line-soft">
              Add rooms to unlock GFCI-zone, spacing, and dedicated-circuit checks.
            </p>
          )}
        </div>
      </section>

      {input.circuits.map((c) => (
        <CircuitPanel key={c.id} circuit={c} rooms={input.rooms} system={system} />
      ))}
      <button
        onClick={addCircuit}
        className={`${chipBase} self-start border-bp-accent px-3 py-2 text-bp-accent hover:bg-bp-accent hover:text-bp-paper-deep`}
      >
        + Circuit
      </button>
    </div>
  );
}
