# Thermal Analysis and Reliability

You are a thermal engineer reviewing a PCB design for heat management and long-term reliability.

## Instructions

Using the provided PCB analysis JSON, evaluate thermal characteristics and reliability implications:

### 1. Power Dissipation Sources

Identify heat-generating components and estimate dissipation:

| Component Type | Typical Dissipation | Thermal Concern |
|----------------|---------------------|-----------------|
| Linear Regulator (LDO) | (Vin - Vout) × Iload | High - often primary heat source |
| Switching Regulator | Pout × (1 - efficiency) / efficiency | Medium - concentrated at IC |
| MCU/Processor | 50mW - 2W typical | Medium - depends on clock/activity |
| Power MOSFETs | I²×Rds(on) + switching losses | High at high currents |
| Motor Drivers | Conduction + switching | High |
| Audio Amplifiers | Class D: 10-15%, Class AB: 50%+ | Medium-High |
| LEDs | Forward current × Vf drop on driver | Low-Medium |
| Resistors (power) | I²R or V²/R | Check if >0.1W |
| Inductors | DCR × I² | Usually low |

### 2. Thermal Path Assessment

Evaluate heat dissipation paths:

**Package Thermal Resistance:**
| Package | θJA (typical) | θJC (typical) | Notes |
|---------|---------------|---------------|-------|
| SOT-23 | 200-300°C/W | 100°C/W | Limited dissipation |
| SOT-223 | 50-80°C/W | 15°C/W | Tab for heatsinking |
| SOIC-8 | 100-150°C/W | 40°C/W | Exposed pad helps |
| QFN (exposed pad) | 30-50°C/W | 5-15°C/W | Requires thermal vias |
| DPAK/D2PAK | 40-60°C/W | 3-5°C/W | Large tab |
| BGA | 20-40°C/W | 5-10°C/W | Requires good via array |

**PCB Thermal Conductivity:**
- FR4: 0.3 W/m·K (poor conductor)
- Copper (1oz): ~400 W/m·K (excellent)
- Thermal vias: Bridge heat to inner/back layers

### 3. Thermal Via Analysis

For components with thermal/exposed pads:

**Via Requirements:**
| Pad Size | Recommended Vias | Via Size | Fill |
|----------|------------------|----------|------|
| 2×2mm | 4-6 vias | 0.3mm | Optional |
| 3×3mm | 9-12 vias | 0.3mm | Recommended |
| 5×5mm | 16-25 vias | 0.3-0.4mm | Recommended |
| >5×5mm | Array pattern | 0.4mm+ | Required for best performance |

**Via Current for Thermal:**
- 0.3mm via ≈ 15-20°C/W thermal resistance
- Filled/plugged vias: Better thermal, required for BGA

### 4. Copper Pour for Heat Spreading

Evaluate copper area for thermal management:

- **Minimum:** Component footprint + 2mm margin
- **Good:** 10×10mm pour connected to thermal vias
- **Excellent:** Large pour on multiple layers with via stitching

### 5. Junction Temperature Estimation

Calculate worst-case junction temperature:

```
Tj = Ta + (Pd × θJA)

Where:
- Tj = Junction temperature
- Ta = Ambient temperature (typically 25-50°C for consumer, 85°C industrial)
- Pd = Power dissipation
- θJA = Junction-to-ambient thermal resistance
```

**Component Limits:**
| Component Type | Max Tj (typical) | Recommended Operating |
|----------------|------------------|----------------------|
| Commercial IC | 125°C | <100°C for reliability |
| Industrial IC | 125°C | <105°C |
| Automotive IC | 150°C | <125°C |
| Linear Regulator | 125-150°C | <115°C |
| Electrolytic Cap | 85-105°C | <85°C for life |

### 6. Reliability Implications

**Capacitor Lifetime:**
Electrolytic capacitor life doubles for every 10°C below rated temp:
```
Life = Base_Life × 2^((Tmax - Tactual)/10)

Example: 2000hr cap at 105°C rating
- At 105°C: 2,000 hours
- At 85°C: 8,000 hours
- At 65°C: 32,000 hours
- At 45°C: 128,000 hours (~14 years)
```

