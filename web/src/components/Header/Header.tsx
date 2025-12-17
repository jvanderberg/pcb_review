import type { Theme } from '../../types';
import styles from './Header.module.css';

interface HeaderProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onSettingsClick: () => void;
  onHelpClick: () => void;
}

export function Header({ theme, onThemeChange, onSettingsClick, onHelpClick }: HeaderProps) {
  const themeOptions: { value: Theme; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <svg className={styles.logoIcon} viewBox="0 0 64 64">
          {/* Board */}
          <rect x="8" y="10" width="48" height="44" rx="7" ry="7" fill="#1f7a4a" stroke="#0e3b25" strokeWidth="2"/>
          {/* Chip */}
          <rect x="26" y="16" width="12" height="32" rx="2.5" ry="2.5" fill="#0f2f1f" stroke="#061a11" strokeWidth="1.5"/>
          {/* Left vias */}
          <circle cx="14" cy="16" r="2.2" fill="#ffd400" stroke="#7a5a12" strokeWidth="1.1"/>
          <circle cx="14" cy="27" r="2.2" fill="#ffd400" stroke="#7a5a12" strokeWidth="1.1"/>
          <circle cx="14" cy="37" r="2.2" fill="#ffd400" stroke="#7a5a12" strokeWidth="1.1"/>
          <circle cx="14" cy="48" r="2.2" fill="#ffd400" stroke="#7a5a12" strokeWidth="1.1"/>
          {/* Right vias */}
          <circle cx="50" cy="26" r="2.2" fill="#ffd400" stroke="#7a5a12" strokeWidth="1.1"/>
          <circle cx="50" cy="42" r="2.2" fill="#ffd400" stroke="#7a5a12" strokeWidth="1.1"/>
          {/* Traces: left vias to left pads */}
          <path d="M14 16 L18 16 L22.5 20.5 L23.1 20.5" fill="none" stroke="#55e07b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 27 L18 27 L19.5 28.5 L23.1 28.5" fill="none" stroke="#55e07b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 37 L18 37 L18.5 36.5 L23.1 36.5" fill="none" stroke="#55e07b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 48 L18 48 L21.5 44.5 L23.1 44.5" fill="none" stroke="#55e07b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          {/* Traces: right pads to right vias */}
          <path d="M41 28.5 L44 28.5 L46.5 26 L50 26" fill="none" stroke="#55e07b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M41 36.5 L44 36.5 L49.5 42 L50 42" fill="none" stroke="#55e07b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          {/* Left pads */}
          <rect x="22" y="19" width="4" height="3" rx="0.8" fill="#d7dbe0" stroke="#8a9099" strokeWidth="1"/>
          <rect x="22" y="27" width="4" height="3" rx="0.8" fill="#d7dbe0" stroke="#8a9099" strokeWidth="1"/>
          <rect x="22" y="35" width="4" height="3" rx="0.8" fill="#d7dbe0" stroke="#8a9099" strokeWidth="1"/>
          <rect x="22" y="43" width="4" height="3" rx="0.8" fill="#d7dbe0" stroke="#8a9099" strokeWidth="1"/>
          {/* Right pads */}
          <rect x="38" y="19" width="4" height="3" rx="0.8" fill="#d7dbe0" stroke="#8a9099" strokeWidth="1" opacity="0.75"/>
          <rect x="38" y="27" width="4" height="3" rx="0.8" fill="#d7dbe0" stroke="#8a9099" strokeWidth="1"/>
          <rect x="38" y="35" width="4" height="3" rx="0.8" fill="#d7dbe0" stroke="#8a9099" strokeWidth="1"/>
          <rect x="38" y="43" width="4" height="3" rx="0.8" fill="#d7dbe0" stroke="#8a9099" strokeWidth="1" opacity="0.75"/>
        </svg>
        <span className={styles.logoText}>PCB Review</span>
      </div>

      <div className={styles.actions}>
        <select
          className={styles.themeSelect}
          value={theme}
          onChange={(e) => onThemeChange(e.target.value as Theme)}
          aria-label="Theme"
        >
          {themeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          className={styles.helpButton}
          onClick={onHelpClick}
          aria-label="Help"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>

        <button
          className={styles.settingsButton}
          onClick={onSettingsClick}
          aria-label="Settings"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
