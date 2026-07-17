/**
 * Typical appliance loads (volt-amps) — editable ballparks for the load
 * calculator and advisor presets. Use the nameplate when you have it;
 * these are deliberately conservative.
 */
export interface LoadPreset {
  id: string;
  name: string;
  va: number;
  /** Runs 3+ hours at a stretch → counts at 125% (NEC continuous load). */
  continuous: boolean;
}

export const LOAD_PRESETS: LoadPreset[] = [
  // The printing-room cast
  { id: "printer-fdm", name: "3D printer (FDM, heated bed)", va: 300, continuous: true },
  { id: "printer-large", name: "3D printer (large format / enclosed)", va: 600, continuous: true },
  { id: "led-shop-light", name: "LED shop light (4')", va: 40, continuous: true },
  { id: "ventilation-fan", name: "Ventilation / exhaust fan", va: 150, continuous: true },
  { id: "dehumidifier", name: "Dehumidifier", va: 700, continuous: true },
  // General
  { id: "computer", name: "Desktop computer + monitor", va: 400, continuous: true },
  { id: "tv", name: "TV / media", va: 200, continuous: false },
  { id: "washer", name: "Washing machine", va: 1200, continuous: false },
  { id: "freezer", name: "Chest freezer", va: 700, continuous: false },
  { id: "shop-vac", name: "Shop vac", va: 1100, continuous: false },
  { id: "miter-saw", name: "Miter saw", va: 1800, continuous: false },
  { id: "battery-charger", name: "Tool battery charger", va: 300, continuous: false },
  { id: "space-heater", name: "Space heater", va: 1500, continuous: true },
];
