'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ScanCardAccordion from '@/components/scan-card-accordion';
import ScanInputRow from '@/components/scan-input-row';
import { track } from '@/lib/analytics';
import { calculateEstimate } from '@/lib/calc';
import { advancedDefaults, quickCheckDefaults, quickFieldMeta } from '@/lib/defaults';
import { formatEuro } from '@/lib/format';
import { ESTIMATE_PAYLOAD_KEY } from '@/lib/storage';
import type { EstimateResult, LossCategoryKey, QuickCheckInput, QuickFieldKey } from '@/lib/types';

type CardId = 'travel' | 'office' | 'leaks';
type InteractionKind = 'manual' | 'quick' | 'toggle';

interface ScanCardConfig {
  id: CardId;
  icon: string;
  title: string;
  description: string;
  fields: QuickFieldKey[];
  nudge: string;
}

const cardConfigs: ScanCardConfig[] = [
  {
    id: 'travel',
    icon: 'R',
    title: 'Reis & ritkosten',
    description: 'Reistijd, ritten en directe ritkosten.',
    fields: ['travelHoursPerWorkday', 'parkingPerJob', 'urgentTripsPerMonth'],
    nudge: '💡 De meeste timmermannen schatten hun reistijd 30% te laag in. Tel je wachttijd bij de bouwmarkt mee?',
  },
  {
    id: 'office',
    icon: 'K',
    title: 'Kantoor-uren',
    description: 'Niet-factureerbare uren voor offertes, administratie en nazorg.',
    fields: ['adminHoursPerWeek', 'callbackHoursPerMonth'],
    nudge:
      "💡 Wist je dat de gemiddelde ZZP'er 6-8 uur per week kwijt is aan offertes en opvolging? De meeste tellen WhatsApp-berichten en nabellen niet mee.",
  },
  {
    id: 'leaks',
    icon: 'M',
    title: 'Mislopen & fouten',
    description: 'Onderprijsde tijd, materiaal-lek en kerncapaciteit.',
    fields: ['hourlyRate', 'jobsPerMonth', 'forgotMaterialPerMonth', 'underpricedPercent'],
    nudge:
      '💡 5% onderprijsde tijd klinkt weinig — maar op 16 klussen per maand is dat bijna een volle werkdag per maand die je weggeeft.',
  },
];

