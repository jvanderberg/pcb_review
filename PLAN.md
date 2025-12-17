# PCB Review Web App - Implementation Plan

## Overview

A browser-only React single-page application that allows users to:
1. Upload KiCad PCB (.kicad_pcb) and schematic (.kicad_sch) files
2. Describe their PCB's intended function
3. Select which analyses to run from the 11 available prompts
4. Run a comprehensive multi-prompt LLM review (OpenAI or Claude)
5. View results as HTML with navigation index
6. Export as Markdown or PDF
7. Chat with the LLM about the results

## Architecture

### Technology Stack

- **Framework**: React 18 with TypeScript
- **State**: React useState/useReducer (local state, no Redux needed)
- **Bundler**: Vite (fast, great React/TS support)
- **Styling**: CSS Modules + CSS variables for theming
- **Markdown**: react-markdown for rendering
- **PDF Export**: html2pdf.js or similar
- **API**: Direct fetch calls to OpenAI and Anthropic APIs

### File Structure

```
web/
├── index.html
├── vite.config.ts
├── package.json
├── tsconfig.json
├── src/
│   ├── main.tsx                    # React entry point
│   ├── App.tsx                     # Main app component
│   ├── App.module.css
│   ├── types.ts                    # Shared TypeScript types
│   ├── api/
│   │   ├── openai.ts               # OpenAI API client
│   │   ├── anthropic.ts            # Anthropic Claude API client
│   │   └── llm.ts                  # Unified LLM interface
│   ├── components/
│   │   ├── Header/
│   │   │   ├── Header.tsx
│   │   │   └── Header.module.css
│   │   ├── SettingsPanel/
│   │   │   ├── SettingsPanel.tsx
│   │   │   └── SettingsPanel.module.css
│   │   ├── FileUpload/
│   │   │   ├── FileUpload.tsx
│   │   │   └── FileUpload.module.css
│   │   ├── DescriptionInput/
│   │   │   ├── DescriptionInput.tsx
│   │   │   └── DescriptionInput.module.css
│   │   ├── AnalysisSelector/
│   │   │   ├── AnalysisSelector.tsx
│   │   │   └── AnalysisSelector.module.css
│   │   ├── ReviewRunner/
│   │   │   ├── ReviewRunner.tsx
│   │   │   └── ReviewRunner.module.css
│   │   ├── ReviewReport/
│   │   │   ├── ReviewReport.tsx
│   │   │   ├── ReviewReport.module.css
│   │   │   └── ReportSection.tsx
│   │   ├── ChatPanel/
│   │   │   ├── ChatPanel.tsx
│   │   │   └── ChatPanel.module.css
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       └── ProgressBar.tsx
│   ├── parsers/
│   │   ├── sexpr.ts                # Browser-compatible S-expr parser
│   │   ├── pcb.ts                  # Browser-compatible PCB parser
│   │   ├── schematic.ts            # Browser-compatible schematic parser
│   │   └── analyzer.ts             # Browser-compatible unified analyzer
│   ├── prompts/
│   │   ├── index.ts                # Prompt registry with metadata
│   │   ├── general-review.ts
│   │   ├── power-analysis.ts
│   │   ├── signal-integrity.ts
│   │   ├── manufacturing-dfm.ts
│   │   ├── component-bom.ts
│   │   ├── power-delivery.ts
│   │   ├── emi-analysis.ts
│   │   ├── overcurrent-protection.ts
│   │   ├── esd-protection.ts
│   │   ├── thermal-analysis.ts
│   │   └── testability-dfa.ts
│   ├── hooks/
│   │   ├── useTheme.ts             # Dark/light mode hook
│   │   ├── useLocalStorage.ts      # Persist settings
│   │   └── useLLM.ts               # LLM API hook
│   ├── utils/
│   │   ├── export.ts               # Markdown/PDF export
│   │   └── fileHelpers.ts          # File reading utilities
│   └── styles/
│       ├── variables.css           # CSS custom properties
│       ├── reset.css               # CSS reset
│       └── global.css              # Global styles
```

## Implementation Steps

### Phase 1: Project Setup & Parser Adaptation

#### 1.1 Create React project with Vite
- Initialize with `bun create vite web --template react-ts`
- Configure Vite for single-page app
- Set up CSS modules and CSS variables
- Install dependencies: `react-markdown`, `html2pdf.js`

