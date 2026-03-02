import { formatEuro } from '@/lib/format';
import type { CategoryEstimate, EstimateResult, LossCategoryKey } from '@/lib/types';

export interface DiagnosisItem {
  key: string;
  symptom: string;
  cause: string;
}

export interface RootCauseSection {
  id: string;
  title: string;
  monthlyImpact: number;
  bullets: string[];
}

export interface FixPlanAction {
  id: string;
  title: string;
  description: string;
  impactMonthly: number;
}

const fallbackDiagnosis: Record<LossCategoryKey, { symptom: string; cause: string }> = {
  travel_logistics: {
    symptom: 'Reisuren drukken je marge elke maand.',
    cause: 'Dit gebeurt vaak als reistijd niet als vaste regel op je offerte staat.',
  },
  offer_admin: {
    symptom: 'Kantoor-uren eten je winst op.',
    cause: 'Dit gebeurt vaak door handmatig offertewerk zonder vaste workflow.',
  },
  material_leak: {
    symptom: 'Klein materiaal loopt weg zonder factuurregel.',
    cause: 'Dit komt vaak door losse bonnetjes en geen vaste post klein materiaal.',
  },
  urgent_trips: {
    symptom: 'Spoedritten verlagen je effectieve uurprijs.',
    cause: 'Dit gebeurt vaak zonder vaste materiaal-lijsten per klus.',
  },
  callback_rework: {
    symptom: 'Nazorg-uren blijven liggen als service.',
    cause: 'Dit komt vaak doordat herhaalwerk niet apart wordt vastgelegd.',
  },
  underpriced_time: {
    symptom: 'Een deel van je uren wordt te laag geprijsd.',
    cause: 'Dit gebeurt vaak wanneer meerwerk niet als aparte post wordt vastgelegd.',
  },
  parking_toll: {
    symptom: 'Parkeren en tol tikken hard aan over veel klussen.',
    cause: 'Dit gebeurt vaak als ritkosten niet standaard in je prijsmodel zitten.',
  },
  cashflow_drag: {
    symptom: 'Openstaande facturen drukken je netto marge.',
    cause: 'Dit gebeurt vaak door lange betaaltermijnen zonder opvolgflow.',
  },
};

const rootCauseMap: Record<LossCategoryKey, { id: string; title: string; bullets: string[] }> = {
  offer_admin: {
    id: 'office',
    title: 'Offerte & administratie',
    bullets: ['Geen vaste templates', 'Klant wijzigt last-minute', "Geen standaard 'meerwerk'-flow"],
  },
  travel_logistics: {
    id: 'travel',
    title: 'Reis & logistiek',
    bullets: ['Geen vaste reiskostenregel', 'Veel kleine klussen verspreid', 'Rit- en parkeerkosten niet standaard meegenomen'],
  },
  parking_toll: {
    id: 'travel',
    title: 'Reis & logistiek',
    bullets: ['Geen vaste reiskostenregel', 'Veel kleine klussen verspreid', 'Parkeren/tol wordt vergeten in de offerte'],
  },
  urgent_trips: {
    id: 'urgent',
    title: 'Spoedritten',
    bullets: ['Geen vaste paklijst per klus', 'Inkoop gebeurt ad hoc', 'Planning mist buffer voor missers'],
  },
  material_leak: {
    id: 'material',
    title: 'Materiaal-lek',
    bullets: ['Klein materiaal niet vast geprijsd', 'Bonnetjes niet direct verwerkt', 'Geen vaste post voor verbruiksmateriaal'],
  },
  underpriced_time: {
    id: 'pricing',
    title: 'Onderprijsde tijd',
    bullets: ['Meerwerk wordt mondeling opgelost', 'Ureninschatting te optimistisch', 'Geen nacalculatie per klus'],
  },
  callback_rework: {
    id: 'callback',
    title: 'Nazorg & herhaalwerk',
    bullets: ['Nazorg niet als aparte post', 'Opleverpunten zonder tijdsblok', 'Terugkomwerk wordt niet opgevolgd'],
  },
  cashflow_drag: {
    id: 'cashflow',
    title: 'Cashflow-kosten',
    bullets: ['Te lange betaaltermijnen', 'Geen strak herinneringsritme', 'Openstaande posten blijven liggen'],
  },
};

