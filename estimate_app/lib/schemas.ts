import { z } from 'zod';

const num = (min = 0, max = 1_000_000) => z.number().finite().min(min).max(max);

export const quickInputSchema = z.object({
  useDayRate: z.boolean(),
  hourlyRate: num(0, 500),
  dayRate: num(0, 2500),
  jobsPerMonth: num(0, 100),
  travelHoursPerWorkday: num(0, 8),
  parkingPerJob: num(0, 300),
  adminHoursPerWeek: num(0, 40),
  urgentTripsPerMonth: num(0, 50),
  callbackHoursPerMonth: num(0, 60),
  forgotMaterialPerMonth: num(0, 10000),
  underpricedPercent: num(0, 40),
});

export const unknownSelectionSchema = z
  .object({
    hourlyRate: z.boolean().optional(),
    dayRate: z.boolean().optional(),
    jobsPerMonth: z.boolean().optional(),
    travelHoursPerWorkday: z.boolean().optional(),
    parkingPerJob: z.boolean().optional(),
    adminHoursPerWeek: z.boolean().optional(),
    urgentTripsPerMonth: z.boolean().optional(),
    callbackHoursPerMonth: z.boolean().optional(),
    forgotMaterialPerMonth: z.boolean().optional(),
    underpricedPercent: z.boolean().optional(),
  })
  .partial();

export const advancedRefineSchema = z.object({
  workdaysPerYear: num(0, 365).nullable().optional(),
  billableHoursPerDay: num(0, 16).nullable().optional(),
  paymentTermDays: num(0, 180).nullable().optional(),
  outstandingAmount: num(0, 500000).nullable().optional(),
  toolsDepreciationPerMonth: num(0, 50000).nullable().optional(),
  fixedCostsPerMonth: num(0, 50000).nullable().optional(),
  revisitJobsPerMonth: num(0, 100).nullable().optional(),
  revisitHoursPerVisit: num(0, 10).nullable().optional(),
  avgHoursPerJob: num(0, 30).nullable().optional(),
  travelNotBilledFactor: num(0, 1).nullable().optional(),
});

export const estimateResultSchema = z.object({
  monthly: z.object({ conservative: num(), likely: num(), high: num() }),
  yearly: z.object({ conservative: num(), likely: num(), high: num() }),
  likelyPerJob: num(),
  categories: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      pillar: z.enum(['A', 'B', 'C']),
      type: z.enum(['time', 'direct', 'mixed']),
      monthly: z.object({ conservative: num(), likely: num(), high: num() }),
      hoursLikely: num().optional(),
      explanation: z.string(),
    })
  ),
  topDrivers: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      pillar: z.enum(['A', 'B', 'C']),
      type: z.enum(['time', 'direct', 'mixed']),
      monthly: z.object({ conservative: num(), likely: num(), high: num() }),
      hoursLikely: num().optional(),
      explanation: z.string(),
    })
  ),
  assumptionsSummary: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      source: z.enum(['Invoer', 'Gemiddelde']),
    })
  ),
  formulas: z.array(
    z.object({
      title: z.string(),
      formula: z.string(),
      amount: num(),
    })
  ),
  warnings: z.array(z.string()),
  assumptions: z.object({
    effectiveHourlyRate: num(),
    jobsPerMonth: num(),
    travelHoursPerWorkday: num(),
    parkingPerJob: num(),
    adminHoursPerWeek: num(),
    urgentTripsPerMonth: num(),
    callbackHoursPerMonth: num(),
    forgotMaterialPerMonth: num(),
    underpricedPercent: num(),
    workdaysPerMonth: num(),
    urgentTripHoursDefault: num(),
    avgHoursPerJobDefault: num(),
    travelNotBilledFactor: num(),
    billableHoursPerDay: num(),
  }),
});

export const calcRequestSchema = z.object({
  quickInput: quickInputSchema,
  unknownSelection: unknownSelectionSchema.optional(),
  advancedInput: advancedRefineSchema.optional(),
});

export const leadCaptureSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().email('Vul een geldig e-mailadres in.'),
  source: z.string().trim().optional(),
  campaign: z.string().trim().optional(),
  timestamp: z.string().trim().optional(),
  quickInput: quickInputSchema,
  unknownSelection: unknownSelectionSchema.optional(),
  advancedInput: advancedRefineSchema.optional(),
  resultSnapshot: estimateResultSchema,
});
