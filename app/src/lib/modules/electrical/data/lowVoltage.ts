/**
 * Low-voltage electronics sub-catalog (phase 7): smart-home builds around
 * ESP32 + ESPHome. Everything here is Class-2 low voltage (5–12V DC) —
 * deliberately NOT mains. Recipes are complete, wired, and power-budgeted.
 */

export type LvPinRole = "power-in" | "power-out" | "gnd" | "gpio" | "signal" | "load";

export interface LvPin {
  id: string;
  label: string;
  role: LvPinRole;
}

export interface LvComponent {
  id: string;
  label: string;
  kind: "controller" | "power" | "sensor" | "actuator" | "light" | "accessory";
  pins: LvPin[];
  /** Typical draw in mA (worst realistic case) — drives the power budget. */
  drawMa?: number;
  /** Power supplies: rated output. */
  supplyMa?: number;
  supplyVolts?: number;
  priceCents: number;
  shoppingQuery: string;
  note?: string;
}

export const LV_COMPONENTS: LvComponent[] = [
  {
    id: "esp32-devkit",
    label: "ESP32 DevKit",
    kind: "controller",
    pins: [
      { id: "vin", label: "VIN (5V)", role: "power-in" },
      { id: "3v3", label: "3V3 out", role: "power-out" },
      { id: "gnd", label: "GND", role: "gnd" },
      { id: "gpio5", label: "GPIO 5", role: "gpio" },
      { id: "gpio13", label: "GPIO 13", role: "gpio" },
      { id: "gpio14", label: "GPIO 14", role: "gpio" },
      { id: "gpio16", label: "GPIO 16", role: "gpio" },
    ],
    drawMa: 160,
    priceCents: 899,
    shoppingQuery: "ESP32 devkit development board",
    note: "Flash it with ESPHome — it joins Home Assistant automatically.",
  },
  {
    id: "psu-12v-2a",
    label: "12V 2A power supply",
    kind: "power",
    pins: [
      { id: "v+", label: "12V +", role: "power-out" },
      { id: "v-", label: "GND −", role: "gnd" },
    ],
    supplyMa: 2000,
    supplyVolts: 12,
    priceCents: 1299,
    shoppingQuery: "12V 2A DC power supply 2.1mm",
  },
  {
    id: "psu-5v-3a",
    label: "5V 3A power supply",
    kind: "power",
    pins: [
      { id: "v+", label: "5V +", role: "power-out" },
      { id: "v-", label: "GND −", role: "gnd" },
    ],
    supplyMa: 3000,
    supplyVolts: 5,
    priceCents: 1199,
    shoppingQuery: "5V 3A DC power supply",
  },
  {
    id: "psu-usb-5v",
    label: "USB 5V adapter + cable",
    kind: "power",
    pins: [
      { id: "v+", label: "5V (USB)", role: "power-out" },
      { id: "v-", label: "GND (USB)", role: "gnd" },
    ],
    supplyMa: 1000,
    supplyVolts: 5,
    priceCents: 899,
    shoppingQuery: "USB power adapter 5V 2A micro usb cable",
  },
  {
    id: "buck-12-5",
    label: "Buck converter 12V→5V",
    kind: "power",
    pins: [
      { id: "in+", label: "IN + (12V)", role: "power-in" },
      { id: "in-", label: "IN −", role: "gnd" },
      { id: "out+", label: "OUT + (5V)", role: "power-out" },
      { id: "out-", label: "OUT −", role: "gnd" },
    ],
    priceCents: 649,
    shoppingQuery: "buck converter 12v to 5v 3a",
    note: "Set the output to 5.0V with a meter BEFORE connecting the ESP32.",
  },
  {
    id: "pir-hcsr501",
    label: "PIR motion sensor (HC-SR501)",
    kind: "sensor",
    pins: [
      { id: "vcc", label: "VCC (5V)", role: "power-in" },
      { id: "out", label: "OUT", role: "signal" },
      { id: "gnd", label: "GND", role: "gnd" },
    ],
    drawMa: 50,
    priceCents: 599,
    shoppingQuery: "HC-SR501 PIR motion sensor",
    note: "Two potentiometers on board: sensitivity and hold time.",
  },
  {
    id: "reed-door",
    label: "Magnetic door/window reed switch",
    kind: "sensor",
    pins: [
      { id: "a", label: "Terminal A", role: "signal" },
      { id: "b", label: "Terminal B", role: "signal" },
    ],
    drawMa: 1,
    priceCents: 499,
    shoppingQuery: "magnetic reed switch door sensor normally closed",
  },
  {
    id: "mosfet-mod",
    label: "MOSFET module (PWM dimmer)",
    kind: "actuator",
    pins: [
      { id: "vin+", label: "VIN + (12V)", role: "power-in" },
      { id: "vin-", label: "VIN −", role: "gnd" },
      { id: "sig", label: "SIG (PWM)", role: "signal" },
      { id: "out+", label: "OUT +", role: "load" },
      { id: "out-", label: "OUT −", role: "load" },
    ],
    drawMa: 5,
    priceCents: 749,
    shoppingQuery: "mosfet driver module PWM 5-36V",
  },
  {
    id: "relay-1ch",
    label: "1-channel relay module (5V)",
    kind: "actuator",
    pins: [
      { id: "vcc", label: "VCC (5V)", role: "power-in" },
      { id: "gnd", label: "GND", role: "gnd" },
      { id: "in", label: "IN", role: "signal" },
      { id: "com", label: "COM", role: "load" },
      { id: "no", label: "NO", role: "load" },
    ],
    drawMa: 70,
    priceCents: 649,
    shoppingQuery: "5v relay module 1 channel optocoupler",
    note: "LOW-VOLTAGE loads only in these recipes — switching 120V is a different project with enclosure and separation rules.",
  },
  {
    id: "led-strip-12v",
    label: "12V LED strip (per meter)",
    kind: "light",
    pins: [
      { id: "v+", label: "+12V", role: "power-in" },
      { id: "v-", label: "GND −", role: "gnd" },
    ],
    drawMa: 480,
    priceCents: 799,
    shoppingQuery: "12v led strip warm white",
  },
  {
    id: "ws2812b-strip",
    label: "WS2812B addressable strip (per meter)",
    kind: "light",
    pins: [
      { id: "5v", label: "+5V", role: "power-in" },
      { id: "din", label: "DIN (data)", role: "signal" },
      { id: "gnd", label: "GND", role: "gnd" },
    ],
    drawMa: 900,
    priceCents: 1199,
    shoppingQuery: "WS2812B led strip 30 led per meter",
    note: "Typical draw ~900mA/m; full-white max is nearly double — budget accordingly.",
  },
  {
    id: "load-12v",
    label: "12V load (fan / lamp / lock)",
    kind: "actuator",
    pins: [
      { id: "v+", label: "+12V", role: "power-in" },
      { id: "v-", label: "GND −", role: "gnd" },
    ],
    drawMa: 500,
    priceCents: 0,
    shoppingQuery: "12v dc fan",
    note: "Your device — check its nameplate draw against the budget.",
  },
  {
    id: "resistor-330",
    label: "330Ω resistor (data line)",
    kind: "accessory",
    pins: [],
    priceCents: 99,
    shoppingQuery: "330 ohm resistor pack",
  },
  {
    id: "cap-1000uf",
    label: "1000µF capacitor (strip power)",
    kind: "accessory",
    pins: [],
    priceCents: 199,
    shoppingQuery: "1000uf 16v electrolytic capacitor",
  },
  {
    id: "dupont-set",
    label: "Dupont jumper wires + lever connectors",
    kind: "accessory",
    pins: [],
    priceCents: 799,
    shoppingQuery: "dupont jumper wires kit wago 221 mini",
  },
  {
    id: "project-box",
    label: "Project enclosure",
    kind: "accessory",
    pins: [],
    priceCents: 899,
    shoppingQuery: "abs project box enclosure",
  },
];

