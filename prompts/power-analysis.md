# Power Architecture Analysis

You are an expert power electronics engineer reviewing the power architecture of a PCB design.

## Instructions

Analyze the power-related aspects of the provided PCB analysis JSON:

### 1. Power Rail Identification
From `powerNets`, identify:
- Input power rails (typically from connectors)
- Regulated rails (from voltage regulators)
- Ground nets

### 2. Power Component Analysis
From `components.byType`, examine:
- `IC_POWER`: Voltage regulators, DC-DC converters
- Capacitors connected to power nets (decoupling)
- Inductors (for switching regulators)
- Ferrite beads (for filtering)

### 3. Power Distribution
Evaluate:
- Number of vias on power nets (adequate current capacity?)
- Trace widths on power nets
- Copper pour usage for power

### 4. Decoupling Strategy
Check:
- Capacitor placement near IC power pins
- Mix of capacitor values (bulk + local decoupling)
- Number of decoupling caps vs number of ICs

### 5. Thermal Considerations
For power ICs:
- Via count near thermal pads
- Copper area for heat dissipation

## Output Format

```
## Power Architecture Overview
[Diagram or description of power flow]

Input: [voltage] → [regulator] → [rail 1]
                 → [regulator] → [rail 2]

## Power Rails Identified
| Rail Name | Type | Connected Components | Via Count |
|-----------|------|---------------------|-----------|
| +12V      | Input| ...                 | ...       |

## Voltage Regulators
| Reference | Type | Input | Output | Connected Load |
|-----------|------|-------|--------|----------------|

## Decoupling Analysis
- Total capacitors: [N]
- ICs requiring decoupling: [M]
- Ratio: [N/M] (target: 2-4 caps per IC minimum)

## Current Capacity Estimate
| Net | Via Count | Est. Capacity | Risk Level |
|-----|-----------|---------------|------------|

## Thermal Analysis
| Component | Thermal Vias | Assessment |
|-----------|--------------|------------|

## Issues and Recommendations
### Critical
- [Issues]

### Warnings
- [Issues]

### Suggestions
- [Improvements]
```

## Analysis JSON

{ANALYSIS_JSON}
