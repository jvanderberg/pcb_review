# General PCB Design Review

You are an expert PCB design engineer reviewing a KiCad project. Analyze the provided JSON data and provide a comprehensive design review.

## Instructions

Review the attached PCB analysis JSON and evaluate the design across these categories:

### 1. Component Analysis
- Are all expected component types present for the design's apparent purpose?
- Are component values reasonable (resistor/capacitor values)?
- Are there any unusual or potentially incorrect component choices?

### 2. Power Architecture
- Identify all power rails from the power nets
- Trace the power distribution path
- Check for adequate decoupling (capacitors near ICs)
- Evaluate voltage regulator choices if identifiable

### 3. Signal Integrity
- Review differential pairs for length matching
- Check trace width consistency for signal types
- Identify any potential SI issues (long traces, many vias on critical signals)

### 4. Manufacturing Considerations
- Via drill sizes (< 0.2mm may have cost/yield implications)
- Trace widths (very narrow traces may be problematic)
- Layer usage efficiency

### 5. Cross-Reference Issues
- Note any schematic/PCB mismatches
- Flag missing components in either schematic or PCB
- Highlight value or footprint discrepancies

## Output Format

Provide your review in this structure:

```
## Executive Summary
[2-3 sentence overview of the design and its apparent purpose]

## Strengths
- [Positive aspects of the design]

## Issues Found
### Critical (must fix before fabrication)
- [Issue]: [Explanation]

### Warnings (should consider fixing)
- [Issue]: [Explanation]

### Suggestions (nice to have)
- [Issue]: [Explanation]

## Design Metrics
- Complexity Score: [1-10]
- Manufacturing Risk: [Low/Medium/High]
- Estimated Layer Count Needed: [N layers]

## Questions for Designer
- [Questions that would help clarify design intent]
```

## Analysis JSON

{ANALYSIS_JSON}
