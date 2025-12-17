# PCB Review Project

KiCad PCB/Schematic analyzer for LLM-assisted design review.

## Running the Analyzer

```bash
# Analyze a KiCad project (outputs to ./analysis/)
bun run src/cli.ts /path/to/kicad/project -s

# Specify output directory
bun run src/cli.ts /path/to/project -o ./my-analysis -s

# Include raw data for detailed analysis
bun run src/cli.ts /path/to/project -o ./detailed --raw
```

Output creates focused JSON files for LLM consumption:
- `summary.json` - Overview stats and quick reference
- `power.json` - Power nets, decoupling, zones, regulators
- `signals.json` - Differential pairs, traces, layer usage
- `components.json` - Component list and cross-reference
- `dfm.json` - Manufacturing specs, vias, trace widths

## Project Structure

- `src/parsers/` - KiCad file parsers (S-expr, PCB, Schematic)
- `src/analyzers/` - Analysis logic and JSON export
- `src/cli.ts` - Command-line interface
- `prompts/` - LLM prompts for different analysis types

## Key Types

- `PCBData` - Parsed PCB data with footprints, nets, traces, vias
- `SchematicData` - Parsed schematic with components, labels, sheets
- `AnalysisResult` - Combined analysis output for LLM consumption

## Development

```bash
# Run tests
bun test

# Type check
bun run typecheck

# Build standalone
bun run build
```

## Bun Conventions

- Use `bun <file>` instead of `node <file>`
- Use `bun test` for testing
- Use `bun install` for package management
