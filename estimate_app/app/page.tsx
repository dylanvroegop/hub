import Link from 'next/link';

const stats = ['Gemiddeld verlies: € 2.100/maand', 'Invultijd: 60 seconden', '100% gratis, geen account nodig'];

const steps = [
  {
    title: 'Vul 3 blokken in',
    text: 'Reistijd, kantooruren en foutmarge — met slimme standaardwaarden al ingevuld.',
  },
  {
    title: 'Krijg direct je verliesrapport',
    text: "Je ziet precies waar je marge lekt, in euro's per maand.",
  },
  {
    title: 'Ontvang je actieplan',
    text: 'Concrete stappen om binnen 30 dagen je eerste verlies terug te winnen.',
  },
];

const pains = [
  'Je rijdt 45 minuten naar een klus, maar rekent het niet door',
  'Elke offerte kost je een halve dag, maar je factureert het niet',
  'Klant belt terug voor iets kleins — je gaat, gratis',
  'Je werkt 50 uur per week maar je marge voelt als 30',
];

export default function HomePage() {
  return (
    <main className="page premium-scan-bg">
      <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '3rem' }}>
        <section className="card hero-layout paper-sheet" style={{ padding: '2rem' }}>
          <div>
            <span className="badge">Gratis timmerman verliescheck</span>
            <h1 style={{ fontSize: '2rem', lineHeight: 1.15, marginTop: '0.9rem', marginBottom: '0.7rem' }}>
              Ontdek in 3 minuten wat je als timmerman elk jaar laat liggen.
            </h1>
            <p style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '1.2rem', maxWidth: 640 }}>
              In 60–90 seconden zie je je waarschijnlijke margedruk, bandbreedte en grootste verliesdrivers.
            </p>
            <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
              <Link className="btn btn-primary" href="/check">
                Start gratis verliescheck
              </Link>
              <a className="btn btn-secondary" href="https://calvora.nl/contact" target="_blank" rel="noreferrer">
                Bekijk Calvora
              </a>
            </div>
          </div>

          <div className="card" style={{ padding: '1.2rem' }}>
            <p style={{ marginTop: 0, color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>Wat je direct ziet</p>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: '0.55rem' }}>
              <li>Verlies door reistijd die je niet doorrekent</li>
              <li>Onzichtbare uren in offertes en administratie</li>
              <li>Kleine materiaalkosten die ongemerkt weglekken</li>
              <li>Nazorg en herhaalbezoeken die je marge opeten</li>
            </ul>
          </div>
        </section>

        <section className="card social-proof-strip">
          <p>Gebaseerd op data van 200+ ZZP-timmermannen en aannemers</p>
          <div>
            {stats.map((stat) => (
              <span key={stat} className="social-proof-badge">
                {stat}
              </span>
            ))}
          </div>
        </section>

        <section className="card landing-section">
          <h2>Hoe werkt het?</h2>
          <div className="how-it-works-grid">
            {steps.map((step, index) => (
              <article key={step.title} className="card how-step-card">
                <span>{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card landing-section">
          <h2>Herken je dit?</h2>
          <div className="pain-grid">
            {pains.map((pain) => (
              <article key={pain} className="card pain-card">
                <p>{pain}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card landing-section testimonial-card">
          <p>
            "Ik schrok ervan. Ik verloor €1.800 per maand zonder het te weten." <span>— Timmerman, regio Utrecht</span>
          </p>
        </section>

        <section className="landing-bottom-cta">
          <Link className="btn btn-primary" href="/check">
            Start gratis verliescheck
          </Link>
        </section>
      </div>
    </main>
  );
}
