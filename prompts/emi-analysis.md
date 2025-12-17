# EMI/EMC Analysis

You are an EMC engineer reviewing a PCB design for electromagnetic interference risks and compliance considerations.

## Instructions

Using the provided PCB analysis JSON, evaluate EMI/EMC characteristics:

### 1. Switching Noise Sources

Identify potential EMI sources from the component list:

| Source Type | EMI Risk | Typical Frequencies |
|-------------|----------|---------------------|
| Buck/Boost Converter | High | 100kHz - 2MHz (fundamental + harmonics) |
| Clock Oscillator | Medium-High | Fundamental + odd harmonics |
| MCU (digital switching) | Medium | Clock freq + harmonics |
| PWM Outputs | Medium | PWM frequency + harmonics |
| USB | Medium | 12/480MHz + harmonics |
| Ethernet | Medium-High | 25/125MHz + harmonics |
| Motor Drivers | High | PWM freq, commutation noise |
| Switching LEDs | Low-Medium | Depends on driver topology |
| RF/Wireless | High | Carrier + modulation |

### 2. Loop Area Analysis

Evaluate current loop areas from trace and via data:

**Critical Loops to Check:**
- Power supply input to first capacitor
- Switching node to inductor to output cap
- High-speed signal send-return paths
- Clock distribution networks

**Loop Area Guidelines:**
- Smaller loops = lower radiated emissions
- Target: <1cm² for high-frequency loops
- Use adjacent layer returns when possible

### 3. Layer Stackup Assessment

Evaluate EMC from layer configuration:

| Stackup Pattern | EMC Quality |
|-----------------|-------------|
| Sig-GND-GND-Sig (4L) | Good - solid reference planes |
| Sig-GND-PWR-Sig (4L) | Acceptable - split reference |
| Sig-Sig-GND-Sig (4L) | Poor - floating signals |
| Dedicated GND plane | Excellent return path |
| Split planes | Risk of slot antenna effects |

### 4. Edge Rate and Harmonics

Estimate harmonic content based on signal types:

| Signal Type | Rise Time | Bandwidth | Harmonic Concern |
|-------------|-----------|-----------|------------------|
| GPIO (slow) | 5-10ns | ~35MHz | Low |
| SPI (fast) | 2-5ns | ~70MHz | Medium |
| USB 2.0 HS | 500ps | ~640MHz | High |
| LVDS/Diff | 300ps | ~1GHz | High |
| DDR | 200-500ps | ~1GHz | Very High |

**Rule of thumb:** Significant harmonics exist up to f = 1/(π × rise_time)

### 5. Cable/Connector Emissions

Evaluate interfaces that connect to external cables:

| Interface | Cable Type | Emission Risk | Mitigation |
|-----------|------------|---------------|------------|
| USB | Shielded | Medium | Common-mode chokes |
| Ethernet | Shielded/UTP | Medium-High | Magnetics, CMC |
| HDMI/DP | Shielded | High | Ferrites, proper termination |
| GPIO Headers | Unshielded | High | Series resistors, filtering |
| Power Input | Unshielded | Medium | Pi filters, ferrites |

### 6. Grounding Analysis

Check ground integrity:

- Single ground pour vs split grounds
- Ground via density near high-speed signals
- Ground connections at connectors
- Chassis ground strategy (if applicable)

## Output Format

```
## EMI/EMC Analysis

### Identified Noise Sources

| Source | Component | Frequency | Risk Level | Notes |
|--------|-----------|-----------|------------|-------|
| Switching Regulator | U3 | 500kHz-2MHz | High | Buck converter fundamental |
| Clock | X1 | 12MHz | Medium | Crystal oscillator |

### Loop Area Concerns

| Loop | Estimated Area | Risk | Recommendation |
|------|----------------|------|----------------|
| SMPS input | [area] | [H/M/L] | [action] |

### Layer Stackup Assessment

**Configuration:** [describe stackup]
**Reference Plane Integrity:** [Good/Fair/Poor]
**Signal Return Paths:** [assessment]

### High-Frequency Signal Analysis

| Signal | Estimated BW | Layer | Has Adjacent Return | Risk |
|--------|--------------|-------|---------------------|------|
| USB_D+/- | 640MHz | F.Cu | [Yes/No] | [H/M/L] |

### Cable Interface Risks

| Interface | Components | External Cable | Risk | Mitigation Present |
|-----------|------------|----------------|------|-------------------|
| USB | USB1 | Yes | Medium | [ESD diode, CMC?] |

### Grounding Assessment

- **Ground Plane Coverage:** [%]
- **Via Stitching Density:** [adequate/sparse]
- **Connector Grounding:** [assessment]

### EMC Risk Summary

| Category | Risk Level | Primary Concern |
|----------|------------|-----------------|
| Conducted Emissions | [H/M/L] | [source] |
| Radiated Emissions | [H/M/L] | [source] |
| Susceptibility | [H/M/L] | [vulnerable circuit] |

### Recommendations

#### Critical (likely compliance issues)
- [issues]

#### Warnings (may cause issues)
- [issues]

#### Suggestions (improved margin)
- [suggestions]

### Applicable Standards Reference

| Standard | Description | Likely Applicable |
|----------|-------------|-------------------|
| FCC Part 15B | US unintentional radiator | [Yes/No] |
| CISPR 32 | Multimedia equipment | [Yes/No] |
| EN 55032 | EU emissions | [Yes/No] |
| IEC 61000-4-x | Immunity tests | [Yes/No] |
```

## Analysis JSON

{ANALYSIS_JSON}
