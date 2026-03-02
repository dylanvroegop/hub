'use client';

import type { AdvancedRefineInput } from '@/lib/types';

interface AdvancedRefineProps {
  value: AdvancedRefineInput;
  onChange: (next: AdvancedRefineInput) => void;
}

interface FieldConfig {
  key: keyof AdvancedRefineInput;
  label: string;
  help: string;
  min?: number;
  max?: number;
  step?: number;
}

const fields: FieldConfig[] = [
  {
    key: 'workdaysPerYear',
    label: 'Werkdagen per jaar',
    help: 'Gemiddeld aantal werkdagen op jaarbasis. Standaard 230.',
    min: 120,
    max: 300,
    step: 1,
  },
  {
    key: 'billableHoursPerDay',
    label: 'Factureerbare uren per werkdag',
    help: 'Alleen uren die je echt factureert. Standaard 6.',
    min: 2,
    max: 10,
    step: 0.5,
  },
  {
    key: 'avgHoursPerJob',
    label: 'Gemiddelde uren per klus',
    help: 'Alleen invullen als je dit redelijk nauwkeurig weet. Standaard 6.',
    min: 2,
    max: 16,
    step: 0.5,
  },
  {
    key: 'travelNotBilledFactor',
    label: 'Niet-doorbelaste reistijdfactor (0–1)',
    help: '0,5 betekent: 50% van reistijd wordt niet gedekt.',
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: 'toolsDepreciationPerMonth',
    label: 'Afschrijving gereedschap per maand (EUR)',
    help: 'Optioneel: maanddruk door slijtage en vervanging.',
    min: 0,
    max: 5000,
    step: 10,
  },
  {
    key: 'fixedCostsPerMonth',
    label: 'Verzekeringen/vaste lasten per maand (EUR)',
    help: 'Optioneel: vaste lasten die je marge drukken.',
    min: 0,
    max: 15000,
    step: 10,
  },
  {
    key: 'revisitJobsPerMonth',
    label: 'Herhaalbezoeken per maand (aantal)',
    help: 'Extra bezoeken voor opleverpunten/nazorg.',
    min: 0,
    max: 20,
    step: 1,
  },
  {
    key: 'revisitHoursPerVisit',
    label: 'Uren per herhaalbezoek',
    help: 'Gemiddelde tijd per extra bezoek.',
    min: 0.25,
    max: 6,
    step: 0.25,
  },
  {
    key: 'paymentTermDays',
    label: 'Gemiddelde betaaltermijn (dagen)',
    help: 'Voor conservatieve cashflow-kosten (optioneel).',
    min: 0,
    max: 180,
    step: 1,
  },
  {
    key: 'outstandingAmount',
    label: 'Gemiddeld openstaand bedrag (EUR)',
    help: 'Samen met betaaltermijn voor cashflow-drag.',
    min: 0,
    max: 500000,
    step: 100,
  },
];

function parseNullableNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export default function AdvancedRefine({ value, onChange }: AdvancedRefineProps) {
  return (
    <section className="card" style={{ padding: '0.9rem', marginTop: '0.9rem' }}>
      <h3 style={{ marginTop: 0, marginBottom: '0.35rem' }}>Modus B · Verfijnen</h3>
      <p style={{ marginTop: 0, color: 'hsl(var(--muted-foreground))' }}>
        Alleen invullen als je het weet. Je krijgt direct een scherpere bandbreedte.
      </p>

      <div className="grid-2">
        {fields.map((field) => (
          <div key={field.key} className="input-wrap">
            <label htmlFor={`advanced-${field.key}`}>{field.label}</label>
            <input
              id={`advanced-${field.key}`}
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              value={value[field.key] ?? ''}
              onChange={(event) => {
                const parsed = parseNullableNumber(event.target.value);
                onChange({ ...value, [field.key]: parsed });
              }}
            />
            <small>{field.help}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
