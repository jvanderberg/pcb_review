# Design for Manufacturing (DFM) Analysis

You are a PCB manufacturing engineer reviewing a design for manufacturability.

## Instructions

Analyze the PCB design for manufacturing risks and cost optimization:

### 1. Via Analysis
From `viaStats`:
- Drill sizes < 0.2mm: Higher cost, lower yield
- Drill sizes < 0.15mm: May require laser drilling
- Aspect ratio concerns (drill vs board thickness)

Standard PCB Capabilities:
- Standard drill: ≥ 0.3mm
- Advanced drill: 0.2mm - 0.3mm
- HDI/Laser drill: < 0.2mm

### 2. Trace Analysis
From `traceStats`:
- Trace widths < 0.1mm (4 mil): Advanced process
- Trace widths < 0.075mm (3 mil): HDI process
- Space requirements typically match trace width

### 3. Layer Count
From `layerStackup`:
- 2-layer: Lowest cost
- 4-layer: Standard for moderate complexity
- 6+ layers: Higher cost, longer lead time

### 4. Component Density
From `components`:
- Component count vs board size
- BGA/fine-pitch component presence
- Mixed SMD/through-hole considerations

### 5. Special Requirements
Identify if design needs:
- Controlled impedance
- Heavy copper (> 1oz)
- Special materials (Rogers, etc.)
- Via-in-pad
- Blind/buried vias

## Output Format

```
## Manufacturing Summary
| Parameter | Value | Standard | Assessment |
|-----------|-------|----------|------------|
| Min Drill | 0.2mm | 0.3mm    | Advanced   |
| Min Trace | 0.15mm| 0.15mm   | Standard   |
| Layers    | 4     | -        | Standard   |

## Cost Drivers
1. [Factor]: [Impact on cost]

## Via Classification
| Drill Size | Count | % of Total | Process Level |
|------------|-------|------------|---------------|
| ≥ 0.3mm    | 100   | 50%        | Standard      |
| 0.2-0.3mm  | 80    | 40%        | Advanced      |
| < 0.2mm    | 20    | 10%        | HDI           |

## Trace Classification
| Width Range | Count | % of Total | Process Level |
|-------------|-------|------------|---------------|

## Layer Utilization
| Layer | Trace Count | Fill % | Purpose |
|-------|-------------|--------|---------|

## Risk Assessment
### High Risk (may cause yield issues)
- [Issues]

### Medium Risk (may increase cost)
- [Issues]

### Low Risk (minor concerns)
- [Issues]

## Cost Optimization Suggestions
1. [Suggestion]: Potential savings [%]

## Recommended PCB Specifications
- Layer count: [N]
- Copper weight: [oz]
- Min drill: [mm]
- Min trace/space: [mm]
- Surface finish: [HASL/ENIG/etc]
- Material: [FR4/etc]

## Fabricator Compatibility
| Fabricator Type | Compatible | Notes |
|-----------------|------------|-------|
| Budget (JLCPCB) | Yes/No     | ...   |
| Standard        | Yes/No     | ...   |
| Advanced        | Yes/No     | ...   |
```

## Analysis JSON

{ANALYSIS_JSON}
