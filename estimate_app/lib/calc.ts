import { advancedDefaults, modelAssumptionDefaults, quickCheckDefaults } from '@/lib/defaults';
import type {
  AdvancedRefineInput,
  AssumptionSummaryItem,
  CategoryEstimate,
  EffectiveAssumptions,
  EstimateResult,
  FormulaLine,
  QuickCheckInput,
  QuickFieldKey,
  UnknownSelection,
} from '@/lib/types';

const TIME_CONSERVATIVE_MULTIPLIER = 0.7;
const TIME_HIGH_MULTIPLIER = 1.3;

const roundMoney = (value: number): number => Math.round(value * 100) / 100;
const roundHours = (value: number): number => Math.round(value * 10) / 10;

function safeNumber(value: number | null | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) return fallback;
  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getQuickValue(
  field: QuickFieldKey,
  quickInput: QuickCheckInput,
  unknownSelection: UnknownSelection
): { value: number; source: 'Invoer' | 'Gemiddelde' } {
  const raw = quickInput[field];
  const unknown = Boolean(unknownSelection[field]);
  const fallback = quickCheckDefaults[field];

  if (unknown) return { value: fallback, source: 'Gemiddelde' };
  const numeric = safeNumber(raw, fallback);
  return { value: numeric, source: 'Invoer' };
}

function buildAssumptionsSummary(
  assumptions: EffectiveAssumptions,
  sources: Record<string, 'Invoer' | 'Gemiddelde'>,
  advancedInput: AdvancedRefineInput
): AssumptionSummaryItem[] {
  const advancedHas = (key: keyof AdvancedRefineInput): boolean => {
    const v = advancedInput[key];
    return typeof v === 'number' && Number.isFinite(v) && v > 0;
  };

  return [
    { label: 'Uurtarief (excl. btw)', value: `${roundMoney(assumptions.effectiveHourlyRate)} EUR`, source: sources.hourlyRate },
    { label: 'Klussen per maand', value: `${roundMoney(assumptions.jobsPerMonth)}`, source: sources.jobsPerMonth },
    { label: 'Reistijd per werkdag', value: `${roundHours(assumptions.travelHoursPerWorkday)} uur`, source: sources.travelHoursPerWorkday },
    { label: 'Offerte + administratie', value: `${roundHours(assumptions.adminHoursPerWeek)} uur/week`, source: sources.adminHoursPerWeek },
    { label: 'Spoedritten', value: `${roundMoney(assumptions.urgentTripsPerMonth)} per maand`, source: sources.urgentTripsPerMonth },
    { label: 'Nazorg/callback', value: `${roundHours(assumptions.callbackHoursPerMonth)} uur/maand`, source: sources.callbackHoursPerMonth },
    { label: 'Vergeet-materiaal', value: `${roundMoney(assumptions.forgotMaterialPerMonth)} EUR/maand`, source: sources.forgotMaterialPerMonth },
    { label: 'Parkeren/tol', value: `${roundMoney(assumptions.parkingPerJob)} EUR/klus`, source: sources.parkingPerJob },
    { label: 'Onderprijsde tijd', value: `${roundMoney(assumptions.underpricedPercent)}%`, source: sources.underpricedPercent },
    {
      label: 'Werkdagen per maand (model)',
      value: `${roundHours(assumptions.workdaysPerMonth)} dagen`,
      source: advancedHas('workdaysPerYear') ? 'Invoer' : 'Gemiddelde',
    },
    {
      label: 'Tijd per spoedrit (model)',
      value: `${roundHours(assumptions.urgentTripHoursDefault)} uur`,
      source: 'Gemiddelde',
    },
    {
      label: 'Gem. uren per klus (model)',
      value: `${roundHours(assumptions.avgHoursPerJobDefault)} uur`,
      source: advancedHas('avgHoursPerJob') ? 'Invoer' : 'Gemiddelde',
    },
    {
      label: 'Niet-doorbelaste reistijd (model)',
      value: `${roundMoney(assumptions.travelNotBilledFactor * 100)}%`,
      source: advancedHas('travelNotBilledFactor') ? 'Invoer' : 'Gemiddelde',
    },
  ];
}

