'use client';

import type { AdvancedRefineInput, EffectiveAssumptions } from '@/lib/types';

interface AssumptionsDrawerProps {
  assumptions: EffectiveAssumptions;
  advancedInput: AdvancedRefineInput;
  onChange: (next: AdvancedRefineInput) => void;
}

interface EditableField {
  key: keyof AdvancedRefineInput;
  label: string;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
}

const editableFields: EditableField[] = [
  { key: 'workdaysPerYear', label: 'Werkdagen per jaar', unit: 'dagen', min: 120, max: 300, step: 1 },
  { key: 'travelNotBilledFactor', label: 'Niet-doorbelaste reistijd', unit: '%', min: 0, max: 100, step: 1 },
  { key: 'avgHoursPerJob', label: 'Gemiddelde uren per klus', unit: 'uur', min: 2, max: 16, step: 0.5 },
  { key: 'billableHoursPerDay', label: 'Factureerbare uren per werkdag', unit: 'uur', min: 2, max: 10, step: 0.5 },
  { key: 'paymentTermDays', label: 'Betaaltermijn gemiddeld', unit: 'dagen', min: 0, max: 180, step: 1 },
  { key: 'outstandingAmount', label: 'Gemiddeld openstaand bedrag', unit: 'EUR', min: 0, max: 500000, step: 100 },
];

function parseNullableNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function getDisplayValue(field: EditableField, value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';

  if (field.key === 'travelNotBilledFactor') {
    return String(Math.round(value * 100));
  }

  return String(value);
}

export default function AssumptionsDrawer({ assumptions, advancedInput, onChange }: AssumptionsDrawerProps) {
  return (
    <details className="card report-block assumptions-drawer">
      <summary>Aannames (model) bekijken en aanpassen</summary>

      <ul className="assumptions-list">
        <li>Werkdagen per maand (model): {assumptions.workdaysPerMonth.toFixed(1)}</li>
        <li>% niet-doorbelaste reistijd (default): {(assumptions.travelNotBilledFactor * 100).toFixed(0)}%</li>
        <li>Tijd per spoedrit (model): {assumptions.urgentTripHoursDefault.toFixed(1)} uur</li>
        <li>Gemiddelde uren per klus (model): {assumptions.avgHoursPerJobDefault.toFixed(1)} uur</li>
      </ul>

      <div className="assumptions-grid">
        {editableFields.map((field) => (
          <label key={field.key} className="input-wrap">
            <span>{field.label}</span>
            <div className="scan-input-wrap">
              <input
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                value={getDisplayValue(field, advancedInput[field.key] as number | null | undefined)}
                onChange={(event) => {
                  const parsed = parseNullableNumber(event.target.value);
                  const next = { ...advancedInput };

                  if (field.key === 'travelNotBilledFactor') {
                    next[field.key] = parsed === null ? null : parsed / 100;
                  } else {
                    next[field.key] = parsed;
                  }

                  onChange(next);
                }}
              />
              <span>{field.unit}</span>
            </div>
          </label>
        ))}
      </div>
    </details>
  );
}
