"use client";

import { useEffect } from "react";
import { DesignerWorkspace } from "@/components/DesignerWorkspace";
import { useEditor } from "@/stores/editor";

/** Scratch designer — no account needed, state lives on this device. */
export default function DesignPage() {
  const bindDesign = useEditor((s) => s.bindDesign);
  useEffect(() => {
    bindDesign(null);
  }, [bindDesign]);

  return (
    <DesignerWorkspace title="Framing — Wall Designer" backHref="/" backLabel="HomeReno" />
  );
}
