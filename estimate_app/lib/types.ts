export type LossView = 'month' | 'year' | 'job';
export type RangeLabel = 'conservative' | 'likely' | 'high';

export type QuickFieldKey =
  | 'hourlyRate'
  | 'dayRate'
  | 'jobsPerMonth'
  | 'travelHoursPerWorkday'
  | 'parkingPerJob'
  | 'adminHoursPerWeek'
  | 'urgentTripsPerMonth'
  | 'callbackHoursPerMonth'
  | 'forgotMaterialPerMonth'
  | 'underpricedPercent';

export interface QuickCheckInput {
  useDayRate: boolean;
  hourlyRate: number;
  dayRate: number;
  jobsPerMonth: number;
  travelHoursPerWorkday: number;
  parkingPerJob: number;
  adminHoursPerWeek: number;
  urgentTripsPerMonth: number;
  callbackHoursPerMonth: number;
  forgotMaterialPerMonth: number;
  underpricedPercent: number;
}

export type UnknownSelection = Partial<Record<QuickFieldKey, boolean>>;

export interface AdvancedRefineInput {
  workdaysPerYear?: number | null;
  billableHoursPerDay?: number | null;
  paymentTermDays?: number | null;
  outstandingAmount?: number | null;
  toolsDepreciationPerMonth?: number | null;
  fixedCostsPerMonth?: number | null;
  revisitJobsPerMonth?: number | null;
  revisitHoursPerVisit?: number | null;
  avgHoursPerJob?: number | null;
  travelNotBilledFactor?: number | null;
}

export interface EffectiveAssumptions {
  effectiveHourlyRate: number;
  jobsPerMonth: number;
  travelHoursPerWorkday: number;
  parkingPerJob: number;
  adminHoursPerWeek: number;
  urgentTripsPerMonth: number;
  callbackHoursPerMonth: number;
  forgotMaterialPerMonth: number;
  underpricedPercent: number;
  workdaysPerMonth: number;
  urgentTripHoursDefault: number;
  avgHoursPerJobDefault: number;
  travelNotBilledFactor: number;
  billableHoursPerDay: number;
}

export interface AssumptionSummaryItem {
  label: string;
  value: string;
  source: 'Invoer' | 'Gemiddelde';
}

export type CategoryPillar = 'A' | 'B' | 'C';
export type CategoryType = 'time' | 'direct' | 'mixed';

export type LossCategoryKey =
  | 'travel_logistics'
  | 'offer_admin'
  | 'material_leak'
  | 'urgent_trips'
  | 'callback_rework'
  | 'underpriced_time'
  | 'parking_toll'
  | 'cashflow_drag';

export interface CategoryEstimate {
  key: LossCategoryKey;
  label: string;
  pillar: CategoryPillar;
  type: CategoryType;
  monthly: {
    conservative: number;
    likely: number;
    high: number;
  };
  hoursLikely?: number;
  explanation: string;
}

export interface FormulaLine {
  title: string;
  formula: string;
  amount: number;
}

export interface LossTotals {
  conservative: number;
  likely: number;
  high: number;
}

export interface EstimateResult {
  monthly: LossTotals;
  yearly: LossTotals;
  likelyPerJob: number;
  categories: CategoryEstimate[];
  topDrivers: CategoryEstimate[];
  assumptionsSummary: AssumptionSummaryItem[];
  formulas: FormulaLine[];
  warnings: string[];
  assumptions: EffectiveAssumptions;
}

export interface StoredEstimatePayload {
  quickInput: QuickCheckInput;
  unknownSelection: UnknownSelection;
  advancedInput: AdvancedRefineInput;
  result: EstimateResult;
  createdAt: string;
}

export interface LeadCapturePayload {
  firstName?: string;
  email: string;
  source?: string;
  campaign?: string;
  timestamp: string;
  quickInput: QuickCheckInput;
  unknownSelection: UnknownSelection;
  advancedInput: AdvancedRefineInput;
  resultSnapshot: EstimateResult;
}

export interface LeadApiResponse {
  ok: boolean;
  message: string;
  id?: string;
}

export interface QuickPreset {
  low: number;
  medium: number;
  high: number;
}

export interface QuickFieldMeta {
  key: QuickFieldKey;
  label: string;
  tooltip: string;
  typicalRange: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  quickPicks: [number, number, number];
}
