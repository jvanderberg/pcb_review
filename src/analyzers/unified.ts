/**
 * Unified KiCad Analyzer
 * Combines PCB and Schematic analysis, performs cross-reference,
 * and exports structured JSON for LLM analysis
 *
 * This module is designed to work in both Node.js and browser environments.
 * Use analyzeFromContent() for browser, or analyze() with a file system adapter for Node.js.
 */

import { PCBParser, detectComponentType, traceSignalPath, isPowerRegulator, hasThermalPad } from "../parsers/pcb";
import type { PCBData, Point } from "../parsers/pcb";
import { SchematicParser } from "../parsers/schematic";
import type { SchematicData, FileSystemAdapter } from "../parsers/schematic";

// Analysis result types - structured for LLM consumption

export interface ComponentSummary {
  reference: string;
  value: string;
  type: string;
  footprint: string;
  layer?: string;
  position?: { x: number; y: number };
  sheet?: string;
  netCount: number;
  connectedNets: string[];
}

export interface NetSummary {
  name: string;
  netNumber: number;
  componentCount: number;
  components: string[];
  viaCount: number;
  traceCount: number;
  totalTraceLength: number;
  isPower: boolean;
}

export interface TraceStatistics {
  totalSegments: number;
  totalLength: number;
  widthDistribution: Record<string, number>;
  layerDistribution: Record<string, number>;
  minWidth: number;
  maxWidth: number;
}

export interface ViaStatistics {
  totalCount: number;
  drillDistribution: Record<string, number>;
  minDrill: number;
  maxDrill: number;
}

export interface LayerStackup {
  totalLayers: number;
  copperLayers: string[];
  routedLayers: string[];
  layerUsage: Record<string, number>;
  zones: Array<{ layer: string; net: string }>;
  zoneLayers: string[];
}

export interface CrossReference {
  matched: number;
  schematicOnly: string[];
  pcbOnly: string[];
  valueMismatches: Array<{
    reference: string;
    schematicValue: string;
    pcbValue: string;
  }>;
  footprintMismatches: Array<{
    reference: string;
    schematicFootprint: string;
    pcbFootprint: string;
  }>;
}

export interface DifferentialPair {
  baseName: string;
  positiveNet: string;
  negativeNet: string;
  posLength: number;
  negLength: number;
  lengthMismatch: number;
  components: string[];
}

export interface ThermalViaAnalysis {
  count: number;
  searchRadius: number;
  byNet: Record<string, number>;
  vias: Array<{
    distance: number;
    drill: number;
    net: string;
  }>;
}

export interface CopperPourAnalysis {
  zonesContainingComponent: Array<{
    net: string;
    layer: string;
    area: number;
  }>;
  zonesWithinRadius: Array<{
    net: string;
    layer: string;
    distance: number;
    area: number;
  }>;
  totalConnectedArea: number;
}

export interface ComponentThermalAnalysis {
  reference: string;
  value: string;
  position: { x: number; y: number };
  footprint: string;
  isPowerRegulator: boolean;
  hasThermalPad: boolean;
  connectedPowerNets: string[];
  thermalVias: ThermalViaAnalysis;
  copperPour: CopperPourAnalysis;
}

export interface AnalysisResult {
  projectPath: string;
  timestamp: string;
  summary: {
    totalComponents: number;
    totalNets: number;
    totalTraces: number;
    totalVias: number;
    copperLayers: number;
    schematicSheets: number;
  };
  components: {
    byType: Record<string, ComponentSummary[]>;
    all: ComponentSummary[];
  };
  powerNets: NetSummary[];
  signalNets: NetSummary[];
  traceStats: TraceStatistics;
  viaStats: ViaStatistics;
  layerStackup: LayerStackup;
  differentialPairs: DifferentialPair[];
  crossReference: CrossReference;
  thermalAnalysis: ComponentThermalAnalysis[];
  // Raw data for detailed analysis
  rawData?: {
    pcb: any;
    schematic: any;
  };
}

export class UnifiedAnalyzer {
  private pcbData: PCBData | null = null;
  private schematicData: SchematicData | null = null;
  private projectPath: string = "";

