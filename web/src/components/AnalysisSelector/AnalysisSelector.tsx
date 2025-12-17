import { useMemo } from 'react';
import { PROMPTS, getPromptsByCategory } from '../../prompts';
import type { PromptConfig } from '../../prompts';
import styles from './AnalysisSelector.module.css';

interface AnalysisSelectorProps {
  selectedAnalyses: string[];
  onChange: (selected: string[]) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  power: 'Power & Thermal',
  signal: 'Signal Integrity',
  manufacturing: 'Manufacturing',
  general: 'General Review',
  protection: 'Protection',
  components: 'Components',
  testing: 'Testing',
};

const CATEGORY_ORDER = ['general', 'power', 'signal', 'manufacturing', 'protection', 'components', 'testing'];

export function AnalysisSelector({ selectedAnalyses, onChange }: AnalysisSelectorProps) {
  const promptsByCategory = useMemo(() => getPromptsByCategory(), []);

  const handleToggle = (id: string) => {
    if (selectedAnalyses.includes(id)) {
      onChange(selectedAnalyses.filter(a => a !== id));
    } else {
      onChange([...selectedAnalyses, id]);
    }
  };

  const handleSelectAll = () => {
    onChange(PROMPTS.map(p => p.id));
  };

  const handleSelectNone = () => {
    onChange([]);
  };

  const handleSelectRecommended = () => {
    onChange(PROMPTS.filter(p => p.recommended).map(p => p.id));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <label className={styles.label}>Select Analyses</label>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={handleSelectRecommended}
          >
            Recommended
          </button>
          <button
            type="button"
            className={styles.actionButton}
            onClick={handleSelectAll}
          >
            All
          </button>
          <button
            type="button"
            className={styles.actionButton}
            onClick={handleSelectNone}
          >
            None
          </button>
        </div>
      </div>

      <div className={styles.categories}>
        {CATEGORY_ORDER.map(category => {
          const prompts = promptsByCategory.get(category);
          if (!prompts || prompts.length === 0) return null;

          return (
            <div key={category} className={styles.category}>
              <h3 className={styles.categoryTitle}>{CATEGORY_LABELS[category]}</h3>
              <div className={styles.promptList}>
                {prompts.map((prompt: PromptConfig) => (
                  <label
                    key={prompt.id}
                    className={`${styles.promptItem} ${selectedAnalyses.includes(prompt.id) ? styles.selected : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAnalyses.includes(prompt.id)}
                      onChange={() => handleToggle(prompt.id)}
                      className={styles.checkbox}
                    />
                    <div className={styles.promptInfo}>
                      <span className={styles.promptName}>
                        {prompt.name}
                        {prompt.recommended && (
                          <span className={styles.recommendedBadge}>Recommended</span>
                        )}
                      </span>
                      <span className={styles.promptDescription}>
                        {prompt.shortDescription}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>
        <span className={styles.selectedCount}>
          {selectedAnalyses.length} of {PROMPTS.length} analyses selected
        </span>
      </div>
    </div>
  );
}
