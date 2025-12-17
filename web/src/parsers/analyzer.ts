/**
 * Browser-compatible analyzer
 * Re-exports the unified analyzer with browser-compatible methods
 */

// Import types and classes from the shared parsers
// Note: In a real build, these would be bundled from the parent src/ directory
// For now, we'll create local implementations

import { SExprParser, type SExpr } from './sexpr';

// PCB Types
interface Pad {
  number: string;
  type: string;
  shape: string;
  x: number;
  y: number;
  net: number | null;
  netName: string;
  size?: { width: number; height: number };
  drill?: number;
  layers?: string[];
}

interface Footprint {
  reference: string;
  value: string;
  footprintType: string;
  x: number;
  y: number;
  rotation: number;
  layer: string;
  pads: Pad[];
  properties: Record<string, string>;
}

interface Trace {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
  layer: string;
  net: number;
  length: number;
}

interface Via {
  x: number;
  y: number;
  size: number;
  drill: number;
  layers: string[];
  net: number;
}

interface Point {
  x: number;
  y: number;
}

interface Zone {
  net: number;
  netName: string;
  layer: string;
  priority: number;
  polygon?: Point[];
  boundingBox?: { minX: number; maxX: number; minY: number; maxY: number };
  area?: number;
}

interface Layer {
  id: number;
  name: string;
  type: string;
}

interface NetConnectivity {
  components: Set<string>;
  pads: Array<{ component: string; pad: string; netName: string }>;
  traces: Trace[];
  vias: Via[];
}

interface PCBData {
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

// Schematic Types
interface SchematicComponent {
  reference: string;
  value: string;
  footprint: string;
  libId: string;
  x: number;
  y: number;
  unit: number;
  sheet: string;
  properties: Record<string, string>;
  uuid: string;
}

interface SchematicData {
  projectPath: string;
  sheets: string[];
  components: Map<string, SchematicComponent>;
  labels: Array<{ text: string; x: number; y: number; type: string; sheet: string }>;
  wires: Array<{ x1: number; y1: number; x2: number; y2: number; sheet: string }>;
  powerSymbols: Array<{ netName: string; x: number; y: number; sheet: string }>;
  globalNets: Map<string, unknown>;
  sheetInstances: Array<{ file: string; name: string }>;
}

// Analysis Result Types
export interface AnalysisResult {
  projectPath: string;
  timestamp: string;
  summary: {
    totalComponents: number;
    totalNets: number;
    totalTraces: number;
    totalVias: number;
    viaInPadCount: number;
    copperLayers: number;
    schematicSheets: number;
  };
  components: {
    byType: Record<string, unknown[]>;
    all: unknown[];
  };
  powerNets: unknown[];
  signalNets: unknown[];
  traceStats: unknown;
  viaStats: unknown;
  viaInPad: unknown[];
  layerStackup: unknown;
  differentialPairs: unknown[];
  crossReference: unknown;
  thermalAnalysis: unknown[];
}

// PCB Parser
class PCBParser {
  private data: SExpr | null = null;
  private result: PCBData;

