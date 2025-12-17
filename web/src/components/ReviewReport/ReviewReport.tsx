import { useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ReviewResult } from '../../types';
import styles from './ReviewReport.module.css';

interface ReviewReportProps {
  results: ReviewResult[];
  onExportMarkdown: () => void;
  onExportPDF: () => void;
}

export function ReviewReport({ results, onExportMarkdown, onExportPDF }: ReviewReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  const successfulResults = useMemo(
    () => results.filter(r => !r.error && r.response),
    [results]
  );

  const failedResults = useMemo(
    () => results.filter(r => r.error),
    [results]
  );

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (results.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Review Report</h2>
        <div className={styles.exportButtons}>
          <button
            className={styles.exportButton}
            onClick={onExportMarkdown}
            title="Export as Markdown"
          >
            &#128196; Markdown
          </button>
          <button
            className={styles.exportButton}
            onClick={onExportPDF}
            title="Export as PDF"
          >
            &#128196; PDF
          </button>
        </div>
      </div>

      {/* Table of Contents */}
      <nav className={styles.toc}>
        <h3 className={styles.tocTitle}>Contents</h3>
        <ul className={styles.tocList}>
          {successfulResults.map((result, index) => (
            <li key={result.promptId} className={styles.tocItem}>
              <button
                className={styles.tocLink}
                onClick={() => scrollToSection(`section-${index}`)}
              >
                {result.promptName}
              </button>
            </li>
          ))}
          {failedResults.length > 0 && (
            <li className={styles.tocItem}>
              <button
                className={`${styles.tocLink} ${styles.tocLinkError}`}
                onClick={() => scrollToSection('section-errors')}
              >
                Errors ({failedResults.length})
              </button>
            </li>
          )}
        </ul>
      </nav>

      {/* Report Content */}
      <div className={styles.report} ref={reportRef}>
        {successfulResults.map((result, index) => (
          <section
            key={result.promptId}
            id={`section-${index}`}
            className={styles.section}
          >
            <h3 className={styles.sectionTitle}>{result.promptName}</h3>
            <div className={styles.sectionContent}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {result.response}
              </ReactMarkdown>
            </div>
          </section>
        ))}

        {failedResults.length > 0 && (
          <section id="section-errors" className={styles.section}>
            <h3 className={`${styles.sectionTitle} ${styles.errorTitle}`}>
              Errors
            </h3>
            <div className={styles.errorList}>
              {failedResults.map(result => (
                <div key={result.promptId} className={styles.errorItem}>
                  <span className={styles.errorName}>{result.promptName}</span>
                  <span className={styles.errorMessage}>{result.error}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
