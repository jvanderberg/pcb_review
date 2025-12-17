import styles from './DescriptionInput.module.css';

interface DescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function DescriptionInput({ value, onChange }: DescriptionInputProps) {
  return (
    <div className={styles.container}>
      <label className={styles.label} htmlFor="pcb-description">
        Describe your PCB
      </label>
      <textarea
        id="pcb-description"
        className={styles.textarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe your PCB's purpose, main features, and any specific concerns you want reviewed. For example: 'USB-C powered IoT sensor board with ESP32-S3, BME280 environmental sensor, and LoRa radio module for long-range communication. Primary concerns: power efficiency, USB ESD protection, and antenna performance.'"
        rows={4}
      />
      <div className={styles.footer}>
        <span className={styles.charCount}>{value.length} characters</span>
      </div>
    </div>
  );
}
