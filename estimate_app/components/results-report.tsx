'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import AssumptionsDrawer from '@/components/assumptions-drawer';
import DiagnosisBlock from '@/components/diagnosis-block';
import EmailGateModal from '@/components/email-gate-modal';
import FixPlanCards from '@/components/fix-plan-cards';
import FormulaExplainer from '@/components/formula-explainer';
import LossImpactGauge from '@/components/loss-impact-gauge';
import RootCauseAccordion from '@/components/root-cause-accordion';
import { track } from '@/lib/analytics';
import { calculateEstimate } from '@/lib/calc';
import { formatEuro, formatPercent } from '@/lib/format';
import {
  describeDriver,
  generateDiagnosis,
  generateFixPlan,
  generateRootCauseSections,
  rankDrivers,
} from '@/lib/report-insights';
import {
  buildImpactComparisons,
  calculateDailyLoss,
  calculateLossPercentage,
  calculateRevenueEstimate,
  getHalvedLossYearlyRecovery,
  getWorkForFreeLine,
  resolveWorkdaysPerMonth,
} from '@/lib/result-insights';
import { ESTIMATE_PAYLOAD_KEY } from '@/lib/storage';
import type { AdvancedRefineInput, LeadApiResponse, QuickCheckInput, StoredEstimatePayload, UnknownSelection } from '@/lib/types';

