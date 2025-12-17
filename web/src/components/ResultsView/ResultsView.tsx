import { useState, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ReviewResult, AnalysisResult } from '../../types';
import styles from './ResultsView.module.css';

interface ResultsViewProps {
  results: ReviewResult[];
  analysisResult: AnalysisResult | null;
  executiveSummary: string;
  onBack: () => void;
  onExportMarkdown: () => void;
  onExportPDF: () => void;
}

export function ResultsView({
  results,
  analysisResult,
  executiveSummary,
  onBack,
  onExportMarkdown,
  onExportPDF,
}: ResultsViewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  const successfulResults = useMemo(
    () => results.filter(r => !r.error && r.response),
    [results]
  );

  const failedResults = useMemo(
    () => results.filter(r => r.error),
    [results]
  );


  // Generate short summary for each section
  const getSectionSummary = useCallback((response: string): string => {
    // Try to extract the first meaningful paragraph or list
    const lines = response.split('\n').filter(l => l.trim());

    // Look for executive summary or first paragraph after a heading
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Skip headings
      if (line.startsWith('#')) continue;
      // Skip empty lines and short lines
      if (line.length < 20) continue;
      // Skip table rows
      if (line.startsWith('|')) continue;
      // Return first meaningful line, truncated
      if (line.length > 150) {
        return line.slice(0, 150) + '...';
      }
      return line;
    }

    return 'Click to expand and view details.';
  }, []);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedSections(new Set());
      setAllExpanded(false);
    } else {
      setExpandedSections(new Set(successfulResults.map(r => r.promptId)));
      setAllExpanded(true);
    }
  };

  const scrollToSection = (id: string) => {
    // Expand the section first
    setExpandedSections(prev => new Set(prev).add(id));
    // Then scroll to it
    setTimeout(() => {
      const element = document.getElementById(`section-${id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backButton} onClick={onBack}>
          ← Back
        </button>
        <h1 className={styles.title}>Analysis Results</h1>
        <div className={styles.headerActions}>
          <button className={styles.exportButton} onClick={onExportMarkdown}>
            📄 Markdown
          </button>
          <button className={styles.exportButton} onClick={onExportPDF}>
            📄 PDF
          </button>
        </div>
      </header>

      {/* Executive Summary */}
      <section className={styles.summary}>
        <h2 className={styles.summaryTitle}>Executive Summary</h2>
        <div className={styles.summaryText}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {executiveSummary || 'No executive summary available.'}
          </ReactMarkdown>
        </div>
        {analysisResult && (
          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{analysisResult.summary.copperLayers}</span>
              <span className={styles.statLabel}>Layers</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{analysisResult.summary.totalComponents}</span>
              <span className={styles.statLabel}>Components</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{analysisResult.summary.totalNets}</span>
              <span className={styles.statLabel}>Nets</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{analysisResult.summary.totalVias}</span>
              <span className={styles.statLabel}>Vias</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{successfulResults.length}</span>
              <span className={styles.statLabel}>Analyses</span>
            </div>
          </div>
        )}
      </section>

      {/* Table of Contents */}
      <nav className={styles.toc}>
        <div className={styles.tocHeader}>
          <h3 className={styles.tocTitle}>Contents</h3>
          <button className={styles.expandAllButton} onClick={toggleAll}>
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
        <ul className={styles.tocList}>
          {successfulResults.map(result => (
            <li key={result.promptId} className={styles.tocItem}>
              <button
                className={styles.tocLink}
                onClick={() => scrollToSection(result.promptId)}
              >
                {result.promptName}
              </button>
            </li>
          ))}
          {failedResults.length > 0 && (
            <li className={styles.tocItem}>
              <button
                className={`${styles.tocLink} ${styles.tocLinkError}`}
                onClick={() => scrollToSection('errors')}
              >
                Errors ({failedResults.length})
              </button>
            </li>
          )}
        </ul>
      </nav>

      {/* Analysis Sections */}
      <div className={styles.sections} data-report-content>
        {successfulResults.map(result => {
          const isExpanded = expandedSections.has(result.promptId);
          return (
            <section
              key={result.promptId}
              id={`section-${result.promptId}`}
              className={styles.section}
            >
              <button
                className={styles.sectionHeader}
                onClick={() => toggleSection(result.promptId)}
                aria-expanded={isExpanded}
              >
                <span className={styles.sectionIcon}>
                  {isExpanded ? '▼' : '▶'}
                </span>
                <div className={styles.sectionHeaderContent}>
                  <h3 className={styles.sectionTitle}>{result.promptName}</h3>
                  {!isExpanded && (
                    <p className={styles.sectionSummary}>
                      {getSectionSummary(result.response)}
                    </p>
                  )}
                </div>
              </button>
              {isExpanded && (
                <div className={styles.sectionContent}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {result.response}
                  </ReactMarkdown>
                </div>
              )}
            </section>
          );
        })}

        {/* Errors Section */}
        {failedResults.length > 0 && (
          <section id="section-errors" className={styles.section}>
            <button
              className={styles.sectionHeader}
              onClick={() => toggleSection('errors')}
              aria-expanded={expandedSections.has('errors')}
            >
              <span className={styles.sectionIcon}>
                {expandedSections.has('errors') ? '▼' : '▶'}
              </span>
              <div className={styles.sectionHeaderContent}>
                <h3 className={`${styles.sectionTitle} ${styles.errorTitle}`}>
                  Errors ({failedResults.length})
                </h3>
              </div>
            </button>
            {expandedSections.has('errors') && (
              <div className={styles.sectionContent}>
                {failedResults.map(result => (
                  <div key={result.promptId} className={styles.errorItem}>
                    <strong>{result.promptName}:</strong> {result.error}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
