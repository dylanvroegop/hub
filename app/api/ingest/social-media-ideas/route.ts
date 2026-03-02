import { NextRequest } from 'next/server';

import { handleRouteError, jsonError, jsonOk } from '@/lib/api';
import { addIngestFailure, createItemEvent, upsertOpsItemFromSource } from '@/lib/ops-db';
import { readSignedPayload } from '@/lib/ingest-auth';
import { ingestSocialMediaIdeaSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function makeSourceRecordId(data: {
  ideaId?: string;
  title: string;
  platform?: string;
  submittedAt?: string;
}) {
  if (data.ideaId) return data.ideaId;

  const base = `${data.platform || 'idea'}-${data.title}-${data.submittedAt || ''}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

  return base || `idea-${Date.now()}`;
}

function deriveTitle(title: string | undefined, text: string | undefined): string {
  const direct = title?.trim();
  if (direct) return direct;

  const raw = text?.trim() || 'Social media idee';
  const firstLine = raw.split('\n').find((line) => line.trim())?.trim() || raw;
  return firstLine.slice(0, 140);
}

export async function POST(request: NextRequest) {
  try {
    const { payload } = await readSignedPayload(request);
    const parsed = ingestSocialMediaIdeaSchema.safeParse(payload);

    if (!parsed.success) {
      await addIngestFailure('social_media_ideas', 'invalid_payload', {
        errors: parsed.error.flatten(),
      });
      return jsonError('Payload validatie mislukt.', 400, parsed.error.flatten());
    }

    const data = parsed.data;
    const resolvedTitle = deriveTitle(data.title, data.text);
    const sourceRecordId = makeSourceRecordId({
      ideaId: data.ideaId,
      title: resolvedTitle,
      platform: data.platform,
      submittedAt: data.submittedAt,
    });
    const summaryParts = [data.hook, data.concept, data.callToAction, data.text].filter(Boolean);
    const item = await upsertOpsItemFromSource({
      type: 'feedback',
      title: resolvedTitle,
      summary: summaryParts.join(' · ') || 'Social media idee vanuit n8n.',
      priority: 'medium',
      severity: 'info',
      source_system: 'n8n_social_ideas',
      source_collection: 'social_media_ideas',
      source_record_id: sourceRecordId,
      normalized_payload: {
        ideaId: sourceRecordId,
        source: data.source,
        submittedAt: data.submittedAt || null,
        title: resolvedTitle,
        text: data.text || null,
        concept: data.concept || data.text || null,
        platform: data.platform || null,
        hook: data.hook || null,
        format: data.format || null,
        audience: data.audience || null,
        callToAction: data.callToAction || null,
      },
      raw_payload: data,
      tags: ['social-media-idea', 'n8n-social-ideas'],
    });

    await createItemEvent(item.id, 'social_media_idea_ingested', null, {
      ideaId: sourceRecordId,
      source: data.source,
      platform: data.platform || null,
    });

    return jsonOk({ ok: true, itemId: item.id, ideaId: sourceRecordId });
  } catch (error) {
    return handleRouteError(error);
  }
}