const categoryToCard: Partial<Record<LossCategoryKey, CardId>> = {
  travel_logistics: 'travel',
  parking_toll: 'travel',
  urgent_trips: 'travel',
  offer_admin: 'office',
  callback_rework: 'office',
  material_leak: 'leaks',
  underpriced_time: 'leaks',
  cashflow_drag: 'office',
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function getBiggestChangedCard(previous: EstimateResult, next: EstimateResult): CardId | null {
  const previousValues = new Map(previous.categories.map((category) => [category.key, category.monthly.likely]));
  let strongestDelta = 0;
  let strongestKey: LossCategoryKey | null = null;

  for (const category of next.categories) {
    const before = previousValues.get(category.key) ?? 0;
    const delta = Math.abs(category.monthly.likely - before);
    if (delta > strongestDelta) {
      strongestDelta = delta;
      strongestKey = category.key;
    }
  }

  if (!strongestKey || strongestDelta < 1) return null;
  return categoryToCard[strongestKey] ?? null;
}

function buildCardSummary(cardId: CardId, quickInput: QuickCheckInput): string {
  if (cardId === 'travel') {
    return `${formatNumber(quickInput.travelHoursPerWorkday)} uur/dag, ${formatEuro(quickInput.parkingPerJob)}/klus, ${formatNumber(quickInput.urgentTripsPerMonth)} ritten/maand`;
  }

  if (cardId === 'office') {
    return `${formatNumber(quickInput.adminHoursPerWeek)} uur/week, ${formatNumber(quickInput.callbackHoursPerMonth)} uur/maand nazorg`;
  }

  const ratePart = quickInput.useDayRate
    ? `${formatEuro(quickInput.dayRate)}/dag`
    : `${formatEuro(quickInput.hourlyRate)}/uur`;

  return `${ratePart}, ${formatNumber(quickInput.jobsPerMonth)} klussen/maand, ${formatEuro(quickInput.forgotMaterialPerMonth)}/maand materiaal, ${formatNumber(quickInput.underpricedPercent)}% onderprijs`;
}

export default function QuickScanPage() {
  const router = useRouter();
  const [quickInput, setQuickInput] = useState<QuickCheckInput>(quickCheckDefaults);
  const [openCardId, setOpenCardId] = useState<CardId | null>(null);
  const [highlightCardId, setHighlightCardId] = useState<CardId | null>(null);
  const [useStandardValues, setUseStandardValues] = useState(true);
  const [liveDelta, setLiveDelta] = useState<number | null>(null);
  const [livePulse, setLivePulse] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const estimatePreview = useMemo(() => calculateEstimate(quickInput, {}, advancedDefaults), [quickInput]);
  const previousEstimateRef = useRef<EstimateResult>(estimatePreview);
  const interactionRef = useRef<InteractionKind | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    track('scan_view');
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const previous = previousEstimateRef.current;

    if (interactionRef.current) {
      const delta = estimatePreview.monthly.likely - previous.monthly.likely;
      setLiveDelta(Math.abs(delta) >= 1 ? delta : null);
      setHighlightCardId(getBiggestChangedCard(previous, estimatePreview));
      setLivePulse(true);

      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => {
        setLiveDelta(null);
        setHighlightCardId(null);
        setLivePulse(false);
      }, 1400);
    }

    previousEstimateRef.current = estimatePreview;
    interactionRef.current = null;
  }, [estimatePreview]);

  function setInteraction(kind: InteractionKind) {
    interactionRef.current = kind;
  }

  function resolveCardFields(card: ScanCardConfig): QuickFieldKey[] {
    if (card.id !== 'leaks') return card.fields;

    return card.fields.map((field) => {
      if (field === 'hourlyRate') {
        return quickInput.useDayRate ? 'dayRate' : 'hourlyRate';
      }
      return field;
    });
  }

  function restoreStandard() {
    setInteraction('toggle');
    setQuickInput(quickCheckDefaults);
    setOpenCardId(null);
    setUseStandardValues(true);
  }

  function setFieldValue(field: QuickFieldKey, value: number, source: 'manual' | 'quick') {
    setInteraction(source);
    setQuickInput((current) => {
      if (current[field] === value) return current;
      return { ...current, [field]: value };
    });
  }

  function toggleCard(id: string) {
    setOpenCardId((current) => (current === id ? null : (id as CardId)));
  }

  async function submitScan() {
    setIsSubmitting(true);
    try {
      const result = calculateEstimate(quickInput, {}, advancedDefaults);
      window.localStorage.setItem(
        ESTIMATE_PAYLOAD_KEY,
        JSON.stringify({
          quickInput,
          unknownSelection: {},
          advancedInput: {},
          result,
          createdAt: new Date().toISOString(),
        })
      );

      track('calc_done', {
        likely_monthly: result.monthly.likely,
        likely_yearly: result.yearly.likely,
        defaults_on: useStandardValues,
      });

      router.push('/resultaat');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page premium-scan-bg">
      <div className="container" style={{ paddingTop: '1.2rem', paddingBottom: '2rem' }}>
        <section className="card paper-sheet" style={{ padding: '1rem' }}>
          <div className="scan-top-row">
            <div>
              <span className="badge">Snelle scan (60–90 sec)</span>
              <h1>Wat laat je waarschijnlijk liggen?</h1>
              <p className="scan-progress">3 blokken • ~1 minuut</p>
            </div>

            <div className="scan-live-pill">
              <p>Live totaal</p>
              <strong className={livePulse ? 'live-total-value live-total-value--pulse' : 'live-total-value'}>{formatEuro(estimatePreview.monthly.likely)} / maand</strong>
              <span>
                {formatEuro(estimatePreview.monthly.conservative)} – {formatEuro(estimatePreview.monthly.high)}
              </span>
              {liveDelta !== null && (
                <em className={liveDelta >= 0 ? 'live-delta live-delta--up' : 'live-delta live-delta--down'}>
                  {liveDelta >= 0 ? '+' : '-'}
                  {formatEuro(Math.abs(liveDelta))}
                </em>
              )}
            </div>
          </div>

          <div className="scan-controls">
            <div className="scan-toggle-wrap">
              <label className="scan-toggle">
                <input
                  type="checkbox"
                  checked={useStandardValues}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setUseStandardValues(checked);
                    if (checked) {
                      restoreStandard();
                    }
                  }}
                />
                Gebruik standaardwaarden (aanbevolen)
              </label>

              <button type="button" className="scan-inline-link" onClick={restoreStandard}>
                Herstel standaard
              </button>
            </div>
          </div>

          <div className="scan-card-stack">
            {cardConfigs.map((card) => {
              const fields = resolveCardFields(card);
              const summary = buildCardSummary(card.id, quickInput);
              const isOpen = openCardId === card.id;
              const isHighlighted = highlightCardId === card.id;

              return (
                <ScanCardAccordion
                  key={card.id}
                  id={card.id}
                  icon={card.icon}
                  title={card.title}
                  summary={summary}
                  description={card.description}
                  open={isOpen}
                  highlighted={isHighlighted}
                  onToggle={toggleCard}
                >
                  {card.id === 'leaks' && (
                    <div className="rate-mode-switch">
                      <button
                        type="button"
                        className={!quickInput.useDayRate ? 'rate-mode-switch--active' : ''}
                        onClick={() => {
                          setInteraction('toggle');
                          setQuickInput((current) => ({ ...current, useDayRate: false }));
                        }}
                      >
                        Uurtarief
                      </button>
                      <button
                        type="button"
                        className={quickInput.useDayRate ? 'rate-mode-switch--active' : ''}
                        onClick={() => {
                          setInteraction('toggle');
                          setQuickInput((current) => ({ ...current, useDayRate: true }));
                        }}
                      >
                        Dagprijs
                      </button>
                    </div>
                  )}

                  <div className="scan-fields-grid">
                    {fields.map((field) => (
                      <ScanInputRow
                        key={field}
                        field={field}
                        value={quickInput[field]}
                        meta={quickFieldMeta[field]}
                        standardMode={useStandardValues}
                        onValueChange={setFieldValue}
                      />
                    ))}
                  </div>

                  <p className="scan-card-nudge">{card.nudge}</p>
                </ScanCardAccordion>
              );
            })}
          </div>

          <div className="scan-submit-row">
            <p>Direct rapport met diagnose, oorzaken en winstherstel in euro's per maand.</p>
            <button type="button" className="btn btn-primary" disabled={isSubmitting} onClick={submitScan}>
              {isSubmitting ? 'Bezig met berekenen...' : 'Bekijk mijn rapport'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
