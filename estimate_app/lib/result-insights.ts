import { formatEuro } from '@/lib/format';
import type { AdvancedRefineInput, CategoryEstimate, EffectiveAssumptions } from '@/lib/types';

const DEFAULT_WORKDAYS_PER_MONTH = 21;
const HOURS_PER_WORKDAY = 8;
const BASELINE_MONTHLY_PROFIT = 5000;
const TOOLING_YEAR_BUDGET = 7000;
const NEW_VAN_COST = 60000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function safeNumber(value: number | null | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return value;
}

function formatDecimal(value: number, digits = 1): string {
  return new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: value % 1 === 0 ? 0 : digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function resolveWorkdaysPerMonth(advancedInput?: AdvancedRefineInput | null): number {
  const workdaysPerYear = safeNumber(advancedInput?.workdaysPerYear, 0);
  if (workdaysPerYear > 0) {
    return clamp(workdaysPerYear / 12, 12, 24);
  }
  return DEFAULT_WORKDAYS_PER_MONTH;
}

export function calculateDailyLoss(likelyMonthly: number, workdaysPerMonth: number): number {
  return likelyMonthly / Math.max(1, workdaysPerMonth);
}

export function calculateRevenueEstimate(assumptions: EffectiveAssumptions): number {
  return assumptions.effectiveHourlyRate * assumptions.avgHoursPerJobDefault * assumptions.jobsPerMonth * 12;
}

export function calculateLossPercentage(yearlyLoss: number, revenueEstimate: number): number {
  if (revenueEstimate <= 0) return 0;
  return clamp((yearlyLoss / revenueEstimate) * 100, 0, 100);
}

export function getWorkForFreeLine(lossPercentage: number): string {
  const freeDaysPerWeek = clamp((lossPercentage / 100) * 5, 0, 5);

  if (freeDaysPerWeek < 0.35) {
    return 'Je geeft elke week al een halve dag marge weg.';
  }
  if (freeDaysPerWeek < 0.95) {
    return 'Elke vrijdag werk je gratis.';
  }
  if (freeDaysPerWeek < 1.45) {
    return 'Vrijdag en een deel van donderdag werk je gratis.';
  }
  if (freeDaysPerWeek < 2.15) {
    return 'Bijna twee werkdagen per week werk je gratis.';
  }
  if (freeDaysPerWeek < 3.1) {
    return 'Meer dan de helft van je week draait nu op gratis werk.';
  }

  return 'Je werkt nu bijna je hele week tegen gratis marge.';
}

export function getDriverWorkdayLine(driver: CategoryEstimate): string | null {
  if (typeof driver.hoursLikely !== 'number' || driver.hoursLikely <= 0) return null;
  const workdays = driver.hoursLikely / HOURS_PER_WORKDAY;
  return `Dat is ${formatDecimal(workdays)} volle werkdagen per maand.`;
}

export function getHalvedLossYearlyRecovery(likelyMonthly: number): number {
  return likelyMonthly * 6;
}

export function buildImpactComparisons(yearlyLoss: number): string[] {
  if (yearlyLoss <= 0) return [];

  const weeklyLeak = yearlyLoss / 52;
  const monthsOfProfit = yearlyLoss / BASELINE_MONTHLY_PROFIT;
  const vacationWeeksLow = Math.max(1, Math.round(yearlyLoss / 2500));
  const vacationWeeksHigh = Math.max(vacationWeeksLow + 1, Math.round(yearlyLoss / 1800));
  const toolingYears = Math.max(1, Math.round(yearlyLoss / TOOLING_YEAR_BUDGET));
  const vanHorizonYears = yearlyLoss > 0 ? Math.max(1, Math.round(NEW_VAN_COST / yearlyLoss)) : 5;

  if (yearlyLoss < 10000) {
    return [
      `Dat is ongeveer ${formatEuro(weeklyLeak)} netto per week.`,
      `Dat staat gelijk aan ${formatDecimal(monthsOfProfit)} extra maand winst (bij ${formatEuro(BASELINE_MONTHLY_PROFIT)} p/m).`,
    ];
  }

  if (yearlyLoss <= 30000) {
    return [
      `Dat is ongeveer ${formatEuro(weeklyLeak)} netto per week dat weglekt.`,
      `Dat is grofweg ${vacationWeeksLow}-${vacationWeeksHigh} weken vakantie-budget.`,
      `Dat staat gelijk aan ongeveer ${toolingYears} jaar gereedschapsbudget.`,
    ];
  }

  return [
    `In 4 jaar loopt dit op naar ${formatEuro(yearlyLoss * 4)} aan gemiste marge.`,
    `Bij dit tempo financier je bijna elke ${Math.max(4, Math.min(6, vanHorizonYears))} jaar een nieuwe bus uit verlies.`,
    `Je lekt nu circa ${formatEuro(weeklyLeak)} netto per week.`,
  ];
}
