# Power Delivery Analysis

You are a power electronics engineer analyzing whether a PCB's power distribution network can adequately supply all connected loads.

## Instructions

Using the provided PCB analysis JSON, perform a detailed power budget analysis:

### 1. Load Identification

For each power rail, identify connected ICs and estimate their current draw based on typical specifications:

**Common IC Current Estimates:**

| IC Type | Typical Current | Peak Current |
|---------|-----------------|--------------|
| Microcontroller (ARM Cortex-M) | 20-100mA | 150mA |
| MCU Core Rail (1.0-1.2V) | 30-100mA | 200mA |
| QSPI/SPI Flash | 15-25mA | 50mA |
| SDRAM/DDR | 50-200mA | 500mA |
| Level Shifter (per IC) | 5-20mA | 50mA |
| RS-485/Differential Transceiver | 40-120mA | 200mA |
| Ethernet PHY | 100-300mA | 500mA |
| USB Hub/Controller | 50-100mA | 200mA |
| LDO Regulator (quiescent) | 1-5mA | - |
| Buck/Boost Regulator (quiescent) | 5-20mA | - |
| Op-Amp (per device) | 1-10mA | 20mA |
| LED Driver IC | 20-60mA | 100mA |
| SD Card (active) | 50-100mA | 200mA |
| Display Controller | 10-50mA | 100mA |
| Audio Codec | 10-30mA | 50mA |
| Sensor ICs | 1-20mA | 50mA |
| Motor Driver | 100mA-2A | 5A |
| RF/Wireless Module | 50-300mA | 500mA |

### 2. Via Current Capacity

Calculate via current capacity using standard estimates:

**Via Current Capacity (1oz copper, 10°C rise):**
| Drill Size | Current Capacity |
|------------|------------------|
| 0.15mm | 0.3-0.5A per via |
| 0.20mm | 0.5-0.7A per via |
| 0.25mm | 0.7-0.9A per via |
| 0.30mm | 0.9-1.2A per via |
| 0.40mm | 1.2-1.5A per via |
| 0.50mm | 1.5-2.0A per via |

**For via arrays:** Total capacity = N × single via capacity × 0.7 (derating for thermal interaction)

### 3. Trace Current Capacity

Estimate trace capacity (1oz copper, outer layer, 10°C rise):

| Width | Current Capacity |
|-------|------------------|
| 0.10mm | 0.2-0.3A |
| 0.15mm | 0.3-0.4A |
| 0.20mm | 0.4-0.5A |
| 0.25mm | 0.5-0.7A |
| 0.30mm | 0.7-0.9A |
| 0.40mm | 0.9-1.2A |
| 0.50mm | 1.2-1.5A |
| 1.00mm | 2.0-3.0A |

**Inner layers:** Reduce capacity by 50% due to reduced heat dissipation.

### 4. Copper Pour Capacity

For copper pours/zones, capacity depends on:
- Pour area and shape
- Distance from source to load
- Number of vias connecting to pour
- Thermal relief settings

General guideline: Well-designed copper pour can handle 5-20A depending on size and thermal characteristics.

### 5. Regulator Capacity

Check that upstream regulators can supply the total load:
- Identify regulator ICs from component list
- Look up typical output current ratings
- Verify total load is within regulator capacity with margin

## Output Format

```
## Power Budget Analysis

### Rail: [RAIL_NAME]

**Source:** [Input connector/regulator]
**Nominal Voltage:** [V]

#### Connected Loads
| Component | Type | Est. Current | Peak Current | Notes |
|-----------|------|--------------|--------------|-------|

**Total Estimated Load:** [X] mA typical, [Y] mA peak

#### Distribution Capacity
| Path Element | Count/Size | Capacity |
|--------------|------------|----------|
| Vias to plane | N × [size] | [X]A |
| Copper pour | [Yes/No] | [X]A |
| Trace bottleneck | [width] | [X]A |

**Effective Capacity:** [X] A (limited by [bottleneck])

#### Assessment
- **Margin:** [Capacity] / [Peak Load] = [X]x
- **Status:** [PASS/MARGINAL/FAIL]
- **Recommendations:** [If any]

---

## Summary Table

| Rail | Load (typ) | Load (peak) | Capacity | Margin | Status |
|------|------------|-------------|----------|--------|--------|

## Critical Findings

### Issues
- [Any rails with insufficient margin (<2x)]

### Recommendations
- [Improvements if needed]

## Design Rules of Thumb

- **Minimum margin:** 2x peak load capacity recommended
- **Thermal consideration:** Derate by 50% if ambient >50°C
- **Transient response:** Add bulk capacitance for loads with high di/dt
- **Voltage drop:** Calculate IR drop for long traces (target <3% of rail voltage)
```

## Analysis JSON

{ANALYSIS_JSON}
