# PCB Review

A TypeScript/Bun tool for analyzing KiCad PCB and schematic files, producing structured JSON output optimized for LLM-assisted design review.

## Features

- **PCB Analysis**: Parses `.kicad_pcb` files to extract components, traces, vias, nets, and connectivity
- **Schematic Analysis**: Parses `.kicad_sch` files to extract components, labels, and hierarchical structure
- **Cross-Reference**: Compares schematic and PCB to identify mismatches
- **Differential Pair Detection**: Automatically finds and analyzes length-matched pairs
- **Power Net Analysis**: Identifies and analyzes power distribution
- **JSON Export**: Structured output designed for LLM consumption
- **LLM Prompts**: Ready-to-use prompts for various analysis types

## Installation

```bash
# Clone the repository
cd ~/git/pcb_review

# Install dependencies
bun install
```

## Usage

### Basic Analysis

```bash
# Analyze a KiCad project directory
bun run src/cli.ts /path/to/kicad/project

# Output JSON to file with summary
bun run src/cli.ts /path/to/project -o analysis.json -s

# Include raw parsed data for detailed analysis
bun run src/cli.ts /path/to/project -o detailed.json --raw
```

### CLI Options

```
Usage: bun run src/cli.ts <project_directory> [options]

Options:
  -o, --output <file>    Output JSON file (default: stdout)
  -r, --raw              Include raw parsed data in output
  -q, --quiet            Suppress console output
  -s, --summary          Print analysis summary to console
  -h, --help             Show help message
```

### Programmatic Usage

```typescript
import { UnifiedAnalyzer } from "./src";

const analyzer = new UnifiedAnalyzer();
const result = await analyzer.analyze("/path/to/project");

console.log(result.summary);
console.log(result.components.byType);
```

## Output Structure

The analysis produces a JSON file with the following structure:

```typescript
interface AnalysisResult {
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
}
```

## LLM Analysis Prompts

The `prompts/` directory contains ready-to-use prompts for different analysis types:

| Prompt | Description |
|--------|-------------|
| `general-review.md` | Comprehensive design review covering all aspects |
| `power-analysis.md` | Detailed power architecture and distribution analysis |
| `signal-integrity.md` | High-speed signal and differential pair analysis |
| `manufacturing-dfm.md` | Design for manufacturing assessment |
| `component-bom.md` | Component selection and BOM analysis |

### Using Prompts with an LLM

1. Run the analyzer to generate JSON:
   ```bash
   bun run src/cli.ts ./my_project -o analysis.json
   ```

2. Copy a prompt from `prompts/` and replace `{ANALYSIS_JSON}` with your analysis output

3. Send to your preferred LLM (Claude, GPT-4, etc.)

## Component Type Detection

The analyzer automatically detects component types:

| Type | Description | Detection |
|------|-------------|-----------|
| `IC_MCU` | Microcontrollers | RP2040, STM32, ESP32, etc. |
| `IC_POWER` | Voltage regulators | TPS, LDO, buck, boost |
| `IC_MEMORY` | Flash/EEPROM | W25Q, AT25, etc. |
| `IC_LOGIC` | Logic ICs | SN74, buffers, drivers |
| `IC_USB` | USB controllers | CH340, FT232, etc. |
| `RESISTOR` | Resistors | R* reference |
| `CAPACITOR` | Capacitors | C* reference |
| `CONNECTOR_USB` | USB connectors | USB in value |
| `CONNECTOR_SD` | SD card slots | SD, microSD, TF |

## Example Output

```
======================================================================
PCB ANALYSIS SUMMARY
======================================================================

Project: /Users/josh/projects/my_board
Analyzed: 2024-01-15T10:30:00.000Z

----------------------------------------------------------------------
OVERVIEW
----------------------------------------------------------------------
  Components:      193
  Nets:            189
  Traces:          1542
  Vias:            360
  Copper Layers:   4
  Schematic Sheets: 5

----------------------------------------------------------------------
COMPONENTS BY TYPE
----------------------------------------------------------------------
  IC_MCU              1
  IC_POWER            2
  IC_LOGIC            4
  RESISTOR            45
  CAPACITOR           62
  CONNECTOR           12
```

## Project Structure

```
pcb_review/
├── src/
│   ├── parsers/
│   │   ├── sexpr.ts      # S-expression parser
│   │   ├── pcb.ts        # PCB file parser
│   │   ├── schematic.ts  # Schematic file parser
│   │   └── index.ts
│   ├── analyzers/
│   │   ├── unified.ts    # Combined analyzer
│   │   └── index.ts
│   ├── cli.ts            # CLI entry point
│   └── index.ts          # Package exports
├── prompts/
│   ├── general-review.md
│   ├── power-analysis.md
│   ├── signal-integrity.md
│   ├── manufacturing-dfm.md
│   └── component-bom.md
├── package.json
├── tsconfig.json
└── README.md
```

## API Reference

### UnifiedAnalyzer

```typescript
class UnifiedAnalyzer {
  // Analyze a KiCad project
  async analyze(projectPath: string, includeRawData?: boolean): Promise<AnalysisResult>;

  // Trace signal path between components
  traceSignalPath(start: string, end: string): string[] | null;

  // Get components connected to a net
  getComponentsOnNet(netName: string): string[];

  // Analyze thermal vias near a component
  analyzeThermalVias(componentRef: string, radius?: number): ThermalViaAnalysis | null;
}
```

### PCBParser

```typescript
class PCBParser {
  async parseFile(filepath: string): Promise<PCBData>;
  parseContent(content: string, filename?: string): PCBData;
}
```

### SchematicParser

```typescript
class SchematicParser {
  async parseProject(projectPath: string): Promise<SchematicData>;
  async parseSchematicFile(filepath: string): Promise<void>;
}
```

## Requirements

- [Bun](https://bun.sh/) v1.0 or later
- KiCad project files (`.kicad_pcb`, `.kicad_sch`)

## License

MIT
