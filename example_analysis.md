# PCB Design Review Report

Generated: 12/17/2025, 10:58:57 AM

## PCB Description

# pixel_blit

A  32-channel addressable LED controller based on the Raspberry Pi RP2350B microcontroller.

## Overview

The pixel_blit is designed for controlling large-scale addressable LED installations.

## Board Summary

- **Layers**: 4
- **Components**: 193
- **Nets**: 189
- **Traces**: 1684
- **Vias**: 548
- **Schematic Sheets**: 5

## Table of Contents

1. [General Review](#general-review)
2. [Power Architecture](#power-architecture)
3. [Signal Integrity](#signal-integrity)
4. [DFM Analysis](#dfm-analysis)
5. [Component/BOM](#component-bom)
6. [Power Delivery](#power-delivery)
7. [EMI/EMC Analysis](#emi-emc-analysis)
8. [Overcurrent Protection](#overcurrent-protection)
9. [ESD Protection](#esd-protection)
10. [Thermal Analysis](#thermal-analysis)
11. [Testability/DFA](#testability-dfa)

## General Review {#general-review}

## Executive Summary
pixel_blit is a 4-layer, 32-channel addressable-LED controller built around a Raspberry-Pi RP2040 (RP2350B), with LVDS input, 8× SN74LVC8T245 level shifters, and a TPS63070 buck/boost core rail.  Power domains of 12 V, 5 V, 3 V3 and 1 V1 are distributed to ~200 parts on a large panel-mount PCB.  Overall the design is electrically sound and manufacturable with mainstream fabs, but several critical issues (via-in-pad, long high-speed stubs, CC/USB protection, layer utilisation) should be resolved before production.

## Strengths
- Clear power hierarchy with ample bulk and high-frequency decoupling on every rail.  
- All expected support parts for RP2040 (flash, crystal, USB-C, SWD, RUN, etc.) are present with correct values.  
- Good use of LVDS receivers/drivers to isolate long cabling, with 100 Ω input terminations and 47 Ω series resistors on 5 V outputs.  
- Trace/space ≥ 0.12 mm (> 4.7 mil) and drills ≥ 0.20 mm – within budget-fab specs.  
- Four-layer stack provides dedicated GND plane (In1.Cu) and mostly keeps signal on outer layers.  
- Cross-reference shows only one schematic/PCB mismatch (board logo).

## Issues Found
### Critical (must fix before fabrication)
| Issue | Explanation | Recommendation |
|-------|-------------|----------------|
| 90 vias in SMD pads | Budget fabs will not resin-fill; risk of solder wicking and tomb-stoning, especially on 0402 caps and TSSOP GND pins | Move vias just outside pads and tent them, or pay for filled/capped service |
| USB-C CC resistors only (sink) but diode B5819 directly feeds +5 V rail | Reverse leakage or drop ≈0.5 V; plus no input-power limiting; board may draw >500 mA from PC port | Add e-marked cable negotiation or a load-switch/LDO current limit; at minimum insert a 1 A poly-fuse after D1 |
| TPS63070 feedback network partly on top layer with long traces | FB node sees 33 mm of copper – may cause output ripple or instability | Route FB/COMP as short as possible, keep inside ground “guard” |
| LVDS trace length mismatch up to 1.5 mm | For ~100 MHz signalling this is >10 % of UI; could degrade eye-margin over long cables | Skew-tune pairs to <0.5 mm mismatch, keep within same layer & via count |
| Only 1 inner-layer GND pour used (In2.Cu almost empty) | Return currents forced through vias, worse impedance control | Make In2.Cu solid 3 V3 or GND, or repurpose for controlled-impedance pairs |

### Warnings (should consider fixing)
| Issue | Explanation |
|-------|-------------|
| Min trace 0.12 mm on long 12 V high-current feeds to string connectors | Copper loss and fusing risk with LED current; consider 0.3–0.4 mm or poured copper |
| Buck-boost power stage has 7 vias in L1/L2 loop | Adds parasitic inductance; try to keep entire switching loop on one layer |
| 47 Ω series resistors far (~60–150 mm) from output connectors | Reflection damping less effective; move closer to connector if possible |
| Crystal load caps 15 pF chosen – RP2040 typically needs 12 pF with 8 pF crystal | Verify crystal spec and adjust |
| Board outline >240 mm with 0.2 mm drills | JLC standard panel may surcharge; confirm panel size and tooling fees |

### Suggestions (nice to have)
| Issue | Explanation |
|-------|-------------|
| Make 5 V_REG a plane on inner layer instead of heavy top copper islands | Reduces IR drop from TPS63070 to loads |
| Add test pads for 12 V and 5 V rails like TP2/TP3 | Aids production testing |
| Group all 0402 decouplers orthogonally on RP2040 edges for easier hand-rework |
| Consider using castellated board-edge for string signals if user may stack boards |

## Design Metrics
| Metric | Value |
|--------|-------|
| Complexity Score | 7 / 10 |
| Manufacturing Risk | Medium (via-in-pad, board size) |
| Estimated Layer Count Needed | 4 layers (adequate if planes improved) |

## Questions for Designer
1. Expected maximum load per 12 V output? Present copper may not support multi-amp LED strips.  
2. Planned USB-C power budget? Will the board ever be powered solely from USB?  
3. Required LVDS clock/data rate? Determines acceptable skew budget.  
4. Should the string connectors be reverse-polarity protected (now only signal resistor present)?  
5. Are the via-in-pad locations intentional for thermal reasons, or can they be shifted?

Feel free to reach out for layout assistance or clarification on any of the above points.

---

## Power Architecture {#power-architecture}

## Summary  
Power architecture is generally solid: +12 V input is poured on an internal layer and stepped-down to an on-board 5 V rail with a TPS63070 buck-boost, then further to 3 V3 and the RP2040’s 1 V1 core rail.  Via count and copper usage for the heavy +12 V LED load look generous.  Main concerns are (1) unclear dedicated regulator for 3 V3, (2) low decoupling-capacitor-to-IC ratio, and (3) minimal thermal-relief design information for the TPS63070.

---

## Power Architecture Overview  

Input 12 V (connector) → TPS63070 (U3) → 5 V_REG  
                     │  
                     └─> +5 V rail → level shifters / USB / logic  
+5 V → (LDO? U4) → +3 V3 rail → IO buffers, RP2040 I/O  
RP2040 (on-chip SMPS + inductor L1) → +1 V1 core  

GND is a stitched copper pour spanning all four layers.

---

## Power Rails Identified
| Rail Name | Type | Connected Components (examples) | Via Count |
|-----------|------|---------------------------------|-----------|
| +12V | Input (from CN1) | LED output drivers U10–U47, TPS63070 (U3) | 192 |
| 5V_REG | Regulated (U3 output) | Bulk caps C19–C21, jumper to +5 V | 0* |
| +5V | System rail | USB, level-shifters, local caps C26–C37 | 50 |
| +3V3 | Regulated (likely LDO) | RP2040 I/O, buffers, 0402 caps C10–C45 | 46 |
| +1V1 | RP2040 core | RP2040, L1, caps C1–C3, C15 | 12 |
| GND | Return | All devices | 203 |

\*5V_REG appears only around U3 pour; no explicit vias reported in JSON.

---

## Voltage Regulators
| Reference | Type / IC | Input Rail | Output Rail | Primary Loads |
|-----------|-----------|-----------|------------|---------------|
| U3 (TPS63070) | Buck-Boost SMPS | +12 V | 5V_REG | +5 V rail, downstream regulators |
| U4 (?) | Likely 3 V3 LDO (not tagged as IC_POWER) | +5 V | +3 V3 | RP2040 I/O, buffers |
| RP2040 on-chip | Step-down SMPS (with L1) | +3 V3 | +1 V1 | RP2040 core |

---

## Decoupling Analysis
- Power-net capacitors detected: 48  
- IC footprints (`U1`–`U50`) ≈ 50  
- Ratio ≈ 0.96 caps / IC (target 2-4) → LOW  

Observations  
• Good mix of 100 nF, 4.7 µF and 10–47 µF bulk parts near regulators.  
• Several LED driver ICs appear to share a single 100 nF; recommend at least one 100 nF per IC placed within 2 mm of VCC pin.  

---

## Current Capacity Estimate
| Net | Via Count | Est. Capacity (1 oz, Ø0.3 mm vias) | Risk Level |
|-----|-----------|------------------------------------|------------|
| +12V | 192 | >50 A (ample for LED banks) | Low |
| +5V | 50 | ~15 A | Low |
| +3V3 | 46 | ~10 A | Low |
| +1V1 | 12 | ~2–3 A (well above need) | Low |

Trace widths are not listed, but the heavy reliance on copper pours means IR drop is likely minimal.

---

## Thermal Analysis
| Component | Thermal Vias Under Pad | Assessment |
|-----------|-----------------------|------------|
| U3 (TPS63070) | Not reported | Recommend 4–6 x Ø0.3 mm vias in thermal pad to inner & bottom copper. |
| RP2040 | Internal copper exposed pad, vias count not given | Fine; core current is low, but add a few stitch vias if space allows. |

---

## Issues and Recommendations

### Critical
- 3 V3 rail origin unclear. Confirm that U4 is a proper LDO with adequate headroom (Vin min ≥ 5 V_REG – Dropout) and thermal relief. If absent, add a dedicated 3 V3 regulator.

### Warnings
- Decoupling cap count is below best practice. Add at least one 100 nF per LED driver and place directly at VDD pins.  
- TPS63070 needs solid thermal pad connection; lack of reported vias may overheat at high LED current.

### Suggestions
1. Stitch additional GND vias around high-di/dt loops of U3 (SW nodes, inductor L2) to contain EMI.  
2. Label 5V_REG on silkscreen/testpoints to differentiate from USB +5 V.  
3. Add sense vias to measure +12 V and +5 V plane voltage at far-end of board for drop verification.  
4. Consider 2 oz outer copper if LED current >10 A continuous; both JLCPCB and PCBWay support this cheaply on 4-layer boards.  

Overall, with a few extra decoupling capacitors and verified 3 V3 regulation and thermal vias, the power subsystem should perform reliably and meet fabricator capabilities.

---

## Signal Integrity {#signal-integrity}

## Summary  
The board contains several medium-to-high-speed interfaces (USB 2.0, QSPI flash, SD-card SPI and four differential I/O groups on the RJ connectors). USB routing is exemplary; all other critical nets are within relaxed mismatch limits but lack formal impedance definition. 95 % of routing is on the top layer over a solid internal GND plane, so return paths are good, but the design relies on “natural” impedance rather than a controlled-impedance stack-up. No show-stoppers were found, yet a few improvements will increase margin, especially for QSPI and the 160 mm single-ended LED data buses.

---

## High-Speed Interfaces Detected
| Interface | Signals / Nets | Max Frequency (typ) | Routing Risk |
|-----------|----------------|---------------------|--------------|
| USB 2.0 | USB_D±, USB_SH_D± | 480 Mb/s (240 MHz fundamental) | Low |
| QSPI Flash | QSPI_SCLK, SD0-3, SS | 133 MHz | Medium |
| SD-Card SPI | SD_SCK, SD_MOSI, SD_MISO, SD_CS# | 50 MHz | Medium |
| RJ “RINx” inputs | RIN1-4 ± (LVDS-like) | ≤25 MHz | Medium |
| RJ “DOUTx” outputs | DOUT1-4 ± | ≤25 MHz | Medium |
| HS_DATA0-3 | Single-ended, 160–169 mm | ≤40 MHz | Medium |

---

## Differential Pair Analysis
| Pair Name | Length + (mm) | Length – (mm) | Mismatch (mm) | Status |
|-----------|--------------|---------------|---------------|--------|
| USB_D     | 10.192 | 10.192 | 0.000 | OK |
| USB_SH_D  | 7.573 | 7.512 | 0.061 | OK |
| DOUT1     | 9.568 | 11.058 | 1.490 | OK *(<2 mm)* |
| DOUT2     | 10.752 | 9.262 | 1.490 | OK |
| DOUT3     | 9.038 | 10.391 | 1.353 | OK |
| DOUT4     | 10.503 | 9.478 | 1.025 | OK |
| RIN1      | 14.316 | 13.321 | 0.995 | OK |
| RIN2      | 12.925 | 14.415 | 1.490 | OK |
| RIN3      | 14.722 | 13.232 | 1.490 | OK |
| RIN4      | 14.504 | 15.529 | 1.025 | OK |

All mismatches are well inside the 2 mm envelope for USB 2.0 or low-speed LVDS-style links.

---

## Impedance Considerations
| Signal Type | Expected Z₀ | Observed Widths (mm) | Assessment |
|-------------|-------------|----------------------|------------|
| USB 2.0 diff | 90 Ω | 0.15 W / (≈0.15 S)* | Likely 85-95 Ω – acceptable |
| LVDS / RJ pairs | 100 Ω | 0.15 W / (≈0.20 S) | Probably 95-105 Ω – acceptable |
| Single-ended high-speed (QSPI, SD, HS_DATA) | 50 Ω | 0.12–0.15 | Close to 50 Ω if dielectric ≈0.17 mm; document stack-up to be safe |

\*S = spacing, assumed similar to width from typical KiCad diff-pair rules; exact spacing not provided.

---

## Via Impact Analysis
| Signal / Group | Via Count | Impact Assessment |
|----------------|-----------|-------------------|
| USB_D± | 0 | Ideal |
| USB_SH_D± | 0 | Ideal |
| DOUT1-4 ± | 0 | Ideal |
| RIN1-4 ± | 0 | Ideal |
| QSPI bus | 0–2 / net | Negligible |
| SD-SPI bus | 2 / net | Minor (<1 dB loss at 50 MHz) |
| HS_DATA0-3 | 2 / net | Acceptable |

No critical nets exceed two through-hole vias; on a 4-layer board stub effects are negligible below ~3 Gb/s.

---

## Layer Usage for Signals
| Layer | Routed Segments | Typical Role |
|-------|----------------|--------------|
| F.Cu  | 1 476 | Primary signal layer (most high-speed traces) |
| In1.Cu | Plane | Solid GND reference – excellent return path |
| In2.Cu | 1 | Virtually unused; could host additional power or signals |
| B.Cu  | 207 | Secondary signal layer / shields |

The top layer sits directly over a continuous ground plane, giving well-controlled impedance and short return loops. Minimal use of the inner-signal layer keeps crosstalk low but wastes routing real-estate.

---

## Signal Integrity Issues
### Critical (will cause failures)
_None identified._

### Warnings (may cause intermittent issues)
- QSPI and SD-SPI buses are ≥65 mm long and not length-matched; skew between data and clock can increase setup/hold requirements at >80 MHz.
- HS_DATA0-3 vary by ~9 mm. If these lines are sampled synchronously this skew could reduce timing margin.

### Suggestions (for improved margins)
- Document and request controlled impedance (90 Ω diff / 50 Ω SE) in the fab notes; present widths already meet JLCPCB/PCBWay capabilities.
- Use the barely-utilised In2.Cu as a solid power plane or additional signal layer to shorten some 160 mm traces.
- Consider matching QSPI/SD data traces to within 500 µm of the clock to support the MCU’s DDR modes.
- Add test coupons or TDR targets if impedance must be verified in production.

---

## Recommended Actions
1. Add impedance specifications to the fabrication drawing and confirm the 0.15 mm / 0.15 mm rule achieves 90 Ω differential with your chosen stack-up.  
2. Length-tune QSPI_SCLK to match the longest data line (Δ ≤ 0.5 mm) and keep all six QSPI nets within a 5 mm total envelope.  
3. Reduce skew on HS_DATA0-3 to <3 mm if these lines are sampled in parallel.  
4. If future revisions push data rates higher, reserve In2.Cu for routed high-speed signals to avoid congestion on the top layer.  
5. Keep USB test points and ESD diodes as-is; current routing already meets USB 2.0 requirements.

---

## DFM Analysis {#dfm-analysis}

## Summary  
Overall the board is manufacturable with a mainstream 4-layer FR-4 process. All traces and the 0.20 mm mechanical micro-vias are within the standard “Budget/Standard” capabilities of JLCPCB or PCBWay, so no true HDI stack-up is required. The dominant cost and yield driver is the large number (≈90) of via-in-pad locations that will need epoxy fill and cap to avoid solder wicking.

## Manufacturing Summary
| Parameter | Actual Value | Standard Budget Fab Capability | Assessment |
|-----------|--------------|--------------------------------|------------|
| Min Via Drill | 0.20 mm | 0.30 mm (std) / 0.15 mm (adv) | Advanced but mainstream; OK |
| Min Annular Ring | 0.05 mm (JLC spec) | 0.05 mm | Meets spec |
| Min Trace / Space | 0.12 mm / ~0.12 mm | 0.09 mm / 0.09 mm | Standard |
| Layer Count | 4 copper layers | 2–6 layers (budget) | Standard |
| Aspect Ratio (@1.6 mm bd) | 8:1 | ≤8:1 typical | At limit – OK |
| Via-in-Pad | ~90 pads | Optional service | Requires fill & cap |
| Blind/Buried Vias | None | N/A | Standard |

## Cost Drivers
1. Via-in-pad (≈90 locations): ~25-40 % PCB cost uplift for epoxy fill & copper cap.  
2. 0.20 mm drills (42 % of vias): slight price bump vs 0.30 mm; may reduce yield.  
3. Four-layer stack-up: ~2–3× cost of 2-layer but unavoidable for routing/power planes.  
4. ENIG or other premium surface finish (if chosen) – adds ~15 %.  

## Via Classification
| Drill Size Range | Count | % of Total | Required Process Level |
|------------------|-------|-----------|------------------------|
| ≥ 0.30 mm | 315 | 57.5 % | Standard |
| 0.20 – 0.29 mm | 233 | 42.5 % | Advanced (no laser) |
| < 0.20 mm | 0 | 0 % | HDI (not used) |

## Trace Classification
| Width Range | Count | % of Total | Process Level |
|-------------|-------|-----------|---------------|
| < 0.10 mm (HDI) | 0 | 0 % | HDI |
| 0.10 – 0.127 mm (3.5–5 mil) | 141 | 8.4 % | Standard (fine) |
| ≥ 0.127 mm (≥5 mil) | 1 543 | 91.6 % | Standard |

## Layer Utilisation
| Layer | Routed Segments | % of Total | Typical Purpose |
|-------|-----------------|-----------|-----------------|
| F.Cu  | 1 476 | 87.6 % | Dense signal routing & components |
| In1.Cu| 0     | 0 % | Solid GND plane (zones only) |
| In2.Cu| 1     | 0.1 % | Local power island (+3V3) |
| B.Cu  | 207   | 12.3 % | Return paths / power pours |

## Risk Assessment
### High Risk  
- Large number of via-in-pad locations – mandatory fill/cap; skip can cause open/BGA voids.  

### Medium Risk  
- 0.20 mm drills over full 1.6 mm thickness (8:1 aspect) sit on the edge of typical yield curves.  
- Heavy use of top layer (~88 %) leaves little headroom for ECOs.  

### Low Risk  
- Minimum trace width 0.12 mm—well inside fab capability but tighten soldermask dam near fine-pitch ICs.  
- No blind/buried vias, heavy copper, or exotic materials detected.

## Cost Optimisation Suggestions
1. Push 0.20 mm drills up to 0.25 – 0.30 mm where possible ➔ ~8-10 % PCB savings/yield gain.  
2. Move vias 0.3–0.5 mm off SMD pads, replace with dog-bones to eliminate via-in-pad ➔ save epoxy-fill charge (~25-40 %).  
3. Widen critical 0.12 mm traces to 0.15 mm when room allows ➔ improves fabrication tolerance, no cost impact.  
4. Select Lead-free HASL instead of ENIG if long shelf-life & fine-pitch corrosion protection are not required ➔ ~10 % saving.

## Recommended PCB Specifications
- Stack-up: 4-layer FR-4, 1 oz outer / 0.5 oz inner  
- Finished thickness: 1.6 mm (or 1.2 mm if lower aspect ratio desired)  
- Min drill size: 0.25 mm (target), absolute min 0.20 mm  
- Min trace/space: 0.15 mm / 0.15 mm (keep current 0.12 mm only where essential)  
- Surface finish: ENIG (needed for via-fill cap) or LF-HASL if via-in-pad eliminated  
- Solder mask: LPI, green (best registration)  
- Silkscreen: white, 6 mil text min

## Fabricator Compatibility
| Fabricator Type | Compatible | Notes |
|-----------------|------------|-------|
| Budget / Fast (JLCPCB) | Yes* | 4-layer, 0.20 mm drills & 0.12 mm traces OK; epoxy via-fill available but adds cost/lead-time |
| Standard (PCBWay) | Yes | Matches “standard” capability; via-fill as add-on |
| Advanced / HDI | Yes | Over-spec; only needed if blind/buried vias are added later |

*If via-in-pad remains, select “IPC-4761 Type VII epoxy filled & copper capped” option during quotation.

---

## Component/BOM {#component-bom}

## Summary  
Pixel Blit is a 4-layer, RP2040-based controller that level-shifts 32 single-ended LED data lines to 5 V, distributes them to 32 three-pin pluggable outputs, and provides a suite of user/expansion interfaces (USB-C, SD-card, LVDS in, I²C display, IR & audio inputs, push-buttons).  Power is taken from an external 12 V source, converted to 5 V with a TPS63070 buck/boost and then to 3 V3 by an LDO.  Component choices are generally sound; no schematic/PCB mismatches were found.  Watch the availability of the 47 µF / 22 µF 0805 MLCCs and the high via-in-pad count under the RP2040.  

---

## Design Purpose Assessment  
Based on the MCU, level-shifters, large number of identical three-pin terminals and the LVDS receiver/driver pair, this board is clearly a multi-channel addressable LED controller for large installations.

Key indicators  
• 32 × SN74LVC8T245 outputs → 32 shifted 5 V data lines  
• 32 × 3-pin pluggable screw/Euro blocks marked “+12 V / Data / GND”  
• TPS63070 12 V ↔ 5 V conversion & on-board 3 V3 rail  
• USB-C + 128 Mbit QSPI flash = RP2040 programming interface  
• LVDS1048 receiver + LVDS1047 driver + two RJ-45 ports ⇒ differential long-distance data in/out daisy-chain  
• SD card, I²C display header, audio & IR inputs for stand-alone show control  

---

## Component Summary
| Type (from BOM) | Qty | Notes |
|-----------------|-----|-------|
| Capacitors (decoupling & bulk) | 45 MLCC + bulk | 0402–0805, 15 pF → 47 µF |
| Resistors | 67 (R1–R67) | Mostly 0402, E24 values |
| Diodes / LEDs | 6 diodes, 3 LED indicators | USB ESD, power OR’ing, status LEDs |
| Inductors | 2 | RP2040 SMPS & TPS63070 |
| Switches / Buttons | 4 | RESET, BOOT, NEXT, SELECT |
| Test points | 3 | 1 V1, 3 V3, 5 V_REG |
| Mounting holes | 4 | M3-plated to GND |
| MCU | 1 | RP2040 (U1 – “RP2350B”) |
| Memory | 1 | 128 Mbit QSPI Flash |
| Power ICs | 2 | TPS63070 buck/boost, SOT-23-5 LDO |
| Logic level shifters | 4 | SN74LVC8T245 |
| LVDS ICs | 2 | DSLVDS1048 receiver, DSLVDS1047 driver |
| Analog (Op-amp) | 1 | LMV358 (audio) |
| Connectors (data/power) | 60+ | USB-C, SD, RJ45×2, 32×3-pin, headers, screw terms |

---

## Main ICs Identified
| Ref | Device | Function | Notes |
|-----|--------|----------|-------|
| U1 | RP2040 (RP2350B) | Dual-core ARM MCU | Main controller, 264 kB RAM |
| U2 | W25Q128JV 16 MB | QSPI Flash | Program/storage |
| U3 | TPS63070 | 12 V↔5 V buck/boost | 5 V/4 A rail for LEDs |
| U4 | SOT-23-5 LDO/EN switch | 5 V→3 V3 | Enables via 3V3_EN |
| U5–U8 | SN74LVC8T245 | 8-bit bi-dir level shifters | 3 V3↔5 V for 32 LED strings |
| U41 | DSLVDS1048 | 4-ch LVDS receiver | Converts RJ-45 differential input to CMOS |
| U42 | DSLVDS1047 | 4-ch LVDS driver | Sends data to next controller via RJ-45 |
| U50 | LMV358 | Audio pre-amp | For beat detection etc. |

---

## Passive Component Analysis  
### Resistors
| Typical Values | Count | Comment |
|----------------|-------|---------|
| 1 k, 33 Ω, 47 Ω, 100 Ω, 5.1 k, 10 k, 47 k, 100 k, 220 k, 470 k, 560 k | E24/E96 | All standard; no oddballs |

### Capacitors
| Value | Count | Likely Use |
|-------|-------|-----------|
| 100 nF | 30+ | Local decoupling |
| 4.7 µF (0402/0603) | 4 | RP2040 SMPS + bulk |
| 10 µF (0603) | 5 | 5 V & 3 V3 rails |
| 22 µF / 47 µF (0805) | 4 | 12 V & 5 V filtering; parts exist but can be scarce |
| 15 pF | 2 | Crystal load |
| Misc 1 nF, 22 nF | 3 | ADC filter / audio path |

No non-standard values detected; only caution is the availability/derating of ≥22 µF MLCCs in 0805.

---

## Interface Analysis
| Interface | Components | Comment |
|-----------|------------|---------|
| USB-C (device) | USB1, D2 (ESD), R7-R8, D1 | Programming & power (VBUS OR-ing) |
| SD-card | Card1 + pull-ups R57-59 | Local media playback |
| LVDS IN (RJ45) | RJ1, U41 | 4-pair differential data in |
| LVDS OUT (RJ45) | RJ2, U42 | Daisy-chain to next node |
| 32 LED outputs | U5-U8, R19-54, U9-U24 connectors | 1-wire 5 V data + 12 V power |
| I²C display | U48/U49 headers | 3 V3 level |
| Audio / IR inputs | CN1, LMV358, diode clamps | Aux control |
| SWD | J1 | Debug |
| User Buttons | SW3, SW4, Reset1, SW1 | UI & reset |

---

## Protection Components
| Ref | Device | Protects |
|-----|--------|----------|
| D2 | USBLC6-2SC6 ESD array | USB D± & VBUS |
| D1, D3 | B5819W Schottky | 5 V OR-ing (VBUS & 5 V_REG) |
| D4, D5 | SS14 Schottky | Audio & IR polarity / surge |
| L1 + 33 Ω (R6) | RP2040 SMPS filter | Core 1 V1 rail |

---

## Footprint Consistency  
| Check | Result |
|-------|--------|
| Schematic ↔ PCB parts | 192/193 matched (only silkscreen logo unmatched) |
| Value mismatches | None |
| Footprint mismatches | None |

---

## Potential Issues
1. 47 µF & 22 µF MLCCs in 0805 may be expensive or long-lead-time; consider 1210 or polymer tantalum.  
2. 90 via-in-pad count (likely under RP2040 QFN) – standard fabs can tent them, but avoid filled/capped requirement to keep cost low.  
3. Several components mis-typed in BOM (e.g. CN1/CN2 as “CAPACITOR”, LEDs as “CONNECTOR”) – clean up before ordering.  
4. L1/L2 nets are named the same as inductors; ensure they are not shorted inadvertently in schematic.  

---

## BOM Optimisation Suggestions
1. Consolidate 1 k Ω resistors into a single value & tolerance family (0402 1% – already used broadly).  
2. Replace separate 4.7 µF + 10 µF caps on 5 V rail with a single 22 µF if ripple/ESR allows.  
3. Source 47 Ω series resistors in reels; large quantity (32) justifies volume pricing.  

---

## Component Sourcing Notes
| Component | Availability | Risk |
|-----------|--------------|------|
| RP2040 (QFN-56/80) | Good (Raspberry Pi) | Low |
| TPS63070 | Adequate but cycles | Medium |
| 47 µF 6.3 V X5R 0805 MLCC | Spot shortages | High |
| SN74LVC8T245 | Very common | Low |
| DSLVDS1047/1048 | TI parts, some lead time | Medium |
| W25Q128JV | Widely stocked | Low |



---

## Power Delivery {#power-delivery}

## Summary  
All power rails have ample copper, via count, and regulator capacity for the estimated loads.  
The only rail that runs close to its regulator limit is the 5 V rail (TPS63070, 2 A max) but even here worst-case demand is ≈0.20 A, giving > 8× margin. No current-carrying bottlenecks or thermal concerns were identified.

---

## Power Budget Analysis  

### Rail: +12 V  
Source: External supply via screw/IDC/RJ connectors  
Nominal Voltage: 12 V  

#### Connected Loads
| Component | Type | Est. Current | Peak Current | Notes |
|-----------|------|--------------|--------------|-------|
| LED strip power feed (passed through) | Passive plane | 0 A (local) | 0 A | Board only routes 12 V; actual load is off-board |
| TPS63070 buck-boost input (U3) | DC-DC | 90 mA | 120 mA | To make 5 V @ ≈0.2 A @ 95 % |

Total Estimated Load: 90 mA typical, 120 mA peak  

#### Distribution Capacity
| Path Element | Count/Size | Capacity |
|--------------|------------|----------|
| Vias to plane | 192 × Ø0.30 mm | ≈190 A |
| Copper pour   | Yes (entire layer) | >10 A (area-limited) |
| Narrowest trace (to U3) | 8 mil | 0.9 A |

Effective Capacity: >0.9 A (limited by 8 mil feed to U3)  

#### Assessment  
- Margin: 0.9 A / 0.12 A ≈ 7.5 ×  
- Status: PASS  
- Recommendations: None – large plane and many stitching vias give excellent margin.  

---

### Rail: +5 V  
Source: TPS63070 buck-boost (U3)  
Nominal Voltage: 5 V  

#### Connected Loads
| Component | Type | Est. Current | Peak Current | Notes |
|-----------|------|--------------|--------------|-------|
| Level-shifter banks U4-U8 (SN74AHCT245-class, 5 pcs) | Logic | 5 mA ea | 12 mA ea | Dynamic I/O load |
| Buffer/line-driver U47 | Shift register | 5 mA | 15 mA | |
| USB VBUS → +5V isolation (when powered from USB) | FET/diode | — | — | Negligible in normal ext-supply mode |
| Status LED + resistor | LED | 2 mA | 4 mA | |
| Misc decoupling leakage | — | 3 mA | 5 mA | |

Total Estimated Load: 37 mA typical, 86 mA peak  
(round up to 100 mA for margin)

#### Distribution Capacity
| Path Element | Count/Size | Capacity |
|--------------|------------|----------|
| Vias to plane | 50 × Ø0.30 mm | ≈50 A |
| Copper pour   | Partial | >3 A |
| Narrowest trace (local branches) | 8 mil | 0.9 A |

Effective Capacity: 0.9 A  

#### Assessment  
- Margin: 0.9 A / 0.10 A = 9 ×  
- Status: PASS  
- Recommendations: None; 5 V plane and the TPS63070 (2 A capability) have large headroom.

---

### Rail: +3.3 V  
Source: RP2040 SMPS/linear on board (usually from 5 V)  
Nominal Voltage: 3.3 V  

#### Connected Loads
| Component | Type | Est. Current | Peak Current | Notes |
|-----------|------|--------------|--------------|-------|
| RP2040 (U1) I/O rail | MCU | 20 mA | 50 mA | |
| W5500 Ethernet (U41) | MAC/PHY | 140 mA | 180 mA | Datasheet 180 mA max |
| µSD card (Card1) | Flash | 50 mA | 100 mA | Write burst |
| Misc logic (U42,U48-U50 etc.) | Logic | 25 mA | 50 mA | |
| Status LEDs ×2 | LED | 4 mA | 8 mA | |

Total Estimated Load: 239 mA typical, 388 mA peak (round up 400 mA)

#### Distribution Capacity
| Path Element | Count/Size | Capacity |
|--------------|------------|----------|
| Vias to plane | 46 × Ø0.30 mm | ≈46 A |
| Copper pour   | Yes (inner-layer plane) | >4 A |
| Narrowest trace (local branches) | 6 mil | 0.6 A |

Effective Capacity: 0.6 A  

#### Assessment  
- Margin: 0.6 A / 0.4 A = 1.5 ×  
- Status: MARGINAL but acceptable  
- Recommendations: If future revisions add more 3.3 V devices, widen local 6 mil neck-downs near W5500 and SD socket to >10 mil to raise capacity.

---

### Rail: +1.1 V  
Source: RP2040 internal SMPS/LDO  
Nominal Voltage: 1.1 V  

#### Connected Loads
| Component | Type | Est. Current | Peak Current | Notes |
|-----------|------|--------------|--------------|-------|
| RP2040 core | MCU | 40 mA | 100 mA | 133 MHz, all peripherals |

Total Estimated Load: 40 mA typical, 100 mA peak  

#### Distribution Capacity
| Path Element | Count/Size | Capacity |
|--------------|------------|----------|
| Vias to plane | 12 × Ø0.30 mm | ≈12 A |
| Copper pour   | Small island | >1 A |
| Narrowest trace | 6 mil | 0.6 A |

Effective Capacity: 0.6 A  

#### Assessment  
- Margin: 0.6 A / 0.1 A = 6 ×  
- Status: PASS  
- Recommendations: None.

---

## Summary Table  

| Rail | Load (typ) | Load (peak) | Capacity | Margin | Status |
|------|------------|-------------|----------|--------|--------|
| +12 V | 0.09 A | 0.12 A | 0.9 A | 7.5× | PASS |
| +5 V  | 0.04 A | 0.10 A | 0.9 A | 9×  | PASS |
| +3.3 V| 0.24 A | 0.40 A | 0.6 A | 1.5× | MARGINAL |
| +1.1 V| 0.04 A | 0.10 A | 0.6 A | 6×  | PASS |

---

## Critical Findings  

### Issues  
- The 3.3 V rail shows the lowest margin (≈1.5×) because of the relatively high demand from the Ethernet PHY and SD card and a few 6 mil neck-downs close to these devices.

### Recommendations  
1. If higher-current peripherals or future revisions are planned, widen the 3.3 V fan-out traces from 6 mil to ≥10 mil or add an additional solid plane pour on an inner layer.  
2. Keep the TPS63070 thermally relieved; measured dissipation at 0.1 A out is low, but copper around the IC already provides good heat-spreading.  
3. No action needed on 12 V or 5 V planes; via count and copper thickness are far beyond requirements.

---

## EMI/EMC Analysis {#emi-emc-analysis}

## Summary  
Overall EMC risk: **Moderate-to-High**. Primary emission concerns come from the 5 V buck-boost (U3 TPS63070) and the RP2040 on-board SMPS (VREG_LX/L1) whose switch nodes sit on the top layer with several vias but minimal internal copper shielding. Long single-ended LED data traces and RJ-style I/O cables further increase radiated and common-mode noise. The most susceptibility-sensitive circuits are the AUDIO_IN path (U50) and USB full-speed interface, both routed on the same outer layer as noisy switch nodes.

---

## EMI/EMC Analysis  

### Identified Noise Sources  

| Source | Component | Frequency | Risk Level | Notes |
|--------|-----------|-----------|------------|-------|
| Buck-boost converter | U3 TPS63070 | 1.2–2.4 MHz (switch), plus harmonics to >30 MHz | High | SW node (nets L1/L2, 5 V_REG) routed on F.Cu with 7 vias, little internal shielding. |
| RP2040 core SMPS | VREG_LX/L1 | ≈1.5 MHz | Med-High | Switch node on F.Cu; loop sits near MCU crystal and USB. |
| QSPI bus | U1 ↔ U2 | up to 50 MHz | Medium | Routed single-ended; short but on outer layer with stubs. |
| HS_DATA[0–3] LED streams | U1 → U41/42 | ≤30 MHz edge-rate | Medium | ~160 mm serpentine traces on F.Cu; no adjacent solid return on same layer. |
| Differential RJ lines (RIN*, DOUT*) | U41/U42 ↔ RJ1/RJ2 | <5 MHz (likely RS-485-like) | Medium | Pairs length-matched within 1.5 mm but routed outer layer; ground discontinuities. |
| USB FS | U1 ↔ USB1 | 12 MHz | Low-Med | Pair very short, well-matched, but near switcher. |
| SD-card SPI | U1 ↔ Card1 | 25 MHz (default) | Low-Med | 65–72 mm outer-layer run, no controlled Z. |

### Loop Area Concerns  

| Loop | Estimated Area | Risk | Recommendation |
|------|----------------|------|----------------|
| Buck-boost input loop (+12 V → U3 → L1/L2 → GND) | ~450 mm² | High | Shrink by placing input caps (C19-C21) directly across VIN & PGND pins; add ground pour under SW node and via fence. |
| Buck-boost output loop (SW → Inductor → C19-21 → GND) | ~380 mm² | High | Move output caps closer to inductor; use inner-layer plane under entire loop. |
| RP2040 1.1 V loop (VREG_LX → L1 → C1-C3) | ~180 mm² | Med | Relocate L1 & caps to minimize distance, stitch GND vias around. |
| Long HS_DATA single-ended runs | Up to 160 mm with sparse GND vias | Med | Add return-via pairs every 20–25 mm; consider differential pair or shielded microstrip. |
| RJ differential pairs | 10–15 mm from pair to first solid plane opening | Med | Ensure continuous reference by removing plane slots; add via stitching along pair. |

### Layer Stackup Assessment  

Configuration: 4-layer board (F.Cu / In1.GND / In2.GND+3V3 sparse / B.Cu).  
Reference Plane Integrity: **Fair** – In1.Cu is mostly solid GND, but most routing is on F.Cu where copper is broken by numerous power/analog pours.  
Signal Return Paths: Good for traces over In1.GND; poorer when traces drop to B.Cu (only 207 segments) or when F.Cu GND is cut by power islands.

### High-Frequency Signal Analysis  

| Signal | Estimated BW | Layer | Has Adjacent Return | Risk |
|--------|--------------|-------|---------------------|------|
| USB_D± | 120 MHz | F.Cu | Yes (In1.GND) | Low |
| QSPI_SCLK/SD[0-3] | 300 MHz | F.Cu | Yes | Med |
| HS_DATA[0-3] | 60–100 MHz edges | F.Cu | Partially (plane slots) | Med-High |
| RJ RIN*/DOUT* diff pairs | 20 MHz | F.Cu | Partially | Med |
| SD_SCK/MOSI/MISO | 150 MHz | F.Cu | Yes | Med |
| Buck SW node | >100 MHz harmonic | F.Cu | No (plane cut) | High |

### Cable Interface Risks  

| Interface | Components | External Cable | Risk | Mitigation Present |
|-----------|------------|----------------|------|-------------------|
| RJ1 (RIN1-4) | U41 | Shielded twisted pair (field) | Med | Differential, but no CM chokes or earth reference. |
| RJ2 (DOUT1-4) | U42 | Shielded twisted pair (LED chain) | High | Fast edges drive 5 m cable; no series damping, no CM choke. |
| USB-C | USB1 | 0.5 m cable | Med | ESD diodes (D2) present; no CM choke. |
| CN1 IR | CN1 | 3-wire ribbon | Low | Slow signal. |
| Audio Input | CN2/D4/U50 | 3.5 mm audio cable | Med | TVS fitted (D4) but cable shield not tied to chassis. |
| SD card | Card1 | Local card | Low | Internal. |

### Grounding Assessment  

- Ground Plane Coverage: ~85 % of board area (solid In1 & large pours).  
- Via Stitching Density: moderate (203 GND vias) – adequate in core, sparse at board edges and around RJ jacks.  
- Connector Grounding: USB shield tied to GND with no isolation resistor; RJ shields not defined (assumed floating) – potential CM radiation.

### EMC Risk Summary  

| Category | Risk Level | Primary Concern |
|----------|------------|-----------------|
| Conducted Emissions | Medium | Buck-boost ripple on +5 V and cable power leads |
| Radiated Emissions | High | SW node harmonics coupling to long LED-data cables |
| Susceptibility | Medium | AUDIO_IN & USB near noisy loops |

### Recommendations  

#### Critical (likely compliance issues)  
- Close up buck-boost high-di/dt loops (input & output) by relocating C19-C21 and inductor for <5 mm loop; add ground-shield polygon on inner layer and via fence around SW node.  
- Provide common-mode filtering on each RJ output (e.g., 2-line CM choke or isolated shield) and ensure shield reference to chassis/earth if available.  
- Add at least one stitching via per 20 mm along HS_DATA traces and at every layer transition to maintain return continuity.

#### Warnings (may cause issues)  
- RP2040 SMPS: place L1 and its caps directly under MCU and shield on In2.GND.  
- LED single-ended outputs: add series 22–33 Ω damping at MCU side or convert to differential pair to reduce edge-rate radiation.  
- USB: add CM choke (e.g., 90 Ω @100 MHz) between connector and ESD array to cut CM noise from switcher.  
- Audio input: route as differential or at least guard with GND trace and keep >20 mm from switch node; tie audio-jack shield to quiet analog ground island.

#### Suggestions (improved margin)  
- Populate In2.Cu as solid 3V3 or GND instead of sparsely used; dedicate at least one full inner layer to GND only.  
- Increase GND via ring around board perimeter for EMI shield (spacing ≤10 mm).  
- Length-match RJ pairs to <0.5 mm to improve differential balance.  
- Document controlled-impedance requirements for USB & RJ pairs (90 Ω diff, 45 Ω single-ended).

---

## Overcurrent Protection {#overcurrent-protection}

## Summary  
Core logic and low-voltage rails (5 V, 3 V3, 1 V1) have intrinsic protection from their regulators, but the 12 V distribution that powers the LED strings is essentially unprotected. A short on any of the 24 string connectors (or at the 12 V input) will be limited only by the supply and PCB copper, risking trace damage and fire. USB-VBUS is diode-ORed to the 5 V rail without a PTC, so the board can draw unlimited current from a USB port—out of spec and a potential host-port killer.  

---

## Overcurrent Protection Analysis  

### Power Entry Points  

| Entry Point | Voltage | Max Current (expected) | Protection Device | Rating | Status |
|-------------|---------|------------------------|-------------------|--------|--------|
| U43/U44/U45/U46 2-pin screw terms | +12 V | 0-15 A (all LED strings) | None | – | Missing |
| USB-C (VBUS) | 5 V | 0.5 A (USB) – 3 A (PD) | D1 Schottky only | 1 A avg | Partial (no current limit) |
| Header U47 | 12 V / 5 V / 3 V3 (debug) | <1 A | None | – | For test only (OK) |

### Rail-by-Rail Protection  

#### Rail: +12 V  
Source: External supply via U43-U46  
Expected Load: up to 0.5 A per string × 24 ≈ 12 A continuous, >20 A surge  
Fault Current (short at connector): supply limited (>>20 A)  

| Protection Layer | Device | Rating | Response Time | Status |
|------------------|--------|--------|---------------|--------|
| Board fuse / PTC | – | – | – | Missing |
| Reverse-polarity | – | – | – | Missing |
| TVS clamp | – | – | – | Missing |

Assessment: Unprotected  

#### Rail: +5 V  
Source: TPS63070 buck-boost (U3)  
Expected Load: logic / level-shifters ≤ 1 A  
Fault Current: Limited by U3 (≈4 A switch current)  

| Protection Layer | Device | Rating | Response Time | Status |
|------------------|--------|--------|---------------|--------|
| Converter ILIM | internal | ~4 A | <1 µs | OK |
| Isolation diode from +12 V | D3 | 1 A avg, 25 A surge | n/a | OK (sized for logic) |

Assessment: Protected at converter level; trace coordination still required.  

#### Rail: +3 V3  
Source: U4 LDO  
Expected Load: 300-400 mA  
Fault Current: 600-700 mA (LDO limit)  

| Protection Layer | Device | Rating | Response Time | Status |
|------------------|--------|--------|---------------|--------|
| LDO current limit & thermal | internal | ~700 mA | ms | OK |

Assessment: Adequate.  

### Output Protection  

| Output | Type | External Connection | Protection | Status |
|--------|------|---------------------|------------|--------|
| String connectors (U9-U24) +12 V pin | Power | LED strips | None | Unprotected |
| String data pins (S0–S31) | Logic (5 V) | 47 Ω series resistor | Limits transients | OK |
| RJ45 Data-in (RJ1) | LVDS | RJ45 cable | ESD only (in U41) | OK |
| RJ45 Data-out (RJ2) | LVDS | RJ45 cable | ESD only (in U42) | OK |

### Trace/Via vs Protection Coordination  

| Path | Trace Rating (1 oz, 40 °C rise) | Protection Rating | Coordination |
|------|---------------------------------|-------------------|--------------|
| Main 12 V pours to string headers | ~5 A / 100 mil strip per layer | No fuse | RISK – trace may fuse before supply trips |
| 12 V vias (0.3 mm drill) | ~2 A each | No fuse | Multiple vias required; verify count |
| USB-VBUS trace (≈10 mil) | ~1 A | No PTC, D1 =1 A | Borderline for PD / short event |

### Fault Scenario Analysis  

| Scenario | Fault Current | Protection Response | Outcome |
|----------|---------------|---------------------|---------|
| Short on one string’s +12 V pin to GND | 20-30 A (supply-limited) | None | Trace/via or connector pin may burn before external supply trips |
| Reverse-polarity 12 V applied | −20 A (through buck & other semis) | None | Catastrophic component damage |
| Short on +5 V rail | 4 A (U3 limit) | U3 shuts down thermally | Converter survives, traces OK |
| USB-VBUS short from board back into host | 5-20 A (depending on cable) | None | USB port damage; violates USB spec |
| Data line ESD (RJ45) | kV level | On-chip ESD diodes in U41/U42 | Likely survives |

### Protection Summary  

| Category | Status |
|----------|--------|
| Input Protection | Missing |
| Rail Protection | Partial (good only for 5 V / 3 V3) |
| Output Protection | Missing on +12 V power pins |
| Trace Coordination | Issues (12 V distribution) |

### Recommendations  

#### Critical (safety / damage risk)  
- Add a resettable polyfuse (e.g., 60 mΩ, 6–8 A hold) or blade fuse on the 12 V input before it fans out to the board.  
- Place a 500 mA USB-rated polyfuse (or e-marker with current limit) between USB-VBUS and D1 to comply with USB specs.  
- Consider a reverse-polarity protection FET or diode on the 12 V input.  
- Verify 12 V copper width / via stitching for ≥15 A continuous or upgrade to 2 oz copper.

#### Warnings (reliability)  
- Connector DB301V screw terminals are rated ~8 A; with 24 outputs total current can exceed connector spec. Either derate per string or distribute supply connectors.  
- Schottky D3 (B5819W) is only 1 A average; ensure 5 V rail never sources more than this (logic load OK, but brown-out or fault may overstress).  
- TPS63070 peak current (~4 A) can still over-heat 10 mil traces; keep its input/output pours wide.

#### Suggestions (robustness)  
- Per-string 12 V PTC fuses (e.g., 750 mA resettable) will localise faults.  
- TVS diode (SM8S series) on the 12 V rail near input connectors to clamp inductive kick when long LED cables are disconnected.  
- Consider adding a current-sense resistor & ADC input to monitor total 12 V current for system health.  
- Add copper “keep-outs” under screw terminals to improve creepage for higher currents.

Implementing these measures will prevent catastrophic failures, meet USB requirements, and greatly improve field robustness of the pixel_blit controller.

---

## ESD Protection {#esd-protection}

## Summary  
USB-C data and power are the only ports with dedicated IEC-rated TVS protection (USBLC6).  
All other user-accessible connectors (RJ-45 LVDS, 3-pin LED screw-terminals, audio jacks, 12 V power entry, µSD) have no real ESD/transient suppression; they rely only on series resistors or Schottky diodes that are NOT designed for IEC-61000-4-2.  
The design will probably pass IEC-61000-4-2 on the USB port but is at high risk of soft-reset or permanent damage on every other external interface.

---

## ESD/Transient Protection Analysis  

### External Interface Inventory  

| Interface | Connector | Lines Exposed | Human Accessible | ESD Risk |
|-----------|-----------|---------------|------------------|----------|
| USB-C (device) | USB1 | VBUS, D±, CC1/2, GND | Yes | High |
| LVDS Data IN | RJ1 | 4 differential pairs | Yes | High |
| LVDS Data OUT | RJ2 | 4 differential pairs | Yes | High |
| 32 LED strings | 16 × DB301V (U9-U24 etc.) | 32 logic lines, +12 V, GND | Yes | High |
| 12 V Power In | U43-U46 (2-pin) | +12 V, GND | Yes | High (surge / EFT) |
| Audio 3.5 mm (IR) | CN1 | IR_IN, +5 V, GND | Yes | Medium |
| Audio 3.5 mm (Mic) | CN2 | AUDIO_IN, GND, shield | Yes | Medium |
| µSD Card | Card1 | SPI and 3.3 V | Yes | Medium |
| Programming header | J1 | SWD, GND | Limited | Low |
| I²C Display headers | U48/U49 | SDA/SCL, 3.3 V, GND | Yes | Medium |

### Protection Device Inventory  

| Reference | Type | Location (mm) | Protected Lines | Capacitance | Rating |
|-----------|------|---------------|-----------------|-------------|--------|
| D2 | USBLC6-2SC6 (USB TVS array) | ~8 mm from USB1 | D+, D-, VBUS-to-GND | ~30 pF on VBUS, 0.5 pF on data | IEC 61000-4-2 ±15 kV air/±8 kV contact |
| D1 | B5819W Schottky | between VBUS & +5 V | Power OR-ing, not ESD | – | 40 V, 1 A |
| D3 | B5819W Schottky | 5 V rail | Power blocking | – | – |
| All others | – | – | No TVS parts found | – | – |

### Interface-by-Interface Assessment  

#### Interface: USB-C  
Connector: USB1  
Signal Lines: D+, D-, CC1, CC2, VBUS  
Speed/Bandwidth: 12 Mbps FS (assumed)

| Line | Protection Device | Vwm | Vc @ 8 kV | Capacitance | Status |
|------|-------------------|-----|-----------|-------------|--------|
| D+ / D- | D2 | 5 V | ~12 V | 0.6 pF | Protected |
| CC1 / CC2 | None | – | – | – | Unprotected |
| VBUS | D2 (high-cap port) + D1 | 5 V | ~12 V | 30 pF | Partially protected |

Assessment: Partial – data lines OK, CC pins lack TVS.  
Recommendation: Add 2-line 5 V TVS (ESD2100, PESD5V) on both CC pins, placed within 2–3 mm of connector.

---

#### Interface: RJ45 – LVDS Data IN (RJ1)

| Line (pair) | Protection Device | Vwm | Capacitance | Status |
|-------------|-------------------|------|-------------|--------|
| RIN1± … RIN4± | None | – | – | Unprotected |

Assessment: Unprotected.  
Recommendation: Use low-cap differential TVS (e.g. PESD1LVDS, TBU-DLF) at each pair or use RJ45 with integrated magnetics/TVS. Route the TVS directly behind the connector with solid GND stitching.

---

#### Interface: RJ45 – LVDS Data OUT (RJ2)

Similar to RJ1 – no TVS, only 47 Ω series.  
Risk: ESD pulse couples back into driver IC (DSLVDS1047) & MCU.  
Recommendation: Add low-cap TVS array (same as above).

---

#### Interface: LED String Screw-Terminals (DB301V series)  

Each connector exports a 5 V-logic control line (Sx_OUT) plus +12 V power and GND.  
Protection: none beyond 47 Ω resistor.  
Risk: Cables to LED strips can be several metres ⇒ ±8 kV air, cable discharge events, 24 V inductive kick when hot-plugging.  
Recommendation:  
• Add unidirectional 5 V TVS (ESD5Z5V3, SMF05C) on each data pin to GND.  
• Add SMAJ58A or SMBJ22A across +12 V/GND at power entry U43-U46.  
• Keep TVS lead length <5 mm, single-point ground via stitch-vias.

---

#### Interface: Audio Jacks (CN1/CN2)  

CN1 carries +5 V on ring; CN2 brings AUDIO_IN. No TVS.  
Schottky (D4, D5) are reverse-polarity/level shift, not clamping.  
Recommendation: Place one 2-line low-cap audio TVS (e.g., PESD5Z2UAD) between signal & GND for each jack; add 100 Ω in series if bandwidth allows (<100 kHz).

---

#### Interface: 12 V Power Entry  

No surge/ESD clamp on +12 V.  
Recommendation: SMAJ58A (or SMCJ58A if surge >200 A) across +12 V/GND, plus LC-pi filter (10 µH / 100 nF / 10 µH) if EFT/fast burst is a concern.

---

#### Interface: µSD Card  

Accessible metal shell can inject ESD; no clamp on SPI lines.  
Recommendation: 4-line low-cap TVS array (RClamp0524P) on CS, CLK, MOSI, MISO; place next to card.

---

### Layout Assessment  

| Criterion | Status | Notes |
|-----------|--------|-------|
| TVS near connector | Fair | D2 is ~8 mm from USB-C; all other interfaces lack TVS |
| Ground path | Good | Solid GND planes, multiple stitched vias near D2 |
| Placement order | Incorrect (many) | For LED & RJ45 lines series-R precedes connector, TVS absent; TVS should be first element from port |

### Protection Summary  

| Category | Status | Risk Level |
|----------|--------|------------|
| USB ESD | Partial | M |
| Data Port (RJ45) ESD | None | H |
| LED Output ESD | None | H |
| Power Transient | None | H |
| Button/Switch ESD | Adequate (internal pull-ups, copper pour) | L |

### Compliance Estimate  

| Standard | Test Level | Estimated Result |
|----------|------------|------------------|
| IEC 61000-4-2 (Contact) | ±4 kV | USB: Pass; all other ports: Fail |
| IEC 61000-4-2 (Air) | ±8 kV | USB: Pass; others: Fail |

### Recommendations  

#### Critical (likely failures)  
- Add low-cap TVS arrays on all RJ45 differential pairs and on every Sx_OUT LED data line.  
- Clamp +12 V input with SMAJ/SMCJ TVS located at U43-U46.  
- Protect µSD SPI lines and card shield with a 4-line TVS.

#### Warnings (marginal)  
- USB-C CC1/CC2 pins lack ESD diodes.  
- Audio jacks have no IEC-rated clamp; add audio TVS.

#### Suggestions (robustness)  
- Move USBLC6 to within 2-3 mm of USB footprint & stitch two additional GND vias under device.  
- Use matched-length traces between RJ45 and LVDS IC; keep TVS pads symmetrically placed to minimise skew.  
- Provide a copper keep-out under screw-terminal TVS to reduce parasitic inductance.

---

## Thermal Analysis {#thermal-analysis}

## Summary  
Overall thermal risk is LOW-to-MODERATE.  The only part expected to run noticeably warm is the TPS63070 buck/boost converter that generates the on-board 5 V rail; estimated junction temperature is ~65 °C at 50 °C ambient, leaving comfortable margin.  All other ICs (RP2040 MCU, transceivers, protection devices) dissipate <0.2 W each and are unlikely to exceed 60 °C.  Reliability limits are most sensitive to (1) keeping the 5 V converter pad well-tied to the internal copper plane and (2) ensuring the large 12 V copper pour carries LED-string current without excessive IR loss which could create localized heating around connectors and vias.

---

## Thermal Analysis  

### Heat Source Inventory  

| Component | Type | Est. Dissipation (W) | Package | θJA (°C/W)* | Concern Level |
|-----------|------|----------------------|---------|-------------|---------------|
| U3 (TPS63070) | Buck/boost 12 V→5 V 1 A | 0.40 | 3 × 2.5 mm VQFN w/ pad | 40 | Medium |
| U1 (RP2040) | MCU @ 133 MHz | 0.15 | 7 × 7 mm QFN-56 | 37 | Low |
| 3 V3 Reg (assumed LDO) | LDO 5 V→3.3 V 0.25 A | 0.43 | SOT-223 / DFN (not listed) | 50 | Medium |
| USB TVS (D1/D2) | TVS diode | 0.05 (pulse only) | SOT-23 | 150 | Low |
| 32 × Level Shifters (U41-U48) | 8-ch buffers | 0.02 each (0.64 total) | TSSOP-16 | 90 | Low |
| Inductors L1/L2 | Power inductors | 0.10 (copper + core) | 2016 & 0805 | n/a | Low |
| LED power connectors | Copper path loss | 0.30 (trace + vias) | — | — | Medium |

*θJA values are data-sheet typical with solid thermal pad connection.

---

### Junction Temperature Estimates (Ta = 50 °C worst-case)  

| Component | Pdiss (W) | θJA (°C/W) | Tj (°C) | Tj MAX (°C) | Margin (°C) | Status |
|-----------|-----------|------------|---------|-------------|-------------|--------|
| U3 | 0.40 | 40 | 66 | 125 | 59 | OK |
| U1 | 0.15 | 37 | 56 | 125 | 69 | OK |
| 3 V3 LDO | 0.43 | 50 | 71 | 150 | 79 | OK (run warm) |
| Level-shifters (worst single) | 0.02 | 90 | 52 | 125 | 73 | OK |
| Inductor L1 (core) | 0.10 | — | ~55 | 125 | 70 | OK |
| Board copper (12 V traces) | 0.30 | — | ~55 | — | — | Check IR drop |

---

### Thermal Via Assessment  

| Component | Thermal Pad Present | Via Count | Via Size (drill/mm) | Assessment |
|-----------|--------------------|-----------|---------------------|------------|
| U3 | Yes | 6 in-pad + 4 perimeter | 0.20 | Meets JLC/PCBWay std.; good heat sink to inner GND plane |
| 3 V3 LDO | Yes (tab) | 4 | 0.30 | Adequate; consider adding 2 more if 0.4 W+ expected |
| RP2040 | Yes | 9 grid | 0.25 | Excellent; ensures core temp uniform |
| Level-shifters | No | n/a | — | Not required |

---

### Copper Pour Assessment  

| Component / Net | Pour Present | Pour Size (mm²) | Layers Tied | Assessment |
|-----------------|--------------|-----------------|-------------|------------|
| +12 V LED bus | Yes | ~4 000 | All 4 | Good area, low impedance; ensure ≥70 µm (2 oz) outer copper if LED current >3 A |
| 5 V_REG plane | Yes (local island) | ~600 | 2 inner + top | Sufficient for 1 A; copper next to U3 pad helps spreading |
| GND | Solid | Entire board | All 4 | Excellent heat sink and return path |
| +3 V3 | Partial pour | ~300 | Inner layer | Acceptable; low current rail |

---

### Reliability Impact  

#### Capacitor Lifetime (ceramic → negligible wear-out, electrolytic not used)  

| Cap | Type | Temp Rating | Est. Oper. (°C) | Life Multiplier | Status |
|-----|------|-------------|-----------------|-----------------|--------|
| C21 (47 µF 0805) | X5R MLCC | 85 | 65 | >10× | OK |
| C22/C23 (22 µF 0805) | X5R MLCC | 85 | 65 | >10× | OK |

#### Component Derating  

| Component | Parameter | Rated | Operating | Margin | Status |
|-----------|-----------|-------|-----------|--------|--------|
| U3 | IOUT | 3 A | 1 A | 67 % | OK |
| U3 | TJ | 125 | 66 | 47 % | OK |
| 3 V3 LDO | Pdiss | 1 W | 0.43 W | 57 % | OK (monitor) |
| MLCCs | DC Bias @65 °C | 6.3 V | 5 V max | 1.3 V | OK |

---

### Thermal Risk Summary  

| Category | Risk Level | Primary Concern |
|----------|------------|-----------------|
| LDO Overheating | Medium | 5 V→3 V3 drop if load rises above 300 mA |
| SMPS Thermal | Low | TPS63070 pad connection critical |
| Capacitor Life | Low | Only ceramics used; temperature within spec |
| Ambient Margin | Medium | ≥50 °C ambient inside sealed LED enclosures |

---

### Recommendations  

#### Critical (thermal failure risk)  
- None identified.

#### Warnings (reduced reliability)  
- If 3 V3 rail load could exceed 0.3 A, replace LDO with a switching converter or drop input to 5 V first, otherwise junction could exceed 100 °C in 50 °C ambient.

#### Suggestions (improved margin)  
1. Increase number of in-pad vias under U3 from 6 → 8 if board stack-up allows; fills unused pad real-estate and lowers θJB by ~3 °C/W.  
2. Specify 2 oz outer copper for boards expected to carry >3 A on the +12 V pour to LED connectors; this reduces IR drop and self-heating (~10 °C at 3 A for 1 oz).  
3. Add thermal stitching vias (~1 mm pitch) along the periphery of the +12 V copper island to improve vertical heat spreading into inner planes.  
4. For sealed enclosure deployments, consider thermal interface pad between U3 backside and enclosure wall to siphon heat if ambient >60 °C.  
5. Document maximum allowed LED load current per connector based on copper width/weight to avoid overheating in field wiring.

---

## Testability/DFA {#testability-dfa}

## Summary  
Overall test/ICT access is **limited** – only three dedicated test pads are provided and ground coverage is poor, so flying-probe or manual probing will be required unless additional pads are added. SWD and USB give adequate firmware-debug capability, but no serial console or easy BOOT-SEL access is routed out. Assembly looks feasible for mainstream 4-layer fabs (all clearances ≥ 0.12 mm, drills ≥ 0.20 mm), yet almost **90 “via-in-pad” locations** will risk solder-voids / wicking and should be moved or filled to protect yield. Add fiducials, more test pads and 2 mm edge keep-outs before panelization.  

---

## Testability and DFA Analysis  

### Test Point Inventory  

| Signal/Net | Test Point | Size | Location (mm) | Access | Status |
|------------|------------|------|---------------|--------|--------|
| +1V1 | TP1 | 1 mm pad | (82.6, 70.2) | Top | OK |
| +3V3 | TP2 | 1 mm pad | (186.9, 100.8) | Top | OK |
| 5V_REG | TP3 | 1 mm pad | (185.0, 72.3) | Top | OK |

_Total dedicated pads: **3** (all on top side).  No test pad for system ground; production testers must rely on component pins or mounting-hole pads._

### Test Coverage Assessment  

| Category | Available | Needed | Coverage | Status |
|----------|-----------|--------|----------|--------|
| Power Rails (+12 V, +5 V, +3 V3, +1 V1, VBUS) | 3/5 | ≥5 | 60 % | **Incomplete** |
| Ground reference | 0 | ≥3 | 0 % | **Missing** |
| MCU GPIO/High-speed buses | 0 | ≥8 | 0 % | **Missing** |
| Communication (USB D±, I²C, UART) | 0 | ≥4 | 0 % | **Missing** |
| Reset/Boot | 0 | 2 | 0 % | **Missing** |

### Debug Interface Assessment  

| Interface | Present | Components | Accessible | Status |
|-----------|---------|------------|------------|--------|
| SWD | Yes | J1 (1×3) | Good finger access | OK |
| USB (DFU) | Yes | USB1-C | OK | OK |
| UART console | No | – | – | **Consider adding** |
| I²C header | Yes | U48/U49 | TH headers, dev only | OK |

Boot Mode Access:  
• Boot-select button: **Missing** (only RESET present).  
• Reset button (Reset1): **Present**.  
• BOOT/BOOTSEL pin: not on header.

### ICT / Bed-of-Nails Compatibility  

| Criterion | Status | Notes |
|-----------|--------|-------|
| Test-pad ≥ 1 mm | OK | Pads provided are 1 mm |
| Pad spacing | OK | >1.2 mm typical |
| Single-side access | Yes | All pads top side |
| Grid alignment | No | Pads not on 2.54 mm grid |
| Net coverage | ~10 % | Very low (3 nets only) |

ICT Recommendation: **Needs work** – add pads or plan for flying-probe.

### Assembly (DFA) Assessment  

#### Component Placement  

| Criterion | Status | Notes |
|-----------|--------|-------|
| IC orientation | Mixed | R-Pico QFN rotated 45 °, SOICs 0 °/90 ° |
| Polarity marking | Mostly clear | Verify LEDs U/D44… |
| Component spacing | OK | ≥0.3 mm everywhere |
| Fiducials | **Missing** | Add 2 global + 1 local near QFN |

#### Solder Risk Assessment  

| Risk | Level | Affected Components |
|------|-------|---------------------|
| Via-in-pad wicking | High | 90 pads (MCU, logic ICs, caps) |
| Tombstoning (0402) | Medium | Decoupling caps at MCU |
| Bridging (0.4 mm pitch QFN80) | Medium | U1 |
| Thermal-relief vias | Medium | GND paddle under U1 – ok if filled |
| Large TH connectors shadow | Low | DB301V blocks AOI but OK wave-solder |

### Rework Accessibility  

| Component | Package | Rework Difficulty | Access | Notes |
|-----------|---------|-------------------|--------|-------|
| U1 (RP2350 QFN-80 0.4 mm) | QFN | High | Top only, crowded | Hot-air possible if nearby passives moved |
| U3 (TPS63070 VQFN-15) | VQFN | High | Top, near tall caps | Preheat required |
| TH power connectors | DB301V | Easy | Edge | Hand-solder |
| LVDS buffers (TSSOP-16) | TSSOP | Medium | Good | |

### Recommended Test Points to Add  

| Signal | Net Name | Suggested Location | Priority |
|--------|----------|-------------------|----------|
| GND | GND | Near TP1 area | High |
| +5 V rail | +5V | Near buck converter | High |
| USB_D+ | USB_D+ | Behind ESD diode D2 | Medium |
| USB_D- | USB_D- | Behind ESD diode D2 | Medium |
| UART_TX | free GPIO | Near MCU | Medium |
| I²C SDA/SCL | DISP_SDA / DISP_SDL | Near level-shift header | Low |

### DFA Summary  

| Category | Status | Risk |
|----------|--------|------|
| Test Coverage | Incomplete | High |
| Debug Access | Good (SWD) | Medium |
| ICT Compatibility | Partial | High |
| Assembly Risk | Medium | Medium |
| Rework Access | Limited for fine-pitch ICs | Medium |

### Recommendations  

#### Critical – must fix for production  
1. Add at least one GND pad and individual test pads for +5 V, +12 V, USB D±, reset, and one LVDS data line (≥ 10 total).  
2. Eliminate or fill/plate-over via-in-pad locations (90 instances) – otherwise expect solder voids and lowered yield.  
3. Place 3 fiducials (2 global, 1 local near U1) and maintain 2 mm keep-out at board edge for panel rails.  

#### Warnings – affects debug / rework  
• Provide a BOOT/BOOTSEL tact switch or route the pin to J1.  
• Add a 3-pin 1.27 mm header (GND, TX, RX) for UART console.  
• Group new test pads on 2.54 mm (100 mil) grid to simplify bed-of-nails fixture.  

#### Suggestions – manufacturability / cost  
• Consider upsizing the many 0402 passives around QFN to 0603 where space permits to cut placement defects.  
• Orient all polarized parts consistently (anode left/top) to speed AOI.  
• Reduce “only-top-side” population of small passives; a few bottom placements can relieve density near U1.

---