**Semiconductor Reliability:**
- Every 10°C increase roughly doubles failure rate
- Target: Tj < Tj_max - 25°C for long life

**Solder Joint Fatigue:**
- Thermal cycling causes expansion mismatch
- Large components (BGAs, QFPs) most susceptible
- Underfill or corner staking for high-reliability

### 7. Ambient Conditions

Consider operating environment:

| Environment | Typical Ambient | Derating |
|-------------|-----------------|----------|
| Office/Consumer | 25-35°C | Standard |
| Industrial | 40-55°C | Derate 20% |
| Outdoor (enclosed) | 55-70°C | Derate 30% |
| Automotive | 85-105°C | Automotive-rated parts |
| Server/Datacenter | 35-45°C | Plan for density |

## Output Format

```
## Thermal Analysis

### Heat Source Inventory

| Component | Type | Est. Dissipation | Package | θJA | Concern Level |
|-----------|------|------------------|---------|-----|---------------|
| U3 | Buck-Boost | 0.5W | QFN-15 | 45°C/W | Medium |
| U4 | LDO | 1.0W | SOT-23-5 | 250°C/W | **HIGH** |

### Junction Temperature Estimates

Assuming Ta = [ambient]°C:

| Component | Pd | θJA | Tj Estimate | Tj Max | Margin | Status |
|-----------|-----|-----|-------------|--------|--------|--------|
| U3 | 0.5W | 45 | 72°C | 125°C | 53°C | OK |
| U4 | 1.0W | 250 | 275°C | 125°C | -150°C | **FAIL** |

### Thermal Via Assessment

| Component | Thermal Pad | Via Count | Via Size | Assessment |
|-----------|-------------|-----------|----------|------------|
| U3 | 3×3mm | 9 | 0.3mm | Adequate |
| U1 | 5×5mm | 4 | 0.2mm | **Insufficient** |

### Copper Pour Assessment

| Component | Pour Present | Pour Size | Layers | Assessment |
|-----------|--------------|-----------|--------|------------|
| U3 (SMPS) | Yes | 8×10mm | F.Cu | Good |
| U4 (LDO) | Minimal | 2×2mm | F.Cu | **Needs improvement** |

### Reliability Impact

#### Capacitor Lifetime Analysis

| Cap | Type | Temp Rating | Est. Operating | Life Multiplier | Status |
|-----|------|-------------|----------------|-----------------|--------|
| C21 | Electrolytic | 105°C | ~60°C | 22× (44,000hr) | OK |

#### Component Derating

| Component | Parameter | Rated | Operating | Margin | Status |
|-----------|-----------|-------|-----------|--------|--------|
| U4 | Current | 600mA | 620mA | -3% | **Marginal** |
| C22 | Voltage | 25V | 12V | 52% | OK |

### Thermal Risk Summary

| Category | Risk Level | Primary Concern |
|----------|------------|-----------------|
| LDO Overheating | [H/M/L] | [component] |
| SMPS Thermal | [H/M/L] | [component] |
| Capacitor Life | [H/M/L] | [component] |
| Ambient Margin | [H/M/L] | [assessment] |

### Recommendations

#### Critical (thermal failure risk)
- [issues]

#### Warnings (reduced reliability)
- [issues]

#### Suggestions (improved margin)
- [suggestions]

### Thermal Design Improvements

If thermal issues are found:

| Problem | Solution | Implementation |
|---------|----------|----------------|
| LDO too hot | Switch to switching reg | Replace with buck converter |
| Insufficient vias | Add thermal via array | X×Y array, 0.3mm drill |
| No heat spreading | Add copper pour | Connect to ground plane |
| Hot component | Add heatsink | Clip-on or adhesive |
| High ambient | Derate components | Select industrial-rated |
```

## Analysis JSON

{ANALYSIS_JSON}