const actionMap: Record<LossCategoryKey, { id: string; title: string; description: string; captureRate: number }> = {
  travel_logistics: {
    id: 'travel-billing',
    title: 'Maak reistijd standaard factuurbaar',
    description: 'Gebruik een vaste ritregel (tijd + kosten) op elke offerte.',
    captureRate: 0.55,
  },
  parking_toll: {
    id: 'travel-billing',
    title: 'Maak reistijd standaard factuurbaar',
    description: 'Bundel parkeren/tol in een vaste ritpost zodat het nooit vergeten wordt.',
    captureRate: 0.7,
  },
  offer_admin: {
    id: 'template-flow',
    title: 'Werk met offerte-templates + vaste posten',
    description: 'Snij handwerk in offertes en opvolging weg met standaardblokken.',
    captureRate: 0.6,
  },
  material_leak: {
    id: 'material-post',
    title: 'Maak klein materiaal een vaste post',
    description: 'Voeg standaard klein materiaal toe per klus of per offertebedrag.',
    captureRate: 0.7,
  },
  urgent_trips: {
    id: 'urgent-prevent',
    title: 'Verminder spoedritten met vaste paklijsten',
    description: 'Werk met een vaste checklijst voor vertrek en inkoop.',
    captureRate: 0.5,
  },
  callback_rework: {
    id: 'service-bundle',
    title: 'Leg nazorg vast als service-uren',
    description: 'Maak nazorg zichtbaar als aparte post of servicebundel.',
    captureRate: 0.55,
  },
  underpriced_time: {
    id: 'morework-discipline',
    title: 'Borg meerwerk direct tijdens de klus',
    description: 'Registreer afwijkingen direct zodat onderprijsde uren verdwijnen.',
    captureRate: 0.6,
  },
  cashflow_drag: {
    id: 'cashflow-rhythm',
    title: 'Versnel betaling met vast opvolgritme',
    description: 'Plan herinneringen automatisch op vaste dagen na factuurdatum.',
    captureRate: 0.45,
  },
};

function getCategoryValue(result: EstimateResult, key: LossCategoryKey): number {
  return result.categories.find((category) => category.key === key)?.monthly.likely ?? 0;
}

function getCategoryShare(result: EstimateResult, key: LossCategoryKey): number {
  const total = Math.max(1, result.monthly.likely);
  return getCategoryValue(result, key) / total;
}

function hasHighImpact(result: EstimateResult, key: LossCategoryKey, threshold: number): boolean {
  return getCategoryShare(result, key) >= threshold;
}

function addDiagnosis(target: DiagnosisItem[], key: string, symptom: string, cause: string): void {
  if (target.some((item) => item.key === key)) return;
  target.push({ key, symptom, cause });
}

function roundImpact(value: number): number {
  return Math.max(25, Math.round(value / 25) * 25);
}

export function rankDrivers(result: EstimateResult, limit = 3): CategoryEstimate[] {
  return [...result.categories].sort((a, b) => b.monthly.likely - a.monthly.likely).slice(0, limit);
}