#### 1.2 Set up theme system
- CSS variables for colors, spacing, typography
- `prefers-color-scheme` media query auto-detection
- Theme toggle stored in localStorage
- Light/dark mode classes on document root

#### 1.3 Adapt parsers for browser
- Copy and adapt `sexpr.ts` (already browser-compatible)
- Adapt `pcb.ts` - remove `fs`, use string input only
- Adapt `schematic.ts` - remove `fs`/`path`, accept string content + filename
- Adapt `unified.ts` - accept parsed data directly, no file system access

#### 1.4 Create prompt registry
```typescript
// web/src/prompts/index.ts
export interface PromptConfig {
  id: string;
  name: string;
  shortDescription: string;  // For checkbox labels
  description: string;       // Full description
  category: 'general' | 'power' | 'signal' | 'manufacturing' | 'protection' | 'testing';
  jsonFiles: ('summary' | 'power' | 'signals' | 'components' | 'dfm')[];
  prompt: string;
  estimatedTokens: number;   // Help users estimate cost
}

export const PROMPTS: PromptConfig[] = [
  {
    id: 'general-review',
    name: 'General Review',
    shortDescription: 'Comprehensive design review covering all aspects',
    description: 'A complete design review analyzing components, power, signals, manufacturing, and cross-reference issues. Good starting point for any design.',
    category: 'general',
    jsonFiles: ['summary', 'components', 'power', 'signals', 'dfm'],
    prompt: GENERAL_REVIEW_PROMPT,
    estimatedTokens: 2000
  },
  {
    id: 'power-analysis',
    name: 'Power Architecture',
    shortDescription: 'Power rails, regulators, and decoupling analysis',
    description: 'Detailed analysis of power distribution, voltage regulators, decoupling capacitors, and thermal considerations for power components.',
    category: 'power',
    jsonFiles: ['power', 'summary'],
    prompt: POWER_ANALYSIS_PROMPT,
    estimatedTokens: 1500
  },
  // ... remaining 9 prompts
];
```

### Phase 2: Core Components

#### 2.1 App state structure
```typescript
// web/src/types.ts
interface AppState {
  // Settings
  settings: {
    provider: 'openai' | 'anthropic';
    model: string;
    apiKey: string;
    theme: 'auto' | 'light' | 'dark';
  };

  // Files
  files: {
    pcbFile: File | null;
    pcbContent: string | null;
    schematicFiles: File[];
    schematicContents: Map<string, string>;
  };

  // User input
  pcbDescription: string;
  selectedAnalyses: string[];  // prompt IDs

  // Analysis
  analysisResult: AnalysisResult | null;
  splitAnalysis: SplitAnalysis | null;

  // Review
  reviewStatus: 'idle' | 'parsing' | 'reviewing' | 'complete' | 'error';
  reviewProgress: {
    current: number;
    total: number;
    currentPromptId: string;
    currentPromptName: string;
  };
  reviewResults: Map<string, string>;  // promptId -> markdown response
  reviewError: string | null;

  // Chat
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  chatLoading: boolean;
}
```

#### 2.2 LLM API clients

**OpenAI client:**
```typescript
// web/src/api/openai.ts
export const OPENAI_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o (Recommended)', contextWindow: 128000 },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Faster/Cheaper)', contextWindow: 128000 },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000 },
];

export async function callOpenAI(
  apiKey: string,
  model: string,
  messages: Message[],
  onStream?: (chunk: string) => void
): Promise<string>;
```

**Anthropic client:**
```typescript
// web/src/api/anthropic.ts
export const ANTHROPIC_MODELS = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4 (Recommended)', contextWindow: 200000 },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4 (Most Capable)', contextWindow: 200000 },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast/Cheap)', contextWindow: 200000 },
];

export async function callAnthropic(
  apiKey: string,
  model: string,
  messages: Message[],
  systemPrompt: string,
  onStream?: (chunk: string) => void
): Promise<string>;
```

#### 2.3 Unified LLM interface
```typescript
// web/src/api/llm.ts
export async function callLLM(
  provider: 'openai' | 'anthropic',
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  onStream?: (chunk: string) => void
): Promise<string>;
```

### Phase 3: UI Components

