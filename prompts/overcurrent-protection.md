# Short Circuit and Overcurrent Protection Analysis

You are a power systems engineer reviewing a PCB design for adequate protection against overcurrent conditions, short circuits, and fault scenarios.

## Instructions

Using the provided PCB analysis JSON, evaluate protection mechanisms:

### 1. Protection Device Identification

Look for these protection components in the design:

| Device Type | Typical Designators | Function |
|-------------|---------------------|----------|
| Fuse (resettable PTC) | F*, PTC* | Overcurrent, self-resetting |
| Fuse (one-time) | F* | Overcurrent, requires replacement |
| Current Sense Resistor | R* (low ohm) | Current monitoring |
| Current Limit IC | U* | Active current limiting |
| Hot-Swap Controller | U* | Inrush + overcurrent |
| eFuse | U* | Electronic fuse with OCP |
| Circuit Breaker | CB* | Resettable mechanical |
| Ideal Diode Controller | U* | Reverse + overcurrent |
| Load Switch | U* | Often has current limit |

### 2. Input Protection Requirements

Evaluate protection at power entry points:

| Input Type | Recommended Protection |
|------------|----------------------|
| USB (device) | 500mA-2A PTC or eFuse |
| USB-PD | eFuse with OVP/OCP |
| Barrel Jack (wall adapter) | Fuse + reverse polarity |
| Battery | Fuse + BMS with OCP |
| PoE | PoE controller with limits |
| Industrial 24V | Fuse + TVS + reverse |
| Automotive 12V | Fuse + TVS + load dump |

### 3. Rail Protection Analysis

For each power rail, evaluate:

**Upstream Protection:**
- What limits current if this rail shorts?
- Is the protection fast enough?
- Does the fuse/limit match wire/trace rating?

**Regulator Built-in Protection:**
| Regulator Type | Typical Built-in Protection |
|----------------|---------------------------|
| Linear (LDO) | Thermal shutdown, sometimes current limit |
| Buck | Cycle-by-cycle OCP, hiccup mode |
| Boost | Current limit, sometimes foldback |
| Buck-Boost | OCP on both sides |

### 4. Output Protection

For outputs that connect to external loads:

| Output Type | Risk | Recommended Protection |
|-------------|------|----------------------|
| GPIO to connector | Short to GND/VCC | Series resistor (100-470Ω) |
| Power output | Overload | Fuse, current limit, or PTC |
| Motor driver | Stall current | Current sense + shutdown |
| LED driver | Short LED | Current limit inherent |
| USB host port | Device fault | 500mA limit per port |
| Hot-pluggable | Inrush + short | Hot-swap controller |

### 5. Trace and Via Current Ratings

Cross-reference protection ratings with PCB capability:

| Element | Current Rating (1oz, 10°C rise) |
|---------|--------------------------------|
| 0.15mm trace | 0.3-0.4A |
| 0.25mm trace | 0.5-0.7A |
| 0.50mm trace | 1.2-1.5A |
| 1.00mm trace | 2.0-3.0A |
| 0.3mm via | 0.9-1.2A |
| Copper pour | Depends on geometry |

**Rule:** Protection should trip BEFORE traces are damaged.

### 6. Fault Current Analysis

Estimate worst-case fault currents:

| Scenario | Fault Current Estimate |
|----------|----------------------|
| Output short to GND | V_rail / (R_source + R_trace) |
| Reverse polarity | Limited by series diode/fuse |
| Regulator failure | Input source capability |
| Capacitor short | Very high (source limited) |

### 7. Coordination

Verify protection devices are properly coordinated:
- Downstream fuse should blow before upstream
- Current limits should be selective
- No single fault should cascade

## Output Format

```
## Overcurrent Protection Analysis

### Power Entry Points

| Entry Point | Voltage | Max Current | Protection Device | Rating | Status |
|-------------|---------|-------------|-------------------|--------|--------|
| USB | 5V | 500mA | [device] | [rating] | [OK/Missing/Undersized] |
| DC Jack | 12V | 2A | [device] | [rating] | [OK/Missing/Undersized] |

### Rail-by-Rail Protection

#### Rail: [RAIL_NAME]

**Source:** [upstream regulator/input]
**Expected Load:** [current]
**Fault Current (estimated):** [current if shorted]

| Protection Layer | Device | Rating | Response Time | Status |
|------------------|--------|--------|---------------|--------|
| Input fuse | F1 | 2A | 10ms @ 200% | Present |
| Regulator OCP | U3 | 1.5A | <1µs | Built-in |
| Downstream | None | - | - | Missing |

**Assessment:** [Protected/Partially Protected/Unprotected]

---

### Output Protection

| Output | Type | External Connection | Protection | Status |
|--------|------|---------------------|------------|--------|
| GPIO header | Signal | Yes | [None/Resistor/Fuse] | [OK/Risk] |
| Power connector | Power | Yes | [Fuse rating] | [OK/Risk] |

### Trace/Via vs Protection Coordination

| Path | Trace Rating | Protection Rating | Coordination |
|------|--------------|-------------------|--------------|
| +12V input | 2A (0.5mm) | 3A fuse | FAIL - fuse too large |
| +5V rail | 1.5A (0.4mm) | 1A regulator OCP | OK |

### Fault Scenario Analysis

| Scenario | Fault Current | Protection Response | Outcome |
|----------|---------------|---------------------|---------|
| +5V short to GND | ~10A | U3 OCP @ 2A, <1µs | Safe shutdown |
| Output cable short | ~2A | No protection | Trace damage risk |

### Protection Summary

| Category | Status |
|----------|--------|
| Input Protection | [Adequate/Partial/Missing] |
| Rail Protection | [Adequate/Partial/Missing] |
| Output Protection | [Adequate/Partial/Missing] |
| Trace Coordination | [OK/Issues] |

### Recommendations

#### Critical (safety/damage risk)
- [issues requiring immediate attention]

#### Warnings (reliability risk)
- [issues that may cause problems]

#### Suggestions (improved robustness)
- [nice-to-have improvements]

### Common Protection Solutions

If protection is missing, consider:

| Problem | Solution | Example Parts |
|---------|----------|---------------|
| No input fuse | Add PTC or fuse | Littelfuse 1206L, Bourns MF-MSMF |
| No reverse polarity | P-FET + controller or Schottky | Si2301, SS34 |
| Unprotected output | Series PTC or resistor | 0ZCJ series, 100Ω |
| No current monitoring | Current sense resistor + comparator | 10mΩ + LM393 |
| USB port protection | Dedicated USB switch | TPS2051, AP2141 |
```

## Analysis JSON

{ANALYSIS_JSON}
