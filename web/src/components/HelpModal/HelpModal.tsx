import { Modal } from '../Modal/Modal';
import styles from './HelpModal.module.css';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How to Use PCB Review">
      <div className={styles.content}>
        <section className={styles.section}>
          <h3>1. Upload Your Design Files</h3>
          <p>
            Upload your KiCad PCB file (<code>.kicad_pcb</code>) and optionally your
            schematic files (<code>.kicad_sch</code>). The tool parses these files
            directly in your browser - nothing is uploaded to any server.
          </p>
        </section>

        <section className={styles.section}>
          <h3>2. Add a Description</h3>
          <p>
            Provide context about your design: what it does, target specs,
            manufacturing requirements, or specific concerns. This helps the
            AI give more relevant feedback.
          </p>
        </section>

        <section className={styles.section}>
          <h3>3. Select Analyses</h3>
          <p>
            Choose which types of analysis you want. The recommended defaults
            cover most needs, but you can add specialized analyses like EMI,
            thermal, or testability reviews.
          </p>
        </section>

        <section className={styles.section}>
          <h3>4. Configure API Key</h3>
          <p>
            Click the gear icon to enter your API key. Supports Anthropic (Claude)
            or OpenAI. Your key is used directly from your browser and can
            optionally be saved locally.
          </p>
        </section>

        <section className={styles.section}>
          <h3>5. Run Analysis</h3>
          <p>
            Click "Run Analysis" to start the review. Each selected analysis
            runs sequentially, with results appearing as they complete.
          </p>
        </section>

        <section className={styles.section}>
          <h3>6. Review Results & Chat</h3>
          <p>
            Browse the analysis results, export as PDF or Markdown, and use
            the chat panel to ask follow-up questions about your design.
          </p>
        </section>

        <section className={styles.section}>
          <h3>Privacy</h3>
          <p>
            All file parsing happens in your browser. Design data is only sent
            to your chosen AI provider (Anthropic/OpenAI) for analysis. Nothing
            is stored on our servers.
          </p>
        </section>
      </div>
    </Modal>
  );
}