const previewBullets = [
  'Volledige uitsplitsing',
  'Checklist (PDF/print)',
  'Concrete stappen per driver',
  'Winstherstel-schatting',
];

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function ResultsReport() {
  const [quickInput, setQuickInput] = useState<QuickCheckInput | null>(null);
  const [unknownSelection, setUnknownSelection] = useState<UnknownSelection>({});
  const [advancedInput, setAdvancedInput] = useState<AdvancedRefineInput>({});
  const [locked, setLocked] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(ESTIMATE_PAYLOAD_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as StoredEstimatePayload;
      setQuickInput(parsed.quickInput);
      setUnknownSelection(parsed.unknownSelection ?? {});
      setAdvancedInput(parsed.advancedInput ?? {});
      track('result_view', { created_at: parsed.createdAt });
    } catch {
      // malformed payload
    }
  }, []);

  const result = useMemo(() => {
    if (!quickInput) return null;
    return calculateEstimate(quickInput, unknownSelection, advancedInput);
  }, [quickInput, unknownSelection, advancedInput]);

  useEffect(() => {
    if (!quickInput || !result) return;

    const payload: StoredEstimatePayload = {
      quickInput,
      unknownSelection,
      advancedInput,
      result,
      createdAt: new Date().toISOString(),
    };

    window.localStorage.setItem(ESTIMATE_PAYLOAD_KEY, JSON.stringify(payload));
  }, [quickInput, unknownSelection, advancedInput, result]);

  if (!quickInput || !result) {
    return (
      <main className="page premium-scan-bg">
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
          <section className="card paper-sheet" style={{ padding: '1rem' }}>
            <h1 style={{ marginTop: 0 }}>Nog geen scan-resultaat gevonden</h1>
            <p style={{ color: 'hsl(var(--muted-foreground))' }}>
              Start eerst de snelle scan. Daarna tonen we direct je diagnose en verbeterplan.
            </p>
            <Link href="/check" className="btn btn-primary">
              Start snelle scan
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const trialUrl = process.env.NEXT_PUBLIC_CALVORA_TRIAL_URL || 'https://calvora.nl';
  const callUrl = process.env.NEXT_PUBLIC_CALVORA_CALL_URL || 'https://calvora.nl/contact';
  const workdaysPerMonth = resolveWorkdaysPerMonth(advancedInput);
  const dailyLoss = calculateDailyLoss(result.monthly.likely, workdaysPerMonth);
  const revenueEstimate = calculateRevenueEstimate(result.assumptions);
  const lossPercentage = calculateLossPercentage(result.yearly.likely, revenueEstimate);
  const emotionalLine = getWorkForFreeLine(lossPercentage);
  const impactComparisons = buildImpactComparisons(result.yearly.likely);
  const topDrivers = rankDrivers(result, 2);
  const diagnosisItems = generateDiagnosis(result);
  const rootCauseSections = generateRootCauseSections(result, 4);
  const fixPlanActions = generateFixPlan(rankDrivers(result, 5));
  const halvedRecovery = result.monthly.likely > 500 ? getHalvedLossYearlyRecovery(result.monthly.likely) : 0;

  async function submitLead() {
    if (!result) return;

    if (!isValidEmail(email)) {
      setSubmitState('error');
      setSubmitMessage('Vul een geldig e-mailadres in.');
      return;
    }

    setSubmitState('sending');
    setSubmitMessage('');

    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim() || undefined,
          email,
          source: 'verliescheck-v2',
          timestamp: new Date().toISOString(),
          quickInput,
          unknownSelection,
          advancedInput,
          resultSnapshot: result,
        }),
      });

      const data = (await response.json()) as LeadApiResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Lead opslaan mislukt.');
      }

      setLocked(false);
      setSubmitState('ok');
      setSubmitMessage(data.message || 'Rapport vrijgegeven.');
      track('lead_submit', { likely_monthly: result.monthly.likely });
    } catch (error) {
      setSubmitState('error');
      setSubmitMessage(error instanceof Error ? error.message : 'Er ging iets mis bij versturen.');
    }
  }

  function focusEmailGate() {
    setTimeout(() => emailInputRef.current?.focus(), 40);
  }

  return (
    <main className="page premium-scan-bg">
      <div className="container" style={{ paddingTop: '1.2rem', paddingBottom: '2.2rem' }}>
        <section className="card paper-sheet" style={{ padding: '1rem' }}>
          <span className="badge">Resultaatrapport</span>
          <h1 style={{ marginBottom: '0.32rem' }}>Je laat waarschijnlijk liggen: {formatEuro(result.monthly.likely)} per maand</h1>
          <p style={{ marginTop: 0, marginBottom: '0.24rem', color: 'hsl(var(--foreground))', fontWeight: 620 }}>
            Dat is {formatEuro(dailyLoss)} per werkdag • {formatEuro(result.yearly.likely)} per jaar
          </p>
          <p style={{ marginTop: 0, color: 'hsl(var(--muted-foreground))' }}>
            Bandbreedte: {formatEuro(result.monthly.conservative)} – {formatEuro(result.monthly.high)}
          </p>

          <section className="impact-overview-grid">
            <LossImpactGauge percentage={lossPercentage} emotionalLine={emotionalLine} />

            <div className="impact-side-content">
              <div className="card impact-note-card">
                <p>
                  Je verliest ongeveer <strong>{formatPercent(lossPercentage)}</strong> van je potentiële omzet.
                </p>
                <p>Potentiële omzetinschatting: {formatEuro(revenueEstimate)} / jaar</p>
              </div>

              {impactComparisons.length > 0 && (
                <div className="card impact-note-card impact-context-card">
                  <p style={{ fontWeight: 650 }}>Wat betekent dit in praktijk?</p>
                  <ul className="impact-context-list">
                    {impactComparisons.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid-2 impact-driver-grid">
                {topDrivers.map((driver) => (
                  <article key={driver.key} className="card" style={{ padding: '0.82rem' }}>
                    <p style={{ margin: 0, color: 'hsl(var(--muted-foreground))', fontSize: '0.78rem' }}>Belangrijkste driver</p>
                    <h3 style={{ margin: '0.3rem 0' }}>{driver.label}</h3>
                    <p style={{ margin: 0, fontWeight: 700 }}>{describeDriver(driver)}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <div className="results-top-cta">
            {locked ? (
              <>
                <button type="button" className="btn btn-primary" onClick={focusEmailGate}>
                  Stuur mij het volledige rapport
                </button>
                <Link href="/check" className="btn btn-secondary">
                  Wijzig scan
                </Link>
              </>
            ) : (
              <Link href="/check" className="btn btn-secondary">
                Wijzig scan
              </Link>
            )}
          </div>

          <EmailGateModal
            locked={locked}
            firstName={firstName}
            email={email}
            submitState={submitState}
            submitMessage={submitMessage}
            previewBullets={previewBullets}
            onFirstNameChange={setFirstName}
            onEmailChange={setEmail}
            onSubmit={submitLead}
            emailInputRef={emailInputRef}
          >
            <FormulaExplainer formulas={result.formulas} />

            <AssumptionsDrawer
              assumptions={result.assumptions}
              advancedInput={advancedInput}
              onChange={(next) => {
                setAdvancedInput(next);
                track('advanced_change');
              }}
            />

            <DiagnosisBlock items={diagnosisItems} />
            <RootCauseAccordion sections={rootCauseSections} />
            <FixPlanCards actions={fixPlanActions} />

            <section className="card report-block" style={{ padding: '0.9rem' }}>
              <h2 style={{ marginTop: 0, marginBottom: '0.4rem' }}>Volledige uitsplitsing</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid hsl(var(--border))' }}>Categorie</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid hsl(var(--border))' }}>Conservatief</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid hsl(var(--border))' }}>Waarschijnlijk</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid hsl(var(--border))' }}>Hoog</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.categories.map((category) => (
                      <tr key={category.key}>
                        <td style={{ padding: '0.5rem', borderBottom: '1px solid hsl(var(--border))' }}>{category.label}</td>
                        <td style={{ padding: '0.5rem', borderBottom: '1px solid hsl(var(--border))', textAlign: 'right' }}>{formatEuro(category.monthly.conservative)}</td>
                        <td style={{ padding: '0.5rem', borderBottom: '1px solid hsl(var(--border))', textAlign: 'right' }}>{formatEuro(category.monthly.likely)}</td>
                        <td style={{ padding: '0.5rem', borderBottom: '1px solid hsl(var(--border))', textAlign: 'right' }}>{formatEuro(category.monthly.high)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card report-block" style={{ padding: '0.9rem' }}>
              <h2 style={{ marginTop: 0, marginBottom: '0.35rem' }}>Calvora lost dit automatisch op</h2>
              <p style={{ marginTop: 0, color: 'hsl(var(--muted-foreground))' }}>
                Templates, materiaalberekening, meerwerk-registratie, en reistijd-doorbelasting — in één systeem.
              </p>

              {halvedRecovery > 0 && (
                <p style={{ marginTop: 0, color: 'hsl(var(--foreground))', fontWeight: 650 }}>
                  Als je dit halveert, win je {formatEuro(halvedRecovery)} per jaar terug.
                </p>
              )}

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <a className="btn btn-primary" href={trialUrl} target="_blank" rel="noreferrer" onClick={() => track('trial_click', { location: 'report' })}>
                  Probeer Calvora 14 dagen gratis
                </a>
                <a className="btn btn-secondary" href={callUrl} target="_blank" rel="noreferrer" onClick={() => track('call_click', { location: 'report' })}>
                  Plan een vrijblijvend gesprek
                </a>
              </div>

              <p style={{ marginBottom: 0, marginTop: '0.65rem' }}>
                <Link href="/resultaat/print" target="_blank" className="scan-inline-link">
                  Print/PDF bewaren
                </Link>
              </p>
            </section>
          </EmailGateModal>
        </section>
      </div>
    </main>
  );
}
