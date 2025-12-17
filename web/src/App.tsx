import { useState, useCallback, useRef } from 'react';
import { useTheme } from './hooks/useTheme';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Header } from './components/Header/Header';
import { SettingsPanel } from './components/SettingsPanel/SettingsPanel';
import { FileUpload } from './components/FileUpload/FileUpload';
import { DescriptionInput } from './components/DescriptionInput/DescriptionInput';
import { AnalysisSelector } from './components/AnalysisSelector/AnalysisSelector';
import { ReviewRunner } from './components/ReviewRunner/ReviewRunner';
import { AnalysisModal } from './components/AnalysisModal/AnalysisModal';
import { ResultsView } from './components/ResultsView/ResultsView';
import { SlideOutChat } from './components/SlideOutChat/SlideOutChat';
import { HelpModal } from './components/HelpModal/HelpModal';
import { getDefaultModel } from './api/llm';
import { downloadMarkdown, exportAsPDF } from './utils/export';
import type { Settings, UploadedFile, AnalysisResult, ReviewResult, LLMConfig, ReviewStatus } from './types';
import './styles/global.css';
import styles from './App.module.css';

// Default settings
const DEFAULT_SETTINGS: Settings = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  apiKey: '',
  saveApiKey: false,
  theme: 'auto',
};

