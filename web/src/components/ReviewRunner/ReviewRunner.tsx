import { useState, useCallback, useRef } from 'react';
import type { AnalysisResult, LLMConfig, ReviewResult, ReviewStatus } from '../../types';
import { getPromptById, FAB_CAPABILITIES_REFERENCE } from '../../prompts';
import { callLLM } from '../../api/llm';
import styles from './ReviewRunner.module.css';

interface ReviewRunnerProps {
  analysisResult: AnalysisResult | null;
  description: string;
  selectedAnalyses: string[];
  llmConfig: LLMConfig;
  onReviewComplete: (results: ReviewResult[], executiveSummary: string) => void;
  onPartialResult?: (result: ReviewResult) => void;
  onStatusChange?: (status: ReviewStatus, progress: { current: number; total: number }, currentAnalysis: string, streamingContent: string, error: string | null) => void;
  onCancelRef?: React.MutableRefObject<(() => void) | null>;
  onOpenSettings?: () => void;
}

const EXECUTIVE_SUMMARY_PROMPT = `You are a PCB design review expert. Based on the analysis results provided, write a concise executive summary (2-3 paragraphs) that:

1. Describes the board's key characteristics (layer count, component count, complexity)
2. Highlights the most critical issues or concerns found
3. Provides an overall assessment of design quality and manufacturing readiness

Be specific and technical but accessible. Focus on actionable insights. Do not use bullet points - write in paragraph form.`;

