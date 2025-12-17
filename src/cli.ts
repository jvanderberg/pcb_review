#!/usr/bin/env bun
/**
 * PCB Review CLI
 * Analyze KiCad projects and export structured JSON for LLM analysis
 */

import { writeFile, mkdir, readFile, readdir } from "fs/promises";
import { join, resolve, basename } from "path";
import { UnifiedAnalyzer } from "./analyzers/unified";
import type { AnalysisResult } from "./analyzers/unified";
import type { FileSystemAdapter } from "./parsers/schematic";

/**
 * Node.js file system adapter for the parsers
 */
const nodeFileSystem: FileSystemAdapter = {
  readFile: (path: string) => readFile(path, "utf-8"),
  listFiles: (dir: string) => readdir(dir),
  joinPath: (...parts: string[]) => join(...parts),
  getBasename: (path: string, ext?: string) => basename(path, ext),
};

interface CLIOptions {
  projectPath: string;
  outputDir?: string;
  includeRawData: boolean;
  quiet: boolean;
  printSummary: boolean;
}

function printUsage(): void {
  console.log(`
PCB Review - KiCad Analysis Tool for LLM-assisted PCB Review

Usage:
  bun run src/cli.ts <project_directory> [options]

Options:
  -o, --output <dir>     Output directory for analysis files (default: ./analysis)
  -r, --raw              Include raw parsed data in output
  -q, --quiet            Suppress console output
  -s, --summary          Print analysis summary to console
  -h, --help             Show this help message

Examples:
  bun run src/cli.ts ./my_project -s
  bun run src/cli.ts ./my_project -o ./analysis -s
  bun run src/cli.ts ./my_project --raw -o ./detailed

Output:
  Creates a directory with focused JSON files for LLM analysis:
  - summary.json     Overview stats and quick reference
  - power.json       Power nets, decoupling, zones, regulators
  - signals.json     Differential pairs, traces, layer usage
  - components.json  Component list and cross-reference
  - dfm.json         Manufacturing specs, vias, trace widths
`);
}

function parseArgs(args: string[]): CLIOptions | null {
  const options: CLIOptions = {
    projectPath: "",
    outputDir: undefined,
    includeRawData: false,
    quiet: false,
    printSummary: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      printUsage();
      process.exit(0);
    } else if (arg === "-o" || arg === "--output") {
      options.outputDir = args[++i];
    } else if (arg === "-r" || arg === "--raw") {
      options.includeRawData = true;
    } else if (arg === "-q" || arg === "--quiet") {
      options.quiet = true;
    } else if (arg === "-s" || arg === "--summary") {
      options.printSummary = true;
    } else if (!arg.startsWith("-")) {
      options.projectPath = arg;
    } else {
      console.error(`Unknown option: ${arg}`);
      return null;
    }
    i++;
  }

  if (!options.projectPath) {
    console.error("Error: Project directory is required");
    return null;
  }

  return options;
}

function printSummary(result: AnalysisResult): void {
  const sep = "=".repeat(70);
  const sep2 = "-".repeat(70);

  console.log(`\n${sep}`);
  console.log("PCB ANALYSIS SUMMARY");
  console.log(sep);

  console.log(`\nProject: ${result.projectPath}`);
  console.log(`Analyzed: ${result.timestamp}`);

  console.log(`\n${sep2}`);
  console.log("OVERVIEW");
  console.log(sep2);
  console.log(`  Components:      ${result.summary.totalComponents}`);
  console.log(`  Nets:            ${result.summary.totalNets}`);
  console.log(`  Traces:          ${result.summary.totalTraces}`);
  console.log(`  Vias:            ${result.summary.totalVias}`);
  console.log(`  Copper Layers:   ${result.summary.copperLayers}`);
  console.log(`  Schematic Sheets: ${result.summary.schematicSheets}`);

  console.log(`\n${sep2}`);
  console.log("COMPONENTS BY TYPE");
  console.log(sep2);
  for (const [type, components] of Object.entries(result.components.byType)) {
    console.log(`  ${type.padEnd(20)} ${components.length}`);
  }

  console.log(`\n${sep2}`);
  console.log("POWER NETS");
  console.log(sep2);
  for (const net of result.powerNets.slice(0, 10)) {
    console.log(`  ${net.name.padEnd(15)} ${net.componentCount} components, ${net.viaCount} vias`);
  }
  if (result.powerNets.length > 10) {
    console.log(`  ... and ${result.powerNets.length - 10} more`);
  }

  console.log(`\n${sep2}`);
  console.log("LAYER STACKUP");
  console.log(sep2);
  console.log(`  Copper layers: ${result.layerStackup.copperLayers.join(", ")}`);
  console.log(`  Routed layers: ${result.layerStackup.routedLayers.join(", ")}`);
  if (result.layerStackup.zoneLayers && result.layerStackup.zoneLayers.length > 0) {
    console.log(`  Zone layers:   ${result.layerStackup.zoneLayers.join(", ")}`);
    // Group zones by layer
    const zonesByLayer: Record<string, string[]> = {};
    for (const z of result.layerStackup.zones) {
      if (!zonesByLayer[z.layer]) zonesByLayer[z.layer] = [];
      if (!zonesByLayer[z.layer].includes(z.net)) zonesByLayer[z.layer].push(z.net);
    }
    console.log("  Zones:");
    for (const [layer, nets] of Object.entries(zonesByLayer)) {
      console.log(`    ${layer}: ${nets.join(", ")}`);
    }
  }

  console.log(`\n${sep2}`);
  console.log("TRACE STATISTICS");
  console.log(sep2);
  console.log(`  Total segments:  ${result.traceStats.totalSegments}`);
  console.log(`  Total length:    ${result.traceStats.totalLength.toFixed(2)} mm`);
  console.log(`  Width range:     ${result.traceStats.minWidth.toFixed(3)} - ${result.traceStats.maxWidth.toFixed(3)} mm`);

  console.log(`\n${sep2}`);
  console.log("VIA STATISTICS");
  console.log(sep2);
  console.log(`  Total vias:      ${result.viaStats.totalCount}`);
  console.log(`  Drill range:     ${result.viaStats.minDrill.toFixed(3)} - ${result.viaStats.maxDrill.toFixed(3)} mm`);

  if (result.differentialPairs.length > 0) {
    console.log(`\n${sep2}`);
    console.log("DIFFERENTIAL PAIRS");
    console.log(sep2);
    for (const pair of result.differentialPairs.slice(0, 10)) {
      console.log(
        `  ${pair.baseName.padEnd(20)} mismatch: ${pair.lengthMismatch.toFixed(3)} mm`
      );
    }
    if (result.differentialPairs.length > 10) {
      console.log(`  ... and ${result.differentialPairs.length - 10} more`);
    }
  }

  console.log(`\n${sep2}`);
  console.log("CROSS-REFERENCE");
  console.log(sep2);
  console.log(`  Matched:           ${result.crossReference.matched}`);
  console.log(`  Schematic only:    ${result.crossReference.schematicOnly.length}`);
  console.log(`  PCB only:          ${result.crossReference.pcbOnly.length}`);
  console.log(`  Value mismatches:  ${result.crossReference.valueMismatches.length}`);
  console.log(`  Footprint mismatch: ${result.crossReference.footprintMismatches.length}`);

  console.log(`\n${sep}\n`);
}

