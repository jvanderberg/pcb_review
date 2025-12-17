/**
 * KiCad Schematic Parser
 * Parses .kicad_sch files and extracts structured data for analysis
 *
 * This module is designed to work in both Node.js and browser environments.
 * Use parseSchematicContent() for individual files, or parseProject() with file system callbacks.
 */

import { SExprParser, type SExpr } from "./sexpr";

/**
 * Interface for file system operations, allowing the parser to work in different environments
 */
export interface FileSystemAdapter {
  readFile: (path: string) => Promise<string>;
  listFiles: (dir: string) => Promise<string[]>;
  joinPath: (...parts: string[]) => string;
  getBasename: (path: string, ext?: string) => string;
}

// Types for schematic data

export interface SchematicComponent {
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

export interface SchematicLabel {
  text: string;
  x: number;
  y: number;
  type: "local" | "global" | "hierarchical";
  sheet: string;
}

export interface SchematicWire {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  sheet: string;
}

export interface SchematicPowerSymbol {
  netName: string;
  x: number;
  y: number;
  sheet: string;
}

export interface SheetInstance {
  file: string;
  name: string;
}

export interface SchematicNet {
  name: string;
  isGlobal: boolean;
  isPower: boolean;
  connections: Array<{ sheet: string; x: number; y: number }>;
}

export interface SchematicData {
  projectPath: string;
  sheets: string[];
  components: Map<string, SchematicComponent>;
  labels: SchematicLabel[];
  wires: SchematicWire[];
  powerSymbols: SchematicPowerSymbol[];
  globalNets: Map<string, SchematicNet>;
  sheetInstances: SheetInstance[];
}

// Power symbol detection patterns
const POWER_SYMBOL_PATTERNS = [
  /^power:/i,
  /^device:.*power/i,
  /:gnd$/i,
  /:\+\d+v/i,
  /:vcc$/i,
  /:vdd$/i,
  /:vss$/i,
  /:vbus$/i,
];

function isPowerSymbol(libId: string, value: string): boolean {
  const id = libId.toLowerCase();
  const val = value.toLowerCase();

  // Check patterns
  for (const pattern of POWER_SYMBOL_PATTERNS) {
    if (pattern.test(id)) return true;
  }

  // Check common power net names in value
  if (/^(gnd|\+\d+v\d*|vcc|vdd|vss|vbus|v\d+v?\d*)$/i.test(val)) {
    return true;
  }

  return false;
}

export class SchematicParser {
  private result: SchematicData;

  constructor() {
    this.result = {
      projectPath: "",
      sheets: [],
      components: new Map(),
      labels: [],
      wires: [],
      powerSymbols: [],
      globalNets: new Map(),
      sheetInstances: [],
    };
  }

  /**
   * Parse a KiCad project directory using a file system adapter.
   * This method works in both Node.js and browser environments.
   *
   * @param projectPath - Path to the project directory
   * @param fs - File system adapter for reading files
   */
  async parseProject(projectPath: string, fs: FileSystemAdapter): Promise<SchematicData> {
    this.result.projectPath = projectPath;

    // Find all .kicad_sch files
    const files = await fs.listFiles(projectPath);
    const schFiles = files.filter((f) => f.endsWith(".kicad_sch"));

    if (schFiles.length === 0) {
      throw new Error("No .kicad_sch files found in project directory");
    }

    // Parse each schematic file
    for (const schFile of schFiles.sort()) {
      const filepath = fs.joinPath(projectPath, schFile);
      const content = await fs.readFile(filepath);
      const sheetName = fs.getBasename(filepath, ".kicad_sch");
      this.parseSchematicContent(content, sheetName);
    }

    // Build global nets from labels and power symbols
    this.buildGlobalNets();

    return this.result;
  }

  /**
   * Parse multiple schematic files from content strings.
   * Use this method in browser environments where files are already loaded.
   *
   * @param files - Array of {filename, content} objects
   * @param projectPath - Optional project path for the result
   */
  parseMultipleFiles(
    files: Array<{ filename: string; content: string }>,
    projectPath: string = ""
  ): SchematicData {
    this.result.projectPath = projectPath;

    if (files.length === 0) {
      throw new Error("No schematic files provided");
    }

    // Sort files by name for consistent ordering
    const sortedFiles = [...files].sort((a, b) => a.filename.localeCompare(b.filename));

    for (const file of sortedFiles) {
      // Extract sheet name from filename (remove .kicad_sch extension)
      const sheetName = file.filename.replace(/\.kicad_sch$/i, "");
      this.parseSchematicContent(file.content, sheetName);
    }

    // Build global nets from labels and power symbols
    this.buildGlobalNets();

    return this.result;
  }

  /**
   * Parse a single schematic file from content string.
   *
   * @param content - The schematic file content
   * @param sheetName - Name for this schematic sheet
   */
  parseSchematicContent(content: string, sheetName: string): void {
    this.result.sheets.push(sheetName);

    const parser = new SExprParser(content);
    const data = parser.parse();

    if (!Array.isArray(data) || data[0] !== "kicad_sch") {
      console.warn(`Warning: Invalid schematic format in ${sheetName}`);
      return;
    }

    this.processSchematicData(data, sheetName);
  }