function buildWarnings(assumptions: EffectiveAssumptions): string[] {
  const warnings: string[] = [];

  if (assumptions.effectiveHourlyRate < 25 || assumptions.effectiveHourlyRate > 120) {
    warnings.push('Uurtarief lijkt afwijkend (lager dan 25 of hoger dan 120). Controleer of dit excl. btw is.');
  }
  if (assumptions.jobsPerMonth > 60) {
    warnings.push('Klussen per maand lijkt hoog. Controleer of je geen weekwaarde hebt ingevuld.');
  }
  if (assumptions.travelHoursPerWorkday > 4) {
    warnings.push('Reistijd per werkdag lijkt hoog. Klopt dit als heen + terug totaal?');
  }
  if (assumptions.adminHoursPerWeek > 25) {
    warnings.push('Offerte/admin uren per week lijkt hoog. Controleer of dit niet per maand bedoeld is.');
  }

  return warnings;
}

function createCategory(params: {
  key: CategoryEstimate['key'];
  label: string;
  pillar: CategoryEstimate['pillar'];
  explanation: string;
  timeEuro?: number;
  directEuro?: number;
  hoursLikely?: number;
}): CategoryEstimate {
  const timeEuro = roundMoney(params.timeEuro ?? 0);
  const directEuro = roundMoney(params.directEuro ?? 0);
  const likely = roundMoney(timeEuro + directEuro);
  const conservative = roundMoney(timeEuro * TIME_CONSERVATIVE_MULTIPLIER + directEuro);
  const high = roundMoney(timeEuro * TIME_HIGH_MULTIPLIER + directEuro);

  const type: CategoryEstimate['type'] = timeEuro > 0 && directEuro > 0 ? 'mixed' : timeEuro > 0 ? 'time' : 'direct';

  return {
    key: params.key,
    label: params.label,
    pillar: params.pillar,
    type,
    monthly: {
      conservative,
      likely,
      high,
    },
    hoursLikely: params.hoursLikely,
    explanation: params.explanation,
  };
}

