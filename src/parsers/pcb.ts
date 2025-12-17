/**
 * KiCad PCB Parser
 * Parses .kicad_pcb files and extracts structured data for analysis
 *
 * This module is designed to work in both Node.js and browser environments.
 * Use parseContent() for browser, or parseFile() with a file reader for Node.js.
 */

import { SExprParser, type SExpr } from "./sexpr";

// Types for PCB data

export interface Pad {
  number: string;
  type: string; // smd, thru_hole, np_thru_hole
  shape: string;
  x: number;
  y: number;
  net: number | null;
  netName: string;
  size?: { width: number; height: number };
  drill?: number;
  layers?: string[];
}

export interface Footprint {
  reference: string;
  value: string;
  footprintType: string; // library:footprint
  x: number;
  y: number;
  rotation: number;
  layer: string;
  pads: Pad[];
  properties: Record<string, string>;
}

export interface Trace {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
  layer: string;
  net: number;
  length: number;
}

export interface Via {
  x: number;
  y: number;
  size: number;
  drill: number;
  layers: string[];
  net: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface Zone {
  net: number;
  netName: string;
  layer: string;
  priority: number;
  polygon?: Point[];
  boundingBox?: BoundingBox;
  area?: number;  // mm²
}

export interface Layer {
  id: number;
  name: string;
  type: string;
}

export interface NetConnectivity {
  components: Set<string>;
  pads: Array<{ component: string; pad: string; netName: string }>;
  traces: Trace[];
  vias: Via[];
}

export interface PCBData {
  filename: string;
  layers: Layer[];
  copperLayers: string[];
  nets: Map<number, string>;
  footprints: Footprint[];
  traces: Trace[];
  vias: Via[];
  zones: Zone[];
  connectivity: Map<number, NetConnectivity>;
  componentNets: Map<string, Set<number>>;
}

/**
 * Detect component type from reference, value, and footprint
 */
export function detectComponentType(fp: Footprint): string {
  const ref = fp.reference;
  const value = fp.value.toLowerCase();
  const footprint = fp.footprintType.toLowerCase();

  // By reference prefix
  if (ref.startsWith("R")) return "RESISTOR";
  if (ref.startsWith("C")) return "CAPACITOR";
  if (ref.startsWith("L")) return "INDUCTOR";
  if (ref.startsWith("D")) return "DIODE";
  if (ref.startsWith("Q")) return "TRANSISTOR";
  if (ref.startsWith("LED")) return "LED";
  if (ref.startsWith("Y") || ref.startsWith("X")) return "CRYSTAL";
  if (ref.startsWith("TP")) return "TESTPOINT";
  if (ref.startsWith("H")) return "MOUNTING_HOLE";
  if (ref.startsWith("SW")) return "SWITCH";
  if (ref.startsWith("F") && !ref.startsWith("FB")) return "FUSE";
  if (ref.startsWith("FB")) return "FERRITE_BEAD";

  // Connectors
  if (ref.startsWith("J") || ref.startsWith("P") || ref.startsWith("CON")) {
    if (value.includes("usb")) return "CONNECTOR_USB";
    if (value.includes("rj45") || value.includes("ethernet")) return "CONNECTOR_RJ45";
    if (value.includes("sd") || value.includes("microsd") || value.includes("tf")) return "CONNECTOR_SD";
    if (value.includes("audio") || value.includes("jack")) return "CONNECTOR_AUDIO";
    if (value.includes("header")) return "CONNECTOR_HEADER";
    return "CONNECTOR";
  }

  // ICs - detect subtypes
  if (ref.startsWith("U")) {
    if (/rp2040|rp2350|stm32|esp32|atmega|pic|samd|nrf/i.test(value)) return "IC_MCU";
    if (/flash|w25q|mx25|at25|eeprom|fram/i.test(value)) return "IC_MEMORY";
    if (/tps|ldo|regulator|buck|boost|me6217|ams1117|ap2112/i.test(value)) return "IC_POWER";
    if (/sn74|lvc|hc|hct|245|125|buffer|driver/i.test(value)) return "IC_LOGIC";
    if (/lvds|ds90|sn65/i.test(value)) return "IC_TRANSCEIVER";
    if (/usb|ch340|cp210|ft232|ft2232/i.test(value)) return "IC_USB";
    if (/adc|dac|mcp3/i.test(value)) return "IC_ANALOG";
    if (/can|rs485|rs232|uart/i.test(value)) return "IC_COMM";
    return "IC";
  }

  return "UNKNOWN";
}

/**
 * Detect if a component is a power regulator that needs thermal analysis
 */
export function isPowerRegulator(fp: Footprint, connectedNets?: string[]): boolean {
  const value = fp.value.toLowerCase();
  const footprint = fp.footprintType.toLowerCase();
  const ref = fp.reference;

  // Must be a U reference (IC)
  if (!ref.startsWith("U")) return false;

  // LDO patterns
  if (/ldo|regulator|ld1117|ams1117|me6211|me6217|ap2112|xc6206|ht7333|rt9013|tps7a|lp2985|mic5205/i.test(value)) {
    return true;
  }

  // 78xx/79xx series regulators
  if (/78[0-9]{2}|79[0-9]{2}|l78|l79/i.test(value)) return true;

  // Buck/boost/switching regulator patterns
  if (/tps6[0-9]|mp[12][0-9]{3}|ap62|lm267|mt36|sy8|rt6|aoz|lmr|tps5|mp2[0-9]/i.test(value)) {
    return true;
  }

  // SOT-223, DPAK, D2PAK often used for power regulators
  if (/sot-?223|dpak|d2pak|to-?252|to-?263/i.test(footprint)) {
    return true;
  }

  // QFN with thermal pad for power ICs (check if connected to power nets)
  if (/qfn|dfn/i.test(footprint) && /tps|mp[0-9]|lm[0-9]|lt[0-9]|aoz|sy[0-9]/i.test(value)) {
    return true;
  }

  // Detect by connectivity pattern: if connected to both input and output power rails
  // This catches LDOs with empty/placeholder values
  if (connectedNets && connectedNets.length > 0) {
    const nets = connectedNets.map(n => n.toUpperCase());
    const hasGnd = nets.some(n => n === "GND" || n === "VSS");

    // Check for voltage regulator pattern: input voltage + output voltage + GND
    const voltageNets = nets.filter(n => /^\+?[0-9V]+|VCC|VDD|VBUS|VIN|VOUT/i.test(n));

    // If connected to GND and at least 2 different voltage nets, likely a regulator
    if (hasGnd && voltageNets.length >= 2) {
      // Small package (SOT-23, SOT-89, etc) with power connections = likely LDO
      if (/sot-?23|sot-?89|sot-?353|sc-?70/i.test(footprint)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Detect if a footprint has an exposed/thermal pad
 */
export function hasThermalPad(fp: Footprint): boolean {
  const footprint = fp.footprintType.toLowerCase();

  // Packages commonly with thermal/exposed pads
  if (/qfn|dfn|mlp|vqfn|wqfn/i.test(footprint)) return true;
  if (/sot-?223|dpak|d2pak|to-?252|to-?263/i.test(footprint)) return true;
  if (/powerso|hso|psop/i.test(footprint)) return true;
  if (/ep|epad|exposed/i.test(footprint)) return true;

  return false;
}

export class PCBParser {
  private data: SExpr | null = null;
  private result: PCBData;

  constructor() {
    this.result = {
      filename: "",
      layers: [],
      copperLayers: [],
      nets: new Map(),
      footprints: [],
      traces: [],
      vias: [],
      zones: [],
      connectivity: new Map(),
      componentNets: new Map(),
    };
  }

  /**
   * Parse a PCB file using a provided file reader function.
   * This allows the parser to work in both Node.js and browser environments.
   *
   * @param filepath - Path to the file (used for filename in result)
   * @param readFileFn - Function to read file content as string
   */
  async parseFile(
    filepath: string,
    readFileFn: (path: string) => Promise<string>
  ): Promise<PCBData> {
    const content = await readFileFn(filepath);
    return this.parseContent(content, filepath);
  }

  parseContent(content: string, filename: string = "unknown.kicad_pcb"): PCBData {
    this.result.filename = filename;

    const parser = new SExprParser(content);
    this.data = parser.parse();

    if (!Array.isArray(this.data) || this.data[0] !== "kicad_pcb") {
      throw new Error("Invalid KiCad PCB file format");
    }

    this.extractData();
    this.buildConnectivity();

    return this.result;
  }

  private extractData(): void {
    if (!Array.isArray(this.data)) return;

    for (const item of this.data.slice(1)) {
      if (!Array.isArray(item) || item.length === 0) continue;

      const tag = item[0];

      switch (tag) {
        case "layers":
          this.processLayers(item);
          break;
        case "net":
          this.processNet(item);
          break;
        case "footprint":
          this.processFootprint(item);
          break;
        case "segment":
          this.processSegment(item);
          break;
        case "via":
          this.processVia(item);
          break;
        case "zone":
          this.processZone(item);
          break;
      }
    }
  }

  private processLayers(layersData: SExpr[]): void {
    for (const item of layersData.slice(1)) {
      if (Array.isArray(item) && item.length >= 3) {
        const layer: Layer = {
          id: Number(item[0]),
          name: String(item[1]),
          type: String(item[2]),
        };
        this.result.layers.push(layer);

        if (layer.type === "signal" || layer.name.includes("Cu")) {
          this.result.copperLayers.push(layer.name);
        }
      }
    }
  }

  private processNet(netData: SExpr[]): void {
    if (netData.length >= 3) {
      const netNum = Number(netData[1]);
      const netName = String(netData[2]);
      this.result.nets.set(netNum, netName);
    }
  }

  private processFootprint(fpData: SExpr[]): void {
    const footprint: Footprint = {
      reference: "",
      value: "",
      footprintType: typeof fpData[1] === "string" ? fpData[1] : "",
      x: 0,
      y: 0,
      rotation: 0,
      layer: "F.Cu",
      pads: [],
      properties: {},
    };

    for (const item of fpData.slice(2)) {
      if (!Array.isArray(item) || item.length === 0) continue;

      const tag = item[0];

      if (tag === "at") {
        footprint.x = Number(item[1]) || 0;
        footprint.y = Number(item[2]) || 0;
        footprint.rotation = Number(item[3]) || 0;
      } else if (tag === "layer") {
        footprint.layer = String(item[1]);
      } else if (tag === "property") {
        const propName = String(item[1]);
        const propValue = String(item[2]);
        footprint.properties[propName] = propValue;

        if (propName === "Reference") footprint.reference = propValue;
        else if (propName === "Value") footprint.value = propValue;
      } else if (tag === "pad") {
        const pad = this.processPad(item);
        if (pad) {
          footprint.pads.push(pad);
        }
      }
    }

    if (footprint.reference) {
      this.result.footprints.push(footprint);
    }
  }

  private processPad(padData: SExpr[]): Pad | null {
    if (padData.length < 4) return null;

    const pad: Pad = {
      number: String(padData[1]),
      type: String(padData[2]),
      shape: String(padData[3]),
      x: 0,
      y: 0,
      net: null,
      netName: "",
    };

    for (const item of padData.slice(4)) {
      if (!Array.isArray(item) || item.length === 0) continue;

      const tag = item[0];

      if (tag === "at") {
        pad.x = Number(item[1]) || 0;
        pad.y = Number(item[2]) || 0;
      } else if (tag === "size") {
        pad.size = {
          width: Number(item[1]) || 0,
          height: Number(item[2]) || 0,
        };
      } else if (tag === "drill") {
        pad.drill = Number(item[1]) || 0;
      } else if (tag === "layers") {
        pad.layers = item.slice(1).map(String);
      } else if (tag === "net") {
        pad.net = Number(item[1]) || null;
        pad.netName = item.length > 2 ? String(item[2]) : "";
      }
    }

    return pad;
  }

  private processSegment(segData: SExpr[]): void {
    const trace: Partial<Trace> = {
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      width: 0,
      layer: "",
      net: 0,
    };

    for (const item of segData.slice(1)) {
      if (!Array.isArray(item) || item.length === 0) continue;

      const tag = item[0];

      if (tag === "start") {
        trace.startX = Number(item[1]) || 0;
        trace.startY = Number(item[2]) || 0;
      } else if (tag === "end") {
        trace.endX = Number(item[1]) || 0;
        trace.endY = Number(item[2]) || 0;
      } else if (tag === "width") {
        trace.width = Number(item[1]) || 0;
      } else if (tag === "layer") {
        trace.layer = String(item[1]);
      } else if (tag === "net") {
        trace.net = Number(item[1]) || 0;
      }
    }

    // Calculate length
    const dx = (trace.endX || 0) - (trace.startX || 0);
    const dy = (trace.endY || 0) - (trace.startY || 0);
    trace.length = Math.sqrt(dx * dx + dy * dy);

    this.result.traces.push(trace as Trace);
  }

  private processVia(viaData: SExpr[]): void {
    const via: Via = {
      x: 0,
      y: 0,
      size: 0,
      drill: 0,
      layers: [],
      net: 0,
    };

    for (const item of viaData.slice(1)) {
      if (!Array.isArray(item) || item.length === 0) continue;

      const tag = item[0];

      if (tag === "at") {
        via.x = Number(item[1]) || 0;
        via.y = Number(item[2]) || 0;
      } else if (tag === "size") {
        via.size = Number(item[1]) || 0;
      } else if (tag === "drill") {
        via.drill = Number(item[1]) || 0;
      } else if (tag === "layers") {
        via.layers = item.slice(1).map(String);
      } else if (tag === "net") {
        via.net = Number(item[1]) || 0;
      }
    }

    this.result.vias.push(via);
  }

  private processZone(zoneData: SExpr[]): void {
    const zone: Zone = {
      net: 0,
      netName: "",
      layer: "",
      priority: 0,
    };

    for (const item of zoneData.slice(1)) {
      if (!Array.isArray(item) || item.length === 0) continue;

      const tag = item[0];

      if (tag === "net") {
        zone.net = Number(item[1]) || 0;
      } else if (tag === "net_name") {
        zone.netName = String(item[1]);
      } else if (tag === "layer") {
        zone.layer = String(item[1]);
      } else if (tag === "priority") {
        zone.priority = Number(item[1]) || 0;
      } else if (tag === "polygon") {
        // Parse polygon points: (polygon (pts (xy x y) (xy x y) ...))
        zone.polygon = this.parsePolygonPoints(item);
        if (zone.polygon && zone.polygon.length > 0) {
          zone.boundingBox = this.calculateBoundingBox(zone.polygon);
          zone.area = this.calculatePolygonArea(zone.polygon);
        }
      }
    }

    this.result.zones.push(zone);
  }

  private parsePolygonPoints(polygonData: SExpr[]): Point[] {
    const points: Point[] = [];

    for (const item of polygonData.slice(1)) {
      if (!Array.isArray(item)) continue;

      if (item[0] === "pts") {
        // Parse (pts (xy x y) (xy x y) ...)
        for (const pt of item.slice(1)) {
          if (Array.isArray(pt) && pt[0] === "xy" && pt.length >= 3) {
            points.push({
              x: Number(pt[1]) || 0,
              y: Number(pt[2]) || 0,
            });
          }
        }
      }
    }

    return points;
  }

  private calculateBoundingBox(points: Point[]): BoundingBox {
    if (points.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    let minX = points[0].x, maxX = points[0].x;
    let minY = points[0].y, maxY = points[0].y;

    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    return { minX, maxX, minY, maxY };
  }

  private calculatePolygonArea(points: Point[]): number {
    // Shoelace formula for polygon area
    if (points.length < 3) return 0;

    let area = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }

    return Math.abs(area / 2);
  }

  private buildConnectivity(): void {
    // Initialize connectivity for all nets
    for (const [netNum] of this.result.nets) {
      this.result.connectivity.set(netNum, {
        components: new Set(),
        pads: [],
        traces: [],
        vias: [],
      });
    }

    // Add traces to connectivity
    for (const trace of this.result.traces) {
      const conn = this.result.connectivity.get(trace.net);
      if (conn) {
        conn.traces.push(trace);
      }
    }

    // Add vias to connectivity
    for (const via of this.result.vias) {
      const conn = this.result.connectivity.get(via.net);
      if (conn) {
        conn.vias.push(via);
      }
    }

    // Add component pads to connectivity
    for (const fp of this.result.footprints) {
      const componentNets = new Set<number>();

      for (const pad of fp.pads) {
        if (pad.net !== null && pad.net > 0) {
          const conn = this.result.connectivity.get(pad.net);
          if (conn) {
            conn.components.add(fp.reference);
            conn.pads.push({
              component: fp.reference,
              pad: pad.number,
              netName: pad.netName,
            });
          }
          componentNets.add(pad.net);
        }
      }

      this.result.componentNets.set(fp.reference, componentNets);
    }
  }
}

/**
 * Trace signal path between two components using BFS
 */
export function traceSignalPath(
  pcb: PCBData,
  startComponent: string,
  endComponent: string
): string[] | null {
  const startNets = pcb.componentNets.get(startComponent);
  const endNets = pcb.componentNets.get(endComponent);

  if (!startNets || !endNets) return null;

  // BFS to find path
  const queue: Array<[string, string[]]> = [[startComponent, [startComponent]]];
  const visited = new Set<string>([startComponent]);

  while (queue.length > 0) {
    const [current, path] = queue.shift()!;

    if (current === endComponent) {
      // Build detailed path with net names
      const detailedPath: string[] = [];
      for (let i = 0; i < path.length; i++) {
        detailedPath.push(path[i]);
        if (i < path.length - 1) {
          const currentNets = pcb.componentNets.get(path[i])!;
          const nextNets = pcb.componentNets.get(path[i + 1])!;
          const connectingNets = [...currentNets].filter((n) => nextNets.has(n));
          if (connectingNets.length > 0) {
            const netName = pcb.nets.get(connectingNets[0]) || `net_${connectingNets[0]}`;
            detailedPath.push(`[${netName}]`);
          }
        }
      }
      return detailedPath;
    }

    // Explore neighbors via shared nets
    const currentNets = pcb.componentNets.get(current);
    if (!currentNets) continue;

    for (const netNum of currentNets) {
      const conn = pcb.connectivity.get(netNum);
      if (!conn) continue;

      for (const neighbor of conn.components) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([neighbor, [...path, neighbor]]);
        }
      }
    }
  }

  return null;
}