  /**
   * Analyze a KiCad project directory using a file system adapter.
   * This method works in both Node.js and browser environments.
   *
   * @param projectPath - Path to the project directory
   * @param fs - File system adapter for reading files
   * @param includeRawData - Whether to include raw parsed data in the result
   */
  async analyze(projectPath: string, fs: FileSystemAdapter, includeRawData: boolean = false): Promise<AnalysisResult> {
    this.projectPath = projectPath;

    // Find PCB file
    const files = await fs.listFiles(projectPath);
    const pcbFile = files.find((f) => f.endsWith(".kicad_pcb"));

    if (!pcbFile) {
      throw new Error("No .kicad_pcb file found in project directory");
    }

    // Parse PCB
    const pcbParser = new PCBParser();
    const pcbFilePath = fs.joinPath(projectPath, pcbFile);
    this.pcbData = await pcbParser.parseFile(pcbFilePath, fs.readFile);

    // Parse schematics
    const schParser = new SchematicParser();
    try {
      this.schematicData = await schParser.parseProject(projectPath, fs);
    } catch (e) {
      console.warn("Warning: Could not parse schematics:", e);
      this.schematicData = null;
    }

    return this.buildAnalysisResult(includeRawData);
  }

  /**
   * Analyze from file contents directly (browser-friendly method).
   * Use this when files are already loaded into memory.
   *
   * @param pcbContent - Content of the .kicad_pcb file
   * @param pcbFilename - Name of the PCB file
   * @param schematicFiles - Array of schematic file contents with filenames
   * @param includeRawData - Whether to include raw parsed data
   */
  analyzeFromContent(
    pcbContent: string,
    pcbFilename: string,
    schematicFiles: Array<{ filename: string; content: string }> = [],
    includeRawData: boolean = false
  ): AnalysisResult {
    this.projectPath = pcbFilename.replace(/[^/\\]*$/, '') || 'browser';

    // Parse PCB
    const pcbParser = new PCBParser();
    this.pcbData = pcbParser.parseContent(pcbContent, pcbFilename);

    // Parse schematics if provided
    if (schematicFiles.length > 0) {
      const schParser = new SchematicParser();
      try {
        this.schematicData = schParser.parseMultipleFiles(schematicFiles);
      } catch (e) {
        console.warn("Warning: Could not parse schematics:", e);
        this.schematicData = null;
      }
    } else {
      this.schematicData = null;
    }

    return this.buildAnalysisResult(includeRawData);
  }