export function ReviewRunner({
  analysisResult,
  description,
  selectedAnalyses,
  llmConfig,
  onReviewComplete,
  onPartialResult,
  onStatusChange,
  onCancelRef,
  onOpenSettings,
}: ReviewRunnerProps) {
  const [status, setStatus] = useState<ReviewStatus>('idle');
  const [_progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [_currentAnalysis, setCurrentAnalysis] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [_streamingContent, setStreamingContent] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<ReviewResult[]>([]);

  // State is maintained for parent callbacks via onStatusChange
  void _progress; void _currentAnalysis; void _streamingContent;

  // Helper to update status and notify parent
  const updateStatus = useCallback((
    newStatus: ReviewStatus,
    newProgress: { current: number; total: number },
    newCurrentAnalysis: string,
    newStreamingContent: string,
    newError: string | null
  ) => {
    setStatus(newStatus);
    setProgress(newProgress);
    setCurrentAnalysis(newCurrentAnalysis);
    setStreamingContent(newStreamingContent);
    setError(newError);
    onStatusChange?.(newStatus, newProgress, newCurrentAnalysis, newStreamingContent, newError);
  }, [onStatusChange]);

  const canRun =
    analysisResult !== null &&
    selectedAnalyses.length > 0 &&
    llmConfig.apiKey.trim() !== '';

  const buildUserPrompt = useCallback((promptId: string): string => {
    const prompt = getPromptById(promptId);
    if (!prompt || !analysisResult) return '';

    const parts: string[] = [];

    // Add fabrication capabilities reference for accurate DFM assessment
    parts.push(FAB_CAPABILITIES_REFERENCE);
    parts.push('');

    // Add PCB description
    if (description.trim()) {
      parts.push(`## PCB Description\n${description.trim()}\n`);
    }

    // Add relevant JSON data based on prompt's jsonFiles
    parts.push('## Analysis Data\n');

    for (const jsonFile of prompt.jsonFiles) {
      switch (jsonFile) {
        case 'summary':
          parts.push(`### Summary\n\`\`\`json\n${JSON.stringify(analysisResult.summary, null, 2)}\n\`\`\`\n`);
          break;
        case 'power':
          // Build power data from analyzer output - include power ICs for regulator identification
          const powerICs = analysisResult.components.byType['IC_POWER'] || [];
          const inductors = analysisResult.components.byType['INDUCTOR'] || [];
          const capacitors = analysisResult.components.byType['CAPACITOR'] || [];
          const powerData = {
            powerNets: analysisResult.powerNets,
            powerComponents: {
              regulators: powerICs,
              inductors: inductors,
              // Include capacitor count and sample for context (full list can be huge)
              capacitorCount: capacitors.length,
              capacitorSample: capacitors.slice(0, 20),
            },
            thermalAnalysis: analysisResult.thermalAnalysis,
          };
          parts.push(`### Power Analysis\n\`\`\`json\n${JSON.stringify(powerData, null, 2)}\n\`\`\`\n`);
          break;
        case 'signals':
          // Build signals data from analyzer output
          const signalsData = {
            signalNets: analysisResult.signalNets,
            differentialPairs: analysisResult.differentialPairs,
            traceStats: analysisResult.traceStats,
            layerStackup: analysisResult.layerStackup,
          };
          parts.push(`### Signal Analysis\n\`\`\`json\n${JSON.stringify(signalsData, null, 2)}\n\`\`\`\n`);
          break;
        case 'components':
          // Build components data
          const componentsData = {
            byType: analysisResult.components.byType,
            all: analysisResult.components.all,
            crossReference: analysisResult.crossReference,
          };
          parts.push(`### Components\n\`\`\`json\n${JSON.stringify(componentsData, null, 2)}\n\`\`\`\n`);
          break;
        case 'dfm':
          // Build DFM data from analyzer output
          const dfmData = {
            viaStats: analysisResult.viaStats,
            viaInPad: analysisResult.viaInPad,
            traceStats: analysisResult.traceStats,
            layerStackup: analysisResult.layerStackup,
          };
          console.log('DFM Data sent to LLM:', dfmData);
          console.log('Via-in-pad instances:', analysisResult.viaInPad);
          parts.push(`### DFM Analysis\n\`\`\`json\n${JSON.stringify(dfmData, null, 2)}\n\`\`\`\n`);
          break;
      }
    }

    return parts.join('\n');
  }, [analysisResult, description]);

  const runAnalyses = useCallback(async () => {
    if (!canRun) return;

    // Create new AbortController for this run
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    resultsRef.current = [];
    // Total includes all analyses plus the executive summary step
    const totalSteps = selectedAnalyses.length + 1;
    updateStatus('running', { current: 0, total: totalSteps }, '', '', null);

    for (let i = 0; i < selectedAnalyses.length; i++) {
      if (signal.aborted) {
        updateStatus('cancelled', { current: i, total: totalSteps }, '', '', null);
        onReviewComplete(resultsRef.current, '');
        return;
      }

      const promptId = selectedAnalyses[i]!;
      const prompt = getPromptById(promptId);

      if (!prompt) continue;

      updateStatus('running', { current: i, total: totalSteps }, prompt.name, '', null);

      try {
        const userPrompt = buildUserPrompt(promptId);
        let currentStream = '';

        const response = await callLLM(
          llmConfig,
          prompt.prompt,
          userPrompt,
          (chunk) => {
            if (!signal.aborted) {
              currentStream += chunk;
              setStreamingContent(currentStream);
              onStatusChange?.('running', { current: i, total: totalSteps }, prompt.name, currentStream, null);
            }
          },
          signal
        );

        if (!signal.aborted) {
          const result: ReviewResult = {
            promptId,
            promptName: prompt.name,
            response,
            timestamp: Date.now(),
          };
          resultsRef.current.push(result);
          onPartialResult?.(result);
        }
      } catch (err) {
        // Check if this was an abort
        if (err instanceof DOMException && err.name === 'AbortError') {
          updateStatus('cancelled', { current: i, total: selectedAnalyses.length }, '', '', null);
          onReviewComplete(resultsRef.current, '');
          return;
        }

        if (!signal.aborted) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          const result: ReviewResult = {
            promptId,
            promptName: prompt.name,
            response: '',
            error: message,
            timestamp: Date.now(),
          };
          resultsRef.current.push(result);
          onPartialResult?.(result);
        }
      }
    }

    if (!signal.aborted) {
      // Generate executive summary (final step)
      updateStatus('running', { current: selectedAnalyses.length, total: totalSteps }, 'Executive Summary', '', null);

      let executiveSummary = '';
      try {
        const summaryData = resultsRef.current
          .filter(r => !r.error && r.response)
          .map(r => `## ${r.promptName}\n${r.response}`)
          .join('\n\n');

        const boardInfo = analysisResult ?
          `Board: ${analysisResult.summary.copperLayers} layers, ${analysisResult.summary.totalComponents} components, ${analysisResult.summary.totalNets} nets, ${analysisResult.summary.totalVias} vias` : '';

        const userPrompt = `${boardInfo}\n\nProject Description: ${description || 'Not provided'}\n\n# Analysis Results\n\n${summaryData}`;

        executiveSummary = await callLLM(
          llmConfig,
          EXECUTIVE_SUMMARY_PROMPT,
          userPrompt,
          undefined,
          signal
        );
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.error('Failed to generate executive summary:', err);
          executiveSummary = 'Executive summary generation failed. Please review the individual analysis sections below.';
        }
      }

      if (!signal.aborted) {
        updateStatus('complete', { current: totalSteps, total: totalSteps }, '', '', null);
        onReviewComplete(resultsRef.current, executiveSummary);
      }
    }
  }, [canRun, selectedAnalyses, llmConfig, buildUserPrompt, onReviewComplete, onPartialResult, updateStatus, onStatusChange, analysisResult, description]);

  const cancelAnalyses = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  // Expose cancel function to parent
  if (onCancelRef) {
    onCancelRef.current = cancelAnalyses;
  }

  const needsApiKey = !llmConfig.apiKey.trim();

  const getStatusMessage = (): string => {
    if (needsApiKey) {
      return '';  // Handled separately with clickable link
    }
    if (!analysisResult) {
      return 'Please upload a PCB file first';
    }
    if (selectedAnalyses.length === 0) {
      return 'Please select at least one analysis';
    }
    return '';
  };

  return (
    <div className={styles.container}>
      {(status === 'idle' || status === 'cancelled') && (
        <>
          <button
            className={styles.runButton}
            onClick={runAnalyses}
            disabled={!canRun}
          >
            Run Review ({selectedAnalyses.length} {selectedAnalyses.length === 1 ? 'analysis' : 'analyses'})
          </button>
          {needsApiKey && onOpenSettings && (
            <button
              className={styles.configureLink}
              onClick={onOpenSettings}
            >
              Configure API Key
            </button>
          )}
          {!canRun && !needsApiKey && (
            <p className={styles.statusMessage}>{getStatusMessage()}</p>
          )}
        </>
      )}


      {status === 'complete' && (
        <div className={styles.complete}>
          <span className={styles.completeIcon}>&#10003;</span>
          <span className={styles.completeText}>Review complete!</span>
          <button
            className={styles.rerunButton}
            onClick={() => setStatus('idle')}
          >
            Run Again
          </button>
        </div>
      )}


      {error && (
        <div className={styles.error}>
          <span className={styles.errorIcon}>&#9888;</span>
          {error}
        </div>
      )}
    </div>
  );
}