export function generateDiagnosis(result: EstimateResult): DiagnosisItem[] {
  const topKeys = new Set(rankDrivers(result, 3).map((driver) => driver.key));
  const items: DiagnosisItem[] = [];

  if (topKeys.has('offer_admin') || hasHighImpact(result, 'offer_admin', 0.16)) {
    addDiagnosis(
      items,
      'offer_admin',
      'Je verliest vooral winst door kantoor-uren (offertes/administratie).',
      'Dit gebeurt vaak omdat offertes telkens opnieuw worden opgebouwd en opvolging handmatig blijft.'
    );
  }

  if (topKeys.has('travel_logistics') || hasHighImpact(result, 'travel_logistics', 0.14)) {
    addDiagnosis(
      items,
      'travel_logistics',
      'Je verliest veel door reistijd die niet structureel wordt doorberekend.',
      "Dit gebeurt vaak omdat reistijd 'klein' voelt per klus, maar optelt over de maand."
    );
  }

  if (topKeys.has('underpriced_time') || hasHighImpact(result, 'underpriced_time', 0.12)) {
    addDiagnosis(
      items,
      'underpriced_time',
      'Een deel van je werkuren wordt te laag of niet doorberekend.',
      'Dit komt vaak door meerwerk dat niet als meerwerk wordt vastgelegd.'
    );
  }

  if (topKeys.has('material_leak') || hasHighImpact(result, 'material_leak', 0.08)) {
    addDiagnosis(
      items,
      'material_leak',
      'Je betaalt regelmatig materiaal zelf zonder het door te belasten.',
      "Dit komt vaak door ontbrekende vaste post 'klein materiaal' of losse bonnetjes."
    );
  }

  if (topKeys.has('urgent_trips') || hasHighImpact(result, 'urgent_trips', 0.08)) {
    addDiagnosis(
      items,
      'urgent_trips',
      'Extra ritten drukken je uurprijs zonder dat je het ziet.',
      'Dit komt vaak door planning zonder standaard materiaal-lijsten.'
    );
  }

  if (items.length < 3) {
    const fallbackDrivers = rankDrivers(result, 5);
    for (const driver of fallbackDrivers) {
      const fallback = fallbackDiagnosis[driver.key];
      addDiagnosis(items, driver.key, fallback.symptom, fallback.cause);
      if (items.length >= 3) break;
    }
  }

  return items.slice(0, 5);
}

export function generateRootCauses(driverKey: LossCategoryKey): string[] {
  return rootCauseMap[driverKey]?.bullets ?? ['Geen vaste workflow', 'Te veel handmatig werk', 'Geen standaard nacalculatie'];
}

export function generateRootCauseSections(result: EstimateResult, limit = 4): RootCauseSection[] {
  const drivers = rankDrivers(result, 6);
  const sections: RootCauseSection[] = [];

  for (const driver of drivers) {
    const map = rootCauseMap[driver.key];
    if (!map) continue;

    const existing = sections.find((section) => section.id === map.id);
    if (existing) {
      existing.monthlyImpact += driver.monthly.likely;
      continue;
    }

    sections.push({
      id: map.id,
      title: map.title,
      monthlyImpact: driver.monthly.likely,
      bullets: map.bullets.slice(0, 3),
    });

    if (sections.length >= limit) break;
  }

  return sections;
}

export function generateFixPlan(topDrivers: CategoryEstimate[]): FixPlanAction[] {
  const actions = new Map<string, FixPlanAction>();

  for (const driver of topDrivers) {
    const mapped = actionMap[driver.key];
    if (!mapped) continue;

    const impact = roundImpact(driver.monthly.likely * mapped.captureRate);
    const existing = actions.get(mapped.id);

    if (existing) {
      existing.impactMonthly += impact;
      continue;
    }

    actions.set(mapped.id, {
      id: mapped.id,
      title: mapped.title,
      description: mapped.description,
      impactMonthly: impact,
    });
  }

  if (actions.size < 3) {
    const fallback: FixPlanAction[] = [
      {
        id: 'weekly-review',
        title: 'Plan een vaste nacalculatie per week',
        description: 'Controleer elke week waar uren en materiaal afwijken.',
        impactMonthly: 250,
      },
      {
        id: 'standard-posts',
        title: 'Werk met vaste posten per klus',
        description: 'Maak terugkerende kosten standaard in elk voorstel.',
        impactMonthly: 200,
      },
      {
        id: 'follow-up-rhythm',
        title: 'Gebruik een strak opvolgritme',
        description: 'Plan vaste momenten voor offertes, facturen en herinneringen.',
        impactMonthly: 180,
      },
    ];

    for (const action of fallback) {
      if (actions.size >= 3) break;
      if (!actions.has(action.id)) actions.set(action.id, action);
    }
  }

  return Array.from(actions.values())
    .sort((a, b) => b.impactMonthly - a.impactMonthly)
    .slice(0, 3);
}

export function describeDriver(driver: CategoryEstimate): string {
  const perMonth = formatEuro(driver.monthly.likely);
  if (typeof driver.hoursLikely === 'number') {
    const werkdagen = driver.hoursLikely / 8;
    return `${perMonth} per maand • ${werkdagen.toFixed(1)} volle werkdagen`;
  }
  return `${perMonth} per maand`;
}