export default function App() {
  const { theme, setTheme } = useTheme();

  // Settings state (partially persisted)
  const [savedSettings, setSavedSettings] = useLocalStorage<Partial<Settings>>(
    'pcb-review-settings',
    {}
  );

  const [settings, setSettings] = useState<Settings>(() => ({
    ...DEFAULT_SETTINGS,
    ...savedSettings,
    // Only restore API key if saveApiKey was true
    apiKey: savedSettings.saveApiKey ? (savedSettings.apiKey || '') : '',
  }));

  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // File state
  const [pcbFile, setPcbFile] = useState<UploadedFile | null>(null);
  const [schematicFiles, setSchematicFiles] = useState<UploadedFile[]>([]);

  // User input
  const [description, setDescription] = useState('');
  const [selectedAnalyses, setSelectedAnalyses] = useState<string[]>([
    'general-review',
    'power-analysis',
    'signal-integrity',
    'dfm-analysis',
  ]);

  // Analysis state
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Review state
  const [reviewResults, setReviewResults] = useState<ReviewResult[]>([]);
  const [executiveSummary, setExecutiveSummary] = useState<string>('');

  // View state: 'main' or 'results'
  const [currentView, setCurrentView] = useState<'main' | 'results'>('main');

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);

  // Modal state
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<ReviewStatus>('idle');
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });
  const [currentAnalysisName, setCurrentAnalysisName] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const cancelAnalysisRef = useRef<(() => void) | null>(null);

  // Build LLM config from settings
  const llmConfig: LLMConfig = {
    provider: settings.provider,
    model: settings.model,
    apiKey: settings.apiKey,
  };

  // Handlers
  const handleSettingsChange = useCallback((newSettings: Settings) => {
    setSettings(newSettings);

    // Persist settings (without API key unless saveApiKey is true)
    const toSave: Partial<Settings> = {
      provider: newSettings.provider,
      model: newSettings.model,
      saveApiKey: newSettings.saveApiKey,
      theme: newSettings.theme,
    };

    if (newSettings.saveApiKey) {
      toSave.apiKey = newSettings.apiKey;
    }

    setSavedSettings(toSave);
  }, [setSavedSettings]);

  const handleThemeChange = useCallback((newTheme: Settings['theme']) => {
    setTheme(newTheme);
    setSettings(prev => ({ ...prev, theme: newTheme }));
  }, [setTheme]);

  const handleProviderChange = useCallback((provider: Settings['provider']) => {
    const newModel = getDefaultModel(provider);
    setSettings(prev => ({ ...prev, provider, model: newModel }));
  }, []);

  const handleFilesParsed = useCallback((result: AnalysisResult) => {
    setAnalysisResult(result);
  }, []);

  const handleReviewComplete = useCallback((results: ReviewResult[], summary: string) => {
    setReviewResults(results);
    setExecutiveSummary(summary);
  }, []);

  const handlePartialResult = useCallback((result: ReviewResult) => {
    setReviewResults(prev => {
      // Replace if exists, otherwise add
      const existing = prev.findIndex(r => r.promptId === result.promptId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = result;
        return updated;
      }
      return [...prev, result];
    });
  }, []);

  const handleStatusChange = useCallback((
    status: ReviewStatus,
    progress: { current: number; total: number },
    currentAnalysis: string,
    streaming: string,
    error: string | null
  ) => {
    setAnalysisStatus(status);
    setAnalysisProgress(progress);
    setCurrentAnalysisName(currentAnalysis);
    setStreamingContent(streaming);
    setAnalysisError(error);

    // Show modal when analysis starts
    if (status === 'running' && !showAnalysisModal) {
      setShowAnalysisModal(true);
    }
  }, [showAnalysisModal]);

  const handleCancelAnalysis = useCallback(() => {
    cancelAnalysisRef.current?.();
  }, []);

  const handleViewResults = useCallback(() => {
    setShowAnalysisModal(false);
    setCurrentView('results');
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowAnalysisModal(false);
    setAnalysisStatus('idle');
  }, []);

  const handleBackToMain = useCallback(() => {
    setCurrentView('main');
  }, []);

  const handleExportMarkdown = useCallback(() => {
    downloadMarkdown(reviewResults, analysisResult, description);
  }, [reviewResults, analysisResult, description]);

  const handleExportPDF = useCallback(() => {
    exportAsPDF(reviewResults, analysisResult, executiveSummary, description);
  }, [reviewResults, analysisResult, executiveSummary, description]);

  // Results View
  if (currentView === 'results') {
    return (
      <div className={styles.resultsLayout}>
        <div className={styles.resultsContent}>
          <ResultsView
            results={reviewResults}
            analysisResult={analysisResult}
            executiveSummary={executiveSummary}
            onBack={handleBackToMain}
            onExportMarkdown={handleExportMarkdown}
            onExportPDF={handleExportPDF}
          />
        </div>
        {/* Slide-out Chat Panel */}
        <SlideOutChat
          llmConfig={llmConfig}
          reviewResults={reviewResults}
          analysisResult={analysisResult}
          description={description}
          isOpen={chatOpen}
          onOpenChange={setChatOpen}
        />
      </div>
    );
  }

  // Main View
  return (
    <div className={styles.app}>
      <Header
        theme={theme}
        onThemeChange={handleThemeChange}
        onSettingsClick={() => setShowSettings(true)}
        onHelpClick={() => setShowHelp(true)}
      />

      <main className={styles.main}>
        <div className={styles.container}>
          {/* File Upload Section */}
          <section className={styles.section}>
            <FileUpload
              pcbFile={pcbFile}
              schematicFiles={schematicFiles}
              onPcbFileChange={setPcbFile}
              onSchematicFilesChange={setSchematicFiles}
              onFilesParsed={handleFilesParsed}
            />
          </section>

          {/* Description Section */}
          <section className={styles.section}>
            <DescriptionInput
              value={description}
              onChange={setDescription}
            />
          </section>

          {/* Analysis Selection */}
          <section className={styles.section}>
            <AnalysisSelector
              selectedAnalyses={selectedAnalyses}
              onChange={setSelectedAnalyses}
            />
          </section>

          {/* Review Runner */}
          <section className={styles.section}>
            <ReviewRunner
              analysisResult={analysisResult}
              description={description}
              selectedAnalyses={selectedAnalyses}
              llmConfig={llmConfig}
              onReviewComplete={handleReviewComplete}
              onPartialResult={handlePartialResult}
              onStatusChange={handleStatusChange}
              onCancelRef={cancelAnalysisRef}
              onOpenSettings={() => setShowSettings(true)}
            />
          </section>

        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onProviderChange={handleProviderChange}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Analysis Progress Modal */}
      <AnalysisModal
        isOpen={showAnalysisModal}
        status={analysisStatus}
        progress={analysisProgress}
        currentAnalysis={currentAnalysisName}
        streamingContent={streamingContent}
        error={analysisError}
        onCancel={analysisStatus === 'running' ? handleCancelAnalysis : handleCloseModal}
        onViewResults={handleViewResults}
      />

      {/* Help Modal */}
      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </div>
  );
}