interface SplitAnalysis {
  summary: object;
  power: object;
  signals: object;
  components: object;
  dfm: object;
}

function splitAnalysis(result: AnalysisResult): SplitAnalysis {
  return {
    summary: {
      projectPath: result.projectPath,
      timestamp: result.timestamp,
      overview: result.summary,
      layerStackup: result.layerStackup,
    },
    power: {
      projectPath: result.projectPath,
      powerNets: result.powerNets,
      layerStackup: {
        zones: result.layerStackup.zones,
        zoneLayers: result.layerStackup.zoneLayers,
      },
      // Include decoupling capacitors
      decouplingCaps: result.components.byType["CAPACITOR"] || [],
      regulators: (result.components.byType["IC_POWER"] || []),
      // Thermal analysis for power components
      thermalAnalysis: result.thermalAnalysis,
    },
    signals: {
      projectPath: result.projectPath,
      differentialPairs: result.differentialPairs,
      traceStats: result.traceStats,
      viaStats: result.viaStats,
      layerStackup: {
        copperLayers: result.layerStackup.copperLayers,
        routedLayers: result.layerStackup.routedLayers,
        layerUsage: result.layerStackup.layerUsage,
        zones: result.layerStackup.zones,
      },
      signalNets: result.signalNets,
    },
    components: {
      projectPath: result.projectPath,
      summary: {
        total: result.summary.totalComponents,
        byType: Object.fromEntries(
          Object.entries(result.components.byType).map(([k, v]) => [k, v.length])
        ),
      },
      components: result.components,
      crossReference: result.crossReference,
    },
    dfm: {
      projectPath: result.projectPath,
      traceStats: result.traceStats,
      viaStats: result.viaStats,
      layerStackup: result.layerStackup,
      summary: {
        totalTraces: result.summary.totalTraces,
        totalVias: result.summary.totalVias,
        copperLayers: result.summary.copperLayers,
      },
    },
  };
}

async function writeAnalysisFiles(
  outputDir: string,
  result: AnalysisResult,
  quiet: boolean
): Promise<void> {
  await mkdir(outputDir, { recursive: true });

  const split = splitAnalysis(result);
  const files = [
    { name: "summary.json", data: split.summary },
    { name: "power.json", data: split.power },
    { name: "signals.json", data: split.signals },
    { name: "components.json", data: split.components },
    { name: "dfm.json", data: split.dfm },
  ];

  for (const file of files) {
    const filePath = join(outputDir, file.name);
    await writeFile(filePath, JSON.stringify(file.data, null, 2), "utf-8");
  }

  if (!quiet) {
    console.log(`Analysis written to: ${outputDir}/`);
    for (const file of files) {
      console.log(`  - ${file.name}`);
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }

  const options = parseArgs(args);
  if (!options) {
    process.exit(1);
  }

  const projectPath = resolve(options.projectPath);

  if (!options.quiet) {
    console.log(`Analyzing KiCad project: ${projectPath}`);
  }

  try {
    const analyzer = new UnifiedAnalyzer();
    const result = await analyzer.analyze(projectPath, nodeFileSystem, options.includeRawData);

    if (options.printSummary && !options.quiet) {
      printSummary(result);
    }

    // Always write split files
    const outputDir = resolve(options.outputDir || "./analysis");
    await writeAnalysisFiles(outputDir, result, options.quiet);
  } catch (error) {
    console.error("Error analyzing project:", error);
    process.exit(1);
  }
}

main();
