/** Tool checklist for a framing job — editable data. */
export interface ToolItem {
  name: string;
  detail?: string;
  essential: boolean;
}

export const FRAMING_TOOLS: ToolItem[] = [
  { name: "Tape measure (25')", detail: "1/16\" gradations", essential: true },
  { name: "Speed square", detail: "marking square cuts + rafter angles", essential: true },
  { name: "Framing square", detail: "checking corners", essential: false },
  { name: "Chalk line", detail: "plate lines on the deck", essential: true },
  { name: "Circular saw or miter saw", detail: "crosscuts; miter saw is faster for repeat cuts", essential: true },
  { name: "Framing hammer (20–22 oz) or framing nailer", detail: "nailer + compressor speeds this up a lot", essential: true },
  { name: "4' level", detail: "plumbing the wall", essential: true },
  { name: "Carpenter pencils + lumber crayon", essential: true },
  { name: "Sawhorses (2)", essential: true },
  { name: "Clamps", detail: "holding plates for gang-marking", essential: false },
  { name: "Cat's paw / pry bar", detail: "pulling mis-driven nails", essential: false },
  { name: "Extension cord (12 ga)", essential: true },
  { name: "Safety glasses + hearing protection", essential: true },
  { name: "Work gloves", essential: false },
];
