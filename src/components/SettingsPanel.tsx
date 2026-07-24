import type { Settings } from "../hooks/useSettings";
import { ACCENTS, SCHEMES, SCHEME_LABELS } from "../theme/tokens";

interface SettingsPanelProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onBack: () => void;
}

export function SettingsPanel({ settings, onChange, onBack }: SettingsPanelProps) {
  return (
    <div className="settings-panel">
      <button className="panel-back-button" onClick={onBack}>
        ← Back
      </button>
      <h1>Settings</h1>

      <section>
        <h2>Color scheme</h2>
        <div className="scheme-grid">
          {SCHEMES.map((scheme) => (
            <button
              key={scheme}
              className={`scheme-swatch${settings.scheme === scheme ? " is-active" : ""}`}
              data-scheme={scheme}
              onClick={() => onChange({ ...settings, scheme })}
            >
              {SCHEME_LABELS[scheme]}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Accent</h2>
        <div className="accent-grid">
          {ACCENTS.map((accent) => (
            <button
              key={accent}
              className={`accent-swatch${settings.accent === accent ? " is-active" : ""}`}
              data-scheme={settings.scheme}
              data-accent={accent}
              title={accent}
              aria-label={accent}
              onClick={() => onChange({ ...settings, accent })}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
