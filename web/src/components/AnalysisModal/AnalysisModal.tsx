import { Modal } from '../Modal/Modal';
import styles from './AnalysisModal.module.css';

interface AnalysisModalProps {
  isOpen: boolean;
  status: 'idle' | 'running' | 'complete' | 'error' | 'cancelled';
  progress: { current: number; total: number };
  currentAnalysis: string;
  streamingContent: string;
  error: string | null;
  onCancel: () => void;
  onViewResults: () => void;
}

export function AnalysisModal({
  isOpen,
  status,
  progress,
  currentAnalysis,
  streamingContent,
  error,
  onCancel,
  onViewResults,
}: AnalysisModalProps) {
  const isRunning = status === 'running';
  const isComplete = status === 'complete';
  const isCancelled = status === 'cancelled';
  const isError = status === 'error';

  const progressPercent = progress.total > 0
    ? Math.round(((progress.current + (isRunning ? 0.5 : 0)) / progress.total) * 100)
    : 0;

  return (
    <Modal isOpen={isOpen} showCloseButton={false}>
      <div className={styles.container}>
        {isRunning && (
          <>
            <div className={styles.spinner} />
            <h3 className={styles.title}>Running Analysis</h3>
            <p className={styles.subtitle}>
              {progress.current + 1} of {progress.total} analyses
            </p>

            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className={styles.progressText}>{progressPercent}%</span>
            </div>

            {currentAnalysis && (
              <p className={styles.currentTask}>
                Currently running: <strong>{currentAnalysis}</strong>
              </p>
            )}

            <div className={styles.streaming}>
              <pre className={styles.streamingContent}>
                {streamingContent ? streamingContent.slice(-800) : 'Waiting for response...'}
                <span className={styles.cursor}>|</span>
              </pre>
            </div>

            <button className={styles.cancelButton} onClick={onCancel}>
              Cancel
            </button>
          </>
        )}

        {isComplete && (
          <>
            <div className={styles.successIcon}>&#10003;</div>
            <h3 className={styles.title}>Analysis Complete</h3>
            <p className={styles.subtitle}>
              Successfully completed {progress.total} {progress.total === 1 ? 'analysis' : 'analyses'}
            </p>
            <button className={styles.viewButton} onClick={onViewResults}>
              View Results
            </button>
          </>
        )}

        {isCancelled && (
          <>
            <div className={styles.cancelledIcon}>&#10005;</div>
            <h3 className={styles.title}>Analysis Cancelled</h3>
            <p className={styles.subtitle}>
              Completed {progress.current} of {progress.total} analyses before cancellation
            </p>
            {progress.current > 0 && (
              <button className={styles.viewButton} onClick={onViewResults}>
                View Partial Results
              </button>
            )}
            <button className={styles.closeButton} onClick={onCancel}>
              Close
            </button>
          </>
        )}

        {isError && (
          <>
            <div className={styles.errorIcon}>&#9888;</div>
            <h3 className={styles.title}>Analysis Error</h3>
            <p className={styles.errorMessage}>{error}</p>
            {progress.current > 0 && (
              <button className={styles.viewButton} onClick={onViewResults}>
                View Partial Results
              </button>
            )}
            <button className={styles.closeButton} onClick={onCancel}>
              Close
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
