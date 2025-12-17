# PCB Fabricator Capabilities Reference

Use these specifications when evaluating manufacturability. These are ACTUAL capabilities from major PCB fabricators - do not flag features as problematic if they meet these specs.

## JLCPCB (Budget/Fast)

| Parameter | 2-Layer | 4+ Layer (1oz) | Notes |
|-----------|---------|----------------|-------|
| Min Trace Width | 5 mil (0.127mm) | 3.5 mil (0.09mm) | Standard capability |
| Min Trace Spacing | 5 mil (0.127mm) | 3.5 mil (0.09mm) | Standard capability |
| Min Via Drill | 0.15mm | 0.15mm | Mechanical drilling |
| Min Via Diameter | 0.25mm outer | 0.25mm outer | Drill + annular ring |
| Recommended Via | 0.3mm+ drill | 0.3mm+ drill | For lower cost |
| Min Annular Ring | 0.05mm | 0.05mm | |
| Layers | 1-20 | 1-20 | |
| Board Thickness | 0.4-2.4mm | 0.4-2.4mm | Standard range |
| Copper Weight | 1-2oz outer | 1-2oz outer | Heavier available |

Source: https://jlcpcb.com/capabilities/pcb-capabilities

## PCBWay (Standard)

| Parameter | Standard | Advanced | Notes |
|-----------|----------|----------|-------|
| Min Trace Width | 4 mil (0.1mm) | 3.5 mil (0.09mm) | |
| Min Trace Spacing | 4 mil (0.1mm) | 3.5 mil (0.09mm) | |
| Min Via Drill | 0.15mm | 0.15mm | |
| Min Via Diameter | 0.4mm | 0.4mm | |
| Min Annular Ring | 6 mil (0.15mm) | 0.1mm | |
| Layers | 1-14 standard | 16-24 | 24+ with review |
| Board Thickness | 0.2-3.2mm | 0.2-3.2mm | |
| Copper Weight | 1-8oz outer | 1-8oz outer | |

Source: https://www.pcbway.com/capabilities.html

## Quick Reference Guidelines

### Trace Width
- **0.09mm (3.5 mil)**: Achievable at JLCPCB (4+ layer) and PCBWay - NOT problematic
- **0.1mm (4 mil)**: Standard capability at most fabs - NOT problematic
- **0.127mm (5 mil)**: Safe for all fabs including 2-layer

### Via Drill Size
- **0.15mm**: Standard minimum at budget fabs, could add extra cost
- **0.2mm**: Very safe, no concerns
- **0.3mm+**: Optimal for cost/reliability balance
- For JLCPCB, 0.45 outer/0.2 drill is the smallest via without an upcharge.

### Special Considerations
- **Via-in-pad**: Requires filled/capped vias - adds cost, verify fab supports it
- **Blind/buried vias**: Significant cost increase, not available at all fabs
- **Controlled impedance**: Available at most fabs, specify in order
- **Heavy copper (>2oz)**: Available but increases cost and lead time
