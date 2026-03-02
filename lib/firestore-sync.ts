import admin from 'firebase-admin';

import { getFirestoreAdmin } from '@/lib/firebase-admin';
import {
  addIngestFailure,
  getSyncCursor,
  upsertOpsItemFromSource,
  upsertSyncCursor,
} from '@/lib/ops-db';
import type { OpsPriority, OpsSeverity, OpsItemType } from '@/lib/types';

type FirestoreSource = 'support_feedback' | 'website_build_requests' | 'price_import_requests' | 'custom_klus_requests';

type MappedItem = {
  type: OpsItemType;
  title: string;
  summary?: string | null;
  priority?: OpsPriority;
  severity?: OpsSeverity;
  sourceSystem: string;
  sourceCollection: string;
  sourceRecordId: string;
  sourceUrl?: string | null;
  normalizedPayload: Record<string, unknown>;
  rawPayload: Record<string, unknown>;
  tags: string[];
  createdAt: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

function cleanText(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function cleanTextOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function shorten(text: string, size = 100): string {
  if (text.length <= size) return text;
  return `${text.slice(0, size - 1)}…`;
}

function timestampToIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();

  const maybeTimestamp = value as { toDate?: () => Date; seconds?: number; nanoseconds?: number };
  if (typeof maybeTimestamp.toDate === 'function') {
    return maybeTimestamp.toDate().toISOString();
  }
  if (typeof maybeTimestamp.seconds === 'number') {
    return new Date(maybeTimestamp.seconds * 1000).toISOString();
  }

  return null;
}

function mapSource(source: FirestoreSource, id: string, payload: Record<string, unknown>): MappedItem {
  if (source === 'support_feedback') {
    const bericht = cleanText(payload.bericht, 'Leeg feedbackbericht');
    const n8nStatus = cleanText(payload.n8nStatus, 'unknown');
    const severity: OpsSeverity = n8nStatus === 'failed' ? 'error' : 'info';

    return {
      type: 'feedback',
      title: `Feedback: ${shorten(bericht, 80)}`,
      summary: bericht,
      priority: n8nStatus === 'failed' ? 'hoog' : 'medium',
      severity,
      sourceSystem: 'studio_firestore',
      sourceCollection: source,
      sourceRecordId: id,
      normalizedPayload: {
        bericht,
        n8nStatus,
        userId: payload.userId,
        afzenderNaam: payload.afzenderNaam,
        afzenderEmail: payload.afzenderEmail,
      },
      rawPayload: payload,
      tags: ['feedback', n8nStatus === 'failed' ? 'n8n-failed' : 'n8n-ok'],
      createdAt: timestampToIso(payload.createdAt),
    };
  }

  if (source === 'website_build_requests') {
    const contactNaam = cleanText(payload.contactNaam, 'Onbekend contact');
    const websiteType = cleanText(payload.websiteType, 'Website-aanvraag');
    const status = cleanText(payload.n8nStatus, 'unknown');

    return {
      type: 'website_request',
      title: `Website-aanvraag: ${contactNaam} (${websiteType})`,
      summary: cleanTextOrNull(payload.projectBeschrijving),
      priority: status === 'failed' ? 'hoog' : 'medium',
      severity: status === 'failed' ? 'error' : 'info',
      sourceSystem: 'studio_firestore',
      sourceCollection: source,
      sourceRecordId: id,
      normalizedPayload: {
        contactNaam,
        websiteType,
        budgetRange: payload.budgetRange,
        contactVoorkeur: payload.contactVoorkeur,
        status,
      },
      rawPayload: payload,
      tags: ['website-request', status === 'failed' ? 'n8n-failed' : 'n8n-ok'],
      createdAt: timestampToIso(payload.createdAt),
    };
  }

  if (source === 'price_import_requests') {
    const leverancier = cleanText(payload.leverancierNaam, 'Onbekende leverancier');
    const materiaalType = cleanText(payload.materiaalType, 'Onbekend materiaal');
    const status = cleanText(payload.status, 'nieuw');

    return {
      type: 'price_import_request',
      title: `Prijsimport: ${leverancier}`,
      summary: `Materiaaltype: ${materiaalType}`,
      priority: status === 'nieuw' ? 'medium' : 'laag',
      severity: 'info',
      sourceSystem: 'studio_firestore',
      sourceCollection: source,
      sourceRecordId: id,
      normalizedPayload: {
        leverancierNaam: leverancier,
        websiteUrl: payload.websiteUrl,
        materiaalType,
        contactVoorkeur: payload.contactVoorkeur,
        status,
      },
      rawPayload: payload,
      tags: ['price-import', status],
      createdAt: timestampToIso(payload.createdAt),
    };
  }

  const titel = cleanText(payload.titel, 'Custom klus');
  const omschrijving = cleanText(payload.omschrijving, 'Geen omschrijving');
  return {
    type: 'custom_klus_request',
    title: `Custom klus: ${titel}`,
    summary: shorten(omschrijving, 220),
    priority: 'medium',
    severity: 'info',
    sourceSystem: 'studio_firestore',
    sourceCollection: source,
    sourceRecordId: id,
    normalizedPayload: {
      titel,
      contactNaam: payload.contactNaam,
      quoteId: payload.quoteId,
      status: payload.status,
    },
    rawPayload: payload,
    tags: ['custom-klus'],
    createdAt: timestampToIso(payload.createdAt),
  };
}

async function fetchDocsForSource(source: FirestoreSource, limit: number) {
  const firestore = getFirestoreAdmin();
  const collection = firestore.collection(source);
  try {
    const snap = await collection.orderBy('createdAt', 'desc').limit(limit).get();
    return snap.docs;
  } catch {
    const snap = await collection.limit(limit).get();
    return snap.docs;
  }
}

function toSortTuple(doc: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData>) {
  const raw = doc.data();
  const createdAt = timestampToIso(raw.createdAt) || new Date(0).toISOString();
  return {
    createdAt,
    docId: doc.id,
  };
}

export async function runFirestoreBackfill(source: FirestoreSource, limit: number): Promise<{ processed: number; source: FirestoreSource }> {
  const docs = await fetchDocsForSource(source, limit);
  let processed = 0;

  for (const doc of docs) {
    try {
      const payload = asRecord(doc.data());
      const mapped = mapSource(source, doc.id, payload);
      await upsertOpsItemFromSource({
        type: mapped.type,
        title: mapped.title,
        summary: mapped.summary,
        priority: mapped.priority,
        severity: mapped.severity,
        source_system: mapped.sourceSystem,
        source_collection: mapped.sourceCollection,
        source_record_id: mapped.sourceRecordId,
        source_url: mapped.sourceUrl,
        normalized_payload: mapped.normalizedPayload,
        raw_payload: mapped.rawPayload,
        tags: mapped.tags,
      });
      processed += 1;
    } catch (error) {
      await addIngestFailure(`backfill:${source}`, error instanceof Error ? error.message : 'unknown error', {
        id: doc.id,
      });
    }
  }

  const newest = docs[0] ? toSortTuple(docs[0]) : null;

  await upsertSyncCursor({
    sourceKey: source,
    firestoreCollection: source,
    lastSeenCreatedAt: newest?.createdAt || null,
    lastDocId: newest?.docId || null,
    metadata: { processed, mode: 'backfill' },
  });

  return { source, processed };
}

export async function runFirestoreIncremental(source: FirestoreSource, limit: number): Promise<{ source: FirestoreSource; processed: number }> {
  const firestore = getFirestoreAdmin();
  const state = await getSyncCursor(source);

  let query: admin.firestore.Query<admin.firestore.DocumentData> = firestore.collection(source).limit(limit);

  if (state?.last_seen_created_at) {
    const date = new Date(state.last_seen_created_at);
    if (Number.isFinite(date.getTime())) {
      query = firestore.collection(source).where('createdAt', '>', date).orderBy('createdAt', 'asc').limit(limit);
    }
  } else {
    query = firestore.collection(source).orderBy('createdAt', 'asc').limit(limit);
  }

  let docs: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData>[] = [];
  try {
    const snap = await query.get();
    docs = snap.docs;
  } catch {
    const fallbackSnap = await firestore.collection(source).limit(limit).get();
    docs = fallbackSnap.docs;
  }

  let processed = 0;
  let newestTuple: { createdAt: string; docId: string } | null = null;

  for (const doc of docs) {
    try {
      const payload = asRecord(doc.data());
      const mapped = mapSource(source, doc.id, payload);
      await upsertOpsItemFromSource({
        type: mapped.type,
        title: mapped.title,
        summary: mapped.summary,
        priority: mapped.priority,
        severity: mapped.severity,
        source_system: mapped.sourceSystem,
        source_collection: mapped.sourceCollection,
        source_record_id: mapped.sourceRecordId,
        source_url: mapped.sourceUrl,
        normalized_payload: mapped.normalizedPayload,
        raw_payload: mapped.rawPayload,
        tags: mapped.tags,
      });
      processed += 1;
      newestTuple = toSortTuple(doc);
    } catch (error) {
      await addIngestFailure(`incremental:${source}`, error instanceof Error ? error.message : 'unknown error', {
        id: doc.id,
      });
    }
  }

  if (newestTuple) {
    await upsertSyncCursor({
      sourceKey: source,
      firestoreCollection: source,
      lastSeenCreatedAt: newestTuple.createdAt,
      lastDocId: newestTuple.docId,
      metadata: { processed, mode: 'incremental' },
    });
  }

  return { source, processed };
}

export const SUPPORTED_FIRESTORE_SOURCES: FirestoreSource[] = [
  'support_feedback',
  'website_build_requests',
  'price_import_requests',
  'custom_klus_requests',
];