  constructor() {
    this.result = {
      filename: '',
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

  parseContent(content: string, filename: string = 'unknown.kicad_pcb'): PCBData {
    this.result.filename = filename;

    const parser = new SExprParser(content);
    this.data = parser.parse();

    if (!Array.isArray(this.data) || this.data[0] !== 'kicad_pcb') {
      throw new Error('Invalid KiCad PCB file format');
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
        case 'layers':
          this.processLayers(item);
          break;
        case 'net':
          this.processNet(item);
          break;
        case 'footprint':
          this.processFootprint(item);
          break;
        case 'segment':
          this.processSegment(item);
          break;
        case 'via':
          this.processVia(item);
          break;
        case 'zone':
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

        // KiCad copper layer types: 'signal' for routing, 'power' for planes, 'mixed' for both
        // All three are valid copper layers
        if (layer.type === 'signal' || layer.type === 'power' || layer.type === 'mixed') {
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
      reference: '',
      value: '',
      footprintType: typeof fpData[1] === 'string' ? fpData[1] : '',
      x: 0,
      y: 0,
      rotation: 0,
      layer: 'F.Cu',
      pads: [],
      properties: {},
    };

    for (const item of fpData.slice(2)) {
      if (!Array.isArray(item) || item.length === 0) continue;

      const tag = item[0];

      if (tag === 'at') {
        footprint.x = Number(item[1]) || 0;
        footprint.y = Number(item[2]) || 0;
        footprint.rotation = Number(item[3]) || 0;
      } else if (tag === 'layer') {
        footprint.layer = String(item[1]);
      } else if (tag === 'property') {
        const propName = String(item[1]);
        const propValue = String(item[2]);
        footprint.properties[propName] = propValue;

        if (propName === 'Reference') footprint.reference = propValue;
        else if (propName === 'Value') footprint.value = propValue;
      } else if (tag === 'pad') {
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
      netName: '',
    };

    for (const item of padData.slice(4)) {
      if (!Array.isArray(item) || item.length === 0) continue;

      const tag = item[0];

      if (tag === 'at') {
        pad.x = Number(item[1]) || 0;
        pad.y = Number(item[2]) || 0;
      } else if (tag === 'size') {
        pad.size = {
          width: Number(item[1]) || 0,
          height: Number(item[2]) || 0,
        };
      } else if (tag === 'drill') {
        pad.drill = Number(item[1]) || 0;
      } else if (tag === 'layers') {
        pad.layers = item.slice(1).map(String);
      } else if (tag === 'net') {
        pad.net = Number(item[1]) || null;
        pad.netName = item.length > 2 ? String(item[2]) : '';
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
      layer: '',
      net: 0,
    };

    for (const item of segData.slice(1)) {
      if (!Array.isArray(item) || item.length === 0) continue;

      const tag = item[0];

      if (tag === 'start') {
        trace.startX = Number(item[1]) || 0;
        trace.startY = Number(item[2]) || 0;
      } else if (tag === 'end') {
        trace.endX = Number(item[1]) || 0;
        trace.endY = Number(item[2]) || 0;
      } else if (tag === 'width') {
        trace.width = Number(item[1]) || 0;
      } else if (tag === 'layer') {
        trace.layer = String(item[1]);
      } else if (tag === 'net') {
        trace.net = Number(item[1]) || 0;
      }
    }

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

      if (tag === 'at') {
        via.x = Number(item[1]) || 0;
        via.y = Number(item[2]) || 0;
      } else if (tag === 'size') {
        via.size = Number(item[1]) || 0;
      } else if (tag === 'drill') {
        via.drill = Number(item[1]) || 0;
      } else if (tag === 'layers') {
        via.layers = item.slice(1).map(String);
      } else if (tag === 'net') {
        via.net = Number(item[1]) || 0;
      }
    }

    this.result.vias.push(via);
  }

  private processZone(zoneData: SExpr[]): void {
    const zone: Zone = {
      net: 0,
      netName: '',
      layer: '',
      priority: 0,
    };

    for (const item of zoneData.slice(1)) {
      if (!Array.isArray(item) || item.length === 0) continue;

      const tag = item[0];

      if (tag === 'net') {
        zone.net = Number(item[1]) || 0;
      } else if (tag === 'net_name') {
        zone.netName = String(item[1]);
      } else if (tag === 'layer') {
        zone.layer = String(item[1]);
      } else if (tag === 'priority') {
        zone.priority = Number(item[1]) || 0;
      }
    }

    this.result.zones.push(zone);
  }

  private buildConnectivity(): void {
    for (const [netNum] of this.result.nets) {
      this.result.connectivity.set(netNum, {
        components: new Set(),
        pads: [],
        traces: [],
        vias: [],
      });
    }

    for (const trace of this.result.traces) {
      const conn = this.result.connectivity.get(trace.net);
      if (conn) {
        conn.traces.push(trace);
      }
    }

    for (const via of this.result.vias) {
      const conn = this.result.connectivity.get(via.net);
      if (conn) {
        conn.vias.push(via);
      }
    }

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

// Schematic Parser
class SchematicParser {
  private result: SchematicData;

  constructor() {
    this.result = {
      projectPath: '',
      sheets: [],
      components: new Map(),
      labels: [],
      wires: [],
      powerSymbols: [],
      globalNets: new Map(),
      sheetInstances: [],
    };
  }

  parseMultipleFiles(
    files: Array<{ filename: string; content: string }>,
    projectPath: string = ''
  ): SchematicData {
    this.result.projectPath = projectPath;

    if (files.length === 0) {
      throw new Error('No schematic files provided');
    }

    const sortedFiles = [...files].sort((a, b) => a.filename.localeCompare(b.filename));

    for (const file of sortedFiles) {
      const sheetName = file.filename.replace(/\.kicad_sch$/i, '');
      this.parseSchematicContent(file.content, sheetName);
    }

    return this.result;
  }

  parseSchematicContent(content: string, sheetName: string): void {
    this.result.sheets.push(sheetName);

    const parser = new SExprParser(content);
    const data = parser.parse();

    if (!Array.isArray(data) || data[0] !== 'kicad_sch') {
      console.warn(`Warning: Invalid schematic format in ${sheetName}`);
      return;
    }

    this.processSchematicData(data, sheetName);
  }

  private processSchematicData(data: SExpr[], sheetName: string): void {
    for (const item of data.slice(1)) {
      if (!Array.isArray(item) || item.length === 0) continue;

      const tag = item[0];

      if (tag === 'symbol') {
        this.processSymbol(item, sheetName);
      }
    }
  }

  private processSymbol(symbolData: SExpr[], sheetName: string): void {
    let libId = '';
    let uuid = '';
    let x = 0;
    let y = 0;
    let unit = 1;
    let reference = '';
    let value = '';
    let footprint = '';
    const properties: Record<string, string> = {};

    for (const item of symbolData.slice(1)) {
      if (!Array.isArray(item) || item.length === 0) continue;

      const tag = item[0];

      if (tag === 'lib_id') {
        libId = String(item[1]);
      } else if (tag === 'uuid') {
        uuid = String(item[1]);
      } else if (tag === 'at') {
        x = Number(item[1]) || 0;
        y = Number(item[2]) || 0;
      } else if (tag === 'unit') {
        unit = Number(item[1]) || 1;
      } else if (tag === 'property') {
        const propName = String(item[1]);
        const propValue = String(item[2]);
        properties[propName] = propValue;

        if (propName === 'Reference') reference = propValue;
        else if (propName === 'Value') value = propValue;
        else if (propName === 'Footprint') footprint = propValue;
      }
    }

    // Skip power symbols and graphical symbols
    if (!reference || reference.startsWith('#')) return;

    const component: SchematicComponent = {
      reference,
      value,
      footprint,
      libId,
      x,
      y,
      unit,
      sheet: sheetName,
      properties,
      uuid,
    };

    this.result.components.set(reference, component);
  }
}

// Component type detection
function detectComponentType(fp: Footprint): string {
  const ref = fp.reference;
  const value = fp.value.toLowerCase();

  if (ref.startsWith('R')) return 'RESISTOR';
  if (ref.startsWith('C')) return 'CAPACITOR';
  if (ref.startsWith('L')) return 'INDUCTOR';
  if (ref.startsWith('D')) return 'DIODE';
  if (ref.startsWith('Q')) return 'TRANSISTOR';
  if (ref.startsWith('LED')) return 'LED';
  if (ref.startsWith('Y') || ref.startsWith('X')) return 'CRYSTAL';
  if (ref.startsWith('TP')) return 'TESTPOINT';
  if (ref.startsWith('H')) return 'MOUNTING_HOLE';
  if (ref.startsWith('SW')) return 'SWITCH';
  if (ref.startsWith('F') && !ref.startsWith('FB')) return 'FUSE';
  if (ref.startsWith('FB')) return 'FERRITE_BEAD';

  if (ref.startsWith('J') || ref.startsWith('P') || ref.startsWith('CON')) {
    if (value.includes('usb')) return 'CONNECTOR_USB';
    if (value.includes('rj45') || value.includes('ethernet')) return 'CONNECTOR_RJ45';
    return 'CONNECTOR';
  }

  if (ref.startsWith('U')) {
    if (/rp2040|rp2350|stm32|esp32|atmega|pic|samd|nrf/i.test(value)) return 'IC_MCU';
    if (/flash|w25q|eeprom|fram/i.test(value)) return 'IC_MEMORY';
    // Expanded voltage regulator detection - covers most common LDOs and switching regulators
    if (/ldo|regulator|buck|boost/i.test(value)) return 'IC_POWER';
    // TI regulators: TPS, TLV, LP, LM78xx, LM79xx, LM317, LM1117
    if (/^tps|^tlv|^lp[0-9]|^lm[0-9]|lm317|lm1117/i.test(value)) return 'IC_POWER';
    // Diodes Inc: AP2112, AP7xxx
    if (/^ap[0-9]/i.test(value)) return 'IC_POWER';
    // Torex: XC6206, XC6220, etc.
    if (/^xc[0-9]/i.test(value)) return 'IC_POWER';
    // Richtek: RT9013, RT9193
    if (/^rt[0-9]/i.test(value)) return 'IC_POWER';
    // Microchip: MIC5205, MIC5317, MCP1700
    if (/^mic[0-9]|^mcp1[0-9]/i.test(value)) return 'IC_POWER';
    // ON Semi: NCP1117, NCP718
    if (/^ncp[0-9]/i.test(value)) return 'IC_POWER';
    // AMS/ST: AMS1117, LD1117, L78xx, L79xx
    if (/^ams|^ld1117|^l7[89]/i.test(value)) return 'IC_POWER';
    // Other common: ME6211, HT7333, SGM, SPX, SY8088, MP1584
    if (/^me6|^ht7|^sgm|^spx|^sy8|^mp[0-9]/i.test(value)) return 'IC_POWER';
    if (/sn74|buffer|driver/i.test(value)) return 'IC_LOGIC';
    if (/usb|ch340|cp210|ft232/i.test(value)) return 'IC_USB';
    return 'IC';
  }

  return 'UNKNOWN';
}

// Unified Analyzer
export class UnifiedAnalyzer {
  private pcbData: PCBData | null = null;
  private schematicData: SchematicData | null = null;
  private projectPath: string = '';

  analyzeFromContent(
    pcbContent: string,
    pcbFilename: string,
    schematicFiles: Array<{ filename: string; content: string }> = [],
    _includeRawData: boolean = false
  ): AnalysisResult {
    this.projectPath = pcbFilename.replace(/[^/\\]*$/, '') || 'browser';

    const pcbParser = new PCBParser();
    this.pcbData = pcbParser.parseContent(pcbContent, pcbFilename);

    if (schematicFiles.length > 0) {
      const schParser = new SchematicParser();
      try {
        this.schematicData = schParser.parseMultipleFiles(schematicFiles);
      } catch (e) {
        console.warn('Warning: Could not parse schematics:', e);
        this.schematicData = null;
      }
    } else {
      this.schematicData = null;
    }

    return this.buildAnalysisResult();
  }

  private buildAnalysisResult(): AnalysisResult {
    const pcb = this.pcbData!;
    const sch = this.schematicData;

    const componentSummaries = this.buildComponentSummaries();
    const componentsByType = this.groupComponentsByType(componentSummaries);
    const { powerNets, signalNets } = this.buildNetSummaries();
    const traceStats = this.buildTraceStatistics();
    const viaStats = this.buildViaStatistics();
    const viaInPad = this.detectViaInPad();
    const layerStackup = this.buildLayerStackup();
    const differentialPairs = this.detectDifferentialPairs();
    const crossRef = this.buildCrossReference();

    return {
      projectPath: this.projectPath,
      timestamp: new Date().toISOString(),
      summary: {
        totalComponents: pcb.footprints.length,
        totalNets: pcb.nets.size,
        totalTraces: pcb.traces.length,
        totalVias: pcb.vias.length,
        viaInPadCount: viaInPad.length,
        copperLayers: pcb.copperLayers.length,
        schematicSheets: sch?.sheets.length || 0,
      },
      components: {
        byType: componentsByType,
        all: componentSummaries,
      },
      powerNets,
      signalNets,
      traceStats,
      viaStats,
      viaInPad,
      layerStackup,
      differentialPairs,
      crossReference: crossRef,
      thermalAnalysis: [],
    };
  }

  private buildComponentSummaries(): unknown[] {
    const pcb = this.pcbData!;
    const summaries: unknown[] = [];

    for (const fp of pcb.footprints) {
      const nets = pcb.componentNets.get(fp.reference) || new Set();
      const netNames = [...nets].map((n) => pcb.nets.get(n) || `net_${n}`);

      summaries.push({
        reference: fp.reference,
        value: fp.value,
        type: detectComponentType(fp),
        footprint: fp.footprintType,
        layer: fp.layer,
        position: { x: fp.x, y: fp.y },
        netCount: nets.size,
        connectedNets: netNames,
      });
    }

    return summaries.sort((a: any, b: any) => a.reference.localeCompare(b.reference));
  }

  private groupComponentsByType(components: unknown[]): Record<string, unknown[]> {
    const groups: Record<string, unknown[]> = {};

    for (const comp of components) {
      const type = (comp as any).type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(comp);
    }

    return groups;
  }

  private buildNetSummaries(): { powerNets: unknown[]; signalNets: unknown[] } {
    const pcb = this.pcbData!;
    const powerKeywords = ['+', 'VCC', 'VDD', 'VBUS', 'GND', 'VSS', 'VBAT'];
    const powerNets: unknown[] = [];
    const signalNets: unknown[] = [];

    for (const [netNum, netName] of pcb.nets) {
      if (netNum === 0 || !netName) continue;

      const conn = pcb.connectivity.get(netNum);
      if (!conn) continue;

      const isPower = powerKeywords.some(
        (kw) => netName.toUpperCase().includes(kw.toUpperCase())
      );

      const totalTraceLength = conn.traces.reduce((sum, t) => sum + t.length, 0);

      const summary = {
        name: netName,
        netNumber: netNum,
        componentCount: conn.components.size,
        components: [...conn.components].sort(),
        viaCount: conn.vias.length,
        traceCount: conn.traces.length,
        totalTraceLength: Math.round(totalTraceLength * 100) / 100,
        isPower,
      };

      if (isPower) {
        powerNets.push(summary);
      } else {
        signalNets.push(summary);
      }
    }

    powerNets.sort((a: any, b: any) => b.componentCount - a.componentCount);
    signalNets.sort((a: any, b: any) => b.componentCount - a.componentCount);

    return { powerNets, signalNets };
  }

  private buildTraceStatistics(): unknown {
    const pcb = this.pcbData!;

    if (pcb.traces.length === 0) {
      return {
        totalSegments: 0,
        totalLength: 0,
        widthDistribution: {},
        layerDistribution: {},
        minWidth: 0,
        maxWidth: 0,
      };
    }

    const widthDist: Record<string, number> = {};
    const layerDist: Record<string, number> = {};
    let totalLength = 0;
    let minWidth = Infinity;
    let maxWidth = 0;

    for (const trace of pcb.traces) {
      totalLength += trace.length;

      const widthKey = trace.width.toFixed(3);
      widthDist[widthKey] = (widthDist[widthKey] || 0) + 1;
      layerDist[trace.layer] = (layerDist[trace.layer] || 0) + 1;

      if (trace.width < minWidth) minWidth = trace.width;
      if (trace.width > maxWidth) maxWidth = trace.width;
    }

    return {
      totalSegments: pcb.traces.length,
      totalLength: Math.round(totalLength * 100) / 100,
      widthDistribution: widthDist,
      layerDistribution: layerDist,
      minWidth,
      maxWidth,
    };
  }

  private buildViaStatistics(): unknown {
    const pcb = this.pcbData!;

    if (pcb.vias.length === 0) {
      return {
        totalCount: 0,
        drillDistribution: {},
        minDrill: 0,
        maxDrill: 0,
      };
    }

    const drillDist: Record<string, number> = {};
    let minDrill = Infinity;
    let maxDrill = 0;

    for (const via of pcb.vias) {
      const drillKey = via.drill.toFixed(3);
      drillDist[drillKey] = (drillDist[drillKey] || 0) + 1;

      if (via.drill < minDrill) minDrill = via.drill;
      if (via.drill > maxDrill) maxDrill = via.drill;
    }

    return {
      totalCount: pcb.vias.length,
      drillDistribution: drillDist,
      minDrill,
      maxDrill,
    };
  }

  private detectViaInPad(): unknown[] {
    const pcb = this.pcbData!;
    const viaInPadList: unknown[] = [];

    // Build a list of SMD pads only (via-in-pad is only a concern for SMD)
    const smdPads: Array<{
      component: string;
      padNumber: string;
      x: number;
      y: number;
      width: number;
      height: number;
      net: number | null;
      netName: string;
      type: string;
    }> = [];

    for (const fp of pcb.footprints) {
      // Convert footprint rotation to radians
      const rotation = (fp.rotation * Math.PI) / 180;
      const cosR = Math.cos(rotation);
      const sinR = Math.sin(rotation);

      for (const pad of fp.pads) {
        // Only check SMD pads - via-in-pad isn't a manufacturing concern for through-hole
        if (pad.type !== 'smd') continue;

        // Calculate absolute pad position (rotate pad offset around footprint center)
        const relX = pad.x;
        const relY = pad.y;
        const absX = fp.x + (relX * cosR - relY * sinR);
        const absY = fp.y + (relX * sinR + relY * cosR);

        smdPads.push({
          component: fp.reference,
          padNumber: pad.number,
          x: absX,
          y: absY,
          width: pad.size?.width || 0,
          height: pad.size?.height || 0,
          net: pad.net,
          netName: pad.netName,
          type: pad.type,
        });
      }
    }

    // Check each via against SMD pads
    for (const via of pcb.vias) {
      for (const pad of smdPads) {
        // Only flag if via is on the SAME net as the pad (actual via-in-pad for thermal/connection)
        // Different net vias near pads are a DRC issue, not a via-in-pad manufacturing concern
        if (via.net !== pad.net) continue;

        // Check if via center is within pad bounds (no tolerance - must be actually inside)
        const halfW = pad.width / 2;
        const halfH = pad.height / 2;

        if (
          via.x >= pad.x - halfW &&
          via.x <= pad.x + halfW &&
          via.y >= pad.y - halfH &&
          via.y <= pad.y + halfH
        ) {
          viaInPadList.push({
            component: pad.component,
            pad: pad.padNumber,
            padType: pad.type,
            padNet: pad.netName || `net_${pad.net}`,
            viaPosition: { x: via.x, y: via.y },
            viaDrill: via.drill,
            viaNet: pcb.nets.get(via.net) || `net_${via.net}`,
            concern: 'Via in SMD pad may wick solder - consider filled/capped vias',
          });
        }
      }
    }

    return viaInPadList;
  }

  private buildLayerStackup(): unknown {
    const pcb = this.pcbData!;

    const layerUsage: Record<string, number> = {};
    const routedLayers = new Set<string>();

    for (const trace of pcb.traces) {
      layerUsage[trace.layer] = (layerUsage[trace.layer] || 0) + 1;
      routedLayers.add(trace.layer);
    }

    const zones: Array<{ layer: string; net: string }> = [];
    const zoneLayers = new Set<string>();

    for (const zone of pcb.zones) {
      if (zone.layer && zone.netName) {
        zones.push({ layer: zone.layer, net: zone.netName });
        zoneLayers.add(zone.layer);
      }
    }

    return {
      totalLayers: pcb.layers.length,
      copperLayers: pcb.copperLayers,
      routedLayers: [...routedLayers].sort(),
      layerUsage,
      zones,
      zoneLayers: [...zoneLayers].sort(),
    };
  }

  private detectDifferentialPairs(): unknown[] {
    const pcb = this.pcbData!;
    const pairs: unknown[] = [];
    const processed = new Set<string>();

    for (const [netNum, netName] of pcb.nets) {
      if (processed.has(netName)) continue;

      let baseName: string | null = null;
      let otherNetName: string | null = null;

      if (netName.endsWith('+')) {
        baseName = netName.slice(0, -1);
        otherNetName = baseName + '-';
      } else if (netName.endsWith('-')) {
        baseName = netName.slice(0, -1);
        otherNetName = baseName + '+';
      } else if (netName.endsWith('P')) {
        baseName = netName.slice(0, -1);
        otherNetName = baseName + 'N';
      } else if (netName.endsWith('N')) {
        baseName = netName.slice(0, -1);
        otherNetName = baseName + 'P';
      }

      if (!baseName || !otherNetName) continue;

      let otherNetNum: number | null = null;
      for (const [num, name] of pcb.nets) {
        if (name === otherNetName) {
          otherNetNum = num;
          break;
        }
      }

      if (otherNetNum === null) continue;

      processed.add(netName);
      processed.add(otherNetName);

      const conn1 = pcb.connectivity.get(netNum);
      const conn2 = pcb.connectivity.get(otherNetNum);

      const len1 = conn1?.traces.reduce((sum, t) => sum + t.length, 0) || 0;
      const len2 = conn2?.traces.reduce((sum, t) => sum + t.length, 0) || 0;

      const components = new Set<string>();
      if (conn1) conn1.components.forEach((c) => components.add(c));
      if (conn2) conn2.components.forEach((c) => components.add(c));

      const [posNet, negNet] =
        netName.endsWith('+') || netName.endsWith('P')
          ? [netName, otherNetName]
          : [otherNetName, netName];
      const [posLen, negLen] =
        netName.endsWith('+') || netName.endsWith('P') ? [len1, len2] : [len2, len1];

      pairs.push({
        baseName,
        positiveNet: posNet,
        negativeNet: negNet,
        posLength: Math.round(posLen * 1000) / 1000,
        negLength: Math.round(negLen * 1000) / 1000,
        lengthMismatch: Math.round(Math.abs(posLen - negLen) * 1000) / 1000,
        components: [...components].sort(),
      });
    }

    return pairs.sort((a: any, b: any) => a.baseName.localeCompare(b.baseName));
  }

  private buildCrossReference(): unknown {
    const pcb = this.pcbData!;
    const sch = this.schematicData;

    if (!sch) {
      return {
        matched: 0,
        schematicOnly: [],
        pcbOnly: [...pcb.footprints.map((f) => f.reference)],
        valueMismatches: [],
        footprintMismatches: [],
      };
    }

    const pcbRefs = new Set(pcb.footprints.map((f) => f.reference));
    const schRefs = new Set(sch.components.keys());

    const matched = [...pcbRefs].filter((r) => schRefs.has(r));
    const schematicOnly = [...schRefs].filter((r) => !pcbRefs.has(r));
    const pcbOnly = [...pcbRefs].filter((r) => !schRefs.has(r));

    const valueMismatches: unknown[] = [];
    const footprintMismatches: unknown[] = [];

    for (const ref of matched) {
      const pcbComp = pcb.footprints.find((f) => f.reference === ref)!;
      const schComp = sch.components.get(ref)!;

      if (pcbComp.value !== schComp.value) {
        valueMismatches.push({
          reference: ref,
          schematicValue: schComp.value,
          pcbValue: pcbComp.value,
        });
      }

      const pcbFp = pcbComp.footprintType.split(':').pop() || pcbComp.footprintType;
      const schFp = schComp.footprint.split(':').pop() || schComp.footprint;

      if (pcbFp && schFp && pcbFp !== schFp) {
        footprintMismatches.push({
          reference: ref,
          schematicFootprint: schComp.footprint,
          pcbFootprint: pcbComp.footprintType,
        });
      }
    }

    return {
      matched: matched.length,
      schematicOnly: schematicOnly.sort(),
      pcbOnly: pcbOnly.sort(),
      valueMismatches,
      footprintMismatches,
    };
  }
}