export function calculateEstimate(
  quickInput: QuickCheckInput,
  unknownSelection: UnknownSelection = {},
  advancedInput: AdvancedRefineInput = {}
): EstimateResult {
  const hourly = getQuickValue('hourlyRate', quickInput, unknownSelection);
  const dayRate = getQuickValue('dayRate', quickInput, unknownSelection);
  const jobs = getQuickValue('jobsPerMonth', quickInput, unknownSelection);
  const travel = getQuickValue('travelHoursPerWorkday', quickInput, unknownSelection);
  const parking = getQuickValue('parkingPerJob', quickInput, unknownSelection);
  const admin = getQuickValue('adminHoursPerWeek', quickInput, unknownSelection);
  const urgentTrips = getQuickValue('urgentTripsPerMonth', quickInput, unknownSelection);
  const callback = getQuickValue('callbackHoursPerMonth', quickInput, unknownSelection);
  const forgotMaterial = getQuickValue('forgotMaterialPerMonth', quickInput, unknownSelection);
  const underpriced = getQuickValue('underpricedPercent', quickInput, unknownSelection);

  const useDayRate = Boolean(quickInput.useDayRate);
  const effectiveHourlyRate = useDayRate ? dayRate.value / 8 : hourly.value;

  const workdaysPerYear = safeNumber(advancedInput.workdaysPerYear, advancedDefaults.workdaysPerYear);
  const workdaysPerMonth = clamp(workdaysPerYear / 12, 12, 24);
  const billableHoursPerDay = clamp(
    safeNumber(advancedInput.billableHoursPerDay, advancedDefaults.billableHoursPerDay),
    1,
    10
  );

  const avgHoursPerJob = clamp(
    safeNumber(advancedInput.avgHoursPerJob, modelAssumptionDefaults.avgHoursPerJobDefault),
    2,
    14
  );

  const travelNotBilledFactor = clamp(
    safeNumber(advancedInput.travelNotBilledFactor, modelAssumptionDefaults.travelNotBilledFactor),
    0.2,
    1
  );

  const revisitJobsPerMonth = clamp(safeNumber(advancedInput.revisitJobsPerMonth, 0), 0, 20);
  const revisitHoursPerVisit = clamp(safeNumber(advancedInput.revisitHoursPerVisit, 1), 0.25, 6);
  const toolsDepreciationPerMonth = Math.max(0, safeNumber(advancedInput.toolsDepreciationPerMonth, 0));
  const fixedCostsPerMonth = Math.max(0, safeNumber(advancedInput.fixedCostsPerMonth, 0));

  const paymentTermDays = Math.max(0, safeNumber(advancedInput.paymentTermDays, 0));
  const outstandingAmount = Math.max(0, safeNumber(advancedInput.outstandingAmount, 0));

  const effectiveAssumptions: EffectiveAssumptions = {
    effectiveHourlyRate,
    jobsPerMonth: Math.max(1, jobs.value),
    travelHoursPerWorkday: travel.value,
    parkingPerJob: parking.value,
    adminHoursPerWeek: admin.value,
    urgentTripsPerMonth: urgentTrips.value,
    callbackHoursPerMonth: callback.value,
    forgotMaterialPerMonth: forgotMaterial.value,
    underpricedPercent: underpriced.value,
    workdaysPerMonth,
    urgentTripHoursDefault: modelAssumptionDefaults.urgentTripHoursDefault,
    avgHoursPerJobDefault: avgHoursPerJob,
    travelNotBilledFactor,
    billableHoursPerDay,
  };

  const travelHoursLost = travel.value * workdaysPerMonth * travelNotBilledFactor;
  const travelEuro = effectiveHourlyRate * travelHoursLost;

  const adminHoursLost = admin.value * 4;
  const adminEuro = effectiveHourlyRate * adminHoursLost;

  const urgentHoursLost = urgentTrips.value * modelAssumptionDefaults.urgentTripHoursDefault;
  const urgentEuro = effectiveHourlyRate * urgentHoursLost;

  const revisitHoursLost = revisitJobsPerMonth * revisitHoursPerVisit;
  const callbackHoursLost = callback.value + revisitHoursLost;
  const callbackEuro = effectiveHourlyRate * callbackHoursLost;

  const directHoursBase = Math.max(1, jobs.value) * avgHoursPerJob;
  const billableCorrectionFactor = billableHoursPerDay < 6 ? 1 + (6 - billableHoursPerDay) * 0.08 : 1;
  const underpricedHours = directHoursBase * (underpriced.value / 100) * billableCorrectionFactor;
  const underpricedTimeEuro = effectiveHourlyRate * underpricedHours;
  const fixedCostEuro = toolsDepreciationPerMonth + fixedCostsPerMonth;

  const materialEuro = forgotMaterial.value;
  const parkingEuro = parking.value * Math.max(1, jobs.value);

  const cashflowEuro =
    paymentTermDays > 0 && outstandingAmount > 0
      ? outstandingAmount * modelAssumptionDefaults.cashflowAnnualRate * (paymentTermDays / 30) / 12
      : 0;

  const categories: CategoryEstimate[] = [
    createCategory({
      key: 'travel_logistics',
      label: 'Reis & logistiek',
      pillar: 'A',
      timeEuro: travelEuro,
      hoursLikely: travelHoursLost,
      explanation: 'Tijd onderweg wordt vaak maar deels doorberekend en drukt direct je marge.',
    }),
    createCategory({
      key: 'offer_admin',
      label: 'Offerte & administratie',
      pillar: 'A',
      timeEuro: adminEuro,
      hoursLikely: adminHoursLost,
      explanation: 'Offertes, facturen en correcties kosten tijd die zelden volledig factureerbaar is.',
    }),
    createCategory({
      key: 'material_leak',
      label: 'Materiaal-lek',
      pillar: 'B',
      directEuro: materialEuro,
      explanation: 'Klein materiaal en vergeten posten verdwijnen vaak ongemerkt in je eigen marge.',
    }),
    createCategory({
      key: 'urgent_trips',
      label: 'Spoedritten',
      pillar: 'A',
      timeEuro: urgentEuro,
      hoursLikely: urgentHoursLost,
      explanation: 'Extra ritten kosten directe tijd en verstoren je planning.',
    }),
    createCategory({
      key: 'callback_rework',
      label: 'Nazorg & herhaalwerk',
      pillar: 'A',
      timeEuro: callbackEuro,
      hoursLikely: callbackHoursLost,
      explanation: 'Nazorg en terugkommomenten zijn vaak service-uren zonder volledige dekking.',
    }),
    createCategory({
      key: 'underpriced_time',
      label: 'Onderprijsde tijd',
      pillar: 'A',
      timeEuro: underpricedTimeEuro,
      directEuro: fixedCostEuro,
      hoursLikely: underpricedHours,
      explanation: 'Kleine onderschatting in uren plus vaste maanddruk geven structureel margeverlies.',
    }),
    createCategory({
      key: 'parking_toll',
      label: 'Parkeren & tol',
      pillar: 'B',
      directEuro: parkingEuro,
      explanation: 'Terugkerende projectkosten per klus lopen op als ze niet standaard worden meegenomen.',
    }),
  ];

  if (cashflowEuro > 0) {
    categories.push(
      createCategory({
        key: 'cashflow_drag',
        label: 'Cashflow-kosten (conservatief)',
        pillar: 'C',
        directEuro: cashflowEuro,
        explanation: 'Lange betaaltermijnen en openstaand bedrag geven financieringsdruk op je marge.',
      })
    );
  }

  const monthly = categories.reduce(
    (acc, category) => {
      return {
        conservative: roundMoney(acc.conservative + category.monthly.conservative),
        likely: roundMoney(acc.likely + category.monthly.likely),
        high: roundMoney(acc.high + category.monthly.high),
      };
    },
    { conservative: 0, likely: 0, high: 0 }
  );

  const yearly = {
    conservative: roundMoney(monthly.conservative * modelAssumptionDefaults.yearMultiplier),
    likely: roundMoney(monthly.likely * modelAssumptionDefaults.yearMultiplier),
    high: roundMoney(monthly.high * modelAssumptionDefaults.yearMultiplier),
  };

  const likelyPerJob = roundMoney(monthly.likely / Math.max(1, jobs.value));

  const topDrivers = [...categories]
    .sort((a, b) => b.monthly.likely - a.monthly.likely)
    .slice(0, 2);

  const formulaLines: FormulaLine[] = [
    {
      title: 'Reisverlies',
      formula: `${roundMoney(effectiveHourlyRate)} × ${roundHours(travel.value)}u × ${roundHours(workdaysPerMonth)} dagen × ${roundMoney(
        travelNotBilledFactor * 100
      )}%`,
      amount: roundMoney(travelEuro),
    },
    {
      title: 'Offerte + administratie',
      formula: `${roundMoney(effectiveHourlyRate)} × ${roundHours(admin.value)}u × 4 weken`,
      amount: roundMoney(adminEuro),
    },
    {
      title: 'Onderprijsde tijd',
      formula: `${roundMoney(effectiveHourlyRate)} × (${roundMoney(jobs.value)} × ${roundHours(avgHoursPerJob)}u × ${roundMoney(
        underpriced.value
      )}%)`,
      amount: roundMoney(underpricedTimeEuro),
    },
  ];

  const assumptionsSummary = buildAssumptionsSummary(
    effectiveAssumptions,
    {
      hourlyRate: useDayRate ? dayRate.source : hourly.source,
      jobsPerMonth: jobs.source,
      travelHoursPerWorkday: travel.source,
      adminHoursPerWeek: admin.source,
      urgentTripsPerMonth: urgentTrips.source,
      callbackHoursPerMonth: callback.source,
      forgotMaterialPerMonth: forgotMaterial.source,
      parkingPerJob: parking.source,
      underpricedPercent: underpriced.source,
    },
    advancedInput
  );

  const warnings = buildWarnings(effectiveAssumptions);

  return {
    monthly,
    yearly,
    likelyPerJob,
    categories,
    topDrivers,
    assumptionsSummary,
    formulas: formulaLines,
    warnings,
    assumptions: effectiveAssumptions,
  };
}
