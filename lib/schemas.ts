import { z } from 'zod';

export const opsItemTypeSchema = z.enum([
  'feedback',
  'website_request',
  'price_import_request',
  'custom_klus_request',
  'demo_request',
  'app_error',
  'n8n_incident',
  'data_quality_issue',
  'reddit_complaint',
]);

export const opsStatusSchema = z.enum(['nieuw', 'in_triage', 'bezig', 'geblokkeerd', 'opgelost', 'genegeerd']);
export const opsPrioritySchema = z.enum(['laag', 'medium', 'hoog', 'kritiek']);
export const opsSeveritySchema = z.enum(['info', 'waarschuwing', 'error', 'kritiek']);

const looseRecordSchema = z.record(z.string(), z.unknown());

export const ingestRedditComplaintSchema = z.object({
  source: z.string().min(1),
  runId: z.string().min(1),
  post: looseRecordSchema,
  comment: looseRecordSchema,
  enrichment: looseRecordSchema.default({}),
});

export const ingestN8nIncidentSchema = z.object({
  workflowId: z.string().min(1),
  executionId: z.string().min(1),
  status: z.string().min(1),
  error: z.string().optional(),
  payloadPreview: z.unknown().optional(),
  sourceSystem: z.string().min(1),
});

export const ingestDemoRequestSchema = z.object({
  naam: z.string().min(1),
  bedrijfsnaam: z.string().min(1),
  email: z.string().email(),
  telefoonnummer: z.string().optional().default(''),
  bericht: z.string().optional().default(''),
  source: z.string().min(1).default('website_contact'),
  submittedAt: z.string().datetime(),
});

export const ingestStudioWebsiteRequestSchema = z.object({
  requestId: z.string().min(1),
  source: z.string().min(1).default('studio_website_request'),
  submittedAt: z.string().datetime().optional(),
  aanvraag: z.object({
    contactNaam: z.string().min(1),
    bedrijfsnaam: z.string().nullable().optional(),
    email: z.string().email(),
    telefoon: z.string().min(1),
    websiteType: z.string().min(1),
    projectBeschrijving: z.string().min(1),
    budgetRange: z.string().nullable().optional(),
    extraWensen: z.string().nullable().optional(),
    contactVoorkeur: z.string().min(1),
    contactVoorkeurLabel: z.string().optional(),
    afspraakDatum: z.string().nullable().optional(),
    afspraakTijd: z.string().nullable().optional(),
  }),
});

export const ingestSocialMediaIdeaSchema = z.object({
  ideaId: z.string().min(1).optional(),
  source: z.string().min(1).default('n8n_social_media_ideas'),
  submittedAt: z.string().datetime().optional(),
  title: z.string().min(1).optional(),
  text: z.string().min(1).optional(),
  concept: z.string().optional().default(''),
  platform: z.string().optional().default(''),
  hook: z.string().optional().default(''),
  format: z.string().optional().default(''),
  audience: z.string().optional().default(''),
  callToAction: z.string().optional().default(''),
  metadata: looseRecordSchema.optional().default({}),
}).passthrough().refine((value) => Boolean(value.title || value.text), {
  message: 'title of text is verplicht',
});

export const patchItemSchema = z.object({
  status: opsStatusSchema.optional(),
  priority: opsPrioritySchema.optional(),
  severity: opsSeveritySchema.optional(),
  ownerId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().trim().min(1)).max(20).optional(),
  snoozedUntil: z.string().datetime().nullable().optional(),
  resolution: z.string().max(5000).nullable().optional(),
});

export const itemNoteSchema = z.object({
  note: z.string().trim().min(1).max(5000),
});

export const backfillSchema = z.object({
  sources: z.array(z.enum([
    'support_feedback',
    'website_build_requests',
    'price_import_requests',
    'custom_klus_requests',
  ])).min(1),
  limitPerSource: z.number().int().positive().max(5000).default(1000),
});

export const incrementalSchema = z.object({
  source: z.enum([
    'support_feedback',
    'website_build_requests',
    'price_import_requests',
    'custom_klus_requests',
  ]),
  limit: z.number().int().positive().max(500).default(100),
});