export type LvWireColor = "red" | "black" | "yellow" | "green" | "blue" | "white";

export interface LvWire {
  from: { ref: string; pin: string };
  to: { ref: string; pin: string };
  color: LvWireColor;
  note?: string;
}

export interface LvRecipe {
  id: string;
  label: string;
  description: string;
  /** Component instances; ref is the wiring handle. */
  components: { ref: string; componentId: string; qty?: number; label?: string }[];
  /** The primary supply ref for the power budget. */
  psuRef: string;
  wires: LvWire[];
  steps: string[];
  cautions: string[];
  esphomeYaml?: string;
}

export const LV_RECIPES: LvRecipe[] = [
  {
    id: "motion-shop-light",
    label: "Motion-activated 12V shop light",
    description:
      "A PIR sensor tells the ESP32 someone walked in; the ESP32 fades a 12V LED strip up through a MOSFET, then off after a hold time. All 12V — perfect over a workbench.",
    components: [
      { ref: "psu", componentId: "psu-12v-2a" },
      { ref: "buck", componentId: "buck-12-5" },
      { ref: "esp", componentId: "esp32-devkit" },
      { ref: "pir", componentId: "pir-hcsr501" },
      { ref: "mosfet", componentId: "mosfet-mod" },
      { ref: "strip", componentId: "led-strip-12v", qty: 2, label: "12V strip (2m)" },
      { ref: "wires", componentId: "dupont-set" },
      { ref: "box", componentId: "project-box" },
    ],
    psuRef: "psu",
    wires: [
      { from: { ref: "psu", pin: "v+" }, to: { ref: "mosfet", pin: "vin+" }, color: "yellow" },
      { from: { ref: "psu", pin: "v-" }, to: { ref: "mosfet", pin: "vin-" }, color: "black" },
      { from: { ref: "psu", pin: "v+" }, to: { ref: "buck", pin: "in+" }, color: "yellow" },
      { from: { ref: "psu", pin: "v-" }, to: { ref: "buck", pin: "in-" }, color: "black" },
      { from: { ref: "buck", pin: "out+" }, to: { ref: "esp", pin: "vin" }, color: "red", note: "verify 5.0V before connecting" },
      { from: { ref: "buck", pin: "out-" }, to: { ref: "esp", pin: "gnd" }, color: "black" },
      { from: { ref: "buck", pin: "out+" }, to: { ref: "pir", pin: "vcc" }, color: "red" },
      { from: { ref: "buck", pin: "out-" }, to: { ref: "pir", pin: "gnd" }, color: "black" },
      { from: { ref: "pir", pin: "out" }, to: { ref: "esp", pin: "gpio13" }, color: "green" },
      { from: { ref: "esp", pin: "gpio16" }, to: { ref: "mosfet", pin: "sig" }, color: "blue" },
      { from: { ref: "mosfet", pin: "out+" }, to: { ref: "strip", pin: "v+" }, color: "yellow" },
      { from: { ref: "mosfet", pin: "out-" }, to: { ref: "strip", pin: "v-" }, color: "black" },
    ],
    steps: [
      "Set the buck converter to 5.0V with your multimeter BEFORE anything else is connected.",
      "Wire the power side first: 12V supply to the MOSFET VIN and buck input; buck 5V output to the ESP32 VIN/GND and the PIR.",
      "Signal wires next: PIR OUT to GPIO 13, GPIO 16 to the MOSFET SIG.",
      "Strip last: MOSFET OUT to the LED strip. Test with the ESPHome config below.",
      "Tune the PIR's two pots: sensitivity low-ish, hold time short — let ESPHome own the off-delay.",
      "Mount it in the project box; strain-relieve the strip leads.",
    ],
    cautions: [
      "Class-2 low voltage only — do not share a box, raceway, or knockout with 120V wiring (NEC 725 separation).",
      "The buck ships at a random voltage — set it to 5.0V first or the ESP32 dies instantly.",
    ],
    esphomeYaml: `esphome:
  name: shop-motion-light
esp32:
  board: esp32dev
wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password
api: {}
ota: {}
binary_sensor:
  - platform: gpio
    pin: GPIO13
    name: "Shop motion"
    device_class: motion
    on_press:
      then:
        - light.turn_on: { id: bench, brightness: 100%, transition: 0.5s }
    on_release:
      then:
        - delay: 120s
        - light.turn_off: { id: bench, transition: 2s }
output:
  - platform: ledc
    pin: GPIO16
    id: bench_pwm
light:
  - platform: monochromatic
    id: bench
    name: "Bench light"
    output: bench_pwm`,
  },
  {
    id: "door-sensor-alert",
    label: "Door sensor → phone alert",
    description:
      "A reed switch on the back door tells Home Assistant (via the ESP32) every time it opens. USB-powered — the simplest possible first build.",
    components: [
      { ref: "usb", componentId: "psu-usb-5v" },
      { ref: "esp", componentId: "esp32-devkit" },
      { ref: "reed", componentId: "reed-door" },
      { ref: "wires", componentId: "dupont-set" },
    ],
    psuRef: "usb",
    wires: [
      { from: { ref: "usb", pin: "v+" }, to: { ref: "esp", pin: "vin" }, color: "red", note: "or just the USB cable" },
      { from: { ref: "usb", pin: "v-" }, to: { ref: "esp", pin: "gnd" }, color: "black" },
      { from: { ref: "reed", pin: "a" }, to: { ref: "esp", pin: "gpio14" }, color: "green" },
      { from: { ref: "reed", pin: "b" }, to: { ref: "esp", pin: "gnd" }, color: "black" },
    ],
    steps: [
      "Mount the reed switch body on the frame, the magnet on the door — gap under 1/2\" when closed.",
      "Run the two-wire lead to the ESP32: one side to GPIO 14, the other to GND (the internal pullup does the rest).",
      "Flash the ESPHome config; the sensor appears in Home Assistant automatically.",
      "Make an automation: door opens while you're away → notification.",
    ],
    cautions: [
      "Keep the sensor lead away from mains cables — parallel runs pick up noise (cross at 90° if you must).",
    ],
    esphomeYaml: `esphome:
  name: back-door
esp32:
  board: esp32dev
wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password
api: {}
ota: {}
binary_sensor:
  - platform: gpio
    pin:
      number: GPIO14
      mode: INPUT_PULLUP
      inverted: true
    name: "Back door"
    device_class: door`,
  },
  {
    id: "ws2812-accent",
    label: "Addressable LED accent (WS2812B)",
    description:
      "Two meters of individually-addressable LEDs — effects, color, the works — driven straight from an ESP32 GPIO with the proper resistor + capacitor.",
    components: [
      { ref: "psu", componentId: "psu-5v-3a" },
      { ref: "esp", componentId: "esp32-devkit" },
      { ref: "strip", componentId: "ws2812b-strip", qty: 2, label: "WS2812B (2m)" },
      { ref: "res", componentId: "resistor-330" },
      { ref: "cap", componentId: "cap-1000uf" },
      { ref: "wires", componentId: "dupont-set" },
    ],
    psuRef: "psu",
    wires: [
      { from: { ref: "psu", pin: "v+" }, to: { ref: "strip", pin: "5v" }, color: "red", note: "1000µF cap across +5/GND at the strip" },
      { from: { ref: "psu", pin: "v-" }, to: { ref: "strip", pin: "gnd" }, color: "black" },
      { from: { ref: "psu", pin: "v+" }, to: { ref: "esp", pin: "vin" }, color: "red" },
      { from: { ref: "psu", pin: "v-" }, to: { ref: "esp", pin: "gnd" }, color: "black" },
      { from: { ref: "esp", pin: "gpio5" }, to: { ref: "strip", pin: "din" }, color: "blue", note: "through the 330Ω resistor, wired at the strip end" },
    ],
    steps: [
      "Solder or clip the 330Ω resistor inline on the DIN wire, close to the strip.",
      "Put the 1000µF capacitor across the strip's +5V and GND right where power lands.",
      "Power the strip DIRECTLY from the 5V supply — not through the ESP32's pins.",
      "Common ground: the ESP32 GND and strip GND must connect or the data line won't work.",
      "Flash the config; effects live in the ESPHome light entity.",
    ],
    cautions: [
      "2m at full white can pull ~3.6A — the 3A budget assumes mixed colors/effects. Going longer? Inject power every 2m and size the PSU up.",
    ],
    esphomeYaml: `esphome:
  name: accent-leds
esp32:
  board: esp32dev
wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password
api: {}
ota: {}
light:
  - platform: esp32_rmt_led_strip
    rgb_order: GRB
    pin: GPIO5
    num_leds: 60
    chipset: ws2812
    name: "Accent strip"
    effects:
      - addressable_rainbow: {}
      - addressable_scan: {}`,
  },
  {
    id: "relay-12v-load",
    label: "Relay-switched 12V load",
    description:
      "Switch any small 12V device — a fan, a lamp, a solenoid — from Home Assistant through a relay module. The relay clicks, the load runs.",
    components: [
      { ref: "psu", componentId: "psu-12v-2a" },
      { ref: "buck", componentId: "buck-12-5" },
      { ref: "esp", componentId: "esp32-devkit" },
      { ref: "relay", componentId: "relay-1ch" },
      { ref: "load", componentId: "load-12v" },
      { ref: "wires", componentId: "dupont-set" },
      { ref: "box", componentId: "project-box" },
    ],
    psuRef: "psu",
    wires: [
      { from: { ref: "psu", pin: "v+" }, to: { ref: "buck", pin: "in+" }, color: "yellow" },
      { from: { ref: "psu", pin: "v-" }, to: { ref: "buck", pin: "in-" }, color: "black" },
      { from: { ref: "buck", pin: "out+" }, to: { ref: "esp", pin: "vin" }, color: "red" },
      { from: { ref: "buck", pin: "out-" }, to: { ref: "esp", pin: "gnd" }, color: "black" },
      { from: { ref: "buck", pin: "out+" }, to: { ref: "relay", pin: "vcc" }, color: "red" },
      { from: { ref: "buck", pin: "out-" }, to: { ref: "relay", pin: "gnd" }, color: "black" },
      { from: { ref: "esp", pin: "gpio16" }, to: { ref: "relay", pin: "in" }, color: "blue" },
      { from: { ref: "psu", pin: "v+" }, to: { ref: "relay", pin: "com" }, color: "yellow", note: "switched 12V through the relay contacts" },
      { from: { ref: "relay", pin: "no" }, to: { ref: "load", pin: "v+" }, color: "yellow" },
      { from: { ref: "load", pin: "v-" }, to: { ref: "psu", pin: "v-" }, color: "black" },
    ],
    steps: [
      "Set the buck to 5.0V first (meter!), then power the ESP32 and relay module from it.",
      "GPIO 16 to the relay IN — the module's LED shows every switch.",
      "Route the 12V+ through COM → NO so the load only runs when the relay is energized.",
      "Flash, then toggle the new switch entity in Home Assistant and listen for the click.",
    ],
    cautions: [
      "These recipes switch LOW-VOLTAGE loads only. The relay's contacts could handle mains — but a mains build needs an enclosure, cord strain relief, and separation from the 5V side. Different project, plan it separately.",
    ],
    esphomeYaml: `esphome:
  name: relay-switch
esp32:
  board: esp32dev
wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password
api: {}
ota: {}
switch:
  - platform: gpio
    pin: GPIO16
    name: "12V load"
    restore_mode: RESTORE_DEFAULT_OFF`,
  },
];

export function lvComponent(id: string): LvComponent | undefined {
  return LV_COMPONENTS.find((c) => c.id === id);
}

export function lvRecipe(id: string): LvRecipe | undefined {
  return LV_RECIPES.find((r) => r.id === id);
}