#### 3.1 Header component
- App logo/title
- Theme toggle (auto/light/dark)
- Settings button (opens modal)

#### 3.2 SettingsPanel component (Modal)
- Provider selection (OpenAI / Anthropic)
- Model dropdown (updates based on provider)
- API key input with show/hide toggle
- Key validation (test API call)
- Option to save key to localStorage
- Save/Cancel buttons

#### 3.3 FileUpload component
- Drag-and-drop zone with visual feedback
- Click to browse
- File type validation
- Shows uploaded files with:
  - Filename and size
  - Parse status indicator
  - Remove button
- Supports one .kicad_pcb and multiple .kicad_sch

#### 3.4 DescriptionInput component
- Large textarea
- Placeholder: "Describe your PCB's purpose, features, and any specific concerns..."
- Character count
- Auto-resize

#### 3.5 AnalysisSelector component
- Grouped checkboxes by category:
  - **General**: General Review
  - **Power**: Power Architecture, Power Delivery
  - **Signal**: Signal Integrity, EMI/EMC
  - **Manufacturing**: DFM Analysis
  - **Protection**: Overcurrent Protection, ESD Protection, Thermal Analysis
  - **Components**: Component/BOM Analysis
  - **Testing**: Testability/DFA
- Each checkbox shows short description
- "Select All" / "Select Recommended" buttons
- Estimated token count display

#### 3.6 ReviewRunner component
- "Start Review" button (validates requirements)
- Progress display:
  - Overall progress bar
  - Current analysis name
  - Status messages
- Cancel button
- Error display with retry

#### 3.7 ReviewReport component
- **Index/TOC at top:**
  ```
  ## Table of Contents
  1. [General Review](#general-review)
  2. [Power Architecture](#power-analysis)
  ...
  ```
- Scrollable sections with anchor IDs
- Each section:
  - Collapsible header with status icon
  - Rendered markdown content
  - Copy section button
- Export buttons: "Export Markdown" / "Export PDF"
- "Jump to top" floating button

#### 3.8 ChatPanel component
- Collapsible panel (bottom or side)
- Message history with user/assistant styling
- Input textarea with send button
- Streaming response display
- Clear chat button
- Context indicator: "Context includes: Analysis data, 3 review results, 5 messages"

### Phase 4: Review Orchestration

#### 4.1 File parsing flow
1. User drops/selects files
2. Read file contents as text
3. Parse PCB file → PCBData
4. Parse schematic files → SchematicData
5. Run unified analysis → AnalysisResult
6. Split into JSON sections
7. Show success/error status

#### 4.2 Review execution flow
```typescript
async function runReview(
  selectedPromptIds: string[],
  analysisData: SplitAnalysis,
  pcbDescription: string,
  llmConfig: LLMConfig,
  onProgress: (progress: Progress) => void
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (let i = 0; i < selectedPromptIds.length; i++) {
    const promptConfig = PROMPTS.find(p => p.id === selectedPromptIds[i]);
    onProgress({
      current: i + 1,
      total: selectedPromptIds.length,
      currentPromptId: promptConfig.id,
      currentPromptName: promptConfig.name
    });

    // Build prompt with relevant JSON data
    const jsonData = buildJsonContext(promptConfig.jsonFiles, analysisData);
    const fullPrompt = promptConfig.prompt
      .replace('{ANALYSIS_JSON}', jsonData)
      .replace('{PCB_DESCRIPTION}', pcbDescription);

    const response = await callLLM(
      llmConfig.provider,
      llmConfig.apiKey,
      llmConfig.model,
      'You are an expert PCB design engineer...',
      fullPrompt
    );

    results.set(promptConfig.id, response);
  }

  return results;
}
```

#### 4.3 Chat context building
```typescript
function buildChatContext(
  pcbDescription: string,
  analysisData: SplitAnalysis,
  reviewResults: Map<string, string>,
  chatHistory: Message[]
): Message[] {
  const systemPrompt = `You are an expert PCB design engineer helping review a design.