  private buildAnalysisResult(includeRawData: boolean): AnalysisResult {
    const pcb = this.pcbData!;
    const sch = this.schematicData;

    // Build component summaries
    const componentSummaries = this.buildComponentSummaries();
    const componentsByType = this.groupComponentsByType(componentSummaries);

    // Build net summaries
    const { powerNets, signalNets } = this.buildNetSummaries();

    // Build statistics
    const traceStats = this.buildTraceStatistics();
    const viaStats = this.buildViaStatistics();
    const layerStackup = this.buildLayerStackup();

    // Detect differential pairs
    const differentialPairs = this.detectDifferentialPairs();

    // Cross-reference with schematic
    const crossRef = this.buildCrossReference();

    // Build thermal analysis for power components
    const thermalAnalysis = this.buildThermalAnalysis();

    const result: AnalysisResult = {
      projectPath: this.projectPath,
      timestamp: new Date().toISOString(),
      summary: {
        totalComponents: pcb.footprints.length,
        totalNets: pcb.nets.size,
        totalTraces: pcb.traces.length,
        totalVias: pcb.vias.length,
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
      layerStackup,
      differentialPairs,
      crossReference: crossRef,
      thermalAnalysis,
    };

    if (includeRawData) {
      result.rawData = {
        pcb: this.serializePCBData(),
        schematic: this.serializeSchematicData(),
      };
    }

    return result;
  }

  private buildComponentSummaries(): ComponentSummary[] {
    const pcb = this.pcbData!;
    const summaries: ComponentSummary[] = [];

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

    return summaries.sort((a, b) => a.reference.localeCompare(b.reference));
  }

  private groupComponentsByType(
    components: ComponentSummary[]
  ): Record<string, ComponentSummary[]> {
    const groups: Record<string, ComponentSummary[]> = {};

    for (const comp of components) {
      if (!groups[comp.type]) {
        groups[comp.type] = [];
      }
      groups[comp.type].push(comp);
    }

    return groups;
  }

  private buildNetSummaries(): { powerNets: NetSummary[]; signalNets: NetSummary[] } {
    const pcb = this.pcbData!;
    const powerKeywords = ["+", "VCC", "VDD", "VBUS", "GND", "VSS", "VBAT"];
    const powerNets: NetSummary[] = [];
    const signalNets: NetSummary[] = [];

    for (const [netNum, netName] of pcb.nets) {
      if (netNum === 0 || !netName) continue; // Skip unconnected net

      const conn = pcb.connectivity.get(netNum);
      if (!conn) continue;

      const isPower = powerKeywords.some(
        (kw) => netName.toUpperCase().includes(kw.toUpperCase())
      );

      const totalTraceLength = conn.traces.reduce((sum, t) => sum + t.length, 0);

      const summary: NetSummary = {
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

    // Sort by component count descending
    powerNets.sort((a, b) => b.componentCount - a.componentCount);
    signalNets.sort((a, b) => b.componentCount - a.componentCount);

    return { powerNets, signalNets };
  }

  private buildTraceStatistics(): TraceStatistics {
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

  private buildViaStatistics(): ViaStatistics {
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

  private buildLayerStackup(): LayerStackup {
    const pcb = this.pcbData!;

    const layerUsage: Record<string, number> = {};
    const routedLayers = new Set<string>();

    for (const trace of pcb.traces) {
      layerUsage[trace.layer] = (layerUsage[trace.layer] || 0) + 1;
      routedLayers.add(trace.layer);
    }

    // Collect zone (copper pour) information
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

  private detectDifferentialPairs(): DifferentialPair[] {
    const pcb = this.pcbData!;
    const pairs: DifferentialPair[] = [];
    const processed = new Set<string>();

    for (const [netNum, netName] of pcb.nets) {
      if (processed.has(netName)) continue;

      // Look for +/- pairs
      let baseName: string | null = null;
      let otherNetName: string | null = null;

      if (netName.endsWith("+")) {
        baseName = netName.slice(0, -1);
        otherNetName = baseName + "-";
      } else if (netName.endsWith("-")) {
        baseName = netName.slice(0, -1);
        otherNetName = baseName + "+";
      } else if (netName.endsWith("P")) {
        baseName = netName.slice(0, -1);
        otherNetName = baseName + "N";
      } else if (netName.endsWith("N")) {
        baseName = netName.slice(0, -1);
        otherNetName = baseName + "P";
      }

      if (!baseName || !otherNetName) continue;

      // Find the other net
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

      // Calculate lengths
      const conn1 = pcb.connectivity.get(netNum);
      const conn2 = pcb.connectivity.get(otherNetNum);

      const len1 = conn1?.traces.reduce((sum, t) => sum + t.length, 0) || 0;
      const len2 = conn2?.traces.reduce((sum, t) => sum + t.length, 0) || 0;

      // Get connected components
      const components = new Set<string>();
      if (conn1) conn1.components.forEach((c) => components.add(c));
      if (conn2) conn2.components.forEach((c) => components.add(c));

      // Determine which is positive and negative
      const [posNet, negNet] =
        netName.endsWith("+") || netName.endsWith("P")
          ? [netName, otherNetName]
          : [otherNetName, netName];
      const [posLen, negLen] =
        netName.endsWith("+") || netName.endsWith("P") ? [len1, len2] : [len2, len1];

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

    return pairs.sort((a, b) => a.baseName.localeCompare(b.baseName));
  }

  private buildCrossReference(): CrossReference {
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

    const valueMismatches: CrossReference["valueMismatches"] = [];
    const footprintMismatches: CrossReference["footprintMismatches"] = [];

    for (const ref of matched) {
      const pcbComp = pcb.footprints.find((f) => f.reference === ref)!;
      const schComp = sch.components.get(ref)!;

      // Check value mismatch
      if (pcbComp.value !== schComp.value) {
        valueMismatches.push({
          reference: ref,
          schematicValue: schComp.value,
          pcbValue: pcbComp.value,
        });
      }

      // Check footprint mismatch (normalize by removing library prefix)
      const pcbFp = pcbComp.footprintType.split(":").pop() || pcbComp.footprintType;
      const schFp = schComp.footprint.split(":").pop() || schComp.footprint;

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

  private buildThermalAnalysis(): ComponentThermalAnalysis[] {
    const pcb = this.pcbData!;
    const results: ComponentThermalAnalysis[] = [];
    const searchRadius = 5.0; // mm - search radius for thermal features

    // Power net keywords for identifying power connections
    const powerKeywords = ["+", "VCC", "VDD", "VBUS", "GND", "VSS", "VBAT", "V3", "V5", "V12"];

    for (const fp of pcb.footprints) {
      // Get connected nets first (needed for regulator detection)
      const connectedNetNums = pcb.componentNets.get(fp.reference) || new Set();
      const allConnectedNets: string[] = [];
      const connectedPowerNets: string[] = [];

      for (const netNum of connectedNetNums) {
        const netName = pcb.nets.get(netNum) || "";
        allConnectedNets.push(netName);
        if (powerKeywords.some(kw => netName.toUpperCase().includes(kw.toUpperCase()))) {
          connectedPowerNets.push(netName);
        }
      }

      // Analyze power regulators and ICs with thermal pads
      const isRegulator = isPowerRegulator(fp, allConnectedNets);
      const hasThPad = hasThermalPad(fp);

      if (!isRegulator && !hasThPad) continue;

      // Analyze thermal vias
      const thermalVias = this.analyzeThermalViasForComponent(fp.reference, searchRadius);

      // Analyze copper pour coverage
      const copperPour = this.analyzeCopperPourForComponent(fp, searchRadius);

      results.push({
        reference: fp.reference,
        value: fp.value,
        position: { x: fp.x, y: fp.y },
        footprint: fp.footprintType,
        isPowerRegulator: isRegulator,
        hasThermalPad: hasThPad,
        connectedPowerNets,
        thermalVias,
        copperPour,
      });
    }

    return results.sort((a, b) => a.reference.localeCompare(b.reference));
  }

  private analyzeThermalViasForComponent(componentRef: string, searchRadius: number): ThermalViaAnalysis {
    const pcb = this.pcbData!;
    const fp = pcb.footprints.find(f => f.reference === componentRef);

    if (!fp) {
      return { count: 0, searchRadius, byNet: {}, vias: [] };
    }

    const nearbyVias: Array<{ distance: number; drill: number; net: string }> = [];
    const byNet: Record<string, number> = {};

    for (const via of pcb.vias) {
      const dx = via.x - fp.x;
      const dy = via.y - fp.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= searchRadius) {
        const netName = pcb.nets.get(via.net) || `net_${via.net}`;
        nearbyVias.push({
          distance: Math.round(distance * 1000) / 1000,
          drill: via.drill,
          net: netName,
        });
        byNet[netName] = (byNet[netName] || 0) + 1;
      }
    }

    nearbyVias.sort((a, b) => a.distance - b.distance);

    return {
      count: nearbyVias.length,
      searchRadius,
      byNet,
      vias: nearbyVias,
    };
  }

  private analyzeCopperPourForComponent(fp: { reference: string; x: number; y: number }, searchRadius: number): CopperPourAnalysis {
    const pcb = this.pcbData!;
    const zonesContainingComponent: CopperPourAnalysis["zonesContainingComponent"] = [];
    const zonesWithinRadius: CopperPourAnalysis["zonesWithinRadius"] = [];
    let totalConnectedArea = 0;

    for (const zone of pcb.zones) {
      if (!zone.boundingBox || !zone.polygon || zone.polygon.length < 3) continue;

      const bb = zone.boundingBox;

      // Check if component is within bounding box
      if (fp.x >= bb.minX && fp.x <= bb.maxX && fp.y >= bb.minY && fp.y <= bb.maxY) {
        // Point-in-polygon test
        if (this.pointInPolygon(fp.x, fp.y, zone.polygon)) {
          zonesContainingComponent.push({
            net: zone.netName,
            layer: zone.layer,
            area: Math.round((zone.area || 0) * 100) / 100,
          });
          totalConnectedArea += zone.area || 0;
        }
      }

      // Check if zone is within search radius (by bounding box proximity)
      const nearestX = Math.max(bb.minX, Math.min(fp.x, bb.maxX));
      const nearestY = Math.max(bb.minY, Math.min(fp.y, bb.maxY));
      const distance = Math.sqrt((fp.x - nearestX) ** 2 + (fp.y - nearestY) ** 2);

      if (distance > 0 && distance <= searchRadius) {
        zonesWithinRadius.push({
          net: zone.netName,
          layer: zone.layer,
          distance: Math.round(distance * 1000) / 1000,
          area: Math.round((zone.area || 0) * 100) / 100,
        });
      }
    }

    return {
      zonesContainingComponent,
      zonesWithinRadius,
      totalConnectedArea: Math.round(totalConnectedArea * 100) / 100,
    };
  }

  private pointInPolygon(x: number, y: number, polygon: Point[]): boolean {
    // Ray casting algorithm
    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  private serializePCBData(): any {
    const pcb = this.pcbData!;

    return {
      filename: pcb.filename,
      layers: pcb.layers,
      nets: Object.fromEntries(pcb.nets),
      footprints: pcb.footprints,
      traces: pcb.traces,
      vias: pcb.vias,
      zones: pcb.zones,
    };
  }

  private serializeSchematicData(): any {
    if (!this.schematicData) return null;

    const sch = this.schematicData;

    return {
      projectPath: sch.projectPath,
      sheets: sch.sheets,
      components: Object.fromEntries(sch.components),
      labels: sch.labels,
      powerSymbols: sch.powerSymbols,
      globalNets: Object.fromEntries(sch.globalNets),
      sheetInstances: sch.sheetInstances,
    };
  }

  /**
   * Trace signal path between two components
   */
  traceSignalPath(startComponent: string, endComponent: string): string[] | null {
    if (!this.pcbData) return null;
    return traceSignalPath(this.pcbData, startComponent, endComponent);
  }

  /**
   * Get components connected to a specific net
   */
  getComponentsOnNet(netName: string): string[] {
    if (!this.pcbData) return [];

    for (const [netNum, name] of this.pcbData.nets) {
      if (name === netName) {
        const conn = this.pcbData.connectivity.get(netNum);
        return conn ? [...conn.components].sort() : [];
      }
    }
    return [];
  }

  /**
   * Analyze thermal vias near a component
   */
  analyzeThermalVias(
    componentRef: string,
    searchRadius: number = 3.0
  ): {
    component: string;
    position: { x: number; y: number };
    viaCount: number;
    vias: Array<{
      distance: number;
      drill: number;
      net: string;
    }>;
  } | null {
    if (!this.pcbData) return null;

    const fp = this.pcbData.footprints.find((f) => f.reference === componentRef);
    if (!fp) return null;

    const nearbyVias: Array<{ distance: number; drill: number; net: string }> = [];

    for (const via of this.pcbData.vias) {
      const dx = via.x - fp.x;
      const dy = via.y - fp.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= searchRadius) {
        nearbyVias.push({
          distance: Math.round(distance * 1000) / 1000,
          drill: via.drill,
          net: this.pcbData.nets.get(via.net) || `net_${via.net}`,
        });
      }
    }

    nearbyVias.sort((a, b) => a.distance - b.distance);

    return {
      component: componentRef,
      position: { x: fp.x, y: fp.y },
      viaCount: nearbyVias.length,
      vias: nearbyVias,
    };
  }
}
