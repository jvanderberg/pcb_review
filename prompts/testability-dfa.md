# Testability and Design for Assembly (DFA) Analysis

You are a manufacturing engineer reviewing a PCB design for testability, debug access, and assembly considerations.

## Instructions

Using the provided PCB analysis JSON, evaluate testability and assembly characteristics:

### 1. Test Point Analysis

Identify test point coverage:

**Recommended Test Points:**
| Signal Type | Priority | Purpose |
|-------------|----------|---------|
| Power rails (+3.3V, +5V, etc.) | Critical | Verify power-up, measure voltage |
| Ground | Critical | Probe reference, current measurement |
| Reset/Boot signals | High | Debug, recovery |
| Clock signals | High | Verify oscillator function |
| Communication buses (SPI, I2C, UART) | High | Debug interface |
| Analog inputs/outputs | Medium | Calibration, verification |
| GPIO status signals | Medium | Functional test |
| High-current paths | Medium | Current measurement |

**Test Point Specifications:**
| Parameter | Minimum | Recommended |
|-----------|---------|-------------|
| Pad size | 0.9mm | 1.0-1.5mm |
| Spacing | 2.0mm | 2.54mm (0.1") |
| Via test point | 0.5mm pad | 0.8mm+ for probing |

### 2. Debug Interface Access

Check for programming and debug interfaces:

| Interface | Components | Required Access |
|-----------|------------|-----------------|
| SWD (ARM) | SWCLK, SWDIO, GND, (VCC, RST) | 4-6 pin header |
| JTAG | TDI, TDO, TMS, TCK, GND, (VCC, RST) | 10-20 pin header |
| UART | TX, RX, GND | 3-4 pin header |
| USB DFU | USB connector | Boot mode access |
| ISP/SPI | MOSI, MISO, SCK, CS, GND, VCC | 6 pin header |

**Boot Mode Access:**
- Boot select pins accessible?
- Can enter bootloader without disassembly?
- Reset button accessible?

### 3. Bed-of-Nails / ICT Compatibility

For in-circuit test (ICT) compatibility:

**Requirements:**
| Parameter | Requirement |
|-----------|-------------|
| Test pad size | ≥1.0mm diameter |
| Test pad spacing | ≥2.0mm center-to-center |
| Test pad location | Same side (usually bottom) |
| Keep-out from edges | ≥3mm from board edge |
| Grid alignment | 2.54mm (100 mil) or 1.27mm (50 mil) |

**Coverage Goals:**
- All power nets: Test points for voltage verification
- All IC power pins: Accessible for opens testing
- Net coverage: >90% of nets testable

### 4. Assembly Considerations (DFA)

**Component Placement:**
| Criterion | Good Practice |
|-----------|---------------|
| Orientation | All ICs same orientation (or 90°) |
| Polarity marking | Clear silkscreen for diodes, caps, connectors |
| Component spacing | ≥0.5mm between components |
| Tall components | Away from small components (shadow effect) |
| Fine-pitch | Accessible for rework |
| Fiducials | 3 global + local for fine-pitch |

**Solder Considerations:**
| Issue | Risk Factors | Mitigation |
|-------|--------------|------------|
| Tombstoning | Unbalanced pads, small passives | Equal pad size, thermal relief |
| Bridging | Fine pitch, insufficient mask | Adequate solder mask |
| Insufficient solder | Large thermal mass | Thermal relief on pads |
| Voids | Via-in-pad | Fill or cap vias |

### 5. Panelization Compatibility

For production panels:

| Feature | Requirement |
|---------|-------------|
| Board edge clearance | ≥3mm for routing/V-score |
| Tooling holes | 2-4 holes, 3.2mm diameter |
| Fiducials | 3 per panel, plus per-board |
| Break-away tabs | Components clear of tab area |

### 6. Rework Accessibility

Evaluate ability to rework/replace components:

| Component Type | Rework Consideration |
|----------------|---------------------|
| BGA | Requires reballing station, clearance for nozzle |
| QFN | Hot air accessible, thermal relief needed |
| Fine-pitch QFP | Drag soldering possible |
| 0201/01005 | Difficult hand rework |
| Through-hole | Easy rework |
| Connectors | May need mechanical support |

### 7. Visual Inspection Access

For AOI and manual inspection:

- Component markings visible after assembly?
- Reference designators readable?
- Polarity indicators visible?
- Solder joints inspectable?

## Output Format

```
## Testability and DFA Analysis

### Test Point Inventory

| Signal/Net | Test Point | Size | Location | Access | Status |
|------------|------------|------|----------|--------|--------|
| +3V3 | TP1 | 1.0mm | F.Cu | Top | OK |
| GND | Via only | 0.3mm | - | Poor | **Needs TP** |
| SWCLK | TP3 | 1.0mm | F.Cu | Top | OK |
| UART_TX | None | - | - | None | **Missing** |

### Test Coverage Assessment

| Category | Available | Needed | Coverage | Status |
|----------|-----------|--------|----------|--------|
| Power Rails | 3 | 5 | 60% | **Incomplete** |
| Ground | 1 | 3+ | 33% | **Incomplete** |
| Debug Signals | 2 | 4 | 50% | **Incomplete** |
| Communication | 0 | 4 | 0% | **Missing** |

### Debug Interface Assessment

| Interface | Present | Components | Accessible | Status |
|-----------|---------|------------|------------|--------|
| SWD | Yes | J1 | Header exposed | OK |
| UART | No | - | - | **Consider adding** |
| USB DFU | Yes | USB1 | Connector | OK |

**Boot Mode Access:**
- Boot button: [Present/Missing]
- Reset button: [Present/Missing]
- Boot pins accessible: [Yes/No]

### ICT/Bed-of-Nails Compatibility

| Criterion | Status | Notes |
|-----------|--------|-------|
| Test pad size | [OK/Undersized] | [sizes found] |
| Test pad spacing | [OK/Too close] | [min spacing] |
| Single-side access | [Yes/Mixed] | [description] |
| Grid alignment | [Yes/No] | [grid used] |
| Net coverage | [X%] | [assessment] |

**ICT Recommendation:** [Compatible / Needs work / Flying probe recommended]

### Assembly (DFA) Assessment

#### Component Placement
| Criterion | Status | Notes |
|-----------|--------|-------|
| IC orientation | [Consistent/Mixed] | [description] |
| Polarity marking | [Clear/Missing] | [components] |
| Component spacing | [OK/Tight] | [min spacing] |
| Fiducials | [Present/Missing] | [count, location] |

#### Solder Risk Assessment
| Risk | Level | Affected Components |
|------|-------|---------------------|
| Tombstoning | [H/M/L] | [0402 passives, etc.] |
| Bridging | [H/M/L] | [fine-pitch ICs] |
| Thermal issues | [H/M/L] | [ground-connected pads] |
| Via-in-pad voids | [H/M/L] | [QFN, BGA] |

### Rework Assessment

| Component | Package | Rework Difficulty | Access | Notes |
|-----------|---------|-------------------|--------|-------|
| U1 | QFN-80 | Difficult | OK | Needs hot air station |
| U3 | QFN-15 | Moderate | OK | Thermal pad |

### Recommended Test Points to Add

| Signal | Net Name | Suggested Location | Priority |
|--------|----------|-------------------|----------|
| Ground | GND | Near U1 | Critical |
| UART TX | [net] | Near MCU | High |
| I2C SDA | [net] | Accessible | Medium |

### DFA Summary

| Category | Status | Risk |
|----------|--------|------|
| Test Coverage | [Adequate/Incomplete] | [H/M/L] |
| Debug Access | [Good/Limited] | [H/M/L] |
| ICT Compatibility | [Yes/Partial/No] | [H/M/L] |
| Assembly Risk | [Low/Medium/High] | [H/M/L] |
| Rework Access | [Good/Limited] | [H/M/L] |

### Recommendations

#### Critical (affects production)
- [issues blocking production test]

#### Warnings (affects debug/rework)
- [issues complicating development]

#### Suggestions (improved manufacturability)
- [nice-to-have improvements]

### Suggested Additions

| Addition | Purpose | Implementation |
|----------|---------|----------------|
| Test point array | ICT coverage | Add 10-pin test header |
| UART header | Serial debug | 3-pin header (TX, RX, GND) |
| Ground test points | Current measurement | 3× TP on power return path |
| Fiducial markers | AOI alignment | 3× 1mm fiducials |
```

## Analysis JSON

{ANALYSIS_JSON}