You have access to the PCB analysis data and review results.
Answer questions accurately based on this context.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `## PCB Description\n${pcbDescription}` },
    { role: 'user', content: `## Analysis Summary\n${JSON.stringify(analysisData.summary, null, 2)}` },
    { role: 'user', content: `## Review Results\n${formatReviewResults(reviewResults)}` },
    ...chatHistory
  ];
}
```

### Phase 5: Export Features

#### 5.1 Markdown export
```typescript
function exportMarkdown(
  pcbDescription: string,
  reviewResults: Map<string, string>
): string {
  let markdown = `# PCB Design Review Report\n\n`;
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  markdown += `## PCB Description\n\n${pcbDescription}\n\n`;
  markdown += `---\n\n`;

  // Table of contents
  markdown += `## Table of Contents\n\n`;
  for (const [promptId, _] of reviewResults) {
    const config = PROMPTS.find(p => p.id === promptId);
    markdown += `- [${config.name}](#${promptId})\n`;
  }
  markdown += `\n---\n\n`;

  // Each section
  for (const [promptId, content] of reviewResults) {
    const config = PROMPTS.find(p => p.id === promptId);
    markdown += `<a id="${promptId}"></a>\n\n`;
    markdown += `# ${config.name}\n\n`;
    markdown += content;
    markdown += `\n\n---\n\n`;
  }

  return markdown;
}
```

#### 5.2 PDF export
- Use html2pdf.js to convert rendered HTML to PDF
- Include all sections with proper page breaks
- Header/footer with page numbers
- Styled to match app theme

### Phase 6: Polish & UX

#### 6.1 Responsive design
- Mobile: Stack vertically, collapsible sections
- Tablet: Two-column layout where appropriate
- Desktop: Full layout with side panels

#### 6.2 Loading states
- Skeleton loaders for results
- Spinner for API calls
- Progress bar for review process

#### 6.3 Error handling
- Invalid file format errors
- API key errors (401)
- Rate limiting (429)
- Network errors
- Parsing errors with details

#### 6.4 LocalStorage persistence
- API key (optional, with warning)
- Theme preference
- Last selected analyses
- Provider/model preference

---

## UI Mockup

```
┌────────────────────────────────────────────────────────────────────────┐
│  ⚡ PCB Review                                        [Auto ▾] [⚙️]    │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │              📁 Drop KiCad files here                            │ │
│  │                  or click to browse                              │ │
│  │                                                                  │ │
│  │          .kicad_pcb and .kicad_sch files accepted               │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  📄 my_board.kicad_pcb (245 KB)                          ✓  [Remove]  │
│  📄 main_sheet.kicad_sch (89 KB)                         ✓  [Remove]  │
│  📄 power_sheet.kicad_sch (34 KB)                        ✓  [Remove]  │
│                                                                        │
│  ──────────────────────────────────────────────────────────────────── │
│                                                                        │
│  Describe your PCB:                                                    │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ USB-C powered environmental sensor board with ESP32-S3,          │ │
│  │ BME280 sensor, LoRa radio (SX1276), and LiPo battery charging.  │ │
│  │ Target use: outdoor weather station with solar charging.         │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                          245 characters │
│                                                                        │
│  ──────────────────────────────────────────────────────────────────── │
│                                                                        │
│  Select Analyses:                    [Select All] [Select Recommended] │
│                                                                        │
│  General                                                               │
│  ☑ General Review - Comprehensive design review covering all aspects  │
│                                                                        │
│  Power                                                                 │
│  ☑ Power Architecture - Power rails, regulators, and decoupling       │
│  ☑ Power Delivery - Current capacity and distribution analysis        │
│                                                                        │
│  Signal                                                                │
│  ☑ Signal Integrity - Differential pairs, impedance, high-speed       │
│  ☐ EMI/EMC Analysis - Electromagnetic interference assessment         │
│                                                                        │
│  Manufacturing                                                         │
│  ☑ DFM Analysis - Manufacturability, via/trace specs, cost factors    │
│                                                                        │
│  Protection                                                            │
│  ☐ Overcurrent Protection - Fuses, current limiting, fault analysis   │
│  ☑ ESD Protection - Electrostatic discharge protection review         │
│  ☐ Thermal Analysis - Heat dissipation, junction temps, reliability   │
│                                                                        │
│  Components                                                            │
│  ☑ Component/BOM - Component selection and bill of materials          │
│                                                                        │
│  Testing                                                               │
│  ☐ Testability/DFA - Test points, debug access, assembly review       │
│                                                                        │
│  Estimated: ~12,500 tokens | 7 analyses selected                       │
│                                                                        │
│                    [ ▶ Start Review ]                                  │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Review Progress: ████████████░░░░░░░░  4/7 - Signal Integrity        │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ## Table of Contents                    [Export Markdown] [Export PDF]│
│  1. General Review ✓                                                   │
│  2. Power Architecture ✓                                               │
│  3. Power Delivery ✓                                                   │
│  4. Signal Integrity ⏳                                                 │
│  5. DFM Analysis ○                                                     │
│  6. ESD Protection ○                                                   │
│  7. Component/BOM ○                                                    │
│                                                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                        │
│  ▼ General Review                                               [Copy] │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ ## Executive Summary                                             │ │
│  │                                                                  │ │
│  │ This is a well-designed IoT environmental sensor board based     │ │
│  │ on the ESP32-S3 with LoRa connectivity. The design shows good    │ │
│  │ attention to power management with a proper charging circuit     │ │
│  │ and multiple regulated rails.                                    │ │
│  │                                                                  │ │
│  │ ## Strengths                                                     │ │
│  │ - Clean power architecture with proper sequencing                │ │
│  │ - Good decoupling capacitor placement                           │ │
│  │ - Appropriate antenna keepout area                              │ │
│  │ ...                                                              │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ▶ Power Architecture                                           [Copy] │
│  ▶ Power Delivery                                               [Copy] │
│  ▼ Signal Integrity                                             [Copy] │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ ⏳ Analyzing signal integrity...                                 │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│  💬 Chat about your design                                      [─ ▢] │
├────────────────────────────────────────────────────────────────────────┤
│  │ 🤖 Based on the review, your USB-C implementation looks good,   │ │
│  │    but I noticed you might want to add ESD protection on the    │ │
│  │    antenna feed line for the LoRa module.                       │ │
│  │                                                                  │ │
│  │ 👤 What part would you recommend for antenna ESD protection?    │ │
│  │                                                                  │ │
│  │ 🤖 For a LoRa antenna at 868/915 MHz, I'd recommend a TVS      │ │
│  │    diode with low capacitance like the PESD0402-140 (0.15pF)   │ │
│  │    or the Littelfuse PESD3V3L1BA...                            │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ Ask a question about your design...                      [Send] │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

