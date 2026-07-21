import type { Settings } from "../hooks/useSettings";
import { ACCENTS, FLAVORS, FLAVOR_LABELS } from "../theme/tokens";

interface SettingsPanelProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  return (
    <div className="settings-panel">
      <h1>Settings</h1>

      <section>
        <h2>Flavor</h2>
        <div className="flavor-grid">
          {FLAVORS.map((flavor) => (
            <button
              key={flavor}
              className={`flavor-swatch${settings.flavor === flavor ? " is-active" : ""}`}
              data-flavor={flavor}
              onClick={() => onChange({ ...settings, flavor })}
            >
              {FLAVOR_LABELS[flavor]}
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
              data-flavor={settings.flavor}
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
