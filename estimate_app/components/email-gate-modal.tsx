'use client';

import type { ReactNode, RefObject } from 'react';

interface EmailGateModalProps {
  locked: boolean;
  firstName: string;
  email: string;
  submitState: 'idle' | 'sending' | 'ok' | 'error';
  submitMessage: string;
  previewBullets: string[];
  onFirstNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
  emailInputRef: RefObject<HTMLInputElement>;
  children: ReactNode;
}

export default function EmailGateModal({
  locked,
  firstName,
  email,
  submitState,
  submitMessage,
  previewBullets,
  onFirstNameChange,
  onEmailChange,
  onSubmit,
  emailInputRef,
  children,
}: EmailGateModalProps) {
  return (
    <section className={`card soft-gate ${locked ? 'soft-gate--locked' : ''}`} style={{ marginTop: '0.9rem', padding: '0.9rem', position: 'relative' }}>
      {locked && (
        <div className="card report-preview" style={{ padding: '0.8rem', marginBottom: '0.8rem' }}>
          <p style={{ marginTop: 0, marginBottom: '0.5rem', color: 'hsl(var(--muted-foreground))', fontWeight: 650 }}>
            In dit rapport:
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'hsl(var(--muted-foreground))' }}>
            {previewBullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={locked ? 'soft-gate-content soft-gate-content--blur' : 'soft-gate-content'}>{children}</div>

      {locked && (
        <div className="soft-gate-overlay">
          <div className="card" style={{ padding: '1rem', width: 'min(560px, 100%)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.35rem' }}>Ontvang je volledige verliesrapport</h3>
            <p style={{ marginTop: 0, color: 'hsl(var(--muted-foreground))' }}>
              Met diagnose, oorzaken, 3 snelle winsten, en een checklist om direct mee te starten.
            </p>

            <div className="input-wrap" style={{ marginBottom: '0.6rem' }}>
              <label htmlFor="lead-first-name">Voornaam (optioneel)</label>
              <input
                id="lead-first-name"
                type="text"
                value={firstName}
                onChange={(event) => onFirstNameChange(event.target.value)}
                placeholder="Voornaam"
              />
            </div>

            <div className="input-wrap" style={{ marginBottom: '0.75rem' }}>
              <label htmlFor="lead-email">Zakelijk e-mailadres</label>
              <input
                ref={emailInputRef}
                id="lead-email"
                type="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="je@email.nl"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" className="btn btn-primary" disabled={submitState === 'sending'} onClick={onSubmit}>
                {submitState === 'sending' ? 'Bezig met versturen...' : 'Stuur mijn rapport →'}
              </button>
              <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.82rem' }}>
                Geen spam. Je ontvangt alleen je rapport + 1 opvolgmail.
              </span>
            </div>

            {submitMessage && (
              <p style={{ marginBottom: 0, marginTop: '0.7rem', color: submitState === 'ok' ? 'hsl(var(--accent))' : 'hsl(var(--danger))' }}>
                {submitMessage}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
