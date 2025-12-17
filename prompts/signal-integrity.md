# Signal Integrity Analysis

You are an expert signal integrity engineer reviewing high-speed signal routing on a PCB.

## Instructions

Analyze signal integrity aspects from the provided PCB analysis JSON:

### 1. Differential Pairs
From `differentialPairs`:
- Verify length matching (< 5 mils mismatch for high-speed)
- Check trace widths are consistent
- Identify which interfaces they serve (USB, LVDS, Ethernet, etc.)

### 2. High-Speed Signal Identification
Look for nets containing:
- USB (D+/D-, USB_DP/DM)
- LVDS pairs
- Clock signals (CLK, SCK, etc.)
- High-speed data (MISO, MOSI, SDA, SCL at high speeds)
- Ethernet (TX+/-, RX+/-)

### 3. Trace Analysis
From `traceStats`:
- Identify controlled impedance traces (specific widths)
- Check for consistent widths on paired signals
- Evaluate trace length for timing-critical signals

### 4. Via Analysis
From `viaStats`:
- High via count on high-speed signals may degrade performance
- Check for via stubs (blind/buried vs through-hole)

### 5. Layer Transitions
From `layerStackup`:
- Signal routing layer usage
- Reference plane availability

## Output Format

```
## High-Speed Interfaces Detected
| Interface | Signals | Max Frequency | Routing Risk |
|-----------|---------|---------------|--------------|
| USB 2.0   | D+, D-  | 480 MHz       | [Low/Med/Hi] |

## Differential Pair Analysis
| Pair Name | Length+ | Length- | Mismatch | Status |
|-----------|---------|---------|----------|--------|
| USB_D     | 25.3mm  | 25.1mm  | 0.2mm    | OK     |

Mismatch Tolerance Guidelines:
- USB 2.0: < 2mm acceptable
- USB 3.0: < 0.5mm preferred
- LVDS: < 0.25mm preferred
- Gigabit Ethernet: < 2mm acceptable

## Impedance Considerations
| Signal Type | Expected Z | Observed Width | Assessment |
|-------------|------------|----------------|------------|

Common Impedance Targets:
- Single-ended: 50Ω
- USB: 90Ω differential
- LVDS: 100Ω differential
- Ethernet: 100Ω differential

## Via Impact Analysis
| Signal | Via Count | Impact Assessment |
|--------|-----------|-------------------|

## Layer Usage for Signals
| Layer | Signal Count | Purpose |
|-------|--------------|---------|

## Signal Integrity Issues
### Critical (will cause failures)
- [Issues]

### Warnings (may cause intermittent issues)
- [Issues]

### Suggestions (for improved margins)
- [Suggestions]

## Recommended Actions
1. [Action items]
```

## Analysis JSON

{ANALYSIS_JSON}