  private processSchematicData(data: SExpr[], sheetName: string): void {
    for (const item of data.slice(1)) {
      if (!Array.isArray(item) || item.length === 0) continue;

      const tag = item[0];

      switch (tag) {
        case "symbol":
          this.processSymbol(item, sheetName);
          break;
        case "global_label":
          this.processLabel(item, sheetName, "global");
          break;
        case "hierarchical_label":
          this.processLabel(item, sheetName, "hierarchical");
          break;
        case "label":
          this.processLabel(item, sheetName, "local");
          break;
        case "wire":
          this.processWire(item, sheetName);
          break;
        case "sheet":
          this.processSheet(item);
          break;
      }
    }
  }

  private processSymbol(symbolData: SExpr[], sheetName: string): void {
    let libId = "";
    let uuid = "";
    let x = 0;
    let y = 0;
    let unit = 1;
    let reference = "";
    let value = "";
    let footprint = "";
    const properties: Record<string, string> = {};

    for (const item of symbolData.slice(1)) {
      if (!Array.isArray(item) || item.length === 0) continue;

      const tag = item[0];

      if (tag === "lib_id") {
        libId = String(item[1]);
      } else if (tag === "uuid") {
        uuid = String(item[1]);
      } else if (tag === "at") {
        x = Number(item[1]) || 0;
        y = Number(item[2]) || 0;
      } else if (tag === "unit") {
        unit = Number(item[1]) || 1;
      } else if (tag === "property") {
        const propName = String(item[1]);
        const propValue = String(item[2]);
        properties[propName] = propValue;

        if (propName === "Reference") reference = propValue;
        else if (propName === "Value") value = propValue;
        else if (propName === "Footprint") footprint = propValue;
      }
    }

    // Check if this is a power symbol
    if (isPowerSymbol(libId, value)) {
      this.result.powerSymbols.push({
        netName: value,
        x,
        y,
        sheet: sheetName,
      });
      return;
    }

    // Skip symbols without reference (like graphical symbols)
    if (!reference || reference.startsWith("#")) return;

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

  private processLabel(
    labelData: SExpr[],
    sheetName: string,
    type: "local" | "global" | "hierarchical"
  ): void {
    if (labelData.length < 2) return;

    const text = String(labelData[1]);
    let x = 0;
    let y = 0;

    for (const item of labelData.slice(2)) {
      if (Array.isArray(item) && item[0] === "at") {
        x = Number(item[1]) || 0;
        y = Number(item[2]) || 0;
      }
    }

    this.result.labels.push({
      text,
      x,
      y,
      type,
      sheet: sheetName,
    });
  }

  private processWire(wireData: SExpr[], sheetName: string): void {
    let x1 = 0,
      y1 = 0,
      x2 = 0,
      y2 = 0;

    for (const item of wireData.slice(1)) {
      if (!Array.isArray(item) || item.length === 0) continue;

      if (item[0] === "pts") {
        // Find xy elements
        for (const pt of item.slice(1)) {
          if (Array.isArray(pt) && pt[0] === "xy") {
            if (x1 === 0 && y1 === 0) {
              x1 = Number(pt[1]) || 0;
              y1 = Number(pt[2]) || 0;
            } else {
              x2 = Number(pt[1]) || 0;
              y2 = Number(pt[2]) || 0;
            }
          }
        }
      }
    }

    if (x1 !== 0 || y1 !== 0 || x2 !== 0 || y2 !== 0) {
      this.result.wires.push({ x1, y1, x2, y2, sheet: sheetName });
    }
  }

  private processSheet(sheetData: SExpr[]): void {
    let sheetFile = "";
    let sheetName = "";

    for (const item of sheetData.slice(1)) {
      if (!Array.isArray(item) || item.length === 0) continue;

      if (item[0] === "property" && item.length >= 3) {
        const propName = String(item[1]);
        const propValue = String(item[2]);

        if (propName === "Sheetfile") sheetFile = propValue;
        else if (propName === "Sheetname") sheetName = propValue;
      }
    }

    if (sheetFile) {
      this.result.sheetInstances.push({
        file: sheetFile,
        name: sheetName || sheetFile,
      });
    }
  }

  private buildGlobalNets(): void {
    // Add global labels as nets
    for (const label of this.result.labels) {
      if (label.type === "global") {
        let net = this.result.globalNets.get(label.text);
        if (!net) {
          net = {
            name: label.text,
            isGlobal: true,
            isPower: false,
            connections: [],
          };
          this.result.globalNets.set(label.text, net);
        }
        net.connections.push({
          sheet: label.sheet,
          x: label.x,
          y: label.y,
        });
      }
    }

    // Add power symbols as nets
    for (const power of this.result.powerSymbols) {
      let net = this.result.globalNets.get(power.netName);
      if (!net) {
        net = {
          name: power.netName,
          isGlobal: true,
          isPower: true,
          connections: [],
        };
        this.result.globalNets.set(power.netName, net);
      }
      net.connections.push({
        sheet: power.sheet,
        x: power.x,
        y: power.y,
      });
    }
  }
}