## Settings Modal

```
┌─────────────────────────────────────────┐
│  Settings                          [×]  │
├─────────────────────────────────────────┤
│                                         │
│  LLM Provider                           │
│  ┌───────────────────────────────────┐  │
│  │ ○ OpenAI    ● Anthropic           │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Model                                  │
│  ┌───────────────────────────────────┐  │
│  │ Claude Sonnet 4 (Recommended)  ▾  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  API Key                                │
│  ┌───────────────────────────────────┐  │
│  │ sk-ant-••••••••••••••••••••  👁️  │  │
│  └───────────────────────────────────┘  │
│  ✓ API key validated                    │
│                                         │
│  ☐ Save API key to browser storage      │
│    ⚠️ Only use on trusted devices       │
│                                         │
│                    [ Save ]  [ Cancel ] │
│                                         │
└─────────────────────────────────────────┘
```

---

## Implementation Checklist

### Phase 1: Project Setup
- [ ] Initialize Vite + React + TypeScript project
- [ ] Set up CSS modules and theme variables
- [ ] Create dark/light theme with auto-detection
- [ ] Adapt parsers for browser (remove Node.js deps)
- [ ] Create prompt registry with metadata

### Phase 2: Core Infrastructure
- [ ] OpenAI API client with streaming
- [ ] Anthropic API client with streaming
- [ ] Unified LLM interface
- [ ] App state management (useState/useReducer)

### Phase 3: UI Components
- [ ] Header with theme toggle
- [ ] Settings modal (provider, model, API key)
- [ ] File upload with drag-and-drop
- [ ] Description textarea
- [ ] Analysis selector with categories
- [ ] Review runner with progress
- [ ] Review report with TOC and sections
- [ ] Chat panel with streaming

### Phase 4: Features
- [ ] File parsing integration
- [ ] Review orchestration
- [ ] Chat context building
- [ ] Markdown export
- [ ] PDF export

### Phase 5: Polish
- [ ] Loading states and skeletons
- [ ] Error handling and display
- [ ] LocalStorage persistence
- [ ] Responsive design
- [ ] Accessibility (ARIA, keyboard nav)
