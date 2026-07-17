"use client";

import { useEffect } from "react";
import { ElectricalWorkspace } from "@/components/electrical/ElectricalWorkspace";
import { useElectrical } from "@/stores/electrical";

/** Scratch electrical designer — no account needed, state lives on this device. */
export default function ElectricalPage() {
  const bindDesign = useElectrical((s) => s.bindDesign);
  useEffect(() => {
    bindDesign(null);
  }, [bindDesign]);

  return (
    <ElectricalWorkspace
      title="Electrical — Circuit Designer"
      backHref="/"
      backLabel="HomeReno"
    />
  );
}
